// v∞-2: 外部入力の正規化・サニタイズ

export type InputSource = "web" | "voice" | "device" | "agent";

export type SanitizedInput = {
  text: string;
  isValid: boolean;
  error?: string;
};

const MAX_INPUT_LENGTH = 10000; // 最大入力長
const MIN_INPUT_LENGTH = 1;     // 最小入力長

/**
 * v∞-2: 外部入力を正規化・サニタイズする
 * 
 * sourceによって人格ロジックを変えない（入力正規化のみ）
 * 将来的にsource別の正規化が必要になった場合の拡張ポイント
 */
export function sanitizeInput(
  input: unknown,
  _source: InputSource
): SanitizedInput {
  // 非テキスト入力のチェック
  if (typeof input !== "string") {
    return {
      text: "",
      isValid: false,
      error: "input must be a string",
    };
  }
  
  // 空文字のチェック
  const trimmed = input.trim();
  if (trimmed.length < MIN_INPUT_LENGTH) {
    return {
      text: "",
      isValid: false,
      error: "input is empty",
    };
  }
  
  // 極端に長い入力のチェック
  if (trimmed.length > MAX_INPUT_LENGTH) {
    return {
      text: trimmed.substring(0, MAX_INPUT_LENGTH),
      isValid: true,
      error: "input truncated (too long)",
    };
  }
  
  // 入力正規化（sourceによる違いはなし）
  // 制御文字を除去（簡易版）
  const normalized = trimmed
    .replace(/[\x00-\x1F\x7F]/g, "") // 制御文字を除去
    .replace(/\s+/g, " ")            // 連続する空白を1つに
    .trim();
  
  if (normalized.length < MIN_INPUT_LENGTH) {
    return {
      text: "",
      isValid: false,
      error: "input is empty after sanitization",
    };
  }
  
  return {
    text: normalized,
    isValid: true,
  };
}

