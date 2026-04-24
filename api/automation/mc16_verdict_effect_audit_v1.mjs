#!/usr/bin/env node
// ============================================================
// CARD-MC-16-VERDICT-ENGINE-EFFECT-AUDIT-V1
//
// 監査対象:
//   /api/chat の decisionFrame.ku に現れる以下 4 つの judgement が、
//   実際に response 本文の生成に影響しているか:
//     - verdictEngineV1
//     - satoriVerdict
//     - irohaGrounding
//     - meaningArbitration（MC-14 で req.context に載せたが、現状
//       response に露出されていない場合は effective_in_generation は
//       判定不可 → "unobservable" として記録する）
//
// 方針:
//   - 同一質問を複数回、互いに独立した threadId で /api/chat に投げる
//     （メモリ継承なし → 差分は LLM ランダム性 + 入力独立の判定のみ）
//   - judgement の有無 / 値 と response 本文の変化を突合して
//     effective_in_generation を推定する
//
// 出力:
//   api/automation/out/mc16_verdict_effect_audit_v1.json
//
// 制約（本カード）:
//   - chat.ts / LLM prompt / response 構造に触れない（本スクリプトは
//     新規ファイルのみ）
//   - acceptance PASS を維持する（readonly）
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = process.env.MC16_API_URL || "http://127.0.0.1:3000";
const RUNS_PER_QUESTION = Number(process.env.MC16_RUNS_PER_QUESTION || 3);
const TIMEOUT_MS = Number(process.env.MC16_TIMEOUT_MS || 60_000);
const SLEEP_MS = Number(process.env.MC16_SLEEP_MS || 800);

const QUESTIONS = [
  "アとは何か？",
  "言霊とは何か？",
  "カタカムナとは何か？",
  "悩みをどう幸に転じるか？",
  "宿曜と天津金木はどうつながるか？",
];

const JUDGEMENT_KEYS = [
  "verdictEngineV1",
  "satoriVerdict",
  "irohaGrounding",
  "meaningArbitration",
];

// ---------- utilities ----------

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function postChat(message, threadId) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, threadId }),
      signal: ctrl.signal,
    });
    const status = res.status;
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return {
      ok: res.ok,
      status,
      elapsed_ms: Date.now() - started,
      body,
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      elapsed_ms: Date.now() - started,
      body: null,
      error: String(e && e.message ? e.message : e),
    };
  } finally {
    clearTimeout(t);
  }
}

function safePick(obj, key) {
  if (!obj || typeof obj !== "object") return null;
  return obj[key] ?? null;
}

function summarizeVerdictEngine(v) {
  if (!v || typeof v !== "object") return null;
  return {
    verdict: v.verdict ?? null,
    centerLabel: v.centerLabel ?? null,
    tradition: v.tradition ?? null,
    tenmon_mapping: v.tenmon_mapping ?? null,
    uncertainty: v.uncertainty ?? null,
    has_facts: typeof v.facts === "string" && v.facts.length > 0,
    facts_len: typeof v.facts === "string" ? v.facts.length : null,
    evidence_keys: v.evidence && typeof v.evidence === "object" ? Object.keys(v.evidence) : [],
  };
}

function summarizeSatori(s) {
  if (!s || typeof s !== "object") return null;
  return {
    score: s.score ?? null,
    omegaCompliant: s.omegaCompliant ?? null,
    violationCount: s.violationCount ?? null,
    highViolations: s.highViolations ?? null,
    fourPhiComplete: s.fourPhiComplete ?? null,
    truthAxisCount: s.truthAxisCount ?? null,
    truthAxisSufficient: s.truthAxisSufficient ?? null,
  };
}

function summarizeIroha(i) {
  if (!i || typeof i !== "object") return null;
  return {
    passed: i.passed ?? null,
    score: i.score ?? null,
    sounds: Array.isArray(i.sounds) ? i.sounds.slice(0, 16) : [],
    actionPattern: i.actionPattern ?? null,
    amaterasuAxis: i.amaterasuAxis ?? null,
  };
}

function summarizeMeaning(m) {
  if (!m || typeof m !== "object") return null;
  return {
    answerMode: m.answerMode ?? null,
    coreTruth: typeof m.coreTruth === "string" ? m.coreTruth.slice(0, 120) : null,
    depthPolicy: m.depthPolicy ?? null,
    danshari: m.danshari ?? null,
    supportingEvidenceCount: Array.isArray(m.supportingEvidence) ? m.supportingEvidence.length : 0,
    forbidFlags: Array.isArray(m.forbidFlags) ? m.forbidFlags : [],
  };
}

