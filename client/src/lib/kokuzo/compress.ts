/**
 * ============================================================
 *  KOKUZO COMPRESS — 記憶の不可逆圧縮
 * ============================================================
 * 
 * 原文テキストを抽象化
 * 復元不可能な形で圧縮
 * 中央APIには抽象データのみを送信
 * ============================================================
 */

import type { CompressedMemory } from './memory';

/**
 * 記憶を不可逆圧縮
 * 
 * @param text 原文テキスト
 * @returns 圧縮された記憶データ
 */
export function compressMemory(text: string): CompressedMemory {
  return {
    keywords: extractKeywords(text),
    intent: extractIntent(text),
    weight: calculateWeight(text),
  };
}

/**
 * キーワードを抽出
 * 
 * @param text 原文テキスト
 * @returns キーワードの配列（最大5個）
 */
function extractKeywords(text: string): string[] {
  // 日本語の助詞・助動詞を除去
  const stopWords = ['の', 'に', 'は', 'を', 'が', 'で', 'と', 'から', 'まで', 'より', 'へ', 'か', 'も', 'や', 'など', 'です', 'ます', 'だ', 'である'];
  
  // テキストを単語に分割
  const words = text
    .split(/\s+|、|。|,|\./)
    .filter(word => word.length > 0)
    .filter(word => !stopWords.includes(word))
    .slice(0, 10); // 候補を10個まで取得
  
  // 重複を除去し、最大5個を返す
  const uniqueWords = Array.from(new Set(words));
  return uniqueWords.slice(0, 5);
}

/**
 * 意図を抽出
 * 
 * @param text 原文テキスト
 * @returns 意図カテゴリ
 */
function extractIntent(text: string): string {
  const lowerText = text.toLowerCase();
  
  // 感情関連
  if (lowerText.includes('不安') || lowerText.includes('心配') || lowerText.includes('怖い') || lowerText.includes('恐れ')) {
    return 'emotion:fear';
  }
  if (lowerText.includes('嬉しい') || lowerText.includes('楽しい') || lowerText.includes('喜び')) {
    return 'emotion:joy';
  }
  if (lowerText.includes('悲しい') || lowerText.includes('寂しい') || lowerText.includes('落ち込')) {
    return 'emotion:sadness';
  }
  if (lowerText.includes('怒り') || lowerText.includes('イライラ') || lowerText.includes('腹立')) {
    return 'emotion:anger';
  }
  
  // 知識関連
  if (lowerText.includes('知りたい') || lowerText.includes('教えて') || lowerText.includes('説明') || lowerText.includes('どういう')) {
    return 'knowledge:query';
  }
  if (lowerText.includes('覚えて') || lowerText.includes('記憶') || lowerText.includes('保存')) {
    return 'knowledge:store';
  }
  
  // タスク関連
  if (lowerText.includes('作って') || lowerText.includes('作成') || lowerText.includes('生成')) {
    return 'task:create';
  }
  if (lowerText.includes('修正') || lowerText.includes('変更') || lowerText.includes('更新')) {
    return 'task:modify';
  }
  if (lowerText.includes('削除') || lowerText.includes('消して')) {
    return 'task:delete';
  }
  
  // デフォルト
  return 'general';
}

/**
 * 重要度を計算
 * 
 * @param text 原文テキスト
 * @returns 重要度（0.0 - 1.0）
 */
function calculateWeight(text: string): number {
  let weight = 0.5; // デフォルト
  
  // 長いテキストは重要度が高い
  if (text.length > 100) {
    weight += 0.2;
  }
  
  // 疑問符・感嘆符がある場合は重要度が高い
  if (text.includes('?') || text.includes('？') || text.includes('!') || text.includes('！')) {
    weight += 0.1;
  }
  
  // 感情表現がある場合は重要度が高い
  if (extractIntent(text).startsWith('emotion:')) {
    weight += 0.2;
  }
  
  // 0.0 - 1.0 の範囲に正規化
  return Math.min(1.0, Math.max(0.0, weight));
}

