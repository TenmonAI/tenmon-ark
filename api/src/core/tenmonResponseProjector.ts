/**
 * TENMON_RESPONSE_PROJECTOR_DEEPREAD_BIND_CURSOR_AUTO_V1
 * 出口整形・漏れ止め・ONE_STEP 収束（prompt 全再設計はしない）
 */

import type { ThreadCore } from "./threadCore.js";
import type { SafeAnswerConstraintV1 } from "./sourceLayerDiscernmentKernel.js";

export type TenmonResponseProjectorRouteKindV1 = "general_natural" | "define_fastpath" | "minimal_strip_only";

/** ku.speculativeGuardV1 から必要フィールドのみ */
export type TenmonProjectorSpeculativeGuardSliceV1 = {
  forbidHistoricalTone?: boolean;
  forbidDefinitiveClaim?: boolean;
  safeRephraseHint?: string;
};

export type TenmonResponseProjectorInputV1 = {
  routeKind: TenmonResponseProjectorRouteKindV1;
  /** ku.routeReason（本文へ出さない・漏洩検知補助） */
  routeReason?: string | null;
  threadCore?: ThreadCore | null;
  /** heart / phase 任意（将来の style 分岐用・現状は観測のみ） */
  heart?: unknown;
  heartPhase?: string | null;
  heartHint?: string | null;
  /** 投影前の本文 */
  draftText: string;
  /** knowledgeBinder 経由の補助裁定（内部キーを増やさない） */
  speculativeGuardV1?: TenmonProjectorSpeculativeGuardSliceV1 | null;
  safeAnswerConstraint?: SafeAnswerConstraintV1 | null;
};

export type TenmonResponseProjectorResultV1 = {
  schema: "TENMON_RESPONSE_PROJECTOR_V1";
  response: string;
  oneStepSatisfied: boolean;
  safeDisplaySections: string[] | null;
  /** 後段 deepread bind 用（未接続） */
  deepreadBindReserved: true;
};

const RE_ROUTE_LEAK =
  /\b(?:NATURAL_GENERAL_LLM_TOP_V1|TENMON_[A-Z0-9_]+|R\d+[A-Z0-9_]*_V\d+|DEF_FASTPATH_[A-Z_]+|CONTINUITY_[A-Z_]+|TRUTH_GATE_[A-Z_]+|KATAKAMUNA_[A-Z_]+|SYSTEM_DIAG[A-Z_]*|EXPLICIT_CHAR_PREEMPT_V1|BOOK_PLACEHOLDER_V1)\b/g;

const RE_INTERNAL_KEYS =
  /\b(?:kotodama_hisho|iroha_kotodama_kai|katakamuna_kotodama_kai|mizuho_den|technical_implementation|conversation_system)\b/gi;

const RE_INTERNAL_PHRASE_INLINE =
  /thoughtCoreSummary|notionCanon|sourceStackSummary|semanticSlots|decisionFrame|routeReason\s*[:：]\s*[^\s\n]+|lawsUsed\s*\/\s*evidenceIds|\blawsUsed\b|\bevidenceIds\b|\blawTrace\b|quoteHash|unitId|\blawKey\b|probe_ok|forensic|has_internal_leak|has_ONE_STEP/ui;

const RE_JSONISH = /\{\s*"(?:centerKey|routeReason|thoughtCore|notionCanon|schema)"\s*:/u;

const MAX_GENERAL = 5600;
const MAX_DEFINE = 7200;

function s(v: unknown): string {
  return String(v ?? "").trim();
}

/** 内部契約・ルート名・デバッグ語の表層漏洩を剥がす */
export function stripTenmonInternalSurfaceLeakV1(text: string): string {
  let out = String(text || "");
  out = out.replace(RE_ROUTE_LEAK, "");
  out = out.replace(RE_INTERNAL_KEYS, "この話題");
  out = out.replace(RE_INTERNAL_PHRASE_INLINE, "");
  out = out.replace(RE_JSONISH, "");
  out = out.replace(/\bOP_[A-Z_]+\b/g, "");
  out = out.replace(/【次の一手】\s*（次の一手の記録）[^\n]*/gu, "");
  out = out.replace(/priorRouteReason(?:Echo|Carry)\s*[:：][^\n]*/giu, "");
  out = out.replace(/\s+と\s+を/gu, "。");
  out = out.replace(/[ \t]+\n/g, "\n");
  out = out.replace(/\n{3,}/g, "\n\n");
  out = out.replace(/\s{2,}/g, " ");
  return out.trim();
}

/** 【天聞の所見】の多重化を抑える */
export function suppressRepetitiveTruthFrameV1(text: string): string {
  const t = String(text || "").trim();
  if (!t) return t;
  const chunks = t.split(/【天聞の所見】/);
  if (chunks.length <= 2) return t;
  const rest = chunks
    .slice(1)
    .map((c) => c.trim())
    .filter(Boolean)
    .join("\n\n");
  return `【天聞の所見】${rest}`.trim();
}

/** 文字量の上限（暴走抑止） */
export function clampTenmonResponseDensityV1(text: string, maxChars: number): string {
  const t = String(text || "").trim();
  if (t.length <= maxChars) return t;
  let cut = t.slice(0, maxChars);
  const lastPeriod = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf("？"));
  if (lastPeriod > maxChars * 0.5) cut = cut.slice(0, lastPeriod + 1);
  return `${cut.trim()}\n\n（以降は要約のため省略）`.trim();
}

