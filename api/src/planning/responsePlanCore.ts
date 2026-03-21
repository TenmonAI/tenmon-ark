import {
  humanizeCenterKeyForDisplay,
  humanizeSourcePackForSurfaceV1,
} from "../routes/chat_refactor/humanReadableLawLayerV1.js";

export type AnswerLength = "short" | "medium" | "long";
export type AnswerMode = "support" | "define" | "analysis" | "worldview" | "continuity";
export type AnswerFrame =
  | "one_step"
  | "statement_plus_one_question"
  | "d_delta_s_one_step";

export type AnswerProfile = {
  answerLength?: AnswerLength | null;
  answerMode?: AnswerMode | null;
  answerFrame?: AnswerFrame | null;
};

/** FINAL_DENSITY_CONTRACT_AND_GENERAL_SOURCEPACK_V1 */
export type DensityContractV1 = {
  densityTarget: "medium" | "high";
  mustGroundOneLayer: boolean;
  mustCompressToCenterClaim: boolean;
  mustEndWithActionOrAxis: boolean;
};

export type ResponsePlan = {
  routeReason: string;
  centerKey?: string | null;
  centerLabel?: string | null;
  scriptureKey?: string | null;
  mode: "greeting" | "canon" | "general";
  responseKind: "statement" | "statement_plus_question" | "instruction";
  semanticBody: string;
  answerFrame?: AnswerFrame | null;
  /** 密度契約（projector / reducer が参照。任意） */
  densityContract?: DensityContractV1 | null;
};

export function buildResponsePlan(input: {
  routeReason: string;
  rawMessage: string;
  centerKey?: string | null;
  centerLabel?: string | null;
  scriptureKey?: string | null;
  semanticBody: string;
  mode: "greeting" | "canon" | "general";
  answerMode?: AnswerMode | null;
  answerFrame?: AnswerFrame | null;
  responseKind?: "statement" | "statement_plus_question" | "instruction";
}): ResponsePlan {
  return {
    answerFrame: input.answerFrame ?? null,
    routeReason: String(input.routeReason || ""),
    centerKey: input.centerKey ?? null,
    centerLabel: input.centerLabel ?? null,
    scriptureKey: input.scriptureKey ?? null,
    mode: input.mode,
    responseKind: input.responseKind ?? "statement_plus_question",
    semanticBody: String(input.semanticBody || "").trim(),
  };
}

/** MEANING_COMPILER_V1: source → center claim → principle → prose の一本化（観測用 trace） */
export type MeaningCompilerTraceV1 = {
  v: "MEANING_COMPILER_V1";
  centerClaimLine: string;
  principleLine: string;
  reductionLine: string;
  axisOrStepLine: string;
};

function __splitSemanticUnitsV1(sem: string): string[] {
  const t = String(sem || "")
    .replace(/^【天聞の所見】\s*/u, "")
    .trim();
  if (!t) return [];
  const units = t
    .split(/\n{2,}/u)
    .flatMap((p) =>
      p
        .split(/(?<=[。．])\s*/u)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    );
  return units.length ? units : [t];
}

/**
 * semanticBody と表面 response の乖離を縮め、最低 4 層（命題・原理・還元・次軸/一手）を prose に残す。
 * densityContract が無い、または semantic が短い場合は null（不変）。
 */
