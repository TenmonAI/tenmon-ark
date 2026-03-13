// gates_impl.ts extracted from chat.ts
// X3_GATES_EXTRACT_V1

import { getIntentionHintForKu } from "../../core/intentionConstitution.js";
import { tryAppendKanagiGrowthLedgerFromPayload } from "../../core/kanagiGrowthLedger.js";
import { computeKanagiSelfKernel, getSafeKanagiSelfOutput } from "../../core/kanagiSelfKernel.js";
import { resolveScriptureQuery } from "../../core/scriptureCanon.js";
import { memoryPersistMessage } from "../../memory/index.js";
import { tryAppendThreadSeedFromPayload } from "../../core/threadSeed.js";
import { normalizeProviderPlan } from "../../provider/providerPlan.js";
import { projectResponseSurface } from "../../projection/responseProjector.js";
import { inferExpressionPlan, inferComfortTuning } from "../../expression/expressionPlanner.js";
import { buildBrainstemDecisionFromKu } from "../../chat/brainstem/brainstem.js";
import { upsertThreadCenter } from "../../core/threadCenterMemory.js";

function __normalizeCenterLabel(s: string): string {
  return String(s || "")
    .trim()
    .replace(/(とは|って|は|が|を|に|へ|と|も|の)\s*$/u, "");
}

