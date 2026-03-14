#!/usr/bin/env node
/**
 * kokuzo_bulk_manifest.json に基づき、PDF を kokuzo_pages + FTS に一括投入するスクリプト。
 * 実行前に api をビルドすること: npm run build
 * 使い方:
 *   node scripts/ingest_kokuzo_bulk.mjs --dry-run   # 件数・対象のみ表示
 *   node scripts/ingest_kokuzo_bulk.mjs --run      # 実投入（ファイルが存在する項目のみ）
 *
 * データディレクトリ: TENMON_DATA_DIR または /opt/tenmon-ark-data
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = path.join(__dirname, "kokuzo_bulk_manifest.json");

const PYTHON_EXTRACT_SCRIPT = `import sys
import json

pdf_path = sys.argv[1]
jsonl_path = sys.argv[2]

pages = []

try:
    import PyPDF2
    with open(pdf_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for i, page in enumerate(reader.pages, 1):
            try:
                text = page.extract_text() or ""
            except:
                text = ""
            pages.append({"pdfPage": i, "text": text})
except ImportError:
    try:
        import pypdf
        with open(pdf_path, "rb") as f:
            reader = pypdf.PdfReader(f)
            for i, page in enumerate(reader.pages, 1):
                try:
                    text = page.extract_text() or ""
                except:
                    text = ""
                pages.append({"pdfPage": i, "text": text})
    except ImportError:
        import subprocess
        page_num = 1
        while page_num <= 10000:
            try:
                result = subprocess.run(
                    ["pdftotext", "-f", str(page_num), "-l", str(page_num), pdf_path, "-"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                    check=False
                )
                if result.returncode != 0:
                    break
                text = result.stdout.strip() if result.stdout else ""
                if not text and page_num == 1:
                    break
                pages.append({"pdfPage": page_num, "text": text})
                page_num += 1
            except (subprocess.TimeoutExpired, FileNotFoundError):
                break

if len(pages) == 0:
    sys.exit(1)

with open(jsonl_path, "w", encoding="utf-8") as f:
    for page in pages:
        f.write(json.dumps(page, ensure_ascii=False) + "\\n")

sys.stderr.write(f"Extracted {len(pages)} pages\\n")
`;

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`[FAIL] Manifest not found: ${MANIFEST_PATH}`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  return Array.isArray(raw) ? raw : [];
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const run = args.includes("--run");

  if (!dryRun && !run) {
    console.error("Usage: node scripts/ingest_kokuzo_bulk.mjs --dry-run | --run");
    process.exit(1);
  }

  const manifest = loadManifest();
  const dataDir = process.env.TENMON_DATA_DIR ?? "/opt/tenmon-ark-data";

  if (dryRun) {
    let present = 0;
    let missing = 0;
    console.log("[DRY-RUN] dataDir:", dataDir);
    console.log("[DRY-RUN] manifest entries:", manifest.length);
    for (const entry of manifest) {
      const fullPath = path.join(dataDir, entry.path);
      const exists = fs.existsSync(fullPath);
      if (exists) present++;
      else missing++;
      console.log(`  ${exists ? "OK" : "MISS"} ${entry.doc} ${entry.path} (${entry.label ?? ""})`);
    }
    console.log("[DRY-RUN] present:", present, "missing:", missing);
    return;
  }

  // --run: use dist (build required)
  const { getTenmonDataDir, getDb, dbPrepare } = await import("../dist/db/index.js");
  const { upsertPage } = await import("../dist/kokuzo/pages.js");

  const resolvedDataDir = getTenmonDataDir();
  const dbDir = path.join(resolvedDataDir, "db");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  let totalPages = 0;
  const results = [];

  for (const entry of manifest) {
    const filePath = path.join(resolvedDataDir, entry.path);
    if (!fs.existsSync(filePath)) {
      console.log(`[SKIP] ${entry.doc} (file not found: ${entry.path})`);
      continue;
    }

    const doc = entry.doc;
    const tmpJsonl = path.join(resolvedDataDir, "db", `ingest_bulk_${doc}.jsonl`);

    try {
      execFileSync("python3", ["-c", PYTHON_EXTRACT_SCRIPT, filePath, tmpJsonl], {
        encoding: "utf-8",
        maxBuffer: 50 * 1024 * 1024,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (e) {
      console.warn(`[WARN] ${doc} PDF extraction failed:`, e?.message ?? e);
      try {
        if (fs.existsSync(tmpJsonl)) fs.unlinkSync(tmpJsonl);
      } catch (_) {}
      continue;
    }

    if (!fs.existsSync(tmpJsonl)) {
      console.warn(`[WARN] ${doc} no JSONL produced`);
      continue;
    }

    const jsonlContent = fs.readFileSync(tmpJsonl, "utf-8");
    const lines = jsonlContent.split("\n").filter((line) => line.trim().length > 0);
    let pagesInserted = 0;
    let emptyPages = 0;

    for (const line of lines) {
      try {
        const pageData = JSON.parse(line);
        const { pdfPage, text: rawText } = pageData;
        let text = rawText ?? "";
        if (!text || text.trim().length === 0) {
          text = "[NON_TEXT_PAGE_OR_OCR_FAILED]";
          emptyPages++;
        }
        const sha = createHash("sha256").update(text).digest("hex").substring(0, 16);
        upsertPage(doc, pdfPage, text, sha);
        pagesInserted++;
      } catch (err) {
        console.warn(`[WARN] ${doc} parse line:`, err?.message ?? err);
      }
    }

    try {
      fs.unlinkSync(tmpJsonl);
    } catch (_) {}

    if (pagesInserted === 0) {
      const text = "[NON_TEXT_PAGE_OR_OCR_FAILED]";
      const sha = createHash("sha256").update(text).digest("hex").substring(0, 16);
      upsertPage(doc, 1, text, sha);
      pagesInserted = 1;
      emptyPages += 1;
    }

    try {
      const deleteStmt = dbPrepare("kokuzo", "DELETE FROM kokuzo_pages_fts WHERE doc = ?");
      deleteStmt.run(doc);
      const insertStmt = dbPrepare(
        "kokuzo",
        "INSERT INTO kokuzo_pages_fts(rowid, doc, pdfPage, text) SELECT rowid, doc, pdfPage, text FROM kokuzo_pages WHERE doc = ?"
      );
      insertStmt.run(doc);
    } catch (ftsErr) {
      console.warn(`[WARN] ${doc} FTS rebuild failed:`, ftsErr?.message ?? ftsErr);
    }

    totalPages += pagesInserted;
    results.push({ doc, label: entry.label, pagesInserted, emptyPages });
    console.log(`[OK] ${doc} pages=${pagesInserted} empty=${emptyPages}`);
  }

  console.log("[DONE] total pages imported:", totalPages, "docs:", results.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
