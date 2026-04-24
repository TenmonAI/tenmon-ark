/**
 * CARD-MC-19 / MC-20-DEEP-MAP-DENOM-FIX-V1: 憲法 V1 第 2–4, 8 条 — 分母 50・ン除外・ヰヱ保持。
 */
import fs from "node:fs";
import path from "node:path";
import { getKotodamaOneSoundEntry, getKotodamaOneSoundIndexSounds } from "../../core/kotodamaOneSoundLawIndex.js";
import { REPO_ROOT } from "../../core/mc/constants.js";

/**
 * @deprecated 憲法 V1 成立 (commit 5c1144ca) 以降、本定数は憲法違反 (46+ン・ヰヱ欠・第2–4条)。
 * 新規は GOJUREN_50_SOUNDS_V1 / buildKotodama50MapV1 を使用。次カードで削除予定。
 * Ref: docs/ark/khs/KOTODAMA_CONSTITUTION_V1.txt
 */
export const GOJUON_BASE = [
  "ア", "イ", "ウ", "エ", "オ", "カ", "キ", "ク", "ケ", "コ", "サ", "シ", "ス", "セ", "ソ", "タ", "チ", "ツ", "テ", "ト",
  "ナ", "ニ", "ヌ", "ネ", "ノ", "ハ", "ヒ", "フ", "ヘ", "ホ", "マ", "ミ", "ム", "メ", "モ", "ヤ", "ユ", "ヨ", "ラ", "リ",
  "ル", "レ", "ロ", "ワ", "ヲ", "ン",
] as const;

/** 五十連十行 (第 2 条)。水火列は genten に合わせ、未確定は捏造しない (第 8 条) */
export const GOJUREN_JUGYO_V1 = [
  { row: "ア行", sounds: ["ア", "イ", "ウ", "エ", "オ"], column_water_fire: "空中水灵" },
  { row: "カ行", sounds: ["カ", "キ", "ク", "ケ", "コ"], column_water_fire: "輝火灵" },
  { row: "サ行", sounds: ["サ", "シ", "ス", "セ", "ソ"], column_water_fire: "未確定" },
  { row: "タ行", sounds: ["タ", "チ", "ツ", "テ", "ト"], column_water_fire: "未確定" },
  { row: "ナ行", sounds: ["ナ", "ニ", "ヌ", "ネ", "ノ"], column_water_fire: "未確定" },
  { row: "ハ行", sounds: ["ハ", "ヒ", "フ", "ヘ", "ホ"], column_water_fire: "正火灵" },
  { row: "マ行", sounds: ["マ", "ミ", "ム", "メ", "モ"], column_water_fire: "未確定" },
  { row: "ヤ行", sounds: ["ヤ", "ヰ", "ユ", "ヱ", "ヨ"], column_water_fire: "未確定" },
  { row: "ラ行", sounds: ["ラ", "リ", "ル", "レ", "ロ"], column_water_fire: "未確定" },
  { row: "ワ行", sounds: ["ワ", "ヰ", "ウ", "ヱ", "ヲ"], column_water_fire: "未確定" },
] as const satisfies ReadonlyArray<{ row: string; sounds: readonly [string, string, string, string, string]; column_water_fire: string }>;

const ROW_SLUG = ["a", "ka", "sa", "ta", "na", "ha", "ma", "ya", "ra", "wa"] as const;
const DAN_SLUG = ["a", "i", "u", "e", "o"] as const;

export const GOJUREN_50_SOUNDS_V1 = GOJUREN_JUGYO_V1.flatMap((rowDef, rowIdx) =>
  rowDef.sounds.map((sound, danIdx) => ({
    canonical_id: `gojuren:${ROW_SLUG[rowIdx]}:${DAN_SLUG[danIdx]}`,
    sound,
    row: rowDef.row,
    dan: DAN_SLUG[danIdx],
    column_water_fire: rowDef.column_water_fire,
    row_index: rowIdx,
    dan_index: danIdx,
  })),
);

const _S = GOJUREN_50_SOUNDS_V1 as readonly { sound: string }[];
if (_S.length !== 50) throw new Error(`[KOTODAMA_CONSTITUTION_V1_VIOLATION] length=${_S.length} (第2条)`);
if (_S.some((s) => s.sound === "ン")) throw new Error(`[KOTODAMA_CONSTITUTION_V1_VIOLATION] ン in GOJUREN_50 (第3条)`);
if (_S.filter((s) => s.sound === "ヰ").length < 2 || _S.filter((s) => s.sound === "ヱ").length < 2) {
  throw new Error(`[KOTODAMA_CONSTITUTION_V1_VIOLATION] ヰ/ヱ不足 (第4条)`);
}

let _genten: { meanings: Set<string>; structureSounds: Set<string> } | null = null;
function loadGentenCaches(): { meanings: Set<string>; structureSounds: Set<string> } {
  if (_genten) return _genten;
  const meanings = new Set<string>();
  const structureSounds = new Set<string>();
  try {
    const j = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "kotodama_genten_data.json"), "utf8")) as {
      kotodama_meanings?: Record<string, unknown>;
      gojiuren_structure?: { columns?: Array<{ sounds?: string[] }> };
    };
    for (const k of Object.keys(j.kotodama_meanings ?? {})) meanings.add(k);
    for (const col of j.gojiuren_structure?.columns ?? []) for (const s of col.sounds ?? []) structureSounds.add(String(s));
  } catch {
    /* ignore */
  }
  return (_genten = { meanings, structureSounds });
}

