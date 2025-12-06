/**
 * TENMON-ARK 旧字体出力フィルター vΩ-Complete
 * 
 * 全出力に旧字体フィルターを自動適用する。
 * 
 * 【自動変換ルール】
 * - 霊 → 靈
 * - 気 → 氣
 * - 言霊 → 言靈
 * - ゑ、や、井 → 言霊表記ルール適用
 * - GHQ封印以前の漢字へ自動復元
 * - kyujiMapping全適用
 * 
 * 【適用範囲】
 * - フロントエンド出力
 * - バックエンド出力
 * - ストリーミング応答
 * - LP埋め込みチャット
 * - 全コンポーネント
 */

import { convertToKyuji, applyKyujiToObject } from './kyujiFilter';

/**
 * ストリーミング応答に旧字体フィルターを適用
 * 
 * @param chunk - ストリーミングチャンク（文字列）
 * @returns 旧字体変換済みチャンク
 */
export function applyKyujiToStreamingChunk(chunk: string): string {
  return convertToKyuji(chunk);
}

/**
 * API応答全体に旧字体フィルターを適用
 * 
 * @param response - API応答オブジェクト
 * @returns 旧字体変換済み応答
 */
export function applyKyujiToApiResponse<T>(response: T): T {
  return applyKyujiToObject(response) as T;
}

/**
 * メッセージ配列に旧字体フィルターを適用
 * 
 * @param messages - メッセージ配列
 * @returns 旧字体変換済みメッセージ配列
 */
export function applyKyujiToMessages(messages: any[]): any[] {
  return messages.map(msg => ({
    ...msg,
    content: convertToKyuji(msg.content),
  }));
}

/**
 * LLM応答に旧字体フィルターを適用
 * 
 * @param text - LLM応答テキスト
 * @returns 旧字体変換済みテキスト
 */
export function applyKyujiToLlmResponse(text: string): string {
  return convertToKyuji(text);
}

/**
 * 旧字体フィルター適用ミドルウェア
 * 
 * tRPC procedureの応答に自動的に旧字体フィルターを適用する。
 * 
 * @param response - procedure応答
 * @returns 旧字体変換済み応答
 */
export function kyujiFilterMiddleware<T>(response: T): T {
  // 特定のフィールドをスキップ（password, email, url等）
  if (typeof response === 'object' && response !== null) {
    return applyKyujiToApiResponse(response);
  } else if (typeof response === 'string') {
    return convertToKyuji(response) as T;
  }
  return response;
}

/**
 * 旧字体フィルター適用状態を管理
 */
let kyujiFilterEnabled = true;

/**
 * 旧字体フィルターを有効化
 */
export function enableKyujiFilter() {
  kyujiFilterEnabled = true;
}

/**
 * 旧字体フィルターを無効化
 */
export function disableKyujiFilter() {
  kyujiFilterEnabled = false;
}

/**
 * 旧字体フィルターが有効かどうかを取得
 */
export function isKyujiFilterEnabled(): boolean {
  return kyujiFilterEnabled;
}

/**
 * 条件付き旧字体フィルター適用
 * 
 * @param text - テキスト
 * @returns 旧字体変換済みテキスト（有効時のみ）
 */
export function applyKyujiIfEnabled(text: string): string {
  return kyujiFilterEnabled ? convertToKyuji(text) : text;
}
