// /opt/tenmon-ark/api/src/kotodama/evidencePack.ts
import fs from "node:fs";
import readline from "node:readline";
import { createHash } from "node:crypto";

export type EvidencePack = {
  doc: string;
  pdfPage: number;
  laws: Array<{ id: string; title: string; quote: string }>;
  pageText: string; // ページ本文（先頭N文字、最大4000）
  summary: string; // ページの要約（短く）
  imageUrl?: string; // ページ画像のURL（P2: 追加）
  sha256?: string; // ページ本文のSHA256ハッシュ（Task B: 追加）
  isEstimated?: boolean; // 推定かどうか（P2: 追加）
  estimateExplain?: string; // 推定理由（Phase 3: 追加）
};

// Phase 3: 推定結果の型
export type EstimateResult = {
  doc: string;
  pdfPage: number;
  score: number;
  explain: string;
};

const MAX_TEXT_LENGTH = 4000; // ページ本文の最大文字数（Task B: 4000に変更）
const MAX_LAWS = 10; // 法則候補の最大数（Task B: 10に変更）

/**
 * Phase 3-A: メッセージから doc/pdfPage を推定（最小実装→改善余地あり）
 */
export async function estimateDocAndPage(message: string): Promise<EstimateResult | null> {
  // Phase 3: 簡易実装（正規表現＋帯域で推定）
  // 改善余地: law_candidates/text.jsonl のスコアリング（TODO）
  
  // 循環依存を避けるため、getAvailableDocs を直接呼ばずに固定リストを使用
  const availableDocs = ["言霊秘書.pdf", "カタカムナ言灵解.pdf", "いろは最終原稿.pdf"];
  if (availableDocs.length === 0) return null;

  // キーワード抽出（簡易版）
  const domainKeywords = [
    { pattern: /(言[霊靈灵]|言霊|言靈|言灵|ことだま)/, doc: "言霊秘書.pdf", pageHint: [6, 13, 26, 50] },
    { pattern: /(カタカムナ|天津金木|布斗麻邇|フトマニ)/, doc: "カタカムナ言灵解.pdf", pageHint: [1, 18, 26, 50] },
    { pattern: /(いろは|辞|テニヲハ|てにをは)/, doc: "いろは最終原稿.pdf", pageHint: [1, 13, 26, 50] },
  ];

  let best: EstimateResult | null = null;
  let bestScore = 0;

  for (const kw of domainKeywords) {
    if (kw.pattern.test(message)) {
      // マッチしたドキュメントを優先
      const score = 10;
      const estimatedPage = kw.pageHint[0] || 1; // 最初のヒントページを使用
      
      if (!best || score > bestScore) {
        best = {
          doc: kw.doc,
          pdfPage: estimatedPage,
          score,
          explain: `キーワード "${kw.pattern.source}" に一致、${kw.doc} P${estimatedPage} を推定`,
        };
        bestScore = score;
      }
    }
  }

  // マッチが無い場合は最初のdocの最初のページを推定
  if (!best) {
    const defaultDoc = availableDocs[0];
    best = {
      doc: defaultDoc,
      pdfPage: 1,
      score: 1,
      explain: `キーワード一致なし、${defaultDoc} P1 を簡易推定（Phase 3で改善予定: law_candidates/text.jsonl スコアリング）`,
    };
  }

  return best;
}

