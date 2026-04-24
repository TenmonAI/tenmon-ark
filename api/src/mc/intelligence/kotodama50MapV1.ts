/**
 * CARD-MC-19: 五十音一音索引の覆面率（実 INDEX 参照）。
 * CARD-MC-20-DEEP-MAP-DENOM-FIX-V1: 憲法 V1 第 2–4, 8 条 — 分母 50・ン除外・ヰヱ保持。
 */
import fs from "node:fs";
import path from "node:path";
import { getKotodamaOneSoundEntry, getKotodamaOneSoundIndexSounds } from "../../core/kotodamaOneSoundLawIndex.js";
import { REPO_ROOT } from "../../core/mc/constants.js";

/** 五十連十行列ラベル（暫定・Notion 正典同期で確定） */
export type GojurenColumnWaterFireV1 = string;

/** 五十連十行 (憲法 V1 第 2 条)。第 3 条: ン除外。第 4 条: ヰヱ位相。出典: 水穂伝序「其数五十」ほか */
export const GOJUREN_JUGYO_V1 = [
  { row: "ア行", sounds: ["ア", "イ", "ウ", "エ", "オ"], column_water_fire: "空中水灵" },
  { row: "カ行", sounds: ["カ", "キ", "ク", "ケ", "コ"], column_water_fire: "輝火灵" },
  { row: "サ行", sounds: ["サ", "シ", "ス", "セ", "ソ"], column_water_fire: "昇火灵" },
  { row: "タ行", sounds: ["タ", "チ", "ツ", "テ", "ト"], column_water_fire: "水中水灵" },
  { row: "ナ行", sounds: ["ナ", "ニ", "ヌ", "ネ", "ノ"], column_water_fire: "火中水灵" },
  { row: "ハ行", sounds: ["ハ", "ヒ", "フ", "ヘ", "ホ"], column_water_fire: "正火灵" },
  { row: "マ行", sounds: ["マ", "ミ", "ム", "メ", "モ"], column_water_fire: "火中水灵" },
  { row: "ヤ行", sounds: ["ヤ", "ヰ", "ユ", "ヱ", "ヨ"], column_water_fire: "水火灵" },
  { row: "ラ行", sounds: ["ラ", "リ", "ル", "レ", "ロ"], column_water_fire: "濁水灵" },
  { row: "ワ行", sounds: ["ワ", "ヰ", "ウ", "ヱ", "ヲ"], column_water_fire: "水火灵" },
] as const satisfies ReadonlyArray<{
  row: string;
  sounds: readonly [string, string, string, string, string];
  column_water_fire: GojurenColumnWaterFireV1;
}>;

const ROW_SLUG = ["a", "ka", "sa", "ta", "na", "ha", "ma", "ya", "ra", "wa"] as const;
const DAN_SLUG = ["a", "i", "u", "e", "o"] as const;

/** 全 50 スロット（第 2 条 total=50）。同字形異位相は canonical_id で識別（第 4 条） */
export const GOJUREN_50_SOUNDS_V1 = GOJUREN_JUGYO_V1.flatMap((rowDef, rowIdx) =>
  rowDef.sounds.map((sound, danIdx) => ({
    canonical_id: `gojuren:${ROW_SLUG[rowIdx]}:${DAN_SLUG[danIdx]}`,
    sound,
    row: rowDef.row,
    dan: DAN_SLUG[danIdx],
    column_water_fire: rowDef.column_water_fire,
    position: [rowIdx, danIdx] as [number, number],
  })),
);

let _gentenSoundSet: Set<string> | null = null;
function loadGentenSoundSetV1(): Set<string> {
  if (_gentenSoundSet) return _gentenSoundSet;
  const p = path.join(REPO_ROOT, "kotodama_genten_data.json");
  const out = new Set<string>();
  try {
    if (fs.existsSync(p)) {
      const j = JSON.parse(fs.readFileSync(p, "utf8")) as {
        gojiuren_structure?: { columns?: Array<{ sounds?: string[] }> };
      };
      for (const col of j.gojiuren_structure?.columns ?? []) {
        for (const s of col.sounds ?? []) out.add(String(s));
      }
    }
  } catch {
    /* ignore */
  }
  _gentenSoundSet = out;
  return out;
}

/**
 * GOJUON_BASE (憲法 V1 成立前)
 * @deprecated 第 2–4 条違反 (46+ン・ヰヱ欠)。次カードで削除予定。新規は GOJUREN_* を使用。
 */
