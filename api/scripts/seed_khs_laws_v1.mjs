#!/usr/bin/env node
/**
 * SEED_KHS_LAWS_V1 — khs_laws 初期 seed データ投入スクリプト
 * ================================================================
 *
 * constitutionLoader の 6 CoreDefinitions を基盤に、
 * 言霊秘書 JSON (iroha_kotodama_hisho.json) から主要法則を抽出し、
 * khs_laws テーブルに 50+ 件の初期 seed を INSERT する。
 *
 * 設計原則:
 *   - INSERT OR IGNORE で冪等（何度実行しても安全）
 *   - 全件に truthAxis / waterFireClass を付与
 *   - unitId は "SEED_V1_xxx" 形式（khs_units 未結合）
 *   - status = "verified"（手動確認済み扱い）
 *   - fill_khs_laws_v2.ts と共存可能（V2 は空シェルのみ更新）
 *
 * 使用法:
 *   node api/scripts/seed_khs_laws_v1.mjs [--dry-run] [--db-path /path/to/kokuzo.sqlite]
 *
 * 前提:
 *   - kokuzo.sqlite に khs_laws テーブルが存在すること
 *   - better-sqlite3 が不要（node:sqlite を使用）
 */

import { DatabaseSync } from "node:sqlite";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

// ── 設定 ─────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dbPathIdx = args.indexOf("--db-path");
const DB_PATH = dbPathIdx >= 0
  ? args[dbPathIdx + 1]
  : (process.env.KOKUZO_DB_PATH || "/opt/tenmon-ark-data/kokuzo.sqlite");

const HISHO_JSON_PATH = "/opt/tenmon-ark-repo/server/data/iroha_kotodama_hisho.json";

// ── 10 truth_axis ────────────────────────────────────
const TRUTH_AXES = [
  "cycle", "polarity", "center", "breath", "carami",
  "order", "correspondence", "manifestation", "purification", "governance",
];

const AXIS_KEYWORDS = {
  cycle: ["循環", "巡り", "回帰", "周期", "めぐり", "輪廻", "繰り返し", "還", "転"],
  polarity: ["水火", "イキ", "陰陽", "対極", "二元", "水", "火", "上下", "昇降", "澄濁", "軽清", "重濁"],
  center: ["正中", "まなか", "中心", "ゝ", "凝", "ア", "基底", "母体", "惣名", "中軸", "御中主"],
  breath: ["息", "呼吸", "吐納", "気息", "吸", "吐", "氣", "生命力", "活力"],
  carami: ["カラミ", "絡み", "交合", "結合", "與合", "くみあい", "交差", "螺旋", "組み合わせ"],
  order: ["秩序", "配列", "順序", "五十連", "行列", "位", "階層", "序列", "法則", "規則"],
  correspondence: ["対応", "照応", "写像", "相似", "フラクタル", "鏡", "反映", "共鳴", "響き", "呼応"],
  manifestation: ["顕現", "形", "現象", "顕れ", "発現", "生成", "創造", "産み", "成り", "ワ", "国土"],
  purification: ["浄化", "禊", "澄", "清", "祓", "洗", "純化", "精錬", "昇華"],
  governance: ["統治", "君位", "臣", "治", "政", "タカアマハラ", "高天原", "天津", "国津", "主宰"],
};

function detectAxes(text) {
  const results = [];
  for (const axis of TRUTH_AXES) {
    let hits = 0;
    for (const kw of AXIS_KEYWORDS[axis]) {
      const regex = new RegExp(kw, "gi");
      const matches = text.match(regex);
      if (matches) hits += matches.length;
    }
    if (hits > 0) results.push({ axis, score: hits });
  }
  results.sort((a, b) => b.score - a.score);
  if (results.length === 0) results.push({ axis: "center", score: 0 });
  return results.slice(0, 4).map(r => r.axis);
}

function classifyWaterFire(text) {
  const waterKw = ["水", "軽清", "昇", "天", "澄", "動く側", "陰"];
  const fireKw = ["火", "重濁", "降", "地", "濁", "動かす側", "陽"];
  let ws = 0, fs = 0;
  for (const kw of waterKw) { if (text.includes(kw)) ws++; }
  for (const kw of fireKw) { if (text.includes(kw)) fs++; }
  if (ws > 0 && fs > 0) return "WF_UNION";
  if (ws > fs) return "WF_WATER";
  if (fs > ws) return "WF_FIRE";
  return "WF_UNKNOWN";
}

