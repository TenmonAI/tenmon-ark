/**
 * CHAT_TRUNK_CONTINUITY_SPLIT_V1 — next-step / essence / compare / continuity anchor preempts
 * extracted from chat.ts NATURAL general spine. Returns gate payload for __tenmonGeneralGateResultMaybe.
 * TENMON_CHAT_CONTINUITY_ROUTE_HOLD_CURSOR_AUTO_V1: follow-up hold で NATURAL_GENERAL_LLM_TOP 直落ちを抑止
 */
import type { ThreadCore } from "../../core/threadCore.js";
import { attachUserIntentDeepreadObserveOnlyToKuV1 } from "../../core/userIntentDeepread.js";
import { dedupeNextStepAndQuestionSurfaceV1 } from "../../core/tenmonConversationSurfaceV1.js";
import { compressAdjacentDuplicateLinesV1, formatStage2ConversationCarryBlockV1 } from "../../core/threadCoreLinkSurfaceV1.js";

export type ContinuityTrunkContextV1 = {
  t0: string;
  message: unknown;
  threadId: string;
  timestamp: string;
  threadCore: ThreadCore;
  threadCenterForGeneral: { center_type: string; center_key: string; source_route_reason?: string } | null;
  isContinuityAnchor: boolean;
  /** RE_THREAD_FOLLOWUP 系: hold 文脈があるときのみ general へ直落ちしない */
  isThreadFollowupGeneral?: boolean;
  isFeelingRequest: boolean;
  centerLabelFromKey: (k: string | null) => string | null | undefined;
  getCenterLabelForDisplay: (centerKey: string) => string;
  buildResponsePlan: (...args: any[]) => any;
  buildKnowledgeBinder: (...args: any[]) => any;
  applyKnowledgeBinderToKu: (ku: any, b: any, threadMeaningOpts?: any) => void;
  saveThreadCore: (c: ThreadCore) => Promise<void>;
  setResThreadCoreMirror: (c: ThreadCore) => void;
  memoryReadSession: (tid: string, n: number) => any[];
  getLastTwoKotodamaSoundsFromHistory: (h: any[]) => [string, string] | null;
  buildKotodamaCompareResponse: (a: string, b: string) => string | null;
};

/** 「前の返答」「さっきの」「続けて」「要点を一つだけ継続」「今の返答を受けて」等 — 継続系 follow-up を hold 対象に */
const RE_ROUTE_HOLD_FOLLOWUP =
  /前の返答を受けて|今の返答を受けて|前の返答|今の返答|さっきの|先ほどの|直前の|その返答|前回の|続けて[,、]?|要点を一つ|要点を.{0,16}だけ継続|要点を.{0,12}継続|その続きを|その続き|もう一つだけ|一点だけ|もう一段|あと一言|継続して|継続|引き続き|話の続き|さっきの話|その話の続き|今の話を続け|その流れで|前の話/u;