let _evidence: { terms: Set<string>; pdfTerms: Set<string> } | null = null;
function loadEvidenceUnitIndex(): { terms: Set<string>; pdfTerms: Set<string> } {
  if (_evidence) return _evidence;
  const terms = new Set<string>();
  const pdfTerms = new Set<string>();
  try {
    const fp = path.join(REPO_ROOT, "docs/ark/khs/EVIDENCE_UNITS_KHS_v1.jsonl");
    if (fs.existsSync(fp)) {
      for (const line of fs.readFileSync(fp, "utf8").split("\n")) {
        if (!line.trim()) continue;
        try {
          const u = JSON.parse(line) as { term?: string; sourceRef?: string };
          if (u.term) {
            terms.add(u.term);
            if (u.sourceRef && /pdfPage=\d+/.test(u.sourceRef)) pdfTerms.add(u.term);
          }
        } catch {
          /* skip */
        }
      }
    }
  } catch {
    /* ignore */
  }
  return (_evidence = { terms, pdfTerms });
}

export type Kotodama50MapV1Result = {
  total_canonical: 50;
  with_entry: number;
  with_water_fire: number;
  with_textual_grounding: number;
  with_source_page: number;
  with_shape_position: number;
  with_modern_alias: number;
  coverage_ratio_entry: number;
  coverage_ratio_grounding: number;
  sounds: typeof GOJUREN_50_SOUNDS_V1;
  constitution_ref: string;
  notes: string;
};

/** 五十連十行 coverage（第 2–4, 8 条）。with_modern_alias は未実装で 0 */
export function buildKotodama50MapV1(): Kotodama50MapV1Result {
  const g = loadGentenCaches();
  const ev = loadEvidenceUnitIndex();
  const wf = GOJUREN_50_SOUNDS_V1.filter((s) => (s.column_water_fire as string) !== "未確定").length;
  const ent = GOJUREN_50_SOUNDS_V1.filter((s) => g.meanings.has(s.sound)).length;
  const tg = GOJUREN_50_SOUNDS_V1.filter((s) => ev.terms.has(s.sound)).length;
  const sp = GOJUREN_50_SOUNDS_V1.filter((s) => ev.pdfTerms.has(s.sound)).length;
  return {
    total_canonical: 50,
    with_entry: ent,
    with_water_fire: wf,
    with_textual_grounding: tg,
    with_source_page: sp,
    with_shape_position: 50,
    with_modern_alias: 0,
    coverage_ratio_entry: ent / 50,
    coverage_ratio_grounding: tg / 50,
    sounds: GOJUREN_50_SOUNDS_V1,
    constitution_ref: "KOTODAMA_CONSTITUTION_V1 #2, #3, #4, #8",
    notes: "分母=50(第2条)。ン除外(第3条)。ヰヱ・canonical_id(第4条)。with_*分離(第8条)。",
  };
}

export type Kotodama50SoundAuditRowV1 = {
  canonical_id: string;
  sound: string;
  row: string;
  dan: string;
  has_entry: boolean;
  has_meaning: boolean;
  has_water_fire: boolean;
  has_textual_grounding: boolean;
  has_source_page: boolean;
  has_shape_position: boolean;
  has_modern_alias: boolean;
  column_water_fire: string;
  row_index: number;
  dan_index: number;
};

/** @deprecated fifty_sounds 用 INDEX 監査。intelligence coverage は buildKotodama50MapV1 */
export function auditKotodama50IndexV1(): Record<string, unknown> {
  const idx = new Set(getKotodamaOneSoundIndexSounds());
  const genten = loadGentenCaches().structureSounds;
  const perSound: Kotodama50SoundAuditRowV1[] = GOJUREN_50_SOUNDS_V1.map((slot) => {
    const e = getKotodamaOneSoundEntry(slot.sound);
    return {
      ...slot,
      has_entry: Boolean(e) || genten.has(slot.sound),
      has_meaning: Boolean(e?.preferredMeaning?.trim()),
      has_water_fire: Boolean(e?.waterFireHint?.trim()),
      has_textual_grounding: Boolean(e?.textualGrounding?.length),
      has_source_page: Boolean(e?.sourceRef && typeof e.sourceRef.printedPage === "number"),
      has_shape_position: true,
      has_modern_alias: Boolean((e?.notionHint?.trim() || e?.notionTopics?.length) ?? false),
    };
  });
  const n = (f: (r: Kotodama50SoundAuditRowV1) => boolean) => perSound.filter(f).length;
  const we = n((r) => r.has_entry);
  const cov = we / 50;
  const cg = n((r) => r.has_textual_grounding) / 50;
  return {
    total: 50,
    total_canonical: 50,
    index_key_count: idx.size,
    legacy_gojuon_key_count: GOJUON_BASE.length,
    with_entry: we,
    with_meaning: n((r) => r.has_meaning),
    with_water_fire: n((r) => r.has_water_fire),
    with_textual_grounding: n((r) => r.has_textual_grounding),
    with_source_page: n((r) => r.has_source_page),
    with_shape_position: n((r) => r.has_shape_position),
    with_modern_alias: n((r) => r.has_modern_alias),
    coverage_ratio: cov,
    coverage_ratio_entry: cov,
    coverage_ratio_grounding: cg,
    per_sound: perSound,
    sounds: GOJUREN_50_SOUNDS_V1,
    constitution_ref: "KOTODAMA_CONSTITUTION_V1 #2, #3, #4, #8",
    notes: "分母=50(第2条)。ン除外(第3条)。ヰヱ位相(第4条)。with_*分離(第8条)。",
    unused_warning: cov < 1 ? "五十連十行 INDEX に欠番。law index / genten を拡充。" : null,
  };
}
