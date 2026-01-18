// src/kotodama/retrieveAutoEvidence.ts
import fs from "node:fs";
import path from "node:path";
import { getPageText } from "./textLoader.js";
import { RANKING_POLICY, isKHSDefinitionZone } from "./rankingPolicy.js";

export type AutoEvidenceHit = {
  doc: string;
  pdfPage: number;
  score: number;
  quoteSnippets: string[];
};

export type AutoEvidenceResult = {
  hits: AutoEvidenceHit[];
  confidence: number; // 0..1
};

const CORPUS_DIR = process.env.TENMON_CORPUS_DIR ?? "/opt/tenmon-corpus/db";

const DOCS = [
  { doc: "言霊秘書.pdf", textFile: "khs_text.jsonl", lawFile: "khs_law_candidates.jsonl", weight: RANKING_POLICY.DOC_WEIGHTS.KHS },
  { doc: "カタカムナ言灵解.pdf", textFile: "ktk_text.jsonl", lawFile: "ktk_law_candidates.jsonl", weight: RANKING_POLICY.DOC_WEIGHTS.KTK },
  { doc: "いろは最終原稿.pdf", textFile: "iroha_text.jsonl", lawFile: "iroha_law_candidates.jsonl", weight: RANKING_POLICY.DOC_WEIGHTS.IROHA },
] as const;

// 文字列正規化（簡易版）
function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}

// コア用語リスト
const CORE_TERMS = [
  "躰","体","用",
  "正中","水火","生成","辞","テニヲハ",
  "空仮中","メシア",
  "カタカムナ","天津金木","布斗麻邇","真言","秘密荘厳心",
];

