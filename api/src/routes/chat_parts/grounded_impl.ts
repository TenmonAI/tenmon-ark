// grounded_impl.ts extracted from chat.ts
// grounded_impl.ts extracted from chat.ts (imports added)
import { qcTextV1 } from "../../kokuzo/qc.js";
import { emptyCorePlan } from "../../kanagi/core/corePlan.js";
import { applyTruthCore } from "../../kanagi/core/truthCore.js";
import { applyVerifier } from "../../kanagi/core/verifier.js";
import { kokuzoRecall, kokuzoRemember } from "../../kokuzo/recall.js";
import { getPageText } from "../../kokuzo/pages.js";
import { getCaps } from "../../kokuzo/capsQueue.js";
import { extractLawCandidates } from "../../kokuzo/lawCandidates.js";
import { extractSaikihoLawsFromText } from "../../kotodama/saikihoLawSet.js";
import { extractFourLayerTags } from "../../kotodama/fourLayerTags.js";
import { extractKojikiTags } from "../../kojiki/kojikiTags.js";
import { buildMythMapEdges } from "../../myth/mythMapEdges.js";
import { setMythMapEdges } from "../../kokuzo/mythMapMemory.js";
import { getDbPath } from "../../db/index.js";
import { DatabaseSync } from "node:sqlite";

function buildGroundedResponse(args: {
  doc: string;
  pdfPage: number;
  threadId: string;
  timestamp: string;
  wantsDetail: boolean;
}): any {
  const { doc, pdfPage, threadId, timestamp, wantsDetail } = args;
  
  // Phase24: Kokuzo pages ingestion - ページ本文を取得
  const pageText = getPageText(doc, pdfPage);
  const evidenceId = `KZPAGE:${doc}:P${pdfPage}`;

  // 3分岐（矛盾なし）: 1) 未投入 2) 非テキスト（caps補完 or 未登録） 3) 通常引用
  if (pageText == null) {
  // A1_CC80_GUARD_V1: block polluted pages (read-only; no DB mutation)
  try {
    const _doc = String((args as any)?.doc ?? "");
    const _p = Number((args as any)?.pdfPage ?? 0);
    const _isBad = (_doc === "言霊秘書.pdf") && ([5,58,169,182,229,341,344].includes(_p));
    if (_isBad) {
      return {
        response: "（資料準拠）このページは汚染検出（CC80）により表示を抑止しました。別のページを指定してください。",
        evidence: null,
        candidates: [],
        timestamp: (args as any)?.timestamp ?? new Date().toISOString(),
        threadId: String((args as any)?.threadId ?? ""),
        decisionFrame: { mode: "GROUNDED", intent: "grounded", llm: null, ku: { lawsUsed: [], evidenceIds: [], lawTrace: [], routeReason: "A1_CC80_BLOCK" } }
      } as any;
    }
  } catch {}
    const responseText = `（資料準拠）${doc} P${pdfPage} を指定として受け取りました。\n\n※注意: このページは未投入です（ingest_pdf_pages.sh で投入してください）。`;
    const result = buildGroundedResultBody(doc, pdfPage, threadId, timestamp, wantsDetail, responseText, null, evidenceId);
    if (wantsDetail) result.detail = `#詳細\n- doc: ${doc}\n- pdfPage: ${pdfPage}\n- 状態: 未投入（ingest_pdf_pages.sh で投入してください）`;
    return result;
  }

  const isNonText = /\[NON_TEXT_PAGE_OR_OCR_FAILED\]/.test(String(pageText));
  if (isNonText) {
    const caps = getCaps(doc, pdfPage) || getCaps("KHS", pdfPage);
    if (caps && typeof caps.caption === "string" && caps.caption.trim()) {
      const responseText =
        `（補完キャプション: 天聞AI解析 / doc=${caps.doc} pdfPage=${caps.pdfPage}）\n` +
        String(caps.caption).trim() +
        (Array.isArray(caps.caption_alt) && caps.caption_alt.length ? `\n\n補助: ${caps.caption_alt.slice(0, 3).join(" / ")}` : "");
      const result = buildGroundedResultNonText(doc, pdfPage, threadId, timestamp, responseText, evidenceId);
      if (wantsDetail) result.detail = `#詳細\n- doc: ${doc}\n- pdfPage: ${pdfPage}\n- 状態: 非テキスト（補完キャプションで表示）`;
      return result;
    }
    const responseText = "このページは非テキスト扱いです（OCR/抽出不可）。caps が未登録のため補完できません。";
    const result = buildGroundedResultNonText(doc, pdfPage, threadId, timestamp, responseText, evidenceId);
    result.provisional = true;
    if (wantsDetail) result.detail = `#詳細\n- doc: ${doc}\n- pdfPage: ${pdfPage}\n- 状態: 非テキスト（caps未登録）`;
    return result;
  }

    // --- KAMU_0_MOJIBAKE_GUARD_V1 ---
  const head400 = String(pageText || "").slice(0, 400).trim();
  const qc = qcTextV1(head400);
  const responseText = qc.mojibakeLikely
    ? `（候補提示：正文は文字化けの可能性あり / doc=${doc} pdfPage=${pdfPage}）
QC: jpRate=${qc.jpRate.toFixed(3)} ctrlRate=${qc.ctrlRate.toFixed(3)}

このページは文字コード不整合の疑いがあるため、正文としては表示せず、復号処理（KAMU-GAKARI）対象として扱います。

次のどれで進めますか？
1) このページを復号して再保存（候補→承認）
2) 別ページ（doc/pdfPage）を指定
`
    : `（資料準拠）${doc} P${pdfPage} を指定として受け取りました。

【引用（先頭400文字）】
${head400}${String(pageText||"").length > 400 ? "..." : ""}`;
  // --- /KAMU_0_MOJIBAKE_GUARD_V1 ---
  const result: any = buildGroundedResultBody(doc, pdfPage, threadId, timestamp, wantsDetail, responseText, pageText, evidenceId);
  if (wantsDetail) result.detail = `#詳細\n- doc: ${doc}\n- pdfPage: ${pdfPage}\n- 状態: 本文取得済み`;
  return result;
}

