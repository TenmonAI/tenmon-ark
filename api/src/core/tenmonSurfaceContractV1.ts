/**
 * TENMON_SURFACE_CONTRACT_MIN_DIFF / TENMON_SURFACE_CONTRACT_SECOND_TUNE_CURSOR_AUTO_V1
 * routeReason から表面整形契約を決定し、finalize 最終段で本文へ軽く適用する（routeReason / decisionFrame は不変）。
 */

import { applyBeautifulOutputRefinementV1 } from "./tenmonBeautifulOutputRefinerV1.js";
import { buildKnowledgeSurfaceBridgeHintsV1 } from "./tenmonKnowledgeStyleBridgeV1.js";

export type TenmonSurfaceContractV1 = {
  surfaceContractKey: string;
  shortformShape: "short_define" | "short_analysis" | "continuity";
  mediumShape: "medium_analysis" | "medium_define" | "selfaware";
  longformShape: "longform_tenmon" | "longform_scripture" | "longform_selfaware";
  closingShape: "ask_one_axis" | "soft_next_step" | "no_question";
  minParagraphs: number;
  mustIncludeCenterClaim: boolean;
  mustIncludeNextAxis: boolean;
  allowQuestion: boolean;
  toneProfile: "tenmon_define" | "tenmon_scripture" | "tenmon_selfaware" | "tenmon_concept";
};

function defaultContractV1(): TenmonSurfaceContractV1 {
  return {
    surfaceContractKey: "default_general_v1",
    shortformShape: "short_analysis",
    mediumShape: "medium_analysis",
    longformShape: "longform_tenmon",
    closingShape: "soft_next_step",
    minParagraphs: 1,
    mustIncludeCenterClaim: false,
    mustIncludeNextAxis: false,
    allowQuestion: true,
    toneProfile: "tenmon_define",
  };
}

/**
 * routeReason から表面契約を解決（既存 route 名は変更しない）。
 */
