import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export interface KZFile {
  id: string;
  ownerId: string;
  deviceId: string;
  mime: string;
  sizeBytes: number;
  originalName: string;
  physicalPath: string;
  createdAt: number;
  updatedAt: number;
  folderId?: string;
}

const STORAGE_ROOT = resolve(process.cwd(), "storage", "kokuzo");

export async function savePhysicalFile(buffer: Buffer, relPath: string): Promise<string> {
  const safeRel = String(relPath || "")
    .replace(/^\/*/, "")
    .replace(/\.\./g, "_");
  const absPath = join(STORAGE_ROOT, safeRel);
  await mkdir(dirname(absPath), { recursive: true });
  await writeFile(absPath, buffer);
  return absPath;
}

