/**
 * CARD_THREADCORE_MIN_V1: thread ごとの最小 ThreadCore 型とヘルパー
 * THREADCORE_REQUIRED_COVERAGE_V1: 出口 JSON（ku.threadCore）にのみ載せる carry 拡張（DB 永続は store 側で無視）
 */

export type ThreadCoreTurnKindV1 =
  | "define"
  | "analysis"
  | "judgement"
  | "support"
  | "continuity"
  | "selfdiag";

export type ThreadCoreCarryModeV1 = "keep" | "deepen" | "compare" | "redirect" | "soothe" | "decide";

export type ThreadResponseContract = {
  answerLength?: "short" | "medium" | "long" | null;
  /** explicit length は owner route ではなく formatter 契約として保持 */
  explicitLengthRequested?: number | null;
  answerMode?: string | null;
  answerFrame?: string | null;
  routeReason?: string | null;
};

export type ThreadDialogueContract = {
  centerKey?: string | null;
  centerLabel?: string | null;
  user_intent_mode?: string | null;
  answer_depth?: string | null;
  grounding_policy?: string | null;
  continuity_goal?: string | null;
  next_best_move?: string | null;
};

export type ThreadCore = {
  threadId: string;
  centerKey: string | null;
  centerLabel: string | null;
  /** 中心命題（短文） */
  centerClaim?: string | null;
  /** 直前回答の本質（短文） */
  priorAnswerEssence?: string | null;
  /** continuity 用の最小核 */
  semanticNucleus?: string | null;
  activeEntities: string[];
  openLoops: string[];
  commitments: string[];
  dialogueContract: ThreadDialogueContract | null;
  lastResponseContract: ThreadResponseContract | null;
  updatedAt: string;
  /** このターンの問い型（出口投影） */
  turnKind?: ThreadCoreTurnKindV1 | null;
  /** 継続の運び方（出口投影） */
  carryMode?: ThreadCoreCarryModeV1 | null;
  /** 前回から運んでいる芯（短い一文） */
  previousAnchor?: string | null;
  /** 今回ユーザー入力の要約 */
  currentDelta?: string | null;
  /** 次に置く一点 */
  nextFocus?: string | null;
  /** TENMON_CONVERSATION_FOUNDATION_PACK_A_V1: previousAnchor の観測別名 */
  priorCenter?: string | null;
  /** いまの応答の中心ラベル／キー（短文化） */
  currentCenter?: string | null;
  /** turnKind の観測別名（クライアント・jq 用） */
  turnRole?: ThreadCoreTurnKindV1 | null;
  /** 継続の型ラベル（carry × route の合成） */
  continuityType?: string | null;
  /** 1 行の継続要約（捏造なし・入力と応答先頭から） */
  continuitySummary?: string | null;
  /** 意味核の運搬オブジェクト（runtime projection 用） */
  semanticNucleusObject?: {
    centerKey?: string | null;
    centerLabel?: string | null;
    centerClaim?: string | null;
    openLoop?: string | null;
    unresolvedPoint?: string | null;
    nextFocus?: string | null;
    responseIntent?: string | null;
    sourceAuthority?: string | null;
  } | null;
  /** 5層メモリ循環の runtime map（永続スキーマ変更なし） */
  memoryCirculationMapV1?: {
    turn: Record<string, unknown>;
    thread: Record<string, unknown>;
    session: Record<string, unknown>;
    persistentCanon: Record<string, unknown>;
    growth: Record<string, unknown>;
  } | null;
};

export function emptyThreadCore(threadId: string): ThreadCore {
  return {
    threadId,
    centerKey: null,
    centerLabel: null,
    activeEntities: [],
    openLoops: [],
    commitments: [],
    dialogueContract: null,
    lastResponseContract: null,
    updatedAt: new Date().toISOString(),
  };
}

export function centerLabelFromKey(centerKey: string | null): string | null {
  const k = String(centerKey || "").trim().toLowerCase();
  if (!k) return null;
  if (k === "kotodama") return "言霊";
  if (k === "katakamuna") return "カタカムナ";
  if (k === "mizuhi" || k === "suika" || k === "mizuho" || k === "mizuho_den") return "水穂伝";
  if (k === "tenmon_ark") return "天聞アーク";
  return String(centerKey || "").trim() || null;
}
