#!/usr/bin/env node
/**
 * SEED_KOTODAMA_CONSTITUTION_V1 — 言霊憲法 V1 12 条を memory_units に蒸留する seed script
 * ============================================================================
 *
 * CARD-CONSTITUTION-MEMORY-DISTILL-V1 (Phase B 副因 A 修復、Card-04 領域)
 * docs/ark/khs/KOTODAMA_CONSTITUTION_V1.txt の 12 条を memory_units に
 * 蒸留する SQL を生成する。
 *
 * 設計原則:
 *   - DRY-RUN ONLY: 直接 INSERT は disabled、出力のみ
 *   - 実 INSERT は migration 経由 (api/migrations/2026042500_kotodama_constitution_distill_v1.sql)
 *   - sha256 verify: KOTODAMA_CONSTITUTION_V1.sha256 と一致するか起動時検証
 *   - idempotent: INSERT OR IGNORE で再実行安全
 *   - 12 条本文の改変・要約・捏造を一切行わない (raw 転記)
 *
 * 出力形式:
 *   --dry-run        : デフォルト、出力のみ (DB write なし)
 *   --sql            : SQL INSERT 文を出力 (migration ファイル転記用)
 *   (--sql なし)     : JSON で 12 unit を出力 (検証用)
 *
 * 使用法:
 *   node api/scripts/seed_kotodama_constitution_v1.mjs --dry-run
 *   node api/scripts/seed_kotodama_constitution_v1.mjs --dry-run --sql
 *
 * memory_units schema 準拠:
 *   - id (PK), memory_scope (NOT NULL), scope_id (NOT NULL),
 *     memory_type (NOT NULL), title, summary (NOT NULL),
 *     structured_json (NOT NULL DEFAULT '{}'), evidence_json (NOT NULL DEFAULT '[]'),
 *     confidence, freshness_score, pinned, created_at, updated_at
 */

import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = process.env.TENMON_REPO_ROOT || path.resolve(__dirname, "../..");

const CONSTITUTION_PATH = path.join(REPO_ROOT, "docs/ark/khs/KOTODAMA_CONSTITUTION_V1.txt");
const SHA256_PATH = path.join(REPO_ROOT, "docs/ark/khs/KOTODAMA_CONSTITUTION_V1.sha256");

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const outputFormat = args.includes("--sql") ? "sql" : "json";

// ── パーサ ──────────────────────────────────────────
function parseConstitution(raw) {
  const articles = [];
  const lines = raw.split("\n");
  let i = 0;
  while (i < lines.length) {
    const sep = lines[i].trim();
    const isSep = sep.length >= 4 && /^[─]+$/.test(sep);
    if (isSep && i + 2 < lines.length) {
      const titleLine = lines[i + 1].trim();
      const m = titleLine.match(/^(\d+)\.\s*(.+)$/);
      const nextSep = lines[i + 2].trim();
      if (m && nextSep.length >= 4 && /^[─]+$/.test(nextSep)) {
        const articleNo = parseInt(m[1], 10);
        const title = m[2].trim();
        let j = i + 3;
        const bodyLines = [];
        while (j < lines.length) {
          const t = lines[j].trim();
          if (t.length >= 4 && /^[─]+$/.test(t)) break;
          bodyLines.push(lines[j]);
          j++;
        }
        while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].trim() === "") {
          bodyLines.pop();
        }
        articles.push({
          article_no: articleNo,
          title,
          body: bodyLines.join("\n").trim(),
        });
        i = j;
        continue;
      }
    }
    i++;
  }
  return articles
    .filter((a) => a.article_no >= 1 && a.article_no <= 12)
    .sort((a, b) => a.article_no - b.article_no);
}

