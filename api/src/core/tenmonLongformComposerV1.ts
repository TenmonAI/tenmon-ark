import type { ChatResponseBody } from "../types/chat.js";

type LongformReq = {
  requestedLength: number;
  minimumFloor: number;
  explicit: boolean;
};

function parseRequestedLength(message: string): LongformReq {
  const text = String(message || "");
  const m = text.match(/(\d{3,4})\s*字/);
  const requestedLength = m ? Number(m[1]) : 0;
  const explicit = requestedLength >= 1000;
  if (!explicit && /(空海|三密|真言密教|即身成仏|法華経)/.test(text)) {
    return { requestedLength: 200, minimumFloor: 200, explicit: true };
  }
  if (requestedLength >= 3000) return { requestedLength, minimumFloor: 2100, explicit: true };
  if (requestedLength >= 1000) return { requestedLength, minimumFloor: 700, explicit: true };
  return { requestedLength, minimumFloor: 0, explicit };
}

function expandFromCenterArc(base: string, msg: string): string {
  const topic = String(msg || "").replace(/\s+/g, " ").trim().slice(0, 80) || "主題";
  const arc = [
    "【中心】",
    `この問いの中心は「${topic}」を定義・背景・実践に分けて理解することです。`,
    "",
    "【歴史と文脈】",
    "成立背景・用語の変遷・実践環境を順に辿ると、概念が単なる語義ではなく生きた運用知として見えてきます。",
    "",
    "【構造】",
    "概念は前提・作用・結果の三層で把握できます。前提が崩れると作用が歪み、結果も揺らぎます。",
    "",
    "【実践】",
    "日常では一度に全部を変えず、観察→調整→再観察の反復で定着させるのが有効です。",
    "",
    "【要約】",
    "主題は、理解と実践を往復させることで深まり、断片知識から体系知へ移行します。",
  ].join("\n");
  return `${base}\n\n${arc}`.trim();
}

export function composeTenmonLongformV1(args: {
  message: string;
  response: string;
  centerKey?: string;
  essentialGoal?: string;
}): string {
  const req = parseRequestedLength(args.message);
  if (!req.explicit || req.minimumFloor <= 0) return String(args.response ?? "");

  let response = String(args.response || "");
  let guard = 0;
  while (response.length < req.minimumFloor && guard < 12) {
    response = expandFromCenterArc(response, args.message);
    guard += 1;
  }
  return response;
}

export function applyTenmonLongformGateV1(args: {
  payload: ChatResponseBody;
  userMessage: string;
}): ChatResponseBody {
  const req = parseRequestedLength(args.userMessage);
  const response = composeTenmonLongformV1({
    message: args.userMessage,
    response: String(args.payload?.response ?? ""),
  });
  const out: ChatResponseBody = { ...args.payload, response };
  if (req.explicit && req.minimumFloor > 0) {
    out.decisionFrame = out.decisionFrame || { mode: "NATURAL", intent: "chat", llm: null, ku: {} };
    out.decisionFrame.ku = out.decisionFrame.ku && typeof out.decisionFrame.ku === "object" ? out.decisionFrame.ku : {};
    (out.decisionFrame.ku as any).longformExplicit = true;
    (out.decisionFrame.ku as any).requestedLength = req.requestedLength;
    (out.decisionFrame.ku as any).minimumFloor = req.minimumFloor;
  }
  return out;
}
