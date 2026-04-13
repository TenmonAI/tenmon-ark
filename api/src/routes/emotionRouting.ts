/**
 * emotionRouting.ts — 感情ルーティング判定モジュール
 * 
 * chat.tsから抽出した3層感情判定ロジック。
 * 軽感情 → NATURAL_GENERAL_LLM_TOP
 * 中間感情 → N2_KANAGI_PHASE_TOP
 * 深い感情 → N2_KANAGI_PHASE_TOP（即escalate）
 * 
 * OLD_PIPELINE_RETIREMENT_V2: 責務分離
 */

export interface EmotionRouteResult {
  /** 深い感情（消えたい/死にたい/自殺等） */
  looksDeepSupport: boolean;
  /** 中間感情キーワード検出 */
  hasMidEmotionKw: boolean;
  /** 深掘り意図検出 */
  hasDeepIntent: boolean;
  /** 明示的サポート要求 */
  hasExplicitSupportRequest: boolean;
  /** 中間サポート判定（感情KW+深掘り意図、または明示的要求） */
  looksMidSupport: boolean;
  /** N2ルートに送るべきか */
  looksSupport: boolean;
}

/**
 * 3層感情ルーティング判定
 * @param userMsg ユーザー入力テキスト（トリム済み）
 */
export function classifyEmotion(userMsg: string): EmotionRouteResult {
  const t = String(userMsg || "");

  // 深い感情（即N2 escalate）
  const looksDeepSupport =
    /消えたい|死にたい|助けて|パニック|限界|もう無理|壊れ|逃げたい|生きてる意味|自殺|自傷/.test(t);

  // 中間感情キーワード
  const hasMidEmotionKw =
    /しんどい|しんどく|つらい|つらさ|つらく|苦しい|苦し[くみ]|不安|落ち込|凹[んむ]|へこ[んむ]|追い詰め|行き詰|息苦し|胸が[苦痛重]|心が[重折痛]|気持ちが[重沈暗]/.test(t);

  // 深掘り意図
  const hasDeepIntent =
    /どうしていい|どうすれば|わからない|整理したい|聞いてほしい|聞いて欲しい|寄り添|話を聞い|受け止め|向き合い|向き合う|抱え[きてる]|吐き出し|楽になりたい|逃げ出し|耐えられ|我慢でき|相談[でがもし]|打ち明け|誰にも[言話]え|一人[でじ]|孤独|頼れ[るな]|救[いわ]/.test(t);

  // 明示的サポート要求（感情KWなしでもN2へ）
  const hasExplicitSupportRequest =
    /寄り添|聞いてほしい|聞いて欲しい|受け止め|話を聞い|整理したい|向き合いたい|吐き出したい|楽になりたい/.test(t);

  const looksMidSupport = (hasMidEmotionKw && hasDeepIntent) || hasExplicitSupportRequest;
  const looksSupport = looksDeepSupport || looksMidSupport;

  return {
    looksDeepSupport,
    hasMidEmotionKw,
    hasDeepIntent,
    hasExplicitSupportRequest,
    looksMidSupport,
    looksSupport,
  };
}
