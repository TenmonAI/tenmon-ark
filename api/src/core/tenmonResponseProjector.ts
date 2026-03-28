/**
 * TENMON_RESPONSE_PROJECTOR_DEEPREAD_BIND_CURSOR_AUTO_V1
 * 出口整形・漏れ止め・ONE_STEP 収束（prompt 全再設計はしない）
 *
 * TENMON_SURFACE_LEAK_CLEANUP_CURSOR_AUTO_V1:
 * center:/root_reasoning:/truth_structure:/verdict:/次軸:/次観測/相=/center_loss の表層除去、
 * routeEvidenceTraceV1 等 internal bundle 識別子の除去、reply/text/answer/message 抽出（ku・routeReason は触らない）
 */

import type { ThreadCore } from "./threadCore.js";
import type { SafeAnswerConstraintV1 } from "./sourceLayerDiscernmentKernel.js";
import type { TruthLayerArbitrationKernelResultV1 } from "./truthLayerArbitrationKernel.js";

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
  /** binder 補助: root 表示制約（本文全面 rewrite はしない） */
  rootTruthArbitrationKernelV1?: TruthLayerArbitrationKernelResultV1 | null;
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

/** user-facing に混入した cognition / ku 束の識別子（JSON 断片のノイズ除去） */
const RE_INTERNAL_SURFACE_BUNDLE_IDS =
  /\b(?:routeEvidenceTraceV1|personaConstitutionRuntimeV1|verdictEngineV1|verdictSections|threadCoreLinkSurfaceV1|threadCore|thoughtCoreSummary|inputCognitionSplitV1|truthLayerArbitrationV1|truthLayerArbitrationKernelV1|tenmonDiscernmentJudgementBundleV1|answerProfileLayerV1|confidenceDisplayV1|omegaContract|seedKernel|expressionPlan|comfortTuning|providerPlan|brainstemDecision|selfLearningAutostudyV1)\b/g;

const TENMON_EXTRACT_EMPTY_FALLBACK_V1 =
  "【天聞の所見】いまの論点を、次の一手だけに落とします。";

function pickUserFacingStringFieldsV1(o: Record<string, unknown>): string | null {
  for (const k of ["reply", "text", "answer", "message"] as const) {
    const s = o[k];
    if (typeof s === "string" && s.trim()) return s.trim();
  }
  return null;
}

function unwrapNestedJsonUserTextV1(s: string): string {
  const t = s.trim();
  if (!t.startsWith("{") || !/"(?:reply|text|answer|message)"\s*:/.test(t)) return s;
  try {
    const j = JSON.parse(t) as Record<string, unknown>;
    return pickUserFacingStringFieldsV1(j) ?? s;
  } catch {
    return s;
  }
}

/**
 * LLM / 中間層がオブジェクトや JSON 文字列を返したとき、表に出す本文だけを取り出す（巨大 planning bundle を避ける）。
 * 構造化データからの抽出が空に落ちたときだけ短い安全文へ（素の空入力は空のまま）。
 */
export function extractTenmonUserFacingFinalTextV1(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "string" && !raw.trim()) return "";

  let structured = typeof raw === "object" && raw !== null && !Array.isArray(raw);
  let v: unknown = raw;

  if (typeof v === "string") {
    const t = v.trim();
    if (t.startsWith("{") && /"(?:reply|text|answer|message)"\s*:/.test(t)) {
      try {
        v = JSON.parse(t) as unknown;
        structured = true;
      } catch {
        v = raw;
      }
    }
  }

  if (v && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    let picked = pickUserFacingStringFieldsV1(o);
    if (!picked) {
      for (const nestKey of ["response", "content", "finalText", "output"] as const) {
        const nest = o[nestKey];
        if (nest && typeof nest === "object" && !Array.isArray(nest)) {
          picked = pickUserFacingStringFieldsV1(nest as Record<string, unknown>);
          if (picked) break;
        } else if (typeof nest === "string" && nest.trim()) {
          picked = nest.trim();
          break;
        }
      }
    }
    if (picked) {
      picked = unwrapNestedJsonUserTextV1(picked);
      const fin = picked.trim();
      return fin || (structured ? TENMON_EXTRACT_EMPTY_FALLBACK_V1 : "");
    }
    return structured ? TENMON_EXTRACT_EMPTY_FALLBACK_V1 : String(raw ?? "").trim();
  }

  let out = String(v ?? "").trim();
  out = unwrapNestedJsonUserTextV1(out);
  if (!out.trim()) return structured ? TENMON_EXTRACT_EMPTY_FALLBACK_V1 : "";
  return out;
}