export function resolveTenmonSurfaceContractV1(routeReason: string): TenmonSurfaceContractV1 {
  const rr = String(routeReason || "").trim();
  if (!rr) return defaultContractV1();

  if (/^(K1_TRACE_EMPTY_GATED_V1|SCRIPTURE_LOCAL_RESOLVER_V4|TENMON_SCRIPTURE_CANON_V1|TRUTH_GATE_RETURN_V2)$/u.test(rr)) {
    return {
      surfaceContractKey: "scripture_family_v1",
      shortformShape: "short_analysis",
      mediumShape: "medium_analysis",
      longformShape: "longform_scripture",
      closingShape: "soft_next_step",
      minParagraphs: 1,
      mustIncludeCenterClaim: true,
      /** KNOWLEDGE_TO_STYLE_BRIDGE: 還元 centerClaim + semantic 第2軸を重複検知付きで追補 */
      mustIncludeNextAxis: true,
      allowQuestion: false,
      toneProfile: "tenmon_scripture",
    };
  }

  if (rr === "TENMON_CONCEPT_CANON_V1" || rr === "TENMON_SUBCONCEPT_CANON_V1") {
    return {
      surfaceContractKey: "concept_canon_v1",
      shortformShape: "short_define",
      mediumShape: "medium_define",
      longformShape: "longform_tenmon",
      closingShape: "soft_next_step",
      minParagraphs: 1,
      mustIncludeCenterClaim: true,
      mustIncludeNextAxis: false,
      allowQuestion: false,
      toneProfile: "tenmon_concept",
    };
  }

  if (rr === "AI_CONSCIOUSNESS_LOCK_V1" || rr === "TENMON_CONSCIOUSNESS_LOCK_V1") {
    return {
      surfaceContractKey: "selfaware_lock_v1",
      shortformShape: "short_analysis",
      mediumShape: "selfaware",
      longformShape: "longform_selfaware",
      closingShape: "soft_next_step",
      minParagraphs: 1,
      mustIncludeCenterClaim: true,
      mustIncludeNextAxis: true,
      allowQuestion: true,
      toneProfile: "tenmon_selfaware",
    };
  }

  if (/^R22_SELFAWARE_/u.test(rr)) {
    return {
      surfaceContractKey: "selfaware_family_v1",
      shortformShape: "short_analysis",
      mediumShape: "selfaware",
      longformShape: "longform_selfaware",
      closingShape: "soft_next_step",
      minParagraphs: 1,
      mustIncludeCenterClaim: true,
      mustIncludeNextAxis: true,
      allowQuestion: true,
      toneProfile: "tenmon_selfaware",
    };
  }

  if (rr === "WILL_CORE_PREEMPT_V1") {
    return {
      surfaceContractKey: "will_core_preempt_v1",
      shortformShape: "short_analysis",
      mediumShape: "selfaware",
      longformShape: "longform_selfaware",
      closingShape: "soft_next_step",
      minParagraphs: 1,
      mustIncludeCenterClaim: true,
      mustIncludeNextAxis: true,
      allowQuestion: true,
      toneProfile: "tenmon_selfaware",
    };
  }

  if (rr === "R22_CONSCIOUSNESS_META_ROUTE_V1") {
    return {
      surfaceContractKey: "consciousness_meta_v1",
      shortformShape: "short_analysis",
      mediumShape: "medium_analysis",
      longformShape: "longform_tenmon",
      closingShape: "soft_next_step",
      minParagraphs: 1,
      mustIncludeCenterClaim: false,
      mustIncludeNextAxis: false,
      allowQuestion: true,
      toneProfile: "tenmon_define",
    };
  }

  if (rr === "CONTINUITY_ROUTE_HOLD_V1") {
    return {
      surfaceContractKey: "continuity_hold_v1",
      shortformShape: "continuity",
      mediumShape: "medium_analysis",
      longformShape: "longform_tenmon",
      closingShape: "no_question",
      minParagraphs: 1,
      mustIncludeCenterClaim: false,
      mustIncludeNextAxis: false,
      allowQuestion: false,
      toneProfile: "tenmon_define",
    };
  }

  if (rr === "EXPLICIT_CHAR_PREEMPT_V1") {
    return {
      surfaceContractKey: "explicit_longform_v1",
      shortformShape: "short_analysis",
      mediumShape: "medium_analysis",
      longformShape: "longform_tenmon",
      closingShape: "soft_next_step",
      minParagraphs: 3,
      mustIncludeCenterClaim: true,
      mustIncludeNextAxis: true,
      allowQuestion: false,
      toneProfile: "tenmon_define",
    };
  }

  if (/^GROUNDING_SELECTOR_/u.test(rr)) {
    return {
      surfaceContractKey: "grounding_selector_short_v1",
      shortformShape: "short_define",
      mediumShape: "medium_define",
      longformShape: "longform_tenmon",
      closingShape: "no_question",
      minParagraphs: 1,
      mustIncludeCenterClaim: false,
      mustIncludeNextAxis: false,
      allowQuestion: false,
      toneProfile: "tenmon_define",
    };
  }

  /** 言霊 DEF 短文でも段落を最低 2 に寄せる（finalize の軽整形のみ） */
  if (rr === "DEF_FASTPATH_VERIFIED_V1") {
    return {
      surfaceContractKey: "def_fastpath_verified_v1",
      shortformShape: "short_define",
      mediumShape: "medium_define",
      longformShape: "longform_tenmon",
      closingShape: "soft_next_step",
      minParagraphs: 2,
      mustIncludeCenterClaim: true,
      mustIncludeNextAxis: true,
      allowQuestion: true,
      toneProfile: "tenmon_define",
    };
  }

  /** DEF_*（上記以外）: 定義系が 1 段落に潰れる場合の最小分割 */
  if (/^DEF_/u.test(rr)) {
    return {
      surfaceContractKey: "def_family_v1",
      shortformShape: "short_define",
      mediumShape: "medium_define",
      longformShape: "longform_tenmon",
      closingShape: "soft_next_step",
      minParagraphs: 2,
      mustIncludeCenterClaim: true,
      mustIncludeNextAxis: true,
      allowQuestion: true,
      toneProfile: "tenmon_define",
    };
  }

  if (/^(NATURAL_GENERAL_LLM_TOP|GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1)$/u.test(rr)) {
    return {
      surfaceContractKey: "general_define_v1",
      shortformShape: "short_define",
      mediumShape: "medium_analysis",
      longformShape: "longform_tenmon",
      closingShape: "soft_next_step",
      minParagraphs: 1,
      mustIncludeCenterClaim: true,
      mustIncludeNextAxis: true,
      allowQuestion: true,
      toneProfile: "tenmon_define",
    };
  }

  return defaultContractV1();
}

