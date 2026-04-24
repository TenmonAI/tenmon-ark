/**
 * TENMON_KATAKAMUNA_SOURCE_AUDIT_AND_CLASSIFICATION_CURSOR_AUTO_V1
 * NAS/VPS 上のカタカムナ関連資料を source_class で分離する監査束（本文の canon 化はしない）。
 * OCR / 注釈 / 写本系は medium_type で分離し、locator・hash はプレースホルダ可。
 */

export type KatakamunaSourceClassV1 =
  | "primary_root"
  | "lineage_transmission"
  | "commentary"
  | "popularized"
  | "psychologized"
  | "mystified"
  | "tenmon_reintegration"
  | "unknown";

export type KatakamunaMediumTypeV1 =
  | "ocr_pdf"
  | "parsed_text"
  | "image_scan"
  | "commentary_layer"
  | "transcription_unknown"
  | "unknown";

export type KatakamunaCertaintyBandV1 = "high" | "medium" | "low" | "placeholder";

export type KatakamunaSourceAuditEntryV1 = {
  schema: "TENMON_KATAKAMUNA_SOURCE_AUDIT_ENTRY_V1";
  id: string;
  title: string;
  author: string | null;
  source_origin: string;
  medium_type: KatakamunaMediumTypeV1;
  source_class: KatakamunaSourceClassV1;
  lineage_anchor: string | null;
  transformation_tags: readonly string[];
  certainty_band: KatakamunaCertaintyBandV1;
  nas_locator: string | null;
  content_hash: string | null;
  extracted_ref: string | null;
  /** 監査メモ（断定ではない・混線防止用） */
  audit_note: string;
};

export type KatakamunaSourceAuditBundleV1 = {
  schema: "TENMON_KATAKAMUNA_SOURCE_AUDIT_BUNDLE_V1";
  card: "TENMON_KATAKAMUNA_SOURCE_AUDIT_AND_CLASSIFICATION_CURSOR_AUTO_V1";
  version: 1;
  generated_purpose: string;
  entries: readonly KatakamunaSourceAuditEntryV1[];
  nextOnPass: string;
  nextOnFail: string;
};

const PLACEHOLDER_NAS = "nas:/tenmon/katakamuna_library/{slug}/";
/** 末尾スラッシュでエントリ id と連結（`.md` 直結でファイル名が壊れないようにする） */
const PLACEHOLDER_REF = "vps:/extracted/katakamuna/{id}/";

/**
 * 分類対象の代表コーパス（書名は代表ラベル。実ファイルは NAS locator で束ねる想定）。
 * 宇野多美恵以降の普及・心理化系を primary_root と同一視しない。
 */
