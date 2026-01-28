// Evidence 検索関連のロジック（chat.ts から移動、挙動変更なし）
import fs from "node:fs";
import readline from "node:readline";
import { getCorpusPage } from "./corpusLoader.js";
import { retrieveAutoEvidence, type AutoEvidenceHit } from "./retrieveAutoEvidence.js";

// LawCandidates（ページ候補）の型定義
export type LawCandidate = {
  id: string;
  doc: string;
  pdfPage: number;
  title: string;
  quote: string;
  rule: string;
  confidence: number;
};

/**
 * 指定された doc/pdfPage の候補を取得する
 */
export async function getPageCandidates(doc: string, pdfPage: number, limit = 12): Promise<LawCandidate[]> {
  const file =
    doc === "言霊秘書.pdf"
      ? "/opt/tenmon-corpus/db/khs_law_candidates.jsonl"
      : doc === "カタカムナ言灵解.pdf"
      ? "/opt/tenmon-corpus/db/ktk_law_candidates.jsonl"
      : doc === "いろは最終原稿.pdf"
      ? "/opt/tenmon-corpus/db/iroha_law_candidates.jsonl"
      : "";

  const out: LawCandidate[] = [];
  if (!file || !fs.existsSync(file)) return out;

  const rl = readline.createInterface({ input: fs.createReadStream(file, "utf-8"), crlfDelay: Infinity });
  for await (const line of rl) {
    const t = String(line).trim();
    if (!t) continue;
    try {
      const r = JSON.parse(t) as LawCandidate;
      if (r.doc === doc && r.pdfPage === pdfPage) {
        out.push(r);
        if (out.length >= limit) break;
      }
    } catch (e) {
      continue;
    }
  }
  return out;
}

/**
 * 自動検索を実行する（retrieveAutoEvidence のラッパー）
 */
export function retrieveAutoEvidenceWrapper(message: string, topK = 3): ReturnType<typeof retrieveAutoEvidence> {
  return retrieveAutoEvidence(message, topK);
}

/**
 * コーパスページを取得する（getCorpusPage のラッパー）
 */
export function getCorpusPageWrapper(doc: string, pdfPage: number): ReturnType<typeof getCorpusPage> {
  return getCorpusPage(doc, pdfPage);
}

// AutoEvidenceHit を再エクスポート
export type { AutoEvidenceHit } from "./retrieveAutoEvidence.js";

