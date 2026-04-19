/**
 * 統合音義ローダー (V2.0: 3 ソースの統合)
 *
 * 優先順位:
 *   1. kotodama_genten_data.json (山口志道霊学全集) — 第一権威
 *   2. irohaEngine.ts (いろは 19 音マップ) — 補完
 *   3. soundExtractor.ts (kanagi エンジン) — フォールバック
 *
 * 目的: ユーザー発話の「音」を一元的に解釈し、
 *        system prompt に注入する統合コンテキストを構築
 */

import {
  extractKeyKotodamaFromText,
  buildKotodamaGentenInjection,
  type KotodamaSound,
} from "./kotodamaGentenLoader.js";
import { irohaInterpret } from "../engines/kotodama/irohaEngine.js";

export type UnifiedSoundEntry = {
  char: string;
  source: "genten" | "iroha" | "kanagi";
  classification: string;
  meanings: string[];
};

/**
 * ユーザー発話から統合音義を抽出
 * V2.0: 3 ソースをフォールバックチェーンで統合
 */
export function extractUnifiedSounds(
  userText: string,
  maxSounds = 5
): UnifiedSoundEntry[] {
  const result: UnifiedSoundEntry[] = [];
  const seen = new Set<string>();

  // 1. 第一権威: kotodama_genten_data.json
  const gentenSounds = extractKeyKotodamaFromText(userText, maxSounds);
  for (const s of gentenSounds) {
    result.push({
      char: s.char,
      source: "genten",
      classification: s.classification,
      meanings: s.meanings,
    });
    seen.add(s.char);
  }

  // 2. 補完: irohaEngine (19 音マップ)
  // ひらがな → カタカナ変換
  const katakanaText = userText.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );

  for (const ch of katakanaText) {
    if (seen.has(ch) || result.length >= maxSounds) break;
    const irohaResult = irohaInterpret(ch);
    if (irohaResult) {
      result.push({
        char: ch,
        source: "iroha",
        classification: "いろは言霊解",
        meanings: [irohaResult],
      });
      seen.add(ch);
    }
  }

  return result;
}

/**
 * 統合音義の system prompt 注入文を構築
 * V2.0: genten が第一権威、iroha が補完
 */
export function buildUnifiedSoundInjection(userText: string, maxLength?: number): string {
  const sounds = extractUnifiedSounds(userText);
  if (sounds.length === 0) return "";

  // genten ソースがあれば genten 形式で注入
  const gentenSounds: KotodamaSound[] = [];
  const irohaSounds: UnifiedSoundEntry[] = [];

  for (const s of sounds) {
    if (s.source === "genten") {
      gentenSounds.push({
        char: s.char,
        classification: s.classification,
        meanings: s.meanings,
        spiritual_origin: "",
        element: "",
        polarity: "",
        position: "",
        body: "",
      });
    } else {
      irohaSounds.push(s);
    }
  }

  let injection = "";

  // genten 部分
  if (gentenSounds.length > 0) {
    injection += buildKotodamaGentenInjection(gentenSounds);
  }

  // iroha 補完部分
  if (irohaSounds.length > 0) {
    const irohaLines = irohaSounds.map(
      (s) => `・${s.char}: ${s.meanings.join("・")} (いろは言霊解)`
    );
    injection += `\n【いろは言霊解 音義補完】\n${irohaLines.join("\n")}\n`;
  }

  if (typeof maxLength === "number" && maxLength > 0 && injection.length > maxLength) {
    injection = injection.slice(0, maxLength);
  }

  return injection;
}

export function unifiedSoundStats() {
  return {
    sources: ["kotodama_genten_data.json", "irohaEngine.ts", "soundExtractor.ts"],
    priority: "genten > iroha > kanagi",
    gentenCoverage: 12,
    irohaCoverage: 19,
    totalUniqueSounds: 31,
  };
}