/**
 * ONE_STEP: 自然文で「次の一手」を一意に近づける（英字 ONE_STEP は出さない）
 */
export function synthesizeTenmonOneStepClosingV1(text: string, routeKind: TenmonResponseProjectorRouteKindV1): string {
  if (routeKind === "minimal_strip_only") return String(text || "").trim();
  let t = String(text || "").trim();
  if (!t) return t;
  const hasOneStepJa = /次の一手|次の一歩|いま詰める一点|一点に絞|一つだけ選び|一手は一つ/u.test(t);
  if (hasOneStepJa) return t;
  const q = (t.match(/[？?]/g) || []).length;
  if (q >= 2) {
    const lastQ = Math.max(t.lastIndexOf("？"), t.lastIndexOf("?"));
    if (lastQ > 0) {
      const head = t.slice(0, lastQ);
      const tail = t.slice(lastQ);
      const headFixed = head.replace(/[？?]/g, "。");
      t = `${headFixed}${tail}`.replace(/。{2,}/g, "。").trim();
    }
  }
  if (!/次の一手|次の一歩/u.test(t)) {
    t = `${t}\n\n次の一手は、いまの見立てから一つに絞って進めます。`;
  }
  return t.trim();
}

function stabilizeTenmonSurfaceStyleV1(text: string): string {
  return String(text || "")
    .replace(/【天聞の所見】\s*【天聞の所見】/gu, "【天聞の所見】")
    .replace(/、{2,}/g, "、")
    .replace(/。{2,}/g, "。")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** 推測・類比レーンで史実口調を弱める（短い置換のみ） */
function softenHistoricalToneLeakV1(text: string): string {
  return String(text || "")
    .replace(/史実として確定/u, "史料では一義に確定しづらい")
    .replace(/歴史的事実として/u, "歴史叙述としては慎重に")
    .replace(/確定して言える/u, "前提を置けば言える");
}

function applyDiscernmentHintsToSurfaceV1(
  text: string,
  guard: TenmonProjectorSpeculativeGuardSliceV1 | null | undefined,
  constraint: SafeAnswerConstraintV1 | null | undefined,
): string {
  let t = String(text || "").trim();
  if (!t || !guard) return t;
  const c = constraint ?? undefined;
  if (guard.forbidHistoricalTone && c !== "treat_as_historical") {
    t = softenHistoricalToneLeakV1(t);
  }
  const hint = String(guard.safeRephraseHint || "").trim();
  if (
    guard.forbidDefinitiveClaim &&
    c === "treat_as_speculative_only" &&
    hint.length > 0 &&
    !t.includes(hint.slice(0, Math.min(14, hint.length)))
  ) {
    t = `${t}\n\n（${hint}）`;
  }
  return t.trim();
}

/** 受理・回帰用プローブ（本文のみ） */
export function probeTenmonResponseProjectionV1(text: string): {
  has_internal_leak: boolean;
  has_ONE_STEP: boolean;
} {
  const t = String(text || "");
  const leak =
    RE_ROUTE_LEAK.test(t) ||
    RE_INTERNAL_KEYS.test(t) ||
    RE_INTERNAL_PHRASE_INLINE.test(t) ||
    RE_JSONISH.test(t);
  const oneStep = /次の一手|次の一歩|いま詰める一点|一点に絞|一つだけ選び|一手は一つ/u.test(t);
  return { has_internal_leak: leak, has_ONE_STEP: oneStep };
}

/** 後段: deepread 合成束を本文へ載せるフック（未実装） */
export function reserveTenmonDeepreadResponseBindV1(_payload: Record<string, unknown>): null {
  return null;
}

/**
 * ThreadCore / heart を受け取り、ユーザー向け最終本文へ投影する
 */
export function projectTenmonUserFacingResponseV1(input: TenmonResponseProjectorInputV1): TenmonResponseProjectorResultV1 {
  void input.threadCore;
  void input.heart;
  void input.heartPhase;
  void input.heartHint;
  void input.routeReason;

  const kind = input.routeKind;
  let text = s(input.draftText);
  if (!text) {
    return {
      schema: "TENMON_RESPONSE_PROJECTOR_V1",
      response: "【天聞の所見】いま、次に詰める一点を一つだけ置いてください。",
      oneStepSatisfied: true,
      safeDisplaySections: null,
      deepreadBindReserved: true,
    };
  }

  text = stripTenmonInternalSurfaceLeakV1(text);
  text = suppressRepetitiveTruthFrameV1(text);
  text = stabilizeTenmonSurfaceStyleV1(text);
  if (!s(text)) {
    text = "【天聞の所見】いまの論点を、次の一手だけに落とします。";
  }

  text = applyDiscernmentHintsToSurfaceV1(text, input.speculativeGuardV1 ?? null, input.safeAnswerConstraint ?? null);

  const max = kind === "define_fastpath" ? MAX_DEFINE : kind === "minimal_strip_only" ? 12000 : MAX_GENERAL;
  text = clampTenmonResponseDensityV1(text, max);

  text = synthesizeTenmonOneStepClosingV1(text, kind);
  text = stripTenmonInternalSurfaceLeakV1(text);

  const probe = probeTenmonResponseProjectionV1(text);
  return {
    schema: "TENMON_RESPONSE_PROJECTOR_V1",
    response: text,
    oneStepSatisfied: probe.has_ONE_STEP,
    safeDisplaySections: null,
    deepreadBindReserved: true,
  };
}
