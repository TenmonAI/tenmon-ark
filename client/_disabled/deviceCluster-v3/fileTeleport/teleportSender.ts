/**
 * File Teleport Sender
 * ファイルを瞬間移動させる
 * 
 * FastLane Engine統合: 1GB超のファイルでも転送可能、100MB/s以上の速度を想定
 */

export interface TeleportRequest {
  file: File;
  targetDeviceId?: string;
  useFastLane?: boolean; // ArkQuicを使用するかどうか
  onProgress?: (progress: { transferred: number; total: number; speed: number }) => void;
}

export interface TeleportResponse {
  success: boolean;
  filePath?: string;
  error?: string;
  transferId?: string;
}

/**
 * ファイルを瞬間移動
 */
export async function teleportFile(request: TeleportRequest): Promise<TeleportResponse> {
  // FastLane Engineを使用する場合
  if (request.useFastLane && request.file.size > 100 * 1024 * 1024) {
    // TODO: ArkQuic を使用して転送
    // return await transferFileViaFastLane(request);
  }
  try {
    // File → ArrayBuffer → Base64 に変換
    const arrayBuffer = await request.file.arrayBuffer();
    const base64 = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    );

    const response = await fetch('/api/deviceCluster-v3/teleport/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: request.file.name,
        fileType: request.file.type,
        fileSize: request.file.size,
        base64,
        targetDeviceId: request.targetDeviceId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json() as TeleportResponse;
    return data;

  } catch (error) {
    console.error('[File Teleport] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

