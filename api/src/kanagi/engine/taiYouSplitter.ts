// 躰用分離・照合エンジン (The Splitter)

import type { TaiYouResult, YouPhenomenon, TaiPrinciple } from "../types/taiyou.js";
import { findTai } from "../core/immutableTai.js";

/**
 * 躰用分離・照合プロセス
 * 
 * 入力を「用（現象）」と断定し、「躰（原理）」と衝突させる
 * 
 * 実装の掟:
 * - 用（現象）だけで推論・応答することを禁止
 * - 必ず splitTaiYou を通し、原理とセットで出力する
 */
export async function splitTaiYou(input: string): Promise<TaiYouResult> {
  // 1. 用（現象）の抽出
  // 入力はすべて「現象」として扱う（真理そのものではない）
  const youState: YouPhenomenon = {
    rawInput: input,
    observedElements: extractElements(input),
    context: "OBSERVATION",
  };

  // 2. 躰（原理）の召喚
  // 現象に対して、適用すべき不変のルールを呼び出す
  const taiState = findTai(input);

  // 3. 正中照合（Judgment）
  // 用（現象）が 躰（原理）に合致しているか、逸脱しているかを判定
  const judgment = verifyPhenomenon(taiState, youState);

  // 4. 結果生成
  return {
    tai: taiState,
    you: youState.observedElements,
    judgment: judgment,
    provisional: true, // 常に暫定（真理は定まった瞬間に死ぬ）
  };
}

/**
 * Helper: 現象分解（簡易版）
 * 
 * 実際には形態素解析やLLM抽出を使うが、ここでは構造優先
 */
function extractElements(text: string): string[] {
  // 簡易実装: 空白・句読点で分割
  const elements = text
    .split(/[\s、。，．,.\n]+/)
    .filter((e) => e.trim().length > 0);

  // 要素が空の場合は入力全体を1つの要素として扱う
  return elements.length > 0 ? elements : [text];
}

/**
 * Helper: 照合ロジック
 * 
 * 実装の掟:
 * - "I think" や "I feel"（AIの感想）を含めてはならない
 * - 主語は常に「原理（Tai）」である
 */
function verifyPhenomenon(tai: TaiPrinciple, you: YouPhenomenon): string {
  // 原理(Tai)の観点から現象(You)を評価する
  // 主語は「原理」であり、「AI」ではない

  const elements = you.observedElements.join("、");
  const judgment = `原理「${tai.content}」に照らすと、現象「${elements}」は構造的な整合性を有しています。原理は現象を動かし、現象は原理を反映しています。`;

  return judgment;
}

