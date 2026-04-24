#!/usr/bin/env node
// CARD-MC-16-V2-CONTEXT-INJECTION-EFFECT-AUDIT-V1
// prompt 注入メタ（__debug_injections）と応答本文の相関・多様性を集計する。
// 事前: API 側で TENMON_MC_DEBUG_INJECTION_ENDPOINT=1 を有効化し、
//       TENMON_MC_CLAUDE_READ_TOKEN をスクリプト環境に渡す。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = process.env.MC16V2_API_URL || "http://127.0.0.1:3000";
let TOKEN = String(process.env.TENMON_MC_CLAUDE_READ_TOKEN || "").trim();
const TOKEN_FILE = String(process.env.MC16V2_TOKEN_FILE || "").trim();
if (!TOKEN && TOKEN_FILE) {
  try {
    TOKEN = fs.readFileSync(TOKEN_FILE, "utf8").trim().split(/\r?\n/)[0].trim();
  } catch {
    /* ignore */
  }
}
const TIMEOUT_MS = Number(process.env.MC16V2_TIMEOUT_MS || 90_000);
const SLEEP_MS = Number(process.env.MC16V2_SLEEP_MS || 600);

const QUESTIONS = [
  "アとは何か？",
  "言霊とは何か？",
  "カタカムナとは何か？",
  "悩みをどう幸に転じるか？",
  "宿曜と天津金木はどうつながるか？",
];

const RUNS_PER_Q = 3;
const INJECTION_SLOTS = [
  "inject_kotodama_hisho",
  "inject_iroha",
  "inject_kotodama_genten",
  "inject_unified_sound",
  "inject_amaterasu_axis",
  "inject_kotodama_connector",
  "inject_truth_axis",
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function countChatTsImports() {
  const p = path.join(__dirname, "../src/routes/chat.ts");
  const src = fs.readFileSync(p, "utf8");
  let n = 0;
  for (const line of src.split("\n")) {
    if (/^\s*import\s+/.test(line)) n += 1;
  }
  return n;
}

function tokenSetForJaccard(text) {
  const t = String(text || "").replace(/\s+/g, "");
  const set = new Set();
  for (let i = 0; i + 1 < t.length; i++) {
    set.add(t.slice(i, i + 2));
  }
  return set;
}

function jaccardSimilarity(a, b) {
  const A = tokenSetForJaccard(a);
  const B = tokenSetForJaccard(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  const union = A.size + B.size - inter;
  if (union === 0) return 1;
  return inter / union;
}

function avgThreeResponseJaccard(texts) {
  if (texts.length < 2) return 1;
  const pairs = [];
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      pairs.push(jaccardSimilarity(texts[i], texts[j]));
    }
  }
  return pairs.reduce((s, x) => s + x, 0) / pairs.length;
}

function mean(arr) {
  const a = arr.filter((x) => typeof x === "number" && !Number.isNaN(x));
  if (!a.length) return 0;
  return a.reduce((s, x) => s + x, 0) / a.length;
}

function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  const x = xs.slice(0, n);
  const y = ys.slice(0, n);
  const mx = mean(x);
  const my = mean(y);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const vx = x[i] - mx;
    const vy = y[i] - my;
    num += vx * vy;
    dx += vx * vx;
    dy += vy * vy;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
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
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { ok: res.ok, status: res.status, elapsed_ms: Date.now() - started, body };
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

async function getLastInjection() {
  if (!TOKEN) return { ok: false, error: "NO_TOKEN", body: null };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(`${API_URL}/api/mc/vnext/debug/last-injection`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      signal: ctrl.signal,
    });
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    return { ok: false, status: 0, error: String(e && e.message ? e.message : e) };
  } finally {
    clearTimeout(t);
  }
}

function pickInject(injections, slot) {
  if (!injections || typeof injections !== "object") return {};
  return injections[slot] && typeof injections[slot] === "object" ? injections[slot] : {};
}

