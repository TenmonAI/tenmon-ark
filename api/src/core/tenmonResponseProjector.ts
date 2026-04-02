/**
 * TENMON_RESPONSE_PROJECTOR_DEEPREAD_BIND_CURSOR_AUTO_V1
 * 出口整形・漏れ止め・ONE_STEP 収束（prompt 全再設計はしない）
 *
 * TENMON_SURFACE_LEAK_CLEANUP_CURSOR_AUTO_V5（共有 strip 層と整合）:
 * center:/root_reasoning:/truth_structure:/verdict:/中心命題:/立脚の中心は…/次軸:/次観測/truth_structure:相=/verdict=center_loss の表層除去、
 * 【天聞の所見】前後行エコー抑制、
 * routeEvidenceTraceV1 等 internal bundle 識別子の除去、reply/text/answer/message 抽出（ku・routeReason は触らない）
 *
 * 不確実性表層フレーズ（V6 guarded/partial/low）は confidenceDisplayLogic／applyConfidencePrefix を優先し、strip で落とさない。
 */

import type { ThreadCore } from "./threadCore.js";
import { stripSurfaceLeakMetaChainsV2 } from "./tenmonSurfaceLeakStripV2.js";
import type { SafeAnswerConstraintV1 } from "./sourceLayerDiscernmentKernel.js";
import type { TruthLayerArbitrationKernelResultV1 } from "./truthLayerArbitrationKernel.js";
import type { UserIntentDeepreadV1 } from "./userIntentDeepreadSchema.js";
import { decideUserIntentClarificationV1 } from "./userIntentClarificationPolicy.js";
import { buildTenmonEmptyAfterStripFallbackProseV1 } from "./tenmonSurfaceEmptyAfterStripFallbackV1.js";

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
  /** TENMON_USER_INTENT_CLARIFICATION_SURFACE: ku.answerMode など */
  answerMode?: string | null;
  /** observe-only deepread（general 主線・条件一致時のみ末尾 1 問） */
  userIntentDeepread?: UserIntentDeepreadV1 | null;
  threadMeaningEssentialGoal?: string | null;
  threadMeaningConstraints?: readonly string[] | null;
  threadMeaningSuccessCriteria?: readonly string[] | null;
  /** strip 後に空になったときのフォールバック（snapshot 復帰なし） */
  stripFallbackKu?: Record<string, unknown> | null;
  stripFallbackRawMessage?: string | null;
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
  /thoughtCoreSummary|notionCanon|sourceStackSummary|semanticSlots|decisionFrame|routeReason\s*[:：]\s*[^\s\n]+|lawsUsed\s*\/\s*evidenceIds|\blawsUsed\b|\bevidenceIds\b|\blawTrace\b|quoteHash|unitId|\blawKey\b|probe_ok|forensic|has_internal_leak|has_ONE_STEP|generic preamble|次の軸\s*[:：]|次に深めたい/ui;

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
function isTenmonInternalMetaSurfaceLineV1(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (/次に深めたい/u.test(t)) return false;
  if (/^(?:center|root_reasoning|truth_structure|verdict|次軸|次観測|次の軸|中心命題)\s*[:：]\s*$/u.test(t)) return true;
  if (/^(?:center|root_reasoning|truth_structure|verdict|次軸|次観測|次の軸|中心命題)\s*[:：]\s*\S/u.test(t)) return true;
  if (/^verdict\s*:\s*\S/u.test(t)) return true;
  if (/^truth_structure\s*[:：]?\s*相\s*=/u.test(t)) return true;
  if (/^verdict\s*=\s*center_loss\b/u.test(t)) return true;
  if (/^verdict\s*=\s*\S/u.test(t)) return true;
  if (/^center\s*[:：]\s*いまの中心一句を固定。?$/u.test(t)) return true;
  if (/^立脚の中心は「[^」\n]*」です。[^\n]*$/u.test(t)) return true;
  if (/^立脚の中心は[^。\n]+$/u.test(t)) return true;
  return false;
}