export function splitParagraphsV1(text: string): string[] {
  return String(text || "")
    .split(/\n\s*\n/u)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function joinParagraphsV1(paras: string[]): string {
  return paras.join("\n\n").trim();
}

function hintOverlapV1(surface: string, hint: string): boolean {
  const h = hint.replace(/\s+/gu, " ").trim();
  if (h.length < 6) return false;
  const head = h.slice(0, 12);
  return surface.includes(head);
}

/**
 * semanticBody から次軸候補行を推論（捏造せず、既存行の抜粋）。
 */
export function inferNextAxisLineV1(args: { semanticBody?: string; centerClaimHint?: string }): string {
  const lines = String(args.semanticBody || "")
    .trim()
    .split(/\n+/u)
    .map((s) => s.trim())
    .filter(Boolean);
  const c = String(args.centerClaimHint || "").trim().slice(0, 40);
  if (lines.length >= 2) {
    if (c && lines[0].includes(c.slice(0, Math.min(6, c.length)))) {
      return lines[1].slice(0, 240);
    }
    return lines[1].slice(0, 240);
  }
  /** 第2段落が無いときは次軸を捏造しない */
  return "";
}

/**
 * 最低段落数（句読点分割で軽く分割、新規文意は足さない）。
 */
export function ensureMinParagraphsV1(rest: string, minParagraphs: number): string {
  let paras = splitParagraphsV1(rest);
  if (paras.length === 0) paras = [String(rest || "").trim()].filter(Boolean);
  const c = Math.max(1, minParagraphs | 0);
  if (c <= 1 || paras.length >= c) return joinParagraphsV1(paras);

  const blob = paras.join("\n\n");
  let sentences = blob
    .split(/(?<=[。！？])/u)
    .map((s) => s.trim())
    .filter(Boolean);
  /** SECOND_TUNE: 句点が少ない定義短文は読点・中点で軽分割（文意は足さない） */
  if (sentences.length < c && blob.length >= 40) {
    const alt = blob
      .split(/(?<=[、，])/u)
      .map((s) => s.trim())
      .filter((s) => s.length >= 12);
    if (alt.length >= c) sentences = alt;
  }
  if (sentences.length >= c) {
    const out: string[] = [];
    for (let i = 0; i < c - 1; i++) out.push(sentences[i]);
    out.push(sentences.slice(c - 1).join(""));
    paras = out.filter((x) => x.length > 0);
  }
  return joinParagraphsV1(paras);
}

/**
 * closingShape / allowQuestion に応じて末尾の質問符を削る。
 */
export function trimQuestionByClosingShapeV1(rest: string, contract: TenmonSurfaceContractV1): string {
  if (contract.allowQuestion && contract.closingShape !== "no_question") return rest;
  /** SECOND_TUNE: continuity hold は行末の余計な ? を全行から落とす（no_question 補強） */
  if (contract.closingShape === "no_question" && contract.shortformShape === "continuity") {
    return String(rest || "")
      .split("\n")
      .map((ln) => ln.replace(/[?？]+$/gu, "").trimEnd())
      .join("\n")
      .trim();
  }
  const lines = rest.split("\n");
  if (lines.length === 0) return rest;
  const li = lines.length - 1;
  lines[li] = lines[li].replace(/[?？]+$/gu, "").trim();
  return lines.join("\n").trim();
}

/**
 * centerClaimHint が表面に現れないときだけ先頭に一行追加。
 */
export function ensureCenterClaimV1(rest: string, contract: TenmonSurfaceContractV1, centerClaimHint?: string): string {
  const center = String(centerClaimHint || "").replace(/\s+/gu, " ").trim();
  if (!contract.mustIncludeCenterClaim || center.length < 6) return rest;
  if (hintOverlapV1(rest, center)) return rest;
  const line = center.endsWith("。") || center.endsWith("！") || center.endsWith("？") ? center : `${center}。`;
  return `${line}\n\n${rest}`.trim();
}

/**
 * 次軸 hint を末尾に追加（契約 mustIncludeNextAxis かつ重複しない場合）。
 */
function ensureNextAxisV1(rest: string, contract: TenmonSurfaceContractV1, centerClaimHint: string, nextAxisHint?: string): string {
  const center = String(centerClaimHint || "").replace(/\s+/gu, " ").trim();
  const nextA = String(nextAxisHint || "").replace(/\s+/gu, " ").trim();
  if (!contract.mustIncludeNextAxis || nextA.length < 8) return rest;
  if (nextA === center || hintOverlapV1(rest, nextA)) return rest;
  const head = nextA.slice(0, Math.min(40, nextA.length));
  if (head.length >= 8 && rest.includes(head)) return rest;
  const line = nextA.endsWith("。") || nextA.endsWith("！") || nextA.endsWith("？") ? nextA : `${nextA}。`;
  return `${rest}\n\n${line}`.trim();
}

function applyAskOneAxisClosingV1(rest: string, contract: TenmonSurfaceContractV1): string {
  if (contract.closingShape !== "ask_one_axis" || !contract.allowQuestion) return rest;
  const last = rest.split("\n").pop() || "";
  if (last.length > 0 && !/[？?]$/u.test(last.trim())) {
    return `${rest}\n\n次にどの軸を一段だけ詰めますか？`.trim();
  }
  return rest;
}

export type ApplyTenmonSurfaceContractV1Args = {
  surface: string;
  contract: TenmonSurfaceContractV1;
  centerClaimHint?: string;
  nextAxisHint?: string;
};

/**
 * 契約に沿って表面文字列を軽く整形（意味の新規捏造はしない。hint は既存 ku / semantic から渡す）。
 */
export function applyTenmonSurfaceContractV1(args: ApplyTenmonSurfaceContractV1Args): string {
  let t = String(args.surface || "").trim();
  const c = args.contract;
  if (!t) return t;

  let head = "";
  let rest = t;
  const headMatch = /^(【[^】]+】\s*\n*)/u.exec(t);
  if (headMatch) {
    head = headMatch[1].trimEnd();
    rest = t.slice(headMatch[0].length).trim();
  }

  let paras = splitParagraphsV1(rest);
  if (paras.length === 0) paras = [rest];
  rest = joinParagraphsV1(paras);
  rest = ensureMinParagraphsV1(rest, c.minParagraphs);

  const center = String(args.centerClaimHint || "").replace(/\s+/gu, " ").trim();
  rest = ensureCenterClaimV1(rest, c, center || undefined);
  rest = ensureNextAxisV1(rest, c, center, args.nextAxisHint);
  rest = trimQuestionByClosingShapeV1(rest, c);
  rest = applyAskOneAxisClosingV1(rest, c);

  t = head ? `${head}\n\n${rest}`.trim() : rest;
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  return applyBeautifulOutputRefinementV1({ surface: t, contract: c });
}

/** @deprecated 同名の統合 API へ集約 */
export function applyTenmonSurfaceContractV1ToSurface(args: ApplyTenmonSurfaceContractV1Args): string {
  return applyTenmonSurfaceContractV1(args);
}

/**
 * finalize から 1 回だけ呼ぶ：resolve（未設定時）＋ ku に surfaceContractKey / surfaceContractV1 非破壊付与＋ apply。
 * routeReason / decisionFrame / lawsUsed / evidenceIds は変更しない。
 */
export function finalizeApplyTenmonSurfaceContractV1(args: {
  surface: string;
  routeReason: string;
  ku: Record<string, unknown>;
  responsePlan: { semanticBody?: string } | null | undefined;
}): string {
  const rr = String(args.routeReason || "").trim();
  const sc =
    (args.ku.surfaceContractV1 as TenmonSurfaceContractV1 | undefined) ?? resolveTenmonSurfaceContractV1(rr);
  if (!args.ku.surfaceContractV1) args.ku.surfaceContractV1 = sc;
  if (!args.ku.surfaceContractKey) args.ku.surfaceContractKey = sc.surfaceContractKey;
  const kuAny = args.ku as {
    centerMeaning?: unknown;
    centerLabel?: unknown;
    centerKey?: unknown;
    sourceStackSummary?: { primaryMeaning?: unknown };
  };
  const cm0 = String(kuAny?.centerMeaning ?? "").trim();
  const pm0 = String(kuAny?.sourceStackSummary?.primaryMeaning ?? "").trim();
  const cl0 = String(kuAny?.centerLabel || kuAny?.centerKey || "").trim();
  const legacyCenter = (cm0 || pm0 || cl0).slice(0, 240);
  const semBody = String(args.responsePlan?.semanticBody || "").trim();
  const bridge = buildKnowledgeSurfaceBridgeHintsV1(args.ku, rr, semBody);
  const centerClaimHint =
    bridge.centerClaimHint.length >= 6 ? bridge.centerClaimHint : legacyCenter;
  let nextAxisHint = bridge.nextAxisHint;
  if (!nextAxisHint || nextAxisHint.length < 8) {
    const nextAxisLine = inferNextAxisLineV1({
      semanticBody: semBody,
      centerClaimHint: centerClaimHint || undefined,
    }).slice(0, 240);
    nextAxisHint =
      nextAxisLine && nextAxisLine !== centerClaimHint.slice(0, 240) ? nextAxisLine : undefined;
  }
  return applyTenmonSurfaceContractV1({
    surface: args.surface,
    contract: sc,
    centerClaimHint: centerClaimHint || undefined,
    nextAxisHint,
  });
}