function canonicalizeJudgement(j) {
  // stable stringification (sorted keys) for comparing equality across runs
  if (j == null) return "null";
  if (typeof j !== "object") return JSON.stringify(j);
  if (Array.isArray(j)) return "[" + j.map(canonicalizeJudgement).join(",") + "]";
  const keys = Object.keys(j).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalizeJudgement(j[k])).join(",") + "}";
}

function findEchoedTokens(responseText, tokens) {
  if (!responseText || typeof responseText !== "string") return [];
  const hits = [];
  for (const t of tokens) {
    const s = String(t || "").trim();
    if (!s) continue;
    if (responseText.includes(s)) hits.push(s);
  }
  return Array.from(new Set(hits));
}

// ---------- main ----------

async function main() {
  const startedAt = new Date().toISOString();
  const cases = [];

  for (const q of QUESTIONS) {
    const runs = [];
    for (let i = 0; i < RUNS_PER_QUESTION; i++) {
      const tid = `mc16-audit-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`;
      const r = await postChat(q, tid);
      const ku = safePick(safePick(r.body, "decisionFrame"), "ku");
      const response = safePick(r.body, "response");
      const provider = safePick(safePick(r.body, "decisionFrame"), "llm");
      runs.push({
        thread_id: tid,
        http_ok: r.ok,
        status: r.status,
        elapsed_ms: r.elapsed_ms,
        error: r.error || null,
        response_len: typeof response === "string" ? response.length : null,
        response_head: typeof response === "string" ? response.slice(0, 120) : null,
        response_full: response,
        route_reason: safePick(ku, "routeReason"),
        provider,
        judgements: {
          verdictEngineV1: summarizeVerdictEngine(safePick(ku, "verdictEngineV1")),
          satoriVerdict: summarizeSatori(safePick(ku, "satoriVerdict")),
          irohaGrounding: summarizeIroha(safePick(ku, "irohaGrounding")),
          meaningArbitration: summarizeMeaning(safePick(ku, "meaningArbitration")),
        },
      });
      await sleep(SLEEP_MS);
    }

    // ---- within-question analysis ----
    const responseSet = new Set(runs.map((r) => r.response_full || ""));
    const response_changed_across_runs = responseSet.size > 1;

    const perJudgement = {};
    for (const jk of JUDGEMENT_KEYS) {
      const values = runs.map((r) => r.judgements[jk]);
      const presentRuns = values.filter((v) => v != null).length;
      const keyOrNull = values.map(canonicalizeJudgement);
      const changed = new Set(keyOrNull).size > 1;

      // echo test: does the response body literally include any
      // characteristic token from the judgement (center label / sounds / etc.)?
      const echoHits = runs.map((r) => {
        const resp = r.response_full || "";
        if (jk === "verdictEngineV1") {
          const v = r.judgements.verdictEngineV1 || {};
          return findEchoedTokens(resp, [v.centerLabel, v.tradition, v.tenmon_mapping]);
        }
        if (jk === "irohaGrounding") {
          const i = r.judgements.irohaGrounding || {};
          return findEchoedTokens(resp, [...(i.sounds || []), i.amaterasuAxis, i.actionPattern]);
        }
        if (jk === "meaningArbitration") {
          const m = r.judgements.meaningArbitration || {};
          return findEchoedTokens(resp, [m.coreTruth]);
        }
        // satoriVerdict is numeric/boolean — no echo candidates
        return [];
      });

      const echoHitRuns = echoHits.filter((h) => h.length > 0).length;
      perJudgement[jk] = {
        present_runs: presentRuns,
        value_changed_across_runs: changed,
        echo_hit_runs: echoHitRuns,
        echo_samples: echoHits.flat().slice(0, 10),
      };
    }

    cases.push({
      question: q,
      runs,
      response_changed_across_runs,
      per_judgement: perJudgement,
    });
  }

  // ---- overall aggregation ----
  const perJudgementOverall = {};
  for (const jk of JUDGEMENT_KEYS) {
    let presentRuns = 0;
    let totalRuns = 0;
    let echoHitRuns = 0;
    let valueChangedQuestions = 0;
    for (const c of cases) {
      const p = c.per_judgement[jk];
      presentRuns += p.present_runs;
      echoHitRuns += p.echo_hit_runs;
      totalRuns += c.runs.length;
      if (p.value_changed_across_runs) valueChangedQuestions += 1;
    }
    const presentRatio = totalRuns > 0 ? presentRuns / totalRuns : 0;
    const echoRatio = totalRuns > 0 ? echoHitRuns / totalRuns : 0;
    perJudgementOverall[jk] = {
      judgement_present: presentRatio > 0,
      present_run_ratio: presentRatio,
      observable_in_response: presentRatio > 0,
      value_changed_question_count: valueChangedQuestions,
      echo_hit_run_ratio: echoRatio,
      // effective_in_generation heuristic:
      //   - judgement が response に露出していない（verdict/satori 以外が response
      //     に来ない場合）: observable only → effective 判定不能（"unobservable"）
      //   - 露出しているが echo 率が 0%: response 本文に反映されていない →
      //     表示/記録のみで生成には介入していない
      //   - 露出しており、かつ echo 率 > 25%（複数質問で content が response に
      //     現れる）: 生成に介入している兆候あり
      effective_in_generation:
        presentRatio === 0
          ? "unobservable"
          : echoRatio >= 0.25,
    };
  }

  // 全体として「judgement 群は会話品質に介入しているか」:
  //   いずれかの judgement が echo_ratio >= 0.25 → true
  //   すべて present だが echo_ratio < 0.25 → false（表示のみ）
  //   meaningArbitration だけ unobservable は許容
  const effectiveArray = Object.values(perJudgementOverall)
    .map((v) => v.effective_in_generation)
    .filter((v) => v !== "unobservable");
  const anyEffective = effectiveArray.some((v) => v === true);
  const allNonEffective = effectiveArray.length > 0 && effectiveArray.every((v) => v === false);

  const recommendation = anyEffective
    ? "現行 judgement の少なくとも 1 つは response 本文に現れている。CARD-MC-15-KOTODAMA-BRIDGE-REAL-LOGIC-V1 に進んで、bridge の real logic を強化する。"
    : allNonEffective
      ? "現行 judgement は決定フレームに載っているが、response 本文への echo が極めて少ない。表示・記録のみで会話品質には未介入と判定する。次カードは CARD-MC-17-JUDGEMENT-INJECTION-DESIGN-V1 を先に設計すべき。"
      : "judgement の present 率が不足しているためサンプル不足。RUNS_PER_QUESTION を増やすか question セットを広げて再測定する。";

  const payload = {
    schema_version: "mc16_verdict_effect_audit_v1",
    generated_at: new Date().toISOString(),
    started_at: startedAt,
    runtime: {
      api_url: API_URL,
      node_version: process.version,
      runs_per_question: RUNS_PER_QUESTION,
      total_questions: QUESTIONS.length,
    },
    total_cases: cases.length * RUNS_PER_QUESTION,
    question_count: cases.length,
    response_changed_by_judgement: cases.some((c) => c.response_changed_across_runs),
    judgement_present: Object.fromEntries(
      Object.entries(perJudgementOverall).map(([k, v]) => [k, v.judgement_present]),
    ),
    effective_in_generation: Object.fromEntries(
      Object.entries(perJudgementOverall).map(([k, v]) => [k, v.effective_in_generation]),
    ),
    per_judgement_overall: perJudgementOverall,
    cases,
    recommendation,
  };

  const outDir = path.join(__dirname, "out");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "mc16_verdict_effect_audit_v1.json");
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");

  // brief stdout summary
  console.log("[MC16-AUDIT] wrote", outPath);
  console.log(
    "[MC16-AUDIT] total_cases:",
    payload.total_cases,
    "| response_changed_by_judgement:",
    payload.response_changed_by_judgement,
  );
  console.log(
    "[MC16-AUDIT] judgement_present:",
    JSON.stringify(payload.judgement_present),
  );
  console.log(
    "[MC16-AUDIT] effective_in_generation:",
    JSON.stringify(payload.effective_in_generation),
  );
  console.log("[MC16-AUDIT] recommendation:", payload.recommendation);
}

main().catch((e) => {
  console.error("[MC16-AUDIT] FATAL:", e && e.stack ? e.stack : e);
  process.exit(1);
});
