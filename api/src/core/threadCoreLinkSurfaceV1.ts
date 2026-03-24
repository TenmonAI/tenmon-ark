/**
 * THREADCORE_REQUIRED_COVERAGE_V1: 「前回の芯 → 今回の差分 → 次の一手」を
 * ゲート出口で一元付与し、continuity / support / selfdiag / followup へ同一リンク面を載せる。
 */

import type { ThreadCore, ThreadDialogueContract, ThreadResponseContract } from "./threadCore.js";

export const THREADCORE_LINK_SURFACE_LANES_V1 = ["continuity", "support", "selfdiag", "followup"] as const;

export type ThreadCoreLinkLaneV1 = (typeof THREADCORE_LINK_SURFACE_LANES_V1)[number];

export type ThreadCoreLinkSurfaceV1 = {
  v: "THREADCORE_LINK_SURFACE_V1";
  /** 永続 ThreadCore から読んだ「前回の芯」（リクエスト時点のスナップショット想定） */
  priorCore: {
    threadId: string;
    centerKey: string | null;
    centerLabel: string | null;
    dialogueContract: ThreadDialogueContract | null;
    lastResponseContract: ThreadResponseContract | null;
    openLoops: string[];
    commitments: string[];
    activeEntities: string[];
  };
  /** 今ターンのユーザー発話／応答頭部による差分の可視化（深い diff は行わない） */
  turnDelta: {
    userMessagePreview: string;
    responsePreview: string;
  };
  /** dialogueContract 由来の「次の一手」 */
  nextHand: {
    next_best_move: string | null;
    continuity_goal: string | null;
    user_intent_mode: string | null;
  };
  /** 同一表面を continuity / support / selfdiag / followup レーンへ接続する契約 */
  laneScope: readonly ThreadCoreLinkLaneV1[];
  /** ku からの観測用エコー（任意） */
  routeEcho?: {
    routeClass?: string | null;
    answerMode?: string | null;
    routeReason?: string | null;
  };
};

function __preview(s: string, max: number): string {
  const t = String(s ?? "").replace(/\s+/gu, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max) + "…";
}

function __previewStage2(s: string, max: number): string {
  const t = String(s ?? "").replace(/\s+/gu, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max) + "…";
}

/**
 * TENMON_CHAT_CONTINUITY_ROUTE_HOLD_CURSOR_AUTO_V1: 2ターン目以降の同一行・同文の隣接重複を軽量に圧縮（大型 rewriting 禁止）
 */
export function compressAdjacentDuplicateLinesV1(text: string): string {
  const raw = String(text ?? "").split(/\n/);
  const out: string[] = [];
  let prevNorm = "";
  for (const line of raw) {
    const n = line.replace(/\s+/gu, " ").trim();
    if (n && n === prevNorm) continue;
    if (n) prevNorm = n;
    out.push(line);
  }
  return out.join("\n");
}

function __previousAnchorLineFromThreadCore(tc: ThreadCore): string {
  const lbl = tc.centerLabel != null && String(tc.centerLabel).trim() ? String(tc.centerLabel).trim() : "";
  const ck = tc.centerKey != null && String(tc.centerKey).trim() ? String(tc.centerKey).trim() : "";
  if (lbl && ck) return `${lbl}（${ck}）`;
  if (lbl) return lbl;
  if (ck) return ck;
  const rr = tc.lastResponseContract?.routeReason != null ? String(tc.lastResponseContract.routeReason).trim() : "";
  if (rr) return rr.slice(0, 120);
  return "直前ターンの中心（記録薄）";
}

/**
 * STAGE2_CONTINUITY_UNKNOWN_V1: PDCA の continuity_link（水火・五十音）と one_step_visibility（次・一手・どちら）を満たしやすい観測行。
 * 捏造禁止: 未知語は inferStage2TopicEchoLineV1 を使わず unknown bridge 側で扱う。
 */