function keywordsFrom(message: string): string[] {
  const m = norm(message);
  const set = new Set<string>();

  // 言霊系：表記揺れを必ず展開
  const hasKotodama =
    m.includes("言灵") || m.includes("言霊") || m.includes("言靈") ||
    m.includes("ことだま") || m.includes("コトダマ");

  if (hasKotodama) {
    ["言霊", "言靈", "ことだま", "コトダマ"].forEach(x => set.add(x));
  }

  // 既存の重要語も拾う（ただし言灵単体に偏らない）
  for (const k of CORE_TERMS) {
    if (m.includes(norm(k))) set.add(k);
  }

  // 何も無ければ言霊系を最低セットとして入れる
  if (set.size === 0) {
    ["言霊", "言靈", "ことだま", "コトダマ"].forEach(x => set.add(x));
  }

  return Array.from(set);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function snippetAround(text: string, kw: string, width=200): string | null {
  const idx = text.indexOf(kw);
  if (idx < 0) return null;
  const start = Math.max(0, idx - Math.floor(width / 2));
  const end = Math.min(text.length, start + width);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function scoreText(text: string, kws: string[], weight: number = 1.0): { score: number; snippets: string[] } {
  let score = 0;
  const snippets: string[] = [];

  for (const kw of kws) {
    const escapedKw = escapeRegExp(kw);
    const count = (text.match(new RegExp(escapedKw, "g")) ?? []).length;
    if (count > 0) {
      score += count * 10;
      const sn = snippetAround(text, kw, 200);
      if (sn) snippets.push(sn);
    }
  }

  // 軽い長さペナルティ
  score -= Math.max(0, Math.floor(text.length / 2000));

  // weight を適用
  const weightedScore = score * weight;

  return { score: weightedScore, snippets: snippets.slice(0, 3) };
}

// law_candidates.jsonlから検索（Phase3.5：優先）
function scoreLawCandidate(
  candidate: { title: string; quote: string },
  kws: string[],
  message: string,
  weight: number = 1.0
): { score: number; snippets: string[] } {
  let score = 0;
  const snippets: string[] = [];

  const quoteText = candidate.quote || "";
  const titleText = candidate.title || "";

  // kw一致（title内）×20（RANKING_POLICY参照）
  const titleLower = titleText.toLowerCase();
  for (const kw of kws) {
    if (titleLower.includes(kw.toLowerCase())) {
      score += RANKING_POLICY.LAW_CANDIDATES.TITLE_MATCH;
    }
  }

  // kw一致（quote内）×10（RANKING_POLICY参照）
  for (const kw of kws) {
    const escapedKw = escapeRegExp(kw);
    const count = (quoteText.match(new RegExp(escapedKw, "gi")) ?? []).length;
    if (count > 0) {
      score += count * RANKING_POLICY.LAW_CANDIDATES.QUOTE_MATCH;
      const sn = snippetAround(quoteText, kw, 200);
      if (sn) snippets.push(sn);
    }
  }

  // query全体がquoteに含まれる場合 +20（RANKING_POLICY参照）
  const messageNorm = norm(message);
  const quoteNorm = norm(quoteText);
  if (quoteNorm.includes(messageNorm) && messageNorm.length > 5) {
    score += RANKING_POLICY.LAW_CANDIDATES.QUERY_CONTAINED;
  }

  // weight を適用
  const weightedScore = score * weight;

  return { score: weightedScore, snippets: snippets.slice(0, 3) };
}

export function retrieveAutoEvidence(message: string, topK=3): AutoEvidenceResult {
  let kws = keywordsFrom(message);
  const hits: AutoEvidenceHit[] = [];
  const hitMap = new Map<string, AutoEvidenceHit>(); // doc:pdfPageをキーに重複を統合

  // 「いろは」系クエリ判定（最強・安全：raw + norm の二重チェック）
  const raw = message;
  const m = norm(message);
  const hasIroha =
    raw.includes("いろは") || raw.includes("イロハ") || raw.includes("伊呂波") ||
    m.includes("いろは") || m.includes("イロハ") || m.includes("伊呂波") ||
    m.includes("いろは言灵解");

  // hasIroha が true のとき、kws にいろは系の検索語を追加（IROHA側のベーススコアを上げる）
  if (hasIroha) {
    const irohaKeywords = ["いろは", "イロハ", "伊呂波", "いろは言灵解"];
    kws = [...kws, ...irohaKeywords];
  }

  // 言霊系質問かどうかを判定（keywordsFromの戻りに言霊系が含まれるかチェック）
  const hasKotodama = kws.some(k => 
    ["言霊", "言靈", "言灵", "ことだま", "コトダマ"].includes(k)
  );

  // 「カタカムナ」系クエリ判定
  const hasKatakanana = norm(message).includes("カタカムナ") ||
                        norm(message).includes("かたかむな") ||
                        norm(message).includes("カタカムナ言灵解");

  if (process.env.DEBUG_AUTO_EVIDENCE === "1") {
    console.log("[AE-DEBUG] hasIroha=", hasIroha, "hasKatakanana=", hasKatakanana, "hasKotodama=", hasKotodama);
    console.log("[AE-DEBUG] kws(final)=", kws);
  }

  // Phase3.5: law_candidates.jsonlからの検索（最優先）
  for (const d of DOCS) {
    const lawFilePath = path.join(CORPUS_DIR, d.lawFile);
    if (fs.existsSync(lawFilePath)) {
      const lawLines = fs.readFileSync(lawFilePath, "utf-8").split("\n").filter(Boolean);
      for (const line of lawLines) {
        let candidate: any;
        try { candidate = JSON.parse(line); } catch { continue; }

        // スキーマチェック（confidence/doc/id/pdfPage/quote/rule/title）
        if (!candidate.doc || !candidate.pdfPage || !Number.isFinite(candidate.pdfPage)) continue;
        if (candidate.doc !== d.doc) continue;

        let { score: lawScore, snippets: lawSnippets } = scoreLawCandidate(
          { title: candidate.title || "", quote: candidate.quote || "" },
          kws,
          message,
          d.weight ?? 1.0
        );

        // 「いろは」系クエリでIROHAへの寄せ補正（RANKING_POLICY参照）
        if (hasIroha && d.doc === "いろは最終原稿.pdf") {
          lawScore += RANKING_POLICY.IROHA_BOOST;
        }

        // 「カタカムナ」系クエリでKTKへの寄せ補正（RANKING_POLICY参照）
        if (hasKatakanana && d.doc === "カタカムナ言灵解.pdf") {
          lawScore += RANKING_POLICY.KTK_BOOST;
        }

        // P6優先補正（言霊系質問のとき、言霊秘書.pdfの定義帯域にボーナス）
        // hasIroha の場合は無効化（いろは質問で言霊秘書の定義帯域を押し上げるのは不自然なので抑制）
        if (hasKotodama && !hasIroha && d.doc === "言霊秘書.pdf") {
          const zone = isKHSDefinitionZone(candidate.pdfPage);
          if (zone.isPrimary) {
            lawScore += RANKING_POLICY.KHS_DEFINITION_ZONE_BONUS.PRIMARY.bonus;
          } else if (zone.isSecondary) {
            lawScore += RANKING_POLICY.KHS_DEFINITION_ZONE_BONUS.SECONDARY.bonus;
          }
        }

        if (lawScore <= 0) continue;

        const key = `${d.doc}:${candidate.pdfPage}`;
        const existing = hitMap.get(key);
        if (existing) {
          // 既存のhitと統合（スコアの高い方を採用、snippetsを統合）
          if (lawScore > existing.score) {
            existing.score = lawScore;
            existing.quoteSnippets = lawSnippets;
          } else {
            existing.quoteSnippets = [...new Set([...existing.quoteSnippets, ...lawSnippets])].slice(0, 3);
          }
        } else {
          hitMap.set(key, {
            doc: d.doc,
            pdfPage: candidate.pdfPage,
            score: lawScore,
            quoteSnippets: lawSnippets,
          });
        }
      }
    }
  }

  // hitMapから配列に変換
  hits.push(...Array.from(hitMap.values()));

  // 決定論ソート（score desc → pdfPage asc → doc asc）
  hits.sort((a, b) =>
    (b.score - a.score) ||
    (a.pdfPage - b.pdfPage) ||   // ★ 同点は小さいページを優先（P6が勝つ）
    a.doc.localeCompare(b.doc)
  );

  // hits が topK 未満の場合のみ textLoader 検索を fallback で補助
  if (hits.length < topK) {
    for (const d of DOCS) {
      const filePath = path.join(CORPUS_DIR, d.textFile);
      if (!fs.existsSync(filePath)) continue;

      const lines = fs.readFileSync(filePath, "utf-8").split("\n").filter(Boolean);
      for (const line of lines) {
        let j: any;
        try { j = JSON.parse(line); } catch { continue; }

        // pdfPage を取得（pdfPage, page, pageNumber, p の揺れを許容）
        const pdfPage = Number(j.pdfPage ?? j.page ?? j.pageNumber ?? j.p ?? NaN);
        if (!Number.isFinite(pdfPage)) continue;

        // doc はファイル側の doc を固定
        const doc = d.doc;

        const key = `${doc}:${pdfPage}`;
        // 既に law_candidates で見つかっている場合は追加しない（law_candidates優先）
        if (hitMap.has(key)) continue;

        // 本文は必ず getPageText のみを使用（jsonlのtextは使わない）
        const fromCache = getPageText(doc, pdfPage);
        const text = String(fromCache ?? "").trim();
        if (!text) continue;

        // scoreText に weight を渡してスコアリング
        let { score, snippets } = scoreText(text, kws, d.weight ?? 1.0);

        // 「いろは」系クエリでIROHAへの寄せ補正（fallbackでも適用、RANKING_POLICY参照）
        if (hasIroha && doc === "いろは最終原稿.pdf") {
          score += RANKING_POLICY.IROHA_BOOST;
        }

        // 「カタカムナ」系クエリでKTKへの寄せ補正（fallbackでも適用、RANKING_POLICY参照）
        if (hasKatakanana && doc === "カタカムナ言灵解.pdf") {
          score += RANKING_POLICY.KTK_BOOST;
        }

        // P6優先補正（言霊系質問のとき、言霊秘書.pdfの定義帯域にボーナス）
        // hasIroha の場合は無効化（いろは質問で言霊秘書の定義帯域を押し上げるのは不自然なので抑制）
        if (hasKotodama && !hasIroha && doc === "言霊秘書.pdf") {
          const zone = isKHSDefinitionZone(pdfPage);
          if (zone.isPrimary) {
            score += RANKING_POLICY.KHS_DEFINITION_ZONE_BONUS.PRIMARY.bonus;
          } else if (zone.isSecondary) {
            score += RANKING_POLICY.KHS_DEFINITION_ZONE_BONUS.SECONDARY.bonus;
          }
        }

        if (score <= 0) continue;

        hitMap.set(key, { doc, pdfPage, score, quoteSnippets: snippets });
        hits.push({ doc, pdfPage, score, quoteSnippets: snippets });

        // topK に達したら終了
        if (hits.length >= topK) break;
      }
      if (hits.length >= topK) break;
    }

    // fallback で追加した分も再ソート
    hits.sort((a, b) =>
      (b.score - a.score) ||
      (a.pdfPage - b.pdfPage) ||
      a.doc.localeCompare(b.doc)
    );
  }

  const top = hits.slice(0, topK);
  const topScore = top[0]?.score ?? 0;
  const secondScore = top[1]?.score ?? 0;
  const confidence = topScore > 0 ? topScore / (topScore + secondScore + 1) : 0;

  // DEBUGログにtop3のdoc/pdfPage/scoreを出す
  if (process.env.DEBUG_AUTO_EVIDENCE === "1") {
    console.log("[AE-DEBUG] top3:");
    top.slice(0, 3).forEach((h, i) => {
      console.log(`  ${i + 1}. doc=${h.doc} pdfPage=${h.pdfPage} score=${h.score.toFixed(1)}`);
    });
  }

  return { hits: top, confidence };
}
