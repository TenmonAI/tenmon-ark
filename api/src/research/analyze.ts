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

function extractFirstJsonObject(s: string): any {
  // たまに ```json ``` が混ざるので、最初の { ... } を拾う
  const i = s.indexOf("{");
  const j = s.lastIndexOf("}");
  if (i < 0 || j < 0 || j <= i) throw new Error("no json object in response");
  const sliced = s.slice(i, j + 1);
  return JSON.parse(sliced);
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
      messages: [
        {
          role: "system",
          content:
            "あなたはTENMON-ARK研究解析エンジンです。外部知識・推測は禁止。入力本文だけが根拠です。出力はJSONのみ。各ルールに必ず evidence（本文の原文引用）を含めること。本文に無いことは rules に含めないこと。",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  const raw = await res.text();
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${raw.slice(0, 300)}`);

  const outer = JSON.parse(raw);
  const content = outer?.choices?.[0]?.message?.content ?? "{}";

  // strict parse
  return extractFirstJsonObject(content);
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
  const valid: Rule[] = rawRules
    .map(normalizeRule)
    .filter((r): r is Rule => !!r)
    .filter((r) => sliced.includes(r.evidence))
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

