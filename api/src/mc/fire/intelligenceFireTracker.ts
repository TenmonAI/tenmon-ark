/**
 * CARD-MC-19-DEEP-INTELLIGENCE-OBSERVABILITY-V1
 * 魂の根幹注入の発火を jsonl に追記し、24h 窓で集計する（観測専用）。
 */
import fs from "node:fs";
import path from "node:path";
import { getTenmonDataDir } from "../../db/index.js";

const LOG_NAME = "mc_intelligence_fire.jsonl";
const WINDOW_MS = 24 * 60 * 60 * 1000;
/** GEN_SYSTEM soul-root で clause が非空になったスロット数（分母） */
export const SOUL_ROOT_FIRE_SLOTS = 6;

export type SoulRootFireFlagsV1 = {
  hisho: boolean;
  iroha: boolean;
  genten: boolean;
  amaterasu: boolean;
  unified: boolean;
  one_sound: boolean;
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

export type IntelligenceFire24hSummaryV1 = {
  events_in_window: number;
  /** 各イベントで「発火したスロット数 / SOUL_ROOT_FIRE_SLOTS」の平均 */
  avg_fire_ratio: number;
  /** ウィンドウ内に一度でも true だったスロット数 */
  slots_ever_fired: number;
  slot_names_fired: string[];
  log_path: string;
  note: string;
};

export function summarizeIntelligenceFire24hV1(): IntelligenceFire24hSummaryV1 {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const lines = readRecentLines();
  const slotKeys = ["hisho", "iroha", "genten", "amaterasu", "unified", "one_sound"] as const;
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
    for (const k of slotKeys) {
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
    avg_fire_ratio,
    slots_ever_fired: ever.size,
    slot_names_fired: [...ever],
    log_path: logPath(),
    note:
      n < 3
        ? "24h サンプル < 3 のため acceptance は寛容モード（telemetry 蓄積待ち）。"
        : "avg_fire_ratio は各リクエストの「発火スロット数/6」の平均。",
  };
}