function __tenmonGeneralGateSoft(out: string): string {
  let t = String(out || "").replace(/\r/g, "").trim();

  // normalize common spacing
  t = t.replace(/^【天聞の所見】\s+/, "【天聞の所見】");

  // hard rules (format safety)
  const qpos = Math.max(t.indexOf("？"), t.indexOf("?"));
  const qcount = (t.match(/[?？]/g) || []).length;
  const lines = t.split("\n").filter(Boolean);

  // RLHF preach / generalization patterns (deterministic)
  const badPhrases = [
    "鍵です", "サインです", "機会として", "捉えましょう",
    "できます", "ことができます", "大切です", "重要です", "真実", "内面",
    "見極める", "道を開きます"
  ];

  const hasBad = badPhrases.some(w => t.includes(w)) || /ましょう/.test(t);

  // If response drifts into preach OR violates strict shape, overwrite with fixed seed.
  // If response drifts into preach OR violates strict shape, CLAMP (do not overwrite with fixed seed).
  if (hasBad || qcount !== 1 || qpos === -1 || lines.length > 4 || t.length > 220) {
    // keep content; reshape only
    let u = String(t || "").replace(/\r/g, "").trim();

    // remove bullet/numbered lines
    u = u.replace(/^\s*\d+[.)].*$/gm, "").replace(/^\s*[-*•]\s+.*$/gm, "").trim();

    // keep at most 4 non-empty lines
    const ls = u.split("\n").map(x => String(x || "").trim()).filter(Boolean);
    u = ls.slice(0, 4).join("\n").trim();

    // keep exactly one question at end if exists; otherwise add one
    const qpos2 = Math.max(u.lastIndexOf("？"), u.lastIndexOf("?"));
    if (qpos2 !== -1) u = u.slice(0, qpos2 + 1).trim();
    else u = u.replace(/[。、\s　]+$/g, "") + "？";

    // cap length
    if (u.length > 220) u = u.slice(0, 220).replace(/[。、\s　]+$/g, "") + "？";

    // R10_GENERAL_POST_TAIL_SANITIZE_V1: remove generic support tails for NATURAL_GENERAL_LLM_TOP
    u = u.replace(/.*もし動けない理由があるなら[^\n]*\n?/g, "");
    u = u.replace(/.*いま気になっているところを、一歩だけ外側から眺めるとしたら[^\n]*\n?/g, "");
    u = u.replace(/\n{3,}/g, "\n\n").trim();

    // if preach-y, soften but keep the user's question ending
    if (hasBad) {
      const qpos3 = Math.max(u.lastIndexOf("？"), u.lastIndexOf("?"));
      if (qpos3 !== -1) u = u.slice(0, qpos3 + 1).trim();
    }

    return u.startsWith("【天聞の所見】") ? u : ("【天聞の所見】" + u);
  }

  // normal path (no preach / no clamp): strip generic support tails if present
  t = t.replace(/.*もし動けない理由があるなら[^\n]*\n?/g, "");
  t = t.replace(/.*いま気になっているところを、一歩だけ外側から眺めるとしたら[^\n]*\n?/g, "");
  t = t.replace(/\n{3,}/g, "\n\n").trim();

  return t;
}
const __GATE_RAW_MESSAGE_KEY = "__tenmon_gate_raw_message_v1";
function __tenmonGeneralGateResultMaybe(x: any, rawMessageOverride?: string): any {
  try {
    if (!x || typeof x !== "object") return x;
    // R9_LEDGER_REAL_INPUT_FREEZE_V1: 実入力を payload と ku に固定（rawMessageOverride / global / payload 優先）
    const fromGlobal = typeof (globalThis as any)[__GATE_RAW_MESSAGE_KEY] === "string" ? (globalThis as any)[__GATE_RAW_MESSAGE_KEY] : "";
    const raw = String(
      rawMessageOverride ?? fromGlobal ?? (x as any).rawMessage ?? (x as any).message ?? (x as any).decisionFrame?.ku?.inputText ?? ""
    );
    if ((x as any).rawMessage == null || String((x as any).rawMessage).trim() === "") (x as any).rawMessage = raw;
    if ((x as any).message == null || String((x as any).message).trim() === "") (x as any).message = raw;
    const df = (x as any).decisionFrame || {};
    const ku = df.ku || {};
    if (ku && typeof ku === "object" && ((ku as any).inputText == null || String((ku as any).inputText ?? "").trim() === "")) (ku as any).inputText = raw;
    // K1_1_HYBRID_TRACE_ENFORCE_v1 (scope-safe: df/ku in this block)
    try {
      if ((df as any).mode === "HYBRID") {
        if (!(df as any).ku || typeof (df as any).ku !== "object" || Array.isArray((df as any).ku)) (df as any).ku = {};
        const __ku: any = (df as any).ku;
        const laws = (__ku as any).lawsUsed;
        const evi  = (__ku as any).evidenceIds;
        const tr   = (__ku as any).lawTrace;
        const empty = (!Array.isArray(laws) || laws.length === 0)
          && (!Array.isArray(evi)  || evi.length  === 0)
          && (!Array.isArray(tr)   || tr.length   === 0);
        // K2_6T_FILL_TRACE_FROM_KHSCANDIDATES_V1
        try {
          const __dp:any = (df as any).detailPlan || null;
          const __kc:any[] = (__dp && Array.isArray(__dp.khsCandidates)) ? __dp.khsCandidates : [];
          if (__kc.length > 0) {
            const __lawKeys = Array.from(new Set(__kc.map((x:any)=>String((x||{}).lawKey||"")).filter((s:any)=>s && s.startsWith("KHSL:LAW:")))).slice(0, 10);
            if (__lawKeys.length > 0) {
              const __lu:any[] = Array.isArray((__ku as any).lawsUsed) ? (__ku as any).lawsUsed : [];
              const __lt:any[] = Array.isArray((__ku as any).lawTrace) ? (__ku as any).lawTrace : [];
              if (__lu.length === 0) (__ku as any).lawsUsed = __lawKeys;
              if (__lt.length === 0) {
                const __tr:any[] = [];
                for (const c of __kc) {
                  const lk=String((c||{}).lawKey||"");
                  if (!lk || !lk.startsWith("KHSL:LAW:")) continue;
                  __tr.push({ lawKey: lk, unitId: String((c||{}).unitId||""), op: "OP_DEFINE" });
                  if (__tr.length >= 8) break;
                }
                if (__tr.length > 0) (__ku as any).lawTrace = __tr;
              }
            }
          }
        } catch {}

        if (empty) { (__ku as any).routeReason = "K1_TRACE_EMPTY_GATED_V1"; }
      }
    } catch {}
    // R4_1_HEART_STATIC_KU_V2 / R2_HEART_PHASE_REASON_ALIGN_V1:
    // phase/reason を HeartState に整合させる。arkTargetPhase / userPhase を優先し、無い場合のみ旧補助ロジックを使う。
    // R4_2_HEART_DYNAMIC_PHASE_V3_FROM_TRACE_V1: deterministic phase from trace/candidates (fallbackのみ)
    try {
      const __ku: any = (df as any).ku;
      const __h: any = (__ku && typeof __ku.heart === "object") ? __ku.heart : null;
      if (__h) {
        const hasArk = typeof __h.arkTargetPhase === "string" && __h.arkTargetPhase;
        const hasUser = typeof __h.userPhase === "string" && __h.userPhase;
        if (hasArk || hasUser) {
          // 新 HeartState がある場合はそれを優先
          __h.phase = String(__h.arkTargetPhase || __h.userPhase);
          if (!__h.reason) __h.reason = "ARK_TARGET_PHASE_V1";
        } else {
          // 旧 dynamic fallback（lawTrace / khsCandidates ベース）
          const __lt = (__ku && Array.isArray(__ku.lawTrace)) ? __ku.lawTrace : [];
          const __dp: any = (df as any).detailPlan || null;
          const __kc = (__dp && Array.isArray(__dp.khsCandidates)) ? __dp.khsCandidates.length : 0;
          if (__lt.length > 0) { __h.phase = "L-OUT"; __h.reason = "DYN_TRACE_NONEMPTY_V1"; }
          else if (__kc > 0) { __h.phase = "R-IN"; __h.reason = "DYN_KHSCAND_NONEMPTY_V1"; }
          else { __h.phase = "CENTER"; __h.reason = "DYN_NONE_V1"; }
        }
      }
    } catch {}
    try {
      const __k: any = (df as any).ku;
      const __h: any = (__k && typeof __k.heart === "object") ? __k.heart : null;
      if (__h) {
        if (!(__h.phase)) __h.phase = "CENTER";
        if (!(__h.reason)) __h.reason = "STATIC_V1";
      } else if (__k && typeof __k === "object") {
        // heart が存在しない場合だけ静的デフォルトを補う
        (__k as any).heart = {
          userPhase: "CENTER",
          userVector: { waterScore: 0.5, fireScore: 0.5, balance: 0 },
          arkTargetPhase: "CENTER",
          entropy: 0.25,
          phase: "CENTER",
          reason: "STATIC_V1",
        };
      }
    } catch {}
    // H2: compassion wrap for SUPPORT only (routeReason from ku)
    try {
      const rr2 = (ku as any).routeReason || "";
      if (rr2 === "N2_KANAGI_PHASE_TOP") {
        const h = (ku as any).heart || __tenmonLastHeart || {};
        (x as any).response = __tenmonCompassionWrapV2((x as any).response, h);
        (x as any).response = __tenmonSupportSanitizeV1((x as any).response);
      }
    } catch {}

    try {
      const h = __tenmonLastHeart;
      if (h && typeof h === "object") {
        // HEART_SHAPE_UNIFY_V1: preserve new shape, merge lastHeart fields only if missing
        const existing = (ku as any).heart;
        if (!existing || typeof existing !== "object") {
          (ku as any).heart = h;
        } else {
          if (!existing.userPhase && h.userPhase) existing.userPhase = h.userPhase;
          if (!existing.userVector && h.userVector) existing.userVector = h.userVector;
          if (!existing.arkTargetPhase && h.arkTargetPhase) existing.arkTargetPhase = h.arkTargetPhase;
          if (existing.entropy === undefined && h.entropy !== undefined) existing.entropy = h.entropy;
        }
        delete (ku as any).heart.state;
      }
    } catch {}
    if (ku.routeReason === "NATURAL_GENERAL_LLM_TOP") {
      (x as any).response = __tenmonGeneralGateSoft((x as any).response);
    }

    // R8_INTENTION_BIND_THOUGHT_GUIDE_V1: wire intention hint to ku (observation only, no route/response change)
    try {
      const __df = (x as any).decisionFrame;
      if (__df && __df.ku && typeof __df.ku === "object") {
        const hint = getIntentionHintForKu();
        if (hint) __df.ku.intention = hint;
      }
    } catch {}
    // R8_KANAGI_SELF_BIND_GATE_WRAPPER_V1: 最終返却前に kanagiSelf を保証（既に object なら上書きしない）
    try {
      const __df = (x as any).decisionFrame;
      if (__df && __df.ku && typeof __df.ku === "object") {
        const __ku: any = __df.ku;
          // R12_CENTER_LABEL_AND_SURFACE_STYLE_FIX_V2
          try {
            const __rr = String(__ku.routeReason || "");
            const __syn = (__ku.synapseTop && typeof __ku.synapseTop === "object") ? __ku.synapseTop : {};
            const __srcKey = String((__syn && __syn.sourceScriptureKey) || "");
            const __cm = String(__ku.centerMeaning || __srcKey || "").trim();
            const __labelMap: Record<string, string> = {
              "KHSL:LAW:KHSU:41c0bff9cfb8:p0:qcb9cdda1f01d": "言霊秘書",
              "kotodama_hisho": "言霊秘書",
              "iroha_kotodama_kai": "いろは言霊解",
              "katakamuna_kotodama_kai": "カタカムナ言霊解",
              "kotodama": "言霊",
              "katakamuna": "カタカムナ",
              "self_reflection": "自己観照",
              "general_study_path": "学び方",
              "katakamuna_study_path": "カタカムナの学び方",
              "iroha_counsel": "いろは相談",
            };

            if ((!__ku.centerLabel || typeof __ku.centerLabel !== "string") && __cm) {
              const __sk = String(__ku.scriptureKey || "").trim();
              __ku.centerLabel = __normalizeCenterLabel(
                String(__labelMap[__cm] || __labelMap[__sk] || __cm).trim()
              );
            }

            if (!__ku.surfaceStyle || typeof __ku.surfaceStyle !== "string") {
              __ku.surfaceStyle =
                __rr === "TENMON_SCRIPTURE_CANON_V1" ? "scripture_centered" :
                __rr === "R10_SELF_REFLECTION_ROUTE_V4_SAFE" ? "reflective_clear" :
                __rr === "R10_STUDY_PATH_CANON_ROUTE_V1" ? "guide_structured" :
                __rr === "R10_IROHA_COUNSEL_ROUTE_V1" ? "counsel_gentle" :
                "plain_clean";
            }

            if (!__ku.closingType || typeof __ku.closingType !== "string") {
              __ku.closingType =
                __rr === "TENMON_SCRIPTURE_CANON_V1" ? "restate_or_next_step" :
                __rr === "R10_SELF_REFLECTION_ROUTE_V4_SAFE" ? "axis_or_next_step" :
                __rr === "R10_STUDY_PATH_CANON_ROUTE_V1" ? "define_structure_next" :
                __rr === "R10_IROHA_COUNSEL_ROUTE_V1" ? "prioritize_or_hold" :
                "default";
            }
          } catch {}
          // R12_BRAINSTEM_BIND_SEED_AND_PROVIDER_V1: 全 route に seedKernel / responseProfile / providerPlan を補完
          try {
            const __raw = String((x as any)?.rawMessage ?? (x as any)?.message ?? "");
            const __rr = String(__ku.routeReason || "");
            const __syn = (__ku.synapseTop && typeof __ku.synapseTop === "object") ? __ku.synapseTop : {};
            const __cm = String(__ku.centerMeaning || __syn.sourceScriptureKey || "").trim();

            const __profile =
              /一言で|簡潔に|短く/u.test(__raw) ? "brief" :
              /詳しく|徹底的に|解析|設計|構築/u.test(__raw) ? "deep_report" :
              "standard";

            const __phase =
              /整理|意味|本質|理解|関係/u.test(__raw) ? "L-IN" :
              /次の一歩|実行|進める|どうする/u.test(__raw) ? "R-OUT" :
              /教えて|内容|とは/u.test(__raw) ? "L-OUT" :
              "CENTER";

            if (!__ku.seedKernel || typeof __ku.seedKernel !== "object") {
              __ku.seedKernel = {
                id: "seed_" + String(Date.now()),
                phase: __phase,
                responseProfile: __profile,
                routeReason: __rr || null,
                centerMeaning: __cm || null,
              };
            }

            if (!__ku.responseProfile || typeof __ku.responseProfile !== "string") {
              __ku.responseProfile = __profile;
            }

            if (!__ku.providerPlan || typeof __ku.providerPlan !== "object") {
              const __needsBreadth =
                /日本の首相|アメリカ|どういう関係|誰|なぜ|いつ|どこ|比較/u.test(__raw) ||
                (__rr === "NATURAL_GENERAL_LLM_TOP" && !__cm);

              __ku.providerPlan = {
                primaryRenderer: "gpt-5.4",
                helperModels: __needsBreadth ? ["gemini"] : [],
                shadowOnly: true,
                finalAnswerAuthority: "gpt-5.4",
              };
            }
          } catch {}
          // R10_GATE_KEEP_SCRIPTURE_FIELDS_REAPPLY_SAFE
          try {
            if ((__ku.centerMeaning == null || __ku.centerMeaning === "") && __ku.synapseTop && __ku.synapseTop.sourceScriptureKey) {
              __ku.centerMeaning = String(__ku.synapseTop.sourceScriptureKey || "").trim();
            }
            if ((__ku.thoughtCoreSummary == null || typeof __ku.thoughtCoreSummary !== "object") && String(__ku.routeReason || "") === "TENMON_SCRIPTURE_CANON_V1") {
              const __cm = String(__ku.centerMeaning || (__ku.synapseTop && __ku.synapseTop.sourceScriptureKey) || "").trim();
              __ku.thoughtCoreSummary = {
                centerKey: "TENMON_SCRIPTURE_CANON_V1",
                centerMeaning: __cm || null,
                routeReason: "TENMON_SCRIPTURE_CANON_V1",
                modeHint: "scripture",
                continuityHint: __cm || null,
              };
            }
            if (typeof __ku.scriptureMode !== "string" && String(__ku.routeReason || "") === "TENMON_SCRIPTURE_CANON_V1" && String(__ku.centerMeaning || "").trim()) {
              __ku.scriptureMode = "canon";
            }
          } catch {}
        if (!__ku.kanagiSelf || typeof __ku.kanagiSelf !== "object") {
          const rawMessage = String((x as any)?.rawMessage ?? (x as any)?.message ?? "");
          const routeReason = String(__ku.routeReason ?? (__df as any).mode ?? "");
          const heart = __ku.heart ?? null;
          const intention = __ku.intention ?? null;
          const mf = __ku.meaningFrame;
          const topicClass =
            mf && typeof mf === "object" && typeof (mf as any).topicClass === "string"
              ? (mf as any).topicClass
              : undefined;
          // R8_SCRIPTURE_CANON_BIND_SELF_COMPLETE_V1: 優先順 __ku.scriptureKey → mf.scriptureKey → resolveScriptureQuery(rawMessage)
          let scriptureKey: string | undefined =
            __ku.scriptureKey != null && String(__ku.scriptureKey).trim()
              ? String(__ku.scriptureKey).trim()
              : mf && (mf as any).scriptureKey != null
                ? String((mf as any).scriptureKey)
                : routeReason === "TENMON_SCRIPTURE_CANON_V1"
                  ? resolveScriptureQuery(rawMessage)?.scriptureKey ?? undefined
                  : undefined;
          const scriptureMode = scriptureKey ? "canon" : undefined;
          const scriptureAlignment = scriptureKey ? "scripture_aligned" : undefined;
          try {
            __ku.kanagiSelf = computeKanagiSelfKernel({
              rawMessage,
              routeReason,
              heart,
              intention,
              topicClass,
              conceptKey: mf && (mf as any).conceptKey != null ? String((mf as any).conceptKey) : undefined,
              scriptureKey,
              scriptureMode,
              scriptureAlignment,
            });
          } catch {
            __ku.kanagiSelf = getSafeKanagiSelfOutput();
          }
        }
      }
    } catch {}
    // R9_LEDGER_GATE_WRAPPER_APPEND_UNIFY_V1: gate 経由でも共通 append（__KANAGI_LEDGER_DONE で二重防止）
    try {
      tryAppendKanagiGrowthLedgerFromPayload(x);
    } catch {}
    // R9_LEDGER_HITMAP_SELF_FLAG_ALIGN_V1: has_self は kanagiSelf 補完後の ku を参照
    try {
      const hasResp = x && typeof x === "object" && "response" in x;
      const df0 = (x as any)?.decisionFrame;
      const has_df = df0 != null && typeof df0 === "object";
      const ku0 = has_df ? (df0 as any).ku : null;
      const has_ku = ku0 != null && typeof ku0 === "object";
      const self0 = has_ku ? (ku0 as any).kanagiSelf : null;
      const has_self = self0 != null && typeof self0 === "object";
      console.error(
        "[R9_LEDGER_HITMAP_GATE]",
        "rr=" + String(has_ku ? (ku0 as any).routeReason ?? "" : ""),
        "has_response=" + hasResp,
        "has_df=" + has_df,
        "has_ku=" + has_ku,
        "has_self=" + has_self
      );
    } catch {}
    // CARD_SESSION_MEMORY_PERSIST_ALL_ROUTES_V1: same-thread 前文脈保持のため、gate 経由全返却で session_memory に user/assistant を persist。二重保存は __TENMON_PERSIST_DONE でスキップ。失敗時は会話を落とさない。
    try {
      const tid = String((x as any).threadId ?? "").trim();
      if (
        tid &&
        raw &&
        !(x as any).__TENMON_PERSIST_DONE &&
        typeof memoryPersistMessage === "function"
      ) {
        memoryPersistMessage(tid, "user", raw);
        memoryPersistMessage(tid, "assistant", String((x as any).response ?? ""));
      }
    } catch {}
    // R10_SYNAPSE_TO_THREAD_SEED_V1: synapse 昇格。1 response 1 seed、__THREAD_SEED_DONE で二重防止。失敗しても会話を落とさない。
    try {
      // R12_EXPORT_BRAINSTEM_CONTRACT_V2_LINEPATCH
      try {
        const __dfOut: any = (x as any)?.decisionFrame;
        const __kuOut: any = (__dfOut && __dfOut.ku && typeof __dfOut.ku === "object") ? __dfOut.ku : null;
        if (__kuOut) {
          if ((__kuOut as any).providerPlan) {
            (__kuOut as any).providerPlan = normalizeProviderPlan((__kuOut as any).providerPlan);
          }
          if ((x as any).routeReason == null) (x as any).routeReason = __kuOut.routeReason ?? null;
          if ((x as any).centerMeaning == null) (x as any).centerMeaning = __kuOut.centerMeaning ?? null;
          if ((x as any).responseProfile == null) (x as any).responseProfile = __kuOut.responseProfile ?? null;
          if ((x as any).providerPlan == null) (x as any).providerPlan = __kuOut.providerPlan ?? null;
          if ((x as any).thoughtCoreSummary == null) (x as any).thoughtCoreSummary = __kuOut.thoughtCoreSummary ?? null;
          if ((x as any).seedKernel == null) (x as any).seedKernel = __kuOut.seedKernel ?? null;
          if ((x as any).scriptureMode == null) (x as any).scriptureMode = __kuOut.scriptureMode ?? null;
          if ((x as any).centerLabel == null) (x as any).centerLabel = __kuOut.centerLabel ?? null;
          if ((x as any).surfaceStyle == null) (x as any).surfaceStyle = __kuOut.surfaceStyle ?? null;
          if ((x as any).closingType == null) (x as any).closingType = __kuOut.closingType ?? null;
          // FIX_THREAD_CONTINUITY_FULL_V2B_GATES_PERSIST_LINEPATCH
          try {
            const __tidCenter = String((x as any)?.threadId || "").trim();
            const __rrCenter = String((__kuOut as any)?.routeReason || (x as any)?.routeReason || "").trim();
            const __centerKeyCenter = String((__kuOut as any)?.centerKey || (__kuOut as any)?.centerMeaning || "").trim();
            const __mfAny: any = (__kuOut as any)?.meaningFrame || null;
            const __isDefRoute =
              __rrCenter === "DEF_DICT_HIT" ||
              __rrCenter === "DEF_FASTPATH_VERIFIED_V1" ||
              __rrCenter === "DEF_LLM_TOP";
            if (__tidCenter && __isDefRoute && __centerKeyCenter) {
              upsertThreadCenter({
                threadId: __tidCenter,
                centerType: "concept",
                centerKey: __centerKeyCenter,
                sourceRouteReason: __rrCenter,
                sourceScriptureKey: null,
                sourceTopicClass: String(__mfAny?.topicClass || "concept"),
              });
            }
          } catch {}
          // R25_TRINITY_BRAINSTEM_EXTRACT_V1
          try {
            (__kuOut as any).brainstemDecision = buildBrainstemDecisionFromKu(__kuOut);
            if ((x as any).brainstemDecision == null) {
              (x as any).brainstemDecision = (__kuOut as any).brainstemDecision;
            }
          } catch {}
          if (!(__kuOut as any).expressionPlan || typeof (__kuOut as any).expressionPlan !== "object") {
            (__kuOut as any).expressionPlan = inferExpressionPlan({
              routeReason: (__kuOut as any).routeReason,
              centerMeaning: (__kuOut as any).centerMeaning,
              response: (x as any).response,
            });
          }
          if (!(__kuOut as any).comfortTuning || typeof (__kuOut as any).comfortTuning !== "object") {
            (__kuOut as any).comfortTuning = inferComfortTuning({
              routeReason: (__kuOut as any).routeReason,
              response: (x as any).response,
            });
          }
          if ((x as any).expressionPlan == null) (x as any).expressionPlan = (__kuOut as any).expressionPlan ?? null;
          if ((x as any).comfortTuning == null) (x as any).comfortTuning = (__kuOut as any).comfortTuning ?? null;
          // R25B_BRAINSTEM_REFRESH_AFTER_STYLE_V1
          try {
            (__kuOut as any).brainstemDecision = buildBrainstemDecisionFromKu(__kuOut);
            (x as any).brainstemDecision = (__kuOut as any).brainstemDecision;
          } catch {}
          if ((x as any).shadowResult == null) (x as any).shadowResult = __kuOut.shadowResult ?? null;
        }
      } catch {}
      tryAppendThreadSeedFromPayload(x);
    } catch {}
      // R13_RESPONSE_PROJECTOR_REINTRO_SAFE_V1
      try {
        const __dfP: any = (x as any)?.decisionFrame;
        const __kuP: any = (__dfP && __dfP.ku && typeof __dfP.ku === "object") ? __dfP.ku : null;
        if (__kuP && typeof (x as any).response === "string") {
          const projected = projectResponseSurface({
            routeReason: __kuP.routeReason,
            centerMeaning: __kuP.centerMeaning,
            centerLabel: __kuP.centerLabel,
            surfaceStyle: __kuP.surfaceStyle,
            closingType: __kuP.closingType,
            thoughtCoreSummary: __kuP.thoughtCoreSummary,
            response: String((x as any).response || ""),
          });
          (x as any).response = projected.response;
        }
      } catch {}
      // 最終返却直前: 全角ではない連続空白を1個に圧縮（改行は維持）＋和文内の半角スペースを除去
      try {
        if (typeof (x as any).response === "string") {
          let __respNorm = String((x as any).response || "").replace(/[^\S\n]+/g, " ");
          let __prevNorm = "";
          while (__respNorm !== __prevNorm) {
            __prevNorm = __respNorm;
            __respNorm = __respNorm.replace(/([一-龠々ぁ-んァ-ヶー]) ([一-龠々ぁ-んァ-ヶー])/g, "$1$2");
            __respNorm = __respNorm.replace(/([。、】【「」『』（）]) ([一-龠々ぁ-んァ-ヶー])/g, "$1$2");
          }
          (x as any).response = __respNorm;
        }
      } catch {}
    return x;
  } catch { return x; }
}
// --- /C21G1C: GENERAL_GATE_SOFT_V1 ---

