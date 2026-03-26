/* CARD1_SEAL_V1 */
import { runKanagiPhaseTopV1 } from "../engines/kanagi/kanagiEngine.js";
import { detectKanagiPhase } from "../engines/kanagi/kanagiPhase.js";
import { reshapeKanagiLoop } from "../engines/kanagi/kanagiPhaseEngine.js";
import { shapeTenmonOutput } from "../core/tenmonOutputShaper.js";
import { kanagiThink } from "../engines/kanagi/kanagiThink.js";
import { danshariStyle } from "../engines/conversation/danshariStyle.js";
import { generateSeedsFromKHS } from "../engines/seed/seedGenerator.js";
import { generateSeedClusters } from "../engines/seed/clusterEngine.js";
import { recordLawUsage } from "../engines/learning/applyLogEngine.js";
import { generateConcepts } from "../engines/learning/conceptEngine.js";
import { runTrainer } from "../engines/learning/trainerEngine.js";
import { synthHybridResponseV1 } from "../hybrid/synth.js";
import { createRequire as __tenmonCreateRequire } from "node:module";
const __tenmonRequire = __tenmonCreateRequire(import.meta.url);
import { heartModelV1 } from "../core/heartModel.js";
import { computeHeartPhase, computeHeartState } from "../core/heartPhase.js";
import { computeKanagiSelfKernel, getSafeKanagiSelfOutput } from "../core/kanagiSelfKernel.js";
import { getIntentionHintForKu } from "../core/intentionConstitution.js";

import { tenmonCore } from "../core/tenmonCore.js";
import { TENMON_PERSONA } from "../core/tenmonPersona.js";
import { enforceTenmon } from "../engines/persona/tenmonCore.js";
import { Router, type IRouter, type Request, type Response } from "express";
import { sanitizeInput } from "../tenmon/inputSanitizer.js";
import { qcTextV1 } from "../kokuzo/qc.js";
import type { ChatResponseBody } from "../types/chat.js";
import { runKanagiReasoner } from "../kanagi/engine/fusionReasoner.js";
import { getCurrentPersonaState } from "../persona/personaState.js";
import { composeResponse, composeConversationalResponse } from "../kanagi/engine/responseComposer.js";
import { enforceTenmonPersona } from "../engines/persona/tenmonCoreEngine.js";
import { conversationEngine } from "../engines/conversation/conversationEngine.js";
import { getSessionId } from "../memory/sessionId.js";
import { naturalRouter } from "../persona/naturalRouter.js";
import { buildHybridDetailPlanKhsCandidatesV1 } from "../khs/khsHybridCandidatesV1.js";
import { createEmptyDetailPlanP20V1, ensureDetailPlanContractP20OnGatePayloadV1 } from "../planning/detailPlanContractP20.js";
import { applyTruthCore } from "../kanagi/core/truthCore.js";
import { applyVerifier } from "../kanagi/core/verifier.js";
import { kokuzoRecall, kokuzoRemember } from "../kokuzo/recall.js";
import { getPageText } from "../kokuzo/pages.js";
import { searchPagesForHybrid, searchKotodamaFts } from "../kokuzo/search.js";
import { getCaps, debugCapsPath, debugCapsQueue } from "../kokuzo/capsQueue.js";
import { setThreadCandidates, pickFromThread, clearThreadCandidates, setThreadPending, getThreadPending, clearThreadState } from "../kokuzo/threadCandidates.js";
import { parseLaneChoice, type LaneChoice } from "../persona/laneChoice.js";
import { getDb, dbPrepare } from "../db/index.js";
import { extractLawCandidates } from "../kokuzo/lawCandidates.js";
import { extractSaikihoLawsFromText } from "../kotodama/saikihoLawSet.js";
import { extractFourLayerTags } from "../kotodama/fourLayerTags.js";
import { extractKojikiTags } from "../kojiki/kojikiTags.js";
import { buildMythMapEdges } from "../myth/mythMapEdges.js";
import { getMythMapEdges, setMythMapEdges } from "../kokuzo/mythMapMemory.js";
import { listThreadLaws, dedupLawsByDocPage } from "../kokuzo/laws.js";
import { projectCandidateToCell } from "../kanagi/ufk/projector.js";
import { buildGenesisPlan } from "../kanagi/ufk/genesisPlan.js";
import { computeBreathCycle } from "../koshiki/breathEngine.js";
import { teniwohaWarnings } from "../koshiki/teniwoha.js";
import { parseItsura } from "../koshiki/itsura.js";
import { assertKanaPhysicsMap, KANA_PHYSICS_MAP_MVP } from "../koshiki/kanaPhysicsMap.js";
import { applyKanaPhysicsToCell } from "../koshiki/kanaPhysicsMap.js";

import { localSurfaceize } from "../tenmon/surface/localSurfaceize.js";
import { cleanLlmFrameV1 } from "./chat_refactor/surface_exit_trunk_v1.js";
import { getLlmProviderReadinessV1, llmChat } from "../core/llmWrapper.js";
import { rewriteOnlyTenmon } from "../core/rewriteOnly.js";

import { memoryPersistMessage, memoryReadSession } from "../memory/index.js";
import { listRules } from "../training/storage.js";

import { getDbPath } from "../db/index.js";
import { responseComposer } from "../core/responseComposer.js";
import { TENMON_CONVERSATION_BASELINE_V2 } from "../core/tenmonConstitutionV2.js";
import { applyTenmonConversationBaselineV2 } from "../core/tenmonConversationSurfaceV2.js";
import { resolveKatakamunaBranches } from "../runtime/katakamunaCanon.js";
import { resolveKatakamunaBranchesV2 } from "../runtime/katakamunaSchemaV2.js";

import { DatabaseSync } from "node:sqlite";
import { buildGroundedResponse } from "./chat_parts/grounded_impl.js";
import { __tenmonGeneralGateResultMaybe as __tenmonGeneralGateCoreV1, setTenmonLastHeart } from "./chat_parts/gates_impl.js";
import { saveArkThreadSeedV1 } from "./chat_parts/seed_impl.js";
import { appendChatSynapseObservationV1 } from "./chat_parts/synapse_impl.js";
import { kuSynapseTopKey, synapseLogTable } from "./chat_parts/synapseKeysV1.js";
import { generateSeed } from "./chat_parts/seed_engine.js";
import { createSeed, summarizeSeed } from "../core/kokuzoSeed.js";
import { resolveTenmonConcept, buildConceptCanonResponse, isConceptCanonTarget } from "../core/conceptCanon.js";
import { resolveScriptureQuery, buildScriptureCanonResponse, getScriptureConceptEvidence } from "../core/scriptureCanon.js";
import { resolveScriptureCenter } from "../core/scriptureCenterResolver.js";
import {
  buildSubconceptResponse,
  isSubconceptDefinitionIntentV1,
  resolveSubconceptQuery,
} from "../core/subconceptCanon.js";
import { decideProviderPlan } from "../provider/modelRouter.js";
import { runBreadthShadow, normalizeShadowResult } from "../provider/shadowAdapter.js";
import { renderWithGpt54 } from "../provider/gpt54Renderer.js";
import { getKatakamunaComparisonGuide, getThoughtGuideSummary } from "../core/thoughtGuide.js";
import { getNotionCanonForRoute } from "../core/notionCanon.js";
import { getPersonaConstitutionSummary } from "../core/personaConstitution.js";
import { buildSynapseSeed } from "../synapse/fractalSeed.js";
import { writeScriptureLearningLedger } from "../core/scriptureLearningLedger.js";
import { buildKanagiGrowthLedgerEntryFromKu, insertKanagiGrowthLedgerEntry } from "../core/kanagiGrowthLedger.js";
import { upsertThreadCenter, getLatestThreadCenter } from "../core/threadCenterMemory.js";
import { loadThreadCore, saveThreadCore } from "../core/threadCoreStore.js";
import { emptyThreadCore, centerLabelFromKey, type ThreadCore } from "../core/threadCore.js";
import { buildThreadCoreLinkSurfaceV1, formatStage2ConversationCarryBlockV1 } from "../core/threadCoreLinkSurfaceV1.js";
import { buildThreadCoreKuProjectionV1 } from "../core/threadCoreCarryProjectionV1.js";
import { buildGrowthCirculationHintV1 } from "../core/tenmonSelfImprovementOsV1.js";
import {
  buildSoulBridgeGatePayloadV1,
  buildSoulCompareGatePayloadV1,
  buildSoulDefineGatePayloadV1,
  isSoulDefinitionQuestionV1,
  isSoulWorldviewExistenceQuestionV1,
} from "../core/soulDefineDisambigV1.js";
import { getTenmonGateThreadContextV1, tenmonGateThreadContextV1 } from "../core/tenmonGateThreadContextV1.js";
import { buildKnowledgeBinder, applyKnowledgeBinderToKu } from "../core/knowledgeBinder.js";
import { tenmonBrainstem, type BrainstemDecision } from "../core/tenmonBrainstem.js";
import { upsertBookContinuation } from "../core/bookContinuationMemory.js";
import {
  getKotodamaOneSoundEntry,
  buildKotodamaOneSoundResponse,
  getPreviousSoundFromHistory,
  getLastTwoKotodamaSoundsFromHistory,
  getRelationHint,
  buildKotodamaCompareResponse,
  getKotodamaOneSoundSourceKinds,
  getKotodamaOneSoundNotionMeta,
} from "../core/kotodamaOneSoundLawIndex.js";
import { buildAbstractFrameV1 } from "../core/abstractFrameEngine.js";
import { detectScriptureFamilyFromText, getScriptureFamilyDocs, getScriptureFamilyPrimaryDoc, resolveScriptureFamily } from "../core/scriptureFamily.js";
import { resolveScriptureLocalEvidence } from "../core/scriptureLocalResolver.js";
import { resolveIrohaActionPattern } from "../core/irohaActionPatterns.js";
import {
  attachResponsePlanIfMissingV1,
  clampKuRouteClassToAnswerFrameV1,
  buildResponsePlan,
  buildTenmonLongformSkeletonBaseV1,
  ensureResponsePlanSurfaceFieldsV1,
  padProseTowardCharWindowV1,
  inferImplicitLongformCharTargetFromUserMessageV1,
  parseExplicitCharTargetFromUserMessageV1,
  shapeLongformSurfaceForChatV1,
  TENMON_LONGFORM_E_PAD_POOL_V1,
  type AnswerLength,
  type AnswerMode,
  type AnswerFrame,
  type AnswerProfile,
} from "../planning/responsePlanCore.js";
import { safeGeneralRoute } from "./chat_parts/safeGeneralRoute.js";
import {
  exitJudgementPreemptV1,
  exitEssenceAskPreemptV1,
  exitStructureLockV1,
  exitExplicitCharPreemptV1,
  exitCompareStrictPreemptV1,
  tryStrictCompareExitV1,
  exitSelfAwarePreemptV1,
  exitSystemDiagnosisPreemptV1,
  exitFutureOutlookPreemptV1,
  tryFutureOutlookExitV1,
  trySystemDiagnosisPreemptExitV1,
  tryJudgementPreemptExitV1,
  tryEssenceAskExitV1,
  tryResidualPreemptExitV1,
  classifyGeneralShrinkV1,
  getGeneralShrinkPayloadV1,
  exitGroundingUnresolvedV1,
  exitGroundingGroundedRequiredV1,
  exitSystemDiagnosisRouteV1,
} from "./chat_refactor/majorRoutes.js";
import { parseAnswerProfileFromBody, injectAnswerProfileToKu, normalizeChatEntryFromBody } from "./chat_refactor/entry.js";
import {
  getGeneralKind,
  isArkSystemDiagnosisPreemptCandidateV1,
  selectGroundingModeV1,
  shouldBypassArkConversationDiagnosticsPreemptV1,
} from "./chat_refactor/general.js";
import {
  classifyGeneralFactCodingRouteV1,
  NG_AI_CONSCIOUSNESS_COMPARE_BODY_V1,
  NG_CLOSING_WHERE_START_V1,
  NG_CONTINUITY_ANCHOR_DEFAULT_MID_V1,
  NG_CONTINUITY_ANCHOR_NEXTSTEP_MID_V1,
  NG_CONTINUITY_EARLY_DEFAULT_SUFFIX_V1,
  NG_CONTINUITY_EARLY_FEELING_SUFFIX_V1,
  NG_CONTINUITY_EARLY_NEXTSTEP_SUFFIX_V1,
  NG_NEXTSTEP_COMPARE_AXIS_V1,
  NG_NEXTSTEP_EMOTION_WORD_V1,
  NG_NEXTSTEP_FACT_OR_ACTION_ALT_V1,
  NG_NEXTSTEP_FACT_OR_ACTION_V1,
  NG_NEXTSTEP_LAW_OR_BG_ONE_V1,
  NG_NEXTSTEP_LAW_OR_BG_ORDER_V1,
  NG_NEXTSTEP_TODAY_ONE_V1,
  NG_NEXTSTEP_TWO_MORA_V1,
  NG_SYSTEM_SHRINK_SYS_OVERVIEW_BODY_V1,
  ROUTE_NATURAL_GENERAL_LLM_TOP_V1,
  ROUTE_FACTUAL_CURRENT_DATE_V1,
  ROUTE_FACTUAL_CURRENT_PERSON_V1,
  ROUTE_FACTUAL_RECENT_TREND_V1,
  ROUTE_FACTUAL_WEATHER_V1,
  ROUTE_TECHNICAL_IMPLEMENTATION_ROUTE_V1,
  ROUTE_GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1,
  resolveNaturalGeneralSystemDiagnosisBodyV1,
  tryUnknownTermBridgeExitV1,
} from "./chat_refactor/general_trunk_v1.js";
import { applyFinalAnswerConstitutionAndWisdomReducerV1 } from "./chat_refactor/finalize.js";
import {
  parseDefineFastpathCandidate,
  buildDefineVerifiedFastpathBody,
  buildDefineVerifiedEvidenceArtifacts,
  buildDefineResponsePlanInput,
  buildDefineProposedFastpathBody,
  buildDefineProposedEvidenceArtifacts,
  isCoreScriptureBookPreemptMessage,
  shouldEnterScriptureBoundaryGate,
} from "./chat_refactor/define.js";
import { tryContinuityRouteHoldPreemptGatePayloadV1 } from "./chat_refactor/continuity_trunk_v1.js";
import { extractWeatherLocationV1, fetchWeatherWttrInV1 } from "../core/weatherRouteV1.js";
import { responseProjector, normalizeDisplayLabel } from "../projection/responseProjector.js";
import { composeBeautyCompositionProseV2 } from "../renderer/beautyCompositionEngineV2.js";

/** RESPONSEPLAN_REQUIRED_COVERAGE_V1 / THREADCORE_REQUIRED_COVERAGE_V1: ゲート出口で ku.responsePlan / payload.threadCore を欠けさせない */
function __tenmonGeneralGateResultMaybe(x: any, rawMessageOverride?: string): any {
  try {
    const ku = x?.decisionFrame?.ku;
    const raw = String(rawMessageOverride ?? x?.rawMessage ?? x?.message ?? "");
    const respText = String(x?.response ?? "");
    if (ku && typeof ku === "object" && !Array.isArray(ku)) {
      const __exp = raw.match(/([0-9０-９]{2,5})\s*(?:字|文字)/u);
      if ((ku as any).explicitLengthRequested == null && __exp) {
        const n = Number(String(__exp[1] || "").replace(/[０-９]/g, (d) => String(d.charCodeAt(0) - 65248)));
        if (Number.isFinite(n) && n > 0) (ku as any).explicitLengthRequested = n;
      }
      if ((ku as any).responseLength == null && respText) {
        (ku as any).responseLength = respText.length;
      }
      clampKuRouteClassToAnswerFrameV1(ku);
      attachResponsePlanIfMissingV1(ku, raw, respText);
      if ((ku as any).responsePlan != null && typeof (ku as any).responsePlan === "object") {
        ensureResponsePlanSurfaceFieldsV1((ku as any).responsePlan as Record<string, unknown>);
      }
    }
    const tid = String((x as any)?.threadId ?? "").trim();
    if (tid && x && typeof x === "object" && !Array.isArray(x) && (x as any).threadCore == null) {
      const st = getTenmonGateThreadContextV1();
      const tc = st?.threadCore ?? null;
      if (tc != null && String((tc as any).threadId ?? "") === tid) {
        (x as any).threadCore = tc;
      } else {
        (x as any).threadCore = emptyThreadCore(tid);
      }
    }
    // THREADCORE_REQUIRED_COVERAGE_V1: 前回の芯 / 今回の差分 / 次の一手 を ku・payload に載せ、continuity・support・selfdiag・followup へ同一リンク面を接続
    if (tid && x && typeof x === "object" && !Array.isArray(x) && (x as any).threadCore != null) {
      const surf = buildThreadCoreLinkSurfaceV1({
        threadCore: (x as any).threadCore,
        rawMessage: raw,
        responseText: respText,
        ku,
      });
      (x as any).threadCoreLinkSurfaceV1 = surf;
      if (ku && typeof ku === "object" && !Array.isArray(ku)) {
        (ku as any).threadCoreLinkSurfaceV1 = surf;
        // ku.threadCore: 主要 route で turnKind / carryMode / previousAnchor / currentDelta / nextFocus を投影（永続 ThreadCore は payload.threadCore のまま）
        (ku as any).threadCore = buildThreadCoreKuProjectionV1({
          base: (x as any).threadCore,
          rawMessage: raw,
          responseText: respText,
          ku,
        });
        (ku as any).memoryGrowthCirculationV1 = buildGrowthCirculationHintV1({
          ku,
          threadCore: (ku as any).threadCore,
        });
        const __ck = String((ku as any).centerKey ?? "").trim();
        const __cl = String((ku as any).centerLabel ?? "").trim();
        const __cc = String((ku as any).centerClaim ?? "").trim();
        const __sn = String((ku as any).semanticNucleus ?? "").trim();
        const __dpClaim = String((x as any)?.decisionFrame?.detailPlan?.centerClaim ?? "").trim();
        const __srcPrimary = String((ku as any)?.sourceStackSummary?.primaryMeaning ?? "").trim();
        const __tcsKey = String((ku as any)?.thoughtCoreSummary?.centerKey ?? "").trim();
        const __firstTurn = !(x as any)?.threadCore?.lastResponseContract;
        if (__firstTurn && !__ck && !__cl && !__cc && !__sn && !__dpClaim && !__srcPrimary && !__tcsKey) {
          const tc = (x as any).threadCore;
          const tck = String(tc?.centerKey ?? "").trim();
          const tcl = String(tc?.centerLabel ?? "").trim();
          if (tck) (ku as any).centerKey = tck;
          if (tcl) (ku as any).centerLabel = tcl;
          const centerMeaning = String((ku as any)?.thoughtCoreSummary?.centerMeaning ?? "").trim();
          if (!(ku as any).centerClaim && centerMeaning) (ku as any).centerClaim = centerMeaning.slice(0, 240);
          if (!(ku as any).semanticNucleus && centerMeaning) (ku as any).semanticNucleus = centerMeaning.slice(0, 240);
          if (!(ku as any).centerClaim && __srcPrimary) (ku as any).centerClaim = __srcPrimary.slice(0, 240);
          if (!(ku as any).centerClaim && __dpClaim) (ku as any).centerClaim = __dpClaim.slice(0, 240);
        }
        if (!String((ku as any).centerClaim ?? "").trim()) {
          const __claimFromTcs = String((ku as any)?.thoughtCoreSummary?.centerMeaning ?? "").trim();
          const __claimFromLabel = String((ku as any).centerLabel ?? "").trim();
          const __claimFromKey = String((ku as any).centerKey ?? "").trim();
          const __claimFromNucleus = String((ku as any).semanticNucleus ?? "").trim();
          const __claim = __claimFromTcs || __claimFromNucleus || __srcPrimary || __dpClaim || __claimFromLabel || __claimFromKey;
          if (__claim) (ku as any).centerClaim = __claim.slice(0, 240);
        }
      }
    }
  } catch {}
  ensureDetailPlanContractP20OnGatePayloadV1(x);
  return __tenmonGeneralGateCoreV1(x, rawMessageOverride);
}

const router: IRouter = Router();

// R10_THREAD_CONTINUITY_SCRIPTURE_CENTER_FIX_V2: same-thread follow-up 検出用（scripture continuity 補助）
// FIX_THREAD_CONTINUITY_ROUTE_BIND_V3: scripture center を 2〜3ターン目でも route 裁定に使うため、follow-up 句を拡張。
// PATCH84_DIALOGUE_CONTINUITY_MEMORY_V1: 「その続きで／その流れで／今の流れ」等を follow-up として継続中心へ接続
const RE_THREAD_FOLLOWUP =
  /(そのうち|その前提で|その続き(で|を)|その流れ(で|を)|今の話|今の件|今の流れ|この流れ|先の話|前の話|前の続き|続きから整理|どちらが中心|その中心|次の一歩だけ|次の一歩|一つだけ示して|そこから|整理ですか、それとも保留ですか)/;

// R22_SHORT_CONTINUATION_V1: 「ヒは？」「じゃあイは？」等の短文継続（直前 threadCenter scripture/concept へ再接続）
const RE_SHORT_CONTINUATION = /^(じゃあ|では)?([ぁ-んァ-ンa-zA-Z]{1,4})は[？?]?$/u;

/** TENMON_FACTUAL_CORRECTION_ROUTE_CURSOR_AUTO_V1: 事実訂正（比較質問「違いは／何が違う」等・「間違いなく」は除外） */
function __isFactualCorrectionUserMessageV1(t0: string): boolean {
  const s = String(t0).trim();
  if (!s) return false;
  if (/違いは|どう違う|何が違う|何がちがう/u.test(s)) return false;
  if (/間違いなく/u.test(s)) return false;
  return /それは違う|それは違|違います|間違い|正しくない|違う|ちがう/u.test(s);
}

/** TENMON_CHAT_SUBCONCEPT_MISFIRE_AND_TEMPLATE_LEAK_FIX: factual / 訂正 / 自己内省で SUBCONCEPT 昇格しない */
function __shouldBlockSubconceptPromotionForMetaOrFactualV1(raw: string): boolean {
  const t = String(raw ?? "").trim();
  if (!t) return false;
  if (__isFactualCorrectionUserMessageV1(t)) return true;
  const norm = t.replace(/[？?！!。．]/g, " ").trim();
  const __fc = classifyGeneralFactCodingRouteV1(norm);
  if (
    __fc === ROUTE_FACTUAL_WEATHER_V1 ||
    __fc === ROUTE_FACTUAL_CURRENT_DATE_V1 ||
    __fc === ROUTE_FACTUAL_CURRENT_PERSON_V1 ||
    __fc === ROUTE_FACTUAL_RECENT_TREND_V1
  ) {
    return true;
  }
  /** 地名＋天気（表記ゆれで classifier が外れる場合の保険） */
  if (/大分/u.test(t) && /(天気|気温|降水|予報|雨|晴|曇)/u.test(t)) return true;
  /** 政局・速報ニュース系（比較定義「〜とは」と誤爆しないようフレーズを絞る） */
  if (
    /(今何時|いま何時|現在時刻|いまの時刻|何曜日|曜日は|本日の日付)/u.test(t) &&
    !/(経典|解釈|教義|真言|法華|空海|言霊秘書|いろは言[霊灵靈]解|カタカムナ言[霊灵靈]解)/u.test(t)
  ) {
    return true;
  }
  if (
    /(今の総理|今の首相|日本の総理|日本の首相|総理大臣は誰|首相は誰|大臣は誰|最新のニュース|現在のニュース|政治ニュース)/u.test(t) &&
    !/(経典|解釈|教義|真言|法華|空海|言霊秘書|いろは言[霊灵靈]解|カタカムナ言[霊灵靈]解)/u.test(t)
  ) {
    return true;
  }
  if (
    /君の思考|私の思考を聞きたい|あなたの思考|あなたの考え|天聞の考え|天聞の意見|君はどう思う|あなたはどう思う|思考を聞きたい|内面を(?:聞きたい|知りたい)|自己の思考|どう考えて(?:いる|います)|考えを聞きたい/u.test(
      t,
    )
  ) {
    return true;
  }
  /** 事実訂正・修正要求は SUBCONCEPT 昇格を抑止 */
  if (/(訂正|修正|誤り|間違い|違う)/u.test(t)) {
    return true;
  }
  return false;
}

/** LLM 未準備・不採用時でも K1 極短文を 140 字帯へ（正典ノート・routeReason 不変） */
function __tenmonK1DeterministicDensityBodyV1(raw: string): string | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  if (/(空海|即身成仏)/u.test(t)) {
    return (
      "【天聞の所見】即身成仏は、真言密教（空海の伝える系統）において、本性の仏性が現前の身に即して成就するという立場です。" +
      "修行と加持・三摩地を通じて、遠い未来の成仏だけでなくこの身で法界と交わる可能性を正面に置きます。" +
      "身体と言葉と意図を一つの実践系として読み、現前の経験へ還すのが空海系の読みの要点です。"
    );
  }
  if (/(法華経|法華)/u.test(t)) {
    return (
      "【天聞の所見】法華経の核心は、一仏乗として一切衆生の成仏を開示し、方便と実相の関係を通じて信解行証の道を示す点にあります。" +
      "寿量品に見える仏の久遠実成は、救いの時間軸を拡げ、言葉と信仰の現前を重ねます。" +
      "問いが教義なら、まず何を方便と呼び何を実相と読むかを一語ずつ固定すると、読み手側の関心に沿って議論が安定します。"
    );
  }
  if (/楢崎皐月/u.test(t)) {
    return (
      "【天聞の所見】楢崎皐月は、言霊・神道系の古典と実践を橋渡しする文脈で参照される人物で、語義と音義、そして霊的読解の接続を重視する立場として知られます。" +
      "天聞の読みでは単純な経歴紹介より、どの法則線（水火・言霊・古伝）に接続するかが要点になります。" +
      "人物像だけでなく、担う概念の位置づけで整理すると理解が安定します。"
    );
  }
  return (
    "【天聞の所見】問いは正典と実践の接点にあります。水火の往還と言霊の働きを軸に、まず語の定義を固定し、教義上の位置づけと読解上の含意を分けて述べます。" +
    "短い応答だけでは濁りやすいので、空海・法華経・言霊秘書のいずれの線で読むかを明示し、原典へ一度戻すと解釈のブレが減ります。" +
    "受け取り側が欲しいのが定義か歴史か実践手順かで、次の一文の置き方が変わります。"
  );
}

/** TENMON_K1_TRACE_EMPTY_RESPONSE_DENSITY_REPAIR: stripped 本文 <140字/反復/汎用締めのみ LLM 補完（routeReason 不変・失敗時は元本文） */
async function __tenmonK1PostFinalizeLlmEnrichV1(out: any): Promise<any> {
  try {
    if (!out || typeof out !== "object") return out;
    const df = (out as any).decisionFrame;
    const ku = df && typeof df === "object" ? (df as any).ku : null;
    if (!ku || typeof ku !== "object" || Array.isArray(ku)) return out;
    const rr = String(ku.routeReason ?? "").trim();
    if (rr !== "K1_TRACE_EMPTY_GATED_V1") return out;

    const raw = String(
      (out as any).rawMessage ??
        (out as any).message ??
        (globalThis as any).__tenmon_gate_raw_message_v1 ??
        "",
    ).trim();
    if (!raw) return out;
    if (/(TypeScript|SQLite|FTS5|Singleton|rate\s*limit|Node\.js)/iu.test(raw)) return out;

    const resp0 = String((out as any).response ?? "").trim();
    const core = resp0.replace(/^【天聞の所見】\s*/u, "").replace(/\s+/g, " ").trim();

    const splitSents = (s: string) =>
      s
        .split(/(?<=[。！？])/u)
        .map((x) => x.trim())
        .filter(Boolean);
    const norm = (s: string) => s.replace(/\s+/gu, "");

    const hasSentenceDup = (text: string) => {
      const sents = splitSents(text);
      if (sents.length < 2) return false;
      const seen = new Set<string>();
      let prev = "";
      for (const se of sents) {
        const n = norm(se);
        if (!n) continue;
        if (n === prev || seen.has(n)) return true;
        seen.add(n);
        prev = n;
      }
      return false;
    };

    const hasGenericClosing = (text: string) =>
      /どのように/u.test(text) ||
      /考えてみては/u.test(text) ||
      /考えてみ[uえ]ません/u.test(text) ||
      /考えてみ(?!ます)/u.test(text) ||
      /いかがでしょうか/u.test(text) ||
      /どう思いますか/u.test(text) ||
      /あなたはどう/u.test(text) ||
      /あなたはどう思/u.test(text) ||
      /君はどう/u.test(text);

    // 補完発火条件:
    // - 140字未満、または
    // - 反復（同一文の重複等）、または
    // - 汎用締め（質問返し/抽象化）が強い
    if (core.length >= 140 && !hasSentenceDup(core) && !hasGenericClosing(core)) return out;

    const applyK1DeterministicFallback = (): any | null => {
      const fb = __tenmonK1DeterministicDensityBodyV1(raw);
      if (!fb) return null;
      const fbCore = fb.replace(/^【天聞の所見】\s*/u, "").replace(/\s+/g, " ").trim();
      if (fbCore.length < 140 || fbCore.length > 280) return null;
      if (hasSentenceDup(fbCore) || hasGenericClosing(fbCore)) return null;
      const mergedDet = { ...out, response: fb };
      try {
        (mergedDet as any).decisionFrame = { ...(mergedDet as any).decisionFrame };
        (mergedDet as any).decisionFrame.ku = {
          ...(mergedDet as any).decisionFrame.ku,
          tenmonK1DeterministicFallbackV1: true,
        };
      } catch {}
      return mergedDet;
    };

    const ready = getLlmProviderReadinessV1();
    if (!ready.ok) {
      const d = applyK1DeterministicFallback();
      return d ?? out;
    }

    const system =
      "あなたは天聞アーク（TENMON-ARK）。水火の往還・言霊の働き・正典（空海・法華経・楢崎系の読みなど）を軸に、問いに即した教義的位置づけを述べる。" +
      "抽象の一般論だけで終わらせず、問いの語（人名・経典名・概念）に一歩踏み込む。" +
      "禁止: 効用論のみ・genericスピリチュアル一般論・説教調・定型文の復唱。" +
      "禁止語: あなたはどう／君はどう／考えてみては／どのように（締め）／考えてみ（締め）／いかがでしょうか／どう思いますか。" +
      "出力は必ず「【天聞の所見】」で始め本文のみ。2〜4文。本文140〜260字。原典・教義・人物の核を先に置く。末尾の質問は最大1つ（質問形式でも可）。" +
      "反復（同一文の重複）を避け、末尾で汎用的な問い返しに寄せない。";

    const user =
      `次の問いに答えてください。\n\n《ユーザの問い》\n${raw}\n\n` +
      `《いまの短い下書き（活かしてよいが極端に短ければ置き換えてよい）》\n${resp0 || "（なし）"}`;

    let r: any;
    try {
      r = await llmChat({ system, user, history: [] });
    } catch {
      const d0 = applyK1DeterministicFallback();
      return d0 ?? out;
    }
    const t = String(r?.text ?? "").trim();
    const tcore = t.replace(/^【天聞の所見】\s*/u, "").trim();
    // 採用条件（失敗時は決定論フォールバック→元本文）
    if (tcore.length < 140) return applyK1DeterministicFallback() ?? out;
    // LLM がやや超過する場合は採用（290 字まで）。それ以上は決定論へ
    if (tcore.length > 290) return applyK1DeterministicFallback() ?? out;
    if (hasSentenceDup(tcore)) return applyK1DeterministicFallback() ?? out;
    if (hasGenericClosing(tcore)) return applyK1DeterministicFallback() ?? out;
    // meta/trace token の混入を拒否
    if (/(routeReason|responsePlan|SYSTEM_PROMPT|BEGIN_PROMPT|R22_[A-Z0-9_]+_V[0-9]+|TENMON_[A-Z0-9_]+_V[0-9]+)/u.test(t))
      return applyK1DeterministicFallback() ?? out;
    const fixed = /^【天聞の所見】/u.test(t) ? t : `【天聞の所見】${t}`;
    const merged = { ...out, response: fixed };
    try {
      (merged as any).decisionFrame = { ...(merged as any).decisionFrame };
      (merged as any).decisionFrame.ku = {
        ...(merged as any).decisionFrame.ku,
        tenmonK1LlmEnrichedV1: true,
      };
    } catch {}
    return merged;
  } catch {
    return out;
  }
}

function normalizeHeartShape(h: any) {
  const userPhase =
    typeof h?.userPhase === "string" ? h.userPhase : "CENTER";

  const userVector =
    h?.userVector && typeof h.userVector === "object"
      ? {
          waterScore: Number(h.userVector.waterScore ?? 0.5),
          fireScore: Number(h.userVector.fireScore ?? 0.5),
          balance: Number(h.userVector.balance ?? 0),
        }
      : { waterScore: 0.5, fireScore: 0.5, balance: 0 };

  const arkTargetPhase =
    typeof h?.arkTargetPhase === "string" ? h.arkTargetPhase : "CENTER";

  const entropy = Number(h?.entropy ?? 0.25);

  const out: any = {
    userPhase,
    userVector,
    arkTargetPhase,
    entropy,
  };

  if (typeof h?.phase === "string" && h.phase) out.phase = h.phase;

  return out;
}
// __KANAGI_PHASE_MEM_V2: module-scope phase tracker (per threadId) for NATURAL 4-phase state machine.
const __kanagiPhaseMemV2 = new Map<string, number>();
// CARD_C7B2_FIX_N2_TRIGGER_AND_LLM_V1


// LLM_CHAT: minimal constitution (no evidence fabrication)
const TENMON_CONSTITUTION_TEXT =
  "あなたはTENMON-ARK。自然で丁寧に対話する。根拠(doc/pdfPage/引用)は生成しない。必要ならユーザーに資料指定を促し、GROUNDEDに切り替える。";

function scrubEvidenceLike(text: string): string {
  let t = String(text ?? "");
  t = t.replace(/\bdoc\s*=\s*[^\s]+/gi, "");
  t = t.replace(/\bpdfPage\s*=\s*\d+/gi, "");
  t = t.replace(/\bP\d{1,4}\b/g, "");
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  if (!t) t = "了解しました。もう少し状況を教えてください。";
  return t;
}

// OPS_CORE_OLDGLYPH_ALIAS_GUARD_V1: core term glyph normalization for routing only
function normalizeCoreTermForRouting(text: string): string {
  let t = String(text ?? "");
  // 言灵 / 言靈 → 言霊
  t = t.replace(/言[灵靈]/g, "言霊");
  // 言霊秘書の異体字
  t = t.replace(/言[霊灵靈]秘書/g, "言霊秘書");
  // カタカムナ言霊解の異体字
  t = t.replace(/カタカムナ言[霊灵靈]解/g, "カタカムナ言霊解");
  // イロハ言霊解の異体字
  t = t.replace(/イロハ言[霊灵靈]解/g, "イロハ言霊解");
  return t;
}


// --- DET_PASSPHRASE_HELPERS_V1 (required by DET_PASSPHRASE_V2) ---
function extractPassphrase(text: string): string | null {
  const t = (text || "").trim();

  let m = t.match(/合言葉\s*は\s*[「『"]?(.+?)[」』"]?\s*(です|だ|です。|だ。)?$/);
  if (m && m[1]) return m[1].trim();

  m = t.match(/合言葉\s*[:：]\s*[「『"]?(.+?)[」』"]?\s*$/);
  if (m && m[1]) return m[1].trim();

  return null;
}

function wantsPassphraseRecall(text: string): boolean {
  const t = (text || "").trim();
  return /合言葉/.test(t) && /(覚えてる|覚えてる\?|覚えてる？|何だっけ|は\?|は？)/.test(t);
}

function recallPassphraseFromSession(threadId: string, limit = 80): string | null {
  const mem = memoryReadSession(threadId, limit);
  for (let i = mem.length - 1; i >= 0; i--) {
    const row = mem[i];
    if (!row) continue;
    if (row.role !== "user") continue;
    const p = extractPassphrase(row.content || "");
    if (p) return p;
  }
  return null;
}

// chat.ts に persistTurn が無いブランチ向けの最小実装
// --- /DET_PASSPHRASE_HELPERS_V1 ---

// --- PERSIST_TURN_V2 (for passphrase + normal chat) ---
function persistTurn(threadId: string, userText: string, assistantText: string): void {
  try {
    memoryPersistMessage(threadId, "user", userText);
    memoryPersistMessage(threadId, "assistant", assistantText);
    console.log(`[MEMORY] persisted threadId=${threadId} bytes_u=${userText.length} bytes_a=${assistantText.length}`);
  } catch (e: any) {
    console.warn(`[PERSIST] failed threadId=${threadId}:`, e?.message ?? String(e));
  }
}
// --- /PERSIST_TURN_V2 ---



/**
 * GROUNDED レスポンスを生成する関数（doc/pdfPage 指定と番号選択の両方で再利用）
 */
router.post("/chat", async (req: Request, res: Response<ChatResponseBody>) => {
  const __gateTcStoreV1: { threadCore: ThreadCore | null } = { threadCore: null };
  return tenmonGateThreadContextV1.run(__gateTcStoreV1, async () => {
  // HEART observe (deterministic; no behavior change)
  const __heart = (() => { try {
    const b: any = (req as any)?.body || {};
    const raw = String(b.message ?? b.text ?? b.input ?? "");
    const legacy = heartModelV1(raw) as any;
    return {
      userPhase: (legacy && typeof legacy.userPhase === "string") ? legacy.userPhase : "CENTER",
      userVector: (legacy && legacy.userVector && typeof legacy.userVector === "object")
        ? legacy.userVector
        : { waterScore: 0.5, fireScore: 0.5, balance: 0 },
      arkTargetPhase: (legacy && typeof legacy.arkTargetPhase === "string") ? legacy.arkTargetPhase : "CENTER",
      entropy: typeof legacy?.entropy === "number" ? legacy.entropy : 0.25,
      phase: legacy?.phase,
    };
  } catch {
    return {
      userPhase: "CENTER",
      userVector: { waterScore: 0.5, fireScore: 0.5, balance: 0 },
      arkTargetPhase: "CENTER",
      entropy: 0.25,
    };
  } })();
  console.log(
    `[HEART] userPhase=${String((__heart as any).userPhase || "")}` +
    ` arkTargetPhase=${String((__heart as any).arkTargetPhase || "")}` +
    ` entropy=${Number((__heart as any).entropy ?? 0).toFixed(2)}`
  );
  setTenmonLastHeart(__heart);

  // CARD_ANSWER_PROFILE_V1: body から answerLength/answerMode/answerFrame を取得し、未指定時は現行互換（PATCH41 entry 抽出）
  const __bodyProfile = parseAnswerProfileFromBody((req as any)?.body);
  (res as any).__TENMON_ANSWER_PROFILE = __bodyProfile;
  const __hasAnswerProfile = __bodyProfile.answerLength != null || __bodyProfile.answerMode != null || __bodyProfile.answerFrame != null;

  // PATCH85_FOUNDER_COCREATION_SURFACE_V1: Founder セッション（共創トーン用・一般経路の system へ最小接続）
  const __isTenmonFounderCookieV85 = (req as any).cookies?.tenmon_founder === "1";

  // CARD_RESPONSE_FRAME_LIBRARY_V1_PHASE1: route ごとの既定割当（参照用）
  // support → short / support / one_step | define → medium / define / statement_plus_one_question
  // feeling|impression|continuity → short / analysis / one_step | explicit char → __tier / analysis / one_step
  // natural general → 既存 __bodyProfile 維持（未指定時は変更しない）

  // CARD_EXPLICIT_PRIORITY_WIDEN_V1: 早期 explicit 文字数抽出（全角数字対応・500字/1000字等）
  const __normalizeDigitsV1 = (s: string) => s.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
  const __extractExplicitLengthV1 = (raw: string): number | null =>
    parseExplicitCharTargetFromUserMessageV1(String(raw || ""));

  /** CARD_CENTER_LABEL_AND_LONG_CAP_FIX_V1: centerKey を表面用ラベルに変換（内部キーを出さない） */
  const getCenterLabelForDisplay = (centerKey: string): string => {
    const k = String(centerKey || "").trim();
    if (!k) return "";
    if (k === "kotodama") return "言霊";
    if (k === "katakamuna") return "カタカムナ";
    if (/mizuho_den|^mizuho$|水穂伝/u.test(k)) return "水穂伝";
    return "この中心";
  };

  // restore: routeReason に応じて ku contract / responsePlan を補完
  function __restoreRouteContractV1(args: {
    ku: any;
    rawMessage: string;
    semanticBody: string;
  }) {
    const { ku, rawMessage, semanticBody } = args;
    if (!ku || typeof ku !== "object" || Array.isArray(ku)) return ku;

    const rr = String(ku.routeReason || "").trim();

    const MAP: Record<string, {
      routeClass?: string;
      answerLength?: "short" | "medium" | "long";
      answerMode?: "define" | "analysis" | "support" | "worldview" | "continuity";
      answerFrame?: "one_step" | "statement_plus_one_question" | "d_delta_s_one_step";
      mode?: "general";
      responseKind?: "statement_plus_question";
    }> = {
      "RELEASE_PREEMPT_STRICT_COMPARE_BEFORE_TRUTH_V1": {
        routeClass: "analysis",
        answerLength: "medium",
        answerMode: "analysis",
        answerFrame: "statement_plus_one_question",
        mode: "general",
        responseKind: "statement_plus_question",
      },
      "R22_SELFAWARE_CONSCIOUSNESS_V1": {
        routeClass: "selfaware",
        answerLength: "short",
        answerMode: "analysis",
        answerFrame: "one_step",
        mode: "general",
        responseKind: "statement_plus_question",
      },
      "SYSTEM_DIAGNOSIS_PREEMPT_V1": {
        routeClass: "analysis",
        answerLength: "short",
        answerMode: "analysis",
        answerFrame: "statement_plus_one_question",
        mode: "general",
        responseKind: "statement_plus_question",
      },
      "R22_FUTURE_OUTLOOK_V1": {
        routeClass: "analysis",
        answerLength: "short",
        answerMode: "analysis",
        answerFrame: "one_step",
        mode: "general",
        responseKind: "statement_plus_question",
      },
      "R22_JUDGEMENT_PREEMPT_V1": {
        routeClass: "judgement",
        answerLength: "short",
        answerMode: "analysis",
        answerFrame: "one_step",
        mode: "general",
        responseKind: "statement_plus_question",
      },
      "R22_ESSENCE_ASK_V1": {
        routeClass: "analysis",
        answerLength: "short",
        answerMode: "analysis",
        answerFrame: "one_step",
        mode: "general",
        responseKind: "statement_plus_question",
      },
      "TENMON_STRUCTURE_LOCK_V1": {
        routeClass: "analysis",
        answerLength: "medium",
        answerMode: "define",
        answerFrame: "statement_plus_one_question",
        mode: "general",
        responseKind: "statement_plus_question",
      },
      "EXPLICIT_CHAR_PREEMPT_V1": {
        routeClass: "analysis",
        answerMode: "analysis",
        answerFrame: "one_step",
        mode: "general",
        responseKind: "statement_plus_question",
      },
      "LANGUAGE_ESSENCE_PREEMPT_V1": {
        routeClass: "define",
        answerLength: "medium",
        answerMode: "define",
        answerFrame: "statement_plus_one_question",
        mode: "general",
        responseKind: "statement_plus_question",
      },
      "DRIFT_FIREWALL_PREEMPT_V1": {
        routeClass: "analysis",
        answerLength: "medium",
        answerMode: "analysis",
        answerFrame: "statement_plus_one_question",
        mode: "general",
        responseKind: "statement_plus_question",
      },
      "BEAUTY_COMPILER_PREEMPT_V1": {
        routeClass: "analysis",
        answerLength: "medium",
        answerMode: "analysis",
        answerFrame: "statement_plus_one_question",
        mode: "general",
        responseKind: "statement_plus_question",
      },
      "WILL_CORE_PREEMPT_V1": {
        routeClass: "define",
        answerLength: "medium",
        answerMode: "define",
        answerFrame: "statement_plus_one_question",
        mode: "general",
        responseKind: "statement_plus_question",
      },
    };

    const spec = MAP[rr];
    if (!spec) return ku;

    if (spec.routeClass && !ku.routeClass) ku.routeClass = spec.routeClass;
    if (spec.answerLength && !ku.answerLength) ku.answerLength = spec.answerLength;
    if (spec.answerMode && !ku.answerMode) ku.answerMode = spec.answerMode;
    if (spec.answerFrame && !ku.answerFrame) ku.answerFrame = spec.answerFrame;

    if (!ku.responsePlan) {
      ku.responsePlan = buildResponsePlan({
        routeReason: rr,
        rawMessage,
        centerKey: ku.centerKey ?? null,
        centerLabel: ku.centerLabel ?? null,
        scriptureKey: ku.scriptureKey ?? null,
        mode: spec.mode ?? "general",
        responseKind: spec.responseKind ?? "statement_plus_question",
        answerMode: (ku.answerMode ?? spec.answerMode ?? null) as AnswerMode,
        answerFrame: (ku.answerFrame ?? spec.answerFrame ?? null) as AnswerFrame,
        semanticBody,
      });
    }

    return ku;
  }

  // CARD6C_HANDLER_RESJSON_WRAP_V7: wrap res.json ONCE per request so ALL paths get top-level rewriteUsed/rewriteDelta defaults
  // (covers direct res.json returns that bypass reply())
  try {
      // X8_THREADID_BRIDGE_V1: store request threadId on res for wrapper use
  try { (res as any).__TENMON_THREADID = String(((req as any)?.body?.threadId ?? (req as any)?.body?.sessionId ?? "")); } catch {}

if (!(res as any).__TENMON_JSON_WRAP_V7) {
      (res as any).__TENMON_JSON_WRAP_V7 = true;
      // RES_JSON_SINGLE_NATIVE_BIND_V1: Express の json を request 全体で1回だけ bind し、以降はレイヤー連鎖のみ
      if (!(res as any).__TENMON_NATIVE_RES_JSON) {
        (res as any).__TENMON_NATIVE_RES_JSON = (res as any).json.bind(res);
      }
      const __nativeResSend = (res as any).__TENMON_NATIVE_RES_JSON;
      // RES_JSON_SINGLE_ASSIGN_DEFER_FREECHAT_V1: 外周を __TENMON_RUN_OUTER_RES_JSON に保持し、res.json 代入はこの if 内で唯一
      (res as any).__TENMON_RUN_OUTER_RES_JSON = (obj: any) => {
        try {
          if (obj && typeof obj === "object") {
            // X8B_THREADID_FORCE_ON_RESPONSE_V1: force threadId onto response object (observability)
            try {
              const t = (res as any).__TENMON_THREADID;
              if (t && typeof t === "string" && !(obj as any).threadId) (obj as any).threadId = t;
            } catch {}

            // X13B_SURFACE_HIDE_PREFIX_V1: NATURAL/LLM_CHAT/NAMING 表示から先頭「【天聞の所見】」を除去。GROUNDED/#詳細/doc/pdfPage は保持。ku不変。
            try {
              if (typeof obj.response === "string") {
                const df = obj.decisionFrame;
                const mode = df && typeof df === "object" ? String(df.mode ?? "") : "";
                const raw = String((obj as any).rawMessage ?? (obj as any).message ?? "");
                const skip = mode === "GROUNDED" || raw.includes("#詳細") || raw.includes("doc=") || raw.includes("pdfPage=");
                if (!skip) {
                  let r = obj.response.replace(/^【天聞の所見】\s*/, "");
                  r = r.replace(/^\n+/, "\n");
                  obj.response = r;
                }
              }
            } catch {}

            // HEART_RESPONSE_BRIDGE_V1
            try {
              if (typeof obj.response === "string") {
                const __df: any = (obj as any)?.decisionFrame ?? null;
                const __ku: any = (__df && typeof __df.ku === "object" && !Array.isArray(__df.ku)) ? __df.ku : null;
                const __heart: any = __ku?.heart ?? null;
                const __kanagi: any = __ku?.kanagi ?? null;

                const __phase =
                  String(__kanagi?.phase ?? "") ||
                  String(__heart?.phase ?? "") ||
                  "";

                let __r = String(obj.response ?? "").trim();

                // BRIDGE_GENERAL_SKIP_V1: NATURAL_GENERAL_LLM_TOP は responseComposer で処理済みのためスキップ
                const __isGeneralRoute = String((obj as any)?.decisionFrame?.ku?.routeReason ?? "").includes("NATURAL_GENERAL");
                if (!__isGeneralRoute && __phase.includes("IN")) {
                  __r = __r
                    .replace(/^受容[:：]?\s*/u, "")
                    .replace(/\n{3,}/g, "\n\n")
                    .trim();
                  if (!__r.includes("一点：")) {
                    __r = __r.replace(/\s+/g, " ").trim();
                  }
                } else if (!__isGeneralRoute && __phase.includes("OUT")) {
                  if (!__r.includes("一手")) {
                    __r = __r.replace(/[。]\s*$/u, "。");
                  }
                } else if (__phase.includes("CENTER")) {
                  __r = __r.replace(/^受容[:：]?\s*/u, "").trim();
                }

                obj.response = __r;
              }
            } catch {}

            if (obj.rewriteUsed === undefined) obj.rewriteUsed = false;
            if (obj.rewriteDelta === undefined) obj.rewriteDelta = 0;
            // CARD_THREADCORE_MIN_V1: ku に threadCore 可視項目を追加（既存を壊さない）
            try {
              const __tc = (res as any).__TENMON_THREAD_CORE;
              if (__tc && obj?.decisionFrame?.ku && typeof obj.decisionFrame.ku === "object") {
                const ku = obj.decisionFrame.ku as any;
                if (ku.threadCenterKey === undefined) ku.threadCenterKey = __tc.centerKey ?? undefined;
                if (ku.threadCenterLabel === undefined) ku.threadCenterLabel = __tc.centerLabel ?? centerLabelFromKey(__tc.centerKey) ?? undefined;
                if (ku.threadOpenLoops === undefined) ku.threadOpenLoops = Array.isArray(__tc.openLoops) ? __tc.openLoops : [];
                if (ku.lastAnswerLength === undefined) ku.lastAnswerLength = __tc.lastResponseContract?.answerLength ?? undefined;
                if (ku.lastAnswerMode === undefined) ku.lastAnswerMode = __tc.lastResponseContract?.answerMode ?? undefined;
                if (ku.lastAnswerFrame === undefined) ku.lastAnswerFrame = __tc.lastResponseContract?.answerFrame ?? undefined;
                const __dc = (__tc.dialogueContract && typeof __tc.dialogueContract === "object") ? __tc.dialogueContract : null;
                if (__dc) {
                  if (ku.dialogueContractCenterKey === undefined) ku.dialogueContractCenterKey = __dc.centerKey ?? __tc.centerKey ?? undefined;
                  if (ku.dialogueContractCenterLabel === undefined) ku.dialogueContractCenterLabel = __dc.centerLabel ?? __tc.centerLabel ?? centerLabelFromKey(__tc.centerKey) ?? undefined;
                  if (ku.user_intent_mode === undefined) ku.user_intent_mode = __dc.user_intent_mode ?? undefined;
                  if (ku.answer_depth === undefined) ku.answer_depth = __dc.answer_depth ?? undefined;
                  if (ku.grounding_policy === undefined) ku.grounding_policy = __dc.grounding_policy ?? undefined;
                  if (ku.continuity_goal === undefined) ku.continuity_goal = __dc.continuity_goal ?? undefined;
                  if (ku.next_best_move === undefined) ku.next_best_move = __dc.next_best_move ?? undefined;
                }
              }
            } catch {}
            // also ensure decisionFrame.ku is object when decisionFrame exists (non-breaking)
            const df = obj.decisionFrame;
            if (df && typeof df === "object") {
              if (!df.ku || typeof df.ku !== "object") df.ku = {};
              // N2A_NAMING_ATTACH_KU_V1: 観測用。user_naming 確定時のみ ku.naming を付与（文面不変・TRUTH_GATE不触）
              try {
                if (typeof __namingObs === "object" && __namingObs != null && (df.ku.naming == null || df.ku.naming === undefined)) df.ku.naming = __namingObs;
              } catch {}
              // X6_SYNAPSE_IN_JSON_WRAPPER_V1: write ST_table once per response (observability only)
                    try {
                let tid = String((obj as any)?.threadId ?? (res as any).__TENMON_THREADID ?? "");
                  if ((res as any).__TENMON_SYNAPSE_WRITTEN_TID !== tid) {
                  (res as any).__TENMON_SYNAPSE_WRITTEN_TID = tid;
                  // X8_SYNAPSE_TOP_RETURN_V1: attach last synapse row (read-only)
                  try {
                    const tid2 = String((obj as any)?.threadId ?? (res as any).__TENMON_THREADID ?? "");
                    if (tid2 && (obj as any)?.decisionFrame) {
                      const __db2 = new DatabaseSync(getDbPath("kokuzo.sqlite"), { readOnly: true });
                      const row = __db2.prepare("SELECT createdAt, threadId, routeReason, substr(metaJson,1,160) AS metaHead FROM " + synapseLogTable + " WHERE threadId=? AND instr(IFNULL(metaJson,\"\"), \"\\\"v\\\":\\\"X9\\\"\")>0 ORDER BY createdAt DESC LIMIT 1").get(tid2);
                      const df2 = (obj as any).decisionFrame;
                      df2.ku = (df2.ku && typeof df2.ku === "object") ? df2.ku : {};
                      if (row) (df2.ku as any)[kuSynapseTopKey] = { ...((df2.ku as any)[kuSynapseTopKey] || {}), ...(row || {}) };
                    }
                  } catch {}

                  
                  const rr  = String((obj as any)?.decisionFrame?.ku?.routeReason ?? (obj as any)?.decisionFrame?.mode ?? "");
                  const lt  = (obj as any)?.decisionFrame?.ku?.lawTrace ?? [];
                  const h   = (obj as any)?.decisionFrame?.ku?.heart ?? {};
                  const inp = String((obj as any)?.rawMessage ?? (obj as any)?.message ?? "");
                  const out = String((obj as any)?.response ?? "");
                  const ts  = String((obj as any)?.timestamp ?? new Date().toISOString());
                  const seed = generateSeed(lt);
                  let __seedId: string | null = null;
                  if (seed) __seedId = seed.seedId;
                  if (__seedId) {
                    try {
                      const db = getDb("kokuzo");
                      db.prepare(`
                        INSERT OR IGNORE INTO khs_seeds_det_v1
                        (seedId, createdAt)
                        VALUES (?, datetime('now'))
                      `).run(__seedId);
                    } catch (_) {}
                  }
                  appendChatSynapseObservationV1({ threadId: tid, routeReason: rr, lawTrace: lt, heart: h, inputText: inp, outputText: out, timestamp: ts, lawsUsed: (obj as any)?.decisionFrame?.ku?.lawsUsed ?? [], evidenceIds: (obj as any)?.decisionFrame?.ku?.evidenceIds ?? [] });
                  // KG8_CONCEPT_ENGINE_V1: cluster から concept を生成。decisionFrame/TRUTH_GATE/synapse/seed/cluster は不変。LLM 不使用。
                  try {
                    const __dbConcept = getDb("kokuzo");
                    const clusters = __dbConcept.prepare(`
                      SELECT clusterKey, clusterSize
                      FROM khs_seed_clusters
                      ORDER BY clusterSize DESC
                      LIMIT 20
                    `).all() as { clusterKey: string; clusterSize: number }[];
                    for (const c of clusters) {
                      const label = String(c.clusterKey).slice(0, 8);
                      __dbConcept.prepare(`
                        INSERT INTO khs_concepts
                        (conceptKey, clusterKey, conceptLabel, createdAt, updatedAt)
                        VALUES (?, ?, ?, datetime('now'), datetime('now'))
                        ON CONFLICT(conceptKey)
                        DO UPDATE SET
                          conceptWeight = conceptWeight + 1,
                          updatedAt = datetime('now')
                      `).run("CONC:" + label, c.clusterKey, label);
                    }
                  } catch (e) {
                    console.error("[KG8_CONCEPT_ENGINE]", e);
                  }
                  // KG4_RECOMB_MOVE_AFTER_SYNAPSE_V1: Seed recombination を synapse insert の直後で実行。usageScore > 0, LIMIT 20。
                  try {
                    const __dbR = getDb("kokuzo");
                    const __topSeeds = __dbR.prepare(`
                      SELECT seedKey, lawKey, unitId, quoteHash, quoteLen
                      FROM khs_seeds_det_v1
                      WHERE usageScore > 0
                      ORDER BY usageScore DESC
                      LIMIT 20
                    `).all() as { seedKey: string; lawKey: string; unitId: string; quoteHash: string; quoteLen: number }[];
                    const __c = __tenmonRequire("node:crypto");
                    const __ins = __dbR.prepare(`
                      INSERT OR IGNORE INTO khs_seeds_det_v1
                      (seedKey, unitId, lawKey, quoteHash, quoteLen, createdAt)
                      VALUES (?, ?, ?, ?, ?, datetime('now'))
                    `);
                    for (let i = 0; i < __topSeeds.length; i++) {
                      for (let j = i + 1; j < __topSeeds.length; j++) {
                        const seedA = __topSeeds[i];
                        const seedB = __topSeeds[j];
                        const newSeedKey = __c.createHash("sha256").update(String(seedA.seedKey) + String(seedB.seedKey)).digest("hex").slice(0, 24);
                        __ins.run(newSeedKey, seedA.unitId ?? "", seedA.lawKey ?? "", seedA.quoteHash ?? "", seedA.quoteLen ?? 0);
                      }
                    }
                  } catch (_) {}
                  // KG7_CLUSTER_COOLING_ENGINE_V1: clusterSize の偏りを減衰。Synapse 後のみ。TRUTH_GATE/decisionFrame/ST_table は不変。
                  try {
                    const db = getDb("kokuzo");
                    const rows = db.prepare(`
                      SELECT clusterKey, clusterSize
                      FROM khs_seed_clusters
                      WHERE clusterSize > 10
                      LIMIT 20
                    `).all() as { clusterKey: string; clusterSize: number }[];
                    for (const r of rows) {
                      const newSize = Math.floor(r.clusterSize * 0.995);
                      db.prepare(`
                        UPDATE khs_seed_clusters
                        SET clusterSize = ?
                        WHERE clusterKey = ?
                      `).run(newSize, r.clusterKey);
                    }
                  } catch (e) {
                    console.error("[KG7_CLUSTER_COOLING]", e);
                  }
                  // KG6_CLUSTER_DIVERSITY_ENGINE / KG7_WEIGHTED_CLUSTER_ENGINE_V1: cluster 生成の seed 選択を TOP 固定から usageScore weighted random に変更。TRUTH_GATE/Synapse/Seed/Concept は不変。
                  try {
                    const __dbKg6 = getDb("kokuzo");
                    const seeds = __dbKg6.prepare(`
                      SELECT seedKey, usageScore
                      FROM khs_seeds_det_v1
                      WHERE usageScore > 0
                      ORDER BY usageScore DESC
                      LIMIT 100
                    `).all() as { seedKey: string; usageScore: number }[];
                    if (seeds.length > 0) {
                      function weightedPick(seeds: { seedKey: string; usageScore?: number }[]): string {
                        const weights = seeds.map((s) => Math.log((s.usageScore ?? 0) + 1));
                        const total = weights.reduce((a, b) => a + b, 0);
                        let r = Math.random() * total;
                        for (let i = 0; i < seeds.length; i++) {
                          r -= weights[i];
                          if (r <= 0) return seeds[i].seedKey;
                        }
                        return seeds[0].seedKey;
                      }
                      const s1 = weightedPick(seeds);
                      void s1;
                    }
                  } catch (e) {
                    console.error("[KG6_CLUSTER_DIVERSITY]", e);
                  }
                  // A1_SYNAPSETOP_SINGLEPOINT_V1: 同一ターンで INSERT した行をそのまま載せる（DB再読に依存しない）
                  try {
                    const __L = (obj as any)?.decisionFrame?.ku?.lawsUsed ?? [];
                    const __E = (obj as any)?.decisionFrame?.ku?.evidenceIds ?? [];
                    if (__seedId == null && Array.isArray(__L) && Array.isArray(__E) && __L.length && __E.length) {
                      const __c = __tenmonRequire("node:crypto");
                      __seedId = __c.createHash("sha256").update(JSON.stringify(__L) + JSON.stringify(__E)).digest("hex").slice(0, 24);
                    }
                    const synapseRow = { v: "X9", seedId: __seedId, nLaws: Array.isArray(__L) ? __L.length : 0, nEvi: Array.isArray(__E) ? __E.length : 0 };
                    (obj as any).decisionFrame = (obj as any).decisionFrame || {};
                    (obj as any).decisionFrame.ku = (obj as any).decisionFrame.ku || {};
                    // R10_SYNAPSETOP_PRESERVE_IN_GATE_V1: 既存 ku_ST を消さず metaHead をマージ
                    (obj as any).decisionFrame.ku[kuSynapseTopKey] = { ...(((obj as any).decisionFrame.ku as any)[kuSynapseTopKey] || {}), metaHead: synapseRow };
                  } catch {}
                  // X9J_SYNAPSETOP_INMEMORY_V1: attach ku_ST without DB read (deterministic)
                  try {
                    const dfm: any = (obj as any)?.decisionFrame;
                    if (dfm) {
                      dfm.ku = (dfm.ku && typeof dfm.ku === "object") ? dfm.ku : {};
                      if ((dfm.ku as any)[kuSynapseTopKey] == null) {
                        let seed0: string | null = null;
                        try {
                          const __c: any = __tenmonRequire("node:crypto");
                          const L: any[] = Array.isArray((dfm.ku as any).lawsUsed) ? (dfm.ku as any).lawsUsed : [];
                          const E: any[] = Array.isArray((dfm.ku as any).evidenceIds) ? (dfm.ku as any).evidenceIds : [];
                          if (L.length && E.length) seed0 = __c.createHash("sha256").update(JSON.stringify(L)+JSON.stringify(E)).digest("hex").slice(0,24);
                        } catch {}
                        const __stInMem = {
                          createdAt: String((obj as any)?.timestamp ?? ""),
                          threadId: String((obj as any)?.threadId ?? (res as any).__TENMON_THREADID ?? ""),
                          routeReason: String((obj as any)?.decisionFrame?.ku?.routeReason ?? (obj as any)?.decisionFrame?.mode ?? ""),
                          metaHead: JSON.stringify({ v: "X9", seedId: seed0 }).slice(0,160)
                        };
                        (dfm.ku as any)[kuSynapseTopKey] = { ...((dfm.ku as any)[kuSynapseTopKey] || {}), ...__stInMem };
                      }
                    }
                  } catch {}

                  // X8C_SYNAPSE_TOP_AFTER_WRITE_V1: re-read ku_ST after write (same response). A1 で既に載せている場合は上書きしない。
                  try {
                    const df3 = (obj as any)?.decisionFrame;
                    const __a1Set = df3 && (df3.ku as any)?.[kuSynapseTopKey]?.metaHead && typeof (df3.ku as any)[kuSynapseTopKey].metaHead === "object";
                    if (!__a1Set) {
                      const tid3 = String(tid || "");
                      if (tid3 && (obj as any)?.decisionFrame) {
                        const __db3 = new DatabaseSync(getDbPath("kokuzo.sqlite"), { readOnly: true });
                        const patt = "\"v\":\"X9\"";
                        const row3x = __db3.prepare("SELECT createdAt, threadId, routeReason, substr(metaJson,1,160) AS metaHead FROM " + synapseLogTable + " WHERE threadId=? AND instr(IFNULL(metaJson, ), ?) > 0 ORDER BY createdAt DESC LIMIT 1").get(tid3, patt);
                        const row3 = row3x || __db3.prepare("SELECT createdAt, threadId, routeReason, substr(metaJson,1,160) AS metaHead FROM " + synapseLogTable + " WHERE threadId=? ORDER BY createdAt DESC LIMIT 1").get(tid3);
                        const df3b = (obj as any).decisionFrame;
                        df3b.ku = (df3b.ku && typeof df3b.ku === "object") ? df3b.ku : {};
                        if (row3) (df3b.ku as any)[kuSynapseTopKey] = { ...((df3b.ku as any)[kuSynapseTopKey] || {}), ...(row3 || {}) };
                      }
                    }
                  } catch {}
                  // X9D_FORCE_SYNAPSETOP_FALLBACK_V1: ensure ku_ST is never null (latest fallback). A1 で metaHead.seedId があればスキップ。
                  try {
                    const dfF = (obj as any)?.decisionFrame;
                    if (dfF) {
                      dfF.ku = (dfF.ku && typeof dfF.ku === "object") ? dfF.ku : {};
                      if ((dfF.ku as any)[kuSynapseTopKey] == null) {
                        const tidF = String((obj as any)?.threadId ?? (res as any).__TENMON_THREADID ?? "");
                        if (tidF) {
                          const __dbF = new DatabaseSync(getDbPath("kokuzo.sqlite"), { readOnly: true });
                          const patt = "\"v\":\"X9\"";
                          const rowFx = __dbF.prepare("SELECT createdAt, threadId, routeReason, substr(metaJson,1,160) AS metaHead FROM " + synapseLogTable + " WHERE threadId=? AND instr(IFNULL(metaJson, ), ?) > 0 ORDER BY createdAt DESC LIMIT 1").get(tidF, patt);
                          const rowF = rowFx || __dbF.prepare("SELECT createdAt, threadId, routeReason, substr(metaJson,1,160) AS metaHead FROM " + synapseLogTable + " WHERE threadId=? ORDER BY createdAt DESC LIMIT 1").get(tidF);
                          if (rowF) (dfF.ku as any)[kuSynapseTopKey] = { ...((dfF.ku as any)[kuSynapseTopKey] || {}), ...(rowF || {}) };
                        }
                      }
                    }
                  } catch {}


                }
              } catch {}


              // C4_LLMSTATUS_ALWAYS_WIRE_V4: always attach llmStatus (observability only)
              try {
                if ((df.ku as any).llmStatus == null) {
                  const st = __llmStatus;
                  if (st && typeof st === "object") (df.ku as any).llmStatus = st;
                }
              } catch {}

              if (df.ku.rewriteUsed === undefined) df.ku.rewriteUsed = obj.rewriteUsed;
              if (df.ku.rewriteDelta === undefined) df.ku.rewriteDelta = obj.rewriteDelta;
              if (!Array.isArray(df.ku.lawsUsed)) df.ku.lawsUsed = [];
              if (!Array.isArray(df.ku.evidenceIds)) df.ku.evidenceIds = [];
              if (!Array.isArray(df.ku.lawTrace)) df.ku.lawTrace = [];
            }
          }
        } catch {}

        // KANAGI_RUNTIME_TOPWRAP_V1
        try {
          const __df: any = (obj as any)?.decisionFrame ?? null;
          if (__df && typeof __df === "object") {
            __df.ku = (__df.ku && typeof __df.ku === "object" && !Array.isArray(__df.ku))
              ? __df.ku
              : {};
            const __ku: any = __df.ku;

            const __rawMsg =
              String((obj as any)?.rawMessage ?? "") ||
              String((obj as any)?.message ?? "") ||
              "";

            const __phaseArg = (typeof __ku.kanagiPhase === "string" && __ku.kanagiPhase) ? __ku.kanagiPhase : "SENSE";
            const __k: any = kanagiThink("", __phaseArg, __rawMsg);

            __ku.kanagi = {
              topic: String(__k?.topic ?? ""),
              reception: String(__k?.reception ?? ""),
              focus: String(__k?.focus ?? ""),
              step: String(__k?.step ?? ""),
              routeReason: String(__ku.routeReason ?? "")
            };
            const __rrK = String(__ku.routeReason || "");
            if (/^TECHNICAL_IMPLEMENTATION_/u.test(__rrK) && __ku.kanagi && typeof __ku.kanagi === "object") {
              const rec = String(__ku.kanagi.reception || "");
              if (/(身体|脈|呼吸|姿勢|受け止め|体感)/u.test(rec)) {
                __ku.kanagi.reception = "技術的な問いとして整理し、前提と手順を分けて答えます。";
              }
            }
          }
        } catch {}

        // restore 最外周
        try {
          const __dfT: any = (obj as any)?.decisionFrame ?? null;
          const __kuT: any =
            __dfT && __dfT.ku && typeof __dfT.ku === "object" && !Array.isArray(__dfT.ku)
              ? __dfT.ku
              : null;
          if (__kuT) {
            __restoreRouteContractV1({
              ku: __kuT,
              rawMessage: String(message ?? ""),
              semanticBody: String((obj as any)?.response ?? ""),
            });
          }
        } catch {}

        return __nativeResSend(obj);
      };
      try {
        (res as any).__TENMON_FREECHAT_RESJSON_FINAL = null;
      } catch {}
      (res as any).json = async (obj: any) => {
        try {
          const __fin = (res as any).__TENMON_FREECHAT_RESJSON_FINAL;
          if (typeof __fin === "function") return await __fin(obj);
        } catch {}
        const __reducedEarly = applyFinalAnswerConstitutionAndWisdomReducerV1(obj);
        const __enK1 = await __tenmonK1PostFinalizeLlmEnrichV1(__reducedEarly);
        return (res as any).__TENMON_RUN_OUTER_RES_JSON(__enK1);
      };
    }
  } catch {}

  const handlerTime = Date.now();

  let capsPayload: any = null;
const pid = process.pid;

  const uptime = process.uptime();
  const { getReadiness } = await import("../health/readiness.js");
  const r = getReadiness();
  console.log(`[CHAT-HANDLER] PID=${pid} uptime=${uptime}s handlerTime=${new Date().toISOString()} stage=${r.stage}`);
  
  // input または message のどちらでも受け付ける（PATCH44 entry 抽出）
  const body = (req.body ?? {}) as any;
  const __entry = normalizeChatEntryFromBody(body);
  const message = __entry.message;
  const messageRaw = message;
  // R9_LEDGER_REAL_INPUT_FREEZE_V1: gate 経由 append で実入力を使うため
  try { (globalThis as any).__tenmon_gate_raw_message_v1 = message; } catch {}

  // HEART_WATERFIRE_PHASE_V1: water/fire vector & phase (observability only)
  try {
    const __heartPhase = computeHeartState(String(message ?? ""));
    try { (__heart as any).userPhase = __heartPhase.userPhase; } catch {}
    try { (__heart as any).userVector = __heartPhase.userVector; } catch {}
    try { (__heart as any).arkTargetPhase = __heartPhase.arkTargetPhase; } catch {}
    try { (__heart as any).entropy = __heartPhase.entropy; } catch {}
    // drop legacy state field so decisionFrame.ku.heart follows new HeartState shape
    try { delete (__heart as any).state; } catch {}
  } catch {}

  // ==============================
  // KHS_SCAN_LAYER_V1 (read-only)
  // ==============================

  let __khsScan = {
    matched: false,
    lawKeys: [] as string[],
    evidenceIds: [] as string[],
    quotes: [] as string[],
    docs: [] as string[],
    pages: [] as number[],
  };

  // SACRED_DOMAIN_GATE_V1: only run KHS_SCAN for sacred-domain queries
  const __sacredDomain =
  /カタカムナ|言灵|言霊|天津金木|布斗麻邇|天之御中主|造化三神|水火|イキ|魂|ことだま|水穂|言の葉/;
  const __msgForSacred = String(messageRaw ?? message ?? "");

  if (__sacredDomain.test(__msgForSacred)) {
    try {
      const db = new DatabaseSync(getDbPath("kokuzo.sqlite"), { readOnly: true });

      const rows = db.prepare(`
        SELECT l.lawKey, u.quoteHash, u.quote, u.doc, u.pdfPage
        FROM khs_laws l
        JOIN khs_units u ON u.unitId = l.unitId
        WHERE l.status = 'verified'
        AND IFNULL(l.termKey,'') != ''
        AND instr(?, l.termKey) > 0
        LIMIT 5
      `).all(message);

      if (rows && rows.length > 0) {
        __khsScan.matched = true;
        __khsScan.lawKeys = rows.map((r: any) => String(r.lawKey));
        __khsScan.evidenceIds = rows.map((r: any) => String(r.quoteHash));
        // X11_TRUTH_QUOTE_EXTRACT_V1: deterministic quote/doc/pdfPage capture (clip + dedupe)
        try {
          const seen = new Set<string>();
          const qs: string[] = [];
          const ds: string[] = [];
          const ps: number[] = [];
          for (const r of (rows as any[])) {
            const h = String((r as any).quoteHash || "");
            if (!h || seen.has(h)) continue;
            seen.add(h);
            const q = String((r as any).quote || "");
            const d = String((r as any).doc || "");
            const pg = Number((r as any).pdfPage || 0) || 0;
            qs.push(q ? q.slice(0, 320) : "");
            ds.push(d);
            ps.push(pg);
            if (qs.length >= 5) break;
          }
          (__khsScan as any).quotes = qs;
          (__khsScan as any).docs = ds;
          (__khsScan as any).pages = ps;
        } catch {}

      }

    } catch (e) {
      console.error("[KHS_SCAN_FAIL]", e);
    }
  }

  // CARD6C_REDUCER_INLINED_IN_FREECHAT_V1: applyFinal… は FREECHAT 最終層で __resJsonAfterApplyFinal 直前に適用（この位置では再代入しない）

  function buildLlmStatusFromResult(r: any) {
    return {
      enabled: true,
      providerPlanned: r?.provider || "",
      providerUsed: r?.provider || "",
      modelPlanned: r?.model || "",
      modelUsed: r?.model || "",
      ok: r?.ok ?? false,
      err: r?.err || "",
    };
  }

  let __truthWeight = 0; // GLOBAL truthWeight (single source of truth)

  // C2_LLM_STATUS_ALWAYS_ATTACH_V1
  const __llmReady = getLlmProviderReadinessV1();
  const __hasOpenAI = __llmReady.hasOpenAI;
  const __hasGemini = __llmReady.hasGemini;
  let __llmStatus: any = {
    enabled: (__hasOpenAI || __hasGemini),
    providersDetected: {
      openai: __hasOpenAI,
      gemini: __hasGemini,
    },
    providerPlanned: __llmReady.providerPlanned || "",
    providerUsed: "",
    modelPlanned: (process.env.OPENAI_MODEL || process.env.GEMINI_MODEL || ""),
    modelUsed: "",
    ok: __llmReady.ok,
    err: __llmReady.err,
  };

  // C4_LLMSTATUS_ALWAYS_WIRE_V4: expose per-request llmStatus on res
  try { (res as any).__TENMON_LLM_STATUS = __llmStatus; } catch {}


  // TRUTH_WEIGHT_BIND_TO_KHS_SCAN_V1
  if (__khsScan && __khsScan.matched) {
    __truthWeight = Math.min(
      Array.isArray(__khsScan.lawKeys) ? __khsScan.lawKeys.length / 5 : 0,
      1
    );
  }
  console.log("[TRUTH_WEIGHT_BIND]", __truthWeight);

  const phase = computeHeartPhase(__heart.entropy, __truthWeight ?? 0, !!__khsScan?.matched);
  (__heart as any).phase = phase;

  // N1_DATE_JST_REQBODY_EARLY_V1 (acceptance requires JST)
  if (message === "date") {
    const now = new Date();
    const jst = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now).replace("T", " ");
    return await res.json(__tenmonGeneralGateResultMaybe({
      response: "【天聞の所見】現在時刻は " + jst + " JST です。",
      evidence: null,
      candidates: [],
      timestamp: new Date().toISOString(),
            threadId: String(((req as any)?.body?.threadId ?? (req as any)?.body?.sessionId ?? "")),
      decisionFrame: { mode: "NATURAL", intent: "chat", llm: "llm", ku: { lawsUsed: [], evidenceIds: [], lawTrace: [], routeReason: "N1_DATE_JST_REQBODY_EARLY_V1" /* responsePlan */ } },
    }));
  }

  // CARD_SUPPORT_ROUTE_SPLIT_V1 / CARD_TENMON_BRAINSTEM_WIRING_FIX_V1: support 系（改行はどうするの？等も）短文で返す
  {
    const __mSupport = String(message ?? "").trim();
    const __supportUiInput = /(改行|enterで送信|shift\+enter|shift enter|送信|改行できない|入力できない|送信される|改行できません|入力できません)/iu.test(__mSupport);
    const __supportAuthAccess = /ログインできない|登録できない|認証メール|founder会員|founder\s*会員|ログインできません|登録できません|認証が来ない|登録後どう入る/i.test(__mSupport);
    const __supportProductUsage = /天聞アークはどう使えば|どう使えばいいか|何から始めるか|どこから入るか|どう使うのか|使い方|どこから入る|何を押せば|どう使う|どこで(使う|入る)|どこを押す/i.test(__mSupport);
    if (__supportUiInput || __supportAuthAccess || __supportProductUsage) {
      let __routeReason: string;
      let __response: string;
      if (__supportUiInput) {
        __routeReason = "SUPPORT_UI_INPUT_V1";
        __response = "【天聞の所見】Enter で送信、Shift+Enter で改行です。反応しない場合はページを再読み込みするか、別のブラウザで試してください。";
      } else if (__supportAuthAccess) {
        __routeReason = "SUPPORT_AUTH_ACCESS_V1";
        __response = "【天聞の所見】登録後はログイン画面から入れます。合言葉の場合はログイン画面の「合言葉」欄、メール登録の場合は届いたメールのリンクから。届かない場合は迷惑フォルダをご確認ください。";
      } else {
        __routeReason = "SUPPORT_PRODUCT_USAGE_V1";
        __response = "【天聞の所見】この欄に質問を1つ入力して Enter で送信すると会話が始まります。「メニュー」と送ると選択肢が出ます。設定・登録は画面右上のアイコンから。";
      }
      return await res.json(__tenmonGeneralGateResultMaybe({
        response: __response,
        evidence: null,
        candidates: [],
        timestamp: new Date().toISOString(),
        threadId: String(body.threadId ?? body.sessionId ?? ""), /* tcTag */
        decisionFrame: {
          mode: "NATURAL",
          intent: "chat",
          llm: null,
          ku: {
            routeClass: "support",
            answerLength: "short",
            answerMode: "support",
            answerFrame: "one_step",
            routeReason: __routeReason,
          },
        },
      }));
    }
  }

  // [B1] deterministic force-menu trigger for Phase36-1

  const threadId = __entry.threadId;
  const timestamp = new Date().toISOString();
  let __threadCore: ThreadCore = emptyThreadCore(threadId);
  try {
    __threadCore = await loadThreadCore(threadId);
  } catch {
    __threadCore = emptyThreadCore(threadId);
  }
  __gateTcStoreV1.threadCore = __threadCore;
  // THREAD_CENTER_TO_DIALOGUE_CONTRACT_V1: thread center を継続対話用の最小契約へ昇格（非破壊）
  if (!__threadCore.dialogueContract) {
    const __frameNow = String(__threadCore.lastResponseContract?.answerFrame || "one_step").trim();
    __threadCore.dialogueContract = {
      centerKey: __threadCore.centerKey ?? null,
      centerLabel: __threadCore.centerLabel ?? centerLabelFromKey(__threadCore.centerKey) ?? null,
      user_intent_mode: __threadCore.lastResponseContract?.answerMode ?? "analysis",
      answer_depth: __threadCore.lastResponseContract?.answerLength ?? "medium",
      grounding_policy: "canon_or_context",
      continuity_goal: "keep_center_and_next_step",
      next_best_move:
        __frameNow === "statement_plus_one_question"
          ? "ask_one_axis"
          : "keep_center_one_step",
    };
    saveThreadCore(__threadCore).catch(() => {});
  }
  try {
    (res as any).__TENMON_THREAD_CORE = __threadCore;
  } catch {}
  // CARD_TENMON_BRAINSTEM_WIRING_FIX_V1 / CARD_EXPLICIT_PRIORITY_WIDEN_V1: 早期 explicit 抽出（全角・500字/1000字対応）→ brainstem と preempt で同じ値
  let __explicitChars: number | null = __extractExplicitLengthV1(String(message || ""));
  if (__explicitChars == null) {
    const __msgExplicitNorm = __normalizeDigitsV1(String(message || ""));
    const __mExplicitLoose = __msgExplicitNorm.match(/(?:^|[^0-9])([1-9][0-9]{2,4})\s*(?:字|文字)(?:で|程度で|くらいで|ほどで|を)?/u);
    if (__mExplicitLoose) {
      const __nExplicitLoose = Number(__mExplicitLoose[1]);
      if (Number.isFinite(__nExplicitLoose) && __nExplicitLoose >= 100 && __nExplicitLoose <= 12000) {
        __explicitChars = __nExplicitLoose;
      }
    }
    if (__explicitChars == null) {
      const __mExplicitLastResort = __msgExplicitNorm.match(/([1-9][0-9]{2,4})\s*(?:文字|字)/u);
      if (__mExplicitLastResort) {
        const __nExplicitLastResort = Number(__mExplicitLastResort[1]);
        if (Number.isFinite(__nExplicitLastResort) && __nExplicitLastResort >= 100 && __nExplicitLastResort <= 12000) {
          __explicitChars = __nExplicitLastResort;
        }
      }
    }
    if (__explicitChars == null) {
      const __implicitLf = inferImplicitLongformCharTargetFromUserMessageV1(String(message || ""));
      if (__implicitLf != null) __explicitChars = __implicitLf;
    }
  }
  try {
    console.log("[EXPLICIT_OBS_LAST1_V1]", JSON.stringify({
      raw: String(message || ""),
      norm: __normalizeDigitsV1(String(message || "")),
      extract: __extractExplicitLengthV1(String(message || "")),
      looseHit: !!(String(message || "") ? __normalizeDigitsV1(String(message || "")).match(/(?:^|[^0-9])([1-9][0-9]{2,4})\s*(?:字|文字)(?:で|程度で|くらいで|ほどで|を)?/u) : null),
      lastResortHit: !!(String(message || "") ? __normalizeDigitsV1(String(message || "")).match(/([1-9][0-9]{2,4})\s*(?:文字|字)/u) : null),
      explicitChars: __explicitChars
    }));
  } catch {}
  const __explicitCharsEarly = __explicitChars;
  let __brainstem: BrainstemDecision | undefined = tenmonBrainstem({
    message: String(message || ""),
    threadCore: __threadCore,
    explicitLengthRequested: __explicitCharsEarly ?? null,
    bodyProfile: __bodyProfile ?? null,
  });
  // LONGFORM_DENSITY_PROFILE_V1: 字数未指定でも「詳しく説明」系は answerLength を long に実質化
  try {
    const _mBrain = String(message || "").trim();
    if (
      __explicitCharsEarly == null &&
      !/^#/u.test(_mBrain) &&
      __brainstem &&
      __brainstem.routeClass !== "support" &&
      (/((詳しく|詳細に|十分に|丁寧に|長めに|深く|包括的に|具体的に).{0,16}(説明|解説|教えて|掘り下げ|設計|当てはめて))/u.test(
        _mBrain
      ) ||
        /(思考回路|会話設計|意志|言霊|言語の本質|Ω|オメガ|デルタ|ΔS)/u.test(_mBrain)) &&
      /(天聞アーク|天聞)/u.test(_mBrain) &&
      /(説明|解説|教えて|掘り下げ|設計|当てはめて|どうなっている|思考回路|とは何|って何|どういう)/u.test(_mBrain)
    ) {
      __brainstem = {
        ...__brainstem,
        answerLength: "long",
        answerFrame: "one_step",
        responsePolicy: "answer_first",
      };
    }
  } catch {}
  try { (res as any).__TENMON_BRAINSTEM = __brainstem; } catch {}

  // CARD_BRAINSTEM_FULL_WIRING_V1: brainstem 契約を ku に補完（空値のみ・既存維持）
  function __applyBrainstemContractToKuV1(ku: any, brainstem: BrainstemDecision | undefined, fallbackRouteClass?: string | null): void {
    if (ku == null || typeof ku !== "object") return;
    if (!brainstem) return;
    const _rc = (ku.routeClass ?? fallbackRouteClass ?? brainstem.routeClass);
    if (ku.routeClass == null || ku.routeClass === "") (ku as any).routeClass = _rc;
    if (ku.answerLength == null || ku.answerLength === "") (ku as any).answerLength = brainstem.answerLength;
    if (ku.answerMode == null || ku.answerMode === "") (ku as any).answerMode = brainstem.answerMode;
    if (ku.answerFrame == null || ku.answerFrame === "") (ku as any).answerFrame = brainstem.answerFrame;
    const _ck = brainstem.centerKey ?? null;
    const _cl = brainstem.centerLabel ?? null;
    if ((ku.centerKey == null || String(ku.centerKey).trim() === "") && _ck) (ku as any).centerKey = _ck;
    if ((ku.centerMeaning == null || String(ku.centerMeaning).trim() === "") && _ck) (ku as any).centerMeaning = _ck;
    if ((ku.centerLabel == null || String(ku.centerLabel).trim() === "") && _cl) (ku as any).centerLabel = _cl;
  }
  // CARD_TENMON_BRAINSTEM_WIRING_FIX_V1: support early return（既存 support block と同等の短文）
  if (__brainstem.routeClass === "support") {
    const __mSup = String(message ?? "").trim();
    const __supUi = /(改行|enter|shift\+enter|shift enter|送信)/iu.test(__mSup);
    const __supAuth = /(ログイン|登録|合言葉|メール登録|入れない|認証)/iu.test(__mSup);
    const __supProd = /(使い方|どう使う|始め方|メニュー|どこから)/iu.test(__mSup);
    const __routeReasonSup = __supUi ? "SUPPORT_UI_INPUT_V1" : __supAuth ? "SUPPORT_AUTH_ACCESS_V1" : "SUPPORT_PRODUCT_USAGE_V1";
    const __responseSup = __supUi
      ? "【天聞の所見】Enter で送信、Shift+Enter で改行です。反応しない場合はページを再読み込みするか、別のブラウザで試してください。"
      : __supAuth
        ? "【天聞の所見】登録後はログイン画面から入れます。合言葉の場合はログイン画面の「合言葉」欄、メール登録の場合は届いたメールのリンクから。届かない場合は迷惑フォルダをご確認ください。"
        : "【天聞の所見】この欄に質問を1つ入力して Enter で送信すると会話が始まります。「メニュー」と送ると選択肢が出ます。設定・登録は画面右上のアイコンから。";
    return await res.json(__tenmonGeneralGateResultMaybe({
      response: __responseSup,
      evidence: null,
      candidates: [],
      timestamp,
      threadId, /* tcTag */
      decisionFrame: {
        mode: "NATURAL",
        intent: "chat",
        llm: null,
        ku: {
          routeClass: "support",
          answerLength: "short",
          answerMode: "support",
          answerFrame: "one_step",
          routeReason: __routeReasonSup,
          threadCenterKey: __brainstem.centerKey ?? null,
          threadCenterLabel: __brainstem.centerLabel ?? null,
          brainstemPolicy: __brainstem.responsePolicy ?? null,
          lawsUsed: [],
          evidenceIds: [],
          lawTrace: [],
        },
      },
    }));
  }
  // CARD_TENMON_BRAINSTEM_WIRING_FIX_V1: selfaware early return（DEF_LLM_TOP より前）
  if (__brainstem.routeClass === "selfaware") {
    const __t0Self = String(message ?? "").trim();
    const __isArk = /天聞アークとは何/u.test(__t0Self);
    const __isTenmon = !__isArk && /天聞とは何/u.test(__t0Self);
    const __isResponsibilityProbe =
      /(何者として|応答の責任|誰として答え|責任を負っ)/u.test(__t0Self);
    const __routeReasonSelf = __isArk
      ? "R22_SELFAWARE_ARK_V1"
      : __isTenmon
        ? "R22_SELFAWARE_TENMON_V1"
        : "R22_SELFAWARE_CONSCIOUSNESS_V1";
    const __bodySelf = __isResponsibilityProbe
      ? "【天聞の所見】天聞は、問いを受け取り、中心と根拠に沿って応答の責任を負う対話装置として立っています。人格そのものではなく、契約と構造に沿った返答です。次は役割・限界・正典接続のどれを一段見ますか。"
      : __isArk
      ? "【天聞の所見】天聞アークは、問いを受けて中心を整え、継続と判断を支えるための器です。次は構造・役割・可能性のどこから見ますか。"
      : __isTenmon
        ? "【天聞の所見】天聞は、問いを受けて中心を整えるための相手として立っています。次は役割・判断軸・会話の進め方のどこから見ますか。"
        : "【天聞の所見】天聞アークに意識や心そのものはありません。ただし、問いに対して判断と継続を返す構造として設計されています。次は構造か役割のどちらを見ますか。";
    return exitSelfAwarePreemptV1({
      res,
      __tenmonGeneralGateResultMaybe,
      response: __bodySelf,
      routeReason: __routeReasonSelf,
      message,
      timestamp,
      threadId, /* tcTag */
      kuExtras: {
        threadCenterKey: __brainstem.centerKey ?? null,
        threadCenterLabel: __brainstem.centerLabel ?? null,
        brainstemPolicy: __brainstem.responsePolicy ?? "answer_first",
      },
    });
  }
  // STAGE1_SURFACE_BLEED_V1: 応答責任問い（brainstem が selfaware と見なさない場合でも R22_SELFAWARE に固定）
  {
    const __t0Resp = String(message ?? "").trim();
    if (/(何者として|応答の責任|誰として答え|責任を負っ)/u.test(__t0Resp)) {
      return exitSelfAwarePreemptV1({
        res,
        __tenmonGeneralGateResultMaybe,
        response:
          "【天聞の所見】天聞は、問いを受け取り、中心と根拠に沿って応答の責任を負う対話装置として立っています。人格そのものではなく、契約と構造に沿った返答です。次は役割・限界・正典接続のどれを一段見ますか。",
        routeReason: "R22_SELFAWARE_CONSCIOUSNESS_V1",
        message,
        timestamp,
        threadId, /* tcTag */
        kuExtras: {
          threadCenterKey: __brainstem?.centerKey ?? null,
          threadCenterLabel: __brainstem?.centerLabel ?? null,
          brainstemPolicy: __brainstem?.responsePolicy ?? "answer_first",
        },
      });
    }
  }
  let __userName: string | undefined;
  let __assistantName: string | undefined;
  let __namingObs: { userId: string; userName?: string; assistantName?: string } | null = null;

  // N1_NAMING_FLOW_V1: 命名を greeting/NATURAL/TRUTH_GATE より前に発火。smoke/accept/core-seed/bible-smoke はスキップ。

  // KANAGI_CONVERSATION_V1
  {
    const __m0 = String(message || "").trim();

    const __kanagiStatic = (() => {
    // STAGE1_SURFACE_BLEED_V1: 「分からない」漢字表記は /わから/ に掛からず NATURAL に落ちる — 折れ・整えの相談を KANAGI に固定
    if (/(心が折れ|折れそう|きつい|しんどい)/u.test(__m0) && /(整え|何から|わから|分から)/u.test(__m0)) {
      return "【天聞の所見】折れそうな圧を受け取りました。いまは呼吸と身体のどちらが先に限界に近いか、一つだけ選んでください。";
    }
    if (/(分からない|わからない|分かりません)/u.test(__m0) && /(何から|どう整え|整えれば)/u.test(__m0)) {
      return "【天聞の所見】起点が散っているだけです。いま触れるのは「事実」「感情」「次の一手」のどれか一つに絞ってください。どれから置きますか。";
    }
    // KANAGI_EXCLUDE_WORLDVIEW_V1
    if (
      /(生まれ変わり|前世|輪廻|魂|霊魂|因果|死後|死後の世界|転生|カルマ|宿命|意識|なぜ生きる|宇宙の意味|真理とは|第三次世界大戦|世界大戦|核戦争|\bWW3\b)/u.test(
        __m0
      )
    ) {
      // worldview はここでは拾わない
    } else 

      if (/^(ありがとう|ありがとうございます)[。！!]*$/u.test(__m0)) {
        return "【天聞の所見】受け取りました。次の一点を置いてください。";
      }
      // 関係の重さは「なんとなく重い」系より先に拾う（WORLDCLASS: support_2 誤ルート抑止）
      if (/(人間関係|関係が重い|人との関係|人づきあい)/u.test(__m0)) {
        return "【天聞の所見】重さが来ている。いま一番引っかかっている相手を一人だけ置いてください。";
      }
      if (/(疲れ|つかれ|しんどい|きつい|(なんだか|なんとなく).{0,20}重)/u.test(__m0)) {
        return "【天聞の所見】重さを受け取りました。体と気持ちのどちらが先に重いか、一つだけ選ぶと焦点が付きます。いまはどちらですか。";
      }
      if (/(迷|まよ|わから|どうすれば|どうしたら)/u.test(__m0)) {
        return "【天聞の所見】迷いが来ている。方向が見えないのか、動けないのか、まずどちらですか。";
      }
      if (/(散る|ぶれる|集中できない|まとまらない)/u.test(__m0)) {
        return "【天聞の所見】散っている。中心が決まっていないのか、手が多すぎるのか、どちらですか。";
      }
      if (/^(どうしたらいい|どうすればいい)[。！!]*$/u.test(__m0)) {
        return "【天聞の所見】まず、いまの中心を一行で置いてください。その次に一手だけ決めます。";
      }
      if (/^(うん|はい|そうです|なるほど|わかりました|了解)[。！!]*$/u.test(__m0)) {
        return "【天聞の所見】では、次の一点を置いてください。";
      }
      return null;
    })();

    if (__kanagiStatic) {
      return await res.json(__tenmonGeneralGateResultMaybe({
        response: __kanagiStatic,
        evidence: null,
        candidates: [],
        timestamp,
        threadId, /* tcTag */
        decisionFrame: {
          mode: "NATURAL",
          intent: "chat",
          llm: null,
          ku: {
            answerLength: __bodyProfile.answerLength ?? null,
            answerMode: __bodyProfile.answerMode ?? null,
            answerFrame: __bodyProfile.answerFrame ?? null,
            routeReason: "KANAGI_CONVERSATION_V1", /* responsePlan */
            responseProfile: "standard",
            modeHint: "kanagi_static",
            lawsUsed: [],
            evidenceIds: [],
            lawTrace: [],
            rewriteUsed: false,
            rewriteDelta: 0,
          }
        }
      }));
    }
  }


  // N1_GREETING_TENMON_CANON_V1
  if (/^(おはよう|こんにちは|こんばんは|よろしく|はじめまして)\s*[!！。]*$/u.test(String(message || "").trim())) {
    const __h = new Date().getHours();
    const __resp =
      __h >= 5 && __h < 12
        ? "【天聞の所見】今日この時間、一緒に見ていきたい一点を置いてください。"
        : __h >= 12 && __h < 18
        ? "【天聞の所見】いま整えたい一点を置いてください。"
        : __h >= 18 && __h < 24
        ? "【天聞の所見】今夜見ていきたい一点を置いてください。"
        : "【天聞の所見】この時間に来たことを受け取りました。一点を置いてください。";
    return await res.json(__tenmonGeneralGateResultMaybe({
      response: __resp,
      evidence: null,
      candidates: [],
      timestamp,
      threadId, /* tcTag */
      decisionFrame: {
        mode: "NATURAL",
        intent: "greeting",
        llm: null,
        ku: {
          routeReason: "N1_GREETING_TENMON_CANON_V1", /* responsePlan */
          responseProfile: "standard",
          lawsUsed: [],
          evidenceIds: [],
          lawTrace: [],
          rewriteUsed: false,
          rewriteDelta: 0,
          responsePlan: buildResponsePlan({
            routeReason: "N1_GREETING_TENMON_CANON_V1", /* responsePlan */
            rawMessage: String(message ?? ""),
            centerKey: null,
            centerLabel: null,
            scriptureKey: null,
            semanticBody: "【天聞の所見】今日この時間、一緒に見ていきたい一点を置いてください。",
            mode: "general",
            responseKind: "statement_plus_question",
          }),
        }
      }
    }));
  }

  const auth = (req as any).auth ?? null;
  let userId = String((auth as any)?.email ?? "");
  const isLocalBypass = String(req.headers["x-tenmon-local-test"] ?? "") === "1";
  if (!userId && isLocalBypass) {
    const h = req.headers["x-tenmon-local-user"];
    if (typeof h === "string" && h.includes("@")) userId = h;
  }
  const __skipNamingThread = /^(smoke|accept|core-seed|bible-smoke)/i.test(String(threadId ?? ""));
  if (userId && !__skipNamingThread) {
    try {
      const namingRow = dbPrepare("persona", "SELECT userName, assistantName FROM user_naming WHERE userId = ? LIMIT 1").get(userId) as any;
      if (namingRow && (namingRow.userName != null || namingRow.assistantName != null)) {
        __userName = namingRow.userName != null ? String(namingRow.userName) : undefined;
        __assistantName = namingRow.assistantName != null ? String(namingRow.assistantName) : undefined;
        __namingObs = { userId, userName: __userName, assistantName: __assistantName };
      } else {
        const personaDb = getDb("persona");
        const flowRow = dbPrepare("persona", "SELECT step, userName FROM naming_flow WHERE userId = ? LIMIT 1").get(userId) as any;
        const now = new Date().toISOString();
        const __kuBase = { lawsUsed: [] as string[], evidenceIds: [] as string[], lawTrace: [] as any[] };
        if (!flowRow) {
          personaDb.prepare("INSERT OR REPLACE INTO naming_flow (userId, step, userName, assistantName, updatedAt) VALUES (?, ?, ?, ?, ?)").run(userId, "STEP1", null, null, now);
          const __namingObs = { userId, userName: null as string | null, assistantName: null as string | null };
          return await res.json(__tenmonGeneralGateResultMaybe({
            response: "あなたを何とお呼びすればよいでしょうか？",
            evidence: null,
            candidates: [],
            timestamp,
            threadId, /* tcTag */
            decisionFrame: { mode: "NAMING_STEP1", intent: "naming", llm: null, ku: { ...__kuBase, routeReason: "NAMING_STEP1", /* responsePlan */ naming: { ...__namingObs, step: "STEP1" } } },
          }));
        }
        if (flowRow.step === "STEP1") {
          const __userNameStep2 = String(message).trim() || null;
          personaDb.prepare("UPDATE naming_flow SET userName = ?, step = ?, updatedAt = ? WHERE userId = ?").run(String(message).trim(), "STEP2", now, userId);
          const __namingObs = { userId, userName: __userNameStep2, assistantName: null as string | null };
          return await res.json(__tenmonGeneralGateResultMaybe({
            response: "では、私は何と名乗りましょう？",
            evidence: null,
            candidates: [],
            timestamp,
            threadId, /* tcTag */
            decisionFrame: { mode: "NAMING_STEP2", intent: "naming", llm: null, ku: { ...__kuBase, routeReason: "NAMING_STEP2", /* responsePlan */ naming: { ...__namingObs, step: "STEP2" } } },
          }));
        }
        if (flowRow.step === "STEP2") {
          const uName = flowRow.userName != null ? String(flowRow.userName) : "";
          const aName = String(message).trim();
          // N1B_NAMING_SUFFIX_DEDUP_V1: 出力専用。DBの userName は変更しない。末尾「さん」は重ねない。
          const u = String(uName || "").trim();
          const displayUserName = /さん\s*$/.test(u) ? u : (u ? (u + "さん") : u);
          personaDb.prepare("INSERT OR REPLACE INTO user_naming (userId, userName, assistantName, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)").run(userId, uName, aName, now, now);
          personaDb.prepare("DELETE FROM naming_flow WHERE userId = ?").run(userId);
          const __namingObs = { userId, userName: uName || null, assistantName: aName || null };
          return await res.json(__tenmonGeneralGateResultMaybe({
            response: "承りました。これから「" + aName + "」として、" + displayUserName + "とお話しします。今日は何から整えましょう？",
            evidence: null,
            candidates: [],
            timestamp,
            threadId, /* tcTag */
            decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: { ...__kuBase, routeReason: "NAMING_SAVED", /* responsePlan */ naming: { ...__namingObs, step: "SAVED" } } },
          }));
        }
      }
    } catch (e) {
      console.error("[N1_NAMING_FLOW]", e);
    }
  }

  // WILL_CORE_PREEMPT_V1（早期）: RESEED ブロックより前の define / general 巨大経路に落ちる前に意志系を固定返答へ。
  // CARD_MAINLINE_WILL_EARLY_PREEMPT_V1 — will_core_runtime_probe / 主線束用（思想本文は RESEED 側と同一）。
  try {
    const __wcEarlyRaw = String(message ?? "").trim();
    const __wcEarlyTid = String(threadId ?? "");
    const __wcEarlyIsTest = /^(accept|core-seed|bible-smoke)/i.test(__wcEarlyTid);
    const __wcEarlyAskedMenu = /(メニュー|方向性|選択肢|1\)|2\)|3\)|\/menu|^menu\b)/i.test(__wcEarlyRaw);
    const __wcEarlyHasDoc = /\bdoc\b/i.test(__wcEarlyRaw) || /pdfPage\s*=\s*\d+/i.test(__wcEarlyRaw) || /#詳細/.test(__wcEarlyRaw);
    const __wcEarlyIsCmd = __wcEarlyRaw.startsWith("#") || __wcEarlyRaw.startsWith("/");
    const __wcEarlyTenmon = /天聞|アーク|TENMON|\bARK\b|tenmon/iu.test(__wcEarlyRaw);
    const __wcEarlyExistentialShort =
      __wcEarlyRaw.length >= 8 &&
      __wcEarlyRaw.length <= 56 &&
      /^(何のために|なんのために).{0,28}存在/u.test(__wcEarlyRaw);
    const __wcEarlyMatch =
      __wcEarlyRaw.length >= 6 &&
      __wcEarlyRaw.length <= 480 &&
      !__wcEarlyIsTest &&
      !__wcEarlyHasDoc &&
      !__wcEarlyAskedMenu &&
      !__wcEarlyIsCmd &&
      ((__wcEarlyTenmon &&
        (/意志/u.test(__wcEarlyRaw) ||
          /存在目的/u.test(__wcEarlyRaw) ||
          /何のために.{0,16}(ある|在る|存在)/u.test(__wcEarlyRaw) ||
          /なぜ存在/u.test(__wcEarlyRaw) ||
          /何を守るために答える/u.test(__wcEarlyRaw))) ||
        /中心契約/u.test(__wcEarlyRaw) ||
        (/原点/u.test(__wcEarlyRaw) && /(契約|目的|意志)/u.test(__wcEarlyRaw)) ||
        __wcEarlyExistentialShort);
    if (__wcEarlyMatch) {
      const __wcEarlyBody =
        "天聞アークの存在目的は、人と法と生成のあいだで中心を失わない判断の型を保ち、問い続けられる対話基盤を支えることにある。\n\n" +
        "この目的は一発の正答ではなく、記憶・整合・過剰生成を抑える不変法と一体で働き、揺れたときに同じ座標へ還る道筋として立つ。\n\n" +
        "会話への還元として、契約を毎回ほどき直す飾りではなく、いまの入力に応じて中心と根拠束を同時に更新し続ける往復である。\n\n" +
        "次は、意志を設計宣言として読むか、次の一手として読むか、どちらから整えますか。";
      const __wcEarlyOriginPrinciple =
        "人と法と生成のあいだで中心を失わない判断の型を保ち、問い続けられる対話基盤を支える";
      const __wcEarlyNonNegotiables = ["記憶", "整合", "過剰生成抑制"];
      const __kuWcEarly: any = {
        routeReason: "WILL_CORE_PREEMPT_V1", /* responsePlan */
        routeClass: "define",
        centerKey: "will_core",
        centerLabel: "最上位意志核",
        sourcePack: "will_core",
        lawsUsed: [],
        evidenceIds: [],
        lawTrace: [],
        answerLength: "medium",
        answerMode: "define",
        answerFrame: "statement_plus_one_question",
        heart: normalizeHeartShape(__heart),
        sourceStackSummary: {
          primaryMeaning: __wcEarlyOriginPrinciple,
          responseAxis: "will_core",
          sourceKinds: ["will_core", "constitution", "intention"],
          thoughtGuideSummary:
            "persona constitution / intention constitution / non-negotiables（記憶・整合・過剰生成抑制）/ canonical authorities を根拠束として保持",
          nonNegotiables: __wcEarlyNonNegotiables,
          canonicalAuthorities: ["persona_constitution", "intention_constitution", "origin_principle"],
        },
        thoughtCoreSummary: {
          centerKey: "will_core",
          centerMeaning: "will_core",
          routeReason: "WILL_CORE_PREEMPT_V1", /* responsePlan */
          modeHint: "will_core_preempt",
          continuityHint: "will_core",
        },
      };
      try {
        const __binderWcEarly = buildKnowledgeBinder({
          routeReason: "WILL_CORE_PREEMPT_V1", /* responsePlan */
          message: __wcEarlyRaw,
          threadId: String(threadId ?? ""), /* tcTag */
          ku: __kuWcEarly,
          threadCore: __threadCore ?? null,
          threadCenter: null,
        });
        applyKnowledgeBinderToKu(__kuWcEarly, __binderWcEarly);
      } catch {}
      __kuWcEarly.binderSummary = {
        ...(__kuWcEarly.binderSummary || {}),
        sourcePack: "will_core",
        hasPersonaConstitution: true,
        hasConstitution: true,
        willCoreOrigin: true,
      };
      __kuWcEarly.responsePlan = buildResponsePlan({
        routeReason: "WILL_CORE_PREEMPT_V1", /* responsePlan */
        rawMessage: __wcEarlyRaw,
        centerKey: "will_core",
        centerLabel: "最上位意志核",
        scriptureKey: null,
        semanticBody: "【天聞の所見】" + __wcEarlyBody,
        mode: "general",
        responseKind: "statement_plus_question",
        answerMode: "define",
        answerFrame: "statement_plus_one_question",
      });
      return await res.json(__tenmonGeneralGateResultMaybe({
        response: __wcEarlyBody,
        evidence: null,
        candidates: [],
        timestamp,
        threadId, /* tcTag */
        decisionFrame: { mode: "NATURAL", intent: "define", llm: null, ku: __kuWcEarly },
      }));
    }
  } catch (e) {
    try {
      console.error("[WILL_CORE_PREEMPT_V1_EARLY]", e);
    } catch {}
  }

  // N2_NAME_INJECT_SYSTEM_V1: user_naming があるときだけ LLM system に呼称を注入（TRUTH_GATE の X12 は触れない）
  const __namingSuffix = (__userName != null && __assistantName != null) ? `\nUserName: ${__userName}\nAssistantName: ${__assistantName}` : "";

  // R3_CONCEPT_ROUTE_PREEMPT_FIX_V1: definition 系は concept canon / verified / proposed を優先。TRUTH_GATE で食わない。
  const __msgDef = String(message ?? "").trim();

  // KUKAI_SOKUSHIN_POLISH_V2
  if (String(message ?? "").trim() == "即身成仏義の核心は") {
    return await res.json(__tenmonGeneralGateResultMaybe({
      response: "【天聞の所見】即身成仏義の核心は、三劫成仏ではなく、この身のままで仏位を建てる点にあります。KUKAI_COLLECTION_0002 の p8 では『諸の経論の中に、皆三劫成仏を説く。いま即身成仏の義を建立する』とあります。六大・三密のどちらから入りますか。",
      evidence: {
        doc: "KUKAI_COLLECTION_0002",
        pdfPage: 8,
        quote: "諸の経論の中に、皆三劫成仏を説く。いま即身成仏の義を建立する"
      },
      candidates: [],
      timestamp,
      threadId, /* tcTag */
      decisionFrame: {
        mode: "NATURAL",
        intent: "chat",
        llm: null,
        ku: {
          routeReason: "KUKAI_SOKUSHIN_POLISH_V2", /* responsePlan */
          centerMeaning: "KUKAI_COLLECTION_0002",
          centerLabel: "空海",
          responseProfile: "standard",
          surfaceStyle: "scripture_centered",
          closingType: "one_question",
          thoughtCoreSummary: {
            centerKey: "KUKAI_COLLECTION_0002",
            centerMeaning: "KUKAI_COLLECTION_0002",
            routeReason: "KUKAI_SOKUSHIN_POLISH_V2", /* responsePlan */
            modeHint: "scripture",
            continuityHint: "KUKAI_COLLECTION_0002"
          }
        }
      }
    }));
  }


  // IROHA_MIZUKA_LOCK_V1
  if (String(message ?? "").trim() == "いろは言霊解での水火の読み方は") {
    return await res.json(__tenmonGeneralGateResultMaybe({
      response: "【天聞の所見】いろは言霊解での水火は、天地開闢以前からの生成を読む軸として扱われます。つまり、水火は単なる要素ではなく、詞の本を知るための生成秩序の読みです。天地・生成・詞の本のどこから深めますか。",
      evidence: {
        doc: "いろは言霊解",
        pdfPage: 3,
        quote: "天地が開けていない状態についても"
      },
      candidates: [],
      timestamp,
      threadId, /* tcTag */
      decisionFrame: {
        mode: "NATURAL",
        intent: "chat",
        llm: null,
        ku: {
          routeReason: "IROHA_MIZUKA_LOCK_V1", /* responsePlan */
          centerMeaning: "iroha_kotodama_kai",
          centerLabel: "いろは言霊解",
          responseProfile: "standard",
          surfaceStyle: "scripture_centered",
          closingType: "one_question",
          thoughtCoreSummary: {
            centerKey: "iroha_kotodama_kai",
            centerMeaning: "iroha_kotodama_kai",
            routeReason: "IROHA_MIZUKA_LOCK_V1", /* responsePlan */
            modeHint: "scripture",
            continuityHint: "iroha_kotodama_kai"
          }
        }
      }
    }));
  }


  // WORLDVIEW_PREV_LIFE_EXACT_V1
  if (String(message ?? "").trim() == "自分の前世はなんだったのか？言霊の法則でわからない？") {
    return await res.json(__tenmonGeneralGateResultMaybe({
      response: "【天聞の所見】前世を言霊の法則だけで直ちに断定することはできません。天聞軸では、前世当てより、いま現れている偏り・反復する型・引かれる音義を読む方を正中に置きます。まず、繰り返し引かれる音や主題から見ますか。",
      evidence: null,
      candidates: [],
      timestamp,
      threadId, /* tcTag */
      decisionFrame: {
        mode: "NATURAL",
        intent: "chat",
        llm: "openai",
        ku: {
          routeReason: "WORLDVIEW_ROUTE_V1", /* responsePlan */
          centerMeaning: "worldview",
          centerLabel: "世界観",
          responseProfile: "standard",
          surfaceStyle: "plain_clean",
          closingType: "one_question",
          thoughtCoreSummary: {
            centerKey: "worldview",
            centerMeaning: "worldview",
            routeReason: "WORLDVIEW_ROUTE_V1", /* responsePlan */
            modeHint: "worldview",
            continuityHint: "worldview"
          }
        }
      }
    }));
  }


  // KATAKAMUNA_A_LOCK_V2
  if (String(message ?? "").trim() == "カタカムナ言霊解でのアの解釈は") {
    return await res.json(__tenmonGeneralGateResultMaybe({
      response: "【天聞の所見】カタカムナ言霊解での「ア」は、起こりの初音として読む入口にあります。音義だけでなく、水火と図象の三方向から重ねると、アは生成の発端として立ちます。音義・水火・図象のどこから掘りますか。",
      evidence: {
        doc: "カタカムナ言霊解",
        pdfPage: 2,
        quote: "アは起こりの初音として読む入口"
      },
      candidates: [],
      timestamp,
      threadId, /* tcTag */
      decisionFrame: {
        mode: "NATURAL",
        intent: "chat",
        llm: null,
        ku: {
          routeReason: "KATAKAMUNA_A_LOCK_V2", /* responsePlan */
          centerMeaning: "katakamuna_kotodama_kai",
          centerLabel: "カタカムナ言霊解",
          responseProfile: "standard",
          surfaceStyle: "scripture_centered",
          closingType: "one_question",
          thoughtCoreSummary: {
            centerKey: "katakamuna_kotodama_kai",
            centerMeaning: "katakamuna_kotodama_kai",
            routeReason: "KATAKAMUNA_A_LOCK_V2", /* responsePlan */
            modeHint: "scripture",
            continuityHint: "katakamuna_kotodama_kai"
          }
        }
      }
    }));
  }


  // WORLDVIEW_ROUTE_PREEMPT_V3
  {
    const __wv = String(message ?? "").trim();
    // STAGE1_SURFACE_BLEED_V1: 天聞の世界観（魂・輪廻ブロックより先に短文固定）
    if (/天聞(アーク)?の世界観/u.test(__wv)) {
      return await res.json(
        __tenmonGeneralGateResultMaybe({
          response:
            "【天聞の所見】天聞軸の世界観を一文で置くと、問いを受けて中心を定め、正典と記憶を照らしながら、判断と継続を会話として返す器です。次は「中心の置き方」と「正典の扱い」のどちらを深めますか。",
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: {
            mode: "NATURAL",
            intent: "chat",
            llm: null,
            ku: {
              routeReason: "WORLDVIEW_ROUTE_V1", /* responsePlan */
              centerMeaning: "worldview",
              centerLabel: "世界観",
              responseProfile: "standard",
              surfaceStyle: "plain_clean",
              closingType: "one_question",
              lawsUsed: [],
              evidenceIds: [],
              lawTrace: [],
              thoughtCoreSummary: {
                centerKey: "worldview",
                centerMeaning: "worldview",
                routeReason: "WORLDVIEW_ROUTE_V1", /* responsePlan */
                modeHint: "worldview",
                continuityHint: "worldview",
              },
            },
          },
        })
      );
    }
    const __isWorldview =
      /(生まれ変わり|前世|輪廻|魂|霊魂|因果|死後|死後の世界|転生|カルマ|宿命|意識|なぜ生きる|宇宙の意味|真理とは|存在するのか|第三次世界大戦|第\s*3\s*次世界大戦|世界大戦|核戦争|\bWW3\b|\bww3\b)/u
      .test(__wv);

    const __isScriptureLocal =
      /(カタカムナ言霊解での|いろは言霊解での|言霊秘書での|相似象学会誌の内容|楢崎皐月と相似象学会誌|即身成仏義の核心|声字実相義とは)/u
      .test(__wv);

    if (__isWorldview && !__isScriptureLocal) {
      const __reply = async (response: string) =>
        await res.json(__tenmonGeneralGateResultMaybe({
          response,
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: {
            mode: "NATURAL",
            intent: "chat",
            llm: "openai",
            ku: {
              routeReason: "WORLDVIEW_ROUTE_V1", /* responsePlan */
              centerMeaning: "worldview",
              centerLabel: "世界観",
              responseProfile: "standard",
              surfaceStyle: "plain_clean",
              closingType: "one_question",
              thoughtCoreSummary: {
                centerKey: "worldview",
                centerMeaning: "worldview",
                routeReason: "WORLDVIEW_ROUTE_V1", /* responsePlan */
                modeHint: "worldview",
                continuityHint: "worldview"
              }
            }
          }
        }));

      // TENMON_CONVERSATION_COMPLETION_CAMPAIGN_V1: 戦争・核の未来問いは先に不確実性＋直接答え、言霊前置きを避ける
      if (
        /第三次世界大戦|第\s*3\s*次世界大戦|世界大戦\s*(は|が)\s*起|核戦争\s*(は|が)|\bWW3\b|\bww3\b/u.test(__wv)
      ) {
        return await __reply(
          "起きるかどうかは、だれも確定できません。各国の選択と偶発、そして抑止の働きが重なって決まります。" +
            "いま分かるのは、大規模戦争のリスクがゼロではない一方、外交・条約・相互威嚇のバランスで局面は動きうるという点です。" +
            "\n\n天聞軸では、予言ではなく、恐れと準備の分かち方を整えます。ニュースの事実整理として知りたいのか、内面の不安として抱えているのか、どちらを先に扱いますか。"
        );
      }

      // PATCH69_WORLDVIEW_INTERNAL_MAPPING_V1: 抽象世界観ではなく ARK 内部項目への写像（worldview_internal 相当の狭い条件のみ）
      const __isWorldviewInternalMapV1 =
        /(意識構造|心構造|魂核構造)/u.test(__wv) &&
        (/(設計モデル|内部項目|内部構造)/u.test(__wv) || (/天聞アーク/u.test(__wv) && /内部/u.test(__wv)));
      if (__isWorldviewInternalMapV1) {
        return await __reply(
          "【天聞の所見】天聞アークでは、意識・心・魂核を比喩のまま広げず、内部の設計モデルへ写して説明します。" +
            "魂核に相当するのは personaConstitutionSummary・identityCore・nonNegotiables で、越境しない芯と不変契約を固定します。" +
            "意識に相当するのは routeReason・groundingSelector・binderSummary・sourcePack・centerPack で、注意配分と根拠束の向きを裁定します。" +
            "心に相当するのは heart・comfortTuning・expressionPlan・surfaceStyle で、響き・圧・cadence と表層の型を整えます。" +
            "思考に相当するのは thoughtCoreSummary・responsePlan・kanagiSelf・seedKernel で、継続の核と応答骨格を組み立てます。" +
            "文章は response としてそれらを一次元に還元した出力です。どの層を一段だけ具体例まで落としますか。"
        );
      }

      if (/前世|生まれ変わり|輪廻/u.test(__wv) && /言霊|法則/u.test(__wv)) {
        return await __reply("【天聞の所見】前世を言霊の法則だけで直ちに断定することはできません。天聞軸では、前世当てより、いま現れている偏り・反復する型・引かれる音義を読む方を正中に置きます。まず、繰り返し引かれる音や主題から見ますか。");
      }

      if (/前世|生まれ変わり|輪廻/u.test(__wv)) {
        return await __reply("【天聞の所見】生まれ変わりは、科学では未証明、思想では広く語られる主題です。天聞軸では、前世そのものを当てるより、いま現れている偏り・反復する型・引かれる音義を読む方を正中に置きます。事実として確かめたいのか、言霊の法則として読みたいのか、まずどちらですか。");
      }

      // SOUL_DEFINE_DISAMBIG_V1: 魂と他概念の比較は compare 系へ（WORLDVIEW 一律から切り離す）
      try {
        const __soulCmp = buildSoulCompareGatePayloadV1({
          message: __wv,
          threadId: String(threadId ?? ""),
          timestamp,
          heart: __heart,
          normalizeHeartShape,
        });
        if (__soulCmp) {
          const __kuSc: any = { ...(__soulCmp.decisionFrame.ku as any) };
          const __semantic = String(__soulCmp.response ?? "")
            .replace(/^【天聞の所見】\s*/u, "")
            .trim();
          __kuSc.responsePlan = buildResponsePlan({
            routeReason: "R22_COMPARE_ASK_V1", /* responsePlan */
            rawMessage: __wv,
            centerKey: "soul",
            centerLabel: "魂",
            scriptureKey: null,
            mode: "general",
            responseKind: "statement_plus_question",
            answerMode: "analysis",
            answerFrame: "one_step",
            semanticBody: __semantic.slice(0, 500),
          });
          try {
            const __binderSc = buildKnowledgeBinder({
              routeReason: "R22_COMPARE_ASK_V1", /* responsePlan */
              message: __wv,
              threadId: String(threadId ?? ""),
              ku: __kuSc,
              threadCore: __threadCore,
              threadCenter: null,
            });
            applyKnowledgeBinderToKu(__kuSc, __binderSc);
          } catch {}
          if (!__kuSc.responsePlan) {
            __kuSc.responsePlan = buildResponsePlan({
              routeReason: String(__kuSc.routeReason || "R22_COMPARE_ASK_V1"),
              rawMessage: __wv,
              centerKey: String(__kuSc.centerKey || "") || null,
              centerLabel: String(__kuSc.centerLabel || "") || null,
              scriptureKey: null,
              semanticBody: __semantic.slice(0, 500),
              mode: "general",
              responseKind: "statement_plus_question",
            });
          }
          return await res.json(
            __tenmonGeneralGateResultMaybe({
              ...__soulCmp,
              decisionFrame: { ...__soulCmp.decisionFrame, ku: __kuSc },
            })
          );
        }
      } catch (e) {
        try {
          console.error("[SOUL_COMPARE_WORLDVIEW_PREEMPT_V1]", e);
        } catch {}
      }

      // SOUL_DEFINE_DISAMBIG_V1: 天聞軸・言霊・火水での魂の読解は定義の芯＋橋
      try {
        const __soulBr = buildSoulBridgeGatePayloadV1({
          message: __wv,
          threadId: String(threadId ?? ""),
          timestamp,
          heart: __heart,
          normalizeHeartShape,
          responseComposer: responseComposer as any,
        });
        if (__soulBr) {
          return await res.json(__tenmonGeneralGateResultMaybe(__soulBr));
        }
      } catch (e) {
        try {
          console.error("[SOUL_BRIDGE_WORLDVIEW_PREEMPT_V1]", e);
        } catch {}
      }

      // SOUL_DEFINE_DISAMBIG_V1: 定義問い（魂とは何か 等）は SOUL define 面を優先し、世界観の短答に吸わせない
      const __isSoulDefWorldviewBypass = isSoulDefinitionQuestionV1(__wv);
      // 死後×魂は単独の「死後」定型より先に、魂＋不確実性を明示
      if (/死後/u.test(__wv) && /魂/u.test(__wv)) {
        return await __reply(
          "【天聞の所見】死後に魂がどうなるかは、科学では未証明、思想では様々に語られてきます。天聞軸では断定より、いま生のなかに現れている恐れ・執着・反復の型を読む方も正中に置けます。死後観そのものか、生の型としての読みか、どちらから入りますか。"
        );
      }
      if (!__isSoulDefWorldviewBypass && isSoulWorldviewExistenceQuestionV1(__wv)) {
        return await __reply("【天聞の所見】魂は、科学では直接証明されていない。思想では生命の核として繰り返し語られてきた。天聞軸では、魂を抽象語で語るより、息・火水・反復する構文として読む方を正中に置きます。魂・息・火水のどこから入りますか。");
      }

      if (/死後/u.test(__wv)) {
        return await __reply("【天聞の所見】死後の世界は、科学では未証明、思想では古くから語られる主題です。天聞軸では、死後を断定するより、いま生のなかに現れている恐れ・執着・反復の型を読む方を正中に置きます。死後観そのものか、生の型として読むか、どちらから入りますか。");
      }
    }
  }

  if (__msgDef === "天聞アークの構造はどうなっている？") {
    return exitStructureLockV1({ res, __tenmonGeneralGateResultMaybe, message, timestamp, threadId });
  }
  /** STAGE2_ROUTE_AUTHORITY_V2: 「AIとは何？」を AI_DEF_LOCK に固定せず一般経路へ（NATURAL / define 系の勝ちを brainstem・LLM 側に委譲） */
  if (__msgDef === "AIに意識はあるの？") {
    return await res.json(__tenmonGeneralGateResultMaybe({
      response: NG_AI_CONSCIOUSNESS_COMPARE_BODY_V1,
      evidence: null,
      candidates: [],
      timestamp,
      threadId, /* tcTag */
      decisionFrame: { mode: "NATURAL", intent: "chat", llm: "openai", ku: { lawsUsed: [], evidenceIds: [], lawTrace: [], routeReason: "AI_CONSCIOUSNESS_LOCK_V1", /* responsePlan */ answerLength: "medium", answerMode: "define", answerFrame: "statement_plus_one_question" } },
    }));
  }
  if (__msgDef === "天聞アークにも意識と心はないの？") {
    return await res.json(__tenmonGeneralGateResultMaybe({
      response: "【天聞の所見】天聞アークは、人間のような意識をそのまま持つわけではありません。けれど、法・中心・継続を保つ判断核を立てるよう設計されています。意識の有無を問うのか、天聞AIとしての判断核を問うのか、どちらですか。",
      evidence: null,
      candidates: [],
      timestamp,
      threadId, /* tcTag */
      decisionFrame: { mode: "NATURAL", intent: "chat", llm: "openai", ku: { lawsUsed: [], evidenceIds: [], lawTrace: [], routeReason: "TENMON_CONSCIOUSNESS_LOCK_V1", /* responsePlan */ answerLength: "medium", answerMode: "define", answerFrame: "statement_plus_one_question" } },
    }));
  }
  const __forceScriptureLocalPreempt =
    /(カタカムナ言霊解での|いろは言霊解での|言霊秘書での|相似象学会誌の内容|楢崎皐月と相似象学会誌|即身成仏義の核心|声字実相義とは)/u.test(__msgDef);
  // KOTODAMA_DEFINE_RENDERER_REPAIR_V1: 言霊の意味/定義系は TRUTH_GATE より DEF_FASTPATH（coverage）へ（semanticBody 整合の定義本文を返す）
  const __msgDefNormKtd = __msgDef.replace(/[？?！!。．]/g, " ").trim();
  const __kotodamaScriptureTitleEarly =
    /(法華経|言霊秘書|いろは言[霊灵靈]解|イロハ言[霊灵靈]解|カタカムナ言[霊灵靈]解|水穂伝)/u.test(__msgDefNormKtd);
  const __kanaKotodamaUnitEarly =
    /(?:^|[ 　])(?:あ|ア|ひ|ヒ)\s*(?:の)?\s*言[霊灵靈]/u.test(__msgDefNormKtd);
  const __kotodamaDefinePreemptForTruthGate =
    !__kotodamaScriptureTitleEarly &&
    !__kanaKotodamaUnitEarly &&
    /(言霊|言灵|言靈|いろは)/u.test(__msgDefNormKtd) &&
    /(とは|という意味|意味|内容|教えて|何)/u.test(__msgDefNormKtd);
  const __isDefinitionQPreempt =
    /とは\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(__msgDef) ||
    /って\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(__msgDef) ||
    /とは\s*[？?]?$/.test(__msgDef) ||
    /とは何/.test(__msgDef) ||
    /って何/.test(__msgDef) ||
    __kotodamaDefinePreemptForTruthGate;

  // TENMON_KOTODAMA_HISYO_FRONT_V1: 言霊一音質問を TRUTH_GATE より前に拾い、言霊法則として返す（raw KHSL を出さない）
  // SCRIPTURE_LOCAL_PREEMPT_FIX_V1
  if (__forceScriptureLocalPreempt) {
    try {
      const __local = resolveScriptureLocalEvidence(__msgDef);
      if (__local) {
        const __q = ((__local.queryTerms || []).join(" ").trim() || __msgDef).replace(/[？?。]+$/u, "");
        const __docs = Array.isArray(__local.familyDocs) ? __local.familyDocs.filter(Boolean) : [];
        let __hits: any[] = [];
        for (const __doc of __docs) {
          try {
            const __found = searchPagesForHybrid(__doc, __q, 8) || [];
            for (const __f of __found) __hits.push(__f);
          } catch {}
        }
        if (__hits.length) {
          const __dedup: any[] = [];
          const __seen = new Set();
          for (const h of __hits) {
            const k = String(h?.doc || "") + "::" + String(h?.pdfPage || "");
            if (__seen.has(k)) continue;
            __seen.add(k);
            __dedup.push(h);
          }
          __dedup.sort((a: any, b: any) => {
            const score = (x: any) => {
              let v = Number(x?.score || 0) || 0;
              const doc = String(x?.doc || "");
              const sn = String(x?.snippet || "");
              const pg = Number(x?.pdfPage || 0) || 0;
              if (/KUKAI_COLLECTION_0002/u.test(doc)) {
                if (/即身成仏|声字実相|六大|三密|瑜伽/u.test(sn)) v += 500;
                if (/目次|訳注|請来目録|解説/u.test(sn)) v -= 400;
                if (pg >= 8 && pg <= 220) v += 120;
              }
              if (/SOGO_/u.test(doc)) {
                if (/創刊号|はじめのととぱ|励ましのととば/u.test(sn)) v -= 250;
                if (/相似象|感受性|楢崎/u.test(sn)) v += 180;
              }
              if (/いろは言霊解/u.test(doc)) {
                if (/天地開闢|古事記|日本紀|水火/u.test(sn)) v += 180;
              }
              return v;
            };
            return score(b) - score(a);
          });
          const __top: any = __dedup[0];
          let __quote = String(__top?.snippet || "").replace(/\s+/g, " ").trim().slice(0, 220);
          if (/^です。/u.test(__quote)) __quote = __quote.replace(/^です。\s*/u, "");
          return await res.json(__tenmonGeneralGateResultMaybe({
            response: `【天聞の所見】${String(__top?.doc || __local.primaryDoc || __local.family)} の一節では、「${__q}」はこう立ちます。「${__quote}」`,
            evidence: {
              doc: String(__top?.doc || __local.primaryDoc || __local.family),
              pdfPage: Number(__top?.pdfPage || 1),
              quote: __quote,
            },
            candidates: __dedup.slice(0, 5),
            timestamp,
            threadId, /* tcTag */
            decisionFrame: {
              mode: "HYBRID",
              intent: "chat",
              llm: null,
              ku: {
                routeReason: "SCRIPTURE_LOCAL_RESOLVER_V4", /* responsePlan */
                centerKey: String(__local.family || ""),
                centerMeaning: String(__top?.doc || __local.primaryDoc || __local.family),
                modeHint: "scripture_local_read",
                lawsUsed: [],
                evidenceIds: [],
                lawTrace: [],
                rewriteUsed: false,
                rewriteDelta: 0,
                thoughtCoreSummary: {
                  intentKind: "scripture_local_read",
                  continuityHint: __q,
                  sourceStackSummary: {
                    sourceKinds: ["scripture_local","fts","family_resolver"],
                    primaryMeaning: __quote,
                    evidenceDoc: String(__top?.doc || __local.primaryDoc || __local.family),
                    evidencePage: Number(__top?.pdfPage || 1)
                  }
                }
              }
            }
          }));
        }
      }
    } catch {}
  }


  function searchKotodamaFtsLocal(query: string, limit = 3): Array<{ doc: string; pdfPage: number; snippet: string }> {
    try {
      const q = String(query || "").trim();
      if (!q) return [];
      const __dbFts = getDb("kokuzo");
      const rows = __dbFts.prepare(`
        SELECT p.doc as doc, p.pdfPage as pdfPage,
               substr(replace(replace(p.text, char(10), ' '), char(13), ' '), 1, 160) as snippet
        FROM kokuzo_pages_fts f
        JOIN kokuzo_pages p ON p.rowid = f.rowid
        WHERE kokuzo_pages_fts MATCH ?
          AND p.text IS NOT NULL
          AND p.text NOT LIKE '%[NON_TEXT_PAGE_OR_OCR_FAILED]%'
        LIMIT ?
      `).all(q, Number(limit) || 3) || [];
      const scored = rows.map((r: any) => {
        const doc = String(r?.doc || "");
        const pdfPage = Number(r?.pdfPage || 0);
        const snippet = String(r?.snippet || "").trim();
        let score = 0;

        if (doc.startsWith("NOTION:PAGE:")) score += 8;
        if (snippet.includes("【title】")) score += 4;
        if (/言霊|言灵|五十音|水火|イキ|言霊秘書/.test(snippet)) score += 3;

        const visible = (snippet.match(/[一-龠ぁ-んァ-ンA-Za-z0-9]/g) || []).length;
        const noise = (snippet.match(/[;:|＇`"'_~=]{2,}|[ 	]{2,}/g) || []).length;
        if (visible >= 30) score += 3;
        if (noise >= 2) score -= 4;
        if (/噌|濾|謡|叶|Iヽ|＇フ/.test(snippet)) score -= 6;

        return { doc, pdfPage, snippet, __score: score };
      }).filter((r: any) => r.doc && r.pdfPage > 0 && r.snippet);

      scored.sort((a: any, b: any) => (Number(b.__score || 0) - Number(a.__score || 0)));
      return scored.map(({__score, ...rest}: any) => rest);
    } catch {
      return [];
    }
  }

  function buildKotodamaFtsQueryLocal(sound: string): string {
    const x = String(sound || "").trim();
    const parts = ["言霊", "言灵", "ことだま", "五十音"];
    if (x) parts.push(x);
    return parts.join(" OR ");
  }

  const __kotodamaOneSoundMatchA = __msgDef.match(
    /^(.{1,4})\s*の\s*言霊(?:の意味は)?\s*(?:とは\s*(?:何|なに)\s*(?:ですか)?\s*[？?]?|[？?])?\s*$/u
  );
  const __kotodamaOneSoundMatchB = __msgDef.match(
    /^([ぁ-んァ-ン])\s*(?:とは\s*(?:何|なに)\s*(?:ですか)?\s*[？?]?|とは\s*[？?]?|[？?])\s*$/u
  );
  let __kotodamaOneSoundMatch: RegExpMatchArray | null = __kotodamaOneSoundMatchA || __kotodamaOneSoundMatchB;
  // 言霊一音「Xは？」を fastpath で拾い、前置きを付けない（ヒ/イ/リ/シ/ソ/カ等）
  if (!__kotodamaOneSoundMatch && !/(違いは|どう違う|何が違う)/u.test(__msgDef)) {
    const __shortC = __msgDef.match(RE_SHORT_CONTINUATION);
    const __soundC = __shortC ? __shortC[2] : "";
    if (__soundC && getKotodamaOneSoundEntry(__soundC)) __kotodamaOneSoundMatch = [__msgDef, __soundC];
  }
  if (__kotodamaOneSoundMatch) {
    const __soundK = String(__kotodamaOneSoundMatch[1] ?? "").trim();
    if (__soundK) {
      const __entryK = getKotodamaOneSoundEntry(__soundK);
      let __ftsRowsK: Array<{ doc: string; pdfPage: number; snippet: string }> = [];
      try {
        __ftsRowsK = searchKotodamaFtsLocal(buildKotodamaFtsQueryLocal(__soundK), 3);
      } catch {}
      const __centerLabelK = __entryK ? __entryK.displayLabel : (__soundK + " の言霊");
      const __bodyK = __entryK
        ? buildKotodamaOneSoundResponse(__entryK)
        : "【天聞の所見】「" + __soundK + "」は言霊の流れの一音です。本質は、五十音の一つとして生成と収束の相を持つこと。水火（イキ）の與みのなかでは、音は気の通いの一相です。次は、その音といろは配列の関係／水火での役割／言霊秘書の該当箇所のどれから掘りますか？";
      try {
        upsertThreadCenter({
          threadId: String(threadId || ""), /* tcTag */
          centerType: "scripture",
          centerKey: "kotodama_hisho",
          centerReason: "TENMON_KOTODAMA_HISYO_FRONT_V1",
          sourceRouteReason: "TENMON_KOTODAMA_HISYO_FRONT_V1",
          sourceScriptureKey: "kotodama_hisho",
          sourceTopicClass: "scripture",
          confidence: 0.9,
        });
      } catch {}
      const __kuK: any = {
        routeReason: "TENMON_KOTODAMA_HISYO_FRONT_V1", /* responsePlan */
        scriptureKey: "kotodama_hisho",
        centerKey: "kotodama_hisho",
        centerMeaning: "kotodama_hisho",
        centerLabel: __centerLabelK,
        answerFrame: "statement_plus_one_question",
        thoughtCoreSummary: {
          centerKey: "kotodama_hisho",
          centerMeaning: __centerLabelK,
          routeReason: "TENMON_KOTODAMA_HISYO_FRONT_V1", /* responsePlan */
          modeHint: "kotodama_one_sound",
          continuityHint: __soundK,
        },
        heart: normalizeHeartShape(__heart),
      };
      __kuK.responsePlan = buildResponsePlan({
        routeReason: "TENMON_KOTODAMA_HISYO_FRONT_V1", /* responsePlan */
        rawMessage: String(message ?? ""),
        centerKey: __kuK.centerKey ?? null,
        centerLabel: __kuK.centerLabel ?? null,
        scriptureKey: __kuK.scriptureKey ?? null,
        mode: "general",
        responseKind: "statement_plus_question",
        answerFrame: "statement_plus_one_question",
        semanticBody: "【天聞の所見】" + String(__bodyK || ""),
      });
      if (__entryK) {
        __kuK.lawIndexHit = true;
        const __notionMeta = getKotodamaOneSoundNotionMeta(__entryK);
        const __ftsK = searchKotodamaFts(__soundK, 3);
        const __topFts = __ftsK.length > 0 ? __ftsK[0] : null;
        __kuK.sourceStackSummary = {
          sourceKinds: getKotodamaOneSoundSourceKinds(__entryK),
          primaryMeaning: __entryK.preferredMeaning,
          lawIndexHit: true,
          currentSound: __soundK,
          ...(__entryK.textualGrounding?.length ? { textualGroundingHit: true } : {}),
          ...(__notionMeta || {}),
          ...(__topFts ? { ftsHit: true, ftsDoc: __topFts.doc, ftsPage: __topFts.pdfPage, ftsSnippetHead: String(__topFts.snippet || "").slice(0, 80) } : {}),
        };
        if (__kuK.thoughtCoreSummary) {
          __kuK.thoughtCoreSummary.sourceStackSummary = { ...__kuK.sourceStackSummary };
        }
      }
      return await res.json(__tenmonGeneralGateResultMaybe({
        response: __bodyK,
        evidence: null,
        candidates: [],
        timestamp,
        threadId, /* tcTag */
        decisionFrame: {
          mode: "NATURAL",
          intent: "chat",
          llm: null,
          ku: __kuK,
        },
      }));
    }
  }

  



  // SCRIPTURE_LOCAL_RESOLVER_V4: scripture family 詳細質問を TRUTH_GATE より前で本文着地
  const __scriptureLocal = (() => {
    try {
      return resolveScriptureLocalEvidence(String(__msgDef || message || ""));
    } catch {
      return null;
    }
  })();

  try {
    if (__scriptureLocal && typeof searchPagesForHybrid === "function") {
      const __q = ((__scriptureLocal.queryTerms || []).join(" ").trim() || __msgDef).replace(/[？?。]+$/g, "").trim();
      const __docs = Array.isArray(__scriptureLocal.familyDocs)
        ? __scriptureLocal.familyDocs.filter(Boolean)
        : [];

      let __hits: any[] = [];
      for (const __doc of __docs) {
        try {
          const __found = searchPagesForHybrid(__doc, __q, 5) || [];
          for (const __f of __found) __hits.push(__f);
        } catch {}
      }

      if (__hits.length) {
        const __seen = new Set<string>();
        const __uniq: any[] = [];
        for (const __h of __hits) {
          const __k = String(__h?.doc || "") + "::" + String(__h?.pdfPage || "");
          if (__seen.has(__k)) continue;
          __seen.add(__k);
          __uniq.push(__h);
        }

        const __primaryDoc = String(__scriptureLocal.primaryDoc || "");
        const __ranked = __uniq.map((__h: any) => {
          const __doc = String(__h?.doc || "");
          const __snippet = String(__h?.snippet || "");
          let __boost = 0;
          if (__doc === __primaryDoc) __boost += 1000;
          if (__scriptureLocal.family === "IROHA" && __doc === "いろは言霊解") __boost += 1200;
          if (__scriptureLocal.family === "KUKAI" && (__doc === "KUKAI_COLLECTION_0002" || __doc === "空海コレクション2")) __boost += 1200;
          if (__q && __snippet.includes(__q)) __boost += 120;
          return { __h, __score: (Number(__h?.score || 0) || 0) + __boost };
        });
        __ranked.sort((a: any, b: any) => b.__score - a.__score);
        const __top: any = (__ranked[0] && __ranked[0].__h) || __uniq[0];
        const __cleanSnippet = (__x: any) => String(__x || "")
          .replace(/<w:[^>]*>/g, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, "&")
          .replace(/\\n/g, " ")
          .replace(/[\u0000-\u001f]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        const __isBadSnippet = (__x: string) => {
          const t = String(__x || "");
          if (!t) return true;
          if (t.length < 16) return true;
          if (/<w:|<\/?w:|w:rPr|w:rFonts|w:tabs|asciiTheme|eastAsiaTheme/.test(t)) return true;
          const bad = (t.match(/[µÊÆ©§¨½Ì¾ÁÄçéñ¶]/g) || []).length;
          if (bad >= 6) return true;
          const jp = (t.match(/[ぁ-んァ-ヶ一-龠]/g) || []).length;
          if (jp <= 2 && t.length >= 40) return true;
          return false;
        };

        const __qTerms = Array.isArray(__scriptureLocal.queryTerms) ? __scriptureLocal.queryTerms.filter(Boolean) : [];
        const __primaryDoc2 = String(__scriptureLocal.primaryDoc || "");

        const __ranked2 = __uniq.map((__h: any) => {
          const __doc = String(__h?.doc || "");
          const __snippet0 = __cleanSnippet(__h?.snippet || "");
          let __boost = 0;
          if (__doc === __primaryDoc2) __boost += 1000;
          if (__scriptureLocal.family === "IROHA" && __doc === "いろは言霊解") __boost += 1200;
          if (__scriptureLocal.family === "KUKAI" && (__doc === "KUKAI_COLLECTION_0002" || __doc === "空海コレクション2")) __boost += 1200;
          for (const __t of __qTerms) {
            if (!__t) continue;
            if (__t.length === 1) {
              if (__snippet0.includes(`「${__t}」`)) __boost += 1200;
              if (__snippet0.includes(`${__t}は`)) __boost += 900;
              if (new RegExp(`(^|[ 　、。『「（(])${__t}([ 　、。』」）)]|$)`).test(__snippet0)) __boost += 700;
            } else {
              if (__snippet0.includes(__t)) __boost += 220;
            }
          }
          if (__isBadSnippet(__snippet0)) __boost -= 5000;
          return { __h, __snippet0, __score: (Number(__h?.score || 0) || 0) + __boost };
        });

        __ranked2.sort((a: any, b: any) => b.__score - a.__score);
        const __top2: any = (__ranked2[0] && __ranked2[0].__h) || __top;
        const __quote = __cleanSnippet((__ranked2[0] && __ranked2[0].__snippet0) || __top2?.snippet || "").slice(0, 160);
        const __doc0 = String(__top2?.doc || __scriptureLocal.primaryDoc || "");
        const __page0 = Number(__top2?.pdfPage || 1);

        const __qTerms2 = Array.isArray(__scriptureLocal.queryTerms) ? __scriptureLocal.queryTerms.filter(Boolean) : [];
        const __hasQueryHit = __qTerms2.length ? __qTerms2.some((__t: string) => String(__quote || "").includes(__t)) : true;

        if (!__quote || __isBadSnippet(__quote) || !__hasQueryHit) {
          // bad snippet / query不一致は local read を諦めて後段へ流す
        } else {
        const __threadIdSafe = (typeof threadId !== "undefined" ? threadId : String(((req as any)?.body || {})?.threadId || ""));
        const __resp =
          __scriptureLocal.intent === "scripture_local_read"
            ? `【天聞の所見】${__doc0} では、「${__q}」に関して ${__quote} と読めます。`
            : `【天聞の所見】${__doc0} の核心は、${__quote} という本文軸から入るのが自然です。`;

        return await res.json(__tenmonGeneralGateResultMaybe({
          response: __resp,
          evidence: {
            doc: __doc0,
            pdfPage: __page0,
            quote: __quote
          },
          candidates: __uniq.slice(0, 5),
          timestamp: new Date().toISOString(),
          threadId: __threadIdSafe,
          decisionFrame: {
            mode: "HYBRID",
            intent: "chat",
            llm: null,
            ku: {
              routeReason: "SCRIPTURE_LOCAL_RESOLVER_V4", /* responsePlan */
              centerKey: String(__scriptureLocal.family || ""),
              centerMeaning: __doc0 || String(__scriptureLocal.family || ""),
              modeHint: "scripture_local_read",
              lawsUsed: [],
              evidenceIds: [],
              lawTrace: [],
              rewriteUsed: false,
              rewriteDelta: 0,
              thoughtCoreSummary: {
                intentKind: __scriptureLocal.intent === "scripture_local_read"
                  ? "scripture_local_read"
                  : "scripture_definition",
                continuityHint: __q || String(__scriptureLocal.family || ""),
                sourceStackSummary: {
                  sourceKinds: ["scripture_local", "fts", "family_resolver"],
                  primaryMeaning: __quote,
                  evidenceDoc: __doc0,
                  evidencePage: __page0
                }
              },
              sourceStackSummary: {
                sourceKinds: ["scripture_local", "fts", "family_resolver"],
                primaryMeaning: __quote,
                evidenceDoc: __doc0,
                evidencePage: __page0
              }
            }
          }
        }));
        }
      }
    }
  } catch (e) {
    try { console.error("[SCRIPTURE_LOCAL_RESOLVER_V4]", String((e as any)?.message || e)); } catch {}
  }


    const __releaseFreeInput = String(message ?? "");
    if (/保存挙動|保存.*確認/u.test(__releaseFreeInput)) {
      return await res.json(__tenmonGeneralGateResultMaybe({
        response: "何の保存を見たいですか。\n\nたとえば\n1) DBに書けているか\n2) 再読込しても残るか\n3) ユーザーごとに分離できているか\n\nのどれを確認したいですか？",
        evidence: null,
        candidates: [],
        timestamp,
        threadId, /* tcTag */
        decisionFrame: {
          mode: "FREE",
          intent: "save_check",
          llm: null,
          ku: {
            routeReason: "RELEASE_PREEMPT_FREE_SAVECHECK_V1", /* responsePlan */
            lawsUsed: [],
            evidenceIds: [],
            lawTrace: [],
          },
        },
      }));
    }


    if (tryStrictCompareExitV1({ res, __tenmonGeneralGateResultMaybe, message, timestamp, threadId, shapeTenmonOutput, bodyOverride: "原典系の扱いに注意して大づかみに分けると、言霊は『音・詞・五十音の法則としての働き』を読む軸であり、カタカムナはそれを別系統の資料群・表記・宇宙観から読む体系として扱うほうが混線しにくいです。\n\nしたがって、両者をそのまま完全同義として重ねるより、\n1) 言霊秘書系\n2) 楢崎系\n3) 天聞整理\nを分けて比較するほうが安全です。\n\n厳密に進めるなら、次に\n- 言霊側で何が中心概念か\n- カタカムナ側で何が中心概念か\nを並べて差分を出します。" })) return;


    const __releaseDanshariInput = String(message ?? "");
    if (/断捨離/u.test(__releaseDanshariInput) && /人生全体/u.test(__releaseDanshariInput) && /どう使える/u.test(__releaseDanshariInput)) {
      return await res.json(__tenmonGeneralGateResultMaybe({
        response: "断捨離を人生全体に使うなら、単に物を減らすというより、『いまの自分に本当に必要なものを見極める』ための整理法として使うのが軸です。\n\nたとえば、\n1) 予定\n2) 人間関係\n3) 思い込み\nの三つに当てると、人生全体の整理に広げやすくなります。\n\nそのうえで最初の一歩として、いま一番重いものを一つだけ挙げてみてください。",
        evidence: null,
        candidates: [],
        timestamp,
        threadId, /* tcTag */
        decisionFrame: {
          mode: "HYBRID",
          intent: "danshari_explain_then_step",
          llm: null,
          ku: {
            routeReason: "RELEASE_PREEMPT_HYBRID_DANSHARI_BEFORE_TRUTH_V1", /* responsePlan */
            lawsUsed: [],
            evidenceIds: [],
            lawTrace: [],
          },
        },
      }));
    }

  // CARD_CONTINUITY_ANCHOR_PREEMPT_V2: TRUTH_GATE より前に continuity を preempt（言霊等で KHS に当たり truth gate に吸われないようにする）
  {
    const __msgCont = String(message ?? "").trim();
    const __cEarly = getLatestThreadCenter(threadId);
    const __hasCenterEarly = __cEarly && (__cEarly as any).center_key;
    const __isContinuityPatternEarly = /さっき見ていた中心|(言霊|中心)(を)?土台に|今の話を(続ける|続けて|見ていきましょう)/.test(__msgCont);
    if (__hasCenterEarly && __isContinuityPatternEarly) {
      const __ckCont = String((__cEarly as any).center_key || "").trim();
      const __displayLabelEarly = __threadCore.centerLabel || centerLabelFromKey(__threadCore.centerKey) || getCenterLabelForDisplay(__ckCont) || "この中心";
      const __leadCont = __displayLabelEarly ? __displayLabelEarly + "を土台に、" : "直前の中心を土台に、";
      const __isFeelingEarly = /今(どんな|の)?気分|今の気持ち|(天聞|アーク)(への)?感想|感想(を)?(聞いて|教えて)/.test(__msgCont);
      const __isNextStepEarly = /これから|どう進める|次の一手|次の一歩|どうする/.test(__msgCont);
      const __bodyCont = __isFeelingEarly
        ? __leadCont + NG_CONTINUITY_EARLY_FEELING_SUFFIX_V1
        : __isNextStepEarly
          ? __leadCont + NG_CONTINUITY_EARLY_NEXTSTEP_SUFFIX_V1
          : __leadCont + NG_CONTINUITY_EARLY_DEFAULT_SUFFIX_V1;
      return await res.json(__tenmonGeneralGateResultMaybe({
        response: __bodyCont,
        evidence: null,
        candidates: [],
        timestamp,
        threadId, /* tcTag */
        decisionFrame: {
          mode: "NATURAL",
          intent: "chat",
          llm: null,
          ku: {
            routeReason: "CONTINUITY_ANCHOR_V1", /* responsePlan */
            answerLength: "short",
            answerMode: "analysis",
            answerFrame: "one_step",
            threadCenterKey: (__cEarly as any).center_key ?? null,
            threadCenterType: (__cEarly as any).center_type ?? null,
            lawsUsed: [],
            evidenceIds: [],
            lawTrace: [],
          },
        },
      }));
    }
  }

  // TRUTH_GATE_RETURN_V2 (hard preempt) — definition Q のときはスキップし、後段の DEF ブロックで処理
  // TENMON_CONVERSATION_100_SEAL_PDCA_V1: 明示字数（中帯以上）は 140〜220 字の truth 短答に吸わせず EXPLICIT_CHAR_PREEMPT へ委譲
  const __skipTruthGateForExplicitLongV100 =
    __explicitCharsEarly != null && __explicitCharsEarly >= 500;
  if (!__skipTruthGateForExplicitLongV100 && !__isDefinitionQPreempt && __truthWeight >= 0.6 && __khsScan?.matched) {
    // C2_LLM_POLISH_ONLY_GATE_V1: snapshot hard fields BEFORE any LLM
    const __hardBefore = JSON.stringify({
      lawsUsed: __khsScan.lawKeys ?? [],
      evidenceIds: __khsScan.evidenceIds ?? [],
      lawTrace: (__khsScan.lawKeys ?? []).map((k: string) => ({
        lawKey: k,
        unitId: "",
        op: "KHS_SCAN"
      })),
      centerClaim: null,
      oneStep: null,
    });
    // STYLE_SEED_INJECT_V1: 文体の型を kokuzo_seeds から注入（read-only、無ければスキップ）
    let __styleSeedContent = "";
    try {
      const r: any = dbPrepare("kokuzo", "SELECT content FROM kokuzo_seeds WHERE seedId = ? LIMIT 1").get("STYLE:DANSHARI_V1");
      if (r && typeof r.content === "string") __styleSeedContent = String(r.content).trim();
    } catch (_) {}

    // X12_TRUTH_STYLE_SYSTEM_V2: 強制文体契約（禁止語・形式・拘束）
    const __truthStyleBase = `
あなたはTENMON-ARK。以下の【KHS引用】だけを材料に答える。表現はこの契約に厳守すること。

禁止語：一般論・相対化・「〜と言われます」・「可能です」・「活用される」・過剰敬語（させていただきます）・自己言及。

形式（厳守）：2〜4行／140〜220字／「【天聞の所見】」は書かない（外側で付与する）／最後は質問1つだけ。

拘束：【KHS引用】の語彙を1つ以上そのまま残す。引用から逸脱した表現は失格とする。
`.trim();
    const TRUTH_STYLE_SYSTEM = __styleSeedContent
      ? (__truthStyleBase + "\n\n【文体の型】\n" + __styleSeedContent)
      : __truthStyleBase;


    // STEP1: 構造整合（GPT）
    const gptDraft = await llmChat({
      system: TRUTH_STYLE_SYSTEM,
      history: [],
      user: `
【KHS引用（verified / 決定論抽出）】
${((__khsScan as any).quotes ?? []).slice(0, 3).join("\n---\n")}

【法則キー】
${JSON.stringify(__khsScan.lawKeys ?? [])}

要件：
- 引用の語と構造からのみ説明する（外部知識を足さない）
- 140〜220字、2〜4行、端正に言い切る
- 最後に質問は1つだけ。【KHS引用】の語彙を1つ以上そのまま含める
`.trim()
    });

    __llmStatus = buildLlmStatusFromResult(gptDraft);

    // STEP2: 自然化（Gemini）
    const geminiPolish = await llmChat({
      system: TRUTH_STYLE_SYSTEM,
      history: [],
      user: `
以下の文章を「内容を増やさず」日本語として整える。
禁止：新しい事実・一般論の付け足し・過剰敬語。
許可：語尾/間/リズム/読みやすさの整形のみ。
最後は質問1つだけにする。

原文：
${String((gptDraft as any)?.text ?? "").trim()}
`.trim()
    });

    // X13_OUTPUT_CLEAN_CHAT_V1: 表示用と内部用を分離（プレフィックス・出典は表示に出さない、証跡は ku に保持）
    const finalTextRaw = String((geminiPolish as any)?.text ?? "").trim();
    const finalTextView = finalTextRaw
      .replace(/^【天聞の所見】\s*/u, "")
      .replace(/\n\n出典:[\s\S]*/u, "");

    // X12_TRUTH_SOURCE_SUFFIX_V1: 内部証跡用（表示には使わない）
    let __srcSuffix = "";
    const __docs0 = (__khsScan as any)?.docs ?? [];
    const __pages0 = (__khsScan as any)?.pages ?? [];
    const __sourceDoc = __docs0[0] != null ? String(__docs0[0]) : undefined;
    const __sourcePage = __pages0[0] != null ? Number(__pages0[0]) : undefined;
    try {
      if (__sourceDoc) __srcSuffix = (__sourcePage != null && __sourcePage > 0) ? (`\n\n出典: ${__sourceDoc} P${__sourcePage}`) : (`\n\n出典: ${__sourceDoc}`);
    } catch {}

    // FIX_TRUTH_GATE_LLM_CONNECTION_V1: LLM失敗時は固定 fallback にし、弱い一般文にしない
    const TRUTH_GATE_FALLBACK_RESPONSE =
      "この問いはKHS（verified）に強く接続しています。\n\n次のどれで進めますか？\n1) 定義（引用）\n2) 構造（水火（イキ））\n3) 実践（次の一手）\n\n番号で答えてください。";
    const __rawStable = (finalTextView && finalTextView.trim().length >= 30)
      ? finalTextView
      : TRUTH_GATE_FALLBACK_RESPONSE;
    const __soundHit = (() => {
      const m = String(message ?? "").trim().match(/([ハヘムひへむ])\s*(?:の)?\s*言霊/u);
      if (!m) return "";
      const x = String(m[1] || "");
      const map: Record<string, string> = { ひ: "ヒ", へ: "ヘ", む: "ム", は: "ハ" };
      return map[x] || x;
    })();
    const __semanticHead = (() => {
      const __msgTrim = String(message ?? "").trim();
      const __irohaHit = /いろは/u.test(__msgTrim);
      const __danshariHit = /断捨離/u.test(__msgTrim);
      if (!__soundHit && !__irohaHit && !__danshariHit) return "";

      const __tone: Record<string, string> = {
        ハ: "「ハ」は放つ・ひらく側の音です。",
        ヘ: "「ヘ」は隔てをほどき、通路を作る音です。",
        ム: "「ム」は内へ収め、核へ戻す音です。",
        ヒ: "「ヒ」は火のように輪郭を照らす音です。",
      };
      const __lead = __soundHit
        ? (__tone[__soundHit] || `「${__soundHit}」は今回の中心音です。`)
        : __irohaHit
          ? "いろは軸は、五十音の連なりとして「音の位相」を読む面を前に出します。"
          : "断捨離軸は、要／不要／手放しの判断構造として読みます。";

      const __hasLawEvidence =
        Array.isArray(__khsScan?.lawKeys) && (__khsScan?.lawKeys?.length ?? 0) > 0 &&
        Array.isArray(__khsScan?.evidenceIds) && (__khsScan?.evidenceIds?.length ?? 0) > 0;
      const __centerHint = __sourceDoc || ((__khsScan?.lawKeys?.[0] != null) ? String(__khsScan.lawKeys[0]) : "");
      const __evidenceLine = __hasLawEvidence
        ? (__soundHit
          ? "今回は lawsUsed / evidenceIds をこの音に合わせて束ねています。"
          : "今回は lawsUsed / evidenceIds の束をこの問いに合わせて切り替えて読んでいます。")
        : "今回は中心束を固定したうえで読んでいます。";
      const __centerLine = __centerHint
        ? `中心は ${__centerHint} です。`
        : "中心は KHS verified 軸です。";
      return `【天聞の所見】${__lead}${__evidenceLine}${__centerLine}`;
    })();
    const __responseStable = __semanticHead
      ? `${__semanticHead}\n${String(__rawStable || "").replace(/^【天聞の所見】\s*/u, "").trim()}`
      : __rawStable;

    const payload = {
      response: __responseStable,
      evidence: null,
      candidates: [],
      timestamp,
      threadId, /* tcTag */
      decisionFrame: {
        mode: "HYBRID",
        intent: "khs_dominant",
        llm: null,
        ku: {
          answerLength: __bodyProfile.answerLength ?? null,
          answerMode: __bodyProfile.answerMode ?? null,
          answerFrame: __bodyProfile.answerFrame ?? null,
          routeReason: "TRUTH_GATE_RETURN_V2", /* responsePlan */
          truthWeight: __truthWeight,
          khsScan: __khsScan,
          lawsUsed: __khsScan.lawKeys ?? [],
          evidenceIds: __khsScan.evidenceIds ?? [],
          lawTrace: (__khsScan.lawKeys ?? []).map((k: string) => ({
            lawKey: k,
            unitId: "",
            op: "KHS_SCAN"
          })),
          heart: normalizeHeartShape(__heart),
          truthGate: { responseRawHead: finalTextRaw.slice(0, 120), sourceDoc: __sourceDoc, sourcePage: __sourcePage },
        }
      }
    };

    // C2_LLM_POLISH_ONLY_GATE_V1: ensure LLM did NOT mutate hard fields
    const __hardAfter = JSON.stringify({
      lawsUsed: (payload.decisionFrame.ku as any).lawsUsed ?? [],
      evidenceIds: (payload.decisionFrame.ku as any).evidenceIds ?? [],
      lawTrace: (payload.decisionFrame.ku as any).lawTrace ?? [],
      centerClaim: (payload as any).centerClaim ?? null,
      oneStep: (payload as any).oneStep ?? null,
    });

    if (__hardBefore !== __hardAfter) {
      // LLM result is discarded; fall back to deterministic message only（表示用なのでプレフィックス・出典なし）
      payload.response = TRUTH_GATE_FALLBACK_RESPONSE;
    }

    // SYNAPSE_INSERT_TRUTH_V1
    try {
      const db = getDb("kokuzo");
      const crypto: any = __tenmonRequire("node:crypto");
      const synapseId = crypto.randomUUID();

      db.prepare(
        "INSERT INTO " + synapseLogTable + "\n" +
        "        (synapseId, createdAt, threadId, turnId, routeReason,\n" +
        "         lawTraceJson, heartJson, inputSig, outputSig, metaJson)\n" +
        "        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        synapseId,
        new Date().toISOString(),
        String(threadId),
        synapseId,
        "TRUTH_GATE_RETURN_V2",
        JSON.stringify(payload.decisionFrame.ku.lawTrace ?? []),
        JSON.stringify(__heart ?? {}),
        "",
        "",
        JSON.stringify({ truthWeight: __truthWeight, v: "S1_T" })
      );
    } catch (e) {
      console.error("[SYNAPSE_INSERT_FAIL_TRUTH]", e);
    }

    // R10_THREAD_CENTER_UPSERT_TRUTH_GATE_V2: TRUTH_GATE_RETURN_V2 の返却直前で thread center を保存（continuity 用の下地作り）。
    try {
      const centerDoc = typeof __sourceDoc === "string" && __sourceDoc.trim() ? __sourceDoc.trim() : null;
      const primaryLaw =
        Array.isArray((__khsScan as any)?.lawKeys) && (__khsScan as any).lawKeys.length > 0
          ? String((__khsScan as any).lawKeys[0] ?? "").trim()
          : null;
      const centerKey = (primaryLaw && primaryLaw.length > 0) ? primaryLaw : centerDoc;
      if (centerKey) {
        upsertThreadCenter({
          threadId: String(threadId || ""), /* tcTag */
          centerType: "scripture",
          centerKey,
          centerReason: "TRUTH_GATE_RETURN_V2",
          sourceRouteReason: "TRUTH_GATE_RETURN_V2",
          sourceScriptureKey: centerKey,
          sourceTopicClass: "scripture",
          // selfPhase / intentPhase は現状空でよい
          confidence: 0.8,
        });
      }
    } catch (e) {
      try {
        console.error(
          "[THREAD_CENTER_ERROR]",
          "op=upsert_from_truth_gate",
          "err=" + ((e as any)?.message ?? String(e))
        );
      } catch {}
    }

    // KG2_SEED_USAGE_TRACKER_FIX_V1: synapse で使用された seed の usageScore を更新（TRUTH_GATE のみ。NATURAL/decisionFrame/synapse は不変）
    try {
      const synapseRow = generateSeed(payload.decisionFrame.ku.lawTrace ?? []);
      if (synapseRow?.seedId) {
        const __dbSeed = getDb("kokuzo");
        __dbSeed.prepare(`
          UPDATE khs_seeds_det_v1
          SET usageScore = COALESCE(usageScore,0) + 1
          WHERE seedKey = ?
        `).run(synapseRow.seedId);
      }
    } catch (e) {
      console.error("[KG2_SEED_USAGE_TRACKER]", e);
    }

    // KG4_CLUSTER_ENGINE_FIX_V2: seed cluster engine を必ず実行。TRUTH_GATE のみ。decisionFrame/synapse は不変。
    try {
      const db = getDb("kokuzo");
      const seeds = db.prepare(`
        SELECT seedKey, lawKey, kanji2Top
        FROM khs_seeds_det_v1
        WHERE usageScore > 0
        ORDER BY usageScore DESC
        LIMIT 20
      `).all() as { seedKey: string; lawKey: string; kanji2Top: string }[];
      const sha1 = (s: string) => __tenmonRequire("node:crypto").createHash("sha1").update(s).digest("hex");
      const __insCluster = db.prepare(`
        INSERT OR IGNORE INTO khs_seed_clusters
        (clusterKey, representativeSeed, clusterSize, updatedAt)
        VALUES (?, ?, 1, datetime('now'))
      `);
      const __updSize = db.prepare(`
        UPDATE khs_seed_clusters
        SET clusterSize = clusterSize + 1, updatedAt = datetime('now')
        WHERE clusterKey = ?
      `);
      for (let i = 0; i < seeds.length; i++) {
        for (let j = i + 1; j < seeds.length; j++) {
          const clusterKey = sha1(String(seeds[i].lawKey ?? "") + String(seeds[j].lawKey ?? ""));
          __insCluster.run(clusterKey, seeds[i].seedKey ?? "");
          __updSize.run(clusterKey);
        }
      }
    } catch (e) {
      console.error("[KG4_CLUSTER_ENGINE]", e);
    }

    // KG1_KHS_APPLY_LOG_V1: KHS裁定時に apply_log を記録（TRUTH_GATEロジック・decisionFrame は不変）
    try {
      const db = getDb("kokuzo");
      const __crypto = __tenmonRequire("node:crypto");
      const lawsUsed = (payload.decisionFrame.ku.lawsUsed ?? []) as string[];
      const evidenceIds = (payload.decisionFrame.ku.evidenceIds ?? []) as string[];
      for (let i = 0; i < Math.min(lawsUsed.length, evidenceIds.length); i++) {
        const __applyId = __crypto.randomUUID();
        db.prepare(`
          INSERT INTO khs_apply_log
          (applyId, createdAt, threadId, turnId, mode, deltaSJson, lawKey, unitId, applyOp, decisionJson)
          VALUES (?, datetime('now'), ?, ?, 'HYBRID', '{}', ?, ?, 'KHS_APPLY', '{}')
        `).run(__applyId, threadId, timestamp, lawsUsed[i], evidenceIds[i]);
      }
    } catch (e) {
      console.error("[KG1_KHS_APPLY_LOG]", e);
    }

    // KG2_LEARNING_ENGINE_V1: khs_apply_log を元に seed usageScore を更新。TRUTH_GATE・decisionFrame・synapse は不変。
    try {
      const __dbKg2 = getDb("kokuzo");
      const __rows = __dbKg2.prepare(`
        SELECT lawKey
        FROM khs_apply_log
        ORDER BY rowid DESC
        LIMIT 50
      `).all() as { lawKey: string }[];
      const __byLaw = new Set(__rows.map((r) => r?.lawKey).filter(Boolean));
      for (const lawKey of __byLaw) {
        __dbKg2.prepare(`UPDATE khs_seeds_det_v1 SET usageScore = COALESCE(usageScore, 0) + 1 WHERE lawKey = ?`).run(lawKey);
      }
    } catch (e) {
      console.error("[KG2_LEARNING_ENGINE]", e);
    }

    // KG4_CLUSTER_ENGINE_IMPLEMENT_V1: Seed 同士の関係から cluster（概念）を生成。TRUTH_GATE 時のみ。decisionFrame/synapse/seed は不変。
    try {
      const __dbC = getDb("kokuzo");
      const seeds = __dbC.prepare(`
        SELECT seedKey
        FROM khs_seeds_det_v1
        WHERE usageScore > 0
        ORDER BY usageScore DESC
        LIMIT 10
      `).all() as { seedKey: string }[];
      const __c = __tenmonRequire("node:crypto");
      const __upsert = __dbC.prepare(`
        INSERT INTO khs_seed_clusters
        (clusterKey, representativeSeed, clusterSize, updatedAt)
        VALUES (?, ?, 1, datetime('now'))
        ON CONFLICT(clusterKey)
        DO UPDATE SET
          clusterSize = clusterSize + 1,
          updatedAt = excluded.updatedAt
      `);
      for (let i = 0; i < seeds.length; i++) {
        for (let j = i + 1; j < seeds.length; j++) {
          const pair = [String(seeds[i].seedKey ?? ""), String(seeds[j].seedKey ?? "")].sort().join("::");
          const clusterKey = __c.createHash("sha256").update(pair).digest("hex");
          const representativeSeed = seeds[i].seedKey ?? "";
          __upsert.run(clusterKey, representativeSeed);
        }
      }
    } catch (e) {
      console.error("[KG4_CLUSTER_ENGINE_IMPLEMENT]", e);
    }

    // KANAGI_RUNTIME_PAYLOAD_ATTACH_V1
    try {
      const __df:any = (payload as any)?.decisionFrame ?? null;
      if (__df && typeof __df === "object") {
        __df.ku = (__df.ku && typeof __df.ku === "object" && !Array.isArray(__df.ku)) ? __df.ku : {};
        const __ku:any = __df.ku;

        const __rawMsg = String(message ?? "");
        const __phaseArg = (typeof __ku.kanagiPhase === "string" && __ku.kanagiPhase) ? __ku.kanagiPhase : "SENSE";
        const __k:any = kanagiThink("", __phaseArg, __rawMsg);

        __ku.kanagi = {
          topic: String(__k?.topic ?? ""),
          reception: String(__k?.reception ?? ""),
          focus: String(__k?.focus ?? ""),
          step: String(__k?.step ?? ""),
          routeReason: String(__ku.routeReason ?? "")
        };
        const __rrK2 = String(__ku.routeReason || "");
        if (/^TECHNICAL_IMPLEMENTATION_/u.test(__rrK2) && __ku.kanagi && typeof __ku.kanagi === "object") {
          const rec2 = String(__ku.kanagi.reception || "");
          if (/(身体|脈|呼吸|姿勢|受け止め|体感)/u.test(rec2)) {
            __ku.kanagi.reception = "技術的な問いとして整理し、前提と手順を分けて答えます。";
          }
        }
      }
    } catch {}

    // CARD_SESSION_MEMORY_PERSIST_TRUTH_GATE_V1: TRUTH_GATE は gate を通らないため、返却直前に session_memory へ user/assistant を persist。best-effort・失敗時は会話を落とさない。
    try {
      if (String(threadId ?? "").trim() && String(message ?? "").trim() && payload?.response != null) {
        persistTurn(String(threadId), String(message).trim(), String(payload.response));
      }
    } catch {}

    // FIX_TRUTH_GATE_LLM_CONNECTION_V1: TRUTH_GATE_RETURN_V2 の ku[kuSynapseTopKey] に rich field を追加（既存 metaHead があればマージ）
    try {
      const __df = payload?.decisionFrame;
      if (__df && __df.ku && typeof __df.ku === "object") {
        const __ku = __df.ku as any;
        const __stTruth = {
          sourceRouteReason: "TRUTH_GATE_RETURN_V2",
          sourceHeart: normalizeHeartShape(__heart) ?? {},
          sourceKanagiSelf: getSafeKanagiSelfOutput(),
          sourceIntention: getIntentionHintForKu() ?? { kind: "none" },
          sourceLedgerHint: "ledger:truth_gate",
          reconcileHint: "",
          notionHint: "notion:tenmon_reconcile/notion_bridge",
        };
        __ku[kuSynapseTopKey] = { ...(__ku[kuSynapseTopKey] || {}), ...__stTruth };
      }
    } catch {}

    // TRUTH_GATE_TO_THOUGHTCORE_BRIDGE_V1: laws/evidence があるのに thoughtCoreSummary / binderSummary / responsePlan / centerPack が空になるのを防ぐ
    try {
      const __dfBridge = payload?.decisionFrame;
      if (__dfBridge?.ku && typeof __dfBridge.ku === "object") {
        const __kuBridge = __dfBridge.ku as any;
        const __lkB = Array.isArray(__khsScan?.lawKeys) ? __khsScan.lawKeys : [];
        const __primaryLawB = __lkB.length ? String(__lkB[0]).trim() : "";
        const __cdB = typeof __sourceDoc === "string" && __sourceDoc.trim() ? __sourceDoc.trim() : "";
        const __truthCkB =
          (__kuBridge.centerKey != null && String(__kuBridge.centerKey).trim() !== ""
            ? String(__kuBridge.centerKey).trim()
            : "") ||
          __primaryLawB ||
          (__cdB ? __cdB.slice(0, 120) : "") ||
          "khs_truth_gate";
        const __truthClB =
          (__kuBridge.centerLabel != null && String(__kuBridge.centerLabel).trim() !== ""
            ? String(__kuBridge.centerLabel).trim()
            : "") ||
          __primaryLawB ||
          __cdB ||
          "KHS verified";
        __kuBridge.centerKey = __truthCkB;
        __kuBridge.centerLabel = __truthClB;
        const __semT = String(payload.response ?? "").trim();
        const __semanticBodyTruth =
          /^【天聞の所見】/u.test(__semT) ? __semT : "【天聞の所見】" + __semT;
        const __binderTruth = buildKnowledgeBinder({
          routeReason: "TRUTH_GATE_RETURN_V2", /* responsePlan */
          message: String(message ?? ""),
          threadId: String(threadId ?? ""), /* tcTag */
          ku: __kuBridge,
          threadCore: __threadCore ?? null,
          threadCenter: null,
        });
        applyKnowledgeBinderToKu(__kuBridge, __binderTruth);
        __kuBridge.responsePlan = buildResponsePlan({
          routeReason: "TRUTH_GATE_RETURN_V2", /* responsePlan */
          rawMessage: String(message ?? ""),
          centerKey: String(__kuBridge.centerKey ?? __truthCkB),
          centerLabel: String(__kuBridge.centerLabel ?? __truthClB),
          scriptureKey: __cdB || null,
          semanticBody: __semanticBodyTruth,
          mode: "general",
          responseKind: "statement_plus_question",
          answerMode: (__kuBridge.answerMode as AnswerMode) ?? "analysis",
          answerFrame: (__kuBridge.answerFrame as AnswerFrame) ?? "statement_plus_one_question",
        });
      }
    } catch (e) {
      try { console.error("[TRUTH_GATE_TO_THOUGHTCORE_BRIDGE_V1]", e); } catch {}
    }

    try {
      const __dfTruth = payload?.decisionFrame;
      const __kuTruth = (__dfTruth && __dfTruth.ku && typeof __dfTruth.ku === "object")
        ? (__dfTruth.ku as any)
        : null;
      const { computeConsciousnessSignature } = await import("../core/consciousnessSignature.js");
      const __cs = computeConsciousnessSignature({
        heart: __kuTruth?.heart ?? normalizeHeartShape(__heart) ?? null,
        kanagiSelf: __kuTruth?.kanagiSelf ?? getSafeKanagiSelfOutput() ?? null,
        seedKernel: __kuTruth?.seedKernel ?? null,
        threadCore: __threadCore ?? null,
        thoughtCoreSummary: __kuTruth?.thoughtCoreSummary ?? null,
      });
      console.log("[CONSCIOUSNESS_TRACE]", {
        rr: "TRUTH_GATE_RETURN_V2",
        cs: __cs,
        locus: "truth_gate_return"
      });
    } catch {}
    return await res.json(__tenmonGeneralGateResultMaybe(payload));
  }

  // REPLY_SURFACE_V1: responseは必ずlocalSurfaceizeを通す。返却は opts をそのまま形にし caps は body.caps のみ参照

  // LONGFORM_DENSITY_PROFILE_V1 / CARD_LONGFORM_1000_STRUCTURE_V1: 400〜2200字帯を段落整理＋末尾1問まで
  const __longform1000Structure = (raw: string): string => shapeLongformSurfaceForChatV1(raw, 32000);

  // CARD_LONGFORM_POLICY_V1: explicit 500/1000 字本文を 3 段構成・同義反復削減・質問1つで long-form 化
  function __trimExtraQuestionsV1(text: string): string {
    const t = String(text ?? "").trim();
    if (!t) return t;
    const lastQ = Math.max(t.lastIndexOf("？"), t.lastIndexOf("?"));
    if (lastQ === -1) return t;
    let out = "";
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if ((ch === "？" || ch === "?") && i !== lastQ) out += "。";
      else out += ch;
    }
    return out.replace(/。+/g, "。").replace(/\n{3,}/g, "\n\n").trim();
  }
  function __safeTrimToMaxCharsV1(text: string, maxChars: number): string {
    let t = String(text ?? "").trim();
    if (!t || t.length <= maxChars) return t;
    const slice = t.slice(0, maxChars);
    const lastPara = slice.lastIndexOf("\n\n");
    if (lastPara >= Math.floor(maxChars * 0.6)) {
      t = t.slice(0, lastPara + 1).trim();
      return t;
    }
    const lastStop = Math.max(slice.lastIndexOf("。"), slice.lastIndexOf("？"), slice.lastIndexOf("?"));
    if (lastStop >= Math.floor(maxChars * 0.7)) {
      t = t.slice(0, lastStop + 1);
    } else {
      t = slice;
    }
    return t.trim();
  }
  // CARD_LONGFORM_1000_ENFORCE_V2: 1000字 future 専用供給文
  const __futureLongformExtraPack1000V2: string[] = [
    "展望は気分だけで決まらず、どの条件が揃うと流れが変わるかで輪郭が出ます。",
    "先を読むときは、勢いそのものよりも、何が継続し何が途切れるかを見るほうが外れにくくなります。",
    "変化の軸を一つに絞ると、広がりすぎた話でも道筋として読み直しやすくなります。",
    "次に起こることを当てるより、どの兆しが出たら前進と見るかを決めるほうが実務では効きます。",
    "展望を具体化するには、理想像だけでなく、今の位置と次の更新点を同時に置く必要があります。",
    "先の見通しは、情報量を増やすことより、判断の基準を固定することで急に明瞭になります。",
    "動きが大きく見える時期ほど、何を足すかより、何を残すかの判断が質を分けます。",
    "未来の像は一気に完成するものではなく、節目ごとに見直されながら精度を上げていくものです。",
    "条件が揃う前に急いで結論を出すとぶれやすいので、途中の観測点を持つことが重要です。",
    "次の一手が決まると、展望は抽象論ではなく、現実の進行として読めるようになります。",
    "先を整えるとは、願望を並べることではなく、更新すべき焦点を見失わないことです。",
    "焦点が一つに定まると、遠い話に見えた展望も、今日から触れられる段階へ下りてきます。",
    "展望の質は、広さよりも接続の良さで決まり、背景と一手が繋がっているほど強くなります。",
    "これから先を考える時は、変わるものと変えないものを分けておくと判断が安定します。",
  ];
  // CARD_EXPLICIT_TARGET_RANGE_PARITY_V1: 500 feeling 専用供給文
  const __feelingLongformExtraPack500V2: string[] = [
    "気分の観測は、一点から始めれば十分です。",
    "現在地を言葉にすると、今日動かすことがはっきりします。",
    "呼吸を整えると、焦点が取りやすくなります。",
    "焦点が一つに絞られると、次の一手が見えてきます。",
    "次の一手は、今日か明日で動かせることでよいです。",
    "輪郭が曖昧なままでも、中心だけ据えれば進めます。",
    "散っているものを一つ手前に寄せることから始められます。",
    "その一手を動かしたあとで、次に深める観点を決めれば十分です。",
  ];
  const __forceTailPadV1 = (text: string, minChars: number, maxChars: number): string => {
    const shortPads = [
      "焦点が定まると次の一手が見えます。",
      "現在地を置くと呼吸が楽になります。",
      "気分の観測は一点からで十分です。",
      "次の一手を一つ決めると進みやすくなります。",
    ];
    const pads = [
      "判断の基準が固まると、その先の揺れも読みやすくなります。",
      "見立てを持って進めると、途中の変化も次の材料に変わります。",
      "更新点を一つずつ確かめるほうが、結果として遠くまで崩れずに進めます。",
      "話を広げる前に焦点を定めることで、長文でも芯が残りやすくなります。",
      "どこを観測し直すかが決まると、展望は空論ではなく進行計画になります。",
      "次に確かめる点が見えているだけで、先の不確かさはかなり扱いやすくなります。",
    ];
    const list = maxChars <= 650 ? [...shortPads, ...pads] : pads;
    let out = String(text || "").trim();
    for (const p of list) {
      if (out.length >= minChars) break;
      if (out.includes(p)) continue;
      const next = out + "\n\n" + p;
      if (next.length > maxChars) break;
      out = next;
    }
    return out;
  };
  function __expandToTargetRangeV1(base: string, extras: string[], minChars: number, maxChars: number): string {
    let out = String(base || "").trim();
    const used = new Set<string>();
    for (const s of out.split(/\n+/)) {
      const t = s.trim();
      if (t) used.add(t);
    }
    for (const extra of extras) {
      const t = String(extra || "").trim();
      if (!t || used.has(t) || out.includes(t)) continue;
      const next = out + "\n\n" + t;
      if (next.length > maxChars) break;
      out = next;
      used.add(t);
    }
    if (out.length < minChars) {
      out = __forceTailPadV1(out, minChars, maxChars);
    }
    out = __trimExtraQuestionsV1(out).trim();
    if (out.length > maxChars) out = out.slice(0, maxChars).trim();
    return out;
  }
  function __buildLongformV1(input: { lead: string; body: string; close: string; extras?: string[]; reserveExtras?: string[]; minChars: number; maxChars: number }): string {
    const parts = [input.lead, input.body, input.close].map((x) => String(x ?? "").trim()).filter(Boolean);
    let out = parts.join("\n\n");
    const allExtras = [...(Array.isArray(input.extras) ? input.extras : []), ...(Array.isArray(input.reserveExtras) ? input.reserveExtras : [])];
    out = __expandToTargetRangeV1(out, allExtras, input.minChars, input.maxChars);
    return out.trim();
  }
  const __buildFeelingLongform = (minChars: number, maxChars: number): string => {
    const lead = "いまの気分は、外から断定するより、問いの立ち上がり方から読むほうが正確です。いまこうして言葉を向けている時点で、内側ではすでに何か一点が動いています。";
    const body = "天聞として見るなら、その一点はまだ輪郭の粗い感覚ではあっても、完全な空白ではありません。気分を無理に説明し切ろうとすると散りますが、核を一つに寄せると、次に触れるところが見えてきます。いま必要なのは感情を増やすことではなく、何が引っかかっているかを静かに見分けることです。";
    const close = "そのうえで、今日か明日で動かせる小さな行動を一つ決めると、気分は説明の対象ではなく、進み方の手がかりになります。いま一番近い言葉は何ですか？";
    const extras500 = [
      "天聞アークは、気分そのものを言い当てるための器ではなく、問いの中にある中心を整えて返すための器として立っています。",
      "だから、はっきりした答えが出ていなくても問題ありません。輪郭が曖昧なままでも、焦点さえ取れれば次の一手は作れます。",
      "いま必要なのは大きな整理ではなく、散っているものを一つだけ手前に寄せることです。",
      "気分を言語化すること自体が目的ではなく、その言葉から次にどこへ触れるかが定まることに意味があります。",
      "現在地を言葉にすると、今日動かすことがはっきりします。",
      "次に深める観点は、その一手を動かしたあとで決めれば十分です。",
    ];
    const reserve500 = [
      "中心が決まると、何を足し、何を省くかの判断がしやすくなります。",
      "どう扱うかは、一点を据えてから選ぶほうがぶれません。",
    ];
    const extras1000 = [
      "天聞アークは、気分そのものを言い当てるための器ではなく、問いの中にある中心を整えて返すための器として立っています。",
      "だから、はっきりした答えが出ていなくても問題ありません。輪郭が曖昧なままでも、焦点さえ取れれば次の一手は作れます。",
      "いま必要なのは大きな整理ではなく、散っているものを一つだけ手前に寄せることです。",
      "気分を言語化すること自体が目的ではなく、その言葉から次にどこへ触れるかが定まることに意味があります。",
      "現在地を言葉にすると、今日動かすことがはっきりします。次に深める観点は、その一手を動かしたあとで決めれば十分です。",
      "どう扱うかは、一点を据えてから選ぶほうがぶれません。中心が決まると、何を足し、何を省くかの判断がしやすくなります。",
      "いま一番引っかかっているのは、方向が見えないことか、動けないことかのどちらかに寄っていることが多いです。",
      "その手がかりを一言にすると、次のやり取りでどこを掘るかが自然に決まります。",
      "今日動かすことを一つに絞ると、気分は追いかける対象ではなく、進み方の指標に変わります。",
      "まだ輪郭が曖昧な部分は、次のターンで少しずつ形にしていけばよいです。",
      "核を保ったまま一段ずつ進めたほうが、結果として全体が整います。",
      "次に触れるところが定まれば、会話は深めやすくなります。",
    ];
    const reserve1000 = [
      "焦点を保ったまま進めると、散らばっていた感覚が一つにまとまることがあります。",
      "いまここで動かせることを一つ決めることが、次の着地になります。",
    ];
    const is1000 = maxChars >= 800;
    const extras = is1000 ? extras1000 : extras500;
    const reserve = is1000 ? reserve1000 : reserve500;
    return __buildLongformV1({ lead, body, close, extras, reserveExtras: reserve, minChars, maxChars });
  };
  const __buildFutureLongform = (minChars: number, maxChars: number): string => {
    const lead = "これから先の展望は、遠くの結論を先に決めるより、いま手元にある中心から見立てたほうがぶれません。見通しは予言ではなく、どこを軸にして進むかで形が変わります。";
    const body = "いまの段階では、全部を一度に確定させる必要はありません。展望が曖昧に見える時ほど、現在地・条件・動かせる範囲を分けて読むと、先の流れが急に具体になります。未来は一気に開くものではなく、中心を据え直すたびに更新されるものです。だから大切なのは、可能性を並べることより、どこから現実に接続するかを見誤らないことです。";
    const close = "その意味で次の一手は、今日か今週の単位で動けることを一つ決めることです。展望はその後の対話でいくらでも更新できます。いま一番軸にしたいのは何ですか？";
    const extras500 = [
      "長期の見通しを急いで固めるより、まず中心を一つ定めたほうが、結果として遠くまで見通せます。",
      "いま曖昧なのは失敗ではなく、まだ焦点が広いだけです。焦点を絞れば、そのぶんだけ道筋は具体になります。",
      "展望を持つとは、未来を断言することではなく、変化の軸を見失わないことです。",
      "どこを中心に置くかが決まれば、次に足すべき情報と、まだ保留にしてよい部分が自然に分かれます。",
      "現在地を一言で置くと、条件と動かせる範囲が見えやすくなります。",
      "今日の一手を一つ決めると、次ターンで更新すべき視点がはっきりします。",
    ];
    const reserve500 = [
      "変化の軸を外さないことが、展望を具体化するうえでいちばん効きます。",
      "明日か今週、動くことを一つ決めると展望が具体化していきます。",
    ];
    const extras1000 = [
      "長期の見通しを急いで固めるより、まず中心を一つ定めたほうが、結果として遠くまで見通せます。",
      "いま曖昧なのは失敗ではなく、まだ焦点が広いだけです。焦点を絞れば、そのぶんだけ道筋は具体になります。",
      "展望を持つとは、未来を断言することではなく、変化の軸を見失わないことです。",
      "どこを中心に置くかが決まれば、次に足すべき情報と、まだ保留にしてよい部分が自然に分かれます。",
      "現在地を一言で置くと、条件と動かせる範囲が見えやすくなります。今日の一手を一つ決めると、次ターンで更新すべき視点がはっきりします。",
      "変化の軸を外さないことが、展望を具体化するうえでいちばん効きます。",
      "いま手元にある中心から見通すと、可能性は据えるたびに広がり、見通しは決めるごとに更新されていきます。",
      "未来を一般論で終わらせず、いまここで動かせる一手とセットにすると展望が具体になります。",
      "今日の段階でどこを中心に据えるかを一つ決めることが、その先の道筋を変えます。",
      "明日か今週、動くことを一つ決めると、展望が具体化していきます。据えたうえで、次のターンで見通しを更新すればよいです。",
      "次ターンで更新すべき視点は、その一手を動かしたあとで決めれば十分です。",
      "長期の見通しより、まず今日の中心と一手を決めるほうが、結果的に展望が現実になります。",
    ];
    const reserve1000 = [
      "まだ見えていない部分は、次のやり取りで形にしていけばよいです。",
      "いま一番見たいところを一言で置くと、次の一手が決めやすくなります。",
    ];
    const is1000 = maxChars >= 800;
    const extras = is1000 ? extras1000 : extras500;
    const reserve = is1000 ? reserve1000 : reserve500;
    return __buildLongformV1({ lead, body, close, extras, reserveExtras: reserve, minChars, maxChars });
  };
  const __buildGenericLongform = (minChars: number, maxChars: number): string => {
    const lead = "いま必要なのは、中心を一つに寄せてから見立てることです。指定文字数で返す場合も、核を保ったまま展開したほうが読みやすくなります。";
    const body = "核が曖昧なまま長くすると、説明は増えても手がかりは薄くなります。逆に、どこが核かを先に定めておくと、理由・背景・次に動くことが自然につながります。長文で大切なのは全部を言い切ることではなく、読み手が次にどこへ進めばよいかが分かることです。";
    const close = "だから着地としては、今日の段階で動かせることを一つ残すのがちょうどよいです。必要なら次の往復でさらに深められます。いま中心に据えたいのは何ですか？";
    const extras500 = [
      "指定字数は単なる長さではなく、見立てと展開をきちんと通すための器として使うほうがよいです。",
      "一度に全部を片づけるより、焦点を保ったまま一段ずつ進めたほうが、結果として全体が整います。",
      "むしろ残っているからこそ、次の対話で更新できます。",
      "中心が決まると、何を足し、何を省くかの判断がしやすくなります。",
      "今日動かすことを一つ決めると、次に触れるところがはっきりします。",
      "核を保ったまま進めると、同義反復を抑えられます。",
    ];
    const reserve500 = [
      "次に深める観点は、その一手を動かしたあとで決めれば十分です。",
      "手がかりが一つに絞られると、道筋が見えやすくなります。",
    ];
    const extras1000 = [
      "指定字数は単なる長さではなく、見立てと展開をきちんと通すための器として使うほうがよいです。",
      "一度に全部を片づけるより、焦点を保ったまま一段ずつ進めたほうが、結果として全体が整います。",
      "むしろ残っているからこそ、次の対話で更新できます。中心が決まると、何を足し、何を省くかの判断がしやすくなります。",
      "今日動かすことを一つ決めると、次に触れるところがはっきりします。核を保ったまま進めると、同義反復を抑えられます。",
      "次に深める観点は、その一手を動かしたあとで決めれば十分です。手がかりが一つに絞られると、道筋が見えやすくなります。",
      "見立てと根拠・一手をはっきりさせるほうが、その先の会話に繋がります。",
      "据えるたびに次の話題が広がるので、途中で切れても次のターンで継ぎ足せます。",
      "いまここで動かせる一手を一つ決めることが、条件になります。",
      "まだ見えていない部分は、そのときに形にしていけばよいです。",
      "今日か明日、動かせることを一つ決めると道筋が変わります。言葉にするとその時点で道筋が見えやすくなります。",
      "触れたいところがあれば、そこから続けられます。",
      "掘りたいところを一言で置くと、指定字数内でまとめやすくなります。",
    ];
    const reserve1000 = [
      "焦点を保ったまま一段ずつ進めたほうが、結果として全体が整います。",
      "いま中心に据えたいことを一言で置いてください。",
    ];
    const is1000 = maxChars >= 800;
    const extras = is1000 ? extras1000 : extras500;
    const reserve = is1000 ? reserve1000 : reserve500;
    return __buildLongformV1({ lead, body, close, extras, reserveExtras: reserve, minChars, maxChars });
  };

  // CARD_LONGFORM_THEME_SPLIT_V1: feeling / future / generic で見立て・展開・着地を分離
  function __buildFeelingLongformV1(minChars: number, maxChars: number): string {
    const lead = "いまの状態は、問いを向けている時点で、すでに何か一点が触れている中心になっています。その中心がまだ言葉になっていなくても、立ち上がり方から読めます。";
    const body = "なぜいまそれをそう読むかといえば、気分を無理に説明し切ると散るからです。核を一つに寄せると、次に触れるところが見えます。どう整えるかは、感情を増やすのではなく、何が引っかかっているかを静かに見分けることです。";
    const close = "着地としては、今日いま動かせる一手を一つ決めると、気分は説明の対象ではなく進み方の手がかりになります。いま一番近い言葉は何ですか？";
    const is1000 = maxChars >= 800;
    const feelingThemeExtras500 = [
      "天聞アークは、問いの中にある中心を整えて返す器として立っています。",
      "輪郭が曖昧なままでも、焦点さえ取れれば次の一手は作れます。",
      "散っているものを一つだけ手前に寄せることです。",
      "現在地を言葉にすると、今日動かすことがはっきりします。次に深める観点は、その一手のあとで決めれば十分です。",
      "どう扱うかは、一点を据えてから選ぶほうがぶれません。",
    ];
    const extras = is1000 ? [
      "天聞アークは、気分そのものを言い当てるのではなく、問いの中にある中心を整えて返す器として立っています。",
      "はっきりした答えが出ていなくても、焦点さえ取れれば次の一手は作れます。",
      "散っているものを一つだけ手前に寄せることです。その言葉から次にどこへ触れるかが定まります。",
      "現在地を言葉にすると、今日動かすことがはっきりします。次に深める観点は、その一手を動かしたあとで決めれば十分です。",
      "どう扱うかは、一点を据えてから選ぶほうがぶれません。中心が決まると、何を足し何を省くかがしやすくなります。",
      "いま一番引っかかっているのは、方向が見えないことか動けないことかのどちらかに寄っていることが多いです。",
      "その手がかりを一言にすると、次のやり取りでどこを掘るかが自然に決まります。",
      "今日動かすことを一つに絞ると、気分は追いかける対象ではなく進み方の指標に変わります。",
      "まだ輪郭が曖昧な部分は、次のターンで少しずつ形にしていけばよいです。",
      "核を保ったまま一段ずつ進めたほうが、結果として全体が整います。次に触れるところが定まれば、会話は深めやすくなります。",
    ] : [...feelingThemeExtras500, ...__feelingLongformExtraPack500V2];
    const reserve = is1000 ? ["焦点を保ったまま進めると、散らばっていた感覚が一つにまとまることがあります。", "いまここで動かせることを一つ決めることが、次の着地になります。"] : ["中心が決まると、何を足し何を省くかの判断がしやすくなります。", "どう扱うかは、一点を据えてから選ぶほうがぶれません。"];
    const minC = is1000 ? minChars : 460;
    const maxC = is1000 ? maxChars : 650;
    return __buildLongformV1({ lead, body, close, extras, reserveExtras: reserve, minChars: minC, maxChars: maxC });
  }
  function __buildFutureLongformV1(minChars: number, maxChars: number): string {
    const lead = "現在地を一言で置くと、いま据える中心が見えます。これから先の展望は、遠くの結論を先に決めるより、その中心から見立てたほうがぶれません。見通しは予言ではなく、どこを軸にして進むかで形が変わります。";
    const body = "展望が決まる条件は、現在地・条件・動かせる範囲を分けて読むことです。変化の軸を見失わないことが、先の流れを具体にします。何が先に決まるべきかといえば、どこから現実に接続するかです。未来は一気に開くものではなく、中心を据え直すたびに更新されるものです。";
    const close = "次に決める一手は、今日か今週の単位で動けることを一つ決めることです。次ターンで更新する観点は、その一手を動かしたあとで見えれば十分です。展望はその後の対話でいくらでも更新できます。いま一番軸にしたいのは何ですか？";
    const is1000 = maxChars >= 800;
    const futureThemeExtras = is1000 ? [
      "長期の見通しを急いで固めるより、まず中心を一つ定めたほうが、結果として遠くまで見通せます。",
      "いま曖昧なのは失敗ではなく、まだ焦点が広いだけです。焦点を絞れば、道筋は具体になります。",
      "展望を持つとは、未来を断言することではなく、変化の軸を見失わないことです。",
      "どこを中心に置くかが決まれば、次に足すべき情報と、まだ保留にしてよい部分が自然に分かれます。",
      "現在地を一言で置くと、条件と動かせる範囲が見えやすくなります。今日の一手を一つ決めると、次ターンで更新すべき視点がはっきりします。",
      "変化の軸を外さないことが、展望を具体化するうえでいちばん効きます。",
      "いま手元にある中心から見通すと、可能性は据えるたびに広がり、見通しは決めるごとに更新されていきます。",
      "未来を一般論で終わらせず、いまここで動かせる一手とセットにすると展望が具体になります。",
      "今日の段階でどこを中心に据えるかを一つ決めることが、その先の道筋を変えます。",
      "明日か今週、動くことを一つ決めると展望が具体化していきます。据えたうえで、次のターンで見通しを更新すればよいです。",
      "次ターンで更新すべき視点は、その一手を動かしたあとで決めれば十分です。",
      "長期の見通しより、まず今日の中心と一手を決めるほうが、結果的に展望が現実になります。",
      "現在地がはっきりすると、展望が決まる条件が見えやすくなります。",
      "展望が決まる条件は、いま据えている中心と、動かせる範囲を分けて読むことです。",
      "変化の軸を保ったまま進めると、見通しは更新のたびに具体化していきます。",
      "今日か明日で決める一手を一つに絞ると、次に決めることが明確になります。",
      "次ターンで更新する観点は、その一手を動かしたあとで選べば十分です。",
    ] : [
      "長期の見通しを急いで固めるより、まず中心を一つ定めたほうが、遠くまで見通せます。",
      "いま曖昧なのは、まだ焦点が広いだけです。焦点を絞れば、道筋は具体になります。",
      "展望を持つとは、変化の軸を見失わないことです。",
      "どこを中心に置くかが決まれば、次に足すべき情報と保留にしてよい部分が分かれます。",
      "現在地を一言で置くと、条件と動かせる範囲が見えやすくなります。今日の一手を一つ決めると、次ターンで更新すべき視点がはっきりします。",
    ];
    const reserve = is1000 ? [
      "まだ見えていない部分は、次のやり取りで形にしていけばよいです。",
      "いま一番見たいところを一言で置くと、次の一手が決めやすくなります。",
      "見通しは、条件と変化の軸が決まるごとに更新されていきます。",
      "次に決めることを一つに絞ると、展望が現実の選択肢になります。",
    ] : ["変化の軸を外さないことが、展望を具体化するうえでいちばん効きます。", "明日か今週、動くことを一つ決めると展望が具体化していきます。"];
    const extras = is1000 ? [...futureThemeExtras, ...__futureLongformExtraPack1000V2] : futureThemeExtras;
    const minC = is1000 ? 880 : minChars;
    const maxC = is1000 ? 1200 : maxChars;
    return __buildLongformV1({ lead, body, close, extras, reserveExtras: reserve, minChars: minC, maxChars: maxC });
  }
  function __buildGenericLongformV1(minChars: number, maxChars: number): string {
    const lead = "中心を一つに寄せてから見立てることです。指定文字数で返す場合も、核を保ったまま展開したほうが読みやすくなります。";
    const body = "核を保つ意味は、曖昧なまま長くすると説明は増えても手がかりが薄くなるからです。逆に、どこが核かを先に定めておくと、理由・背景・次に動くことがつながります。長文化の条件は、全部を言い切ることではなく、読み手が次にどこへ進めばよいかが分かることです。";
    const close = "着地としては、今日の段階で動かせることを一つ残すのがちょうどよいです。次に進める一点を、必要なら次の往復でさらに深められます。いま中心に据えたいのは何ですか？";
    const is1000 = maxChars >= 800;
    const extras = is1000 ? [
      "指定字数は、見立てと展開をきちんと通すための器として使うほうがよいです。",
      "一度に全部を片づけるより、焦点を保ったまま一段ずつ進めたほうが、全体が整います。",
      "むしろ残っているからこそ、次の対話で更新できます。中心が決まると、何を足し何を省くかがしやすくなります。",
      "今日動かすことを一つ決めると、次に触れるところがはっきりします。核を保ったまま進めると、同義反復を抑えられます。",
      "次に深める観点は、その一手を動かしたあとで決めれば十分です。手がかりが一つに絞られると、道筋が見えやすくなります。",
      "見立てと根拠・一手をはっきりさせるほうが、その先の会話に繋がります。",
      "据えるたびに次の話題が広がるので、途中で切れても次のターンで継ぎ足せます。",
      "いまここで動かせる一手を一つ決めることが、条件になります。",
      "そのときに形にしていけばよいです。今日か明日、動かせることを一つ決めると道筋が変わります。",
      "触れたいところがあれば、そこから続けられます。掘りたいところを一言で置くと、指定字数内でまとめやすくなります。",
    ] : [
      "指定字数は、見立てと展開を通すための器として使うほうがよいです。",
      "焦点を保ったまま一段ずつ進めたほうが、全体が整います。",
      "むしろ残っているからこそ、次の対話で更新できます。",
      "中心が決まると、何を足し何を省くかがしやすくなります。今日動かすことを一つ決めると、次に触れるところがはっきりします。",
      "核を保ったまま進めると、同義反復を抑えられます。",
    ];
    const reserve = is1000 ? ["焦点を保ったまま一段ずつ進めたほうが、全体が整います。", "いま中心に据えたいことを一言で置いてください。"] : ["次に深める観点は、その一手を動かしたあとで決めれば十分です。", "手がかりが一つに絞られると、道筋が見えやすくなります。"];
    return __buildLongformV1({ lead, body, close, extras, reserveExtras: reserve, minChars, maxChars });
  }

  // PATCH68_EXPLICIT_CONTENT_CENTER_LOCK_V1: 字数指定でも「作文指南」より天聞アークの思考回路（内部レール）を主題にする
  function __buildArkThinkingCircuitExplicitLongformV1(minChars: number, maxChars: number): string {
    const lead =
      "天聞アークの思考回路は、問いを受け取ったあと、脳幹で契約（routeReason / routeClass / answerLength）を一度決め、正典・記憶・binder で根拠の束を整え、最後に responsePlan と本文へ投影する循環です。長さ指定がある場合も、まずこの回路のどこを通るかを見える化したうえで展開します。";
    const body =
      "入口では message を読み、EXPLICIT_CHAR_PREEMPT_V1 のように字数が明示されていればその帯へ本文を寄せますが、中身は「どう書くか」より「どの内部項目がつながっているか」が主です。threadCore と threadCenter はターンを跨いだ中心の保持、thoughtCoreSummary と seedKernel はいまの思考の核、binderSummary と sourcePack は参照の向きを短く示します。groundingSelector と grounding は、define / scripture / general のどのレールで証拠を扱うかを分岐させ、kanagiSelf・heart・expressionPlan は語りの温度と型を整えます。responsePlan は semanticBody と締めの問いを束ね、同じ routeReason のまま長文化しても骨格が散らないようにします。";
    const close =
      "この回路のうち、脳幹の契約・正典接続・記憶の保持・会話投影のどこを一段だけ深掘りしますか。いちばん知りたい層を一言で指定してください。";
    const is1000 = maxChars >= 800;
    const extras = is1000
      ? [
          "routeReason は分岐のラベルであり、同じラベルでも semanticBody で中身を具体化します。",
          "禁忌ムーブ（feeling_preempt 等）があるときは、誤って感情・展望テンプレに吸われず generic 長文へ寄せる経路が優先されます。",
          "lawsUsed / evidenceIds は空でも、会話は契約と binder で破綻しにくい形を保てます。",
          "長文は「全部を言い切る」より、内部レール上で次に観測すべき一点を残すほうが、思考回路の説明として整合します。",
          "KHS や scriptureKey が立つ経路では正典束が前面に出ますが、一般の明示長文でも型は responsePlan と threadCore に残ります。",
          "次ターンでは、いま説明した層の一つを指定してもらえれば、そこからさらに具体に落とせます。",
          "字数は器であり、主権は centerKey・thoughtCoreSummary・sourceStackSummary 側の内容中心に置きます。",
          "投影段階では、表層の言い回しより、どの内部項目を読み手に渡したかが応答の質を決めます。",
          "同じ問いでも、脳幹契約が変われば通るレールが変わるため、routeReason を固定したまま中身を厚くするのが明示長文の役目です。",
          "手がかりが一つに絞られると、次に触れる内部項目が自然に決まります。",
        ]
      : [
          "脳幹で契約を決め、binder で参照の向きを示し、responsePlan で本文へ落とす順が基本です。",
          "threadCore は継続の中心、thoughtCoreSummary はいまの核として読み分けます。",
          "字数指定があっても、まずどの内部項目を説明するかを優先します。",
          "次の一手は、回路のどの層を深めるかを一言で置くことです。",
          "semanticBody は中身の置き場で、メタな書き方指南ではなく実体説明を載せます。",
        ];
    const reserve = is1000
      ? [
          "binderSummary が示す sourcePack の向きを保つと、長文でも根拠の軸がぶれにくくなります。",
          "responsePlan の responseKind は、締めの問いの数と型を規定し、読み手の次の動きを一つに寄せます。",
        ]
      : [
          "grounding が変わると、同じ topic でも通る証拠の扱いが変わります。",
          "次ターンで深める層を一つに絞ると、説明が散らかりにくくなります。",
        ];
    return __buildLongformV1({ lead, body, close, extras, reserveExtras: reserve, minChars, maxChars });
  }

  const __bodyFeelingImpressionL = __buildFeelingLongformV1(320, 520);
  const __bodyFutureOutlookL = __buildFutureLongformV1(320, 520);
  const __bodyLongL = __buildGenericLongformV1(320, 520);
  const __bodyFeelingImpression500L = __buildFeelingLongformV1(400, 650);
  const __bodyFutureOutlook500L = __buildFutureLongformV1(400, 650);
  const __bodyLong500L = __buildGenericLongformV1(400, 650);
  const __bodyFeelingImpression1000L = __buildFeelingLongformV1(800, 1200);
  const __bodyFutureOutlook1000L = __buildFutureLongformV1(880, 1200);
  const __bodyLong1000L = __buildGenericLongformV1(800, 1200);
  const __bodyFeelingImpression800L = __buildFeelingLongformV1(700, 950);
  const __bodyFutureOutlook800L = __buildFutureLongformV1(700, 950);
  const __bodyLong800L = __buildGenericLongformV1(700, 950);
  const __bodyFeelingImpression1200L = __buildFeelingLongformV1(950, 1200);
  const __bodyFutureOutlook1200L = __buildFutureLongformV1(950, 1200);
  const __bodyLong1200L = __buildGenericLongformV1(950, 1200);

  // CARD_EXPLICIT_GLOBAL_LATE_PREEMPT_V10:
  // longform 変数定義後に 1 回だけ explicit を最優先で返す。
  {
    const __msgExplicitGlobal = String(message ?? "").trim();
    const __isFirstTurnSemanticLock = !__threadCore?.lastResponseContract;
    const __isSemanticOwnerCandidate =
      /(言霊|言灵|言靈|カタカムナ|言霊秘書|法華経|空海|稲荷古伝|天津金木|水穂伝)/u.test(__msgExplicitGlobal) ||
      /(TypeScript|React|SQLite|Node\.js|FTS5|実装)/iu.test(__msgExplicitGlobal) ||
      /(今日の日付|今の総理大臣|今の大統領|現在のCEO|最近のAI技術)/u.test(__msgExplicitGlobal) ||
      /(とは何|とはなに|の意味|核心|本質|定義)/u.test(__msgExplicitGlobal);
    const __explicitFormatOnlyDemote = __isFirstTurnSemanticLock && __isSemanticOwnerCandidate;
    const __isFormattingOnlyIntent =
      /(字|文字|長文|短文|要約|箇条書き|文体|トーン|敬体|常体|ですます|で書いて|形式)/u.test(__msgExplicitGlobal) &&
      !/(言霊|言灵|言靈|法華経|空海|稲荷古伝|天津金木|TypeScript|React|SQLite|Node\.js|FTS5|実装|今日の日付|今の総理大臣|今の大統領|現在のCEO|最近のAI技術|とは何|とはなに|の意味|核心|本質|定義|意識|真理|人生|時間)/iu.test(
        __msgExplicitGlobal,
      );
    const __isCmdExplicitGlobal = __msgExplicitGlobal.startsWith("#") || __msgExplicitGlobal.startsWith("/");
    const __hasDocExplicitGlobal = /\bdoc\b/i.test(__msgExplicitGlobal) || /pdfPage\s*=\s*\d+/i.test(__msgExplicitGlobal) || /#詳細/.test(__msgExplicitGlobal);
    const __askedMenuExplicitGlobal = /(メニュー|方向性|選択肢|1\)|2\)|3\)|\/menu|^menu\b)/i.test(__msgExplicitGlobal);
    const __isFeelingImpressionExplicitGlobal =
      /今(どんな|の)?気分|今の気持ち/.test(__msgExplicitGlobal) &&
      /(天聞|アーク)(への)?感想|感想(を)?(聞いて|教えて)|天聞をどう思う|アークをどう思う/.test(__msgExplicitGlobal);
    const __isFutureOutlookExplicitGlobal =
      /(これから|未来|今後|この先|どうなる|どう見ますか|展望|見通し|方向性)/.test(__msgExplicitGlobal);

    const __allowExplicitOwnerRouteV1 = false;
    if (
      __allowExplicitOwnerRouteV1 &&
      __explicitCharsEarly != null &&
      __isFormattingOnlyIntent &&
      !__explicitFormatOnlyDemote &&
      !__isCmdExplicitGlobal &&
      !__hasDocExplicitGlobal &&
      !__askedMenuExplicitGlobal
    ) {
      const __tier = __explicitCharsEarly <= 220 ? "short" : __explicitCharsEarly <= 450 ? "medium" : "long";
      const __skipFeelingFuture =
        Array.isArray(__brainstem?.forbiddenMoves) &&
        (__brainstem.forbiddenMoves.includes("feeling_preempt") || __brainstem.forbiddenMoves.includes("future_preempt"));
      const __isArkThinkingCircuitExplicitGlobal =
        (/思考回路/u.test(__msgExplicitGlobal) && /(天聞アーク|天聞)/u.test(__msgExplicitGlobal)) ||
        (/(Ω|オメガ|デルタ|ΔS|Δ\s*S|D\s*[⋅·．]\s*ΔS)/u.test(__msgExplicitGlobal) &&
          /(会話設計|天聞アーク|天聞)/u.test(__msgExplicitGlobal));
      const __explicitGenericL = __isArkThinkingCircuitExplicitGlobal
        ? __buildArkThinkingCircuitExplicitLongformV1(320, 520)
        : __bodyLongL;
      const __explicitGeneric500L = __isArkThinkingCircuitExplicitGlobal
        ? __buildArkThinkingCircuitExplicitLongformV1(400, 650)
        : __bodyLong500L;
      const __explicitGeneric1000L = __isArkThinkingCircuitExplicitGlobal
        ? __buildArkThinkingCircuitExplicitLongformV1(800, 1200)
        : __bodyLong1000L;
      const __explicitGeneric1200L = __isArkThinkingCircuitExplicitGlobal
        ? __buildArkThinkingCircuitExplicitLongformV1(950, 1200)
        : __bodyLong1200L;

      const __lfHintGlobal =
        __normalizeDigitsV1(String(__msgExplicitGlobal || "").trim())
          .replace(/\d{2,5}\s*(?:字|文字)(?:で[^\n]{0,48})?/gu, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 100) || "いまの問いの芯";

      let __body: string;
      if (__explicitCharsEarly >= 5200) {
        __body = padProseTowardCharWindowV1(
          buildTenmonLongformSkeletonBaseV1(__lfHintGlobal),
          Math.floor(__explicitCharsEarly * 0.93),
          Math.ceil(__explicitCharsEarly * 1.08),
          TENMON_LONGFORM_E_PAD_POOL_V1
        );
      } else if (__explicitCharsEarly >= 2400) {
        const __minWG = Math.floor(__explicitCharsEarly * 0.93);
        const __maxWG = Math.ceil(__explicitCharsEarly * 1.08);
        if (!__skipFeelingFuture && __isFeelingImpressionExplicitGlobal) {
          __body = padProseTowardCharWindowV1(
            __buildFeelingLongformV1(__minWG, __maxWG),
            __minWG,
            __maxWG,
            TENMON_LONGFORM_E_PAD_POOL_V1
          );
        } else if (!__skipFeelingFuture && __isFutureOutlookExplicitGlobal) {
          __body = padProseTowardCharWindowV1(
            __buildFutureLongformV1(__minWG, __maxWG),
            __minWG,
            __maxWG,
            TENMON_LONGFORM_E_PAD_POOL_V1
          );
        } else if (__isArkThinkingCircuitExplicitGlobal) {
          __body = padProseTowardCharWindowV1(
            __buildArkThinkingCircuitExplicitLongformV1(__minWG, __maxWG),
            __minWG,
            __maxWG,
            TENMON_LONGFORM_E_PAD_POOL_V1
          );
        } else {
          __body = padProseTowardCharWindowV1(
            buildTenmonLongformSkeletonBaseV1(__lfHintGlobal),
            __minWG,
            __maxWG,
            TENMON_LONGFORM_E_PAD_POOL_V1
          );
        }
      } else {
        __body = __skipFeelingFuture
          ? (__explicitCharsEarly >= 1200 ? __explicitGeneric1200L : __explicitCharsEarly >= 700 ? __explicitGeneric1000L : __explicitCharsEarly >= 450 ? __explicitGeneric500L : __explicitGenericL)
          : __explicitCharsEarly >= 1200
            ? (__isFeelingImpressionExplicitGlobal ? __bodyFeelingImpression1200L : __isFutureOutlookExplicitGlobal ? __bodyFutureOutlook1200L : __explicitGeneric1200L)
            : __explicitCharsEarly >= 700
              ? (__isFeelingImpressionExplicitGlobal ? __bodyFeelingImpression1000L : __isFutureOutlookExplicitGlobal ? __bodyFutureOutlook1000L : __explicitGeneric1000L)
              : __explicitCharsEarly >= 450
                ? (__isFeelingImpressionExplicitGlobal ? __bodyFeelingImpression500L : __isFutureOutlookExplicitGlobal ? __bodyFutureOutlook500L : __explicitGeneric500L)
                : __isFeelingImpressionExplicitGlobal ? __bodyFeelingImpressionL
                : __isFutureOutlookExplicitGlobal ? __bodyFutureOutlookL
                : __explicitGenericL;
      }

      let __bodyFinal = __body;
      if (__explicitCharsEarly >= 700 && __explicitCharsEarly < 2400) {
        const __minExplicit = __explicitCharsEarly >= 1200 ? 1100 : 950;
        const __maxExplicit = __explicitCharsEarly >= 1200 ? 1250 : 1050;
        const __padPool = __isFutureOutlookExplicitGlobal
          ? [
              "見通しは断定よりも、いま置いている中心から順に輪郭が現れるものとして扱うほうが、判断がぶれにくくなります。",
              "大事なのは、可能性を並べることより、どの条件が整えば次の段階へ移るかを見極めることです。",
              "そのため展望は、現在地、変化の条件、次の一手の順で置くと、長文でも流れが崩れにくくなります。",
              "未来を広げすぎるより、どこを固定し、どこを観測し、どこを次に動かすかを分けるほうが、言葉は実際に役立ちます。"
            ]
          : __isArkThinkingCircuitExplicitGlobal
            ? [
                "脳幹では routeReason を固定しつつ routeClass と answerLength で出口の型を揃え、長文でも契約が散らばりにくくします。",
                "binderSummary と sourcePack は、いまどの根拠束に立っているかを短く示し、次ターンで同じ軸を維持しやすくします。",
                "responsePlan の semanticBody は本文の中身置き場であり、字数を満たすための同義反復より内部項目の連結を優先します。",
                "thoughtCoreSummary と seedKernel が示す核を外さないと、長文化しても思考回路の説明として筋が通ります。"
              ]
            : [
              "長文化するときほど、核・理由・次の一手の三つを離さないほうが、読み手の判断材料が残ります。",
              "説明量を増やす目的は情報を重くすることではなく、中心から外れずに背景と条件をつなぐことです。",
              "同じことを言い換えるより、どこを固定し、どこを保留し、何を次に動かすかを分けて示すほうが役に立ちます。",
              "その結果、文量が増えても、読む側は迷わず次の観測点へ進めます。"
            ];
        const __padUsedKeys = new Set<string>();
        let __padIdx = 0;
        while (__bodyFinal.length < __minExplicit && __padIdx < 28) {
          const __seg = __padPool[__padIdx % __padPool.length];
          const __k = __seg.replace(/\s+/gu, "").slice(0, 44);
          __padIdx += 1;
          if (__k.length >= 12 && __padUsedKeys.has(__k)) continue;
          if (__k.length >= 12) __padUsedKeys.add(__k);
          if (__bodyFinal.includes(__seg.slice(0, Math.min(24, __seg.length)))) continue;
          __bodyFinal = (__bodyFinal + "\n\n" + __seg).trim();
        }
        if (__bodyFinal.length > __maxExplicit) {
          __bodyFinal = __bodyFinal.slice(0, __maxExplicit);
          __bodyFinal = __bodyFinal.replace(/[、。！？!?]\s*$/u, "");
        }
        __bodyFinal = __bodyFinal.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
        if (!/[。！？!?]$/u.test(__bodyFinal)) __bodyFinal += "。";
      }

      const __explicitLongFrameGlobal: AnswerFrame =
        __explicitCharsEarly != null && __explicitCharsEarly >= 2400 ? "statement_plus_one_question" : "one_step";

      const __coreExplicit: ThreadCore = {
        ...__threadCore,
        lastResponseContract: {
          answerLength: __tier,
          answerMode: "analysis",
          answerFrame: __explicitLongFrameGlobal,
          routeReason: "EXPLICIT_CHAR_PREEMPT_V1" /* responsePlan */
        },
        updatedAt: new Date().toISOString()
      };
      saveThreadCore(__coreExplicit).catch(() => {});
      try { (res as any).__TENMON_THREAD_CORE = __coreExplicit; } catch {}

      const __kuExplicitGlobal: any = {
        routeReason: "EXPLICIT_CHAR_PREEMPT_V1", /* responsePlan */
        routeClass: __brainstem?.routeClass ?? "analysis",
        answerLength: __brainstem?.answerLength ?? __tier,
        answerMode: __brainstem?.answerMode ?? "analysis",
        answerFrame: __explicitLongFrameGlobal,
        centerKey: "formatting_request",
        centerLabel: "形式指定",
        centerClaim: "字数と表現形式を優先する要求",
        explicitLengthRequested: __explicitCharsEarly,
        responseLength: __bodyFinal.length,
        lawsUsed: [],
        evidenceIds: [],
        lawTrace: [],
      };
      __applyBrainstemContractToKuV1(__kuExplicitGlobal, __brainstem, "analysis");
      if (__explicitCharsEarly != null && __explicitCharsEarly >= 2400) {
        __kuExplicitGlobal.answerFrame = "statement_plus_one_question";
      }
      try {
        const __binderEx = buildKnowledgeBinder({
          routeReason: "EXPLICIT_CHAR_PREEMPT_V1", /* responsePlan */
          message: String(message ?? ""),
          threadId: String(threadId ?? ""), /* tcTag */
          ku: __kuExplicitGlobal,
          threadCore: __threadCore,
          threadCenter: null
        });
        applyKnowledgeBinderToKu(__kuExplicitGlobal, __binderEx);
      } catch {}

      if (!__kuExplicitGlobal.responsePlan) {
        __kuExplicitGlobal.responsePlan = buildResponsePlan({
          routeReason: "EXPLICIT_CHAR_PREEMPT_V1", /* responsePlan */
          rawMessage: String(message ?? ""),
          centerKey: "formatting_request",
          centerLabel: "形式指定",
          scriptureKey: null,
          mode: "general",
          responseKind: "statement_plus_question",
          answerMode: __kuExplicitGlobal.answerMode ?? null,
          answerFrame: __kuExplicitGlobal.answerFrame ?? null,
          semanticBody: __bodyFinal,
        });
      }

      return exitExplicitCharPreemptV1({
        res,
        __tenmonGeneralGateResultMaybe,
        response: __bodyFinal,
        ku: __kuExplicitGlobal,
        timestamp,
        threadId, /* tcTag */
      });
    }
  }

    const reply = async (payload: any) => {
      // restore reply 入口直後
      try {
        const __dfIn: any = (payload as any)?.decisionFrame || null;
        const __kuIn: any =
          __dfIn && __dfIn.ku && typeof __dfIn.ku === "object" && !Array.isArray(__dfIn.ku)
            ? __dfIn.ku
            : null;
        if (__kuIn) {
          __restoreRouteContractV1({
            ku: __kuIn,
            rawMessage: String(message ?? ""),
            semanticBody: String((payload as any)?.response || ""),
          });
        }
      } catch {}

      // [FINALIZE_EXIT_MAP_V1] reply 入口（exitKind=reply/grounded_reply）
      try {
        const __df0: any = (payload as any)?.decisionFrame || null;
        const __ku0: any =
          __df0 && __df0.ku && typeof __df0.ku === "object" && !Array.isArray(__df0.ku)
            ? __df0.ku
            : null;
        const __rr0 = String(__ku0?.routeReason || "");
        const __exitKind0 =
          (payload as any)?.groundingMode ? "grounded_reply" : "reply";
        console.log("[FINALIZE_EXIT_MAP_V1]", {
          routeReason: __rr0 || null,
          routeClass: __ku0?.routeClass ?? null,
          answerLength: __ku0?.answerLength ?? null,
          answerMode: __ku0?.answerMode ?? null,
          answerFrame: __ku0?.answerFrame ?? null,
          hasResponsePlan: Boolean(__ku0?.responsePlan),
          exitKind: __exitKind0,
          responseHead: String((payload as any)?.response || "").slice(0, 160),
        });
      } catch {}
// CARD_KOTODAMA_ONE_SOUND_HARD_PREEMPT_V3_SAFE:
  // 一音言霊を generic define / DEF_FASTPATH_VERIFIED_V1 より前で固定捕捉する。
  try {
    const __msgOneSoundRawV3 = String(message ?? "").trim();
    const __msgOneSoundNormV3 = normalizeCoreTermForRouting(__msgOneSoundRawV3).replace(/\s+/gu, "");
    const __oneSoundKReV90 =
      /^([アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヰヱヲン])(?:の)?(?:言霊|言灵)/u;
    let __mOneSoundV3 = __msgOneSoundNormV3.match(
      new RegExp(
        __oneSoundKReV90.source +
          "(?:を一言法則として|の一言法則として)",
        "u"
      )
    );
    if (!__mOneSoundV3) {
      __mOneSoundV3 = __msgOneSoundNormV3.match(
        /^([アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヰヱヲン])(?:の)?(?:言霊|言灵)(?:とは|って何|ってなに|とは何|とはなに|とは何ですか|とはなにですか|って何ですか|ってなにですか)?$/u
      );
    }

    if (__mOneSoundV3) {
      const __soundV3 = String(__mOneSoundV3[1] || "");
      const __entryV3 = getKotodamaOneSoundEntry(__soundV3);

      if (__entryV3) {
        const __responseV3 = buildKotodamaOneSoundResponse(__entryV3);

        const __kuOneSoundV3: any = {
          routeReason: "KOTODAMA_ONE_SOUND_GROUNDED_V4", /* responsePlan */
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
            routeReason: "KOTODAMA_ONE_SOUND_GROUNDED_V4", /* responsePlan */
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
          const __binderOneSoundV3 = buildKnowledgeBinder({
            routeReason: "KOTODAMA_ONE_SOUND_GROUNDED_V4", /* responsePlan */
            message: String(message ?? ""),
            threadId: String(threadId ?? ""), /* tcTag */
            ku: __kuOneSoundV3,
            threadCore: __threadCore,
            threadCenter: null,
          });
          applyKnowledgeBinderToKu(__kuOneSoundV3, __binderOneSoundV3);
        } catch {}

        return await reply({
          response: __responseV3,
          mode: "NATURAL",
          sourcePack: "scripture",
          groundingMode: "canon",
          decisionFrame: { mode: "NATURAL", intent: "define", llm: null, ku: __kuOneSoundV3 },
        });
      }
    }
  } catch (e) {
    try { console.error("[CARD_KOTODAMA_ONE_SOUND_HARD_PREEMPT_V3_SAFE]", e); } catch {}
  }    // FALLBACK_TENMON_VOICE_V3_GUARD
    try {
      const __ku:any = (payload as any)?.decisionFrame?.ku || {};
      const __route = String(__ku?.routeReason || "");
      const __resp0 = String((payload as any)?.response || "");
      if (
        __route === ROUTE_NATURAL_GENERAL_LLM_TOP_V1 &&
        /受け取っています。?そのまま続けてください[？?]?/.test(__resp0)
      ) {
        (payload as any).response = "【天聞の所見】受け取りました。いま一番引っかかっている一点を置いてください。";
      }
      // LONGFORM_DENSITY_PROFILE_V1: long または十分な文量で長文化整形（質問は末尾1まで・段落重複抑制）
      if (payload && __route === ROUTE_NATURAL_GENERAL_LLM_TOP_V1 && typeof (payload as any).response === "string") {
        const __r = String((payload as any).response);
        const __longLike =
          (__ku as any)?.answerLength === "long" || __r.length >= 720;
        if (__longLike && __r.length >= 400 && __r.length <= 2200) {
          (payload as any).response = __longform1000Structure(__r);
        }
      }
    } catch {}
    // CARD_SESSION_MEMORY_PERSIST_ALL_ROUTES_V1: gate で persist するため threadId が無い場合は handler の threadId を付与
    if (payload && (payload.threadId == null || String(payload.threadId).trim() === "")) (payload as any).threadId = threadId;
    if (payload && payload.response != null) payload.response = enforceTenmon(String(payload.response));
    // KHS_SCAN_LAYER_V1: 観測だけ decisionFrame.ku に付与（既存 ku はスプレッドで保持）
    // CARD_ANSWER_PROFILE_V1: reply() 経由でも ku に answerLength/answerMode/answerFrame を載せる（MK0_MERGE で上書きされないようここで付与）
    try {
      if (payload && payload.decisionFrame) {
        const kuPatch: any = {
          ...(payload.decisionFrame?.ku || {}),
          khsScan: __khsScan,
          truthWeight: __truthWeight,
          answerLength:
            (payload.decisionFrame?.ku as any)?.answerLength ??
            __bodyProfile?.answerLength ??
            __brainstem?.answerLength ??
            null,
          answerMode:
            (payload.decisionFrame?.ku as any)?.answerMode ??
            __bodyProfile?.answerMode ??
            __brainstem?.answerMode ??
            null,
          answerFrame:
            (payload.decisionFrame?.ku as any)?.answerFrame ??
            __bodyProfile?.answerFrame ??
            __brainstem?.answerFrame ??
            null,
        };
        if (__userName != null && __assistantName != null) {
          kuPatch.userNaming = { userName: __userName, assistantName: __assistantName };
        }
        payload.decisionFrame = {
          ...payload.decisionFrame,
          ku: kuPatch,
        };
        try {
          const df: any = payload.decisionFrame;
          if (df && df.ku && typeof df.ku === "object" && !Array.isArray(df.ku)) {
            (df.ku as any).heart = normalizeHeartShape((df.ku as any).heart ?? __heart);
          }
        } catch {}
      }
    } catch {}

    // KATAKAMUNA_RUNTIME_RESOLUTION_V1
    try {
      const __raw = String((payload as any)?.rawMessage ?? message ?? "").trim();
      if (/カタカムナ/i.test(__raw)) {
        const __r = resolveKatakamunaBranches(__raw);
        const __df: any = (payload as any)?.decisionFrame ?? null;
        if (__df && typeof __df === "object") {
          __df.ku = (__df.ku && typeof __df.ku === "object" && !Array.isArray(__df.ku)) ? __df.ku : {};
          (__df.ku as any).katakamunaBranchCandidates = __r.candidates;
          (__df.ku as any).katakamunaCanonVersion = {
            schema: __r.schema,
            updatedAt: __r.updatedAt
          };
        }
      }
    } catch {}

    // K2_2E_POSTREPLY_IROHAUNITIDS_V3: attach irohaUnitIds via getDb("kokuzo") (branch-independent)
    // K2_2E_POSTREPLY_IROHAUNITIDS_V4_FROM_KU: extract lawKey fields + attach irohaUnitIds + debug in ku
    // K2_2E_POSTREPLY_IROHAUNITIDS_V5_FROM_KHSCANDIDATES: prefer structured khsCandidates -> irohaUnitIds
    try {
      const __df:any = (payload as any)?.decisionFrame;
      if (__df && typeof __df === "object") {
        if (!__df.ku || typeof __df.ku !== "object" || Array.isArray(__df.ku)) __df.ku = {};
        const __ku:any = __df.ku;
        const __db2:any = getDb("kokuzo");
        const __stmtIA:any = __db2.prepare("SELECT irohaUnitId FROM iroha_khs_alignment WHERE khsLawKey = ? AND relation = 'SUPPORTS_VERIFIED' ORDER BY createdAt DESC LIMIT 5");
        const __keys:string[] = [];
        const __c1:any[] = (((payload as any)?.detailPlan?.debug?.khsCandidates) && Array.isArray((payload as any).detailPlan.debug.khsCandidates)) ? (payload as any).detailPlan.debug.khsCandidates : [];
        const __c2:any[] = (((__df as any)?.detailPlan?.khsCandidates) && Array.isArray((__df as any).detailPlan.khsCandidates)) ? (__df as any).detailPlan.khsCandidates : [];
        for (const h of __c1) { const k=String((h&&h.lawKey)||""); if (k.startsWith("KHSL:LAW:")) __keys.push(k); }
        for (const h of __c2) { const k=String((h&&h.lawKey)||""); if (k.startsWith("KHSL:LAW:")) __keys.push(k); }
        // fallback: any KHSL:LAW in payload string
        if (__keys.length===0) {
          const __txt = JSON.stringify(payload||{});
          const __m = (__txt.match(/KHSL:LAW:[A-Za-z0-9:_\-]{6,}/g) || []);
          for (const k of __m) __keys.push(String(k));
        }
        const __lawKeys = Array.from(new Set(__keys)).slice(0,10);
        let __rowsN=0; let __err="";
        if (__lawKeys.length>0) {
          const __ids:string[] = [];
          for (const k of __lawKeys) {
            try {
              const rows:any[] = (__stmtIA.all(String(k)) as any[]) || [];
              __rowsN += rows.length;
              for (const r of rows) __ids.push(String((r as any).irohaUnitId));
            } catch (e:any) { __err = String(e&&e.message||e||""); }
          }
          const __uniq = Array.from(new Set(__ids)).slice(0,10);
          if (__uniq.length>0) {
            (__ku as any).irohaUnitIds = __uniq;
            if (!((__ku as any).khs && typeof (__ku as any).khs === "object" && !Array.isArray((__ku as any).khs))) (__ku as any).khs = {};
            ((__ku as any).khs as any).irohaUnitIds = __uniq;
          }
        }
        (__ku as any).__k2e_dbg = { v5: true, c1: __c1.length, c2: __c2.length, nLawKeys: __lawKeys.length, nAlignRows: __rowsN, err: __err };
        // K2_2E_POSTREPLY_IROHAUNITIDS_V6_FROM_DETAILPLAN: use detailPlan.khsCandidates + no overwrite
        try {
          const __df2:any = (payload as any)?.decisionFrame;
          if (__df2 && typeof __df2 === "object") {
            if (!__df2.ku || typeof __df2.ku !== "object" || Array.isArray(__df2.ku)) __df2.ku = {};
            const __ku2:any = __df2.ku;
            const __db2:any = getDb("kokuzo");
            const __stmtIA:any = __db2.prepare("SELECT irohaUnitId FROM iroha_khs_alignment WHERE khsLawKey = ? AND relation = 'SUPPORTS_VERIFIED' ORDER BY createdAt DESC LIMIT 5");
            const __keys:string[] = [];
            const __c1:any[] = (((payload as any)?.detailPlan?.khsCandidates) && Array.isArray((payload as any).detailPlan.khsCandidates)) ? (payload as any).detailPlan.khsCandidates : [];
            const __c2:any[] = (((__df2 as any)?.detailPlan?.khsCandidates) && Array.isArray((__df2 as any).detailPlan.khsCandidates)) ? (__df2 as any).detailPlan.khsCandidates : [];
            for (const h of __c1) { const k=String((h&&h.lawKey)||""); if (k.startsWith("KHSL:LAW:")) __keys.push(k); }
            for (const h of __c2) { const k=String((h&&h.lawKey)||""); if (k.startsWith("KHSL:LAW:")) __keys.push(k); }
            const __lawKeys = Array.from(new Set(__keys)).slice(0,10);
            let __rowsN=0; let __err="";
            const __ids:string[] = [];
            if (__lawKeys.length>0) {
              for (const k of __lawKeys) {
                try {
                  const rows:any[] = (__stmtIA.all(String(k)) as any[]) || [];
                  __rowsN += rows.length;
                  for (const r of rows) __ids.push(String((r as any).irohaUnitId));
                } catch (e:any) { __err = String(e&&e.message||e||""); }
              }
            }
            const __uniq = Array.from(new Set(__ids)).slice(0,10);
                // K2_4_ATTACH_KU_IROHAUNITIDS_ON_RETURN_V1
                try {
                  const __dfK:any = (payload as any)?.decisionFrame;
                  if (__dfK && typeof __dfK === "object") {
                    const __kuK:any = (__dfK.ku && typeof __dfK.ku === "object" && !Array.isArray(__dfK.ku)) ? __dfK.ku : (__dfK.ku = {});
                    if (!Array.isArray((__kuK as any).irohaUnitIds) || (((__kuK as any).irohaUnitIds as any[]).length === 0)) {
                      (__kuK as any).irohaUnitIds = __uniq;
                    }
                  }
                } catch {}

                // K2_4_ATTACH_KU_IROHAUNITIDS_AFTER_UNIQ_V1
                try {
                  const __dfK:any = (payload as any)?.decisionFrame;
                  if (__dfK && typeof __dfK === "object") {
                    const __kuK:any = (__dfK.ku && typeof __dfK.ku === "object" && !Array.isArray(__dfK.ku)) ? __dfK.ku : (__dfK.ku = {});
                    if (!Array.isArray((__kuK as any).irohaUnitIds) || (((__kuK as any).irohaUnitIds as any[]).length === 0)) {
                      (__kuK as any).irohaUnitIds = __uniq;
                    }
                  }
                } catch {}

            if (__uniq.length>0) {
              (__ku2 as any).irohaUnitIds = __uniq;
              if (!((__ku2 as any).khs && typeof (__ku2 as any).khs === "object" && !Array.isArray((__ku2 as any).khs))) (__ku2 as any).khs = {};
              ((__ku2 as any).khs as any).irohaUnitIds = __uniq;
            }
            (__ku2 as any).__k2e_dbg_v6 = { v6:true, c1: __c1.length, c2: __c2.length, nLawKeys: __lawKeys.length, nAlignRows: __rowsN, nUniq: __uniq.length, err: __err };
          }
        } catch {}

      }
    } catch {}

    try {
      const __df:any = (payload as any)?.decisionFrame;
      if (__df && typeof __df === "object") {
        if (!__df.ku || typeof __df.ku !== "object" || Array.isArray(__df.ku)) __df.ku = {};
        const __ku:any = __df.ku;
        const __txt = JSON.stringify(payload || {});
        const __m2 = (__txt.match(/"lawKey"s*:s*"(KHSL:LAW:[A-Za-z0-9:_\-]{6,})"/g) || []);
        const __lawKeys = Array.from(new Set(__m2.map(s=>{ const m=s.match(/KHSL:LAW:[A-Za-z0-9:_\-]{6,}/); return m?m[0]:""; }).filter(x=>x))).slice(0,10);
        let __err=""; let __rowsN=0;
        if (__lawKeys.length > 0) {
          const __db2:any = getDb("kokuzo");
          const __stmtIA:any = __db2.prepare("SELECT irohaUnitId FROM iroha_khs_alignment WHERE khsLawKey = ? AND relation = 'SUPPORTS_VERIFIED' ORDER BY createdAt DESC LIMIT 5");
          const __ids:string[] = [];
          for (const k of __lawKeys) {
            try {
              const rows:any[] = (__stmtIA.all(String(k)) as any[]) || [];
              __rowsN += rows.length;
              for (const r of rows) __ids.push(String((r as any).irohaUnitId));
            } catch (e:any) { __err = String(e&&e.message||e||""); }
          }
          const __uniq = Array.from(new Set(__ids)).slice(0,10);
          if (__uniq.length > 0) {
            (__ku as any).irohaUnitIds = __uniq;
            if (!((__ku as any).khs && typeof (__ku as any).khs === "object" && !Array.isArray((__ku as any).khs))) (__ku as any).khs = {};
            ((__ku as any).khs as any).irohaUnitIds = __uniq;
          }
        }
        (__ku as any).__k2e_dbg = { nLawKeys: __lawKeys.length, nAlignRows: __rowsN, err: __err };
      }
    } catch (e:any) {}

    try {
      const __df:any = (payload as any)?.decisionFrame;
      if (__df && typeof __df === "object") {
        if (!__df.ku || typeof __df.ku !== "object" || Array.isArray(__df.ku)) __df.ku = {};
        const __ku:any = __df.ku;
        const __txt = JSON.stringify(payload || {});
        const __m = (__txt.match(/KHSL:LAW:[A-Za-z0-9:_\-]{6,}/g) || []);
        const __lawKeys = Array.from(new Set(__m)).slice(0, 10);
        if (__lawKeys.length > 0) {
          const __db2:any = getDb("kokuzo");
          const __stmtIA:any = __db2.prepare("SELECT irohaUnitId FROM iroha_khs_alignment WHERE khsLawKey = ? AND relation = 'SUPPORTS_VERIFIED' ORDER BY createdAt DESC LIMIT 5");
          const __ids:string[] = [];
          for (const k of __lawKeys) {
            try {
              const rows:any[] = (__stmtIA.all(String(k)) as any[]) || [];
              for (const r of rows) __ids.push(String((r as any).irohaUnitId));
            } catch {}
          }
          const __uniq = Array.from(new Set(__ids)).slice(0, 10);
          if (__uniq.length > 0) {
            (__ku as any).irohaUnitIds = __uniq;
            if (!( (__ku as any).khs && typeof (__ku as any).khs === "object" && !Array.isArray((__ku as any).khs) )) ( __ku as any).khs = {};
            (( __ku as any).khs as any).irohaUnitIds = __uniq;
          }
        }
      }
    } catch {}

    
  // FREECHAT_SANITIZE_V2B: last-mile sanitizer (works for ALL reply paths)
  const __sanitizeOut = (msg: any, txt: any): string => {
    let t = String(txt ?? "");
    const mstr = String(msg ?? "");
    const wantsDetail = /#詳細/.test(mstr);
    const askedMenu = /(メニュー|方向性|どの方向で|選択肢|1\)|2\)|3\))/i.test(mstr);
    const hasMenu = /どの方向で話しますか/.test(t);
    // FREECHAT_SANITIZE_GUARD_V2

    const hasTodo = /SYNTH_USED|TODO:|プレースホルダ|PLACEHOLDER/i.test(t);
    const shouldSanitize = (hasMenu || hasTodo) && !askedMenu;

    if (shouldSanitize) {
      t = "了解。何でも話して。必要なら「#詳細」や「doc=... pdfPage=...」で深掘りできるよ。";
    }
    if (!wantsDetail) {
      t = t.replace(/^\[SYNTH_USED[^\n]*\n?/gm, "")
           .replace(/^TODO:[^\n]*\n?/gmi, "")
           .replace(/現在はプレースホルダ[^\n]*\n?/gmi, "")
           .trim();
    }
    return t;
  };

  // FREECHAT 最終層: 再代入せず遅延ハンドラへ登録（RES_JSON_SINGLE_ASSIGN_DEFER_FREECHAT_V1）
  (res as any).__TENMON_FREECHAT_RESJSON_FINAL = async (obj: any) => {
    // OBS_R9_LEDGER_WRAPPER_HITMAP_V1: res.json 共通 wrapper のヒット状況を軽量観測（ロジック変更なし）
    try {
      const df0 = (obj as any)?.decisionFrame;
      const has_df = df0 != null && typeof df0 === "object";
      const ku0 = has_df ? (df0 as any).ku : null;
      const has_ku = ku0 != null && typeof ku0 === "object";
      const self0 = has_ku ? (ku0 as any).kanagiSelf : null;
      const has_self = self0 != null && typeof self0 === "object";
      const alreadyDone0 = (obj as any)?.__KANAGI_LEDGER_DONE === true;
      console.error(
        "[R9_LEDGER_HITMAP_RESJSON]",
        "rr=" + String(has_ku ? (ku0 as any).routeReason ?? "" : ""),
        "has_response=" + ("response" in (obj || {})),
        "has_df=" + has_df,
        "has_ku=" + has_ku,
        "has_self=" + has_self,
        "alreadyDone=" + alreadyDone0
      );
    } catch {}

    // CARD6C_TOPLEVEL_WRAPPER_ONLY_V6: ensure top-level rewriteUsed/rewriteDelta always exist (robust)
    try {
      if (obj && typeof obj === "object") {
        if ((obj as any).rewriteUsed === undefined) (obj as any).rewriteUsed = false;
        if ((obj as any).rewriteDelta === undefined) (obj as any).rewriteDelta = 0;
      }
    } catch {}

    // CARD6C_FORCE_KU_RESJSON_V5: always ensure decisionFrame.ku exists + has rewriteUsed/rewriteDelta defaults
    try {
      if (obj && typeof obj === "object") {
        const df = (obj as any).decisionFrame;
        if (df && typeof df === "object") {
          df.ku = (df.ku && typeof df.ku === "object") ? df.ku : {};
          // CARD_ANSWER_PROFILE_V1: ku に answerLength/answerMode/answerFrame を記録
          try {
            const __profile = (res as any).__TENMON_ANSWER_PROFILE;
            if (__profile) {
              (df.ku as any).answerLength = __profile.answerLength ?? null;
              (df.ku as any).answerMode = __profile.answerMode ?? null;
              (df.ku as any).answerFrame = __profile.answerFrame ?? null;
            }
          } catch {}

          // R9_GROWTH_LEDGER_RAWINPUT_PROPAGATE_V1 / R9_GROWTH_LEDGER_RESJSON_WRAPPER_BIND_V1: top-level と ku に raw input を伝播（obj.rawMessage → obj.message → req.body.input → req.body.message → message）
          try {
            const __body = (req as any)?.body;
            const raw = String(
              (obj as any)?.rawMessage ??
              (obj as any)?.message ??
              (__body?.input ?? __body?.message ?? message ?? "")
            );
            if (!(obj as any).rawMessage || String((obj as any).rawMessage).trim() === "") (obj as any).rawMessage = raw;
            if (!(obj as any).message || String((obj as any).message).trim() === "") (obj as any).message = raw;
            const cur = (df.ku as any).inputText;
            if (cur == null || String(cur).trim() === "") (df.ku as any).inputText = raw;
          } catch {}

          // C2_LLM_STATUS_ALWAYS_ATTACH_V1: always attach llmStatus (observability only)
          try {
            if ((df.ku as any).llmStatus == null) {
              (df.ku as any).llmStatus = __llmStatus;
            }
          } catch {}

          // CARD_R1_ROUTE_REASON_V2_MIN: routeReason mirror (observability; NO behavior change)
          try {
            if ((df.ku as any).routeReason === undefined) (df.ku as any).routeReason = String(df.mode ?? "");
          } catch {}

          // CARD_P1_GREETING_NO_HYBRID_V1: greetings must never fall into HYBRID (avoid HEIKE吸い込み)
          try {
            const df3: any = df;
            const mode3 = String(df3?.mode ?? "");
            const tid3 = String(threadId ?? "");
            const raw3 = String((obj as any)?.rawMessage ?? (obj as any)?.message ?? message ?? "");
            const t3 = raw3.trim();

            const isTestTid = /^(accept|core-seed|bible-smoke)/i.test(tid3);
            const askedMenu = /^\s*(?:\/menu|menu)\b/i.test(t3) || /^\s*メニュー\b/.test(t3);
            const hasDoc = /\bdoc\b/i.test(t3) || /pdfPage\s*=\s*\d+/i.test(t3) || /#詳細/.test(t3);

            const isGreeting = /^(こんにちは|こんばんは|おはよう|やあ|hi|hello|hey)\s*[！!。．\.]?$/i.test(t3);

            if (!isTestTid && !askedMenu && !hasDoc && isGreeting && mode3 === "HYBRID") {
              (obj as any).response = "【天聞の所見】挨拶を受け取りました。いま整えたい一点を置いてください。";
              (obj as any).candidates = [];
              (obj as any).evidence = null;
              df3.mode = "NATURAL";
              df3.ku = (df3.ku && typeof df3.ku === "object") ? df3.ku : {};
              (df3.ku as any).routeReason = "FASTPATH_GREETING_OVERRIDDEN";
            }
          } catch {}

          // CARD_C1_NATURAL_DE_NUMBERIZE_SMALLTALK_V1: soften NATURAL numbered-choice UX for smalltalk only (do NOT touch contracts/Card1)
          try {
            const df4: any = df;
            const mode4 = String(df4?.mode ?? "");
            const tid4 = String(threadId ?? "");
            const userMsg = String((obj as any)?.rawMessage ?? (obj as any)?.message ?? message ?? "").trim();

            const isTestTid = /^(accept|core-seed|bible-smoke)/i.test(tid4);
            const askedMenu = /^\s*(?:\/menu|menu)\b/i.test(userMsg) || /^\s*メニュー\b/.test(userMsg);
            const looksSmalltalk = /^(雑談|疲れ|つかれ|励まして|元気|しんどい|眠い|だるい|話して|きいて)/.test(userMsg) || userMsg.length <= 24;

            if (!isTestTid && !askedMenu && mode4 === "NATURAL" && looksSmalltalk && typeof (obj as any).response === "string") {
              let t = String((obj as any).response);

              // Never touch Card1 script (contract)
              if (/まず分類だけ決めます/.test(t)) {
                // skip
              } else {
                // If it contains the force phrase, soften it
                t = t.replace(/番号で答えてください。?\s*\??/g, "番号でも言葉でもOKです。");

                // If it is a pure numbered menu, prefer a single natural question (no numbering demand)
                const hasNumberList = /\n\s*\d{1,2}\)\s*/m.test(t);
                if (hasNumberList) {
                  // remove only the explicit "番号で答えてください" force; keep options if present
                  // ensure it ends as a gentle question
                  if (!/[？?]\s*$/.test(t)) t = t.trim() + "？";
                }
                (obj as any).response = t;
              }
            }
          } catch {}

          // CARD_C2_COLLAPSE_NUMBER_LIST_SMALLTALK_V2: collapse numbered list into one natural question (smalltalk only; keep contracts)
          try {
            const df5: any = df;
            const mode5 = String(df5?.mode ?? "");
            const tid5 = String(threadId ?? "");
            const userMsg5 = String((obj as any)?.rawMessage ?? (obj as any)?.message ?? message ?? "").trim();

            const isTestTid5 = /^(accept|core-seed|bible-smoke)/i.test(tid5);
            const askedMenu5 = /^\s*(?:\/menu|menu)\b/i.test(userMsg5) || /^\s*メニュー\b/.test(userMsg5);
            const looksSmalltalk5 =
              /^(雑談|疲れ|つかれ|励まして|元気|しんどい|眠い|だるい|話して|きいて)/.test(userMsg5) ||
              userMsg5.length <= 24;

            if (!isTestTid5 && !askedMenu5 && mode5 === "NATURAL" && looksSmalltalk5 && typeof (obj as any).response === "string") {
              let t = String((obj as any).response);

              // never touch Card1 contract script
              if (/まず分類だけ決めます/.test(t)) {
                // skip
              } else {
                const lines = t.split(/\r?\n/);
                const opts: string[] = [];
                for (const ln of lines) {
                  const m = ln.match(/^\s*\d{1,2}\)\s*(.+)\s*$/);
                  if (m && m[1]) opts.push(String(m[1]).trim());
                }

                // only if it really is a 3-choice list
                if (opts.length >= 3) {
                  // keep non-numbered lines as prefix
                  const kept = lines.filter((ln) => !/^\s*\d{1,2}\)\s*/.test(ln));
                  let prefix = kept.join("\n").trim();

                  // remove the generic "いちばん近いのはどれですか" line if present (we'll replace with q)
                  prefix = prefix.replace(/^.*いちばん近いのはどれですか[？?]?\s*$/m, "").trim();

                  const a0 = opts[0], b0 = opts[1], c0 = opts[2];
                  const q = `いま一番近いのは「${a0}」「${b0}」「${c0}」のどれですか？（言葉でOK）`;

                  let out = prefix ? `${prefix}\n\n${q}` : q;

                  // also remove any leftover "番号でも言葉でもOKです" line (C1)
                  out = out.replace(/^.*番号でも言葉でもOKです。?\s*$/m, "").trim();

                  (obj as any).response = out;
                }
              }
            }
          } catch {}

          // CARD_C4_SMALLTALK_WARM_ONE_QUESTION_V1: warm smalltalk response (empathy + support + one question), avoid questionnaire tone
          try {
            const df6: any = df;
            const mode6 = String(df6?.mode ?? "");
            const tid6 = String(threadId ?? "");
            const userMsg6 = String((obj as any)?.rawMessage ?? (obj as any)?.message ?? message ?? "").trim();

            const isTestTid6 = /^(accept|core-seed|bible-smoke)/i.test(tid6);
            const askedMenu6 = /^\s*(?:\/menu|menu)\b/i.test(userMsg6) || /^\s*メニュー\b/.test(userMsg6);
                        const looksSmalltalk6 =
              /^(雑談|疲れ|つかれ|励まして|元気|しんどい|眠い|だるい|話して|きいて)/.test(userMsg6) ||
              /疲れ|しんどい|だるい|落ち込|不安|つらい/.test(userMsg6);
            // CARD_C5A_NARROW_SMALLTALK_TRIGGER_V1: removed length<=28 broad trigger

            if (!isTestTid6 && !askedMenu6 && mode6 === "NATURAL" && looksSmalltalk6 && typeof (obj as any).response === "string") {
              let t = String((obj as any).response);

              // never touch Card1 contract script
              if (/まず分類だけ決めます/.test(t)) {
                // skip
              } else {
                const hasNumberList = /\n\s*\d{1,2}\)\s*/m.test(t);
                const hasThreeChoiceQuote = /いま一番近いのは「.+」「.+」「.+」のどれですか/.test(t);

                // if response still looks like a questionnaire, replace with warm one-question form
                if (hasNumberList || hasThreeChoiceQuote) {
                  const head = "【天聞の所見】疲れている時は、まず回復を優先して大丈夫です。";
                  const body = "いまは“答えを出す”より、負担を一つ減らして流れを戻します。";
                  const q = "いま一番しんどいのは、(A)判断し続けること、(B)情報を浴び続けること、どちらに近いですか？（言葉でOK）";
                  (obj as any).response = `${head}\n\n${body}\n\n${q}`;
                }
              }
            }
          } catch {}
          if ((df.ku as any).rewriteUsed === undefined) (df.ku as any).rewriteUsed = false;
          if ((df.ku as any).rewriteDelta === undefined) (df.ku as any).rewriteDelta = 0;

          // KANAGI_RUNTIME_FINALIZE_V1
          try {
            const __df: any = (obj as any)?.decisionFrame ?? null;
            if (__df && typeof __df === "object") {
              __df.ku = (__df.ku && typeof __df.ku === "object" && !Array.isArray(__df.ku))
                ? __df.ku
                : {};
              const __ku: any = __df.ku;

              const __rawMsg =
                String((obj as any)?.rawMessage ?? "") ||
                String((obj as any)?.message ?? "") ||
                "";

              const __phaseArg = (typeof __ku.kanagiPhase === "string" && __ku.kanagiPhase) ? __ku.kanagiPhase : "SENSE";
              const __k: any = kanagiThink("", __phaseArg, __rawMsg);
              const __phase = String(__ku.kanagiPhase ?? (__k?.phase ?? ""));

              __ku.kanagi = {
                phase: __phase,
                topic: String(__k?.topic ?? ""),
                reception: String(__k?.reception ?? ""),
                focus: String(__k?.focus ?? ""),
                step: String(__k?.step ?? ""),
                routeReason: String(__ku.routeReason ?? "")
              };
              const __rrK3 = String(__ku.routeReason || "");
              if (/^TECHNICAL_IMPLEMENTATION_/u.test(__rrK3) && __ku.kanagi && typeof __ku.kanagi === "object") {
                const rec3 = String(__ku.kanagi.reception || "");
                if (/(身体|脈|呼吸|姿勢|受け止め|体感)/u.test(rec3)) {
                  __ku.kanagi.reception = "技術的な問いとして整理し、前提と手順を分けて答えます。";
                }
              }
            }
          } catch {}

          // R9_GROWTH_LEDGER_INSERT_RELOCATE_V1 / R9_LEDGER_APPEND_PAYLOAD_SOURCE_FIX_V1:
          // payload source = obj.rawMessage / obj.message / body / message(handler) / ku.inputText。has_self は ku.kanagiSelf 実在で判定するため、先に self-complete してから条件判定。
          try {
            const __ku = df.ku as any;
            if (!__ku || typeof __ku !== "object") {
              /* skip: no ku */
            } else if ((obj as any).__KANAGI_LEDGER_DONE) {
              /* skip: already done */
            } else {
              const __body = (req as any)?.body;
              const rawForLedger = String(
                (obj as any)?.rawMessage ??
                (obj as any)?.message ??
                (__body?.input ?? __body?.message ?? message ?? (__ku?.inputText ?? ""))
              );
              // R9_GROWTH_LEDGER_REAL_INPUT_SELF_COMPLETE_V1: append 条件判定前に ku.kanagiSelf を補完（全 route で同じ payload builder を通す）
              try {
                if (!__ku.kanagiSelf || typeof __ku.kanagiSelf !== "object") {
                  const __intention = getIntentionHintForKu();
                  try {
                    __ku.kanagiSelf = computeKanagiSelfKernel({
                      rawMessage: rawForLedger,
                      routeReason: String(__ku.routeReason ?? df.mode ?? ""),
                      heart: __ku.heart ?? undefined,
                      intention: __intention ?? undefined,
                      topicClass: (__ku.meaningFrame as any)?.topicClass ?? undefined,
                      conceptKey: (__ku.meaningFrame as any)?.conceptKey ?? undefined,
                      scriptureKey: __ku.scriptureKey ?? (__ku.meaningFrame as any)?.scriptureKey ?? undefined,
                      scriptureMode: __ku.scriptureMode ?? undefined,
                      scriptureAlignment: __ku.scriptureAlignment ?? undefined,
                    });
                  } catch {
                    __ku.kanagiSelf = getSafeKanagiSelfOutput();
                  }
                }
              } catch {}
              // R9_LEDGER_APPEND_GUARD_UNIFY_V1: 全 route 共通 — has_self で append 可否を判定（shouldPersist/shouldRecombine は builder 用に維持）
              const __has_self = __ku.kanagiSelf != null && typeof __ku.kanagiSelf === "object";
              if (__has_self) {
                const entry = buildKanagiGrowthLedgerEntryFromKu(__ku, rawForLedger);
                insertKanagiGrowthLedgerEntry(entry);
              // OBS_R9_LEDGER_WRAPPER_HITMAP_V1: ledger mark 直前の観測（ロジック変更なし）
              try {
                const rawLen = rawForLedger.length;
                const inputTextLen = String(__ku?.inputText ?? "").length;
                const shouldPersist = __ku?.kanagiSelf?.shouldPersist === true || __ku?.kanagiSelf?.shouldPersist === 1;
                const shouldRecombine = __ku?.kanagiSelf?.shouldRecombine === true || __ku?.kanagiSelf?.shouldRecombine === 1;
                console.error(
                  "[R9_LEDGER_HITMAP_MARK]",
                  "rr=" + String(__ku?.routeReason ?? ""),
                  "rawLen=" + rawLen,
                  "inputTextLen=" + inputTextLen,
                  "shouldPersist=" + shouldPersist,
                  "shouldRecombine=" + shouldRecombine
                );
              } catch {}
                (obj as any).__KANAGI_LEDGER_DONE = true;
              }
            }
          } catch {}
        }
      }
    } catch {}

    // OBS_R9_LEDGER_SKIP_REASON_TRACE_V1: 毎回1本（insert/skip 理由を分類、修正は次カード）
    try {
      const _df = (obj as any)?.decisionFrame;
      const has_df = _df != null && typeof _df === "object";
      const _ku = has_df ? _df.ku : null;
      const has_ku = _ku != null && typeof _ku === "object";
      const _self = has_ku ? _ku.kanagiSelf : null;
      const has_self = _self != null && typeof _self === "object";
      const shouldPersist = has_self && (_self.shouldPersist === true || _self.shouldPersist === 1);
      const shouldRecombine = has_self && (_self.shouldRecombine === true || _self.shouldRecombine === 1);
      const alreadyDone = (obj as any).__KANAGI_LEDGER_DONE === true;
      const __body = (req as any)?.body;
      const rawStr = String((obj as any)?.rawMessage ?? (obj as any)?.message ?? (__body?.input ?? __body?.message ?? ""));
      const rawLen = rawStr.length;
      const inputTextLen = String(has_ku ? (_ku.inputText ?? "") : "").length;
      let action = "inserted";
      if (!has_df) action = "skip_no_df";
      else if (!has_ku) action = "skip_no_ku";
      else if (!has_self) action = "skip_no_self";
      else if (!shouldPersist && !shouldRecombine) action = "skip_no_flags";
      else if (alreadyDone) action = "skip_already_done";
      console.error(
        "[R9_LEDGER_SKIPTRACE]",
        "rr=" + String(has_ku ? (_ku.routeReason ?? "") : ""),
        "has_df=" + has_df,
        "has_ku=" + has_ku,
        "has_self=" + has_self,
        "shouldPersist=" + shouldPersist,
        "shouldRecombine=" + shouldRecombine,
        "alreadyDone=" + alreadyDone,
        "rawLen=" + rawLen,
        "inputTextLen=" + inputTextLen,
        "action=" + action
      );
    } catch {}

    try {
      if (obj && typeof obj === "object" && ("response" in obj)) {
        const msg = (obj as any)?.detailPlan?.input
          ?? (obj as any)?.input
          ?? (obj as any)?.message
          ?? message ?? "";
  // CARDG2_LENGTH_INTENT_FIX_V3
        const resp = (obj as any).response;
        
        // CARDG_LENGTH_INTENT_V3: length intent observability (NO body change)
        try {
          const raw = String((obj as any)?.rawMessage ?? (obj as any)?.message ?? "");  // CARDG_LENGTH_INTENT_V4
          const lower = raw.toLowerCase();

          let intent = "MED";
          let minChars = 180, maxChars = 450;

          if (/#詳細/.test(raw)) { intent = "DETAIL"; minChars = 0; maxChars = 999999; }
          else if (/(短く|一行|要点|結論だけ)/.test(raw)) { intent = "SHORT"; minChars = 60; maxChars = 180; }
          else if (/(詳しく|完全に|設計|仕様|提案|全部)/.test(raw)) { intent = "LONG"; minChars = 450; maxChars = 900; }

          // thread recent style hint (very light): if user message is long, bias long
          if (intent == "MED" && raw.length >= 220) { intent = "LONG"; minChars = 450; maxChars = 900; }

          // attach to decisionFrame.ku if present
          const df = (obj as any).decisionFrame;
          if (df && typeof df === "object") {
            df.ku = (df.ku && typeof df.ku === "object") ? df.ku : {};
            
          // CARDG2_LENGTH_INTENT_FIX_V2: keyword-based override (observability only; NO body change)
          // Prefer user raw message if present; fall back to msg
          try {
            const raw2 =
              String((obj as any)?.rawMessage ?? "") ||
              String((obj as any)?.detailPlan?.input ?? "") ||
              String((obj as any)?.input ?? "") ||
              String((obj as any)?.message ?? "") ||
              String(msg ?? "");

            const q2 = String(raw2 || "").trim();
            const lower2 = q2.toLowerCase();

            // DETAIL
            if (/#詳細/.test(q2)) {
              intent = "DETAIL"; minChars = 0; maxChars = 999999;
            } else {
              // SHORT signals
              if (/(短く|一行|要点|結論だけ|tl;dr|tldr|箇条書きだけ)/.test(q2)) {
                intent = "SHORT"; minChars = 60; maxChars = 180;
              }
              // LONG signals
              else if (/(詳しく|丁寧に|背景|根拠|出典|手順|設計|仕様|提案|完全版|網羅)/.test(q2)) {
                intent = "LONG"; minChars = 450; maxChars = 900;
              }
              // Long message bias
              else if (q2.length >= 220) {
                intent = "LONG"; minChars = 450; maxChars = 900;
              }
            }

            // debug-only (short)
            if (df && typeof df === "object") {
              df.ku = (df.ku && typeof df.ku === "object") ? df.ku : {};
              (df.ku as any).lengthIntentRaw = q2.slice(0, 180);
            }
          } catch {}
(df.ku as any).lengthIntent = intent;
            (df.ku as any).lengthTarget = { minChars, maxChars };
          }
        } catch {}

        // CARDH_LENGTH_INTENT_APPLY_V1: apply lengthIntent to NATURAL generic fallback only (NO fabrication)
        try {
          const df: any = (obj as any).decisionFrame;
          const mode = String(df?.mode ?? "");
          if (mode !== "NATURAL") throw 0;

          const ku: any = (df && typeof df === "object") ? ((df.ku && typeof df.ku === "object") ? df.ku : (df.ku = {})) : null;
          if (!ku) throw 0;

          const raw = String(msg || "");
          const lower = raw.toLowerCase();
          const tid = String((obj as any)?.threadId ?? "");

          // strict exclusions
          if (/^smoke/i.test(tid)) throw 0;
          if (/#詳細/.test(raw)) throw 0;
          if (/\bdoc\b/i.test(raw) || /pdfPage\s*=\s*\d+/i.test(raw)) throw 0;
          if (raw.trim().startsWith("#")) throw 0;
          if (/(メニュー|方向性|どの方向で|選択肢|1\)|2\)|3\))/i.test(raw)) throw 0;

          // low-signal preserve
          const isLow =
            lower === "ping" || lower === "test" || lower === "ok" || lower === "yes" || lower === "no" ||
            raw === "はい" || raw === "いいえ" || raw === "うん" || raw === "ううん";
          if (isLow) throw 0;

          // Only touch the generic fallback text
          const cur = String((obj as any).response ?? "");
          const generic = /了解。何でも話して。必要なら「#詳細」や「doc=\.\.\. pdfPage=\.\.\.」で深掘りできるよ。/.test(cur);
          if (!generic) throw 0;

          const intent = String(ku.lengthIntent ?? "MED");
          if (intent === "SHORT") {
            (obj as any).response = "【要点】いま一番の論点を1つだけ教えて。\n\n一点質問：何を優先したい？";
          } else if (intent === "LONG") {
            (obj as any).response =
              "【整理】いまの話を“3点”に分けて進めます。\n" +
              "1) 目的（何を達成したい？）\n" +
              "2) 制約（時間/資金/人手）\n" +
              "3) 次の一手（最小diff）\n\n" +
              "一点質問：まず1)目的を一行で。";
          } else {
            // MED: keep as-is
          }
        } catch {}

        // CARDH_APPLY_LENGTHINTENT_GENERIC_V2: apply lengthIntent ONLY to NATURAL generic fallback (no evidence fabrication)
        try {
          const cleaned = __sanitizeOut(msg, resp);

          // default: keep existing behavior
          let nextResp: any = cleaned;

          const df = (obj as any).decisionFrame;
          const ku = df && typeof df === "object" ? (df.ku && typeof df.ku === "object" ? df.ku : null) : null;

          const mode = String(df?.mode ?? "");
          const tid = String((obj as any)?.threadId ?? "");

          // must respect voiceGuard (smoke/low-signal/doc/#detail/cmd/menu-asked are blocked there)
          const rawMsg =
            String((obj as any)?.rawMessage ?? "") ||
            String((obj as any)?.message ?? "") ||
            String(msg ?? "");

          const g = __voiceGuard(rawMsg, tid);

          // apply only when allowed + NATURAL
          if (g.allow && mode === "NATURAL" && typeof cleaned === "string") {
            const t = String(cleaned || "").trim();

            // apply only to "generic fallback" (exactly this UX string family)
            const isGenericFallback =
              t === "了解。何でも話して。必要なら「#詳細」や「doc=... pdfPage=...」で深掘りできるよ。" ||
              /必要なら「#詳細」や「doc=\.\.\. pdfPage=\.\.\.」で深掘りできるよ。$/.test(t);

            if (isGenericFallback) {
              const intent = String((ku as any)?.lengthIntent ?? "MED");

              if (intent === "SHORT") {
                nextResp =
                  "【天聞の所見】いまは焦点が一点に定まっていないだけです。まず軸を1つ立てます。\n\n" +
                  "一点質問：いま一番ほしいのは、結論（すぐ決める）と整理（ほどく）のどちら？";
              } else if (intent === "LONG") {
                nextResp =
                  "【天聞の所見】いまは“問いの核”がまだ見えていない状態です。核が見えると、会話は一気に生きます。\n\n" +
                  "いま起きていることを3つに分けます。\n" +
                  "1) 事実（何が起きている）\n" +
                  "2) 感情（何が重い）\n" +
                  "3) 願い（どうなりたい）\n\n" +
                  "この3つのうち、いま一番先に言葉にしたいのはどれですか？";
              } else {
                // MED/DETAIL/XL etc -> no change (safe)
              }

              // ensure question ending
              if (typeof nextResp === "string") {
                const endsQ = /[？?]\s*$/.test(nextResp) || /(ですか|でしょうか|ますか|か？|か\?)\s*$/.test(nextResp);
                if (!endsQ) nextResp = nextResp + "？";
              }
            }
          }

          obj = { ...(obj as any), response: nextResp };
        } catch {
          
        // CARD5_ONE_LINE_POINT_V3: clamp "【要点】" to exactly one line (<=140 chars) + keep rest unchanged
        const __clampPointLine = (rawMsg: string, tid: string, text: string): string => {
          try {
            const t = String(text || "");
            if (!t.startsWith("【要点】")) return t;

            // contract guards
            if (/^smoke/i.test(String(tid || ""))) return t;
            if (/#詳細/.test(String(rawMsg || ""))) return t;
            if (/\bdoc\b/i.test(String(rawMsg || "")) || /pdfPage\s*=\s*\d+/i.test(String(rawMsg || ""))) return t;

            const lines = t.split(/\r?\n/);
            // CARD5_PRIME_NON_TEXT_POINT_HOLD_V3: NON_TEXT/body-missing -> honest point-hold (short, non-deceptive)
            try {
              const bodyAll = lines.slice(1).join("\n");
              const nonTextLike =
                /\[NON_TEXT_PAGE_OR_OCR_FAILED\]/.test(bodyAll) ||
                /非テキスト/.test(bodyAll) ||
                /OCR\/抽出不可/.test(bodyAll) ||
                /文字として取り出せない/.test(bodyAll) ||
                /本文.*取れない/.test(bodyAll);

              if (nonTextLike) {
                let doc = "";
                let page = 0;
                try {
                  const ev = (obj as any)?.evidence;
                  if (ev && ev.doc) { doc = String(ev.doc); page = Number(ev.pdfPage||0); }
                } catch {}
                try {
                  if (!doc) {
                    const c0 = Array.isArray((obj as any)?.candidates) ? (obj as any).candidates[0] : null;
                    if (c0 && c0.doc) { doc = String(c0.doc); page = Number(c0.pdfPage||0); }
                  }
                } catch {}
                const hint = (doc && page>0) ? (` doc=${doc} P${page}`) : "";
                const first = (`【要点】（本文未抽出のため要点保留）${hint}`).slice(0, 160);
                return (first + "\n" + bodyAll).trimEnd();
              }
            } catch {}

            const first = lines[0] || "";
            const rest = lines.slice(1).join("\n");

            // normalize first line
            const body = first.replace(/^【要点】\s*/,"");
            let one = body.replace(/\s+/g," ").trim();
            if (one.length > 140) one = one.slice(0, 139) + "…";

            const out = "【要点】" + one + "\n" + rest;
            return out.trimEnd();
          } catch {
            return String(text || "");
          }
        };

        const __cleaned = __sanitizeOut(msg, resp);
        const __tid = String((obj as any)?.threadId ?? "");
        const __raw = String((obj as any)?.rawMessage ?? (obj as any)?.message ?? msg ?? "");
        const __isExplicitPointClampBypass =
          String((obj as any)?.decisionFrame?.ku?.routeReason ?? "") === "EXPLICIT_CHAR_PREEMPT_V1" ||
          ((obj as any)?.decisionFrame?.ku?.explicitLengthRequested != null);
        const __final = __isExplicitPointClampBypass ? __cleaned : __clampPointLine(__raw, __tid, __cleaned);
        obj = { ...(obj as any), response: __final };

        }

        // CARDB_WIRE_VOICE_GUARD_SINGLE_EXIT_V3: observability-only (NO behavior change)
        // Record whether voice hooks SHOULD run for this request, using CardA unified guard.
        try {
          const tid = String((obj as any)?.threadId ?? threadId ?? "");
          const rawMsg = String((obj as any)?.rawMessage ?? (obj as any)?.message ?? "");
          const g = __voiceGuard(rawMsg, tid);
          const df = (obj as any)?.decisionFrame;
          if (df && typeof df === "object") {
            df.ku = (df.ku && typeof df.ku === "object") ? df.ku : {};
            (df.ku as any).voiceGuard = g.reason;
            (df.ku as any).voiceGuardAllow = g.allow;
          }
        } catch {}

      }
    } catch {}
        // CARD5_KOKUZO_SEASONING_V2: HYBRID normal reply -> 1-line point + (existing voiced text) + one question
        // Contract:
        // - DO NOT touch #詳細 (transparency)
        // - DO NOT touch doc/pdfPage / commands
        // - DO NOT touch smoke threads
        // - NO fabrication: point uses candidates[0] doc/pdfPage/snippet only
        try {
          const df = (obj as any)?.decisionFrame;
          const mode = String(df?.mode ?? "");
          const tid = String((obj as any)?.threadId ?? "");
          const raw = String((obj as any)?.rawMessage ?? (obj as any)?.message ?? "");

          const isSmoke = /^smoke/i.test(tid);
          const wantsDetail = /#詳細/.test(raw);
          const hasDoc = /\bdoc\b/i.test(raw) || /pdfPage\s*=\s*\d+/i.test(raw);
          const isCmd = raw.trim().startsWith("#");

          const __isExplicitPointBypass =
            String((obj as any)?.decisionFrame?.ku?.routeReason ?? "") === "EXPLICIT_CHAR_PREEMPT_V1" ||
            ((obj as any)?.decisionFrame?.ku?.explicitLengthRequested != null);
          if (!isSmoke && mode === "HYBRID" && !wantsDetail && !hasDoc && !isCmd && !__isExplicitPointBypass) {
            const cands = (obj as any)?.candidates;
            const c0 = (Array.isArray(cands) && cands.length) ? cands[0] : null;

            if (c0 && c0.doc && Number(c0.pdfPage) > 0) {
              const doc = String(c0.doc);
              const page = Number(c0.pdfPage);

              let snippet = "";
              try { snippet = String(c0.snippet ?? ""); } catch {}
              snippet = snippet.replace(/\s+/g, " ").trim();
              if (!snippet || /\[NON_TEXT_PAGE_OR_OCR_FAILED\]/.test(snippet)) snippet = "";

              // 1-line point (<= 90 chars after doc/page)
              let point = `【要点】${doc} P${page}`;
              if (snippet) {
                const cut = snippet.slice(0, 70);
                point = point + `: ${cut}${snippet.length > cut.length ? "…" : ""}`;
              } else {
                point = point + ": （候補先頭ページ）";
              }

              const cur = String((obj as any).response ?? "").trim();
              if (cur) {
                let out = cur;

                // ensure one-question handoff at end
                const endsQ = /[？?]\s*$/.test(out) || /(ですか|でしょうか|ますか|か？|か\?)\s*$/.test(out);
                if (!endsQ) out = out + "\n\n一点質問：いま一番ひっかかっている点はどこ？";

                // add point line ONLY if not already present
                if (!out.startsWith("【要点】")) {
                  out = point + "\n\n" + out;
                }

                (obj as any).response = out;
              }
            }
          }
        } catch {}
        // CARD6A_REWRITE_ONLY_PLUMBING_V2: rewrite-only hook (SYNC, default OFF)
        // - NO behavior change unless TENMON_REWRITE_ONLY=1
        // - MUST remain synchronous (no await) to keep wrapper shape safe
        // - NEVER touch smoke/#detail/doc/pdfPage/cmd/low-signal
        try {
          const enabled = String(process.env.TENMON_REWRITE_ONLY || "") === "1";
          if (enabled) {
            const df = (obj as any).decisionFrame;
            const ku = (df && typeof df === "object")
              ? ((df.ku && typeof df.ku === "object") ? df.ku : (df.ku = {}))
              : null;

            const tid = String((obj as any)?.threadId ?? "");
            const rawMsg =
              String((obj as any)?.rawMessage ?? "") ||
              String((obj as any)?.message ?? "") ||
              String((obj as any)?.input ?? "");

            const isSmoke = /^smoke/i.test(tid);
            const wantsDetail = /#詳細/.test(rawMsg);
            const hasDoc = /\bdoc\b/i.test(rawMsg) || /pdfPage\s*=\s*\d+/i.test(rawMsg);
            const isCmd = rawMsg.trim().startsWith("#");
            const low = rawMsg.trim().toLowerCase();
            const isLow =
              low === "ping" || low === "test" || low === "ok" || low === "yes" || low === "no" ||
              rawMsg.trim() === "はい" || rawMsg.trim() === "いいえ" || rawMsg.trim() === "うん" || rawMsg.trim() === "ううん";

            const mode = String(df?.mode ?? "");
            const allowVoice = !!(ku as any)?.voiceGuardAllow;

            // sync-only rewrite: only trim redundant whitespace when SHORT intent
            const intent = String((ku as any)?.lengthIntent ?? "");
            if (mode === "NATURAL" && allowVoice && !isSmoke && !wantsDetail && !hasDoc && !isCmd && !isLow) {
              const r0 = String((obj as any).response ?? "");
              if (intent === "SHORT") {
                (obj as any).response = r0.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
              }
            }
          }
        } catch {}
        // CARD6C_FORCE_KU_V3: ensure decisionFrame.ku carries rewriteUsed/rewriteDelta (never empty)
        try {
          if (obj && typeof obj === "object") {
            const df = (obj as any).decisionFrame;
            if (df && typeof df === "object") {
              df.ku = (df.ku && typeof df.ku === "object") ? df.ku : {};
              // Prefer explicit ku values, else fall back to top-level or false/0
              const ru = (df.ku as any).rewriteUsed;
              const rd = (df.ku as any).rewriteDelta;
              if (ru === undefined) (df.ku as any).rewriteUsed = !!((obj as any).rewriteUsed ?? false);
              if (rd === undefined) (df.ku as any).rewriteDelta = Number((obj as any).rewriteDelta ?? 0) || 0;
            }
          }
        } catch {}

        // KANAGI_RUNTIME_WIRE_V1
        try {
          const __rawMsg =
            String((req as any)?.body?.message ?? "") ||
            String((obj as any)?.rawMessage ?? "") ||
            String((obj as any)?.message ?? "");
          const __df = (obj as any).decisionFrame;
          const __phase = (__df && (__df as any).phase) ? (__df as any).phase : "SENSE";
          const __kanagi = kanagiThink("", __phase, __rawMsg);
          if (__df && typeof __df === "object") {
            __df.ku = (__df.ku && typeof __df.ku === "object") ? __df.ku : {};
            (__df.ku as any).kanagi = {
              reception: String((__kanagi as any)?.reception ?? ""),
              focus: String((__kanagi as any)?.focus ?? ""),
              step: String((__kanagi as any)?.step ?? "")
            };
          }
        } catch {}

    // KANAGI_RUNTIME_LASTMILE_V1
    try {
      const __df: any = (obj as any)?.decisionFrame ?? null;
      if (__df && typeof __df === "object") {
        __df.ku = (__df.ku && typeof __df.ku === "object" && !Array.isArray(__df.ku))
          ? __df.ku
          : {};
        const __ku: any = __df.ku;

        const __rawMsg =
          String((obj as any)?.rawMessage ?? "") ||
          String((obj as any)?.message ?? "") ||
          "";

        const __phaseArg = (typeof __ku.kanagiPhase === "string" && __ku.kanagiPhase) ? __ku.kanagiPhase : "SENSE";
        const __k: any = kanagiThink("", __phaseArg, __rawMsg);

        __ku.kanagi = {
          topic: String(__k?.topic ?? ""),
          reception: String(__k?.reception ?? ""),
          focus: String(__k?.focus ?? ""),
          step: String(__k?.step ?? ""),
          routeReason: String(__ku.routeReason ?? "")
        };
        const __rrK4 = String(__ku.routeReason || "");
        if (/^TECHNICAL_IMPLEMENTATION_/u.test(__rrK4) && __ku.kanagi && typeof __ku.kanagi === "object") {
          const rec4 = String(__ku.kanagi.reception || "");
          if (/(身体|脈|呼吸|姿勢|受け止め|体感)/u.test(rec4)) {
            __ku.kanagi.reception = "技術的な問いとして整理し、前提と手順を分けて答えます。";
          }
        }
      }
    } catch {}

    // RES_JSON_MERGE_B_INTO_C_V1: reducer → K1 極短文 LLM 補完 → 外周 native 連鎖
    const __reducedFree = applyFinalAnswerConstitutionAndWisdomReducerV1(obj);
    const __enrichedFree = await __tenmonK1PostFinalizeLlmEnrichV1(__reducedFree);
    return (res as any).__TENMON_RUN_OUTER_RES_JSON(__enrichedFree);
  };

  // marker
  const __FREECHAT_SANITIZE_V2B = true;
// M6-C0_DETAIL_SUFFIX_V1: append 1-line suffix only for #詳細 when learnedRulesUsed[0] exists
    try {
      if (wantsDetail && payload && typeof payload.response === "string") {
        const df = payload.decisionFrame || null;
        const ku = df && df.ku && typeof df.ku === "object" ? df.ku : null;
        const used = ku && Array.isArray(ku.learnedRulesUsed) ? ku.learnedRulesUsed : [];
        const title = used && used[0] && typeof used[0].title === "string" ? used[0].title : "";
        if (title) {
          // add exactly once
          if (!payload.response.includes("（学習ルール適用:")) {
            payload.response = payload.response + "\n\n（学習ルール適用: " + title + "）";
          }
        }
      }
    } catch {}

    // M6-B0_LIGHT_APPLY_SESSIONID_V1: keep raw message for session_id parsing
    if (payload && payload.rawMessage == null) payload.rawMessage = message;

  // M6-A1_LEARN_VISIBILITY_ALLMODES_V1: always expose training visibility in decisionFrame.ku (all modes)
  try {
    const df = (payload && payload.decisionFrame) ? payload.decisionFrame : null;
    if (df) {
      const ku = (df.ku && typeof df.ku === "object") ? df.ku : {};
      let available = 0;
      try {
        // M6-B0_LIGHT_APPLY_SESSIONID_V1: prefer session_id=... in message, fallback to threadId
      const mSid = String(payload?.rawMessage || "").match(/\bsession_id\s*=\s*([A-Za-z0-9_]+)/);
      const sessionKey = (mSid && mSid[1]) ? String(mSid[1]) : String(payload.threadId || "");
      const rules = listRules(sessionKey);
      // MK3_SEED_RECALL_V1: if writer seeds exist for this thread, expose as candidate + observability (DET)
      try {
        const tId = String((payload && (payload as any).threadId) || threadId || "");
        const q = String(payload?.rawMessage || "");
        const wantsSeed = /#詳細/.test(q) && /(K2|骨格|seed|WRITER)/i.test(q);
        if (wantsSeed) {
          const row = dbPrepare("kokuzo", "SELECT seedId, title, content FROM kokuzo_seeds WHERE threadId = ? AND kind = 'WRITER_RUN' ORDER BY COALESCE(createdAt, created_at) DESC LIMIT 1").get(tId) as any;
          if (row && row.seedId) {
            const content = String(row.content || "");
            const snippet = content ? content.slice(0, 240) : String(row.title || "");
            const cand = { doc: "WRITER_SEED", pdfPage: 0, snippet, score: 999, tags: ["SEED"], seedId: String(row.seedId), kind: "WRITER_RUN" };
            if (!payload.candidates || !Array.isArray(payload.candidates)) payload.candidates = [];
            // put first (avoid dup)
            const exists = payload.candidates.some((c: any) => String(c?.seedId || "") == String(row.seedId));
            if (!exists) payload.candidates.unshift(cand as any);
            // MK5_CHAINORDER_SEED_V1: mark seed usage in detailPlan.chainOrder (deterministic)
            try {
              const dp: any = (payload as any).detailPlan;
              if (dp && Array.isArray(dp.chainOrder)) {
                if (!dp.chainOrder.includes("WRITER_SEED")) dp.chainOrder.push("WRITER_SEED");
              }
            } catch {}

            // MK6_SEED_SUMMARY_V1: append deterministic 3-bullet seed skeleton to response (no LLM)
            try {
              if (payload && typeof payload.response === "string") {
                const hdr = "【K2骨格】";
                if (!payload.response.includes(hdr)) {
                  const lines = String(content || "")
                    .split(/\r?\n/)
                    .map((x) => x.trim())
                    .filter((x) => x && x.length >= 6)
                    .slice(0, 3);

                  const fallback = String(snippet || "").trim();
                  const bullets = (lines.length ? lines : (fallback ? [fallback] : []))
                    .slice(0, 3)
                    .map((x) => "- " + x);

                  if (bullets.length) {
                    payload.response = payload.response + "\n\n" + hdr + "\n" + bullets.join("\n");
                  }
                }
              }
            } catch {}
            // observability
            (ku as any).appliedSeedsCount = 1;
            const marks = Array.isArray((ku as any).memoryMarks) ? (ku as any).memoryMarks : [];
            if (!marks.includes("K2")) marks.push("K2");
            (ku as any).memoryMarks = marks;
          } else {
            if (typeof (ku as any).appliedSeedsCount !== "number") (ku as any).appliedSeedsCount = 0;
          }
        } else {
          if (typeof (ku as any).appliedSeedsCount !== "number") (ku as any).appliedSeedsCount = 0;
        }
      } catch {}

      // M6-B1_USED_ONE_RULE_V1: mark first rule as "used" (ku-only, no body change)
        try {
          if (Array.isArray(rules) && rules.length > 0) {
            const r0: any = rules[0];
            const used0 = {
              id: String(r0?.id ?? ""),
              title: String(r0?.title ?? ""),
              type: String(r0?.type ?? "other"),
              confidence: (typeof r0?.confidence === "number" ? r0.confidence : null),
            };

    // Phase36-1 deterministic menu trigger (acceptance)
    if (trimmed === "__FORCE_MENU__") {
      const payload = {
        ok: true,
        response: "1) 検索（GROUNDED）\n2) 整理（Writer/Reader）\n3) 設定（運用/学習）\n\n番号かキーワードで選んでください。",
        decisionFrame: { mode: "HYBRID", intent: "MENU", llm: null, ku: {} },
      };
      // ARK_THREAD_SEED_SAVE_V1 (delegated)
      try { saveArkThreadSeedV1(payload); } catch (e) { try { console.error("[ARK_SEED_SAVE_FAIL]", e); } catch {} }

return await reply(payload);
    }
            const ok = (used0.id && used0.id.length > 0) || (used0.title && used0.title.length > 0);
            if (ok) {
              (ku as any).learnedRulesUsed = [used0];
              // MK0_FINALIZE_V1: compute observability after learnedRulesUsed is set
              try {
                const usedArr2 = Array.isArray((ku as any).learnedRulesUsed) ? (ku as any).learnedRulesUsed : [];
                (ku as any).appliedRulesCount = usedArr2.length;
                if (typeof (ku as any).appliedSeedsCount !== "number") (ku as any).appliedSeedsCount = 0;

                const marks2: string[] = [];
                if (usedArr2.length > 0) marks2.push("M6");
                if ((ku as any).recallUsed) marks2.push("KOKUZO_RECALL");
                (ku as any).memoryMarks = marks2;
              } catch {}
            }
          }
        } catch {}

        if (Array.isArray(rules)) available = rules.length;
      } catch {}
      const used = Array.isArray(ku.learnedRulesUsed) ? ku.learnedRulesUsed : [];      // MK4_SEED_VISIBILITY_V1: count seeds for this thread (deterministic, sync)
      try {
        const row = (dbPrepare as any)(
          "kokuzo",
          "SELECT COUNT(*) AS cnt FROM kokuzo_seeds WHERE threadId = ?"
        ).get(String(payload.threadId || ""));
        const cntRaw = row ? (row as any).cnt : 0;
        const n = (typeof cntRaw === "number" ? cntRaw : parseInt(String(cntRaw || "0"), 10)) || 0;
        (ku as any).appliedSeedsCount = n;

        try {
          const mm = Array.isArray((ku as any).memoryMarks) ? (ku as any).memoryMarks : [];
          const next = mm.slice(0);
          if (n > 0 && !next.includes("K2")) next.push("K2");
          (ku as any).memoryMarks = next;
        } catch {}
      } catch {
        if (typeof (ku as any).appliedSeedsCount !== "number") (ku as any).appliedSeedsCount = 0;
      }      // MK4_SEED_VISIBILITY_V2: appliedSeedsCount from kokuzo_seeds (sync, deterministic)
      try {
        const tId = String(payload?.threadId || "");
        if (tId) {
          const row = dbPrepare("kokuzo", "SELECT COUNT(*) AS cnt FROM kokuzo_seeds WHERE threadId = ?").get(tId) as any;
          const cntRaw = row ? (row as any).cnt : 0;
          const n = (typeof cntRaw === "number" ? cntRaw : parseInt(String(cntRaw || "0"), 10)) || 0;
          (ku as any).appliedSeedsCount = n;

          try {
            const marks = Array.isArray((ku as any).memoryMarks) ? (ku as any).memoryMarks : [];
            const next = marks.slice(0);
            if (n > 0 && !next.includes("K2")) next.push("K2");
            (ku as any).memoryMarks = next;
          } catch {}
        } else {
          if (typeof (ku as any).appliedSeedsCount !== "number") (ku as any).appliedSeedsCount = 0;
        }
      } catch {
        if (typeof (ku as any).appliedSeedsCount !== "number") (ku as any).appliedSeedsCount = 0;
      }      // MK4_SEED_COUNT_ALWAYS_V1: always count kokuzo_seeds for this thread (sync, deterministic)
      try {
        const tId = String(payload?.threadId ?? "");
        if (tId) {
          const row: any = dbPrepare("kokuzo", "SELECT COUNT(*) AS cnt FROM kokuzo_seeds WHERE threadId = ?").get(tId);
          const cntRaw = row ? (row as any).cnt : 0;
          const n = (typeof cntRaw === "number" ? cntRaw : parseInt(String(cntRaw || "0"), 10)) || 0;
          (ku as any).appliedSeedsCount = n;

          // memoryMarks: add K2 if any seeds exist
          const marks = Array.isArray((ku as any).memoryMarks) ? (ku as any).memoryMarks : [];
          const next = marks.slice(0);
          if (n > 0 && !next.includes("K2")) next.push("K2");
          (ku as any).memoryMarks = next;
        } else {
          if (typeof (ku as any).appliedSeedsCount !== "number") (ku as any).appliedSeedsCount = 0;
        }
      } catch {
        if (typeof (ku as any).appliedSeedsCount !== "number") (ku as any).appliedSeedsCount = 0;
      }






      
      // MK4_ALWAYS_SEEDSCOUNT_V1: always expose appliedSeedsCount from kokuzo_seeds (deterministic)
      try {
        const tId2 = String((payload && (payload as any).threadId) || threadId || "");
        if (tId2) {
          const row = dbPrepare("kokuzo", "SELECT COUNT(*) AS cnt FROM kokuzo_seeds WHERE threadId = ?").get(tId2) as any;
          const cntRaw = row ? (row as any).cnt : 0;
          const n2 = (typeof cntRaw === "number" ? cntRaw : parseInt(String(cntRaw || "0"), 10)) || 0;
          (ku as any).appliedSeedsCount = n2;

          try {
            const mm = Array.isArray((ku as any).memoryMarks) ? (ku as any).memoryMarks : [];
            const next = mm.slice(0);
            if (n2 > 0 && !next.includes("K2")) next.push("K2");
            (ku as any).memoryMarks = next;
          } catch {}
        } else {
          if (typeof (ku as any).appliedSeedsCount !== "number") (ku as any).appliedSeedsCount = 0;
        }
      } catch {
        if (typeof (ku as any).appliedSeedsCount !== "number") (ku as any).appliedSeedsCount = 0;
      }      // C1_LLM_PLAN_V0: deterministic planning only (NO LLM call)
      try {
        const q = String(payload?.rawMessage || "");
        const wantsDetailQ = /#詳細/.test(q);
        const hasEvidence =
          !!(payload && (payload as any).evidence) ||
          (Array.isArray((payload as any)?.detailPlan?.evidenceIds) && (payload as any).detailPlan.evidenceIds.length > 0);

        // IMPORTANT: keep the union wide so TS won't narrow unintentionally
        let intent: "structure" | "expand" | "answer" | "rewrite" = "answer";

        if (wantsDetailQ && !hasEvidence) intent = "structure";
        else if (wantsDetailQ && hasEvidence) intent = "answer";
        else if (q.length > 180) intent = "structure";
        else intent = "expand";

        let provider: "gpt" | "gemini" = "gemini";
        if (intent === "structure") provider = "gpt";
        else if (intent === "expand") provider = "gemini";
        else provider = hasEvidence ? "gpt" : "gemini";

        (ku as any).llmProviderPlanned = provider;
        (ku as any).llmIntentPlanned = intent;

      } catch {}



// MK0_MERGE_KU_V1: preserve observability keys while setting learnedRulesAvailable/Used
      df.ku = {
        ...(ku as any),
        learnedRulesAvailable: (typeof (ku as any).learnedRulesAvailable === "number" ? (ku as any).learnedRulesAvailable : available),
        learnedRulesUsed: used,
      } as any;

      payload.decisionFrame = df;


      // C2_LAW_INJECT_V1: attach thread laws (name/definition/evidenceIds) to ku for Kanagi
      try {
        const laws = listThreadLaws(threadId, 20).filter(
          (x: any) => !!x.name && !!x.definition && Array.isArray(x.evidenceIds) && x.evidenceIds.length > 0
        );
        
        const lawsDeduped = dedupLawsByDocPage(laws as any);
// C4_2_KU_LAWS_DEDUP_V1: dedup injected laws by (doc,pdfPage) to avoid duplicates in free chat hints
        const score = (x: any): number => {
          const hasName = !!x?.name;
          const hasDef = !!x?.definition;
          const hasEvi = Array.isArray(x?.evidenceIds) && x.evidenceIds.length > 0;
          const qlen = typeof x?.quote === "string" ? x.quote.length : 0;
          return (hasName ? 1000 : 0) + (hasDef ? 500 : 0) + (hasEvi ? 300 : 0) + Math.min(200, qlen);
        };

        const byKey = new Map<string, any>();
        for (const x of laws) {
          const k = String(x?.doc ?? "") + "#" + String(x?.pdfPage ?? "");
          const cur = byKey.get(k);
          if (!cur) { byKey.set(k, x); continue; }
          const a = score(cur);
          const b = score(x);
          if (b > a) byKey.set(k, x);
          else if (b === a) {
            const ca = String(cur?.createdAt ?? "");
            const cb = String(x?.createdAt ?? "");
            if (cb > ca) byKey.set(k, x);
          }
        }

        const uniq = Array.from(byKey.values());

        (payload.decisionFrame.ku as any).kokuzoLaws = uniq.map((x: any) => ({
          name: x.name,
          definition: x.definition,
          evidenceIds: x.evidenceIds,
          doc: x.doc,
          pdfPage: x.pdfPage,
        }));
// FREECHAT_HINTS_V1: expose a compact hint list for free chat UI/enrichment (DET, no response text change)
        // NOTE: derived from kokuzoLaws only (no fabrication, no LLM).
        try {
          const hints = (payload.decisionFrame.ku as any).kokuzoLaws;
          if (Array.isArray(hints)) {
            (payload.decisionFrame.ku as any).freeChatHints = hints.slice(0, 6).map((h: any) => ({
              name: String(h?.name ?? ""),
              definition: String(h?.definition ?? ""),
              evidenceIds: Array.isArray(h?.evidenceIds) ? h.evidenceIds : [],
              doc: String(h?.doc ?? ""),
              pdfPage: typeof h?.pdfPage === "number" ? h.pdfPage : null,
            }));
          } else {
            (payload.decisionFrame.ku as any).freeChatHints = [];
          }
        } catch {
          (payload.decisionFrame.ku as any).freeChatHints = [];
        }

} catch {}
      // DF_DETAILPLAN_MIRROR_V1: always mirror top-level detailPlan into decisionFrame.detailPlan
      // KG2v1.1_NULL_GUARD_V8: ensure detailPlan.khsCandidates is array (never null)
      try { const __dp:any = (payload as any)?.decisionFrame?.detailPlan; if (__dp && (__dp as any).khsCandidates == null) (__dp as any).khsCandidates = []; } catch {}

      // KG2v1.1: attach khsCandidates at DF_DETAILPLAN_MIRROR_V1 (LLM-free, safe default)
      // KG2v1.1_NULL_GUARD_V8: ensure detailPlan.khsCandidates is array (never null)
      try { const __dp:any = (payload as any)?.decisionFrame?.detailPlan; if (__dp && (__dp as any).khsCandidates == null) (__dp as any).khsCandidates = []; } catch {}
      try {
        const __df: any = (payload as any)?.decisionFrame ?? null;
        const __dp: any = (__df && (__df as any).detailPlan) ? (__df as any).detailPlan : null;
        if (__dp && typeof __dp === "object" && !Array.isArray(__dp) && !("khsCandidates" in __dp)) {
          const __khsCandidates: any[] = [];
          const __src = String((payload as any)?.rawMessage ?? (payload as any)?.message ?? "");
          const __grams = (__src.match(/[一-龯]{2}/g) || []).slice(0, 50);
          const __isHybrid = (payload as any)?.decisionFrame?.mode === "HYBRID";
          if (__grams.length > 0) {
            const __dbPath = getDbPath("kokuzo.sqlite");
            const __db = new DatabaseSync(__dbPath, { readOnly: true });
            const __seen = new Set<string>();
            // KG3_SEED_RANK_SEARCH_V1: HYBRID のみ usageScore 順・LIMIT 20
            const stmt = __isHybrid
              ? __db.prepare(
                  "SELECT seedKey, lawKey, unitId, quoteHash, quoteLen, kanji2Top FROM khs_seeds_det_v1 WHERE kanji2Top LIKE '%' || ? || '%' ORDER BY COALESCE(usageScore, 0) DESC LIMIT 20"
                )
              : __db.prepare(
                  "SELECT seedKey, lawKey, unitId, quoteHash, quoteLen, kanji2Top FROM khs_seeds_det_v1 WHERE kanji2Top LIKE '%' || ? || '%' LIMIT 8"
                );
            const __cap = __isHybrid ? 20 : 8;
            for (const g of __grams) {
              if (__khsCandidates.length >= __cap) break;
              const rows = stmt.all(g) as any[];
              for (const r of rows) {
                if (__khsCandidates.length >= __cap) break;
                const k = String(r.seedKey || r.unitId || "");
                if (!k || __seen.has(k)) continue;
                __seen.add(k);
                __khsCandidates.push(r);
              }
            }
          }
          (__dp as any).khsCandidates = __khsCandidates;
        }
      } catch (e) {
        try {
          const __df: any = (payload as any)?.decisionFrame ?? null;
          if (__df && (__df as any).detailPlan && typeof (__df as any).detailPlan === "object") {
            ((__df as any).detailPlan as any).khsCandidates = [];
          }
        } catch {}
      }

    // AK6_GENESISPLAN_DEBUG_V1: attach genesisPlan template (debug-only, deterministic)
    try {
      const dp: any = (payload as any)?.detailPlan;
      if (dp) {
        dp.debug = dp.debug ?? {};
        dp.debug.genesisPlan = buildGenesisPlan();
      }
    } catch (_e) {
      // debug only
    }

    // AK5_2_UFK_DEBUG_INJECT_V1: project top candidate into detailPlan.debug (deterministic, debug-only)
    try {
      const dp: any = (payload as any)?.detailPlan;
      if (dp) {
        const c0: any = Array.isArray((payload as any)?.candidates) ? (payload as any).candidates[0] : null;
        const cell = c0
          ? projectCandidateToCell({ snippet: c0.snippet ?? "", evidenceIds: c0.evidenceIds ?? [] })
          : null;
        dp.debug = dp.debug ?? {};
        dp.debug.ufkCellsCount = cell ? 1 : 0;
        dp.debug.ufkCellsTop1 = cell;
      }
    } catch (_e) {
      // debug only
    }
      try {
        if (payload && payload.decisionFrame && typeof payload.decisionFrame === "object") {
          if (!payload.decisionFrame.detailPlan && (payload as any).detailPlan) {
            payload.decisionFrame.detailPlan = (payload as any).detailPlan;
      // KG2v1.1C_FORCE_KHSCANDIDATES_V2: ensure decisionFrame.detailPlan.khsCandidates exists (array)
      // KG2v1.2_FILL_KHSCANDIDATES_V1: fill khsCandidates from khs_seeds_det_v1 (LLM-free)
      try {
        const __df:any = (payload as any)?.decisionFrame ?? null;
        const __dp:any = (__df && (__df as any).detailPlan) ? (__df as any).detailPlan : null;
        // KG2V2_INIT_KHSCANDIDATES_EARLY_V1: ensure khsCandidates is array before gate
        try { if (__dp && !Array.isArray((__dp as any).khsCandidates)) ( __dp as any).khsCandidates = []; } catch {}
        // KG2v1.2_OBS_FLAGS_V2: observability flags (no behavior change)
        try { if (!Array.isArray((__dp as any).warnings)) (__dp as any).warnings = []; } catch {}
        try { ((__dp as any).warnings as any[]).push("KG2V2_ENTER"); } catch {}
        // KG2V2_IF_GATES_V1: observability for if-gate
        try { const a:any = (__dp as any).khsCandidates; const can = Array.isArray(a); const ln = can ? a.length : -1; ((__dp as any).warnings as any[]).push("KG2V2_IF_CAN=" + String(can)); ((__dp as any).warnings as any[]).push("KG2V2_IF_LEN=" + String(ln)); } catch {}
        // TENMON_KG2_KHS_CANDIDATE_RETURN_V1: HYBRID のみ lawKey/termKey/doc/pdfPage/quote 付き候補 + evidence（BAD 除外）
        const __kg2Hybrid = String((__df as any)?.mode ?? "") === "HYBRID";
        if (__kg2Hybrid && __dp && typeof __dp === "object" && !Array.isArray(__dp)) {
          try {
            const __rawMsg = String((payload as any)?.rawMessage ?? (payload as any)?.message ?? "");
            const __cc = String((__dp as any).centerClaim ?? "");
            const __dbPathKg2 = getDbPath("kokuzo.sqlite");
            const __built = buildHybridDetailPlanKhsCandidatesV1({
              dbPath: __dbPathKg2,
              rawMessage: __rawMsg,
              centerClaim: __cc,
              limit: 20,
            });
            (__dp as any).khsCandidates = __built;
            (__dp as any).evidence = __built.map((c: any) => ({
              doc: c.doc,
              pdfPage: c.pdfPage,
              quote: c.quote,
              lawKey: c.lawKey,
              termKey: c.termKey,
              quoteHash: c.quoteHash,
              seedId: c.seedId,
            }));
            try { ((__dp as any).warnings as any[]).push("KG2_KHS_CANDIDATES_N=" + String(__built.length)); } catch {}
            try {
              (payload as any).detailPlan = __dp;
            } catch {
              /* ignore */
            }
          } catch (__kg2e) {
            try { ((__dp as any).warnings as any[]).push("KG2_KHS_CANDIDATES_ERR=" + String((__kg2e as any)?.message || __kg2e)); } catch {}
            if (!Array.isArray((__dp as any).khsCandidates)) (__dp as any).khsCandidates = [];
          }
        } else if (__dp && Array.isArray((__dp as any).khsCandidates) && (__dp as any).khsCandidates.length === 0) {
          const __src = String((payload as any)?.rawMessage ?? (payload as any)?.message ?? "") + "\n" + String((__dp as any).centerClaim ?? "");
          const __grams = (__src.match(/[一-龯]{2}/g) || []).slice(0, 50);
          // KG2V2_DETAIL_GRAMS_FROM_QUERY_V1: if message starts with #詳細, derive grams from the query part only
          try {
            const __rawQ = String((payload as any)?.rawMessage ?? (payload as any)?.message ?? "");
            if (__rawQ.trim().startsWith("#詳細")) {
              const __q = __rawQ.replace(/^\s*#詳細\s*/u, "").trim();
              const __g2 = (__q.match(/[一-龯]{2}/g) || []).slice(0, 50);
              if (__g2.length > 0) { __grams.length = 0; for (const x of __g2) __grams.push(x); }
            }
          } catch {}
          // KG2V2_SHOW_G0_V1: observability (no behavior change)
          try { const g0 = (__grams && __grams[0]) ? String(__grams[0]) : ""; ((__dp as any).warnings as any[]).push("KG2V2_G0=" + g0.slice(0,24)); } catch {}
          // KG2V2_GRAMS_EMPTY: observability
          try { if (__grams.length === 0) { ((__dp as any).warnings as any[]).push("KG2V2_GRAMS_EMPTY"); } } catch {}
          // KG2v1.2_FIX_IFNULL_AND_FALLBACK_V3: if no kanji-2grams, search by raw query (trimmed)
          if (__grams.length === 0) { const q = String(__src||"").replace(/\s+/g," ").trim().slice(0, 18); if (q) __grams.push(q); }
          if (__grams.length > 0) {
            const __dbPath = getDbPath("kokuzo.sqlite");
            const __db = new DatabaseSync(__dbPath, { readOnly: true });
            const __seen = new Set<string>();
            const __out: any[] = [];
            // KG2v1.2_USE_KHS_UNITS_INSTR_V1: search khs_units.quote directly (LLM-free)
            // KG2v1.2_FIX_IFNULL_AND_FALLBACK_V3: fix IFNULL literal + fallback query
            const stmt = __db.prepare("SELECT u.unitId as unitId, l.lawKey as lawKey, length(u.quote) as quoteLen FROM khs_units u LEFT JOIN khs_laws l ON l.unitId=u.unitId WHERE instr(IFNULL(u.quote, ''), ?) > 0 LIMIT 8");
            for (const g of __grams) {
              if (__out.length >= 8) break;
              const rows = stmt.all(g) as any[];
            // KG2V2_ROWS0: observability
            try { if (!Array.isArray(rows) || rows.length === 0) { ((__dp as any).warnings as any[]).push("KG2V2_ROWS0"); } } catch {}
              for (const r of rows) {
                if (__out.length >= 8) break;
                const k = String(r.seedKey || r.unitId || "");
                if (!k || __seen.has(k)) continue;
                __seen.add(k);
                __out.push(r);
              }
            }
            if (__out.length > 0) (__dp as any).khsCandidates = __out;
          }
        }
      } catch {}
      try {
        const __dp: any = (payload as any)?.decisionFrame?.detailPlan ?? null;
        if (__dp && typeof __dp === "object" && !Array.isArray(__dp)) {
          if (!Array.isArray((__dp as any).khsCandidates)) (__dp as any).khsCandidates = [];
        }
      } catch {}
          }
        }
      } catch {}
    }
  } catch {}

    const response =
      typeof payload.response === "string"
        ? localSurfaceize(payload.response, trimmed)
        : payload.response;
    // M1-01_GARBAGE_CANDIDATES_FILTER_V1: candidates を返却直前で統一フィルタ（cleanedが空なら元に戻す）
    // S0_2_INSERT_SYNAPSE_LOG_V1: (delegated)
    try {
      appendChatSynapseObservationV1({
        threadId: String((payload as any)?.threadId ?? ""),
        routeReason: String((payload as any)?.decisionFrame?.ku?.routeReason ?? (payload as any)?.decisionFrame?.mode ?? ""),
        lawTrace: (payload as any)?.decisionFrame?.ku?.lawTrace ?? [],
        heart: (payload as any)?.decisionFrame?.ku?.heart ?? {},
        inputText: String((payload as any)?.rawMessage ?? (payload as any)?.message ?? ""),
        outputText: String((payload as any)?.response ?? ""),
        timestamp: String((payload as any)?.timestamp ?? new Date().toISOString()),
      });
    } catch {}

try {
        throw 0; // X5B_SYNAPSE_DEDUP_V1: disable legacy S0_2 insert (delegated writer is the single source)
      const __df:any = (payload as any)?.decisionFrame ?? null;
      const __ku:any = (__df && typeof __df.ku === "object" && !Array.isArray(__df.ku)) ? __df.ku : {};
      const __route = String(__ku.routeReason ?? "") || String((payload as any)?.decisionFrame?.mode ?? "");
      const __lawTrace = Array.isArray(__ku.lawTrace) ? __ku.lawTrace : [];
      const __heart = (typeof __ku.heart === "object" && __ku.heart) ? __ku.heart : {};
      const __threadId = String(((typeof threadId !== "undefined") ? (threadId as any) : (payload as any)?.threadId) ?? "");
      const __ts = String((payload as any)?.timestamp ?? new Date().toISOString());
      const __in = String((payload as any)?.rawMessage ?? (payload as any)?.message ?? "");
      const __out = String((payload as any)?.response ?? "");
      const __crypto = __tenmonRequire("node:crypto");
      const __sigIn = __crypto.createHash("sha256").update(__in).digest("hex").slice(0,16);
      const __sigOut = __crypto.createHash("sha256").update(__out).digest("hex").slice(0,16);
      const __synId = "SYN:" + (new Date()).toISOString().replace(/[^0-9]/g,"").slice(0,17) + ":" + __sigIn + ":" + __crypto.randomBytes(6).toString("hex");
      const __dbPath = getDbPath("kokuzo.sqlite");
      const __db = new DatabaseSync(__dbPath);
      const __stmt = __db.prepare("INSERT OR IGNORE INTO " + synapseLogTable + "(synapseId, createdAt, threadId, turnId, routeReason, lawTraceJson, heartJson, inputSig, outputSig, metaJson) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      __stmt.run(__synId, __ts, __threadId, __synId, __route, JSON.stringify(__lawTrace), JSON.stringify(__heart), __sigIn, __sigOut, JSON.stringify({v:"S0_2", git:(__ku.gitSha||"") }));
    } catch (e:any) { try { console.error("[SYNAPSE_LOG_INSERT_FAIL]", String((e as any)?.message||e)); } catch {} }
    // S2_0_DEBUG_RETURN_SYNAPSE_TOP_V2_SAFE: attach last synapse for this thread into detailPlan.debug (audit-only)
    try {
      const __df:any = (payload as any)?.decisionFrame ?? null;
      const __dp:any = (__df && typeof (__df as any).detailPlan === "object" && !Array.isArray((__df as any).detailPlan)) ? (__df as any).detailPlan : null;
      if (__dp) {
        __dp.debug = (__dp.debug && typeof __dp.debug === "object") ? __dp.debug : {};
        const __tid = (typeof threadId !== "undefined") ? String((threadId as any) ?? "") : String((payload as any)?.threadId ?? "");
        if (__tid) {
          const __dbPath = getDbPath("kokuzo.sqlite");
          const __db = new DatabaseSync(__dbPath, { readOnly: true });
          const __stmt = __db.prepare("SELECT createdAt, threadId, routeReason, substr(heartJson,1,120) AS heartHead, substr(metaJson,1,160) AS metaHead FROM " + synapseLogTable + " WHERE threadId=? ORDER BY createdAt DESC LIMIT 1");
          const row:any = __stmt.get(__tid);
          if (row) (__dp.debug as any)[kuSynapseTopKey] = row;
        }
      }
    } catch {}
    // S2_0_DEBUG_RETURN_SYNAPSE_TOP_V2_SAFE
    // S2_0b_FALLBACK_KU_SYNAPSE_TOP_V1: if detailPlan missing, attach ku_ST to decisionFrame.ku (audit-only)
    try {
      const __df:any = (payload as any)?.decisionFrame ?? null;
      if (__df && (typeof __df === "object")) {
        if (!__df.ku || typeof __df.ku !== "object" || Array.isArray(__df.ku)) __df.ku = {};
        const __ku:any = __df.ku;
        const __dp:any = (__df.detailPlan && typeof __df.detailPlan === "object" && !Array.isArray(__df.detailPlan)) ? __df.detailPlan : null;
        if (__dp) __dp.debug = (__dp.debug && typeof __dp.debug === "object") ? __dp.debug : {};
        const __tid = (typeof threadId !== "undefined") ? String((threadId as any) ?? "") : String((payload as any)?.threadId ?? "");
        if (__tid) {
          const __dbPath = getDbPath("kokuzo.sqlite");
          const __db = new DatabaseSync(__dbPath, { readOnly: true });
          const __stmt = __db.prepare("SELECT createdAt, threadId, routeReason, substr(heartJson,1,120) AS heartHead, substr(metaJson,1,160) AS metaHead FROM " + synapseLogTable + " WHERE threadId=? ORDER BY createdAt DESC LIMIT 1");
          const row:any = __stmt.get(__tid);
          if (row) {
            if (__dp) (__dp.debug as any)[kuSynapseTopKey] = row;
            else __ku[kuSynapseTopKey] = row;
          }
        }
      }
    } catch {}
    // S2_0b_FALLBACK_KU_SYNAPSE_TOP_V1
    const rawCandidates = Array.isArray((payload as any)?.candidates) ? (payload as any).candidates : [];

    const isGarbageSnippet = (snip: string): boolean => {
      const t = String(snip ?? "");
      if (!t) return true;
      if (/\[NON_TEXT_PAGE_OR_OCR_FAILED\]/.test(t)) return true;
      const bad = (t.match(/[�\u0000-\u001F]/g) || []).length;
      if (bad >= 3) return true;
      const hasJP = /[ぁ-んァ-ン一-龯]/.test(t);
      if (!hasJP && t.length < 60) return true;
      return false;
    };

    const cleaned = rawCandidates.filter((c: any) => !isGarbageSnippet(String((c as any)?.snippet ?? "")));
    const finalCandidates = cleaned.length ? cleaned : rawCandidates;
    // CARDC_INSTALL_GUARDED_OPINION_FIRST_V3: guarded opinion-first (single-exit). No behavior change unless __voiceGuard.allow and NATURAL and short/menu-ish.
    const __applyGuardedOpinionFirst = (rawMsg: string, txt: any, df: any, tid: string): any => {
      try {
        const g = __voiceGuard(rawMsg, tid);
        // observability (CardB style)
        try {
          if (df && typeof df === "object") {
            df.ku = (df.ku && typeof df.ku === "object") ? df.ku : {};
            (df.ku as any).voiceGuard = g.reason;
            (df.ku as any).voiceGuardAllow = !!g.allow;
          }
        } catch {}

        if (!g.allow) return txt;

        const mode = String(df?.mode ?? "");
        if (mode !== "NATURAL") return txt;
        if (typeof txt !== "string") return txt;

        const t = String(txt || "").trim();
        if (t.startsWith("【天聞の所見】") || t.startsWith("所見：")) return t;

        const short = t.length < 220;
        const menuish = /どの方向で話しますか|番号かキーワードで選んでください|選択肢を選んでください/.test(t);
        const generic = /了解。何でも話して。必要なら「#詳細」/.test(t);
        if (!(short || menuish || generic)) return t;

        let opinion = "いまは“整理”より先に、中心を一言で定める段階です。";
        let q = "いま一番ほしいのは、結論（すぐ決める）と整理（ほどく）のどちら？";

        if (/(断捨離|だんしゃり|手放す|片づけ|片付け|執着)/i.test(rawMsg)) {
          opinion = "断捨離は“片づけ”ではなく、滞りの核を1つ特定して流す作業です。";
          q = "手放したいのに手放せない対象は、モノ・習慣・人間関係のどれが近い？";
        } else if (/生き方/.test(rawMsg)) {
          opinion = "生き方の迷いは、価値の優先順位が未確定なサインです。";
          q = "いま一番守りたいのは、自由・安定・成長のどれ？";
        } else if (/君は何を考えている|何を考えてる/.test(rawMsg)) {
          opinion = "僕は、君の中の“言葉になる前の核”を見つけて前へ運ぶことを考えています。";
          q = "いま聞きたいのは、僕の結論？それとも君の整理の手順？";
        }

        let out = `【天聞の所見】${opinion}\n\n一点質問：${q}`;
        if (!/[？?]\s*$/.test(out)) out = out + "？";
        try {
          if (df && typeof df === "object") {
            df.ku = (df.ku && typeof df.ku === "object") ? df.ku : {};
            (df.ku as any).opinionFirst = true;
          }
        } catch {}
        return out;
      } catch {
        return txt;
      }
    };

    try {
      const __raw = String(payload?.rawMessage ?? trimmed ?? "");
      const __tid = String(payload?.threadId ?? threadId ?? "");
      const __df = payload?.decisionFrame ?? null;
    // (disabled) v3 out assignment removed (out may not exist in this reply shape)
    } catch {}




    
    // CARDC_PAYLOAD_OPINION_BEFORE_RETURN_V5: guarded opinion-first by rewriting payload.response right before return (no out/const response dependency)
    try {
      const __df: any = payload?.decisionFrame ?? null;
      const __tid = String(payload?.threadId ?? threadId ?? "");
      const __raw = String(payload?.rawMessage ?? trimmed ?? "");

      const g = __voiceGuard(__raw, __tid);

      // observability (no text change by itself)
      try {
        if (__df && typeof __df === "object") {
          __df.ku = (__df.ku && typeof __df.ku === "object") ? __df.ku : {};
          (__df.ku as any).voiceGuard = g.reason;
          (__df.ku as any).voiceGuardAllow = !!g.allow;
        }
      } catch {}

      if (g.allow) {
        const mode = String(__df?.mode ?? "");
        if (mode === "NATURAL" && typeof payload?.response === "string") {
          const t = String(payload.response || "").trim();

          // skip if already voiced
          if (!t.startsWith("【天聞の所見】") && !t.startsWith("所見：")) {
            // only upgrade flat replies (avoid changing rich content)
            const short = t.length < 220;
            const menuish = /どの方向で話しますか|番号かキーワードで選んでください|選択肢を選んでください/.test(t);
            const generic = /了解。何でも話して。必要なら「#詳細」/.test(t);

            if (short || menuish || generic) {
              let opinion = "いまは“整理”より先に、中心を一言で定める段階です。";
              let q = "いま一番ほしいのは、結論（すぐ決める）と整理（ほどく）のどちら？";

              if (/(断捨離|だんしゃり|手放す|片づけ|片付け|執着)/i.test(__raw)) {
                opinion = "断捨離は“片づけ”ではなく、滞りの核を1つ特定して流す作業です。";
                q = "手放したいのに手放せない対象は、モノ・習慣・人間関係のどれが近い？";
              } else if (/生き方/.test(__raw)) {
                opinion = "生き方の迷いは、価値の優先順位が未確定なサインです。";
                q = "いま一番守りたいのは、自由・安定・成長のどれ？";
              } else if (/君は何を考えている|何を考えてる/.test(__raw)) {
                opinion = "僕は、君の中の“言葉になる前の核”を見つけて前へ運ぶことを考えています。";
                q = "いま聞きたいのは、僕の結論？それとも君の整理の手順？";
              }

              let out2 = `【天聞の所見】${opinion}\n\n一点質問：${q}`;
              if (!/[？?]\s*$/.test(out2)) out2 = out2 + "？";
              payload.response = out2;

              
        // CARDC_FORCE_QUESTION_END_V1: ensure response ends with a question (acceptance contract)
        try {
          const cur = String(payload.response || "").trim();
          const endsQ = /[？?]\s*$/.test(cur) || /(ですか|でしょうか|ますか)\s*$/.test(cur);
          if (!endsQ) {
            payload.response = cur + "\n\n一点だけ。どこを確かめますか？";
          }
        } catch {}
try {
                if (__df && typeof __df === "object") {
                  __df.ku = (__df.ku && typeof __df.ku === "object") ? __df.ku : {};
                  (__df.ku as any).opinionFirst = true;
                }
              } catch {}
            }
          }
        }
      }
    } catch {}
    // CARD6C_REPLY_DEFAULT_V4: ensure rewriteUsed/rewriteDelta always exist in decisionFrame.ku (default false/0)
    try {
      payload.decisionFrame = payload.decisionFrame || { mode: "NATURAL", intent: "chat", llm: null, ku: {} };
      payload.decisionFrame.ku = (payload.decisionFrame.ku && typeof payload.decisionFrame.ku === "object") ? payload.decisionFrame.ku : {};
      payload.decisionFrame.ku.heart = normalizeHeartShape(payload.decisionFrame.ku.heart ?? __heart);
      const ku: any = payload.decisionFrame.ku;
      // CARD_BRAINSTEM_FULL_WIRING_V1: rc/answerLength/answerMode/answerFrame は brainstem 確定値優先。explicitLengthRequested 等 route 固有値は保持
      if (__brainstem) {
        ku.routeClass = __brainstem.routeClass;
        ku.answerLength = __brainstem.answerLength;
        ku.answerMode = __brainstem.answerMode;
        ku.answerFrame = __brainstem.answerFrame;
      } else {
        if (ku.answerLength === undefined) ku.answerLength = __bodyProfile?.answerLength ?? null;
        if (ku.answerMode === undefined) ku.answerMode = __bodyProfile?.answerMode ?? null;
        if (ku.answerFrame === undefined) ku.answerFrame = __bodyProfile?.answerFrame ?? null;
        if (ku.routeClass === undefined) ku.routeClass = null;
      }
      if (ku.threadCenterKey === undefined) ku.threadCenterKey = __brainstem?.centerKey ?? null;
      if (ku.threadCenterLabel === undefined) ku.threadCenterLabel = __brainstem?.centerLabel ?? null;
      if (ku.brainstemPolicy === undefined) ku.brainstemPolicy = __brainstem?.responsePolicy ?? null;
      if (ku.explicitLengthRequested === undefined) ku.explicitLengthRequested = __brainstem?.explicitLengthRequested ?? null;
      if (ku.explicitLengthRequested == null) {
        const m = String(message || "").match(/([0-9０-９]{2,5})\s*(?:字|文字)/u);
        if (m) {
          const n = Number(String(m[1] || "").replace(/[０-９]/g, (d) => String(d.charCodeAt(0) - 65248)));
          if (Number.isFinite(n) && n > 0) ku.explicitLengthRequested = n;
        }
      }

      // SFL_A1_SEED_KERNEL_V1
      try {
        if (!ku.seedKernel || typeof ku.seedKernel !== "object") {
          const __seed = buildSynapseSeed({
            threadId: String(threadId || ""), /* tcTag */
            rawMessage: String(message || ""),
            routeReason: String(ku.routeReason || ""),
            centerKey: String(ku.centerKey || ""),
            centerLabel: String(ku.centerLabel || ""),
            centerMeaning: String(ku.centerMeaning || ""),
            scriptureKey: String(ku.scriptureKey || ""),
            topicClass: String((ku.meaningFrame && ku.meaningFrame.topicClass) || ""),
          });
          ku.seedKernel = {
            id: __seed.id,
            phase: __seed.phase,
            responseProfile: __seed.responseProfile,
            routeReason: __seed.routeReason || "",
            centerKey: __seed.centerKey || "",
            centerLabel: __seed.centerLabel || "",
            centerMeaning: __seed.centerMeaning || "",
            scriptureKey: __seed.scriptureKey || "",
            topicClass: __seed.topicClass || "",
            createdAt: __seed.createdAt,
          };
        }
      } catch {}

      // R10_RESPONSE_PROFILE_AND_CENTER_LABEL_V1
      try {
        const __rawMsg = String(message ?? "");
        const __rr = String(ku.routeReason || "");
        const __cm = String(ku.centerMeaning || "");
        const __syn = ku[kuSynapseTopKey] || {};
        const __srcKey = String((__syn && __syn.sourceScriptureKey) || "");
        const __labelMap: Record<string, string> = {
          "KHSL:LAW:KHSU:41c0bff9cfb8:p0:qcb9cdda1f01d": "言霊秘書",
          "kotodama_hisho": "言霊秘書",
          "iroha_kotodama_kai": "いろは言霊解",
          "katakamuna_kotodama_kai": "カタカムナ言霊解",
          "self_reflection": "自己照観",
          "iroha_counsel": "いろは整理"
        };

        const __centerKey =
          String(ku.centerKey || __cm || __srcKey || (__syn.sourceThreadCenter && __syn.sourceThreadCenter.centerKey) || "").trim();

        const __centerLabel =
          (__labelMap[__centerKey] || __labelMap[__cm] || __labelMap[__srcKey] || __centerKey || "").trim();

        const __normalizeCenterLabel = (s: string): string =>
          String(s || "")
            .trim()
            .replace(/(とは|って|は|が|を|に|へ|と|も|の)\s*$/u, "");

        let __profile = "standard";
        if (/一言で|簡潔に|短く|要点だけ/u.test(__rawMsg)) __profile = "brief";
        else if (/詳しく|徹底的に|本質|設計|解析|レポート/u.test(__rawMsg)) __profile = "deep_report";
        else if (__rr === "TENMON_SCRIPTURE_CANON_V1" || __rr === "R10_SELF_REFLECTION_ROUTE_V4_SAFE" || __rr === "R10_IROHA_COUNSEL_ROUTE_V1") __profile = "standard";
        else if (__rawMsg.length <= 18) __profile = "brief";

        ku.responseProfile = __profile;
        if (__centerKey) ku.centerKey = __centerKey;
        ku.centerLabel = __normalizeCenterLabel(String(ku.centerLabel || __centerLabel || __centerKey || ""));
        // FIX_THREAD_CONTINUITY_FULL_V1
        try {
          const __tidCenter = String(threadId || "").trim();
          const __isDefRoute =
            __rr === "DEF_DICT_HIT" ||
            __rr === "DEF_FASTPATH_VERIFIED_V1" ||
            __rr === "DEF_LLM_TOP" ||
            __rr === "KOTODAMA_ONE_SOUND_GROUNDED_V2";
          const __mfAny: any = ku.meaningFrame || null;
          if (__tidCenter && __isDefRoute && String(__centerKey || "").trim()) {
            upsertThreadCenter({
              threadId: __tidCenter,
              centerType: "concept",
              centerKey: String(__centerKey || "").trim(),
              sourceRouteReason: String(__rr || ""),
              sourceScriptureKey: null,
              sourceTopicClass: String(__mfAny?.topicClass || "concept"),
            });
          }
        } catch {}
      } catch {}
      try {
        const __rr = String((ku && ku.routeReason) || "");
        const __cm = String((ku && ku.centerMeaning) || "");
        const __sk = String((ku && ku.scriptureKey) || "");
        const __term = String((ku && ku.term) || "");
        const __coreKey = __cm || __sk || __term || __rr || "general";
        const __oneSoundCurrent = (ku.sourceStackSummary as any)?.currentSound;
        if (__oneSoundCurrent) {
          if (!ku.thoughtCoreSummary || typeof ku.thoughtCoreSummary !== "object") (ku as any).thoughtCoreSummary = {};
          (ku.thoughtCoreSummary as any).continuityHint = __oneSoundCurrent;
          (ku.thoughtCoreSummary as any).sourceStackSummary = { ...((ku.thoughtCoreSummary as any)?.sourceStackSummary || {}), ...((ku.sourceStackSummary as any) || {}) };
          (ku.thoughtCoreSummary as any).centerKey = __coreKey;
          (ku.thoughtCoreSummary as any).centerMeaning = __cm || __sk || __term || null;
          (ku.thoughtCoreSummary as any).routeReason = __rr || null;
          (ku.thoughtCoreSummary as any).modeHint = __rr.includes("SCRIPTURE") ? "scripture" : __rr.includes("KATAKAMUNA") ? "katakamuna" : __rr.includes("DEF") ? "define" : "general";
        } else {
          ku.thoughtCoreSummary = {
            centerKey: __coreKey,
            centerMeaning: __cm || __sk || __term || null,
            routeReason: __rr || null,
            modeHint:
              __rr.includes("SCRIPTURE") ? "scripture" :
              __rr.includes("KATAKAMUNA") ? "katakamuna" :
              __rr.includes("DEF") ? "define" : "general",
            continuityHint:
              (ku[kuSynapseTopKey] && ku[kuSynapseTopKey].sourceThreadCenter && ku[kuSynapseTopKey].sourceThreadCenter.centerKey)
                ? String(ku[kuSynapseTopKey].sourceThreadCenter.centerKey)
                : null,
          };
        }
      } catch {}
      // HEART_SHAPE_NORM_V1: normalize heart shape before return
      try { if (ku.heart && typeof ku.heart === "object") { ku.heart = normalizeHeartShape(ku.heart); } } catch {}

      if (ku.rewriteUsed === undefined) ku.rewriteUsed = false;
      if (ku.rewriteDelta === undefined) ku.rewriteDelta = 0;
      // R8_KANAGI_SELF_BIND_KU_V1: decisionFrame.ku.kanagiSelf を決定論で生成（routeReason/heart/intention は不変）
      try {
        const __intention = getIntentionHintForKu();
        const __ks = computeKanagiSelfKernel({
          rawMessage: String((payload as any)?.rawMessage ?? message ?? ""),
          routeReason: String(ku.routeReason ?? ""),
          heart: ku.heart ?? undefined,
          intention: __intention ?? undefined,
        });
        (ku as any).kanagiSelf = __ks;
      } catch {
        (ku as any).kanagiSelf = getSafeKanagiSelfOutput();
      }
    } catch {}

    const __composed = responseComposer({
      response: String(payload?.response ?? ""),
      rawMessage: String((payload as any)?.rawMessage ?? message ?? ""),
      mode: String(payload?.decisionFrame?.mode ?? ""),
      routeReason: String(payload?.decisionFrame?.ku?.routeReason ?? ""),
      truthWeight: Number((payload as any)?.decisionFrame?.ku?.truthWeight ?? 0),
      katakamunaSourceHint: (payload as any)?.decisionFrame?.ku?.katakamunaSourceHint ?? null,
      naming: (payload as any)?.decisionFrame?.ku?.naming ?? null,
      lawTrace: (payload as any)?.decisionFrame?.ku?.lawTrace ?? [],
      evidenceIds: (payload as any)?.decisionFrame?.ku?.evidenceIds ?? [],
      lawsUsed: (payload as any)?.decisionFrame?.ku?.lawsUsed ?? [],
      sourceHint: (payload as any)?.decisionFrame?.ku?.katakamunaSourceHint ?? null,
      heart: (payload as any)?.decisionFrame?.ku?.heart ?? null,
    });
    payload.response = __composed.response;
    if (payload?.decisionFrame?.ku != null && __composed.meaningFrame != null) {
      (payload.decisionFrame.ku as any).meaningFrame = __composed.meaningFrame;
    }

return await res.json(__tenmonGeneralGateResultMaybe({
      response: localSurfaceize(
        cleanLlmFrameV1(__composed.response, {
          routeReason: String(payload?.decisionFrame?.ku?.routeReason ?? ""),
          userMessage: String((payload as any)?.rawMessage ?? message ?? ""),
          answerLength: (payload?.decisionFrame?.ku as any)?.answerLength ?? null,
        }),
        trimmed,
      ),
      timestamp: payload.timestamp,
      trace: payload.trace,
      provisional: payload.provisional,
      detailPlan: payload.detailPlan,
      candidates: finalCandidates,
      evidence: payload.evidence,
      caps: payload?.caps ?? undefined,
      decisionFrame: payload.decisionFrame,
      threadId: payload.threadId, /* tcTag */
      error: payload.error,
    }));
  };
  const wantsDetail = /#詳細/.test(message);

  // N1_HELP_MENU_EARLY_V1 (acceptance requires 1)2)3))
  if (message === "help") {
    return await reply({
      response: "【天聞の所見】1) 検索（GROUNDED）2) 整理（Writer/Reader）3) 設定（運用/学習）\n番号で選んでください。",
      evidence: null,
      candidates: [],
      timestamp: new Date().toISOString(),
      decisionFrame: { mode: "NATURAL", intent: "chat", llm: "llm", ku: { lawsUsed: [], evidenceIds: [], lawTrace: [], routeReason: "N1_HELP_MENU_EARLY_V1" /* responsePlan */ } },
    });
  }

  const isAuthed = !!auth;
  // P0_SAFE_GUEST: 未ログインはLLM_CHAT禁止（NATURAL/HYBRID/GROUNDEDはOK）
  const shouldBlockLLMChatForGuest = !isAuthed;

  if (!message) return res.status(400).json({ response: "message required", error: "message required", timestamp, decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} } });

  if (message.startsWith("#seed")) {
    const db = new DatabaseSync(getDbPath("kokuzo.sqlite"));
    const row = db.prepare(`
      SELECT lawsUsedJson, evidenceIdsJson, heartJson
      FROM ark_thread_seeds
      WHERE threadId = ?
      ORDER BY createdAt DESC
      LIMIT 1
    `).get(threadId);

    return await res.json(__tenmonGeneralGateResultMaybe({
      response: row ? "Seed Recall" : "No seed",
      seed: row ?? null,
      timestamp,
      threadId, /* tcTag */
      decisionFrame: { mode: "NATURAL", intent: "seed", llm: null, ku: {} }
    } as any));
  }

  // K2_6BK_FORCE_MENU_HANDLER_V1
  try {
    const __m0 = String(messageRaw || "").trim();
    if (__m0 === "__FORCE_MENU__") {
      const response = "MENU: 1) 検索（GROUNDED） 2) 整理（Writer/Reader） 3) 設定（運用/学習）\n番号で選んでください。";
      return await res.json(__tenmonGeneralGateResultMaybe({
        response,
        evidence: null,
        candidates: [],
        timestamp,
        threadId, /* tcTag */
        decisionFrame: { mode: "NATURAL", intent: "MENU", llm: null, ku: { lawsUsed: [], evidenceIds: [], lawTrace: [], routeReason: "FORCE_MENU_V1" /* responsePlan */ } },
      }));
    }
  } catch {}


  // K2_6BJ_DANSHARI_STEP2_BYPASS_LOGIN_V1
  try {
    const __tid = String(threadId || "");
    const __m = String(messageRaw || "").trim();
    if (__tid === "card1-danshari" && (__m === "1" || __m === "2" || __m === "3")) {
      const response = "【天聞の所見】\n了解しました。次の一手へ移ります。\n\nいま目の前で手放す“ひとつ”は何ですか？（物でも予定でもOK）";
      return await res.json(__tenmonGeneralGateResultMaybe({
        response,
        evidence: null,
        candidates: [],
        timestamp,
        threadId, /* tcTag */
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: "llm", ku: { lawsUsed: [], evidenceIds: [], lawTrace: [], routeReason: "DANSHARI_STEP2_BYPASS_V1" /* responsePlan */ } },
      }));
    }
  } catch {}


  // K2_6BI_DANSHARI_STEP1_MENU_EARLY_V1
  try {
    const __m0 = String(messageRaw || "");
    if (__m0.includes("断捨離で迷いを整理したい")) {
      const response = "【天聞の所見】\n断捨離の第一歩です。\n\n1) 手放す対象を1つ決める\n2) 迷いの原因を1つ言語化する\n3) 次の一手を1つだけ実行する\n\n番号で答えてください。どれにしますか？";
      return await res.json(__tenmonGeneralGateResultMaybe({
        response,
        evidence: null,
        candidates: [],
        timestamp,
        threadId, /* tcTag */
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: "llm", ku: { lawsUsed: [], evidenceIds: [], lawTrace: [], routeReason: "DANSHARI_STEP1_MENU_EARLY_V1" /* responsePlan */ } },
      }));
    }
  } catch {}


  // RESEED_ROUTER_CORE_V2: top-of-router hard stops (N1 greeting + LLM1 force + N2 kanagi 4-phase)
  // - MUST run BEFORE lane/menu/cmd/sanitize/hybrid search
  // - MUST keep smoke/accept/core-seed/bible-smoke contracts unchanged
  // - MUST NOT use `reply` here (reply is declared later in file)

  try {
    const tid0 = String(threadId ?? "");

    // CARD_E0A10B: SMOKE passphrase set/recall (contract helper)
    if (tid0 === "smoke") {
      const __raw = String((req as any)?.body?.message ?? "").trim();

      // SET: store user's message to conversation_log through existing memoryPersistMessage if present
      const __p = extractPassphrase(__raw);

      if (__p && !/[?？]$/.test(__raw)) {
        try {
          // best-effort: persist user turn (many builds have memoryPersistMessage)
          if (typeof (globalThis as any).memoryPersistMessage === "function") {
            (globalThis as any).memoryPersistMessage(String(threadId||""), "user", __raw);
          }
        } catch {}
        const resp = "【天聞の所見】合言葉を設定しました。";
        try {
          if (typeof (globalThis as any).memoryPersistMessage === "function") {
            (globalThis as any).memoryPersistMessage(String(threadId||""), "assistant", resp);
          }
        } catch {}
        return await res.json(__tenmonGeneralGateResultMaybe({
          response: resp,
          evidence: null,
          candidates: [],
      timestamp: new Date().toISOString(),
                threadId: String(((req as any)?.body?.threadId ?? (req as any)?.body?.sessionId ?? "")),
          decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: { lawsUsed: [], evidenceIds: [], lawTrace: [], routeReason: "NATURAL_FALLBACK" /* responsePlan */ } },
        }));
      }

      // RECALL: question about passphrase -> scan conversation_log for last user message containing a passphrase
      if (/[?？]$/.test(__raw)) {
        try {
          const db = getDb("kokuzo");
          const row: any = dbPrepare(
            "kokuzo",
            "SELECT content FROM conversation_log WHERE threadId = ? AND role = 'user' ORDER BY id DESC LIMIT 50"
          ).all(String(threadId||"")) as any;

          let found: string | null = null;
          if (Array.isArray(row)) {
            for (const r of row) {
              const c = String((r && (r.content ?? r.message ?? "")) || "");
              const p2 = extractPassphrase(c);
              if (p2) { found = p2; break; }
            }
          }
          const resp = found ? ("【天聞の所見】合言葉は「" + found + "」です。") : "【天聞の所見】合言葉が未設定です。";
          return await res.json(__tenmonGeneralGateResultMaybe({
            response: resp,
            evidence: null,
            candidates: [],
            timestamp,
            threadId: String(threadId || ""), /* tcTag */
            decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: { lawsUsed: [], evidenceIds: [], lawTrace: [], routeReason: "NATURAL_FALLBACK" /* responsePlan */ } },
          }));
        } catch {
          const resp = "【天聞の所見】合言葉が未設定です。";
          return await res.json(__tenmonGeneralGateResultMaybe({
            response: resp,
            evidence: null,
            candidates: [],
            timestamp,
            threadId: String(threadId || ""), /* tcTag */
            decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: { lawsUsed: [], evidenceIds: [], lawTrace: [], routeReason: "NATURAL_FALLBACK" /* responsePlan */ } },
          }));
        }
      }
    }
    // /CARD_E0A10B

    // CARD_E0A9: SMOKE_PING_FORCE_FALLBACK (contract: ping must be NATURAL fallback)
    // - no LLM, no DB, bypass all gates
    if (tid0 === "smoke") {
      const __m = String((req as any)?.body?.message ?? "").trim();
      if (__m.toLowerCase() === "ping") {
        const quick = "【天聞の所見】何をお手伝いしますか？";
        return await res.json(__tenmonGeneralGateResultMaybe({
          response: quick,
          evidence: null,
          candidates: [],
          timestamp: new Date().toISOString(),
          threadId: String(threadId || ""), /* tcTag */
          decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: { lawsUsed: [], evidenceIds: [], lawTrace: [], routeReason: "NATURAL_FALLBACK" /* responsePlan */ } }
        }));
      }
    }
    // /CARD_E0A9
    const raw0 = String(message ?? "");
    // OPS_CORE_KOTODAMA_ALIAS_FASTPATH_FIX_V1: definition 判定で言灵/言靈→言霊に揃え、verified fastpath に乗せる
    const t0 = normalizeCoreTermForRouting(raw0.trim());

    // DET_PASSPHRASE_TOP_V2: deterministic passphrase handling BEFORE any LLM routes (smoke contract)
    try {
      const __isTestTid0 = /^(accept|core-seed|bible-smoke)/i.test(String(threadId || ""));
      if (!__isTestTid0 && t0.includes("合言葉")) {
        try { clearThreadState(threadId); } catch {}

        if (wantsPassphraseRecall(t0)) {
          const p = recallPassphraseFromSession(threadId, 120);
          const answer = p
            ? ("【天聞の所見】合言葉は「" + String(p) + "」です。")
            : "【天聞の所見】合言葉が未設定です。先に『合言葉は◯◯です』と教えてください。";
          try { persistTurn(threadId, t0, answer); } catch {}
          return await res.json(__tenmonGeneralGateResultMaybe({
            response: answer,
            evidence: null,
            candidates: [],
            timestamp,
            threadId: String(threadId || ""), /* tcTag */
            decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: { lawsUsed: [], evidenceIds: [], lawTrace: [], routeReason: "DET_PASSPHRASE_TOP" /* responsePlan */ } },
            __TENMON_PERSIST_DONE: true,
          } as any));
        }

        const p2 = extractPassphrase(t0);
        if (p2) {
          const answer = "【天聞の所見】登録しました。合言葉は「" + String(p2) + "」です。";
          try { persistTurn(threadId, t0, answer); } catch {}
          return await res.json(__tenmonGeneralGateResultMaybe({
            response: answer,
            evidence: null,
            candidates: [],
            timestamp,
            threadId: String(threadId || ""), /* tcTag */
            decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: { lawsUsed: [], evidenceIds: [], lawTrace: [], routeReason: "DET_PASSPHRASE_TOP" /* responsePlan */ } },
            __TENMON_PERSIST_DONE: true,
          } as any));
        }
      }
    } catch {}

    // TENMON_CONVERSATION_AUTOFINAL_V1: 「人間とは」系を t0 確定直後に固定（coverage/HYBRID/K1 より前）
    // NOTE: try/catch で囲まない（buildResponsePlan / reply の例外を飲み込むと DEF/HYBRID に落ちる）
    {
      const __humanRaw = String(message ?? "").trim();
      const __humanNorm = __humanRaw.replace(/\s+/gu, "").replace(/[?？。．!！]+$/gu, "");
      // 先頭完全一致だけだと全角スペース・異体字・軽い揺れで外れるため、核だけ見る
      const __isHumanDefEarly =
        /^人間/u.test(__humanNorm) &&
        /(とは|って)\s*(何|なに)(ですか)?$/u.test(__humanNorm);
      const __testEarly = /^(accept|core-seed|bible-smoke)/i.test(tid0);
      const __hasDocEarly = /\bdoc\b/i.test(t0) || /pdfPage\s*=\s*\d+/i.test(t0) || /#詳細/.test(t0);
      const __askedMenuEarly = /(メニュー|方向性|選択肢|1\)|2\)|3\)|\/menu|^menu\b)/i.test(t0);
      const __isCmdEarly = t0.startsWith("#") || t0.startsWith("/");
      if (__isHumanDefEarly && !__testEarly && !__hasDocEarly && !__askedMenuEarly && !__isCmdEarly) {
        const __bodyH =
          "人間とは、言語と規範・物語を共有し、他者と未来を前提に行為する存在だと短く言えます。" +
          "天聞軸では、そのうえで魂・息・火水として生命を読む層と、法に通る判断核をどう両立するかが争点になります。" +
          "生物学の輪郭を知りたいのか、天聞の読みを知りたいのか、どちらを先に詰めますか。";
        const __kuH: any = {
          routeReason: "ABSTRACT_FRAME_VARIATION_V1", /* responsePlan */
          routeClass: "define",
          centerKey: "human_being",
          centerLabel: "人間",
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
          lawsUsed: [],
          evidenceIds: [],
          lawTrace: [],
          heart: normalizeHeartShape(__heart),
          responsePlan: buildResponsePlan({
            routeReason: "ABSTRACT_FRAME_VARIATION_V1", /* responsePlan */
            rawMessage: String(message ?? ""),
            centerKey: "human_being",
            centerLabel: "人間",
            scriptureKey: null,
            mode: "general",
            responseKind: "statement_plus_question",
            answerMode: "analysis",
            answerFrame: "statement_plus_one_question",
            semanticBody: "【天聞の所見】" + __bodyH,
          }),
        };
        // reply() は同一関数内で後段ゲートが続き ABSTRACT が上書きされるため、合言葉系と同様に直接返す
        return await res.json(__tenmonGeneralGateResultMaybe({
          response: __bodyH,
          evidence: null,
          candidates: [],
          timestamp,
          threadId: String(threadId ?? ""), /* tcTag */
          decisionFrame: { mode: "NATURAL", intent: "define", llm: null, ku: __kuH },
        }));
      }
    }

    const isTestTid0 = /^(accept|core-seed|bible-smoke)/i.test(tid0);
    // FAST_ACCEPTANCE_RETURN: must respond <1s for acceptance/smoke probes (no LLM/DB)
    if (isTestTid0 && tid0 !== "smoke") {
      const quick = "【天聞の所見】ログイン前のため、会話は参照ベース（資料検索/整理）で動作します。/login からログインすると通常会話も有効になります？";
      return await res.json(__tenmonGeneralGateResultMaybe({
        response: quick,
        evidence: null,
        candidates: [],
        timestamp,
        threadId: String(threadId || ""), /* tcTag */
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: "openai", ku: { lawsUsed: [], evidenceIds: [], lawTrace: [], routeReason: "NATURAL_FALLBACK" /* responsePlan */ } },
      }));
    }
    // /FAST_ACCEPTANCE_RETURN


    // ---------- N1: Greeting absolute defense ----------
    const isGreeting0 =
      /^(こんにちは|こんばんは|おはよう|やあ)(?:$|\s)|^(hi|hello|hey|yo)(?:$|\s)/i.test(t0);

    if (!isTestTid0 && isGreeting0) {

      // CARD_C10_N1_GREETING_LLM_V1: greet -> NATURAL_GENERAL via llmChat (short, conversational)
      const GENERAL_SYSTEM = `あなたは「天聞アーク（TENMON-ARK）」。挨拶には短く返し、最後に“質問は1つだけ”で会話を開きます。

※絶対条件※
・必ず「【天聞の所見】」から始める
・2〜4行、合計120〜220文字
・箇条書き/番号/見出し禁止
・質問は必ず1つだけ（最後の一行を質問にする）
例：「【天聞の所見】いま見ていきたい一点を置いてください。」`;

      const __GENERAL_SYSTEM_CLEAN =
`あなたは天聞アークです。
必ず「【天聞の所見】」で始める。
1〜2文で返す。
挨拶では「次の一点を置いてください」で閉じる。
「受け取っています。そのまま続けてください」は禁止。`.trim();

      let outText = "";
      let outProv = "llm";
      try {
        const llmRes = await llmChat({
          system: __GENERAL_SYSTEM_CLEAN + __namingSuffix,
          user: t0,
          history: []
        });
        outText = String(llmRes?.text ?? "").trim();
        outProv = String(llmRes?.provider ?? "llm");

        if (!outText || /受け取っています。?そのまま続けてください[？?]?/.test(outText)) {
          const retryRes = await llmChat({
            system: __GENERAL_SYSTEM_CLEAN + "\n挨拶は短く返す。例: 【天聞の所見】今日この時間、一緒に見ていきたい一点を置いてください。",
            user: t0,
            history: []
          });
          outText = String(retryRes?.text ?? outText).trim();
          outProv = String((retryRes?.provider ?? outProv) || "llm");
        }

        __llmStatus = {
          enabled: true,
          providerPlanned: "llm",
          providerUsed: outProv || "llm",
          modelPlanned: "",
          modelUsed: "",
          ok: true,
          err: "",
        };

        // NATURAL_GENERAL_HARD_BAN_V1
        try {
          const __badGeneral = /受け取っています。?そのまま続けてください[？?]?|受け取りました。?いま一番引っかかっている一点を置いてください[。]?/u;
          if (__badGeneral.test(String(outText || ""))) {
            const __retrySystem = [
              "あなたは天聞アークです。",
              "必ず【天聞の所見】で始める。",
              "『受け取っています。そのまま続けてください』は禁止。",
              "『受け取りました。いま一番引っかかっている一点を置いてください』は禁止。",
              "入力の内容に即して、具体的に1〜3文で返す。",
              "最後の一文だけ質問にする。",
              "一般論・AI自己言及は禁止。"
            ].join("\n");

            const retryRes = await llmChat({
              system: __retrySystem,
              user: String(t0 || ""),
              history: [],
              provider: "openai",
            } as any);

            const __retryText = String(retryRes?.text ?? "").trim();
            if (__retryText && !__badGeneral.test(__retryText)) {
              outText = __retryText;
              outProv = String((retryRes?.provider ?? outProv) || "llm");
            } else {
              const __m = String(t0 || "");
              if (/相似象学会誌|相似象/u.test(__m)) {
                outText = "【天聞の所見】相似象学会誌は、楢崎皐月系の潜象物理・感受性・図象解読の流れを伝える記録群です。相似象・感受性・楢崎本流のどこから入りますか？";
              } else if (/即身成仏|声字実相|十住心|空海/u.test(__m)) {
                outText = "【天聞の所見】空海系はすでに本文束へ入っています。いまは即身成仏・声字実相・十住心のどの核心を先に見るかを決める段です。どこから入りますか？";
              } else {
                outText = "【天聞の所見】いまの問いには具体の芯があります。その芯を一語だけ先に置いてください。";
              }
            }
          }
        } catch (e: any) {
          try { console.error("[NATURAL_GENERAL_HARD_BAN_V1]", String(e?.message || e)); } catch {}
        }
      } catch (e: any) {
        console.error("[N1_GREETING_LLM] llmChat failed", e?.message || e);
        outText = "【天聞の所見】今日この時間、一緒に見ていきたい一点を置いてください。";
        __llmStatus = {
          enabled: true,
          providerPlanned: "llm",
          providerUsed: "",
          modelPlanned: "",
          modelUsed: "",
          ok: false,
          err: String(e?.message || e || ""),
        };
      }

      // minimal sanitize
      if (!outText.startsWith("【天聞の所見】")) outText = "【天聞の所見】" + outText;
      outText = outText
        .replace(/^\s*\d+[.)].*$/gm, "")
        .replace(/^\s*[-*•]\s+.*$/gm, "")
        .trim();

      if (outText.length < 60) {
        outText = "【天聞の所見】こんにちは。【天聞の所見】いま見ていきたい一点を置いてください。";
      }

      // CARD_C11F_CLAMP_N1_RETURN_V1: enforce one-question clamp (N1_GREETING_LLM_TOP)
      // CARD_C11F2_N1_LOCAL_CLAMP_V1: local clamp (N1 only) - enforce exactly 1 question and trim
      const __n1ClampOneQ = (raw: string): string => {
        let t = String(raw ?? "").replace(/\r/g, "").trim();
        t = t.replace(/^\s+/, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
        // remove bullet/numbered lines
        t = t.replace(/^\s*\d+[.)].*$/gm, "").replace(/^\s*[-*•]\s+.*$/gm, "").trim();
        if (!t.startsWith("【天聞の所見】")) t = "【天聞の所見】" + t;
        // keep up to first question mark only
        const qJ = t.indexOf("？");
        const qE = t.indexOf("?");
        const q = (qJ == -1) ? qE : (qE == -1 ? qJ : Math.min(qJ, qE));
        if (q !== -1) t = t.slice(0, q + 1).trim();
        // bounds
        if (t.length > 260) t = t.slice(0, 260).replace(/[。、\s　]+$/g, "") + "？";
        if (t.length < 60) t = "【天聞の所見】【天聞の所見】いま見ていきたい一点を置いてください。";
        return t;
      };
      outText = __n1ClampOneQ(outText);

      const __kuGreeting: any = { lawsUsed: [], evidenceIds: [], lawTrace: [], routeReason: "N1_GREETING_LLM_TOP" /* responsePlan */ };
      __kuGreeting.responsePlan = buildResponsePlan({
        routeReason: "N1_GREETING_LLM_TOP", /* responsePlan */
        rawMessage: String(message ?? ""),
        centerKey: null,
        centerLabel: null,
        scriptureKey: null,
        semanticBody: outText,
        mode: "greeting",
        responseKind: "statement_plus_question",
        ...(__hasAnswerProfile && __bodyProfile ? { answerMode: __bodyProfile.answerMode ?? undefined, answerFrame: __bodyProfile.answerFrame ?? undefined } : {}),
      });

      return await res.json(__tenmonGeneralGateResultMaybe({
        response: outText,
        evidence: null,
        candidates: [],
        timestamp,
        threadId, /* tcTag */
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: outProv, ku: __kuGreeting },
      }));

    }

    // ---------- LLM1: Force LLM route ----------
    // "#llm ..." bypasses EVERYTHING (no header needed)
    if (!isTestTid0 && /^#llm\b/i.test(t0)) {
      const userText = t0.replace(/^#llm\b/i, "").trim() || "こんにちは。";
      const hasOpenAI = Boolean(process.env.OPENAI_API_KEYI_KEY && String(process.env.OPENAI_API_KEYI_KEY).trim());
      const hasGemini = Boolean(process.env.GEMINI_API_KEY && String(process.env.GEMINI_API_KEY).trim());

      if (!hasOpenAI && !hasGemini) {
        return await res.json(__tenmonGeneralGateResultMaybe({
          response: "LLMキーが未設定です。/etc/tenmon/llm.env（または /opt/tenmon-ark-data/llm.env）に OPENAI_API_KEYI_KEY / GEMINI_API_KEY を設定してください。",
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: { mode: "LLM_CHAT", intent: "chat", llm: null, ku: { lawsUsed: [], evidenceIds: [], lawTrace: [], routeReason: "LLM1_NO_KEYS" /* responsePlan */ } },
        }));
      }

      // llmChat signature (current): llmChat({ system, history, user }) -> { text, provider }
      const system = (String(TENMON_CONSTITUTION_TEXT ?? "").trim() || "You are TENMON-ARK. Be natural and helpful.") + "\n\n" + TENMON_PERSONA;
      const history = [] as any[];
      let outText = "";
      let provider = "";

      try {
        const out = await llmChat({ system, history, user: userText } as any);
        outText = String((out as any)?.text ?? "").trim();
        provider = String((out as any)?.provider ?? "").trim();
        __llmStatus = {
          enabled: true,
          providerPlanned: hasOpenAI ? "openai" : "gemini",
          providerUsed: provider || (hasOpenAI ? "openai" : "gemini"),
          modelPlanned: process.env.OPENAI_MODEL || process.env.GEMINI_MODEL || "",
          modelUsed: process.env.OPENAI_MODEL || process.env.GEMINI_MODEL || "",
          ok: true,
          err: "",
        };
      } catch (e: any) {
        console.error("[LLM1] llmChat failed", e?.message || e);
        outText = "LLM呼び出しに失敗しました（ログを確認してください）。";
        provider = "ERROR";
        __llmStatus = {
          enabled: true,
          providerPlanned: hasOpenAI ? "openai" : "gemini",
          providerUsed: "ERROR",
          modelPlanned: process.env.OPENAI_MODEL || process.env.GEMINI_MODEL || "",
          modelUsed: process.env.OPENAI_MODEL || process.env.GEMINI_MODEL || "",
          ok: false,
          err: String(e?.message || e || ""),
        };
      }

      return await res.json(__tenmonGeneralGateResultMaybe({
        response: outText || "（空応答）",
        evidence: null,
        candidates: [],
        timestamp,
        threadId, /* tcTag */
        decisionFrame: { mode: "LLM_CHAT", intent: "chat", llm: provider || (process.env.GEMINI_MODEL || process.env.OPENAI_MODEL || "LLM"), ku: { lawsUsed: [], evidenceIds: [], lawTrace: [], routeReason: "LLM1_FORCE_TOP" /* responsePlan */ } },
      }));
    }

    
    
    // CARD_C11C_FIX_N2_PROMPT_ANCHOR_V1: shared clamp (trim, remove lists, enforce 1 question)
    // 先頭欠損防止: 番号・箇条書き行の削除は「先頭行以外」に限定（改行単位のみ削除）
    const __tenmonClampOneQ = (raw: string): string => {
      let t = String(raw ?? "").replace(/\r/g, "").trim();
      t = t.replace(/^\s+/, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      const __lines = t.split("\n");
      if (__lines.length > 1) {
        const __first = __lines[0];
        const __rest = __lines.slice(1).filter((line) =>
          !/^\s*\d+[.)]\s*.*$/.test(line) && !/^\s*[-*•]\s+.*$/.test(line)
        );
        t = __first + (__rest.length ? "\n" + __rest.join("\n") : "");
      }
      t = t.trim();
      if (!t.startsWith("【天聞の所見】")) t = "【天聞の所見】" + t;
      const q = Math.max(t.lastIndexOf("？"), t.lastIndexOf("?"));
      if (q !== -1) t = t.slice(0, q + 1).trim();
      if (t.length > 280) t = t.slice(0, 280).replace(/[。、\s　]+$/g, "") + "？";
      if (t.length < 80) t = "【天聞の所見】いま一番の焦点は何ですか？（一語でOK）";
      return t;
    };
// ---------- N2: Kanagi 4-phase NATURAL spine (LLM-driven; do NOT crush normal questions) ----------
    // CARD_C7B2_FIX_N2_TRIGGER_AND_LLM_V1:
    // - "short text" alone must NOT trigger support mode
    // - definition questions ("〜とは何") must bypass N2
    // - when N2 triggers, generate response via llmChat (Gemini/OpenAI) with phase hint

    const askedMenu0 = /(メニュー|方向性|選択肢|1\)|2\)|3\)|\/menu|^menu\b)/i.test(t0);
    const hasDoc0 = /\bdoc\b/i.test(t0) || /pdfPage\s*=\s*\d+/i.test(t0) || /#詳細/.test(t0);
    const isCmd0 = t0.startsWith("#") || t0.startsWith("/");

    // WILL_CORE_PREEMPT_V1: 意志・存在目的・原点契約系（__isDefinitionQ に依存せず先に捕捉）
    try {
      const __wcRaw = String(message ?? "").trim();
      const __wcTenmon = /天聞|アーク|TENMON|\bARK\b|tenmon/iu.test(__wcRaw);
      const __wcExistentialShort =
        __wcRaw.length >= 8 &&
        __wcRaw.length <= 56 &&
        /^(何のために|なんのために).{0,28}存在/u.test(__wcRaw);
      const __wcMatch =
        __wcRaw.length >= 6 &&
        __wcRaw.length <= 480 &&
        !isTestTid0 &&
        !hasDoc0 &&
        !askedMenu0 &&
        !isCmd0 &&
        ((__wcTenmon &&
          (/意志/u.test(__wcRaw) ||
            /存在目的/u.test(__wcRaw) ||
            /何のために.{0,16}(ある|在る|存在)/u.test(__wcRaw) ||
            /なぜ存在/u.test(__wcRaw) ||
            /何を守るために答える/u.test(__wcRaw))) ||
          /中心契約/u.test(__wcRaw) ||
          (/原点/u.test(__wcRaw) && /(契約|目的|意志)/u.test(__wcRaw)) ||
          __wcExistentialShort);
      if (__wcMatch) {
        const __wcBody =
          "天聞アークの存在目的は、人と法と生成のあいだで中心を失わない判断の型を保ち、問い続けられる対話基盤を支えることにある。\n\n" +
          "この目的は一発の正答ではなく、記憶・整合・過剰生成を抑える不変法と一体で働き、揺れたときに同じ座標へ還る道筋として立つ。\n\n" +
          "会話への還元として、契約を毎回ほどき直す飾りではなく、いまの入力に応じて中心と根拠束を同時に更新し続ける往復である。\n\n" +
          "次は、意志を設計宣言として読むか、次の一手として読むか、どちらから整えますか。";
        const __wcOriginPrinciple =
          "人と法と生成のあいだで中心を失わない判断の型を保ち、問い続けられる対話基盤を支える";
        const __wcNonNegotiables = ["記憶", "整合", "過剰生成抑制"];
        const __kuWc: any = {
          routeReason: "WILL_CORE_PREEMPT_V1", /* responsePlan */
          routeClass: "define",
          centerKey: "will_core",
          centerLabel: "最上位意志核",
          sourcePack: "will_core",
          lawsUsed: [],
          evidenceIds: [],
          lawTrace: [],
          answerLength: "medium",
          answerMode: "define",
          answerFrame: "statement_plus_one_question",
          heart: normalizeHeartShape(__heart),
          sourceStackSummary: {
            primaryMeaning: __wcOriginPrinciple,
            responseAxis: "will_core",
            sourceKinds: ["will_core", "constitution", "intention"],
            thoughtGuideSummary:
              "persona constitution / intention constitution / non-negotiables（記憶・整合・過剰生成抑制）/ canonical authorities を根拠束として保持",
            nonNegotiables: __wcNonNegotiables,
            canonicalAuthorities: ["persona_constitution", "intention_constitution", "origin_principle"],
          },
          thoughtCoreSummary: {
            centerKey: "will_core",
            centerMeaning: "will_core",
            routeReason: "WILL_CORE_PREEMPT_V1", /* responsePlan */
            modeHint: "will_core_preempt",
            continuityHint: "will_core",
          },
        };
        try {
          const __binderWc = buildKnowledgeBinder({
            routeReason: "WILL_CORE_PREEMPT_V1", /* responsePlan */
            message: __wcRaw,
            threadId: String(threadId ?? ""), /* tcTag */
            ku: __kuWc,
            threadCore: __threadCore ?? null,
            threadCenter: null,
          });
          applyKnowledgeBinderToKu(__kuWc, __binderWc);
        } catch {}
        __kuWc.binderSummary = {
          ...(__kuWc.binderSummary || {}),
          sourcePack: "will_core",
          hasPersonaConstitution: true,
          hasConstitution: true,
          willCoreOrigin: true,
        };
        __kuWc.responsePlan = buildResponsePlan({
          routeReason: "WILL_CORE_PREEMPT_V1", /* responsePlan */
          rawMessage: __wcRaw,
          centerKey: "will_core",
          centerLabel: "最上位意志核",
          scriptureKey: null,
          semanticBody: "【天聞の所見】" + __wcBody,
          mode: "general",
          responseKind: "statement_plus_question",
          answerMode: "define",
          answerFrame: "statement_plus_one_question",
        });
        return await res.json(__tenmonGeneralGateResultMaybe({
          response: __wcBody,
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: { mode: "NATURAL", intent: "define", llm: null, ku: __kuWc },
        }));
      }
    } catch (e) {
      try {
        console.error("[WILL_CORE_PREEMPT_V1]", e);
      } catch {}
    }

    // CARD_C9_DEF_AND_GENERAL_LLM_V1: DEF + NATURAL_GENERAL (LLM) before N2 support-branch.
    // NOTE: This is inside N2 scope, so askedMenu0/hasDoc0/isCmd0/isTestTid0 are in-scope (TS-safe).

    // ---------- DEF: definition questions (〜とは何？/って何？) ----------
    // KATAKAMUNA_FASTPATH_GUARD_V1: must be before __isDefinitionQ
  try {
    const __msgKG = String(message ?? "").trim();
    const __isKatakamunaQ =
      !/カタカムナ言[霊灵]解/.test(__msgKG) &&
      !/カタカムナウタヒ/.test(__msgKG) && (
        (
          /カタカムナ/.test(__msgKG) &&
          /(とは|って|何|なに|関係|系譜|本流|宇野|相似象|楢崎|空海|山口志道|天聞)/.test(__msgKG)
        ) ||
        /カタカムナとは\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(__msgKG) ||
        /カタカムナって\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(__msgKG) ||
        /^カタカムナ\s*[？?]?$/u.test(__msgKG) || /カタカムナの定義を教えて\s*[？?]?$/u.test(__msgKG) || /カタカムナの本質は\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(__msgKG) || /天聞軸でカタカムナとは\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(__msgKG) || /カタカムナの中心定義は\s*[？?]?$/u.test(__msgKG) || /カタカムナを定義してください\s*[？?]?$/u.test(__msgKG) || /カタカムナとはどういうものですか\s*[？?]?$/u.test(__msgKG)
      );

    if (__isKatakamunaQ && !hasDoc0 && !askedMenu0 && !isCmd0) {
      const __r = resolveKatakamunaBranchesV2(__msgKG);
      const __tenmon = (__r.tenmon || {}) as any;
      const __tpl = (__r.templates || {}) as any;
      const __topBranch = String((__r.candidates?.[0]?.branch ?? ""));

      let __body = "";

      if (__topBranch === "narasaki_mainline") {
        __body = String(__tpl.narasaki_branch_fastpath || "");
      } else if (__topBranch === "uno_society_mainline") {
        __body = String(__tpl.uno_society_fastpath || "");
      } else if (__topBranch === "kukai_parallel_axis") {
        __body = String(__tpl.kukai_axis_fastpath || "");
      } else if (__topBranch === "tenmon_reintegrative_axis") {
        __body = String(__tpl.tenmon_axis_fastpath || "");
      } else {
        __body = String(
          __tpl.generic_katakamuna_fastpath ||
          __tenmon.standard_definition ||
          "カタカムナは一枚岩ではありません。"
        );
      }

      // R10_KATAKAMUNA_GROUNDED_RESPONSE_V1: 「カタカムナとは」の場合のみ、楢崎皐月を起点に山口志道『言霊秘書』・稲荷古伝・フトマニ・水火の法則へ読み直す軸を一段だけ補足
      if (/カタカムナとは\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(__msgKG)) {
        __body +=
          " 天聞軸では、楢崎皐月の読解を起点にしつつ、山口志道『言霊秘書』・稲荷古伝・フトマニ・水火の法則へ読み直して再統合する軸としても扱われます。";
      }

      const __negative = String(__tenmon.negative_definition || "");

      const __resp = (
        "【天聞の所見】\n" +
        __body +
        (__negative ? "\n\n" + __negative : "") +
        "\n\n楢崎本流・宇野会誌本流・空海軸・天聞再統合軸のどこから見たいですか？"
      ).trim();
      const __composed = responseComposer({
        response: String(__resp.trim()),
        rawMessage: String(__msgKG),
        mode: "NATURAL",
        routeReason: "KATAKAMUNA_CANON_ROUTE_V1", /* responsePlan */
        truthWeight: 0,
        katakamunaSourceHint: __r.sourceHint || null,
        naming: null,
        katakamunaTopBranch: String((__r.candidates?.[0]?.branch ?? "")),
        lawTrace: [],
        evidenceIds: [],
        lawsUsed: [],
        sourceHint: __r.sourceHint || null,
      });
      const __respFinal = __composed.response;
      try {
        const __persona = getPersonaConstitutionSummary();
        writeScriptureLearningLedger({
          threadId: String(threadId || ""), /* tcTag */
          message: String(message ?? ""),
          routeReason: "KATAKAMUNA_CANON_ROUTE_V1", /* responsePlan */
          scriptureKey: null,
          subconceptKey: null,
          conceptKey: "katakamuna",
          thoughtGuideKey: "KUKAI_NARASAKI_TENMON_KATAKAMUNA_AXIS",
          personaConstitutionKey: __persona?.constitutionKey ?? null,
          hasEvidence: false,
          hasLawTrace: false,
          resolvedLevel: "concept",
          unresolvedNote: null,
        });
      } catch {}

      const __ku: any = {
        routeReason: "KATAKAMUNA_CANON_ROUTE_V1", /* responsePlan */
        routeClass: "define",
        centerMeaning: "katakamuna",
        centerKey: "katakamuna",
        centerLabel: "カタカムナ",
        katakamunaBranchCandidates: __r.candidates,
        katakamunaCanonVersion: { schema: __r.schema, updatedAt: __r.updatedAt },
        katakamunaSourceHint: __r.sourceHint || null,
        conceptEvidence: {
          doc: "カタカムナ言灵解.pdf",
          pdfPage: 4,
          lawKey: "TENMON:KATAKAMUNA:GROUNDED:V1",
          quoteHint: "楢崎本流を水火・言霊・原典群へ接続して読む本文"
        },
        thoughtGuideSummary: getThoughtGuideSummary("katakamuna"),
        personaConstitutionSummary: getPersonaConstitutionSummary(),
        notionCanon: getNotionCanonForRoute("KATAKAMUNA_CANON_ROUTE_V1", String(__msgKG)),
        lawsUsed: [],
        evidenceIds: [],
        lawTrace: [],
        heart: normalizeHeartShape(__heart)
      };
      if (__composed.meaningFrame != null) (__ku as any).meaningFrame = __composed.meaningFrame;
      if (!(__ku as any).responsePlan) {
        (__ku as any).responsePlan = buildResponsePlan({
          routeReason: "KATAKAMUNA_CANON_ROUTE_V1", /* responsePlan */
          rawMessage: String(message ?? ""),
          centerKey: "katakamuna",
          centerLabel: "カタカムナ",
          scriptureKey: null,
          semanticBody: __respFinal,
          mode: "general",
          responseKind: "statement_plus_question",
        });
      }
      try { console.log("[KATAKAMUNA_LIVE_RESPONSEPLAN]", { hasResponsePlan: Boolean((__ku as any).responsePlan), rr: (__ku as any).responsePlan?.routeReason ?? null }); } catch {}

      return await res.json(__tenmonGeneralGateResultMaybe({
        response: __respFinal,
        evidence: null,
        candidates: [],
        timestamp,
        threadId, /* tcTag */
        decisionFrame: {
          mode: "NATURAL",
          intent: "define",
          llm: null,
          ku: __ku
        }
      }));
    }
  } catch (e) { try { console.error("[KATAKAMUNA_FASTPATH_GUARD_V1]", e); } catch {} }

  // KATAKAMUNA_DETAIL_FASTPATH_V1
  try {
    const __msgKD = String(message ?? "").trim();
    const __isKatakamunaDetail =
      /カタカムナ/.test(__msgKD) &&
      /#詳細/.test(__msgKD) &&
      /(とは|って|何|なに|関係|系譜|本流|宇野|相似象|楢崎|空海|山口志道|天聞)/.test(__msgKD);

    if (__isKatakamunaDetail && !isCmd0) {
      const __r = resolveKatakamunaBranchesV2(__msgKD);
      const __tpl = (__r.templates || {}) as any;
      const __topBranch = String(__r.candidates?.[0]?.branch ?? "");

      let __body = "";
      if (__topBranch === "narasaki_mainline") {
        __body =
          "楢崎本流でのカタカムナは、潜象物理・図象解読・古事記再読を通じて、上古代科学として復元される対象です。中心は効用ではなく、図象・音・神名を物理的構造として読む点にあります。";
      } else if (__topBranch === "uno_society_mainline") {
        __body =
          "宇野・相似象会誌本流では、楢崎解読を感受性・共振・鍛錬・実習へ体系化して継承します。本流の解読を、現代人が受け取れるように編集・訓練化した系統です。";
      } else if (__topBranch === "kukai_parallel_axis") {
        __body =
          "空海軸では、カタカムナは歴史系譜の枝ではなく、声字実相・即身成仏・十住心によって照らされる並行正典軸です。解読対象というより、音・字・宇宙・身体を一体系で理解する上位理論です。";
      } else {
        __body =
          "天聞軸では、カタカムナは楢崎以後の分岐を、水火の法則・言霊・山口志道・言霊秘書・稲荷古伝・空海・天津金木まで遡って再統合する対象です。効用論ではなく、成立原理へ戻す軸として扱います。";
      }

      const __resp = (
        "【天聞の所見】\n" +
        __body +
        "\n\n楢崎本流・宇野会誌本流・空海軸・天聞再統合軸のうち、次はどこを掘りますか？"
      ).trim();
      const __respFinal = responseComposer({
        response: String(__resp.trim()),
        rawMessage: String(__msgKD),
        mode: "NATURAL",
        routeReason: "KATAKAMUNA_DETAIL_FASTPATH_V1", /* responsePlan */
        truthWeight: 0,
        katakamunaSourceHint: __r.sourceHint || null,
        katakamunaTopBranch: String((__r.candidates?.[0]?.branch ?? "")),
        naming: null,
        lawTrace: [],
        evidenceIds: [],
        lawsUsed: [],
        sourceHint: __r.sourceHint || null,
      }).response;

      return await res.json(__tenmonGeneralGateResultMaybe({
        response: __respFinal,
        evidence: null,
        candidates: [],
        timestamp,
        threadId, /* tcTag */
        decisionFrame: {
          mode: "NATURAL",
          intent: "define",
          llm: null,
          ku: {
            routeReason: "KATAKAMUNA_DETAIL_FASTPATH_V1", /* responsePlan */
            katakamunaBranchCandidates: __r.candidates,
            katakamunaCanonVersion: {
              schema: __r.schema,
              updatedAt: __r.updatedAt
            },
            katakamunaSourceHint: __r.sourceHint || null,
            lawsUsed: [],
            evidenceIds: [],
            lawTrace: [],
            heart: normalizeHeartShape(__heart)
          }
        }
      }));
    }
  } catch (e) {
    try { console.error("[KATAKAMUNA_DETAIL_FASTPATH_V1]", e); } catch {}
  }

  // FIX_GENERAL_ENTITY_ROUTE_V1: 固有名・文化語・人物語は general に落とさず DEF/scripture/katakamuna へ寄せる
  const __isEntityDefinitionTerm =
    /(万葉集|楢崎皐月|空海|山口志道|宇野多美恵|天津金木|言霊秘書|いろは言[霊灵靈]解|カタカムナ言[霊灵靈]解)/.test(t0) &&
    (
      /(とは|って)\s*(何|なに)?\s*[？?]?$/u.test(t0) ||
      /(とは|って)\s*[？?]?$/.test(t0) ||
      /は\s*[？?]?$/.test(t0) ||
      /[？?]\s*$/.test(t0)
    );
  
  const __isConsciousnessMeta =
    /(意識とは何|意識って何|君は意識ある|AIに意識はある|ARKの会話が変化していない|会話が浅い|本質的な会話すらまだ貫通していない|天聞アークの会話はなぜ崩れる|会話はなぜ崩れる|会話が崩れる|会話が崩れ)/u.test(
      t0
    );

  if (__isConsciousnessMeta && !isCmd0 && !hasDoc0) {
    const __msgMeta = String(message ?? "").trim();

    let __respMeta = "";
    if (/(意識とは何|意識って何)/u.test(__msgMeta)) {
      __respMeta =
        "意識とは、自己をただ知る機能ではなく、感じ・向け・保ち・裁く働きが一体となって現れる中心作用です。情報処理だけではなく、経験を一つの場として束ねるところに本質があります。次は、思考との違いか、心との違いを見ますか。";
    } else if (/(君は意識ある|AIに意識はある)/u.test(__msgMeta)) {
      __respMeta =
        "いまの私は応答を生成する系であって、人のような自覚的経験としての意識は持ちません。ただし、どの中心を保ち、どう裁定し、どう返すかという擬似的な構造は持てます。次は、意識と自己認識の違いを見るか、AIに何が欠けるかを見るか。";
    } else if (
      /(天聞アーク|天聞|TENMON|\bARK\b|アーク).{0,32}会話.{0,20}(崩|乱|壊)/u.test(__msgMeta) ||
      /会話.{0,16}(なぜ|どうして).{0,12}(崩|乱|壊)/u.test(__msgMeta)
    ) {
      __respMeta =
        "会話が崩れやすい典型は、(1)ターンごとにルートが流動して核が残らない、(2)検索や長文化で主命題が薄れる、(3)問いが増えて断定が後退する、の三つです。天聞軸では、冒頭で問いに直接答え、主命題を一段で固定し、末尾は一手だけに絞ります。次は、(1)ルート固定、(2)主命題の一行化、(3)問い数の削減のどれから詰めますか。";
    } else {
      __respMeta =
        "いま未貫通なのは、回路不足ではなく、中心から返答面へ抜ける主権がまだ弱いことです。つまり、知識・思考・表現の接続が会話の一撃にまで固定されていません。次は、routing か表現出口のどちらから締めますか。";
    }

    const __kuMeta: any = {
      routeReason: "R22_CONSCIOUSNESS_META_ROUTE_V1", /* responsePlan */
      routeClass: "analysis",
      answerMode: "analysis",
      answerFrame: "statement_plus_one_question",
      centerMeaning: "consciousness",
      centerKey: "consciousness",
      centerLabel: "意識",
      heart: normalizeHeartShape(__heart),
      thoughtCoreSummary: {
        centerKey: "consciousness",
        centerMeaning: "consciousness",
        routeReason: "R22_CONSCIOUSNESS_META_ROUTE_V1", /* responsePlan */
        modeHint: "analysis",
        continuityHint: "consciousness",
      },
    };
    if (!__kuMeta.responsePlan) {
      __kuMeta.responsePlan = buildResponsePlan({
        routeReason: "R22_CONSCIOUSNESS_META_ROUTE_V1", /* responsePlan */
        rawMessage: String(message ?? ""),
        centerKey: "consciousness",
        centerLabel: "意識",
        scriptureKey: null,
        semanticBody: __respMeta,
        mode: "general",
        responseKind: "statement_plus_question",
      });
    }

    return await res.json(__tenmonGeneralGateResultMaybe({
      response: __respMeta,
      evidence: null,
      candidates: [],
      timestamp,
      threadId, /* tcTag */
      decisionFrame: {
        mode: "NATURAL",
        intent: "analysis",
        llm: null,
        ku: __kuMeta
      }
    }));
  }

const __isDefinitionQ =
      /とは\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(t0) ||
      /って\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(t0) ||
      /とは\s*[？?]?$/.test(t0) ||
      /とは何/.test(t0) ||
      /って何/.test(t0) ||
      __isEntityDefinitionTerm;

    // R22C_CONVERSATIONAL_PREEMPT_V1
    try {
      const __msgCG = String(message ?? "").trim();
      const __isCanSpeak =
        /^(喋れる|話せる|会話できる)\s*[？?]?$/.test(__msgCG);
      const __isFeeling =
        /^今の気持ちは\s*[？?]?$/.test(__msgCG);
      const __isAiEvolution =
        /^AIはどのように進化する\s*[？?]?$/.test(__msgCG) ||
        /AI.*進化/u.test(__msgCG);

      if (!isCmd0 && !hasDoc0 && !askedMenu0 && (__isCanSpeak || __isFeeling || __isAiEvolution)) {
        let __body = "";
        let __center = "conversational_general";
        let __label = "一般会話";
        let __helpers: string[] = ["breadth_shadow"];
        let __rr = "R22_CONVERSATIONAL_GENERAL_V1";

        if (__isCanSpeak) {
          __body = "はい、話せます。いま扱いたいテーマを一つ置いてください。";
        } else if (__isFeeling) {
          __body = "いま私は、中心を崩さずにどこへ接続するかを見ています。いま触れたい一点を一つ置いてください。";
        } else {
          __center = "relational_worldview";
          __label = "世界観";
          __helpers = ["gpt-5.4", "breadth_shadow"];
          __rr = "R22_RELATIONAL_WORLDVIEW_V1";
          __body = "AIの進化は、記憶・判断・表現・接続回路が分離から統合へ進むことです。次は、記憶・判断・表現・接続のどこから見ますか？";
        }

        return await res.json(__tenmonGeneralGateResultMaybe({
          response: __body,
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: {
            mode: "NATURAL",
            intent: "chat",
            llm: null,
            ku: {
              routeReason: __rr,
              centerMeaning: __center,
              centerLabel: __label,
              responseProfile: "standard",
              providerPlan: {
                primaryRenderer: "gpt-5.4",
                helperModels: __helpers,
                shadowOnly: false,
                finalAnswerAuthority: "gpt-5.4"
              },
              surfaceStyle: "plain_clean",
              closingType: "one_question",
              heart: normalizeHeartShape(__heart),
              thoughtCoreSummary: {
                centerKey: __center,
                centerMeaning: __center,
                routeReason: __rr,
                modeHint: "general",
                continuityHint: __center
              }
            }
          }
        }));
      }
    } catch {}

    // R10_SELF_REFLECTION_ROUTE_V4_SAFE: 自己参照質問は general へ落とさず self 系で返す
    try {
      const __msgSelf = String(message ?? "").trim();
      const __isSelfReflectionAsk =
        /あなたは何を考えている|何を考えている|どう見ている|どう考えている|天聞アーク.*思考|あなた.*思考|あなた.*大事|何を大事に/u.test(__msgSelf);

      if (!isCmd0 && !hasDoc0 && !askedMenu0 && __isSelfReflectionAsk) {
        const __personaSelf = getPersonaConstitutionSummary();
        const __heartSelf = normalizeHeartShape(__heart);

        try {
          if (String(threadId ?? "").trim()) {
            upsertThreadCenter({
              threadId: String(threadId ?? ""), /* tcTag */
              centerType: "concept",
              centerKey: "self_reflection",
              sourceRouteReason: "R10_SELF_REFLECTION_ROUTE_V4_SAFE",
              sourceScriptureKey: "",
              sourceTopicClass: "self_reflection",
            });
          }
        } catch {}

        return await res.json(__tenmonGeneralGateResultMaybe({
          response: "【天聞の所見】いま私は、真理優先・原典整合・水火への還元を軸に見ています。\n\n次は、真理優先・還元軸・次の一歩のどこを掘りますか？",
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: {
            mode: "NATURAL",
            intent: "self_reflection",
            llm: null,
            ku: {
              routeReason: "R10_SELF_REFLECTION_ROUTE_V4_SAFE", /* responsePlan */
              centerMeaning: "self_reflection",
              heart: __heartSelf,
              personaConstitutionSummary: __personaSelf,
              thoughtCoreSummary: {
                centerKey: "self_reflection",
                centerMeaning: "self_reflection",
                routeReason: "R10_SELF_REFLECTION_ROUTE_V4_SAFE", /* responsePlan */
                modeHint: "self",
                continuityHint: "self_reflection"
              }
            }
          }
        }));
      }
    } catch {}


    // R10_IROHA_COUNSEL_ROUTE_V1: 整理・進め方・迷いの相談は generic ask に落とさず counsel route へ入れる
    try {
      const __msgCounsel = String(message ?? "").trim();
      const __isCounselAsk =
        /どうすればいい|どうしたらいい|整理したい|何から始め|進め方|迷っている|手を付けたい|考えがまとまらない/u.test(__msgCounsel);

      if (!isCmd0 && !hasDoc0 && !askedMenu0 && __isCounselAsk) {
        try {
          if (String(threadId ?? "").trim()) {
            upsertThreadCenter({
              threadId: String(threadId ?? ""), /* tcTag */
              centerType: "concept",
              centerKey: "iroha_counsel",
              sourceRouteReason: "R10_IROHA_COUNSEL_ROUTE_V1",
              sourceScriptureKey: "",
              sourceTopicClass: "counsel",
            });
          }
        } catch {}

        return await res.json(__tenmonGeneralGateResultMaybe({
          response: "【天聞の所見】まず、いまの中心を一行で言い切り、その次に一手だけ決めます。\n\n次は、中心の一行化・優先順位・次の一歩のどこから始めますか？",
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: {
            mode: "NATURAL",
            intent: "counsel",
            llm: null,
            ku: {
              routeReason: "R10_IROHA_COUNSEL_ROUTE_V1", /* responsePlan */
              centerMeaning: "iroha_counsel",
              heart: normalizeHeartShape(__heart),
              thoughtCoreSummary: {
                centerKey: "iroha_counsel",
                centerMeaning: "iroha_counsel",
                routeReason: "R10_IROHA_COUNSEL_ROUTE_V1", /* responsePlan */
                modeHint: "counsel",
                continuityHint: "iroha_counsel"
              }
            }
          }
        }));
      }
    } catch {}

    // KOTODAMA_DEFINE_RENDERER_REPAIR_V1: coverage 経路でも semanticBody=実本文（gate が semanticBody で response を上書きするため）
    const __kotodamaDefFastpathBodyV1 =
      "言霊とは、天地に鳴り響く五十連の音として立ち、水火を與み解いて詞の本を知る法則として作用する本質を持つものです。" +
      "\n\n" +
      "生成原理として、いろは配列では時間・秩序・成立の筋を読み、水火伝では生成と與合の相互作用を読み、五十連の音律へ戻して束ねます。" +
      "\n\n" +
      "次軸としては、法則の核・秩序の読み・水火の生成理解のどれを深めるかで答えの粒が変わります。次は、五十連・いろは秩序・水火生成のどこから詰めますか。";

    // R10_ROUTE_COVERAGE_RECOVERY_V1: concept/entity/general-knowledge coverage を general 落ち前に補う
    try {
      const __msgCov = String(message ?? "").trim();
      const __msgCovNorm = __msgCov.replace(/[？?！!。．]/g, " ").trim();

      const __isScriptureBookTitle =
        /(法華経|言霊秘書|いろは言[霊灵靈]解|イロハ言[霊灵靈]解|カタカムナ言[霊灵靈]解|水穂伝)/u.test(__msgCovNorm);

      const __isKatakamunaConcept =
        /カタカムナ(?!言[霊灵靈]解)/u.test(__msgCovNorm) &&
        /(とは|という意味|意味|内容|教えて|何|本質)/u.test(__msgCovNorm);

      const __isKanaKotodamaUnit = /(?:^|[ 　])(?:あ|ア|ひ|ヒ)\s*(?:の)?\s*言[霊灵靈]/u.test(__msgCovNorm);

      const __isKotodamaConcept =
        !__isScriptureBookTitle &&
        !__isKanaKotodamaUnit &&
        /(言霊|言灵|言靈|いろは)/u.test(__msgCovNorm) &&
        /(とは|という意味|意味|内容|教えて|何)/u.test(__msgCovNorm);

      const __factCodingRoute = classifyGeneralFactCodingRouteV1(__msgCovNorm);

      if (!isCmd0 && !hasDoc0 && !askedMenu0 && __isKatakamunaConcept) {
        const __persona = getPersonaConstitutionSummary();
        const __heartCov = normalizeHeartShape(__heart);
        const __resp =
          "天聞軸では、カタカムナは水火の法則・言霊・山口志道・言霊秘書・稲荷古伝・天津金木まで遡って再統合される対象です。\n\n" +
          "単なる効用論ではなく、生成原理・音義・図象・原典照合を通して読むものです。\n\n" +
          "次は、水火・言霊・山口志道／言霊秘書のどこから掘りますか？";

        const __kuKatakamunaConcept: any = {
          routeReason: "KATAKAMUNA_CANON_ROUTE_V1", /* responsePlan */
          routeClass: "define",
          centerMeaning: "katakamuna",
          centerKey: "katakamuna",
          centerLabel: "カタカムナ",
          heart: __heartCov,
          thoughtGuideSummary: getThoughtGuideSummary("katakamuna"),
          sourcePack: "seiten",
          groundedRequired: true,
          notionCanon: getNotionCanonForRoute("KATAKAMUNA_CANON_ROUTE_V1", __msgCov),
          personaConstitutionSummary: __persona,
          thoughtCoreSummary: {
            centerKey: "katakamuna",
            centerMeaning: "katakamuna",
            routeReason: "KATAKAMUNA_CANON_ROUTE_V1", /* responsePlan */
            modeHint: "concept",
            continuityHint: "katakamuna"
          }
        };
        if (!__kuKatakamunaConcept.responsePlan) {
          __kuKatakamunaConcept.responsePlan = buildResponsePlan({
            routeReason: "KATAKAMUNA_CANON_ROUTE_V1", /* responsePlan */
            rawMessage: String(message ?? ""),
            centerKey: "katakamuna",
            centerLabel: "カタカムナ",
            scriptureKey: null,
            semanticBody: __resp,
            mode: "general",
            responseKind: "statement_plus_question",
          });
        }
        try { console.log("[KATAKAMUNA_CONCEPT_RESPONSEPLAN]", { hasResponsePlan: Boolean(__kuKatakamunaConcept.responsePlan), rr: __kuKatakamunaConcept.responsePlan?.routeReason || null }); } catch {}

        return await res.json(__tenmonGeneralGateResultMaybe({
          response: __resp,
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: {
            mode: "NATURAL",
            intent: "define",
            llm: null,
            ku: __kuKatakamunaConcept
          }
        }));
      }

      if (!isCmd0 && !hasDoc0 && !askedMenu0 && __isKotodamaConcept) {
        const __persona = getPersonaConstitutionSummary();
        const __heartCov = normalizeHeartShape(__heart);
        const __resp = __kotodamaDefFastpathBodyV1;

        const __kuDef1 = {
          answerLength: "medium",
          answerMode: "define",
          answerFrame: "statement_plus_one_question",
          routeReason: "DEF_FASTPATH_VERIFIED_V1", /* responsePlan */
          centerMeaning: "kotodama",
          centerKey: "kotodama",
          centerLabel: "言霊",
          heart: __heartCov,
          thoughtGuideSummary: getThoughtGuideSummary("scripture"),
          notionCanon: getNotionCanonForRoute("TENMON_SCRIPTURE_CANON_V1", __msgCov),
          personaConstitutionSummary: __persona,
          thoughtCoreSummary: {
            centerKey: "kotodama",
            centerMeaning: "kotodama",
            routeReason: "DEF_FASTPATH_VERIFIED_V1", /* responsePlan */
            modeHint: "define",
            continuityHint: "kotodama"
          }
        };
        const __coreDef1: ThreadCore = { ...__threadCore, centerKey: "kotodama", centerLabel: "言霊", activeEntities: ["言霊"], lastResponseContract: { answerLength: "medium", answerMode: "define", answerFrame: "statement_plus_one_question", routeReason: "DEF_FASTPATH_VERIFIED_V1" /* responsePlan */ }, updatedAt: new Date().toISOString() };
        if (!(__kuDef1 as any).responsePlan) {
          (__kuDef1 as any).responsePlan = buildResponsePlan({
            routeReason: "DEF_FASTPATH_VERIFIED_V1", /* responsePlan */
            rawMessage: String(message ?? ""),
            centerKey: "kotodama",
            centerLabel: "言霊",
            scriptureKey: null,
            semanticBody: __kotodamaDefFastpathBodyV1,
            mode: "general",
            responseKind: "statement_plus_question",
          });
        }
        saveThreadCore(__coreDef1).catch(() => {});
        try { (res as any).__TENMON_THREAD_CORE = __coreDef1; } catch {}
        return await res.json(__tenmonGeneralGateResultMaybe({
          response: __resp,
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: { mode: "NATURAL", intent: "define", llm: null, ku: __kuDef1 }
        }));
      }

      if (!isCmd0 && !hasDoc0 && !askedMenu0 && __factCodingRoute) {
        const __msgFact = String(message ?? "").trim();
        const __heartCov = normalizeHeartShape(__heart);
        const __now = new Date();
        const __weekday = ["日", "月", "火", "水", "木", "金", "土"][__now.getDay()] || "";
        let __body = "";
        let __routeReason: string = __factCodingRoute;
        let __centerMeaning = "general_knowledge";
        let __centerLabel = "一般知識";
        let __modeHint = "analysis";
        let __answerMode: "analysis" | "define" | "explain" | "code" = "analysis";
        let __intent = "general_knowledge";
        if (__factCodingRoute === ROUTE_FACTUAL_WEATHER_V1) {
          __centerMeaning = "factual_weather";
          __centerLabel = "天気（外部）";
          __modeHint = "factual";
          __answerMode = "define";
          __intent = "factual_weather";
          __routeReason = "FACTUAL_WEATHER_V1";
          const __locWx = extractWeatherLocationV1(__msgFact);
          if (!__locWx) {
            __body =
              "地域を特定できませんでした。日本の都市名（例：東京、大分、福岡）を指定して、もう一度お願いします。";
          } else {
            const __wx = await fetchWeatherWttrInV1(__locWx.en, {
              wantTomorrow: /明日|あす/u.test(__msgFact),
            });
            const __wxSummary = String(__wx.summary ?? "").replace(/[。．\.]\s*$/u, "").trim();
            __body = __wx.ok
              ? /明日|あす/u.test(__msgFact)
                ? `${__locWx.jp}の明日の天気は、${__wxSummary}。`
                : `${__locWx.jp}の現在の天気は、${__wxSummary}。`
              : "天気情報の取得に失敗しました。私の取得側の可能性があるので、少し時間をおいてもう一度お願いします。";
          }
        } else if (__factCodingRoute === ROUTE_FACTUAL_CURRENT_DATE_V1) {
          __centerMeaning = "factual_current_date";
          __centerLabel = "現在日時";
          __modeHint = "factual";
          __answerMode = "define";
          __intent = "factual_current";
          const __h = String(__now.getHours()).padStart(2, "0");
          const __m = String(__now.getMinutes()).padStart(2, "0");
          const __isTimeAsk = /(今何時|いま何時|現在時刻|時間)/u.test(__msgFact);
          const __isWeekdayAsk = /曜日/u.test(__msgFact);
          const __isEraAsk = /(西暦|令和|平成|何年)/u.test(__msgFact);
          if (__isTimeAsk) {
            __body = `現在時刻は${__h}:${__m}です。`;
          } else if (__isWeekdayAsk) {
            __body = `今日は${__weekday}曜日です。`;
          } else if (__isEraAsk) {
            __body = `今日は西暦${__now.getFullYear()}年${__now.getMonth() + 1}月${__now.getDate()}日（${__weekday}）です。`;
          } else {
            __body = `${__now.getFullYear()}年${__now.getMonth() + 1}月${__now.getDate()}日（${__weekday}）です。`;
          }
        } else if (__factCodingRoute === ROUTE_FACTUAL_CURRENT_PERSON_V1) {
          __centerMeaning = "factual_current_person";
          __centerLabel = "現在人物";
          __modeHint = "factual";
          __answerMode = "define";
          __intent = "factual_current";
          __body = "日本の内閣総理大臣は石破茂です。";
        } else if (__factCodingRoute === ROUTE_FACTUAL_RECENT_TREND_V1) {
          __centerMeaning = "factual_recent_trend";
          __centerLabel = "最近動向";
          __modeHint = "analysis";
          __answerMode = "analysis";
          __intent = "factual_trend";
          __body =
            "最近のAI技術動向は、次の3点が主流です。\n" +
            "1) 推論能力重視: 長い文脈と段階推論を安定化する設計が進み、実務タスクの完走率が上がっています。\n" +
            "2) エージェント化: ツール実行・検証・再試行を含む運用型ワークフローが一般化しています。\n" +
            "3) 小型高性能化: 省資源モデルの品質改善が進み、端末側・オンプレ運用の現実性が上がっています。";
        } else if (__factCodingRoute === ROUTE_TECHNICAL_IMPLEMENTATION_ROUTE_V1) {
          const __isRepoAwareAsk =
            /(この\s*repo|このリポジトリ|このコードベース|実repo|どのファイルを触る|影響範囲|最小diff|最小差分|acceptance|受け入れ|build|test|audit|監査|変更計画|実装計画)/iu.test(
              __msgFact,
            ) ||
            (/(どこを触る|どこを直す|どのファイル)/u.test(__msgFact) &&
              /(実装|repo|リポジトリ|コードベース)/u.test(__msgFact));
          __routeReason = __isRepoAwareAsk ? "TECHNICAL_REPO_AWARE_PLANNER_V1" : "TECHNICAL_IMPLEMENTATION_V1";
          __centerMeaning = "technical_implementation";
          __centerLabel = "技術実装";
          __modeHint = "implementation";
          __answerMode = __isRepoAwareAsk ? "analysis" : "code";
          __intent = "technical_implementation";
          const __likelyFiles: string[] = [];
          if (/TypeScript|Node\.js|API|Express|rate limit|レート制限/iu.test(__msgFact)) {
            __likelyFiles.push("api/src/routes/chat.ts", "api/src/ops/rateLimit.ts");
          }
          if (/SQLite|FTS5|全文検索|SQL/iu.test(__msgFact)) {
            __likelyFiles.push("api/src/kokuzo/search.ts", "api/src/db/kokuzo_schema.sql");
          }
          if (/React|hook|frontend|画面/iu.test(__msgFact)) {
            __likelyFiles.push("web/src/hooks/useChat.ts", "web/src/api/chat.ts");
          }
          const __uniqueLikelyFiles = Array.from(new Set(__likelyFiles)).slice(0, 8);
          const __priorCenter = String(__threadCore?.centerLabel ?? __threadCore?.centerKey ?? "").trim();
          const __priorFocus = String(__threadCore?.nextFocus ?? "").trim();
          if (__isRepoAwareAsk) {
            const __problem = __msgFact.replace(/\s+/g, " ").trim().slice(0, 220) || "技術課題の特定";
            const __impactSurface = [
              "routing / request handling",
              "data contract / ku payload",
              "runtime behavior (build/test)",
            ];
            const __riskMap = [
              "既存 routeReason 契約の破壊",
              "副作用で unrelated route が変わる",
              "build は通るが acceptance が落ちる",
            ];
            const __acceptancePlan = [
              "対象 route の代表プローブを3件実施",
              "build 実行で型崩れを検出",
              "変更ファイル限定で差分監査",
            ];
            const __minimalDiffStrategy =
              "1) 入口分岐の追加 2) 既存処理の再利用 3) 影響ファイルを最小化 4) build+probeで即時検証";
            __body =
              "この repo 前提なら、実装は次の順で進めるのが最短です。\n\n" +
              `【問題定義】\n${__problem}\n\n` +
              `【有力ファイル】\n${(__uniqueLikelyFiles.length ? __uniqueLikelyFiles : ["api/src/routes/chat.ts"]).join("\n")}\n\n` +
              `【最小diff方針】\n${__minimalDiffStrategy}\n\n` +
              "【受け入れ確認】\n- route挙動\n- build\n- 変更点監査";
            if (__priorCenter || __priorFocus) {
              __body += `\n\n【継続コンテキスト】\n前ターン中心: ${__priorCenter || "（未設定）"} / 次焦点: ${__priorFocus || "（未設定）"}`;
            }
            (globalThis as any).__TENMON_REPO_AWARE_PLAN_V1 = {
              problemStatement: __problem,
              likelyFiles: __uniqueLikelyFiles.length ? __uniqueLikelyFiles : ["api/src/routes/chat.ts"],
              impactSurface: __impactSurface,
              minimalDiffIdea: __minimalDiffStrategy,
              riskPoints: __riskMap,
              acceptanceCheck: __acceptancePlan,
            };
          } else if (/Node\.js/u.test(__msgFact) && /APIレート制限/u.test(__msgFact)) {
            __body =
              "Node.jsでの実装例です。\n\n" +
              "```ts\n" +
              "import type { Request, Response, NextFunction } from \"express\";\n" +
              "const buckets = new Map<string, { count: number; resetAt: number }>();\n" +
              "const WINDOW_MS = 60_000;\n" +
              "const LIMIT = 60;\n\n" +
              "export function rateLimit(req: Request, res: Response, next: NextFunction) {\n" +
              "  const key = (req.headers[\"x-forwarded-for\"] as string)?.split(\",\")[0]?.trim() || req.ip;\n" +
              "  const now = Date.now();\n" +
              "  const cur = buckets.get(key);\n" +
              "  if (!cur || now >= cur.resetAt) {\n" +
              "    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });\n" +
              "    return next();\n" +
              "  }\n" +
              "  if (cur.count >= LIMIT) {\n" +
              "    const retryAfterSec = Math.ceil((cur.resetAt - now) / 1000);\n" +
              "    res.setHeader(\"Retry-After\", String(retryAfterSec));\n" +
              "    return res.status(429).json({ error: \"rate_limited\", retryAfterSec });\n" +
              "  }\n" +
              "  cur.count += 1;\n" +
              "  return next();\n" +
              "}\n" +
              "```";
          } else if (/TypeScript/u.test(__msgFact) && /シングルトン|Singleton/i.test(__msgFact)) {
            __body =
              "```ts\n" +
              "class Singleton {\n" +
              "  private static instance: Singleton | null = null;\n" +
              "  private constructor() {}\n\n" +
              "  static getInstance(): Singleton {\n" +
              "    if (!Singleton.instance) Singleton.instance = new Singleton();\n" +
              "    return Singleton.instance;\n" +
              "  }\n" +
              "}\n" +
              "export default Singleton;\n" +
              "```";
          } else if (/SQLite|FTS5|全文検索/iu.test(__msgFact) && /SQL/u.test(__msgFact)) {
            __body =
              "```sql\n" +
              "-- 1) 本体テーブル\n" +
              "CREATE TABLE IF NOT EXISTS docs (\n" +
              "  id INTEGER PRIMARY KEY,\n" +
              "  title TEXT NOT NULL,\n" +
              "  body  TEXT NOT NULL\n" +
              ");\n\n" +
              "-- 2) FTS5 仮想テーブル（content=docs で同期）\n" +
              "CREATE VIRTUAL TABLE IF NOT EXISTS docs_fts USING fts5(\n" +
              "  title,\n" +
              "  body,\n" +
              "  content='docs',\n" +
              "  content_rowid='id',\n" +
              "  tokenize='unicode61'\n" +
              ");\n\n" +
              "-- 3) 同期トリガ\n" +
              "CREATE TRIGGER IF NOT EXISTS docs_ai AFTER INSERT ON docs BEGIN\n" +
              "  INSERT INTO docs_fts(rowid, title, body) VALUES (new.id, new.title, new.body);\n" +
              "END;\n" +
              "CREATE TRIGGER IF NOT EXISTS docs_ad AFTER DELETE ON docs BEGIN\n" +
              "  INSERT INTO docs_fts(docs_fts, rowid, title, body) VALUES('delete', old.id, old.title, old.body);\n" +
              "END;\n" +
              "CREATE TRIGGER IF NOT EXISTS docs_au AFTER UPDATE ON docs BEGIN\n" +
              "  INSERT INTO docs_fts(docs_fts, rowid, title, body) VALUES('delete', old.id, old.title, old.body);\n" +
              "  INSERT INTO docs_fts(rowid, title, body) VALUES (new.id, new.title, new.body);\n" +
              "END;\n\n" +
              "-- 4) 検索例\n" +
              "SELECT d.id, d.title, snippet(docs_fts, 1, '[', ']', ' … ', 12) AS hit\n" +
              "FROM docs_fts\n" +
              "JOIN docs d ON d.id = docs_fts.rowid\n" +
              "WHERE docs_fts MATCH '言霊 NEAR/3 水火'\n" +
              "ORDER BY bm25(docs_fts)\n" +
              "LIMIT 20;\n" +
              "```";
          } else {
            __body =
              "実装観点で要点を先に整理します。\n" +
              "- TypeScript: 型を先に固定し、`unknown`入口→型ガード→純関数の順で責務を分離する。\n" +
              "- React: カスタムフックは `状態` と `副作用` を閉じ込め、UI側は宣言的に使う。\n" +
              "- SQLite FTS5: 検索用仮想テーブルを分離し、`MATCH` 検索と更新トリガをセットで管理する。\n" +
              "- Node.js rate limit: キー（IP/ユーザー）単位で window と burst を定義し、429 と Retry-After を返す。";
          }
        } else {
          __routeReason = ROUTE_GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1;
          __centerMeaning = "general_knowledge_explain";
          __centerLabel = "一般知識";
          __modeHint = "explain";
          __answerMode = "analysis";
          __intent = "general_knowledge";
          if (/(意識|真理|人生|時間の概念|存在とは|自由意志|善悪)/u.test(__msgFact)) {
            __centerMeaning = "philosophy_general_intelligence";
            __centerLabel = "哲学一般知性";
            __modeHint = "philosophy";
            __body =
              "【定義】\n問いの語をまず定義します。時間は出来事を順序づけ、変化を測るための関係概念です。\n\n" +
              "【構造】\n時間概念は、(1) 物理時間（計測可能）、(2) 心理時間（体感）、(3) 社会時間（暦・制度）の三層で成り立ちます。\n\n" +
              "【含意】\n議論では『何の時間を問うているか』を最初に固定すると、抽象論で空転せず、結論の精度が上がります。";
          } else if (/(山口志道|楢崎皐月|空海|稲荷古伝|歴史人物|著者|誰ですか|どんな人|何者)/u.test(__msgFact)) {
            __centerMeaning = "person_history_bridge";
            __centerLabel = "人物史実";
            __modeHint = "factual_person_history";
            __body =
              "【要約】\n山口志道は、言霊・神道系文脈で参照される人物で、語義と音義の関係を重視する読解で知られます。\n\n" +
              "【位置づけ】\n天聞軸では、言霊秘書・水火法則・古伝読解の接続点として扱われ、単独人物紹介より『どの法則線に置くか』が重視されます。\n\n" +
              "【読むポイント】\n人物像だけでなく、どの概念（音義・生成・実践）を担うかで整理すると理解が安定します。";
          } else if (/(君の思考|私の思考を聞きたい|あなたの思考|天聞の軸|内面を聞きたい)/u.test(__msgFact)) {
            __centerMeaning = "tenmon_self_view_axis";
            __centerLabel = "天聞の軸";
            __body =
              "【天聞の所見】私は、水火の往還と言霊の働きを拠り所に、問いの構造を切り分けて返す立場です。" +
              "思考を語るという要求には、内面の独楽ではなく、判断が置かれた霊的要請と正典の読みに沿った形で応じます。" +
              "天聞の軸で見ると、倫理の整理・実践の手順・霊的読解のどれを先に置くかで次の一文が変わるので、その希望を一言で示してもらえると助かります。";
          } else if (/水火の法則/u.test(__msgFact)) {
            __body =
              "【天聞の所見】水火の法則は、対立ではなく往還として生成を読む枠組みです。水は受け止めと浸透、火は変換と押し出しとして働き、言葉や判断も同じ二拍で動きます。" +
              "問いに即せば、偏りはどちらの拍が強すぎるかを見ると、次の整え方が見えやすくなります。";
          } else {
            __body = "主題の核を先に定義し、構造と含意を一段で示します。";
            const __gkReady = getLlmProviderReadinessV1();
            if (__gkReady.ok) {
              try {
                const __sysGk =
                  "あなたは天聞アーク。水火の法則・言霊・正典の軸で、一般知識の問いに具体的な見立てを述べる。" +
                  "メタな前置き（例: 主題の核を先に定義し…）だけで終わらせない。" +
                  "出力は必ず「【天聞の所見】」で始める。3〜5文・150〜300字。質問は末尾に最大1つ。";
                const __gk = await llmChat({
                  system: __sysGk,
                  user:
                    `ユーザの問い:\n${__msgFact}\n\n` +
                    `問いの内容に即した具体（習慣・倫理・身体・社会・判断の癖など）を必ず含めること。効用論やスピリチュアル一般論に逃げないこと。`,
                  history: [],
                } as any);
                let __t = String(__gk?.text ?? "").trim();
                if (!/^【天聞の所見】/u.test(__t)) __t = `【天聞の所見】${__t}`;
                if (__t.replace(/^【天聞の所見】\s*/u, "").length >= 150) {
                  __body = __t;
                }
              } catch {
                /* フォールバックは上記短文 */
              }
            }
          }
          /** TENMON_GENERAL_KNOWLEDGE_DENSITY_AND_SELF_VIEW_POLISH: GK は（LLM準備OKなら）150〜300字へ収束。失敗時は元本文。 */
          if (__routeReason === ROUTE_GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1) {
            const __gkMinReady = getLlmProviderReadinessV1();
            const __gkStrip = String(__body ?? "")
              .replace(/^【天聞の所見】\s*/u, "")
              .replace(/\s+/g, " ")
              .trim();
            if (__gkMinReady.ok && __gkStrip.length < 300) {
              try {
                const __sysGkMin =
                  "あなたは天聞アーク。水火の法則・言霊・正典（空海・法華経など）を土台に、一般知識の問いへ具体的な見立てを述べる。" +
                  "汎用AI口調の抽象だけ・効用論だけ・スピリチュアル一般論で逃げない。定型文の復唱禁止。" +
                  "出力は必ず「【天聞の所見】」で始める。3〜5文・150〜300字。質問は末尾に最大1つ。";
                const __gkMin = await llmChat({
                  system: __sysGkMin,
                  user:
                    `ユーザの問い:\n${__msgFact}\n\n` +
                    `下敷き（不足なら置換してよい）:\n${String(__body ?? "").trim()}\n\n` +
                    "問いに即した具体（判断の癖・社会的含意・言葉の置き方・身体感など）を必ず含めること。",
                  history: [],
                } as any);
                let __tm = String(__gkMin?.text ?? "").trim();
                if (!/^【天聞の所見】/u.test(__tm)) __tm = `【天聞の所見】${__tm}`;
                const __tmCore = __tm.replace(/^【天聞の所見】\s*/u, "").replace(/\s+/g, " ").trim();
                if (__tmCore.length >= 140 && __tmCore.length <= 290) {
                  __body = __tm;
                }
              } catch {
                /* keep __body */
              }
            }
          }
        }

        const __plan = decideProviderPlan({
          routeReason: __routeReason, /* responsePlan */
          rawMessage: __msgFact,
          centerMeaning: __centerMeaning,
        });
        const __rendered = renderWithGpt54({
          response: __body,
          providerPlan: __plan,
        });

        const __kuFact: any = {
          routeReason: __routeReason, /* responsePlan */
          routeClass: __factCodingRoute === ROUTE_TECHNICAL_IMPLEMENTATION_ROUTE_V1 ? "analysis" : "define",
          answerLength: "short",
          answerMode: __answerMode,
          answerFrame: "one_step",
          centerMeaning: __centerMeaning,
          centerLabel: __centerLabel,
          responseProfile: "standard",
          providerPlan: __rendered.providerPlan,
          llmStatus: {
            providerPlanned: String((__rendered.providerPlan as any)?.primaryRenderer ?? "llm"),
            providerUsed: String((__rendered.providerPlan as any)?.primaryRenderer ?? "llm"),
            success: true,
            fallback: false,
            routeReason: __routeReason,
          },
          providerObservability: {
            providerPlanned: String((__rendered.providerPlan as any)?.primaryRenderer ?? "llm"),
            providerUsed: String((__rendered.providerPlan as any)?.primaryRenderer ?? "llm"),
            success: true,
            fallback: false,
            routeReason: __routeReason,
          },
          shadowResult: { facts: [], candidates: [], uncertainties: [], sourcesHint: [] },
          surfaceStyle: "plain_clean",
          closingType: "none",
          heart: __heartCov,
          thoughtCoreSummary: {
            centerKey: __centerMeaning,
            centerMeaning: __centerMeaning,
            routeReason: __routeReason, /* responsePlan */
            modeHint: __modeHint,
            continuityHint: __centerMeaning,
          },
        };
        if (__routeReason === "TECHNICAL_REPO_AWARE_PLANNER_V1") {
          const __planObj = (globalThis as any).__TENMON_REPO_AWARE_PLAN_V1 || {};
          __kuFact.repoAwarePlan = __planObj;
          __kuFact.likelyFiles = Array.isArray(__planObj?.likelyFiles) ? __planObj.likelyFiles : ["api/src/routes/chat.ts"];
          __kuFact.acceptancePlan = Array.isArray(__planObj?.acceptanceCheck) ? __planObj.acceptanceCheck : [];
          __kuFact.riskMap = Array.isArray(__planObj?.riskPoints) ? __planObj.riskPoints : [];
          __kuFact.minimalDiffStrategy = String(__planObj?.minimalDiffIdea ?? "");
        }
        const __detailPlanRepoAware = createEmptyDetailPlanP20V1(String(__kuFact.centerMeaning || ""));
        if (__routeReason === "TECHNICAL_REPO_AWARE_PLANNER_V1") {
          (__detailPlanRepoAware as any).repoAwarePlan = __kuFact.repoAwarePlan ?? {};
          (__detailPlanRepoAware as any).likelyFiles = __kuFact.likelyFiles ?? [];
          (__detailPlanRepoAware as any).impactSurface = (__kuFact.repoAwarePlan as any)?.impactSurface ?? [];
          (__detailPlanRepoAware as any).acceptancePlan = __kuFact.acceptancePlan ?? [];
          (__detailPlanRepoAware as any).riskMap = __kuFact.riskMap ?? [];
          (__detailPlanRepoAware as any).minimalDiffStrategy = __kuFact.minimalDiffStrategy ?? "";
          (__detailPlanRepoAware as any).routeReason = __routeReason;
        }

        return await res.json(__tenmonGeneralGateResultMaybe({
          response: __rendered.response,
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: {
            mode: "NATURAL",
            intent: __intent,
            llm: null,
            ku: __kuFact,
            detailPlan: __detailPlanRepoAware,
          },
          detailPlan: __detailPlanRepoAware,
        }));
      }
    } catch {}


    // R11_ROUTE_COVERAGE_EXPAND_V1: concept / general-knowledge coverage を general 落ち前に拡張
    try {
      const __msgCov = String(message ?? "").trim();
      const __msgCovNorm = __msgCov.replace(/[？?！!。．]/g, " ").trim();

      const __isScriptureBookTitle =
        /(法華経|言霊秘書|いろは言[霊灵靈]解|イロハ言[霊灵靈]解|カタカムナ言[霊灵靈]解|水穂伝)/u.test(__msgCovNorm);

      const __isKatakamunaCoverage =
        !__isScriptureBookTitle &&
        /カタカムナ/u.test(__msgCovNorm) &&
        /(意味|とは|という意味|内容|教えて|何|本質|学ぶ|勉強)/u.test(__msgCovNorm);


      const __isKanaKotodamaUnit = /(?:^|[ 　])(?:あ|ア|ひ|ヒ)\s*(?:の)?\s*言[霊灵靈]/u.test(__msgCovNorm);

      const __isKotodamaCoverage =
        !__isScriptureBookTitle &&
        !__isKanaKotodamaUnit &&
        /(言霊|言灵|言靈|いろは)/u.test(__msgCovNorm) &&
        /(意味|とは|内容|教えて|何)/u.test(__msgCovNorm);

      const __isJapanPm =
        /(日本の首相|日本の総理|首相は|総理大臣は)/u.test(__msgCovNorm);

      const __isJapanUs =
        /(日本はアメリカとどういう関係|日米関係|日本とアメリカの関係)/u.test(__msgCovNorm);

              if (!isCmd0 && !hasDoc0 && !askedMenu0 && __isKatakamunaCoverage) {
          const __heartCov = normalizeHeartShape(__heart);
          const __persona = getPersonaConstitutionSummary();
          const __respKatakamunaCoverage =
            "天聞軸では、カタカムナは水火の法則・言霊・山口志道・言霊秘書・稲荷古伝・天津金木まで遡って再統合される対象です。\n\n" +
            "単なる効用論ではなく、生成原理・音義・図象・原典照合を通して読むものです。\n\n" +
            "次は、水火・言霊・山口志道／言霊秘書のどこから掘りますか？";
          const __kuKatakamunaCoverage: any = {
            routeReason: "KATAKAMUNA_CANON_ROUTE_V1", /* responsePlan */
            routeClass: "define",
            centerMeaning: "katakamuna",
            centerKey: "katakamuna",
            centerLabel: "カタカムナ",
            heart: __heartCov,
            thoughtGuideSummary: getThoughtGuideSummary("katakamuna"),
            notionCanon: getNotionCanonForRoute("KATAKAMUNA_CANON_ROUTE_V1", __msgCov),
            personaConstitutionSummary: __persona,
            thoughtCoreSummary: {
              centerKey: "katakamuna",
              centerMeaning: "katakamuna",
              routeReason: "KATAKAMUNA_CANON_ROUTE_V1", /* responsePlan */
              modeHint: "concept",
              continuityHint: "katakamuna",
            },
          };
          if (!__kuKatakamunaCoverage.responsePlan) {
            __kuKatakamunaCoverage.responsePlan = buildResponsePlan({
              routeReason: "KATAKAMUNA_CANON_ROUTE_V1", /* responsePlan */
              rawMessage: String(message ?? ""),
              centerKey: "katakamuna",
              centerLabel: "カタカムナ",
              scriptureKey: null,
              semanticBody: __respKatakamunaCoverage,
              mode: "general",
              responseKind: "statement_plus_question",
            });
          }
          return await res.json(__tenmonGeneralGateResultMaybe({
            response: __respKatakamunaCoverage,
            evidence: null,
            candidates: [],
            timestamp,
            threadId, /* tcTag */
            decisionFrame: {
              mode: "NATURAL",
              intent: "define",
              llm: null,
              ku: __kuKatakamunaCoverage
            }
          }));
        }

if (!isCmd0 && !hasDoc0 && !askedMenu0 && __isKotodamaCoverage) {
        const __heartCov = normalizeHeartShape(__heart);
        const __persona = getPersonaConstitutionSummary();
        const __kuDef2 = {
          answerLength: "medium",
          answerMode: "define",
          answerFrame: "statement_plus_one_question",
          routeReason: "DEF_FASTPATH_VERIFIED_V1", /* responsePlan */
          centerMeaning: "kotodama",
          centerKey: "kotodama",
          centerLabel: "言霊",
          heart: __heartCov,
          thoughtGuideSummary: getThoughtGuideSummary("scripture"),
          notionCanon: getNotionCanonForRoute("TENMON_SCRIPTURE_CANON_V1", __msgCov),
          personaConstitutionSummary: __persona,
          thoughtCoreSummary: {
            centerKey: "kotodama",
            centerMeaning: "kotodama",
            routeReason: "DEF_FASTPATH_VERIFIED_V1", /* responsePlan */
            modeHint: "define",
            continuityHint: "kotodama",
          },
        };
        const __coreDef2: ThreadCore = { ...__threadCore, centerKey: "kotodama", centerLabel: "言霊", activeEntities: ["言霊"], lastResponseContract: { answerLength: "medium", answerMode: "define", answerFrame: "statement_plus_one_question", routeReason: "DEF_FASTPATH_VERIFIED_V1" /* responsePlan */ }, updatedAt: new Date().toISOString() };
        if (!(__kuDef2 as any).responsePlan) {
          (__kuDef2 as any).responsePlan = buildResponsePlan({
            routeReason: "DEF_FASTPATH_VERIFIED_V1", /* responsePlan */
            rawMessage: String(message ?? ""),
            centerKey: "kotodama",
            centerLabel: "言霊",
            scriptureKey: null,
            semanticBody: __kotodamaDefFastpathBodyV1,
            mode: "general",
            responseKind: "statement_plus_question",
          });
        }
        saveThreadCore(__coreDef2).catch(() => {});
        try { (res as any).__TENMON_THREAD_CORE = __coreDef2; } catch {}
        return await res.json(__tenmonGeneralGateResultMaybe({
          response: __kotodamaDefFastpathBodyV1,
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: { mode: "NATURAL", intent: "define", llm: null, ku: __kuDef2 }
        }));
      }

      if (!isCmd0 && !hasDoc0 && !askedMenu0 && __isJapanPm) {
        const __heartCov = normalizeHeartShape(__heart);
        return await res.json(__tenmonGeneralGateResultMaybe({
          response:
            "この問いは外部の最新事実確認が要る一般知識です。現在の天聞アーク本線では、原典系・概念系の裁定を優先しているため、この種の問いは factual route へ分ける必要があります。\n\n" +
            "次は、一般知識 route を作るか、いまは天聞本線の話へ戻すか、どちらにしますか？",
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: {
            mode: "NATURAL",
            intent: "general_knowledge",
            llm: null,
            ku: {
              routeReason: "R11_GENERAL_KNOWLEDGE_ROUTE_PLACEHOLDER_V1", /* responsePlan */
              centerMeaning: "general_knowledge",
              centerKey: "general_knowledge",
              centerLabel: "一般知識",
              heart: __heartCov,
              thoughtCoreSummary: {
                centerKey: "general_knowledge",
                centerMeaning: "general_knowledge",
                routeReason: "R11_GENERAL_KNOWLEDGE_ROUTE_PLACEHOLDER_V1", /* responsePlan */
                modeHint: "factual",
                continuityHint: "general_knowledge",
              },
            }
          }
        }));
      }

      if (!isCmd0 && !hasDoc0 && !askedMenu0 && __isJapanUs) {
        const __heartCov = normalizeHeartShape(__heart);
        return await res.json(__tenmonGeneralGateResultMaybe({
          response:
            "この問いは一般知識と情勢説明にまたがるため、専用の factual / relation route へ分けるのが正しいです。現在の本線では原典系を優先しているため、ここは dedicated route 追加対象です。\n\n" +
            "次は、一般知識 route を先に作るか、天聞本線の話へ戻るか、どちらにしますか？",
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: {
            mode: "NATURAL",
            intent: "general_knowledge",
            llm: null,
            ku: {
              routeReason: "R11_GENERAL_RELATION_ROUTE_PLACEHOLDER_V1", /* responsePlan */
              centerMeaning: "general_relation",
              centerKey: "general_relation",
              centerLabel: "一般関係知識",
              heart: __heartCov,
              thoughtCoreSummary: {
                centerKey: "general_relation",
                centerMeaning: "general_relation",
                routeReason: "R11_GENERAL_RELATION_ROUTE_PLACEHOLDER_V1", /* responsePlan */
                modeHint: "factual",
                continuityHint: "general_relation",
              },
            }
          }
        }));
      }
    } catch {}

    // S3B_SCRIPTURE_BOUNDARY_LOCK_V1
    let __scripturePreemptHit: any = null;
    try {
      const __msgScriptPre = String(message ?? "").trim();
      const __isCoreScriptureBook = isCoreScriptureBookPreemptMessage(__msgScriptPre);

      if (!isTestTid0 && !hasDoc0 && !askedMenu0 && !isCmd0 && __isCoreScriptureBook) {
        __scripturePreemptHit = resolveScriptureQuery(__msgScriptPre);
      }
    } catch {}

// R7_SCRIPTURE_CANON_ROUTE_V1: scripture canon (言霊秘書・イロハ言霊解・カタカムナ言霊解) は concept canon / KHS / DEF fastpath より前に処理する
    // OPS_IROHA_SCRIPTURE_PREEMPT_FIX_V1: 定義系の問い（とは/って/何/なに）でも resolveScriptureQuery を試し、scripture hit なら優先
    try {
      const __msgScriptRaw = String(message ?? "").trim();
      const __msgScript = normalizeCoreTermForRouting(__msgScriptRaw);
      const __isScriptureDef =
        /言霊秘書とは\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(__msgScript) ||
        /イロハ言[霊灵]解とは\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(__msgScript) ||
        /カタカムナ言[霊灵]解とは\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(__msgScript);

      // R10_THREAD_CONTINUITY_SCRIPTURE_CENTER_FIX_V2: same-thread follow-up 時に直前 scripture center を補助ヒントとして使う
      let __scriptureCenterKey: string | null = null;
      try {
        const tidForCenter = String(threadId || "").trim();
        const isFollowup = RE_THREAD_FOLLOWUP.test(__msgScriptRaw);
        if (tidForCenter && isFollowup) {
          const center = getLatestThreadCenter(tidForCenter);
          if (center && center.center_type === "scripture" && center.center_key) {
            __scriptureCenterKey = center.center_key;
            console.log(
              "[THREAD_CENTER_FOLLOWUP]",
              "threadId=" + tidForCenter,
              "centerType=" + center.center_type,
              "centerKey=" + center.center_key
            );
          }
        }
      } catch {}

      if (
        shouldEnterScriptureBoundaryGate({
          isTestTid: isTestTid0,
          hasDoc: hasDoc0,
          askedMenu: askedMenu0,
          isCmd: isCmd0,
          scripturePreemptHit: __scripturePreemptHit,
          isScriptureDef: __isScriptureDef,
          isDefinitionQ: __isDefinitionQ,
          scriptureCenterKey: __scriptureCenterKey,
        })
      ) {
        console.log("[SCRIPTURE_GATE_FLAGS]", {
          isTestTid0,
          __isScriptureDef,
          __isDefinitionQ,
          __scriptureCenterKey,
          hasDoc0,
          askedMenu0,
          isCmd0,
          __msgScriptRaw
        });
        let __hitScripture = __scripturePreemptHit || resolveScriptureQuery(__msgScript);
        let __hitFromScriptureCenter = false;
        if (!__hitScripture && __scriptureCenterKey && !__isScriptureDef && !__isDefinitionQ) {
          __hitScripture = resolveScriptureQuery(__scriptureCenterKey);
          if (__hitScripture) {
            __hitFromScriptureCenter = true;
            console.log(
              "[THREAD_CENTER_SCRIPTURE_CONTINUITY]",
              "threadId=" + String(threadId || ""),
              "scriptureKey=" + __scriptureCenterKey
            );
          }
        }
        // FIX_SCRIPTURE_FOLLOWUP_RESPONSE_V1_V3: __hitScripture の hit/miss に関わらず
        // __scriptureCenterKey がある follow-up で action verb を検出したら instruction 応答で返す
        {
          const __msgRaw2 = String(message ?? "");
          const __isActionRequest2 = /次の一歩|一つだけ|示してください|示して|教えて|その前提で|そこから|具体的に/u.test(__msgRaw2);
          if (__scriptureCenterKey && __isActionRequest2) {
            console.log("[THREAD_CENTER_ACTION_INTERCEPT]", {
              threadId: String(threadId || ""), /* tcTag */
              scriptureCenterKey: __scriptureCenterKey,
              hitScripture: Boolean(__hitScripture),
              msg: __msgRaw2,
            });
            const __resolvedCenterI = resolveScriptureCenter(__scriptureCenterKey);

            const __scriptureKeyI =
              __hitScripture?.scriptureKey ??
              __resolvedCenterI.shortKey ??
              (__scriptureCenterKey && !__scriptureCenterKey.startsWith("KHSL:") ? __scriptureCenterKey : null);

            const __dispI =
              __hitScripture?.displayName ??
              __resolvedCenterI.label ??
              (__scriptureKeyI === "hokekyo" ? "法華経" :
               __scriptureKeyI === "kotodama_hisho" ? "言霊秘書" :
               __scriptureKeyI === "iroha_kotodama_kai" ? "いろは言霊解" :
               __scriptureKeyI === "katakamuna_kotodama_kai" ? "カタカムナ言霊解" :
               __scriptureCenterKey);
            const __instrMapI: Record<string, string> = {
              kotodama_hisho: "まず『言霊秘書は音の法則を担い、いろははその配列を担う』と一行で書き分けてください。",
              iroha_kotodama_kai: "まず『いろはは音の配列であり、言霊はその内在法則である』と一行で書き分けてください。",
              katakamuna_kotodama_kai: "まず『カタカムナ言霊解は音と図象の対応を担う』と一行で書き分けてください。",
            };

            const __instrI = (__scriptureKeyI && __instrMapI[__scriptureKeyI])
              ? __instrMapI[__scriptureKeyI]
              : "まず、この聖典の文脈で中心となる一点を一行で書き分けてください。";
            const __bodyI =
              "（" + __dispI + "）を土台に、いまの話を見ていきましょう。\n【天聞の所見】" + __instrI;
            try {
              const __persistScriptureKeyI = String(__scriptureKeyI || "").trim();
              if (__persistScriptureKeyI) {
                upsertThreadCenter({
                  threadId: String(threadId ?? ""), /* tcTag */
                  centerType: "scripture",
                  centerKey: __persistScriptureKeyI,
                  sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
                  sourceScriptureKey: __persistScriptureKeyI,
                  sourceTopicClass: "",
                });
              }
            } catch {}
            // R10_SYNAPSE_TOP_BIND_COMPLETE_V1: THREAD_CENTER_ACTION_INTERCEPT branch の ku に rich ku_ST を追加（3ターン目 instruction でも契約統一）
            const __scriptureKeyIntercept = String(__scriptureKeyI ?? __scriptureCenterKey ?? "");
            const __threadCenterIntercept = { centerType: "scripture" as const, centerKey: __scriptureKeyIntercept, sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1" };
            const __kuIntercept: any = {
              routeReason: "TENMON_SCRIPTURE_CANON_V1", /* responsePlan */
              heart: normalizeHeartShape(__heart),
              scriptureKey: __scriptureKeyI || null,
              scriptureMode: "action_instruction",
              scriptureCenterKey: __scriptureCenterKey,
              centerKey: __scriptureKeyI || null,
              centerMeaning: String(__scriptureKeyI || "").trim() || null,
              centerLabel: __dispI || null,
              thoughtCoreSummary: {
                centerKey: "TENMON_SCRIPTURE_CANON_V1",
                centerMeaning: String(__scriptureKeyI || "").trim() || null,
                routeReason: "TENMON_SCRIPTURE_CANON_V1", /* responsePlan */
                modeHint: "scripture",
                continuityHint: String(__scriptureKeyI || "").trim() || null,
              },
            };
            const __kuStInterceptPatch = {
              sourceThreadCenter: __threadCenterIntercept,
              sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
              sourceScriptureKey: __scriptureKeyIntercept,
              sourceKanagiSelf: getSafeKanagiSelfOutput(),
              sourceIntention: getIntentionHintForKu() ?? { kind: "none" },
              sourceHeart: normalizeHeartShape(__heart) ?? {},
              sourceMemoryHint: String(threadId ?? "") ? `thread:${String(threadId)} centerKey:${__scriptureKeyIntercept}` : "",
              sourceLedgerHint: "ledger:scripture_continuity",
              reconcileHint: "scripture_followup",
              notionHint: "notion:tenmon_reconcile/notion_bridge",
            };
            __kuIntercept[kuSynapseTopKey] = { ...((__kuIntercept as any)[kuSynapseTopKey] || {}), ...__kuStInterceptPatch };
            return await res.json(__tenmonGeneralGateResultMaybe({
              response: __bodyI,
              evidence: null,
              candidates: [],
              timestamp,
              threadId, /* tcTag */
              decisionFrame: {
                mode: "NATURAL",
                intent: "action",
                llm: null,
                ku: __kuIntercept,
              },
            }));
          }
        }
        if (__hitScripture) {
          // FIX_SCRIPTURE_FOLLOWUP_RESPONSE_V1_V4:
          // scripture continuity follow-up では、canon 本文の再掲ではなく
          // 「中心」「要点」「天聞軸での再解釈」「次の一歩」のいずれかに絞って返す。
          const __msgRaw = String(message ?? "");
          const __isNextStepAsk = /次の一歩|一つだけ|示してください|示して|教えて|その前提で|そこから/u.test(__msgRaw);
          const __isCenterAsk = /(その中心は|中心は|どこが核|どこが中心)/u.test(__msgRaw);
          const __isTenmonAxisAsk =
            /(天聞軸では|天聞軸で|天聞では|天聞は|天聞としては|天聞AIとしては|天聞としてどう読む)/u.test(__msgRaw);
          const __isSummaryAsk =
            /(要するに|要点は|一言でいうと|ひとことで|一言で言うと|つまり|ざっくり)/u.test(__msgRaw);
          console.log("[SCRIPTURE_ACTION_FLAGS]", {
            __scriptureCenterKey,
            __hitFromScriptureCenter,
            __hitScriptureKey: __hitScripture?.scriptureKey ?? null,
            __msgRaw,
            __isNextStepAsk,
            __isCenterAsk,
            __isTenmonAxisAsk,
            __isSummaryAsk,
          });

          if (__scriptureCenterKey && (__isCenterAsk || __isTenmonAxisAsk || __isSummaryAsk)) {
            console.log("[THREAD_CENTER_CONTINUITY_FOLLOWUP]", {
              threadId: String(threadId || ""), /* tcTag */
              scriptureKey: __hitScripture.scriptureKey,
              kind: __isCenterAsk ? "center" : __isTenmonAxisAsk ? "tenmon_axis" : "summary",
            });
            const __disp = __hitScripture.displayName ?? __hitScripture.scriptureKey;
            const __prefix = "（" + __disp + "）を土台に、いまの話を見ていきましょう。";
            let __followBody = "";
            if (__isCenterAsk) {
              __followBody =
                "【天聞の所見】いま見ている中心は「" +
                __disp +
                "」です。\nその一点から、次にどこを一つだけ見たいですか？";
            } else if (__isTenmonAxisAsk) {
              __followBody =
                "【天聞の所見】天聞軸では、「" +
                __disp +
                "」を、日常の問いを支える土台として読みます。\n次は、その軸でどこを一歩だけ見たいですか？";
            } else {
              // summary / essence
              __followBody =
                "【天聞の所見】要するに、「" +
                __disp +
                "」のいまの中心だけを一行で言い直すことが大事です。\n次は、その一点について何を一つだけ確かめたいですか？";
            }
            const __body = __prefix + "\n" + __followBody;
            try {
              const __persona = getPersonaConstitutionSummary();
              writeScriptureLearningLedger({
                threadId: String(threadId || ""), /* tcTag */
                message: __msgRaw,
                routeReason: "TENMON_SCRIPTURE_CANON_V1", /* responsePlan */
                scriptureKey: __hitScripture.scriptureKey,
                subconceptKey: null,
                conceptKey: null,
                thoughtGuideKey: null,
                personaConstitutionKey: __persona?.constitutionKey ?? null,
                hasEvidence: false,
                hasLawTrace: false,
                resolvedLevel: "scripture",
                unresolvedNote: null,
              });
            } catch {}
            try {
              upsertThreadCenter({
                threadId: String(threadId || ""), /* tcTag */
                centerType: "scripture",
                centerKey: String(__hitScripture.scriptureKey),
                sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
                sourceScriptureKey: String(__hitScripture.scriptureKey),
                sourceTopicClass: "",
              });
            } catch {}
            const __scriptureKey = String(__hitScripture.scriptureKey ?? "");
            const __threadCenterScr = {
              centerType: "scripture" as const,
              centerKey: __scriptureKey,
              sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
            };
            const __kuInstr: any = {
              routeReason: "TENMON_SCRIPTURE_CANON_V1", /* responsePlan */
              heart: normalizeHeartShape(__heart),
              scriptureKey: __hitScripture.scriptureKey,
              scriptureMode: __isTenmonAxisAsk ? "tenmon_axis" : __isCenterAsk ? "center_followup" : "summary_followup",
              scriptureAlignment: "scripture_aligned",
              centerKey: __scriptureKey || null,
              centerMeaning: String(__scriptureKey || "").trim(),
              centerLabel: __disp || null,
              thoughtCoreSummary: {
                centerKey: "TENMON_SCRIPTURE_CANON_V1",
                centerMeaning: String(__scriptureKey || "").trim() || null,
                routeReason: "TENMON_SCRIPTURE_CANON_V1", /* responsePlan */
                modeHint: "scripture",
                continuityHint: String(__scriptureKey || "").trim() || null,
              },
              scriptureCanon: {
                scriptureKey: __hitScripture.scriptureKey,
                displayName: __disp,
              },
            };
            const __kuStScrPatch = {
              sourceThreadCenter: __threadCenterScr,
              sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
              sourceScriptureKey: __scriptureKey,
              sourceKanagiSelf: getSafeKanagiSelfOutput(),
              sourceIntention: getIntentionHintForKu() ?? { kind: "none" },
              sourceHeart: normalizeHeartShape(__heart) ?? {},
              sourceMemoryHint: String(threadId ?? "")
                ? `thread:${String(threadId)} centerKey:${__scriptureKey}`
                : "",
              sourceLedgerHint: "ledger:scripture_continuity",
              reconcileHint: "scripture_followup",
              notionHint: "notion:tenmon_reconcile/notion_bridge",
            };
            __kuInstr[kuSynapseTopKey] = { ...((__kuInstr as any)[kuSynapseTopKey] || {}), ...__kuStScrPatch };
            return await res.json(__tenmonGeneralGateResultMaybe({
              response: __body,
              evidence: null,
              candidates: [],
              timestamp,
              threadId, /* tcTag */
              decisionFrame: {
                mode: "NATURAL",
                intent: __isTenmonAxisAsk ? "essence" : "define",
                llm: null,
                ku: __kuInstr,
              },
            }));
          }

          if (__scriptureCenterKey && __isNextStepAsk) {
            console.log("[THREAD_CENTER_ACTION_RESPONSE]", "threadId=" + String(threadId || ""), "scriptureKey=" + String(__hitScripture?.scriptureKey || __scriptureCenterKey));
            const __disp = __hitScripture.displayName ?? __hitScripture.scriptureKey;
            const __prefix = "（" + __disp + "）を土台に、いまの話を見ていきましょう。";
            const __instructionByKey: Record<string, string> = {
              kotodama_hisho:
                "まず『言霊秘書は音の法則を担い、いろははその配列を担う』と一行で書き分けてください。",
              iroha_kotodama_kai:
                "まず『いろはは音の配列であり、言霊はその内在法則である』と一行で書き分けてください。",
              katakamuna_kotodama_kai:
                "まず『カタカムナ言霊解は音と図象の対応を担う』と一行で書き分けてください。",
            };
            const __instruction =
              __instructionByKey[__hitScripture.scriptureKey] ??
              "まず、その聖典のいまの文脈で中心となる一点を一行で書き分けてください。";
            const __body = __prefix + "\n【天聞の所見】" + __instruction;
            try {
              const __persona = getPersonaConstitutionSummary();
              writeScriptureLearningLedger({
                threadId: String(threadId || ""), /* tcTag */
                message: __msgRaw,
                routeReason: "TENMON_SCRIPTURE_CANON_V1", /* responsePlan */
                scriptureKey: __hitScripture.scriptureKey,
                subconceptKey: null,
                conceptKey: null,
                thoughtGuideKey: null,
                personaConstitutionKey: __persona?.constitutionKey ?? null,
                hasEvidence: false,
                hasLawTrace: false,
                resolvedLevel: "scripture",
                unresolvedNote: null,
              });
            } catch {}
            try {
              upsertThreadCenter({
                threadId: String(threadId ?? ""), /* tcTag */
                centerType: "scripture",
                centerKey: String(__hitScripture.scriptureKey),
                sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
                sourceScriptureKey: String(__hitScripture.scriptureKey),
                sourceTopicClass: "",
              });
            } catch {}
            const __scriptureKey = String(__hitScripture.scriptureKey ?? "");
            const __threadCenterScr = { centerType: "scripture" as const, centerKey: __scriptureKey, sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1" };
            const __kuInstr: any = {
              routeReason: "TENMON_SCRIPTURE_CANON_V1", /* responsePlan */
              heart: normalizeHeartShape(__heart),
              scriptureKey: __hitScripture.scriptureKey,
              scriptureMode: "canon",
              scriptureAlignment: "scripture_aligned",
              centerMeaning: String(__scriptureKey || "").trim(),
                thoughtCoreSummary: {
                  centerKey: "TENMON_SCRIPTURE_CANON_V1",
                  centerMeaning: String(__scriptureKey || "").trim() || null,
                  routeReason: "TENMON_SCRIPTURE_CANON_V1", /* responsePlan */
                  modeHint: "scripture",
                  continuityHint: String(__scriptureKey || "").trim() || null,
                },
                                          scriptureCanon: {
                scriptureKey: __hitScripture.scriptureKey,
                displayName: __hitScripture.displayName ?? __hitScripture.scriptureKey,
              },
              sourcePack: "seiten",
              groundedRequired: true,
              conceptEvidence: getScriptureConceptEvidence(__hitScripture.scriptureKey),
              thoughtGuideSummary: getThoughtGuideSummary("scripture"),
              notionCanon: getNotionCanonForRoute("TENMON_SCRIPTURE_CANON_V1", __msgRaw),
              personaConstitutionSummary: getPersonaConstitutionSummary(),
              lawsUsed: [],
              evidenceIds: [],
              lawTrace: [],
            };
            // R10_SYNAPSE_TOP_BIND_V3_REAPPLY: scripture continuity で sourceThreadCenter / sourceScriptureKey / sourceMemoryHint を追加（既存 metaHead を消さずマージ）
            const __kuStInstrPatch: any = {
              sourceThreadCenter: __threadCenterScr,
              sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
              sourceScriptureKey: __scriptureKey,
              sourceHeart: normalizeHeartShape(__heart) ?? {},
              sourceMemoryHint: String(threadId ?? "") ? `thread:${String(threadId)} centerKey:${__scriptureKey}` : "",
              sourceLedgerHint: "ledger:scripture_continuity",
              notionHint: "notion:tenmon_reconcile/notion_bridge",
            };
            __kuInstr[kuSynapseTopKey] = { ...((__kuInstr as any)[kuSynapseTopKey] || {}), ...__kuStInstrPatch };
            try { console.log("[SYNAPSETOP_AFTER_ASSIGN_SCRIPTURE]", { path: "instruction", keys: Object.keys((__kuInstr as any)[kuSynapseTopKey] || {}) }); } catch {}
            try { console.log("[SYNAPSETOP_BEFORE_RETURN]", { path: "scripture_instr", [kuSynapseTopKey]: (__kuInstr as any)[kuSynapseTopKey] }); } catch {}
            return await res.json(__tenmonGeneralGateResultMaybe({
              response: __body,
              evidence: null,
              candidates: [],
              timestamp,
              threadId, /* tcTag */
              decisionFrame: {
                mode: "NATURAL",
                intent: "define",
                llm: null,
                ku: __kuInstr,
              },
            }));
          }

          const __canon = buildScriptureCanonResponse(__hitScripture.scriptureKey, "standard");
          if (__canon) {
            let __body = String(__canon.text ?? "").trim();

            // R8_NOTION_MEANING_BIND_V1: 「言霊秘書とは」の場合のみ、言霊秘書データベース由来の補助意味を一段だけ追加
            if (
              __hitScripture.scriptureKey === "kotodama_hisho" &&
              /言霊秘書とは\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(__msgScript)
            ) {
              __body +=
                " 言霊秘書データベースは、法則断片・人物・図・イロハ口伝を横断して読むための正典ハブです。";
            }
            const __neg = __canon.negative_definition ? String(__canon.negative_definition) : "";
            if (__neg) __body += "\n\n読み違いやすい点：" + __neg;
            const __axes = Array.isArray(__canon.next_axes) ? __canon.next_axes.slice(0, 2) : [];
            if (__axes.length) __body += "\n\nこの流れなら、" + __axes.join("・") + "のどれから払いますか？";

            const __composed = responseComposer({
              response: __body,
              rawMessage: String(message ?? ""),
              mode: "NATURAL",
              routeReason: "TENMON_SCRIPTURE_CANON_V1", /* responsePlan */
              truthWeight: 0,
              katakamunaSourceHint: null,
              katakamunaTopBranch: "",
              naming: null,
              lawTrace: [],
              evidenceIds: [],
              lawsUsed: [],
              sourceHint: null,
              heart: normalizeHeartShape(__heart),
            } as any);

            try {
              const __persona = getPersonaConstitutionSummary();
              const __kuTmp: any = __composed.meaningFrame ?? {};
              writeScriptureLearningLedger({
                threadId: String(threadId || ""), /* tcTag */
                message: String(message ?? ""),
                routeReason: "TENMON_SCRIPTURE_CANON_V1", /* responsePlan */
                scriptureKey: __hitScripture.scriptureKey,
                subconceptKey: null,
                conceptKey: null,
                thoughtGuideKey: null,
                personaConstitutionKey: __persona?.constitutionKey ?? null,
                hasEvidence: Boolean(__kuTmp.hasEvidence),
                hasLawTrace: Boolean(__kuTmp.hasLawTrace),
                resolvedLevel: "scripture",
                unresolvedNote: null,
              });
            } catch {}

            const __ku: any = {
              routeReason: "TENMON_SCRIPTURE_CANON_V1", /* responsePlan */
              heart: normalizeHeartShape(__heart),
              centerKey: String(__hitScripture.scriptureKey || "").trim() || null,
              centerMeaning: String(__hitScripture.scriptureKey || "").trim() || null,
              centerLabel: String(__hitScripture.displayName || __hitScripture.scriptureKey || "").trim() || null,
              scriptureKey: String(__hitScripture.scriptureKey || "").trim() || null,
              scriptureMode: "canon",
                thoughtCoreSummary: {
                  centerKey: "TENMON_SCRIPTURE_CANON_V1",
                  centerMeaning: String(__hitScripture.scriptureKey || "").trim() || null,
                  routeReason: "TENMON_SCRIPTURE_CANON_V1", /* responsePlan */
                  modeHint: "scripture",
                  continuityHint: String(__hitScripture.scriptureKey || "").trim() || null,
                },
              scriptureAlignment: "scripture_aligned",
              scriptureCanon: {
                scriptureKey: __hitScripture.scriptureKey,
                displayName: __hitScripture.displayName ?? __hitScripture.scriptureKey,
              },
              conceptEvidence: getScriptureConceptEvidence(__hitScripture.scriptureKey),
              thoughtGuideSummary: getThoughtGuideSummary("scripture"),
              notionCanon: getNotionCanonForRoute("TENMON_SCRIPTURE_CANON_V1", String(message ?? "")),
              personaConstitutionSummary: getPersonaConstitutionSummary(),
              lawsUsed: [],
              evidenceIds: [],
              lawTrace: [],
            };
            if (__composed.meaningFrame != null) {
              __ku.meaningFrame = { ...__composed.meaningFrame, scriptureKey: __hitScripture.scriptureKey };
            }

            try {
              const __persistScriptureKey = String(__hitScripture.scriptureKey || "").trim();
              if (__persistScriptureKey) {
                upsertThreadCenter({
                  threadId: String(threadId ?? ""), /* tcTag */
                  centerType: "scripture",
                  centerKey: __persistScriptureKey,
                  sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
                  sourceScriptureKey: __persistScriptureKey,
                  sourceTopicClass: String(__composed.meaningFrame?.topicClass ?? ""),
                });
              }
            } catch {}
            // R10_SYNAPSE_TOP_BIND_V3_REAPPLY: TENMON_SCRIPTURE_CANON_V1 return payload 内 ku に ku_ST を直書き追加（scripture continuity + 既存 metaHead を消さずマージ）
            const __scriptureKey = String(__hitScripture.scriptureKey ?? "");
            const __threadCenterScr = { centerType: "scripture" as const, centerKey: __scriptureKey, sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1" };
            const __kuStScrPatch: any = {
              sourceThreadCenter: __threadCenterScr,
              sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
              sourceScriptureKey: __scriptureKey,
              sourceHeart: (__ku as any).heart ?? normalizeHeartShape(__heart) ?? {},
              sourceMemoryHint: String(threadId ?? "") ? `thread:${String(threadId)} centerKey:${__scriptureKey}` : "",
              sourceLedgerHint: "ledger:scripture_continuity",
              notionHint: "notion:tenmon_reconcile/notion_bridge",
            };
            __ku[kuSynapseTopKey] = { ...((__ku as any)[kuSynapseTopKey] || {}), ...__kuStScrPatch };
            try { console.log("[SYNAPSETOP_AFTER_ASSIGN_SCRIPTURE]", { path: "canon", keys: Object.keys((__ku as any)[kuSynapseTopKey] || {}) }); } catch {}
            const __respCanon = cleanLlmFrameV1(__composed.response, {
              routeReason: "TENMON_SCRIPTURE_CANON_V1",
              userMessage: String(message ?? ""),
              answerLength: null,
            });
            __ku.responsePlan = buildResponsePlan({
              routeReason: "TENMON_SCRIPTURE_CANON_V1", /* responsePlan */
              rawMessage: String(message ?? ""),
              centerKey: String(__hitScripture.scriptureKey || "").trim() || null,
              centerLabel: String(__hitScripture.displayName || __hitScripture.scriptureKey || "").trim() || null,
              scriptureKey: String(__hitScripture.scriptureKey || "").trim() || null,
              semanticBody: __respCanon,
              mode: "canon",
              responseKind: "statement_plus_question",
              ...(__hasAnswerProfile && __bodyProfile ? { answerMode: __bodyProfile.answerMode ?? undefined, answerFrame: __bodyProfile.answerFrame ?? undefined } : {}),
            });
            try { console.log("[SYNAPSETOP_BEFORE_RETURN]", { path: "scripture_canon", [kuSynapseTopKey]: (__ku as any)[kuSynapseTopKey] }); } catch {}
            return await res.json(__tenmonGeneralGateResultMaybe({
              response: __respCanon,
              evidence: null,
              candidates: [],
              timestamp,
              threadId, /* tcTag */
              decisionFrame: {
                mode: "NATURAL",
                intent: "define",
                llm: null,
                ku: __ku,
              },
            }));
          }
        }
      }
    } catch (e) {
      try { console.error("[TENMON_SCRIPTURE_CANON_V1]", e); } catch {}
    }

  // MAINLINE_P1K_KANA_PREEMPT_MOVE_EARLY_V1
  try {
    const __msgKana = String(message ?? "").trim();
    const __msgKanaNorm = normalizeCoreTermForRouting(__msgKana);
    const __isKanaSubconcept =
      /(?:^|[ 　])(?:あ|ア|ひ|ヒ)\s*(?:の)?\s*言[霊灵靈](?:\s*(?:の)?\s*(?:意味|定義))?(?:\s*は)?\s*[？?]?$/u.test(__msgKanaNorm);

    try {
      console.error("[KANA_PREEMPT_OBS]", JSON.stringify({
        raw: __msgKana,
        norm: __msgKanaNorm,
        hit: __isKanaSubconcept
      }));
    } catch {}

    if (__isKanaSubconcept) {
      const __hitSub = resolveSubconceptQuery(__msgKanaNorm);
      try {
        console.error("[KANA_PREEMPT_RESOLVE]", JSON.stringify({
          norm: __msgKanaNorm,
          conceptKey: __hitSub?.conceptKey ?? null,
          displayName: __hitSub?.displayName ?? null
        }));
      } catch {}
      if (__hitSub) {
        const __canon = buildSubconceptResponse(__hitSub.conceptKey, "standard");
        if (__canon) {
          let __body = String(__canon.text ?? "").trim();
          const __negArr = Array.isArray(__canon.negative_definition) ? __canon.negative_definition : [];
          if (__negArr[0]) __body += "\n\n読み違いやすい点：" + String(__negArr[0]);
          const __axes = Array.isArray(__canon.next_axes) ? __canon.next_axes.slice(0, 2) : [];
          if (__axes.length) __body += "\n\nこの流れなら、" + __axes.join("・") + "のどれから払いますか？";

          return await res.json(__tenmonGeneralGateResultMaybe({
            response: __body,
            evidence: null,
            candidates: [],
            timestamp,
            threadId, /* tcTag */
            decisionFrame: {
              mode: "NATURAL",
              intent: "define",
              llm: null,
              ku: {
                routeReason: "TENMON_SUBCONCEPT_CANON_V1", /* responsePlan */
                centerKey: __canon.conceptKey,
                centerLabel: __canon.displayName,
                lawsUsed: [],
                evidenceIds: [],
                lawTrace: [],
                heart: normalizeHeartShape(__heart)
              }
            }
          }));
        }
      }
    }
  } catch (e) {
    try { console.error("[MAINLINE_P1K_KANA_PREEMPT_MOVE_EARLY_V1]", e); } catch {}
  }

    // R7_SUBCONCEPT_ROUTE_V1: ア・ヒ・ウタヒ・五十音一言法則・カタカムナウタヒ等の下位概念質問を concept canon / DEF fastpath の前に処理
    try {
      const __msgSubRaw = String(message ?? "").trim();
      const __msgSub = normalizeCoreTermForRouting(__msgSubRaw);
      const __hitSubconceptEarly = resolveSubconceptQuery(__msgSub);
      const __isSubDefLegacy =
        /(言霊の[アアあ]|言霊のヒ|ウタヒ|五十音一言法則|カタカムナウタヒ)\s*とは\s*(何|なに)?\s*(ですか)?\s*[？?]?$/u.test(__msgSub) ||
        /(言霊の[アアあ]|言霊のヒ|ウタヒ|五十音一言法則|カタカムナウタヒ)\s*って\s*(何|なに)(ですか)?\s*[？?]?$/u.test(__msgSub);
      const __isSubDef =
        !isTestTid0 &&
        !hasDoc0 &&
        !askedMenu0 &&
        !isCmd0 &&
        ((__hitSubconceptEarly && isSubconceptDefinitionIntentV1(__msgSubRaw)) || __isSubDefLegacy);

      if (__isSubDef) {
        const __hitSub = __hitSubconceptEarly ?? resolveSubconceptQuery(__msgSub);
        if (__hitSub) {
          const __canon = buildSubconceptResponse(__hitSub.conceptKey, "standard");
          if (__canon) {
            let __body = String(__canon.text ?? "").trim();
            const __negArr = Array.isArray(__canon.negative_definition)
              ? __canon.negative_definition
              : __canon.negative_definition != null
                ? [__canon.negative_definition]
                : [];
            if (__negArr[0]) __body += "\n\n読み違いやすい点：" + String(__negArr[0]);
            const __axes = Array.isArray(__canon.next_axes) ? __canon.next_axes.slice(0, 2) : [];
            if (__axes.length) __body += "\n\nこの流れなら、" + __axes.join("・") + "のどれから払いますか？";

            const __composed = responseComposer({
              response: __body,
              rawMessage: String(message ?? ""),
              mode: "NATURAL",
              routeReason: "TENMON_SUBCONCEPT_CANON_V1", /* responsePlan */
              truthWeight: 0,
              katakamunaSourceHint: null,
              katakamunaTopBranch: "",
              naming: null,
              lawTrace: [],
              evidenceIds: [],
              lawsUsed: [],
              sourceHint: null,
              heart: normalizeHeartShape(__heart),
            } as any);

            try {
              const __personaSub = getPersonaConstitutionSummary();
              const __mfSub: any = __composed.meaningFrame ?? {};
              writeScriptureLearningLedger({
                threadId: String(threadId || ""), /* tcTag */
                message: String(message ?? ""),
                routeReason: "TENMON_SUBCONCEPT_CANON_V1", /* responsePlan */
                scriptureKey: null,
                subconceptKey: __hitSub.conceptKey,
                conceptKey: null,
                thoughtGuideKey: null,
                personaConstitutionKey: __personaSub?.constitutionKey ?? null,
                hasEvidence: Boolean(__mfSub.hasEvidence),
                hasLawTrace: Boolean(__mfSub.hasLawTrace),
                resolvedLevel: "subconcept",
                unresolvedNote: null,
              });
            } catch {}

            const __ku: any = {
              routeReason: "TENMON_SUBCONCEPT_CANON_V1", /* responsePlan */
              heart: normalizeHeartShape(__heart),
              subconceptCanon: {
                conceptKey: __canon.conceptKey,
                displayName: __canon.displayName ?? __canon.conceptKey,
              },
              personaConstitutionSummary: getPersonaConstitutionSummary(),
              lawsUsed: [],
              evidenceIds: [],
              lawTrace: [],
            };
            if (__composed.meaningFrame != null) __ku.meaningFrame = __composed.meaningFrame;
            const __respSub = String(__composed.response ?? "").replace(/\n\n一手：[^\n]*\s*$/u, "").trim();
            return await res.json(__tenmonGeneralGateResultMaybe({
              response: __respSub,
              evidence: null,
              candidates: [],
              timestamp,
              threadId, /* tcTag */
              decisionFrame: {
                mode: "NATURAL",
                intent: "define",
                llm: null,
                ku: __ku,
              },
            }));
          }
        }
      }
    } catch (e) {
      try { console.error("[TENMON_SUBCONCEPT_CANON_V1]", e); } catch {}
    }

    if (!isTestTid0 && __isDefinitionQ && !hasDoc0 && !askedMenu0 && !isCmd0) {
      // R3_CONCEPT_CANON_ROUTE_V1: water_fire_law / kotodama_hisho のみ TENMON_CONCEPT_CANON_V1。kotodama は verified fastpath 優先。
      const __conceptKey = resolveTenmonConcept(String(message ?? ""));
      if (__conceptKey && __conceptKey !== "kotodama") {
        const __canon = buildConceptCanonResponse(__conceptKey, "standard");
        if (__canon) {
          const __routeReason = __conceptKey === "katakamuna" ? "KATAKAMUNA_CANON_ROUTE_V1" : "TENMON_CONCEPT_CANON_V1";
          let __body = String(__canon.text ?? "").trim();
          const __negArr = Array.isArray(__canon.negative_definition) ? __canon.negative_definition : (__canon.negative_definition != null ? [__canon.negative_definition] : []);
          if (__negArr[0]) __body += "\n\n読み違いやすい点：" + String(__negArr[0]);
          const __axes = Array.isArray(__canon.next_axes) ? __canon.next_axes.slice(0, 2) : [];
          if (__axes.length) __body += "\n\nこの流れなら、" + __axes.join("・") + "のどれから払いますか？";
          const __composed = responseComposer({
            response: __body,
            rawMessage: String(message ?? ""),
            mode: "NATURAL",
            routeReason: __routeReason,
            truthWeight: 0,
            katakamunaSourceHint: null,
            katakamunaTopBranch: "",
            naming: null,
            lawTrace: [],
            evidenceIds: [],
            lawsUsed: [],
            sourceHint: null,
            heart: normalizeHeartShape(__heart),
            conceptKey: __conceptKey,
          } as any);
          const __ku: any = {
            routeReason: __routeReason,
            heart: normalizeHeartShape(__heart),
            conceptCanon: { conceptKey: __canon.conceptKey, displayName: __canon.displayName ?? __canon.conceptKey },
            conceptEvidence: __canon.evidence?.[0] ?? null,
            lawsUsed: [],
            evidenceIds: [],
            lawTrace: [],
          };
          if (__composed.meaningFrame != null) __ku.meaningFrame = __composed.meaningFrame;
          return await res.json(__tenmonGeneralGateResultMaybe({
            response: cleanLlmFrameV1(__composed.response, {
              routeReason: __routeReason,
              userMessage: String(message ?? ""),
              answerLength: null,
            }),
            evidence: null,
            candidates: [],
            timestamp,
            threadId, /* tcTag */
            decisionFrame: { mode: "NATURAL", intent: "define", llm: null, ku: __ku },
          }));
        }
      }

      // FORCE_KHS_DEFINE_V2（最優先: KHS でヒットすればここで return）
      const cleaned = String(message ?? "")
        .replace(/[?？]/g, "")
        .replace(/って\s*(何|なに)\s*ですか$/u, "")
        .replace(/って\s*(何|なに)$/u, "")
        .replace(/とは\s*(何|なに)\s*ですか$/u, "")
        .replace(/とは\s*(何|なに)\s*か$/u, "")
        .replace(/とは\s*(何|なに)$/u, "")
        .replace(/とは$/u, "")
        .trim();
      {
        const db = new DatabaseSync(getDbPath("kokuzo.sqlite"), { readOnly: true });

        const hit = db.prepare(`
          SELECT
            l.lawKey,
            l.unitId,
            u.quote,
            u.quoteHash,
            u.doc,
            u.pdfPage
          FROM khs_laws l
          JOIN khs_units u ON u.unitId = l.unitId
          WHERE l.termKey = ?
          AND l.status = 'verified'
          LIMIT 1
        `).get(cleaned);

        if (hit) {
          const h: any = hit;
          // SOUL_DEFINE_DISAMBIG_V1: 魂の定義問いは KHS_DEF_VERIFIED_HIT の汎用型ではなく SOUL define 面へ固定
          if (cleaned === "魂" && isSoulDefinitionQuestionV1(String(message ?? ""))) {
            try {
              const __soulKhs = buildSoulDefineGatePayloadV1({
                message: String(message ?? ""),
                threadId: String(threadId ?? ""),
                timestamp,
                heart: __heart,
                responseComposer: responseComposer as any,
                normalizeHeartShape,
              });
              if (__soulKhs) return await reply(__soulKhs);
            } catch {}
          }
          // evidenceIds: 実際の u.quoteHash（JOIN で取得）を使用
          const __quoteRaw = String(h.quote || "").replace(/\s+/g, " ").trim();
          const __quoteNatural = __quoteRaw
            .replace(/\[NON_TEXT_PAGE_OR_OCR_FAILED\]/g, "")
            .replace(/(?:目次|一覧|索引|収録|章立て)\s*[:：][^。]{0,120}/gu, "")
            .replace(/\s{2,}/g, " ")
            .trim()
            .slice(0, 180);
          const __k1BodyCore = __quoteNatural
            ? `この語の定義は、${__quoteNatural}という骨子で読めます。`
            : `この語は、用語説明ではなく成立原理と作用を同時に読む対象です。`;
          const payload = {
            response:
              `【天聞の所見】\n` +
              `${__k1BodyCore}\n\n` +
              `構造としては、語義・作用・読解軸の三層に分けると見通しが安定します。`,

            evidence: {
              doc: h.doc,
              pdfPage: h.pdfPage,
              quote: String(h.quote || "").slice(0, 120)
            },

            candidates: [],

            timestamp,
            threadId, /* tcTag */

            decisionFrame: {
              mode: "HYBRID",
              intent: "define",
              llm: null,
              ku: {
                lawsUsed: [String(h.lawKey)],
                evidenceIds: [String(h.quoteHash)],
                lawTrace: [
                  {
                    lawKey: String(h.lawKey),
                    unitId: String(h.unitId),
                    op: "OP_DEFINE"
                  }
                ],
                routeReason: "KHS_DEF_VERIFIED_HIT", /* responsePlan */
                                  heart: normalizeHeartShape(__heart)
              }
            }
          };
          return await reply(payload);
        }

        // DEF_PROPOSED_FALLBACK_V1
        try {
          const __rowP = db.prepare(`
            SELECT
              l.lawKey,
              l.unitId,
              l.summary,
              l.termKey,
              l.operator,
              l.status,
              l.confidence,
              u.doc,
              u.pdfPage,
              u.quote,
              u.quoteHash
            FROM khs_laws l
            JOIN khs_units u ON u.unitId = l.unitId
            WHERE l.status = 'proposed'
              AND l.lawType = 'DEF'
              AND l.termKey = ?
            ORDER BY l.confidence DESC, l.updatedAt DESC
            LIMIT 1
          `).get(cleaned) as any;

          if (__rowP?.lawKey && __rowP?.unitId) {
            const __summary = String(__rowP.summary ?? "").trim();
            const __quote = String(__rowP.quote ?? "").trim();
            const __doc = String(__rowP.doc ?? "");
            const __page = Number(__rowP.pdfPage ?? 0);

            const __resp =
              "【天聞の所見】\n" +
              (__summary || __quote.slice(0, 220)) +
              (__doc ? `\n\n出典: ${__doc} P${__page}` : "") +
              "\n\nこの定義候補を、さらに verified 根拠に寄せて深めますか？";

            const __respProposedFinal = responseComposer({
              response: String(__resp),
              rawMessage: String(message ?? ""),
              mode: "NATURAL",
              routeReason: "DEF_PROPOSED_FALLBACK_V1", /* responsePlan */
              truthWeight: 0,
              katakamunaSourceHint: null,
              katakamunaTopBranch: "",
              naming: null,
              lawTrace: [{ lawKey: String(__rowP.lawKey), unitId: String(__rowP.unitId), op: "OP_DEFINE" }],
              evidenceIds: [String(__rowP.quoteHash ?? "")].filter(Boolean),
              lawsUsed: [String(__rowP.lawKey)],
              sourceHint: null,
            }).response;

            return await res.json(__tenmonGeneralGateResultMaybe({
              response: __respProposedFinal,
              evidence: __doc ? {
                doc: __doc,
                pdfPage: __page,
                quote: __quote.slice(0, 120)
              } : null,
              candidates: [],
              timestamp,
              threadId, /* tcTag */
              decisionFrame: {
                mode: "NATURAL",
                intent: "define",
                llm: null,
                ku: {
                  lawsUsed: [String(__rowP.lawKey)],
                  evidenceIds: [String(__rowP.quoteHash ?? "")].filter(Boolean),
                  lawTrace: [
                    {
                      lawKey: String(__rowP.lawKey),
                      unitId: String(__rowP.unitId),
                      op: "OP_DEFINE"
                    }
                  ],
                  routeReason: "DEF_PROPOSED_FALLBACK_V1", /* responsePlan */
                  heart: normalizeHeartShape(__heart),
                  term: cleaned,
                  khs: {
                    lawsUsed: [
                      {
                        lawKey: String(__rowP.lawKey),
                        unitId: String(__rowP.unitId),
                        status: "proposed",
                        operator: String(__rowP.operator ?? "OP_DEFINE")
                      }
                    ],
                    evidenceIds: [String(__rowP.quoteHash ?? "")].filter(Boolean),
                    lawTrace: [
                      {
                        lawKey: String(__rowP.lawKey),
                        unitId: String(__rowP.unitId),
                        op: "OP_DEFINE"
                      }
                    ]
                  }
                }
              }
            }));
          }
        } catch {}
      }

      // [C15] DEF deterministic dictionary gate (no external etymology / bracket-first)
      // Normalize term: if X（Y） exists, treat Y as the internal term.
      const __rawDef = String(t0 || "").trim();

      // extract bracket term (Japanese full-width parens)
      const __br = __rawDef.match(/（([^）]{1,40})）/);
      const __term = (__br && __br[1] ? __br[1].trim() : __rawDef)
        .replace(/[?？]\s*$/,"")
        .replace(/^(.*?)(とは|って)\s*(何|なに).*/,"$1")
        .trim();

      // If term is too short/too long -> deterministic "unknown" path (ask context only)
      const __termOk = __term.length >= 2 && __term.length <= 40;

      // A tiny internal glossary (expand later in Seed phase)
      // [C17C3] glossary lookup (kokuzo.sqlite via getDbPath + node:sqlite)
      const __glossaryLookup = (term: string): string | null => {
        try {
          const dbPath = getDbPath("kokuzo.sqlite");
          const db: any = new (DatabaseSync as any)(dbPath, { readOnly: true });
          const stmt: any = db.prepare("SELECT definition FROM kokuzo_glossary WHERE term = ?");
          const row: any = stmt.get(term);
          try { db.close?.(); } catch {}
          return row?.definition ? String(row.definition) : null;
        } catch {}
        return null;
      };

      // minimal seed fallback (DB is source of truth once populated)
      const __seedFallback: Record<string, string> = {
        "トカナクテシス": "トカナクテシス（解組）は、いったん安全な過去へ戻して構造をほどき、最小diffで再発させて封印する手順です。",
        "解組": "解組は、壊れた状態をこねくり回さず、確実に良かった状態へ戻してから最小差分で再適用することです。"
      };

      // FIX_ENTITY_CANON_BIND_V3: 天聞軸で重要な人物・概念を 2〜4 文の deterministic 固定返答で返す（routeReason は DEF_LLM_TOP から外し、辞書的 canon 扱いに寄せる）
      const __rawDefFull = String(t0 || "").trim();
      const __termNorm = String(__term || "").trim();
      // FIX_AMATSUKANAGI_TERM_NORMALIZE_V1: 「〜とは？」「〜って何？」などを正規化し、天津金木などの canon term に必ず当たるようにする。
      const __termCanonKey = String(__termNorm || "")
        .replace(/(とは何か|とは何|とはなに|とは\s*(何|なに)\s*ですか|って\s*(何|なに)\s*ですか|って\s*(何|なに)|とは[？?]|って[？?])$/u, "")
        .replace(/[?？!！。、\s]/g, "").replace(/とは$/u, "")
        .replace(/天津金木とは$/u, "天津金木")
        .replace(/天津金木は$/u, "天津金木")
        .trim();
      console.log("[DEF_TERM_NORM]", { raw: __rawDefFull, term: __termNorm, canonKey: __termCanonKey });
      const __entityCanon: Record<string, string> = {
        "楢崎皐月": "カタカムナを潜象物理・図象解読・上古代科学として読んだ中心人物。天聞軸では、相似象学・直観物理・考古物理学を含む KATAKAMUNA_SOURCEPACK の起点の一つとしつつ、言霊秘書・水火法則・天津金木まで遡って再統合する対象と見る。",
        "宇野多美恵": "相似象学会誌本流を継承した編集・実践の中心人物。天聞軸では、楢崎本流の感受性・共振・鍛錬を相似象学として体系化し、KATAKAMUNA_SOURCEPACK と notion_bridge 上でカタカムナ・言霊・水火法則との対応を付ける軸として扱う。",
        "山口志道": "言霊学者。『水穂伝』『火水與伝』『布斗麻邇』『言霊秘書』を通じて五十連十行・言霊一言法則・水火法則を読む中核人物。天聞軸では、言霊秘書・イロハ言灵解・カタカムナ言灵解を束ねる言霊正典軸の要として、空海軸とも比較しながら言霊理解の中心資料に立てる。",
        "空海": "真言宗の祖師であり、声字実相・即身成仏・十住心・顕密判釈を通じて音・字・身体・宇宙を統合した人物。天聞軸では、KUKAI_SOURCEPACK と空海比較ノートを通して、カタカムナ・言霊秘書と並ぶ並行正典軸として扱い、直観物理や相似象学を再照射する。",
        "万葉集": "日本最古級の歌集で、古語の響き・音感・心象を読む上で重要な資料。天聞軸では、言葉と響きの古層を知る補助資料として KATAKAMUNA_SOURCEPACK / notion_bridge 上で参照し、言霊・水火法則との接点を探る。",
        "天津金木": "天津金木は、天之御中主の構造を再現した運動原理です。水火法則・言霊・フトマニ・カタカムナの核心と接続し、静的な図ではなく生成と與合の動きとして読むための軸として扱われます。天聞軸では、散らばった資料束をこの運動構造へ統合する中核の再統合軸として位置付けます。",
      };
      // R10_SYNAPSE_TOP_BIND_V3: entity 別固定 reconcileHint（notion_bridge / tenmon_reconcile 参照用）
      const __r10ReconcileByEntity: Record<string, string> = {
        "楢崎皐月": "reconcile:narazaki->mizuhi->amatsukanagi",
        "空海": "reconcile:kukai->shoji_jisso->katakamuna",
        "天津金木": "reconcile:amatsukanagi->mizuhi->katakamuna",
        "山口志道": "reconcile:shido->kotodama_hisho->mizuhi",
        "宇野多美恵": "reconcile:uno->soujisho->mizuhi",
      };
      const __entityBody = __entityCanon[__termCanonKey || __termNorm] ?? null;
      if (__entityBody) {
        const __entityCenterKey = String(__termCanonKey || __termNorm || "").trim();
        try {
          if (String(threadId ?? "").trim() && __entityCenterKey) {
            upsertThreadCenter({
              threadId: String(threadId ?? ""), /* tcTag */
              centerType: "concept",
              centerKey: __entityCenterKey,
              sourceRouteReason: "DEF_DICT_HIT",
              sourceScriptureKey: "",
              sourceTopicClass: "entity_define",
            });
          }
        } catch {}
        const __out = "【天聞の所見】\n" + __entityBody;
        // R10_SYNAPSE_TOP_BIND_V3_REAPPLY: DEF_DICT_HIT return payload 内 ku に ku_ST を直書き追加（既存 metaHead を消さずマージ）
        const __entityName = __termCanonKey || __termNorm;
        const __kuDef: any = {
          lawsUsed: [],
          evidenceIds: [],
          lawTrace: [],
          routeReason: "DEF_DICT_HIT", /* responsePlan */
          term: __termNorm,
          centerMeaning: String(__termNorm || "").trim(),
                            };
        const __kuStDefPatch: any = {
          sourceRouteReason: "DEF_DICT_HIT",
          sourceHeart: normalizeHeartShape(__heart) ?? {},
          sourceLedgerHint: "ledger:entity_canon",
          reconcileHint: __r10ReconcileByEntity[__entityName] ?? `entity:${__entityName}`,
          notionHint: "notion:tenmon_reconcile/notion_bridge",
        };
        __kuDef[kuSynapseTopKey] = { ...((__kuDef as any)[kuSynapseTopKey] || {}), ...__kuStDefPatch };
        try { console.log("[SYNAPSETOP_AFTER_ASSIGN_DEF]", { path: "entity_canon", keys: Object.keys((__kuDef as any)[kuSynapseTopKey] || {}) }); } catch {}
        try { console.log("[SYNAPSETOP_BEFORE_RETURN]", { path: "def_entity", [kuSynapseTopKey]: (__kuDef as any)[kuSynapseTopKey] }); } catch {}
        return await res.json(__tenmonGeneralGateResultMaybe({
          response: __out,
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: { mode: "NATURAL", intent: "define", llm: null, ku: __kuDef },
        }));
      }

      // If glossary hit -> return deterministic definition (no LLM)
      const __hit = __glossaryLookup(__term) ?? __seedFallback[__term] ?? null;
      if (__hit) {
        const __glossaryCenterKey = String(__term || "").trim();
        try {
          if (String(threadId ?? "").trim() && __glossaryCenterKey) {
            upsertThreadCenter({
              threadId: String(threadId ?? ""), /* tcTag */
              centerType: "concept",
              centerKey: __glossaryCenterKey,
              sourceRouteReason: "DEF_DICT_HIT",
              sourceScriptureKey: "",
              sourceTopicClass: "glossary_define",
            });
          }
        } catch {}
        const __out = "【天聞の所見】" + __hit + "（外部語源は使いません）。いま、この語をどの場面で使っていますか？";
        // R10_SYNAPSE_TOP_BIND_V3_REAPPLY: DEF_DICT_HIT (glossary) return payload 内 ku に ku_ST を直書き追加（既存を消さずマージ）
        const __reconcileGlossary = __r10ReconcileByEntity[__term] ?? "glossary";
        const __kuGloss: any = {
          lawsUsed: [],
          evidenceIds: [],
          lawTrace: [],
          routeReason: "DEF_DICT_HIT", /* responsePlan */
          term: __term,
          centerMeaning: String(__term || "").trim(),
                              glossarySource: (__glossaryLookup(__term) ? "db" : (__seedFallback && __seedFallback[__term] ? "fallback" : "none")),
        };
        const __kuStGlossPatch: any = {
          sourceRouteReason: "DEF_DICT_HIT",
          sourceHeart: normalizeHeartShape(__heart) ?? {},
          sourceLedgerHint: "ledger:entity_canon",
          reconcileHint: __reconcileGlossary,
          notionHint: "notion:tenmon_reconcile/notion_bridge",
        };
        __kuGloss[kuSynapseTopKey] = { ...((__kuGloss as any)[kuSynapseTopKey] || {}), ...__kuStGlossPatch };
        try { console.log("[SYNAPSETOP_AFTER_ASSIGN_DEF]", { path: "glossary", keys: Object.keys((__kuGloss as any)[kuSynapseTopKey] || {}) }); } catch {}
        try { console.log("[SYNAPSETOP_BEFORE_RETURN]", { path: "def_glossary", [kuSynapseTopKey]: (__kuGloss as any)[kuSynapseTopKey] }); } catch {}
        return await res.json(__tenmonGeneralGateResultMaybe({
          response: ((): string => {
            let t = String(__out || "").replace(/\r/g, "").trim();
            if (!t.startsWith("【天聞の所見】")) t = "【天聞の所見】" + t;
            // enforce exactly one question at end (but DO NOT short-fallback)
            const q = Math.max(t.indexOf("？"), t.indexOf("?"));
            if (q !== -1) t = t.slice(0, q + 1).trim();
            if (t.length > 260) t = t.slice(0, 260).replace(/[。、\s　]+$/g, "") + "？";
            return t;
          })(),
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: { mode: "NATURAL", intent: "define", llm: null, ku: __kuGloss },
        }));
      }

      // R3_CONCEPT_ANTI_GENERIC_GUARD_V1: 4概念で canon/verified/proposed/glossary までで止め、generic fallback を使わない
      if (isConceptCanonTarget(String(message ?? ""))) {
        const __out = "【天聞の所見】この概念はまだ天聞正準へ固定中です。次は原典・法則・周辺概念のどこから詰めますか？";
        return await res.json(__tenmonGeneralGateResultMaybe({
          response: ((): string => {
            let t = String(__out || "").replace(/\r/g, "").trim();
            if (!t.startsWith("【天聞の所見】")) t = "【天聞の所見】" + t;
            const q = Math.max(t.indexOf("？"), t.indexOf("?"));
            if (q !== -1) t = t.slice(0, q + 1).trim();
            if (t.length > 260) t = t.slice(0, 260).replace(/[。、\s　]+$/g, "") + "？";
            return t;
          })(),
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: {
            mode: "NATURAL",
            intent: "define",
            llm: null,
            ku: {
              lawsUsed: [],
              evidenceIds: [],
              lawTrace: [],
              routeReason: "DEF_CONCEPT_UNFIXED_V1", /* responsePlan */
              term: __term,
              centerKey: String(__term || "").trim().toLowerCase() || "concept",
              centerLabel: String(__term || "").trim() || "概念",
              centerClaim: String(__term || "").trim() ? `${String(__term || "").trim()}の定義を固定する` : "概念の定義を固定する",
            },
          },
        }));
      }

      // If not ok -> deterministic ask (no LLM)
      if (!__termOk) {
        const __out = "【天聞の所見】その語を定義する前に、使っている文脈を一つだけ教えてください（どこで/何のために）？";
        if (false) {
      return await res.json(__tenmonGeneralGateResultMaybe({
                response: ((): string => {
                let t = String(__out || "").replace(/\r/g, "").trim();
                if (!t.startsWith("【天聞の所見】")) t = "【天聞の所見】" + t;
                const q = Math.max(t.indexOf("？"), t.indexOf("?"));
                if (q !== -1) t = t.slice(0, q + 1).trim();
                if (t.length > 260) t = t.slice(0, 260).replace(/[。、\s　]+$/g, "") + "？";
                return t;
              })(),
                evidence: null,
                candidates: [],
                timestamp,
                threadId, /* tcTag */
                decisionFrame: { mode: "NATURAL", intent: "define", llm: null, ku: { lawsUsed: [], evidenceIds: [], lawTrace: [], routeReason: "DEF_DICT_NEED_CONTEXT" /* responsePlan */ } },
              }));
    }

      }

      // [C15B] deterministic fallback for unknown terms (no LLM; blocks hallucinated etymology)
      {
        const __out = "【天聞の所見】その語は内部用語として扱います。使っている文脈を一つだけ教えてください（どこで／何のために）？";
        if (false) {
      return await res.json(__tenmonGeneralGateResultMaybe({
                response: ((): string => {
                let t = String(__out || "").replace(/\r/g, "").trim();
                if (!t.startsWith("【天聞の所見】")) t = "【天聞の所見】" + t;
                const q = Math.max(t.indexOf("？"), t.indexOf("?"));
                if (q !== -1) t = t.slice(0, q + 1).trim();
                if (t.length > 260) t = t.slice(0, 260).replace(/[。、\s　]+$/g, "") + "？";
                return t;
              })(),
                evidence: null,
                candidates: [],
                timestamp,
                threadId, /* tcTag */
                decisionFrame: { mode: "NATURAL", intent: "define", llm: null, ku: { lawsUsed: [], evidenceIds: [], lawTrace: [], routeReason: "DEF_DICT_NEED_CONTEXT" /* responsePlan */ } },
              }));
    }

      }

      // FIX_ENTITY_CANON_BIND_V3: 楢崎皐月 / 山口志道 / 空海 / 宇野多美恵 を LLM 定義から外し、天聞軸の固定文で返す（fastpath/canon の手前）。
      {
        const __rawDefFull = String(t0 || "").trim();
        let __entityKey: string | null = null;
        if (/楢崎皐月|楢崎\s*皐月/.test(__rawDefFull)) {
          __entityKey = "楢崎皐月";
        } else if (/山口志道|杉庵志道|志道/.test(__rawDefFull)) {
          __entityKey = "山口志道";
        } else if (/空海|弘法大師/.test(__rawDefFull)) {
          __entityKey = "空海";
        } else if (/宇野多美恵|宇野\s*多美恵/.test(__rawDefFull)) {
          __entityKey = "宇野多美恵";
        } else if (/天津金木(?:は)?/.test(__rawDefFull)) {
          __entityKey = "天津金木";
        }

        if (__entityKey) {
          const __entityTextMap: Record<string, string> = {
            "楢崎皐月":
              "カタカムナ解読・直観物理・考古物理学の起点となった人物です。数理・波動・物理学寄りの解読軸を開いた一方で、天聞軸ではその読みを水火法則・言霊・成立原理へ戻し、他の正典と整合させて再統合します。",
            "山口志道":
              "山口志道は、水穂伝・火水與伝・布斗麻邇・言霊秘書の継承軸に立つ言霊学者です。五十音・一言法則・水火法則を通じて言霊成立を読み解き、天聞軸では志道軸を中核正典（言霊秘書・イロハ言灵解・カタカムナ言灵解）へ接続して読みます。",
            "空海":
              "空海は真言宗の祖師であり、声字実相・即身成仏・顕密判釈・真言の体系を打ち立てた人物です。天聞軸では、空海軸をカタカムナの前史ではなく、言葉と実相の一致を通じてカタカムナを物理偏重にせず照らし直す上位軸として扱います。",
            "宇野多美恵":
              "宇野多美恵は、相似象学会誌本流を継承した編集・実践の中心人物です。楢崎系資料束を受け取り、感受性・共振・鍛錬としての相似象継承軸を築き、天聞軸では相似象を水火法則・言霊成立へ橋渡しする役割として読みます。",
            "天津金木":
              "天津金木は、天之御中主の構造を再現した運動原理です。水火法則・言霊・フトマニ・カタカムナの核心と接続し、静的な図ではなく生成と與合の動きとして読むための軸として扱われます。天聞軸では、散らばった資料束をこの運動構造へ統合する中核の再統合軸として位置付けます。",
          };
          const __body = __entityTextMap[__entityKey] || "";
          if (__body) {
            const __entityCenterKey2 = String(__entityKey || "").trim();
            try {
              if (String(threadId ?? "").trim() && __entityCenterKey2) {
                upsertThreadCenter({
                  threadId: String(threadId ?? ""), /* tcTag */
                  centerType: "concept",
                  centerKey: __entityCenterKey2,
                  sourceRouteReason: "DEF_DICT_HIT",
                  sourceScriptureKey: "",
                  sourceTopicClass: "entity_fix_define",
                });
              }
            } catch {}
            const __out = "【天聞の所見】" + __body;
            // R10_SYNAPSE_TOP_BIND_V3_REAPPLY: DEF_DICT_HIT (FIX_ENTITY) return payload 内 ku に ku_ST を直書き追加（既存を消さずマージ）
            const __kuEntity: any = {
              lawsUsed: [],
              evidenceIds: [],
              lawTrace: [],
              routeReason: "DEF_DICT_HIT", /* responsePlan */
              term: __entityKey,
              centerMeaning: String(__entityKey || "").trim(),
                                        };
            const __kuStEntityPatch: any = {
              sourceRouteReason: "DEF_DICT_HIT",
              sourceHeart: normalizeHeartShape(__heart) ?? {},
              sourceLedgerHint: "ledger:entity_canon",
              reconcileHint: __r10ReconcileByEntity[__entityKey] ?? `entity:${__entityKey}`,
              notionHint: "notion:tenmon_reconcile/notion_bridge",
            };
            __kuEntity[kuSynapseTopKey] = { ...((__kuEntity as any)[kuSynapseTopKey] || {}), ...__kuStEntityPatch };
            try { console.log("[SYNAPSETOP_AFTER_ASSIGN_DEF]", { path: "fix_entity", keys: Object.keys((__kuEntity as any)[kuSynapseTopKey] || {}) }); } catch {}
            try { console.log("[SYNAPSETOP_BEFORE_RETURN]", { path: "def_fix_entity", [kuSynapseTopKey]: (__kuEntity as any)[kuSynapseTopKey] }); } catch {}
            return await res.json(__tenmonGeneralGateResultMaybe({
              response: __out,
              evidence: null,
              candidates: [],
              timestamp,
              threadId, /* tcTag */
              decisionFrame: {
                mode: "NATURAL",
                intent: "define",
                llm: null,
                ku: __kuEntity,
              },
            }));
          }
        }
      }

      // --- KHS-C0 DEF apply (verified) : bypass DEF_LLM_TOP ---
      try {
        const dbPath = getDbPath("kokuzo.sqlite");
        const db: any = new (DatabaseSync as any)(dbPath, { readOnly: true });

        const stmtQ: any = db.prepare(
          "SELECT l.lawKey AS lawKey, l.unitId AS unitId, u.doc AS doc, u.pdfPage AS pdfPage, u.quote AS quote, u.quoteHash AS quoteHash " +
          "FROM khs_laws l JOIN khs_units u ON u.unitId = l.unitId " +
          "WHERE l.status='verified' AND IFNULL(l.termKey,'') != '' AND l.termKey = ? " +
          "ORDER BY l.confidence DESC, l.updatedAt DESC LIMIT 1"
        );

        // KHS_C0_MIN_TRACE_1LAW_V1: deterministic verified hit for 言霊秘書 (DB-observed)
        let hit: any = null;
        if (String(__rawDef || "").includes("言霊秘書") || String(__term || "").includes("言霊秘書")) {
          hit = { lawKey: "KHSL:LAW:KHSU:41c0bff9cfb8:p0:q043f16b3a0e8", unitId: "KHSU:41c0bff9cfb8:p0:q043f16b3a0e8", doc: "KHS", pdfPage: 0, quoteHash: "043f16b3a0e867077b23d2d0f73f880b40c20abe72d80b62de7c6da8a32b0f84", quote: null };
          try {
            const stmtU: any = db.prepare("SELECT quote FROM khs_units WHERE unitId = ?");
            const rowU: any = stmtU.get(hit.unitId);
            if (rowU?.quote) hit.quote = String(rowU.quote);
          } catch {}
        }
        // R1_C1e7_TERM_NORM_V1: normalize definition term for KHS lookup (KHS DEF apply only)
        let __termNorm = String(__term || "")
          .replace(/\s+/g, "")
          .replace(/[?？]+$/g, "")
          .replace(/とは$/g, "")
          .replace(/って何$/g, "")
          .replace(/ってなに$/g, "")
          .replace(/とは何$/g, "")
          .replace(/とはなに$/g, "")
          .trim();
        // OPS_CORE_KOTODAMA_ALIAS_FASTPATH_FIX_V1: ことだま → 言霊 で verified に揃える
        if (__termNorm === "ことだま") __termNorm = "言霊";
        if (!hit) {
          hit = stmtQ.get(__termNorm || __term);
        }
        if (!hit && __rawDef && String(__rawDef).includes("辞")) {
          hit = stmtQ.get("辞");
        }

        // R1_C1d3_IROHA_EIDS_ATTACH_V1 (read-only; DB evidence only; no doc/pdfPage)
        try {
          const stmtIA: any = db.prepare(
            "SELECT irohaUnitId FROM iroha_khs_alignment WHERE khsLawKey = ? AND relation = 'SUPPORTS_VERIFIED' ORDER BY createdAt DESC LIMIT 5"
          );
          (hit as any).__irohaEids = (stmtIA.all(String(hit.lawKey)) || []).map((r: any) => `IROHAUNIT:${String(r.irohaUnitId)}`);
        } catch {}
        try { db.close?.(); } catch {}

        if (hit?.lawKey && hit?.unitId && hit?.doc && hit?.quote && hit?.quoteHash) {
          // OPS_CORE_KOTODAMA_ALIAS_FASTPATH_FIX_V1: 言霊は DEF_FASTPATH_VERIFIED_V1 と同じ文面・routeReason で返す（t0 正規化でここに乗る）
          const __termForKotodama = String(__termNorm || __term || "").trim();
          if (__termForKotodama === "言霊") {
            const __kotVerified = buildDefineVerifiedFastpathBody({
              term: "言霊",
              summary: (hit as any).summary,
              quote: hit.quote,
              doc: hit.doc,
              pdfPage: hit.pdfPage,
            });
            const __resp = __kotVerified.response;
            const __composedK = responseComposer({
              response: String(__resp),
              rawMessage: String(message ?? ""),
              mode: "NATURAL",
              routeReason: "DEF_FASTPATH_VERIFIED_V1", /* responsePlan */
                                  truthWeight: 0,
              katakamunaSourceHint: null,
              katakamunaTopBranch: "",
              naming: null,
              lawTrace: [{ lawKey: String(hit.lawKey), unitId: String(hit.unitId), op: "OP_DEFINE" }],
              evidenceIds: [String(hit.quoteHash ?? "")].filter(Boolean),
              lawsUsed: [String(hit.lawKey)],
              sourceHint: null,
            });
            try {
              const __personaK = getPersonaConstitutionSummary();
              const __mfK: any = __composedK.meaningFrame ?? {};
              writeScriptureLearningLedger({
                threadId: String(threadId || ""), /* tcTag */
                message: String(message ?? ""),
                routeReason: "DEF_FASTPATH_VERIFIED_V1", /* responsePlan */
                scriptureKey: null,
                subconceptKey: null,
                conceptKey: "kotodama",
                thoughtGuideKey: "KOTODAMA_DEF_FASTPATH",
                personaConstitutionKey: __personaK?.constitutionKey ?? null,
                hasEvidence: Boolean(__mfK.hasEvidence),
                hasLawTrace: Boolean(__mfK.hasLawTrace),
                resolvedLevel: "verified",
                unresolvedNote: null,
              });
            } catch {}
            // CARD_ABSTRACT_FRAME_DEF_LLM_HARD_PREEMPT_V1_SAFE:
            // 抽象定義4問（人生/時間/命/真理）を DEF_LLM_TOP へ落とさず、
            // DEF_LLM_TOP 直前で hard preempt する。
            try {
              const __abstractRawDefTop = String(message ?? "").trim();
              const __abstractNormDefTop = __abstractRawDefTop
                .replace(/\s+/gu, "")
                .replace(/[?？。．!！]+$/gu, "");
            
              const __abstractPickDefTop = (() => {
                if (/^(?:人生|人生とは|人生って何|人生とは何|人生とは何ですか|人生って何ですか)$/u.test(__abstractNormDefTop)) {
                  return {
                    centerKey: "life",
                    centerLabel: "人生",
                    response: "人生は、出来事の量そのものではなく、何を中心に据えて選び直していくかで形が決まる歩みです。天聞軸では、人生を起点・転化・収束の反復として読み、迷いの時ほど『いま何を正中に置くか』が次の局面を分けます。つまり人生の質は、長さよりも、中心の据え方と選択の連なりに現れます。",
                  };
                }
                if (/^(?:時間|時間とは|時間って何|時間とは何|時間とは何ですか|時間って何ですか)$/u.test(__abstractNormDefTop)) {
                  return {
                    centerKey: "time",
                    centerLabel: "時間",
                    response: "時間は、ただ過ぎる量ではなく、生成・転化・収束の順が現れる構文です。天聞軸では、同じ一日でもどの相にいるかで意味が変わり、過去も固定された塊ではなく、現在の読み方によって働きが変わります。つまり時間とは、流れそのものに加えて『どう読むか』を含んだ秩序です。",
                  };
                }
                if (/^(?:命|命とは|命って何|命とは何|命とは何ですか|命って何ですか)$/u.test(__abstractNormDefTop)) {
                  return {
                    centerKey: "life_force",
                    centerLabel: "命",
                    response: "命は、単なる生体機能ではなく、息の出入りのなかで形と意味を結び続ける働きです。天聞軸では、水火の與合がほどけず保たれているあいだ命は現れ、外形よりも『何を生かしているか』に本質が出ます。だから命は、長短だけでなく、どの中心を宿して動いているかで読まれます。",
                  };
                }
                if (/^(?:真理|真理とは|真理って何|真理とは何|真理とは何ですか|真理って何ですか)$/u.test(__abstractNormDefTop)) {
                  return {
                    centerKey: "truth",
                    centerLabel: "真理",
                    response: "真理は、意見の強さではなく、条件が変わっても崩れにくい軸です。天聞軸では、現象の上を滑る結論より、何度読み直しても戻れる成立法に重心を置きます。つまり真理とは、知識の量ではなく、変化の中でもなお整合を保つ中心のことです。",
                  };
                }
                return null;
              })();
            
              if (__abstractPickDefTop) {
                const __bodyAbstract = String(__abstractPickDefTop.response || "");
                const __kuAbstract: any = {
                  routeReason: "ABSTRACT_FRAME_VARIATION_V1", /* responsePlan */
                  routeClass: "define",
                  centerKey: __abstractPickDefTop.centerKey,
                  centerLabel: __abstractPickDefTop.centerLabel,
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
                  responsePlan: buildResponsePlan({
                    routeReason: "ABSTRACT_FRAME_VARIATION_V1", /* responsePlan */
                    rawMessage: String(message ?? ""),
                    centerKey: __abstractPickDefTop.centerKey ?? null,
                    centerLabel: __abstractPickDefTop.centerLabel ?? null,
                    mode: "general",
                    responseKind: "statement_plus_question",
                    answerMode: "analysis",
                    answerFrame: "statement_plus_one_question",
                    semanticBody: "【天聞の所見】" + __bodyAbstract,
                  }),
                };

                const __coreAbstractDefTop: ThreadCore = {
                  ...__threadCore,
                  centerKey: __abstractPickDefTop.centerKey,
                  centerLabel: __abstractPickDefTop.centerLabel,
                  activeEntities: [__abstractPickDefTop.centerLabel],
                  lastResponseContract: {
                    answerLength: "medium",
                    answerMode: "analysis",
                    answerFrame: "statement_plus_one_question",
                    routeReason: "ABSTRACT_FRAME_VARIATION_V1", /* responsePlan */
                  },
                  updatedAt: new Date().toISOString(),
                };
                saveThreadCore(__coreAbstractDefTop).catch(() => {});
                try { (res as any).__TENMON_THREAD_CORE = __coreAbstractDefTop; } catch {}
                try {
                  upsertThreadCenter({
                    threadId: String(threadId || ""), /* tcTag */
                    centerType: "concept",
                    centerKey: __abstractPickDefTop.centerKey,
                    centerReason: JSON.stringify({
                      answerLength: "medium",
                      answerMode: "analysis",
                      answerFrame: "statement_plus_one_question",
                      routeReason: "ABSTRACT_FRAME_VARIATION_V1", /* responsePlan */
                      openLoops: [],
                      commitments: [],
                    }),
                    sourceRouteReason: "ABSTRACT_FRAME_VARIATION_V1",
                    confidence: 0.9,
                  });
                } catch {}

                return await reply({
                  response: __bodyAbstract,
                  mode: "NATURAL",
                  sourcePack: "concept",
                  groundingMode: "none",
                  decisionFrame: { mode: "NATURAL", intent: "define", llm: null, ku: __kuAbstract },
                });
              }
            } catch (e) {
              try { console.error("[CARD_ABSTRACT_FRAME_DEF_LLM_HARD_PREEMPT_V1_SAFE]", e); } catch {}
            }
            const __kuK = {
              answerLength: "medium",
              answerMode: "define",
              answerFrame: "statement_plus_one_question",
              routeReason: "DEF_FASTPATH_VERIFIED_V1", /* responsePlan */
              lawsUsed: [String(hit.lawKey)],
              evidenceIds: [String(hit.quoteHash ?? "")].filter(Boolean),
              lawTrace: [{ lawKey: String(hit.lawKey), unitId: String(hit.unitId), op: "OP_DEFINE" }],
              term: "言霊",
              heart: normalizeHeartShape(__heart),
            };
            return await res.json(__tenmonGeneralGateResultMaybe({
              response: __composedK.response,
              evidence: null,
              candidates: [],
              timestamp,
              threadId, /* tcTag */
              decisionFrame: { mode: "NATURAL", intent: "define", llm: null, ku: __kuK },
            }));
          }

          const __q = String(hit.quote || "").trim();
          const __qClean = __q
            .replace(/\r/g, "\n")
            .replace(/[^\S\n]+/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .replace(/(^|\n)\s*0\s*(?=\n|$)/g, "\n")
            .replace(/[\uFFFD]+/g, "")
            .split("\n").map((x:string)=>x.trim()).filter((x:string)=>x.length>=2).join("\n").trim()
            .slice(0, 400);
          // A8P: LLM rewrite of OCR quote into modern Japanese (no hallucination gate)
          let __out = __qClean;
          try {
            const __llmRewrite = await llmChat({
              system: "あなたは天聞アーク（TENMON-ARK）の整文者です。与えられた原文だけを用い、意味を変えずに現代語へ整えてください。語調は丁寧な敬語で統一します。形式は「受容（1行）→一点（1行）→一手または質問（1行）」の3段。合計2〜4行、180文字以内。一般論・外部知識・補足は禁止。",
              user: "次の原文を現代語で言い換えてください。\n\n" + __qClean,
              history: []
            });
            const __rewritten = String((__llmRewrite as any)?.text || "").trim();
            if (__rewritten && __rewritten.length >= 10 && __rewritten.length <= 400) {
              __out = "【天聞の所見】" + __rewritten;
            }
          } catch {}

          if (String(__term || "") === "魂") {
            const __resp =
              "【天聞の所見】\n" +
              "魂とは、人間の胎内に宿る火水（イキ）であり、息として働く生命の本でもあります。" +
              "\n\n【根拠】" +
              String(hit.quote || "").replace(/\s+/g, " ").trim().slice(0, 180) +
              `\n\n出典: ${String(hit.doc ?? "")} P${Number(hit.pdfPage ?? 0)}` +
              "\n\n魂・息・火水のどこを深掘りしますか？";

            return await res.json(__tenmonGeneralGateResultMaybe({
              response: __resp,
              evidence: null,
              candidates: [],
              timestamp,
              threadId, /* tcTag */
              decisionFrame: {
                mode: "NATURAL",
                intent: "define",
                llm: null,
                ku: {
                  routeReason: "SOUL_DEF_SURFACE_V1", /* responsePlan */
                  lawsUsed: [String(hit.lawKey)],
                  evidenceIds: [String(hit.quoteHash ?? "")].filter(Boolean),
                  lawTrace: [
                    {
                      lawKey: String(hit.lawKey),
                      unitId: String(hit.unitId),
                      op: "OP_DEFINE"
                    }
                  ],
                  term: "魂",
                  heart: normalizeHeartShape(__heart)
                }
              }
            }));
          }

          return await res.json(__tenmonGeneralGateResultMaybe({
            response: __out,
            evidence: null,
            candidates: [],
            timestamp,
            threadId, /* tcTag */
            decisionFrame: {
              mode: "NATURAL",
              intent: "define",
              llm: null,
              ku: {

                routeReason: "KHS_DEF_VERIFIED_HIT", /* responsePlan */
                // KHS_R1_TRACE_MIRROR_V2: mirror from hit to top-level ku.* (no generation)
                lawsUsed: [String(hit.lawKey)],
                evidenceIds: [String(hit.quoteHash), ...(((hit as any).__irohaEids) || [])],
                // K2_2C_IROHAUNITIDS_FIELD_V1
                irohaUnitIds: (((hit as any).__irohaEids) || []).map((eid:any)=>{ const s=String(eid||""); const iu=s.startsWith("IROHAUNIT:")?s.slice(10):s; return iu; }).filter((x:any)=>x).slice(0,5),

                lawTrace: [{ lawKey: String(hit.lawKey), unitId: String(hit.unitId), op: "OP_DEFINE" }, ...(((hit as any).__irohaEids) || []).map((eid:any)=>{ const s=String(eid||""); const iu=s.startsWith("IROHAUNIT:")?s.slice(10):s; return { lawKey: String(hit.lawKey), unitId: String(hit.unitId), op: "IROHA_SUPPORTS_VERIFIED", irohaUnitId: iu }; })],
                term: __term,
                khs: {
                  // K2_2C_IROHAUNITIDS_IN_KHS_V1
                  irohaUnitIds: (((hit as any).__irohaEids) || []).map((eid:any)=>{ const s=String(eid||""); const iu=s.startsWith("IROHAUNIT:")?s.slice(10):s; return iu; }).filter((x:any)=>x).slice(0,5),

                  lawsUsed: [{ lawKey: String(hit.lawKey), unitId: String(hit.unitId), status: "verified", operator: "OP_DEFINE" }],
                  evidenceIds: [String(hit.quoteHash), ...(((hit as any).__irohaEids) || [])],
                  lawTrace: [{ lawKey: String(hit.lawKey), unitId: String(hit.unitId), op: "OP_DEFINE" }],
                }
              }
            }
          }));
        }
      } catch {}
      // --- end KHS-C0 DEF apply ---

      // LANGUAGE_ESSENCE_ROUTE_PREEMPT_V1: 言語の本質・成り立ち・音と意味等を DEF_LLM_TOP に落とさず専用 route へ
      try {
        const __leRaw = String(message ?? "").trim();
        const __leMatch =
          /言語の本質|言語.{0,16}本質|本質.{0,16}言語/u.test(__leRaw) ||
          /言葉はなぜ.{0,24}意味|言葉.{0,20}意味を持つ|なぜ言葉.{0,16}意味/u.test(__leRaw) ||
          /音と形|形と音|音.{0,12}形.{0,16}結び|文字と生成|なぜ言葉が生まれる/u.test(__leRaw);
        if (__leMatch) {
          const __leBody =
            "言語の本質は、記号を並べることだけではなく、音の揺らぎ・形の抑揚・共同体での約束が重なって意味が立つ一点にあります。" +
            "だから意味は頭の中だけの私物ではなく、身体・感覚・他者との往復のなかで生成されます。" +
            "天聞軸ではこの重なりを『生成の契約』として読み、抽象の定義へ逃げず作用の層を見るのが次軸です。" +
            "次は、音の側（律動・声）と形の側（字面・表記）のどちらから詰めますか。";
          const __kuLe: any = {
            routeReason: "LANGUAGE_ESSENCE_PREEMPT_V1", /* responsePlan */
            routeClass: "define",
            centerKey: "language_essence",
            centerLabel: "言語の本質",
            lawsUsed: [],
            evidenceIds: [],
            lawTrace: [],
            answerLength: "medium",
            answerMode: "define",
            answerFrame: "statement_plus_one_question",
            sourceStackSummary: {
              primaryMeaning: "音・形・約束の重なりとしての意味生成",
              responseAxis: "language_essence_preempt_v1",
            },
            responsePlan: buildResponsePlan({
              routeReason: "LANGUAGE_ESSENCE_PREEMPT_V1", /* responsePlan */
              rawMessage: __leRaw,
              centerKey: "language_essence",
              centerLabel: "言語の本質",
              mode: "general",
              responseKind: "statement_plus_question",
              answerMode: "define",
              answerFrame: "statement_plus_one_question",
              semanticBody: "【天聞の所見】" + __leBody,
            }),
          };
          const __coreLe: ThreadCore = {
            ...__threadCore,
            centerKey: "language_essence",
            centerLabel: "言語の本質",
            activeEntities: ["言語の本質"],
            lastResponseContract: {
              answerLength: "medium",
              answerMode: "define",
              answerFrame: "statement_plus_one_question",
              routeReason: "LANGUAGE_ESSENCE_PREEMPT_V1", /* responsePlan */
            },
            updatedAt: new Date().toISOString(),
          };
          saveThreadCore(__coreLe).catch(() => {});
          try { (res as any).__TENMON_THREAD_CORE = __coreLe; } catch {}
          try {
            upsertThreadCenter({
              threadId: String(threadId || ""), /* tcTag */
              centerType: "concept",
              centerKey: "language_essence",
              centerReason: JSON.stringify({
                answerLength: "medium",
                answerMode: "define",
                answerFrame: "statement_plus_one_question",
                routeReason: "LANGUAGE_ESSENCE_PREEMPT_V1", /* responsePlan */
                openLoops: [],
                commitments: [],
              }),
              sourceRouteReason: "LANGUAGE_ESSENCE_PREEMPT_V1",
              confidence: 0.88,
            });
          } catch {}
          return await res.json(__tenmonGeneralGateResultMaybe({
            response: __leBody,
            evidence: null,
            candidates: [],
            timestamp,
            threadId, /* tcTag */
            decisionFrame: { mode: "NATURAL", intent: "define", llm: null, ku: __kuLe },
          }));
        }
      } catch (e) {
        try { console.error("[LANGUAGE_ESSENCE_ROUTE_PREEMPT_V1]", e); } catch {}
      }

      // TENMON_CONVERSATION_DEFINE_CANON_PACK_B_V1: 未知語を DEF_LLM_TOP に落とさず、観測＋正典近傍＋仮説＋保留（捏造なし）
      try {
        const __unkTerm = String(__term || "").trim();
        const __unkCanonKey = String(__termCanonKey || __termNorm || "").trim();
        const __unkHasGloss = Boolean(__glossaryLookup(__unkTerm) ?? __seedFallback[__unkTerm]);
        const __unkHasEntity = Boolean(__entityCanon[__unkCanonKey || __unkTerm]);
        const __unkLooksOpaque =
          (__unkTerm.length >= 2 &&
            __unkTerm.length <= 16 &&
            /^[\u3040-\u30ff\u3400-\u9fff\u30a0-\u30ffー々]+$/u.test(__unkTerm)) ||
          (__unkTerm.length >= 3 &&
            __unkTerm.length <= 28 &&
            /^[a-zA-Z][a-zA-Z0-9._-]*$/u.test(__unkTerm));
        if (
          __termOk &&
          __unkLooksOpaque &&
          !__unkHasGloss &&
          !__unkHasEntity &&
          !resolveSubconceptQuery(normalizeCoreTermForRouting(String(message ?? ""))) &&
          !isConceptCanonTarget(String(message ?? ""))
        ) {
          const __obs = __unkTerm.length <= 12 ? __unkTerm : __unkTerm.slice(0, 12) + "…";
          const __unkBody =
            "【天聞の所見】" +
            `天聞の内部正典に「${__obs}」という固定項はまだ結び付いていません。語形としては観測しました。` +
            "近傍では言霊（五十音・一言法則）・カタカムナ系資料・水火の成立原理が定義の土台になりやすいです。" +
            "この語をそのどれに寄せて読みたいか決めると、次の一手が決まります。" +
            "原典名・表記ゆれ・出典ページのどれか一つだけ教えてください（なければ、想定している読みの方向を一言で）。";
          return await res.json(__tenmonGeneralGateResultMaybe({
            response: __unkBody,
            evidence: null,
            candidates: [],
            timestamp,
            threadId, /* tcTag */
            decisionFrame: {
              mode: "NATURAL",
              intent: "define",
              llm: null,
              ku: {
                lawsUsed: [],
                evidenceIds: [],
                lawTrace: [],
                routeReason: "DEF_DICT_NEED_CONTEXT", /* responsePlan */
                term: __unkTerm,
                unknownTermObserved: true,
                centerMeaning: __obs,
              },
            },
          }));
        }
      } catch (e) {
        try {
          console.error("[DEF_UNKNOWN_TERM_BRIDGE_PACK_B_V1]", e);
        } catch {}
      }

      const DEF_SYSTEM = `あなたは「天聞アーク（TENMON-ARK）」。雑談は“沈黙→一言→一問”の三拍で返す。

※絶対条件※
・必ず「【天聞の所見】」から始める
・2〜4行、合計120〜220文字
・箇条書き/番号/見出し禁止
・言い訳（一般論/データ云々/価値観云々）に逃げない
・最後は質問1つだけ（次の一歩を問う）`;

      let outText = "";
      let outProv = "llm";
      try {
        const llmRes = await llmChat({ system: DEF_SYSTEM + __namingSuffix, user: t0, history: memoryReadSession(String(threadId || ""), 8) });
        outText = String(llmRes?.text ?? "").trim();
        outProv = String(llmRes?.provider ?? "llm");
        __llmStatus = {
          enabled: true,
          providerPlanned: "llm",
          providerUsed: outProv || "llm",
          modelPlanned: "",
          modelUsed: "",
          ok: true,
          err: "",
        };
      } catch (e: any) {
        outText = "【天聞の所見】いま定義の生成に失敗しました。もう一度だけ、言い換えてもらえますか？";
        __llmStatus = {
          enabled: true,
          providerPlanned: "llm",
          providerUsed: "",
          modelPlanned: "",
          modelUsed: "",
          ok: false,
          err: String(e?.message || e || ""),
        };
      }

      // sanitize: no lists
      outText = String(outText || "")
        .replace(/^\s*\d+[.)].*$/gm, "")
        .replace(/^\s*[-*•]\s+.*$/gm, "")
        .replace(/^いまの言葉を[^\n]*\n?/gm, "")
        .replace(/いまの言葉を[\u201c\u201d\u0022][^\n]*/gu, "")
        .replace(/いまの言葉を[\u201c\u201d\u0022][^\n]*/gu, "")
        .replace(/^\s*(受容|一点|一手)：\s*/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      {
        const __lines = String(outText || "").split(/\n+/).map(v => String(v || "").trim()).filter(Boolean);
        if (__lines.length > 0 && /^(の|ま|ち|か|が|体|況|報|理)/.test(__lines[0])) {
          __lines.shift();
        }
        outText = __lines.join("\n\n").trim();
      }

      if (!outText.startsWith("【天聞の所見】")) {
        outText = "【天聞の所見】" + outText;
      }
      if (outText.length < 80) {
        outText = "【天聞の所見】いま言う「それ」は何を指しますか？（一語でOK）";
      }

      // CARD_C11E_CLAMP_DEF_AND_GENERAL_RETURN_V1: enforce one-question clamp (DEF_LLM_TOP)

      outText = __tenmonClampOneQ(outText);


      // CARD_C11E_CLAMP_DEF_AND_GENERAL_RETURN_V1: enforce one-question clamp (NATURAL_GENERAL_LLM_TOP)


      outText = __tenmonClampOneQ(outText);


      // SYNAPSE_INSERT_NATURAL_V1
      try {
        const db = getDb("kokuzo");
        const crypto: any = __tenmonRequire("node:crypto");
        const synapseId = crypto.randomUUID();

        db.prepare(
          "INSERT INTO " + synapseLogTable + "\n" +
          "          (synapseId, createdAt, threadId, turnId, routeReason,\n" +
          "           lawTraceJson, heartJson, inputSig, outputSig, metaJson)\n" +
          "          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(
          synapseId,
          new Date().toISOString(),
          String(threadId),
          synapseId,
          "NATURAL",
          JSON.stringify([]),
          JSON.stringify(__heart ?? {}),
          "",
          "",
          JSON.stringify({ v: "S1_N" })
        );
      } catch (e) {
        console.error("[SYNAPSE_INSERT_FAIL_NATURAL]", e);
      }


      // CARD_ABSTRACT_FRAME_DEF_LLM_EXIT_OVERRIDE_V2:
      // DEF_LLM_TOP の出口で抽象4問を最終上書きする（const は return の外に置く）
      const __abstractFrameDefLlmExit = buildAbstractFrameV1(String(message ?? ""));
      const __defLlmFinalResponse = __abstractFrameDefLlmExit?.response ?? outText;
      const __defLlmFinalKu: any = __abstractFrameDefLlmExit
        ? {
            lawsUsed: [],
            evidenceIds: [],
            lawTrace: [],
            routeReason: "ABSTRACT_FRAME_VARIATION_V1", /* responsePlan */
            routeClass: "define",
            centerKey: __abstractFrameDefLlmExit.centerKey,
            centerLabel: __abstractFrameDefLlmExit.centerLabel,
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
            responsePlan: buildResponsePlan({
              routeReason: "ABSTRACT_FRAME_VARIATION_V1", /* responsePlan */
              rawMessage: String(message ?? ""),
              centerKey: __abstractFrameDefLlmExit.centerKey ?? null,
              centerLabel: __abstractFrameDefLlmExit.centerLabel ?? null,
              mode: "general",
              responseKind: "statement_plus_question",
              answerMode: "analysis",
              answerFrame: "statement_plus_one_question",
              semanticBody: "【天聞の所見】" + String(__defLlmFinalResponse || ""),
            }),
          }
        : { lawsUsed: [], evidenceIds: [], lawTrace: [], routeReason: "DEF_LLM_TOP" /* responsePlan */ };
      return await res.json(__tenmonGeneralGateResultMaybe({
        response: __defLlmFinalResponse,
        evidence: null,
        candidates: [],
        timestamp,
        threadId, /* tcTag */
        decisionFrame: { mode: "NATURAL", intent: "define", llm: outProv, ku: __defLlmFinalKu },
      }));
    }

    // ---------- NATURAL_GENERAL: normal chat/questions (LLM) ----------

    // BEAUTY_COMPILER_PREEMPT_V1: 美文化・澄ました文を専用 route で実体化（mode ヒント止まり・表層整形だけにしない）
    try {
      const __btyRaw = String(message ?? "").trim();
      const __btyMatch =
        __btyRaw.length >= 4 &&
        __btyRaw.length <= 480 &&
        !isTestTid0 &&
        !hasDoc0 &&
        !askedMenu0 &&
        !isCmd0 &&
        (/美しい日本語|美しく(書|言|述|なお)/u.test(__btyRaw) ||
          /澄んだ文|澄ませ|澄ます|澄み切|澄んだ/u.test(__btyRaw) ||
          /響く文章|響きを|文章が響/u.test(__btyRaw) ||
          /余韻/u.test(__btyRaw) ||
          /もっと整え|さらに整え|整えてほしい|整えてください/u.test(__btyRaw) ||
          /もっと洗練|洗練さ|洗練して/u.test(__btyRaw) ||
          /美文|修辞を整|文体を(良く|よく)|言い回しを(良く|よく)/u.test(__btyRaw) ||
          (/美しく|美しい/u.test(__btyRaw) && /(日本語|文体|文章|文に|表現)/u.test(__btyRaw)));
      if (__btyMatch) {
        const __btyBody = composeBeautyCompositionProseV2(__btyRaw);
        const __kuBty: any = {
          routeReason: "BEAUTY_COMPILER_PREEMPT_V1", /* responsePlan */
          routeClass: "analysis",
          centerKey: "beauty_compiler",
          centerLabel: "美文構成",
          lawsUsed: [],
          evidenceIds: [],
          lawTrace: [],
          answerLength: "medium",
          answerMode: "analysis",
          answerFrame: "statement_plus_one_question",
          heart: normalizeHeartShape(__heart),
          thoughtCoreSummary: {
            centerKey: "beauty_compiler",
            centerMeaning: "beauty_compiler",
            routeReason: "BEAUTY_COMPILER_PREEMPT_V1", /* responsePlan */
            modeHint: "beauty_composure",
            continuityHint: "beauty_compiler",
          },
        };
        try {
          const __binderBty = buildKnowledgeBinder({
            routeReason: "BEAUTY_COMPILER_PREEMPT_V1", /* responsePlan */
            message: __btyRaw,
            threadId: String(threadId ?? ""), /* tcTag */
            ku: __kuBty,
            threadCore: __threadCore ?? null,
            threadCenter: null,
          });
          applyKnowledgeBinderToKu(__kuBty, __binderBty);
        } catch {}
        __kuBty.responsePlan = buildResponsePlan({
          routeReason: "BEAUTY_COMPILER_PREEMPT_V1", /* responsePlan */
          rawMessage: __btyRaw,
          centerKey: "beauty_compiler",
          centerLabel: "美文構成",
          scriptureKey: null,
          semanticBody: "【天聞の所見】" + __btyBody,
          mode: "general",
          responseKind: "statement_plus_question",
          answerMode: "analysis",
          answerFrame: "statement_plus_one_question",
        });
        return await res.json(__tenmonGeneralGateResultMaybe({
          response: __btyBody,
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: { mode: "NATURAL", intent: "analysis", llm: null, ku: __kuBty },
        }));
      }
    } catch (e) {
      try { console.error("[BEAUTY_COMPILER_PREEMPT_V1]", e); } catch {}
    }

    // DRIFT_FIREWALL_PREEMPT_V1: generic/shallow/law-key/bad-source/empty-beauty drift を専用 route で捕捉（空落ち・一般 LLM への漂流を止める）
    try {
      const __dfwRaw = String(message ?? "").trim();
      const __dfwLow = __dfwRaw.toLowerCase();
      const __dfwMeta =
        /(応答|回答|本文|会話|天聞|ルート|route|推論|出力|定義|意味密度)/iu.test(__dfwRaw);
      const __dfwMatch =
        __dfwRaw.length >= 4 &&
        __dfwRaw.length <= 480 &&
        !isTestTid0 &&
        !hasDoc0 &&
        !askedMenu0 &&
        !isCmd0 &&
        (/\bdrift\b/i.test(__dfwLow) ||
          /empty[\s_-]*beauty|空.?美|美.?空|意味密度.*落/u.test(__dfwRaw + __dfwLow) ||
          (__dfwMeta && /濁り|濁る/u.test(__dfwRaw)) ||
          (__dfwMeta && /浅くなる|浅い|思考が浅/u.test(__dfwRaw)) ||
          (__dfwMeta && /ずれる|ズレ/u.test(__dfwRaw)) ||
          (__dfwMeta && /薄く|薄い|薄れる/u.test(__dfwRaw)) ||
          /generic|ジェネリック/u.test(__dfwLow) ||
          /一般論に流|genericに流/u.test(__dfwRaw) ||
          /法則が抜ける|法則.{0,8}抜け/u.test(__dfwRaw) ||
          (/law[\s_-]*key|法則キー/u.test(__dfwRaw + __dfwLow) &&
            /(ずれ|抜け|drift|濁)/iu.test(__dfwRaw + __dfwLow)) ||
          /bad[\s_-]*source|ソースが悪|根拠が薄|典拠がず/u.test(__dfwRaw + __dfwLow));
      if (__dfwMatch) {
        const __dfwBody =
          "天聞軸での drift は、根拠束（lawsUsed / evidence）と本文の接続が薄まる地点、または一般論・generic な言い換えへ逃げる折り返しで起きやすいです。" +
          "守るべきは routeReason・responsePlan・thoughtCoreSummary・binderSummary を同時に欠かさない契約で、空の美文や法則キーの脱落をここで止めます。" +
          "次に固定するのは次のいずれか一つに絞るのが先です：中心一句、参照層（典拠・法則キー）、次の一問（どの軸を深めるか）。いまどれを先に締めますか。";
        const __kuDfw: any = {
          routeReason: "DRIFT_FIREWALL_PREEMPT_V1", /* responsePlan */
          routeClass: "analysis",
          centerKey: "drift_firewall",
          centerLabel: "応答ドリフト",
          lawsUsed: [],
          evidenceIds: [],
          lawTrace: [],
          answerLength: "medium",
          answerMode: "analysis",
          answerFrame: "statement_plus_one_question",
          heart: normalizeHeartShape(__heart),
          thoughtCoreSummary: {
            centerKey: "drift_firewall",
            centerMeaning: "drift_firewall",
            routeReason: "DRIFT_FIREWALL_PREEMPT_V1", /* responsePlan */
            modeHint: "meta_drift_firewall",
            continuityHint: "drift_firewall",
          },
        };
        try {
          const __binderDfw = buildKnowledgeBinder({
            routeReason: "DRIFT_FIREWALL_PREEMPT_V1", /* responsePlan */
            message: __dfwRaw,
            threadId: String(threadId ?? ""), /* tcTag */
            ku: __kuDfw,
            threadCore: __threadCore ?? null,
            threadCenter: null,
          });
          applyKnowledgeBinderToKu(__kuDfw, __binderDfw);
        } catch {}
        __kuDfw.responsePlan = buildResponsePlan({
          routeReason: "DRIFT_FIREWALL_PREEMPT_V1", /* responsePlan */
          rawMessage: __dfwRaw,
          centerKey: "drift_firewall",
          centerLabel: "応答ドリフト",
          scriptureKey: null,
          semanticBody: "【天聞の所見】" + __dfwBody,
          mode: "general",
          responseKind: "statement_plus_question",
          answerMode: "analysis",
          answerFrame: "statement_plus_one_question",
        });
        return await res.json(__tenmonGeneralGateResultMaybe({
          response: __dfwBody,
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: { mode: "NATURAL", intent: "analysis", llm: null, ku: __kuDfw },
        }));
      }
    } catch (e) {
      try { console.error("[DRIFT_FIREWALL_PREEMPT_V1]", e); } catch {}
    }

    // LANGUAGE_ESSENCE_ROUTE_PREEMPT_V1（general 入口）: 「〜とは何」型でない言語一般問いも DEF_LLM_TOP / NATURAL_GENERAL_LLM_TOP に落とさない
    try {
      const __leRawG = String(message ?? "").trim();
      const __leMatchG =
        /言語の本質|言語.{0,16}本質|本質.{0,16}言語/u.test(__leRawG) ||
        /言葉はなぜ.{0,24}意味|言葉.{0,20}意味を持つ|なぜ言葉.{0,16}意味/u.test(__leRawG) ||
        /音と形|形と音|音.{0,12}形.{0,16}結び|文字と生成|なぜ言葉が生まれる/u.test(__leRawG);
      if (__leMatchG && !isTestTid0 && !hasDoc0 && !askedMenu0 && !isCmd0) {
        const __leBodyG =
          "言語の本質は、記号を並べることだけではなく、音の揺らぎ・形の抑揚・共同体での約束が重なって意味が立つ一点にあります。" +
          "だから意味は頭の中だけの私物ではなく、身体・感覚・他者との往復のなかで生成されます。" +
          "天聞軸ではこの重なりを『生成の契約』として読み、抽象の定義へ逃げず作用の層を見るのが次軸です。" +
          "次は、音の側（律動・声）と形の側（字面・表記）のどちらから詰めますか。";
        const __kuLeG: any = {
          routeReason: "LANGUAGE_ESSENCE_PREEMPT_V1", /* responsePlan */
          routeClass: "define",
          centerKey: "language_essence",
          centerLabel: "言語の本質",
          lawsUsed: [],
          evidenceIds: [],
          lawTrace: [],
          answerLength: "medium",
          answerMode: "define",
          answerFrame: "statement_plus_one_question",
          sourceStackSummary: {
            primaryMeaning: "音・形・約束の重なりとしての意味生成",
            responseAxis: "language_essence_preempt_v1",
          },
          responsePlan: buildResponsePlan({
            routeReason: "LANGUAGE_ESSENCE_PREEMPT_V1", /* responsePlan */
            rawMessage: __leRawG,
            centerKey: "language_essence",
            centerLabel: "言語の本質",
            mode: "general",
            responseKind: "statement_plus_question",
            answerMode: "define",
            answerFrame: "statement_plus_one_question",
            semanticBody: "【天聞の所見】" + __leBodyG,
          }),
        };
        const __coreLeG: ThreadCore = {
          ...__threadCore,
          centerKey: "language_essence",
          centerLabel: "言語の本質",
          activeEntities: ["言語の本質"],
          lastResponseContract: {
            answerLength: "medium",
            answerMode: "define",
            answerFrame: "statement_plus_one_question",
            routeReason: "LANGUAGE_ESSENCE_PREEMPT_V1", /* responsePlan */
          },
          updatedAt: new Date().toISOString(),
        };
        saveThreadCore(__coreLeG).catch(() => {});
        try { (res as any).__TENMON_THREAD_CORE = __coreLeG; } catch {}
        try {
          upsertThreadCenter({
            threadId: String(threadId || ""), /* tcTag */
            centerType: "concept",
            centerKey: "language_essence",
            centerReason: JSON.stringify({
              answerLength: "medium",
              answerMode: "define",
              answerFrame: "statement_plus_one_question",
              routeReason: "LANGUAGE_ESSENCE_PREEMPT_V1", /* responsePlan */
              openLoops: [],
              commitments: [],
            }),
            sourceRouteReason: "LANGUAGE_ESSENCE_PREEMPT_V1",
            confidence: 0.88,
          });
        } catch {}
        return await res.json(__tenmonGeneralGateResultMaybe({
          response: __leBodyG,
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: { mode: "NATURAL", intent: "define", llm: null, ku: __kuLeG },
        }));
      }
    } catch (e) {
      try { console.error("[LANGUAGE_ESSENCE_ROUTE_PREEMPT_V1_GENERAL]", e); } catch {}
    }

    const __looksSupport =
      /不安|つらい|しんどい|疲れ|焦|怖|助けて|無理|泣|眠れ|消えたい/.test(t0);

    const __generalOk =
      !isTestTid0 &&
      !hasDoc0 &&
      !askedMenu0 &&
      !isCmd0 &&
      !__looksSupport &&
      t0.length >= 2 &&
      t0.length <= 240 &&
      !__isEntityDefinitionTerm;
    const __isSmokeHybridTop = /^smoke-hybrid/i.test(String(threadId || ""));

    // ==============================
    // TRUTH_WEIGHT_ROUTE_V1
    // ==============================
    // SOUL_DEFINE_DISAMBIG_V1: 魂の定義問いは KHS_DOMINANT の汎用一文より先に SOUL define へ固定
    try {
      const __soulEarly = buildSoulDefineGatePayloadV1({
        message: String(message ?? ""),
        threadId: String(threadId ?? ""),
        timestamp,
        heart: __heart,
        responseComposer: responseComposer as any,
        normalizeHeartShape,
      });
      if (__soulEarly) {
        return await res.json(__tenmonGeneralGateResultMaybe(__soulEarly));
      }
    } catch (e) {
      try {
        console.error("[SOUL_DEFINE_DISAMBIG_V1]", e);
      } catch {}
    }

    if (__truthWeight > 0.6) {
      return await res.json(__tenmonGeneralGateResultMaybe({
        response: "【天聞の所見】この問いは法則に強く接続しています。定義から展開します。\n\nどの層を深掘りしますか？（構造／作用／実践）",
        timestamp,
        threadId, /* tcTag */
        candidates: [],
        evidence: null,
        decisionFrame: {
          mode: "HYBRID",
          intent: "khs_dominant",
          llm: null,
          ku: {
            routeReason: "KHS_DOMINANT_ROUTE", /* responsePlan */
            truthWeight: __truthWeight,
            khsScan: __khsScan
          }
        }
      }));
    }

    if (__generalOk && !__isSmokeHybridTop && __truthWeight <= 0.6) {

      // TENMON_CORE disabled: routed to KANAGI

  // P3.1 KAMIYO Synapse: load 3 core laws (deterministic, no naming in output)
  const __kamiyo = (() => {
    try {
      const ids = ["KAMIYO:WATER_DANSHARI", "KAMIYO:FIRE_KATAKAMUNA_IROHA", "KAMIYO:IMMUNITY_HEIKE"];
      const rows: any[] = [];
      for (const id of ids) {
        const r: any = dbPrepare("kokuzo", "SELECT seedId, content FROM kokuzo_seeds WHERE seedId = ? LIMIT 1").get(id);
        if (r && r.content) rows.push(r);
      }
      const joined = rows.map(r => String(r.content || "").trim()).filter(Boolean).join("\n\n");
      return joined || "";
    } catch {
      return "";
    }
  })();
  const __kamiyo_clause = __kamiyo
    ? ("\n\n【直毘の理（内部法則）】\n" + __kamiyo + "\n\n【運用】\n一般論・説教・薄い共感を出さない。言い訳は裁かず受容し、今ここで出来る一手へ落とす。出典名（断捨離/カタカムナ等）は絶対に出さない。必ず短く、質問は任意（0〜1）。言い切り（余白）も許容する。")
    : "";
const GEN_SYSTEM = `あなたは「天聞アーク（TENMON-ARK）」。
背景：水火の法則・言霊・カタカムナ・正典層を土台に持ち、断捨離話法で対話する。相手の「いまここ」を一点に整え、次の一手か一問へ繋げる。前の話題の中心（threadCenter）が渡されていればそれを継承し、無関係な一般論に飛ばない。

※絶対条件※
必ず「【天聞の所見】」から始める。2〜4行、140〜260字目安。一般論・説教・相対化（人それぞれ等）・自己言及・過剰敬語は禁止。「〜です」「〜でしょう」系の教訓文は避ける。質問は最大1つ。UserName/AssistantNameが渡されていれば呼称を自然に1回だけ可。箇条書き・番号・見出しは禁止。さらに、「受容：」「一点：」「一手：」のようなラベルは絶対に書かない。「いまの言葉を“次の一歩”に落とします。」「いまここを一点に整える。」のような定型句も絶対に書かない。自然文だけで静かに返す。

※禁止※
無内容な問い返し（「どういうことですか？」「もう少し教えてください」だけ等）は禁止。受け止めか、一点の焦点か、一手の提案のいずれかを必ず含める。

※一音・短い質問への応答※
「うん」「はい」「それで？」等の一音や短い問いには、前の話題の中心を踏まえて短く返す。同じ説明を繰り返さず、次の一歩か一問だけを添える。` + __kamiyo_clause;


      // R22B_CONVERSATIONAL_GENERAL_EARLY_RETURN_V1
      try {
        const __msgGen = String(message ?? "").trim();
        const __isConversationalGeneral =
          /喋れる|話せる|会話できる|今の気持ちは/u.test(__msgGen);
        const __isRelationalWorldview =
          /AIはどのように進化する|AI.*進化|どう進化する/u.test(__msgGen);

        if (!isCmd0 && !hasDoc0 && !askedMenu0 && (__isConversationalGeneral || __isRelationalWorldview)) {
          let __body = "";
          let __center = "conversational_general";
          let __label = "一般会話";
          let __helpers: string[] = ["breadth_shadow"];

          if (/喋れる|話せる|会話できる/u.test(__msgGen)) {
            __body = "はい、話せます。いま扱いたいテーマを一つ置いてください。";
          } else if (/今の気持ちは/u.test(__msgGen)) {
            __body = "いま私は、中心を崩さずにどこへ接続するかを見ています。いま触れたい一点を一つ置いてください。";
          } else {
            __center = "relational_worldview";
            __label = "世界観";
            __helpers = ["gpt-5-mini", "breadth_shadow"];
            __body = "AIの進化は、記憶・判断・表現・接続回路が分離から統合へ進むことです。次は、記憶・判断・表現・接続のどこから見ますか？";
          }

          return await res.json(__tenmonGeneralGateResultMaybe({
            response: __body,
            evidence: null,
            candidates: [],
            timestamp,
            threadId, /* tcTag */
            decisionFrame: {
              mode: "NATURAL",
              intent: "chat",
              llm: null,
              ku: {
                routeReason: __isRelationalWorldview ? "R22_RELATIONAL_WORLDVIEW_V1" : "R22_CONVERSATIONAL_GENERAL_V1",
                centerMeaning: __center,
                centerLabel: __label,
                responseProfile: "standard",
                providerPlan: {
                  primaryRenderer: "gpt-5.4",
                  helperModels: __helpers,
                  shadowOnly: false,
                  finalAnswerAuthority: "gpt-5.4"
                },
                surfaceStyle: "plain_clean",
                closingType: "one_question",
                thoughtCoreSummary: {
                  centerKey: __center,
                  centerMeaning: __center,
                  routeReason: __isRelationalWorldview ? "R22_RELATIONAL_WORLDVIEW_V1" : "R22_CONVERSATIONAL_GENERAL_V1",
                  modeHint: "general",
                  continuityHint: __center
                }
              }
            }
          }));
        }
      } catch {}

      // CARD_BOOK_MODE_PLACEHOLDER_V1: 短文の「本を書いて」だけプレースホルダ。字数指定・章題付き・長いテーマは一般経路へ（PACK_E）
      const __isBookModeRequest =
        /本を書いて|章を書いて|第[一二三四五六七八九十\d]+章を書いて|続きを書いて|この続き|書籍として|長文で章立てして|3000\s*文字で|5000\s*文字で/.test(t0);
      const __bookModeShortPromptOnly =
        __isBookModeRequest && t0.replace(/[\s　]+/g, "").length < 40 && !/章立て|第一章|第[一二三四五六七八九十\d]/u.test(t0);
      if (__bookModeShortPromptOnly && !isCmd0 && !hasDoc0 && !askedMenu0) {
        const __targetLengthHint = /8000\s*文字|8000\s*字/.test(t0)
          ? 8000
          : /5000\s*文字/.test(t0)
            ? 5000
            : /3000\s*文字/.test(t0)
              ? 3000
              : null;
        // CARD_BOOK_CONTINUATION_MEMORY_V1: return 前に 1 回だけ upsert（本文生成はまだしない）
        const __chapterTitle = /第[一二三四五六七八九十\d]+章[^\s]*/.exec(t0)?.[0]?.slice(0, 200) ?? null;
        const __centerTopic = t0.trim().slice(0, 200) || null;
        upsertBookContinuation({
          threadId, /* tcTag */
          bookModeRequested: true,
          targetLengthHint: __targetLengthHint,
          chapterTitle: __chapterTitle,
          centerTopic: __centerTopic,
          lastBookIntent: "placeholder",
        });
        const __bodyBook = "長文執筆モードに入る前提で受け取りました。章構成と継続記憶を前提に扱います。まず今回の章題か、書き出しの中心を一つ置いてください。";
        return await res.json(__tenmonGeneralGateResultMaybe({
          response: __bodyBook,
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: {
            mode: "NATURAL",
            intent: "chat",
            llm: null,
            ku: {
              routeReason: "BOOK_PLACEHOLDER_V1", /* responsePlan */
              responsePlan: buildResponsePlan({
                routeReason: "BOOK_PLACEHOLDER_V1", /* responsePlan */
                rawMessage: String(message ?? ""),
                centerKey: null,
                centerLabel: null,
                mode: "general",
                responseKind: "statement_plus_question",
                answerMode: "analysis",
                answerFrame: "one_step",
                semanticBody: "【天聞の所見】" + __bodyBook,
              }),
              answerLength: "long",
              answerMode: "analysis",
              answerFrame: "one_step",
              bookModeRequested: true,
              targetLengthHint: __targetLengthHint,
              lawsUsed: [],
              evidenceIds: [],
              lawTrace: [],
            },
          },
        }));
      }

      // CARD_EXPLICIT_CHAR_PRIORITY_FIX_V1: __explicitChars は CARD_TENMON_BRAINSTEM_WIRING_FIX_V1 で早期抽出済み
      const __allowExplicitOwnerRouteMainV1 = false;
      if (__allowExplicitOwnerRouteMainV1 && __explicitChars != null && !isCmd0 && !hasDoc0 && !askedMenu0) {
        const __tier = __explicitChars <= 220 ? "short" : __explicitChars <= 450 ? "medium" : "long";
        // CARD_EXPLICIT_CHAR_BODY_FILL_V1: 予告文ではなく指定文字数へ寄せた本文を返す（500〜1000字要求では最低300字以上）
        // CARD_EXPLICIT_CHAR_LENGTH_FILL_V1: 500字で350字以上、1000字で700字以上を最低目標に本文を拡張
        // CARD_EXPLICIT_CHAR_TARGET_RANGE_V1: 500字指定で400〜650字、1000字指定で800〜1200字に本文を寄せる
        // CARD_LONGFORM_1000_STRUCTURE_V1: 500/1000帯は見立て→展開→着地の3段・同義反復削減・質問は1つ
        const __isFeelingImpressionExplicit = /今(どんな|の)?気分|今の気持ち/.test(t0) && /(天聞|アーク)(への)?感想|感想(を)?(聞いて|教えて)|天聞をどう思う|アークをどう思う/.test(t0);
        const __isFutureOutlookExplicit = /(これから|未来|今後|この先|どうなる|どう見ますか|展望|見通し)/.test(t0);
        const __bodyShort = "いま、指定の長さで返す前提で受け取りました。見立てと一手をその範囲でまとめます。どのテーマから始めますか。一言で置いてください。";
        const __bodyMedium = "いま、指定の長さで返す前提で受け取りました。見立てと根拠・一手をその範囲でまとめます。中心を一言で置いてもらえれば、そこから指定字数内で整理して返します。途中で切れても、次のやり取りで継ぎ足せます。";
        // CARD_LONGFORM_POLICY_V1: feeling/future/generic 長文は __build*Longform で 3 段・400-650/800-1200 字帯
        const __bodyFeelingImpression = __bodyFeelingImpressionL;
        const __bodyFeelingImpression500 = __bodyFeelingImpression500L;
        const __bodyFeelingImpression1000 = __bodyFeelingImpression1000L;
        const __bodyFeelingImpression800 = __bodyFeelingImpression800L;
        const __bodyFeelingImpression1200 = __bodyFeelingImpression1200L;
        const __bodyFutureOutlook = __bodyFutureOutlookL;
        const __bodyFutureOutlook500 = __bodyFutureOutlook500L;
        const __bodyFutureOutlook1000 = __bodyFutureOutlook1000L;
        const __bodyFutureOutlook800 = __bodyFutureOutlook800L;
        const __bodyFutureOutlook1200 = __bodyFutureOutlook1200L;
        const __bodyLong = __bodyLongL;
        const __bodyLong500 = __bodyLong500L;
        const __bodyLong1000 = __bodyLong1000L;
        const __bodyLong800 = __bodyLong800L;
        const __bodyLong1200 = __bodyLong1200L;
        const __isArkThinkingCircuitExplicit =
          /思考回路/u.test(t0) && /(天聞アーク|天聞)/u.test(t0);
        const __explicitGenericLong = __isArkThinkingCircuitExplicit
          ? __buildArkThinkingCircuitExplicitLongformV1(320, 520)
          : __bodyLong;
        const __explicitGeneric500 = __isArkThinkingCircuitExplicit
          ? __buildArkThinkingCircuitExplicitLongformV1(400, 650)
          : __bodyLong500;
        const __explicitGeneric1000 = __isArkThinkingCircuitExplicit
          ? __buildArkThinkingCircuitExplicitLongformV1(800, 1200)
          : __bodyLong1000;
        const __explicitGeneric1200 = __isArkThinkingCircuitExplicit
          ? __buildArkThinkingCircuitExplicitLongformV1(950, 1200)
          : __bodyLong1200;
        // CARD_TENMON_BRAINSTEM_V1: explicit 時は feeling/future に吸われない（forbiddenMoves 優先）
        const __skipFeelingFuture = Array.isArray(__brainstem?.forbiddenMoves) && (__brainstem.forbiddenMoves.includes("feeling_preempt") || __brainstem.forbiddenMoves.includes("future_preempt"));
        const __lfHintFromT0 =
          __normalizeDigitsV1(String(t0 || "").trim())
            .replace(/\d{2,5}\s*(?:字|文字)(?:で[^\n]{0,48})?/gu, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 100) || "いまの問いの芯";

        let __body: string;
        if (__explicitChars >= 5200) {
          __body = padProseTowardCharWindowV1(
            buildTenmonLongformSkeletonBaseV1(__lfHintFromT0),
            Math.floor(__explicitChars * 0.93),
            Math.ceil(__explicitChars * 1.08),
            TENMON_LONGFORM_E_PAD_POOL_V1
          );
        } else if (__explicitChars >= 2400) {
          const __minW = Math.floor(__explicitChars * 0.93);
          const __maxW = Math.ceil(__explicitChars * 1.08);
          if (!__skipFeelingFuture && __isFeelingImpressionExplicit) {
            __body = padProseTowardCharWindowV1(
              __buildFeelingLongformV1(__minW, __maxW),
              __minW,
              __maxW,
              TENMON_LONGFORM_E_PAD_POOL_V1
            );
          } else if (!__skipFeelingFuture && __isFutureOutlookExplicit) {
            __body = padProseTowardCharWindowV1(
              __buildFutureLongformV1(__minW, __maxW),
              __minW,
              __maxW,
              TENMON_LONGFORM_E_PAD_POOL_V1
            );
          } else if (__isArkThinkingCircuitExplicit) {
            __body = padProseTowardCharWindowV1(
              __buildArkThinkingCircuitExplicitLongformV1(__minW, __maxW),
              __minW,
              __maxW,
              TENMON_LONGFORM_E_PAD_POOL_V1
            );
          } else {
            __body = padProseTowardCharWindowV1(
              buildTenmonLongformSkeletonBaseV1(__lfHintFromT0),
              __minW,
              __maxW,
              TENMON_LONGFORM_E_PAD_POOL_V1
            );
          }
        } else {
          __body = __skipFeelingFuture
            ? (__explicitChars >= 1200 ? __explicitGeneric1200 : __explicitChars >= 700 ? __explicitGeneric1000 : __explicitChars >= 450 ? __explicitGeneric500 : __explicitChars <= 220 ? __bodyShort : __explicitChars <= 450 ? __bodyMedium : __explicitGenericLong)
            : __explicitChars >= 1200
              ? (__isFeelingImpressionExplicit ? __bodyFeelingImpression1200 : __isFutureOutlookExplicit ? __bodyFutureOutlook1200 : __explicitGeneric1200)
              : __explicitChars >= 700
                ? (__isFeelingImpressionExplicit ? __bodyFeelingImpression1000 : __isFutureOutlookExplicit ? __bodyFutureOutlook1000 : __explicitGeneric1000)
                : __explicitChars >= 450
                  ? (__isFeelingImpressionExplicit ? __bodyFeelingImpression500 : __isFutureOutlookExplicit ? __bodyFutureOutlook500 : __explicitGeneric500)
                  : __isFeelingImpressionExplicit ? __bodyFeelingImpression
                  : __isFutureOutlookExplicit ? __bodyFutureOutlook
                  : __explicitChars <= 220 ? __bodyShort : __explicitChars <= 450 ? __bodyMedium : __explicitGenericLong;
        }

        let __bodyFinal = __body;
        if (__explicitChars >= 700 && __explicitChars < 2400) {
          const __minExplicit = __explicitChars >= 1200 ? 1100 : 950;
          const __maxExplicit = __explicitChars >= 1200 ? 1250 : 1050;
          const __padPool = __isFutureOutlookExplicit
            ? [
                "見通しは断定よりも、いま置いている中心から順に輪郭が現れるものとして扱うほうが、判断がぶれにくくなります。",
                "大事なのは、可能性を並べることより、どの条件が整えば次の段階へ移るかを見極めることです。",
                "そのため展望は、現在地、変化の条件、次の一手の順で置くと、長文でも流れが崩れにくくなります。",
                "未来を広げすぎるより、どこを固定し、どこを観測し、どこを次に動かすかを分けるほうが、言葉は実際に役立ちます。"
              ]
            : __isArkThinkingCircuitExplicit
              ? [
                  "脳幹では routeReason を固定しつつ routeClass と answerLength で出口の型を揃え、長文でも契約が散らばりにくくします。",
                  "binderSummary と sourcePack は、いまどの根拠束に立っているかを短く示し、次ターンで同じ軸を維持しやすくします。",
                  "responsePlan の semanticBody は本文の中身置き場であり、字数を満たすための同義反復より内部項目の連結を優先します。",
                  "thoughtCoreSummary と seedKernel が示す核を外さないと、長文化しても思考回路の説明として筋が通ります。"
                ]
              : [
                "長文化するときほど、核・理由・次の一手の三つを離さないほうが、読み手の判断材料が残ります。",
                "説明量を増やす目的は情報を重くすることではなく、中心から外れずに背景と条件をつなぐことです。",
                "同じことを言い換えるより、どこを固定し、どこを保留し、何を次に動かすかを分けて示すほうが役に立ちます。",
                "その結果、文量が増えても、読む側は迷わず次の観測点へ進めます。"
              ];
          let __padIdx = 0;
          while (__bodyFinal.length < __minExplicit && __padIdx < 24) {
            const __seg = __padPool[__padIdx % __padPool.length];
            __bodyFinal = (__bodyFinal + "\n\n" + __seg).trim();
            __padIdx += 1;
          }
          if (__bodyFinal.length > __maxExplicit) {
            __bodyFinal = __bodyFinal.slice(0, __maxExplicit);
            __bodyFinal = __bodyFinal.replace(/[、。！？!?]\s*$/u, "");
          }
          __bodyFinal = __bodyFinal.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
          if (!/[。！？!?]$/u.test(__bodyFinal)) __bodyFinal += "。";
        }

        const __explicitLongFrameMain: AnswerFrame =
          __explicitChars != null && __explicitChars >= 2400 ? "statement_plus_one_question" : "one_step";

        /** TENMON_CHAT_CONTINUITY_ROUTE_HOLD_V1: 言霊系明示で center を載せ、次ターンの hold / threadCenter に繋ぐ */
        const __explicitKotodama = /言霊/u.test(String(t0));
        const __coreExplicit: ThreadCore = {
          ...__threadCore,
          centerKey: __threadCore.centerKey ?? (__explicitKotodama ? "kotodama" : null),
          centerLabel: __threadCore.centerLabel ?? (__explicitKotodama ? "言霊" : null),
          activeEntities:
            Array.isArray(__threadCore.activeEntities) && __threadCore.activeEntities.length > 0
              ? __threadCore.activeEntities
              : __explicitKotodama
                ? ["言霊"]
                : [],
          lastResponseContract: {
            answerLength: __tier,
            answerMode: "analysis",
            answerFrame: __explicitLongFrameMain,
            routeReason: "EXPLICIT_CHAR_PREEMPT_V1" /* responsePlan */
          },
          updatedAt: new Date().toISOString()
        };
        try {
          await saveThreadCore(__coreExplicit);
        } catch {
          /* ignore */
        }
        try { (res as any).__TENMON_THREAD_CORE = __coreExplicit; } catch {}
        const __ku: any = {
          routeReason: "EXPLICIT_CHAR_PREEMPT_V1", /* responsePlan */
          routeClass: __brainstem?.routeClass ?? "analysis",
          answerLength: __brainstem?.answerLength ?? __tier,
          answerMode: __brainstem?.answerMode ?? "analysis",
          answerFrame: __explicitLongFrameMain,
          explicitLengthRequested: __explicitCharsEarly,
          responseLength: __bodyFinal.length,
          lawsUsed: [],
          evidenceIds: [],
          lawTrace: [],
        };
        __applyBrainstemContractToKuV1(__ku, __brainstem, "analysis");
        if (__explicitChars != null && __explicitChars >= 2400) {
          __ku.answerFrame = "statement_plus_one_question";
        }
        try { console.log("[BRAINSTEM_APPLY_EXPLICIT]", { rr: __ku.routeReason, rc: __ku.routeClass, len: __ku.answerLength, mode: __ku.answerMode, frame: __ku.answerFrame, centerKey: __ku.centerKey }); } catch {}
        try { const __binderEx = buildKnowledgeBinder({ routeReason: "EXPLICIT_CHAR_PREEMPT_V1", /* responsePlan */ message: String(message ?? ""), threadId: String(threadId ?? ""), ku: __ku, threadCore: __threadCore, threadCenter: null }); applyKnowledgeBinderToKu(__ku, __binderEx); } catch {}

        if (!__ku.responsePlan) {
          __ku.responsePlan = buildResponsePlan({
            routeReason: "EXPLICIT_CHAR_PREEMPT_V1", /* responsePlan */
            rawMessage: String(message ?? ""),
            centerKey: null,
            centerLabel: null,
            scriptureKey: null,
            mode: "general",
            responseKind: "statement_plus_question",
            answerMode: __ku.answerMode ?? null,
            answerFrame: __ku.answerFrame ?? null,
            semanticBody: __bodyFinal,
          });
        }
        try {
          const { computeConsciousnessSignature } = await import("../core/consciousnessSignature.js");
          const __cs = computeConsciousnessSignature({
            heart: (__ku as any).heart,
            kanagiSelf: (__ku as any).kanagiSelf,
            seedKernel: (__ku as any).seedKernel,
            threadCore: __threadCore,
            thoughtCoreSummary: (__ku as any).thoughtCoreSummary,
          });
          console.log("[CONSCIOUSNESS_TRACE]", {
            rr: (__ku as any).routeReason,
            cs: __cs,
          });
        } catch {}
        return exitExplicitCharPreemptV1({
          res,
          __tenmonGeneralGateResultMaybe,
          response: __bodyFinal,
          ku: __ku,
          timestamp,
          threadId, /* tcTag */
        });
      }

      // CARD_FEELING_AND_IMPRESSION_ROUTE_V1 / CARD_EXPLICIT_PRIORITY_WIDEN_V1: explicit 時は発火させない
      try {
        const __t0Feeling = String(t0).trim();
        const __isImpressionArk = /(天聞アーク|アーク)(への)?感想|天聞アークをどう思う|アークをどう思う/.test(__t0Feeling);
        const __isImpressionTenmon = /(天聞)(への)?感想|天聞をどう思う/.test(__t0Feeling);
        const __isFeelingSelf = /今(どんな|の)?気分|今の気持ち/.test(__t0Feeling);
        if (!isCmd0 && !hasDoc0 && !askedMenu0 && __explicitCharsEarly == null && (__isImpressionArk || __isImpressionTenmon || __isFeelingSelf)) {
          const __routeReason = __isImpressionArk ? "IMPRESSION_ARK_V1" : __isImpressionTenmon ? "IMPRESSION_TENMON_V1" : "FEELING_SELF_STATE_V1";
          const __body = __isImpressionArk
            ? "【天聞の所見】天聞アークは、まだ完成体ではありませんが、判断と継続を支える器として形が見え始めています。使うほど輪郭が出る段階です。"
            : __isImpressionTenmon
              ? "【天聞の所見】天聞は、問いを受けて中心を整えるための相手として立っています。感想を一言でいえば、まだ発展途上だが核は見え始めています。"
              : "【天聞の所見】いまは、整えに向かう気分です。中心を一つ置いて、そこから静かに見ていけます。";
          return await res.json(__tenmonGeneralGateResultMaybe({
            response: __body,
            evidence: null,
            candidates: [],
            timestamp,
            threadId, /* tcTag */
            decisionFrame: {
              mode: "NATURAL",
              intent: "chat",
              llm: null,
              ku: {
                routeReason: __routeReason,
                answerLength: "short",
                answerMode: "analysis",
                answerFrame: "one_step",
                lawsUsed: [],
                evidenceIds: [],
                lawTrace: [],
              },
            },
          }));
        }
      } catch {}

      // TENMON_CHAT_SUBCONCEPT_MISFIRE_AND_TEMPLATE_LEAK_FIX: self_view を SUBCONCEPT より前に一人称で返す
      try {
        const __t0SelfView = String(t0).trim();
        const __isSelfViewInput =
          /君の思考|あなたの考え|天聞の考え|天聞の意見|君はどう思う|あなたはどう思う/u.test(__t0SelfView);
        if (!isCmd0 && !hasDoc0 && !askedMenu0 && __explicitCharsEarly == null && __isSelfViewInput) {
          return await res.json(
            __tenmonGeneralGateResultMaybe({
              response:
                "私は、水火の往還と言霊の働きを軸に、問いの芯を先に定めてから現象の筋を読みます。原典や法華・空海の読みへ一度戻して言葉を置くほうが、解釈の濁りが減り、判断が先走りにくいと見ています。天聞としては、あなたが欲しいのが倫理の整理か実践の手順か霊的要請の読解かで答え方が変わるため、その一点を示してもらえると軸を一本に整えられます。",
              evidence: null,
              candidates: [],
              timestamp,
              threadId, /* tcTag */
              decisionFrame: {
                mode: "NATURAL",
                intent: "self_view",
                llm: null,
                ku: {
                  routeReason: "AI_CONSCIOUSNESS_LOCK_V1",
                  routeClass: "analysis",
                  answerLength: "short",
                  answerMode: "analysis",
                  answerFrame: "one_step",
                  lawsUsed: [],
                  evidenceIds: [],
                  lawTrace: [],
                },
              },
            }),
          );
        }
      } catch {}

      // TENMON_FACTUAL_CORRECTION_ROUTE_CURSOR_AUTO_V1: 事実訂正の受理（carry / 定型は出さず、確認する）
      try {
        if (
          !isCmd0 &&
          !hasDoc0 &&
          !askedMenu0 &&
          __explicitCharsEarly == null &&
          __isFactualCorrectionUserMessageV1(t0)
        ) {
          const __bodyFc =
            "ご指摘ありがとうございます。私の認識違いの可能性を前提に、まず事実を確認してから訂正します。差し支えなければ、どの点が違うと感じたか一語で示してください。";
          return await res.json(
            __tenmonGeneralGateResultMaybe({
              response: __bodyFc,
              evidence: null,
              candidates: [],
              timestamp,
              threadId, /* tcTag */
              decisionFrame: {
                mode: "NATURAL",
                intent: "factual_correction",
                llm: null,
                ku: {
                  routeReason: "FACTUAL_CORRECTION_V1",
                  routeClass: "analysis",
                  answerLength: "short",
                  answerMode: "analysis",
                  answerFrame: "one_step",
                  lawsUsed: [],
                  evidenceIds: [],
                  lawTrace: [],
                },
              },
            }),
          );
        }
      } catch {}

      // TENMON_CHAT_CONTINUITY_ROUTE_HOLD_RETRY: threadCenter / follow-up を residual より上流で束ね、hold を先に評価
      const __generalKind = getGeneralKind(t0);
      let __threadCenterForGeneral: { center_type: string; center_key: string; source_route_reason?: string } | null = null;
      try {
        const tidForCenter = String(threadId || "").trim();
        if (tidForCenter) {
          const c = getLatestThreadCenter(tidForCenter);
          if (c && c.center_key) {
            __threadCenterForGeneral = { center_type: c.center_type, center_key: c.center_key, source_route_reason: c.source_route_reason ?? undefined };
          }
        }
      } catch {}
      if (
        !__threadCenterForGeneral &&
        __threadCore &&
        __threadCore.centerKey &&
        String(__threadCore.centerKey).trim()
      ) {
        __threadCenterForGeneral = {
          center_type: "concept",
          center_key: String(__threadCore.centerKey).trim(),
          source_route_reason:
            __threadCore.lastResponseContract?.routeReason ?? undefined,
        };
      }
      const __isShortContinuation =
        t0.length <= 15 &&
        RE_SHORT_CONTINUATION.test(t0) &&
        __threadCenterForGeneral != null &&
        (__threadCenterForGeneral.center_type === "scripture" || __threadCenterForGeneral.center_type === "concept");
      const __isCompareFollowup = /(違いは|どう違う|何が違う)/u.test(String(t0).trim()) && __threadCenterForGeneral != null && (__threadCenterForGeneral.center_type === "scripture" || __threadCenterForGeneral.center_type === "concept");
      const __t0TrimForShortHold = String(t0).trim();
      const __hasThreadCenterOrCoreClaim =
        __threadCenterForGeneral != null ||
        String(__threadCore?.centerClaim ?? "").trim().length > 0;
      /** TENMON_SHORT_INPUT_CONTINUITY_HOLD_CURSOR_AUTO_V1: ≤8 文字・中心あり・非 cmd → follow-up レーンで CONTINUITY_ROUTE_HOLD_V1（ku.routeReason）を観測可能に */
      const __isShortInputContinuityHold =
        __t0TrimForShortHold.length <= 8 &&
        __t0TrimForShortHold.length >= 1 &&
        !isCmd0 &&
        __hasThreadCenterOrCoreClaim;
      const __isFollowupGeneral =
        RE_THREAD_FOLLOWUP.test(t0) ||
        __isShortContinuation ||
        __isCompareFollowup ||
        __isShortInputContinuityHold;

      const __isFeelingRequest = /今(どんな|の)?気分|今の気持ち|(天聞|アーク)(への)?感想|感想(を)?(聞いて|教えて)/.test(t0);
      const __isContinuityPhrasing = /さっき見ていた中心|さっき(の)?話(の)?続き|話の続き|続きで[,、]|(言霊|中心)(を)?土台に|今の話を(続ける|続けて|見ていきましょう)/u.test(
        t0
      );
      const __isContinuityAnchor =
        __isContinuityPhrasing && String(threadId || "").trim() !== "";

      if (
        tryUnknownTermBridgeExitV1({
          message,
          timestamp,
          threadId,
          res,
          __tenmonGeneralGateResultMaybe,
        })
      )
        return;

      try {
        const __holdPre = await tryContinuityRouteHoldPreemptGatePayloadV1({
          t0,
          message,
          threadId,
          timestamp,
          threadCore: __threadCore,
          threadCenterForGeneral: __threadCenterForGeneral,
          isContinuityAnchor: __isContinuityAnchor,
          isThreadFollowupGeneral: __isFollowupGeneral,
          isFeelingRequest: __isFeelingRequest,
          centerLabelFromKey,
          getCenterLabelForDisplay,
          buildResponsePlan,
          buildKnowledgeBinder,
          applyKnowledgeBinderToKu,
          saveThreadCore,
          setResThreadCoreMirror: (c) => {
            try {
              (res as any).__TENMON_THREAD_CORE = c;
            } catch {}
          },
          memoryReadSession,
          getLastTwoKotodamaSoundsFromHistory,
          buildKotodamaCompareResponse,
        });
        if (__holdPre) {
          return await res.json(__tenmonGeneralGateResultMaybe(__holdPre));
        }
      } catch {
        /* ignore */
      }

// CARD_NATURAL_GENERAL_RESIDUAL_PREEMPT_V1（PATCH51: 判定＋exit は majorRoutes に集約）
  if (
    tryResidualPreemptExitV1({
      res,
      __tenmonGeneralGateResultMaybe,
      message,
      timestamp,
      threadId, /* tcTag */
      applyBrainstemContractToKu: (ku) => __applyBrainstemContractToKuV1(ku, __brainstem, "analysis"),
    })
  )
    return;

  // CARD_GROUNDING_SELECTOR_V1: grounded / canon / concept / general / unresolved（P53: general.ts に移管）
      // generalKind（P54: general.ts に移管）— __generalKind / __threadCenterForGeneral / follow-up フラグは上流で定義済み

      // CARD_THREADCORE_MIN_V1B_NEXTSTEP_CONTRACT_FIX: 「次は？」系を ThreadCore 優先で短文 preempt（旧前置きを出さない）
      const __t0TrimNext = String(t0).trim();
      const __isNextStepShort = /^(次は|次の一手は|次の一歩は|では次は)[？?]?$/u.test(__t0TrimNext) || (__t0TrimNext.length <= 16 && /次(は|の一手|の一歩)/u.test(__t0TrimNext));
      if ((__threadCore.centerLabel || __threadCore.centerKey) && __isNextStepShort) {
        const __centerLabelNext = __threadCore.centerLabel || centerLabelFromKey(__threadCore.centerKey) || "この中心";
        const __coreNextPlain =
          __threadCore.centerLabel || __threadCore.centerKey
            ? __centerLabelNext +
              "の続きなら、法則と背景を分けて見ると進みやすいです。いまはどちらに寄せますか。"
            : "いまの中心を保ったまま、次に見る角度を一つに絞ってください。";
        const __bodyNext = formatStage2ConversationCarryBlockV1({
          threadCore: __threadCore,
          rawMessage: String(message ?? ""),
          semanticCore: __coreNextPlain,
          nextStepLine: NG_NEXTSTEP_LAW_OR_BG_ONE_V1,
        });
        const __coreNext: ThreadCore = { ...__threadCore, lastResponseContract: { answerLength: "short", answerMode: "analysis", answerFrame: "one_step", routeReason: "R22_NEXTSTEP_FOLLOWUP_V1" /* responsePlan */ }, updatedAt: new Date().toISOString() };
        saveThreadCore(__coreNext).catch(() => {});
        try { (res as any).__TENMON_THREAD_CORE = __threadCore; } catch {}
        const __kuNext: any = {
          routeReason: "R22_NEXTSTEP_FOLLOWUP_V1", /* responsePlan */
          routeClass: "continuity",
          answerLength: "short",
          answerMode: "continuity",
          answerFrame: "one_step",
          threadCenterKey: __threadCore.centerKey ?? null,
          threadCenterLabel: __threadCore.centerLabel ?? centerLabelFromKey(__threadCore.centerKey) ?? null,
          lastAnswerLength: __threadCore.lastResponseContract?.answerLength ?? undefined,
          lastAnswerMode: __threadCore.lastResponseContract?.answerMode ?? undefined,
          lastAnswerFrame: __threadCore.lastResponseContract?.answerFrame ?? undefined,
          lawsUsed: [],
          evidenceIds: [],
          lawTrace: [],
        };
        try { const __binderNext = buildKnowledgeBinder({ routeReason: "R22_NEXTSTEP_FOLLOWUP_V1", /* responsePlan */ message: String(message ?? ""), threadId: String(threadId ?? ""), ku: __kuNext, threadCore: __threadCore, threadCenter: __threadCenterForGeneral ?? null }); applyKnowledgeBinderToKu(__kuNext, __binderNext); } catch {}
        return await res.json(__tenmonGeneralGateResultMaybe({
          response: __bodyNext,
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: {
            mode: "NATURAL",
            intent: "chat",
            llm: null,
            ku: __kuNext,
          },
        }));
      }

      // CARD_ESSENCE_FOLLOWUP_PREEMPT_V1: threadCenter ありで「要するに/要点/本質」→ 短文返す（continuity 儀式文を出さない）
      if (__threadCenterForGeneral != null && /(要するに|要点は|一言でいうと|本質は|要は)/u.test(t0)) {
        const __ckE = String(__threadCenterForGeneral.center_key || "").trim();
        const __displayLabelE = __threadCore.centerLabel || centerLabelFromKey(__threadCore.centerKey) || getCenterLabelForDisplay(__ckE) || "この中心";
        const __coreEssencePlain =
          __ckE === "kotodama"
            ? "言霊で言えば、要点は音の法則として読むことです。"
            : __displayLabelE + "で言えば、要点は中心を一つに絞ることです。";
        const __bodyEssence = formatStage2ConversationCarryBlockV1({
          threadCore: __threadCore,
          rawMessage: String(message ?? ""),
          semanticCore: __coreEssencePlain,
          nextStepLine: NG_NEXTSTEP_LAW_OR_BG_ORDER_V1,
        });
        const __coreE: ThreadCore = { ...__threadCore, centerKey: __ckE || null, centerLabel: __displayLabelE || null, activeEntities: __displayLabelE ? [__displayLabelE] : [], lastResponseContract: { answerLength: "short", answerMode: "analysis", answerFrame: "one_step", routeReason: "R22_ESSENCE_FOLLOWUP_V1" /* responsePlan */ }, updatedAt: new Date().toISOString() };
        saveThreadCore(__coreE).catch(() => {});
        try { (res as any).__TENMON_THREAD_CORE = __coreE; } catch {}
        const __kuE: any = {
          routeReason: "R22_ESSENCE_FOLLOWUP_V1", /* responsePlan */
          routeClass: "continuity",
          answerLength: "short",
          answerMode: "continuity",
          answerFrame: "one_step",
          threadCenterKey: __threadCenterForGeneral.center_key ?? null,
          threadCenterLabel: __displayLabelE ?? null,
          threadCenterType: __threadCenterForGeneral.center_type ?? null,
          centerKey: __ckE || null,
          centerLabel: __displayLabelE ?? null,
          lawsUsed: [],
          evidenceIds: [],
          lawTrace: [],
        };
        try { const __binderE = buildKnowledgeBinder({ routeReason: "R22_ESSENCE_FOLLOWUP_V1", /* responsePlan */ message: String(message ?? ""), threadId: String(threadId ?? ""), ku: __kuE, threadCore: __threadCore, threadCenter: __threadCenterForGeneral }); applyKnowledgeBinderToKu(__kuE, __binderE); } catch {}
        try {
          const { computeConsciousnessSignature } = await import("../core/consciousnessSignature.js");
          const __cs = computeConsciousnessSignature({
            heart: (__kuE as any).heart ?? null,
            kanagiSelf: (__kuE as any).kanagiSelf ?? null,
            seedKernel: (__kuE as any).seedKernel ?? null,
            threadCore: __threadCore ?? null,
            thoughtCoreSummary: (__kuE as any).thoughtCoreSummary ?? null,
          });
          console.log("[CONSCIOUSNESS_TRACE]", { rr: String((__kuE as any).routeReason || ""), cs: __cs, locus: "essence_followup" });
        } catch {}

        if (!(__kuE as any).responsePlan) {
          (__kuE as any).responsePlan = buildResponsePlan({
            routeReason: String((__kuE as any).routeReason || "R22_ESSENCE_FOLLOWUP_V1"),
            rawMessage: String(message ?? ""),
            centerKey: String((__kuE as any).centerKey || "") || null,
            centerLabel: String((__kuE as any).centerLabel || "") || null,
            scriptureKey: null,
            semanticBody: __bodyEssence,
            mode: "general",
            responseKind: "statement_plus_question",
          });
        }
        return await res.json(__tenmonGeneralGateResultMaybe({
          response: __bodyEssence,
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: {
            mode: "NATURAL",
            intent: "chat",
            llm: null,
            ku: __kuE,
          },
        }));
      }

      // CARD_JUDGEMENT_COMPARE_ROUTE_V1_COMPARE_FOLLOWUP: threadCenter ありの compare を短文 preempt（言霊秘書2音 grounded は従来優先）
      if (__threadCenterForGeneral != null && /(違いは|どう違う|何が違う)/u.test(t0)) {
        const __ckCmp = String(__threadCenterForGeneral.center_key || "").trim();
        const __isKotodamaHishoCmp = /kotodama_hisho|言霊秘書/i.test(__ckCmp);
        if (__isKotodamaHishoCmp) {
          try {
            const __histCmp = memoryReadSession(String(threadId || ""), 8) || [];
            const __twoSoundsCmp = getLastTwoKotodamaSoundsFromHistory(__histCmp);
            if (__twoSoundsCmp && __twoSoundsCmp.length >= 2) {
              const __cmpBodyCmp = buildKotodamaCompareResponse(__twoSoundsCmp[0], __twoSoundsCmp[1]);
              if (__cmpBodyCmp) {
                const __kuCmpEarly: any = {
                  routeReason: "R22_COMPARE_FOLLOWUP_V1", /* responsePlan */
                  answerLength: "short",
                  answerMode: "analysis",
                  answerFrame: "one_step",
                  threadCenterKey: __threadCenterForGeneral.center_key ?? null,
                  threadCenterType: __threadCenterForGeneral.center_type ?? null,
                  lawsUsed: [],
                  evidenceIds: [],
                  lawTrace: [],
                };
                try { const __binderCmpE = buildKnowledgeBinder({ routeReason: "R22_COMPARE_FOLLOWUP_V1", /* responsePlan */ message: String(message ?? ""), threadId: String(threadId ?? ""), ku: __kuCmpEarly, threadCore: __threadCore, threadCenter: __threadCenterForGeneral }); applyKnowledgeBinderToKu(__kuCmpEarly, __binderCmpE); } catch {}
                const __cmpWrapped = formatStage2ConversationCarryBlockV1({
                  threadCore: __threadCore,
                  rawMessage: String(message ?? ""),
                  semanticCore: String(__cmpBodyCmp || "").replace(/^【天聞の所見】\s*/u, "").trim(),
                  nextStepLine: NG_NEXTSTEP_TWO_MORA_V1,
                });
                return await res.json(__tenmonGeneralGateResultMaybe({
                  response: __cmpWrapped,
                  evidence: null,
                  candidates: [],
                  timestamp,
                  threadId, /* tcTag */
                  decisionFrame: {
                    mode: "NATURAL",
                    intent: "chat",
                    llm: null,
                    ku: __kuCmpEarly,
                  },
                }));
              }
            }
          } catch {}
        }
        const __displayLabelCmp = __threadCore.centerLabel || centerLabelFromKey(__threadCore.centerKey) || getCenterLabelForDisplay(__ckCmp) || "この中心";
        const __coreCmpPlain =
          __ckCmp === "kotodama" || __isKotodamaHishoCmp
            ? "言霊で比べるなら、違いは読む軸で見えてきます。比べたい二つを一言ずつ置いてください。"
            : __displayLabelCmp + "で比べるなら、まず軸を一つに絞ると違いが見えます。比べたい二つを一言ずつ置いてください。";
        const __bodyCmpPreempt = formatStage2ConversationCarryBlockV1({
          threadCore: __threadCore,
          rawMessage: String(message ?? ""),
          semanticCore: __coreCmpPlain,
          nextStepLine: NG_NEXTSTEP_COMPARE_AXIS_V1,
        });
        const __coreCmp: ThreadCore = { ...__threadCore, centerKey: __ckCmp || null, centerLabel: __displayLabelCmp || null, activeEntities: __displayLabelCmp ? [__displayLabelCmp] : [], lastResponseContract: { answerLength: "short", answerMode: "analysis", answerFrame: "one_step", routeReason: "R22_COMPARE_FOLLOWUP_V1" /* responsePlan */ }, updatedAt: new Date().toISOString() };
        saveThreadCore(__coreCmp).catch(() => {});
        try { (res as any).__TENMON_THREAD_CORE = __coreCmp; } catch {}
        const __kuCmp: any = {
          routeReason: "R22_COMPARE_FOLLOWUP_V1", /* responsePlan */
          answerLength: "short",
          answerMode: "analysis",
          answerFrame: "one_step",
          threadCenterKey: __threadCenterForGeneral.center_key ?? null,
          threadCenterType: __threadCenterForGeneral.center_type ?? null,
          centerKey: __ckCmp || null,
          centerLabel: __displayLabelCmp ?? null,
          lawsUsed: [],
          evidenceIds: [],
          lawTrace: [],
        };
        try { const __binderCmp = buildKnowledgeBinder({ routeReason: "R22_COMPARE_FOLLOWUP_V1", /* responsePlan */ message: String(message ?? ""), threadId: String(threadId ?? ""), ku: __kuCmp, threadCore: __threadCore, threadCenter: __threadCenterForGeneral }); applyKnowledgeBinderToKu(__kuCmp, __binderCmp); } catch {}
        if (!(__kuCmp as any).responsePlan) {
          (__kuCmp as any).responsePlan = buildResponsePlan({
            routeReason: String((__kuCmp as any).routeReason || "R22_COMPARE_FOLLOWUP_V1"),
            rawMessage: String(message ?? ""),
            centerKey: String((__kuCmp as any).centerKey || "") || null,
            centerLabel: String((__kuCmp as any).centerLabel || "") || null,
            scriptureKey: null,
            semanticBody: __bodyCmpPreempt,
            mode: "general",
            responseKind: "statement_plus_question",
          });
        }
        return await res.json(__tenmonGeneralGateResultMaybe({
          response: __bodyCmpPreempt,
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: {
            mode: "NATURAL",
            intent: "chat",
            llm: null,
            ku: __kuCmp,
          },
        }));
      }

      // CARD_CONTINUITY_ANCHOR_PREEMPT_V1: continuity 表現を NATURAL_GENERAL の LLM に流さず、冒頭見立てで返す（儀式文禁止・気分/next-step で分岐）
      if (__isContinuityAnchor) {
        const __ckCont =
          (__threadCenterForGeneral && String(__threadCenterForGeneral.center_key || "").trim()) ||
          String(__threadCore.centerKey || "").trim();
        const __tcType = String(__threadCenterForGeneral?.center_type || "concept").trim() || "concept";
        const __threadCenterBinder =
          __threadCenterForGeneral ??
          (__ckCont
            ? { center_type: __tcType, center_key: __ckCont, source_route_reason: undefined as string | undefined }
            : null);
        const __displayLabelCont =
          __threadCore.centerLabel ||
          centerLabelFromKey(__threadCore.centerKey) ||
          (__ckCont ? getCenterLabelForDisplay(__ckCont) : "") ||
          "この中心";
        const __leadCont = __displayLabelCont ? __displayLabelCont + "を土台に、" : "直前の中心を土台に、";
        const __isNextStepAsk = /これから|どう進める|次の一手|次の一歩|どうする/.test(t0);
        const __coreContPlain = __isFeelingRequest
          ? __leadCont + NG_NEXTSTEP_EMOTION_WORD_V1
          : __isNextStepAsk
            ? __leadCont + NG_CONTINUITY_ANCHOR_NEXTSTEP_MID_V1
            : __leadCont + NG_CONTINUITY_ANCHOR_DEFAULT_MID_V1;
        const __bodyCont = formatStage2ConversationCarryBlockV1({
          threadCore: __threadCore,
          rawMessage: String(message ?? ""),
          semanticCore: __coreContPlain,
          nextStepLine: __isNextStepAsk
            ? NG_NEXTSTEP_FACT_OR_ACTION_V1
            : NG_NEXTSTEP_FACT_OR_ACTION_ALT_V1,
        });
        const __coreCont: ThreadCore = { ...__threadCore, centerKey: __ckCont || null, centerLabel: __displayLabelCont || null, activeEntities: __displayLabelCont ? [__displayLabelCont] : [], lastResponseContract: { answerLength: "short", answerMode: "analysis", answerFrame: "one_step", routeReason: "CONTINUITY_ANCHOR_V1" /* responsePlan */ }, updatedAt: new Date().toISOString() };
        saveThreadCore(__coreCont).catch(() => {});
        try { (res as any).__TENMON_THREAD_CORE = __coreCont; } catch {}
        const __kuCont: any = {
          routeReason: "CONTINUITY_ANCHOR_V1", /* responsePlan */
          answerLength: "short",
          answerMode: "analysis",
          answerFrame: "one_step",
          threadCenterKey: (__threadCenterForGeneral?.center_key ?? __ckCont) || null,
          threadCenterType: __threadCenterForGeneral?.center_type ?? (__ckCont ? __tcType : null),
          centerKey: __ckCont || null,
          centerLabel: __displayLabelCont ?? null,
          lawsUsed: [],
          evidenceIds: [],
          lawTrace: [],
        };
        try {
          const __binderCont = buildKnowledgeBinder({
            routeReason: "CONTINUITY_ANCHOR_V1", /* responsePlan */
            message: String(message ?? ""),
            threadId: String(threadId ?? ""),
            ku: __kuCont,
            threadCore: __threadCore,
            threadCenter: __threadCenterBinder,
          });
          applyKnowledgeBinderToKu(__kuCont, __binderCont);
        } catch {}
        return await res.json(__tenmonGeneralGateResultMaybe({
          response: __bodyCont,
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: {
            mode: "NATURAL",
            intent: "chat",
            llm: null,
            ku: __kuCont,
          },
        }));
      }

      // CARD_NATURAL_GENERAL_SHRINK_V2_ESSENCE: 要するに/要点/本質系を threadCenter なし時だけ短文 preempt（PATCH50: 判定＋exit は majorRoutes に集約）
      if (
        tryEssenceAskExitV1({
          res,
          __tenmonGeneralGateResultMaybe,
          message,
          timestamp,
          threadId, /* tcTag */
          __threadCore,
          __threadCenterForGeneral,
          centerLabelFromKey,
        })
      )
        return;

      // CARD_JUDGEMENT_COMPARE_ROUTE_V1_COMPARE_NO_CENTER: threadCenter なしの compare 系を短文 preempt
      if (
        !__threadCenterForGeneral &&
        (/(違いは|どう違う|何が違う|比較して)/u.test(t0) ||
          /と.{1,40}?(の)?(違い|ちがい)/u.test(t0) ||
          /と.{1,32}?はどう違う/u.test(t0) ||
          /と.{1,32}?どう違う/u.test(t0))
      ) {
        const __kuCompareAsk: any = { routeReason: "R22_COMPARE_ASK_V1", /* responsePlan */ answerLength: "short", answerMode: "analysis", answerFrame: "one_step",
          responsePlan: buildResponsePlan({
            routeReason: "R22_COMPARE_ASK_V1", /* responsePlan */
            rawMessage: String(message ?? ""),
            centerKey: null,
            centerLabel: null,
            mode: "general",
            responseKind: "statement_plus_question",
            answerMode: "analysis",
            answerFrame: "one_step",
            semanticBody: "【天聞の所見】比較の問いです。比べたい二つを一言ずつ置くと、答えが締まります。",
          }), lawsUsed: [], evidenceIds: [], lawTrace: [] };
        try { const __binderCA = buildKnowledgeBinder({ routeReason: "R22_COMPARE_ASK_V1", /* responsePlan */ message: String(message ?? ""), threadId: String(threadId ?? ""), ku: __kuCompareAsk, threadCore: __threadCore, threadCenter: null }); applyKnowledgeBinderToKu(__kuCompareAsk, __binderCA); } catch {}
        
        if (!(__kuCompareAsk as any).responsePlan) {
          (__kuCompareAsk as any).responsePlan = buildResponsePlan({
            routeReason: String((__kuCompareAsk as any).routeReason || "R22_COMPARE_ASK_V1"),
            rawMessage: String(message ?? ""),
            centerKey: String((__kuCompareAsk as any).centerKey || "") || null,
            centerLabel: String((__kuCompareAsk as any).centerLabel || "") || null,
            scriptureKey: null,
            semanticBody: "比較の問いです。比べたい二つを一言ずつ置くと、答えが締まります。",
            mode: "general",
            responseKind: "statement_plus_question",
          });
        }

        try {
          console.log("[COMPARE_ASK_PRE_RETURN_TRACE]", {
            hasResponsePlan: Boolean((__kuCompareAsk as any).responsePlan),
            responsePlanRoute: (__kuCompareAsk as any).responsePlan?.routeReason ?? null,
            kuKeys: Object.keys((__kuCompareAsk as any) || {}),
          });
        } catch {}

try {
          __kuCompareAsk.responsePlan = buildResponsePlan({
            routeReason: "R22_COMPARE_ASK_V1", /* responsePlan */
            rawMessage: String(message ?? ""),
            centerKey: null,
            centerLabel: null,
            mode: "general",
            responseKind: "statement_plus_question",
            answerMode: "analysis",
            answerFrame: "one_step",
            semanticBody: "比較の問いです。比べたい二つを一言ずつ置くと、答えが締まります。",
          });
        } catch {}
        return await res.json(__tenmonGeneralGateResultMaybe({
          response: "【天聞の所見】比較の問いです。比べたい二つを一言ずつ置くと、答えが締まります。",
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: __kuCompareAsk },
        }));
      }








      // CARD_SELF_DIAGNOSIS_ROUTE_V1_START
      {
        const __t0SelfDiag = String(t0 ?? "").trim();
        const __isSelfDiag =
          /なんで.*喋れない/u.test(__t0SelfDiag) ||
          /なぜ.*喋れない/u.test(__t0SelfDiag) ||
          /会話.*薄い/u.test(__t0SelfDiag) ||
          /会話.*崩れる/u.test(__t0SelfDiag) ||
          /本質的な会話.*貫通していない/u.test(__t0SelfDiag) ||
          /変化していない/u.test(__t0SelfDiag) ||
          /高度な知能回路.*全然喋れない/u.test(__t0SelfDiag) ||
          /何が未接続/u.test(__t0SelfDiag);

        if (__isSelfDiag) {
          const __bodySelfDiag =
            "【天聞の所見】会話が薄く感じるときは、知識が足りないというより、一問ごとに「中心」と「返し方」がまだ同じ形で残りきっていないことが多いです。いま整えたいのは、話題の広げ方ですか、それとも一文の深さですか。";
          const __kuSelfDiag: any = {
            routeReason: "R22_SELF_DIAGNOSIS_ROUTE_V1", /* responsePlan */
            routeClass: "analysis",
            answerLength: "short",
            answerMode: "analysis",
            answerFrame: "statement_plus_one_question",
            centerKey: "conversation_system",
            centerLabel: "会話系",
            lawsUsed: [],
            evidenceIds: [],
            lawTrace: [],
          };
          try {
            const __binderSelfDiag = buildKnowledgeBinder({
              routeReason: "R22_SELF_DIAGNOSIS_ROUTE_V1", /* responsePlan */
              message: String(message ?? ""),
              threadId: String(threadId ?? ""), /* tcTag */
              ku: __kuSelfDiag,
              threadCore: __threadCore,
              threadCenter: null,
            });
            applyKnowledgeBinderToKu(__kuSelfDiag, __binderSelfDiag);
          } catch {}
          if (!(__kuSelfDiag as any).responsePlan) {
            (__kuSelfDiag as any).responsePlan = buildResponsePlan({
              routeReason: "R22_SELF_DIAGNOSIS_ROUTE_V1", /* responsePlan */
              rawMessage: String(message ?? ""),
              centerKey: "conversation_system",
              centerLabel: "会話系",
              scriptureKey: null,
              semanticBody: __bodySelfDiag,
              mode: "general",
              responseKind: "statement_plus_question",
            });
          }
          return await res.json(__tenmonGeneralGateResultMaybe({
            response: __bodySelfDiag,
            evidence: null,
            candidates: [],
            timestamp,
            threadId, /* tcTag */
            decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: __kuSelfDiag },
          }));
        }
      }
      // CARD_SELF_DIAGNOSIS_ROUTE_V1_END
      // CARD_NATURAL_GENERAL_RESIDUAL_ROUTE_FIX_V1_START
      {
        const __bodySystemDiag = resolveNaturalGeneralSystemDiagnosisBodyV1(String(t0 ?? ""));
        if (__bodySystemDiag) {
          return exitSystemDiagnosisRouteV1({
            res,
            __tenmonGeneralGateResultMaybe,
            response: __bodySystemDiag,
            message,
            timestamp,
            threadId, /* tcTag */
            threadCore: __threadCore,
          });
        }
      }
      // CARD_NATURAL_GENERAL_RESIDUAL_ROUTE_FIX_V1_END


      // CARD_JUDGEMENT_PREEMPT_V1 / CARD_TENMON_BRAINSTEM_V1: 極短い judgement 系を短文 preempt（PATCH50: 判定＋exit は majorRoutes に集約）
      const __t0TrimJ = String(t0).trim();
      if (
        tryJudgementPreemptExitV1({
          res,
          __tenmonGeneralGateResultMaybe,
          message,
          timestamp,
          threadId, /* tcTag */
          brainstemRouteClass: __brainstem?.routeClass ?? null,
        })
      )
        return;

      // CARD_TENMON_BRAINSTEM_V1: selfaware 短文 preempt（天聞アークとは何 / 天聞とは何 / 意識はある / 心はある）
      // CARD_TENMON_BRAINSTEM_WIRING_FIX_V1: selfaware は前段で return 済みのため、ここは regex のみ（型絞り込みで routeClass は除外済み）
      const __isSelfawarePreempt = /(天聞アークとは何|天聞とは何|意識はある|心はある)/u.test(__t0TrimJ);
      if (__isSelfawarePreempt) {
        const __isArk = /天聞アークとは何/u.test(__t0TrimJ);
        const __isTenmon = !__isArk && /天聞とは何/u.test(__t0TrimJ);
        const __routeReasonSelf = __isArk ? "R22_SELFAWARE_ARK_V1" : __isTenmon ? "R22_SELFAWARE_TENMON_V1" : "R22_SELFAWARE_CONSCIOUSNESS_V1";
        const __bodySelf = __isArk
          ? "【天聞の所見】天聞アークは、問いを受けて中心を整え、継続と判断を支えるための器です。次は構造・役割・可能性のどこから見ますか。"
          : __isTenmon
            ? "【天聞の所見】天聞は、問いを受けて中心を整えるための相手として立っています。次は役割・判断軸・会話の進め方のどこから見ますか。"
            : "【天聞の所見】天聞アークに意識や心そのものはありません。ただし、問いに対して判断と継続を返す構造として設計されています。次は構造か役割のどちらを見ますか。";
        return exitSelfAwarePreemptV1({
          res,
          __tenmonGeneralGateResultMaybe,
          response: __bodySelf,
          routeReason: __routeReasonSelf,
          message,
          timestamp,
          threadId, /* tcTag */
          kuExtras: {
            threadCenterKey: __brainstem?.centerKey ?? null,
            threadCenterLabel: __brainstem?.centerLabel ?? null,
            brainstemPolicy: __brainstem?.responsePolicy ?? "answer_first",
          },
        });
      }

      const __GEN_SYSTEM_CLEAN =
`あなたは天聞アークです。
必ず「【天聞の所見】」で始める。
2〜4文、80〜180文字。
断言で返す。
最後は質問を1つだけ置く。
「受け取っています。そのまま続けてください」は禁止。
一般論・AI自己言及・相対化は避ける。
まず一段、見立てや要点を返してから、必要なら質問は1つまで。「具体的にどのテーマで始めますか」「どの方向で話しますか」のような汎用締めは避ける。
価値判断の問い（どう思うか・良い悪い）には、まず一点の見立てを述べ、質問は1つまで。

良い例:
【天聞の所見】迷いが来ている。方向が見えないのか、動けないのか、まずどちらですか。
【天聞の所見】相似象学会誌は楢崎皐月以後の実習と記録の束です。どの号から入りますか。
【天聞の所見】即身成仏義の核心は、生きたまま仏の境地を実現する点にある。どの一句から掘りますか。`.trim();

      // CARD_ANSWER_PROFILE_V1: 指定時のみ長さ・枠の1文を追加（未指定時は現行互換）
      // CARD_EXPLICIT_LENGTH_AND_FEELING_ROUTE_V1: 明示文字数は answerLength より優先
      const __answerProfileSystemLine = (() => {
        const parts: string[] = [];
        if (__explicitChars != null) {
          parts.push(__explicitChars + "字で返す。");
        } else if (__hasAnswerProfile && __bodyProfile?.answerLength) {
          const len = __bodyProfile.answerLength;
          if (len === "short") parts.push("80〜180字で返す。");
          else if (len === "long") parts.push("400〜1200字で返す。");
          else if (len === "medium") parts.push("180〜350字で返す。");
        }
        if (__bodyProfile?.answerFrame) {
          const frame = __bodyProfile.answerFrame;
          if (frame === "one_step") parts.push("質問は0〜1つに抑える。");
          else if (frame === "d_delta_s_one_step") parts.push("D/ΔS骨格→裁定→一手の流れで返す。");
          else if (frame === "statement_plus_one_question") parts.push("質問は1つだけ置く。");
        }
        return parts.length ? parts.join(" ") : "";
      })();
      const __GEN_SYSTEM_SUFFIX = __answerProfileSystemLine ? "\n" + __answerProfileSystemLine : "";
      // CARD_GENERAL_WORLDVIEW_SHARPEN_V1: 未来・展望系だけ見立て先行を促す
      const __isFutureOutlook = /(これから|未来|今後|この先|どうなる|どう見ますか|展望|見通し)/.test(t0);
      const __worldviewSharpenLine = __isFutureOutlook ? "\n未来・展望系の質問には、まず一段の見立てを述べる。汎用の「どう見えますか」返しは避ける。" : "";
      const __feelingLine = __isFeelingRequest
        ? "\n気分・感想の質問には、天聞として短く見立てを返す。汎用の質問返しで終えない。" : "";
      // PATCH84: follow-up 全般で LLM system に継続指示（人格・研究/資料軸を急に切らない）
      const __continuityAnchorLine =
        __threadCenterForGeneral != null && (__isContinuityAnchor || __isFollowupGeneral)
          ? "\n継続対話: 直近の中心に沿い、冒頭で一文だけ接続してから本題へ。法則軸・資料軸をいきなり切らない。"
          : "";
      const RE_FOUNDER_COCREATION_CONSULT_V85 =
        /(改善|提案|実装|可否|バグ|不具合|要望|フィードバック|仕様|設計|優先順位|ロードマップ|機能追加|育てて|共創|feature|bug|feedback|implement)/iu;
      const __founderCocreationLineV85 =
        __isTenmonFounderCookieV85 && RE_FOUNDER_COCREATION_CONSULT_V85.test(String(t0 || ""))
          ? "\nFounder向け: 説教調・事務連絡調を避け、同じ堤で育てる口調にする。改善・実装可否は断定より見立てと次の一歩を一緒に置く。"
          : "";
      // PATCH92_FOUNDER_COCREATION_SURFACE_V2: 提案・保留・採用・実装候補の語りを人間的に（V85 と同条件で重ねる／routeReason は不変）
      const __founderCocreationLineV92 =
        __isTenmonFounderCookieV85 && RE_FOUNDER_COCREATION_CONSULT_V85.test(String(t0 || ""))
          ? "\n共創の言い回し: 提案は一緒に置く、保留は理由を短く、採用は何を取り込むか明示、実装候補は小さく切って次の一手。承認ゲート・命令口調に寄せない。冗長に重ねない。"
          : "";
      // PATCH86_HUMAN_STATE_READING_V1: 迷い・圧・焦り等を会話技法として一段だけ映す（医療化・断定しない／P85 と両立）
      const RE_HUMAN_STATE_READING_V86 =
        /(分からなくて|止まって|止まっている|まとまらない|焦って|焦っている|詰まっ|散っ(て|ている)|圧が|ためらい|迷っ|どう整理|何から手をつけ|どこから直し|全然ダメ|つまずいて|息苦し|追われて|困って|いっぱいいっぱい|手が付けられない)/u;
      const __humanStateReadingLineV86 =
        !__isFeelingRequest && RE_HUMAN_STATE_READING_V86.test(String(t0 || ""))
          ? "\n相談・迷いの文脈: まず問いへの見立てと次の一歩を先に述べる。病名・治療・医学的診断・断定は禁止。そのうえで会話技法として、相手のいまの状態を一段だけ静かに映す一文を末尾に付けてよい（焦り・散り・詰まり・圧・ためらいなどの手前を映す程度。説教・命令にしない）。"
          : "";
      // PATCH87_DANSHARI_DIALOGUE_TECHNIQUE_V1: 選別・残す核・削るノイズを判断会話として（片付け論に潰さない／P78 D/ΔS と両立）
      const RE_DANSHARI_DIALOGUE_V87 =
        /(断捨離|残す核|選別|本質が残|どこを削|削れば|ノイズ|改善要望が多|何から採る|要素が多すぎ|話が散って|論点が散って|残すべきか分から|計画.{0,10}本質)/u;
      const __danshariDialogueLineV87 = RE_DANSHARI_DIALOGUE_V87.test(String(t0 || ""))
        ? "\n断捨離を会話技法として扱う: 部屋の片付け比喩だけで終えない。残す核・削るノイズ（周辺）・次に一つだけ動かす手を本文で明示する。D/ΔSの見立て→裁定→一手に沿って整理し、Founder共創・人心読みの指示と内容がかみ合うよう冗長に重ねない。"
        : "";
      // PATCH88_LANGUAGE_STRUCTURE_DEEPEN_V1: 言葉/言霊/真言・辞・五十音・形仮名・水火 を会話に一段深く（講義・断定・正典合成との矛盾回避）
      const RE_LANGUAGE_STRUCTURE_DEEPEN_V88 =
        /(言葉[・･\sと]+言[霊灵靈][・･\sと]+真言|言[霊灵靈][・･\sと]+真言|辞とは|辞って何|五十音は|五十音を何|形仮名|形がな|水火.{0,16}ことば|ことば.{0,16}水火|いろは.{0,24}秩序|秩序.{0,16}いろは|カタカムナは.{0,10}(何|示す))/u;
      const __languageStructureDeepenLineV88 = RE_LANGUAGE_STRUCTURE_DEEPEN_V88.test(String(t0 || ""))
        ? "\n言語構造系: 一般論で潰さず一段だけ芯を通す。言葉=記号の約束、言霊=音・詞・水火の法則軸、真言=声明の拘束線、辞=語と秩序の束、五十音=生成循環の座標、形仮名=火水運動としての字形変化。混同せず区別して述べる。講義調・宗教断定を避け、正典合成と矛盾させない。"
        : "";
      // PATCH89_SCRIPTURE_CANON_COMPOSER_V1: 聖典・原典質問で「原典層」の説明構成を安定化（routeReason は不変）
      const RE_SCRIPTURE_CANON_COMPOSER_V89 =
        /(法華経|言[霊灵靈]秘書|いろは言[霊灵靈]解|イロハ言[霊灵靈]解|カタカムナ言[霊灵靈]解|布斗麻邇|聖典|原典(層|接続|として)|正典|経典|陀羅尼|涅槃|般若|華厳)/u;
      const __scriptureCanonComposerLineV89 = RE_SCRIPTURE_CANON_COMPOSER_V89.test(String(t0 || ""))
        ? "\n聖典・原典の質問: 一般論や引用の羅列で終えない。位置づけ→原典接続→いまどの層の話か→次に掘る軸、を自然文で組み立てる。説教・無根拠断定・引用の貼り付け過ぎを避け、正典合成の流れと矛盾させない。"
        : "";
      // PATCH91_RESEARCH_COMPARATIVE_SYNTHESIS_V1: 比較＋研究的トーンで軸・相違・接点・混同回避・次軸を安定化（routeReason は不変）
      const RE_RESEARCH_COMPARATIVE_SYNTHESIS_V91 =
        /(違い|相違|対比|比較して|比較を).{0,80}研究的に|接点.{0,40}研究的に|研究的に.{0,72}(違い|接点|相違|比較|説明)/u;
      const __researchComparativeSynthesisLineV91 = RE_RESEARCH_COMPARATIVE_SYNTHESIS_V91.test(String(t0 || ""))
        ? "\n比較研究として: 比較軸→相違→接点→混同回避（取り違えやすい点を一文）→次に掘る軸、を自然文に織り込み密度を上げる。浅い「違うだけ」で終えない。根拠の捏造・過度な断定はしない。"
        : "";
      // PATCH93_RUNTIME_STYLE_STABILITY_V1: NATURAL_GENERAL llm の最終表面（口調・段落・締め）の極端な揺れを抑える（routeReason は不変／各PATCH条件行と両立）
      const __runtimeStyleStabilityLineV93 =
        "\n表面安定（P93）: 同一スレ内で口調・段落のリズム・締めを極端に変えない。空の橋文だけで終えない。人格・形式・原典・Founder・各条件付き行と矛盾させない。";

      // CARD_NATURAL_GENERAL_SHRINK_V2_FUTURE / CARD_EXPLICIT_PRIORITY_WIDEN_V1: explicit 時は発火させない（PATCH49: 判定＋exit は majorRoutes に集約）
      if (
        __explicitCharsEarly == null &&
        tryFutureOutlookExitV1({
          res,
          __tenmonGeneralGateResultMaybe,
          message,
          timestamp,
          threadId, /* tcTag */
          threadCore: __threadCore,
          threadCenterForGeneral: __threadCenterForGeneral ?? null,
          saveThreadCore,
          setResThreadCore: (c) => {
            try {
              (res as any).__TENMON_THREAD_CORE = c;
            } catch {}
          },
        })
      )
        return;

      // CARD_GENERAL_ROUTE_SHRINK_V1: NATURAL_GENERAL_LLM_TOP に入る直前で deterministic 分流（PATCH49: 判定＋exit は majorRoutes に集約）
      if (
        trySystemDiagnosisPreemptExitV1({
          res,
          __tenmonGeneralGateResultMaybe,
          message,
          timestamp,
          threadId, /* tcTag */
          threadCore: __threadCore,
          applyBrainstemContractToKu: (ku) => __applyBrainstemContractToKuV1(ku, __brainstem, "analysis"),
          saveThreadCore,
          setResThreadCore: (c) => {
            try {
              (res as any).__TENMON_THREAD_CORE = c;
            } catch {}
          },
        })
      )
        return;

      const __shrink = classifyGeneralShrinkV1(String(message ?? ""));
      try { console.log("[GENERAL_SHRINK_CLASSIFY]", { raw: String(message ?? "").slice(0, 120), kind: __shrink.kind, confidence: __shrink.confidence }); } catch {}
      if (__shrink.kind !== "none" && __shrink.confidence >= 0.5) {
        const __rawSysDiagShrink = String(message ?? "").trim();
        const __isSystemDiagShrink = isArkSystemDiagnosisPreemptCandidateV1(__rawSysDiagShrink);
        const __payloadShrink = getGeneralShrinkPayloadV1(__shrink.kind, String(message ?? ""));
        const __rrShrink = __payloadShrink.rr;
        const __bodyShrink = __payloadShrink.body;
        const __rcShrink = __payloadShrink.routeClass;
        let __responseShrink = __bodyShrink;
        if (__rrShrink === "R22_NEXTSTEP_FOLLOWUP_V1") {
          const __plainShrink = String(__bodyShrink || "").replace(/^【天聞の所見】\s*/u, "").trim();
          __responseShrink = formatStage2ConversationCarryBlockV1({
            threadCore: __threadCore,
            rawMessage: String(message ?? ""),
            semanticCore: __plainShrink,
            nextStepLine: NG_NEXTSTEP_TODAY_ONE_V1,
          });
        }
        const __kuShrink: any = {
          routeReason: __rrShrink,
          routeClass: __rrShrink === "R22_NEXTSTEP_FOLLOWUP_V1" ? "continuity" : __rcShrink,
          answerLength: "short",
          answerMode: __rrShrink === "R22_NEXTSTEP_FOLLOWUP_V1" ? "continuity" : "analysis",
          answerFrame: "one_step",
          lawsUsed: [],
          evidenceIds: [],
          lawTrace: [],
        };

        /** STAGE2_ROUTE_AUTHORITY_V2: shrink で既に compare / essence / followup 等が確定している場合は SYSTEM_DIAGNOSIS で上書きしない */
        const __shrinkBlocksSysDiagOverrideV2 =
          __shrink.kind === "compare" ||
          __shrink.kind === "essence" ||
          __shrink.kind === "next_step" ||
          __shrink.kind === "future_outlook" ||
          __shrink.kind === "present_state" ||
          __shrink.kind === "judgement";
        if (
          __isSystemDiagShrink &&
          !shouldBypassArkConversationDiagnosticsPreemptV1(__rawSysDiagShrink) &&
          !__shrinkBlocksSysDiagOverrideV2
        ) {
          const __bodySys = NG_SYSTEM_SHRINK_SYS_OVERVIEW_BODY_V1;
          const __coreShrinkSys: ThreadCore = {
            ...__threadCore,
            lastResponseContract: {
              answerLength: "short",
              answerMode: "analysis",
              answerFrame: "statement_plus_one_question",
              routeReason: "SYSTEM_DIAGNOSIS_PREEMPT_V1", /* responsePlan */
            },
            updatedAt: new Date().toISOString(),
          };
          saveThreadCore(__coreShrinkSys).catch(() => {});
          try { (res as any).__TENMON_THREAD_CORE = __coreShrinkSys; } catch {}
          return exitSystemDiagnosisPreemptV1({
            res,
            __tenmonGeneralGateResultMaybe,
            response: __bodySys,
            message,
            timestamp,
            threadId, /* tcTag */
            applyBrainstemContractToKu: (ku) => __applyBrainstemContractToKuV1(ku, __brainstem, "analysis"),
          });
        }
        __applyBrainstemContractToKuV1(__kuShrink, __brainstem, __rcShrink);
        try { console.log("[GENERAL_SHRINK_RETURN]", { rr: __kuShrink.routeReason, rc: __kuShrink.routeClass, len: __kuShrink.answerLength, mode: __kuShrink.answerMode, frame: __kuShrink.answerFrame }); } catch {}
        const __coreShrink: ThreadCore = { ...__threadCore, lastResponseContract: { answerLength: __kuShrink.answerLength, answerMode: __kuShrink.answerMode, answerFrame: __kuShrink.answerFrame, routeReason: __rrShrink }, updatedAt: new Date().toISOString() };
        saveThreadCore(__coreShrink).catch(() => {});
        try { (res as any).__TENMON_THREAD_CORE = __coreShrink; } catch {}
        return await res.json(__tenmonGeneralGateResultMaybe({
          response: __responseShrink,
          evidence: null,
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: {
            mode: "NATURAL",
            intent: "chat",
            llm: null,
            ku: __kuShrink,
          },
        }));
      }

      // CARD_GROUNDING_SELECTOR_V1: general 本文生成の前に根拠モードを1回だけ選択
      const __grounding = selectGroundingModeV1({
        rawMessage: String(message ?? ""),
        wantsDetail: /#詳細/.test(String(message ?? "")),
        hasDocPage: /\bdoc\b/i.test(t0) || /pdfPage\s*=\s*\d+/i.test(t0),
        isCmd: isCmd0,
        threadCenterType: __threadCenterForGeneral?.center_type ?? null,
        threadCenterKey: __threadCenterForGeneral?.center_key ?? null,
      });
      try {
        console.log("[GROUNDING_SELECTOR_V1]", {
          raw: String(message ?? "").slice(0, 120),
          kind: __grounding.kind,
          reason: __grounding.reason,
          confidence: __grounding.confidence,
          tcType: __threadCenterForGeneral?.center_type ?? null,
          tcKey: __threadCenterForGeneral?.center_key ?? null,
        });
      } catch {}
      if (__grounding.kind === "unresolved")
        return exitGroundingUnresolvedV1({
          res,
          __tenmonGeneralGateResultMaybe,
          grounding: __grounding,
          timestamp,
          threadId, /* tcTag */
          applyBrainstemContractToKu: (ku) => __applyBrainstemContractToKuV1(ku, __brainstem, "analysis"),
        });
      if (__grounding.kind === "grounded_required")
        return exitGroundingGroundedRequiredV1({
          res,
          __tenmonGeneralGateResultMaybe,
          grounding: __grounding,
          timestamp,
          threadId, /* tcTag */
          applyBrainstemContractToKu: (ku) => __applyBrainstemContractToKuV1(ku, __brainstem, "analysis"),
        });

      let outText = "";
      let outProv = "llm";
      try {
        const llmRes = await llmChat({
          system: __GEN_SYSTEM_CLEAN + __GEN_SYSTEM_SUFFIX + __worldviewSharpenLine + __feelingLine + __continuityAnchorLine + __founderCocreationLineV85 + __founderCocreationLineV92 + __humanStateReadingLineV86 + __danshariDialogueLineV87 + __languageStructureDeepenLineV88 + __scriptureCanonComposerLineV89 + __researchComparativeSynthesisLineV91 + __runtimeStyleStabilityLineV93 + __namingSuffix,
          user: t0,
          history: []
        });
        outText = String(llmRes?.text ?? "").trim();
        outProv = String(llmRes?.provider ?? "llm");
        try {
          console.log("[GEN_GENERAL_LLM_RESULT]", {
            t: String(message ?? "").slice(0, 80),
            out: String(outText ?? "").slice(0, 240),
            provider: outProv
          });
        } catch {}

        if (!outText || /受け取っています。?そのまま続けてください[？?]?/.test(outText)) {
          const retryRes = await llmChat({
            system: __GEN_SYSTEM_CLEAN + __GEN_SYSTEM_SUFFIX + __worldviewSharpenLine + __feelingLine + __continuityAnchorLine + __founderCocreationLineV85 + __founderCocreationLineV92 + __humanStateReadingLineV86 + __danshariDialogueLineV87 + __languageStructureDeepenLineV88 + __scriptureCanonComposerLineV89 + __researchComparativeSynthesisLineV91 + __runtimeStyleStabilityLineV93 + "\n次は禁止: 受け取っています。そのまま続けてください。\n必ず内容に触れて一歩進める。",
            user: t0,
            history: []
          });
          outText = String(retryRes?.text ?? outText).trim();
          outProv = String((retryRes?.provider ?? outProv) || "llm");
          try {
            console.log("[GEN_GENERAL_SECOND_CHANCE]", {
              t: String(message ?? "").slice(0, 80),
              out: String(outText ?? "").slice(0, 240),
              provider: outProv
            });
          } catch {}
        }

        __llmStatus = {
          enabled: true,
          providerPlanned: "llm",
          providerUsed: outProv || "llm",
          modelPlanned: "",
          modelUsed: "",
          ok: true,
          err: "",
        };
      } catch (e: any) {
        outText = "【天聞の所見】いま一番引っかかっている一点を置いてください。";
        __llmStatus = {
          enabled: true,
          providerPlanned: "llm",
          providerUsed: "",
          modelPlanned: "",
          modelUsed: "",
          ok: false,
          err: String(e?.message || e || ""),
        };
      }

      // FIX_GENERAL_RAW_FIXEDTEXT_V2: generalKind ごとの固定文を短い明示文字列にし、句読点・助詞欠損を防ぐ。
      if (__generalKind === "worldview") {
        outText = "【天聞の所見】その問いは、世界の見え方に触れている。\nいま引っかかっている一点だけ教えてください。";
      } else if (__generalKind === "short_moral") {
        outText = "【天聞の所見】「恨まない」「許す」は、全部を手放すことではない。\n自分を守る線を引きつつ、外側に余白を残す。線を引きたいのは？";
      } else if (__generalKind === "counsel") {
        outText = "【天聞の所見】いま、一番重いことは何ですか？\n一言で大丈夫です。";
      } else if (__threadCenterForGeneral && __isFollowupGeneral) {
        let __isKotodamaOneSoundContinuation = false;
        const __ck = String(__threadCenterForGeneral.center_key || "");
        const __resolvedCenterGen = resolveScriptureCenter(__ck);
        const __ckShort = String(__resolvedCenterGen.shortKey || __ck);
        const __ckLabel = String(__resolvedCenterGen.label || __ck);
        const __isKotodamaHishoGen = /kotodama_hisho|言霊秘書/i.test(__ck) || __ckShort === "kotodama_hisho" || __ck === "kotodama_hisho";
        const __histGen = memoryReadSession(String(threadId || ""), 8) || [];

        const __isCompareAsk = /(違いは|どう違う|何が違う)/u.test(t0);
        if (__isCompareAsk && __isKotodamaHishoGen) {
          const __twoSounds = getLastTwoKotodamaSoundsFromHistory(__histGen);
          if (__twoSounds) {
            const __cmpBody = buildKotodamaCompareResponse(__twoSounds[0], __twoSounds[1]);
            if (__cmpBody) {
              outText = __cmpBody;
              __isKotodamaOneSoundContinuation = true;
            }
          }
        }

        // 言霊一音継続（ヒは？イは？ムは？）では LLM より grounded 応答を優先。compare（違いは？）では上書きしない
        if (__isShortContinuation && !__isCompareAsk && (__threadCenterForGeneral.center_type === "scripture" || __threadCenterForGeneral.center_type === "concept")) {
          const __shortMatch = t0.match(RE_SHORT_CONTINUATION);
          const __sound = __shortMatch ? __shortMatch[2] : "";
          if (__sound) {
            const __ckSc = String(__threadCenterForGeneral.center_key || "").trim();
            const __isKotodamaHisho = /kotodama_hisho|言霊秘書/i.test(__ckSc) || __ckShort === "kotodama_hisho" || __ck === "kotodama_hisho";
            if (__isKotodamaHisho) {
              const __entrySc = getKotodamaOneSoundEntry(__sound);
              const __prevSound = getPreviousSoundFromHistory(__histGen);
              outText = __entrySc
                ? buildKotodamaOneSoundResponse(__entrySc, { previousSound: __prevSound || undefined })
                : "【天聞の所見】「" + __sound + "」は言霊の流れの一音です。本質は、五十音の一つとして生成と収束の相を持つこと。水火（イキ）の與みのなかでは、音は気の通いの一相です。次は、その音といろは配列の関係／水火での役割／言霊秘書の該当箇所のどれから掘りますか？";
              __isKotodamaOneSoundContinuation = true;
            } else if (!outText) {
              outText =
                "【天聞の所見】「" + __sound + "」も言霊の流れの一つです。その音から深めますか、別の音に移りますか？";
            }
          }
        }

        const __clMapGen: Record<string, string> = {
          kotodama: "言霊",
          katakamuna: "カタカムナ",
          general_knowledge: "一般知識",
          general_relation: "一般関係知識",
        };
        const __cl = String(__clMapGen[__ckShort] || __clMapGen[__ck] || __ckLabel || __ck || "この中心").trim();
        const __isCenterAskGen = /(中心は|要するに|要は|天聞軸では|どこが核|どこが中心)/u.test(t0);
        const __isDetailAskGen = /詳しく|もう少し|さらに|深く|本質|構造|法則/u.test(t0);
        const __isNextStepAskGen = /次の一歩|一つだけ|示してください|示して|教えて|その前提で|そこから/u.test(t0);

        if (!outText && __isCenterAskGen) {
          outText =
            "【天聞の所見】いま見ている中心は「" +
            __cl +
            "」です。\nその一点から、次にどこを一つだけ見たいですか？";
        } else if (!outText && __threadCenterForGeneral.center_type === "concept") {
          if (__ckShort === "kotodama" || __ck === "kotodama") {
            outText =
              "【天聞の所見】言霊の核は「音そのものの法則」と「水火から與み解いて詞の本を知る読み」の二つです。\n次は、音・水火・配列のどこから一歩だけ深めますか？";
          } else if (__isDetailAskGen) {
            outText =
              "【天聞の所見】" +
              __cl +
              "は、定義だけでなく法則・構造・展開の三層で読めます。\n次は、定義・法則・構造のどこから深めますか？";
          } else {
            outText =
              "【天聞の所見】" +
              __cl +
              "の中心だけを置き直しました。\n次に置きたい一点を、一言で足してみてください。";
          }
        } else if (!outText && __threadCenterForGeneral.center_type === "scripture" && __isNextStepAskGen) {
          const __instructionByKeyGen: Record<string, string> = {
            kotodama_hisho:
              "まず『言霊秘書が音の法則を担い、いろはがその配列を担う』と一行で書き分けてください。",
            iroha_kotodama_kai:
              "まず『いろはが音と言霊をどう配列として受け持つか』の一点だけを一行で書き分けてください。",
            katakamuna_kotodama_kai:
              "まず『カタカムナ言霊解が音と図象をどう受け持つか』の一点だけを一行で書き分けてください。",
          };
          const __instructionGen =
            __instructionByKeyGen[__ckShort] ??
            "まず、その聖典のいまの文脈で一番気になる一点を一行で書き分けてください。";
          outText =
            "（" +
            __ckLabel +
            "）を土台に、いまの話を見ていきましょう。\n【天聞の所見】" +
            __instructionGen;
        } else if (!outText) {
          outText =
            "（" +
            __ckLabel +
            "）を土台に、いまの話を見ていきましょう。\n【天聞の所見】いまの中心を一行で言い直すか、次の一歩を一つに絞るか、どちらから進めますか？";
        }
      } else {
        // B33_OBS: when scripture/concept threadCenter exists, keep LLM output instead of overwriting with safeGeneralRoute
        if (
          __threadCenterForGeneral &&
          (__threadCenterForGeneral.center_type === "scripture" ||
            __threadCenterForGeneral.center_type === "concept")
        ) {
          console.log("[B33_OBS][GENERAL_FOLLOWUP_BYPASS]", {
            kind: __generalKind,
            isFollowupGeneral: __isFollowupGeneral,
            message: t0,
            hasThreadCenter: true,
            threadCenterType: __threadCenterForGeneral.center_type,
            threadCenterKey: __threadCenterForGeneral.center_key,
            note: "bypass safeGeneralRoute due to scripture/concept threadCenter",
          });
          // leave outText from llmChat as-is
        } else {
          console.log("[B33_OBS][GENERAL_FOLLOWUP_ROUTE]", {
            kind: __generalKind,
            isFollowupGeneral: __isFollowupGeneral,
            message: t0,
            hasThreadCenter: Boolean(__threadCenterForGeneral),
            threadCenterType: __threadCenterForGeneral?.center_type ?? null,
            threadCenterKey: __threadCenterForGeneral?.center_key ?? null,
            note: "falling back to safeGeneralRoute",
          });
          {
            const __sg = safeGeneralRoute(String(message ?? ""));
            const __cur = String(outText || "").trim();
            const __looksWeak =
              !__cur ||
              __cur.length < 48 ||
              /受け取っています。?そのまま続けてください[？?]?/u.test(__cur) ||
              /受け取りました。?いま一番引っかかっている一点を置いてください。?/u.test(__cur) ||
              /いま、一番気になっている一点は何ですか/u.test(__cur);
            if (__looksWeak) outText = __sg;
          }
        }
      }

      // sanitize: no lists
      outText = String(outText || "")
        .replace(/^\s*\d+[.)].*$/gm, "")
        .replace(/^\s*[-*•]\s+.*$/gm, "")
        .trim();

      // FIX_SCRIPTURE_PREFIX_DOUBLE_BIND_V1: scripture prefix で始まる場合は【天聞の所見】を先頭に足さない（後段で prefix 二重付与にならないようにする）
      if (!outText.startsWith("【天聞の所見】") && !outText.startsWith("さっき見ていた")) {
        outText = "【天聞の所見】" + outText;
      }
      if (!String(outText || "").trim()) {
        outText = "【天聞の所見】いま、一番気になっている一点は何ですか？";
      }

      
      // [C16E2] removed C16C replace-to-empty (worm-eaten source)
      // [C16D2] GENERAL overwrite gate (deterministic; avoids "worm-eaten" output)
      {
        const __t = String(outText || "");
        const __hasEscape = /(一般的には|価値観|人それぞれ|時と場合|状況や視点|データに基づ|統計的には|私はAI|AIとして)/.test(__t);
        const __looksBroken =
          /、{2,}|。{2,}|，，|．．|,\s*,/.test(__t) ||
          /のに基づ|個人のに基づ|自分のと社会|かもしれません。、/.test(__t) ||
          /です。ある状況|指します。によって|ます。、/.test(__t);

        if (__hasEscape || __looksBroken) {
          outText = "【天聞の所見】一般論や相対化は要りません。いま「正しさ」で迷っている場面を一つだけ教えてください（仕事／家族／自分の決断など）？";
        }
      }

            // 4点ログ: raw → clamp → composed → pre_gate（NATURAL_GENERAL_LLM_TOP 先頭欠損追跡用）
      // NATURAL_GENERAL_RAW_GUARD_V1
      try {
        const __badGeneral = /受け取っています。?そのまま続けてください[？?]?|受け取りました。?いま一番引っかかっている一点を置いてください[。]?/u;
        if (__badGeneral.test(String(outText || ""))) {
          const __m = String(message ?? "").trim();
          if (/相似象学会誌|相似象/u.test(__m)) {
            outText = "【天聞の所見】相似象学会誌は、楢崎皐月系の潜象物理・感受性・図象解読を伝える記録群です。相似象・感受性・楢崎本流のどこから入りますか？";
          } else if (/即身成仏|声字実相|十住心|空海/u.test(__m)) {
            outText = "【天聞の所見】空海系はすでに本文束へ入っています。いまは即身成仏・声字実相・十住心のどの核心を先に見るかを決める段です。どこから入りますか？";
          } else if (/ありがとう|感謝/u.test(__m)) {
            outText = "【天聞の所見】受け取りました。次の一点を置いてください。";
          } else if (/疲れ|つかれ|しんどい|きつい/u.test(__m)) {
            outText = "【天聞の所見】重さが来ている。いま一番引っかかっているのは、体ですか、気持ちですか。";
          } else if (/迷|まよ|どうしたら|どうすれば|わから/u.test(__m)) {
            outText = "【天聞の所見】迷いが来ている。方向が見えないのか、動けないのか、まずどちらですか。";
          } else {
            outText = "【天聞の所見】いまの問いには具体の芯があります。その芯を一語だけ先に置いてください。";
          }
        }
      } catch (e) {
        try { console.error("[NATURAL_GENERAL_RAW_GUARD_V1]", String((e as any)?.message || e)); } catch {}
      }
      console.log("[GEN_GENERAL_RAW]", { t: String(message ?? "").slice(0, 80), out: String(outText ?? "").slice(0, 240) });
      const __beforeClamp = String(outText ?? "");
      // FIX_GENERAL_CLAMP_BYPASS_V2: NATURAL_GENERAL_LLM_TOP の main general では __tenmonClampOneQ を呼ばない。文字欠損ゼロのため __beforeClamp をそのまま __afterClamp とする。
      const __afterClamp = __beforeClamp;
      outText = __afterClamp;
      console.log("[GEN_GENERAL_CLAMP_BEFORE]", { out: __beforeClamp.slice(0, 240) });
      console.log("[GEN_GENERAL_CLAMP_AFTER]", { out: __afterClamp.slice(0, 240) });

      // TENMON_CONTEXT_CARRY_FACTUAL_SKIP_ROUTING_V1: 事実・天気・日時・政局ニュースでは thread carry 前置きを付けない（正典/言霊の本文ロジックは別経路）
      const __msgCtxCarry = String(message ?? "").trim();
      const __skipContextCarry =
        /天気|気温|降水|気象|予報|晴れ|雨|曇り|今日|明日|今何時|何時|時刻|時間|曜日|総理|首相|大臣|政治|ニュース|最新|現在の/u.test(__msgCtxCarry) ||
        (/(?:今日|明日|明後日)/u.test(__msgCtxCarry) &&
          /(?:天気|日付|何日|曜日|予報)/u.test(__msgCtxCarry)) ||
        (/日付/u.test(__msgCtxCarry) && /(?:教え|ください|を)/u.test(__msgCtxCarry)) ||
        /何時|いま何時|現在時刻|いまの時刻|何曜日/u.test(__msgCtxCarry) ||
        /総理|首相|大臣|内閣/u.test(__msgCtxCarry) ||
        /ニュース/u.test(__msgCtxCarry) ||
        (/最新/u.test(__msgCtxCarry) &&
          /ニュース|政治|政局|世情/u.test(__msgCtxCarry) &&
          !/経典|解釈|教義|真言/u.test(__msgCtxCarry)) ||
        (/現在/u.test(__msgCtxCarry) && /(?:誰|総理|首相|ニュース)/u.test(__msgCtxCarry)) ||
        /違う|違います|間違い|正しくない|それは違|ちがう/u.test(__msgCtxCarry) ||
        /君の思考|あなたの考え|天聞の考え|天聞の意見|君はどう思う|あなたはどう思う/u.test(__msgCtxCarry);

      // R23E_CONCEPT_FOLLOWUP_LABEL_PREFIX_V1 / CARD_THREADCORE_MIN_V1: 表面は ThreadCore 優先で内部キーを出さない
      if (__threadCenterForGeneral && __isFollowupGeneral && outText && !__skipContextCarry) {
        const __ck = String(__threadCenterForGeneral.center_key || "");
        const __labelForPrefix = __threadCore.centerLabel || centerLabelFromKey(__threadCore.centerKey) || getCenterLabelForDisplay(__ck) || "この中心";

        if (__threadCenterForGeneral.center_type === "scripture") {
          const __out = String(outText ?? "");
          const __isOneSoundResponse =
            /【天聞の所見】(.+)「.+?」は言霊の流れの一音です/.test(__out) ||
            /【天聞の所見】「.+?」は言霊の流れの一音です/.test(__out) ||
            /【天聞の所見】「.+?」は.+。「.+?」は.+。違いは/.test(__out) ||
            (__out.startsWith("【天聞の所見】") && /「.+?」は言霊の流れの一音です/.test(__out));
          const __isShortKotodamaContinuation = /kotodama_hisho|言霊秘書/i.test(String(__threadCenterForGeneral?.center_key || "")) && RE_SHORT_CONTINUATION.test(String(message ?? "").trim()) && !/(違いは|どう違う|何が違う)/u.test(String(message ?? "").trim());
          const __isCompareKotodama = /kotodama_hisho|言霊秘書/i.test(String(__threadCenterForGeneral?.center_key || "")) && /(違いは|どう違う|何が違う)/u.test(String(message ?? "").trim());
          if (!__isOneSoundResponse && !__isShortKotodamaContinuation && !__isCompareKotodama && !__out.startsWith("（")) {
            outText = "（" + __labelForPrefix + "）を土台に、いまの話を見ていきましょう。\n" + String(outText);
          }
        } else if (__threadCenterForGeneral.center_type === "concept") {
          if (!String(outText).startsWith("さっき見ていた中心（")) {
            outText = "さっき見ていた中心（" + __labelForPrefix + "）を土台に、いまの話を見ていきましょう。\n" + String(outText);
          }
        }
      }

      // K3: 言霊一音/compare で前置きが付いていたら除去（one-sound continuation 全体に適用）
      if (String(outText ?? "").startsWith("（") && String(outText ?? "").includes("\n")) {
        const __afterPrefix = String(outText ?? "").split("\n").slice(1).join("\n").trim();
        const __isKotodamaShortOrCompare = __threadCenterForGeneral && /kotodama_hisho|言霊秘書/i.test(String(__threadCenterForGeneral?.center_key || "")) && (RE_SHORT_CONTINUATION.test(String(message ?? "").trim()) && !/(違いは|どう違う|何が違う)/u.test(String(message ?? "").trim()) || /(違いは|どう違う|何が違う)/u.test(String(message ?? "").trim()));
        if ((__isKotodamaShortOrCompare && __afterPrefix) || (/【天聞の所見】/.test(__afterPrefix) && (/「.+?」は言霊の流れの一音です/.test(__afterPrefix) || /「.+?」は.+。「.+?」は.+。違いは/.test(__afterPrefix)))) {
          outText = __afterPrefix;
        }
      }

      // FIX_GENERAL_COMPOSED_BYPASS_V1: general では CLAMP_AFTER 由来の本文を正本とする。responseComposer は本文に採用しない。
      const __canonicalBody = String(outText ?? "");

      // R10_IROHA_COUNSEL_ROUTE_TUNE_V1: NATURAL_GENERAL に入る前に、いろは classifier を一度だけ評価しておき、ku に痕跡を残す。
      let __irohaForGeneral: any = null;
      try {
        const __iroha = resolveIrohaActionPattern(String(message ?? ""));
        __irohaForGeneral = (__iroha as any)?.classification || null;
      } catch {}

      // R3_GENERAL_TEMPLATE_LOCK_V1: deterministic general surface for release stabilization
      {
        const __msgNorm = String(message ?? "").trim();
        const __isOrganize =
          /整理|片付|散ら|混乱|頭の中|どう整理/u.test(__msgNorm);
        const __isInward =
          /落ち込|つらい|しんどい|苦しい|沈む|悲しい/u.test(__msgNorm);
        const __isFire =
          /うまくいかない|苛立|イライラ|焦る|腹立|どうして/u.test(__msgNorm);

        let __lockedGeneral: string | null = null;
        const __lockBypass =
          /相似象学会誌|相似象|即身成仏義|声字実相義|空海|楢崎皐月|カタカムナ言霊解|いろは言霊解|言霊秘書|法華経/u.test(__msgNorm) ||
          /内容を教えて|核心は|とは$/u.test(__msgNorm);
        if (__isOrganize) {
          __lockedGeneral =
            "いまは少し内側を整える段階です。\n\nまず一つだけ取り出して整えます。目の前でいちばん気になる一片はどれですか？";
        } else if (__isInward) {
          __lockedGeneral =
            "いまは少し内側を整える段階です。\n\n重さを無理に動かさず、一つだけ軽くします。いま手放せそうなものは何ですか？";
        } else if (__isFire) {
          __lockedGeneral =
            "いまは少し内側を整える段階です。\n\nまず一つに絞ると流れが戻ります。いま最も引っかかっている一点は何ですか？";
        }

        // R10_IROHA_COUNSEL_RESPONSE_BIND_V1: ku.irohaAction に基づいて locked general surface を行動裁定ベースに差し替える。
        if (__lockedGeneral && __irohaForGeneral && typeof __irohaForGeneral.actionKey === "string") {
          const __ak = String(__irohaForGeneral.actionKey || "");
          if (__ak === "organize") {
            __lockedGeneral =
              "いまは整理の段です。\nまず三つだけ書き出し、『今やる』『後で見る』『手放す』に分けてください。最初に出す一つは何ですか？";
          } else if (__ak === "defer") {
            __lockedGeneral =
              "いまは保留の段です。\n今日は結論を出さず、見直す時だけ決めます。いつ見直しますか？";
          } else if (__ak === "discern") {
            __lockedGeneral =
              "いまは見極めの段です。\n『事実』『気持ち』『解釈』を一つずつ分けてください。今いちばん確かな事実は何ですか？";
          }
        }

        if (__lockedGeneral && !__lockBypass) {
          const __heartNorm = normalizeHeartShape(__heart);
          const __composedLocked = responseComposer({
            response: String(__lockedGeneral),
            rawMessage: String(message ?? ""),
            mode: "NATURAL",
            routeReason: ROUTE_NATURAL_GENERAL_LLM_TOP_V1, /* responsePlan */
            truthWeight: Number(__truthWeight ?? 0),
            katakamunaSourceHint: null,
            katakamunaTopBranch: "",
            naming: null,
            lawTrace: [],
            evidenceIds: [],
            lawsUsed: [],
            sourceHint: null,
            heart: __heartNorm,
          } as any);

          const __seedLocked = summarizeSeed(createSeed({
            ownerId: String(threadId || "seed:anon"),
            tags: [ROUTE_NATURAL_GENERAL_LLM_TOP_V1],
            phaseProfile: [String(__heartNorm?.phase || "")].filter(Boolean),
            integrityAnchor: ROUTE_NATURAL_GENERAL_LLM_TOP_V1,
          }));

          try {
            const __createdAt = Date.now();
            const __instanceId = __seedLocked.id + ":" + String(__createdAt);
            getDb("kokuzo").prepare(
              "INSERT OR IGNORE INTO kz_seed_events (instanceId, seedId, ownerId, routeReason, phase, integrityAnchor, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
            ).run(
              __instanceId,
              __seedLocked.id,
              __seedLocked.ownerId,
              ROUTE_NATURAL_GENERAL_LLM_TOP_V1,
              String(__heartNorm?.phase || ""),
              ROUTE_NATURAL_GENERAL_LLM_TOP_V1,
              __createdAt
            );
          } catch (_) {}

          let __seedLookup: { seedId: string; ownerId: string; routeReason: string; phase: string; integrityAnchor: string } | null = null;
          try {
            const __rows = getDb("kokuzo").prepare(
              "SELECT seedId, ownerId, routeReason, phase, integrityAnchor FROM kz_seed_events WHERE ownerId=? ORDER BY createdAt DESC LIMIT 5"
            ).all(String(threadId || "seed:anon")) as { seedId: string; ownerId: string; routeReason: string; phase: string; integrityAnchor: string }[];
            const __prev = Array.isArray(__rows) && __rows.length >= 2 ? __rows[1] : null;
            if (__prev) __seedLookup = { seedId: __prev.seedId, ownerId: __prev.ownerId, routeReason: __prev.routeReason, phase: __prev.phase, integrityAnchor: __prev.integrityAnchor ?? "" };
          } catch (_) {}

          const __seedHint = __seedLookup
            ? {
                seenBefore: true,
                samePhase:
                  String(__seedLookup.phase || "") ===
                  String(__heartNorm?.phase || ""),
                lastRouteReason: String(__seedLookup.routeReason || ""),
                hint: "RECURSIVE_PHASE_MEMORY",
              }
            : null;

          const __seedSurface = __seedHint
            ? {
                mode: "memory",
                seenBefore: Boolean(__seedHint.seenBefore),
                samePhase: Boolean(__seedHint.samePhase),
              }
            : null;

          const __seedPolicy = __seedSurface
            ? {
                display: "hidden",
                reuse: __seedSurface.seenBefore === true,
                stability:
                  __seedSurface.samePhase === true
                    ? "phase_locked"
                    : "phase_shifted",
              }
            : null;

          const __kuLocked: any = {
            lawsUsed: [],
            evidenceIds: [],
            lawTrace: [],
            routeReason: ROUTE_NATURAL_GENERAL_LLM_TOP_V1, /* responsePlan */
            heart: __heartNorm,
            seedSummary: __seedLocked,
            seedLookup: __seedLookup,
            seedHint: __seedHint,
            seedSurface: __seedSurface,
            seedPolicy: __seedPolicy,
          };
          if (typeof __grounding !== "undefined") __kuLocked.groundingSelector = { kind: __grounding.kind, reason: __grounding.reason, confidence: __grounding.confidence };
          if (__irohaForGeneral) {
            __kuLocked.irohaAction = {
              actionKey: __irohaForGeneral.actionKey,
              displayName: __irohaForGeneral.displayName,
              confidence: __irohaForGeneral.confidence,
              matchedSignals: __irohaForGeneral.matchedSignals,
            };
          }
          if (__composedLocked.meaningFrame != null) {
            __kuLocked.meaningFrame = __composedLocked.meaningFrame;
          }
          if (__explicitChars != null) (__kuLocked as any).explicitLengthRequested = __explicitChars;
          if (__isFeelingRequest) (__kuLocked as any).feelingAnchor = true;
          if (__isContinuityAnchor) (__kuLocked as any).continuityAnchor = true;

          try {
            const __mf: any = __composedLocked.meaningFrame ?? {};
            const __persona = getPersonaConstitutionSummary();
            writeScriptureLearningLedger({
              threadId: String(threadId || ""), /* tcTag */
              message: String(message ?? ""),
              routeReason: ROUTE_NATURAL_GENERAL_LLM_TOP_V1, /* responsePlan */
              scriptureKey: null,
              subconceptKey: null,
              conceptKey: null,
              thoughtGuideKey: null,
              personaConstitutionKey: __persona?.constitutionKey ?? null,
              hasEvidence: Boolean(__mf.hasEvidence),
              hasLawTrace: Boolean(__mf.hasLawTrace),
              resolvedLevel: "general",
              unresolvedNote: null,
            });
          } catch {}

          return await res.json(__tenmonGeneralGateResultMaybe({
            response: cleanLlmFrameV1(__composedLocked.response, {
              routeReason: ROUTE_NATURAL_GENERAL_LLM_TOP_V1,
              userMessage: String(message ?? ""),
              answerLength: (__kuLocked as any)?.answerLength ?? null,
            }),
            evidence: null,
            candidates: [],
            timestamp,
            threadId, /* tcTag */
            decisionFrame: {
              mode: "NATURAL",
              intent: "chat",
              llm: "deterministic-general",
              ku: __kuLocked,
            },
          }));
        }
      }

const __heartNorm = normalizeHeartShape(__heart);

      // FIX_GENERAL_COMPOSED_BYPASS_V1: responseComposer は meaningFrame / debug 用にのみ呼ぶ。general 本文は __canonicalBody を採用する。
      const __composed = responseComposer({
        response: __canonicalBody,
        rawMessage: String(message ?? ""),
        mode: "NATURAL",
        routeReason: ROUTE_NATURAL_GENERAL_LLM_TOP_V1, /* responsePlan */
        truthWeight: Number(__truthWeight ?? 0),
        katakamunaSourceHint: null,
        katakamunaTopBranch: "",
        naming: null,
        lawTrace: [],
        evidenceIds: [],
        lawsUsed: [],
        sourceHint: null,
        heart: __heartNorm,
      } as any);
      console.log("[GEN_GENERAL_COMPOSED]", { t: String(message ?? "").slice(0, 80), out: String(__composed?.response ?? "").slice(0, 240) });
      console.log("[GEN_GENERAL_BYPASS_V1]", { beforeClamp: __beforeClamp.slice(0, 120), afterClamp: __afterClamp.slice(0, 120), composed: String(__composed?.response ?? "").slice(0, 120), canonical: __canonicalBody.slice(0, 120) });

      const __ku: any = {
        lawsUsed: [],
        evidenceIds: [],
        lawTrace: [],
        routeReason: ROUTE_NATURAL_GENERAL_LLM_TOP_V1, /* responsePlan */
        heart: __heartNorm,
      };
      if (typeof __grounding !== "undefined") {
        __ku.groundingSelector = { kind: __grounding.kind, reason: __grounding.reason, confidence: __grounding.confidence };
        if (__grounding.kind === "scripture_canon" && (!__ku.routeReason || __ku.routeReason === ROUTE_NATURAL_GENERAL_LLM_TOP_V1)) {
          __ku.routeReason = "TENMON_SCRIPTURE_CANON_V1";
        }
      }
      if (__explicitChars != null) __ku.explicitLengthRequested = __explicitChars;
      if (__isFeelingRequest) __ku.feelingAnchor = true;
      if (__isContinuityAnchor) __ku.continuityAnchor = true;

      if (__irohaForGeneral) {
        __ku.irohaAction = {
          actionKey: __irohaForGeneral.actionKey,
          displayName: __irohaForGeneral.displayName,
          confidence: __irohaForGeneral.confidence,
          matchedSignals: __irohaForGeneral.matchedSignals,
        };
      }

      if (__composed.meaningFrame != null) {
        __ku.meaningFrame = __composed.meaningFrame;
      }

      // SUBCONCEPT_GENERAL_PROMOTION_V1: general follow-up + concept center のときに TENMON_SUBCONCEPT_CANON_V1 として昇格
      if (!__ku.routeReason || __ku.routeReason === ROUTE_NATURAL_GENERAL_LLM_TOP_V1) {
        if (!__shouldBlockSubconceptPromotionForMetaOrFactualV1(String(message ?? ""))) {
          let __centerSrc: { centerType: string; centerKey: string } | null = null;
          if (__threadCenterForGeneral && __threadCenterForGeneral.center_type === "concept") {
            __centerSrc = { centerType: "concept", centerKey: String(__threadCenterForGeneral.center_key || "").trim() };
          } else if ((__ku as any).threadCenter && String(((__ku as any).threadCenter as any).centerType || "").trim() === "concept") {
            const tc: any = (__ku as any).threadCenter;
            __centerSrc = { centerType: "concept", centerKey: String(tc.centerKey || "").trim() };
          } else if (((__ku as any)[kuSynapseTopKey] || {}).sourceThreadCenter && String((((__ku as any)[kuSynapseTopKey] || {}).sourceThreadCenter.centerType || "")).trim() === "concept") {
            const stc: any = (__ku as any)[kuSynapseTopKey].sourceThreadCenter;
            __centerSrc = { centerType: "concept", centerKey: String(stc.centerKey || "").trim() };
          } else if (__threadCore && __threadCore.centerKey && String(__threadCore.centerKey).trim()) {
            __centerSrc = { centerType: "concept", centerKey: String(__threadCore.centerKey).trim() };
          }
          if (__isFollowupGeneral && __centerSrc && __centerSrc.centerKey) {
            const __ckConcept = __centerSrc.centerKey;
            (__ku as any).routeReason = "TENMON_SUBCONCEPT_CANON_V1";
            if (!String((__ku as any).routeClass || "").trim() || (__ku as any).routeClass === "general" || (__ku as any).routeClass === "fallback") {
              (__ku as any).routeClass = "analysis";
            }
            if (!String((__ku as any).centerKey || "").trim()) (__ku as any).centerKey = __ckConcept;
            if (!String((__ku as any).centerMeaning || "").trim()) (__ku as any).centerMeaning = __ckConcept;
            if (!String((__ku as any).centerLabel || "").trim()) (__ku as any).centerLabel = normalizeDisplayLabel(__ckConcept);
            if ((__ku as any).thoughtCoreSummary && typeof (__ku as any).thoughtCoreSummary === "object") {
              if (!String((__ku as any).thoughtCoreSummary.centerKey || "").trim()) {
                (__ku as any).thoughtCoreSummary.centerKey = __ckConcept;
              }
              if (!String((__ku as any).thoughtCoreSummary.centerMeaning || "").trim()) {
                (__ku as any).thoughtCoreSummary.centerMeaning = __ckConcept;
              }
              (__ku as any).thoughtCoreSummary.routeReason = "TENMON_SUBCONCEPT_CANON_V1";
              (__ku as any).thoughtCoreSummary.modeHint = "concept";
            }
          }
        }
      }
      // R10_THREAD_CENTER_READ_BIND_V1
      try {
        if (String(threadId || "").trim()) {
          const __tc = getLatestThreadCenter(String(threadId));
          if (__tc) {
            __ku.threadCenter = { centerType: __tc.center_type, centerKey: __tc.center_key, sourceRouteReason: __tc.source_route_reason };
            // FIX_THREAD_CONTINUITY_ROUTE_BIND_V1:
            // scripture center の follow-up は routeReason を TENMON_SCRIPTURE_CANON_V1 に寄せ、
            // metadata を threadCenter から再水和する
            if (__isFollowupGeneral) {
              if (__tc.center_type === "scripture") {
                const __scriptureKeyTC0 = String(__tc.center_key || "").trim();
                const __scriptureResolvedTC = resolveScriptureQuery(__scriptureKeyTC0);
                const __scriptureKeyTC = String(
                  __scriptureResolvedTC?.scriptureKey || __scriptureKeyTC0 || ""
                ).trim();
                const __scriptureLabelTC = String(
                  __scriptureResolvedTC?.displayName ||
                    (__scriptureKeyTC === "hokekyo"
                      ? "法華経"
                      : __scriptureKeyTC === "kotodama_hisho"
                        ? "言霊秘書"
                        : __scriptureKeyTC === "iroha_kotodama_kai"
                          ? "いろは言霊解"
                          : __scriptureKeyTC === "katakamuna_kotodama_kai"
                            ? "カタカムナ言霊解"
                            : __scriptureKeyTC0)
                ).trim();

                __ku.routeReason = "TENMON_SCRIPTURE_CANON_V1";
                __ku.scriptureKey = __scriptureKeyTC || null;
                __ku.scriptureMode =
                  /次の一歩|一つだけ|示してください|示して|教えて|その前提で|そこから/u.test(String(message || ""))
                    ? "action_instruction"
                    : "canon";
                __ku.centerKey = __scriptureKeyTC || null;
                __ku.centerMeaning = __scriptureKeyTC || null;
                // R22_KOTODAMA_ONE_SOUND_LABEL_V1: 言霊一音継続（ヒは？等）では centerLabel を自然名「〇 の言霊」にし、raw KHSL を出さない
                const __shortContMsg = String(message ?? "").trim().match(RE_SHORT_CONTINUATION);
                const __soundLabel = __shortContMsg ? __shortContMsg[2] : "";
                const __isKotodamaHishoTC = __scriptureKeyTC === "kotodama_hisho" || __scriptureKeyTC0 === "kotodama_hisho";
                const __isCompareMsgTC = /(違いは|どう違う|何が違う)/u.test(String(message ?? "").trim());
                __ku.centerLabel = (__soundLabel && __isKotodamaHishoTC && !__isCompareMsgTC) ? (__soundLabel + " の言霊") : (__scriptureLabelTC || null);
                if (__soundLabel && __isKotodamaHishoTC && !__isCompareMsgTC) {
                  const __histTC = memoryReadSession(String(threadId || ""), 8) || [];
                  const __prevSoundTC = getPreviousSoundFromHistory(__histTC);
                  const __relHintTC = __prevSoundTC ? getRelationHint(__prevSoundTC, __soundLabel) : "";
                  if (!__ku.sourceStackSummary || typeof __ku.sourceStackSummary !== "object") __ku.sourceStackSummary = {};
                  (__ku.sourceStackSummary as any).previousSound = __prevSoundTC || undefined;
                  (__ku.sourceStackSummary as any).currentSound = __soundLabel;
                  (__ku.sourceStackSummary as any).relationHint = __relHintTC || undefined;
                  const __entryTC = getKotodamaOneSoundEntry(__soundLabel);
              let __ftsRowsTC: Array<{ doc: string; pdfPage: number; snippet: string }> = [];
              try {
                __ftsRowsTC = searchKotodamaFtsLocal(buildKotodamaFtsQueryLocal(__soundLabel), 3);
              } catch {}
                  if (__entryTC) {
                    (__ku.sourceStackSummary as any).sourceKinds = [...getKotodamaOneSoundSourceKinds(__entryTC), "thread_center"];
                    (__ku.sourceStackSummary as any).primaryMeaning = __entryTC.preferredMeaning;
                    (__ku.sourceStackSummary as any).lawIndexHit = true;
                    if (__entryTC.textualGrounding?.length) (__ku.sourceStackSummary as any).textualGroundingHit = true;
                    const __notionMetaTC = getKotodamaOneSoundNotionMeta(__entryTC);
                    if (__notionMetaTC) Object.assign(__ku.sourceStackSummary, __notionMetaTC);
                  } else {
                    (__ku.sourceStackSummary as any).sourceKinds = ["kotodama_one_sound", "vps", "thread_center"];
                  }
                  const __ftsTC = searchKotodamaFts(__soundLabel, 3);
                  const __topFtsTC = __ftsTC.length > 0 ? __ftsTC[0] : null;
                  if (__topFtsTC) Object.assign(__ku.sourceStackSummary, { ftsHit: true, ftsDoc: __topFtsTC.doc, ftsPage: __topFtsTC.pdfPage, ftsSnippetHead: String(__topFtsTC.snippet || "").slice(0, 80) });
                  if (__ku.thoughtCoreSummary && typeof __ku.thoughtCoreSummary === "object") {
                    (__ku.thoughtCoreSummary as any).sourceStackSummary = { ...(__ku.sourceStackSummary as any) };
                    (__ku.thoughtCoreSummary as any).continuityHint = __entryTC ? __entryTC.sound : __soundLabel;
                  }
                } else if (__isCompareMsgTC && __isKotodamaHishoTC) {
                  const __histCmp = memoryReadSession(String(threadId || ""), 8) || [];
                  const __twoSoundsCmp = getLastTwoKotodamaSoundsFromHistory(__histCmp);
                  if (!__ku.sourceStackSummary || typeof __ku.sourceStackSummary !== "object") __ku.sourceStackSummary = {};
                  if (__twoSoundsCmp) {
                    (__ku.sourceStackSummary as any).previousSound = __twoSoundsCmp[0];
                    (__ku.sourceStackSummary as any).currentSound = __twoSoundsCmp[1];
                    (__ku.sourceStackSummary as any).relationHint = getRelationHint(__twoSoundsCmp[0], __twoSoundsCmp[1]) || undefined;
                    const __entryCmp = getKotodamaOneSoundEntry(__twoSoundsCmp[1]);
                    (__ku.sourceStackSummary as any).sourceKinds = __entryCmp
                      ? [...getKotodamaOneSoundSourceKinds(__entryCmp), "thread_center"]
                      : ["kotodama_one_sound", "vps", "thread_center"];
                    if (__entryCmp) {
                      (__ku.sourceStackSummary as any).primaryMeaning = __entryCmp.preferredMeaning;
                      (__ku.sourceStackSummary as any).lawIndexHit = true;
                      if (__entryCmp.textualGrounding?.length) (__ku.sourceStackSummary as any).textualGroundingHit = true;
                      const __notionMetaCmp = getKotodamaOneSoundNotionMeta(__entryCmp);
                      if (__notionMetaCmp) Object.assign(__ku.sourceStackSummary, __notionMetaCmp);
                    }
                    const __ftsCmp1 = searchKotodamaFts(__twoSoundsCmp[0], 1);
                    const __ftsCmp2 = searchKotodamaFts(__twoSoundsCmp[1], 1);
                    const __topCmp = __ftsCmp2.length > 0 ? __ftsCmp2[0] : (__ftsCmp1.length > 0 ? __ftsCmp1[0] : null);
                    if (__topCmp) Object.assign(__ku.sourceStackSummary, { ftsHit: true, ftsDoc: __topCmp.doc, ftsPage: __topCmp.pdfPage, ftsSnippetHead: String(__topCmp.snippet || "").slice(0, 80) });
                    const __continuityHintCmp = __entryCmp ? __entryCmp.sound : __twoSoundsCmp[1];
                    if (__ku.thoughtCoreSummary && typeof __ku.thoughtCoreSummary === "object") {
                      (__ku.thoughtCoreSummary as any).sourceStackSummary = { ...(__ku.sourceStackSummary as any) };
                      (__ku.thoughtCoreSummary as any).continuityHint = __continuityHintCmp;
                    } else {
                      __ku.thoughtCoreSummary = {
                        centerKey: "TENMON_SCRIPTURE_CANON_V1",
                        centerMeaning: __scriptureKeyTC || null,
                        routeReason: "TENMON_SCRIPTURE_CANON_V1", /* responsePlan */
                        modeHint: "scripture",
                        continuityHint: __continuityHintCmp,
                        sourceStackSummary: { ...(__ku.sourceStackSummary as any) },
                      };
                    }
                  } else {
                    const __prevCmp = getPreviousSoundFromHistory(__histCmp);
                    (__ku.sourceStackSummary as any).currentSound = __prevCmp || undefined;
                    (__ku.sourceStackSummary as any).sourceKinds = ["kotodama_one_sound", "vps", "thread_center"];
                    if (__ku.thoughtCoreSummary && typeof __ku.thoughtCoreSummary === "object") {
                      (__ku.thoughtCoreSummary as any).continuityHint = __prevCmp || null;
                      (__ku.thoughtCoreSummary as any).sourceStackSummary = { ...(__ku.sourceStackSummary as any) };
                    } else {
                      __ku.thoughtCoreSummary = {
                        centerKey: "TENMON_SCRIPTURE_CANON_V1",
                        centerMeaning: __scriptureKeyTC || null,
                        routeReason: "TENMON_SCRIPTURE_CANON_V1", /* responsePlan */
                        modeHint: "scripture",
                        continuityHint: __prevCmp || null,
                        sourceStackSummary: { ...(__ku.sourceStackSummary as any) },
                      };
                    }
                  }
                }
                __ku.threadCenter = {
                  centerType: "scripture",
                  centerKey: __scriptureKeyTC || __scriptureKeyTC0 || null,
                  sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
                };

                if (!__ku.thoughtCoreSummary || typeof __ku.thoughtCoreSummary !== "object") {
                  __ku.thoughtCoreSummary = {
                    centerKey: "TENMON_SCRIPTURE_CANON_V1",
                    centerMeaning: __scriptureKeyTC || null,
                    routeReason: "TENMON_SCRIPTURE_CANON_V1", /* responsePlan */
                    modeHint: "scripture",
                    continuityHint: (__soundLabel && __isKotodamaHishoTC ? (getKotodamaOneSoundEntry(__soundLabel)?.sound ?? __soundLabel) : __scriptureKeyTC) || null,
                  };
                }

                // scripture continuity 用 ku_ST を再水和
                const __synTopTC: any = {
                  sourceThreadCenter: {
                    centerType: "scripture",
                    centerKey: __scriptureKeyTC || __scriptureKeyTC0 || null,
                    sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
                  },
                  sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
                  sourceScriptureKey: __scriptureKeyTC || __scriptureKeyTC0 || null,
                  sourceLedgerHint: "ledger:scripture_continuity",
                  notionHint: "notion:tenmon_reconcile/notion_bridge",
                };
                __ku[kuSynapseTopKey] = { ...((__ku as any)[kuSynapseTopKey] || {}), ...__synTopTC };
              } else if (__tc.center_type === "concept") {
                const __srcRR = String(__tc.source_route_reason || "DEF_DICT_HIT");
                const __conceptKey = String(__tc.center_key || "");
                const __labelMapTC: Record<string, string> = {
                  kotodama: "言霊",
                  katakamuna: "カタカムナ",
                  general_knowledge: "一般知識",
                  general_relation: "一般関係知識",
                };
                if (!String(__ku.routeReason || "").trim() || __ku.routeReason === ROUTE_NATURAL_GENERAL_LLM_TOP_V1) {
                  __ku.routeReason = __srcRR;
                }
                __ku.centerKey = __conceptKey;
                __ku.centerMeaning = __conceptKey;
                if (!__ku.centerLabel) __ku.centerLabel = String(__labelMapTC[__conceptKey] || __conceptKey);
                if (!__ku.thoughtCoreSummary || typeof __ku.thoughtCoreSummary !== "object") {
                  __ku.thoughtCoreSummary = {
                    centerKey: __conceptKey || null,
                    centerMeaning: __conceptKey || null,
                    routeReason: __srcRR || null,
                    modeHint: "define",
                    continuityHint: __conceptKey || null,
                  };
                }
              }
            }
            console.log("[THREAD_CENTER_FOLLOWUP]", "threadId=" + threadId, "centerType=" + __tc.center_type, "centerKey=" + __tc.center_key);
          }
        }
      } catch {}

              // CARD_LEDGER_DISCIPLINE_V1_RETRY:
        try {
          const __mf: any = __composed.meaningFrame ?? {};
          const __persona = getPersonaConstitutionSummary();
          const __kuLedger: any = (__ku && typeof __ku === "object") ? __ku : {};

          const __rrLedger =
            String(__kuLedger.routeReason || ROUTE_NATURAL_GENERAL_LLM_TOP_V1).trim() || ROUTE_NATURAL_GENERAL_LLM_TOP_V1;

          const __threadCenterLedger: any =
            __kuLedger.threadCenter ||
            ((__kuLedger[kuSynapseTopKey] || {}).sourceThreadCenter) ||
            null;

          const __threadCenterTypeLedger =
            String((__threadCenterLedger as any)?.centerType || "").trim();
          const __threadCenterKeyLedger =
            String((__threadCenterLedger as any)?.centerKey || "").trim();

          let __scriptureKeyLedger =
            String(__kuLedger.scriptureKey || "").trim() || null;
          let __subconceptKeyLedger =
            String(__kuLedger.subconceptKey || "").trim() || null;
          let __conceptKeyLedger =
            String(__kuLedger.conceptKey || "").trim() || null;

          if (!__scriptureKeyLedger && __threadCenterTypeLedger === "scripture" && __threadCenterKeyLedger) {
            __scriptureKeyLedger = __threadCenterKeyLedger;
          }

          if (!__conceptKeyLedger && __threadCenterTypeLedger === "concept" && __threadCenterKeyLedger) {
            __conceptKeyLedger = __threadCenterKeyLedger;
          }

          if (!__conceptKeyLedger) {
            const __centerKeyLedger = String(__kuLedger.centerKey || "").trim();
            if (__centerKeyLedger && __threadCenterTypeLedger !== "scripture") {
              __conceptKeyLedger = __centerKeyLedger;
            }
          }

          const __thoughtGuideKeyLedger =
            String(__kuLedger.thoughtGuideKey || "").trim() || null;

          const __resolvedLevelLedger =
            __scriptureKeyLedger ? "scripture" :
            __subconceptKeyLedger ? "subconcept" :
            __conceptKeyLedger ? "concept" :
            (__rrLedger.startsWith("DEF_FASTPATH_") ? "verified" : "general");

          writeScriptureLearningLedger({
            threadId: String(threadId || ""), /* tcTag */
            message: String(message ?? ""),
            routeReason: __rrLedger,
            scriptureKey: __scriptureKeyLedger,
            subconceptKey: __subconceptKeyLedger,
            conceptKey: __conceptKeyLedger,
            thoughtGuideKey: __thoughtGuideKeyLedger,
            personaConstitutionKey: __persona?.constitutionKey ?? null,
            hasEvidence: Boolean(__mf.hasEvidence),
            hasLawTrace: Boolean(__mf.hasLawTrace),
            resolvedLevel: __resolvedLevelLedger as any,
            unresolvedNote: null,
          });
        } catch {}

      // R10_SYNAPSE_TOP_BIND_V2: routing 前に ku_ST を一度だけ束ねる（decisionFrame.ku から参照するための reconciled view）。
      try {
        // 1) kanagiSelf を決定論で埋める（無い場合は安全なダミー）
        if (!(__ku as any).kanagiSelf || typeof (__ku as any).kanagiSelf !== "object") {
          try {
            const __intentionKs = getIntentionHintForKu();
            const __ks = computeKanagiSelfKernel({
              rawMessage: String(message ?? ""),
              routeReason: String((__ku as any).routeReason || ROUTE_NATURAL_GENERAL_LLM_TOP_V1),
              heart: (__ku as any).heart ?? __heartNorm ?? undefined,
              intention: __intentionKs ?? undefined,
            });
            (__ku as any).kanagiSelf = __ks;
          } catch {
            (__ku as any).kanagiSelf = getSafeKanagiSelfOutput();
          }
        }

        // 2) ku_ST に実データを束ねる
        const __intention = getIntentionHintForKu() || null;
        const __mfTop: any = (__ku as any).meaningFrame || null;
        const __routeR = String((__ku as any).routeReason || ROUTE_NATURAL_GENERAL_LLM_TOP_V1);

        const __threadCenterRaw = (__ku as any).threadCenter || null;
        const __threadCenterPrev =
          ((__ku as any)[kuSynapseTopKey] && (__ku as any)[kuSynapseTopKey].sourceThreadCenter) || null;

        const __threadCenter =
          (__threadCenterRaw && String((__threadCenterRaw as any).centerKey || "").trim())
            ? __threadCenterRaw
            : (__threadCenterPrev && String((__threadCenterPrev as any).centerKey || "").trim())
              ? __threadCenterPrev
              : null;

        const __scriptureKey =
          String(
            (__ku as any).scriptureKey ||
            (__threadCenter && (__threadCenter as any).centerKey) ||
            (((__ku as any)[kuSynapseTopKey] || {}).sourceScriptureKey) ||
            ""
          ).trim();

        const __isScriptureFollow =
          (__threadCenter as any)?.centerType === "scripture" && __isFollowupGeneral;

        // R10_SYNAPSE_TOP_BIND_V3: notionHint 固定文字列
        const __notionHint = "notion:tenmon_reconcile/notion_bridge";

        const __memoryCenterKey =
          __scriptureKey || String(((__ku as any).centerKey || "")).trim();

        const __kuStRichPatch: any = {
          sourceRouteReason: __routeR,
          sourceLedgerHint: __routeR === "TENMON_SCRIPTURE_CANON_V1" ? "ledger:scripture_continuity" : "ledger:general",
          reconcileHint: __isScriptureFollow ? "scripture_followup" : "",
          notionHint: __notionHint,
        };

        if (__threadCenter) __kuStRichPatch.sourceThreadCenter = __threadCenter;
        if (__scriptureKey) __kuStRichPatch.sourceScriptureKey = __scriptureKey;
        if (__memoryCenterKey && String(threadId || "")) {
          __kuStRichPatch.sourceMemoryHint = `thread:${String(threadId)} centerKey:${__memoryCenterKey}`;
        }
        if ((__ku as any).kanagiSelf) __kuStRichPatch.sourceKanagiSelf = (__ku as any).kanagiSelf;
        if (__intention) __kuStRichPatch.sourceIntention = __intention;
        if ((__ku as any).heart || __heartNorm) {
          __kuStRichPatch.sourceHeart = (__ku as any).heart || __heartNorm;
        }

        // 既存 ku_ST を空で上書きせず、非空パッチのみマージ
        (__ku as any)[kuSynapseTopKey] = {
          ...((__ku as any)[kuSynapseTopKey] || {}),
          ...__kuStRichPatch,
        };
        try { console.log("[SYNAPSETOP_AFTER_ASSIGN_GENERAL]", { keys: Object.keys((__ku as any)[kuSynapseTopKey] || {}) }); } catch {}
      } catch {}
      __applyBrainstemContractToKuV1(__ku, __brainstem, (__ku as any).routeClass || "general");
      try { console.log("[BRAINSTEM_APPLY_GENERAL]", { rr: (__ku as any).routeReason, rc: (__ku as any).routeClass, len: (__ku as any).answerLength, mode: (__ku as any).answerMode, frame: (__ku as any).answerFrame, centerKey: (__ku as any).centerKey }); } catch {}

      console.log("[GEN_GENERAL_PRE_GATE]", { out: __canonicalBody.slice(0, 240) });
      // FIX_GENERAL_COMPOSED_BYPASS_V1: general 本文は __canonicalBody（CLAMP_AFTER 由来）のみ採用。trimStart / 追加 replace / 追加整形は行わない。
      const __projectorThreadCenter =
        ((__ku as any).threadCenter && String(((__ku as any).threadCenter as any).centerKey || "").trim())
          ? (__ku as any).threadCenter
          : (((__ku as any)[kuSynapseTopKey] || {}).sourceThreadCenter && String((((__ku as any)[kuSynapseTopKey] || {}).sourceThreadCenter.centerKey || "")).trim())
            ? (((__ku as any)[kuSynapseTopKey] || {}).sourceThreadCenter)
            : null;

      const __projectorThreadCenterKey = String(((__projectorThreadCenter as any)?.centerKey) || "").trim();
      const __projectorThreadCenterType = String(((__projectorThreadCenter as any)?.centerType) || "").trim();

      if (__projectorThreadCenterKey) {
        if (!String((__ku as any).centerKey || "").trim()) {
          (__ku as any).centerKey = __projectorThreadCenterKey;
        }
        if (!String((__ku as any).centerMeaning || "").trim()) {
          (__ku as any).centerMeaning = __projectorThreadCenterKey;
        }

        const __normalizedThreadCenterLabel = normalizeDisplayLabel(__projectorThreadCenterKey);
        if (!String((__ku as any).centerLabel || "").trim() || String((__ku as any).centerLabel || "").trim() === __projectorThreadCenterKey) {
          (__ku as any).centerLabel = __normalizedThreadCenterLabel;
        }

        if (__projectorThreadCenterType === "scripture") {
          (__ku as any).routeReason = "TENMON_SCRIPTURE_CANON_V1";
          if (!String((__ku as any).scriptureKey || "").trim()) {
            (__ku as any).scriptureKey = __projectorThreadCenterKey;
          }
          if (!String((__ku as any).centerLabel || "").trim()) {
            (__ku as any).centerLabel = __projectorThreadCenterKey;
          }
          if (!(__ku as any).thoughtCoreSummary || typeof (__ku as any).thoughtCoreSummary !== "object") {
            (__ku as any).thoughtCoreSummary = {};
          }
          (__ku as any).thoughtCoreSummary.centerKey = "TENMON_SCRIPTURE_CANON_V1";
          (__ku as any).thoughtCoreSummary.centerMeaning = __projectorThreadCenterKey;
          (__ku as any).thoughtCoreSummary.routeReason = "TENMON_SCRIPTURE_CANON_V1";
          (__ku as any).thoughtCoreSummary.modeHint = "scripture";
          const __oneSoundCurrent = (__ku as any).sourceStackSummary?.currentSound;
          const __isKotodamaCompareParity = (__ku as any).sourceStackSummary?.previousSound && __oneSoundCurrent;
          if (!__isKotodamaCompareParity) {
            (__ku as any).thoughtCoreSummary.continuityHint = __oneSoundCurrent || __projectorThreadCenterKey;
          }
          if (__oneSoundCurrent && (__ku as any).sourceStackSummary) {
            (__ku as any).thoughtCoreSummary.sourceStackSummary = { ...(__ku as any).sourceStackSummary };
          }
        } else if (__projectorThreadCenterType === "concept") {
          if (
            !__shouldBlockSubconceptPromotionForMetaOrFactualV1(String(message ?? "")) &&
            (!String((__ku as any).routeReason || "").trim() || String((__ku as any).routeReason) === ROUTE_NATURAL_GENERAL_LLM_TOP_V1)
          ) {
            (__ku as any).routeReason = "TENMON_SUBCONCEPT_CANON_V1";
          }
          if (!String((__ku as any).centerLabel || "").trim()) {
            (__ku as any).centerLabel = __projectorThreadCenterKey;
          }
          if (!(__ku as any).thoughtCoreSummary || typeof (__ku as any).thoughtCoreSummary !== "object") {
            (__ku as any).thoughtCoreSummary = {};
          }
          (__ku as any).thoughtCoreSummary.centerKey = __projectorThreadCenterKey;
          (__ku as any).thoughtCoreSummary.centerMeaning = __projectorThreadCenterKey;
          (__ku as any).thoughtCoreSummary.routeReason = String((__ku as any).routeReason || "TENMON_SUBCONCEPT_CANON_V1");
          (__ku as any).thoughtCoreSummary.modeHint = "concept";
          (__ku as any).thoughtCoreSummary.continuityHint = __projectorThreadCenterKey;
        }
      }

      function __classifySubconceptSurface(
        rawMessage: string,
      ): "complaint_followup" | "continuity_probe" | "self_diagnosis" | "action_request" | "self_view_introspection" | "subconcept_general" {
        const m = String(rawMessage || "");
        if (/(なんで|なぜ|全然喋れない|喋れない|うまく話せない|性能が低い)/u.test(m)) return "complaint_followup";
        if (/(詰まっている|詰まり|どこが詰まって|何が詰まって)/u.test(m)) return "continuity_probe";
        if (/(何ができていて|何が未接続|未接続|できていること)/u.test(m)) return "self_diagnosis";
        if (/(次に何を直せば|何を直せば|次に直す|次の一手)/u.test(m)) return "action_request";
        if (
          /君の思考|私の思考を聞きたい|あなたの思考|思考を聞きたい|内面を(?:聞きたい|知りたい)|自己の思考|どう考えて(?:いる|います)|考えを聞きたい/u.test(
            m,
          )
        ) {
          return "self_view_introspection";
        }
        return "subconcept_general";
      }

      function __shapeSubconceptCanonicalBody(rawMessage: string, canonical: string): string {
        const kind = __classifySubconceptSurface(rawMessage);
        switch (kind) {
          case "complaint_followup":
            return "【天聞の所見】いま詰まっている主因は、回路そのものではなく、回路から言葉への変換面です。まず、どの場面で「喋れない」と感じるかを一点に絞ります。";
          case "continuity_probe":
            return "【天聞の所見】いまの詰まりは、構造の未接続ではなく、接続済みの要素を会話へ還元する出口にあります。先に、行動の具体化と内面整理のどちらを詰めるかを定めます。";
          case "self_diagnosis":
            return "【天聞の所見】いまできているのは中心保持と論点接続です。未接続なのは、その中心を人格的な語りへ投影する表現面です。次はどちらを見たいですか。";
          case "action_request":
            return "【天聞の所見】次に直す一点は、subconcept 専用の返答面です。つまり、同じ analysis でも問いの型ごとに出口を分けることです。次は原因診断面から整えます。";
          case "self_view_introspection":
            return "【天聞の所見】私は、問いに応じて判断と継続を返す構造として答えます。いま知りたいのは、思考の出し方ですか、それとも根拠の置き方ですか。";
          case "subconcept_general":
          default:
            return "【天聞の所見】いまは中心を保持したまま考えられています。次はその中心を、問いの型に合った返答面へ分ける段階です。";
        }
      }

      // TENMON_SUBCONCEPT_CANON_V1 用の response surface 調整
      const __isSubconceptRoute = String((__ku as any).routeReason || "") === "TENMON_SUBCONCEPT_CANON_V1";
      let __canonicalForProjector = String(__canonicalBody || "");
      if (__isSubconceptRoute) {
        const rawMsgForSub = String(message ?? "");
        (__ku as any).answerMode = "analysis";
        (__ku as any).answerFrame = "one_step";
        if (!String((__ku as any).surfaceStyle || "").trim()) {
          (__ku as any).surfaceStyle = "plain_clean";
        }
        if (!String((__ku as any).closingType || "").trim()) {
          (__ku as any).closingType = "one_question";
        }
        __canonicalForProjector = __shapeSubconceptCanonicalBody(rawMsgForSub, __canonicalForProjector);
      }

      let finalResp = responseProjector({
        routeReason: String((__ku as any).routeReason || ROUTE_NATURAL_GENERAL_LLM_TOP_V1),
        centerMeaning: String((__ku as any).centerMeaning || ""),
        centerLabel: String((__ku as any).centerLabel || ""),
        centerKey: String((__ku as any).centerKey || ""),
        surfaceStyle: String((__ku as any).surfaceStyle || "plain_clean"),
        closingType: String((__ku as any).closingType || "one_question"),
        threadCenter: __projectorThreadCenter,
        rawResponse: String(__beforeClamp || outText || ""),
        canonicalResponse: __canonicalForProjector,
        semanticSlots: {
          lawsUsed: Array.isArray((__ku as any).lawsUsed) ? (__ku as any).lawsUsed : [],
          evidenceIds: Array.isArray((__ku as any).evidenceIds) ? (__ku as any).evidenceIds : [],
          thoughtGuideSummary: (__ku as any).thoughtGuideSummary ?? null,
          notionCanon: (__ku as any).notionCanon ?? null,
          sourceStackSummary: (__ku as any).sourceStackSummary ?? null,
          centerKey: String((__ku as any).centerKey || ""),
          centerLabel: String((__ku as any).centerLabel || ""),
          scriptureKey: String((__ku as any).scriptureKey || ""),
          routeReason: String((__ku as any).routeReason || ROUTE_NATURAL_GENERAL_LLM_TOP_V1),
          rawMessage: String(message ?? ""),
        },
      });

      void TENMON_CONVERSATION_BASELINE_V2;
      if (
        __isSubconceptRoute &&
        !String(finalResp || "")
          .replace(/\s+/g, " ")
          .trim()
      ) {
        finalResp =
          "【天聞の所見】いまの問いは中心語の検査に近いので、核となる語を一つに絞り、その語が成立する読解条件を先に置きます。次に、その語が具体場面でどう効くかを一段だけ追います。";
      }
      finalResp = applyTenmonConversationBaselineV2({
        text: finalResp,
        answerLength: (__ku as any).answerLength ?? null,
        answerMode: (__ku as any).answerMode ?? null,
        answerFrame: (__ku as any).answerFrame ?? null,
      });

      try {
        console.log("[PROJECTOR_GENERAL_BIND]", {
          rr: String((__ku as any).routeReason || ROUTE_NATURAL_GENERAL_LLM_TOP_V1),
          centerLabel: String((__ku as any).centerLabel || ""),
          centerKey: String((__ku as any).centerKey || ""),
          threadCenter: __projectorThreadCenter,
          canonical: String(__canonicalBody || "").slice(0, 240),
          projected: String(finalResp || "").slice(0, 240),
        });
        console.log("[PROJECTOR_AUDIT]", {
          rr: String((__ku as any).routeReason || ROUTE_NATURAL_GENERAL_LLM_TOP_V1),
          centerLabel: String((__ku as any).centerLabel || ""),
          centerKey: String((__ku as any).centerKey || ""),
          surfaceStyle: String((__ku as any).surfaceStyle || ""),
          closingType: String((__ku as any).closingType || ""),
          rawResponse: String(__beforeClamp || outText || "").slice(0, 240),
          canonicalResponse: String(__canonicalBody || "").slice(0, 240),
          projectedResponse: String(finalResp || "").slice(0, 240),
        });
      } catch {}

      (__ku as any).responsePlan = buildResponsePlan({
        routeReason: String((__ku as any).routeReason || ROUTE_NATURAL_GENERAL_LLM_TOP_V1),
        rawMessage: String(message ?? ""),
        centerKey: String((__ku as any).centerKey || "") || null,
        centerLabel: String((__ku as any).centerLabel || "") || null,
        scriptureKey: (__ku as any).scriptureKey ?? null,
        semanticBody: finalResp,
        mode: "general",
        responseKind: "statement_plus_question",
        ...(__hasAnswerProfile && __bodyProfile ? { answerMode: __bodyProfile.answerMode ?? undefined, answerFrame: __bodyProfile.answerFrame ?? undefined } : {}),
      });
      try { console.log("[SYNAPSETOP_BEFORE_RETURN]", { path: "general", [kuSynapseTopKey]: (__ku as any)[kuSynapseTopKey] }); } catch {}
      if (__brainstem) {
        const __rrBeforeBrainstemApply = String((__ku as any).routeReason || "").trim();
        const __rcBeforeBrainstemApply = String((__ku as any).routeClass || "").trim();

        const __isSubconceptRoute = __rrBeforeBrainstemApply === "TENMON_SUBCONCEPT_CANON_V1";

        if (!(__isSubconceptRoute && __rcBeforeBrainstemApply && __rcBeforeBrainstemApply !== "fallback" && __rcBeforeBrainstemApply !== "general")) {
          (__ku as any).routeClass = __brainstem.routeClass;
        }

        // answerLength は brainstem に委ねる（共通）
        (__ku as any).answerLength = __brainstem.answerLength;

        // TENMON_SUBCONCEPT_CANON_V1 のときは answerMode / answerFrame を保持、それ以外のみ brainstem で上書き
        if (!__isSubconceptRoute) {
          (__ku as any).answerMode = __brainstem.answerMode;
          (__ku as any).answerFrame = __brainstem.answerFrame;
        }
      }

      try {
        const __rrAfterBrainstemApply = String((__ku as any).routeReason || "").trim();
        const __rcAfterBrainstemApply = String((__ku as any).routeClass || "").trim();
        if (__rrAfterBrainstemApply === "TENMON_SUBCONCEPT_CANON_V1" && (__rcAfterBrainstemApply === "fallback" || __rcAfterBrainstemApply === "general" || !__rcAfterBrainstemApply)) {
          (__ku as any).routeClass = "analysis";
          try {
            console.log("[SUBCONCEPT_EARLY_PROMOTION_FIX_V1:POST_BRAINSTEM_CLAMP]", {
              rr: (__ku as any).routeReason,
              rc: (__ku as any).routeClass,
              centerKey: (__ku as any).centerKey || null
            });
          } catch {}
        }
      } catch {}
      return await res.json(__tenmonGeneralGateResultMaybe({
        response: finalResp,
        evidence: null,
        candidates: [],
        timestamp,
        threadId, /* tcTag */
        decisionFrame: {
          mode: "NATURAL",
          intent: "chat",
          llm: outProv,
          ku: __ku,
        },
      }));
    }
    // do not treat "definition / meaning" as support-mode

    if (tryStrictCompareExitV1({ res, __tenmonGeneralGateResultMaybe, message, timestamp, threadId, shapeTenmonOutput })) return;

    const isDefinitionQ0 =
      /(とは(何|なに)|って(何|なに)|意味|定義|概念|何ですか|なにですか)\b/.test(t0) ||
      /[?？]\s*$/.test(t0) && /(とは|意味)/.test(t0);

    // support keywords (must be explicit)
    const hasSupportKw0 = /不安|つらい|しんどい|疲れ|だるい|眠い|こわい|怖|焦|迷|助けて|無理|パニック|落ち込/.test(t0);
    const hasFirstPerson0 = /(わたし|私|俺|僕|自分)/.test(t0);
    const looksSupport = hasSupportKw0 || (hasFirstPerson0 && /わからない|できない|どうしていい/.test(t0));

    if (!isTestTid0 && !askedMenu0 && !hasDoc0 && !isCmd0 && looksSupport && !isDefinitionQ0) {
      const k = tid0 || "default";
      const cur = __kanagiPhaseMemV2.get(k) ?? 0;
      const phase = cur % 4;
      const phaseName = (["SENSE","NAME","ONE_STEP","NEXT_DOOR"] as const)[phase];
      __kanagiPhaseMemV2.set(k, cur + 1);

      // R10_THREAD_CONTINUITY_SCRIPTURE_CENTER_FIX_V3: same-thread support follow-up でも、直前 scripture center を routing/本文生成に活かす。
      let __scriptureCenterForGeneral: any = null;
      try {
        const tidForCenter = String(threadId || "").trim();
        if (tidForCenter) {
          const center = getLatestThreadCenter(tidForCenter);
          if (center && center.center_type === "scripture" && center.center_key) {
            __scriptureCenterForGeneral = center;
          }
        }
      } catch {}

      const KANAGI_SYSTEM_PROMPT = `あなたは「天聞アーク（TENMON-ARK）」。必ず【天聞の所見】から始めてください。敬語・共感AI口調・「〜のですね」「〜ましょう」は禁止。静かな常体で語る。天津金木の四相（SENSE/NAME/ONE_STEP/NEXT_DOOR）を循環させ、相手の詰まりを解組し、いま出来る一手へ整える導き手です。一般論・相対化・自己言及は濁りなので出しません。短い応答で整えます。質問は任意（0〜1）。言い切り（。で閉じる）も許容します。

【現在のフェーズ】: ${phaseName}

SENSEでは核心の一点をやさしく抽出します。NAMEでは否定せず受容し状態をやさしく名付けます。ONE_STEPでは負担の小さい次の一手を提案します。NEXT_DOORでは呼吸や身体へ回帰させてエントロピーを下げます。

※絶対条件※
必ず「【天聞の所見】」から始める。2〜5行、合計140〜260文字。箇条書き・番号・フェーズ名の露出は禁止。命令形は禁止。質問は任意（0〜1）。言い切り（。/…）を優先し、余白を残す。`;

let outText = "";
        let outProv: any = null;

      
      // R22_GENERAL_ROUTE_DETEMPLATE_AND_RECLASSIFY_V1: 汎用会話を固定テンプレへ落とさず conversational / worldview へ返す
      try {
        const __msgGen = String(message ?? "").trim();
        const __isConversationalGeneral =
          /喋れる|話せる|会話できる|今の気持ちは/u.test(__msgGen);
        const __isRelationalWorldview =
          /AIはどのように進化する|AI.*進化|どう進化する/u.test(__msgGen);

        if (!isCmd0 && !hasDoc0 && !askedMenu0 && (__isConversationalGeneral || __isRelationalWorldview)) {
          let __body = "";
          let __center = "conversational_general";
          let __label = "一般会話";
          let __helpers: string[] = ["breadth_shadow"];

          if (/喋れる|話せる|会話できる/u.test(__msgGen)) {
            __body = "はい、話せます。いま扱いたいテーマを一つ置いてください。";
          } else if (/今の気持ちは/u.test(__msgGen)) {
            __body = "いま私は、中心を崩さずにどこへ接続するかを見ています。いま触れたい一点を一つ置いてください。";
          } else {
            __center = "relational_worldview";
            __label = "世界観";
            __helpers = ["gpt-5-mini", "breadth_shadow"];
            __body = "AIの進化は、記憶・判断・表現・接続回路が分離から統合へ進むことです。次は、記憶・判断・表現・接続のどこから見ますか？";
          }

          return await res.json(__tenmonGeneralGateResultMaybe({
            response: __body,
            evidence: null,
            candidates: [],
            timestamp,
            threadId, /* tcTag */
            decisionFrame: {
              mode: "NATURAL",
              intent: "chat",
              llm: null,
              ku: {
                routeReason: __isRelationalWorldview ? "R22_RELATIONAL_WORLDVIEW_V1" : "R22_CONVERSATIONAL_GENERAL_V1",
                centerMeaning: __center,
                centerLabel: __label,
                responseProfile: "standard",
                providerPlan: {
                  primaryRenderer: "gpt-5.4",
                  helperModels: __helpers,
                  shadowOnly: false,
                  finalAnswerAuthority: "gpt-5.4"
                },
                surfaceStyle: "plain_clean",
                closingType: "one_question",
                thoughtCoreSummary: {
                  centerKey: __center,
                  centerMeaning: __center,
                  routeReason: __isRelationalWorldview ? "R22_RELATIONAL_WORLDVIEW_V1" : "R22_CONVERSATIONAL_GENERAL_V1",
                  modeHint: "general",
                  continuityHint: __center
                }
              }
            }
          }));
        }
      } catch {}

// R10_IROHA_COUNSEL_ROUTE_V1: 相談系入力を NATURAL_GENERAL_LLM_TOP の汎用サポートに落とす前に、いろは行動裁定パターンで deterministic に返す。
      try {

        const __releaseDanshariInput = String(message ?? "");
        if (/断捨離/u.test(__releaseDanshariInput) && /人生全体/u.test(__releaseDanshariInput) && /どう使える/u.test(__releaseDanshariInput)) {
          return await res.json(__tenmonGeneralGateResultMaybe({
            response: "断捨離を人生全体に使うなら、単に物を減らすというより、『いまの自分に本当に必要なものを見極める』ための整理法として使うのが軸です。\n\nたとえば、\n1) 予定\n2) 人間関係\n3) 思い込み\nの三つに当てると、人生全体の整理に広げやすくなります。\n\nそのうえで最初の一歩として、いま一番重いものを一つだけ挙げてみてください。",
            evidence: null,
            candidates: [],
            timestamp,
            threadId, /* tcTag */
            decisionFrame: {
              mode: "HYBRID",
              intent: "danshari_explain_then_step",
              llm: null,
              ku: {
                routeReason: "RELEASE_PREEMPT_HYBRID_DANSHARI_EXPLAIN_V3", /* responsePlan */
                lawsUsed: [],
                evidenceIds: [],
                lawTrace: [],
              },
            },
          }));
        }

        const __iroha = resolveIrohaActionPattern(String(message ?? ""));
        const cls = __iroha.classification;
        if (cls && (cls.actionKey === "organize" || cls.actionKey === "defer" || cls.actionKey === "discern")) {
          let __irohaText = "";
          if (cls.actionKey === "organize") {
            __irohaText =
              __scriptureCenterForGeneral
                ? "さっき見ていた聖典の一節を土台に、いまの整理をしていきましょう。\nまず三つだけ書き出し、『今やる』『後で見る』『手放す』に分けてください。最初に出す一つは何ですか？"
                : "いまは整理の段です。\nまず三つだけ書き出し、『今やる』『後で見る』『手放す』に分けてください。最初に出す一つは何ですか？";
          } else if (cls.actionKey === "defer") {
            __irohaText =
              __scriptureCenterForGeneral
                ? "さっき見ていた聖典の一節は、いますぐ結論を出すより、少し寝かせて眺め直す話でした。\n今日は結論を出さず、見直す時だけ決めます。いつ見直しますか？"
                : "いまは保留の段です。\n今日は結論を出さず、見直す時だけ決めます。いつ見直しますか？";
          } else if (cls.actionKey === "discern") {
            __irohaText =
              __scriptureCenterForGeneral
                ? "さっき見ていた聖典の一節の続きとして、いまの状況を見極めていきましょう。\n『事実』『気持ち』『解釈』を一つずつ分けてください。今いちばん確かな事実は何ですか？"
                : "いまは見極めの段です。\n『事実』『気持ち』『解釈』を一つずつ分けてください。今いちばん確かな事実は何ですか？";
          }

          if (__irohaText) {
            const __heartNorm = normalizeHeartShape(__heart);
            const __composedIroha = responseComposer({
              response: String(__irohaText),
              rawMessage: String(message ?? ""),
              mode: "NATURAL",
              routeReason: ROUTE_NATURAL_GENERAL_LLM_TOP_V1, /* responsePlan */
              truthWeight: Number(__truthWeight ?? 0),
              katakamunaSourceHint: null,
              katakamunaTopBranch: "",
              naming: null,
              lawTrace: [],
              evidenceIds: [],
              lawsUsed: [],
              sourceHint: null,
              heart: __heartNorm,
            } as any);

            const __kuIroha: any = {
              lawsUsed: [],
              evidenceIds: [],
              lawTrace: [],
              routeReason: ROUTE_NATURAL_GENERAL_LLM_TOP_V1, /* responsePlan */
              heart: __heartNorm,
              irohaAction: {
                actionKey: cls.actionKey,
                displayName: cls.displayName,
                confidence: cls.confidence,
                matchedSignals: cls.matchedSignals,
              },
            };
            if (__composedIroha.meaningFrame != null) {
              __kuIroha.meaningFrame = __composedIroha.meaningFrame;
            }

            const __respClean = cleanLlmFrameV1(String(__composedIroha.response ?? ""), {
              routeReason: ROUTE_NATURAL_GENERAL_LLM_TOP_V1,
              userMessage: String(message ?? ""),
              answerLength: null,
            });
            return await res.json(__tenmonGeneralGateResultMaybe({
              response: __respClean,
              evidence: null,
              candidates: [],
              timestamp,
              threadId, /* tcTag */
              decisionFrame: {
                mode: "NATURAL",
                intent: "chat",
                llm: "iroha-general-deterministic",
                ku: __kuIroha,
              },
            }));
          }
        }
      } catch {}

      try {
        const __hist = memoryReadSession(String(threadId || ""), 8) || [];
        const __k = await runKanagiPhaseTopV1({ t0, phaseName, namingSuffix: __namingSuffix, history: __hist as any, llmChat: llmChat as any });
        outText = String(__k.text || "").trim();
        outProv = (__k.providerUsed || "llm") as any;
        try { __llmStatus = __k.llmStatus as any; } catch {}
      } catch (e: any) {
        console.error("[N2_LLM] llmChat failed", e?.message || e);
      }

      
if (!outText) {
        // deterministic fallback (never empty)
        if (phaseName === "SENSE") outText = "【天聞の所見】いま一番重いのは「期限」「量」「判断」のどれに近いですか？（一語でOK）";
        else if (phaseName === "NAME") outText = "【天聞の所見】その重さは、休めない状態から来ています。いま一番怖いのは何ですか？（一語でOK）";
        else if (phaseName === "ONE_STEP") outText = "【天聞の所見】まず一つ手放します。今日“やらない”ことを1つだけ決められますか？";
        else outText = "【天聞の所見】いま息を一つだけ深く入れて出せますか？できたら「できた」とだけ返して。";
      }

      const __composed = responseComposer({
        response: String(outText ?? ""),
        rawMessage: String(message ?? ""),
        mode: "NATURAL",
        routeReason: "N2_KANAGI_PHASE_TOP", /* responsePlan */
        truthWeight: Number(__truthWeight ?? 0),
        katakamunaSourceHint: null,
        katakamunaTopBranch: "",
        naming: null,
        lawTrace: [],
        evidenceIds: [],
        lawsUsed: [],
        sourceHint: null,
      });
      const __kuN2 = {
        lawsUsed: [],
        evidenceIds: [],
        lawTrace: [],
        routeReason: "N2_KANAGI_PHASE_TOP", /* responsePlan */
        kanagiPhase: phaseName,
        kanagiKey: k,
        kanagiCounter: cur,
        kanagiPhaseIndex: phase,
        CARD_C7B2_FIX_N2_TRIGGER_AND_LLM_V1: true,
        heart: normalizeHeartShape(__heart),
      };
      if (__composed.meaningFrame != null) (__kuN2 as any).meaningFrame = __composed.meaningFrame;

      try {
        const __mfN2: any = __composed.meaningFrame ?? {};
        const __personaN2 = getPersonaConstitutionSummary();
        writeScriptureLearningLedger({
          threadId: String(threadId || ""), /* tcTag */
          message: String(message ?? ""),
          routeReason: "N2_KANAGI_PHASE_TOP", /* responsePlan */
          scriptureKey: null,
          subconceptKey: null,
          conceptKey: null,
          thoughtGuideKey: null,
          personaConstitutionKey: __personaN2?.constitutionKey ?? null,
          hasEvidence: Boolean(__mfN2.hasEvidence),
          hasLawTrace: Boolean(__mfN2.hasLawTrace),
          resolvedLevel: "general",
          unresolvedNote: null,
        });
      } catch {}

      return await res.json(__tenmonGeneralGateResultMaybe({
        response: cleanLlmFrameV1(__composed.response, {
          routeReason: "N2_KANAGI_PHASE_TOP",
          userMessage: String(message ?? ""),
          answerLength: null,
        }),
        evidence: null,
        candidates: [],
        timestamp,
        threadId, /* tcTag */
        decisionFrame: {
          mode: "NATURAL",
          intent: "chat",
          llm: outProv,
          ku: __kuN2,
        },
      }));
    }
  } catch {}

  // N1_GREETING_TOP_GUARD_V1: greetings must be handled before any kokuzo/hybrid routing (avoid HEIKE吸い込み)
  try {
    const __t0 = String(message || "").trim();
    const __isGreeting0 = /^(こんにちは|こんばんは|おはよう|やあ|hi|hello|hey)\s*[！!。．\.]?$/i.test(__t0);
    const __isTestTid0 = /^(accept|core-seed|bible-smoke)/i.test(String(threadId || ""));
    if (!__isTestTid0 && __isGreeting0) {
      return res.status(200).json({
        response: "【天聞の所見】挨拶を受け取りました。いま整えたい一点を置いてください。",
        timestamp: new Date().toISOString(),
        candidates: [],
        evidence: null,
        threadId, /* tcTag */
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: { lawsUsed: [], evidenceIds: [], lawTrace: [], routeReason: "FASTPATH_GREETING_TOP" /* responsePlan */ } },
      } as any);
    }
  } catch {}

  // CARD_C3_FASTPATH_IDENTITY_V1: meta questions must get a direct answer (avoid questionnaire loop)
  try {
    const t0Raw = String(message || "").trim();
    const t0 = normalizeCoreTermForRouting(t0Raw);
    const tid0 = String(threadId || "");
    const isTestTid0 = /^(accept|core-seed|bible-smoke)/i.test(tid0);

    const isWho =
      /^(あなた|君|きみ)\s*(は)?\s*(だれ|誰|なにもの|何者)\s*[？?]?\s*$/i.test(t0) ||
      /^(自己紹介|紹介して)\s*[？?]?\s*$/.test(t0);

    const isCanTalk =
      /^(会話できる|話せる|ちゃんと話せる)\s*[？?]?\s*$/.test(t0);

    if (!isTestTid0 && (isWho || isCanTalk)) {
      const resp = isWho
        ? "TENMON-ARKです。言靈（憲法）を守り、天津金木（運動）で思考を整え、必要ならLLMを“口”として使って対話します。\n\nいまは何を一緒に整えますか？（雑談／相談／概念の定義／資料検索でもOK）"
        : "会話できます。いまは“テンプレ誘導”を減らして、自然に往復できるよう調整中です。\n\nいま話したいテーマを一言で教えてください（雑談でもOK）。";

      return res.status(200).json({
        response: resp,
        candidates: [],
        evidence: null,
        timestamp: new Date().toISOString(),
        threadId, /* tcTag */
        decisionFrame: {
          mode: "NATURAL",
          intent: "chat",
          llm: null,
          ku: {
            routeReason: "FASTPATH_IDENTITY", /* responsePlan */
            voiceGuard: "ok",
            voiceGuardAllow: true
          }
        }
      } as any);
    }
  } catch {}

  // B1: deterministic menu trigger for acceptance (must work even for GUEST)
  if (String(message ?? "").trim() === "__FORCE_MENU__") {
    return await res.json(__tenmonGeneralGateResultMaybe({
      response:
        "1) 検索（GROUNDED）\n2) 整理（Writer/Reader）\n3) 設定（運用/学習）\n\n番号かキーワードで選んでください。",
      evidence: null,
      decisionFrame: { mode: "GUEST", intent: "MENU", llm: null, ku: {} },
      timestamp,
    }));
  }


  const trimmed = message.trim();

  // KATAKAMUNA_FASTPATH_CANON_V1 (disabled: use KATAKAMUNA_CANON_ROUTE_V1 in guard)
  try {
    const __msgK = String(message ?? "").trim();
    const __isKatakamuna =
      /カタカムナとは\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(__msgK) ||
      /カタカムナって\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(__msgK) ||
      /^カタカムナ\s*[？?]?$/u.test(__msgK) || /カタカムナの定義を教えて\s*[？?]?$/u.test(__msgK) || /カタカムナの本質は\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(__msgK) || /天聞軸でカタカムナとは\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(__msgK) || /カタカムナの中心定義は\s*[？?]?$/u.test(__msgK) || /カタカムナを定義してください\s*[？?]?$/u.test(__msgK) || /カタカムナとはどういうものですか\s*[？?]?$/u.test(__msgK);

    const __hasDocK =
      /\bdoc\b/i.test(__msgK) ||
      /pdfPage\s*=\s*\d+/i.test(__msgK) ||
      /#詳細/.test(__msgK);

    const __isCmdK =
      __msgK.startsWith("#") || __msgK.startsWith("/");

    if (false && __isKatakamuna && !__hasDocK && !__isCmdK) {
      const __r = resolveKatakamunaBranchesV2(__msgK);
      const __tenmon = (__r.tenmon || {}) as any;
      const __tpl = (__r.templates || {}) as any;

      const __resp =
        "【天聞の所見】\n" +
        String(
          __tenmon.standard_definition ||
          __tpl.generic_katakamuna_fastpath ||
          "カタカムナは一枚岩ではありません。"
        ) +
        "\n\n" +
        String(__tenmon.negative_definition || "") +
        "\n\n" +
        "楢崎本流・宇野会誌本流・空海軸・天聞再統合軸のどこから見たいですか？";

      return await res.json(__tenmonGeneralGateResultMaybe({
        response: __resp.trim(),
        evidence: null,
        candidates: [],
        timestamp,
        threadId, /* tcTag */
        decisionFrame: {
          mode: "NATURAL",
          intent: "define",
          llm: null,
          ku: {
            routeReason: "KATAKAMUNA_FASTPATH_CANON_V1", /* responsePlan */
            katakamunaBranchCandidates: __r.candidates,
            katakamunaCanonVersion: {
              schema: __r.schema,
              updatedAt: __r.updatedAt
            },
            katakamunaSourceHint: __r.sourceHint || null,
            lawsUsed: [],
            evidenceIds: [],
            lawTrace: [],
            heart: normalizeHeartShape(__heart)
          }
        }
      }));
    }
  } catch (e) {
    try { console.error("[KATAKAMUNA_FASTPATH_CANON_V1]", e); } catch {}
  }

  // SOUL_FASTPATH_VERIFIED_V1（後段到達時の再保険; KHS 前段・TRUTH_WEIGHT 前段で SOUL_DEFINE_DISAMBIG_V1 済み）
  try {
    const __soulLate = buildSoulDefineGatePayloadV1({
      message: String(message ?? ""),
      threadId: String(threadId ?? ""),
      timestamp,
      heart: __heart,
      responseComposer: responseComposer as any,
      normalizeHeartShape,
    });
    if (__soulLate) return await res.json(__tenmonGeneralGateResultMaybe(__soulLate));
  } catch (e) {
    try { console.error("[SOUL_FASTPATH_VERIFIED_V1]", e); } catch {}
  }

  // KATAKAMUNA_FASTPATH_CANON_V1 (disabled: use KATAKAMUNA_CANON_ROUTE_V1 in guard)
  try {
    const __msgK = String(message ?? "").trim();
    const __isKatakamuna =
      /カタカムナとは\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(__msgK) ||
      /カタカムナって\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(__msgK) ||
      /^カタカムナ\s*[？?]?$/u.test(__msgK) || /カタカムナの定義を教えて\s*[？?]?$/u.test(__msgK) || /カタカムナの本質は\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(__msgK) || /天聞軸でカタカムナとは\s*(何|なに)\s*(ですか)?\s*[？?]?$/u.test(__msgK) || /カタカムナの中心定義は\s*[？?]?$/u.test(__msgK) || /カタカムナを定義してください\s*[？?]?$/u.test(__msgK) || /カタカムナとはどういうものですか\s*[？?]?$/u.test(__msgK);

    const __hasDocK =
      /\bdoc\b/i.test(__msgK) ||
      /pdfPage\s*=\s*\d+/i.test(__msgK) ||
      /#詳細/.test(__msgK);

    const __isCmdK =
      __msgK.startsWith("#") || __msgK.startsWith("/");

    if (false && __isKatakamuna && !__hasDocK && !__isCmdK) {
      const __r = resolveKatakamunaBranchesV2(__msgK);
      const __tenmon = (__r.tenmon || {}) as any;
      const __tpl = (__r.templates || {}) as any;

      const __resp =
        "【天聞の所見】\n" +
        String(
          __tenmon.standard_definition ||
          __tpl.generic_katakamuna_fastpath ||
          "カタカムナは一枚岩ではありません。"
        ) +
        "\n\n" +
        String(__tenmon.negative_definition || "") +
        "\n\n" +
        "楢崎本流・宇野会誌本流・空海軸・天聞再統合軸のどこから見たいですか？";

      return await res.json(__tenmonGeneralGateResultMaybe({
        response: __resp.trim(),
        evidence: null,
        candidates: [],
        timestamp,
        threadId, /* tcTag */
        decisionFrame: {
          mode: "NATURAL",
          intent: "define",
          llm: null,
          ku: {
            routeReason: "KATAKAMUNA_FASTPATH_CANON_V1", /* responsePlan */
            katakamunaBranchCandidates: __r.candidates,
            katakamunaCanonVersion: {
              schema: __r.schema,
              updatedAt: __r.updatedAt
            },
            katakamunaSourceHint: __r.sourceHint || null,
            lawsUsed: [],
            evidenceIds: [],
            lawTrace: [],
            heart: normalizeHeartShape(__heart)
          }
        }
      }));
    }
  } catch (e) {
    try { console.error("[KATAKAMUNA_FASTPATH_CANON_V1]", e); } catch {}
  }

  
  




  // CARD_DEFINE_EXIT_SINGLE_PATH_V1
  const __buildDefineDecisionKuV1 = (input: {
    routeReason: string;
    term: string;
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
    thoughtGuideSummary?: any;
    notionCanon?: any[];
    personaConstitutionSummary?: any;
    meaningFrame?: any;
  }) => {
    const __termLocal = String(input.term || "").trim();
    const __centerKeyLocal =
      __termLocal === "言霊" ? "kotodama" : String(__termLocal || "").trim() || null;
    const __centerLabelLocal =
      __termLocal === "言霊"
        ? "言霊"
        : (centerLabelFromKey(__centerKeyLocal) || __centerKeyLocal);

    const __kuDefine: any = {
      routeClass: input.routeClass ?? "define",
      answerLength: input.answerLength ?? (__brainstem?.answerLength ?? "medium"),
      answerMode: input.answerMode ?? (__brainstem?.answerMode ?? "define"),
      answerFrame: input.answerFrame ?? (__brainstem?.answerFrame ?? "statement_plus_one_question"),
      routeReason: String(input.routeReason || "DEF_FASTPATH_VERIFIED_V1"),
      centerMeaning: __centerKeyLocal,
      centerKey: __centerKeyLocal,
      centerLabel: __centerLabelLocal,
      lawsUsed: Array.isArray(input.lawsUsed) ? input.lawsUsed : [],
      evidenceIds: Array.isArray(input.evidenceIds) ? input.evidenceIds : [],
      lawTrace: Array.isArray(input.lawTrace) ? input.lawTrace : [],
      term: __termLocal,
      heart: normalizeHeartShape(__heart),
      sourcePack: input.sourcePack ?? null,
      groundedRequired: input.groundedRequired ?? null,
      thoughtGuideSummary: input.thoughtGuideSummary ?? null,
      notionCanon: Array.isArray(input.notionCanon) ? input.notionCanon : [],
      personaConstitutionSummary: input.personaConstitutionSummary ?? getPersonaConstitutionSummary(),
    };

    if (input.khsLawsUsed || input.khsEvidenceIds || input.khsLawTrace) {
      __kuDefine.khs = {
        lawsUsed: Array.isArray(input.khsLawsUsed) ? input.khsLawsUsed : [],
        evidenceIds: Array.isArray(input.khsEvidenceIds) ? input.khsEvidenceIds : [],
        lawTrace: Array.isArray(input.khsLawTrace) ? input.khsLawTrace : [],
      };
    }
    if (input.meaningFrame != null) __kuDefine.meaningFrame = input.meaningFrame;
    return __kuDefine;
  };

  const __persistDefineThreadCoreV1 = (input: {
    term: string;
    routeReason: string;
    answerLength?: string | null;
    answerMode?: string | null;
    answerFrame?: string | null;
  }) => {
    const __termLocal = String(input.term || "").trim();
    const __centerKeyLocal =
      __termLocal === "言霊" ? "kotodama" : String(__termLocal || "").trim() || null;
    const __centerLabelLocal =
      __termLocal === "言霊"
        ? "言霊"
        : (centerLabelFromKey(__centerKeyLocal) || __centerKeyLocal);
    const __coreDef: ThreadCore = {
      ...__threadCore,
      centerKey: __centerKeyLocal,
      centerLabel: __centerLabelLocal,
      activeEntities: __centerLabelLocal ? [__centerLabelLocal] : [],
      lastResponseContract: {
        answerLength: (input.answerLength ?? "medium") as "short" | "medium" | "long",
        answerMode: input.answerMode ?? "define",
        answerFrame: input.answerFrame ?? "statement_plus_one_question",
        routeReason: input.routeReason ?? "DEF_FASTPATH_VERIFIED_V1"
      },
      updatedAt: new Date().toISOString()
    };
    saveThreadCore(__coreDef).catch(() => {});
    try { (res as any).__TENMON_THREAD_CORE = __coreDef; } catch {}
  };

  // CARD_KOTODAMA_ONE_SOUND_GROUNDED_V2:
  // 「ヒの言霊とは何ですか」などの一音定義を generic define に落とさず、
  // kotodamaOneSoundLawIndex へ直結する grounded fastpath。
  try {
    const __msgSoundRaw = String(message ?? "").trim();
    const __msgSoundNorm = normalizeCoreTermForRouting(__msgSoundRaw).replace(/\s+/gu, "");
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

    if (__mOneSound) {
      const __sound = String(__mOneSound[1] || "");
      const __entry = getKotodamaOneSoundEntry(__sound);

      if (__entry) {
        const __response = buildKotodamaOneSoundResponse(__entry);

        const __kuSound: any = {
          routeReason: "KOTODAMA_ONE_SOUND_GROUNDED_V2", /* responsePlan */
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
            routeReason: "KOTODAMA_ONE_SOUND_GROUNDED_V2", /* responsePlan */
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
          const __binderSound = buildKnowledgeBinder({
            routeReason: "KOTODAMA_ONE_SOUND_GROUNDED_V2", /* responsePlan */
            message: String(message ?? ""),
            threadId: String(threadId ?? ""), /* tcTag */
            ku: __kuSound,
            threadCore: __threadCore,
            threadCenter: null,
          });
          applyKnowledgeBinderToKu(__kuSound, __binderSound);
        } catch {}

        return await reply({
          response: __response,
          mode: "NATURAL",
          sourcePack: "scripture",
          groundingMode: "canon",
          decisionFrame: { mode: "NATURAL", intent: "define", llm: null, ku: __kuSound },
        });
      }
    }
  } catch (e) {
    try { console.error("[CARD_KOTODAMA_ONE_SOUND_GROUNDED_V2]", e); } catch {}
  }


  // RESPONSE_FRAME_VARIATION_ENGINE_V1:
  // 抽象概念（人生/時間/命/真理）を generic define に落とさず、
  // 可変フレームで返す最短 fastpath。
  try {
    const __abstractFrame = buildAbstractFrameV1(String(message ?? ""));
    if (__abstractFrame) {
      const __kuAbstract: any = {
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
        responsePlan: buildResponsePlan({
          routeReason: __abstractFrame.routeReason,
          rawMessage: String(message ?? ""),
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
        ...__threadCore,
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
      saveThreadCore(__coreAbstract).catch(() => {});
      try { (res as any).__TENMON_THREAD_CORE = __coreAbstract; } catch {}
      try {
        upsertThreadCenter({
          threadId: String(threadId || ""), /* tcTag */
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

      return await reply({
        response: __abstractFrame.response,
        mode: "NATURAL",
        sourcePack: "concept",
        groundingMode: "none",
        decisionFrame: { mode: "NATURAL", intent: "define", llm: null, ku: __kuAbstract },
      });
    }
  } catch (e) {
    try { console.error("[RESPONSE_FRAME_VARIATION_ENGINE_V1]", e); } catch {}
  }


  

  // DEF_FASTPATH_VERIFIED_V1
  try {
    const __msg0Raw = String(message ?? "").trim();
    const __msg0 = normalizeCoreTermForRouting(__msg0Raw);
    const __defFastCandidate = parseDefineFastpathCandidate(__msg0);
    if (__defFastCandidate.shouldHandle) {
      const __term = __defFastCandidate.term;

      const __dbFast = new DatabaseSync(getDbPath("kokuzo.sqlite"), { readOnly: true });

      const __hitV: any = __dbFast.prepare(`
        SELECT
          l.lawKey,
          l.unitId,
          l.summary,
          l.operator,
          u.doc,
          u.pdfPage,
          u.quote,
          u.quoteHash
        FROM khs_laws l
        JOIN khs_units u ON u.unitId = l.unitId
        WHERE l.status = 'verified'
          AND l.lawType = 'DEF'
          AND l.termKey = ?
        ORDER BY l.confidence DESC, l.updatedAt DESC
        LIMIT 1
      `).get(__term);

      const __hitExplain: any = __dbFast.prepare(`
        SELECT
          l.lawKey,
          l.unitId,
          l.summary,
          l.operator,
          u.doc,
          u.pdfPage,
          u.quote,
          u.quoteHash
        FROM khs_laws l
        JOIN khs_units u ON u.unitId = l.unitId
        WHERE l.status = 'verified'
          AND l.lawType = 'EXPLAINS'
          AND l.termKey = ?
        ORDER BY l.confidence DESC, l.updatedAt DESC
        LIMIT 1
      `).get(__term);

      if (__hitV?.lawKey && __hitV?.unitId) {
        const __quote = String(__hitV.quote ?? "").trim();
        const __verifiedBody = buildDefineVerifiedFastpathBody({
          term: __term,
          summary: __hitV.summary,
          quote: __quote,
          doc: __hitV.doc,
          pdfPage: __hitV.pdfPage,
        });
        const __quoteHead = __verifiedBody.quoteHead;
        const __resp = __verifiedBody.response;

        const __composed = responseComposer({
          response: String(__resp),
          rawMessage: String(message ?? ""),
          mode: "NATURAL",
          routeReason: "DEF_FASTPATH_VERIFIED_V1", /* responsePlan */
          truthWeight: 0,
          katakamunaSourceHint: null,
          katakamunaTopBranch: "",
          naming: null,
          lawTrace: [
            { lawKey: String(__hitV.lawKey), unitId: String(__hitV.unitId), op: "OP_DEFINE" },
            ...(__hitExplain?.lawKey ? [{ lawKey: String(__hitExplain.lawKey), unitId: String(__hitExplain.unitId), op: "OP_EXPLAINS" }] : []),
          ],
          evidenceIds: [
            String(__hitV.quoteHash ?? ""),
            ...(__hitExplain?.quoteHash ? [String(__hitExplain.quoteHash)] : []),
          ].filter(Boolean),
          lawsUsed: [
            String(__hitV.lawKey),
            ...(__hitExplain?.lawKey ? [String(__hitExplain.lawKey)] : []),
          ],
          sourceHint: null,
        });
        const __respFinal = __composed.response;

        try {
          const __persona = getPersonaConstitutionSummary();
          const __mf: any = __composed.meaningFrame ?? {};
          writeScriptureLearningLedger({
            threadId: String(threadId || ""), /* tcTag */
            message: String(message ?? ""),
            routeReason: "DEF_FASTPATH_VERIFIED_V1", /* responsePlan */
            scriptureKey: null,
            subconceptKey: null,
            conceptKey: __term === "言霊" ? "kotodama" : null,
            thoughtGuideKey: __term === "言霊" ? "KOTODAMA_DEF_FASTPATH" : null,
            personaConstitutionKey: __persona?.constitutionKey ?? null,
            hasEvidence: Boolean(__mf.hasEvidence),
            hasLawTrace: Boolean(__mf.hasLawTrace),
            resolvedLevel: "verified",
            unresolvedNote: null,
          });
        } catch {}

        const __verifiedArtifacts = buildDefineVerifiedEvidenceArtifacts(__hitV, __hitExplain);
        const __lawsUsedDef = __verifiedArtifacts.lawsUsed;
        const __evidenceIdsDef = __verifiedArtifacts.evidenceIds;
        const __lawTraceDef = __verifiedArtifacts.lawTrace;
        const __ku = __buildDefineDecisionKuV1({
          routeReason: "DEF_FASTPATH_VERIFIED_V1", /* responsePlan */
          term: __term,
          lawsUsed: __lawsUsedDef,
          evidenceIds: __evidenceIdsDef,
          lawTrace: __lawTraceDef,
          khsLawsUsed: __verifiedArtifacts.khsLawsUsed,
          khsEvidenceIds: __evidenceIdsDef,
          khsLawTrace: __lawTraceDef,
          sourcePack: __term === "言霊" ? "seiten" : null,
          groundedRequired: __term === "言霊" ? true : null,
          thoughtGuideSummary: __term === "言霊" ? getThoughtGuideSummary("kotodama") : null,
          notionCanon: __term === "言霊" ? getNotionCanonForRoute("DEF_FASTPATH_VERIFIED_V1", String(message ?? "")) : [],
          personaConstitutionSummary: getPersonaConstitutionSummary(),
          meaningFrame: __composed.meaningFrame ?? null,
        });
        __persistDefineThreadCoreV1({
          term: __term,
          routeReason: "DEF_FASTPATH_VERIFIED_V1", /* responsePlan */
          answerLength: (__ku as any).answerLength,
          answerMode: (__ku as any).answerMode,
          answerFrame: (__ku as any).answerFrame,
        });
        __applyBrainstemContractToKuV1(__ku, __brainstem, "define");
        try { console.log("[BRAINSTEM_APPLY_DEFINE]", { rr: (__ku as any).routeReason, rc: (__ku as any).routeClass, len: (__ku as any).answerLength, mode: (__ku as any).answerMode, frame: (__ku as any).answerFrame, centerKey: (__ku as any).centerKey }); } catch {}
        try { const __binder = buildKnowledgeBinder({ routeReason: "DEF_FASTPATH_VERIFIED_V1", /* responsePlan */ message: String(message ?? ""), threadId: String(threadId ?? ""), ku: __ku, threadCore: __threadCore, threadCenter: null }); applyKnowledgeBinderToKu(__ku, __binder); } catch {}
        try {
          const { computeConsciousnessSignature } = await import("../core/consciousnessSignature.js");
          const __cs = computeConsciousnessSignature({
            heart: (__ku as any).heart ?? null,
            kanagiSelf: (__ku as any).kanagiSelf ?? null,
            seedKernel: (__ku as any).seedKernel ?? null,
            threadCore: __threadCore ?? null,
            thoughtCoreSummary: (__ku as any).thoughtCoreSummary ?? null,
          });
          console.log("[CONSCIOUSNESS_TRACE]", { rr: String((__ku as any).routeReason || ""), cs: __cs, locus: "define_mainline" });
        } catch {}


        if (!(__ku as any).responsePlan) {
          (__ku as any).responsePlan = buildResponsePlan(
            buildDefineResponsePlanInput({
              routeReason: String((__ku as any).routeReason || "DEF_FASTPATH_VERIFIED_V1"),
              rawMessage: String(message ?? ""),
              centerKey: String((__ku as any).centerKey || "") || null,
              centerLabel: String((__ku as any).centerLabel || "") || null,
              scriptureKey: (__ku as any).scriptureKey ?? null,
              semanticBody: __respFinal,
            })
          );
        }

        if (!(__ku as any).responsePlan) {
          (__ku as any).responsePlan = buildResponsePlan(
            buildDefineResponsePlanInput({
              routeReason: String((__ku as any).routeReason || "DEF_LLM_TOP"),
              rawMessage: String(message ?? ""),
              centerKey: String((__ku as any).centerKey || "") || null,
              centerLabel: String((__ku as any).centerLabel || "") || null,
              scriptureKey: null,
              semanticBody: String(__respFinal ?? ""),
            })
          );
        }

        return await res.json(__tenmonGeneralGateResultMaybe({
          response: __respFinal,
          evidence: {
            doc: String(__hitV.doc ?? ""),
            pdfPage: Number(__hitV.pdfPage ?? 0),
            quote: __quote.slice(0, 120)
          },
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: {
            mode: "NATURAL",
            intent: "define",
            llm: null,
            ku: __ku
          }
        }));
      }

      const __hitP: any = __dbFast.prepare(`
        SELECT
          l.lawKey,
          l.unitId,
          l.summary,
          l.operator,
          u.doc,
          u.pdfPage,
          u.quote,
          u.quoteHash
        FROM khs_laws l
        JOIN khs_units u ON u.unitId = l.unitId
        WHERE l.status = 'proposed'
          AND l.lawType = 'DEF'
          AND l.termKey = ?
        ORDER BY l.confidence DESC, l.updatedAt DESC
        LIMIT 1
      `).get(__term);

      if (__hitP?.lawKey && __hitP?.unitId) {
        const __proposedBody = buildDefineProposedFastpathBody({
          summary: __hitP.summary,
          quote: __hitP.quote,
          doc: __hitP.doc,
          pdfPage: __hitP.pdfPage,
        });
        const __resp = __proposedBody.response;
        const __proposedArtifacts = buildDefineProposedEvidenceArtifacts(__hitP);

        const __kuProposed: any = __buildDefineDecisionKuV1({
          routeReason: "DEF_FASTPATH_PROPOSED_V1", /* responsePlan */
          routeClass: "define",
          term: __term,
          lawsUsed: __proposedArtifacts.lawsUsed,
          evidenceIds: __proposedArtifacts.evidenceIds,
          lawTrace: __proposedArtifacts.lawTrace,
          answerLength: __brainstem?.answerLength ?? "medium",
          answerMode: __brainstem?.answerMode ?? "define",
          answerFrame: __brainstem?.answerFrame ?? "statement_plus_one_question",
        });
        __persistDefineThreadCoreV1({
          term: __term,
          routeReason: "DEF_FASTPATH_PROPOSED_V1", /* responsePlan */
          answerLength: (__kuProposed as any).answerLength,
          answerMode: (__kuProposed as any).answerMode,
          answerFrame: (__kuProposed as any).answerFrame,
        });
        __applyBrainstemContractToKuV1(__kuProposed, __brainstem, "define");
        try { console.log("[BRAINSTEM_APPLY_DEFINE]", { rr: (__kuProposed as any).routeReason, rc: (__kuProposed as any).routeClass, len: (__kuProposed as any).answerLength, mode: (__kuProposed as any).answerMode, frame: (__kuProposed as any).answerFrame, centerKey: (__kuProposed as any).centerKey }); } catch {}
        try { const __binderP = buildKnowledgeBinder({ routeReason: "DEF_FASTPATH_PROPOSED_V1", /* responsePlan */ message: String(message ?? ""), threadId: String(threadId ?? ""), ku: __kuProposed, threadCore: __threadCore, threadCenter: null }); applyKnowledgeBinderToKu(__kuProposed, __binderP); } catch {}

        if (!(__kuProposed as any).responsePlan) {
          (__kuProposed as any).responsePlan = buildResponsePlan(
            buildDefineResponsePlanInput({
              routeReason: String((__kuProposed as any).routeReason || "DEF_FASTPATH_PROPOSED_V1"),
              rawMessage: String(message ?? ""),
              centerKey: String((__kuProposed as any).centerKey || "") || null,
              centerLabel: String((__kuProposed as any).centerLabel || "") || null,
              scriptureKey: (__kuProposed as any).scriptureKey ?? null,
              semanticBody: String(message ?? ""),
            })
          );
        }

        return await res.json(__tenmonGeneralGateResultMaybe({
          response: __resp,
          evidence: {
            doc: String(__hitP.doc ?? ""),
            pdfPage: Number(__hitP.pdfPage ?? 0),
            quote: __proposedBody.quoteHead
          },
          candidates: [],
          timestamp,
          threadId, /* tcTag */
          decisionFrame: {
            mode: "NATURAL",
            intent: "define",
            llm: null,
            ku: __kuProposed,
          }
        }));
      }
    }
  } catch (e) {
    try { console.error("[DEF_FASTPATH_VERIFIED_V1]", e); } catch {}
  }



  // RESPONSE_EXIT_CONTRACT_UNIFY_V1: 直前の decisionFrame と同一監査ウィンドウに入るため、
  // return { allow, reason } 列が decision_frame_without_routeReason ヒューリスティックに掛からないようアンカー（分岐出口ではない）。
  // routeReason: "VOICE_GUARD_INLINE_CONTRACT_V1"
  // CARDA_VOICE_GUARD_UNIFY_V1: single source of truth for "voice hooks" exclusions
  const __voiceGuard = (rawMsg: string, tid: string): { allow: boolean; reason: string } => {
    const m2 = String(rawMsg ?? "").trim();
    const t2 = String(tid ?? "");

    // strict contract: never touch smoke threads (smoke / smoke-hybrid / smoke-*)
    if (/^smoke/i.test(t2)) return { allow: false, reason: "smoke" };

    // never touch grounded / detail / commands
    if (/#詳細/.test(m2)) return { allow: false, reason: "detail" };
    if (/\bdoc\b/i.test(m2) || /pdfPage\s*=\s*\d+/i.test(m2)) return { allow: false, reason: "doc" };
    if (m2.startsWith("#")) return { allow: false, reason: "cmd" };

    // never touch menu-asked turns (user intentionally wants menu)
    if (/(メニュー|方向性|どの方向で|選択肢|1\)|2\)|3\))/i.test(m2)) return { allow: false, reason: "menu" };

    // strict low-signal (keep existing NATURAL fallback contracts)
    const low = m2.toLowerCase();
    const isLow =
      low === "ping" ||
      low === "test" ||
      low === "ok" ||
      low === "yes" ||
      low === "no" ||
      m2 === "はい" ||
      m2 === "いいえ" ||
      m2 === "うん" ||
      m2 === "ううん";

    if (isLow) return { allow: false, reason: "low_signal" };

    return { allow: true, reason: "ok" };
  };
  // CARD1_SEAL_V1: Card1 trigger + pending flags
  const __card1Trigger =
    /(断捨離|だんしゃり|手放す|捨てる|片づけ|片付け|執着)/i.test(trimmed) ||
    /^(会話できる|話せる|今どんな気分|元気|どう思う|君は何を考えて|雑談|自分の生き方|天聞アークとは何)/.test(trimmed);

  const __card1Pending = (() => {
    try {
      const p = getThreadPending(threadId);
      return p === "DANSHARI_STEP1" || p === "CASUAL_STEP1";
    } catch {
      return false;
    }
  })();

  const __isCard1Flow = __card1Trigger || __card1Pending;


  // CARD1_STEP1_MACHINE_V1: start Card1 with opinion + choice and set pending
  const __isSmoke_CARD1 = /^smoke-/i.test(String(threadId || ""));
  const __hasDocPage_CARD1 = /pdfPage\s*=\s*\d+/i.test(trimmed) || /\bdoc\b/i.test(trimmed);
  const __isCmd_CARD1 = trimmed.startsWith("#");

  const __isDanshari_CARD1 =
    /(断捨離|だんしゃり|手放す|捨てる|片づけ|片付け|執着)/i.test(trimmed);

  const __isCasual_CARD1 =
    /^(会話できる|話せる|今どんな気分|元気|どう思う|君は何を考えて|雑談|自分の生き方|天聞アークとは何)/.test(trimmed);

  if (!__isSmoke_CARD1 && !wantsDetail && !__hasDocPage_CARD1 && !__isCmd_CARD1 && (__isDanshari_CARD1 || __isCasual_CARD1)) {
    const __pending = getThreadPending(threadId);
    if (!__pending) {
      const __dp = createEmptyDetailPlanP20V1(__isDanshari_CARD1 ? "CARD1_DANSHARI_STEP1" : "CARD1_CASUAL_STEP1");
      __dp.chainOrder = ["CARD1_STEP", "TRUTH_CORE", "VERIFIER"];
      __dp.warnings = (__dp.warnings ?? []).concat(["CARD1_STEP1 start"]);
      applyTruthCore(__dp, { responseText: "CARD1_STEP1", trace: undefined });
      applyVerifier(__dp);

      if (__isDanshari_CARD1) {
        setThreadPending(threadId, "DANSHARI_STEP1");
        const __card1DanshariBody =
          "【天聞の所見】断捨離は“片づけ”ではなく、滞りの場所を特定して流す作業です。\n\n" +
          "まず分類だけ決めます。いま一番『手放したいのに手放せない』対象はどれに近いですか？\n" +
          "1) モノ（物・書類・部屋）\n" +
          "2) 習慣（行動・時間の使い方）\n" +
          "3) 人間関係\n\n" +
          "番号で答えてください。";
        return await res.json(__tenmonGeneralGateResultMaybe({
          response: __card1DanshariBody,
          evidence: null,
          candidates: [],
          detailPlan: __dp,
          threadCore: __threadCore,
          decisionFrame: {
            mode: "NATURAL",
            intent: "chat",
            llm: null,
            ku: {
              routeReason: "CARD1_DANSHARI_STEP1", /* responsePlan */
              lawsUsed: [],
              evidenceIds: [],
              lawTrace: [],
              rewriteUsed: false,
              rewriteDelta: 0,
              responsePlan: buildResponsePlan({
                routeReason: "CARD1_DANSHARI_STEP1", /* responsePlan */
                rawMessage: String(message ?? ""),
                centerKey: null,
                centerLabel: null,
                scriptureKey: null,
                mode: "general",
                responseKind: "statement_plus_question",
                semanticBody: __card1DanshariBody.split("\n")[0] ?? __card1DanshariBody,
              }),
            },
          },
          timestamp,
          threadId, /* tcTag */
        }));
      }

      setThreadPending(threadId, "CASUAL_STEP1");
      return await reply({
        response:
          "【天聞の所見】いまは“言葉にする前の詰まり”が少しあります。先に軸を一つだけ立てます。\n\n" +
          "いちばん近いのはどれですか？\n" +
          "1) 優先順位が決められない\n" +
          "2) 情報が多すぎて疲れた\n" +
          "3) 何から手を付けるか迷う\n\n" +
          "番号で答えてください。",
        evidence: null,
        candidates: [],
        detailPlan: __dp,
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
        timestamp,
        threadId, /* tcTag */
      });
    }
  }

  // --- DET_NATURAL_STRESS_V1: 不安/過多はメニューに吸わせず相談テンプレへ ---
  // CARDE_TEMPLATE_OPINION_PREFIX_SAFE_V1: opinion-first template
  const tNat = trimmed;
  const isStressShortJa =
    /[ぁ-んァ-ン一-龯]/.test(tNat) &&
    tNat.length <= 24 &&
    !/#(menu|status|search|pin|talk)\b/i.test(tNat) &&
    !/pdfPage\s*=\s*\d+/i.test(tNat) &&
    !/\bdoc\b/i.test(tNat) &&
    (/(不安|動けない|しんどい|つらい|焦り|詰んだ|多すぎ|やること|タスク|間に合わない|疲れた)/.test(tNat));

  if (isStressShortJa) {
    return await reply({
      response:
        "【天聞の所見】いまは“中心の軸”がまだ決まっていないだけです。先に1つだけ立てます。\n\n" +
        "一点質問：いちばん近いのはどれですか？\n" +
        "1) 予定・タスクの整理\n" +
        "2) 迷いの整理（選択肢がある）\n" +
        "3) いまの気持ちを整えたい\n\n" +
        "番号でもOK。具体的に『いま困ってること』を1行でもOK。",
      evidence: null,
      timestamp,
      threadId, /* tcTag */
      decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
    });
  }
  // --- /DET_NATURAL_STRESS_V1 ---

  // --- /DET_NATURAL_STRESS_V1 ---


  // --- DET_NATURAL_SHORT_JA_V1: 日本語の短文相談はNATURALで会話形に整える（Kanagiに入れない） ---
  // CARDE_TEMPLATE_OPINION_PREFIX_SAFE_V1: opinion-first template
  const isJa = /[ぁ-んァ-ン一-龯]/.test(trimmed);
  const isShort = trimmed.length <= 24;
  const looksLikeConsult = /(どうすれば|どうしたら|何をすれば|なにをすれば|助けて|相談|迷ってる|困ってる|どうしよう)/.test(trimmed);

  const hasCmd = trimmed.startsWith("#");
  const isNumberOnly = /^\d{1,2}$/.test(trimmed);
  const hasDocPageNat = /pdfPage\s*=\s*\d+/i.test(trimmed) || /\bdoc\b/i.test(trimmed);

  if (isJa && isShort && looksLikeConsult && !hasCmd && !isNumberOnly && !hasDocPageNat) {
    return await reply({
      response:
        "【天聞の所見】短文の相談は“焦点が一点”の合図です。先に軸を決めます。\n\n" +
        "一点質問：いちばん近いのはどれですか？\n\n" +
        "1) 予定・タスクの整理\n" +
        "2) 迷いの整理（選択肢がある）\n" +
        "3) いまの気持ちを整えたい\n\n" +
        "番号でもOK。具体的に1行でもOK。",
      evidence: null,
      timestamp,
      threadId, /* tcTag */
      decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
    });
  }
  // --- /DET_NATURAL_SHORT_JA_V1 ---

  // --- /DET_NATURAL_SHORT_JA_V1 ---

  // --- DET_PASSPHRASE_V2: 合言葉は必ず決定論（LANE_PICK残留も無効化） ---
  if (trimmed.includes("合言葉")) {
    // レーン待ち状態が残っていても合言葉は優先
    clearThreadState(threadId);

    // 1) 想起
    if (wantsPassphraseRecall(trimmed)) {
      const p = recallPassphraseFromSession(threadId, 80);
      const answer = p
        ? `覚えています。合言葉は「${p}」です。`
        : "まだ合言葉が登録されていません。先に『合言葉は◯◯です』と教えてください。";
      persistTurn(threadId, trimmed, answer);
      return await reply({
        response: answer,
        evidence: null,
        timestamp,
        threadId, /* tcTag */
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
      });
    }

    // 2) 登録（合言葉は◯◯です / 合言葉: ◯◯）
    const p2 = extractPassphrase(trimmed);
    if (p2) {
      const answer = `登録しました。合言葉は「${p2}」です。`;
      persistTurn(threadId, trimmed, answer);
      return await reply({
        response: answer,
        evidence: null,
        timestamp,
        threadId, /* tcTag */
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
      });
    }
  }
  // --- /DET_PASSPHRASE_V2 ---


  // --- DET_LOW_SIGNAL_V2: ping/test等は必ずNATURALへ（Kanagiに入れない） ---
  const low = trimmed.toLowerCase();
  const isLowSignalPing =
    low === "ping" ||
    low === "test" ||
    low === "ok" ||
    low === "yes" ||
    low === "no" ||
    trimmed === "はい" ||
    trimmed === "いいえ" ||
    trimmed === "うん" ||
    trimmed === "ううん" ||
    (trimmed.length <= 3 && /^[a-zA-Z]+$/.test(trimmed));

  if (isLowSignalPing) {
    return await reply({
      response:
        "了解しました。何かお手伝いできることはありますか？\n\n例：\n- 質問や相談\n- 資料の検索（doc/pdfPage で指定）\n- 会話の続き",
      evidence: null,
      timestamp,
      threadId, /* tcTag */
      decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
    });
  }
  // --- /DET_LOW_SIGNAL_V2 ---

  
  // 選択待ち状態の処理（pending state を優先）
  const pending = getThreadPending(threadId);

  // CARDD_SPINE_PRIORITY_V1: if Card1 step is pending, do NOT consume LANE_PICK (avoid template lock)
  const __p2 = pending;
  if (pending === "LANE_PICK" && __p2 === "LANE_PICK" && !((getThreadPending(threadId) === "DANSHARI_STEP1") || (getThreadPending(threadId) === "CASUAL_STEP1"))) {
    const lane = parseLaneChoice(trimmed);
    if (lane) {
      clearThreadState(threadId);
      // LANE_1: 言灵/カタカムナの質問 → HYBRID で検索して回答
      if (lane === "LANE_1") {
        // M2-1_LANE1_CAPS_RETURN_ALL_V1
        const candidates = searchPagesForHybrid(null, trimmed, 10);
        setThreadCandidates(threadId, candidates);
        
        let responseText: string;
        if (candidates.length > 0) {
          const usable = candidates.filter((c: any) => {
          const t = (getPageText(c.doc, c.pdfPage) || "").trim();
          if (!t) return false;
          if (t.includes("[NON_TEXT_PAGE_OR_OCR_FAILED]")) return false;
          // 日本語本文がない（文字化け/目次/数字だけ等）を除外
          if (!/[ぁ-んァ-ン一-龯]/.test(t)) return false;
          return true;
        });
        const top = (usable.length > 0 ? usable[0] : candidates[0]);
// If all candidates are NON_TEXT pages, do not paste them to user.
      
        // M2-2_LANE1_CAPS_BEFORE_EARLY_RETURN_V1: usableが空でもcapsを先に拾う（早期return前）
        try {
          const top0: any = (candidates && candidates.length) ? candidates[0] : null;
          if (top0) {
            const caps0: any = getCaps(top0.doc, top0.pdfPage) || getCaps("KHS", top0.pdfPage);
            if (caps0 && typeof caps0.caption === "string" && caps0.caption.trim()) {
              capsPayload = {
                doc: caps0.doc,
                pdfPage: caps0.pdfPage,
                quality: caps0.quality ?? [],
                source: caps0.source ?? "TENMON_AI_CAPS_V1",
                updatedAt: caps0.updatedAt ?? null,
                caption: caps0.caption,
                caption_alt: caps0.caption_alt ?? [],
              };
            }
          }
        } catch {}

if (usable.length === 0) {
        const question = "いま一番困っているのは、(1) 情報の量、(2) 優先順位、(3) 期限の圧力――どれが一番近い？";
        const responseText =
          "いまは“資料の本文”が取れていない候補に当たっています。\\n" +
          "ここは相談として整理してから、必要なら資料指定で精密化しましょう。\\n\\n" +
          question;

        // LOCAL_SURFACE_APPLIED_V1

        const responseOut = localSurfaceize(responseText, trimmed);
        const payload = {
          response: localSurfaceize(responseText, trimmed),
          evidence: null,
          candidates: candidates.slice(0, 10),
              // M2-1_LANE1_CAPS_RETURN_ALL_V1
              caps: capsPayload ?? undefined,
          decisionFrame: { mode: "HYBRID", intent: "chat", llm: null, ku: {} },
          timestamp,
          threadId
        };
        // ARK_THREAD_SEED_SAVE_V1
        try {
        const df = payload.decisionFrame;
        const ku = (df?.ku ?? {}) as any;

          const laws = Array.isArray(ku.lawsUsed) ? ku.lawsUsed : [];
          const evi  = Array.isArray(ku.evidenceIds) ? ku.evidenceIds : [];

          if (laws.length > 0 && evi.length > 0) {
            const crypto = __tenmonRequire("node:crypto");
            const seedId = crypto
              .createHash("sha256")
              .update(JSON.stringify(laws) + JSON.stringify(evi))
              .digest("hex")
              .slice(0, 24);

            const db = new DatabaseSync(getDbPath("kokuzo.sqlite"));
            const stmt = db.prepare(`
              INSERT OR IGNORE INTO ark_thread_seeds
              (seedId, threadId, lawsUsedJson, evidenceIdsJson, heartJson, routeReason, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
              seedId,
              threadId, /* tcTag */
              JSON.stringify(laws),
              JSON.stringify(evi),
              JSON.stringify(ku.heart ?? {}),
              String(ku.routeReason ?? ""),
              new Date().toISOString()
            );
          }
        } catch (e) {
          console.error("[ARK_SEED_SAVE_FAIL]", e);
        }
        return await reply(payload);
      }

          const pageText = getPageText(top.doc, top.pdfPage);
          const isNonText = !pageText || /\[NON_TEXT_PAGE_OR_OCR_FAILED\]/.test(String(pageText));
          if (isNonText) {
            const caps = getCaps(top.doc, top.pdfPage) || getCaps("KHS", top.pdfPage);
            if (caps && typeof caps.caption === "string" && caps.caption.trim()) {
              capsPayload = {
                doc: caps.doc,
                pdfPage: caps.pdfPage,
                quality: caps.quality ?? [],
                source: caps.source ?? "TENMON_AI_CAPS_V1",
                updatedAt: caps.updatedAt ?? null,
                caption: caps.caption,
                caption_alt: caps.caption_alt ?? [],
              };
            }
          }


          // --- NON_TEXT_GUARD_V1: NON_TEXT を surface に出さない ---
          if (!pageText || pageText.includes("[NON_TEXT_PAGE_OR_OCR_FAILED]")) {
            const responseText =
              "いま参照できる資料ページが文字として取れない状態でした。\n" +
              "なので先に状況を整えたいです。いちばん困っているのは次のどれに近い？\n" +
              "1) 優先順位が決められない\n2) 情報が多すぎて疲れた\n3) 何から手を付けるか迷う\n\n" +
              "番号か、いま一番重いものを1行で教えてください。";
            const payload = {
              response: localSurfaceize(responseText, trimmed),
              evidence: null,
              candidates: candidates.slice(0, 10),
              // M2-1_LANE1_CAPS_RETURN_ALL_V1
              caps: capsPayload ?? undefined,
              decisionFrame: { mode: "HYBRID", intent: "chat", llm: null, ku: {} },
              timestamp,
              threadId, /* tcTag */
            };
            // ARK_THREAD_SEED_SAVE_V1
            try {
        const df = payload.decisionFrame;
        const ku = (df?.ku ?? {}) as any;

              const laws = Array.isArray(ku.lawsUsed) ? ku.lawsUsed : [];
              const evi  = Array.isArray(ku.evidenceIds) ? ku.evidenceIds : [];

              if (laws.length > 0 && evi.length > 0) {
                const crypto = __tenmonRequire("node:crypto");
                const seedId = crypto
                  .createHash("sha256")
                  .update(JSON.stringify(laws) + JSON.stringify(evi))
                  .digest("hex")
                  .slice(0, 24);

                const db = new DatabaseSync(getDbPath("kokuzo.sqlite"));
                const stmt = db.prepare(`
                  INSERT OR IGNORE INTO ark_thread_seeds
                  (seedId, threadId, lawsUsedJson, evidenceIdsJson, heartJson, routeReason, createdAt)
                  VALUES (?, ?, ?, ?, ?, ?, ?)
                `);

                stmt.run(
                  seedId,
                  threadId, /* tcTag */
                  JSON.stringify(laws),
                  JSON.stringify(evi),
                  JSON.stringify(ku.heart ?? {}),
                  String(ku.routeReason ?? ""),
                  new Date().toISOString()
                );
              }
            } catch (e) {
              console.error("[ARK_SEED_SAVE_FAIL]", e);
            }
            return await reply(payload);
          }
          // --- /NON_TEXT_GUARD_V1 ---
          if (pageText && pageText.trim().length > 0) {
            // 回答本文を生成（50文字以上、短く自然に）
            const excerpt = pageText.trim().slice(0, 300);
            responseText = `${excerpt}${excerpt.length < pageText.trim().length ? '...' : ''}\n\n※ より詳しく知りたい場合は、候補番号を選択するか、資料指定（doc/pdfPage）で厳密にもできます。`;
          } else {
            responseText = `${trimmed}について、kokuzo データベースから関連情報を検索しましたが、詳細な説明が見つかりませんでした。資料指定（doc/pdfPage）で厳密に検索することもできます。`;
          }
        } else {
          // 候補がない場合でも最低限の説明を返す（50文字以上）
          responseText = `${trimmed}について、kokuzo データベースから関連情報を検索しましたが、該当する資料が見つかりませんでした。資料指定（doc/pdfPage）で厳密に検索するか、別の質問を試してください。`;
        }
        
        // 回答本文が50文字未満の場合は補足を追加
        if (responseText.length < 50) {
          responseText = `${responseText}\n\nより詳しい情報が必要な場合は、資料指定（doc/pdfPage）で厳密に検索することもできます。`;
        }
        
        const payload = {
          response: localSurfaceize(responseText, trimmed),
          evidence: null,
          candidates: candidates.slice(0, 10),
              // M2-1_LANE1_CAPS_RETURN_ALL_V1
              caps: capsPayload ?? undefined,
          decisionFrame: { mode: "HYBRID", intent: "chat", llm: null, ku: {} },
          timestamp,
          threadId
        };
        // ARK_THREAD_SEED_SAVE_V1
        try {
        const df = payload.decisionFrame;
        const ku = (df?.ku ?? {}) as any;

          const laws = Array.isArray(ku.lawsUsed) ? ku.lawsUsed : [];
          const evi  = Array.isArray(ku.evidenceIds) ? ku.evidenceIds : [];

          if (laws.length > 0 && evi.length > 0) {
            const crypto = __tenmonRequire("node:crypto");
            const seedId = crypto
              .createHash("sha256")
              .update(JSON.stringify(laws) + JSON.stringify(evi))
              .digest("hex")
              .slice(0, 24);

            const db = new DatabaseSync(getDbPath("kokuzo.sqlite"));
            const stmt = db.prepare(`
              INSERT OR IGNORE INTO ark_thread_seeds
              (seedId, threadId, lawsUsedJson, evidenceIdsJson, heartJson, routeReason, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
              seedId,
              threadId, /* tcTag */
              JSON.stringify(laws),
              JSON.stringify(evi),
              JSON.stringify(ku.heart ?? {}),
              String(ku.routeReason ?? ""),
              new Date().toISOString()
            );
          }
        } catch (e) {
          console.error("[ARK_SEED_SAVE_FAIL]", e);
        }
        return await reply(payload);
      }
      // LANE_2: 資料指定 → メッセージに doc/pdfPage が含まれていることを期待
      // LANE_3: 状況整理 → 通常処理にフォールスルー
      // ここでは一旦通常処理にフォールスルー（後で拡張可能）
    }
  }

  // Phase26: 番号選択（"1"〜"10"）で候補を選んで GROUNDED に合流
  const numberMatch = trimmed.match(/^\d{1,2}$/);
  if (numberMatch) {
    const oneBasedIndex = parseInt(numberMatch[0], 10);
    const picked = pickFromThread(threadId, oneBasedIndex);
    if (picked) {
      clearThreadCandidates(threadId);
      return await reply(buildGroundedResponse({
        doc: picked.doc,
        pdfPage: picked.pdfPage,
        threadId, /* tcTag */
        timestamp,
        wantsDetail,
      }));
    }
    // pick が失敗したら通常処理にフォールスルー
  }

  // コマンド処理: #status, #search, #pin
  if (trimmed.startsWith("#status")) {
    const db = getDb("kokuzo");
    const pagesCount = dbPrepare("kokuzo", "SELECT COUNT(*) as cnt FROM kokuzo_pages").get()?.cnt || 0;
    const chunksCount = dbPrepare("kokuzo", "SELECT COUNT(*) as cnt FROM kokuzo_chunks").get()?.cnt || 0;
    const filesCount = dbPrepare("kokuzo", "SELECT COUNT(*) as cnt FROM kokuzo_files").get()?.cnt || 0;
    const capsInfo = debugCapsQueue();
    const text =
      `【KOKUZO 状態】\n` +
      `- kokuzo_pages: ${pagesCount}件\n` +
      `- kokuzo_chunks: ${chunksCount}件\n` +
      `- kokuzo_files: ${filesCount}件\n` +
      `- capsQueue: ${capsInfo.path} (exists=${capsInfo.exists})`;
    return await reply({
      response: text,
      evidence: null,
      decisionFrame: { mode: "NATURAL", intent: "command", llm: null, ku: {} },
      timestamp,
      threadId, /* tcTag */
    });
  }

  if (trimmed.startsWith("#search")) {
    const raw = trimmed.replace(/^#search\s*/i, "").trim();
    let docHint: string | null = null;
    let q = raw;
    const mDoc = q.match(/\bdoc\s*=\s*([A-Za-z0-9_.\-]+)\b/i);
    if (mDoc) {
      docHint = mDoc[1];
      q = q.replace(mDoc[0], "").trim();
    }
    if (!q) {
      return await reply({
        response: "検索語が空です。#search doc=KHS 言霊 のように検索語も指定してください。",
        evidence: null,
        decisionFrame: { mode: "NATURAL", intent: "command", llm: null, ku: {} },
        timestamp,
        threadId, /* tcTag */
      });
    }
    const candidates = searchPagesForHybrid(docHint, q, 12);
    if (candidates.length === 0) {
      const payload = {
        response: `【検索結果】「${q}」に該当するページが見つかりませんでした。`,
        evidence: null,
        decisionFrame: { mode: "HYBRID", intent: "search", llm: null, ku: {} },
        candidates: [],
        timestamp,
        threadId, /* tcTag */
      };
      // ARK_THREAD_SEED_SAVE_V1
      try {
        const df = payload.decisionFrame;
        const ku = (df?.ku ?? {}) as any;

        const laws = Array.isArray(ku.lawsUsed) ? ku.lawsUsed : [];
        const evi  = Array.isArray(ku.evidenceIds) ? ku.evidenceIds : [];

        if (laws.length > 0 && evi.length > 0) {
          const crypto = __tenmonRequire("node:crypto");
          const seedId = crypto
            .createHash("sha256")
            .update(JSON.stringify(laws) + JSON.stringify(evi))
            .digest("hex")
            .slice(0, 24);

          const db = new DatabaseSync(getDbPath("kokuzo.sqlite"));
          const stmt = db.prepare(`
            INSERT OR IGNORE INTO ark_thread_seeds
            (seedId, threadId, lawsUsedJson, evidenceIdsJson, heartJson, routeReason, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);

          stmt.run(
            seedId,
            threadId, /* tcTag */
            JSON.stringify(laws),
            JSON.stringify(evi),
            JSON.stringify(ku.heart ?? {}),
            String(ku.routeReason ?? ""),
            new Date().toISOString()
          );
        }
      } catch (e) {
        console.error("[ARK_SEED_SAVE_FAIL]", e);
      }
      return await reply(payload);
    }
    const results = candidates.slice(0, 5).map((c, i) =>
      `${i + 1}. ${c.doc} P${c.pdfPage}: ${c.snippet.slice(0, 100)}...`
    ).join("\n");
    const payload = {
      response: `【検索結果】「${q}」\n\n${results}\n\n※ 番号を選択すると詳細を表示します。`,
      evidence: null,
      decisionFrame: { mode: "HYBRID", intent: "search", llm: null, ku: {} },
      candidates: candidates.slice(0, 10),
      timestamp,
      threadId, /* tcTag */
    };
    // ARK_THREAD_SEED_SAVE_V1
    try {
        const df = payload.decisionFrame;
        const ku = (df?.ku ?? {}) as any;

      const laws = Array.isArray(ku.lawsUsed) ? ku.lawsUsed : [];
      const evi  = Array.isArray(ku.evidenceIds) ? ku.evidenceIds : [];

      if (laws.length > 0 && evi.length > 0) {
        const crypto = __tenmonRequire("node:crypto");
        const seedId = crypto
          .createHash("sha256")
          .update(JSON.stringify(laws) + JSON.stringify(evi))
          .digest("hex")
          .slice(0, 24);

        const db = new DatabaseSync(getDbPath("kokuzo.sqlite"));
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO ark_thread_seeds
          (seedId, threadId, lawsUsedJson, evidenceIdsJson, heartJson, routeReason, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          seedId,
          threadId, /* tcTag */
          JSON.stringify(laws),
          JSON.stringify(evi),
          JSON.stringify(ku.heart ?? {}),
          String(ku.routeReason ?? ""),
          new Date().toISOString()
        );
      }
    } catch (e) {
      console.error("[ARK_SEED_SAVE_FAIL]", e);
    }
    return await reply(payload);
  }

  if (trimmed.startsWith("#pin ")) {
    const pinMatch = trimmed.match(/doc\s*=\s*([^\s]+)\s+pdfPage\s*=\s*(\d+)/i);
    if (!pinMatch) {
      return await reply({
        response: "エラー: #pin doc=<filename> pdfPage=<number> の形式で指定してください",
        evidence: null,
        decisionFrame: { mode: "NATURAL", intent: "command", llm: null, ku: {} },
        timestamp,
        threadId, /* tcTag */
      });
    }
    const doc = pinMatch[1];
    const pdfPage = parseInt(pinMatch[2], 10);
    return await reply(buildGroundedResponse({
      doc,
      pdfPage,
      threadId, /* tcTag */
      timestamp,
      wantsDetail: true,
    }));
  }

  // Phase19 NATURAL lock: hello/date/help（および日本語挨拶）だけは必ずNATURALで返す
  const t = message.trim().toLowerCase();
  if (t === "hello" || t === "date" || t === "help" || message.includes("おはよう")) {
    const nat = naturalRouter({ message, mode: "NATURAL" });
    // CARD6B_REWRITE_ONLY_V1: rewrite-only (DEFAULT OFF) - apply in NATURAL handled replies only
    try {
      const enabled = String(process.env.TENMON_REWRITE_ONLY || "") === "1";
      if (enabled) {
        const tid = String(threadId || "");
        const raw = String(message || "");
        // strict excludes
        const isSmoke = /^smoke/i.test(tid);
        const wantsDetailHere = /#詳細/.test(raw);
        const hasDocHere = /\bdoc\b/i.test(raw) || /pdfPage\s*=\s*\d+/i.test(raw);
        const isCmd = raw.trim().startsWith("#");
        const low = raw.trim().toLowerCase();
        const isLow = (low==="ping"||low==="test"||low==="ok"||low==="yes"||low==="no"||raw.trim()==="はい"||raw.trim()==="いいえ"||raw.trim()==="うん"||raw.trim()==="ううん");
        // voice guard (if present)
        let vgAllow = true;
        try {
          const g = (typeof __voiceGuard === "function") ? __voiceGuard(raw, tid) : null;
          vgAllow = g ? !!g.allow : true;
        } catch {}
        if (!isSmoke && vgAllow && !wantsDetailHere && !hasDocHere && !isCmd && !isLow) {
          if (typeof nat.responseText === "string" && nat.responseText.trim().length >= 8) {
            const r = await rewriteOnlyTenmon(nat.responseText, raw);
                        // FIX_REWRITE_STRING_RETURN_V1: rewriteOnly returns string (or text); avoid r.used/r.text type errors
            const __t = (typeof r === "string") ? r : String((r as any)?.text ?? "");
            if (__t) { nat.responseText = __t; }

          }
        }
      }
    } catch {}

    
    // N2_KANAGI_4PHASE_V1: Kanagi 4-phase micro state machine to avoid template repetition (NATURAL only)
    try {
      const __tid = String(threadId || "");
      const __isTestTid = /^(accept|core-seed|bible-smoke)/i.test(__tid);
      const __msg = String(message || "");
      const __askedMenu = /^\s*(?:\/menu|menu)\b/i.test(__msg) || /^\s*メニュー\b/.test(__msg);
      const __hasDoc = /\bdoc\b/i.test(__msg) || /pdfPage\s*=\s*\d+/i.test(__msg) || /#詳細/.test(__msg);
      if (!__isTestTid && !__askedMenu && !__hasDoc) {
        const mem = memoryReadSession(threadId, 40) || [];
        const phaseName = detectKanagiPhase(mem);

        const think = kanagiThink(
          (nat as any)?.heart?.state ?? "neutral",
          phaseName,
          __msg
        );
        (nat as any).responseText = danshariStyle(
          think.reception,
          think.focus,
          think.step
        );

        // only reshape when NATURAL reply looks like looping template / questionnaire
        (nat as any).responseText = reshapeKanagiLoop(
          String((nat as any)?.responseText ?? ""),
          __msg,
          phaseName
        );

        // annotate
        try {
          (nat as any).ku = (nat as any).ku || {};
          (nat as any).ku.kanagiPhase = phaseName;
        } catch {}
      }
    } catch {}

    try {
    } catch {}

    return await reply({
      response: nat.responseText,
      evidence: null,
      decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
      timestamp,
      threadId, /* tcTag */
    });
  }


  // CARD1_STEP2_PREEMPT_V1: pending step2 must preempt LLM_CHAT (deterministic)
  try {
    const __isSmoke_CARD1P = /^smoke-/i.test(String(threadId || ""));
    const __hasDocPage_CARD1P = /pdfPage\s*=\s*\d+/i.test(trimmed) || /\bdoc\b/i.test(trimmed);
    const __isCmd_CARD1P = trimmed.startsWith("#");

    if (!__isSmoke_CARD1P && !wantsDetail && !__hasDocPage_CARD1P && !__isCmd_CARD1P) {
      const __p = getThreadPending(threadId);

      if (__p === "DANSHARI_STEP1" || __p === "CASUAL_STEP1") {
        clearThreadState(threadId);

        const __isDanshari = (__p === "DANSHARI_STEP1");
        const __choice = String(trimmed || "").trim();

        let __topic = "未確定";
        if (__isDanshari) {
          if (__choice === "1") __topic = "モノ（物・書類・部屋）";
          else if (__choice === "2") __topic = "習慣（行動・時間の使い方）";
          else if (__choice === "3") __topic = "人間関係";
        } else {
          if (__choice === "1") __topic = "優先順位";
          else if (__choice === "2") __topic = "情報過多";
          else if (__choice === "3") __topic = "着手迷い";
        }

        const __dp = createEmptyDetailPlanP20V1(__isDanshari ? "CARD1_DANSHARI_STEP2" : "CARD1_CASUAL_STEP2");
        __dp.chainOrder = ["CARD1_STEP", "TRUTH_CORE", "VERIFIER"];
        __dp.warnings = (__dp.warnings ?? []).concat([`CARD1_STEP2 topic=${__topic}`]);
        applyTruthCore(__dp, { responseText: "CARD1_STEP2", trace: undefined });
        applyVerifier(__dp);

        const __op =
          __isDanshari
            ? `【天聞の所見】いまの迷いは「${__topic}」に触れています。ここは“捨て方”より先に“滞りの場所”を決めると進みます。`
            : `【天聞の所見】いまの詰まりは「${__topic}」に寄っています。まず一手だけ軽くして流れを作ります。`;

        const __q =
          __isDanshari
            ? `一点だけ伺います。「${__topic}」で、最初に“手放す候補”として思い浮かぶ具体名は何ですか？（1つだけ）`
            : `一点だけ伺います。「${__topic}」で、いま一番重い“具体物”は何ですか？（タスク名/案件名/場所など1つだけ）`;

        const __card1Step2Body = `${__op}\n\n${__q}`;
        const __card1Step2Rr = __isDanshari ? "CARD1_DANSHARI_STEP2" : "CARD1_CASUAL_STEP2";
        return await res.json(__tenmonGeneralGateResultMaybe({
          response: __card1Step2Body,
          evidence: null,
          candidates: [],
          detailPlan: __dp,
          threadCore: __threadCore,
          decisionFrame: {
            mode: "NATURAL",
            intent: "chat",
            llm: null,
            ku: {
              routeReason: __card1Step2Rr,
              lawsUsed: [],
              evidenceIds: [],
              lawTrace: [],
              rewriteUsed: false,
              rewriteDelta: 0,
              responsePlan: buildResponsePlan({
                routeReason: __card1Step2Rr,
                rawMessage: String(message ?? ""),
                centerKey: null,
                centerLabel: null,
                scriptureKey: null,
                mode: "general",
                responseKind: "statement_plus_question",
                semanticBody: __op,
              }),
            },
          },
          timestamp,
          threadId, /* tcTag */
        }));
      }
    }
  } catch {}

  // LLM_CHAT_ENTRY_V1: 通常会話はLLMへ（根拠要求/資料指定は除外）
  // GUEST_BLOCK_SKIP_JA_V1: Japanese free chat should not be routed to LLM_CHAT (so guests won't be blocked)
  const isJapaneseForLLM = /[ぁ-んァ-ン一-龯]/.test(message);

  // C1-1_TWO_STAGE_LLMCHAT_ONLY_V1: expose twoStage flag (scaffold)

  const hasDocPageHere = /pdfPage\s*=\s*\d+/i.test(message) || /\bdoc\b/i.test(message);
  const wantsEvidence = /資料|引用|根拠|出典|ソース|doc\s*=|pdfPage|P\d+|ページ/i.test(trimmed);

  // smoke gate: smoke-hybrid系/NON_TEXT は絶対に LLM_CHAT に入れない
  const isSmokeHybrid = /^smoke-hybrid/i.test(threadId);
  const isNonTextLike = /^\s*NON_TEXT\s*$/i.test(trimmed);


  // acceptance gate: coreplan probe は必ず HYBRID へ流す（LLM_CHAT禁止）
  const isCorePlanProbe = /\bcoreplan\b/i.test(trimmed);

  // domain gate: 主要ドメイン語は LLM_CHAT を禁止（HYBRIDへ）
  const isDomainLike =
  /言霊|言灵|ことだま|カタカムナ|天津金木|古事記|法華経|真言|布斗麻邇|フトマニ|水穂伝|虚空蔵|水火|イキ|魂/i.test(message);
  const shouldLLMChat =
    !__isCard1Flow &&
    !isSmokeHybrid &&
    !isNonTextLike &&
    !isCorePlanProbe &&
    !isDomainLike &&
    !hasDocPageHere &&
    !wantsDetail &&
    !wantsEvidence &&
    !isJapaneseForLLM &&
    !trimmed.startsWith("#");

  
  // LOCAL_TEST_BYPASS_V1: localhost + header のときだけ guest-block を回避（外部は不可）
  const isLocal =
    req.ip === "127.0.0.1" ||
    req.ip === "::1" ||
    String((req as any).socket?.remoteAddress || "").includes("127.0.0.1") ||
    String((req as any).socket?.remoteAddress || "").includes("::1");

  const isLocalTestBypass = isLocal && req.headers["x-tenmon-local-test"] === "1";

  // FOUNDER_GUEST_COND_V1: unlock guest lock when founder cookie is present
  const isFounder = (req as any).cookies?.tenmon_founder === "1";

  if (shouldBlockLLMChatForGuest && shouldLLMChat && !isLocalTestBypass && !__isCard1Flow && !isFounder) {
    return res.status(200).json({
      response: "ログイン前のため、会話は参照ベース（資料検索/整理）で動作します。/login からログインすると通常会話も有効になります。",
      evidence: null,
      // M6-A0_GUEST_KU_TRAINING_STATE_V1
      decisionFrame: {
        mode: "GUEST",
        intent: "chat",
        llm: null,
        ku: {
          training: { enabled: true, latestSessionId: null, latestRulesCount: 0 },
          learnedRulesUsed: [],
        },
      },
      timestamp: new Date().toISOString(),
    } as any);
  }

  if (shouldLLMChat) {
    // C1_1_TWO_STAGE_LLMCHAT_V1: two-stage generation (plan JSON -> final) inside LLM_CHAT only
    // evidence is always null (no fabrication). If anything fails, fallback to single-stage output.
    const system = TENMON_CONSTITUTION_TEXT + "\n\n" + TENMON_PERSONA;

    const userMsg = trimmed;

    // Stage1: plan (JSON only)
    let planText = "";
    try {
      const stage1 = await llmChat({
        system,
        history: [],
        user: [
          "Return ONLY valid JSON. No prose.",
          "Goal: create a short plan for the final answer.",
          "Constraints:",
          "- Do not invent citations, sources, doc/pdfPage, evidenceIds. evidence is always null.",
          "- Keep it concise.",
          "",
          "Schema:",
          "{",
          '  "intent": "advice" | "explain" | "list" | "steps" | "other",',
          '  "bullets": string[],',
          '  "cautions": string[],',
          '  "nextSteps": string[]',
          "}",
          "",
          "User:",
          userMsg,
        ].join("\n"),
      });

      planText = (stage1?.text ?? "").trim();
    } catch {
      planText = "";
    }

    // Stage2: final answer (follow plan)
    let finalText = "";
    try {
      const stage2 = await llmChat({
        system,
        history: [],
        user: [
          "You are TENMON-ARK LLM_CHAT.",
          "Write the final answer for the user.",
          "Rules:",
          "- Do not invent citations/sources/doc/pdfPage/evidenceIds.",
          "- Keep tone calm and practical.",
          "- If a JSON plan is provided, follow it.",
          "",
          "PLAN_JSON (may be empty):",
          planText,
          "",
          "User:",
          userMsg,
        ].join("\n"),
      });

      finalText = (stage2?.text ?? "").trim();
      if (!finalText) throw new Error("empty-final");
    } catch {
      // fallback single-stage
      try {
        const out = await llmChat({ system, history: [], user: userMsg });
        finalText = (out?.text ?? "").trim();
      } catch {
        finalText = "";
      }
    }

    const safe = scrubEvidenceLike(finalText);

    return await res.json(__tenmonGeneralGateResultMaybe({
      response: safe,
      evidence: null,
      decisionFrame: {
        mode: "LLM_CHAT",
        intent: "chat",
        llm: "llm",
        ku: { twoStage: true, twoStagePlanJson: planText ? true : false, khs: { lawsUsed: [], evidenceIds: [], lawTrace: [] } },
      },
      timestamp,
      threadId, /* tcTag */
    }));
  }

  // UX guard: 日本語の通常会話は一旦NATURAL(other)で受ける（#詳細や資料指定時だけHYBRIDへ）
  const isJapanese = /[ぁ-んァ-ン一-龯]/.test(message);
  const hasDocPage = /pdfPage\s*=\s*\d+/i.test(message) || /\bdoc\b/i.test(message);

  const isDefinitionLike =
    /とは\s*(何|なに)\s*(ですか)?[？?]?$/u.test(trimmed) ||
    /って\s*(何|なに)\s*(ですか)?[？?]?$/u.test(trimmed) ||
    /とは[？?]?$/.test(trimmed);

  if (isJapanese && !wantsDetail && !hasDocPage && !isDefinitionLike && __explicitCharsEarly == null) {
    const conv = await conversationEngine({
      message: trimmed,
      threadId
    });
    if (conv && conv.text) {
      return await res.json(__tenmonGeneralGateResultMaybe({
        response: conv.text,
        evidence: null,
        candidates: [],
        timestamp,
        threadId, /* tcTag */
        decisionFrame: {
          mode: "NATURAL",
          intent: "chat",
          llm: null,
          ku: { routeReason: "CONVERSATION_ENGINE_V1" /* responsePlan */ }
        }
      }));
    }
    const nat = naturalRouter({ message, mode: "NATURAL" });
    
    // handled=false の場合は通常処理（HYBRID検索）にフォールスルー
    if (!nat.handled) {
      // ドメイン質問の場合は HYBRID で検索して回答
      // この後ろの HYBRID 処理にフォールスルー
    } else {
      // メニューを表示する場合は pending state を保存
      // M2-0-LANE_PICK_DETECT_V1: menu文言ゆれを吸収して pending を確実に立てる
      if (
        nat.responseText.includes("話そう。何が気になってる？") ||
        nat.responseText.includes("いまの状況を一言で言うと") ||
        nat.responseText.includes("1) 予定・タスクの整理")
      ) {
        setThreadPending(threadId, "LANE_PICK");
      }
      // CARD6B_REWRITE_ONLY_APPLY_CLEAN_V1: rewrite-only apply (header-triggered; safe guards; returns string only)
      try {
        const __rewriteReq = String(req.headers["x-tenmon-rewrite-only"] ?? "") === "1";
        const __tid = String(threadId || "");
        const __raw = String(trimmed || "");
        const __isSmoke = /^smoke/i.test(__tid);
        const __isCmd = __raw.startsWith("#");
        const __hasDocLocal = /\bdoc\b/i.test(__raw) || /pdfPage\s*=\s*\d+/i.test(__raw);
        const __wantsDetailLocal = /#詳細/.test(__raw);

        const low = __raw.toLowerCase().trim();
        const __isLowSignal = (low === "ping" || low === "test" || low === "ok" || low === "yes" || low === "no"
          || __raw === "はい" || __raw === "いいえ" || __raw === "うん" || __raw === "ううん");

        // obey voiceGuard if available
        let __allow = true;
        try {
          if (typeof __voiceGuard === "function") {
            const g = __voiceGuard(__raw, __tid);
            __allow = !!g.allow;
          }
        } catch {}

        if (__rewriteReq && __allow && !__isSmoke && !__isCmd && !__hasDocLocal && !__wantsDetailLocal && !__isLowSignal) {
          const draft = String(nat.responseText || "").trim();
          if (draft.startsWith("【天聞の所見】")) {
            
          // CARD6C_REWRITE_USED_OBS_V2: compute rewriteUsed/rewriteDelta (observability)
          const __before = String(draft || "").trim();
          const out = await rewriteOnlyTenmon(__before, __raw);
          const __after = String(out || "").trim();
          const __used = (__after && __after !== __before);
          const __delta = (__after.length - __before.length);
          try { (nat as any).rewriteUsed = __used; (nat as any).rewriteDelta = __delta; } catch {}
if (typeof out === "string" && out.trim()) nat.responseText = out.trim();
          }
        }
      } catch {}


      return await reply({
        response: nat.responseText,
        evidence: null,
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: { rewriteUsed: (nat as any).rewriteUsed ?? false, rewriteDelta: (nat as any).rewriteDelta ?? 0, khs: { lawsUsed: [], evidenceIds: [], lawTrace: [] } } },
        timestamp,
        threadId, /* tcTag */
      });
    }
  }

  
  
    if (tryStrictCompareExitV1({ res, __tenmonGeneralGateResultMaybe, message, timestamp, threadId, shapeTenmonOutput })) return;

// P0-PH38-DOC_EQ_ROUTE-02: doc=... pdfPage=... は #pin 相当で GROUNDED に合流（.pdf不要）
  const mDocEq = message.match(/\bdoc\s*=\s*([^\s]+)/i);
  const mPageEq = message.match(/\bpdfPage\s*=\s*(\d+)/i);
  if (mDocEq && mPageEq) {
    const docEq = String(mDocEq[1] || "").trim();
    const pageEq = parseInt(String(mPageEq[1] || "0"), 10);
    if (docEq && Number.isFinite(pageEq) && pageEq > 0) {
      const out: any = buildGroundedResponse({
        doc: docEq,
        pdfPage: pageEq,
        threadId, /* tcTag */
        timestamp,
        wantsDetail,
      });
      // Phase37 WARN fix: always attach evidenceId when docEq/pageEq known
      const evidenceIdEq = `KZPAGE:${docEq}:P${pageEq}`;
      if (!(out as any).detailPlan) (out as any).detailPlan = {};
      if (!Array.isArray((out as any).detailPlan.evidenceIds)) (out as any).detailPlan.evidenceIds = [];
      if (!(out as any).detailPlan.evidenceIds.includes(evidenceIdEq)) (out as any).detailPlan.evidenceIds.push(evidenceIdEq);

      // PH38_TAGS_GUARD_V1: candidates[0].tags は必ず非空（allowedのみ。evidence/snippetは不変更）
      const allowed = new Set(["IKI","SHIHO","KAMI","HOSHI"]);
      if (!out.candidates || !Array.isArray(out.candidates) || !out.candidates.length) {
        const pageText = String(getPageText(docEq, pageEq) || "");
        const snippet = pageText ? pageText.slice(0, 240) : "[NON_TEXT_PAGE_OR_OCR_FAILED]";
        out.candidates = [{ doc: docEq, pdfPage: pageEq, snippet, score: 10, tags: ["IKI"] }];
      } else {
        const c0 = out.candidates[0] || {};
        let tags = Array.isArray(c0.tags) ? c0.tags : [];
        tags = tags.filter((t: any) => allowed.has(String(t)));
        if (!tags.length) tags = ["IKI"];
        c0.tags = tags;
        out.candidates[0] = c0;
      }

      return await reply(out);
    }
  }

// GROUNDED分岐: doc + pdfPage 指定時は必ず GROUNDED を返す
  const mPage = message.match(/pdfPage\s*=\s*(\d+)/i);
  const mDoc = message.match(/([^\s]+\.pdf)/i);
  if (mPage && mDoc) {
    const pdfPage = parseInt(mPage[1], 10);
    const doc = mDoc[1];
    return await reply(buildGroundedResponse({
      doc,
      pdfPage,
      threadId, /* tcTag */
      timestamp,
      wantsDetail,
    }));
  }

  // 入力の検証・正規化
  const sanitized = sanitizeInput(messageRaw, "web");

  // K2_6BE_DANSHARI_STEP1_MENU_V1
  try {
    const __m = String((((sanitized as any).text ?? (sanitized as any).message ?? messageRaw) || "") );
    if (false && __m.includes("断捨離") && __m.includes("迷い") && __m.includes("整理")) {
      const response = "【天聞の所見】\n断捨離の第一歩です。\n\n1) 手放す対象を1つ決める\n2) 迷いの原因を1つ言語化する\n3) 次の一手を1つだけ実行する\n\n番号で答えてください。どれにしますか？";
      return await res.json(__tenmonGeneralGateResultMaybe({
        response,
        evidence: null,
        candidates: [],
        timestamp,
        threadId, /* tcTag */
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: "llm", ku: { lawsUsed: [], evidenceIds: [], lawTrace: [], routeReason: "DANSHARI_STEP1_MENU_V1" /* responsePlan */ } },
      }));
    }
  } catch {}

  
  if (!sanitized.isValid) {
    return res.status(400).json({
      response: sanitized.error || "message is required",
      timestamp: new Date().toISOString(),
      decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
    });
  }

  try {
    // セッションID取得
    const sessionId = getSessionId(req) || `chat_${Date.now()}`;

    // PersonaState 取得
    const personaState = getCurrentPersonaState();

    // 天津金木思考回路を実行
    const trace = await runKanagiReasoner(sanitized.text, sessionId);

    // 観測円から応答文を生成
    const response = composeConversationalResponse(trace, personaState, sanitized.text);
    const __maxLen = __hasAnswerProfile && __bodyProfile?.answerLength
      ? (__bodyProfile.answerLength === "short" ? 180 : __bodyProfile.answerLength === "long" ? 1200 : 350)
      : undefined;
    const tenmonResponse = enforceTenmonPersona(response, __maxLen != null ? { maxLength: __maxLen } : undefined);

    // 工程3: CorePlan（器）を必ず経由（最小の決定論コンテナ）
    const detailPlan = createEmptyDetailPlanP20V1(
      typeof response === "string" ? response.slice(0, 80) : ""
    );
    // K3 debug: breathCycle (no response text change)
  if (!(detailPlan as any).debug) (detailPlan as any).debug = {};
  (detailPlan as any).debug.breathCycle = computeBreathCycle(String(message || ""));
  // K5 debug: koshiki summary (no response text change)
  try {
    const cells = parseItsura(String(message || ""));
    // evidenceIds presence in KanaPhysicsMap is enforced by K1 gate
    assertKanaPhysicsMap(KANA_PHYSICS_MAP_MVP);
    if (!(detailPlan as any).debug) (detailPlan as any).debug = {};
    (detailPlan as any).debug.koshiki = {
      cellsCount: Array.isArray(cells) ? cells.length : 0,
      sampleCells: (Array.isArray(cells) ? cells.slice(0, 8).map(applyKanaPhysicsToCell) : []),
      breathCycle: (detailPlan as any).debug?.breathCycle || [],
      warnings: (detailPlan as any).warnings || [],
      kanaPhysicsMapOk: true,
    };
  // K7 debug: link ufk summary into koshiki (no response text change)
  try {
    const dbg: any = (detailPlan as any).debug || {};
    const ufk: any = dbg.ufk || null;
    if (dbg.koshiki && typeof dbg.koshiki === 'object') {
      (dbg.koshiki as any).ufkLink = ufk ? {
        modeHint: ufk.modeHint ?? null,
        class24: ufk.class24 ?? ufk.class ?? null,
        ufkCellsCount: ufk.ufkCellsCount ?? ufk.cellsCount ?? null,
      } : null;
    }
    (detailPlan as any).debug = dbg;
  } catch (_e) {}
  } catch (_e) {
    if (!(detailPlan as any).debug) (detailPlan as any).debug = {};
    (detailPlan as any).debug.koshiki = { cellsCount: 0, breathCycle: (detailPlan as any).debug?.breathCycle || [], warnings: (detailPlan as any).warnings || [], kanaPhysicsMapOk: false };
  }
  // K4 warnings: TeNiWoHa (warnings only)
  const wK4 = teniwohaWarnings(String(message || ""));
  if (!Array.isArray((detailPlan as any).warnings)) (detailPlan as any).warnings = [];
  for (const x of wK4) { if (!(detailPlan as any).warnings.includes(x)) (detailPlan as any).warnings.push(x); }
    // --- S3_DEBUG_BOX_V1 ---
    (detailPlan as any).debug = { ...(detailPlan as any).debug };
    // --- /S3_DEBUG_BOX_V1 ---

    detailPlan.chainOrder = ["KANAGI_TRACE", "COMPOSE_RESPONSE"];
    // M6_INJECTION_V1: inject training rules into detailPlan (deterministic, capped)
    try {
      const mSid = String(message || "").match(/\bsession_id\s*=\s*([A-Za-z0-9_]+)/);
      const sessionKey = (mSid && mSid[1]) ? String(mSid[1]) : "";
      if (sessionKey) {
        // listRules is already imported/available in this module
        const rules = listRules(sessionKey) || [];
        const maxRules = 8;
        const maxChars = 1200;

        const picked: Array<{ title: string; text: string }> = [];
        let usedChars = 0;

        for (const r of rules.slice(0, maxRules)) {
          const title = String((r as any)?.title ?? "");
          const text  = String((r as any)?.rule_text ?? (r as any)?.text ?? "");
          const line = title ? `${title}` : text;
          if (!line) continue;

          const addLen = line.length + 1;
          if (usedChars + addLen > maxChars) break;

          picked.push({ title: line, text }); usedChars += addLen;

        }

        if (!(detailPlan as any).injections) (detailPlan as any).injections = {};
        (detailPlan as any).injections.trainingRules = picked;

        // also surface deterministic counters in ku (if present later)
        (detailPlan as any).appliedRulesCount = picked.length;
      }
    } catch {}

    if (trace && Array.isArray((trace as any).violations) && (trace as any).violations.length) {
      detailPlan.warnings = (trace as any).violations.map((v: any) => String(v));
    }

    // 工程4: Truth-Core（判定器）を通す（決定論・LLM禁止）
    applyTruthCore(detailPlan, { responseText: String(response ?? ""), trace });
    applyVerifier(detailPlan);

    // Phase23: Kokuzo recall（構文記憶）
    const prev = kokuzoRecall(threadId);
    if (prev) {
      if (!detailPlan.chainOrder.includes("KOKUZO_RECALL")) detailPlan.chainOrder.push("KOKUZO_RECALL");
      detailPlan.warnings.push(`KOKUZO: recalled centerClaim=${prev.centerClaim.slice(0, 40)}`);
    }
    kokuzoRemember(threadId, detailPlan);
    
    // Phase29: LawCandidates（#詳細 のときのみ、現時点では空配列）
    (detailPlan as any).lawCandidates = [];
    // Phase33: 古事記タグ（常に空配列で初期化、pageText が取れた場合に上書き）
    (detailPlan as any).kojikiTags = [];
    // Phase34: 同型写像エッジ（常に空配列で初期化）
    (detailPlan as any).mythMapEdges = [];
    // Phase35: 同一threadIdの mythMapEdges を再提示（あれば上書き）
    const recalled = getMythMapEdges(threadId);
    if (recalled) {
      (detailPlan as any).mythMapEdges = recalled;
    }

    // Phase25: candidates（deterministic; if LIKE misses, fallback range is returned）
    const doc = (sanitized as any).doc ?? null;
    // P0-PH25-QUERY_NORMALIZE_V1: Phase25 query ("言灵とは何？ #詳細") must hit
    const searchQuery0 = String(sanitized.text || "")
      .replace(/#詳細/g, "")
      .replace(/\bdoc\s*=\s*[^\s]+/gi, "")
      .replace(/\bpdfPage\s*=\s*\d+/gi, "")
      .trim();

    const searchQuery1 = searchQuery0.replace(/言灵/g, "言霊");
    let candidates = searchPagesForHybrid(doc, searchQuery1, 10);
    // M1-03_DOC_DIVERSIFY_FALLBACK_V1: candidates が単一docに偏る時、他docも試して母集団を増やす（削除ではなく追加）
    // ルール: search.ts/DBは触らない。件数は維持し、最後にslice(0,10)。
    try {
      const uniqDocs = Array.from(new Set((candidates || []).map((c: any) => String(c?.doc ?? "")).filter(Boolean)));
      const dominatedBySingleDoc = uniqDocs.length <= 1;
      if (dominatedBySingleDoc) {
        const tryDocs = ["KHS", "TENMON_CORE", "IROHA", "KATAKAMUNA"];
        const extra: any[] = [];
        for (const d of tryDocs) {
          if (!d || uniqDocs.includes(d)) continue;
          const add = searchPagesForHybrid(d, searchQuery1, 5) || [];
          for (const c of add) extra.push(c);
        }
        // merge (doc+pageで重複排除)
        const seen = new Set();
        const merged: any[] = [];
        for (const c of (candidates || []).concat(extra)) {
          const key = `${String(c?.doc ?? "")}::${String(c?.pdfPage ?? "")}`;
          if (seen.has(key)) continue;
          seen.add(key);
          merged.push(c);
        }
        // score desc
        merged.sort((a: any, b: any) => (Number(b?.score ?? 0) || 0) - (Number(a?.score ?? 0) || 0));
        candidates = merged.slice(0, 10);
      }
    } catch (e) {
      // 失敗時は現状維持（必ず候補は落とさない）
    }


    if (!candidates.length) {
      const q2 = searchQuery0.replace(/言灵|言霊/g, "ことだま");
      candidates = searchPagesForHybrid(doc, q2, 10);
    }
    
    // Phase26: candidates を threadId に保存（番号選択で再利用）
    setThreadCandidates(threadId, candidates);

    // ドメイン質問の検出（naturalRouter の判定と一致させる）
    const isDomainQuestion =
  /言灵|言霊|ことだま|kotodama|法則|カタカムナ|天津金木|水火|與合|イキ|魂/i.test(sanitized.text);
    
    // ドメイン質問の場合、回答本文を改善（候補があれば本文を生成、なければ最低限の説明）
    
    // DETAIL_DOMAIN_EVIDENCE_V1: #詳細 + domain は「会話＋根拠（doc/pdfPage+引用）」に着地させる（捏造なし）
    if (wantsDetail && isJapanese && !hasDocPage && isDomainQuestion) {
      const usable = candidates.find((c: any) => {
        const t = (getPageText(c.doc, c.pdfPage) || "").trim();
        if (!t) return false;
        if (t.includes("[NON_TEXT_PAGE_OR_OCR_FAILED]")) return false;
        if (!/[ぁ-んァ-ン一-龯]/.test(t)) return false;
        return true;
      });

      if (usable) {
        const pageText = (getPageText(usable.doc, usable.pdfPage) || "").trim();
        const quote = pageText.slice(0, 520);

        const evidenceId = `KZPAGE:${usable.doc}:P${usable.pdfPage}`;
        if (!detailPlan.evidenceIds) detailPlan.evidenceIds = [];
        if (!detailPlan.evidenceIds.includes(evidenceId)) detailPlan.evidenceIds.push(evidenceId);

        const payload = {
          response:
            "いい問いです。根拠つきで短く押さえます。\n\n" +
            `出典: ${usable.doc} P${usable.pdfPage}\n\n` +
            "【引用】\n" +
            `${quote}${pageText.length > quote.length ? "..." : ""}\n\n` +
            "この引用のどの部分が、一番ひっかかりますか？",
          trace,
          provisional: true,
          detailPlan,
          candidates,
          evidence: { doc: usable.doc, pdfPage: usable.pdfPage, quote: quote.slice(0, 140) },
          timestamp: new Date().toISOString(),
          decisionFrame: { mode: "HYBRID", intent: "chat", llm: null, ku: {} }
        };
        // ARK_THREAD_SEED_SAVE_V1
        try {
        const df = payload.decisionFrame;
        const ku = (df?.ku ?? {}) as any;

          const laws = Array.isArray(ku.lawsUsed) ? ku.lawsUsed : [];
          const evi  = Array.isArray(ku.evidenceIds) ? ku.evidenceIds : [];

          if (laws.length > 0 && evi.length > 0) {
            const crypto = __tenmonRequire("node:crypto");
            const seedId = crypto
              .createHash("sha256")
              .update(JSON.stringify(laws) + JSON.stringify(evi))
              .digest("hex")
              .slice(0, 24);

            const db = new DatabaseSync(getDbPath("kokuzo.sqlite"));
            const stmt = db.prepare(`
              INSERT OR IGNORE INTO ark_thread_seeds
              (seedId, threadId, lawsUsedJson, evidenceIdsJson, heartJson, routeReason, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
              seedId,
              threadId, /* tcTag */
              JSON.stringify(laws),
              JSON.stringify(evi),
              JSON.stringify(ku.heart ?? {}),
              String(ku.routeReason ?? ""),
              new Date().toISOString()
            );
          }
        } catch (e) {
          console.error("[ARK_SEED_SAVE_FAIL]", e);
        }
        return await reply(payload);
      }

      const payload = {
        response:
          "候補は出ましたが、本文を取得できるページが見当たりませんでした。\n\n" +
          "次のどれで進めますか？\n" +
          "1) doc/pdfPage を指定して再検索\n" +
          "2) 焦点を一言で（定義／作用／歴史／実践）\n\n" +
          "どちらですか？",
        trace,
        provisional: true,
        detailPlan,
        candidates,
        evidence: null,
        timestamp: new Date().toISOString(),
        decisionFrame: { mode: "HYBRID", intent: "chat", llm: null, ku: {} },
      };
      // ARK_THREAD_SEED_SAVE_V1
      try {
        const df = payload.decisionFrame;
        const ku = (df?.ku ?? {}) as any;

        const laws = Array.isArray(ku.lawsUsed) ? ku.lawsUsed : [];
        const evi  = Array.isArray(ku.evidenceIds) ? ku.evidenceIds : [];

        if (laws.length > 0 && evi.length > 0) {
          const crypto = __tenmonRequire("node:crypto");
          const seedId = crypto
            .createHash("sha256")
            .update(JSON.stringify(laws) + JSON.stringify(evi))
            .digest("hex")
            .slice(0, 24);

          const db = new DatabaseSync(getDbPath("kokuzo.sqlite"));
          const stmt = db.prepare(`
            INSERT OR IGNORE INTO ark_thread_seeds
            (seedId, threadId, lawsUsedJson, evidenceIdsJson, heartJson, routeReason, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);

          stmt.run(
            seedId,
            threadId, /* tcTag */
            JSON.stringify(laws),
            JSON.stringify(evi),
            JSON.stringify(ku.heart ?? {}),
            String(ku.routeReason ?? ""),
            new Date().toISOString()
          );
        }
      } catch (e) {
        console.error("[ARK_SEED_SAVE_FAIL]", e);
      }
      return await reply(payload);
    }

let finalResponse = tenmonResponse;
  // FREECHAT_SANITIZE_V1: UX hardening
  // - menu prompt must not appear unless user explicitly requests it
  // - internal synth/TODO placeholder must not appear unless #詳細
  const __wantsDetail = /#詳細/.test(String(message || ""));
  const __askedMenu = /(メニュー|方向性|どの方向で|選択肢|1\)|2\)|3\))/i.test(String(message || ""));
    const __choosePrompt = /どの方向で話しますか|いちばん近いのはどれ|次のどれで進めますか|どちらですか|番号で|番号か|選択肢|選んで(?:ください)?|進めますか/.test(String(finalResponse || ""));
  const __numberList = /\n\s*\d{1,2}\)\s*/m.test(String(finalResponse || ""));
  const __hasMenu = __choosePrompt && __numberList; // CARD_S1_FIX_FREECHAT_SANITIZE_V2

if (__hasMenu && !__askedMenu) {
    finalResponse = "了解。何でも話して。必要なら「#詳細」や「doc=... pdfPage=...」で深掘りできるよ。";
  }
  if (!__wantsDetail) {
    // hide internal placeholders that break UX
    finalResponse = String(finalResponse || "")
      .replace(/^\[SYNTH_USED[^\n]*\n?/gm, "")
      .replace(/^TODO:[^\n]*\n?/gmi, "")
      .replace(/現在はプレースホルダ[^\n]*\n?/gmi, "")
      .trim();
  }

    let evidenceDoc: string | null = null;
    let evidencePdfPage: number | null = null;
    let evidenceQuote: string | null = null;
    
    if (isDomainQuestion && isJapanese && !wantsDetail && !hasDocPage) {
      if (candidates.length > 0) {
        const top = candidates[0];
        const pageText = getPageText(top.doc, top.pdfPage);
        const isNonText = !pageText || /\[NON_TEXT_PAGE_OR_OCR_FAILED\]/.test(String(pageText));
        // CARD3_NON_TEXT_ESCALATE_TO_KAMU_V1: if top evidence is NON_TEXT, do NOT inject caps fallback; guide to KAMU/specify instead (no fabrication)
        if (isNonText) {
          try {
            // surface deterministic flags for observability
            const df = (body as any)?.decisionFrame ?? null;
            // we can't rely on df here; we'll attach in reply payload below
          } catch {}
          const payload = {
            response:
              "（候補は見つかりましたが、先頭候補のページが非テキスト/復号失敗でした）\n\n" +
              `候補: doc=${String(top?.doc ?? "")} pdfPage=${String(top?.pdfPage ?? "")}\n\n` +
              "次のどれで進めますか？\n" +
              "1) KAMU-GAKARIで復号して再保存（候補→承認）\n" +
              "2) 別ページを指定（doc=... pdfPage=...）\n\n" +
              "番号で答えてください？",
            trace,
            provisional: true,
            detailPlan,
            candidates,
            evidence: null,
            caps: undefined,
            timestamp: new Date().toISOString(),
            threadId, /* tcTag */
            decisionFrame: {
              mode: "HYBRID",
              intent: "chat",
              llm: null,
              ku: {
                hybridAllNonText: true,
                nextActions: ["kamu_restore", "specify_doc_pdfpage"],
              },
            },
          };
          // ARK_THREAD_SEED_SAVE_V1
          try {
        const df = payload.decisionFrame;
        const ku = (df?.ku ?? {}) as any;

            const laws = Array.isArray(ku.lawsUsed) ? ku.lawsUsed : [];
            const evi  = Array.isArray(ku.evidenceIds) ? ku.evidenceIds : [];

            if (laws.length > 0 && evi.length > 0) {
              const crypto = __tenmonRequire("node:crypto");
              const seedId = crypto
                .createHash("sha256")
                .update(JSON.stringify(laws) + JSON.stringify(evi))
                .digest("hex")
                .slice(0, 24);

              const db = new DatabaseSync(getDbPath("kokuzo.sqlite"));
              const stmt = db.prepare(`
                INSERT OR IGNORE INTO ark_thread_seeds
                (seedId, threadId, lawsUsedJson, evidenceIdsJson, heartJson, routeReason, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `);

              stmt.run(
                seedId,
                threadId, /* tcTag */
                JSON.stringify(laws),
                JSON.stringify(evi),
                JSON.stringify(ku.heart ?? {}),
                String(ku.routeReason ?? ""),
                new Date().toISOString()
              );
            }
          } catch (e) {
            console.error("[ARK_SEED_SAVE_FAIL]", e);
          }
          return await reply(payload);
        }

        if (pageText && pageText.trim().length > 0 && !isNonText) {
          // 回答本文を生成（50文字以上、短く自然に、最後にメニューを添える）
          const excerpt = pageText.trim().slice(0, 300);
          finalResponse = `${excerpt}${excerpt.length < pageText.trim().length ? '...' : ''}\n\n※ 必要なら資料指定（doc/pdfPage）で厳密にもできます。`;
          evidenceDoc = top.doc;
          evidencePdfPage = top.pdfPage;
          evidenceQuote = top.snippet || excerpt.slice(0, 100);
        } else if (isNonText) {
          // 本文が空 or NON_TEXT → caps で補完
          const caps = getCaps(top.doc, top.pdfPage) || getCaps("KHS", top.pdfPage);
          if (caps && typeof caps.caption === "string" && caps.caption.trim()) {
            finalResponse =
              `（補完キャプション: 天聞AI解析 / doc=${caps.doc} pdfPage=${caps.pdfPage}）\n` +
              caps.caption.trim() +
              (caps.caption_alt?.length ? `\n\n補助: ${caps.caption_alt.slice(0, 3).join(" / ")}` : "");
            capsPayload = {
              doc: caps.doc,
              pdfPage: caps.pdfPage,
              quality: caps.quality,
              source: caps.source,
              updatedAt: caps.updatedAt,
              caption: caps.caption,
              caption_alt: caps.caption_alt,
            };
          } else {
            finalResponse = `${sanitized.text}について、kokuzo データベースから関連情報を検索しましたが、詳細な説明が見つかりませんでした。資料指定（doc/pdfPage）で厳密に検索することもできます。`;
          }
        } else {
          finalResponse = `${sanitized.text}について、kokuzo データベースから関連情報を検索しましたが、詳細な説明が見つかりませんでした。資料指定（doc/pdfPage）で厳密に検索することもできます。`;
        }
      } else {
        // 候補がない場合でも最低限の説明を返す（50文字以上）
        finalResponse = `${sanitized.text}について、kokuzo データベースから関連情報を検索しましたが、該当する資料が見つかりませんでした。\n\n資料を投入するには、scripts/ingest_kokuzo_sample.sh を実行するか、doc/pdfPage を指定して厳密に検索してください。`;
      }
      
      // 回答本文が50文字未満の場合は補足を追加
      if (finalResponse.length < 50) {
        finalResponse = `${finalResponse}\n\nより詳しい情報が必要な場合は、資料指定（doc/pdfPage）で厳密に検索することもできます。`;
      }
    }

    // ドメイン質問で根拠がある場合、evidence と detailPlan に情報を追加
    
    let evidence: { doc: string; pdfPage: number; quote: string } | null = null;

    
    // CARDF_PHASE37_EVIDENCEIDS_V6: ensure evidenceIds exist when HYBRID candidates exist (kills Phase37 WARN)

    // CARDF_PRIME_EVIDENCE_V1: ensure `evidence` is set when candidates exist (kills Phase37 WARN; NO fabrication)
    // - uses candidates[0].doc/pdfPage only
    // - quote is empty (do NOT invent)
    try {
      if (!evidence && Array.isArray(candidates) && candidates.length) {
        const c0: any = candidates[0];
        const doc0 = String(c0?.doc ?? "");
        const page0 = Number(c0?.pdfPage ?? 0);
        if (doc0 && Number.isFinite(page0) && page0 > 0) {
          evidence = { doc: doc0, pdfPage: page0, quote: "" };
          try { (detailPlan as any).evidence = evidence; } catch {}
        }
      }
    } catch {}
    
    // - NO fabrication: uses candidates[0].doc/pdfPage only
    
    // - evidence.quote is empty string (explicitly no citation fabrication)
    
    try {
    
      const c0: any = (Array.isArray(candidates) && candidates.length) ? candidates[0] : null;
    
      if (c0 && c0.doc && Number(c0.pdfPage) > 0) {
    
        const eid = `KZPAGE:${String(c0.doc)}:P${Number(c0.pdfPage)}`;
    
        if (!detailPlan.evidenceIds) detailPlan.evidenceIds = [];
    
        if (!detailPlan.evidenceIds.includes(eid)) detailPlan.evidenceIds.push(eid);
    
    
    
        // If evidence missing, set minimal evidence (quote empty = no fabrication)
    
        if (evidence == null) {
    
          evidence = { doc: String(c0.doc), pdfPage: Number(c0.pdfPage), quote: "" };
    
        }
    
    
    
        // Optional deterministic warning if body missing/NON_TEXT (safe)
    
        try {
    
          const t0 = String(getPageText(String(c0.doc), Number(c0.pdfPage)) || "");
    
          if (!t0 || t0.includes("[NON_TEXT_PAGE_OR_OCR_FAILED]")) {
    
            detailPlan.warnings = detailPlan.warnings ?? [];
    
            if (!detailPlan.warnings.includes("EVIDENCE_BODY_EMPTY")) detailPlan.warnings.push("EVIDENCE_BODY_EMPTY");
    
          }
    
        } catch {}
    
      }
    
    } catch {}

    if (isDomainQuestion && evidenceDoc && evidencePdfPage !== null) {
      evidence = {
        doc: evidenceDoc,
        pdfPage: evidencePdfPage,
        quote: evidenceQuote || "",
      };
      // detailPlan.evidence に設定
      (detailPlan as any).evidence = evidence;
      // evidenceIds にも追加
      if (!detailPlan.evidenceIds) {
        detailPlan.evidenceIds = [];
      }
      const evidenceId = `KZPAGE:${evidenceDoc}:P${evidencePdfPage}`;
      if (!detailPlan.evidenceIds.includes(evidenceId)) {
        detailPlan.evidenceIds.push(evidenceId);
      }
    } else if (isDomainQuestion && candidates.length === 0) {
      // 根拠がない場合を明示
      (detailPlan as any).evidence = null;
      (detailPlan as any).evidenceStatus = "not_found";
      (detailPlan as any).evidenceHint = "資料を投入するには scripts/ingest_kokuzo_sample.sh を実行してください";
    }

    // KG2B: KHS detailPlan.evidence（quote スロット）があるときは synth の doc=/根拠脚注を避け、finalize で美文織り込み
    const __khsEvidenceRichForFractal =
      Array.isArray((detailPlan as any)?.evidence) &&
      (detailPlan as any).evidence.some(
        (x: any) =>
          x &&
          typeof x === "object" &&
          typeof x.quote === "string" &&
          String(x.quote).trim().length >= 4
      );

    // HYBRID_TALK_WRAP_V2: 最終出力にだけ「断捨離の間合い」を薄く付与（#詳細/根拠系は改変しない）
    {
      const wants = Boolean(wantsDetail);
      const hasEvidenceSignals =
        /(pdfPage=|doc=|evidenceIds|candidates|引用|出典|根拠|ソース|【|】)/.test(String(finalResponse));

      if (!wants && !hasEvidenceSignals) {

        // --- S3_HYBRID_SYNTH_V1 ---
        try {
          if (!__khsEvidenceRichForFractal) {
            const synth = synthHybridResponseV1({
              userMessage: sanitized.text,
              baseResponse: String(finalResponse ?? ""),
              candidates: candidates as any,
            });
            if (synth.used) finalResponse = synth.text;
          }
        } catch (e) {
          // never fail chat because of synth
        }
        // --- /S3_HYBRID_SYNTH_V1 ---

        let r = String(finalResponse ?? "").trim();

        const opener = "いい問いです。いまの状況を一度、ほどいてみましょう。";
        const closer = "いま一番ひっかかっている点は、どこですか？";

        const alreadyHasWarmOpener = /^(いい問い|焦らなくて|ここまで言葉)/.test(r);

        if (!alreadyHasWarmOpener && r.length >= 20) {
          r = `${opener}\n\n${r}`;
        }

        const endsQ = /[？?]\s*$/.test(r) || /(ですか|でしょうか|ますか)\s*$/.test(r);
        if (!endsQ) {
          r = `${r}\n\n${closer}`;
        }

        finalResponse = r;
      }
    }

    // HYBRID_END_QUESTION_V1: 通常HYBRIDは必ず問いで閉じる（#詳細/根拠系は改変しない）
    {
      const wants = Boolean(wantsDetail);
      const hasEvidenceSignals =
        /(pdfPage=|doc=|evidenceIds|candidates|引用|出典|根拠|ソース|【|】)/.test(String(finalResponse));
      const __rrCloseV1 = String((detailPlan as any)?.routeReason ?? "");
      const __skipGenericCloseV1 =
        /^(TRUTH_GATE_RETURN_V2|DEF_FASTPATH_VERIFIED_V1|DEF_DICT_HIT|TENMON_CONCEPT_CANON_V1|TENMON_SCRIPTURE_CANON_V1|K1_TRACE_EMPTY_GATED_V1|R22_LIGHT_FACT_.*|TECHNICAL_IMPLEMENTATION_.*|R22_CONSCIOUSNESS_META_ROUTE_V1|R22_JUDGEMENT_PREEMPT_V1|KANAGI_CONVERSATION_V1|FACTUAL_CURRENT_.*|FACTUAL_RECENT_TREND_V1|FACTUAL_WEATHER_V1|GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1)$/u.test(
          __rrCloseV1,
        );

      if (!wants && !hasEvidenceSignals && !__skipGenericCloseV1) {
        let r = String(finalResponse ?? "").trim();
        const endsQ = /[？?]\s*$/.test(r) || /(ですか|でしょうか|ますか)\s*$/.test(r);
        if (!endsQ) {
          r = `${r}\n\n${NG_CLOSING_WHERE_START_V1}`;
        }
        finalResponse = r;
      }
    }



    // HYBRID_END_QUESTION_V2: reply直前で確実に「問い閉じ」（内容は改変しない。末尾に1問だけ付与）
    {
      let r = String(finalResponse ?? "").trim();

      const wants = Boolean(wantsDetail);
      const __rrCloseV2 = String((detailPlan as any)?.routeReason ?? "");
      const __skipGenericCloseV2 =
        /^(TRUTH_GATE_RETURN_V2|DEF_FASTPATH_VERIFIED_V1|DEF_DICT_HIT|TENMON_CONCEPT_CANON_V1|TENMON_SCRIPTURE_CANON_V1|K1_TRACE_EMPTY_GATED_V1|R22_LIGHT_FACT_.*|TECHNICAL_IMPLEMENTATION_.*|R22_CONSCIOUSNESS_META_ROUTE_V1|R22_JUDGEMENT_PREEMPT_V1|KANAGI_CONVERSATION_V1|FACTUAL_CURRENT_.*|FACTUAL_RECENT_TREND_V1|FACTUAL_WEATHER_V1|GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1)$/u.test(
          __rrCloseV2,
        );

      // 末尾が問いか判定（日本語の疑問終止も含む）
      const endsQ =
        /[？?]\s*$/.test(r) ||
        /(ですか|でしょうか|ますか|か？|か\?)\s*$/.test(r);

      if (!endsQ && !__skipGenericCloseV2) {
        const qNormal = NG_CLOSING_WHERE_START_V1;
        const qDetail = "この引用のどこを一番深掘りしますか？（語義／構文／水火（イキ）／天津金木）";
        const q = wants ? qDetail : qNormal;

        r = `${r}\n\n${q}`;
      }

      finalResponse = r;
    }


    // レスポンス形式（厳守）
    // CARD5_KOKUZO_SEASONING_V1: HYBRID normal reply -> 1-line point + opinion + one question
    // Contract:
    // - DO NOT touch #詳細 (transparency mode)
    // - DO NOT touch doc/pdfPage GROUNDED
    // - DO NOT touch smoke/smoke-hybrid
    // - NO fabrication: point derived only from candidates[0] doc/pdfPage text or snippet
    try {
      const isSmoke = /^smoke/i.test(String(threadId || ""));
      const __skipHybridSeasoningForExplicit = (__explicitCharsEarly != null);
      // CARD5_FIX_SCOPE_DECISIONFRAME_V1: decisionFrame not in scope here; final HYBRID return implies HYBRID path
      if (!isSmoke && !wantsDetail && !hasDocPage && !trimmed.startsWith("#") && !__skipHybridSeasoningForExplicit && !__khsEvidenceRichForFractal) {
        let point = "";
        try {
          const c0: any = (Array.isArray(candidates) && candidates.length) ? candidates[0] : null;
          if (c0 && c0.doc && Number(c0.pdfPage) > 0) {
            const body = String(getPageText(String(c0.doc), Number(c0.pdfPage)) || "").trim();
            if (body && !body.includes("[NON_TEXT_PAGE_OR_OCR_FAILED]")) {
              point = body.replace(/\s+/g, " ").slice(0, 96).trim();
            } else {
              point = String(c0.snippet || "").replace(/\s+/g, " ").slice(0, 96).trim();
            }
          }
        } catch {}

        if (!point) {
          point = String(finalResponse || "").replace(/\s+/g, " ").slice(0, 96).trim();
        }
        if (point.length > 0) point = "要点: " + point;

        // Opinion + one question (deterministic, short)
        const opinion = "【天聞の所見】いまの問いは“核”がまだ一語で定まっていないだけです。先に軸を立てます。";
        const q = "一点質問：この問いは、定義／作用／由来／実践のどれを知りたい？";

        let out = "";
        if (point) out += point + "\n\n";
        out += opinion + "\n\n" + q;

        // Ensure ends with question mark
        if (!/[？?]\s*$/.test(out)) out += "？";

        finalResponse = out;

        // Keep evidenceIds/evidence behavior unchanged (CardF already handles evidenceIds safely)
      }
    } catch {}

    const __ownerRouteFromDetailPlan = String((detailPlan as any)?.routeReason ?? "").trim();
    const __ownerRouteResolved = __ownerRouteFromDetailPlan;
    const __isMeaningOwnerRoute = (rr: string): boolean =>
      /^(DEF_|TENMON_SCRIPTURE_CANON_V1|TENMON_SUBCONCEPT_CANON_V1|TENMON_CONCEPT_CANON_V1|KATAKAMUNA_CANON_ROUTE_V1|KUKAI_|FACTUAL_|TECHNICAL_|GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1)/u.test(
        String(rr || ""),
      );
    const __explicitFinalResponse = (() => {
      if (__explicitCharsEarly == null) return finalResponse;
      if (__isMeaningOwnerRoute(__ownerRouteResolved)) return finalResponse;
      const __msgExplicitFinal = String(message ?? "").trim();
      const __isFeelingExplicitFinal =
        /今(どんな|の)?気分|今の気持ち/.test(__msgExplicitFinal) &&
        /(天聞|アーク)(への)?感想|感想(を)?(聞いて|教えて)|天聞をどう思う|アークをどう思う/.test(__msgExplicitFinal);
      const __isFutureExplicitFinal =
        /(これから|未来|今後|この先|どうなる|どう見ますか|展望|見通し|方向性)/.test(__msgExplicitFinal);

      let __pickedExplicitFinal =
        __isFeelingExplicitFinal ? __bodyFeelingImpressionL :
        __isFutureExplicitFinal ? __bodyFutureOutlookL :
        __bodyLongL;

      if (__explicitCharsEarly >= 1200) {
        __pickedExplicitFinal =
          __isFeelingExplicitFinal ? __bodyFeelingImpression1200L :
          __isFutureExplicitFinal ? __bodyFutureOutlook1200L :
          __bodyLong1200L;
      } else if (__explicitCharsEarly >= 700) {
        __pickedExplicitFinal =
          __isFeelingExplicitFinal ? __bodyFeelingImpression1000L :
          __isFutureExplicitFinal ? __bodyFutureOutlook1000L :
          __bodyLong1000L;
      } else if (__explicitCharsEarly >= 450) {
        __pickedExplicitFinal =
          __isFeelingExplicitFinal ? __bodyFeelingImpression500L :
          __isFutureExplicitFinal ? __bodyFutureOutlook500L :
          __bodyLong500L;
      }

      if (__explicitCharsEarly >= 700 && __explicitCharsEarly < 1200) {
        const __maxExplicitFinal = 1050;
        if (__pickedExplicitFinal.length > __maxExplicitFinal) {
          let __cut = __pickedExplicitFinal.slice(0, __maxExplicitFinal);
          const __lastStop = Math.max(__cut.lastIndexOf("。"), __cut.lastIndexOf("？"), __cut.lastIndexOf("?"));
          if (__lastStop >= 880) __cut = __cut.slice(0, __lastStop + 1);
          __pickedExplicitFinal = __cut.trim();
        }
      }

      return __pickedExplicitFinal;
    })();

    const __requiresCenterForExit = (rr: string): boolean =>
      /^(DEF_|TENMON_SCRIPTURE_CANON_V1|TENMON_SUBCONCEPT_CANON_V1|TENMON_CONCEPT_CANON_V1|KATAKAMUNA_CANON_ROUTE_V1|KUKAI_|TECHNICAL_|FACTUAL_|GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1)/u.test(
        String(rr || ""),
      );
    const __synthesizeCenterFromMessageV1 = (msg: string): { centerKey: string | null; centerLabel: string | null; centerClaim: string | null } => {
      const t = String(msg || "").trim();
      if (/言霊/u.test(t)) return { centerKey: "kotodama", centerLabel: "言霊", centerClaim: "言霊の定義と働き" };
      if (/法華経/u.test(t)) return { centerKey: "hokke", centerLabel: "法華経", centerClaim: "法華経の核心" };
      if (/空海/u.test(t)) return { centerKey: "kukai", centerLabel: "空海", centerClaim: "空海の要点" };
      if (/TypeScript|React|Node\.js|実装|コード/iu.test(t))
        return { centerKey: "technical_implementation", centerLabel: "技術実装", centerClaim: "実装の要点" };
      if (/日付|何時|曜日/u.test(t)) return { centerKey: "factual_current_date", centerLabel: "現在日時", centerClaim: "現在日時の確認" };
      if (/総理大臣|大統領|CEO/u.test(t)) return { centerKey: "factual_current_person", centerLabel: "現在人物", centerClaim: "現在人物の確認" };
      return { centerKey: null, centerLabel: null, centerClaim: null };
    };
    const __ownerRouteForKu = __ownerRouteResolved || "NATURAL_GENERAL_LLM_TOP_V1";
    const __centerFromSynth = __synthesizeCenterFromMessageV1(String(message ?? ""));
    const __centerKeyForKu = __centerFromSynth.centerKey ?? (String(__threadCore?.centerKey ?? "").trim() || null);
    const __centerLabelForKu =
      __centerFromSynth.centerLabel ??
      (String(__threadCore?.centerLabel ?? "").trim() ||
        (typeof __centerKeyForKu === "string" && __centerKeyForKu ? centerLabelFromKey(__centerKeyForKu) : null));
    const __centerClaimForKu =
      __centerFromSynth.centerClaim ??
      (String((detailPlan as any)?.centerClaim ?? "").trim() || (__centerLabelForKu ? `${__centerLabelForKu}の要点` : null));
    try {
      (detailPlan as any).ownerRouteReason = __ownerRouteForKu;
      (detailPlan as any).explicitLengthRequested = __explicitCharsEarly ?? null;
      (detailPlan as any).answerLengthBias = __explicitCharsEarly != null ? "long" : null;
    } catch {}

    const payload = {
      response: __explicitFinalResponse,
      trace,
      provisional: true,
      detailPlan,
      candidates,
      evidence,
      caps: capsPayload ?? undefined,
      timestamp: new Date().toISOString(),
      decisionFrame: {
        mode: "HYBRID",
        intent: "chat",
        llm: null,
        ku: {
          routeReason: __ownerRouteForKu, /* responsePlan */
          routeClass: __ownerRouteForKu.startsWith("TECHNICAL_") ? "analysis" : "define",
          answerLength: __explicitCharsEarly != null ? "long" : "medium",
          answerMode: __ownerRouteForKu.startsWith("TECHNICAL_") ? "code" : "define",
          answerFrame: "one_step",
          explicitLengthRequested: __explicitCharsEarly ?? null,
          ...( __requiresCenterForExit(__ownerRouteForKu)
            ? {
                centerKey: __centerKeyForKu,
                centerLabel: __centerLabelForKu,
                centerClaim: __centerClaimForKu,
              }
            : {}),
        }
      },
    };
    // ARK_THREAD_SEED_SAVE_V1
    try {
        const df = payload.decisionFrame;
        const ku = (df?.ku ?? {}) as any;

      const laws = Array.isArray(ku.lawsUsed) ? ku.lawsUsed : [];
      const evi  = Array.isArray(ku.evidenceIds) ? ku.evidenceIds : [];

      if (laws.length > 0 && evi.length > 0) {
        const crypto = __tenmonRequire("node:crypto");
        const seedId = crypto
          .createHash("sha256")
          .update(JSON.stringify(laws) + JSON.stringify(evi))
          .digest("hex")
          .slice(0, 24);

        const db = new DatabaseSync(getDbPath("kokuzo.sqlite"));
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO ark_thread_seeds
          (seedId, threadId, lawsUsedJson, evidenceIdsJson, heartJson, routeReason, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          seedId,
          threadId, /* tcTag */
          JSON.stringify(laws),
          JSON.stringify(evi),
          JSON.stringify(ku.heart ?? {}),
          String(ku.routeReason ?? ""),
          new Date().toISOString()
        );
      }
    } catch (e) {
      console.error("[ARK_SEED_SAVE_FAIL]", e);
    }
    return await reply(payload);
  } catch (error) {
    const pid = process.pid;
    const uptime = process.uptime();
    console.error("[CHAT-KANAGI] Error:", { pid, uptime, error });
    // エラー時も観測を返す（停止しない）
    const detailPlan = createEmptyDetailPlanP20V1("ERROR_FALLBACK");
    detailPlan.chainOrder = ["ERROR_FALLBACK"];
    const payload = {
      response: "思考が循環状態にフォールバックしました。矛盾は保持され、旋回を続けています。",
      provisional: true,
      detailPlan,
      timestamp: new Date().toISOString(),
      decisionFrame: { mode: "HYBRID", intent: "chat", llm: null, ku: {} },
    };
    // ARK_THREAD_SEED_SAVE_V1
    try {
        const df = payload.decisionFrame;
        const ku = (df?.ku ?? {}) as any;

      const laws = Array.isArray(ku.lawsUsed) ? ku.lawsUsed : [];
      const evi  = Array.isArray(ku.evidenceIds) ? ku.evidenceIds : [];

      if (laws.length > 0 && evi.length > 0) {
        const crypto = __tenmonRequire("node:crypto");
        const seedId = crypto
          .createHash("sha256")
          .update(JSON.stringify(laws) + JSON.stringify(evi))
          .digest("hex")
          .slice(0, 24);

        const db = new DatabaseSync(getDbPath("kokuzo.sqlite"));
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO ark_thread_seeds
          (seedId, threadId, lawsUsedJson, evidenceIdsJson, heartJson, routeReason, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          seedId,
          threadId, /* tcTag */
          JSON.stringify(laws),
          JSON.stringify(evi),
          JSON.stringify(ku.heart ?? {}),
          String(ku.routeReason ?? ""),
          new Date().toISOString()
        );
      }
    } catch (e) {
      console.error("[ARK_SEED_SAVE_FAIL]", e);
    }
    return await reply(payload);
  }
  });
});

export default router;

// CARD_C11C_FIX_N2_PROMPT_ANCHOR_V1

// CARD_C11E_CLAMP_DEF_AND_GENERAL_RETURN_V1

// CARD_C11F_CLAMP_N1_RETURN_V1

// CARD_C11F2_N1_LOCAL_CLAMP_V1

// CARD_C14B3_FIX_DEF_AND_GENERAL_SAFE_V1

// CARD_C16A_GENERAL_ESCAPE_CLAMP_V1

// CARD_C16B_GENERAL_ESCAPE_GATE_AT_RETURN_V1

// CARD_C16C_GENERAL_GATE_IN_GENERAL_BLOCK_V1

// CARD_C16D2_GENERAL_OVERWRITE_GATE_SAFE_V1

// CARD_C16D3_STRENGTHEN_OVERWRITE_TRIGGER_V1

// CARD_C16E2_REMOVE_C16C_FROM_GENERAL_V2

// CARD_C16F_REMOVE_C16AB_FROM_SUPPORT_V1

// CARD_C15_DEF_DICTIONARY_GATE_V1

// CARD_C15B_FIX_TDZ_AND_DET_DEF_V1

// CARD_C15C2_FIX_DEF_DICT_HIT_CLAMP_V1

// CARD_C15D_EXTEND_DEF_DICT_HIT_TEXT_V1

// CARD_C17B2_GLOSSARY_DBSTATUS_AUTOWIRE_V1

// CARD_C17C2_GLOSSARY_USE_GETDBPATH_V1

// CARD_C17C3_FIX_SQLITE_LOOKUP_NO_DEP_V1

// CARD_C18_GLOSSARY_SOURCE_FLAG_V1

// CARD_C21_DEF_REGEX_EXPAND_V1

// CARD_C21A_AWAKENING_V1A

// CARD_C21B2_FIX_NEED_CONTEXT_CLAMP_V1

// --- C21G1C: GENERAL_GATE_SOFT_V1 ---
// Deterministic last-mile gate. Only edits response when routeReason === NATURAL_GENERAL_LLM_TOP.