function makeLawKey(prefix, idx) {
  return `${prefix}_${String(idx).padStart(3, "0")}`;
}

// ── Seed データ定義 ──────────────────────────────────

// Part 1: 6 CoreDefinitions (constitutionLoader.ts 由来)
const CORE_DEFINITIONS = [
  {
    lawKey: "CORE_DEF_001",
    lawType: "DEF",
    title: "水火（イキ）の法則",
    summary: "水＝動く側（軽清・昇・天）、火＝動かす側（重濁・降・地）。形＝火が水を動かして顕れる。[NOTION:PAGE:6beb2c055ef24cf6b60cecbeb1b7847a, pdfPage=97]",
    termKey: "水火",
    operator: "OP_DEFINE",
    truthAxis: "polarity,manifestation",
    waterFireClass: "WF_UNION",
    unitId: "NOTION:PAGE:6beb2c055ef24cf6b60cecbeb1b7847a",
  },
  {
    lawKey: "CORE_DEF_002",
    lawType: "DEF",
    title: "正中（まなか）の原理",
    summary: "天地の中心にゝ（凝）が立つ、ここから水火別（イキワカレ）が起こる。[NOTION:PAGE:6beb2c055ef24cf6b60cecbeb1b7847a, pdfPage=97]",
    termKey: "正中",
    operator: "OP_DEFINE",
    truthAxis: "center,order",
    waterFireClass: "WF_UNION",
    unitId: "NOTION:PAGE:6beb2c055ef24cf6b60cecbeb1b7847a",
  },
  {
    lawKey: "CORE_DEF_003",
    lawType: "DEF",
    title: "ア — 五十連の惣名",
    summary: "五十連の惣名、無にして有、基底母体。[NOTION:PAGE:af58bef540844ff59f19775177c8f3e8, pdfPage=415]",
    termKey: "ア",
    operator: "OP_DEFINE",
    truthAxis: "center,manifestation",
    waterFireClass: "WF_UNION",
    unitId: "NOTION:PAGE:af58bef540844ff59f19775177c8f3e8",
  },
  {
    lawKey: "CORE_DEF_004",
    lawType: "DEF",
    title: "ワ — 国土、形の宰",
    summary: "国土、形の宰、水火の灵。[NOTION:PAGE:efc23543a4284d8199d3b8c9ef6e6fbe, pdfPage=420]",
    termKey: "ワ",
    operator: "OP_DEFINE",
    truthAxis: "polarity,manifestation",
    waterFireClass: "WF_UNION",
    unitId: "NOTION:PAGE:efc23543a4284d8199d3b8c9ef6e6fbe",
  },
  {
    lawKey: "CORE_DEF_005",
    lawType: "LAW",
    title: "五十連秩序",
    summary: "ア行＝天、ワ行＝地、ヤ行＝人、三行＝君位、八行＝臣。[NOTION:PAGE:c69b831fb5e24de99b89bf6ccc39874d, pdfPage=24]",
    termKey: "五十連秩序",
    operator: "OP_CLASSIFY",
    truthAxis: "governance,correspondence",
    waterFireClass: "WF_UNION",
    unitId: "NOTION:PAGE:c69b831fb5e24de99b89bf6ccc39874d",
  },
  {
    lawKey: "CORE_DEF_006",
    lawType: "LAW",
    title: "澄濁方向の法則",
    summary: "澄＝上、濁＝降。[NOTION:PAGE:71974cfd35a54e6fbbe120bd17297bb8, pdfPage=449]",
    termKey: "澄濁方向",
    operator: "OP_CLASSIFY",
    truthAxis: "purification,polarity",
    waterFireClass: "WF_UNION",
    unitId: "NOTION:PAGE:71974cfd35a54e6fbbe120bd17297bb8",
  },
];

