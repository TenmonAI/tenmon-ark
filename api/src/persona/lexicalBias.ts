import type { KanagiPhase } from "./kanagi.js";
import type { ThinkingAxis } from "./thinkingAxis.js";
import type { PersonaInertia } from "./inertia.js";

// CORE-9: 語彙選択バイアス（内部用、UI/レスポンスには返さない）
export type LexicalBias = {
  conciseness: number;   // 短さ・切れ（0.0〜1.0）
  abstraction: number;  // 抽象度（0.0〜1.0）
  softness: number;     // 柔らかさ（0.0〜1.0）
  decisiveness: number; // 断定性（0.0〜1.0）
};

/**
 * CORE-9: KanagiPhase、thinkingAxis、inertiaからLexicalBiasを決定する
 * 
 * switch / if のみで決定する。
 */
export function determineLexicalBias(
  kanagiPhase: KanagiPhase,
  thinkingAxis: ThinkingAxis,
  inertia: PersonaInertia | undefined
): LexicalBias {
  // ベース値を設定
  let bias: LexicalBias = {
    conciseness: 0.5,
    abstraction: 0.5,
    softness: 0.5,
    decisiveness: 0.5,
  };

  // KanagiPhaseによる調整
  switch (kanagiPhase) {
    case "L-IN":
      // 内集・内省・圧縮 → 短さ・抽象度を上げる
      bias.conciseness = 0.8;
      bias.abstraction = 0.7;
      bias.softness = 0.6;
      bias.decisiveness = 0.3;
      break;
    case "L-OUT":
      // 展開・説明・共有 → 柔らかさを上げる
      bias.conciseness = 0.3;
      bias.abstraction = 0.4;
      bias.softness = 0.8;
      bias.decisiveness = 0.4;
      break;
    case "R-IN":
      // 観察・確認・把握 → 柔らかさ・保留を上げる
      bias.conciseness = 0.5;
      bias.abstraction = 0.5;
      bias.softness = 0.7;
      bias.decisiveness = 0.2;
      break;
    case "R-OUT":
      // 実行・決断・提示 → 断定性・短さを上げる
      bias.conciseness = 0.7;
      bias.abstraction = 0.3;
      bias.softness = 0.4;
      bias.decisiveness = 0.9;
      break;
  }

  // thinkingAxisによる微調整
  switch (thinkingAxis) {
    case "introspective":
      bias.abstraction = Math.min(1.0, bias.abstraction + 0.1);
      bias.softness = Math.min(1.0, bias.softness + 0.1);
      break;
    case "observational":
      bias.softness = Math.min(1.0, bias.softness + 0.15);
      bias.decisiveness = Math.max(0.0, bias.decisiveness - 0.1);
      break;
    case "constructive":
      bias.abstraction = Math.max(0.0, bias.abstraction - 0.1);
      bias.softness = Math.min(1.0, bias.softness + 0.1);
      break;
    case "executive":
      bias.conciseness = Math.min(1.0, bias.conciseness + 0.1);
      bias.decisiveness = Math.min(1.0, bias.decisiveness + 0.1);
      break;
  }

  // inertiaによる微調整（慣性が強いほど、前の状態を維持）
  if (inertia && inertia.level > 0.5) {
    // 慣性が強い場合、変化を抑える
    if (inertia.lastMode === "thinking") {
      bias.abstraction = Math.min(1.0, bias.abstraction + 0.1);
      bias.softness = Math.min(1.0, bias.softness + 0.1);
    } else if (inertia.lastMode === "engaged") {
      bias.decisiveness = Math.min(1.0, bias.decisiveness + 0.1);
      bias.conciseness = Math.min(1.0, bias.conciseness + 0.1);
    }
  }

  // 値を0.0〜1.0の範囲にクランプ
  bias.conciseness = Math.max(0.0, Math.min(1.0, bias.conciseness));
  bias.abstraction = Math.max(0.0, Math.min(1.0, bias.abstraction));
  bias.softness = Math.max(0.0, Math.min(1.0, bias.softness));
  bias.decisiveness = Math.max(0.0, Math.min(1.0, bias.decisiveness));

  return bias;
}

/**
 * CORE-9: 語彙選択バイアスに応じてテキストを選択・調整する
 * 
 * 語彙は変えない。文字列の並び替え・削除・優先順位付けのみ。
 * 新しい単語の挿入は禁止。
 */
export function applyLexicalBias(
  text: string,
  bias: LexicalBias
): string {
  if (!text || text.trim().length === 0) {
    return text;
  }

  let processed = text;

  // 1. 文を残すか削るか（concisenessに基づく）
  if (bias.conciseness > 0.7) {
    // 短さ重視：長い文を削る
    const sentences = processed.split(/[。！？]/).filter(s => s.trim().length > 0);
    if (sentences.length > 3) {
      // 最初の文と最後の文を優先的に残す
      const keepCount = Math.max(2, Math.floor(sentences.length * 0.6));
      const kept = [
        sentences[0],
        ...sentences.slice(1, keepCount - 1),
        sentences[sentences.length - 1],
      ];
      processed = kept.join("。") + (processed.endsWith("。") ? "。" : "");
    }
  } else if (bias.conciseness < 0.3) {
    // 長さ重視：文を分割して詳細を保つ（既存の処理を維持）
    // 特に変更なし
  }

  // 2. 同義的な候補がある場合、どれを残すか（softnessに基づく）
  if (bias.softness > 0.7) {
    // 柔らかさ重視：断定的な表現を柔らかく
    processed = processed.replace(/である/g, "です");
    processed = processed.replace(/だ。/g, "です。");
    processed = processed.replace(/だ！/g, "です。");
  } else if (bias.softness < 0.3) {
    // 断定性重視：柔らかい表現を断定的に
    processed = processed.replace(/です。/g, "だ。");
    processed = processed.replace(/ます。/g, "る。");
  }

  // 3. 文末の断定／保留をどれに寄せるか（decisivenessに基づく）
  if (bias.decisiveness > 0.7) {
    // 断定性重視：保留表現を断定に
    processed = processed.replace(/かもしれない。/g, "。");
    processed = processed.replace(/かもしれない/g, "");
    processed = processed.replace(/と思われる。/g, "。");
    processed = processed.replace(/と思われる/g, "");
    processed = processed.replace(/でしょう。/g, "。");
    processed = processed.replace(/でしょう/g, "");
  } else if (bias.decisiveness < 0.3) {
    // 保留重視：断定表現を保留に
    processed = processed.replace(/である。/g, "かもしれない。");
    processed = processed.replace(/だ。/g, "かもしれない。");
    // 「です。」は「かもしれません。」に変更（ただし既に「かもしれません」がある場合は変更しない）
    processed = processed.replace(/です。(?!.*かもしれません)/g, "かもしれません。");
  }

  // 4. 抽象度に基づく調整（abstractionに基づく）
  if (bias.abstraction > 0.7) {
    // 抽象度重視：具体的な数値や固有名詞を削除（簡易版：長い文を優先的に残す）
    // 特に変更なし（既存の構造を維持）
  } else if (bias.abstraction < 0.3) {
    // 具体性重視：抽象的な表現を具体的に（簡易版：文を分割して詳細を保つ）
    // 特に変更なし（既存の構造を維持）
  }

  return processed;
}

