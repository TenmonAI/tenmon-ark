/**
 * ArkQuic Client
 * QUIC over UDP クライアント
 * 超高速転送プロトコル（1〜5Gbps想定）
 */

export interface ArkQuicConfig {
  serverUrl: string;
  deviceId: string;
  encryptionKey?: string;
}

export interface ChunkData {
  chunkId: string;
  sequence: number;
  data: ArrayBuffer;
  compressed: boolean;
}

export interface TransferProgress {
  totalBytes: number;
  transferredBytes: number;
  speed: number; // bytes per second
  progress: number; // 0-1
}

/**
 * ArkQuic接続を確立（stub）
 * TODO: QUIC over UDP を実装
 */
export async function connectArkQuic(config: ArkQuicConfig): Promise<void> {
  // TODO: QUIC over UDP で接続を確立
}

/**
 * ファイルを転送（stub）
 * TODO: 実装
 */
export async function transferFile(
  file: File,
  config: ArkQuicConfig,
  onProgress?: (progress: TransferProgress) => void
): Promise<void> {
  // TODO: QUIC over UDP でファイルを転送
  // - パケット圧縮 (lz4)
  // - 再送制御
  // - ウィンドウ制御
  // - 転送速度 1〜5Gbps想定
}

/**
 * チャンクを送信（stub）
 * TODO: 実装
 */
export async function sendChunk(chunk: ChunkData, config: ArkQuicConfig): Promise<void> {
  // TODO: チャンクを送信
}

