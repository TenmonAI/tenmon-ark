// CorePlan（思考の器）の型定義
// 工程3: 器だけ固定（推論は工程4以降）

/**
 * CorePlan: 思考の中核構造
 * - centerClaim: 正中命題（中心的な主張）
 * - claims: 個別の主張リスト（FACT/HYPOTHESIS）
 * - evidenceIds: 参照している証拠IDのリスト
 * - warnings: 警告メッセージ
 * - chainOrder: 推論チェーンの順序（evidenceIds の順序）
 */
export type CorePlan = {
  centerClaim: string;
  claims: {
    text: string;
    evidenceIds: string[];
    level: "FACT" | "HYPOTHESIS";
  }[];
  evidenceIds: string[];
  warnings: string[];
  chainOrder: string[];
};