// ── unit 構築 ──────────────────────────────────────
function buildMemoryUnit(article, sourceSha256, createdAtIso) {
  const id = `kotodama_constitution_v1_article_${String(article.article_no).padStart(2, "0")}`;
  const title = `言霊憲法 V1 第${article.article_no}条 ${article.title}`;
  const summary = `${article.title}\n\n${article.body}`;
  const structured = {
    article_no: article.article_no,
    article_title: article.title,
    source: "KOTODAMA_CONSTITUTION_V1.txt",
    source_sha256: sourceSha256,
    seal: "kotodama_constitution_v1",
    scriptureKey: "kotodama_constitution_v1",
    resolvedLevel: "scripture",
  };
  const evidence = {
    source_table: "KOTODAMA_CONSTITUTION_V1.txt",
    source_path: "docs/ark/khs/KOTODAMA_CONSTITUTION_V1.txt",
    source_sha256: sourceSha256,
    article_no: article.article_no,
    promoted_from: "CARD-CONSTITUTION-MEMORY-DISTILL-V1",
    hasEvidence: true,
    hasLawTrace: true,
    createdAt: createdAtIso,
  };
  return {
    id,
    memory_scope: "source",
    scope_id: "kotodama_constitution_v1",
    memory_type: "scripture_distill",
    title,
    summary,
    structured_json: JSON.stringify(structured),
    evidence_json: JSON.stringify(evidence),
    confidence: 1.0,
    freshness_score: 1.0,
    pinned: 1,
    created_at: createdAtIso,
    updated_at: createdAtIso,
  };
}

function sqlEscape(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  return "'" + String(v).replace(/'/g, "''") + "'";
}

function emitSql(u) {
  return [
    "INSERT OR IGNORE INTO memory_units",
    "  (id, memory_scope, scope_id, memory_type, title, summary,",
    "   structured_json, evidence_json, confidence, freshness_score, pinned,",
    "   created_at, updated_at)",
    "VALUES (",
    "  " + sqlEscape(u.id) + ",",
    "  " + sqlEscape(u.memory_scope) + ",",
    "  " + sqlEscape(u.scope_id) + ",",
    "  " + sqlEscape(u.memory_type) + ",",
    "  " + sqlEscape(u.title) + ",",
    "  " + sqlEscape(u.summary) + ",",
    "  " + sqlEscape(u.structured_json) + ",",
    "  " + sqlEscape(u.evidence_json) + ",",
    "  " + u.confidence + ",",
    "  " + u.freshness_score + ",",
    "  " + u.pinned + ",",
    "  " + sqlEscape(u.created_at) + ",",
    "  " + sqlEscape(u.updated_at),
    ");",
  ].join("\n");
}

// ── main ────────────────────────────────────────────
function main() {
  if (!existsSync(CONSTITUTION_PATH)) {
    console.error(`[ERROR] Constitution file not found: ${CONSTITUTION_PATH}`);
    process.exit(1);
  }

  const raw = readFileSync(CONSTITUTION_PATH, "utf-8");
  const sha256 = createHash("sha256").update(raw).digest("hex");

  if (existsSync(SHA256_PATH)) {
    const sealRaw = readFileSync(SHA256_PATH, "utf-8");
    const expectedSha256 = sealRaw.split(/\s+/)[0].toLowerCase();
    if (sha256 !== expectedSha256) {
      console.error(`[ERROR] sha256 mismatch! Got: ${sha256}, Expected: ${expectedSha256}`);
      process.exit(2);
    }
    console.error(`[INFO] sha256 VERIFIED: ${sha256.slice(0, 16)}...`);
  } else {
    console.error(`[WARN] ${SHA256_PATH} not found - sha256 verify skipped`);
  }

  console.error(`[INFO] Constitution loaded (${raw.length} bytes)`);

  const articles = parseConstitution(raw);
  console.error(`[INFO] Parsed ${articles.length} articles`);

  if (articles.length !== 12) {
    console.error(`[ERROR] Expected 12 articles, got ${articles.length}`);
    process.exit(3);
  }

  const createdAtIso = "2026-04-25T00:00:00.000Z";
  const units = articles.map((a) => buildMemoryUnit(a, sha256, createdAtIso));

  if (!isDryRun) {
    console.error("[ERROR] Direct INSERT mode is disabled in this card.");
    console.error("[ERROR] Use --dry-run to inspect output, then apply via:");
    console.error("[ERROR]   sqlite3 /opt/tenmon-ark-data/kokuzo.sqlite \\");
    console.error("[ERROR]     < api/migrations/2026042500_kotodama_constitution_distill_v1.sql");
    process.exit(4);
  }

  console.error("=== DRY RUN: would insert the following 12 units (no DB write) ===");
  if (outputFormat === "sql") {
    process.stdout.write(
      "BEGIN TRANSACTION;\n\n" +
        units.map((u, i) => `-- 第 ${u.summary.split("\n")[0] || i + 1} 条\n${emitSql(u)}`).join("\n\n") +
        "\n\nCOMMIT;\n"
    );
  } else {
    process.stdout.write(JSON.stringify(units, null, 2) + "\n");
  }
  console.error("=== DRY RUN END (no DB write performed) ===");
}

main();