export const KATAKAMUNA_SOURCE_AUDIT_ENTRIES_V1: readonly KatakamunaSourceAuditEntryV1[] = [
  {
    schema: "TENMON_KATAKAMUNA_SOURCE_AUDIT_ENTRY_V1",
    id: "narazaki_satsuki_lineage_core",
    title: "楢崎皐月系・カタカムナ伝授・整理コーパス（代表）",
    author: "楢崎皐月",
    source_origin: "modern_lineage_teaching",
    medium_type: "transcription_unknown",
    source_class: "lineage_transmission",
    lineage_anchor: "narazaki_satsuki",
    transformation_tags: ["systematization", "oral_to_text", "teaching_corpus"],
    certainty_band: "medium",
    nas_locator: `${PLACEHOLDER_NAS}narazaki_satsuki/`,
    content_hash: null,
    extracted_ref: `${PLACEHOLDER_REF}narazaki_satsuki_lineage_core`,
    audit_note:
      "近代以降の系譜継承・整理として扱う。考古史料の「原資料」とは別レイヤー。OCR層と講義注釈層は extracted_ref で分離すること。",
  },
  {
    schema: "TENMON_KATAKAMUNA_SOURCE_AUDIT_ENTRY_V1",
    id: "uno_tamie_popular",
    title: "宇野多美恵・関連普及・講義資料（代表）",
    author: "宇野多美恵",
    source_origin: "popular_modern",
    medium_type: "parsed_text",
    source_class: "popularized",
    lineage_anchor: "post_narazaki_popularization",
    transformation_tags: ["popularization", "not_single_honryu_marker"],
    certainty_band: "medium",
    nas_locator: `${PLACEHOLDER_NAS}uno_tamie/`,
    content_hash: null,
    extracted_ref: `${PLACEHOLDER_REF}uno_tamie_popular`,
    audit_note:
      "「本流一括」扱い禁止。楢崎系譜の二次普及として分離。会話では lineage と primary を混線させない。",
  },
  {
    schema: "TENMON_KATAKAMUNA_SOURCE_AUDIT_ENTRY_V1",
    id: "soozishou_lineage",
    title: "相似象系・関連写本・整理資料（代表）",
    author: null,
    source_origin: "similarity_symbol_school",
    medium_type: "image_scan",
    source_class: "lineage_transmission",
    lineage_anchor: "similarity_symbol",
    transformation_tags: ["diagrammatic", "symbolic_structure"],
    certainty_band: "low",
    nas_locator: `${PLACEHOLDER_NAS}similarity_symbol/`,
    content_hash: null,
    extracted_ref: `${PLACEHOLDER_REF}soozishou_lineage`,
    audit_note: "写像・図象中心の系統。史実断定と分離。",
  },
  {
    schema: "TENMON_KATAKAMUNA_SOURCE_AUDIT_ENTRY_V1",
    id: "yoshino_nobuko_popular",
    title: "吉野信子・関連著作・資料（代表）",
    author: "吉野信子",
    source_origin: "popular_modern",
    medium_type: "ocr_pdf",
    source_class: "popularized",
    lineage_anchor: "modern_popular_katakamuna",
    transformation_tags: ["popularization"],
    certainty_band: "placeholder",
    nas_locator: `${PLACEHOLDER_NAS}yoshino_nobuko/`,
    content_hash: null,
    extracted_ref: `${PLACEHOLDER_REF}yoshino_nobuko_popular`,
    audit_note: "普及・読み物レイヤー。原資料束と混ぜない。",
  },
  {
    schema: "TENMON_KATAKAMUNA_SOURCE_AUDIT_ENTRY_V1",
    id: "kawai_ayako_psych",
    title: "川ヰ亜哉子・関連著作（代表）",
    author: "川ヰ亜哉子",
    source_origin: "popular_modern",
    medium_type: "ocr_pdf",
    source_class: "psychologized",
    lineage_anchor: "modern_popular_katakamuna",
    transformation_tags: ["psychologization", "self_help_adjacent"],
    certainty_band: "placeholder",
    nas_locator: `${PLACEHOLDER_NAS}kawai_ayako/`,
    content_hash: null,
    extracted_ref: `${PLACEHOLDER_REF}kawai_ayako_psych`,
    audit_note: "心理化フレームが強い資料は史実・原資料と分離。",
  },
  {
    schema: "TENMON_KATAKAMUNA_SOURCE_AUDIT_ENTRY_V1",
    id: "itagaki_akiko_popular",
    title: "板垣昭子・関連著作（代表）",
    author: "板垣昭子",
    source_origin: "popular_modern",
    medium_type: "ocr_pdf",
    source_class: "popularized",
    lineage_anchor: "modern_popular_katakamuna",
    transformation_tags: ["popularization"],
    certainty_band: "placeholder",
    nas_locator: `${PLACEHOLDER_NAS}itagaki_akiko/`,
    content_hash: null,
    extracted_ref: `${PLACEHOLDER_REF}itagaki_akiko_popular`,
    audit_note: "普及レイヤー。系譜上の primary 認定は別審査。",
  },
  {
    schema: "TENMON_KATAKAMUNA_SOURCE_AUDIT_ENTRY_V1",
    id: "amano_shigemi_commentary",
    title: "天野成美・注釈・講話・関連（代表）",
    author: "天野成美",
    source_origin: "commentary_modern",
    medium_type: "commentary_layer",
    source_class: "commentary",
    lineage_anchor: "modern_commentary",
    transformation_tags: ["commentary", "secondary_discourse"],
    certainty_band: "placeholder",
    nas_locator: `${PLACEHOLDER_NAS}amano_shigemi/`,
    content_hash: null,
    extracted_ref: `${PLACEHOLDER_REF}amano_shigemi_commentary`,
    audit_note: "注釈・解説層。本文写本と commentary_layer を分離。",
  },
  {
    schema: "TENMON_KATAKAMUNA_SOURCE_AUDIT_ENTRY_V1",
    id: "tenmon_ark_reintegration_corpus",
    title: "TENMON-ARK・再統合写像・内部正典メモ（代表）",
    author: null,
    source_origin: "tenmon_ark_internal",
    medium_type: "parsed_text",
    source_class: "tenmon_reintegration",
    lineage_anchor: "tenmon_reintegration",
    transformation_tags: ["mapping", "constitution", "non_publisher_corpus"],
    certainty_band: "medium",
    nas_locator: `${PLACEHOLDER_NAS}tenmon_reintegration/`,
    content_hash: null,
    extracted_ref: `${PLACEHOLDER_REF}tenmon_ark_reintegration_corpus`,
    audit_note: "外部出版社本文ではなく TENMON 側の再統合・写像束。学習取り込み時は層を固定。",
  },
  {
    schema: "TENMON_KATAKAMUNA_SOURCE_AUDIT_ENTRY_V1",
    id: "modern_katakamuna_books_bucket",
    title: "その他・現代カタカムナ普及本（バケット）",
    author: null,
    source_origin: "misc_popular_modern",
    medium_type: "unknown",
    source_class: "popularized",
    lineage_anchor: "modern_popular_katakamuna",
    transformation_tags: ["bucket", "requires_per_title_audit"],
    certainty_band: "low",
    nas_locator: `${PLACEHOLDER_NAS}misc_popular/`,
    content_hash: null,
    extracted_ref: `${PLACEHOLDER_REF}modern_katakamuna_books_bucket`,
    audit_note: "未細分化タイトルは unknown→逐次エントリ追加。一括で本流認定しない。",
  },
  {
    schema: "TENMON_KATAKAMUNA_SOURCE_AUDIT_ENTRY_V1",
    id: "katakamuna_mystified_misc",
    title: "神秘化強調系（バケット・代表）",
    author: null,
    source_origin: "esoteric_market",
    medium_type: "unknown",
    source_class: "mystified",
    lineage_anchor: null,
    transformation_tags: ["esoteric_packaging", "certainty_inflation_risk"],
    certainty_band: "low",
    nas_locator: `${PLACEHOLDER_NAS}mystified_misc/`,
    content_hash: null,
    extracted_ref: `${PLACEHOLDER_REF}katakamuna_mystified_misc`,
    audit_note: "神秘化マーケ層。史実・原資料と混線させない。",
  },
  {
    schema: "TENMON_KATAKAMUNA_SOURCE_AUDIT_ENTRY_V1",
    id: "single_title_pending_audit_unknown",
    title: "単タイトル・未監査スロット（source_class=unknown）",
    author: null,
    source_origin: "pending_per_title_audit",
    medium_type: "unknown",
    source_class: "unknown",
    lineage_anchor: null,
    transformation_tags: ["requires_audit_before_learning_bind"],
    certainty_band: "placeholder",
    nas_locator: `${PLACEHOLDER_NAS}pending_title_audit/`,
    content_hash: null,
    extracted_ref: `${PLACEHOLDER_REF}single_title_pending_audit_unknown`,
    audit_note: "分類前の一時スロット。確定まで canon / 学習ループに載せない。",
  },
  {
    schema: "TENMON_KATAKAMUNA_SOURCE_AUDIT_ENTRY_V1",
    id: "primary_manuscript_placeholder",
    title: "写本・資料原層（プレースホルダ・NAS 実体で置換）",
    author: null,
    source_origin: "manuscript_or_early_material",
    medium_type: "image_scan",
    source_class: "primary_root",
    lineage_anchor: "material_layer",
    transformation_tags: ["requires_nas_bind", "ocr_separate_from_commentary"],
    certainty_band: "placeholder",
    nas_locator: `${PLACEHOLDER_NAS}primary_manuscripts/`,
    content_hash: null,
    extracted_ref: `${PLACEHOLDER_REF}primary_manuscript_placeholder`,
    audit_note:
      "「原資料」スロット。実パス・hash は NAS 取り込み時に必ず埋める。commentary / OCR を分離。",
  },
];

