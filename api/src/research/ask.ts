import { promises as fs } from "node:fs";
import path from "node:path";
import type { PagesManifest } from "./pages.js";
import { searchInPages } from "./search.js";
import { RESEARCH_DIR } from "./paths.js";

type Citation = { page: number; quote: string };
type AskAnswer = {
  answer: string;
  citations: Citation[];
  notes?: string[];
};

function stripCodeFences(s: string): string {
  const t = s.trim();
  if (t.startsWith("```")) return t.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
  return t;
}

async function callOpenAIJSON(prompt: string): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o";
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing");

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 1400,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "あなたはTENMON-ARK研究回答エンジン。外部知識は禁止。提示された本文断片だけで答える。必ずJSONのみ。answerとcitations(ページ番号と原文引用)必須。本文に根拠が無い場合はanswerに「本文に根拠がありません」と書き、citationsは空配列。",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  const raw = await res.text();
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${raw.slice(0, 300)}`);

  const j = JSON.parse(raw);
  const content = String(j?.choices?.[0]?.message?.content ?? "{}");
  const cleaned = stripCodeFences(content);
  return JSON.parse(cleaned);
}

export async function askWithCitations(args: {
  id: string;
  question: string;
  manifest: PagesManifest;
}): Promise<AskAnswer> {
  const { id, question, manifest } = args;

  // まず検索（キーワード一致）
  const hits = await searchInPages({ id, query: question, manifest, limit: 6 });

  // ヒットが弱い場合は「質問から主要語」をユーザー側で入力する運用が最強だが、
  // MVPなので質問全文でも検索を試す
  const textsDir = path.join(RESEARCH_DIR, "pages", id, "text");

  const blocks: { page: number; text: string }[] = [];
  for (const h of hits) {
    const tp = path.join(textsDir, `p${String(h.page).padStart(4, "0")}.txt`);
    const t = await fs.readFile(tp, "utf-8");
    blocks.push({ page: h.page, text: t.slice(0, 6000) });
  }

  const prompt = [
    "質問:",
    question,
    "",
    "以下は資料本文の抜粋（ページ番号付き）。この抜粋の範囲だけを根拠に答えること。",
    "",
    ...blocks.map((b) => `--- page ${b.page} ---\n${b.text}`),
    "",
    "出力JSON schema:",
    "{",
    '  "answer": "本文抜粋だけで答える（根拠がなければ『本文に根拠がありません』）",',
    '  "citations": [ { "page": 1, "quote": "原文引用（そのまま）" } ],',
    '  "notes": ["任意：不足情報/次に読むべきページ"]',
    "}",
  ].join("\n");

  const out = await callOpenAIJSON(prompt);

  const ans: AskAnswer = {
    answer: String(out?.answer ?? "本文に根拠がありません"),
    citations: Array.isArray(out?.citations)
      ? out.citations
          .map((c: any) => ({
            page: Number(c?.page ?? 0),
            quote: String(c?.quote ?? "").trim(),
          }))
          .filter((c: any) => c.page > 0 && c.quote)
      : [],
    notes: Array.isArray(out?.notes) ? out.notes.map((x: any) => String(x)) : undefined,
  };

  return ans;
}

