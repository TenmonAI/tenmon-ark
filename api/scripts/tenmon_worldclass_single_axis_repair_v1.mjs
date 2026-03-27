#!/usr/bin/env node
/**
 * TENMON_WORLDCLASS_SINGLE_AXIS_REPAIR_CURSOR_AUTO_V1
 * seal が CASE_B のとき primary_gap に対応する最小パッチを 1 ファイル・1 変更に限定して適用し、build → 再採点。
 * CASE_A で既に worldclass: 何もしない。CASE_C: exit 2 + next_card。
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { computeSealPayload } from "./worldclass_dialogue_axes_v1.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_ROOT = join(__dirname, "..");
const SEAL_OUT = join(API_ROOT, "automation/tenmon_worldclass_dialogue_acceptance_seal_v1.json");
const REPAIR_OUT = join(API_ROOT, "automation/tenmon_worldclass_single_axis_repair_result_v1.json");

const NEXT_FAIL =
  "TENMON_FINAL_CONVERSATION_COMPLETION_SINGLE_SOURCE_SEAL_CURSOR_AUTO_V1";

const GENERAL_DEFINE_MIN1 = `      surfaceContractKey: "general_define_v1",
      shortformShape: "short_define",
      mediumShape: "medium_analysis",
      longformShape: "longform_tenmon",
      closingShape: "soft_next_step",
      minParagraphs: 1,`;

const GENERAL_DEFINE_MIN2 = `      surfaceContractKey: "general_define_v1",
      shortformShape: "short_define",
      mediumShape: "medium_analysis",
      longformShape: "longform_tenmon",
      closingShape: "soft_next_step",
      minParagraphs: 2,`;

/** @returns {{ applied: boolean; file?: string; detail?: string; previous?: string }} */
function applyMinimalPatchForGap(primaryGap) {
  if (primaryGap === "output_surface") {
    const p = join(API_ROOT, "src/core/tenmonSurfaceContractV1.ts");
    const s0 = readFileSync(p, "utf8");
    if (!s0.includes(GENERAL_DEFINE_MIN1)) {
      if (s0.includes(GENERAL_DEFINE_MIN2)) return { applied: false, detail: "already_minParagraphs_2" };
      return { applied: false, detail: "general_define_block_not_found" };
    }
    const s = s0.replace(GENERAL_DEFINE_MIN1, GENERAL_DEFINE_MIN2);
    if (s === s0) return { applied: false, detail: "replace_failed" };
    writeFileSync(p, s, "utf8");
    return { applied: true, file: p, previous: s0, detail: "general_define minParagraphs 1→2" };
  }

  if (primaryGap === "meta_leak_none") {
    const p = join(API_ROOT, "src/core/tenmonConversationSurfaceV2.ts");
    const s0 = readFileSync(p, "utf8");
    if (s0.includes("priorRouteReasonCarry")) return { applied: false, detail: "already_has_carry_strip" };
    const needle = `  t = t.replace(/^\\s*priorRouteReasonEcho\\s*[:：]\\s*[A-Z0-9_]+\\s*$/gmu, "");`;
    if (!s0.includes(needle)) return { applied: false, detail: "anchor_priorRouteReasonEcho_not_found" };
    const insert =
      `  t = t.replace(/\\bpriorRouteReasonCarry\\s*[:：][^\\n\\r]*/giu, "");\n` + needle;
    const s = s0.replace(needle, insert);
    if (s === s0) return { applied: false, detail: "replace_failed" };
    writeFileSync(p, s, "utf8");
    return { applied: true, file: p, previous: s0, detail: "strip priorRouteReasonCarry inline" };
  }

  return { applied: false, detail: "no_automated_patch_for_axis" };
}

function writeSealFile(payload) {
  writeFileSync(SEAL_OUT, JSON.stringify(payload.out, null, 2) + "\n", "utf8");
}

function main() {
  const before = computeSealPayload(API_ROOT);

  const result = {
    ok: true,
    card: "TENMON_WORLDCLASS_SINGLE_AXIS_REPAIR_CURSOR_AUTO_V1",
    generated_at: new Date().toISOString(),
    primary_gap_repaired: false,
    worldclass_ready: before.out.worldclass_ready,
    rollback_used: false,
    next_card_if_fail: null,
    patch: null,
    note: null,
  };

  if (before.out.case === "CASE_A" && before.out.worldclass_ready) {
    result.note = "no_single_axis_gap_seal_already_ready";
    result.worldclass_ready = true;
    writeFileSync(REPAIR_OUT, JSON.stringify(result, null, 2) + "\n", "utf8");
    console.log(JSON.stringify(result));
    process.exit(0);
  }

  if (before.out.case === "CASE_C" || before.out.gap_count >= 2) {
    result.ok = false;
    result.next_card_if_fail = NEXT_FAIL;
    result.note = "case_c_stop_multi_axis";
    writeFileSync(REPAIR_OUT, JSON.stringify(result, null, 2) + "\n", "utf8");
    console.log(JSON.stringify(result));
    process.exit(2);
  }

  if (before.out.case !== "CASE_B" || before.out.gap_count !== 1) {
    result.ok = false;
    result.note = "fail_closed_unexpected_seal_state";
    writeFileSync(REPAIR_OUT, JSON.stringify(result, null, 2) + "\n", "utf8");
    console.log(JSON.stringify(result));
    process.exit(1);
  }

  const gap = String(before.out.primary_gap || "");
  const patch = applyMinimalPatchForGap(gap);
  const { previous: _prev, ...patchPublic } = patch;
  result.patch = patchPublic;

  if (patch.applied) {
    try {
      execSync("npm run build", { cwd: API_ROOT, stdio: "inherit" });
    } catch {
      result.ok = false;
      result.note = "build_failed_after_patch";
      result.rollback_used = true;
      if (patch.file && patch.previous != null) writeFileSync(patch.file, patch.previous, "utf8");
      writeFileSync(REPAIR_OUT, JSON.stringify(result, null, 2) + "\n", "utf8");
      console.log(JSON.stringify(result));
      process.exit(1);
    }
  }

  const after = computeSealPayload(API_ROOT);
  writeSealFile(after);

  result.worldclass_ready = after.out.worldclass_ready;
  result.primary_gap_repaired = patch.applied === true && after.out.worldclass_ready === true;
  if (!patch.applied) {
    result.note = patch.detail || "delegate_to_recommended_micro_card";
    result.recommended_micro_card = before.out.recommended_micro_card;
  }
  if (patch.applied && !after.out.worldclass_ready) {
    result.note = "patch_applied_seal_still_not_ready_digest_may_need_live_probe";
  }

  writeFileSync(REPAIR_OUT, JSON.stringify(result, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(result));
  process.exit(0);
}

main();
