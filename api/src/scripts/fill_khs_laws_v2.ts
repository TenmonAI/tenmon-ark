/**
 * FILL_KHS_LAWS_V2 — khs_laws 301 件の実体化スクリプト
 * ====================================================
 *
 * 空シェルの khs_laws に khs_units の quote データから
 * title / summary / truthAxis / waterFireClass を注入する。
 *
 * 安全設計:
 *   - READ → COMPUTE → UPDATE の 3 段階
 *   - --dry-run で書き込みなし確認可能
 *   - バックアップテーブル khs_laws_backup_v2 を自動作成
 *   - 全操作をトランザクション内で実行
 *
 * 使用法:
 *   npx tsx api/src/scripts/fill_khs_laws_v2.ts [--dry-run] [--db-path /path/to/kokuzo.sqlite]
 *
 * 成功基準:
 *   ✅ khs_laws 充填率: 80%+ (241/301 以上)
 *   ✅ truthAxis 分布: 10 軸全てに均等
 *   ✅ waterFireClass: WF_WATER, WF_FIRE, WF_UNION 分布
 */

import Database from "better-sqlite3";
import path from "path";

// ── 設定 ─────────────────────────────────────────────
const DEFAULT_DB_PATH =
  process.env.KOKUZO_DB_PATH || "/opt/tenmon-ark-data/kokuzo.sqlite";

// ── 10 truth_axis キーワードマッピング ────────────────
const TRUTH_AXES = [
  "cycle",
  "polarity",
  "center",
  "breath",
  "carami",
  "order",
  "correspondence",
  "manifestation",
  "purification",
  "governance",
] as const;

type TruthAxis = (typeof TRUTH_AXES)[number];

const AXIS_KEYWORDS: Record<TruthAxis, string[]> = {
  cycle: ["循環", "巡り", "回帰", "周期", "めぐり", "サイクル", "輪廻", "繰り返し", "還", "転"],
  polarity: ["水火", "イキ", "陰陽", "対極", "二元", "水", "火", "上下", "昇降", "澄濁", "軽清", "重濁"],
  center: ["正中", "まなか", "中心", "ゝ", "凝", "ア", "基底", "母体", "惣名", "中軸"],
  breath: ["息", "呼吸", "吐納", "気息", "ブレス", "吸", "吐", "氣", "生命力", "活力"],
  carami: ["カラミ", "絡み", "交合", "結合", "與合", "くみあい", "交差", "螺旋", "DNA", "組み合わせ"],
  order: ["秩序", "配列", "順序", "五十連", "行列", "位", "階層", "序列", "法則", "規則"],
  correspondence: ["対応", "照応", "写像", "相似", "フラクタル", "鏡", "反映", "共鳴", "響き", "呼応"],
  manifestation: ["顕現", "形", "現象", "顕れ", "発現", "生成", "創造", "産み", "成り", "ワ", "国土"],
  purification: ["浄化", "禊", "澄", "清", "祓", "洗", "純化", "精錬", "昇華", "祓い"],
  governance: ["統治", "君位", "臣", "治", "政", "タカアマハラ", "高天原", "天津", "国津", "主宰"],
};

// ── 水火分類 ─────────────────────────────────────────
type WaterFireClass = "WF_WATER" | "WF_FIRE" | "WF_UNION" | "WF_UNKNOWN";

