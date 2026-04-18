/**
 * EXPAND_SACRED_CORPUS_V2 — Sacred Corpus 展開スクリプト
 * ======================================================
 *
 * kokuzo_pages (20,094 ページ) から doc 単位でコーパスを登録し、
 * 代表ページからセグメントを生成、truth_axes_bindings を付与する。
 *
 * 現状: sacred_corpus_registry 4件、sacred_segments 9件
 * 目標: 20+ コーパス、200+ セグメント
 *
 * 安全設計:
 *   - INSERT OR IGNORE で重複安全
 *   - --dry-run で書き込みなし確認可能
 *   - 全操作をトランザクション内で実行
 *
 * 使用法:
 *   npx tsx api/src/scripts/expand_sacred_corpus_v2.ts [--dry-run] [--db-path /path/to/kokuzo.sqlite]
 *
 * 成功基準:
 *   ✅ sacred_corpus_registry: 20+ コーパス (現 4)
 *   ✅ sacred_segments: 200+ セグメント (現 9)
 *   ✅ 各セグメントに truth_axis binding
 */

import Database from "better-sqlite3";
import { randomUUID } from "crypto";

// ── 設定 ─────────────────────────────────────────────
const DEFAULT_DB_PATH =
  process.env.KOKUZO_DB_PATH || "/opt/tenmon-ark-data/kokuzo.sqlite";

// ── 伝統分類マッピング ──────────────────────────────
interface TraditionMapping {
  tradition: string;
  corpusFamily: string;
  corpusKind: "primary" | "translation" | "commentary" | "paraphrase" | "anthology";
  canonTier: number;
  provenanceConfidence: number;
}

function detectTradition(doc: string): TraditionMapping {
  const d = doc.toLowerCase();

  // カタカムナ系
  if (d.includes("カタカムナ") || d.includes("katakamuna") || d.includes("相似象")) {
    return {
      tradition: "KATAKAMUNA",
      corpusFamily: "katakamuna_corpus",
      corpusKind: "primary",
      canonTier: 10,
      provenanceConfidence: 0.95,
    };
  }

  // 言霊系
  if (d.includes("言霊") || d.includes("kotodama") || d.includes("五十音") || d.includes("水穂伝")) {
    return {
      tradition: "KOTODAMA",
      corpusFamily: "kotodama_corpus",
      corpusKind: "primary",
      canonTier: 5,
      provenanceConfidence: 0.9,
    };
  }

  // 天津金木系
  if (d.includes("天津金木") || d.includes("金木") || d.includes("kanagi") || d.includes("フトマニ")) {
    return {
      tradition: "AMATSU_KANAGI",
      corpusFamily: "kanagi_corpus",
      corpusKind: "primary",
      canonTier: 8,
      provenanceConfidence: 0.9,
    };
  }

  // 古事記・日本書紀系
  if (d.includes("古事記") || d.includes("日本書紀") || d.includes("kojiki") || d.includes("神代")) {
    return {
      tradition: "KOSHINTO",
      corpusFamily: "koshinto_corpus",
      corpusKind: "primary",
      canonTier: 15,
      provenanceConfidence: 0.85,
    };
  }

  // 法華経・仏教系
  if (d.includes("法華") || d.includes("般若") || d.includes("仏教") || d.includes("サンスクリット") || d.includes("dharma")) {
    return {
      tradition: "BUDDHISM",
      corpusFamily: "buddhist_corpus",
      corpusKind: "translation",
      canonTier: 20,
      provenanceConfidence: 0.8,
    };
  }

  // 宿曜系
  if (d.includes("宿曜") || d.includes("sukuyou") || d.includes("二十七宿") || d.includes("星宿")) {
    return {
      tradition: "SUKUYOU",
      corpusFamily: "sukuyou_corpus",
      corpusKind: "primary",
      canonTier: 12,
      provenanceConfidence: 0.85,
    };
  }

  // 聖書・ヘブライ系
  if (d.includes("聖書") || d.includes("ヘブライ") || d.includes("アーク") || d.includes("契約") || d.includes("旧約")) {
    return {
      tradition: "HEBREW",
      corpusFamily: "hebrew_corpus",
      corpusKind: "translation",
      canonTier: 25,
      provenanceConfidence: 0.75,
    };
  }

  // 天聞仁聞著作
  if (d.includes("天聞") || d.includes("仁聞") || d.includes("tenmon")) {
    return {
      tradition: "TENMON_ORIGINAL",
      corpusFamily: "tenmon_corpus",
      corpusKind: "primary",
      canonTier: 1,
      provenanceConfidence: 1.0,
    };
  }

  // デフォルト
  return {
    tradition: "GENERAL",
    corpusFamily: "general_corpus",
    corpusKind: "commentary",
    canonTier: 100,
    provenanceConfidence: 0.5,
  };
}

