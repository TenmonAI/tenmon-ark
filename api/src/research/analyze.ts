import { promises as fs } from "node:fs";
import path from "node:path";
import { RULES_DIR } from "./paths.js";

type Rule = {
  title: string;
  rule: string;
  evidence: string; // 本文からの原文引用（必須）
  note?: string;
};

export type Ruleset = {
  version: "R1";
  sourceId: string;
  createdAt: string;
  rules: Rule[];
  emptyReason?: string;
};

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

function stripCodeFences(s: string): string {
  const t = s.trim();
  if (!t.startsWith("```")) return t;

  const lines = t.split(/\r?\n/);
  // 先頭 ```json を捨てる
  lines.shift();
  // 末尾 ``` を捨てる
  if (lines.length && lines[lines.length - 1].trim().startsWith("```")) lines.pop();
  return lines.join("\n").trim();
}

function extractJsonObject(s: string): string | null {
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a >= 0 && b > a) return s.slice(a, b + 1);
  return null;
}

function parseJsonLoose(s: string): any {
  const cleaned = stripCodeFences(String(s ?? ""));
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = extractJsonObject(cleaned);
    if (m) return JSON.parse(m);
    throw new Error("LLM output is not valid JSON");
  }
}

function normalizeRule(r: any): Rule | null {
  if (!r) return null;
  const title = String(r.title ?? "").trim();
  const rule = String(r.rule ?? "").trim();
  const evidence = String(r.evidence ?? "").trim();
  const note = r.note ? String(r.note).trim() : undefined;

  if (!title || !rule || !evidence) return null;
  // evidenceは短めを推奨（暴れ防止）
  if (evidence.length > 800) return null;
  return { title, rule, evidence, note };
}

function normalizeForMatch(s: string): string {
  return s.replace(/\s+/g, "").replace(/　/g, "").normalize("NFKC");
}
function evidenceOk(hay: string, evidence: string): boolean {
  const H = normalizeForMatch(hay);
  const E = normalizeForMatch(evidence);
  if (!E) return false;
  return H.includes(E);
}

async function callOpenAIJSON(prompt: string): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o";
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS_RESEARCH ?? process.env.OPENAI_TIMEOUT_MS ?? 120000);

  if (!apiKey) throw new Error("OPENAI_API_KEY is missing");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const bodyBase: any = {
    model,
    temperature: 0.2,
    max_tokens: 1800,
    messages: [
      {
        role: "system",
        content:
          "あなたはTENMON-ARK研究解析エンジン。外部知識は禁止。入力本文だけから抽出。必ずJSONのみ。各ルールにevidence（本文の原文引用）必須。コードフェンス禁止。説明禁止。",
      },
      { role: "user", content: prompt },
    ],
  };

  async function request(withResponseFormat: boolean) {
    const body = withResponseFormat
      ? { ...bodyBase, response_format: { type: "json_object" } }
      : bodyBase;

    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const raw = await res.text();
    if (!res.ok) {
      throw new Error(`OpenAI HTTP ${res.status}: ${raw.slice(0, 400)}`);
    }

    const json = JSON.parse(raw);
    const content = String(json?.choices?.[0]?.message?.content ?? "{}");
    return parseJsonLoose(content);
  }

  try {
    // まずJSON固定で試す → だめなら通常で再試行
    try {
      return await request(true);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (msg.includes("response_format")) {
        return await request(false);
      }
      // JSON固定は効くがフェンス混入…等は parseJsonLoose で救えるのでここには来にくい
      throw e;
    }
  } finally {
    clearTimeout(timer);
  }
}

export async function analyzeText(args: { id: string; textPath: string }): Promise<{ rulesPath: string; ruleset: Ruleset }> {
  const { id, textPath } = args;
  await ensureDir(RULES_DIR);

  const text = await fs.readFile(textPath, "utf-8");

  // R1は「まず動く」優先で上限（R2のdeepで全文へ）
  const sliced = text.slice(0, 120_000);

  const prompt = [
    "以下の本文から、法則/アルゴリズム/禁則を抽出してください。",
    "出力は JSON のみ。",
    "evidence は本文からの原文引用（30〜200文字程度の連続した抜粋）。",
    "",
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
    sliced,
  ].join("\n");

  const out = await callOpenAIJSON(prompt);
  const rawRules = Array.isArray(out?.rules) ? out.rules : [];
  const normalized: Rule[] = rawRules
    .map(normalizeRule)
    .filter((r: Rule | null): r is Rule => r !== null);

  const valid = normalized.filter((r: Rule) => evidenceOk(sliced, r.evidence));

  const ruleset: Ruleset = {
    version: "R1",
    sourceId: id,
    createdAt: new Date().toISOString(),
    rules: valid.slice(0, 120),
    emptyReason: valid.length === 0 ? "本文に根拠のあるルールを抽出できませんでした。" : undefined,
  };

  const rulesPath = path.join(RULES_DIR, `${id}.json`);
  await fs.writeFile(rulesPath, JSON.stringify(ruleset, null, 2), "utf-8");
  return { rulesPath, ruleset };
}
