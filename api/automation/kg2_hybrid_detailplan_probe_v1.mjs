#!/usr/bin/env node
/**
 * TENMON_KG2_KHS_CANDIDATE_RETURN_VPS_V1 — dist の決定論ビルダーを検査し JSON を出力する。
 * 先に `npm run build` すること。
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");

const dbPath =
  process.env.TENMON_ARK_DB_KOKUZO_PATH?.trim() ||
  path.join(process.env.TENMON_DATA_DIR || "/opt/tenmon-ark-data", "kokuzo.sqlite");

const probeMsg = process.env.KG2_PROBE_MESSAGE || "言霊について";
const centerClaim = process.env.KG2_PROBE_CENTER || "";

const outDir =
  process.env.KG2_OUT_DIR ||
  path.join(apiRoot, "automation/out/tenmon_kg2_khs_candidate_return_v1");
fs.mkdirSync(outDir, { recursive: true });

const modUrl = pathToFileURL(path.join(apiRoot, "dist/khs/khsHybridCandidatesV1.js")).href;
const badUrl = pathToFileURL(path.join(apiRoot, "dist/core/kokuzoBadGuardV1.js")).href;

const { buildHybridDetailPlanKhsCandidatesV1 } = await import(modUrl);
const { evaluateKokuzoBadHeuristicV1 } = await import(badUrl);

const run1 = buildHybridDetailPlanKhsCandidatesV1({
  dbPath,
  rawMessage: probeMsg,
  centerClaim,
  limit: 20,
});
const run2 = buildHybridDetailPlanKhsCandidatesV1({
  dbPath,
  rawMessage: probeMsg,
  centerClaim,
  limit: 20,
});

const canon = JSON.stringify(run1);
const h1 = crypto.createHash("sha256").update(canon).digest("hex");
const h2 = crypto.createHash("sha256").update(JSON.stringify(run2)).digest("hex");

let badInCandidates = 0;
const fieldIssues = [];
for (const c of run1) {
  if (evaluateKokuzoBadHeuristicV1(c.quote).isBad) badInCandidates += 1;
  if (!c.lawKey) fieldIssues.push({ seedId: c.seedId, missing: "lawKey" });
  if (c.termKey == null) fieldIssues.push({ seedId: c.seedId, missing: "termKey" });
  if (!c.doc) fieldIssues.push({ seedId: c.seedId, missing: "doc" });
  if (!String(c.quote || "").trim()) fieldIssues.push({ seedId: c.seedId, missing: "quote" });
}

const evidence = run1.map((c) => ({
  doc: c.doc,
  pdfPage: c.pdfPage,
  quote: c.quote.slice(0, 200),
  lawKey: c.lawKey,
  termKey: c.termKey,
  quoteHash: c.quoteHash,
  seedId: c.seedId,
}));

const hybrid_detailplan_probe = {
  card: "TENMON_KG2_KHS_CANDIDATE_RETURN_V1",
  generatedAt: new Date().toISOString(),
  dbPath,
  probeMessage: probeMsg,
  mode: "HYBRID_simulated",
  khsCandidatesCount: run1.length,
  khsCandidatesSample: run1.slice(0, 5),
  detailPlanShape: {
    khsCandidatesIsArray: Array.isArray(run1),
    evidenceSlots: evidence.length,
  },
};

const khs_candidates_audit = {
  card: "TENMON_KG2_KHS_CANDIDATE_RETURN_V1",
  generatedAt: new Date().toISOString(),
  count: run1.length,
  badQuoteCount: badInCandidates,
  fieldIssuesCount: fieldIssues.length,
  fieldIssuesSample: fieldIssues.slice(0, 20),
  idempotent: h1 === h2,
  manifestSha256_run1: h1,
  manifestSha256_run2: h2,
};

const evidence_audit = {
  card: "TENMON_KG2_KHS_CANDIDATE_RETURN_V1",
  generatedAt: new Date().toISOString(),
  entries: evidence.slice(0, 15),
  allHaveDocPdfQuote: evidence.every((e) => e.doc && e.quote && e.lawKey),
};

const auditUrl = process.env.KG1_AUDIT_URL || process.env.KG2_AUDIT_URL || "";
let auditOk = null;
if (auditUrl) {
  try {
    const r = await fetch(auditUrl);
    auditOk = r.ok;
  } catch {
    auditOk = false;
  }
}

const pass =
  h1 === h2 &&
  badInCandidates === 0 &&
  Array.isArray(run1) &&
  (auditOk === null || auditOk === true);

const final_verdict = {
  card: "TENMON_KG2_KHS_CANDIDATE_RETURN_VPS_V1",
  generatedAt: new Date().toISOString(),
  verdict: pass ? "PASS" : "FAIL",
  reasons: [
    h1 !== h2 ? "idempotence_mismatch" : "",
    badInCandidates > 0 ? "bad_quote_in_candidates" : "",
    auditOk === false ? "audit_http_fail" : "",
  ].filter(Boolean),
  audit_probe: auditOk,
  fail_next_card: "TENMON_KG2_KHS_CANDIDATE_RETURN_RETRY_CURSOR_AUTO_V1",
  artifacts: [
    "TENMON_KG2_KHS_CANDIDATE_RETURN_VPS_V1",
    "hybrid_detailplan_probe.json",
    "khs_candidates_audit.json",
    "evidence_audit.json",
    "final_verdict.json",
  ],
};

fs.writeFileSync(path.join(outDir, "hybrid_detailplan_probe.json"), JSON.stringify(hybrid_detailplan_probe, null, 2) + "\n");
fs.writeFileSync(path.join(outDir, "khs_candidates_audit.json"), JSON.stringify(khs_candidates_audit, null, 2) + "\n");
fs.writeFileSync(path.join(outDir, "evidence_audit.json"), JSON.stringify(evidence_audit, null, 2) + "\n");
fs.writeFileSync(path.join(outDir, "final_verdict.json"), JSON.stringify(final_verdict, null, 2) + "\n");
fs.writeFileSync(
  path.join(outDir, "TENMON_KG2_KHS_CANDIDATE_RETURN_VPS_V1"),
  `${final_verdict.card}\n${final_verdict.generatedAt}\nverdict=${final_verdict.verdict}\n`
);

console.log(JSON.stringify({ outDir, count: run1.length, idempotent: h1 === h2, verdict: final_verdict.verdict }, null, 2));
process.exit(pass ? 0 : 1);