export function buildMeaningCompilerProseV1(input: {
  semanticBody: string;
  responseSurface: string;
  thoughtCoreSummary: any;
  binderSummary: any;
  sourceStackSummary: any;
  densityContract: DensityContractV1 | null | undefined;
}): { prose: string; trace: MeaningCompilerTraceV1 } | null {
  const dc = input.densityContract;
  if (!dc || !dc.mustCompressToCenterClaim) return null;

  const sem = String(input.semanticBody || "")
    .replace(/^【天聞の所見】\s*/u, "")
    .trim();
  const surf = String(input.responseSurface || "")
    .replace(/^【天聞の所見】\s*/u, "")
    .trim();

  if (sem.length < 36) return null;

  const thinSurface = surf.length < 120;
  const semanticRicher = sem.length >= surf.length + 96;
  if (!thinSurface && !semanticRicher) return null;

  const units = __splitSemanticUnitsV1(sem);
  const tcs = input.thoughtCoreSummary && typeof input.thoughtCoreSummary === "object" ? input.thoughtCoreSummary : null;
  const ss = input.sourceStackSummary && typeof input.sourceStackSummary === "object" ? input.sourceStackSummary : null;
  const bs = input.binderSummary && typeof input.binderSummary === "object" ? input.binderSummary : null;

  let centerClaimLine = units[0]?.slice(0, 280) || sem.slice(0, 160);
  if (centerClaimLine.length < 16 && tcs) {
    centerClaimLine = String(tcs.centerLabel || tcs.centerMeaning || centerClaimLine)
      .trim()
      .slice(0, 280);
  }

  let principleLine =
    units[1]?.slice(0, 280) ||
    String(ss?.thoughtGuideSummary || ss?.primaryMeaning || "").trim().slice(0, 280);
  if (!principleLine) {
    principleLine =
      `生成原理として、routeReason（${String(bs?.routeReason || tcs?.routeReason || "").slice(0, 64)}）と binder の束を本文へ一度だけ還元し、同義反復を増やさない。`.slice(
        0,
        280
      );
  }

  let reductionLine =
    units[2]?.slice(0, 280) ||
    (surf.length >= 24 ? surf : centerClaimLine).slice(0, 280);
  if (reductionLine.length < 24) {
    reductionLine = `還元として、いまの主題を一句に圧し、説明と判断を分けずに一段で言い切る。`.slice(0, 280);
  }

  /** MAINLINE_FINAL_RESPONSE_DENSITY_RESEAL_V1: 問い返し偏重を避け、次軸は断定＋補助（？は増やさない） */
  let axisOrStepLine =
    units[units.length - 1]?.replace(/[？?]\s*$/u, "。").slice(0, 220) ||
    units[Math.max(0, units.length - 2)]?.slice(0, 220) ||
    "次軸は一つに絞り、そこだけを一段深める。";
  axisOrStepLine = axisOrStepLine.replace(/[？?]+\s*$/u, "。").trim();
  if (axisOrStepLine.length < 12) {
    axisOrStepLine = "次に進める軸は一つで足りる。";
  }

  const prose = [centerClaimLine, principleLine, reductionLine, axisOrStepLine].join("\n\n").trim();

  if (prose.length < 80) return null;

  return {
    prose,
    trace: {
      v: "MEANING_COMPILER_V1",
      centerClaimLine,
      principleLine,
      reductionLine,
      axisOrStepLine,
    },
  };
}

// --- MAINLINE_FINAL_RESPONSE_DENSITY_RESEAL_V1 ---

function __stripTenmonSemanticForResealV1(s: string): string {
  return String(s || "")
    .replace(/^【天聞の所見】\s*/u, "")
    .trim();
}

/** 本文の疑問符を上限まで（超過分は句点へ。主張の逃げを減らす） */
export function clampQuestionMarksInProseV1(text: string, maxQuestions: number): string {
  const max = Math.max(0, Math.floor(maxQuestions));
  let n = 0;
  return String(text || "").replace(/[？?]/g, (ch) => {
    n += 1;
    return n <= max ? ch : "。";
  });
}

function __mergeSemanticLeadAsPrimaryThesisV1(semanticStripped: string, surfaceBody: string): string {
  const body = String(surfaceBody || "").trim();
  const sem = String(semanticStripped || "").trim();
  if (sem.length < 24) return body;
  const units = __splitSemanticUnitsV1(sem);
  const leadSem = units.slice(0, 2).join("\n\n").trim();
  if (leadSem.length < 24) return body;
  const overlap = leadSem.slice(0, Math.min(56, leadSem.length));
  if (body.includes(overlap)) return body;
  const headProbe = leadSem.slice(0, 40);
  if (headProbe.length >= 16 && body.startsWith(headProbe)) return body;
  return `${leadSem}\n\n${body}`.trim();
}

