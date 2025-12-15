/**
 * ============================================================
 *  KOKUZO CRYPTO — 端末側暗号化（WebCrypto API）
 * ============================================================
 * 
 * サーバーが復号できない記憶を作る
 * 保存前のみ暗号化、推論時は復号後使用
 * ============================================================
 */

/**
 * 暗号化キーを生成・取得
 * 端末固有のキー（localStorageに保存）
 */
async function getOrCreateKey(): Promise<CryptoKey> {
  const KEY_NAME = 'TENMON_KOKUZO_KEY';
  const keyData = localStorage.getItem(KEY_NAME);

  if (keyData) {
    // 既存キーをインポート
    const keyBuffer = Uint8Array.from(JSON.parse(keyData));
    return await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // 新規キーを生成
  const key = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );

  // キーをエクスポートして保存
  const exported = await crypto.subtle.exportKey('raw', key);
  localStorage.setItem(KEY_NAME, JSON.stringify(Array.from(new Uint8Array(exported))));

  return key;
}

/**
 * 記憶データを暗号化
 * 
 * @param data 記憶データ（JSON文字列）
 * @param key 暗号化キー（省略時は自動取得）
 * @returns 暗号化されたデータ（Base64文字列）
 */
export async function encrypt(data: string, key?: CryptoKey): Promise<string> {
  try {
    const cryptoKey = key || await getOrCreateKey();
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // IV（初期化ベクトル）を生成
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // 暗号化
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      cryptoKey,
      dataBuffer
    );

    // IV + 暗号化データを結合してBase64エンコード
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('[Kokuzo Crypto] Encryption failed:', error);
    throw error;
  }
}

/**
 * 記憶データを復号化
 * 
 * @param encryptedData 暗号化されたデータ（Base64文字列）
 * @param key 復号化キー（省略時は自動取得）
 * @returns 復号化されたデータ（JSON文字列）
 */
export async function decrypt(encryptedData: string, key?: CryptoKey): Promise<string> {
  try {
    const cryptoKey = key || await getOrCreateKey();

    // Base64デコード
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    // IVと暗号化データを分離
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    // 復号化
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      cryptoKey,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('[Kokuzo Crypto] Decryption failed:', error);
    throw error;
  }
}

/**
 * 記憶データを暗号化（互換性維持）
 * 
 * @param data 記憶データ
 * @returns 暗号化されたデータ
 */
export async function encryptMemory(data: unknown): Promise<string> {
  const json = JSON.stringify(data);
  return await encrypt(json);
}

/**
 * 記憶データを復号化（互換性維持）
 * 
 * @param encrypted 暗号化されたデータ
 * @returns 復号化されたデータ
 */
export async function decryptMemory(encrypted: string): Promise<unknown> {
  const json = await decrypt(encrypted);
  return JSON.parse(json);
}

