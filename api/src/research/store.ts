import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { INDEX_PATH, UPLOAD_DIR } from "./paths.js";

export type StoredFile = {
  id: string;
  originalName: string;
  storedName: string;
  mime: string;
  size: number;
  sha256: string;
  uploadedAt: string;
  extractedAt?: string;
  analyzedAt?: string;
};

type Index = { files: StoredFile[] };

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

export function uploadPath(storedName: string) {
  return path.join(UPLOAD_DIR, storedName);
}

export async function sha256File(filePath: string): Promise<string> {
  const hash = crypto.createHash("sha256");
  const fh = await fs.open(filePath, "r");
  try {
    const stream = fh.createReadStream();
    await new Promise<void>((resolve, reject) => {
      stream.on("data", (d) => hash.update(d));
      stream.on("end", () => resolve());
      stream.on("error", reject);
    });
  } finally {
    await fh.close();
  }
  return hash.digest("hex");
}

async function loadIndex(): Promise<Index> {
  try {
    const raw = await fs.readFile(INDEX_PATH, "utf-8");
    const json = JSON.parse(raw);
    return { files: Array.isArray(json.files) ? json.files : [] };
  } catch {
    return { files: [] };
  }
}

async function saveIndex(idx: Index): Promise<void> {
  await ensureDir(path.dirname(INDEX_PATH));
  await fs.writeFile(INDEX_PATH, JSON.stringify(idx, null, 2), "utf-8");
}

export async function addFile(meta: Omit<StoredFile, "id">): Promise<StoredFile> {
  await ensureDir(UPLOAD_DIR);
  const idx = await loadIndex();
  const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const file: StoredFile = { id, ...meta };
  idx.files.unshift(file);
  await saveIndex(idx);
  return file;
}

export async function listFiles(): Promise<StoredFile[]> {
  const idx = await loadIndex();
  return idx.files;
}

export async function updateFile(
  id: string,
  patch: Partial<StoredFile>
): Promise<StoredFile | null> {
  const idx = await loadIndex();
  const i = idx.files.findIndex((f) => f.id === id);
  if (i < 0) return null;
  idx.files[i] = { ...idx.files[i], ...patch };
  await saveIndex(idx);
  return idx.files[i];
}

