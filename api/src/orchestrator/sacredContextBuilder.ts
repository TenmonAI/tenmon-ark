import { resolveScriptureQuery } from "../core/scriptureCanon.js";
import { resolveSubconceptQuery } from "../core/subconceptCanon.js";
import { getNotionCanonForRoute } from "../core/notionCanon.js";
import { getLatestThreadCenter } from "../core/threadCenterMemory.js";

type SacredDecision = {
  isSacred: boolean;
  domain?: "kotodama" | "katakamuna" | "scripture" | "general";
  routeReason: string;
  centerHint?: string | null;
};

export type SacredContext = {
  isSacred: boolean;
  sourcePack: "seiten" | "scripture" | "notion" | "none";
  groundedRequired: boolean;
  routeReason: string;
  centerKey?: string | null;
  centerLabel?: string | null;
  scriptureKey?: string | null;
  notionCanon?: any[];
  evidence?: any[];
  threadCenter?: any;
};

function s(v: unknown): string {
  return String(v ?? "").trim();
}

function normalizeDisplayLabel(label: string): string {
  const x = s(label);
  const map: Record<string, string> = {
    hokekyo: "法華経",
    kotodama_hisho: "言霊秘書",
    iroha_kotodama_kai: "いろは言霊解",
    katakamuna_kotodama_kai: "カタカムナ言霊解",
    mizuho_den: "水穂伝",
    kotodama: "言霊",
    katakamuna: "カタカムナ",
    amatsukanagi: "天津金木",
    a_kotodama: "あ の言霊",
    i_kotodama: "い の言霊",
    u_kotodama: "う の言霊",
    e_kotodama: "え の言霊",
    o_kotodama: "お の言霊",
    hi_kotodama: "ひ の言霊",
  };
  return map[x] || x;
}

function shouldReuseSacredThreadCenter(msg: string): boolean {
  const x = s(msg);
  if (!x) return false;

  // 一般会話へ戻す発話は sacred 継続しない
  if (/^(おはよう|こんにちは|こんばんは|ありがとう|喋れるの|喋れる|話せる|使える|動いてる|あなたは誰|君は誰|何者|自己紹介)/u.test(x)) {
    return false;
  }

  // sacred follow-up と見なすものだけ継続
  if (/(次の一歩|その次|続きを|続き|詳しく|もう少し|さらに|深く|本質|構造|法則|意味|定義|働き|どこから|教えて|説明して)/u.test(x)) {
    return true;
  }

  if (/^(それで|では|で|その話|続けて|つづけて|次は|次に)/u.test(x)) {
    return true;
  }

  return false;
}

export function sacredContextBuilder(input: {
  message: string;
  threadId?: string | null;
  decision: SacredDecision;
}): SacredContext {
  const msg = s(input.message);
  const d = input.decision;
  const tid = s(input.threadId);

  let prevCenter: any = null;
  try {
    if (tid) prevCenter = getLatestThreadCenter(tid);
  } catch {}

  // 非sacred入力でも、follow-upっぽい時だけ前回の sacred center を再利用
  if (!d.isSacred) {
    if (prevCenter && s(prevCenter.center_key) && shouldReuseSacredThreadCenter(msg)) {
      const prevKey = s(prevCenter.center_key);
      const prevType = s(prevCenter.center_type);
      const prevLabel = normalizeDisplayLabel(prevKey);

      if (prevType === "scripture") {
        return {
          isSacred: true,
          sourcePack: "scripture",
          groundedRequired: true,
          routeReason: "TENMON_SCRIPTURE_CANON_V1",
          centerKey: prevKey,
          centerLabel: prevLabel,
          scriptureKey: prevKey,
          notionCanon: getNotionCanonForRoute("TENMON_SCRIPTURE_CANON_V1", msg) || [],
          evidence: [],
          threadCenter: {
            centerType: "scripture",
            centerKey: prevKey,
            sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
          },
        };
      }

      if (prevType === "concept") {
        return {
          isSacred: true,
          sourcePack: "seiten",
          groundedRequired: true,
          routeReason: "TENMON_SUBCONCEPT_CANON_V1",
          centerKey: prevKey,
          centerLabel: prevLabel,
          scriptureKey: null,
          notionCanon: getNotionCanonForRoute("TENMON_SUBCONCEPT_CANON_V1", msg) || [],
          evidence: [],
          threadCenter: {
            centerType: "concept",
            centerKey: prevKey,
            sourceRouteReason: "TENMON_SUBCONCEPT_CANON_V1",
          },
        };
      }
    }

    return {
      isSacred: false,
      sourcePack: "none",
      groundedRequired: false,
      routeReason: d.routeReason || "FRONT_CHAT_GPT_ROUTE_V1",
      centerKey: "front_conversation",
      centerLabel: "前面会話",
      scriptureKey: null,
      notionCanon: [],
      evidence: [],
      threadCenter: null,
    };
  }

  if (d.domain === "scripture") {
    const hit = resolveScriptureQuery(msg);
    const scriptureKey = s((hit as any)?.scriptureKey);
    const displayName = normalizeDisplayLabel(s((hit as any)?.displayName || scriptureKey));
    return {
      isSacred: true,
      sourcePack: "scripture",
      groundedRequired: true,
      routeReason: "TENMON_SCRIPTURE_CANON_V1",
      centerKey: scriptureKey || "scripture",
      centerLabel: displayName || "聖典",
      scriptureKey: scriptureKey || null,
      notionCanon: getNotionCanonForRoute("TENMON_SCRIPTURE_CANON_V1", msg) || [],
      evidence: [],
      threadCenter: {
        centerType: "scripture",
        centerKey: scriptureKey || null,
        sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1",
      },
    };
  }

  const sub = resolveSubconceptQuery(msg);
  const conceptKey = s((sub as any)?.conceptKey || d.centerHint);
  const displayName = normalizeDisplayLabel(s((sub as any)?.displayName || conceptKey));

  return {
    isSacred: true,
    sourcePack: "seiten",
    groundedRequired: true,
    routeReason: "TENMON_SUBCONCEPT_CANON_V1",
    centerKey: conceptKey || null,
    centerLabel: displayName || null,
    scriptureKey: null,
    notionCanon: getNotionCanonForRoute("TENMON_SUBCONCEPT_CANON_V1", msg) || [],
    evidence: [],
    threadCenter: {
      centerType: "concept",
      centerKey: conceptKey || null,
      sourceRouteReason: "TENMON_SUBCONCEPT_CANON_V1",
    },
  };
}