/**
 * Law Candidates を読み込む（fallback: text.jsonl から簡易候補を生成）
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
  
  // 1. law_candidates.jsonl がある場合は読み込む
  if (file && fs.existsSync(file)) {
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
          // lawId の形式チェック（KHS- / KTK- / IROHA- 形式）
          const lawId = r.id || "";
          const prefix = doc === "言霊秘書.pdf" ? "KHS-" : doc === "カタカムナ言灵解.pdf" ? "KTK-" : "IROHA-";
          const validId = lawId.startsWith(prefix) ? lawId : `${prefix}${pdfPage}-${out.length + 1}`;
          
          out.push({
            id: validId,
            title: r.title || "",
            quote: (r.quote || "").substring(0, 500), // 引用は500文字まで
          });
          if (out.length >= limit) break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (out.length > 0) {
      return out;
    }
  }

  // 2. fallback: text.jsonl から簡易候補を生成（ktk/iroha に law_candidates.jsonl が無い場合）
  const textFileMap: Record<string, string> = {
    "言霊秘書.pdf": "/opt/tenmon-corpus/db/khs_text.jsonl",
    "カタカムナ言灵解.pdf": "/opt/tenmon-corpus/db/ktk_text.jsonl",
    "いろは最終原稿.pdf": "/opt/tenmon-corpus/db/iroha_text.jsonl",
  };
  
  const textFile = textFileMap[doc];
  if (!textFile || !fs.existsSync(textFile)) return [];

  const out: Array<{ id: string; title: string; quote: string }> = [];
  const prefix = doc === "言霊秘書.pdf" ? "KHS-" : doc === "カタカムナ言灵解.pdf" ? "KTK-" : "IROHA-";
  
  const rl = readline.createInterface({
    input: fs.createReadStream(textFile, "utf-8"),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const t = String(line).trim();
    if (!t) continue;
    try {
      const r = JSON.parse(t) as any;
      if (r.doc === doc && r.pdfPage === pdfPage && r.text) {
        const text = String(r.text);
        // テキストを300文字ずつに分割して簡易候補を生成
        const chunks = text.match(/.{1,300}/g) || [];
        for (let i = 0; i < Math.min(chunks.length, limit); i++) {
          const chunk = chunks[i];
          if (chunk.trim().length > 50) { // 50文字以上のチャンクのみ
            // ID規格: KHS-P####-T### / KTK-P####-T### / IROHA-P####-T###
            const pageStr = String(pdfPage).padStart(4, "0");
            const trackStr = String(i + 1).padStart(3, "0");
            out.push({
              id: `${prefix}P${pageStr}-T${trackStr}`,
              title: `ページ本文抜粋 ${i + 1}`,
              quote: chunk.substring(0, 500),
            });
          }
        }
        break; // 該当ページを見つけたら終了
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
 * EvidencePack を構築（P2: imageUrl と推定フラグを追加、Phase 3: estimateExplain を追加）
 */
export async function buildEvidencePack(
  doc: string,
  pdfPage: number,
  isEstimated: boolean = false,
  estimateExplain?: string
): Promise<EvidencePack | null> {
  const [laws, pageText] = await Promise.all([
    loadLawCandidates(doc, pdfPage),
    loadPageText(doc, pdfPage),
  ]);

  if (laws.length === 0 && !pageText) {
    return null; // データが無い場合は null を返す
  }

  const summary = generateSummary(pageText, laws);

  // P2: imageUrl を構築（corpusLoader から取得）
  let imageUrl: string | undefined;
  try {
    const { getCorpusPage } = await import("./corpusLoader.js");
    const rec = getCorpusPage(doc, pdfPage);
    if (rec?.imagePath) {
      // imagePath を URL に変換
      // imagePath が絶対パスの場合はそのまま、相対パスの場合は /api/corpus/page-image エンドポイントを使用
      if (rec.imagePath.startsWith("/")) {
        imageUrl = `/api/corpus/page-image?doc=${encodeURIComponent(doc)}&pdfPage=${pdfPage}`;
      } else {
        imageUrl = rec.imagePath;
      }
    }
  } catch (e) {
    // corpusLoader の取得に失敗した場合は imageUrl なし
    console.warn(`[EVIDENCE-PACK] Failed to load imageUrl for ${doc} P${pdfPage}:`, e);
  }

  // Task B: sha256 を計算（ページ本文のハッシュ）
  const truncatedPageText = pageText.substring(0, MAX_TEXT_LENGTH);
  const sha256 = createHash("sha256").update(truncatedPageText, "utf-8").digest("hex");

  return {
    doc,
    pdfPage,
    laws: laws.slice(0, MAX_LAWS), // Task B: 最大10件に制限
    pageText: truncatedPageText, // Task B: 最大4000文字
    summary,
    imageUrl,
    sha256, // Task B: SHA256ハッシュを追加
    isEstimated, // P2: 推定フラグ
    estimateExplain, // Phase 3: 推定理由
  };
}

