// src/kanagi/types/corePlan.ts
export type Strictness = "strict" | "soft";
export type AnswerType = "direct" | "needsEvidence" | "askClarify" | "liveSearch";

export type AxisKey =
  | "tai_you"      // 躰／用
  | "suika"        // 水火
  | "seichu"       // 正中
  | "seiseisa"     // 生成鎖
  | "teniwoha"     // 辞（テニヲハ）
  | "kokakechu";   // 空仮中（いろは側の本質算出）

export type KanagiOp =
  | "省"    // 省略（核だけ取る）
  | "延開"  // 展開（核→用へ）
  | "反約"  // 逆向きに約す
  | "反"    // 反転
  | "約"    // 圧縮
  | "略"    // 重要点の抽出
  | "転";   // 視点転換

export type DocKey = "khs" | "ktk" | "iroha";

export interface EvidenceHit {
  doc: DocKey;
  page?: number;
  sourceId: string;      // 例: KHS-P0103-T02 / IROHA-P0012-T01
  lawId?: string;        // 例: KHS-LAW-...（あれば）
  quote: string;         // 実際の引用（テキスト抜粋）
  score?: number;
}

export interface EvidencePack {
  hits: EvidenceHit[];    // 取得結果（上位から）
  debug?: {
    query: string;
    usedFallback?: boolean;
  };
}

export interface CoreClaim {
  text: string;           // 「根拠で言える最小主張」
  axes: AxisKey[];        // どの軸で言っているか
  evidence: EvidenceHit[];// 主張に使った根拠（0は禁止：strict時）
}

export interface CorePlan {
  answerType: AnswerType;
  strictness: Strictness;

  keyAxes: Record<AxisKey, "present" | "missing">;
  operations: KanagiOp[];

  claims: CoreClaim[];

  nextQuestion?: string; // 必要なら1つだけ
  recommendedEvidence?: Array<{ doc: DocKey; page?: number; reason: string }>;

  // LLM整形用の最小メタ
  meta?: {
    intent: string;
    mode: string;
  };
}