// CARD_C21G1C_GENERAL_GATE_SOFT_V1
// CARD_C21B3_FIX_NEED_CONTEXT_CLAMP_V3\n// CARD_C21G2_GENERAL_GATE_PATTERNS_V2\n
// CARD_H1_HEART_MODEL_MOCK_V1
// CARD_H1B_HEART_OBSERVE_V2
// FIX_H1Bv2_IMPORT_EXT_V1

// --- H1C: lastHeart bridge (process-local) ---
let __tenmonLastHeart: any = null;
// --- /H1C: lastHeart bridge ---
// CARD_H1C_ATTACH_HEART_TO_DECISIONFRAME_V1

// --- H2: BUDDHA_SYNAPSE_SAFE_V2 ---
function __tenmonCompassionPrefixV2(heart: any): string {
  const st = String(heart?.state || "neutral");
  if (st === "exhausted" || st === "tired") return "疲れが強い状態です。";
  if (st === "confused" || st === "anxious") return "迷いが強い状態です。";
  if (st === "angry") return "怒りが強い状態です。";
  if (st === "sad" || st === "depressed") return "痛みが強い状態です。";
  return "";
}
function __tenmonCompassionWrapV2(out: string, heart: any): string {
  let t = String(out || "").replace(/\r/g, "").trim();
  if (!t) return t;
  if (!t.startsWith("【天聞の所見】")) t = "【天聞の所見】" + t;
  const body = t.replace(/^【天聞の所見】\s*/, "");
  const pref = __tenmonCompassionPrefixV2(heart);
  if (!pref) return "【天聞の所見】" + body;
  return "【天聞の所見】" + pref + body;
}
// --- /H2 ---

