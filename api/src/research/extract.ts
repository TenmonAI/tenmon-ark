import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { TEXT_DIR } from "./paths.js";

const execFileAsync = promisify(execFile);

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

function looksMojibakeOrBad(text: string): boolean {
  if (!text) return true;
  const t = text.slice(0, 6000);
  // よくある文字化け/崩れの兆候
  const mojibakeMatches1 = t.match(/[ÃÂäåæçèéêëìíîïðñòóôõöøùúûüýÿ]/g) ?? [];
  const mojibakeMatches2 = t.match(/\uFFFD/g) ?? []; // replacement char
  const mojibakeHits = mojibakeMatches1.length + mojibakeMatches2.length;
  // "文字は出てるが意味のある日本語がほぼ無い"ケース
  const jpHits = (t.match(/[\u3040-\u30ff\u3400-\u9fff]/g) ?? []).length;

  if (t.length < 300) return true;
  if (mojibakeHits > 30) return true;
  if (jpHits < 10 && t.length > 1000) return true; // 量あるのに日本語がほぼ無い
  return false;
}

async function runPdftotext(pdfPath: string): Promise<string> {
  const { stdout } = await execFileAsync(
    "pdftotext",
    ["-enc", "UTF-8", "-layout", "-nopgbrk", pdfPath, "-"],
    { maxBuffer: 80 * 1024 * 1024 }
  );
  return (stdout || "").replace(/\r\n/g, "\n");
}

async function runOCR(pdfPath: string): Promise<string> {
  // OCRしたPDFを一時生成 → そこから pdftotext
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "tenmon-ocr-"));
  const outPdf = path.join(tmpDir, "ocr.pdf");

  // --skip-text: テキストがあるページは基本維持、無ければOCR
  // --force-ocr: 文字化けPDFでも強制OCRしたいならこちら
  await execFileAsync(
    "ocrmypdf",
    [
      "--skip-text",
      "-l",
      "jpn+eng",
      "--output-type",
      "pdf",
      "--jobs",
      "2",
      pdfPath,
      outPdf,
    ],
    { maxBuffer: 20 * 1024 * 1024 }
  );

  const text = await runPdftotext(outPdf);

  // 後片付け
  try {
    await fs.rm(tmpDir, { recursive: true, force: true });
  } catch {
    // noop
  }

  return text;
}

export async function extractToText(args: {
  id: string;
  filePath: string;
  originalName: string;
}): Promise<{ textPath: string; preview: string; used: "pdftotext" | "ocr" | "plain" }> {
  const { id, filePath, originalName } = args;
  const ext = path.extname(originalName).toLowerCase();

  await ensureDir(TEXT_DIR);
  const outPath = path.join(TEXT_DIR, `${id}.txt`);

  let text = "";
  let used: "pdftotext" | "ocr" | "plain" = "plain";

  if (ext === ".txt" || ext === ".md" || ext === ".json" || ext === ".csv") {
    text = await fs.readFile(filePath, "utf-8");
    used = "plain";
  } else if (ext === ".pdf") {
    // 1) まず pdftotext
    text = await runPdftotext(filePath);
    used = "pdftotext";

    // 2) 文字化け/空っぽっぽいなら OCR フォールバック
    if (looksMojibakeOrBad(text)) {
      text = await runOCR(filePath);
      used = "ocr";
    }
  } else {
    throw new Error(`unsupported file type: ${ext}`);
  }

  text = text.replace(/\r\n/g, "\n");
  await fs.writeFile(outPath, text, "utf-8");

  const preview = text.slice(0, 3000);
  return { textPath: outPath, preview, used };
}
