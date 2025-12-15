/**
 * WebRTC Handshake
 * 端末間で Kokūzō Seed を直接転送（P2P）
 * 
 * 原則: 法則・Seedのみ送信、生ファイルは送信しない
 */

export interface WebRTCConnection {
  deviceId: string;
  dataChannel: RTCDataChannel | null;
  connectionState: 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed';
  pc: RTCPeerConnection | null;
}

/**
 * Kokūzō Seed を保存（端末側）
 */
async function saveFractalSeed(seed: any): Promise<void> {
  try {
    // 虚空蔵ノードに保存
    const { storeExperience } = await import('@/lib/kokuzo');
    // Seed を記憶として保存（抽象データのみ）
    if (seed.keywords && seed.intent) {
      await storeExperience(JSON.stringify(seed));
    }
  } catch (error) {
    console.warn('[WebRTC] Failed to save FractalSeed:', error);
  }
}

/**
 * WebRTC接続を確立（DataChannel作成）
 * 
 * @param deviceId 接続先デバイスID
 * @param signalingServer WebSocketシグナリングサーバーURL
 */
export async function establishConnection(
  deviceId: string,
  signalingServer?: string
): Promise<WebRTCConnection> {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
    ],
  });

  // Kokūzō Seed用のDataChannelを作成
  const channel = pc.createDataChannel('kokuzo-seed', {
    ordered: true,
  });

  const connection: WebRTCConnection = {
    deviceId,
    dataChannel: channel,
    connectionState: 'new',
    pc,
  };

  // DataChannel受信ハンドラ
  channel.onmessage = async (event) => {
    try {
      const seed = JSON.parse(event.data);
      console.log('[WebRTC] Received Kokūzō Seed:', seed);
      await saveFractalSeed(seed);
    } catch (error) {
      console.error('[WebRTC] Failed to parse Seed:', error);
    }
  };

  channel.onopen = () => {
    connection.connectionState = 'connected';
    console.log('[WebRTC] DataChannel opened for device:', deviceId);
  };

  channel.onclose = () => {
    connection.connectionState = 'disconnected';
    console.log('[WebRTC] DataChannel closed for device:', deviceId);
  };

  channel.onerror = (error) => {
    connection.connectionState = 'failed';
    console.error('[WebRTC] DataChannel error:', error);
  };

  // ICE候補の処理
  pc.onicecandidate = (event) => {
    if (event.candidate && signalingServer) {
      // TODO: WebSocket経由でICE候補を送信
      console.log('[WebRTC] ICE candidate:', event.candidate);
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'connected') {
      connection.connectionState = 'connected';
    } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
      connection.connectionState = pc.connectionState as 'disconnected' | 'failed';
    }
  };

  return connection;
}

/**
 * Kokūzō Seed を送信
 * 
 * @param connection WebRTC接続
 * @param seed FractalSeed（抽象データのみ）
 */
export async function sendSeed(
  connection: WebRTCConnection,
  seed: { keywords: string[]; intent: string; weight: number; [key: string]: any }
): Promise<void> {
  if (!connection.dataChannel || connection.dataChannel.readyState !== 'open') {
    console.warn('[WebRTC] DataChannel not ready');
    return;
  }

  try {
    // 法則・Seedのみ送信（生データは送信しない）
    const seedData = {
      keywords: seed.keywords,
      intent: seed.intent,
      weight: seed.weight,
      // メタデータのみ（原文は含めない）
      metadata: seed.metadata || {},
    };
    connection.dataChannel.send(JSON.stringify(seedData));
    console.log('[WebRTC] Sent Kokūzō Seed to device:', connection.deviceId);
  } catch (error) {
    console.error('[WebRTC] Failed to send Seed:', error);
  }
}

/**
 * WebRTC接続を切断
 */
export async function closeConnection(connection: WebRTCConnection): Promise<void> {
  if (connection.dataChannel) {
    connection.dataChannel.close();
  }
  if (connection.pc) {
    connection.pc.close();
  }
  connection.connectionState = 'disconnected';
}