function __buildCompressedContextBridgeV1(input: {
  thoughtCoreSummary: any;
  binderSummary: any;
  sourceStackSummary: any;
  sourcePack: string | null | undefined;
  centerKey: string | null | undefined;
  centerLabel: string | null | undefined;
}): string {
  const chunks: string[] = [];
  const tcs = input.thoughtCoreSummary && typeof input.thoughtCoreSummary === "object" ? input.thoughtCoreSummary : null;
  if (tcs) {
    const cm = String((tcs as any).centerLabel || (tcs as any).centerMeaning || "").trim();
    if (cm) chunks.push(cm.slice(0, 120));
  }
  const bs = input.binderSummary && typeof input.binderSummary === "object" ? input.binderSummary : null;
  if (bs) {
    const cl = String((bs as any).centerLabel || "").trim();
    const ck = String((bs as any).centerKey || "").trim();
    const sp = String((bs as any).sourcePack || "").trim();
    if (cl && !chunks.some((c) => c.includes(cl.slice(0, 12)))) chunks.push(cl.slice(0, 90));
    else if (ck && !chunks.some((c) => c.includes(ck.slice(0, 12)))) {
      chunks.push(humanizeCenterKeyForDisplay(ck).slice(0, 80));
    }
    if (sp) chunks.push(humanizeSourcePackForSurfaceV1(sp).slice(0, 90));
  }
  const ss = input.sourceStackSummary && typeof input.sourceStackSummary === "object" ? input.sourceStackSummary : null;
  if (ss) {
    const pm = String((ss as any).primaryMeaning || "").trim();
    if (pm && !chunks.some((c) => c.includes(pm.slice(0, 10)))) chunks.push(pm.slice(0, 100));
  }
  const extSp = String(input.sourcePack ?? "").trim();
  if (extSp) {
    const extH = humanizeSourcePackForSurfaceV1(extSp);
    if (extH && !chunks.some((c) => c.includes(extH.slice(0, 6)))) chunks.push(extH.slice(0, 80));
  }
  const ck2 = String(input.centerKey ?? "").trim();
  if (ck2) {
    const ck2h = humanizeCenterKeyForDisplay(ck2);
    if (ck2h && !chunks.some((c) => c.includes(ck2h.slice(0, 6)))) chunks.push(ck2h.slice(0, 72));
  }
  if (chunks.length === 0) return "";
  return chunks.slice(0, 3).join(" — ").slice(0, 260);
}

function __ensureAssertiveOpeningV1(body: string, semanticStripped: string): string {
  const b = body.trim();
  const fb = semanticStripped.trim();
  if (!fb || b.length < 8) return b;
  const firstBlock = (b.split(/\n\n/u)[0] || b).trim();
  const qn = (firstBlock.match(/[？?]/gu) || []).length;
  const pn = (firstBlock.match(/[。．]/gu) || []).length;
  const looksQuestionOnly = firstBlock.length > 0 && (qn >= 2 || (qn >= 1 && pn === 0 && firstBlock.length < 80));
  if (!looksQuestionOnly && firstBlock.length >= 40) return b;
  const leadSentence = fb
    .split(/[。．\n]/u)
    .map((s) => s.trim())
    .find((s) => s.length >= 12 && !/[？?]$/u.test(s));
  if (!leadSentence) return b;
  const lead = leadSentence.endsWith("。") ? leadSentence : `${leadSentence}。`;
  if (b.startsWith(lead.slice(0, 14))) return b;
  return `${lead}\n\n${b}`.trim();
}

