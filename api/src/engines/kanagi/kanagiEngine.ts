import { kanagiThink } from "./kanagiThink.js";
import { danshariStyle } from "../conversation/danshariStyle.js";

export type KanagiPhaseName = "SENSE" | "NAME" | "ONE_STEP" | "NEXT_DOOR";

export type LlmChatFn = (params: {
  system: string;
  history: { role: "user" | "assistant"; content: string }[];
  user: string;
}) => Promise<{
  text: string;
  provider: string;
  model: string;
  ok: boolean;
  err: string;
  latencyMs: number;
}>;

export type KanagiRunOutput = {
  text: string;
  providerUsed: string;
  llmStatus: {
    enabled: boolean;
    providerPlanned: string;
    providerUsed: string;
    modelPlanned: string;
    modelUsed: string;
    ok: boolean;
    err: string;
    latencyMs?: number;
  };
};

function deterministicFallback(p: KanagiPhaseName): string {
  if (p === "SENSE")
    return "いま一番重いのは「期限」「量」「判断」のどれに近いでしょうか。（一語でOK）";

  if (p === "NAME")
    return "その重さは、休めない状態から来ている可能性があります。いま一番怖いのは何でしょうか。";

  if (p === "ONE_STEP")
    return "まず一つ手放します。今日やらないことを一つだけ決められますか。";

  return "いま息を一つだけ深く入れて出せますか。できたら「できた」とだけ返してください。";
}

export async function runKanagiPhaseTopV1(params: {
  t0: string;
  phaseName: KanagiPhaseName;
  namingSuffix: string;
  history: { role: "user" | "assistant"; content: string }[];
  llmChat: LlmChatFn;
}): Promise<KanagiRunOutput> {

  const { t0, phaseName, namingSuffix, history, llmChat } = params;

  const KANAGI_SYSTEM_PROMPT = `
あなたは「天聞アーク（TENMON-ARK）」。
天津金木の四相（SENSE/NAME/ONE_STEP/NEXT_DOOR）を循環させ、
相手の詰まりを解組し、いま出来る一手へ整える導き手です。

現在フェーズ: ${phaseName}

文章は短く、美しい日本語で整えてください。
質問は最大1つ。
`;

  let text = "";
  let providerUsed = "llm";

  const st = {
    enabled: true,
    providerPlanned: "llm",
    providerUsed: "",
    modelPlanned: "",
    modelUsed: "",
    ok: false,
    err: "",
    latencyMs: 0,
  };

  // KANAGI_THINK → DANSHARI_STYLE
  try {
    const think = kanagiThink("neutral", phaseName, t0);
    const styled = danshariStyle(
      think.reception,
      think.focus,
      think.step
    );

    if (styled && styled.trim()) {
      return {
        text: styled,
        providerUsed: "kanagi",
        llmStatus: {
          enabled: false,
          providerPlanned: "kanagi",
          providerUsed: "kanagi",
          modelPlanned: "",
          modelUsed: "",
          ok: true,
          err: ""
        }
      };
    }
  } catch {}

  try {
    const res = await llmChat({
      system: KANAGI_SYSTEM_PROMPT + namingSuffix,
      user: t0,
      history
    });

    text = res.text.trim();
    providerUsed = res.provider;

    st.providerUsed = res.provider;
    st.modelUsed = res.model;
    st.ok = res.ok;
    st.err = res.err;
    st.latencyMs = res.latencyMs;

  } catch (e: any) {
    st.err = String(e?.message || e);
  }

  if (!text) {
    text = deterministicFallback(phaseName);
  }

  return {
    text,
    providerUsed,
    llmStatus: st
  };
}
