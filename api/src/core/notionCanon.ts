import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type NotionCanonPage = {
  pageId: string;
  title: string;
  role: string;
  usefulFor: string[];
  bindTargets: string[];
};

export type NotionCanonFile = {
  schema: string;
  updated_at: string;
  pages: NotionCanonPage[];
};

/** Notion 側に保存済みの提案書タイトル（継承記録帳・VPS→学習の手順） */
export const TENMON_NOTION_VPS_BOOK_ANALYSIS_PROPOSAL_DOC_TITLE_V1 =
  "TENMON-ARK VPS解析結果を学習へ反映する仕組み 提案書" as const;

/** book settlement への投影先（Notion DB / ページ設計と 1:1 でなくてよい論理名） */
export const NOTION_VPS_BOOK_ANALYSIS_SETTLEMENT_TARGETS_V1 = [
  "book_ledger",
  "analysis_log",
  "law_card",
  "comparison_card",
  "uncertainty_issue_card",
] as const;

/** Notion 定着 → ARK 会話再利用層（judge 済みのみ・原文非返却） */
export const ARK_BOOK_CANON_LEDGER_STRUCTURES_V1 = [
  "book_canon_ledger",
  "evidence_binder",
  "lawgraph_candidate_store",
  "terminology_memory",
  "thread_reentry_memory",
  "uncertainty_registry",
] as const;

export type TenmonVpsBookAnalysisNotionReflectionInputV1 = {
  book_id: string;
  source_class: string;
  center_terms: readonly string[];
  repeated_terms: readonly string[];
  opposition_pairs: readonly { left: string; right: string }[];
  tradition_evidence: readonly string[];
  tenmon_mapping: readonly string[];
  uncertainty: readonly string[];
  provisional_verdict: string;
  nas_locator: {
    materialId: string;
    locator_ref: string;
    nas_relative_path: string;
    canonical_root: string;
  } | null;
};

export type TenmonVpsBookAnalysisNotionReflectionPayloadV1 = {
  schema: "TENMON_VPS_TO_NOTION_BOOK_ANALYSIS_REFLECTION_PAYLOAD_V1";
  card: "TENMON_VPS_TO_NOTION_BOOK_ANALYSIS_REFLECTION_CURSOR_AUTO_V1";
  notion_inheritance_ledger_doc_title: typeof TENMON_NOTION_VPS_BOOK_ANALYSIS_PROPOSAL_DOC_TITLE_V1;
  settlement_targets: readonly string[];
  /** VPS 解析の貼り付けだけでは学習完了としない（ARK 側の settlement 必須） */
  vps_analysis_is_not_learning_complete: true;
  book_id: string;
  source_class: string;
  center_terms: string[];
  repeated_terms: string[];
  opposition_pairs: Array<{ left: string; right: string }>;
  tradition_evidence: string[];
  tenmon_mapping: string[];
  uncertainty: string[];
  provisional_verdict: string;
  nas_locator: TenmonVpsBookAnalysisNotionReflectionInputV1["nas_locator"];
  /** 正規化済み束の安定ハッシュ（差分・重複投入の目印） */
  hash: string;
  /** 次会話で thread / composer が辿れる要約（本文ダンプではない） */
  conversation_reuse_summary: string;
  generated_at_iso: string;
};

export function splitVerdictTextToReflectionLinesV1(text: string): string[] {
  const t = String(text || "").trim();
  if (!t) return [];
  return t
    .split(/\n+/u)
    .map((x) => x.trim())
    .filter((s) => s.length > 0);
}

