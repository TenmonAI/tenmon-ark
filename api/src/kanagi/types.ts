// AmatsuKanagi Thought Circuit (水火エンジン) 型定義

/**
 * 水火状態（Iki State）
 */
export type IkiState = "FIRE" | "WATER" | "BOTH" | "NEUTRAL";

/**
 * 位相（Phase）
 */
export type Phase = "rise" | "fall" | "open" | "close" | "center";

/**
 * 形（Form）シンボル
 */
export type FormSymbol = "○" | "｜" | "ゝ" | "井" | "×" | "△" | "□" | "◇";

/**
 * 言靈行（Kotodama Row）
 */
export type KotodamaRow = "ア" | "ワ" | "ヤ" | "マ" | "ハ" | "ナ" | "タ" | "サ" | "カ" | "ラ";

/**
 * 位（Role）
 */
export type Role = "君位" | "臣位" | "民位";

/**
 * 定義（Definition）
 */
export interface Definition {
  id: string;
  term: string;
  meaning: string;
  evidence: Evidence[];
}

/**
 * 変換規則（Rule）
 */
export interface Rule {
  id: string;
  name: string;
  pattern: string; // 正規表現パターンまたはキーワード
  output: string; // 変換結果
  evidence: Evidence[];
}

/**
 * 体系規則（Law）
 */
export interface Law {
  id: string;
  name: string;
  condition: string; // 条件式
  result: string; // 結果
  evidence: Evidence[];
}

/**
 * 証拠（Evidence）
 */
export interface Evidence {
  source: string; // ファイル名またはURL
  page?: number; // ページ番号
  line?: number; // 行番号
  snippet: string; // 該当箇所のテキスト
}

/**
 * Ruleset（規則セット）
 */
export interface Ruleset {
  id: string;
  name: string;
  version: string;
  definitions: Definition[];
  rules: Rule[];
  laws: Law[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 推論トレース（Reasoning Trace）
 */
export interface ReasoningTrace {
  step: number;
  stage: "input" | "iki" | "phase" | "form" | "kotodama" | "reasoning" | "verification";
  input?: string;
  output?: string;
  state?: IkiState | Phase | FormSymbol | KotodamaRow | Role;
  confidence?: number;
  evidence?: Evidence[];
  warnings?: string[];
}

/**
 * 推論結果（Reasoning Result）
 */
export interface ReasoningResult {
  input: string;
  trace: ReasoningTrace[];
  answer: string;
  suggestedActions: string[];
  warnings: string[];
  confidence: number;
}

/**
 * 抽出リクエスト（Extract Request）
 */
export interface ExtractRequest {
  source: "upload" | "path";
  file?: File; // upload の場合
  path?: string; // path の場合
}

/**
 * 抽出結果（Extract Result）
 */
export interface ExtractResult {
  rulesetId: string;
  definitions: number;
  rules: number;
  laws: number;
  evidence: number;
  warnings: string[];
}

/**
 * 推論リクエスト（Reason Request）
 */
export interface ReasonRequest {
  input: string;
  rulesetId?: string; // 指定されない場合は最新のrulesetを使用
  sessionId?: string; // 螺旋再帰用のセッションID
}