const MAX_GENERAL = 5600;
const MAX_DEFINE = 7200;

function s(v: unknown): string {
  return String(v ?? "").trim();
}

/**
 * 日本語本文と同一行に連結した root_reasoning / center: / 次軸 等を反復で剥がす（表層のみ・本文空化は最終 fail-open）。
 */
function stripMidParagraphForensicJoinsV1(text: string): string {
  let t = String(text || "");
  let prev = "";
  while (prev !== t) {
    prev = t;
    t = t.replace(/^\s*root_reasoning\s*:\s*[^\n]+\n?/gimu, "");
    t = t.replace(/^\s*truth_structure\s*:\s*[^\n]+\n?/gimu, "");
    t = t.replace(/^\s*verdict\s*=\s*[^\n]+\n?/gimu, "");
    t = t.replace(/^\s*verdict\s*:\s*[^\n]+\n?/gimu, "");
    t = t.replace(/^\s*center\s*[:：]\s*いまの中心一句を固定。?\s*\n?/gimu, "");
    t = t.replace(/^\s*次軸\s*[:：]\s*[^\n]+\n?/gu, "");
    t = t.replace(/^\s*次観測\s*[:：]\s*[^\n]+\n?/gu, "");
    t = t.replace(/^\s*中心命題\s*[:：]\s*\(pri:[^\)]+\)\s*\n?/gu, "");
    t = t.replace(/^\s*立脚の中心は「[^」\n]+」です。\s*/gu, "");
    t = t.replace(/\s+center\s*[:：]\s*いまの中心一句を固定。?\s*/giu, " ");
    t = t.replace(/[。．]\s*center\s*[:：]\s*いまの中心一句を固定。?\s*/gu, "。");
    t = t.replace(/\s+root_reasoning\s*:\s*[^\n]+/giu, "");
    t = t.replace(/\s+truth_structure\s*:\s*[^\n]+/giu, "");
    t = t.replace(/\s+verdict\s*=\s*[^\n]+/giu, "");
    t = t.replace(/\s+verdict\s*:\s*[^\n]+/giu, "");
    t = t.replace(/\s+次軸\s*[:：]\s*[^\n]+/gu, "");
    t = t.replace(/\s+次観測\s*[:：]\s*[^\n]+/gu, "");
    t = t.replace(/\s+中心命題\s*[:：]\s*\(pri:[^\)]+\)\s*/gu, "");
    t = t.replace(/\s+立脚の中心は「[^」\n]+」です。\s*/gu, " ");
    t = t.replace(/[。．]\s*verdict\s*=\s*[^。\n]+/gu, "。");
    t = t.replace(/[。．]\s*truth_structure\s*[:：]\s*[^。\n]+/giu, "。");
    t = t.replace(/[。．]\s*center\s*[:：]\s*いまの中心一句を固定[。]?/giu, "。");
    t = t.replace(/[。．]\s*verdict\s*[:：]\s*[^。\n]+/giu, "。");
    t = t.replace(/root_reasoning\s*[:：]\s*truth_structure\s*[:：][^\n]+/giu, "");
    t = t.replace(/[ \t]{2,}/g, " ");
    t = t.replace(/[ \t]+\n/g, "\n");
  }
  return t.replace(/\n{3,}/g, "\n\n").trim();
}

function stripInternalMetaLinesFailOpenV1(text: string): string {
  const raw = String(text || "");
  const trimmedOrig = raw.trim();
  if (!trimmedOrig) return "";
  let cur = raw;
  let prev = "";
  while (prev !== cur) {
    prev = cur;
    const lines = cur.split("\n");
    const kept = lines.filter((ln) => /次に深めたい/u.test(ln) || !isTenmonInternalMetaSurfaceLineV1(ln));
    cur = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }
  const result = cur;
  if (!result) return raw;
  // V5: メタ行除去を優先し、短文でも漏れ全文を復帰しない
  return result;
}

