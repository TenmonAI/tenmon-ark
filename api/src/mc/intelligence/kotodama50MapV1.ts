/**
 * CARD-MC-19: 五十音一音索引の覆面率（実 INDEX 参照）。
 */
import { getKotodamaOneSoundEntry, getKotodamaOneSoundIndexSounds } from "../../core/kotodamaOneSoundLawIndex.js";

/** 五十音図の母音軸（INDEX 側のキー集合との比較用） */
const GOJUON_BASE = [
  "ア",
  "イ",
  "ウ",
  "エ",
  "オ",
  "カ",
  "キ",
  "ク",
  "ケ",
  "コ",
  "サ",
  "シ",
  "ス",
  "セ",
  "ソ",
  "タ",
  "チ",
  "ツ",
  "テ",
  "ト",
  "ナ",
  "ニ",
  "ヌ",
  "ネ",
  "ノ",
  "ハ",
  "ヒ",
  "フ",
  "ヘ",
  "ホ",
  "マ",
  "ミ",
  "ム",
  "メ",
  "モ",
  "ヤ",
  "ユ",
  "ヨ",
  "ラ",
  "リ",
  "ル",
  "レ",
  "ロ",
  "ワ",
  "ヲ",
  "ン",
] as const;

export type Kotodama50SoundAuditRowV1 = {
  sound: string;
  has_entry: boolean;
  has_meaning: boolean;
  has_water_fire: boolean;
  has_textual_grounding: boolean;
};

export function auditKotodama50IndexV1(): Record<string, unknown> {
  const indexSounds = new Set(getKotodamaOneSoundIndexSounds());
  const perSound: Kotodama50SoundAuditRowV1[] = [];
  for (const s of GOJUON_BASE) {
    const e = getKotodamaOneSoundEntry(s);
    const has_entry = Boolean(e);
    perSound.push({
      sound: s,
      has_entry,
      has_meaning: Boolean(e && String(e.preferredMeaning || "").trim().length > 0),
      has_water_fire: Boolean(e && String(e.waterFireHint || "").trim().length > 0),
      has_textual_grounding: Boolean(e?.textualGrounding && e.textualGrounding.length > 0),
    });
  }
  const with_meaning = perSound.filter((r) => r.has_meaning).length;
  const with_water_fire = perSound.filter((r) => r.has_water_fire).length;
  const with_textual_grounding = perSound.filter((r) => r.has_textual_grounding).length;
  const has_entry_count = perSound.filter((r) => r.has_entry).length;
  const coverage_ratio = GOJUON_BASE.length > 0 ? has_entry_count / GOJUON_BASE.length : 0;
  return {
    total: GOJUON_BASE.length,
    index_key_count: indexSounds.size,
    with_entry: has_entry_count,
    with_meaning,
    with_water_fire,
    with_textual_grounding,
    coverage_ratio,
    per_sound: perSound,
    unused_warning:
      coverage_ratio < 0.95
        ? "五十音 INDEX に欠番あり。kotodamaOneSoundLawIndex を拡充してください。"
        : null,
  };
}