const GOJUON_BASE = [
  "ア", "イ", "ウ", "エ", "オ", "カ", "キ", "ク", "ケ", "コ", "サ", "シ", "ス", "セ", "ソ", "タ", "チ", "ツ", "テ", "ト",
  "ナ", "ニ", "ヌ", "ネ", "ノ", "ハ", "ヒ", "フ", "ヘ", "ホ", "マ", "ミ", "ム", "メ", "モ", "ヤ", "ユ", "ヨ", "ラ", "リ",
  "ル", "レ", "ロ", "ワ", "ヲ", "ン",
] as const;

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
  column_water_fire: GojurenColumnWaterFireV1;
  position: [number, number];
};

export function auditKotodama50IndexV1(): Record<string, unknown> {
  const indexSounds = new Set(getKotodamaOneSoundIndexSounds());
  const genten = loadGentenSoundSetV1();
  const total_canonical = 50;
  const perSound: Kotodama50SoundAuditRowV1[] = [];
  for (const slot of GOJUREN_50_SOUNDS_V1) {
    const e = getKotodamaOneSoundEntry(slot.sound);
    const has_entry = Boolean(e) || genten.has(slot.sound);
    const has_meaning = Boolean(e && String(e.preferredMeaning || "").trim().length > 0);
    const has_water_fire = Boolean(e && String(e.waterFireHint || "").trim().length > 0);
    const has_textual_grounding = Boolean(e?.textualGrounding && e.textualGrounding.length > 0);
    const has_source_page = Boolean(e?.sourceRef && typeof e.sourceRef.printedPage === "number");
    const has_shape_position = true;
    const has_modern_alias = Boolean(
      (e?.notionHint && String(e.notionHint).trim().length > 0) || (e?.notionTopics && e.notionTopics.length > 0),
    );
    perSound.push({
      canonical_id: slot.canonical_id,
      sound: slot.sound,
      row: slot.row,
      dan: slot.dan,
      has_entry,
      has_meaning,
      has_water_fire,
      has_textual_grounding,
      has_source_page,
      has_shape_position,
      has_modern_alias,
      column_water_fire: slot.column_water_fire,
      position: slot.position,
    });
  }
  const with_entry = perSound.filter((r) => r.has_entry).length;
  const with_meaning = perSound.filter((r) => r.has_meaning).length;
  const with_water_fire = perSound.filter((r) => r.has_water_fire).length;
  const with_textual_grounding = perSound.filter((r) => r.has_textual_grounding).length;
  const with_source_page = perSound.filter((r) => r.has_source_page).length;
  const with_shape_position = perSound.filter((r) => r.has_shape_position).length;
  const with_modern_alias = perSound.filter((r) => r.has_modern_alias).length;
  const coverage_ratio = with_entry / total_canonical;
  const coverage_ratio_grounding = with_textual_grounding / total_canonical;
  return {
    total: total_canonical,
    total_canonical,
    index_key_count: indexSounds.size,
    legacy_gojuon_key_count: GOJUON_BASE.length,
    with_entry,
    with_meaning,
    with_water_fire,
    with_textual_grounding,
    with_source_page,
    with_shape_position,
    with_modern_alias,
    coverage_ratio,
    coverage_ratio_entry: coverage_ratio,
    coverage_ratio_grounding,
    per_sound: perSound,
    sounds: GOJUREN_50_SOUNDS_V1,
    constitution_ref: "KOTODAMA_CONSTITUTION_V1 #2, #3, #4, #8",
    notes:
      "分母=50（第2条）。ン除外（第3条）。ヰヱ位相（第4条）。with_*分離（第8条）。",
    unused_warning:
      coverage_ratio < 1 ? "五十連十行 INDEX に欠番。law index / genten を拡充。" : null,
  };
}

(() => {
  const slots = GOJUREN_50_SOUNDS_V1 as readonly { sound: string }[];
  if (slots.length !== 50) throw new Error("GOJUREN_50_SOUNDS_V1: expected 50");
  if (slots.filter((s) => s.sound === "ヰ").length !== 2) throw new Error("GOJUREN: ヰ×2");
  if (slots.filter((s) => s.sound === "ヱ").length !== 2) throw new Error("GOJUREN: ヱ×2");
  if (slots.some((s) => s.sound === "ン")) throw new Error("GOJUREN: ン除外");
})();
