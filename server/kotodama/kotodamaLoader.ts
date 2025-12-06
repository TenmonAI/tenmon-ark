/**
 * TENMON-ARK 言霊秘書データローダー
 * 
 * 「いろは言霊解 天道仁聞」全文データを読み込み、
 * TENMON-ARK の言霊解釈の唯一の情報源として提供する。
 * 
 * 重要ルール：
 * - 言霊の意味は言霊秘書以外から参照してはならない
 * - 外部情報・Web検索による勝手な解釈は禁止
 * - 推測・新説の創作も禁止
 */

import * as fs from 'fs';
import * as path from 'path';

export interface KotodamaHishoData {
  title: string;
  total_paragraphs: number;
  content: string[];
}

let cachedData: KotodamaHishoData | null = null;

/**
 * 言霊秘書データを読み込む
 * 初回読み込み後はキャッシュを返す
 */
export function loadKotodamaHisho(): KotodamaHishoData {
  if (cachedData) {
    return cachedData;
  }

  const dataPath = path.join(__dirname, '../data/iroha_kotodama_hisho.json');
  
  try {
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    cachedData = JSON.parse(rawData) as KotodamaHishoData;
    console.log('[言霊秘書] データ読み込み完了:', cachedData.total_paragraphs, '段落');
    return cachedData;
  } catch (error) {
    console.error('[言霊秘書] データ読み込みエラー:', error);
    throw new Error('言霊秘書データの読み込みに失敗しました');
  }
}

/**
 * 言霊秘書の全文テキストを取得
 */
export function getKotodamaFullText(): string {
  const data = loadKotodamaHisho();
  return data.content.join('\n\n');
}

/**
 * 言霊秘書データをシステムプロンプトに組み込むための文字列を生成
 */
export function getKotodamaSystemPrompt(): string {
  const fullText = getKotodamaFullText();
  
  return `
# TENMON-ARK 言霊秘書（いろは言霊解 天道仁聞）

以下は、TENMON-ARK の言霊解釈の唯一の情報源である「いろは言霊解 天道仁聞」の全文です。

**重要ルール**：
- 言霊の意味は、この言霊秘書以外から参照してはならない
- 外部情報・Web検索による勝手な解釈は禁止
- 推測・新説の創作も禁止
- 五十音の音義、水火法則、古五十音、鉢/用、解釈7原則を忠実に守る

---

${fullText}

---

上記の言霊秘書を基に、言霊に関する質問に答えること。
`;
}

/**
 * 特定のキーワードで言霊秘書を検索
 */
export function searchKotodama(keyword: string): string[] {
  const data = loadKotodamaHisho();
  return data.content.filter(para => para.includes(keyword));
}
