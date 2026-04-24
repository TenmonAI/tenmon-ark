/**
 * CARD-MC-19-DEEP-INTELLIGENCE-OBSERVABILITY-V1
 * CARD-MC-20-DEAD-FILE-TRUTH-AUDIT-V1: 各スロットの実データ源（chat.ts 変数）を slot_chat_binding で固定。
 * CARD-MC-21-DEEP-INTELLIGENCE-WIRING-V1: soul-root スロット 6 → 11。
 * 魂の根幹注入の発火を jsonl に追記し、24h 窓で集計する（観測専用）。
 */
import fs from "node:fs";
import path from "node:path";
import { getTenmonDataDir } from "../../db/index.js";

const LOG_NAME = "mc_intelligence_fire.jsonl";
const WINDOW_MS = 24 * 60 * 60 * 1000;
/** GEN_SYSTEM soul-root で clause が非空になったスロット数（分母） */
export const SOUL_ROOT_FIRE_SLOTS = 11;

export type SoulRootFireFlagsV1 = {
  hisho: boolean;
  iroha: boolean;
  genten: boolean;
  amaterasu: boolean;
  unified: boolean;
  one_sound: boolean;
  katakamuna_audit: boolean;
  katakamuna_lineage: boolean;
  truth_layer_kernel: boolean;
  khs_root_fractal: boolean;
  katakamuna_misread_guard: boolean;
};

function logPath(): string {
  return path.join(getTenmonDataDir(), LOG_NAME);
}

/** chat.ts から 1 呼び出しのみ（try/catch は呼び出し側）。 */
export function appendIntelligenceFireEventV1(flags: SoulRootFireFlagsV1): void {
  const line =
    JSON.stringify({
      ts: Date.now(),
      ...flags,
    }) + "\n";
  fs.appendFileSync(logPath(), line, { encoding: "utf8" });
}

function readRecentLines(maxBytes = 512_000): string[] {
  const p = logPath();
  if (!fs.existsSync(p)) return [];
  const buf = fs.readFileSync(p, "utf8");
  const tail = buf.length > maxBytes ? buf.slice(buf.length - maxBytes) : buf;
  return tail.split("\n").map((l) => l.trim()).filter(Boolean);
}

/** CARD-MC-26: 7 日窓など長めの tail 用（既定 3MB） */
function readRecentLinesLarge(maxBytes = 3_000_000): string[] {
  return readRecentLines(maxBytes);
}

/**
 * jsonl のキーと chat.ts の soul-root 節・対応モジュール（VERIFY: slot_names_fired の意味）。
 * `one_sound` は kotodamaHishoLoader 等ではなく `buildKotodamaOneSoundLawSystemClauseV1` の戻り値が根拠。
 */
export const INTELLIGENCE_FIRE_SLOT_CHAT_BINDING_V1: Record<
  string,
  { chat_binding: string; module_file: string }
> = {
  hisho: { chat_binding: "__kotodamaHishoClause", module_file: "core/kotodamaHishoLoader.ts" },
  iroha: { chat_binding: "__irohaClause", module_file: "core/irohaKotodamaLoader.ts" },
  genten: { chat_binding: "__gentenClause", module_file: "core/kotodamaGentenLoader.ts" },
  amaterasu: { chat_binding: "__amaterasuClause", module_file: "data/amaterasuAxisMap.ts" },
  unified: { chat_binding: "__unifiedSoundClause", module_file: "core/unifiedSoundLoader.ts" },
  one_sound: {
    chat_binding: "__kotodamaOneSoundLawClause ← buildKotodamaOneSoundLawSystemClauseV1(…)",
    module_file: "core/kotodamaOneSoundLawIndex.ts",
  },
  katakamuna_audit: {
    chat_binding: "__katakamunaSourceAuditClause",
    module_file: "core/katakamunaSourceAuditClassificationV1.ts",
  },
  katakamuna_lineage: {
    chat_binding: "__katakamunaLineageClause",
    module_file: "core/katakamunaLineageTransformationEngine.ts",
  },
  truth_layer_kernel: {
    chat_binding: "__truthLayerArbitrationClause",
    module_file: "core/truthLayerArbitrationKernel.ts",
  },
  khs_root_fractal: {
    chat_binding: "__khsRootFractalClause",
    module_file: "core/khsRootFractalConstitutionV1.ts",
  },
  katakamuna_misread_guard: {
    chat_binding: "__katakamunaMisreadGuardClause",
    module_file: "core/katakamunaMisreadExpansionGuard.ts",
  },
};

