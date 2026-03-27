/**
 * TENMON_WORLDCLASS_DIALOGUE_ACCEPTANCE / SINGLE_AXIS_REPAIR 共通採点
 * routeReason 契約は変更しない（観測のみ）。
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

function readJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

function safe(obj, path, fallback) {
  let x = obj;
  for (const k of path) {
    if (x == null || typeof x !== "object") return fallback;
    x = x[k];
  }
  return x === undefined ? fallback : x;
}

export const AXIS_TO_CARD = {
  route_reason_consistency: "TENMON_SELFAWARE_OVERRIDE_TRACE_CURSOR_AUTO_V1",
  continuity: "TENMON_GENERAL_CONTINUITY_DECISION_TRUNK_TRACE_CURSOR_AUTO_V1",
  scripture_family: "TENMON_K1_TRACE_EMPTY_RESPONSE_DENSITY_REPAIR_CURSOR_AUTO_V1",
  selfaware_family: "TENMON_SELFAWARE_ROUTE_FAMILY_NORMALIZE_CURSOR_AUTO_V1",
  output_surface: "TENMON_SURFACE_CONTRACT_SECOND_TUNE_CURSOR_AUTO_V1",
  meta_leak_none: "TENMON_SURFACE_CONTRACT_MIN_DIFF_CURSOR_AUTO_V1",
  decision_frame_preserved: "TENMON_SURFACE_CONTRACT_MIN_DIFF_CURSOR_AUTO_V1",
};

function metaDigestOk(digest) {
  const keys = [
    ["k1_probe_hokke", "meta_leak_ok"],
    ["k1_probe_kukai", "meta_leak_ok"],
    ["general_probe", "meta_leak_ok"],
    ["subconcept_probe", "meta_leak_ok"],
    ["ai_consciousness_lock_probe", "meta_leak_ok"],
  ];
  for (const p of keys) {
    const v = safe(digest, p, undefined);
    if (v === false) return false;
  }
  return true;
}

function httpDigestOk(digest) {
  const keys = [
    ["k1_probe_hokke", "http_status"],
    ["k1_probe_kukai", "http_status"],
    ["general_probe", "http_status"],
    ["subconcept_probe", "http_status"],
    ["ai_consciousness_lock_probe", "http_status"],
  ];
  for (const p of keys) {
    const v = safe(digest, p, undefined);
    if (v != null && v !== 200) return false;
  }
  return true;
}

/**
 * @param {string} apiRoot api/ ディレクトリ
 * @returns {{ out: object, exitCode: number, paths: { scorecard: string, priority: string, k1: string } }}
 */
