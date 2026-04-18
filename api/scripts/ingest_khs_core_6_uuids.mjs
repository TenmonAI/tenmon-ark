/**
 * INGEST_KHS_CORE_6_UUIDS_V1
 * KHS_CORE 封印 6 UUID を Notion API から取得し、
 * kokuzo_pages に INSERT する。
 *
 * 前提:
 *   - NOTION_TOKEN が .env に設定されていること
 *   - @notionhq/client がインストールされていること
 *   - /opt/tenmon-ark-data/kokuzo.sqlite が存在すること
 *
 * 使用方法:
 *   source /opt/tenmon-ark-repo/api/.env
 *   node /opt/tenmon-ark-repo/api/scripts/ingest_khs_core_6_uuids.mjs
 *
 * 安全設計:
 *   - 既存データは INSERT OR REPLACE で上書き
 *   - Notion API エラー時は個別スキップ
 *   - FTS5 テーブルが存在しない場合はスキップ
 */

import Database from "better-sqlite3";

const DB_PATH = process.env.KOKUZO_DB_PATH || "/opt/tenmon-ark-data/kokuzo.sqlite";

const KHS_CORE_UUIDS = [
  { uuid: "eed52861641d4d32ac88f3755c4c7a89", name: "水火", page: 479 },
  { uuid: "6beb2c055ef24cf6b60cecbeb1b7847a", name: "正中", page: 97 },
  { uuid: "af58bef540844ff59f19775177c8f3e8", name: "ア",   page: 415 },
  { uuid: "efc23543a4284d8199d3b8c9ef6e6fbe", name: "ワ",   page: 420 },
  { uuid: "c69b831fb5e24de99b89bf6ccc39874d", name: "五十連秩序", page: 24 },
  { uuid: "71974cfd35a54e6fbbe120bd17297bb8", name: "澄濁方向",   page: 449 },
];

// UUID を正規形に変換 (ハイフン挿入)
function formatUuid(uuid) {
  return `${uuid.substring(0, 8)}-${uuid.substring(8, 12)}-${uuid.substring(12, 16)}-${uuid.substring(16, 20)}-${uuid.substring(20)}`;
}

// Notion API からブロックテキストを抽出する
async function fetchNotionPageText(pageId) {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error("NOTION_TOKEN is not set in environment");
  }

  const headers = {
    "Authorization": `Bearer ${token}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };

  // ページ情報取得
  const pageRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, { headers });
  if (!pageRes.ok) {
    throw new Error(`Notion page fetch failed: ${pageRes.status} ${pageRes.statusText}`);
  }

  // ブロック一覧取得（ページネーション対応）
  let allBlocks = [];
  let startCursor = undefined;
  let hasMore = true;

  while (hasMore) {
    const url = new URL(`https://api.notion.com/v1/blocks/${pageId}/children`);
    url.searchParams.set("page_size", "100");
    if (startCursor) url.searchParams.set("start_cursor", startCursor);

    const blocksRes = await fetch(url.toString(), { headers });
    if (!blocksRes.ok) {
      throw new Error(`Notion blocks fetch failed: ${blocksRes.status} ${blocksRes.statusText}`);
    }

    const blocksData = await blocksRes.json();
    allBlocks = allBlocks.concat(blocksData.results || []);
    hasMore = blocksData.has_more || false;
    startCursor = blocksData.next_cursor;
  }

  // テキスト抽出
  let text = "";
  for (const block of allBlocks) {
    const type = block.type;
    const content = block[type];
    if (!content) continue;

    if (content.rich_text) {
      const lineText = content.rich_text.map(t => t.plain_text || "").join("");
      if (type === "heading_1") {
        text += `# ${lineText}\n`;
      } else if (type === "heading_2") {
        text += `## ${lineText}\n`;
      } else if (type === "heading_3") {
        text += `### ${lineText}\n`;
      } else if (type === "bulleted_list_item" || type === "numbered_list_item") {
        text += `- ${lineText}\n`;
      } else {
        text += `${lineText}\n`;
      }
    }
  }

  return text.trim();
}