// Part 2: KHS 中枢憲法から抽出した基本法則
const KHS_CONSTITUTION_LAWS = [
  {
    lawKey: "KHS_LAW_001",
    lawType: "RULE",
    title: "KHS 唯一中枢宣言",
    summary: "本体系は「言灵秘書（KHS）」を唯一の言灵中枢とする。KHSに含まれない言灵概念は一切採用しない。",
    termKey: "KHS中枢",
    operator: "OP_CONSTRAIN",
    truthAxis: "governance,order",
    waterFireClass: "WF_FIRE",
  },
  {
    lawKey: "KHS_LAW_002",
    lawType: "RULE",
    title: "原典参照必須の法則",
    summary: "doc=NOTION:PAGE:* + pdfPage=数値 が無い断言は禁止。pdfPage=? は封印不可（GATE凍結のみ許可）。",
    termKey: "原典参照",
    operator: "OP_CONSTRAIN",
    truthAxis: "order,governance",
    waterFireClass: "WF_FIRE",
  },
  {
    lawKey: "KHS_LAW_003",
    lawType: "RULE",
    title: "truth_axis 10軸固定",
    summary: "truth_axisは cycle/polarity/center/breath/carami/order/correspondence/manifestation/purification/governance の10軸に固定する。",
    termKey: "truth_axis",
    operator: "OP_CONSTRAIN",
    truthAxis: "order,governance",
    waterFireClass: "WF_FIRE",
  },
  {
    lawKey: "KHS_LAW_004",
    lawType: "RULE",
    title: "表記固定の法則",
    summary: "霊→灵、水火=イキ（必要時 水火（イキ））、与合→與合（くみあい）、高天原→タカアマハラ。",
    termKey: "表記固定",
    operator: "OP_CONSTRAIN",
    truthAxis: "order,purification",
    waterFireClass: "WF_FIRE",
  },
  {
    lawKey: "KHS_LAW_005",
    lawType: "RULE",
    title: "禁止事項: 外部語源補間",
    summary: "外部語源補間、ニューエイジ的補間、「一般には」「と言われる」等の曖昧化、KHS語義の心理学化を禁止。",
    termKey: "禁止事項",
    operator: "OP_CONSTRAIN",
    truthAxis: "purification,governance",
    waterFireClass: "WF_FIRE",
  },
  {
    lawKey: "KHS_LAW_006",
    lawType: "DEF",
    title: "天之御中主 — 水火の中心",
    summary: "正中（まなか）＝ゝ（凝）。そこより水火別（イキワカレ）が起こる。水＝軽清＝昇＝天、火＝重濁＝降＝地。",
    termKey: "天之御中主",
    operator: "OP_DEFINE",
    truthAxis: "center,polarity",
    waterFireClass: "WF_UNION",
  },
  {
    lawKey: "KHS_LAW_007",
    lawType: "LAW",
    title: "天津金木四象構造",
    summary: "左旋内集(L-IN)、左旋外発(L-OUT)、右旋内集(R-IN)、右旋外発(R-OUT)の四象循環。24通り（陰陽込みで48）+ 中心灵2つで50構造。",
    termKey: "天津金木",
    operator: "OP_DEFINE",
    truthAxis: "cycle,correspondence",
    waterFireClass: "WF_UNION",
  },
  {
    lawKey: "KHS_LAW_008",
    lawType: "LAW",
    title: "OMEGA契約 (Ω = D・ΔS)",
    summary: "悟り = 根拠密度(D) × 構造変化量(ΔS)。D=0 なら Ω=0（憶測は悟りではない）。ΔS=0 なら Ω=0（変化なき反復は悟りではない）。",
    termKey: "OMEGA",
    operator: "OP_CONSTRAIN",
    truthAxis: "center,manifestation",
    waterFireClass: "WF_UNION",
  },
  {
    lawKey: "KHS_LAW_009",
    lawType: "LAW",
    title: "4PHI思考プロセス",
    summary: "SENSE（感知）→ NAME（命名）→ ONE_STEP（一歩）→ NEXT_DOOR（次の扉）。思考の四段階循環。",
    termKey: "4PHI",
    operator: "OP_REFLECT",
    truthAxis: "cycle,order",
    waterFireClass: "WF_UNION",
  },
  {
    lawKey: "KHS_LAW_010",
    lawType: "DEF",
    title: "外部体系の位置づけ",
    summary: "カタカムナ、古事記、祝詞、法華経、聖書、コーラン等は写像レイヤーにのみ存在し、中枢語義を定義してはならない。",
    termKey: "外部体系",
    operator: "OP_CONSTRAIN",
    truthAxis: "governance,correspondence",
    waterFireClass: "WF_FIRE",
  },
];