export function getKatakamunaSourceAuditBundleV1(): KatakamunaSourceAuditBundleV1 {
  return {
    schema: "TENMON_KATAKAMUNA_SOURCE_AUDIT_BUNDLE_V1",
    card: "TENMON_KATAKAMUNA_SOURCE_AUDIT_AND_CLASSIFICATION_CURSOR_AUTO_V1",
    version: 1,
    generated_purpose: "katakamuna_corpus_classification_for_reading_dialogue_learning",
    entries: KATAKAMUNA_SOURCE_AUDIT_ENTRIES_V1,
    nextOnPass: "TENMON_ARK_BOOK_CANON_LEDGER_AND_CONVERSATION_REUSE_CURSOR_AUTO_V1",
    nextOnFail: "TENMON_KATAKAMUNA_SOURCE_AUDIT_AND_CLASSIFICATION_RETRY_CURSOR_AUTO_V1",
  };
}

const ALL_SOURCE_CLASSES: readonly KatakamunaSourceClassV1[] = [
  "primary_root",
  "lineage_transmission",
  "commentary",
  "popularized",
  "psychologized",
  "mystified",
  "tenmon_reintegration",
  "unknown",
];

/** fail-closed: 分類束の整合（自動化・封印前ゲート） */
export function validateKatakamunaSourceAuditAcceptanceV1(
  entries: readonly KatakamunaSourceAuditEntryV1[],
): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const byId = new Map(entries.map((e) => [e.id, e]));

  const uno = byId.get("uno_tamie_popular");
  if (!uno) reasons.push("missing_entry:uno_tamie_popular");
  else if (uno.source_class !== "popularized") {
    reasons.push("uno_tamie_must_be_popularized_not_conflated_with_primary");
  }

  const nar = byId.get("narazaki_satsuki_lineage_core");
  if (nar?.source_class === "primary_root") {
    reasons.push("narazaki_must_not_be_classified_primary_root");
  }

  const present = new Set(entries.map((e) => e.source_class));
  for (const c of ALL_SOURCE_CLASSES) {
    if (!present.has(c)) reasons.push(`missing_source_class:${c}`);
  }

  for (const e of entries) {
    if (!String(e.nas_locator || "").trim()) reasons.push(`missing_nas_locator:${e.id}`);
    if (!String(e.extracted_ref || "").trim()) reasons.push(`missing_extracted_ref:${e.id}`);
    if (e.schema !== "TENMON_KATAKAMUNA_SOURCE_AUDIT_ENTRY_V1") reasons.push(`bad_schema:${e.id}`);
  }

  return { pass: reasons.length === 0, reasons };
}