/** 同一行・段落内に混入した短いメタ断片（日本語本文は食わないよう値は主に内部トークン幅に制限） */
function stripInlineInternalMetaFragmentsV1(text: string): string {
  let out = String(text || "");
  out = out.replace(/root_reasoning\s*[:：]\s*truth_structure\s*[:：][^\n]+/giu, "");
  /** V6: 句読点直後・空白直後に連結した内部メタ（行頭のみ除去の取りこぼし） */
  out = out.replace(/[。．、，]\s*root_reasoning\s*[:：][^\n]+/giu, "。");
  out = out.replace(/[。．、，]\s*truth_structure\s*[:：][^\n]+/giu, "。");
  out = out.replace(/[。．、，]\s*verdict\s*=\s*[^\n]+/giu, "。");
  out = out.replace(/[。．、，]\s*verdict\s*[:：][^\n]+/giu, "。");
  out = out.replace(/[。．、，]\s*次軸\s*[:：][^\n]+/gu, "。");
  out = out.replace(/[。．、，]\s*次観測\s*[:：][^\n]+/gu, "。");
  out = out.replace(/\s+root_reasoning\s*[:：][^\n]+/giu, " ");
  out = out.replace(/\s+truth_structure\s*[:：][^\n]+/giu, " ");
  out = out.replace(/\s+verdict\s*=\s*[^\n]+/giu, " ");
  out = out.replace(/\s+次軸\s*[:：][^\n]+/gu, " ");
  out = out.replace(/\s+次観測\s*[:：][^\n]+/gu, " ");
  out = out.replace(
    /(?:^|\n)\s*(?:center|root_reasoning|truth_structure|verdict|次軸|次観測|中心命題)\s*[:：]\s*[^\n]+/gimu,
    "\n",
  );
  out = out.replace(/(?:^|\n)\s*verdict\s*=\s*[^\n]+/gimu, "\n");
  out = out.replace(/\btruth_structure:相=[^。\n]*/giu, "");
  out = out.replace(/\bverdict=center_loss[^。\n]*/giu, "");
  out = out.replace(
    /\s+(?:center|root_reasoning|truth_structure)\s*[:：]\s*[A-Za-z0-9_=|,.<>/-]{1,200}(?:\s+[A-Za-z0-9_=|,.<>/-]{1,120})*\s*/giu,
    " ",
  );
  out = out.replace(/\s+verdict\s*[:：]\s*[^\n]{0,120}/giu, " ");
  out = out.replace(/\s+中心命題\s*[:：]\s*[^\n]{0,200}/giu, " ");
  out = out.replace(/\s+次軸\s*[:：]\s*[^\n]{0,120}/giu, " ");
  out = out.replace(/\s+次観測\s*[:：]\s*[^\n]{0,120}/giu, " ");
  out = out.replace(/相=[^。,\n，]+/gu, "");
  out = out.replace(/\bcenter_loss\b\s*は内部。[\s\n]*/giu, "");
  out = out.replace(/\bcenter_loss\b/giu, "");
  return out;
}

/** 内部メタに紛れた定型フレーズ（ユーザー表層では不要） */
function stripLeakTemplateProseV1(text: string): string {
  return String(text || "")
    .replace(/いまの読み方は正典と会話の往還[^\n]*/gu, "")
    .replace(/いまの答えは、意味の芯は[^\n]*/gu, "");
}

