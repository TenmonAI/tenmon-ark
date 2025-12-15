/**
 * Native Signaling
 * ネイティブデバイスへのシグナリング
 */

export interface SignalingOffer {
  deviceId: string;
  offer: string; // WebRTC offer (SDP)
  signature: string; // 署名つき offer
  fingerprint: string; // デバイス fingerprint
}

export interface SignalingAnswer {
  deviceId: string;
  answer: string; // WebRTC answer (SDP)
  signature: string; // 署名つき answer
  fingerprint: string; // デバイス fingerprint
}

/**
 * 署名つき offer を処理（stub）
 * TODO: 実装
 */
export async function processSignedOffer(offer: SignalingOffer): Promise<boolean> {
  // TODO: 署名つき offer を検証して処理
  return false;
}

/**
 * 署名つき answer を処理（stub）
 * TODO: 実装
 */
export async function processSignedAnswer(answer: SignalingAnswer): Promise<boolean> {
  // TODO: 署名つき answer を検証して処理
  return false;
}

/**
 * デバイス署名を検証（stub）
 * TODO: 実装
 */
export async function verifyDeviceSignature(fingerprint: string, signature: string, data: string): Promise<boolean> {
  // TODO: デバイス署名を検証
  return false;
}