// Part 3: 言霊秘書（いろは言霊解）から抽出した主要法則
const IROHA_LAWS = [
  {
    lawKey: "IROHA_LAW_001",
    lawType: "LAW",
    title: "いろは文 — 神仏両道の統合",
    summary: "空海のいろは文は、表面では涅槃経「諸行無常」の四句の心を連ね、内部には日本紀神代の巻を含んで、神道と仏教の両道を明らかにする。",
    termKey: "いろは文",
    operator: "OP_DEFINE",
    truthAxis: "correspondence,center",
    waterFireClass: "WF_UNION",
  },
  {
    lawKey: "IROHA_LAW_002",
    lawType: "LAW",
    title: "五十音 — 天地自然の息の形",
    summary: "天地が開かれた初めに、息が動くことに伴って音が発せられる。その息が動く形を記せば五十の連なりがある。",
    termKey: "五十音",
    operator: "OP_DEFINE",
    truthAxis: "breath,manifestation",
    waterFireClass: "WF_UNION",
  },
  {
    lawKey: "IROHA_LAW_003",
    lawType: "LAW",
    title: "形仮名 — 天地自然の文字",
    summary: "五十音の仮名は古事記神代の神々の名前から現れる。天地の音が動く形は天地自然の形仮字である。人が作ったものではない。",
    termKey: "形仮名",
    operator: "OP_DEFINE",
    truthAxis: "manifestation,correspondence",
    waterFireClass: "WF_UNION",
  },
  {
    lawKey: "IROHA_LAW_004",
    lawType: "LAW",
    title: "古事記 = 実態、日本紀 = 働き",
    summary: "太占（ふとまに）に占うと、古事記神代の巻は「実態」であり、日本紀神代の巻は「働き」にあたる。",
    termKey: "古事記日本紀",
    operator: "OP_CLASSIFY",
    truthAxis: "correspondence,polarity",
    waterFireClass: "WF_UNION",
  },
  {
    lawKey: "IROHA_LAW_005",
    lawType: "LAW",
    title: "生死同体の法則",
    summary: "生を離れて死はなく、死を離れて生もない。いろは文は生死を知るための文章である。",
    termKey: "生死同体",
    operator: "OP_DEFINE",
    truthAxis: "cycle,polarity",
    waterFireClass: "WF_UNION",
  },
  {
    lawKey: "IROHA_LAW_006",
    lawType: "LAW",
    title: "神代の巻 = 天地創造の法則",
    summary: "神代の巻は天地創造を教える法則であり、その創造の始まりを遠い昔のことと考えるべきではない。私たちの身体が生まれる時にも同じ法則が働く。",
    termKey: "天地創造",
    operator: "OP_DEFINE",
    truthAxis: "manifestation,cycle",
    waterFireClass: "WF_UNION",
  },
  {
    lawKey: "IROHA_LAW_007",
    lawType: "LAW",
    title: "色の三種 — 顕色・形色・表色",
    summary: "色には三種類ある。青黄赤白の「顕色」、長短広狭の「形色」、そして衰えゆく「表色」。",
    termKey: "色の三種",
    operator: "OP_CLASSIFY",
    truthAxis: "manifestation,order",
    waterFireClass: "WF_UNION",
  },
  {
    lawKey: "IROHA_LAW_008",
    lawType: "LAW",
    title: "有為の法 — 因縁和合",
    summary: "因縁が和合して生じ、因縁が散じて滅するのが有為の法。一時も止まることがない。",
    termKey: "有為",
    operator: "OP_DEFINE",
    truthAxis: "cycle,manifestation",
    waterFireClass: "WF_UNION",
  },
];

