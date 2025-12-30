import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { TEXT_DIR } from "./paths.js";

const execFileAsync = promisify(execFile);

type Used = "plain" | "pdftotext-raw" | "pdftotext-layout" | "ocr";
type Mode = "auto" | "text" | "ocr";

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

async function readHead(filePath: string, maxBytes = 64 * 1024): Promise<string> {
  const fh = await fs.open(filePath, "r");
  try {
    const buf = Buffer.alloc(maxBytes);
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
    return buf.toString("utf-8", 0, bytesRead);
  } finally {
    await fh.close();
  }
}

function scoreText(sample: string): number {
  const t = sample.slice(0, 8000);
  const jp = (t.match(/[\u3040-\u30ff\u3400-\u9fff]/g) ?? []).length;
  const rep = (t.match(/\uFFFD/g) ?? []).length; // 文字化け replacement
  const ascii = (t.match(/[A-Za-z0-9]/g) ?? []).length;
  const len = Math.max(1, t.length);

  // 日本語が多いほど良い、replacement多いほど悪い
  let score = jp * 3 - rep * 15;

  // "量はあるのに日本語がほぼ無い"は強く悪い
  if (len > 2000 && jp < 80) score -= 300;
  if (rep > 10) score -= 300;

  // ほどほどにasciiも許す（英語混在）
  score += Math.min(50, ascii);

  return score;
}

async function runPdftotextToFile(pdfPath: string, outTxt: string, mode: "raw" | "layout") {
  const args = ["-enc", "UTF-8", "-nopgbrk"];
  if (mode === "raw") args.push("-raw");
  if (mode === "layout") args.push("-layout");
  args.push(pdfPath, outTxt);

  await execFileAsync("pdftotext", args, { maxBuffer: 8 * 1024 * 1024 });
}

async function runOCRToText(pdfPath: string, outTxt: string) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "tenmon-ocr-"));
  const outPdf = path.join(tmpDir, "ocr.pdf");

  try {
    // force-ocr：埋め込みテキストが壊れてても作り直す
    await execFileAsync(
      "ocrmypdf",
      [
        "--force-ocr",
        "--rotate-pages",
        "--deskew",
        "--output-type",
        "pdf",
        "--jobs",
        "2",
        "-l",
        "jpn+eng",
        pdfPath,
        outPdf,
      ],
      { maxBuffer: 8 * 1024 * 1024 }
    );

    await runPdftotextToFile(outPdf, outTxt, "raw");
  } finally {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // noop
    }
  }
}

export async function extractToText(args: {
  id: string;
  filePath: string;
  originalName: string;
  mode?: Mode;
}): Promise<{ textPath: string; preview: string; used: Used }> {
  const { id, filePath, originalName } = args;
  const mode: Mode = (args.mode ?? "auto") as Mode;

  const ext = path.extname(originalName).toLowerCase();

  await ensureDir(TEXT_DIR);
  const outPath = path.join(TEXT_DIR, `${id}.txt`);

  // txt系はそのまま
  if (ext === ".txt" || ext === ".md" || ext === ".json" || ext === ".csv") {
    const raw = await fs.readFile(filePath, "utf-8");
    await fs.writeFile(outPath, raw.replace(/\r\n/g, "\n"), "utf-8");
    const preview = raw.slice(0, 3000);
    return { textPath: outPath, preview, used: "plain" };
  }

  if (ext !== ".pdf") {
    throw new Error(`unsupported file type: ${ext}`);
  }

  // PDF
  if (mode === "ocr") {
    await runOCRToText(filePath, outPath);
    const head = await readHead(outPath);
    return { textPath: outPath, preview: head.slice(0, 3000), used: "ocr" };
  }

  // pdftotext を raw/layout 両方試して評価
  const tmpRaw = `${outPath}.raw.tmp`;
  const tmpLayout = `${outPath}.layout.tmp`;

  try {
    await runPdftotextToFile(filePath, tmpRaw, "raw");
    await runPdftotextToFile(filePath, tmpLayout, "layout");

    const rawHead = await readHead(tmpRaw);
    const layoutHead = await readHead(tmpLayout);

    const sRaw = scoreText(rawHead);
    const sLayout = scoreText(layoutHead);

    const best = sRaw >= sLayout ? { p: tmpRaw, used: "pdftotext-raw" as const, score: sRaw } : { p: tmpLayout, used: "pdftotext-layout" as const, score: sLayout };

    // 文字品質が低いならOCRに落とす（autoのみ）
    if (mode === "auto" && best.score < 0) {
      await runOCRToText(filePath, outPath);
      const head = await readHead(outPath);
      return { textPath: outPath, preview: head.slice(0, 3000), used: "ocr" };
    }

    // bestを採用
    await fs.rename(best.p, outPath);
    // 残りを削除
    try { await fs.rm(best.used === "pdftotext-raw" ? tmpLayout : tmpRaw, { force: true }); } catch {}
    const head = best.used === "pdftotext-raw" ? rawHead : layoutHead;
    return { textPath: outPath, preview: head.slice(0, 3000), used: best.used };
  } finally {
    // 失敗時の掃除
    try { await fs.rm(tmpRaw, { force: true }); } catch {}
    try { await fs.rm(tmpLayout, { force: true }); } catch {}
  }
}
