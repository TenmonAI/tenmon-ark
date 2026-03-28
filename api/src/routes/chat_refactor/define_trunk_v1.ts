/**
 * CHAT_TRUNK_DEFINE_SPLIT_V1 — define trunk early returns extracted from chat.ts.
 * Preserves routeReason strings, ku shapes, reply/res.json contracts.
 */
import type { ThreadCore } from "../../core/threadCore.js";
import { buildSoulDefineGatePayloadV1 } from "../../core/soulDefineDisambigV1.js";
import { splitInputSemanticsV1 } from "../../core/inputSemanticSplitter.js";

export type DefineDecisionKuInput = {
  routeReason: string;
  term: string;
  /** TENMON_INPUT_COGNITION_SPLITTER: あるときだけ dry-run で ku に観測を載せる（routing は不変） */
  userMessage?: string | null;
  lawsUsed: string[];
  evidenceIds: string[];
  lawTrace: Array<{ lawKey: string; unitId: string; op: string }>;
  khsLawsUsed?: Array<{ lawKey: string; unitId: string; status: string; operator: string }>;
  khsEvidenceIds?: string[];
  khsLawTrace?: Array<{ lawKey: string; unitId: string; op: string }>;
  answerLength?: string | null;
  answerMode?: string | null;
  answerFrame?: string | null;
  routeClass?: string | null;
  sourcePack?: string | null;
  groundedRequired?: boolean | null;
  thoughtGuideSummary?: unknown;
  notionCanon?: unknown[];
  personaConstitutionSummary?: unknown;
  meaningFrame?: unknown;
};

export type DefineKuContext = {
  brainstem: {
    answerLength?: string | null;
    answerMode?: string | null;
    answerFrame?: string | null;
    routeClass?: string | null;
  } | null;
  heart: unknown;
  normalizeHeartShape: (h: unknown) => unknown;
  centerLabelFromKey: (k: string | null) => string | null | undefined;
  getPersonaConstitutionSummary: () => unknown;
};

export function buildDefineDecisionKuV1(input: DefineDecisionKuInput, ctx: DefineKuContext): Record<string, unknown> {
  const __termLocal = String(input.term || "").trim();
  const __centerKeyLocal =
    __termLocal === "言霊" ? "kotodama" : String(__termLocal || "").trim() || null;
  const __centerLabelLocal =
    __termLocal === "言霊"
      ? "言霊"
      : ctx.centerLabelFromKey(__centerKeyLocal) || __centerKeyLocal;

  const __kuDefine: Record<string, unknown> = {
    routeClass: input.routeClass ?? "define",
    answerLength: input.answerLength ?? (ctx.brainstem?.answerLength ?? "medium"),
    answerMode: input.answerMode ?? (ctx.brainstem?.answerMode ?? "define"),
    answerFrame: input.answerFrame ?? (ctx.brainstem?.answerFrame ?? "statement_plus_one_question"),
    routeReason: String(input.routeReason || "DEF_FASTPATH_VERIFIED_V1"),
    centerMeaning: __centerKeyLocal,
    centerKey: __centerKeyLocal,
    centerLabel: __centerLabelLocal,
    lawsUsed: Array.isArray(input.lawsUsed) ? input.lawsUsed : [],
    evidenceIds: Array.isArray(input.evidenceIds) ? input.evidenceIds : [],
    lawTrace: Array.isArray(input.lawTrace) ? input.lawTrace : [],
    term: __termLocal,
    heart: ctx.normalizeHeartShape(ctx.heart),
    sourcePack: input.sourcePack ?? null,
    groundedRequired: input.groundedRequired ?? null,
    thoughtGuideSummary: input.thoughtGuideSummary ?? null,
    notionCanon: Array.isArray(input.notionCanon) ? input.notionCanon : [],
    personaConstitutionSummary: input.personaConstitutionSummary ?? ctx.getPersonaConstitutionSummary(),
  };

  if (input.khsLawsUsed || input.khsEvidenceIds || input.khsLawTrace) {
    __kuDefine.khs = {
      lawsUsed: Array.isArray(input.khsLawsUsed) ? input.khsLawsUsed : [],
      evidenceIds: Array.isArray(input.khsEvidenceIds) ? input.khsEvidenceIds : [],
      lawTrace: Array.isArray(input.khsLawTrace) ? input.khsLawTrace : [],
    };
  }
  if (input.meaningFrame != null) __kuDefine.meaningFrame = input.meaningFrame;
  const __splitSrc = String(input.userMessage ?? input.term ?? "").trim();
  if (__splitSrc) {
    __kuDefine.inputSemanticSplitResultV1 = splitInputSemanticsV1(__splitSrc);
  }
  return __kuDefine;
}

