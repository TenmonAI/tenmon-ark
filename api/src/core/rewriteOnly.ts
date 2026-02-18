import { llmChat } from "./llmWrapper.js";

type LengthIntent = "SHORT" | "MED" | "LONG";

function inferIntentFromMessage(raw: string): LengthIntent {
  const q = String(raw || "").trim();
  if (/(短く|一行|要点|結論だけ|tl;dr|tldr|箇条書きだけ)/i.test(q)) return "SHORT";
  if (/(詳しく|完全に|設計|仕様|提案|全部|長め)/i.test(q)) return "LONG";
  return "MED";
}

function contaminated(text: string): string | null {
  const t = String(text || "");
  const bad = [
    "doc=", "pdfPage=", "evidenceIds", "引用", "出典", "ソース", "Source:",
    "http://", "https://",
    "私はAIです", "I am an AI"
  ];
  for (const w of bad) if (t.includes(w)) return w;
  return null;
}

export async function rewriteOnlyTenmon(
  draft: string,
  rawUserMessage: string
): Promise<{ text: string; used: boolean; rejectedBy?: string }> {
  const d = String(draft || "").trim();
  if (d.length < 2) return { text: d, used: false };

  const intent = inferIntentFromMessage(rawUserMessage);

  const sys = [
    "あなたはTENMON-ARKの“整音器官”。",
    "入力ドラフトの【意味】を一切変えず、語尾・リズム・間（ま）だけを整える。",
    "禁止：新しい事実、根拠、doc/pdfPage、引用、URL、数値の追加・変更。",
    "出力はドラフト本文のみ（前置き説明禁止）。",
    intent === "SHORT"
      ? "短く。1〜3文。"
      : intent === "LONG"
        ? "読みやすく。段落は最大3。"
        : "自然に。2〜5文。"
  ].join("\n");

  const out = await llmChat({
    system: sys,
    history: [],
    user: d
  });

  const rewritten = String(out?.text || "").trim();
  if (!rewritten) return { text: d, used: false };

  const hit = contaminated(rewritten);
  if (hit) return { text: d, used: false, rejectedBy: hit };

  // keep structure markers if draft had them
  if (d.startsWith("【天聞の所見】") && !rewritten.startsWith("【天聞の所見】")) {
    return { text: d, used: false, rejectedBy: "lost_opinion_prefix" };
  }
  if (d.includes("一点質問") && !rewritten.includes("一点質問")) {
    // allow if ends with question mark
    if (!/[？?]\s*$/.test(rewritten)) return { text: d, used: false, rejectedBy: "lost_one_q" };
  }
  return { text: rewritten, used: true };
}
