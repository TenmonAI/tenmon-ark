// /opt/tenmon-ark/api/src/kotodama/evidencePack.ts
import fs from "node:fs";
import readline from "node:readline";

export type EvidencePack = {
  doc: string;
  pdfPage: number;
  laws: Array<{ id: string; title: string; quote: string }>;
  pageText: string; // ページ本文（先頭N文字）
  summary: string; // ページの要約（短く）
};

const MAX_TEXT_LENGTH = 2000; // ページ本文の最大文字数
const MAX_LAWS = 12; // 法則候補の最大数

/**
 * Law Candidates を読み込む
 */
async function loadLawCandidates(
  doc: string,
  pdfPage: number,
  limit = MAX_LAWS
): Promise<Array<{ id: string; title: string; quote: string }>> {
  const fileMap: Record<string, string> = {
    "言霊秘書.pdf": "/opt/tenmon-corpus/db/khs_law_candidates.jsonl",
    "カタカムナ言灵解.pdf": "/opt/tenmon-corpus/db/ktk_law_candidates.jsonl",
    "いろは最終原稿.pdf": "/opt/tenmon-corpus/db/iroha_law_candidates.jsonl",
  };

  const file = fileMap[doc];
  if (!file || !fs.existsSync(file)) return [];

  const out: Array<{ id: string; title: string; quote: string }> = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(file, "utf-8"),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const t = String(line).trim();
    if (!t) continue;
    try {
      const r = JSON.parse(t) as any;
      if (r.doc === doc && r.pdfPage === pdfPage) {
        out.push({
          id: r.id || "",
          title: r.title || "",
          quote: (r.quote || "").substring(0, 500), // 引用は500文字まで
        });
        if (out.length >= limit) break;
      }
    } catch (e) {
      continue;
    }
  }

  return out;
}

/**
 * ページ本文を読み込む
 */
async function loadPageText(doc: string, pdfPage: number): Promise<string> {
  const fileMap: Record<string, string> = {
    "言霊秘書.pdf": "/opt/tenmon-corpus/db/khs_text.jsonl",
    "カタカムナ言灵解.pdf": "/opt/tenmon-corpus/db/ktk_text.jsonl",
    "いろは最終原稿.pdf": "/opt/tenmon-corpus/db/iroha_text.jsonl",
  };

  const file = fileMap[doc];
  if (!file || !fs.existsSync(file)) return "";

  const rl = readline.createInterface({
    input: fs.createReadStream(file, "utf-8"),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const t = String(line).trim();
    if (!t) continue;
    try {
      const r = JSON.parse(t) as any;
      if (r.doc === doc && r.pdfPage === pdfPage && r.text) {
        return String(r.text).substring(0, MAX_TEXT_LENGTH);
      }
    } catch (e) {
      continue;
    }
  }

  return "";
}

/**
 * ページの要約を生成（簡易版）
 */
function generateSummary(pageText: string, laws: Array<{ id: string; title: string; quote: string }>): string {
  if (!pageText && laws.length === 0) return "ページ情報なし";
  if (laws.length > 0) {
    const topLaws = laws.slice(0, 3).map((l) => l.title.replace(/^核心語:\s*/, "")).join("、");
    return `${topLaws}に関する記述があります。`;
  }
  if (pageText) {
    return pageText.substring(0, 100) + "...";
  }
  return "ページ情報なし";
}

/**
 * EvidencePack を構築
 */
export async function buildEvidencePack(
  doc: string,
  pdfPage: number
): Promise<EvidencePack | null> {
  const [laws, pageText] = await Promise.all([
    loadLawCandidates(doc, pdfPage),
    loadPageText(doc, pdfPage),
  ]);

  if (laws.length === 0 && !pageText) {
    return null; // データが無い場合は null を返す
  }

  const summary = generateSummary(pageText, laws);

  return {
    doc,
    pdfPage,
    laws,
    pageText: pageText.substring(0, MAX_TEXT_LENGTH),
    summary,
  };
}