export type PersistDefineCtx = {
  threadCore: ThreadCore;
  saveThreadCore: (c: ThreadCore) => Promise<void>;
  res: unknown;
};

export function persistDefineThreadCoreV1(
  input: {
    term: string;
    routeReason: string;
    answerLength?: string | null;
    answerMode?: string | null;
    answerFrame?: string | null;
  },
  ctx: PersistDefineCtx & { centerLabelFromKey: (k: string | null) => string | null | undefined }
): void {
  const __termLocal = String(input.term || "").trim();
  const __centerKeyLocal =
    __termLocal === "言霊" ? "kotodama" : String(__termLocal || "").trim() || null;
  const __centerLabelLocal =
    __termLocal === "言霊"
      ? "言霊"
      : ctx.centerLabelFromKey(__centerKeyLocal) || __centerKeyLocal;
  const __coreDef: ThreadCore = {
    ...ctx.threadCore,
    centerKey: __centerKeyLocal,
    centerLabel: __centerLabelLocal,
    activeEntities: __centerLabelLocal ? [__centerLabelLocal] : [],
    lastResponseContract: {
      answerLength: (input.answerLength ?? "medium") as "short" | "medium" | "long",
      answerMode: input.answerMode ?? "define",
      answerFrame: input.answerFrame ?? "statement_plus_one_question",
      routeReason: input.routeReason ?? "DEF_FASTPATH_VERIFIED_V1",
    },
    updatedAt: new Date().toISOString(),
  };
  ctx.saveThreadCore(__coreDef).catch(() => {});
  try {
    (ctx.res as any).__TENMON_THREAD_CORE = __coreDef;
  } catch {}
}

/* eslint-disable @typescript-eslint/no-explicit-any -- chat.ts wiring; contracts unchanged */
export function tryKotodamaOneSoundGroundedV4Reply(params: any):
  | {
      response: string;
      mode: string;
      sourcePack: string;
      groundingMode: string;
      decisionFrame: { mode: string; intent: string; llm: null; ku: Record<string, unknown> };
    }
  | null {
  try {
    const __msgOneSoundRawV3 = String(params.message ?? "").trim();
    const __msgOneSoundNormV3 = params.normalizeCoreTermForRouting(__msgOneSoundRawV3).replace(/\s+/gu, "");
    const __oneSoundKReV90 =
      /^([アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヰヱヲン])(?:の)?(?:言霊|言灵)/u;
    let __mOneSoundV3 = __msgOneSoundNormV3.match(
      new RegExp(__oneSoundKReV90.source + "(?:を一言法則として|の一言法則として)", "u")
    );
    if (!__mOneSoundV3) {
      __mOneSoundV3 = __msgOneSoundNormV3.match(
        /^([アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヰヱヲン])(?:の)?(?:言霊|言灵)(?:とは|って何|ってなに|とは何|とはなに|とは何ですか|とはなにですか|って何ですか|ってなにですか)?$/u
      );
    }

    if (!__mOneSoundV3) return null;
    const __soundV3 = String(__mOneSoundV3[1] || "");
    const __entryV3 = params.getKotodamaOneSoundEntry(__soundV3);
    if (!__entryV3) return null;

    const __responseV3 = params.buildKotodamaOneSoundResponse(__entryV3 as any);

    const __kuOneSoundV3: Record<string, unknown> = {
      routeReason: "KOTODAMA_ONE_SOUND_GROUNDED_V4",
      originRouteReason: "KOTODAMA_ONE_SOUND_GROUNDED_V4",
      routeClass: "define",
      centerKey: "kotodama",
      centerLabel: "言霊",
      centerMeaning: "kotodama",
      term: __soundV3,
      sourcePack: "scripture",
      groundedRequired: true,
      groundingSelector: {
        groundedPriority: "required",
        groundingMode: "canon",
        unresolvedPolicy: "ask",
      },
      answerLength: "medium",
      answerMode: "define",
      answerFrame: "statement_plus_one_question",
      sourceStackSummary: {
        primaryMeaning: "言霊",
        responseAxis: "scripture",
        sourceKinds: ["scripture", "concept", "one_sound"],
        currentSound: __soundV3,
      },
      thoughtCoreSummary: {
        centerKey: "kotodama",
        centerMeaning: "kotodama",
        continuityHint: __soundV3,
        routeReason: "KOTODAMA_ONE_SOUND_GROUNDED_V4",
        modeHint: "define",
        intentKind: "define",
        sourceStackSummary: {
          primaryMeaning: "言霊",
          responseAxis: "scripture",
          sourceKinds: ["scripture", "concept", "one_sound"],
          currentSound: __soundV3,
        },
      },
      notionHint: __entryV3.notionHint ?? null,
      notionTopics: __entryV3.notionTopics ?? null,
    };

    try {
      const __binderOneSoundV3 = params.buildKnowledgeBinder({
        routeReason: "KOTODAMA_ONE_SOUND_GROUNDED_V4",
        message: String(params.message ?? ""),
        threadId: String(params.threadId ?? ""),
        ku: __kuOneSoundV3,
        threadCore: params.threadCore,
        threadCenter: null,
      });
      params.applyKnowledgeBinderToKu(__kuOneSoundV3, __binderOneSoundV3);
    } catch {}

    return {
      response: __responseV3,
      mode: "NATURAL",
      sourcePack: "scripture",
      groundingMode: "canon",
      decisionFrame: { mode: "NATURAL", intent: "define", llm: null, ku: __kuOneSoundV3 },
    };
  } catch {
    return null;
  }
}

