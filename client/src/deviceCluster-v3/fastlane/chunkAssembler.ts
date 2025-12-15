/**
 * Chunk Assembler
 * 分割ファイルの結合処理（クライアント側）
 */

export interface Chunk {
  chunkId: string;
  sequence: number;
  totalChunks: number;
  data: ArrayBuffer;
}

export interface AssembledFile {
  fileName: string;
  fileType: string;
  fileSize: number;
  data: ArrayBuffer;
}

const chunkBuffer: Map<string, Map<number, Chunk>> = new Map();

/**
 * チャンクを受信
 */
export function receiveChunk(chunk: Chunk): void {
  if (!chunkBuffer.has(chunk.chunkId)) {
    chunkBuffer.set(chunk.chunkId, new Map());
  }

  const chunks = chunkBuffer.get(chunk.chunkId)!;
  chunks.set(chunk.sequence, chunk);
}

/**
 * ファイルを組み立て
 */
export function assembleFile(chunkId: string): AssembledFile | null {
  const chunks = chunkBuffer.get(chunkId);
  if (!chunks) {
    return null;
  }

  const totalChunks = Math.max(...Array.from(chunks.values()).map(c => c.totalChunks));
  if (chunks.size !== totalChunks) {
    return null; // すべてのチャンクが揃っていない
  }

  // チャンクを順番に結合
  const sortedChunks = Array.from(chunks.values()).sort((a, b) => a.sequence - b.sequence);
  const totalSize = sortedChunks.reduce((sum, chunk) => sum + chunk.data.byteLength, 0);
  const assembledData = new Uint8Array(totalSize);

  let offset = 0;
  for (const chunk of sortedChunks) {
    assembledData.set(new Uint8Array(chunk.data), offset);
    offset += chunk.data.byteLength;
  }

  // メタデータを取得（最初のチャンクから）
  const firstChunk = sortedChunks[0];
  // TODO: メタデータをパース

  return {
    fileName: 'assembled_file',
    fileType: 'application/octet-stream',
    fileSize: totalSize,
    data: assembledData.buffer,
  };
}

/**
 * チャンクバッファをクリア
 */
export function clearChunkBuffer(chunkId: string): void {
  chunkBuffer.delete(chunkId);
}