function __anchorAgainstGenericDriftV1(
  routeReason: string,
  body: string,
  centerLabel: string | null | undefined,
  scriptureKey: string | null | undefined
): string {
  const rr = String(routeReason || "");
  const fragile =
    /WILL_CORE|LANGUAGE_ESSENCE|SCRIPTURE_LOCAL|TENMON_SCRIPTURE|DEF_FASTPATH_VERIFIED|TRUTH_GATE_RETURN|iroha_kotodama|katakamuna_kotodama/u.test(
      rr
    );
  if (!fragile) return body;
  const b = body.trim();
  if (b.length > 360) return b;
  const genericOpen = /^(つまり|要するに|一般に|基本的には|通常は|通常|多くの場合|総じて|いろいろありますが)/u.test(
    b
  );
  if (!genericOpen) return b;
  const anchor = [String(centerLabel || "").trim(), String(scriptureKey || "").trim()]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 140);
  if (!anchor) return b;
  const prefix = `この問いでは「${anchor}」に立脚して言い切る。`;
  if (b.includes(prefix.slice(0, 24))) return b;
  return `${prefix}\n\n${b}`.trim();
}

export type ResealFinalMainlineSurfaceInputV1 = {
  routeReason: string;
  semanticBody: string;
  surfaceBody: string;
  thoughtCoreSummary: any;
  binderSummary: any;
  sourceStackSummary: any;
  sourcePack: string | null | undefined;
  centerKey: string | null | undefined;
  centerLabel: string | null | undefined;
  scriptureKey: string | null | undefined;
  /** BEAUTY: 余韻優先だが意味は削らない（疑問符上限だけ緩める） */
  beautyMode: boolean;
};

/**
 * MAINLINE_FINAL_RESPONSE_DENSITY_RESEAL_V1
 * responsePlan.semanticBody を主命題として優先し、内部束を短く圧縮反映。
 * 問い返し偏重を抑え、一度は中心命題を断定で置く。
 */
export function resealFinalMainlineSurfaceV1(input: ResealFinalMainlineSurfaceInputV1): string {
  const sem0 = __stripTenmonSemanticForResealV1(input.semanticBody);
  let body = String(input.surfaceBody || "").trim();

  body = __mergeSemanticLeadAsPrimaryThesisV1(sem0, body);

  const bridge = __buildCompressedContextBridgeV1({
    thoughtCoreSummary: input.thoughtCoreSummary,
    binderSummary: input.binderSummary,
    sourceStackSummary: input.sourceStackSummary,
    sourcePack: input.sourcePack,
    centerKey: input.centerKey,
    centerLabel: input.centerLabel,
  });
  /** beauty は説明臭を増やさないため圧縮束の明示文は付けない（semantic 主命題と clamp のみ） */
  if (bridge && !input.beautyMode) {
    const tag = bridge.slice(0, 28);
    if (!body.includes(tag)) {
      const glue = `一貫の手がかりは、${bridge}。`;
      if (!body.includes(glue.slice(0, 22))) body = `${body}\n\n${glue}`.trim();
    }
  }

  body = __ensureAssertiveOpeningV1(body, sem0);
  body = __anchorAgainstGenericDriftV1(input.routeReason, body, input.centerLabel, input.scriptureKey);

  const maxQ = input.beautyMode ? 2 : 1;
  body = clampQuestionMarksInProseV1(body, maxQ);

  return body.trim();
}

// --- MAINLINE_SURFACE_MEANING_DENSITY_REPAIR_V1 / MAINLINE_ASK_OVERUSE_KILL_V1 ---

/** 先頭段落の空疎な一般論ラッパーを剥がす */
export function stripGenericOpeningLinesV1(text: string): string {
  const t = String(text || "").trim();
  if (!t) return t;
  const paras = t.split(/\n\n+/u).map((p) => p.trim()).filter(Boolean);
  const bad = /^(一般に|基本的には|多くの場合|いろいろありますが|つまり重要なのは|総じて|通常は)/u;
  let i = 0;
  while (i < paras.length && bad.test(paras[i]!.slice(0, 32))) i += 1;
  const rest = paras.slice(i).join("\n\n").trim();
  return rest || t;
}