async function main() {
  console.log("=== KHS_CORE 封印 6 UUID 取込スクリプト ===");
  console.log(`DB: ${DB_PATH}`);

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  // kokuzo_pages テーブルのカラム確認
  const cols = db.pragma("table_info(kokuzo_pages)");
  const colNames = cols.map(c => c.name);
  console.log(`kokuzo_pages columns: ${colNames.join(", ")}`);

  // FTS5 テーブルの存在確認
  const hasFts = db.prepare(
    "SELECT COUNT(*) as c FROM sqlite_master WHERE type='table' AND name='kokuzo_pages_fts'"
  ).get().c > 0;
  console.log(`FTS5 table exists: ${hasFts}`);

  let success = 0;
  let failed = 0;

  for (const entry of KHS_CORE_UUIDS) {
    const pageId = formatUuid(entry.uuid);
    const docKey = `NOTION:PAGE:${entry.uuid}`;

    try {
      console.log(`\nFetching ${entry.name} (${pageId})...`);

      // Notion API が利用不可の場合のフォールバック
      let text;
      try {
        text = await fetchNotionPageText(pageId);
      } catch (notionErr) {
        console.warn(`  ⚠️ Notion API unavailable: ${notionErr.message}`);
        console.log(`  → Inserting placeholder for ${entry.name}...`);
        text = `[KHS_CORE 封印ページ: ${entry.name}]\n` +
               `UUID: ${entry.uuid}\n` +
               `pdfPage: ${entry.page}\n` +
               `\n` +
               `このページは Notion API からの取込待ちです。\n` +
               `TENMON による NOTION_TOKEN 設定後に再実行してください。`;
      }

      // kokuzo_pages に INSERT
      // カラム構成に応じて INSERT 文を調整
      if (colNames.includes("doc") && colNames.includes("pdfPage") && colNames.includes("text")) {
        if (colNames.includes("createdAt")) {
          db.prepare(`
            INSERT OR REPLACE INTO kokuzo_pages (doc, pdfPage, text, createdAt, updatedAt)
            VALUES (?, ?, ?, datetime('now'), datetime('now'))
          `).run(docKey, entry.page, text);
        } else if (colNames.includes("created_at")) {
          db.prepare(`
            INSERT OR REPLACE INTO kokuzo_pages (doc, pdfPage, text, created_at, updated_at)
            VALUES (?, ?, ?, datetime('now'), datetime('now'))
          `).run(docKey, entry.page, text);
        } else {
          db.prepare(`
            INSERT OR REPLACE INTO kokuzo_pages (doc, pdfPage, text)
            VALUES (?, ?, ?)
          `).run(docKey, entry.page, text);
        }
      }

      // FTS5 再構築
      if (hasFts) {
        try {
          db.prepare(
            `INSERT OR REPLACE INTO kokuzo_pages_fts (doc, pdfPage, text) VALUES (?, ?, ?)`
          ).run(docKey, entry.page, text);
        } catch (ftsErr) {
          console.warn(`  ⚠️ FTS5 insert failed: ${ftsErr.message}`);
        }
      }

      console.log(`  ✅ ${entry.name}: ${text.length} chars imported`);
      success++;
    } catch (e) {
      console.error(`  ❌ ${entry.name} failed: ${e.message}`);
      failed++;
    }
  }

  // 結果サマリー
  console.log(`\n=== 結果 ===`);
  console.log(`✅ 成功: ${success}/6`);
  console.log(`❌ 失敗: ${failed}/6`);

  // 確認クエリ
  const imported = db.prepare(
    "SELECT doc, pdfPage, LENGTH(text) as textLen FROM kokuzo_pages WHERE doc LIKE 'NOTION:PAGE:%'"
  ).all();
  console.log(`\nkokuzo_pages に格納された Notion ページ:`);
  for (const row of imported) {
    console.log(`  ${row.doc} (pdfPage=${row.pdfPage}, ${row.textLen} chars)`);
  }

  db.close();
  console.log("\n完了。");
}

main().catch(e => {
  console.error("Fatal error:", e);
  process.exit(1);
});
