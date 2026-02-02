#!/usr/bin/env node
// /opt/tenmon-corpus/db/khs_pages.jsonl（または khs_text.jsonl）を
// /opt/tenmon-ark-data/kokuzo.sqlite の kokuzo_pages に投入するスクリプト

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JSONL_FILE = process.argv[2];
const KOKUZO_DB = process.argv[3];
const DOC_NAME = process.argv[4] || "KHS";

if (!JSONL_FILE || !KOKUZO_DB) {
  console.error("Usage: node ingest_khs_from_corpus.mjs <jsonl_file> <db_path> [doc_name]");
  process.exit(1);
}

if (!fs.existsSync(JSONL_FILE)) {
  console.error(`[FAIL] jsonl file not found: ${JSONL_FILE}`);
  process.exit(1);
}

if (!fs.existsSync(KOKUZO_DB)) {
  console.error(`[FAIL] kokuzo.sqlite not found: ${KOKUZO_DB}`);
  process.exit(1);
}

console.log(`[INGEST] Reading ${JSONL_FILE}`);

// jsonl を読み込む
const content = fs.readFileSync(JSONL_FILE, "utf-8");
const lines = content.split("\n").filter((l) => l.trim().length > 0);

const records = [];
for (const line of lines) {
  try {
    const rec = JSON.parse(line);
    if (typeof rec.pdfPage === "number" && typeof rec.text === "string") {
      records.push({
        doc: String(rec.doc || DOC_NAME),
        pdfPage: Number(rec.pdfPage),
        text: String(rec.text || ""),
      });
    }
  } catch (err) {
    console.warn(`[WARN] Failed to parse line: ${err.message}`);
  }
}

console.log(`[INGEST] Loaded ${records.length} records`);

// DB に接続
const db = new DatabaseSync(KOKUZO_DB);

// テーブルが存在するか確認
const tableExists = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='kokuzo_pages'")
  .get();
if (!tableExists) {
  console.error(`[FAIL] kokuzo_pages table not found in ${KOKUZO_DB}`);
  process.exit(1);
}

// sha フィールドの有無を確認
const tableInfo = db.prepare("PRAGMA table_info(kokuzo_pages)").all();
const hasSha = tableInfo.some((col) => col.name === "sha");

// UPSERT 用の prepared statement
let upsertStmt;
if (hasSha) {
  upsertStmt = db.prepare(`
    INSERT OR REPLACE INTO kokuzo_pages (doc, pdfPage, text, sha, updatedAt)
    VALUES (?, ?, ?, ?, ?)
  `);
} else {
  upsertStmt = db.prepare(`
    INSERT OR REPLACE INTO kokuzo_pages (doc, pdfPage, text, updatedAt)
    VALUES (?, ?, ?, ?)
  `);
}

// rowid 取得用
const getRowidStmt = db.prepare("SELECT rowid FROM kokuzo_pages WHERE doc = ? AND pdfPage = ?");

// FTS5 削除用
const ftsDeleteStmt = db.prepare("DELETE FROM kokuzo_pages_fts WHERE rowid = ?");

// FTS5 挿入用
const ftsInsertStmt = db.prepare(`
  INSERT INTO kokuzo_pages_fts(rowid, doc, pdfPage, text)
  VALUES (?, ?, ?, ?)
`);

// SHA を生成する関数
function generateSha(text) {
  return createHash("sha256").update(text).digest("hex").substring(0, 16);
}

// 投入実行（トランザクションなしで直接実行）
let inserted = 0;
for (const rec of records) {
  const { doc, pdfPage, text } = rec;
  
  // SHA を生成
  const sha = generateSha(text);
  const now = new Date().toISOString();
  
  // kokuzo_pages に UPSERT
  if (hasSha) {
    upsertStmt.run(doc, pdfPage, text, sha, now);
  } else {
    upsertStmt.run(doc, pdfPage, text, now);
  }
  
  // rowid を取得
  const row = getRowidStmt.get(doc, pdfPage);
  if (row) {
    const rowid = row.rowid;
    
    // FTS5 を更新
    ftsDeleteStmt.run(rowid);
    ftsInsertStmt.run(rowid, doc, pdfPage, text);
  }
  
  inserted++;
  if (inserted % 100 === 0) {
    console.log(`[INGEST] Inserted ${inserted}/${records.length} pages...`);
  }
}

console.log(`[INGEST] Inserted ${inserted} pages`);

// 確認
const count = db.prepare("SELECT COUNT(*) as cnt FROM kokuzo_pages WHERE doc = ?").get(DOC_NAME);
console.log(`[PASS] KHS pages count: ${count.cnt}`);

const ftsCount = db.prepare("SELECT COUNT(*) as cnt FROM kokuzo_pages_fts WHERE doc = ?").get(DOC_NAME);
console.log(`[PASS] KHS FTS entries: ${ftsCount.cnt}`);

db.close();

console.log(`[DONE] Ingested ${inserted} pages from ${JSONL_FILE}`);