function buildGroundedResultNonText(doc: string, pdfPage: number, threadId: string, timestamp: string, responseText: string, evidenceId: string): any {
  const p = emptyCorePlan(`GROUNDED ${doc} P${pdfPage}`);
  p.chainOrder = ["GROUNDED_SPECIFIED", "TRUTH_CORE", "VERIFIER"];
  p.warnings = p.warnings ?? [];
  p.evidenceIds = [evidenceId];
  p.warnings.push("NON_TEXT");
  applyTruthCore(p, { responseText: `GROUNDED ${doc} P${pdfPage}`, trace: undefined });
  applyVerifier(p);

      // KG2v1: attach KHS candidates from deterministic seeds (LLM-free)
      try {
        const __khsCandidates: any[] = [];
        const __src = String(responseText || "");
        const __grams = (__src.match(/[一-龯]{2}/g) || []).slice(0, 50);
        if (__grams.length > 0) {
          const __dbPath = getDbPath("kokuzo.sqlite");
          const __db = new DatabaseSync(__dbPath, { readOnly: true });
          const __seen = new Set<string>();
          const stmt = __db.prepare(
            "SELECT seedKey, lawKey, unitId, quoteHash, quoteLen, kanji2Top FROM khs_seeds_det_v1 WHERE kanji2Top LIKE %||?||% LIMIT 8"
          );
          for (const g of __grams) {
            if (__khsCandidates.length >= 8) break;
            const rows = stmt.all(g) as any[];
            for (const r of rows) {
              if (__khsCandidates.length >= 8) break;
              const k = String(r.seedKey || r.unitId || "");
              if (!k || __seen.has(k)) continue;
              __seen.add(k);
              __khsCandidates.push(r);
            }
          }
        }
        (p as any).khsCandidates = __khsCandidates;
      } catch (e) {
        try { (p as any).khsCandidates = []; } catch {}
      }
  const prev = kokuzoRecall(threadId);
  if (prev) {
    if (!p.chainOrder.includes("KOKUZO_RECALL")) p.chainOrder.push("KOKUZO_RECALL");
    p.warnings.push(`KOKUZO: recalled centerClaim=${prev.centerClaim.slice(0, 40)}`);
  }
  (p as any).lawCandidates = [];
  (p as any).kojikiTags = [];
  (p as any).mythMapEdges = buildMythMapEdges({ fourLayerTags: [], kojikiTags: [], evidenceIds: [evidenceId] });
  kokuzoRemember(threadId, p);
  return {
    response: responseText,
    evidence: { doc, pdfPage },
    provisional: true,
    detailPlan: p,
    timestamp,
    threadId,
    decisionFrame: { mode: "GROUNDED", intent: "chat", llm: null, ku: {} },
  };
}

