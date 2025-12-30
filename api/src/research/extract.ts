import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { TEXT_DIR } from "./paths.js";

const execFileAsync = promisify(execFile);

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

export async function extractToText(args: {
  id: string;
  filePath: string;
  originalName: string;
}): Promise<{ textPath: string; preview: string }> {
  const { id, filePath, originalName } = args;
  const ext = path.extname(originalName).toLowerCase();

  await ensureDir(TEXT_DIR);
  const outPath = path.join(TEXT_DIR, `${id}.txt`);

  if (ext === ".txt" || ext === ".md" || ext === ".csv") {
    const text = (await fs.readFile(filePath, "utf-8")).replace(/\r\n/g, "\n");
    await fs.writeFile(outPath, text, "utf-8");
  } else if (ext === ".json") {
    // JSONはそのままテキスト化（整形はしない：本文保持を優先）
    const raw = await fs.readFile(filePath, "utf-8");
    await fs.writeFile(outPath, raw.replace(/\r\n/g, "\n"), "utf-8");
  } else if (ext === ".pdf") {
    // stdoutに出さず、ファイルに直接吐かせる（巨大PDFでも安定）
    await execFileAsync("pdftotext", ["-layout", "-nopgbrk", filePath, outPath]);
  } else {
    throw new Error(`unsupported file type: ${ext}`);
  }

  const full = await fs.readFile(outPath, "utf-8");
  const preview = full.slice(0, 2000);
  return { textPath: outPath, preview };
}

