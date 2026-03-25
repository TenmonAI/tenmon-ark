#!/usr/bin/env node
/**
 * TENMON_A1_KOKUZO_BAD_GUARD_V1 — ビルド済み dist から監査 JSON を生成（DB がある環境では Seed フィルタも実走査）
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");

const outDir = process.argv[2] || path.join(apiRoot, "automation", "out", "tenmon_a1_kokuzo_bad_guard_v1");
fs.mkdirSync(outDir, { recursive: true });

const { evaluateKokuzoBadHeuristicV1, mergeSnippetAndPageHeadForBadGuardV1 } = await import(
  path.join(apiRoot, "dist", "core", "kokuzoBadGuardV1.js")
);
const { filterEvidenceIdsForKokuzoBadGuardV1 } = await import(
  path.join(apiRoot, "dist", "kokuzo", "kokuzoBadGuardEvidenceV1.js")
);

const CARD = "TENMON_A1_KOKUZO_BAD_GUARD_VPS_V1";

const textSamples = [
  { id: "clean_jp", text: "日本語の正常な参照テキストです。".repeat(20) },
  { id: "hard_replacement", text: "bad\uFFFDsignal" },
  { id: "hard_nul", text: "a\x00b" },
  { id: "hard_ctrl_many", text: "\x01".repeat(50) + "x".repeat(450) },
];

const bad_guard_audit = {
  card: CARD,
  generatedAt: new Date().toISOString(),
  samples: textSamples.map((s) => {
    const r = evaluateKokuzoBadHeuristicV1(s.text);
    return { id: s.id, ...r };
  }),
};

const candidate_filter_result = {
  card: CARD,
  generatedAt: new Date().toISOString(),
  note: "Hybrid 候補と同じ merge + evaluate（ページ先頭はモック）",
  rows: [
    {
      id: "ok",
      snippet: "正常スニペット",
      pageHead: "ページ先頭も正常です。",
      merged: mergeSnippetAndPageHeadForBadGuardV1("正常スニペット", "ページ先頭も正常です。"),
      ...evaluateKokuzoBadHeuristicV1(
        mergeSnippetAndPageHeadForBadGuardV1("正常スニペット", "ページ先頭も正常です。")
      ),
    },
    {
      id: "bad_via_page",
      snippet: "見かけ正常",
      pageHead: "x\uFFFDy",
      merged: mergeSnippetAndPageHeadForBadGuardV1("見かけ正常", "x\uFFFDy"),
      ...evaluateKokuzoBadHeuristicV1(mergeSnippetAndPageHeadForBadGuardV1("見かけ正常", "x\uFFFDy")),
    },
  ],
};

const seedIds = ["OTHER:opaque:id", "KZPAGE:KHS:P132", "KZPAGE:__no_such_doc__:P99999"];
let seed_input_filter_result;
try {
  seed_input_filter_result = {
    card: CARD,
    generatedAt: new Date().toISOString(),
    input: seedIds,
    ...filterEvidenceIdsForKokuzoBadGuardV1(seedIds),
  };
} catch (e) {
  seed_input_filter_result = {
    card: CARD,
    generatedAt: new Date().toISOString(),
    input: seedIds,
    error: String(e?.message || e),
    note: "kokuzo DB 未初期化などで失敗した場合はビルド・ロジックのみ検証",
  };
}

fs.writeFileSync(path.join(outDir, "bad_guard_audit.json"), JSON.stringify(bad_guard_audit, null, 2), "utf8");
fs.writeFileSync(
  path.join(outDir, "candidate_filter_result.json"),
  JSON.stringify(candidate_filter_result, null, 2),
  "utf8"
);
fs.writeFileSync(
  path.join(outDir, "seed_input_filter_result.json"),
  JSON.stringify(seed_input_filter_result, null, 2),
  "utf8"
);

const final_verdict = {
  card: CARD,
  generatedAt: new Date().toISOString(),
  build: "ok_assumed_run_after_tsc",
  bad_guard_audit: "written",
  candidate_filter: "written",
  seed_input_filter: seed_input_filter_result.error ? "partial" : "written",
  http: {
    health: process.env.TENMON_BAD_GUARD_CURL_HEALTH || "",
    audit: process.env.TENMON_BAD_GUARD_CURL_AUDIT || "",
  },
};

fs.writeFileSync(path.join(outDir, "final_verdict.json"), JSON.stringify(final_verdict, null, 2), "utf8");
fs.writeFileSync(
  path.join(outDir, "TENMON_A1_KOKUZO_BAD_GUARD_VPS_V1"),
  `${CARD}\n${final_verdict.generatedAt}\n`,
  "utf8"
);

console.log("[A1_BAD_GUARD] wrote:", outDir);