// CARD_H2_BUDDHA_SYNAPSE_SAFE_V2

// --- H2B: SUPPORT_SANITIZE_V1 ---
function __tenmonSupportSanitizeV1(out: string): string {
  let t = String(out || "").replace(/\r/g, "").trim();
  if (!t) return t;

  if (!t.startsWith("【天聞の所見】")) t = "【天聞の所見】" + t;

  // remove hedges (ΔZ) — keep meaning, reduce fluff
  t = t.replace(/かもしれません/g, "")
       .replace(/おそらく/g, "")
       .replace(/多分/g, "")
       .trim();

  // remove soft-imperatives / offers (avoid coercion)
  t = t.replace(/してみませんか/g, "ですか")
       .replace(/しませんか/g, "ですか")
       .replace(/してみてください/g, "")
       .replace(/してください/g, "")
       .replace(/しましょう/g, "")
       .replace(/どうでしょう/g, "")
       .trim();

  // cap length (no forced question, no strange suffix)
  if (t.length > 220) t = t.slice(0, 220).replace(/[。、\s　]+$/g, "").trim();

  // DO NOT force question mark here (allow "言い切り" / 間)
  return t;
}
// --- /H2B ---
// CARD_H2B_BUDDHA_SYNAPSE_STABILIZE_V1
// CARD_H2C_SUPPORT_DEIMPERATIVE_V1
// CARD_E0A_FAST_CHAT_FOR_ACCEPTANCE_V1
// CARD_E0A2_FASTPATH_MATCH_SMOKE_V1
// CARD_E0A3_FASTPATH_END_WITH_1Q_V1
// CARD_E0A4_FASTPATH_EXACT_SMOKE_FALLBACK_V1
// CARD_E0A6_FASTPATH_SHAPE_MATCH_V1
// CARD_E0A7_EXCLUDE_SMOKE_FROM_FASTPATH_V1
// CARD_E0A8_EXCLUDE_SMOKE_FROM_ISTESTTID0_V1
// CARD_E0A9_SMOKE_PING_FORCE_FALLBACK_V1
// CARD_E0A9B_REMOVE_UNKNOWN_FIELDS_V1
// CARD_E0A9C_SMOKE_PING_CONTRACT_V1
// CARD_P31_KAMIYO_SYNAPSE_GEN_SYSTEM_V1
// CARD_E0A10B_SMOKE_PASSPHRASE_VIA_CONVERSATION_LOG_V1
// CARD_P32_RELAX_GENERAL_GATE_V2
// CARD_P33_3_CONNECTOME_HISTORY_V1
// CARD_P33_2_DEF_UNBLOCK_V1
// CARD_B1_IMMUNE_H2B_RELAX_V1
// CARD_B2_BRAIN_RELAX_KANAGI_Q_V1
// CARD_B3_BRAIN_RELAX_KANAGI_CONFIRMQ_V1
// CARD_B4_BRAIN_KANAGI_Q_ZERO_V1
// CARD_B6_BRAIN_REMOVE_KANAGI_MUST_Q_V1

export { __tenmonGeneralGateResultMaybe, __tenmonGeneralGateSoft, __tenmonCompassionWrapV2, __tenmonSupportSanitizeV1 };
export function setTenmonLastHeart(x:any){ __tenmonLastHeart = x; }
