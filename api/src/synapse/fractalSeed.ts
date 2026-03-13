export type ResponseProfile = "brief" | "standard" | "deep_report";
export type KanagiPhase = "L-IN" | "L-OUT" | "R-IN" | "R-OUT" | "CENTER";

export interface SynapseSeed {
  id: string;
  threadId: string;
  rawMessage: string;
  routeReason?: string;
  centerKey?: string;
  centerLabel?: string;
  centerMeaning?: string;
  topicClass?: string;
  scriptureKey?: string;
  phase?: KanagiPhase;
  responseProfile?: ResponseProfile;
  createdAt: number;
}

function inferResponseProfile(raw: string): ResponseProfile {
  const s = String(raw || "");
  if (/(一言で|簡潔に|短く|要点だけ)/u.test(s)) return "brief";
  if (/(詳しく|徹底的に|解析|設計|構築|本質|レポート)/u.test(s)) return "deep_report";
  return "standard";
}

function inferPhase(raw: string): KanagiPhase {
  const s = String(raw || "");
  if (/(整理|意味|本質|理解|なぜ)/u.test(s)) return "L-IN";
  if (/(次の一歩|どうする|実行|進める)/u.test(s)) return "R-OUT";
  if (/(比較|関係|構造|内容)/u.test(s)) return "R-IN";
  if (/(教えて|説明|とは)/u.test(s)) return "L-OUT";
  return "CENTER";
}

export function buildSynapseSeed(params: {
  threadId?: string;
  rawMessage: string;
  routeReason?: string;
  centerKey?: string;
  centerLabel?: string;
  centerMeaning?: string;
  scriptureKey?: string;
  topicClass?: string;
}): SynapseSeed {
  const raw = String(params.rawMessage || "").trim();
  return {
    id: `seed_${Date.now()}`,
    threadId: String(params.threadId || ""),
    rawMessage: raw,
    routeReason: params.routeReason,
    centerKey: params.centerKey,
    centerLabel: params.centerLabel,
    centerMeaning: params.centerMeaning,
    scriptureKey: params.scriptureKey,
    topicClass: params.topicClass,
    responseProfile: inferResponseProfile(raw),
    phase: inferPhase(raw),
    createdAt: Date.now(),
  };
}