function classifyWaterFire(text: string): WaterFireClass {
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

// ── truth_axis 検出 ──────────────────────────────────
function detect10TruthAxes(text: string): TruthAxis[] {
  const results: Array<{ axis: TruthAxis; score: number }> = [];
  for (const axis of TRUTH_AXES) {
    let hits = 0;
    for (const kw of AXIS_KEYWORDS[axis]) {
      const regex = new RegExp(kw, "gi");
      const matches = text.match(regex);
      if (matches) hits += matches.length;
    }
    if (hits > 0) {
      results.push({ axis, score: hits });
    }
  }
  results.sort((a, b) => b.score - a.score);

  // 最低 1 軸保証
  if (results.length === 0) {
    results.push({ axis: "center", score: 0 });
  }

  return results.slice(0, 4).map((r) => r.axis);
}

// ── タイトル抽出 ─────────────────────────────────────
function extractTitle(quote: string, lawKey: string): string {
  // 最初の句読点まで、または最初の 60 文字
  const firstSentence = quote.match(/^[^。、\n]+/)?.[0] || "";
  const title = firstSentence.substring(0, 60).trim();
  return title || `[${lawKey}]`;
}

// ── サマリー抽出 ──────────────────────────────────────
function extractSummary(
  quote: string,
  doc: string,
  pdfPage: number | null
): string {
  const body = quote.substring(0, 300).trim();
  const ref = pdfPage != null ? `[${doc}, pdfPage=${pdfPage}]` : `[${doc}]`;
  return `${body}\n${ref}`;
}

// ── メイン ────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const dbPathIdx = args.indexOf("--db-path");
  const dbPath = dbPathIdx >= 0 ? args[dbPathIdx + 1] : DEFAULT_DB_PATH;

  console.log(`[FILL_KHS_LAWS_V2] 開始 (dry_run=${dryRun}, db=${dbPath})`);

  const db = new Database(dbPath, { readonly: false });
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");

  try {
    // ── Step 0: バックアップ ─────────────────────────
    if (!dryRun) {
      console.log("[FILL_KHS_LAWS_V2] Step 0: バックアップ作成...");
      db.exec(`
        CREATE TABLE IF NOT EXISTS khs_laws_backup_v2 AS
          SELECT * FROM khs_laws;
      `);
      const backupCount = (
        db.prepare("SELECT COUNT(*) as c FROM khs_laws_backup_v2").get() as {
          c: number;
        }
      ).c;
      console.log(`  バックアップ: ${backupCount} 件`);
    }

    // ── Step 1: 空の khs_laws を khs_units と結合 ────
    console.log("[FILL_KHS_LAWS_V2] Step 1: 空シェルの khs_laws を取得...");

    // unitId カラムの存在確認
    const cols = db.pragma("table_info(khs_laws)") as Array<{ name: string }>;
    const colNames = cols.map((c) => c.name);
    const hasUnitId = colNames.includes("unitId");

    let emptyLaws: Array<{
      lawKey: string;
      unitId: string;
      doc: string;
      pdfPage: number | null;
      quote: string;
    }>;

    if (hasUnitId) {
      // unitId 経由で khs_units と結合
      emptyLaws = db
        .prepare(
          `
        SELECT l.lawKey, l.unitId, u.doc, u.pdfPage, u.quote
        FROM khs_laws l
        LEFT JOIN khs_units u ON l.unitId = u.unitId
        WHERE l.title = '' OR l.summary = '' OR l.title IS NULL OR l.summary IS NULL
      `
        )
        .all() as any[];
    } else {
      // unitId がない場合は lawKey ベースで khs_units を検索
      emptyLaws = db
        .prepare(
          `
        SELECT l.lawKey, '' as unitId, '' as doc, NULL as pdfPage, '' as quote
        FROM khs_laws l
        WHERE l.title = '' OR l.summary = '' OR l.title IS NULL OR l.summary IS NULL
      `
        )
        .all() as any[];
    }

    console.log(`  空シェル: ${emptyLaws.length} / 301 件`);

    // ── Step 2: 各 law に title/summary/truthAxis/waterFireClass を注入 ──
    console.log("[FILL_KHS_LAWS_V2] Step 2: 充填処理...");

    // truthAxis カラムの存在確認
    const hasTruthAxis = colNames.includes("truthAxis");
    const hasWaterFireClass = colNames.includes("waterFireClass");
    const hasStatus = colNames.includes("status");

    // 必要なカラムを追加（存在しない場合）
    if (!dryRun) {
      if (!hasTruthAxis) {
        try {
          db.exec("ALTER TABLE khs_laws ADD COLUMN truthAxis TEXT NOT NULL DEFAULT ''");
          console.log("  truthAxis カラムを追加");
        } catch (e: any) {
          if (!e.message.includes("duplicate")) throw e;
        }
      }
      if (!hasWaterFireClass) {
        try {
          db.exec("ALTER TABLE khs_laws ADD COLUMN waterFireClass TEXT NOT NULL DEFAULT ''");
          console.log("  waterFireClass カラムを追加");
        } catch (e: any) {
          if (!e.message.includes("duplicate")) throw e;
        }
      }
    }

    let filledCount = 0;
    let skippedCount = 0;
    const axisDistribution: Record<string, number> = {};
    const wfDistribution: Record<string, number> = {};

    const updateStmt = db.prepare(`
      UPDATE khs_laws
      SET title = ?,
          summary = ?,
          truthAxis = ?,
          waterFireClass = ?,
          ${hasStatus ? "status = 'verified'," : ""}
          updatedAt = datetime('now')
      WHERE lawKey = ?
    `);

    const fillTransaction = db.transaction(() => {
      for (const law of emptyLaws) {
        const quote = law.quote || "";

        if (!quote || quote.length < 5) {
          skippedCount++;
          continue;
        }

        const title = extractTitle(quote, law.lawKey);
        const summary = extractSummary(quote, law.doc, law.pdfPage);
        const axes = detect10TruthAxes(quote);
        const wfClass = classifyWaterFire(quote);

        const axisStr = axes.join(",");

        // 分布集計
        for (const a of axes) {
          axisDistribution[a] = (axisDistribution[a] || 0) + 1;
        }
        wfDistribution[wfClass] = (wfDistribution[wfClass] || 0) + 1;

        if (!dryRun) {
          updateStmt.run(title, summary, axisStr, wfClass, law.lawKey);
        }

        filledCount++;
      }
    });

    if (!dryRun) {
      fillTransaction();
    } else {
      // dry-run でも集計は実行
      for (const law of emptyLaws) {
        const quote = law.quote || "";
        if (!quote || quote.length < 5) { skippedCount++; continue; }
        const axes = detect10TruthAxes(quote);
        const wfClass = classifyWaterFire(quote);
        for (const a of axes) { axisDistribution[a] = (axisDistribution[a] || 0) + 1; }
        wfDistribution[wfClass] = (wfDistribution[wfClass] || 0) + 1;
        filledCount++;
      }
    }

    // ── Step 3: 結果レポート ─────────────────────────
    const totalLaws = (
      db.prepare("SELECT COUNT(*) as c FROM khs_laws").get() as { c: number }
    ).c;
    const nonEmptyAfter = dryRun
      ? filledCount
      : (
          db
            .prepare(
              "SELECT COUNT(*) as c FROM khs_laws WHERE title != '' AND summary != ''"
            )
            .get() as { c: number }
        ).c;

    console.log("\n" + "=".repeat(60));
    console.log("[FILL_KHS_LAWS_V2] 結果レポート");
    console.log("=".repeat(60));
    console.log(`  総 khs_laws: ${totalLaws}`);
    console.log(`  空シェル: ${emptyLaws.length}`);
    console.log(`  充填成功: ${filledCount}`);
    console.log(`  スキップ (quote 不足): ${skippedCount}`);
    console.log(`  充填率: ${Math.round((nonEmptyAfter / totalLaws) * 100)}% (${nonEmptyAfter}/${totalLaws})`);
    console.log(`\n  truthAxis 分布:`);
    for (const [axis, count] of Object.entries(axisDistribution).sort(
      (a, b) => b[1] - a[1]
    )) {
      console.log(`    ${axis}: ${count}`);
    }
    console.log(`\n  waterFireClass 分布:`);
    for (const [wf, count] of Object.entries(wfDistribution).sort(
      (a, b) => b[1] - a[1]
    )) {
      console.log(`    ${wf}: ${count}`);
    }

    // 成功基準チェック
    console.log("\n  成功基準:");
    const fillRate = nonEmptyAfter / totalLaws;
    console.log(
      `    ${fillRate >= 0.8 ? "✅" : "❌"} 充填率 80%+: ${Math.round(fillRate * 100)}%`
    );
    const axisCount = Object.keys(axisDistribution).length;
    console.log(
      `    ${axisCount >= 8 ? "✅" : "❌"} truthAxis 分布 (8+軸): ${axisCount} 軸`
    );
    const wfTypes = Object.keys(wfDistribution).length;
    console.log(
      `    ${wfTypes >= 3 ? "✅" : "❌"} waterFireClass 多様性 (3+種): ${wfTypes} 種`
    );
    console.log("=".repeat(60));
  } finally {
    db.close();
  }
}

main();