function __sanitizeContinuityCarryTextV1(text: string): string {
  return String(text || "")
    .replace(/【前回の芯】[^\n]*/gu, "")
    .replace(/【いまの差分】[^\n]*/gu, "")
    .replace(/【次の一手】[^\n]*/gu, "")
    .replace(/（次の一手の記録）[^\n]*/gu, "")
    .replace(/priorRouteReasonEcho\s*[:：][^\n]*/giu, "")
    .replace(/priorRouteReasonCarry\s*[:：][^\n]*/giu, "")
    .replace(/\bkeep_center_one_step\b/giu, "")
    .replace(/\bask_one_axis\b/giu, "")
    .replace(/\b[A-Z][A-Z0-9_]{4,}_V1\b/gu, "")
    .replace(/この中心を中心に、直前の論点を一段だけ継ぎます。?[^\n]*/gu, "")
    .replace(/言霊の線のまま、直前の論点を一段だけ継ぎます。?[^\n]*/gu, "")
    .replace(/次の一手として、[^\n。]{0,120}(?:ください|ましょう)。?/gu, "")
    .replace(/\s{2,}/gu, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function __nextHandFromThreadCore(tc: ThreadCore) {
  const dc = tc.dialogueContract;
  return {
    next_best_move: dc?.next_best_move != null ? String(dc.next_best_move).trim().slice(0, 500) || null : null,
    continuity_goal: dc?.continuity_goal != null ? String(dc.continuity_goal).trim().slice(0, 500) || null : null,
    user_intent_mode: dc?.user_intent_mode != null ? String(dc.user_intent_mode).trim().slice(0, 240) || null : null,
  };
}

function __resolvePriorRouteReasonForHold(ctx: ContinuityTrunkContextV1): string | null {
  const lrc = ctx.threadCore.lastResponseContract?.routeReason;
  if (lrc != null && String(lrc).trim()) return String(lrc).trim();
  const sr = ctx.threadCenterForGeneral?.source_route_reason;
  if (sr != null && String(sr).trim()) return String(sr).trim();
  return null;
}

function __resolveSemanticCarryForHold(ctx: ContinuityTrunkContextV1): {
  source: string;
  text: string | null;
  centerKey: string | null;
  centerLabel: string | null;
  centerClaim: string | null;
} {
  const tc = ctx.threadCore as any;
  const centerKey = String(tc?.centerKey ?? ctx.threadCenterForGeneral?.center_key ?? "").trim() || null;
  const centerLabel =
    (String(tc?.centerLabel ?? "").trim() ||
      String(ctx.centerLabelFromKey(tc?.centerKey ?? null) ?? "").trim() ||
      (centerKey ? String(ctx.getCenterLabelForDisplay(centerKey) || "").trim() : "")) ||
    null;
  const centerClaim = String(tc?.centerClaim ?? "").trim() || null;
  const priorAnswerEssence = String(tc?.priorAnswerEssence ?? "").trim() || null;
  const semanticNucleus = String(tc?.semanticNucleus ?? "").trim() || null;
  const nextFocus = String(tc?.nextFocus ?? "").trim() || null;
  const unresolvedPoint =
    (Array.isArray(tc?.openLoops) ? String(tc.openLoops[0] ?? "").trim() : "") || null;
  const tcsPrimaryMeaning = String(tc?.thoughtCoreSummary?.primaryMeaning ?? "").trim() || null;
  const rr = __resolvePriorRouteReasonForHold(ctx);
  const rrS = String(rr || "");
  const rrCenterGuess =
    rrS === "K1_TRACE_EMPTY_GATED_V1"
      ? { key: "hokekyo", label: "法華経", claim: "法華経の核心" }
      : rrS.startsWith("TECHNICAL_IMPLEMENTATION_")
        ? { key: "technical_implementation", label: "技術実装", claim: "実装要点" }
        : null;
  let histCenterGuess: { key: string; label: string; claim: string } | null = null;
  try {
    const hist = ctx.memoryReadSession(String(ctx.threadId || ""), 6) || [];
    const blob = String(
      hist
        .map((x: any) => `${String(x?.role ?? "")}:${String(x?.content ?? "")}`)
        .join("\n"),
    );
    if (/法華経/u.test(blob)) histCenterGuess = { key: "hokekyo", label: "法華経", claim: "法華経の核心" };
    else if (/singleton|typescript|node\.?js|react|sqlite/i.test(blob))
      histCenterGuess = { key: "technical_implementation", label: "技術実装", claim: "実装要点" };
  } catch {
    /* ignore */
  }
  if (priorAnswerEssence) return { source: "priorAnswerEssence", text: priorAnswerEssence, centerKey, centerLabel, centerClaim };
  if (centerClaim) return { source: "centerClaim", text: centerClaim, centerKey, centerLabel, centerClaim };
  if (semanticNucleus) return { source: "semanticNucleus", text: semanticNucleus, centerKey, centerLabel, centerClaim };
  if (centerLabel || centerKey) {
    const text =
      centerLabel && String(centerLabel).trim()
        ? `${String(centerLabel).trim()}の要点`
        : centerKey
          ? `${ctx.getCenterLabelForDisplay(String(centerKey))}の要点`
          : null;
    if (text) return { source: "threadCore.centerLabel|centerKey", text, centerKey, centerLabel, centerClaim };
  }
  if (nextFocus) return { source: "nextFocus", text: nextFocus, centerKey, centerLabel, centerClaim };
  if (rrCenterGuess)
    return {
      source: "priorRouteReason(center_guess)",
      text: rrCenterGuess.claim,
      centerKey: rrCenterGuess.key,
      centerLabel: rrCenterGuess.label,
      centerClaim: rrCenterGuess.claim,
    };
  if (histCenterGuess)
    return {
      source: "history(center_guess)",
      text: histCenterGuess.claim,
      centerKey: histCenterGuess.key,
      centerLabel: histCenterGuess.label,
      centerClaim: histCenterGuess.claim,
    };
  if (tcsPrimaryMeaning) return { source: "thoughtCoreSummary.primaryMeaning", text: tcsPrimaryMeaning, centerKey, centerLabel, centerClaim };
  if (unresolvedPoint) return { source: "unresolvedPoint", text: unresolvedPoint, centerKey, centerLabel, centerClaim };
  return { source: "safe_fallback", text: centerLabel || centerKey || "前の話の中心", centerKey, centerLabel, centerClaim };
}

/** CONTINUITY_ROUTE_HOLD_V1: 前返答の要点を一段具体化した自然文 2〜3 文（route メタは出さない） */
function __buildContinuityRouteHoldDenseBodyV1(
  ctx: ContinuityTrunkContextV1,
  carry: ReturnType<typeof __resolveSemanticCarryForHold>,
  displayLabel: string,
  isKotodama: boolean,
): string {
  const tc = ctx.threadCore as Record<string, unknown>;
  const pick = (k: string) => __sanitizeContinuityCarryTextV1(String(tc[k] ?? "").trim());

  const priorAnswerEssence = pick("priorAnswerEssence");
  const centerClaim = pick("centerClaim");
  const semanticNucleus = pick("semanticNucleus");
  const nextFocus = pick("nextFocus");
  const ck = String(ctx.threadCenterForGeneral?.center_key || ctx.threadCore.centerKey || "").trim();
  const nucleusFromCarry = __sanitizeContinuityCarryTextV1(String(carry.text || ""));

  let primary = "";
  let primaryFromNextFocus = false;
  if (priorAnswerEssence.length >= 6) primary = priorAnswerEssence.slice(0, 220);
  else if (centerClaim.length >= 4) primary = centerClaim.slice(0, 220);
  else if (semanticNucleus.length >= 4) primary = semanticNucleus.slice(0, 220);
  else if (displayLabel && displayLabel !== "この中心")
    primary = `${displayLabel}の要点は、前段で示した立脚を保ったまま、読みを一段だけ具体化することです`;
  else if (ck)
    primary = `${ctx.getCenterLabelForDisplay(ck)}の要点を、前の返答の筋を崩さずに一段だけ継ぎます`;
  else if (nextFocus.length >= 6) {
    primary = `前段の芯を保ったまま、${nextFocus.slice(0, 130)}を一段だけ手前に置くと、論点がぶれにくいです`;
    primaryFromNextFocus = true;
  } else if (nucleusFromCarry.length >= 4 && !/^前の話の中心/u.test(nucleusFromCarry))
    primary = nucleusFromCarry.slice(0, 220);
  else if (isKotodama)
    primary =
      "言霊の要点は、音を単なる記号でなく生成の法則として読む点にあります。前段の芯を保ったまま次へ進めるなら、読みの軸を一つに絞るのが安全です";
  else primary = "前の返答の要点を、中心を一つに保ったまま一段だけ具体化します";

  primary = primary
    .replace(/さきほどの核を崩さず、次の一段へつなげます。?/gu, "")
    .replace(/次の一段へつなげます/gu, "")
    .trim();
  if (primary && !/[。！？]$/u.test(primary)) primary += "。";

  const secondary =
    nextFocus.length >= 4 && !primaryFromNextFocus
      ? `次に詰めるなら、${nextFocus.slice(0, 130)}を手前に置くと、会話の芯が切れにくいです。`
      : isKotodama
        ? "前段を継ぐなら、次は音の秩序を見るか、水火との関係を見るかのどちらかに絞ると流れが崩れません。"
        : displayLabel && displayLabel !== "この中心"
          ? `前段を継ぐなら、${displayLabel}の中で「法則を読む」か「背景を読む」か、どちらか一方に絞ると読みが締まります。`
          : "前段を継ぐなら、いま見る軸を一つに決めてから掘り下げると、継続の筋が切れにくいです。";

  let body = `${primary}${secondary}`.replace(/\s+/g, " ").replace(/。{2,}/g, "。").trim();

  if (body.length < 80) {
    const pad =
      "要点を一段だけ具体化し、読みの芯を保ったまま次の論点へ接続します。";
    body = `${primary} ${pad}`.replace(/\s+/g, " ").replace(/。{2,}/g, "。").trim();
  }

  const sentenceCount = body.split(/(?<=[。！？])/u).filter((s) => s.trim().length > 0).length;
  if (sentenceCount < 3 && body.length < 160) {
    body = `${body}次の一歩だけ先に決めれば、前段との接続が見えやすくなります。`.replace(/。{2,}/g, "。").trim();
  }

  body = compressAdjacentDuplicateLinesV1(body);
  body = dedupeNextStepAndQuestionSurfaceV1(body);
  if (body.length < 120) {
    const pad120 =
      "前段の立脚を保ちつつ、次に詰める論点を一つに絞ると会話の芯が切れにくくなります。";
    if (!body.includes(pad120.slice(0, 12))) {
      body = `${body}${body && !/[。！？]$/u.test(body) ? "。" : ""}${pad120}`.replace(/。{2,}/g, "。").trim();
    }
  }
  if (body.length < 80) {
    const core =
      priorAnswerEssence ||
      centerClaim ||
      semanticNucleus ||
      (nucleusFromCarry && !/^前の話の中心/u.test(nucleusFromCarry) ? nucleusFromCarry : "");
    const c1 = core
      ? `${core.slice(0, 120)}。`
      : `${displayLabel && displayLabel !== "この中心" ? displayLabel : "前段の要点"}を保ったまま、論点を一段だけ具体化します。`;
    const c2 =
      nextFocus.length >= 4
        ? `次に詰めるなら、${nextFocus.slice(0, 120)}を先に固定すると、話の軸がぶれません。`
        : "次に進めるときは、見る軸を一つだけ選んで深めると、継続の筋が保てます。";
    const c3 = "ここまでの前提を崩さずに接続するため、先に軸を決めてから一段だけ掘り下げます。";
    body = `${c1}${c2}${c3}`.replace(/\s+/g, " ").replace(/。{2,}/g, "。").trim();
  }
  return body;
}

/** 2ターン目以降相当: prior 契約・中心・次の一手のいずれかがあれば hold 文脈あり */
function __hasHoldContext(ctx: ContinuityTrunkContextV1): boolean {
  const tc = ctx.threadCore;
  const dc = tc.dialogueContract;
  /** TENMON_FINAL_COMPLETION_PHASE1_CONVERSATION_AND_SURFACE: continuity_goal 明示時は hold 必須扱い */
  if (dc && String(dc.continuity_goal || "").trim().length > 0) return true;
  const nh = __nextHandFromThreadCore(tc);
  if (nh.next_best_move || nh.continuity_goal) return true;
  if (tc.lastResponseContract && (tc.lastResponseContract.routeReason || tc.lastResponseContract.answerMode)) return true;
  if (ctx.threadCenterForGeneral?.source_route_reason) return true;
  if (tc.dialogueContract && (tc.dialogueContract.centerKey || tc.dialogueContract.centerLabel)) return true;
  if (tc.centerKey || tc.centerLabel) return true;
  const nxf = tc.nextFocus != null && String(tc.nextFocus).trim().length > 0;
  const pva = tc.previousAnchor != null && String(tc.previousAnchor).trim().length > 0;
  if (nxf || pva) return true;
  try {
    const pol = (tc.dialogueContract as { followupPolicy?: string } | null)?.followupPolicy;
    if (pol != null && String(pol).trim().length > 0) return true;
  } catch {
    /* ignore */
  }
  /** prior が explicit / define / R22 系なら dialogue が薄くても hold 文脈あり */
  const pr = __resolvePriorRouteReasonForHold(ctx);
  if (
    pr &&
    /^(EXPLICIT_CHAR_PREEMPT_V1|DEF_|SOUL_|R22_|KANAGI_|CONTINUITY_|TENMON_SCRIPTURE|TENMON_SUBCONCEPT|SYSTEM_DIAG|WORLDVIEW_|IMPRESSION_|FEELING_|GENERAL_KNOWLEDGE_EXPLAIN_)/i.test(
      pr,
    )
  )
    return true;
  return false;
}

/**
 * prior route / threadCore / threadCenter / nextHand を bind し、NATURAL_GENERAL への直落ちを避ける中間 route
 */
export async function tryContinuityRouteHoldPreemptGatePayloadV1(
  ctx: ContinuityTrunkContextV1,
): Promise<Record<string, unknown> | null> {
  const t0 = String(ctx.t0 || "").trim();
  if (!String(ctx.threadId || "").trim()) return null;
  /** chat.ts の __isContinuityAnchor / RE_THREAD_FOLLOWUP レーン（hold 文脈必須） */
  const __laneFollowup = Boolean(ctx.isThreadFollowupGeneral);
  if (!RE_ROUTE_HOLD_FOLLOWUP.test(t0) && !ctx.isContinuityAnchor && !__laneFollowup) return null;
  if (!__hasHoldContext(ctx)) return null;

  const priorRr = __resolvePriorRouteReasonForHold(ctx);
  const nhGate = __nextHandFromThreadCore(ctx.threadCore);
  if (
    !priorRr &&
    !ctx.threadCore.centerKey &&
    !ctx.threadCore.centerLabel &&
    !(nhGate.next_best_move || nhGate.continuity_goal)
  )
    return null;

  const priorRrEcho = priorRr || "prior_thread_carry";
  const carry = __resolveSemanticCarryForHold(ctx);
  const ck = String(ctx.threadCenterForGeneral?.center_key || ctx.threadCore.centerKey || "").trim();
  const isKotodama = ck === "kotodama" || /言霊/u.test(t0);
  const __displayLabel =
    ctx.threadCore.centerLabel ||
    ctx.centerLabelFromKey(ctx.threadCore.centerKey) ||
    (ck ? ctx.getCenterLabelForDisplay(ck) : "") ||
    "この中心";

  /** 80〜160字目安: 核（priorAnswerEssence → centerClaim → semanticNucleus → center → nextFocus）から 2〜3 文。22字固定文は使わない */
  const __body = __buildContinuityRouteHoldDenseBodyV1(ctx, carry, __displayLabel, isKotodama);

  const priorMode = ctx.threadCore.lastResponseContract?.answerMode ?? "analysis";
  const priorFrame = ctx.threadCore.lastResponseContract?.answerFrame ?? "one_step";
  const priorLen = ctx.threadCore.lastResponseContract?.answerLength ?? "short";

  const __coreHold: ThreadCore = {
    ...ctx.threadCore,
    centerKey: carry.centerKey,
    centerLabel: carry.centerLabel,
    centerClaim: carry.centerClaim || carry.text || null,
    priorAnswerEssence: carry.text || null,
    semanticNucleus: carry.text || carry.centerClaim || null,
    previousAnchor: carry.text || carry.centerLabel || carry.centerKey || null,
    lastResponseContract: {
      answerLength: priorLen,
      answerMode: priorMode,
      answerFrame: priorFrame,
      routeReason: "CONTINUITY_ROUTE_HOLD_V1",
    },
    updatedAt: new Date().toISOString(),
  };
  ctx.saveThreadCore(__coreHold).catch(() => {});
  try {
    ctx.setResThreadCoreMirror(__coreHold);
  } catch {
    /* ignore */
  }

  const __kuHold: any = {
    routeReason: "CONTINUITY_ROUTE_HOLD_V1",
    routeClass: "continuity",
    answerLength: priorLen,
    answerMode: "continuity",
    answerFrame: priorFrame,
    priorRouteReasonEcho: priorRrEcho,
    priorRouteReasonCarry: priorRr,
    threadCenterKey: carry.centerKey ?? ctx.threadCenterForGeneral?.center_key ?? null,
    threadCenterLabel:
      carry.centerLabel ?? ctx.centerLabelFromKey(ctx.threadCore.centerKey) ?? null,
    centerKey: carry.centerKey,
    centerLabel: carry.centerLabel,
    centerClaim: carry.centerClaim || carry.text || null,
    priorAnswerEssence: carry.text || null,
    semanticNucleus: carry.text || carry.centerClaim || null,
    lastAnswerLength: ctx.threadCore.lastResponseContract?.answerLength ?? undefined,
    lastAnswerMode: ctx.threadCore.lastResponseContract?.answerMode ?? undefined,
    lastAnswerFrame: ctx.threadCore.lastResponseContract?.answerFrame ?? undefined,
    lawsUsed: [],
    evidenceIds: [],
    lawTrace: [],
  };
  try {
    attachUserIntentDeepreadObserveOnlyToKuV1(__kuHold as Record<string, unknown>, String(ctx.message ?? ""));
  } catch {
    /* ignore */
  }
  try {
    const __binderH = ctx.buildKnowledgeBinder({
      routeReason: "CONTINUITY_ROUTE_HOLD_V1",
      message: String(ctx.message ?? ""),
      threadId: String(ctx.threadId ?? ""),
      ku: __kuHold,
      threadCore: ctx.threadCore,
      threadCenter: ctx.threadCenterForGeneral ?? null,
    });
    ctx.applyKnowledgeBinderToKu(__kuHold, __binderH, {
      threadCore: ctx.threadCore ?? null,
      rawMessage: String(ctx.message ?? ""),
      threadId: String(ctx.threadId ?? ""),
    });
  } catch {
    /* ignore */
  }
  /** binder が付けた responsePlan.semanticBody 短文で finalize / trace が本文と乖離しないよう同期 */
  try {
    if (__kuHold.responsePlan && typeof __kuHold.responsePlan === "object") {
      (__kuHold.responsePlan as { semanticBody?: string }).semanticBody = __body;
    }
  } catch {
    /* ignore */
  }

  return {
    response: __body,
    evidence: null,
    candidates: [],
    timestamp: ctx.timestamp,
    threadId: ctx.threadId,
    decisionFrame: {
      mode: "NATURAL",
      intent: "chat",
      llm: null,
      ku: __kuHold,
    },
  };
}

export async function tryContinuityTrunkPreemptGatePayloadV1(
  ctx: ContinuityTrunkContextV1,
): Promise<Record<string, unknown> | null> {
  const t0 = ctx.t0;
  const __t0TrimNext = String(t0).trim();
  const __isNextStepShort =
    /^(次は|次の一手は|次の一歩は|では次は)[？?]?$/u.test(__t0TrimNext) ||
    (__t0TrimNext.length <= 16 && /次(は|の一手|の一歩)/u.test(__t0TrimNext));

  if ((ctx.threadCore.centerLabel || ctx.threadCore.centerKey) && __isNextStepShort) {
    const __centerLabelNext =
      ctx.threadCore.centerLabel || ctx.centerLabelFromKey(ctx.threadCore.centerKey) || "この中心";
    const __coreNextPlain =
      ctx.threadCore.centerLabel || ctx.threadCore.centerKey
        ? __centerLabelNext + "で進めるなら、法則と背景を分けて見ると進みやすいです。"
        : "いまの中心を一つ保ったまま、見る角度を一つ決めると進みやすいです。";
    const __bodyNext = formatStage2ConversationCarryBlockV1({
      threadCore: ctx.threadCore,
      rawMessage: String(ctx.message ?? ""),
      semanticCore: __coreNextPlain,
      nextStepLine: "次の一手として、法則を読むか背景を読むか、どちらか一方だけ選んでください。",
    });
    const __coreNext: ThreadCore = {
      ...ctx.threadCore,
      lastResponseContract: {
        answerLength: "short",
        answerMode: "analysis",
        answerFrame: "one_step",
        routeReason: "R22_NEXTSTEP_FOLLOWUP_V1",
      },
      updatedAt: new Date().toISOString(),
    };
    ctx.saveThreadCore(__coreNext).catch(() => {});
    try {
      ctx.setResThreadCoreMirror(ctx.threadCore);
    } catch {
      /* ignore */
    }
    const __kuNext: any = {
      routeReason: "R22_NEXTSTEP_FOLLOWUP_V1",
      routeClass: "continuity",
      answerLength: "short",
      answerMode: "continuity",
      answerFrame: "one_step",
      threadCenterKey: ctx.threadCore.centerKey ?? null,
      threadCenterLabel: ctx.threadCore.centerLabel ?? ctx.centerLabelFromKey(ctx.threadCore.centerKey) ?? null,
      lastAnswerLength: ctx.threadCore.lastResponseContract?.answerLength ?? undefined,
      lastAnswerMode: ctx.threadCore.lastResponseContract?.answerMode ?? undefined,
      lastAnswerFrame: ctx.threadCore.lastResponseContract?.answerFrame ?? undefined,
      lawsUsed: [],
      evidenceIds: [],
      lawTrace: [],
    };
    try {
      attachUserIntentDeepreadObserveOnlyToKuV1(__kuNext as Record<string, unknown>, String(ctx.message ?? ""));
    } catch {
      /* ignore */
    }
    try {
      const __binderNext = ctx.buildKnowledgeBinder({
        routeReason: "R22_NEXTSTEP_FOLLOWUP_V1",
        message: String(ctx.message ?? ""),
        threadId: String(ctx.threadId ?? ""),
        ku: __kuNext,
        threadCore: ctx.threadCore,
        threadCenter: ctx.threadCenterForGeneral ?? null,
      });
      ctx.applyKnowledgeBinderToKu(__kuNext, __binderNext, {
        threadCore: ctx.threadCore ?? null,
        rawMessage: String(ctx.message ?? ""),
        threadId: String(ctx.threadId ?? ""),
      });
    } catch {
      /* ignore */
    }
    return {
      response: __bodyNext,
      evidence: null,
      candidates: [],
      timestamp: ctx.timestamp,
      threadId: ctx.threadId,
      decisionFrame: {
        mode: "NATURAL",
        intent: "chat",
        llm: null,
        ku: __kuNext,
      },
    };
  }

  if (ctx.threadCenterForGeneral != null && /(要するに|要点は|一言でいうと|本質は|要は)/u.test(t0)) {
    const __ckE = String(ctx.threadCenterForGeneral.center_key || "").trim();
    const __displayLabelE =
      ctx.threadCore.centerLabel ||
      ctx.centerLabelFromKey(ctx.threadCore.centerKey) ||
      ctx.getCenterLabelForDisplay(__ckE) ||
      "この中心";
    const __coreEssencePlain =
      __ckE === "kotodama"
        ? "言霊で言えば、要点は音の法則として読むことです。"
        : __displayLabelE + "で言えば、要点は中心を一つに絞ることです。";
    const __bodyEssence = formatStage2ConversationCarryBlockV1({
      threadCore: ctx.threadCore,
      rawMessage: String(ctx.message ?? ""),
      semanticCore: __coreEssencePlain,
      nextStepLine: "次の一手として、法則か背景のどちらを先に見るか、一つ決めてください。",
    });
    const __coreE: ThreadCore = {
      ...ctx.threadCore,
      centerKey: __ckE || null,
      centerLabel: __displayLabelE || null,
      activeEntities: __displayLabelE ? [__displayLabelE] : [],
      lastResponseContract: {
        answerLength: "short",
        answerMode: "analysis",
        answerFrame: "one_step",
        routeReason: "R22_ESSENCE_FOLLOWUP_V1",
      },
      updatedAt: new Date().toISOString(),
    };
    ctx.saveThreadCore(__coreE).catch(() => {});
    try {
      ctx.setResThreadCoreMirror(__coreE);
    } catch {
      /* ignore */
    }
    const __kuE: any = {
      routeReason: "R22_ESSENCE_FOLLOWUP_V1",
      routeClass: "continuity",
      answerLength: "short",
      answerMode: "continuity",
      answerFrame: "one_step",
      threadCenterKey: ctx.threadCenterForGeneral.center_key ?? null,
      threadCenterLabel: __displayLabelE ?? null,
      threadCenterType: ctx.threadCenterForGeneral.center_type ?? null,
      centerKey: __ckE || null,
      centerLabel: __displayLabelE ?? null,
      lawsUsed: [],
      evidenceIds: [],
      lawTrace: [],
    };
    try {
      attachUserIntentDeepreadObserveOnlyToKuV1(__kuE as Record<string, unknown>, String(ctx.message ?? ""));
    } catch {
      /* ignore */
    }
    try {
      const __binderE = ctx.buildKnowledgeBinder({
        routeReason: "R22_ESSENCE_FOLLOWUP_V1",
        message: String(ctx.message ?? ""),
        threadId: String(ctx.threadId ?? ""),
        ku: __kuE,
        threadCore: ctx.threadCore,
        threadCenter: ctx.threadCenterForGeneral,
      });
      ctx.applyKnowledgeBinderToKu(__kuE, __binderE, {
        threadCore: ctx.threadCore ?? null,
        rawMessage: String(ctx.message ?? ""),
        threadId: String(ctx.threadId ?? ""),
      });
    } catch {
      /* ignore */
    }
    try {
      const { computeConsciousnessSignature } = await import("../../core/consciousnessSignature.js");
      const __cs = computeConsciousnessSignature({
        heart: __kuE.heart ?? null,
        kanagiSelf: __kuE.kanagiSelf ?? null,
        seedKernel: __kuE.seedKernel ?? null,
        threadCore: ctx.threadCore ?? null,
        thoughtCoreSummary: __kuE.thoughtCoreSummary ?? null,
      });
      console.log("[CONSCIOUSNESS_TRACE]", { rr: String(__kuE.routeReason || ""), cs: __cs, locus: "essence_followup" });
    } catch {
      /* ignore */
    }

    if (!__kuE.responsePlan) {
      __kuE.responsePlan = ctx.buildResponsePlan({
        routeReason: String(__kuE.routeReason || "R22_ESSENCE_FOLLOWUP_V1"),
        rawMessage: String(ctx.message ?? ""),
        centerKey: String(__kuE.centerKey || "") || null,
        centerLabel: String(__kuE.centerLabel || "") || null,
        scriptureKey: null,
        semanticBody: __bodyEssence,
        mode: "general",
        responseKind: "statement_plus_question",
      } as any);
    }
    return {
      response: __bodyEssence,
      evidence: null,
      candidates: [],
      timestamp: ctx.timestamp,
      threadId: ctx.threadId,
      decisionFrame: {
        mode: "NATURAL",
        intent: "chat",
        llm: null,
        ku: __kuE,
      },
    };
  }

  if (ctx.threadCenterForGeneral != null && /(違いは|どう違う|何が違う)/u.test(t0)) {
    const __ckCmp = String(ctx.threadCenterForGeneral.center_key || "").trim();
    const __isKotodamaHishoCmp = /kotodama_hisho|言霊秘書/i.test(__ckCmp);
    if (__isKotodamaHishoCmp) {
      try {
        const __histCmp = ctx.memoryReadSession(String(ctx.threadId || ""), 8) || [];
        const __twoSoundsCmp = ctx.getLastTwoKotodamaSoundsFromHistory(__histCmp);
        if (__twoSoundsCmp && __twoSoundsCmp.length >= 2) {
          const __cmpBodyCmp = ctx.buildKotodamaCompareResponse(__twoSoundsCmp[0], __twoSoundsCmp[1]);
          if (__cmpBodyCmp) {
            const __kuCmpEarly: any = {
              routeReason: "R22_COMPARE_FOLLOWUP_V1",
              answerLength: "short",
              answerMode: "analysis",
              answerFrame: "one_step",
              threadCenterKey: ctx.threadCenterForGeneral.center_key ?? null,
              threadCenterType: ctx.threadCenterForGeneral.center_type ?? null,
              lawsUsed: [],
              evidenceIds: [],
              lawTrace: [],
            };
            try {
              attachUserIntentDeepreadObserveOnlyToKuV1(__kuCmpEarly as Record<string, unknown>, String(ctx.message ?? ""));
            } catch {
              /* ignore */
            }
            try {
              const __binderCmpE = ctx.buildKnowledgeBinder({
                routeReason: "R22_COMPARE_FOLLOWUP_V1",
                message: String(ctx.message ?? ""),
                threadId: String(ctx.threadId ?? ""),
                ku: __kuCmpEarly,
                threadCore: ctx.threadCore,
                threadCenter: ctx.threadCenterForGeneral,
              });
              ctx.applyKnowledgeBinderToKu(__kuCmpEarly, __binderCmpE, {
                threadCore: ctx.threadCore ?? null,
                rawMessage: String(ctx.message ?? ""),
                threadId: String(ctx.threadId ?? ""),
              });
            } catch {
              /* ignore */
            }
            const __cmpW = formatStage2ConversationCarryBlockV1({
              threadCore: ctx.threadCore,
              rawMessage: String(ctx.message ?? ""),
              semanticCore: String(__cmpBodyCmp || "").replace(/^【天聞の所見】\s*/u, "").trim(),
              nextStepLine: "次の一手として、いまの二音のどちらを深めるか選んでください。",
            });
            return {
              response: __cmpW,
              evidence: null,
              candidates: [],
              timestamp: ctx.timestamp,
              threadId: ctx.threadId,
              decisionFrame: {
                mode: "NATURAL",
                intent: "chat",
                llm: null,
                ku: __kuCmpEarly,
              },
            };
          }
        }
      } catch {
        /* ignore */
      }
    }
    const __displayLabelCmp =
      ctx.threadCore.centerLabel ||
      ctx.centerLabelFromKey(ctx.threadCore.centerKey) ||
      ctx.getCenterLabelForDisplay(__ckCmp) ||
      "この中心";
    const __coreCmpPlain =
      __ckCmp === "kotodama" || __isKotodamaHishoCmp
        ? "言霊で比べるなら、違いは読む軸で見えてきます。比べたい二つを一言ずつ置いてください。"
        : __displayLabelCmp +
          "で比べるなら、まず軸を一つに絞ると違いが見えます。比べたい二つを一言ずつ置いてください。";
    const __bodyCmpPreempt = formatStage2ConversationCarryBlockV1({
      threadCore: ctx.threadCore,
      rawMessage: String(ctx.message ?? ""),
      semanticCore: __coreCmpPlain,
      nextStepLine: "次の一手として、比較軸を一つに絞ってから続けてください。",
    });
    const __coreCmp: ThreadCore = {
      ...ctx.threadCore,
      centerKey: __ckCmp || null,
      centerLabel: __displayLabelCmp || null,
      activeEntities: __displayLabelCmp ? [__displayLabelCmp] : [],
      lastResponseContract: {
        answerLength: "short",
        answerMode: "analysis",
        answerFrame: "one_step",
        routeReason: "R22_COMPARE_FOLLOWUP_V1",
      },
      updatedAt: new Date().toISOString(),
    };
    ctx.saveThreadCore(__coreCmp).catch(() => {});
    try {
      ctx.setResThreadCoreMirror(__coreCmp);
    } catch {
      /* ignore */
    }
    const __kuCmp: any = {
      routeReason: "R22_COMPARE_FOLLOWUP_V1",
      answerLength: "short",
      answerMode: "analysis",
      answerFrame: "one_step",
      threadCenterKey: ctx.threadCenterForGeneral.center_key ?? null,
      threadCenterType: ctx.threadCenterForGeneral.center_type ?? null,
      centerKey: __ckCmp || null,
      centerLabel: __displayLabelCmp ?? null,
      lawsUsed: [],
      evidenceIds: [],
      lawTrace: [],
    };
    try {
      attachUserIntentDeepreadObserveOnlyToKuV1(__kuCmp as Record<string, unknown>, String(ctx.message ?? ""));
    } catch {
      /* ignore */
    }
    try {
      const __binderCmp = ctx.buildKnowledgeBinder({
        routeReason: "R22_COMPARE_FOLLOWUP_V1",
        message: String(ctx.message ?? ""),
        threadId: String(ctx.threadId ?? ""),
        ku: __kuCmp,
        threadCore: ctx.threadCore,
        threadCenter: ctx.threadCenterForGeneral,
      });
      ctx.applyKnowledgeBinderToKu(__kuCmp, __binderCmp, {
        threadCore: ctx.threadCore ?? null,
        rawMessage: String(ctx.message ?? ""),
        threadId: String(ctx.threadId ?? ""),
      });
    } catch {
      /* ignore */
    }
    if (!__kuCmp.responsePlan) {
      __kuCmp.responsePlan = ctx.buildResponsePlan({
        routeReason: String(__kuCmp.routeReason || "R22_COMPARE_FOLLOWUP_V1"),
        rawMessage: String(ctx.message ?? ""),
        centerKey: String(__kuCmp.centerKey || "") || null,
        centerLabel: String(__kuCmp.centerLabel || "") || null,
        scriptureKey: null,
        semanticBody: __bodyCmpPreempt,
        mode: "general",
        responseKind: "statement_plus_question",
      } as any);
    }
    return {
      response: __bodyCmpPreempt,
      evidence: null,
      candidates: [],
      timestamp: ctx.timestamp,
      threadId: ctx.threadId,
      decisionFrame: {
        mode: "NATURAL",
        intent: "chat",
        llm: null,
        ku: __kuCmp,
      },
    };
  }

  if (ctx.isContinuityAnchor && ctx.threadCenterForGeneral != null) {
    const __ckCont = String(ctx.threadCenterForGeneral.center_key || "").trim();
    const __displayLabelCont =
      ctx.threadCore.centerLabel ||
      ctx.centerLabelFromKey(ctx.threadCore.centerKey) ||
      ctx.getCenterLabelForDisplay(__ckCont) ||
      "この中心";
    const __leadCont = __displayLabelCont ? __displayLabelCont + "を土台に、" : "直前の中心を土台に、";
    const __isNextStepAsk = /これから|どう進める|次の一手|次の一歩|どうする/.test(t0);
    const __coreContPlain = ctx.isFeelingRequest
      ? __leadCont + "いまの気持ちのほうを見ています。一点、言葉にしてみてください。"
      : __isNextStepAsk
        ? __leadCont + "次の一手はここから。いま動かせることを一つだけ決めますか。"
        : __leadCont + "いまの話を見ていきます。どこから掘りますか。";
    const __bodyCont = formatStage2ConversationCarryBlockV1({
      threadCore: ctx.threadCore,
      rawMessage: String(ctx.message ?? ""),
      semanticCore: __coreContPlain,
      nextStepLine: __isNextStepAsk
        ? "次の一手として、いま動かす具体を一つだけ決めてください。"
        : "次の一手として、どこから掘るか一つに絞ってください。",
    });
    const __coreCont: ThreadCore = {
      ...ctx.threadCore,
      centerKey: __ckCont || null,
      centerLabel: __displayLabelCont || null,
      activeEntities: __displayLabelCont ? [__displayLabelCont] : [],
      lastResponseContract: {
        answerLength: "short",
        answerMode: "analysis",
        answerFrame: "one_step",
        routeReason: "CONTINUITY_ANCHOR_V1",
      },
      updatedAt: new Date().toISOString(),
    };
    ctx.saveThreadCore(__coreCont).catch(() => {});
    try {
      ctx.setResThreadCoreMirror(__coreCont);
    } catch {
      /* ignore */
    }
    const __kuCont: any = {
      routeReason: "CONTINUITY_ANCHOR_V1",
      answerLength: "short",
      answerMode: "analysis",
      answerFrame: "one_step",
      threadCenterKey: ctx.threadCenterForGeneral.center_key ?? null,
      threadCenterType: ctx.threadCenterForGeneral.center_type ?? null,
      centerKey: __ckCont || null,
      centerLabel: __displayLabelCont ?? null,
      lawsUsed: [],
      evidenceIds: [],
      lawTrace: [],
    };
    try {
      attachUserIntentDeepreadObserveOnlyToKuV1(__kuCont as Record<string, unknown>, String(ctx.message ?? ""));
    } catch {
      /* ignore */
    }
    try {
      const __binderCont = ctx.buildKnowledgeBinder({
        routeReason: "CONTINUITY_ANCHOR_V1",
        message: String(ctx.message ?? ""),
        threadId: String(ctx.threadId ?? ""),
        ku: __kuCont,
        threadCore: ctx.threadCore,
        threadCenter: ctx.threadCenterForGeneral,
      });
      ctx.applyKnowledgeBinderToKu(__kuCont, __binderCont, {
        threadCore: ctx.threadCore ?? null,
        rawMessage: String(ctx.message ?? ""),
        threadId: String(ctx.threadId ?? ""),
      });
    } catch {
      /* ignore */
    }
    return {
      response: __bodyCont,
      evidence: null,
      candidates: [],
      timestamp: ctx.timestamp,
      threadId: ctx.threadId,
      decisionFrame: {
        mode: "NATURAL",
        intent: "chat",
        llm: null,
        ku: __kuCont,
      },
    };
  }

  return null;
}