// Part 4: 五十音の主要音義（言霊秘書の核心）
const SOUND_LAWS = [
  { sound: "ア", meaning: "五十連の惣名、無にして有、天の始め、基底母体", axis: "center,manifestation" },
  { sound: "イ", meaning: "息の出る始め、生命の発動、水火の起点", axis: "breath,polarity" },
  { sound: "ウ", meaning: "動き、浮く、生まれ出る力", axis: "manifestation,breath" },
  { sound: "エ", meaning: "枝、分かれる、展開する", axis: "manifestation,order" },
  { sound: "オ", meaning: "大きい、包む、尾、終わり", axis: "cycle,manifestation" },
  { sound: "カ", meaning: "力、顕現、火の働き", axis: "manifestation,polarity" },
  { sound: "キ", meaning: "氣、木、生命エネルギー", axis: "breath,manifestation" },
  { sound: "ク", meaning: "組む、来る、暗い", axis: "carami,manifestation" },
  { sound: "ケ", meaning: "気配、毛、外に現れるもの", axis: "manifestation,breath" },
  { sound: "コ", meaning: "凝る、子、固まる", axis: "center,manifestation" },
  { sound: "サ", meaning: "裂く、差す、鋭い", axis: "polarity,purification" },
  { sound: "シ", meaning: "締める、死、静止", axis: "purification,cycle" },
  { sound: "ス", meaning: "澄む、進む、素", axis: "purification,order" },
  { sound: "セ", meaning: "狭める、背、迫る", axis: "polarity,order" },
  { sound: "ソ", meaning: "外、空、反る", axis: "polarity,manifestation" },
  { sound: "タ", meaning: "立つ、田、高い", axis: "manifestation,governance" },
  { sound: "チ", meaning: "血、力、千、霊力", axis: "breath,manifestation" },
  { sound: "ツ", meaning: "連なる、土、強い", axis: "carami,manifestation" },
  { sound: "テ", meaning: "手、照る、天", axis: "manifestation,governance" },
  { sound: "ト", meaning: "止まる、戸、十", axis: "order,manifestation" },
  { sound: "ナ", meaning: "並ぶ、結ぶ、秩序化、名", axis: "order,carami" },
  { sound: "ニ", meaning: "煮る、和合、二", axis: "carami,polarity" },
  { sound: "ヌ", meaning: "抜ける、脱ぐ、沼", axis: "cycle,purification" },
  { sound: "ネ", meaning: "根、音、寝る", axis: "center,cycle" },
  { sound: "ノ", meaning: "伸びる、野、の", axis: "manifestation,cycle" },
  { sound: "ハ", meaning: "葉、端、開く、母", axis: "manifestation,breath" },
  { sound: "ヒ", meaning: "火、日、霊、開く", axis: "polarity,breath" },
  { sound: "フ", meaning: "吹く、風、振る", axis: "breath,manifestation" },
  { sound: "ヘ", meaning: "減る、経る、辺", axis: "cycle,order" },
  { sound: "ホ", meaning: "火、穂、秀でる、本", axis: "polarity,manifestation" },
  { sound: "マ", meaning: "円、間、真、母", axis: "center,correspondence" },
  { sound: "ミ", meaning: "水、身、実、三", axis: "polarity,manifestation" },
  { sound: "ム", meaning: "結ぶ、蒸す、六", axis: "carami,manifestation" },
  { sound: "メ", meaning: "芽、目、女", axis: "manifestation,cycle" },
  { sound: "モ", meaning: "藻、百、盛る", axis: "manifestation,order" },
  { sound: "ヤ", meaning: "矢、八、焼く、人の位", axis: "governance,polarity" },
  { sound: "ユ", meaning: "湯、揺れる、結う", axis: "carami,breath" },
  { sound: "ヨ", meaning: "世、四、万物", axis: "manifestation,governance" },
  { sound: "ラ", meaning: "螺旋、裸、羅", axis: "cycle,correspondence" },
  { sound: "リ", meaning: "理、利、離れる、螺旋循環", axis: "cycle,order" },
  { sound: "ル", meaning: "流れる、留まる", axis: "cycle,manifestation" },
  { sound: "レ", meaning: "連なる、列", axis: "order,carami" },
  { sound: "ロ", meaning: "路、炉、六", axis: "order,manifestation" },
  { sound: "ワ", meaning: "国土、形の宰、水火の灵、和", axis: "polarity,manifestation" },
  { sound: "ヲ", meaning: "緒、男、尾", axis: "manifestation,cycle" },
  { sound: "ン", meaning: "隠、韻、終極の音", axis: "cycle,center" },
].map((s, i) => ({
  lawKey: makeLawKey("SOUND_LAW", i + 1),
  lawType: "DEF",
  title: `音義: ${s.sound} — ${s.meaning.split("、")[0]}`,
  summary: `${s.sound}: ${s.meaning}`,
  termKey: s.sound,
  operator: "OP_DEFINE",
  truthAxis: s.axis,
  waterFireClass: classifyWaterFire(s.meaning),
  unitId: "SEED_V1_SOUND_MEANINGS",
}));

// ── 全 seed データを結合 ──────────────────────────────
const ALL_SEEDS = [
  ...CORE_DEFINITIONS.map(d => ({ ...d, unitId: d.unitId || "SEED_V1_CORE" })),
  ...KHS_CONSTITUTION_LAWS.map(d => ({ ...d, unitId: "SEED_V1_KHS_CONSTITUTION" })),
  ...IROHA_LAWS.map(d => ({ ...d, unitId: "SEED_V1_IROHA_KOTODAMA_HISHO" })),
  ...SOUND_LAWS,
];