function __ensureSecondLayerFromSemanticV1(body: string, semanticStripped: string): string {
  const sem = String(semanticStripped || "").trim();
  if (!sem) return body;
  const units = __splitSemanticUnitsV1(sem);
  const paras = body.split(/\n\n+/u).map((p) => p.trim()).filter(Boolean);
  if (paras.length >= 2 || units.length < 2) return body;
  const u2 = units[1]!.trim().slice(0, 340);
  if (!u2 || body.includes(u2.slice(0, Math.min(18, u2.length)))) return body;
  return `${paras[0]}\n\n${u2}${paras.length > 1 ? "\n\n" + paras.slice(1).join("\n\n") : ""}`.trim();
}

/** 中心命題→理由段の薄さを semanticBody 第2ユニットで補強（一般論橋文は strip 済み想定） */
export function applySurfaceMeaningDensityRepairV1(body: string, semanticBody: string): string {
  const sem = __stripTenmonSemanticForResealV1(semanticBody);
  let b = stripGenericOpeningLinesV1(body);
  b = __ensureSecondLayerFromSemanticV1(b, sem);
  return b.trim();
}

/** 「どちらですか」等の同型問いの連打を抑止（2件目以降は句点で断定化） */
export function suppressInterrogativeTemplateSpamV1(text: string): string {
  const re = /(どちらですか|何ですか|どこですか|どれですか|いつですか|誰ですか)([？?])/gu;
  let n = 0;
  return text.replace(re, (_m, phrase: string, q: string) => {
    n += 1;
    if (n <= 1) return `${phrase}${q}`;
    return `${phrase}。`;
  });
}

// --- LONGFORM_DENSITY_PROFILE_V1 ---

/** 段落単位で先頭キーが似た同義反復を落とす（長文帯の水増し抑制） */
export function dedupeLooseParagraphsV1(text: string): string {
  const paras = String(text || "")
    .split(/\n\n+/u)
    .map((p) => p.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of paras) {
    const key = p.replace(/\s+/gu, "").slice(0, 52);
    if (key.length >= 14 && seen.has(key)) continue;
    if (key.length >= 14) seen.add(key);
    out.push(p);
  }
  return out.join("\n\n").trim();
}

/** MAINLINE_LONGFORM_TENMON_ASCENT_V1: 先頭一致を長めに取り、水増し段落を一段厳しめに落とす */
export function dedupeLooseParagraphsStrictV1(text: string): string {
  const paras = String(text || "")
    .split(/\n\n+/u)
    .map((p) => p.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of paras) {
    const key = p.replace(/\s+/gu, "").slice(0, 72);
    if (key.length >= 18 && seen.has(key)) continue;
    if (key.length >= 18) seen.add(key);
    out.push(p);
  }
  return out.join("\n\n").trim();
}

/** 疑問符は末尾側 N 個だけ残し、他は句点へ（質問返しの多重化を抑止） */
export function clampQuestionMarksKeepLastNV1(text: string, keepLast: number): string {
  const k = Math.max(0, Math.floor(keepLast));
  const t = String(text ?? "");
  if (k === 0) return t.replace(/[？?]/g, "。").replace(/。{2,}/g, "。").trim();
  const idxs: number[] = [];
  for (let i = 0; i < t.length; i++) {
    if (t[i] === "？" || t[i] === "?") idxs.push(i);
  }
  if (idxs.length <= k) return t.replace(/\n{3,}/g, "\n\n").trim();
  const keep = new Set(idxs.slice(-k));
  let out = "";
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if ((ch === "？" || ch === "?") && !keep.has(i)) out += "。";
    else out += ch;
  }
  return out.replace(/。{2,}/g, "。").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * LONGFORM_DENSITY_PROFILE_V1 — finalize 出口: 既に reseal 済み本文を長文帯向けに再整形
 * （semantic を薄いときだけ主命題前置・段落重複除去・末尾 N 問まで）
 */