export type IntelligenceFire24hSummaryV1 = {
  events_in_window: number;
  slots_denominator: number;
  /** 各イベントで「発火したスロット数 / SOUL_ROOT_FIRE_SLOTS」の平均 */
  avg_fire_ratio: number;
  /** ウィンドウ内に一度でも true だったスロット数 */
  slots_ever_fired: number;
  slot_names_fired: string[];
  /** VERIFY: 各スロットの chat / ファイル対応（MC-20） */
  slot_chat_binding: typeof INTELLIGENCE_FIRE_SLOT_CHAT_BINDING_V1;
  log_path: string;
  note: string;
};

/** CARD-MC-26: 7 日分の日別 avg とプール平均（長期推移） */
export type IntelligenceFireDailyBucketV1 = {
  day: string;
  events: number;
  avg_fire_ratio: number;
};

export type IntelligenceFire7dTrendV1 = {
  schema_version: "mc_intelligence_fire_trend_v1";
  window_days: number;
  events_total: number;
  /** 7 日窓内の全イベントの avg_fill（プール平均） */
  avg_fire_ratio_window: number;
  daily: IntelligenceFireDailyBucketV1[];
  log_path: string;
};

const SLOT_KEYS_FOR_AGG = [
  "hisho",
  "iroha",
  "genten",
  "amaterasu",
  "unified",
  "one_sound",
  "katakamuna_audit",
  "katakamuna_lineage",
  "truth_layer_kernel",
  "khs_root_fractal",
  "katakamuna_misread_guard",
] as const;

function fireRatioForRow(row: Record<string, unknown>): number {
  let fired = 0;
  for (const k of SLOT_KEYS_FOR_AGG) {
    if (row[k] === true) fired += 1;
  }
  return fired / SOUL_ROOT_FIRE_SLOTS;
}

/**
 * CARD-MC-26: jsonl を走査し直近 `windowDays` 日のトレンドとプール平均を返す。
 */
export function buildIntelligenceFire7dTrendV1(windowDays = 7): IntelligenceFire7dTrendV1 {
  const now = Date.now();
  const cutoff = now - windowDays * 24 * 60 * 60 * 1000;
  const lines = readRecentLinesLarge();
  const byDay = new Map<string, { n: number; sumR: number }>();
  let totalN = 0;
  let totalSumR = 0;
  for (const line of lines) {
    let row: Record<string, unknown>;
    try {
      row = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }
    const ts = Number(row.ts);
    if (!Number.isFinite(ts) || ts < cutoff) continue;
    const r = fireRatioForRow(row);
    totalN += 1;
    totalSumR += r;
    const day = new Date(ts).toISOString().slice(0, 10);
    const cur = byDay.get(day) ?? { n: 0, sumR: 0 };
    cur.n += 1;
    cur.sumR += r;
    byDay.set(day, cur);
  }
  const daily: IntelligenceFireDailyBucketV1[] = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, v]) => ({
      day,
      events: v.n,
      avg_fire_ratio: v.n > 0 ? v.sumR / v.n : 0,
    }));
  return {
    schema_version: "mc_intelligence_fire_trend_v1",
    window_days: windowDays,
    events_total: totalN,
    avg_fire_ratio_window: totalN > 0 ? totalSumR / totalN : 0,
    daily,
    log_path: logPath(),
  };
}

export function summarizeIntelligenceFire24hV1(): IntelligenceFire24hSummaryV1 {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const lines = readRecentLines();
  const ever = new Set<string>();
  let sumRatio = 0;
  let n = 0;
  for (const line of lines) {
    let row: Record<string, unknown>;
    try {
      row = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }
    const ts = Number(row.ts);
    if (!Number.isFinite(ts) || ts < cutoff) continue;
    n += 1;
    let fired = 0;
    for (const k of SLOT_KEYS_FOR_AGG) {
      if (row[k] === true) {
        fired += 1;
        ever.add(k);
      }
    }
    sumRatio += fired / SOUL_ROOT_FIRE_SLOTS;
  }
  const avg_fire_ratio = n > 0 ? sumRatio / n : 0;
  return {
    events_in_window: n,
    slots_denominator: SOUL_ROOT_FIRE_SLOTS,
    avg_fire_ratio,
    slots_ever_fired: ever.size,
    slot_names_fired: [...ever],
    slot_chat_binding: INTELLIGENCE_FIRE_SLOT_CHAT_BINDING_V1,
    log_path: logPath(),
    note:
      n < 3
        ? "24h サンプル < 3 のため acceptance は寛容モード（telemetry 蓄積待ち）。"
        : `avg_fire_ratio は各リクエストの「発火スロット数/${SOUL_ROOT_FIRE_SLOTS}」の平均（MC-21）。`,
  };
}