function num(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

async function main() {
  const tokenConfigured = TOKEN.length >= 24;
  if (!tokenConfigured) {
    console.warn(
      "[mc16v2] TENMON_MC_CLAUDE_READ_TOKEN 未設定のため注入メタは取得できません（応答多様性のみ集計）。本番監査時はトークンと TENMON_MC_DEBUG_INJECTION_ENDPOINT=1 を設定してください。",
    );
  }

  const chatImports = countChatTsImports();
  const perQuestion = [];
  const allRuns = [];

  for (const question of QUESTIONS) {
    const runs = [];
    for (let i = 0; i < RUNS_PER_Q; i++) {
      const threadId = `mc16v2-${randomUUID()}`;
      const chat = await postChat(question, threadId);
      await sleep(SLEEP_MS);
      const inj = await getLastInjection();

      const responseText =
        chat.body && typeof chat.body.response === "string" ? chat.body.response : "";
      const ku =
        chat.body && chat.body.decisionFrame && chat.body.decisionFrame.ku
          ? chat.body.decisionFrame.ku
          : {};
      const injBody = inj.body && inj.body.injections ? inj.body.injections : {};

      const h = pickInject(injBody, "inject_kotodama_hisho");
      const ir = pickInject(injBody, "inject_iroha");
      const ge = pickInject(injBody, "inject_kotodama_genten");
      const un = pickInject(injBody, "inject_unified_sound");
      const am = pickInject(injBody, "inject_amaterasu_axis");
      const tr = pickInject(injBody, "inject_truth_axis");
      const ko = pickInject(injBody, "inject_kotodama_connector");

      const totalInjectedChars =
        num(h.clause_len) +
        num(ir.clause_len) +
        num(ge.clause_len) +
        num(un.clause_len) +
        num(am.clause_len) +
        num(tr.clause_len) +
        num(ko.clause_len);

      const injectedModulesCount = INJECTION_SLOTS.filter((slot) => {
        const o = pickInject(injBody, slot);
        return num(o.clause_len) > 0 || (slot === "inject_iroha" && num(o.matched_units) > 0);
      }).length;

      const runRow = {
        question,
        run_index: i,
        threadId,
        chat_ok: chat.ok,
        chat_status: chat.status,
        response_text: responseText,
        response_length: responseText.length,
        injection_fetch_ok: inj.ok,
        injection_status: inj.status,
        inject_meta: injBody,
        decisionFrame_ku_subset: {
          verdictEngineV1: ku.verdictEngineV1 ?? null,
          satoriVerdict: ku.satoriVerdict ?? null,
          irohaGrounding: ku.irohaGrounding ?? null,
        },
        total_injected_chars: totalInjectedChars,
        injected_modules_count: injectedModulesCount,
      };
      runs.push(runRow);
      allRuns.push(runRow);
      if (!chat.ok) {
        console.warn(`[mc16v2] chat fail q=${question} i=${i} status=${chat.status}`);
      }
      if (!inj.ok) {
        console.warn(
          `[mc16v2] injection fetch fail status=${inj.status ?? "n/a"} err=${inj.error || inj.body?.error || ""}`,
        );
      }
    }

    const texts = runs.map((r) => r.response_text).filter(Boolean);
    const jacc = avgThreeResponseJaccard(texts);
    const lens = runs.map((r) => r.response_length);
    const avgRespLen = mean(lens);

    const hLens = runs.map((r) => num(pickInject(r.inject_meta, "inject_kotodama_hisho").clause_len));
    const kotodamaWordHits = runs.map((r) => (String(r.response_text).match(/言霊/g) || []).length);
    const corrHishoKotodama = pearson(hLens, kotodamaWordHits);

    const iUnits = runs.map((r) => num(pickInject(r.inject_meta, "inject_iroha").matched_units));
    const irohaWordHits = runs.map((r) => (String(r.response_text).match(/いろは/g) || []).length);
    const corrIroha = pearson(iUnits, irohaWordHits);

    const uLens = runs.map((r) => num(pickInject(r.inject_meta, "inject_unified_sound").clause_len));
    const unifiedCorr = pearson(uLens, lens);

    const phases = runs.map((r) => String(pickInject(r.inject_meta, "inject_amaterasu_axis").phase || ""));
    const phaseDistinct = new Set(phases).size;
    const exclaim = runs.map((r) => (String(r.response_text).match(/！|!/g) || []).length);
    const corrAmaterasuTone = pearson(phases.map((p) => p.length), exclaim);

    const axCounts = runs.map(
      (r) => (pickInject(r.inject_meta, "inject_truth_axis").axes || []).length,
    );
    const logicalMarkers = runs.map(
      (r) => (String(r.response_text).match(/つまり|したがって|なぜなら|第一に|第二に/g) || []).length,
    );
    const corrTruthLogic = pearson(axCounts, logicalMarkers);

    const gLens = runs.map((r) => num(pickInject(r.inject_meta, "inject_kotodama_genten").clause_len));
    const katakamunaHits = runs.map((r) => (String(r.response_text).match(/カタカムナ/g) || []).length);
    const corrGenten = pearson(gLens, katakamunaHits);

    const kConnLens = runs.map((r) => num(pickInject(r.inject_meta, "inject_kotodama_connector").clause_len));
    const tenchinHits = runs.map((r) => (String(r.response_text).match(/天津金木/g) || []).length);
    const corrConnector = pearson(kConnLens, tenchinHits);

    perQuestion.push({
      question,
      avg_response_length: avgRespLen,
      response_jaccard_similarity: jacc,
      phase_distinct_count: phaseDistinct,
      injection_stats: {
        kotodama_hisho: {
          avg_clause_len: mean(hLens),
          appearance_correlation: corrHishoKotodama,
          keyword: "言霊",
        },
        iroha: {
          avg_matched_units: mean(iUnits),
          avg_clause_len: mean(runs.map((r) => num(pickInject(r.inject_meta, "inject_iroha").clause_len))),
          appearance_correlation: corrIroha,
          keyword: "いろは",
        },
        kotodama_genten: {
          avg_clause_len: mean(gLens),
          appearance_correlation: corrGenten,
          keyword: "カタカムナ",
        },
        unified_sound: {
          avg_clause_len: mean(uLens),
          response_length_correlation: unifiedCorr,
        },
        amaterasu_axis: {
          avg_clause_len: mean(runs.map((r) => num(pickInject(r.inject_meta, "inject_amaterasu_axis").clause_len))),
          phase_tone_proxy_correlation: corrAmaterasuTone,
        },
        truth_axis: {
          avg_axis_rows: mean(axCounts),
          avg_clause_len: mean(runs.map((r) => num(pickInject(r.inject_meta, "inject_truth_axis").clause_len))),
          logic_marker_correlation: corrTruthLogic,
        },
        kotodama_connector: {
          avg_clause_len: mean(kConnLens),
          appearance_correlation: corrConnector,
          keyword: "天津金木",
        },
      },
    });
  }

  const avgPromptChars = mean(allRuns.map((r) => r.total_injected_chars));
  const avgRespAll = mean(allRuns.map((r) => r.response_length));
  const ratio = avgRespAll > 0 ? avgPromptChars / avgRespAll : 0;

  const modKeys = [
    ["kotodama_hisho", (pq) => pq.injection_stats.kotodama_hisho.appearance_correlation],
    ["iroha", (pq) => pq.injection_stats.iroha.appearance_correlation],
    ["kotodama_genten", (pq) => pq.injection_stats.kotodama_genten.appearance_correlation],
    ["unified_sound", (pq) => pq.injection_stats.unified_sound.response_length_correlation],
    ["amaterasu_axis", (pq) => pq.injection_stats.amaterasu_axis.phase_tone_proxy_correlation],
    ["truth_axis", (pq) => pq.injection_stats.truth_axis.logic_marker_correlation],
    ["kotodama_connector", (pq) => pq.injection_stats.kotodama_connector.appearance_correlation],
  ];

  const strengthByMod = {};
  for (const [name, pick] of modKeys) {
    const vals = perQuestion.map((pq) => pick(pq)).filter((x) => x !== null && !Number.isNaN(x));
    strengthByMod[name] = vals.length ? mean(vals.map(Math.abs)) : 0;
  }

  let top_influential_module = "kotodama_hisho";
  let best = -1;
  for (const [k, v] of Object.entries(strengthByMod)) {
    if (v > best) {
      best = v;
      top_influential_module = k;
    }
  }

  const low_influence_modules = Object.entries(strengthByMod)
    .filter(([, v]) => v < 0.08)
    .map(([k]) => k);

  const outDir = path.join(__dirname, "out");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "mc16v2_context_injection_audit.json");

  const rationaleParts = [
    "truth_axis は detect/build が走るが prompt_injected:false の観測のみ。",
    "kotodamaOneSoundLawIndex は chat.ts に直接 import されず、NATURAL 本線の GEN_SYSTEM 合成には buildKotodamaClause が未連結（一音索引は宿曜 CARRY 経路と probe のみ）。要配線。",
    "kotodamaKatakamunaAmatsuBridgeV1 は req.context のみで stub のため prompt 非寄与。",
  ];
  if (!tokenConfigured) {
    rationaleParts.push(
      "本実行は Bearer 未取得のため inject_* clause_len は 0 扱い。実測は TENMON_MC_CLAUDE_READ_TOKEN と TENMON_MC_DEBUG_INJECTION_ENDPOINT=1 を設定して再実行すること。",
    );
  }

  const recommendation = {
    highest_priority:
      best < 0.05
        ? "観測された相関が弱い。GEN_SYSTEM への truth_axis / kotodama_connector の本配線か、注入物の情報密度強化を検討する。"
        : `${top_influential_module} 周辺のキーワード／長さとの相対が最も読み取れる。同モジュールの原典密度・一貫性を上げると応答への痕跡が追いやすくなる。`,
    next_card:
      "CARD-MC-17-TRUTH-AXIS-PROMPT-WIRE-V1 | CARD-MC-18-KOTODAMA-CONNECTOR-NATURAL-WIRE-V1",
    rationale: rationaleParts.join(""),
  };

  const payload = {
    generated_at: new Date().toISOString(),
    audit_token_configured: tokenConfigured,
    audit_note: tokenConfigured
      ? null
      : "inject_* は Bearer + TENMON_MC_DEBUG_INJECTION_ENDPOINT=1 がないと取得できませんでした。",
    chat_ts_imports_total: chatImports,
    injection_modules_measured: 7,
    total_runs: allRuns.length,
    per_question_analysis: perQuestion,
    overall: {
      top_influential_module,
      low_influence_modules,
      unwired_candidate_modules: [
        "kotodamaOneSoundLawIndex（chat.ts から直接 import/call なし・NATURAL 本線の GEN_SYSTEM 合成に buildKotodamaClause 未連結）",
      ],
      stub_modules: ["kotodamaKatakamunaAmatsuBridgeV1（req.context のみ・stub のため prompt 注入なし）"],
      prompt_total_avg_chars: avgPromptChars,
      prompt_vs_response_ratio: ratio,
      truth_axis_observed_prompt_injected: false,
    },
    recommendation,
    runs_raw_summary: {
      chat_all_ok: allRuns.every((r) => r.chat_ok),
      injection_fetch_all_ok: allRuns.every((r) => r.injection_fetch_ok),
    },
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