export function applyLongformDensityProfileV1(input: {
  body: string;
  semanticBody: string;
  beautyMode: boolean;
}): string {
  let body = String(input.body || "").trim();
  const sem = __stripTenmonSemanticForResealV1(input.semanticBody);
  /** LONGFORM ascent: やや短い本文でも semantic が厚ければ主命題を前に出す */
  if (body.length < 520 && sem.length >= 72) {
    body = __mergeSemanticLeadAsPrimaryThesisV1(sem, body);
  }
  body = dedupeLooseParagraphsV1(body);
  if (body.length >= 400) {
    body = dedupeLooseParagraphsStrictV1(body);
  }
  if (!input.beautyMode) {
    body = stripGenericOpeningLinesV1(body);
  }
  const keep = input.beautyMode ? 2 : 1;
  body = clampQuestionMarksKeepLastNV1(body, keep);
  return body.trim();
}

/** chat.ts reply 前置き: LLM 長文の広い帯を一度整形 */
export function shapeLongformSurfaceForChatV1(raw: string, maxLen = 2200): string {
  let t = String(raw ?? "").trim();
  if (t.length < 400 || t.length > maxLen) return t;
  t = dedupeLooseParagraphsV1(t);
  t = clampQuestionMarksKeepLastNV1(t, 1);
  return t.replace(/\n{3,}/g, "\n\n").trim();
}

// --- OMEGA_D_DELTAS_RUNTIME_LOCK_V1 ---

/** Ω = D·ΔS を runtime 最上位裁定として常時 object 化（fail-open ではなく fail-shaped） */
export type OmegaContractV1 = {
  v: "OMEGA_D_DELTAS_RUNTIME_LOCK_V1";
  equation: "Omega = D · DeltaS";
  shape: "omega_runtime_lock";
  D: {
    constitutionRefs: readonly string[];
    verifiedCanonLayer: string;
    nonNegotiables: readonly string[];
    willCoreSignal: string | null;
    truthAxis: string | null;
    routeReasonAnchor: string;
    bindingNote: string;
  };
  deltaS: {
    input_delta: string;
    learning_delta: string;
    source_delta: string;
    failure_delta: string;
    recovery_delta: string;
    dialogue_delta: string;
  };
  omega: {
    response_surface: string;
    next_step_line: string;
    next_card_candidate: string;
    auto_heal_hint: string;
    growth_output: string;
  };
  meta: {
    shapedAt: string;
    responsePlanPresent: boolean;
    mode: "shaped" | "non_string_response" | "minimal";
  };
};

export function extractNextStepLineFromSurfaceV1(surface: string): string {
  const t = String(surface || "");
  const aux = t.match(/（補助）[^\n]{4,220}/u);
  if (aux) return aux[0].trim();
  const nx = t.match(/次の一手[^\n]*/u);
  if (nx) return nx[0].trim().slice(0, 400);
  return "";
}

