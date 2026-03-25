#!/usr/bin/env node
/**
 * TENMON_KG2B_FRACTAL_LANGUAGE_RENDERER_VPS_V1 — dist の weave を検査
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");
const outDir =
  process.env.KG2B_OUT_DIR ||
  path.join(apiRoot, "automation/out/tenmon_kg2b_fractal_language_renderer_v1");
fs.mkdirSync(outDir, { recursive: true });

const surfUrl = pathToFileURL(path.join(apiRoot, "dist/core/tenmonConversationSurfaceV2.js")).href;
const badUrl = pathToFileURL(path.join(apiRoot, "dist/core/kokuzoBadGuardV1.js")).href;

const { weaveKhsEvidenceIntoHybridSurfaceV1, trimTenmonSurfaceNoiseV3 } = await import(surfUrl);
const { evaluateKokuzoBadHeuristicV1 } = await import(badUrl);

const base =
  "【天聞の所見】\n\n言霊は、声と意味が結びつくときに、場の秩序を整える働きを持ちます。";
const evidence = [
  {
    lawKey: "KHSL:LAW:EXAMPLE:p1:qabc",
    termKey: "言霊",
    doc: "KHS",
    pdfPage: 12,
    quote: "言霊とは、音に宿る意志が形を取る過程を指す。",
    quoteHash: "abc",
    seedId: "seed1",
  },
  {
    lawKey: "KHSL:LAW:EXAMPLE:p2:qdef",
    termKey: "水火",
    doc: "KHS",
    pdfPage: 13,
    quote: "水と火は、互いに抑え合いながら循環する。",
    quoteHash: "def",
    seedId: "seed2",
  },
];

const w1 = weaveKhsEvidenceIntoHybridSurfaceV1({ surfaceBody: base, evidence });
const w2 = weaveKhsEvidenceIntoHybridSurfaceV1({ surfaceBody: base, evidence });
const h1 = crypto.createHash("sha256").update(w1).digest("hex");
const h2 = crypto.createHash("sha256").update(w2).digest("hex");

const hasFootnoteUgly = /doc\s*=\s*\S+\s+pdfPage\s*=/i.test(w1) || /\(根拠:\s*doc=/i.test(w1);
const badInWeave = evaluateKokuzoBadHeuristicV1(w1).isBad;
const cleaned = trimTenmonSurfaceNoiseV3(w1);
const noiseRegression = cleaned.length < w1.length * 0.5 && w1.length > 80;

const hybrid_surface_audit = {
  card: "TENMON_KG2B_FRACTAL_LANGUAGE_RENDERER_V1",
  generatedAt: new Date().toISOString(),
  idempotent: h1 === h2,
  wovenLength: w1.length,
  hasUglyDocPageFootnote: hasFootnoteUgly,
  badHeuristicOnSurface: badInWeave,
  trimTenmonSurfaceNoiseV3_ok: !noiseRegression,
  sampleTail: w1.slice(-220),
};

const evidence_render_audit = {
  card: "TENMON_KG2B_FRACTAL_LANGUAGE_RENDERER_V1",
  generatedAt: new Date().toISOString(),
  evidenceSlots: evidence.length,
  quotesWoven: !w1.includes("doc=") && /「[^」]{8,}」/.test(w1),
};

let auditOk = null;
const __base = String(process.env.TENMON_API_BASE || "").trim();
const auditUrl =
  String(process.env.KG2B_AUDIT_URL || "").trim() ||
  (__base ? `${__base.replace(/\/$/, "")}/api/audit` : "");
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
  !hasFootnoteUgly &&
  !badInWeave &&
  !noiseRegression &&
  (auditOk === null || auditOk === true);

const final_verdict = {
  card: "TENMON_KG2B_FRACTAL_LANGUAGE_RENDERER_VPS_V1",
  generatedAt: new Date().toISOString(),
  verdict: pass ? "PASS" : "FAIL",
  reasons: [
    h1 !== h2 ? "weave_not_idempotent" : "",
    hasFootnoteUgly ? "ugly_footnote_pattern" : "",
    badInWeave ? "bad_heuristic_surface" : "",
    noiseRegression ? "surface_clean_regression" : "",
    auditOk === false ? "audit_http_fail" : "",
  ].filter(Boolean),
  audit_probe: auditOk,
  fail_next_card: "TENMON_KG2B_FRACTAL_LANGUAGE_RENDERER_RETRY_CURSOR_AUTO_V1",
  artifacts: [
    "TENMON_KG2B_FRACTAL_LANGUAGE_RENDERER_VPS_V1",
    "hybrid_surface_audit.json",
    "evidence_render_audit.json",
    "final_verdict.json",
  ],
};

fs.writeFileSync(path.join(outDir, "hybrid_surface_audit.json"), JSON.stringify(hybrid_surface_audit, null, 2) + "\n");
fs.writeFileSync(path.join(outDir, "evidence_render_audit.json"), JSON.stringify(evidence_render_audit, null, 2) + "\n");
fs.writeFileSync(path.join(outDir, "final_verdict.json"), JSON.stringify(final_verdict, null, 2) + "\n");
fs.writeFileSync(
  path.join(outDir, "TENMON_KG2B_FRACTAL_LANGUAGE_RENDERER_VPS_V1"),
  `${final_verdict.card}\n${final_verdict.generatedAt}\nverdict=${final_verdict.verdict}\n`
);

console.log(JSON.stringify({ outDir, verdict: final_verdict.verdict, idempotent: h1 === h2 }, null, 2));
process.exit(pass ? 0 : 1);