export function getKatakamunaSourceAuditAutomationPayloadV1(): {
  schema: "TENMON_KATAKAMUNA_SOURCE_AUDIT_AUTOMATION_PAYLOAD_V1";
  card: "TENMON_KATAKAMUNA_SOURCE_AUDIT_AND_CLASSIFICATION_CURSOR_AUTO_V1";
  generated_at: string;
  bundle: KatakamunaSourceAuditBundleV1;
  acceptance_pass: boolean;
  failure_reasons: string[];
  observation_only: true;
} {
  const bundle = getKatakamunaSourceAuditBundleV1();
  const v = validateKatakamunaSourceAuditAcceptanceV1(bundle.entries);
  return {
    schema: "TENMON_KATAKAMUNA_SOURCE_AUDIT_AUTOMATION_PAYLOAD_V1",
    card: "TENMON_KATAKAMUNA_SOURCE_AUDIT_AND_CLASSIFICATION_CURSOR_AUTO_V1",
    generated_at: new Date().toISOString(),
    bundle,
    acceptance_pass: v.pass,
    failure_reasons: v.pass ? [] : v.reasons,
    observation_only: true,
  };
}

/** 発話がカタカムナ文脈で、監査上「primary 一括扱い禁止」の二次コーパスに触れているか */
export function katakamunaRawTouchesAuditedSecondaryCorpusV1(raw: string): boolean {
  const t = String(raw ?? "").trim();
  if (!t) return false;
  if (!/(カタカムナ|かたかむな|KATAKAMUNA)/iu.test(t)) return false;
  const needles: readonly string[] = [
    "宇野多美恵",
    "吉野信子",
    "川ヰ亜哉子",
    "川井亜哉子",
    "板垣昭子",
    "天野成美",
    "相似象",
    "普及本",
  ];
  return needles.some((n) => t.includes(n));
}