export function buildOmegaContractV1(input: {
  payload: Record<string, unknown>;
  ku: Record<string, any>;
  finalResponse: string;
  nextStepLine: string;
  responsePlan: Record<string, any> | null;
  mode?: OmegaContractV1["meta"]["mode"];
}): OmegaContractV1 {
  const ku = input.ku;
  const rp = input.responsePlan;
  const resp = String(input.finalResponse ?? "").trim();
  const rawMsg = String(
    (input.payload as any)?.rawMessage ?? (input.payload as any)?.message ?? ""
  ).trim();

  let truthAxis: string | null = null;
  try {
    const gs = ku.groundingSelector;
    if (gs && typeof gs === "object") {
      truthAxis = JSON.stringify(gs).slice(0, 220);
    } else if (ku.truthAxis != null) {
      truthAxis = String(ku.truthAxis).slice(0, 220);
    } else if (ku.groundingMode != null) {
      truthAxis = String(ku.groundingMode).slice(0, 220);
    }
  } catch {
    truthAxis = null;
  }

  const rr = String(ku.routeReason ?? "").trim();
  let willCoreSignal: string | null = null;
  if (/WILL_CORE|will_core|WILL_/iu.test(rr) || /will/i.test(String(ku.centerKey ?? ""))) {
    willCoreSignal = "will_core_lane";
  } else if (/LANGUAGE_ESSENCE|言霊|kotodama|KOTODAMA|SCRIPTURE|BEAUTY_COMPILER|正典/u.test(rr)) {
    willCoreSignal = rr.slice(0, 120);
  }

  const binder = ku.binderSummary && typeof ku.binderSummary === "object" ? ku.binderSummary : null;
  const learningParts: string[] = [];
  if (ku.meaningCompilerTrace && typeof ku.meaningCompilerTrace === "object") {
    learningParts.push("meaning_compiler_trace");
  }
  if (ku.priorRuleFeedbackHydrated) learningParts.push("prior_rule_feedback");
  if (ku.kokuzoSeedBridge === true || ku.kokuzoBridge === true) learningParts.push("kokuzo_seed_bridge");
  const learning_delta = learningParts.length > 0 ? learningParts.join("|") : "none";

  const nextCard = String(
    ku.nextCardCandidate ?? "MAINLINE_SURFACE_REHYDRATION_V1"
  ).slice(0, 200);
  const autoHeal = String(
    ku.autoHealHint ?? "observe_density_then_surface_repair"
  ).slice(0, 220);
  const growth = String(
    ku.growthOutput ?? ku.kanagiGrowthHint ?? "evolution_ledger_if_applicable"
  ).slice(0, 220);

  const failDelta = String(ku.failureClass ?? ku.lastFailureKind ?? "none").slice(0, 120);
  const recoveryDelta = String(ku.recoveryHint ?? ku.rollbackHint ?? "none").slice(0, 120);
  const lawsN = Array.isArray(ku.lawsUsed) ? ku.lawsUsed.length : 0;
  const evN = Array.isArray(ku.evidenceIds) ? ku.evidenceIds.length : 0;

  return {
    v: "OMEGA_D_DELTAS_RUNTIME_LOCK_V1",
    equation: "Omega = D · DeltaS",
    shape: "omega_runtime_lock",
    D: {
      constitutionRefs: ["OMEGA_CONTRACT_v1", "PDCA_BUILD_CONTRACT_v1", "KHS_RUNTIME_CONTRACT_v1"] as const,
      verifiedCanonLayer: String(
        (binder as any)?.groundingMode ?? ku.groundingMode ?? "canon_or_context"
      ).slice(0, 140),
      nonNegotiables: ["routeReason_immutable", "khsl_surface_humanize", "omega_contract_always_object"] as const,
      willCoreSignal,
      truthAxis,
      routeReasonAnchor: rr.slice(0, 220),
      bindingNote:
        "D は constitution / verified canon / will_core / truth_axis に固定参照し、ユーザー主観へ置換されない。",
    },
    deltaS: {
      input_delta: rawMsg.slice(0, 480) || "(empty)",
      learning_delta,
      source_delta: String((binder as any)?.sourcePack ?? ku.sourcePack ?? "unset").slice(0, 180),
      failure_delta: failDelta,
      recovery_delta: recoveryDelta,
      dialogue_delta: `answerFrame:${String(ku.answerFrame ?? "one_step").slice(0, 64)};laws:${lawsN};evidence:${evN};explicit:${String(
        ku.explicitLengthRequested ?? ""
      ).slice(0, 12)}`,
    },
    omega: {
      response_surface: resp.slice(0, 1400),
      next_step_line: String(input.nextStepLine || extractNextStepLineFromSurfaceV1(resp)).slice(0, 500),
      next_card_candidate: nextCard,
      auto_heal_hint: autoHeal,
      growth_output: growth,
    },
    meta: {
      shapedAt: new Date().toISOString(),
      responsePlanPresent: rp != null,
      mode: input.mode ?? "shaped",
    },
  };
}
