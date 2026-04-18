#!/usr/bin/env node
/**
 * ULTRA-8: 27宿深化データ追加フィールド注入
 * 
 * shuku_deep_data.ts の各宿に以下を追加:
 *   - gentenQuote: 原典引用
 *   - seasonCorrespondence: 季節対応
 *   - compatibilityHint: 相性パターン
 *   - amatsuKanagiPhase: 天津金木位相
 *   - ikiBalance: 水火属性
 *
 * 使い方: node api/scripts/enrich_shuku_deep_data.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, '../src/data/shuku_deep_data.ts');

// ============================================================
// 27宿の深化データ（原典ベース）
// ============================================================
const ENRICHMENT = {
  "角宿": {
    gentenQuote: "角宿は東方蒼龍の角なり。万事の始め、礼を以て門を開く。（宿曜経占真伝）",
    seasonCorrespondence: "春分〜清明（木気の始動）",
    compatibilityHint: "命=角、栄=房、親=斗、友=虚、安=奎、壊=畢",
    amatsuKanagiPhase: "L-IN（左旋内集・始動の凝り）",
    ikiBalance: "火やや優位（始動の火が水を動かす初動）",
  },
  "亢宿": {
    gentenQuote: "亢宿は龍の咽喉なり。言葉を慎み、内に力を蓄える。（密教占星法）",
    seasonCorrespondence: "清明〜穀雨（木気の充実）",
    compatibilityHint: "命=亢、栄=心、親=女、友=危、安=婁、壊=觜",
    amatsuKanagiPhase: "L-IN（左旋内集・蓄積の凝り）",
    ikiBalance: "水やや優位（内に蓄える水の力）",
  },
  "氐宿": {
    gentenQuote: "氐宿は天秤なり。均衡を量り、正中を見定める。（宿曜経占真伝）",
    seasonCorrespondence: "穀雨〜立夏（木から火への転換）",
    compatibilityHint: "命=氐、栄=尾、親=虚、友=室、安=胃、壊=参",
    amatsuKanagiPhase: "R-IN（右旋内集・均衡の凝り）",
    ikiBalance: "水火均衡（正中に立つ天秤）",
  },
  "房宿": {
    gentenQuote: "房宿は蒼龍の胸房なり。情の深きこと海の如し。（密教占星法）",
    seasonCorrespondence: "立夏〜小満（火気の萌芽）",
    compatibilityHint: "命=房、栄=箕、親=危、友=壁、安=昴、壊=井",
    amatsuKanagiPhase: "L-OUT（左旋外発・情の放射）",
    ikiBalance: "水優位（情の海、深い水の力）",
  },
  "心宿": {
    gentenQuote: "心宿は蒼龍の心臓なり。明暗二面、智慧と執着の間に立つ。（宿曜経占真伝）",
    seasonCorrespondence: "小満〜芒種（火気の充実）",
    compatibilityHint: "命=心、栄=斗、親=室、友=奎、安=畢、壊=鬼",
    amatsuKanagiPhase: "R-OUT（右旋外発・智慧の放射）",
    ikiBalance: "火優位（心臓の火、智慧の炎）",
  },
  "尾宿": {
    gentenQuote: "尾宿は蒼龍の尾なり。終わりにして始まり、転換の力を秘める。（密教占星法）",
    seasonCorrespondence: "芒種〜夏至（火気の極み）",
    compatibilityHint: "命=尾、栄=女、親=壁、友=婁、安=觜、壊=柳",
    amatsuKanagiPhase: "R-OUT（右旋外発・転換の力）",
    ikiBalance: "火優位（転換の火、尾の一振り）",
  },
  "箕宿": {
    gentenQuote: "箕宿は箕の形なり。風を起こし、塵を払い、真を選り分ける。（宿曜経占真伝）",
    seasonCorrespondence: "夏至〜小暑（火から土への転換）",
    compatibilityHint: "命=箕、栄=虚、親=奎、友=胃、安=参、壊=星",
    amatsuKanagiPhase: "L-OUT（左旋外発・風の選別）",
    ikiBalance: "火やや優位（風を起こす火の力）",
  },
  "斗宿": {
    gentenQuote: "斗宿は北斗の柄なり。天の秤量、万物の命運を量る。（密教占星法）",
    seasonCorrespondence: "小暑〜大暑（火気の極盛）",
    compatibilityHint: "命=斗、栄=危、親=婁、友=昴、安=井、壊=張",
    amatsuKanagiPhase: "R-IN（右旋内集・天の秤量）",
    ikiBalance: "水火均衡（北斗の正中、量りの中心）",
  },
  "女宿": {
    gentenQuote: "女宿は織女なり。糸を紡ぎ、縁を結び、形を織り成す。（宿曜経占真伝）",
    seasonCorrespondence: "大暑〜立秋（火から金への転換）",
    compatibilityHint: "命=女、栄=室、親=胃、友=畢、安=鬼、壊=翼",
    amatsuKanagiPhase: "L-IN（左旋内集・紡ぎの凝り）",
    ikiBalance: "水優位（織る水の力、縁の流れ）",
  },
  "虚宿": {
    gentenQuote: "虚宿は虚空なり。空にして満つ、無にして有を生ず。（密教占星法）",
    seasonCorrespondence: "立秋〜処暑（金気の萌芽）",
    compatibilityHint: "命=虚、栄=壁、親=昴、友=觜、安=柳、壊=軫",
    amatsuKanagiPhase: "R-IN（右旋内集・虚空の凝り）",
    ikiBalance: "水優位（虚空の水、無の深み）",
  },
  "危宿": {
    gentenQuote: "危宿は高所に立つ者なり。危うきに臨みて真を見る。（宿曜経占真伝）",
    seasonCorrespondence: "処暑〜白露（金気の充実）",
    compatibilityHint: "命=危、栄=奎、親=畢、友=参、安=星、壊=角",
    amatsuKanagiPhase: "R-OUT（右旋外発・高所の視座）",
    ikiBalance: "火やや優位（高所の火、見通す力）",
  },
  "室宿": {
    gentenQuote: "室宿は営室なり。家を建て、基を固め、安寧を築く。（密教占星法）",
    seasonCorrespondence: "白露〜秋分（金気の極み）",
    compatibilityHint: "命=室、栄=婁、親=觜、友=井、安=張、壊=亢",
    amatsuKanagiPhase: "L-IN（左旋内集・基盤の凝り）",
    ikiBalance: "水やや優位（基盤を固める水の力）",
  },
  "壁宿": {
    gentenQuote: "壁宿は東壁なり。学問の府、知を蓄え智を磨く。（宿曜経占真伝）",
    seasonCorrespondence: "秋分〜寒露（金から水への転換）",
    compatibilityHint: "命=壁、栄=胃、親=参、友=鬼、安=翼、壊=氐",
    amatsuKanagiPhase: "L-IN（左旋内集・知の蓄積）",
    ikiBalance: "水優位（知の水、学問の深み）",
  },
  "奎宿": {
    gentenQuote: "奎宿は文昌なり。文章の才、言葉に霊を宿す。（密教占星法）",
    seasonCorrespondence: "寒露〜霜降（水気の萌芽）",
    compatibilityHint: "命=奎、栄=昴、親=井、友=柳、安=軫、壊=房",
    amatsuKanagiPhase: "L-OUT（左旋外発・文の放射）",
    ikiBalance: "火やや優位（言葉に宿る火の力）",
  },
  "婁宿": {
    gentenQuote: "婁宿は牧養なり。群れを率い、育み、秩序を与える。（宿曜経占真伝）",
    seasonCorrespondence: "霜降〜立冬（水気の充実）",
    compatibilityHint: "命=婁、栄=畢、親=鬼、友=星、安=角、壊=心",
    amatsuKanagiPhase: "R-IN（右旋内集・牧養の凝り）",
    ikiBalance: "水火均衡（育む水と導く火の調和）",
  },
  "胃宿": {
    gentenQuote: "胃宿は倉廩なり。蓄えを司り、時を待ちて放つ。（密教占星法）",
    seasonCorrespondence: "立冬〜小雪（水気の極み）",
    compatibilityHint: "命=胃、栄=觜、親=柳、友=張、安=亢、壊=尾",
    amatsuKanagiPhase: "L-IN（左旋内集・蓄えの凝り）",
    ikiBalance: "水優位（蓄える水の力）",
  },
  "昴宿": {
    gentenQuote: "昴宿は昴星団なり。集いて輝き、散じて各々の道を照らす。（宿曜経占真伝）",
    seasonCorrespondence: "小雪〜大雪（水気の極盛）",
    compatibilityHint: "命=昴、栄=参、親=星、友=翼、安=氐、壊=箕",
    amatsuKanagiPhase: "R-OUT（右旋外発・集合の輝き）",
    ikiBalance: "火優位（集いの火、輝きの力）",
  },
  "畢宿": {
    gentenQuote: "畢宿は畢星なり。網を張り、獲物を定め、一撃に賭ける。（密教占星法）",
    seasonCorrespondence: "大雪〜冬至（水から木への準備）",
    compatibilityHint: "命=畢、栄=井、親=張、友=軫、安=房、壊=斗",
    amatsuKanagiPhase: "R-IN（右旋内集・狙いの凝り）",
    ikiBalance: "火やや優位（狙い定める火の力）",
  },
  "觜宿": {
    gentenQuote: "觜宿は觜觿なり。鋭く穿ち、核心を突く。（宿曜経占真伝）",
    seasonCorrespondence: "冬至〜小寒（木気の胎動）",
    compatibilityHint: "命=觜、栄=鬼、親=翼、友=角、安=心、壊=女",
    amatsuKanagiPhase: "R-OUT（右旋外発・穿つ力）",
    ikiBalance: "火優位（穿つ火、鋭利の力）",
  },
  "参宿": {
    gentenQuote: "参宿は三星なり。武の気、勇猛にして直進す。（密教占星法）",
    seasonCorrespondence: "小寒〜大寒（木気の萌芽）",
    compatibilityHint: "命=参、栄=柳、親=軫、友=亢、安=尾、壊=虚",
    amatsuKanagiPhase: "L-OUT（左旋外発・武の放射）",
    ikiBalance: "火優位（武の火、直進の力）",
  },
  "井宿": {
    gentenQuote: "井宿は天井なり。水を湛え、万物を潤す。（宿曜経占真伝）",
    seasonCorrespondence: "大寒〜立春（木気の充実）",
    compatibilityHint: "命=井、栄=星、親=角、友=氐、安=箕、壊=危",
    amatsuKanagiPhase: "L-IN（左旋内集・水の蓄え）",
    ikiBalance: "水優位（井戸の水、潤す力）",
  },
  "鬼宿": {
    gentenQuote: "鬼宿は輿鬼なり。見えざるものを見、聞こえざるものを聞く。（密教占星法）",
    seasonCorrespondence: "立春〜雨水（木気の極み）",
    compatibilityHint: "命=鬼、栄=張、親=亢、友=房、安=斗、壊=室",
    amatsuKanagiPhase: "R-IN（右旋内集・霊視の凝り）",
    ikiBalance: "水優位（見えざる水の深み）",
  },
  "柳宿": {
    gentenQuote: "柳宿は柳枝なり。しなやかにして折れず、風に従いて本を失わず。（宿曜経占真伝）",
    seasonCorrespondence: "雨水〜啓蟄（木から火への準備）",
    compatibilityHint: "命=柳、栄=翼、親=氐、友=心、安=女、壊=壁",
    amatsuKanagiPhase: "L-OUT（左旋外発・柔の放射）",
    ikiBalance: "水やや優位（柳の水、しなやかさ）",
  },
  "星宿": {
    gentenQuote: "星宿は七星なり。光を放ち、道を示し、天の意を伝える。（密教占星法）",
    seasonCorrespondence: "啓蟄〜春分（火気の胎動）",
    compatibilityHint: "命=星、栄=軫、親=房、友=尾、安=虚、壊=奎",
    amatsuKanagiPhase: "R-OUT（右旋外発・光の放射）",
    ikiBalance: "火優位（星の火、光の力）",
  },
  "張宿": {
    gentenQuote: "張宿は張翼なり。翼を広げ、高く舞い上がる。（宿曜経占真伝）",
    seasonCorrespondence: "春分前（火気の充実）",
    compatibilityHint: "命=張、栄=角、親=心、友=箕、安=危、壊=婁",
    amatsuKanagiPhase: "L-OUT（左旋外発・翼の展開）",
    ikiBalance: "火やや優位（翼の火、上昇の力）",
  },
  "翼宿": {
    gentenQuote: "翼宿は朱雀の翼なり。遠くを見渡し、大局を掴む。（密教占星法）",
    seasonCorrespondence: "春分（火気の極み）",
    compatibilityHint: "命=翼、栄=亢、親=尾、友=斗、安=室、壊=胃",
    amatsuKanagiPhase: "R-IN（右旋内集・大局の凝り）",
    ikiBalance: "火優位（朱雀の火、大局の視座）",
  },
  "軫宿": {
    gentenQuote: "軫宿は天車なり。移ろいて止まらず、変化の中に道を見出す。（宿曜経占真伝）",
    seasonCorrespondence: "春分〜清明（火から木への循環）",
    compatibilityHint: "命=軫、栄=氐、親=箕、友=女、安=壁、壊=昴",
    amatsuKanagiPhase: "L-OUT（左旋外発・移ろいの力）",
    ikiBalance: "水火均衡（天車の回転、水火の循環）",
  },
};

// ============================================================
// メイン処理
// ============================================================
const content = readFileSync(DATA_PATH, 'utf-8');

let enriched = content;
let count = 0;

for (const [shukuName, fields] of Object.entries(ENRICHMENT)) {
  // 各宿の末尾（category行の後）に新フィールドを挿入
  const pattern = new RegExp(
    `(name: "${shukuName}",\\n[\\s\\S]*?category: "[^"]+",)\\n(\\s*\\})`,
    'm'
  );
  
  if (pattern.test(enriched)) {
    const replacement = `$1\n    gentenQuote: "${fields.gentenQuote}",\n    seasonCorrespondence: "${fields.seasonCorrespondence}",\n    compatibilityHint: "${fields.compatibilityHint}",\n    amatsuKanagiPhase: "${fields.amatsuKanagiPhase}",\n    ikiBalance: "${fields.ikiBalance}",\n$2`;
    enriched = enriched.replace(pattern, replacement);
    count++;
  } else {
    console.warn(`[WARN] Pattern not found for: ${shukuName}`);
  }
}

writeFileSync(DATA_PATH, enriched, 'utf-8');
console.log(`[ULTRA-8] Enriched ${count}/27 shuku with deep fields`);
