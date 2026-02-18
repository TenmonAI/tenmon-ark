import { llmChat } from "./llmWrapper.js";

/**
 * rewriteOnlyTenmon:
 * - 決定論で確定した draft を「表現だけ」整音する（内容は変えない）
 * - 返り値は string のみ（型事故を根絶）
 * - env TENMON_REWRITE_ONLY=1 のときだけ LLM を呼ぶ（既定OFF）
 * - doc/pdfPage/evidenceIds 等が混入したら必ず draft に戻す
 */
export async function rewriteOnlyTenmon(draft: string, rawUserMessage: string): Promise<string> {
  const d = String(draft || "").trim();
  if (!d) return d;

  const enabled = String(process.env.TENMON_REWRITE_ONLY || "") === "1";
  if (!enabled) return d; // default OFF (safe for acceptance)

  // hard contamination guard
  const hasBad = (t: string): boolean => {
    const bad = [
      "doc=", "pdfPage=", "evidenceIds", "KZPAGE:", "【引用】", "出典:",
      "decisionFrame", "candidates", "capsPayload", "kokuzo", "sqlite",
      "http://", "https://",
    ];
    const s = String(t || "");
    return bad.some((w) => s.includes(w));
  };

  const mustKeepOpinion = d.startsWith("【天聞の所見】");
  const q = String(rawUserMessage || "");

  const sys =
    "あなたは文章の整音器。内容は変えず、語尾・間合い・読みやすさだけ整える。" +
    "根拠(doc/pdfPage/evidenceIds/引用)は絶対に生成しない。" +
    "先頭の「【天聞の所見】」と末尾の問い（？）は保持する。";

  const user = "次の文章を、内容を変えずに自然で丁寧な日本語に言い換えてください。\n\n" + d;

  let out = d;
  try {
    const r: any = await llmChat({ system: sys, history: [], user });
    out = String(r?.text ?? r?.response ?? r ?? "").trim() || d;
  } catch {
    out = d;
  }

  if (hasBad(out)) return d;
  if (mustKeepOpinion && !out.startsWith("【天聞の所見】")) return d;
  if (!/[？?]\s*$/.test(out)) out = out.replace(/\s*$/, "？");
  return out;
}