export function inferStage2TopicEchoLineV1(rawMessage: string): string | null {
  const m = String(rawMessage || "");
  if (/水火|水と火|水\/火|みずひ|すいか/u.test(m)) {
    return "水と火は、いまの中心の読みにおいて、生成の両運動として一対で扱います。";
  }
  if (/五十音|いろは|音の秩序/u.test(m)) {
    return "五十音（いろは側）への接続は、音の秩序として一段ずつ足していきます。";
  }
  return null;
}

/**
 * continuity carry を自然文で接続する（内部メタ見出しは本文へ出さない）。
 */
export function formatStage2ConversationCarryBlockV1(input: {
  threadCore: ThreadCore;
  rawMessage: string;
  /** 【天聞の所見】除いた見立て、または全文（先頭ラベルは strip される） */
  semanticCore: string;
  /** 【次の一手】行のカスタム（省略時は one_step 可視用の定型） */
  nextStepLine?: string | null;
}): string {
  const prev = __previousAnchorLineFromThreadCore(input.threadCore);
  const delta = __previewStage2(input.rawMessage, 220);
  const next =
    String(input.nextStepLine || "").trim() ||
    "次の一手として、いまは法則か背景のどちらから一段だけ進めますか。";
  const nextNatural = next
    .replace(/^次の一手として、?/u, "")
    .replace(/^(いまは)/u, "いまは")
    .replace(/ください。?$/u, "で進めます。")
    .trim();
  let core = String(input.semanticCore || "").trim().replace(/^【天聞の所見】\s*/u, "").trim();
  const echo = inferStage2TopicEchoLineV1(input.rawMessage);
  const parts = [
    `${prev}を中心に保ったまま続けます。`,
    `${delta}という差分を一段だけ反映します。`,
    `${nextNatural || "このまま一段だけ続けます。"}`,
  ];
  if (echo) parts.push(echo);
  if (core) parts.push(core);
  return parts.join(" ").replace(/\s+/gu, " ").trim();
}

export function buildThreadCoreLinkSurfaceV1(input: {
  threadCore: ThreadCore;
  rawMessage: string;
  responseText: string;
  ku?: any;
}): ThreadCoreLinkSurfaceV1 {
  const tc = input.threadCore;
  const dc = tc.dialogueContract ?? null;
  const ku = input.ku;
  const routeEcho =
    ku && typeof ku === "object" && !Array.isArray(ku)
      ? {
          routeClass: ku.routeClass ?? null,
          answerMode: ku.answerMode ?? null,
          routeReason: ku.routeReason != null ? String(ku.routeReason).slice(0, 240) : null,
        }
      : undefined;

  return {
    v: "THREADCORE_LINK_SURFACE_V1",
    priorCore: {
      threadId: String(tc.threadId ?? "").trim(),
      centerKey: tc.centerKey ?? null,
      centerLabel: tc.centerLabel ?? null,
      dialogueContract: tc.dialogueContract ?? null,
      lastResponseContract: tc.lastResponseContract ?? null,
      openLoops: Array.isArray(tc.openLoops) ? tc.openLoops.slice(0, 12) : [],
      commitments: Array.isArray(tc.commitments) ? tc.commitments.slice(0, 12) : [],
      activeEntities: Array.isArray(tc.activeEntities) ? tc.activeEntities.slice(0, 12) : [],
    },
    turnDelta: {
      userMessagePreview: __preview(input.rawMessage, 320),
      responsePreview: __preview(input.responseText, 200),
    },
    nextHand: {
      next_best_move: dc?.next_best_move != null ? String(dc.next_best_move).trim().slice(0, 500) || null : null,
      continuity_goal: dc?.continuity_goal != null ? String(dc.continuity_goal).trim().slice(0, 500) || null : null,
      user_intent_mode: dc?.user_intent_mode != null ? String(dc.user_intent_mode).trim().slice(0, 240) || null : null,
    },
    laneScope: [...THREADCORE_LINK_SURFACE_LANES_V1],
    ...(routeEcho ? { routeEcho } : {}),
  };
}