export function tryKotodamaOneSoundGroundedV2Reply(params: any):
  | {
      response: string;
      mode: string;
      sourcePack: string;
      groundingMode: string;
      decisionFrame: { mode: string; intent: string; llm: null; ku: Record<string, unknown> };
    }
  | null {
  try {
    const __msgSoundRaw = String(params.message ?? "").trim();
    const __msgSoundNorm = params.normalizeCoreTermForRouting(__msgSoundRaw).replace(/\s+/gu, "");
    const __oneSoundKReGroundedV90 =
      /^([アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヰヱヲン])(?:の)?(?:言霊|言灵)/u;
    let __mOneSound = __msgSoundNorm.match(
      new RegExp(__oneSoundKReGroundedV90.source + "(?:を一言法則として|の一言法則として)", "u")
    );
    if (!__mOneSound) {
      __mOneSound = __msgSoundNorm.match(
        /^([アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヰヱヲン])(?:の)?(?:言霊|言灵)(?:とは|って何|ってなに|とは何|とはなに|とは何ですか|とはなにですか|って何ですか|ってなにですか)?$/u
      );
    }

    if (!__mOneSound) return null;
    const __sound = String(__mOneSound[1] || "");
    const __entry = params.getKotodamaOneSoundEntry(__sound);
    if (!__entry) return null;

    const __response = params.buildKotodamaOneSoundResponse(__entry as any);

    const __kuSound: Record<string, unknown> = {
      routeReason: "KOTODAMA_ONE_SOUND_GROUNDED_V2",
      originRouteReason: "KOTODAMA_ONE_SOUND_GROUNDED_V2",
      routeClass: "define",
      centerKey: "kotodama",
      centerLabel: "言霊",
      centerMeaning: "kotodama",
      term: __sound,
      sourcePack: "scripture",
      groundedRequired: true,
      groundingSelector: {
        groundedPriority: "required",
        groundingMode: "canon",
        unresolvedPolicy: "ask",
      },
      answerLength: "medium",
      answerMode: "define",
      answerFrame: "statement_plus_one_question",
      sourceStackSummary: {
        primaryMeaning: "言霊",
        responseAxis: "scripture",
        sourceKinds: ["scripture", "concept", "one_sound"],
        currentSound: __sound,
      },
      thoughtCoreSummary: {
        centerKey: "kotodama",
        centerMeaning: "kotodama",
        continuityHint: __sound,
        routeReason: "KOTODAMA_ONE_SOUND_GROUNDED_V2",
        modeHint: "define",
        intentKind: "define",
        sourceStackSummary: {
          primaryMeaning: "言霊",
          responseAxis: "scripture",
          sourceKinds: ["scripture", "concept", "one_sound"],
          currentSound: __sound,
        },
      },
          notionHint: (__entry as any).notionHint ?? null,
          notionTopics: (__entry as any).notionTopics ?? null,
    };

    try {
      const __binderSound = params.buildKnowledgeBinder({
        routeReason: "KOTODAMA_ONE_SOUND_GROUNDED_V2",
        message: String(params.message ?? ""),
        threadId: String(params.threadId ?? ""),
        ku: __kuSound,
        threadCore: params.threadCore,
        threadCenter: null,
      });
      params.applyKnowledgeBinderToKu(__kuSound, __binderSound);
    } catch {}

    return {
      response: __response,
      mode: "NATURAL",
      sourcePack: "scripture",
      groundingMode: "canon",
      decisionFrame: { mode: "NATURAL", intent: "define", llm: null, ku: __kuSound },
    };
  } catch {
    return null;
  }
}

