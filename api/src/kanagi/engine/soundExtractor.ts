// 音（Sound）抽出エンジン
// kuromoji token.reading からカナ（モーラ）列を抽出し、五十音に正規化

/**
 * 音候補（スコア付き）
 */
export interface SoundCandidate {
  sound: string;
  score: number;
  source: "reading" | "surface" | "fallback";
  pos: string; // 品詞
}

// B-1: kuromoji tokenizer は共通キャッシュを使用
import { getTokenizer } from "../utils/tokenizerCache.js";

/**
 * ひらがなをカタカナに正規化
 */
function hiraganaToKatakana(text: string): string {
  return text.replace(/[\u3041-\u3096]/g, (char) => {
    return String.fromCharCode(char.charCodeAt(0) + 0x60);
  });
}

/**
 * 小書き文字を正規化（ぁ→あ、っ→つ 等）
 */
function normalizeSmallKana(text: string): string {
  const smallKanaMap: Record<string, string> = {
    "ァ": "ア", "ィ": "イ", "ゥ": "ウ", "ェ": "エ", "ォ": "オ",
    "ぁ": "あ", "ぃ": "い", "ぅ": "う", "ぇ": "え", "ぉ": "お",
    "ッ": "ツ", "っ": "つ",
    "ャ": "ヤ", "ュ": "ユ", "ョ": "ヨ",
    "ゃ": "や", "ゅ": "ゆ", "ょ": "よ",
  };
  
  let normalized = text;
  for (const [small, normal] of Object.entries(smallKanaMap)) {
    normalized = normalized.replace(new RegExp(small, "g"), normal);
  }
  return normalized;
}

/**
 * 品詞重み（動詞>名詞>助詞）
 */
function getPosWeight(pos: string): number {
  if (pos.includes("動詞")) return 3.0;
  if (pos.includes("名詞")) return 2.0;
  if (pos.includes("助詞")) return 0.5;
  return 1.0;
}

/**
 * kuromoji token.reading からカナ列を抽出
 */
export async function extractSounds(text: string): Promise<SoundCandidate[]> {
  try {
    const tokenizer = await getTokenizer();
    const tokens = tokenizer.tokenize(text);

    const soundMap = new Map<string, { score: number; source: string; pos: string }>();

    for (const token of tokens) {
      // reading（読み）を優先
      const reading = token.reading || token.pronunciation || "";
      if (reading) {
        // カタカナに正規化
        let normalized = hiraganaToKatakana(reading);
        normalized = normalizeSmallKana(normalized);
        
        // カタカナ1文字ずつ抽出
        const katakanaRegex = /[\u30A0-\u30FF]/g;
        const matches = normalized.match(katakanaRegex);
        if (matches) {
          const weight = getPosWeight(token.pos);
          for (const char of matches) {
            const current = soundMap.get(char) || { score: 0, source: "reading", pos: token.pos };
            soundMap.set(char, {
              score: current.score + weight,
              source: "reading",
              pos: token.pos,
            });
          }
        }
      }

      // surface（表層形）をフォールバック
      const surface = token.surface_form || "";
      const katakanaRegex = /[\u30A0-\u30FF]/g;
      const hiraganaRegex = /[\u3040-\u309F]/g;
      
      const katakanaMatches = surface.match(katakanaRegex);
      const hiraganaMatches = surface.match(hiraganaRegex);
      
      if (katakanaMatches || hiraganaMatches) {
        const chars = [...(katakanaMatches || []), ...(hiraganaMatches || [])];
        for (const char of chars) {
          let normalized = hiraganaToKatakana(char);
          normalized = normalizeSmallKana(normalized);
          
          const current = soundMap.get(normalized) || { score: 0, source: "surface", pos: token.pos };
          if (current.source === "surface") {
            // surface は reading より低い重み
            soundMap.set(normalized, {
              score: current.score + getPosWeight(token.pos) * 0.3,
              source: "surface",
              pos: token.pos,
            });
          }
        }
      }
    }

    // スコア順でソート
    const candidates: SoundCandidate[] = Array.from(soundMap.entries())
      .map(([sound, data]) => ({
        sound,
        score: data.score,
        source: data.source as "reading" | "surface" | "fallback",
        pos: data.pos,
      }))
      .sort((a, b) => b.score - a.score);

    return candidates;
  } catch (error) {
    console.error("[SOUND-EXTRACTOR] Error:", error);
    // フォールバック：正規表現で抽出
    const sounds: string[] = [];
    const katakanaRegex = /[\u30A0-\u30FF]/g;
    const hiraganaRegex = /[\u3040-\u309F]/g;
    
    const katakanaMatches = text.match(katakanaRegex);
    const hiraganaMatches = text.match(hiraganaRegex);
    
    if (katakanaMatches) sounds.push(...katakanaMatches);
    if (hiraganaMatches) {
      const normalized = hiraganaMatches.map(h => hiraganaToKatakana(h));
      sounds.push(...normalized);
    }
    
    return sounds.map(s => ({
      sound: normalizeSmallKana(s),
      score: 1.0,
      source: "fallback" as const,
      pos: "未知語",
    }));
  }
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
  score: number; // マッチスコア
}

/**
 * 音候補からパターンを照合
 */
export async function matchPatterns(
  candidates: SoundCandidate[],
  patterns: Map<string, import("../patterns/loadPatterns.js").KanagiPattern>
): Promise<PatternHit[]> {
  const hits: PatternHit[] = [];
  
  for (const candidate of candidates) {
    const pattern = patterns.get(candidate.sound);
    if (pattern) {
      hits.push({
        number: pattern.number,
        sound: pattern.sound,
        category: pattern.category,
        type: pattern.type,
        pattern: pattern.pattern,
        movements: pattern.movements,
        meaning: pattern.meaning,
        special: pattern.special,
        score: candidate.score,
      });
    }
  }
  
  // スコア順でソート
  return hits.sort((a, b) => b.score - a.score);
}