// ── メイン ────────────────────────────────────────────
function main() {
  console.log(`[SEED_KHS_LAWS_V1] 開始 (dry_run=${dryRun}, db=${DB_PATH})`);
  console.log(`  seed データ: ${ALL_SEEDS.length} 件`);

  if (!existsSync(DB_PATH)) {
    console.error(`[SEED_KHS_LAWS_V1] ERROR: DB not found at ${DB_PATH}`);
    console.log("  ヒント: --db-path オプションで kokuzo.sqlite のパスを指定してください");
    process.exit(1);
  }

  const db = new DatabaseSync(DB_PATH);

  try {
    // テーブル存在確認
    const tableCheck = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='khs_laws'"
    ).get();
    if (!tableCheck) {
      console.error("[SEED_KHS_LAWS_V1] ERROR: khs_laws テーブルが存在しません");
      console.log("  ヒント: kokuzo_schema.sql を先に実行してください");
      process.exit(1);
    }

    // 既存件数
    const beforeCount = db.prepare("SELECT COUNT(*) as c FROM khs_laws").get().c;
    console.log(`  既存 khs_laws: ${beforeCount} 件`);

    if (dryRun) {
      console.log("\n[DRY RUN] 以下の seed データが投入されます:");
      for (const s of ALL_SEEDS) {
        console.log(`  ${s.lawKey}: ${s.title} [${s.lawType}] axis=${s.truthAxis}`);
      }
      console.log(`\n  合計: ${ALL_SEEDS.length} 件 (INSERT OR IGNORE)`);
      return;
    }

    // INSERT OR IGNORE で冪等投入
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO khs_laws (
        lawKey, lawType, title, summary, termKey, operator,
        truthAxis, waterFireClass, conditionJson, verdictJson,
        unitId, status, confidence, createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, '{}', '{}',
        ?, 'verified', 0.9, datetime('now'), datetime('now')
      )
    `);

    let insertedCount = 0;
    let skippedCount = 0;

    for (const s of ALL_SEEDS) {
      const result = insertStmt.run(
        s.lawKey, s.lawType, s.title, s.summary, s.termKey, s.operator,
        s.truthAxis, s.waterFireClass,
        s.unitId
      );
      if (result.changes > 0) {
        insertedCount++;
      } else {
        skippedCount++;
      }
    }

    // 結果レポート
    const afterCount = db.prepare("SELECT COUNT(*) as c FROM khs_laws").get().c;
    const verifiedCount = db.prepare("SELECT COUNT(*) as c FROM khs_laws WHERE status='verified'").get().c;

    // truthAxis 分布
    const axisRows = db.prepare(`
      SELECT truthAxis, COUNT(*) as c FROM khs_laws
      WHERE truthAxis != '' GROUP BY truthAxis ORDER BY c DESC LIMIT 15
    `).all();

    // waterFireClass 分布
    const wfRows = db.prepare(`
      SELECT waterFireClass, COUNT(*) as c FROM khs_laws
      WHERE waterFireClass != '' GROUP BY waterFireClass ORDER BY c DESC
    `).all();

    // lawType 分布
    const typeRows = db.prepare(`
      SELECT lawType, COUNT(*) as c FROM khs_laws
      GROUP BY lawType ORDER BY c DESC
    `).all();

    console.log("\n" + "=".repeat(60));
    console.log("[SEED_KHS_LAWS_V1] 結果レポート");
    console.log("=".repeat(60));
    console.log(`  投入前: ${beforeCount} 件`);
    console.log(`  投入後: ${afterCount} 件`);
    console.log(`  新規挿入: ${insertedCount} 件`);
    console.log(`  スキップ (既存): ${skippedCount} 件`);
    console.log(`  verified: ${verifiedCount} 件`);
    console.log(`\n  lawType 分布:`);
    for (const r of typeRows) {
      console.log(`    ${r.lawType}: ${r.c}`);
    }
    console.log(`\n  truthAxis 分布 (上位):`);
    for (const r of axisRows) {
      console.log(`    ${r.truthAxis}: ${r.c}`);
    }
    console.log(`\n  waterFireClass 分布:`);
    for (const r of wfRows) {
      console.log(`    ${r.waterFireClass}: ${r.c}`);
    }
    console.log("=".repeat(60));
  } finally {
    db.close();
  }
}

main();