function stableHashForVpsBookReflectionV1(body: {
  book_id: string;
  source_class: string;
  center_terms: string[];
  repeated_terms: string[];
  opposition_pairs: Array<{ left: string; right: string }>;
  tradition_evidence: string[];
  tenmon_mapping: string[];
  uncertainty: string[];
  provisional_verdict: string;
  nas_locator: TenmonVpsBookAnalysisNotionReflectionInputV1["nas_locator"];
}): string {
  const normalized = {
    book_id: body.book_id,
    source_class: body.source_class,
    center_terms: [...body.center_terms].map((s) => s.trim()).filter(Boolean).sort(),
    repeated_terms: [...body.repeated_terms].map((s) => s.trim()).filter(Boolean).sort(),
    opposition_pairs: [...body.opposition_pairs]
      .map((p) => ({ left: String(p.left).trim(), right: String(p.right).trim() }))
      .filter((p) => p.left || p.right)
      .sort((a, b) => `${a.left}\t${a.right}`.localeCompare(`${b.left}\t${b.right}`)),
    tradition_evidence: [...body.tradition_evidence].map((s) => s.trim()).filter(Boolean).sort(),
    tenmon_mapping: [...body.tenmon_mapping].map((s) => s.trim()).filter(Boolean).sort(),
    uncertainty: [...body.uncertainty].map((s) => s.trim()).filter(Boolean).sort(),
    provisional_verdict: String(body.provisional_verdict || "").trim(),
    nas_locator: body.nas_locator,
  };
  return createHash("sha256").update(JSON.stringify(normalized), "utf8").digest("hex");
}

/**
 * VPS 解析スナップショットを Notion 継承記録帳へ渡すための fail-closed ペイロード（API キー不要・貼り付け / 連携先で消費）。
 */
export function buildVpsBookAnalysisNotionReflectionPayloadV1(
  input: TenmonVpsBookAnalysisNotionReflectionInputV1,
): TenmonVpsBookAnalysisNotionReflectionPayloadV1 {
  const book_id = String(input.book_id || "").trim();
  const source_class = String(input.source_class || "").trim() || "auxiliary";
  const center_terms = [...input.center_terms].map((s) => String(s).trim()).filter(Boolean);
  const repeated_terms = [...input.repeated_terms].map((s) => String(s).trim()).filter(Boolean);
  const opposition_pairs = [...input.opposition_pairs].map((p) => ({
    left: String(p.left || "").trim(),
    right: String(p.right || "").trim(),
  }));
  const tradition_evidence = [...input.tradition_evidence].map((s) => String(s).trim()).filter(Boolean);
  const tenmon_mapping = [...input.tenmon_mapping].map((s) => String(s).trim()).filter(Boolean);
  const uncertainty = [...input.uncertainty].map((s) => String(s).trim()).filter(Boolean);
  const provisional_verdict = String(input.provisional_verdict || "").trim();
  const nas_locator = input.nas_locator;

  const hash = stableHashForVpsBookReflectionV1({
    book_id,
    source_class,
    center_terms,
    repeated_terms,
    opposition_pairs,
    tradition_evidence,
    tenmon_mapping,
    uncertainty,
    provisional_verdict,
    nas_locator,
  });

  const conversation_reuse_summary = [
    `book_id=${book_id}`,
    `class=${source_class}`,
    center_terms.length ? `centers=${center_terms.slice(0, 8).join("｜")}` : null,
    nas_locator?.locator_ref ? `nas=${nas_locator.locator_ref}` : null,
    uncertainty.length ? `uncertainty=${uncertainty.slice(0, 6).join("｜")}` : null,
    provisional_verdict ? `provisional=${provisional_verdict.slice(0, 240)}` : null,
    `integrity_sha256=${hash}`,
    "vps_snapshot≠learning_complete",
  ]
    .filter(Boolean)
    .join(" / ")
    .slice(0, 2000);

  return {
    schema: "TENMON_VPS_TO_NOTION_BOOK_ANALYSIS_REFLECTION_PAYLOAD_V1",
    card: "TENMON_VPS_TO_NOTION_BOOK_ANALYSIS_REFLECTION_CURSOR_AUTO_V1",
    notion_inheritance_ledger_doc_title: TENMON_NOTION_VPS_BOOK_ANALYSIS_PROPOSAL_DOC_TITLE_V1,
    settlement_targets: [...NOTION_VPS_BOOK_ANALYSIS_SETTLEMENT_TARGETS_V1],
    vps_analysis_is_not_learning_complete: true,
    book_id,
    source_class,
    center_terms,
    repeated_terms,
    opposition_pairs,
    tradition_evidence,
    tenmon_mapping,
    uncertainty,
    provisional_verdict,
    nas_locator,
    hash,
    conversation_reuse_summary,
    generated_at_iso: new Date().toISOString(),
  };
}