/** CARD-MC-21: カタカムナ文脈での出典監査ラベル（断定ではない） */
export function buildKatakamunaSourceAuditClauseV1(rawMessage: string, maxChars: number): string {
  const t = String(rawMessage ?? "").trim();
  if (!t) return "";
  const katakamuna = /(カタカムナ|かたかむな|KATAKAMUNA)/iu.test(t);
  const hits = matchKatakamunaSourceAuditEntriesV1(t);
  const secondary = katakamunaRawTouchesAuditedSecondaryCorpusV1(t);
  if (!katakamuna && hits.length === 0 && !secondary) return "";
  const lines: string[] = [
    "【カタカムナ出典監査（TENMON･観測）】",
    "primary_root と commentary / popularized / psychologized を一括扱いしない。以下は監査ラベルの参照のみ。",
  ];
  if (secondary) lines.push("※ 発話は二次コーパス語彙に触れている可能性あり（宇野・吉野・川井系など）。");
  for (const e of hits.slice(0, 10)) {
    lines.push(
      `- ${e.title} | class=${e.source_class} | medium=${e.medium_type} | certainty=${e.certainty_band} | ${String(e.audit_note).slice(0, 140)}`,
    );
  }
  if (hits.length === 0 && katakamuna) {
    const b = getKatakamunaSourceAuditBundleV1();
    lines.push(`監査束エントリ数: ${b.entries.length}（代表抜粋）`);
    lines.push(String(b.entries[0]?.audit_note ?? "").slice(0, 220));
  }
  const cap = Math.max(200, maxChars);
  const out = lines.join("\n");
  return out.length > cap ? `${out.slice(0, cap - 12)}…\n(省略)` : out;
}

export function matchKatakamunaSourceAuditEntriesV1(raw: string): KatakamunaSourceAuditEntryV1[] {
  const t = String(raw ?? "").trim();
  if (!t) return [];
  const seen = new Set<string>();
  const out: KatakamunaSourceAuditEntryV1[] = [];
  for (const e of KATAKAMUNA_SOURCE_AUDIT_ENTRIES_V1) {
    let hit = false;
    if (e.author && t.includes(e.author)) hit = true;
    if (e.id === "soozishou_lineage" && t.includes("相似象")) hit = true;
    if (
      e.id === "tenmon_ark_reintegration_corpus" &&
      /(カタカムナ|かたかむな)/iu.test(t) &&
      /天聞|ＴＥＮＭＯＮ|TENMON|アーク/u.test(t)
    ) {
      hit = true;
    }
    if (
      e.id === "katakamuna_mystified_misc" &&
      /(カタカムナ|かたかむな)/iu.test(t) &&
      /(神秘化|スピリチュアル|オカルト|マーケ)/u.test(t)
    ) {
      hit = true;
    }
    if (hit && !seen.has(e.id)) {
      seen.add(e.id);
      out.push(e);
    }
  }
  return out;
}
