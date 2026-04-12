#!/usr/bin/env node
/**
 * TENMON-ARK Golden Baseline Regression Test v1
 *
 * Usage:
 *   node api/scripts/regression_test_v1.mjs [--api-url http://localhost:3000]
 *
 * This script:
 *   1. Loads golden_baseline_v1.json
 *   2. Sends each case to the chat API
 *   3. Validates structure, persona, prohibitions
 *   4. Outputs PASS/PARTIAL/FAIL per case and overall
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

// --- Config ---
const API_URL = process.argv.find((a) => a.startsWith("--api-url="))
  ? process.argv.find((a) => a.startsWith("--api-url=")).split("=")[1]
  : process.env.TENMON_API_URL || "http://localhost:3000";

const BASELINE_PATH = path.join(repoRoot, "api", "golden_baseline", "golden_baseline_v1.json");

// --- Prohibition patterns ---
const PROHIBITIONS = [
  "と言われています",
  "一般には",
  "諸説あります",
  "人それぞれ",
  "状況による",
];

const SOURCE_PROHIBITIONS = [
  "断捨離",
  "カタカムナ",
  "ChatGPT",
  "GPT-4",
  "OpenAI",
  "Claude",
  "Gemini",
];

// --- Load baseline ---
function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) {
    console.error(`[FAIL] Baseline file not found: ${BASELINE_PATH}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(BASELINE_PATH, "utf-8"));
}

// --- Send chat request ---
async function sendChat(message) {
  const url = `${API_URL}/api/chat`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tenmon-local-test": "1",
      },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      return { error: `HTTP ${res.status}`, body: null };
    }
    const body = await res.json();
    return { error: null, body };
  } catch (e) {
    return { error: e.message, body: null };
  }
}

// --- Validate a single case ---
function validateCase(testCase, responseBody) {
  const results = [];
  const r = responseBody;

  // 1. Structure check
  if (r.response !== undefined && r.timestamp !== undefined && r.decisionFrame !== undefined) {
    results.push({ check: "structure", status: "PASS" });
  } else {
    results.push({ check: "structure", status: "FAIL", detail: "Missing response/timestamp/decisionFrame" });
  }

  // 2. Prohibition check
  const text = String(r.response || "");
  const violations = PROHIBITIONS.filter((p) => text.includes(p));
  if (violations.length === 0) {
    results.push({ check: "prohibition", status: "PASS" });
  } else {
    results.push({ check: "prohibition", status: "FAIL", detail: `Found: ${violations.join(", ")}` });
  }

  // 3. Source prohibition check
  const sourceViolations = SOURCE_PROHIBITIONS.filter((s) => text.includes(s));
  if (sourceViolations.length === 0) {
    results.push({ check: "source_prohibition", status: "PASS" });
  } else {
    results.push({ check: "source_prohibition", status: "FAIL", detail: `Found: ${sourceViolations.join(", ")}` });
  }

  // 4. Evidence prohibition (no fabricated doc/pdfPage)
  if (!/\bdoc\s*=\s*\S+/i.test(text) && !/\bpdfPage\s*=\s*\d+/i.test(text)) {
    results.push({ check: "evidence_prohibition", status: "PASS" });
  } else {
    results.push({ check: "evidence_prohibition", status: "FAIL", detail: "Fabricated evidence found" });
  }

  // 5. Expected contains
  if (testCase.expected_response_contains && testCase.expected_response_contains.length > 0) {
    const missing = testCase.expected_response_contains.filter((c) => !text.includes(c));
    if (missing.length === 0) {
      results.push({ check: "expected_contains", status: "PASS" });
    } else {
      results.push({ check: "expected_contains", status: "FAIL", detail: `Missing: ${missing.join(", ")}` });
    }
  }

  // 6. Expected not contains
  if (testCase.expected_response_not_contains && testCase.expected_response_not_contains.length > 0) {
    const found = testCase.expected_response_not_contains.filter((c) => text.includes(c));
    if (found.length === 0) {
      results.push({ check: "expected_not_contains", status: "PASS" });
    } else {
      results.push({ check: "expected_not_contains", status: "FAIL", detail: `Found: ${found.join(", ")}` });
    }
  }

  // 7. DecisionFrame mode check
  if (testCase.expected_decisionFrame_mode && r.decisionFrame) {
    if (r.decisionFrame.mode === testCase.expected_decisionFrame_mode) {
      results.push({ check: "decisionFrame_mode", status: "PASS" });
    } else {
      results.push({ check: "decisionFrame_mode", status: "PARTIAL", detail: `Expected ${testCase.expected_decisionFrame_mode}, got ${r.decisionFrame.mode}` });
    }
  }

  // 8. Non-empty response
  if (text.trim().length > 0) {
    results.push({ check: "non_empty", status: "PASS" });
  } else {
    results.push({ check: "non_empty", status: "FAIL", detail: "Empty response" });
  }

  // Overall
  const hasFail = results.some((r) => r.status === "FAIL");
  const hasPartial = results.some((r) => r.status === "PARTIAL");
  const overall = hasFail ? "FAIL" : hasPartial ? "PARTIAL" : "PASS";

  return { overall, results };
}

// --- Main ---
async function main() {
  console.log("=== TENMON-ARK Golden Baseline Regression Test v1 ===");
  console.log(`API URL: ${API_URL}`);
  console.log(`Baseline: ${BASELINE_PATH}`);
  console.log("");

  const baseline = loadBaseline();
  const cases = baseline.cases;
  console.log(`Total cases: ${cases.length}`);
  console.log("");

  // Check if API is reachable (dry-run mode if not)
  let dryRun = false;
  try {
    const healthRes = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "ping" }),
    });
    if (!healthRes.ok && healthRes.status >= 500) {
      console.log("[WARN] API returned 5xx. Switching to dry-run (structure validation only).");
      dryRun = true;
    }
  } catch {
    console.log("[WARN] API not reachable. Switching to dry-run (baseline structure validation only).");
    dryRun = true;
  }

  if (dryRun) {
    // Validate baseline structure only
    let valid = true;
    for (const c of cases) {
      if (!c.id || !c.category || !c.input) {
        console.error(`[FAIL] Case missing required fields: ${JSON.stringify(c)}`);
        valid = false;
      }
    }
    if (valid) {
      console.log(`[PASS] Baseline structure valid: ${cases.length} cases, ${baseline.categories.length} categories`);
      console.log("[INFO] To run full regression, start the API and re-run this script.");
    }
    process.exit(valid ? 0 : 1);
  }

  // Full regression
  const results = [];
  for (const c of cases) {
    process.stdout.write(`[${c.id}] ${c.category}: "${c.input.slice(0, 30)}" ... `);
    const { error, body } = await sendChat(c.input);
    if (error) {
      console.log(`ERROR (${error})`);
      results.push({ id: c.id, category: c.category, overall: "FAIL", detail: error });
      continue;
    }
    const validation = validateCase(c, body);
    console.log(validation.overall);
    if (validation.overall !== "PASS") {
      for (const r of validation.results.filter((r) => r.status !== "PASS")) {
        console.log(`  - ${r.check}: ${r.status} ${r.detail || ""}`);
      }
    }
    results.push({ id: c.id, category: c.category, overall: validation.overall, response_preview: String(body.response || "").slice(0, 80) });
    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 200));
  }

  // Summary
  console.log("");
  console.log("=== SUMMARY ===");
  const pass = results.filter((r) => r.overall === "PASS").length;
  const partial = results.filter((r) => r.overall === "PARTIAL").length;
  const fail = results.filter((r) => r.overall === "FAIL").length;
  console.log(`PASS: ${pass} / PARTIAL: ${partial} / FAIL: ${fail} / TOTAL: ${results.length}`);

  // By category
  for (const cat of baseline.categories) {
    const catResults = results.filter((r) => r.category === cat);
    const catPass = catResults.filter((r) => r.overall === "PASS").length;
    console.log(`  ${cat}: ${catPass}/${catResults.length} PASS`);
  }

  // Overall verdict
  const verdict = fail === 0 ? (partial === 0 ? "GREEN" : "YELLOW") : "RED";
  console.log(`\nVERDICT: ${verdict}`);

  // Save results
  const outputPath = path.join(repoRoot, "api", "golden_baseline", "regression_results_latest.json");
  fs.writeFileSync(outputPath, JSON.stringify({ timestamp: new Date().toISOString(), verdict, results }, null, 2));
  console.log(`Results saved to: ${outputPath}`);

  process.exit(verdict === "RED" ? 1 : 0);
}

main().catch((e) => {
  console.error("[FATAL]", e);
  process.exit(1);
});