// ── truth_axis 検出 (循環ループと同一ロジック) ───────
const TRUTH_AXES = [
  "cycle", "polarity", "center", "breath", "carami",
  "order", "correspondence", "manifestation", "purification", "governance",
] as const;

type TruthAxis = (typeof TRUTH_AXES)[number];

const AXIS_KEYWORDS: Record<TruthAxis, string[]> = {
  cycle: ["循環", "巡り", "回帰", "周期", "めぐり", "サイクル", "輪廻", "繰り返し", "還", "転"],
  polarity: ["水火", "イキ", "陰陽", "対極", "二元", "水", "火", "上下", "昇降", "澄濁"],
  center: ["正中", "まなか", "中心", "ゝ", "凝", "ア", "基底", "母体", "惣名", "中軸"],
  breath: ["息", "呼吸", "吐納", "気息", "ブレス", "吸", "吐", "氣", "生命力", "活力"],
  carami: ["カラミ", "絡み", "交合", "結合", "與合", "くみあい", "交差", "螺旋", "DNA", "組み合わせ"],
  order: ["秩序", "配列", "順序", "五十連", "行列", "位", "階層", "序列", "法則", "規則"],
  correspondence: ["対応", "照応", "写像", "相似", "フラクタル", "鏡", "反映", "共鳴", "響き", "呼応"],
  manifestation: ["顕現", "形", "現象", "顕れ", "発現", "生成", "創造", "産み", "成り", "ワ", "国土"],
  purification: ["浄化", "禊", "澄", "清", "祓", "洗", "純化", "精錬", "昇華", "祓い"],
  governance: ["統治", "君位", "臣", "治", "政", "タカアマハラ", "高天原", "天津", "国津", "主宰"],
};

function detectAxes(text: string): TruthAxis[] {
  const results: Array<{ axis: TruthAxis; score: number }> = [];
  for (const axis of TRUTH_AXES) {
    let hits = 0;
    for (const kw of AXIS_KEYWORDS[axis]) {
      if (text.includes(kw)) hits++;
    }
    if (hits > 0) results.push({ axis, score: hits });
  }
  results.sort((a, b) => b.score - a.score);
  if (results.length === 0) results.push({ axis: "center", score: 0 });
  return results.slice(0, 3).map((r) => r.axis);
}