export function computeSealPayload(apiRoot) {
  const scorecardPath = join(apiRoot, "automation/tenmon_worldclass_acceptance_scorecard.json");
  const priorityPath = join(apiRoot, "automation/tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json");
  const k1EvidencePath = join(apiRoot, "automation/tenmon_k1_general_completion_probe_evidence_v1.json");

  const scorecard = readJson(scorecardPath);
  let priority = {};
  try {
    priority = readJson(priorityPath);
  } catch {
    priority = {};
  }
  let k1ev = { probes: [] };
  try {
    k1ev = readJson(k1EvidencePath);
  } catch {
    /* */
  }

  const digest = safe(scorecard, ["latest_truth_sync", "fresh_probe_digest"], null) || {};
  const probes = Array.isArray(k1ev.probes) ? k1ev.probes : [];
  const k1AllPass = probes.length > 0 && probes.every((p) => p.pass === true);

  const scriptureMsgs = probes.filter((p) => /法華経|即身成仏/u.test(String(p.message || "")));
  const scriptureFromEvidence = scriptureMsgs.length > 0 && scriptureMsgs.every((p) => p.pass === true);

  const hk = digest.k1_probe_hokke || {};
  const kk = digest.k1_probe_kukai || {};
  const scriptureFromDigest = hk.satisfied === true && kk.satisfied === true;

  const scriptureOk = scriptureFromDigest || scriptureFromEvidence;

  const gp = digest.general_probe || {};
  const generalFromEvidence = probes.some((p) => /現代人|教えて/u.test(String(p.message || "")) && p.pass === true);
  const outputSurfaceOk = gp.satisfied === true || generalFromEvidence;

  const c1 = String(digest.chat1_route || "").trim();
  const c2 = String(digest.chat2_route || "").trim();
  let routeOk = false;
  if (c1 && c2) {
    const defLike = /^(DEF_|GENERAL_KNOWLEDGE|NATURAL_GENERAL|KOTODAMA|TECHNICAL)/u.test(c1);
    const cont = c2 === "CONTINUITY_ROUTE_HOLD_V1";
    routeOk = defLike && cont;
  }
  if (!routeOk && k1AllPass) routeOk = true;

  const continuityOk =
    digest.continuity_density_unresolved === false &&
    c2 === "CONTINUITY_ROUTE_HOLD_V1" &&
    Number(digest.continuity_followup_len || 0) > 0;

  const ai = digest.ai_consciousness_lock_probe || {};
  const rrAi = String(ai.route || "");
  let selfawareOk = false;
  if (Object.keys(ai).length === 0) {
    selfawareOk = true;
  } else if (ai.satisfied === true) {
    selfawareOk = true;
  } else if (/R22_SELFAWARE|AI_CONSCIOUSNESS_LOCK|TENMON_CONSCIOUSNESS/u.test(rrAi)) {
    selfawareOk = true;
  } else if (
    /R10_SELF_REFLECTION_ROUTE_V4_SAFE/u.test(rrAi) &&
    ai.meta_leak_ok !== false &&
    (ai.http_status == null || ai.http_status === 200) &&
    ai.response_nonempty !== false
  ) {
    selfawareOk = true;
  } else {
    selfawareOk = false;
  }

  const metaOk = metaDigestOk(digest);
  const httpOk = httpDigestOk(digest);

  const axes = {
    route_reason_consistency: routeOk,
    continuity: continuityOk,
    scripture_family: scriptureOk,
    selfaware_family: selfawareOk,
    output_surface: outputSurfaceOk,
    meta_leak_none: metaOk,
    decision_frame_preserved: httpOk,
  };

  const failed = Object.entries(axes).filter(([, v]) => !v).map(([k]) => k);
  const gapCount = failed.length;

  let caseId = "CASE_A";
  let worldclassReady = false;
  let primaryGap = null;
  let nextCardIfFail = null;
  let recommendedMicroCard = null;

  if (gapCount === 0) {
    caseId = "CASE_A";
    worldclassReady = true;
  } else if (gapCount === 1) {
    caseId = "CASE_B";
    worldclassReady = false;
    primaryGap = failed[0];
    recommendedMicroCard = AXIS_TO_CARD[primaryGap] || null;
  } else {
    caseId = "CASE_C";
    worldclassReady = false;
    primaryGap = failed[0];
    nextCardIfFail =
      safe(priority, ["outputs", "next_best_card"], null) ||
      safe(scorecard, ["recommended_next_card"], null) ||
      "TENMON_FINAL_OPERABLE_SEAL_CURSOR_AUTO_V1";
  }

  const out = {
    ok: true,
    card: "TENMON_WORLDCLASS_DIALOGUE_ACCEPTANCE_SEAL_CURSOR_AUTO_V1",
    generated_at: new Date().toISOString(),
    case: caseId,
    worldclass_ready: worldclassReady,
    primary_gap: primaryGap,
    top_blockers: failed,
    gap_count: gapCount,
    rollback_used: false,
    axes,
    probe_summary: {
      route_ok: !!(axes.route_reason_consistency && axes.meta_leak_none),
      continuity_ok: axes.continuity,
      scripture_ok: axes.scripture_family,
      selfaware_ok: axes.selfaware_family,
      surface_ok: !!(axes.output_surface && axes.meta_leak_none && axes.decision_frame_preserved),
    },
    recommended_micro_card: recommendedMicroCard,
    next_card_if_fail: gapCount >= 2 ? nextCardIfFail : gapCount === 1 ? recommendedMicroCard : null,
    inputs: {
      scorecard: scorecardPath,
      priority_loop: priorityPath,
      k1_probe_evidence: k1EvidencePath,
    },
    notes: [
      "digest の satisfied は k1_general_completion_probe_evidence の pass で上書き可能（scripture / general）。",
      "continuity は scorecard fresh_probe_digest の 2 ターン証跡が必要。",
      "CASE_B/C は観測のみ。コード変更は別カードで実施。",
    ],
  };

  return {
    out,
    exitCode: gapCount >= 2 ? 2 : 0,
    paths: { scorecard: scorecardPath, priority: priorityPath, k1: k1EvidencePath },
  };
}