/** 行単位の内部裁定メタ（本文が消えそうなときは fail-open で残す） */
const RE_INTERNAL_META_LINE_FULL = /^(?:center|root_reasoning|truth_structure|verdict|次軸|次観測)\s*[:：]\s*.*$/u;

const MAX_GENERAL = 5600;
const MAX_DEFINE = 7200;

function s(v: unknown): string {
  return String(v ?? "").trim();
}

function stripInternalMetaLinesFailOpenV1(text: string): string {
  const raw = String(text || "");
  const trimmedOrig = raw.trim();
  if (!trimmedOrig) return "";
  const lines = raw.split("\n");
  const kept = lines.filter((ln) => !RE_INTERNAL_META_LINE_FULL.test(ln.trim()));
  const result = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!result) return raw;
  if (result.length < 28 && trimmedOrig.length > 72) return raw;
  if (trimmedOrig.length > 120 && result.length < trimmedOrig.length * 0.14) return raw;
  return result;
}

/** 同一行・段落内に混入した短いメタ断片（日本語本文は食わないよう値は主に内部トークン幅に制限） */
function stripInlineInternalMetaFragmentsV1(text: string): string {
  let out = String(text || "");
  out = out.replace(
    /\s+(?:center|root_reasoning|truth_structure)\s*[:：]\s*[A-Za-z0-9_=|,.<>/-]{1,200}(?:\s+[A-Za-z0-9_=|,.<>/-]{1,120})*\s*/giu,
    " ",
  );
  out = out.replace(/\s+verdict\s*[:：]\s*[^\n]{0,120}/giu, " ");
  out = out.replace(/\s+次軸\s*[:：]\s*[^\n]{0,120}/giu, " ");
  out = out.replace(/\s+次観測\s*[:：]\s*[^\n]{0,120}/giu, " ");
  out = out.replace(/相=[^。,\n，]+/gu, "");
  out = out.replace(/\bcenter_loss\b\s*は内部。[\s\n]*/giu, "");
  out = out.replace(/\bcenter_loss\b/giu, "");
  return out;
}

/** closing 直前に付いた内部ヒント行を落とす（ONE_STEP 自然文は後段で付与） */
function stripInternalHintTailLinesV1(text: string): string {
  let t = String(text || "").trim();
  const tailPat =
    /(?:\n|^)\s*(?:次軸|次観測|center|root_reasoning|truth_structure|verdict)\s*[:：]\s*[^\n]+$/gimu;
  let prev = "";
  while (prev !== t) {
    prev = t;
    t = t.replace(tailPat, "").trim();
  }
  return t;
}