/** 連続する同一文（正規化一致）を 1 つに畳む（段落境界は維持） */
export function dedupeSequentialSentencesInSurfaceV1(text: string): string {
  const paras = String(text || "").split(/\n\n+/u);
  const outParas = paras.map((para) => {
    const rawChunks = para.split(/(?<=[。！？])/u);
    const kept: string[] = [];
    let prevNorm = "";
    for (const ch of rawChunks) {
      const norm = ch.replace(/\s+/g, " ").trim();
      if (!norm) {
        if (ch) kept.push(ch);
        continue;
      }
      if (norm === prevNorm) continue;
      prevNorm = norm;
      kept.push(ch);
    }
    const joined = kept.join("");
    const lines = joined.split(/\n/);
    const ld: string[] = [];
    let prevLineNorm = "";
    for (const ln of lines) {
      const lnorm = ln.trim().replace(/\s+/g, " ");
      if (!lnorm) {
        ld.push(ln);
        prevLineNorm = "";
        continue;
      }
      if (lnorm === prevLineNorm) continue;
      prevLineNorm = lnorm;
      ld.push(ln);
    }
    return ld.join("\n");
  });
  return outParas.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** 【天聞の所見】ブロック同士で先頭一致が長い場合は重複ブロックを落とす */
function suppressDuplicateSeenmarkParagraphsV1(text: string): string {
  const t = String(text || "");
  const idxs: number[] = [];
  const mark = "【天聞の所見】";
  let p = 0;
  while (p < t.length) {
    const i = t.indexOf(mark, p);
    if (i < 0) break;
    idxs.push(i);
    p = i + mark.length;
  }
  if (idxs.length <= 1) return t;
  const seen = new Set<string>();
  let out = t.slice(0, idxs[0]);
  for (let k = 0; k < idxs.length; k++) {
    const start = idxs[k]!;
    const end = k + 1 < idxs.length ? idxs[k + 1]! : t.length;
    const block = t.slice(start, end);
    const inner = block.slice(mark.length).trim().replace(/\s+/g, " ").slice(0, 200);
    if (inner.length >= 14 && seen.has(inner)) continue;
    if (inner.length >= 14) seen.add(inner);
    out += block;
  }
  const result = out.replace(/\n{3,}/g, "\n\n").trim();
  if (result.length < 32 && t.replace(/\s+/g, " ").trim().length > 120) return t;
  return result;
}

/** closing 直前に付いた内部ヒント行を落とす（ONE_STEP 自然文は後段で付与） */
export function stripTenmonInternalHintTailLinesV1(text: string): string {
  let t = String(text || "").trim();
  const tailPat =
    /(?:\n|^)\s*(?:次軸|次観測|center|root_reasoning|truth_structure|verdict|中心命題)\s*[:：]\s*[^\n]+$/gimu;
  const tailVerdictEq = /(?:\n|^)\s*verdict\s*=\s*[^\n]+$/gimu;
  const tailFoot = /(?:\n|^)\s*立脚の中心は「[^」\n]+」です。\s*$/gimu;
  let prev = "";
  while (prev !== t) {
    prev = t;
    t = t.replace(tailPat, "").replace(tailVerdictEq, "").replace(tailFoot, "").trim();
  }
  return t;
}

/** 内部契約・ルート名・デバッグ語の表層漏洩を剥がす */
export function stripTenmonInternalSurfaceLeakV1(text: string): string {
  const snapshot = String(text ?? "").trim();
  if (!snapshot) return "";
  let out = stripSurfaceLeakMetaChainsV2(snapshot);
  out = stripMidParagraphForensicJoinsV1(out);
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
  let seenDup = "";
  while (seenDup !== out) {
    seenDup = out;
    out = out.replace(/【天聞の所見】\s*\n*\s*【天聞の所見】/gu, "【天聞の所見】\n");
  }
  out = suppressSeenmarkForeAftDuplicateV1(out);
  out = suppressDuplicateSeenmarkParagraphsV1(out);
  out = dedupeSequentialSentencesInSurfaceV1(out);
  out = stripLeakTemplateProseV1(out);
  out = stripSurfaceLeakMetaChainsV2(out.trim());
  out = out.trim();
  if (!out) return "";
  return out;
}

/** 【天聞の所見】直前の行と、直後の先頭行が同一なら後ろ側を落とす（前後エコー抑制） */
function suppressSeenmarkForeAftDuplicateV1(text: string): string {
  const marker = "【天聞の所見】";
  const t = String(text || "");
  const idx = t.indexOf(marker);
  if (idx < 0) return t;
  const before = t.slice(0, idx).trimEnd();
  const afterMarker = t.slice(idx + marker.length);
  const afterTrim = afterMarker.replace(/^\s*\n?/u, "");
  const prevLines = before.split(/\n/).map((x) => x.trim()).filter(Boolean);
  const lastBefore = prevLines.length ? prevLines[prevLines.length - 1]! : "";
  if (!lastBefore || lastBefore.length < 6) return t;
  const firstLineMatch = afterTrim.match(/^([^\n]+)/u);
  const firstAfter = firstLineMatch ? firstLineMatch[1]!.trim() : "";
  if (!firstAfter || firstAfter !== lastBefore) return t;
  const rest = afterTrim.slice(firstLineMatch![0]!.length).replace(/^\s*\n?/u, "");
  const beforeBody =
    prevLines.length > 1 ? prevLines.slice(0, -1).join("\n").trimEnd() : "";
  const rebuilt = beforeBody
    ? `${beforeBody}\n\n${marker}\n${rest}`
    : `${marker}\n${rest}`;
  return rebuilt.replace(/\n{3,}/g, "\n\n").trim();
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
  let t = stripTenmonInternalHintTailLinesV1(String(text || "").trim());
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
    /(?:^|\n)\s*(?:center|root_reasoning|truth_structure|verdict|次軸|次観測|中心命題)\s*[:：]/mu.test(t) ||
    /(?:^|\n)\s*verdict\s*:\s*\S/mu.test(t) ||
    /(?:^|\n)\s*立脚の中心は「/mu.test(t) ||
    /\btruth_structure:相=/iu.test(t) ||
    /\bverdict=center_loss/iu.test(t) ||
    /いまの読み方は正典と会話の往還/u.test(t) ||
    /いまの答えは、意味の芯は/u.test(t) ||
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

  const hintForSpec = String(input.speculativeGuardV1?.safeRephraseHint || "").trim();
  const speculativeClarificationConflict =
    input.speculativeGuardV1?.forbidDefinitiveClaim === true &&
    input.safeAnswerConstraint === "treat_as_speculative_only" &&
    hintForSpec.length > 0;
  const clarDecision = decideUserIntentClarificationV1({
    routeKind: kind,
    routeReason: input.routeReason,
    answerMode: input.answerMode ?? null,
    userIntentDeepread: input.userIntentDeepread ?? null,
    threadEssentialGoal: input.threadMeaningEssentialGoal ?? null,
    threadConstraints: input.threadMeaningConstraints ?? null,
    threadSuccessCriteria: input.threadMeaningSuccessCriteria ?? null,
    proseForRedundancyCheck: text,
    speculativeGuardActive: speculativeClarificationConflict,
  });
  if (clarDecision.shouldAsk && clarDecision.question) {
    let q = String(clarDecision.question).trim();
    if (q && !/[？?]\s*$/u.test(q)) q = `${q}？`;
    text = text.replace(/\n\n次の一手は、いまの見立てから一つに絞って進めます。\s*$/u, "").trim();
    text = `${text}\n\n${q}`.trim();
    text = stripTenmonInternalSurfaceLeakV1(text);
  }

  if (!String(text || "").trim()) {
    text = buildTenmonEmptyAfterStripFallbackProseV1({
      routeReason: String(input.routeReason || ""),
      ku: input.stripFallbackKu ?? null,
      userMessage: input.stripFallbackRawMessage ?? null,
    });
  }

  const probe = probeTenmonResponseProjectionV1(text);
  return {
    schema: "TENMON_RESPONSE_PROJECTOR_V1",
    response: text,
    oneStepSatisfied: probe.has_ONE_STEP,
    safeDisplaySections: null,
    deepreadBindReserved: true,
  };
}
