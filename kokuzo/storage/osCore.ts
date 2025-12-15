/**
 * KOKŪZŌ Storage OS Core
 * - KZFile, KZFolder, KZChunk 定義
 * - L0/L1 Object Store の責務
 */

import fs from "fs";
import path from "path";

export type KZFileId = string;
export type KZUserId = string;
export type KZDeviceId = string;

export interface KZFile {
  id: KZFileId;
  ownerId: KZUserId;
  deviceId: KZDeviceId;
  mime: string;
  sizeBytes: number;
  originalName: string;
  physicalPath: string;
  createdAt: number;
  updatedAt: number;
  folderId?: string;
  semanticRootId?: string;
}

export interface KZFolder {
  id: string;
  ownerId: KZUserId;
  name: string;
  parentId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface KZChunk {
  id: string;
  fileId: KZFileId;
  chunkIndex: number;
  sizeBytes: number;
  physicalPath: string;
  checksum: string;
}

const KZ_BASE = process.env.KOKUZO_STORAGE_BASE || "kokuzo_data";

/**
 * 物理ファイルを保存
 */
export async function savePhysicalFile(buf: Buffer, relPath: string): Promise<string> {
  const fullPath = path.join(KZ_BASE, relPath);
  await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.promises.writeFile(fullPath, buf);
  return fullPath;
}

/**
 * 物理ファイルを読み込み
 */
export async function loadPhysicalFile(relPath: string): Promise<Buffer> {
  const fullPath = path.join(KZ_BASE, relPath);
  return await fs.promises.readFile(fullPath);
}

/**
 * 物理ファイルを削除
 */
export async function deletePhysicalFile(relPath: string): Promise<void> {
  const fullPath = path.join(KZ_BASE, relPath);
  await fs.promises.unlink(fullPath);
}