function buildGroundedResultBody(
  doc: string,
  pdfPage: number,
  threadId: string,
  timestamp: string,
  wantsDetail: boolean,
  responseText: string,
  pageText: string | null,
  evidenceId: string
): any {
  const result: any = {
    response: responseText,
    evidence: { doc, pdfPage },
    provisional: false,
    detailPlan: (() => {
      const p = emptyCorePlan(`GROUNDED ${doc} P${pdfPage}`);
      p.chainOrder = ["GROUNDED_SPECIFIED", "TRUTH_CORE", "VERIFIER"];
      p.warnings = p.warnings ?? [];
      if (pageText) {
        p.evidenceIds = [evidenceId];
      } else {
        p.warnings.push("KOKUZO_PAGE_MISSING");
      }
      applyTruthCore(p, { responseText: `GROUNDED ${doc} P${pdfPage}`, trace: undefined });
      applyVerifier(p);

      // KG2v1: attach KHS candidates from deterministic seeds (LLM-free)
      try {
        const __khsCandidates: any[] = [];
        const __src = String(pageText || responseText || "");
        const __grams = (__src.match(/[一-龯]{2}/g) || []).slice(0, 50);
        if (__grams.length > 0) {
          const __dbPath = getDbPath("kokuzo.sqlite");
          const __db = new DatabaseSync(__dbPath, { readOnly: true });
          const __seen = new Set<string>();
          const stmt = __db.prepare(
            "SELECT seedKey, lawKey, unitId, quoteHash, quoteLen, kanji2Top FROM khs_seeds_det_v1 WHERE kanji2Top LIKE %||?||% LIMIT 8"
          );
          for (const g of __grams) {
            if (__khsCandidates.length >= 8) break;
            const rows = stmt.all(g) as any[];
            for (const r of rows) {
              if (__khsCandidates.length >= 8) break;
              const k = String(r.seedKey || r.unitId || "");
              if (!k || __seen.has(k)) continue;
              __seen.add(k);
              __khsCandidates.push(r);
            }
          }
        }
        (p as any).khsCandidates = __khsCandidates;
      } catch (e) {
        try { (p as any).khsCandidates = []; } catch {}
      }
      // Phase23: Kokuzo recall（構文記憶）
      const prev = kokuzoRecall(threadId);
      if (prev) {
        if (!p.chainOrder.includes("KOKUZO_RECALL")) p.chainOrder.push("KOKUZO_RECALL");
        p.warnings.push(`KOKUZO: recalled centerClaim=${prev.centerClaim.slice(0, 40)}`);
      }
      // Phase29: LawCandidates（法則候補抽出）
      if (pageText) {
        const lawCands = extractLawCandidates(pageText, { max: 8 });
        // Phase32: 四層タグを追加
        (p as any).lawCandidates = lawCands.map((cand: any) => ({
          ...cand,
          tags: extractFourLayerTags(cand.text),
        }));
        // Phase33: 古事記タグ抽出
        (p as any).kojikiTags = extractKojikiTags(pageText);
      } else {
        (p as any).lawCandidates = [];
      }
      // Phase34: 同型写像エッジ（fourLayerTags と kojikiTags の組み合わせ）
      const kojikiTags = (p as any).kojikiTags || [];
      const law0Tags = (((p as any).lawCandidates || [])[0] || {}).tags || [];
      (p as any).mythMapEdges = buildMythMapEdges({
        fourLayerTags: Array.isArray(law0Tags) ? law0Tags : [],
        kojikiTags: Array.isArray(kojikiTags) ? kojikiTags : [],
        evidenceIds: Array.isArray(p.evidenceIds) ? p.evidenceIds : [],
      });
      // Phase35: mythMapEdges を threadId に保存
      if ((p as any).mythMapEdges) {
        setMythMapEdges(threadId, (p as any).mythMapEdges);
      }
      // Phase30: SaikihoLawSet（水火の法則の内部構造、#詳細 のときのみ）
      if (wantsDetail) {
        if (pageText) {
          const laws = extractSaikihoLawsFromText(pageText, { max: 8 });
          // evidence に doc/pdfPage を設定
          laws.forEach((law: any) => {
            if (law.evidence) {
              law.evidence.doc = doc;
              law.evidence.pdfPage = pdfPage;
            }
            // Phase32: 四層タグを追加
            (law as any).tags = extractFourLayerTags(law.body);
          });
          (p as any).saikiho = {
            laws,
            evidenceIds: p.evidenceIds ?? [],
          };
        } else {
          (p as any).saikiho = {
            laws: [],
            evidenceIds: p.evidenceIds ?? [],
          };
        }
      }
      kokuzoRemember(threadId, p);
      return p;
    })(),
    timestamp,
    threadId,
    decisionFrame: { mode: "GROUNDED", intent: "chat", llm: null, ku: {} },
  };
  return result;
}

/**
 * PHASE 1: 天津金木思考回路をチャットAPIに接続
 * 
 * 固定応答を廃止し、天津金木思考回路を通して観測を返す
 */

export { buildGroundedResponse };
