// 音（Sound）抽出エンジン
// ユーザー入力からひらがな・カタカナを抽出し、五十音パターンと照合

/**
 * ひらがな・カタカナを抽出
 */
export function extractSounds(text: string): string[] {
  const sounds: string[] = [];
  
  // カタカナを抽出
  const katakanaRegex = /[\u30A0-\u30FF]+/g;
  const katakanaMatches = text.match(katakanaRegex);
  if (katakanaMatches) {
    for (const match of katakanaMatches) {
      for (const char of match) {
        sounds.push(char);
      }
    }
  }
  
  // ひらがなを抽出
  const hiraganaRegex = /[\u3040-\u309F]+/g;
  const hiraganaMatches = text.match(hiraganaRegex);
  if (hiraganaMatches) {
    for (const match of hiraganaMatches) {
      for (const char of match) {
        sounds.push(char);
      }
    }
  }
  
  return sounds;
}

/**
 * 五十音パターンと照合
 */
export interface PatternHit {
  number: number;
  sound: string;
  category: string;
  type?: string;
  pattern: string;
  movements: string[];
  meaning?: string;
  special: boolean;
}

export function matchPatterns(
  sounds: string[],
  patterns: Array<{
    number: number;
    sound: string;
    category: string;
    type?: string;
    pattern: string;
    movements: string[];
    meaning?: string;
    special: boolean;
  }>
): PatternHit[] {
  const hits: PatternHit[] = [];
  
  for (const sound of sounds) {
    const matched = patterns.find(p => p.sound === sound);
    if (matched) {
      hits.push({
        number: matched.number,
        sound: matched.sound,
        category: matched.category,
        type: matched.type,
        pattern: matched.pattern,
        movements: matched.movements,
        meaning: matched.meaning,
        special: matched.special,
      });
    }
  }
  
  return hits;
}

