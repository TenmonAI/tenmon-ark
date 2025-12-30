import { promises as fs } from "node:fs";
import path from "node:path";
import { chunkText } from "./chunk.js";
import { RULES_DIR } from "./paths.js";
import { dedupeRules, normalizeRule } from "./merge.js";

type Rule = { title: string; rule: string; evidence: string; note?: string };

export type DeepRuleset = {
  version: "R2";
  sourceId: string;
  createdAt: string;
  chunks: number;
  rules: Rule[];
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
      max_tokens: 1800,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "あなたはTENMON-ARK研究解析。外部知識は禁止。入力本文だけから抽出。必ずJSONのみ。各ルールに evidence（本文の原文引用）必須。本文に無いことは出さない。",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  const raw = await res.text();
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${raw.slice(0, 300)}`);

  const json = JSON.parse(raw);
  const content = String(json?.choices?.[0]?.message?.content ?? "{}");
  const cleaned = stripCodeFences(content);

  try {
    return JSON.parse(cleaned);
  } catch {
    // 最後の保険：最初の { から最後の } を抜く
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("LLM output is not valid JSON");
  }
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

export async function analyzeDeep(args: { id: string; textPath: string }): Promise<{ rulesPath: string; ruleset: DeepRuleset }> {
  const { id, textPath } = args;
  await ensureDir(RULES_DIR);

  const full = await fs.readFile(textPath, "utf-8");
  const chunks = chunkText(full, 12000, 800);

  const collected: Rule[] = [];

  for (let idx = 0; idx < chunks.length; idx++) {
    const chunk = chunks[idx];

    const prompt = [
      `あなたは資料解析者。以下は資料本文の一部（chunk ${idx + 1}/${chunks.length}）。`,
      "この本文から、法則/アルゴリズム/禁則を抽出し、JSONのみで返してください。",
      "schema:",
      "{",
      '  "rules": [',
      "    {",
      '      "title": "短い名前",',
      '      "rule": "法則を一文で断定形",',
      '      "evidence": "本文からの原文引用（必須）",',
      '      "note": "任意：適用条件/例外"',
      "    }",
      "  ]",
      "}",
      "",
      "本文:",
      chunk,
    ].join("\n");

    const out = await callOpenAIJSON(prompt);
    const rawRules = Array.isArray(out?.rules) ? out.rules : [];
    const normalized: Rule[] = rawRules
      .map(normalizeRule)
      .filter((r: Rule | null): r is Rule => r !== null);

    // evidenceが本文中に存在するものだけ採用（捏造防止）
    const valid = normalized.filter((r: Rule) => chunk.includes(r.evidence));
    collected.push(...valid);
  }

  // 統合（重複排除）
  const merged = dedupeRules(collected);

  const ruleset: DeepRuleset = {
    version: "R2",
    sourceId: id,
    createdAt: new Date().toISOString(),
    chunks: chunks.length,
    rules: merged.slice(0, 250),
  };

  const rulesPath = path.join(RULES_DIR, `${id}.deep.json`);
  await fs.writeFile(rulesPath, JSON.stringify(ruleset, null, 2), "utf-8");
  return { rulesPath, ruleset };
}

