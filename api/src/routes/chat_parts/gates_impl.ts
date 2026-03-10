// gates_impl.ts extracted from chat.ts
// X3_GATES_EXTRACT_V1

import { getIntentionHintForKu } from "../../core/intentionConstitution.js";

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

    // if preach-y, soften but keep the user's question ending
    if (hasBad) {
      u = "【天聞の所見】いまの言葉を“次の一歩”に落とします。\n" + u.replace(/^【天聞の所見】/, "").trim();
      const qpos3 = Math.max(u.lastIndexOf("？"), u.lastIndexOf("?"));
      if (qpos3 !== -1) u = u.slice(0, qpos3 + 1).trim();
    }

    return u.startsWith("【天聞の所見】") ? u : ("【天聞の所見】" + u);
  }

  return t;
}
function __tenmonGeneralGateResultMaybe(x: any): any {
  try {
    if (!x || typeof x !== "object") return x;
    const df = (x as any).decisionFrame || {};
    const ku = df.ku || {};
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
