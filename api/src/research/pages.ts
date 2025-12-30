import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { RESEARCH_DIR } from "./paths.js";

const execFileAsync = promisify(execFile);

export type PageInfo = {
  page: number;
  textPath: string;
  imagePath: string;
  textPreview: string;
  hasText: boolean;
  hasImage: boolean;
};

export type PagesManifest = {
  version: "R3";
  sourceId: string;
  createdAt: string;
  pageCount: number;
  pages: PageInfo[];
};

function pad(n: number) {
  return String(n).padStart(4, "0");
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

async function fileExists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function countPages(pdfPath: string): Promise<number> {
  // pdfinfo の "Pages:" を読む
  const { stdout } = await execFileAsync("pdfinfo", [pdfPath], { maxBuffer: 10 * 1024 * 1024 });
  const m = stdout.match(/Pages:\s+(\d+)/);
  if (!m) throw new Error("pdfinfo: cannot detect page count");
  return Number(m[1]);
}

export async function buildPages(args: { id: string; pdfPath: string; dpi?: number }): Promise<PagesManifest> {
  const { id, pdfPath, dpi = 200 } = args;

  const pagesDir = path.join(RESEARCH_DIR, "pages", id);
  const imagesDir = path.join(pagesDir, "images");
  const textsDir = path.join(pagesDir, "text");
  const manifestPath = path.join(pagesDir, "manifest.json");

  await ensureDir(imagesDir);
  await ensureDir(textsDir);

  const pageCount = await countPages(pdfPath);

  // 1) 画像生成: pdftoppm -png -r <dpi> input outputprefix
  // 出力: <prefix>-1.png, -2.png ...
  const prefix = path.join(imagesDir, "p");
  // 既に画像があるならスキップ（再生成したいときはフォルダ消せばOK）
  const anyImg = await fileExists(path.join(imagesDir, "p-1.png"));
  if (!anyImg) {
    await execFileAsync("pdftoppm", ["-png", "-r", String(dpi), pdfPath, prefix], {
      maxBuffer: 50 * 1024 * 1024,
    });
  }

  const pages: PageInfo[] = [];

  // 2) ページ別テキスト: pdftotext -f N -l N -enc UTF-8 -layout pdf -
  for (let p = 1; p <= pageCount; p++) {
    const textPath = path.join(textsDir, `p${pad(p)}.txt`);
    const imagePath = path.join(imagesDir, `p-${p}.png`);

    let text = "";
    if (!(await fileExists(textPath))) {
      const { stdout } = await execFileAsync(
        "pdftotext",
        ["-enc", "UTF-8", "-layout", "-f", String(p), "-l", String(p), pdfPath, "-"],
        { maxBuffer: 50 * 1024 * 1024 }
      );
      text = (stdout || "").replace(/\r\n/g, "\n");
      await fs.writeFile(textPath, text, "utf-8");
    } else {
      text = await fs.readFile(textPath, "utf-8");
    }

    const hasImage = await fileExists(imagePath);
    const preview = text.slice(0, 400).replace(/\s+/g, " ").trim();

    pages.push({
      page: p,
      textPath,
      imagePath,
      textPreview: preview,
      hasText: text.trim().length > 0,
      hasImage,
    });
  }

  const manifest: PagesManifest = {
    version: "R3",
    sourceId: id,
    createdAt: new Date().toISOString(),
    pageCount,
    pages,
  };

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  return manifest;
}

export async function readManifest(id: string): Promise<PagesManifest | null> {
  const p = path.join(RESEARCH_DIR, "pages", id, "manifest.json");
  try {
    const raw = await fs.readFile(p, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