export function buildVpsBookAnalysisNotionReflectionAutomationBundleV1(): {
  schema: "TENMON_VPS_TO_NOTION_BOOK_ANALYSIS_REFLECTION_AUTOMATION_BUNDLE_V1";
  card: "TENMON_VPS_TO_NOTION_BOOK_ANALYSIS_REFLECTION_CURSOR_AUTO_V1";
  example_payload: TenmonVpsBookAnalysisNotionReflectionPayloadV1;
  nextOnPass: string;
  nextOnFail: string;
} {
  const example_payload = buildVpsBookAnalysisNotionReflectionPayloadV1({
    book_id: "mizuho_den",
    source_class: "root",
    center_terms: ["水", "穂"],
    repeated_terms: ["水穂"],
    opposition_pairs: [{ left: "表層", right: "伝統束" }],
    tradition_evidence: ["注釈参照子のみ"],
    tenmon_mapping: ["天聞写像スロット"],
    uncertainty: ["edition_uncertain"],
    provisional_verdict: "暫定: settlement カード束へ投影後に確定",
    nas_locator: {
      materialId: "mizuho_den",
      locator_ref: "nas+path:/volume1/tenmon_ark/materials/den/mizuho_den",
      nas_relative_path: "materials/den/mizuho_den",
      canonical_root: "/volume1/tenmon_ark",
    },
  });
  return {
    schema: "TENMON_VPS_TO_NOTION_BOOK_ANALYSIS_REFLECTION_AUTOMATION_BUNDLE_V1",
    card: "TENMON_VPS_TO_NOTION_BOOK_ANALYSIS_REFLECTION_CURSOR_AUTO_V1",
    example_payload,
    nextOnPass: "TENMON_ARK_BOOK_CANON_LEDGER_AND_CONVERSATION_REUSE_CURSOR_AUTO_V1",
    nextOnFail: "TENMON_VPS_TO_NOTION_BOOK_ANALYSIS_REFLECTION_RETRY_CURSOR_AUTO_V1",
  };
}

function canonPath(): string {
  return path.resolve(process.cwd(), "../canon/tenmon_notion_canon_v1.json");
}

let __cache: NotionCanonFile | null = null;

export function loadTenmonNotionCanon(): NotionCanonFile {
  if (__cache) return __cache;
  const p = canonPath();
  const raw = fs.readFileSync(p, "utf-8");
  const json = JSON.parse(raw) as NotionCanonFile;
  __cache = json;
  return json;
}

export function getNotionCanonForRoute(routeReason: string, rawMessage: string): NotionCanonPage[] {
  const canon = loadTenmonNotionCanon();
  const rr = String(routeReason || "").trim();
  const msg = String(rawMessage || "").trim();

  const pages = Array.isArray(canon.pages) ? canon.pages : [];
  const hits = pages.filter((p) =>
    Array.isArray(p.bindTargets) && p.bindTargets.includes(rr)
  );

  // 追加で、特定語に応じた優先度を少しだけ持たせる
  const scored = hits.map((p) => {
    let score = 0;
    if (/言霊秘書/.test(msg) && p.title.includes("言灵秘書")) score += 10;
    if (/カタカムナ/.test(msg) && p.title.includes("カタカムナ")) score += 5;
    if (/本質/.test(msg) && p.title.includes("本質")) score += 3;
    return { page: p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((x) => x.page);
}

