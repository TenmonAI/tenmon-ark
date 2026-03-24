#!/usr/bin/env npx tsx
/**
 * CLI: 決定的 KHS Seed を JSON へ書き出し（本番ルート・LLM 不使用）
 */
import fs from "node:fs";
import path from "node:path";
import {
  generateDeterministicKhsSeedsV1,
  hashDeterministicSeedManifestV1,
  type PassableSetInputV1,
} from "./deterministic_seed_generator_v1.js";

function readJson(pathStr: string): unknown {
  return JSON.parse(fs.readFileSync(pathStr, "utf8"));
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = { requirePipeline: true };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--no-require-pipeline") {
      out.requirePipeline = false;
      continue;
    }
    if (a.startsWith("--") && argv[i + 1] && !argv[i + 1].startsWith("--")) {
      const key = a.slice(2).replace(/-/g, "_");
      out[key] = argv[++i];
    }
  }
  return out;
}

function defaultKokuzoDbPath(): string {
  const alt = String(process.env.TENMON_ARK_DB_KOKUZO_PATH || "").trim();
  if (alt) return alt;
  const dir = String(process.env.TENMON_DATA_DIR || "/opt/tenmon-ark-data").trim() || "/opt/tenmon-ark-data";
  return path.join(dir, "kokuzo.sqlite");
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv);
  const outDir = String(args.out_dir || path.join(process.cwd(), "automation/out/tenmon_kg1_deterministic_seed_generator_v1"));
  fs.mkdirSync(outDir, { recursive: true });

  const dbPath = String(args.db || defaultKokuzoDbPath());
  const passablePath = args.passable_json ? String(args.passable_json) : "";

  let passable: PassableSetInputV1 = { unitIds: [] };
  if (passablePath && fs.existsSync(passablePath)) {
    const raw = readJson(passablePath) as Record<string, unknown>;
    passable = {
      unitIds: Array.isArray(raw.unitIds) ? (raw.unitIds as string[]) : [],
      kg1_pipeline_recommended:
        typeof raw.kg1_pipeline_recommended === "boolean" ? raw.kg1_pipeline_recommended : undefined,
      aggregate_gate_pass:
        typeof raw.aggregate_gate_pass === "boolean" ? raw.aggregate_gate_pass : undefined,
    };
  }

  const requirePipeline = args.requirePipeline !== false; // --no-require-pipeline で false

  const run1 = generateDeterministicKhsSeedsV1({
    dbPath,
    passable,
    requirePipelineRecommended: requirePipeline,
  });
  const run2 = generateDeterministicKhsSeedsV1({
    dbPath,
    passable,
    requirePipelineRecommended: requirePipeline,
  });

  const h1 = hashDeterministicSeedManifestV1(run1.seeds);
  const h2 = hashDeterministicSeedManifestV1(run2.seeds);
  const idempotent = h1 === h2 && run1.seeds.length === run2.seeds.length;

  const sampleN = Math.min(20, run1.seeds.length);
  const khs_seeds_sample = {
    card: "TENMON_KG1_DETERMINISTIC_SEED_GENERATOR_V1",
    generatedAt: new Date().toISOString(),
    total: run1.seeds.length,
    sample: run1.seeds.slice(0, sampleN),
    manifestSha256: h1,
  };

  const seed_idempotence_report = {
    card: "TENMON_KG1_DETERMINISTIC_SEED_GENERATOR_V1",
    generatedAt: new Date().toISOString(),
    run1_count: run1.seeds.length,
    run2_count: run2.seeds.length,
    manifest_hash_run1: h1,
    manifest_hash_run2: h2,
    idempotent,
    skippedBadQuote: run1.skippedBadQuote,
    skippedNotInDb: run1.skippedNotInDb,
    skippedPipeline: run1.skippedPipeline,
  };

  const auditPass = process.env.KG1_AUDIT_URL
    ? await fetch(String(process.env.KG1_AUDIT_URL))
        .then((r) => r.ok)
        .catch(() => false)
    : null;

  const verdictPass = idempotent && auditPass !== false && !run1.skippedPipeline;

  const final_verdict = {
    card: "TENMON_KG1_DETERMINISTIC_SEED_GENERATOR_VPS_V1",
    generatedAt: new Date().toISOString(),
    verdict: verdictPass ? "PASS" : "FAIL",
    reasons: [
      !idempotent ? "manifest_hash_mismatch" : "",
      run1.skippedPipeline ? "pipeline_not_recommended_or_empty_input" : "",
      auditPass === false ? "audit_http_failed" : "",
    ].filter(Boolean),
    audit_probe: auditPass,
    fail_next_card: "TENMON_KG1_DETERMINISTIC_SEED_GENERATOR_RETRY_CURSOR_AUTO_V1",
    artifacts: [
      "TENMON_KG1_DETERMINISTIC_SEED_GENERATOR_VPS_V1",
      "khs_seeds_sample.json",
      "seed_idempotence_report.json",
      "final_verdict.json",
    ],
  };

  fs.writeFileSync(path.join(outDir, "khs_seeds_sample.json"), JSON.stringify(khs_seeds_sample, null, 2) + "\n");
  fs.writeFileSync(
    path.join(outDir, "seed_idempotence_report.json"),
    JSON.stringify(seed_idempotence_report, null, 2) + "\n"
  );
  fs.writeFileSync(path.join(outDir, "final_verdict.json"), JSON.stringify(final_verdict, null, 2) + "\n");
  fs.writeFileSync(
    path.join(outDir, "TENMON_KG1_DETERMINISTIC_SEED_GENERATOR_VPS_V1"),
    `${final_verdict.card}\n${final_verdict.generatedAt}\nverdict=${final_verdict.verdict}\n`
  );

  console.log(JSON.stringify({ outDir, total: run1.seeds.length, manifestSha256: h1, idempotent }, null, 2));
  return verdictPass ? 0 : 1;
}

void main().then(
  (c) => process.exit(c),
  (e) => {
    console.error(e);
    process.exit(1);
  }
);
