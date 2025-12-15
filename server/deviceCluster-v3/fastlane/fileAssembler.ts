/**
 * File Assembler
 * 分割ファイルの結合処理（サーバー側）
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ChunkInfo {
  chunkId: string;
  sequence: number;
  totalChunks: number;
  filePath: string;
}

const chunkRegistry: Map<string, ChunkInfo[]> = new Map();

/**
 * チャンクを登録
 */
export function registerChunk(transferId: string, chunk: ChunkInfo): void {
  if (!chunkRegistry.has(transferId)) {
    chunkRegistry.set(transferId, []);
  }

  const chunks = chunkRegistry.get(transferId)!;
  chunks.push(chunk);
}

/**
 * ファイルを組み立て
 */
export async function assembleFile(transferId: string, outputPath: string): Promise<string> {
  const chunks = chunkRegistry.get(transferId);
  if (!chunks || chunks.length === 0) {
    throw new Error(`No chunks found for transferId: ${transferId}`);
  }

  const totalChunks = chunks[0].totalChunks;
  if (chunks.length !== totalChunks) {
    throw new Error(`Not all chunks received: ${chunks.length}/${totalChunks}`);
  }

  // チャンクを順番にソート
  const sortedChunks = chunks.sort((a, b) => a.sequence - b.sequence);

  // 出力ディレクトリを作成
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // チャンクを結合
  const writeStream = fs.createWriteStream(outputPath);
  for (const chunk of sortedChunks) {
    const chunkData = fs.readFileSync(chunk.filePath);
    writeStream.write(chunkData);
  }
  writeStream.end();

  // チャンクファイルを削除
  for (const chunk of sortedChunks) {
    fs.unlinkSync(chunk.filePath);
  }

  // レジストリから削除
  chunkRegistry.delete(transferId);

  return outputPath;
}

/**
 * 転送状態を取得
 */
export function getTransferStatus(transferId: string): { totalChunks: number; receivedChunks: number; progress: number } {
  const chunks = chunkRegistry.get(transferId);
  if (!chunks || chunks.length === 0) {
    return { totalChunks: 0, receivedChunks: 0, progress: 0 };
  }

  const totalChunks = chunks[0].totalChunks;
  const receivedChunks = chunks.length;
  const progress = totalChunks > 0 ? receivedChunks / totalChunks : 0;

  return { totalChunks, receivedChunks, progress };
}

