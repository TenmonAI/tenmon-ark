// src/kanagi/kanagiCore.ts
// HYBRID(domain) の「LLM禁止」を構造で固定するための CorePlan

import { runTruthCore } from "./truthCore.js";
import { filterValidClaims } from "./verifier.js";

export type DocKey = "khs" | "ktk" | "iroha" | "unknown";

export type EvidenceLaw = {
  id: string;      // KHS-P0006-T001 / KTK-P0031-T002 / IROHA-P0012-T001
  title: string;
  quote: string;   // 本文からの抜粋（改変禁止）
};

export type EvidencePack = {
  doc: string;
  docKey: DocKey;
  pdfPage: number;
  pageText: string;
  laws: EvidenceLaw[];   // candidates が無い場合も fallback で作る
  isEstimated: boolean;
};

export type TaiYo = {
  tai: { text: string; lawIds: string[] };
  yo:  { text: string; lawIds: string[] };
};

export type CoreClaim = {
  text: string;           // 「根拠で言える最小主張」
  evidenceIds: string[];  // 根拠ID（必須）
};

export type CorePlan = {
  mode: "HYBRID";
  intent: "domain";
  question: string;

  evidence: EvidencePack;

  taiyo: TaiYo;
  usedLawIds: string[];

  // Truth-Core（躰/用＋空仮中）
  thesis: string;         // 正中命題（本質命題）
  tai: string;           // 躰（骨格）
  yo: string;            // 用（はたらき）
  kokakechuFlags: string[]; // 空仮中検知：一般テンプレ/根拠なし断定/循環説明など
  claims: CoreClaim[];   // 主張リスト（各主張はevidenceIds必須）

  // 表/裏（LLM禁止）
  responseDraft: string;
  detailDraft: string;
};

function pad4(n: number) { return String(n).padStart(4, "0"); }

export function inferDocKey(doc: string): DocKey {
  if (doc.includes("言霊秘書")) return "khs";
  if (doc.includes("カタカムナ")) return "ktk";
  if (doc.includes("いろは")) return "iroha";
  return "unknown";
}

export function normalizeSpiritNotation(s: string) {
  // 表だけ統一（引用は改変しない方針なので、引用には使わない）
  return s.replace(/言霊/g, "言灵").replace(/霊/g, "灵");
}

export function makeFallbackLawsFromText(args: {
  docKey: DocKey;
  pdfPage: number;
  pageText: string;
  message: string;
  limit?: number;
}): EvidenceLaw[] {
  const limit = args.limit ?? 6;
  const p = pad4(args.pdfPage);
  const prefix =
    args.docKey === "khs" ? "KHS" :
    args.docKey === "ktk" ? "KTK" :
    args.docKey === "iroha" ? "IROHA" : "DOC";

  const keys = [
    "言灵","言霊","ことだま","真言","躰","体","用","正中","水火","生成","辞","テニヲハ","空仮中","メシア","天津金木","布斗麻邇"
  ].filter(k => args.message.includes(k));

  const uniq = Array.from(new Set(keys));
  const laws: EvidenceLaw[] = [];
  const t = args.pageText;

  for (const k of uniq) {
    const idx = t.indexOf(k);
    if (idx < 0) continue;
    const start = Math.max(0, idx - 90);
    const end = Math.min(t.length, idx + 190);
    const quote = t.slice(start, end).replace(/\s+/g, " ").trim();
    if (!quote) continue;
    laws.push({
      id: `${prefix}-P${p}-T${String(laws.length + 1).padStart(3, "0")}`,
      title: `fallback: ${k}`,
      quote,
    });
    if (laws.length >= limit) break;
  }

  // 何も引けなければ冒頭
  if (laws.length === 0) {
    const quote = t.slice(0, 220).replace(/\s+/g, " ").trim();
    if (quote) {
      laws.push({
        id: `${prefix}-P${p}-T001`,
        title: "fallback: head",
        quote,
      });
    }
  }

  return laws;
}

function pickTaiYo(laws: EvidenceLaw[]): TaiYo {
  // 超簡易：躰っぽいもの→用っぽいものを拾う（後で高度化）
  const tai = laws.find(l => /躰|体|正中|生成|法則/.test(l.title + l.quote)) ?? laws[0];
  const yo  = laws.find(l => /用|働|はたらき|運用|水|流/.test(l.title + l.quote)) ?? laws[1] ?? laws[0];

  return {
    tai: { text: tai?.quote ? tai.quote.slice(0, 160) : "", lawIds: tai?.id ? [tai.id] : [] },
    yo:  { text: yo?.quote ? yo.quote.slice(0, 160) : "",  lawIds: yo?.id ? [yo.id] : [] },
  };
}