import { buildAbstractFrameV1 } from "../../core/abstractFrameEngine.js";

export function tryAbstractFrameDefineReply(params: any):
  | {
      response: string;
      mode: string;
      sourcePack: string;
      groundingMode: string;
      decisionFrame: { mode: string; intent: string; llm: null; ku: Record<string, unknown> };
    }
  | null {
  try {
    const __abstractFrame = buildAbstractFrameV1(String(params.message ?? ""));
    if (!__abstractFrame) return null;

    const __kuAbstract: Record<string, unknown> = {
      routeReason: __abstractFrame.routeReason,
      routeClass: "define",
      centerKey: __abstractFrame.centerKey,
      centerLabel: __abstractFrame.centerLabel,
      sourcePack: "concept",
      groundedRequired: false,
      groundingSelector: {
        groundedPriority: "preferred",
        groundingMode: "none",
        unresolvedPolicy: "ask",
      },
      answerLength: "medium",
      answerMode: "analysis",
      answerFrame: "statement_plus_one_question",
      responsePlan: params.buildResponsePlan({
        routeReason: __abstractFrame.routeReason,
        rawMessage: String(params.message ?? ""),
        centerKey: __abstractFrame.centerKey ?? null,
        centerLabel: __abstractFrame.centerLabel ?? null,
        scriptureKey: null,
        mode: "general",
        responseKind: "statement_plus_question",
        answerMode: "analysis",
        answerFrame: "statement_plus_one_question",
        semanticBody: "【天聞の所見】" + String(__abstractFrame.response || ""),
      }),
    };

    const __coreAbstract: ThreadCore = {
      ...params.threadCore,
      centerKey: __abstractFrame.centerKey,
      centerLabel: __abstractFrame.centerLabel,
      activeEntities: [__abstractFrame.centerLabel],
      lastResponseContract: {
        answerLength: "medium",
        answerMode: "analysis",
        answerFrame: "statement_plus_one_question",
        routeReason: __abstractFrame.routeReason,
      },
      updatedAt: new Date().toISOString(),
    };
    params.saveThreadCore(__coreAbstract).catch(() => {});
    try {
      (params.res as any).__TENMON_THREAD_CORE = __coreAbstract;
    } catch {}
    try {
      params.upsertThreadCenter({
        threadId: String(params.threadId || ""),
        centerType: "concept",
        centerKey: __abstractFrame.centerKey,
        centerReason: JSON.stringify({
          answerLength: "medium",
          answerMode: "analysis",
          answerFrame: "statement_plus_one_question",
          routeReason: __abstractFrame.routeReason,
          openLoops: [],
          commitments: [],
        }),
        sourceRouteReason: __abstractFrame.routeReason,
        confidence: 0.9,
      });
    } catch {}

    return {
      response: __abstractFrame.response,
      mode: "NATURAL",
      sourcePack: "concept",
      groundingMode: "none",
      decisionFrame: { mode: "NATURAL", intent: "define", llm: null, ku: __kuAbstract },
    };
  } catch {
    return null;
  }
}

export function trySoulFastpathVerifiedResJson(params: any): Record<string, unknown> | null {
  try {
    const out = buildSoulDefineGatePayloadV1({
      message: String(params.message ?? ""),
      threadId: String(params.threadId ?? ""),
      timestamp: params.timestamp,
      heart: params.heart,
      responseComposer: params.responseComposer,
      normalizeHeartShape: params.normalizeHeartShape,
    });
    return (out as Record<string, unknown>) ?? null;
  } catch {
    return null;
  }
}
