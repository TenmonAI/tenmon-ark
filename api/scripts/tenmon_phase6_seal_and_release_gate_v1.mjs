#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * __dirname = <repo>/api/scripts
 * repoRoot  = <repo>
 */
const repoRoot = path.resolve(__dirname, "..", "..");

const requiredFiles = [
  path.join(repoRoot, "docs", "worldclass_observability_policy_v1.md"),
  path.join(repoRoot, "docs", "package_boundary_policy_v1.md"),
  path.join(repoRoot, "docs", "tenmon_phase6_seal_and_release_gate_policy_v1.md"),
];

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

const missingRequired = requiredFiles.filter((p) => !exists(p));

if (missingRequired.length > 0) {
  console.error("[SEAL_GATE] missing required policy files:");
  for (const p of missingRequired) {
    console.error(`- ${path.relative(repoRoot, p)}`);
  }
  process.exit(1);
}

console.log("[SEAL_GATE] required policy files: OK");
console.log("[SEAL_GATE] release gate policy documents exist");
console.log("[SEAL_GATE] phase 6 document gate: PASS");

process.exit(0);