// ── メイン ────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const dbPathIdx = args.indexOf("--db-path");
  const dbPath = dbPathIdx >= 0 ? args[dbPathIdx + 1] : DEFAULT_DB_PATH;

  console.log(`[EXPAND_SACRED_CORPUS_V2] 開始 (dry_run=${dryRun}, db=${dbPath})`);

  const db = new Database(dbPath, { readonly: false });
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");

  try {
    // ── Step 1: kokuzo_pages の doc 一覧を取得 ───────
    console.log("[EXPAND_SACRED_CORPUS_V2] Step 1: doc 一覧取得...");

    const uniqueDocs = db
      .prepare(
        `
      SELECT doc, COUNT(*) as pageCount,
             MIN(pdfPage) as minPage, MAX(pdfPage) as maxPage
      FROM kokuzo_pages
      GROUP BY doc
      ORDER BY pageCount DESC
    `
      )
      .all() as Array<{
      doc: string;
      pageCount: number;
      minPage: number;
      maxPage: number;
    }>;

    console.log(`  ユニーク doc: ${uniqueDocs.length}`);
    console.log(`  総ページ: ${uniqueDocs.reduce((s, d) => s + d.pageCount, 0)}`);

    // ── Step 2: sacred_corpus_registry に登録 ────────
    console.log("[EXPAND_SACRED_CORPUS_V2] Step 2: コーパス登録...");

    const insertCorpus = db.prepare(`
      INSERT OR IGNORE INTO sacred_corpus_registry
      (id, tradition, corpus_family, title_original, title_japanese,
       language, corpus_kind, canon_tier, provenance_confidence)
      VALUES (?, ?, ?, ?, ?, 'ja', ?, ?, ?)
    `);

    let corpusInserted = 0;

    const corpusTransaction = db.transaction(() => {
      for (const { doc, pageCount } of uniqueDocs) {
        const mapping = detectTradition(doc);
        const corpusId = `CORPUS:${doc}`;

        if (!dryRun) {
          const result = insertCorpus.run(
            corpusId,
            mapping.tradition,
            mapping.corpusFamily,
            doc,
            doc,
            mapping.corpusKind,
            mapping.canonTier,
            mapping.provenanceConfidence
          );
          if (result.changes > 0) corpusInserted++;
        } else {
          corpusInserted++;
        }
      }
    });

    if (!dryRun) {
      corpusTransaction();
    }

    console.log(`  新規登録: ${corpusInserted} コーパス`);

    // ── Step 3: 代表ページからセグメント生成 ─────────
    console.log("[EXPAND_SACRED_CORPUS_V2] Step 3: セグメント生成...");

    // 各 doc から代表ページを選択（先頭、中間、末尾 + 10ページ間隔）
    const insertSegment = db.prepare(`
      INSERT OR IGNORE INTO sacred_segments
      (id, corpus_id, source_registry_id, book_or_scroll, chapter,
       verse_or_section, original_text, normalized_text,
       createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    // truth_axes_bindings のスキーマ確認・作成
    const tablesExist = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='truth_axes_bindings'"
      )
      .get();

    if (!tablesExist && !dryRun) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS truth_axes_bindings (
          id TEXT PRIMARY KEY,
          segment_id TEXT NOT NULL,
          axis_key TEXT NOT NULL,
          confidence REAL NOT NULL DEFAULT 0.8,
          binding_reason TEXT NOT NULL DEFAULT '',
          createdAt TEXT NOT NULL DEFAULT (datetime('now')),
          updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_tab_segment ON truth_axes_bindings(segment_id);
        CREATE INDEX IF NOT EXISTS idx_tab_axis ON truth_axes_bindings(axis_key);
      `);
      console.log("  truth_axes_bindings テーブルを作成");
    }

    const insertBinding = db.prepare(`
      INSERT OR IGNORE INTO truth_axes_bindings
      (id, segment_id, axis_key, confidence, binding_reason)
      VALUES (?, ?, ?, ?, ?)
    `);

    let segmentInserted = 0;
    let bindingInserted = 0;
    const traditionDistribution: Record<string, number> = {};

    const segmentTransaction = db.transaction(() => {
      for (const { doc, pageCount, minPage, maxPage } of uniqueDocs) {
        const corpusId = `CORPUS:${doc}`;
        const mapping = detectTradition(doc);

        // 代表ページの選択戦略
        const samplePages: number[] = [];

        // 先頭ページ
        samplePages.push(minPage);

        // 10ページ間隔でサンプリング（最大20ページ/doc）
        if (pageCount > 2) {
          const step = Math.max(1, Math.floor(pageCount / 20));
          for (let p = minPage + step; p < maxPage; p += step) {
            samplePages.push(p);
            if (samplePages.length >= 20) break;
          }
        }

        // 末尾ページ
        if (maxPage !== minPage) {
          samplePages.push(maxPage);
        }

        // 重複除去
        const uniquePages = [...new Set(samplePages)].sort((a, b) => a - b);

        // 各代表ページからセグメント生成
        for (const page of uniquePages) {
          const pageData = db
            .prepare(
              "SELECT text FROM kokuzo_pages WHERE doc = ? AND pdfPage = ?"
            )
            .get(doc, page) as { text: string } | undefined;

          if (!pageData || !pageData.text || pageData.text.length < 10) continue;

          const segmentId = `SEG:${doc}:p${page}`;
          const text = pageData.text.substring(0, 2000); // 最大 2000 文字

          if (!dryRun) {
            const result = insertSegment.run(
              segmentId,
              corpusId,
              corpusId,
              doc,
              `page_${page}`,
              `p${page}`,
              text,
              text
            );
            if (result.changes > 0) {
              segmentInserted++;

              // truth_axis binding
              const axes = detectAxes(text);
              for (const axis of axes) {
                const bindResult = insertBinding.run(
                  `TAB:${segmentId}:${axis}`,
                  segmentId,
                  axis,
                  0.8,
                  "expand_sacred_corpus_v2"
                );
                if (bindResult.changes > 0) bindingInserted++;
              }
            }
          } else {
            segmentInserted++;
            const axes = detectAxes(text);
            bindingInserted += axes.length;
          }

          traditionDistribution[mapping.tradition] =
            (traditionDistribution[mapping.tradition] || 0) + 1;
        }
      }
    });

    if (!dryRun) {
      segmentTransaction();
    }

    console.log(`  新規セグメント: ${segmentInserted}`);
    console.log(`  新規 truth_axis binding: ${bindingInserted}`);

    // ── Step 4: 結果レポート ─────────────────────────
    const totalCorpus = dryRun
      ? corpusInserted + 4
      : (
          db
            .prepare("SELECT COUNT(*) as c FROM sacred_corpus_registry")
            .get() as { c: number }
        ).c;
    const totalSegments = dryRun
      ? segmentInserted + 9
      : (
          db
            .prepare("SELECT COUNT(*) as c FROM sacred_segments")
            .get() as { c: number }
        ).c;
    const totalBindings = dryRun
      ? bindingInserted + 2
      : (
          db
            .prepare("SELECT COUNT(*) as c FROM truth_axes_bindings")
            .get() as { c: number }
        ).c;

    console.log("\n" + "=".repeat(60));
    console.log("[EXPAND_SACRED_CORPUS_V2] 結果レポート");
    console.log("=".repeat(60));
    console.log(`  sacred_corpus_registry: ${totalCorpus} (新規 ${corpusInserted})`);
    console.log(`  sacred_segments: ${totalSegments} (新規 ${segmentInserted})`);
    console.log(`  truth_axes_bindings: ${totalBindings} (新規 ${bindingInserted})`);
    console.log(`\n  伝統分布:`);
    for (const [tradition, count] of Object.entries(traditionDistribution).sort(
      (a, b) => b[1] - a[1]
    )) {
      console.log(`    ${tradition}: ${count} セグメント`);
    }

    // 成功基準チェック
    console.log("\n  成功基準:");
    console.log(
      `    ${totalCorpus >= 20 ? "✅" : "❌"} コーパス 20+: ${totalCorpus}`
    );
    console.log(
      `    ${totalSegments >= 200 ? "✅" : "❌"} セグメント 200+: ${totalSegments}`
    );
    console.log(
      `    ${totalBindings >= 100 ? "✅" : "❌"} truth_axis binding 100+: ${totalBindings}`
    );
    console.log("=".repeat(60));
  } finally {
    db.close();
  }
}

main();
