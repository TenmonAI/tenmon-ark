import { promises as fs } from "node:fs";
import path from "node:path";
import { RULES_DIR } from "./paths.js";

type Rule = {
  title: string;
  rule: string;
  evidence: string; // 本文引用（必須）
  note?: string;
};

export type Ruleset = {
  version: "R1";
  sourceId: string;
  createdAt: string;
  truncated: boolean;
  rules: Rule[];
  blockedReason?: string;
};

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

function stripCodeFences(s: string): string {
  const t = s.trim();
  // ```json ... ```
  if (t.startsWith("```")) {
    return t.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
  }
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
      // ★ 可能なモデルなら JSON固定（これが最強）
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "あなたはTENMON-ARK研究解析エンジン。外部知識は禁止。入力本文だけから抽出。必ずJSONのみを返す。各ルールにevidence（本文の原文引用）必須。JSON以外（説明/箇条書き/コードフェンス）は禁止。",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  const raw = await res.text();
  const json = JSON.parse(raw);
  const content = (json?.choices?.[0]?.message?.content ?? "{}").toString();
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

function normalizeRule(x: any): Rule | null {
  const title = String(x?.title ?? "").trim();
  const rule = String(x?.rule ?? "").trim();
  const evidence = String(x?.evidence ?? "").trim();
  const note = x?.note != null ? String(x.note).trim() : undefined;
  if (!title || !rule || !evidence) return null;
  return { title, rule, evidence, note };
}

export async function analyzeText(args: {
  id: string;
  textPath: string;
}): Promise<{ rulesPath: string; ruleset: Ruleset }> {
  const { id, textPath } = args;
  await ensureDir(RULES_DIR);

  const text = await fs.readFile(textPath, "utf-8");

  // MVP: 先頭だけ（後で分割ジョブに拡張）
  const LIMIT = 120_000;
  const sliced = text.slice(0, LIMIT);
  const truncated = text.length > LIMIT;

  const prompt = [
    "以下の本文から、法則/アルゴリズム/禁則 を抽出してください。",
    "出力は JSON のみ。",
    "",
    "schema:",
    "{",
    '  "rules": [',
    "    {",
    '      "title": "短い名前",',
    '      "rule": "法則を一文で断定形に",',
    '      "evidence": "本文からの原文引用（そのまま抜粋）",',
    '      "note": "任意：適用条件/例外"',
    "    }",
    "  ]",
    "}",
    "",
    "本文:",
    sliced,
  ].join("\n");

  const out = await callOpenAIJSON(prompt);
  const rawRules = Array.isArray(out?.rules) ? out.rules : [];

  // ✅ “本文にあること”担保：evidenceが本文に含まれないルールは捨てる
  const normalized: (Rule | null)[] = rawRules.map(normalizeRule);
  const valid: Rule[] = normalized
    .filter((r): r is Rule => r !== null)
    .filter((r: Rule) => sliced.includes(r.evidence))
    .slice(0, 80);

  const ruleset: Ruleset = {
    version: "R1",
    sourceId: id,
    createdAt: new Date().toISOString(),
    truncated,
    rules: valid,
    blockedReason:
      valid.length === 0
        ? "本文中に根拠（evidence）が見つからないため、法則を確定できません。"
        : undefined,
  };

  const rulesPath = path.join(RULES_DIR, `${id}.json`);
  await fs.writeFile(rulesPath, JSON.stringify(ruleset, null, 2), "utf-8");

  return { rulesPath, ruleset };
}

