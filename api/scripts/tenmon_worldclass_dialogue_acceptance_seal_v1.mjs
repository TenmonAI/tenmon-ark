#!/usr/bin/env node
/**
 * TENMON_WORLDCLASS_DIALOGUE_ACCEPTANCE_SEAL_CURSOR_AUTO_V1
 * scorecard / priority loop / k1 probe evidence を読み、会話 acceptance 軸を再採点し seal JSON を出力する。
 * fail-closed: 明示的 false のみ不足カウント。観測欠損はその軸をスキップ（不足に含めない）。
 *
 * CASE A: 不足 0 → seal 準備
 * CASE B: 不足 1 → primary_gap + recommended_micro_card（コードは適用しない）
 * CASE C: 不足 2+ → next_card_if_fail
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeSealPayload } from "./worldclass_dialogue_axes_v1.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_ROOT = join(__dirname, "..");
const OUT = join(API_ROOT, "automation/tenmon_worldclass_dialogue_acceptance_seal_v1.json");

function main() {
  const { out, exitCode } = computeSealPayload(API_ROOT);
  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(
    JSON.stringify({
      ok: true,
      wrote: OUT,
      case: out.case,
      gap_count: out.gap_count,
      worldclass_ready: out.worldclass_ready,
    }),
  );
  process.exit(exitCode);
}

main();