/** 内部契約・ルート名・デバッグ語の表層漏洩を剥がす */
export function stripTenmonInternalSurfaceLeakV1(text: string): string {
  let out = String(text || "");
  out = stripInternalMetaLinesFailOpenV1(out);
  out = stripInlineInternalMetaFragmentsV1(out);
  out = out.replace(RE_INTERNAL_SURFACE_BUNDLE_IDS, "");
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

/**
 * 見出し前の前置きと、見出し直後本文が同じ内容で二重になる場合に前置き側を畳む
 */
export function suppressPrefaceDuplicateBeforeSeenmarkV1(text: string): string {
  const marker = "【天聞の所見】";
  const t = String(text || "");
  const i = t.indexOf(marker);
  if (i < 0) return t;
  const before = t.slice(0, i).trim();
  const after = t.slice(i + marker.length).replace(/^\s*\n+/, "").trim();
  if (!before) return t;
  const nb = before.replace(/\s+/g, " ").trim();
  const naHead = after
    .slice(0, Math.min(after.length, nb.length + 32))
    .replace(/\s+/g, " ")
    .trim();
  if (nb.length >= 8 && naHead.startsWith(nb)) {
    return `${marker}\n\n${after}`.replace(/\n{3,}/g, "\n\n").trim();
  }
  if (nb.length >= 12 && after.replace(/\s+/g, " ").includes(nb)) {
    return `${marker}\n\n${after}`.replace(/\n{3,}/g, "\n\n").trim();
  }
  const echo = /重さを受け取りました[。]?/u;
  if (echo.test(before) && echo.test(after)) {
    const strippedBefore = before.replace(echo, "").replace(/^\n+/, "").trim();
    const joiner = strippedBefore ? `${strippedBefore}\n\n` : "";
    return `${joiner}${marker}\n\n${after}`.replace(/\n{3,}/g, "\n\n").trim();
  }
  return t;
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
  let t = stripInternalHintTailLinesV1(String(text || "").trim());
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
  rootKernel: TruthLayerArbitrationKernelResultV1 | null | undefined,
): string {
  let t = String(text || "").trim();
  if (!t || !guard) return t;
  const c = constraint ?? undefined;
  const dc = rootKernel?.displayConstraint;
  if (guard.forbidHistoricalTone && c !== "treat_as_historical") {
    t = softenHistoricalToneLeakV1(t);
  }
  const hint = String(guard.safeRephraseHint || "").trim();
  const wantSpecHint =
    guard.forbidDefinitiveClaim &&
    c === "treat_as_speculative_only" &&
    hint.length > 0 &&
    (dc?.separate_symbolic_and_fact !== false);
  if (
    wantSpecHint &&
    !t.includes(hint.slice(0, Math.min(14, hint.length)))
  ) {
    t = `${t}\n\n（${hint}）`;
  }
  return t.trim();
}

/** ku から root kernel を取り出し（表層投影用） */
export function pickRootTruthArbitrationKernelFromKuV1(
  ku: Record<string, unknown> | null | undefined,
): TruthLayerArbitrationKernelResultV1 | null {
  if (!ku || typeof ku !== "object") return null;
  const k = (ku as { truthLayerArbitrationKernelV1?: unknown }).truthLayerArbitrationKernelV1;
  if (!k || typeof k !== "object" || Array.isArray(k)) return null;
  if ((k as { schema?: string }).schema !== "TENMON_ROOT_TRUTH_ARBITRATION_KERNEL_V1") return null;
  return k as TruthLayerArbitrationKernelResultV1;
}

/** 受理・回帰用プローブ（本文のみ） */
export function probeTenmonResponseProjectionV1(text: string): {
  has_internal_leak: boolean;
  has_ONE_STEP: boolean;
} {
  const t = String(text || "");
  RE_ROUTE_LEAK.lastIndex = 0;
  RE_INTERNAL_KEYS.lastIndex = 0;
  RE_INTERNAL_PHRASE_INLINE.lastIndex = 0;
  RE_JSONISH.lastIndex = 0;
  RE_INTERNAL_SURFACE_BUNDLE_IDS.lastIndex = 0;
  const metaSurfaceLeak =
    /(?:^|\n)\s*(?:center|root_reasoning|truth_structure|verdict|次軸|次観測)\s*[:：]/mu.test(t) ||
    /相=[^。,\n，]/u.test(t) ||
    /\bcenter_loss\b/iu.test(t) ||
    RE_INTERNAL_SURFACE_BUNDLE_IDS.test(t);
  const leak =
    RE_ROUTE_LEAK.test(t) ||
    RE_INTERNAL_KEYS.test(t) ||
    RE_INTERNAL_PHRASE_INLINE.test(t) ||
    RE_JSONISH.test(t) ||
    metaSurfaceLeak;
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

  const rootK = input.rootTruthArbitrationKernelV1 ?? null;
  const allowMinimalNextStep = rootK?.displayConstraint?.allow_minimal_next_step !== false;

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
  text = suppressPrefaceDuplicateBeforeSeenmarkV1(text);
  text = stabilizeTenmonSurfaceStyleV1(text);
  if (!s(text)) {
    text = "【天聞の所見】いまの論点を、次の一手だけに落とします。";
  }

  text = applyDiscernmentHintsToSurfaceV1(
    text,
    input.speculativeGuardV1 ?? null,
    input.safeAnswerConstraint ?? null,
    rootK,
  );

  const max = kind === "define_fastpath" ? MAX_DEFINE : kind === "minimal_strip_only" ? 12000 : MAX_GENERAL;
  text = clampTenmonResponseDensityV1(text, max);

  text = allowMinimalNextStep ? synthesizeTenmonOneStepClosingV1(text, kind) : String(text || "").trim();
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
