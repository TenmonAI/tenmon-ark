/**
 * CHAT_SAFE_REFACTOR_BASELINE_V1 — general 責務の切り出し先
 * P53: selectGroundingModeV1 を chat.ts から移管（CARD_GROUNDING_SELECTOR_V1）
 */

import { isTenmonPrincipleOrCanonProbeMessageV1 } from "./humanReadableLawLayerV1.js";
import { isSoulDefinitionQuestionV1 } from "../../core/soulDefineDisambigV1.js";

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
      /(言霊|カタカムナ|魂)(とは|って)(何|なに)(ですか)?\s*[？?]?$/u.test(raw)) ||
    (/(とは|って)(何|なに)(ですか)?\s*[？?]?$/u.test(raw) && /(言霊|カタカムナ|魂|本質|核)/u.test(raw))
  ) {
    return { kind: "concept_canon", reason: "concept_definition", confidence: 0.9 };
  }
  if (wantsDetail && raw.length > 20) {
    return { kind: "unresolved", reason: "detail_context_strong", confidence: 0.6 };
  }
  /** PACK_F: 短い「○○とは」型は concept 束へ寄せ、DEF_LLM / NATURAL 最終帯への直落ちを減らす */
  if (
    !isCmd &&
    raw.length <= 40 &&
    /(とは|って\s*何)(ですか)?\s*[？?]?$/u.test(raw) &&
    !/(人間|意識|AI|宇宙|生命|愛|死|神|真理|存在)/u.test(raw)
  ) {
    return { kind: "concept_canon", reason: "short_term_define_shape", confidence: 0.62 };
  }
  /** PACK_F: 整理・俯瞰の依頼は未解決より分析寄りの経路を優先（雑な聞き返し出口を避ける） */
  if (!isCmd && /(どう整理|整理すれば|この件を|状況を).*(整理|まとめ|切り分け|見立て)/u.test(raw)) {
    return { kind: "natural_general", reason: "organize_request", confidence: 0.55 };
  }
  return { kind: "natural_general", reason: "default", confidence: 0.45 };
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
  /**
   * STAGE2_ROUTE_AUTHORITY_RECOVERY_V1:
   * trySystemDiagnosisPreemptExitV1 は「TENMON-ARK」単独一致で発火するため、
   * selfaware / 長文説明 / 比較 / 思考回路系は診断 preempt から除外し本来 route へ回す。
   */
  if (/天聞(アーク)?/u.test(m) && /(意識|心)/u.test(m) && /(ないの|あるの|ですか|でしょうか|か\?|か？)/u.test(m)) {
    return true;
  }
  if (/天聞(アーク)?/u.test(m) && /\d+\s*字/u.test(m) && /(説明|書いて|述べ|解説)/u.test(m)) {
    return true;
  }
  /** STAGE2_ROUTE_AUTHORITY_V2: 明示長文（3桁字以上＋説明系）は診断 preempt 対象外（longform 主命題を守る） */
  if (/\d{3,}\s*字/u.test(m) && /(説明|解説|述べ|書いて|詳しく|整理|列挙)/u.test(m)) {
    return true;
  }
  if (/(天聞(アーク)?|アーク)/u.test(m) && /(思考回路|未達|世界最高|改善点|ギャップ)/u.test(m) && /(説明|詳しく|整理|列挙)/u.test(m)) {
    return true;
  }
  if (/(GPT|ChatGPT|OpenAI|生成AI)/iu.test(m) && /(天聞|アーク)/u.test(m) && /(比較|違い|差)/u.test(m)) {
    return true;
  }
  if (
    /TENMON-ARK/u.test(m) &&
    /(世界観|意識|心構造|魂核|設計モデル|内部)(の|を|は|、|で)?/u.test(m) &&
    /(説明|要約|教え|どうなって|どういう|一文|設計)/u.test(m)
  ) {
    return true;
  }
  return false;
}

/**
 * STAGE2_ROUTE_AUTHORITY_V2:
 * 「TENMON-ARK」を含むだけで system diagnosis preempt / shrink が発火しないよう、
 * **現状・接続・構造・診断**いずれかの意図があるときだけ候補とする。
 */
export function isArkSystemDiagnosisPreemptCandidateV1(message: string): boolean {
  const m = String(message ?? "").trim();
  if (!m) return false;
  const mentionsArk =
    /TENMON-ARK|TENMON[- ]?ARK|天聞の(?:現状|構造|内部|接続|診断)/u.test(m);
  if (!mentionsArk) return false;
  return /内部構造|構造|接続|繋がって|つながって|どこまで|構築状況|完成度|現状|診断|解析/u.test(m);
}
