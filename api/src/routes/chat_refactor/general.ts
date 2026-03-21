/**
 * CHAT_SAFE_REFACTOR_BASELINE_V1 — general 責務の切り出し先
 * P53: selectGroundingModeV1 を chat.ts から移管（CARD_GROUNDING_SELECTOR_V1）
 */

import { isTenmonPrincipleOrCanonProbeMessageV1 } from "./humanReadableLawLayerV1.js";

export type GroundingSelectorKind =
  | "grounded_required"
  | "scripture_canon"
  | "subconcept_canon"
  | "concept_canon"
  | "natural_general"
  | "unresolved";

/** CARD_GROUNDING_SELECTOR_V1: grounded / canon / concept / general / unresolved を1回だけ選択 */
export function selectGroundingModeV1(input: {
  rawMessage: string;
  wantsDetail: boolean;
  hasDocPage: boolean;
  isCmd: boolean;
  threadCenterType?: string | null;
  threadCenterKey?: string | null;
}): { kind: GroundingSelectorKind; reason: string; confidence: number } {
  const { rawMessage, wantsDetail, hasDocPage, isCmd, threadCenterType, threadCenterKey } = input;
  const raw = String(rawMessage ?? "").trim();
  if (hasDocPage || (wantsDetail && (/\bdoc\b/i.test(raw) || /pdfPage\s*=\s*\d+/i.test(raw)))) {
    return { kind: "grounded_required", reason: "doc/pdfPage_or_detail", confidence: 1 };
  }
  if (
    threadCenterType === "scripture" &&
    raw.length <= 80 &&
    (/さっき見ていた中心|(言霊|中心)(を)?土台に|今の話を(続ける|続けて|見ていきましょう)/u.test(raw) ||
      /^(次は|次の一手|違いは|どう違う|要するに|要点は)/u.test(raw) ||
      /^[ァ-ヴー]+\s*[は？?]?\s*$/u.test(raw))
  ) {
    return { kind: "scripture_canon", reason: "scripture_followup", confidence: 1 };
  }
  if (
    (!isCmd &&
      /(言霊|カタカムナ)(とは|って)(何|なに)(ですか)?\s*[？?]?$/u.test(raw)) ||
    (/(とは|って)(何|なに)(ですか)?\s*[？?]?$/u.test(raw) && /(言霊|カタカムナ|本質|核)/u.test(raw))
  ) {
    return { kind: "concept_canon", reason: "concept_definition", confidence: 0.9 };
  }
  if (wantsDetail && raw.length > 20) {
    return { kind: "unresolved", reason: "detail_context_strong", confidence: 0.6 };
  }
  return { kind: "natural_general", reason: "default", confidence: 0.5 };
}

/** P54: NATURAL_GENERAL_LLM_TOP 分流用の general kind（counsel / worldview / short_moral / other） */
export type GeneralKind = "counsel" | "worldview" | "short_moral" | "other";

/** CARD: generalKind 算出（本文・routeReason は変えない） */
export function getGeneralKind(message: string): GeneralKind {
  const t = String(message ?? "").trim();
  if (/悩み|しんどい|つらい|聞いてくれ|相談/.test(t)) return "counsel";
  if (/(なんで|なぜ|どうして).*(する|起きる)/.test(t)) return "worldview";
  if (/恨まない|許せない|許したい|責めたくない/.test(t)) return "short_moral";
  return "other";
}

/**
 * P67_ROUTE_PREEMPT_BALANCE_V1:
 * SYSTEM_DIAGNOSIS_PREEMPT_V1 / residual 会話系 preempt の対象外にする質問。
 * 判断構造・内部設計モデル・概念説明（システム稼働・現状診断の依頼ではない）。
 */
export function shouldBypassArkConversationDiagnosticsPreemptV1(message: string): boolean {
  const m = String(message ?? "").trim();
  if (!m) return false;
  /** MAINLINE_PRINCIPLE_DEPTH_ROUTE_BYPASS_V1: 原理・Ω・原典・言霊等は会話系診断 preempt から除外 */
  if (isTenmonPrincipleOrCanonProbeMessageV1(m)) return true;
  if (/(判断構造|意識構造|心構造|魂核構造|魂核|設計モデル)/u.test(m)) return true;
  if (/断捨離/u.test(m) && /(説明|教え|定義|として|片付け)/u.test(m)) return true;
  if (
    /天聞アーク/u.test(m) &&
    /(世界観|意識|心構造|魂核|設計モデル|内部)(の|を|は|、|で)?/u.test(m) &&
    /(説明|要約|教え|どうなって|どういう|一文|設計)/u.test(m)
  ) {
    return true;
  }
  return false;
}