export function buildCoreAnswerPlanFromEvidence(message: string, e: EvidencePack): CorePlan {
  const laws = (e.laws?.length ? e.laws : makeFallbackLawsFromText({
    docKey: e.docKey, pdfPage: e.pdfPage, pageText: e.pageText, message, limit: 6
  }));

  const taiyo = pickTaiYo(laws);
  const usedLawIds = Array.from(new Set([...taiyo.tai.lawIds, ...taiyo.yo.lawIds])).filter(Boolean);

  // 初期claimsを生成（躰/用から）
  const initialClaims: CoreClaim[] = [];
  if (taiyo.tai.lawIds.length > 0) {
    initialClaims.push({
      text: `躰（骨格）：${taiyo.tai.text.slice(0, 100)}`,
      evidenceIds: taiyo.tai.lawIds,
    });
  }
  if (taiyo.yo.lawIds.length > 0) {
    initialClaims.push({
      text: `用（はたらき）：${taiyo.yo.text.slice(0, 100)}`,
      evidenceIds: taiyo.yo.lawIds,
    });
  }

  // 初期responseDraftを生成
  const initialResponseDraft = normalizeSpiritNotation([
    "（資料準拠）",
    "まず「躰（骨格）」と「用（はたらき）」に分けて定義を立てます。",
    `躰：${taiyo.tai.text || "（抽出不足）"}`,
    `用：${taiyo.yo.text || "（抽出不足）"}`,
  ].join("\n"));

  // Truth-Coreを実行（躰/用＋空仮中）
  const truthResult = runTruthCore(message, taiyo, initialResponseDraft, initialClaims, { ...e, laws });

  // Verifierでclaimsを検証
  const validClaims = filterValidClaims(initialClaims, { ...e, laws });

  const responseDraft = normalizeSpiritNotation([
    "（資料準拠）",
    truthResult.thesis ? `正中命題：${truthResult.thesis}` : "",
    "まず「躰（骨格）」と「用（はたらき）」に分けて定義を立てます。",
    `躰：${truthResult.tai || taiyo.tai.text || "（抽出不足）"}`,
    `用：${truthResult.yo || taiyo.yo.text || "（抽出不足）"}`,
    truthResult.kokakechuFlags.length > 0 ? `\n注意：${truthResult.kokakechuFlags.join("、")}が検知されました。` : "",
  ].filter(Boolean).join("\n"));

  const p = pad4(e.pdfPage);
  const detailLines: string[] = [];
  detailLines.push("#詳細");
  detailLines.push(`- doc: ${e.doc}`);
  detailLines.push(`- pdfPage: ${e.pdfPage}`);
  detailLines.push(`- idPrefix: ${(e.docKey === "khs" ? "KHS" : e.docKey === "ktk" ? "KTK" : e.docKey === "iroha" ? "IROHA" : "DOC")}-P${p}`);
  detailLines.push(`- isEstimated: ${e.isEstimated}`);
  if (truthResult.thesis) {
    detailLines.push(`- 正中命題：${truthResult.thesis}`);
  }
  if (truthResult.kokakechuFlags.length > 0) {
    detailLines.push(`- 空仮中検知：${truthResult.kokakechuFlags.join("、")}`);
  }
  detailLines.push("- 根拠（抜粋）:");
  const pick = usedLawIds.length ? laws.filter(l => usedLawIds.includes(l.id)) : laws.slice(0, 3);
  for (const l of pick) {
    detailLines.push(`  - ${l.id} ${l.title}`);
    detailLines.push(`    引用: ${l.quote}`);
  }

  return {
    mode: "HYBRID",
    intent: "domain",
    question: message,
    evidence: { ...e, laws },
    taiyo,
    usedLawIds,
    thesis: truthResult.thesis,
    tai: truthResult.tai,
    yo: truthResult.yo,
    kokakechuFlags: truthResult.kokakechuFlags,
    claims: validClaims,
    responseDraft,
    detailDraft: detailLines.join("\n"),
  };
}

export function stripForbiddenFromResponse(text: string): string {
  // response から #詳細 / lawId / pdfPage / 引用 を消す（万一混入した場合の保険）
  return text.split("\n").filter(line =>
    !/^#詳細/.test(line) &&
    !/pdfPage\s*[:=]/i.test(line) &&
    !/lawId\s*[:=]/i.test(line) &&
    !/^[-*]\s*引用\s*:/.test(line) &&
    !/^-\s*pdfPage\s*:/.test(line) &&
    !/^-\s*lawId\s*:/.test(line) &&
    !/^-\s*引用\s*:/.test(line)
  ).join("\n").trim();
}
