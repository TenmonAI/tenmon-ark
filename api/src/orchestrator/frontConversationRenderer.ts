type SacredContext = {
  isSacred?: boolean;
  routeReason?: string;
  centerLabel?: string | null;
  centerKey?: string | null;
  scriptureKey?: string | null;
  evidence?: Array<any>;
  notionCanon?: Array<any>;
} | null;

export type FrontRendererInput = {
  message: string;
  threadId?: string | null;
  sacredContext?: SacredContext;
};

export type FrontRendererOutput = {
  response: string;
  provider: {
    primaryRenderer: "gpt-5.4";
    helperModels: string[];
    shadowOnly: boolean;
    finalAnswerAuthority: "gpt-5.4";
  };
};

function s(v: unknown): string {
  return String(v ?? "").trim();
}

function buildSacredContextText(ctx: SacredContext): string {
  if (!ctx?.isSacred) return "";
  const lines: string[] = [];
  lines.push("【Sacred Context】");
  if (ctx.routeReason) lines.push("routeReason: " + s(ctx.routeReason));
  if (ctx.centerLabel) lines.push("centerLabel: " + s(ctx.centerLabel));
  if (ctx.centerKey) lines.push("centerKey: " + s(ctx.centerKey));
  if (ctx.scriptureKey) lines.push("scriptureKey: " + s(ctx.scriptureKey));

  const notionCanon = Array.isArray(ctx.notionCanon) ? ctx.notionCanon : [];
  if (notionCanon.length > 0) {
    lines.push("notionCanon:");
    for (const row of notionCanon.slice(0, 5)) {
      lines.push("- " + s(row?.title || row?.pageId || ""));
    }
  }

  const evidence = Array.isArray(ctx.evidence) ? ctx.evidence : [];
  if (evidence.length > 0) {
    lines.push("evidence:");
    for (const row of evidence.slice(0, 5)) {
      lines.push("- " + s(row?.title || row?.snippet || ""));
    }
  }

  return lines.join("\n");
}

async function callLocalGpt(payload: { system: string; user: string }) {
  const r = await fetch("http://127.0.0.1:3000/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-local-test": "1",
      "x-front-renderer": "1",
    },
    body: JSON.stringify({
      threadId: "front_renderer_internal",
      message: payload.user,
      system: payload.system,
    }),
  });
  const j = await r.json();
  return j;
}

export async function frontConversationRenderer(input: FrontRendererInput): Promise<FrontRendererOutput> {
  const message = s(input.message);
  const sacred = input.sacredContext || null;

  const system = [
    "あなたは天聞AI。",
    "一般会話でも自然に話す。",
    "無内容な定型の問い返しを禁止する。",
    "まず相手の問いに答える。",
    "言霊・カタカムナ・言霊秘書・法華経・サンスクリットなど sacred 領域では、与えられた sacred context を優先し、その範囲を越えた創作を避ける。",
    "語り口は落ち着いて明晰にし、必要なら簡潔、必要なら深く。",
    "天聞AIとして、意味・構造・本質・次の一歩を自然に統合する。",
  ].join("\n");

  const sacredText = buildSacredContextText(sacred);
  const user = sacred?.isSacred
    ? sacredText + "\n\n【User Message】\n" + message
    : message;

  try {
    const out = await callLocalGpt({ system, user });
    const text =
      s(out?.response) ||
      s(out?.answer) ||
      s(out?.text) ||
      "受け取りました。";
    return {
      response: text,
      provider: {
        primaryRenderer: "gpt-5.4",
        helperModels: [],
        shadowOnly: false,
        finalAnswerAuthority: "gpt-5.4",
      },
    };
  } catch {
    return {
      response: sacred?.isSacred
        ? `${s(sacred?.centerLabel || "この中心")}を土台に見ていきます。まず、いま知りたい核心を一つ置いてください。`
        : "受け取りました。まず答えるべき核心から返します。続けて聞いてください。",
      provider: {
        primaryRenderer: "gpt-5.4",
        helperModels: [],
        shadowOnly: false,
        finalAnswerAuthority: "gpt-5.4",
      },
    };
  }
}
