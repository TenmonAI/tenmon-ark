/**
 * CARD-MC-HANDOFF-V1:
 *   新 AI トークルーム起動時に TENMON が 1 コマンドで前会話の文脈を継承できる
 *   handoff プロンプト生成器。claude-summary + 完了カード + 推奨カード +
 *   運用原則を 1 枚の markdown / text に束ねる。
 *
 * 使い方:
 *   GET /api/mc/vnext/handoff-prompt?ai=claude&format=markdown
 *   → Content-Type: text/markdown; 10000 文字以内の 1 枚コピペで継承可能。
 *
 * format:
 *   - markdown  (default): fenced json block 付き、AI 指示フル本文
 *   - text    : markdown と同一構造だが fenced block を使わない（端末向け）
 *   - json    : { ai, prompt, sections, meta } 構造の JSON（自動化用）
 *
 * ai:
 *   - claude  (default)
 *   - gpt
 *   - cursor
 *   - generic
 */
import os from "node:os";
import path from "node:path";
import { getTenmonDataDir } from "../../db/index.js";
import { buildClaudeSummaryPayloadV1 } from "./claudeSummaryV1.js";
import { buildVnextHistoryPayload } from "../history/mcSystemHistoryV1.js";
import { buildDeepIntelligencePayloadV1 } from "../intelligence/deepIntelligenceMapV1.js";

export type HandoffAiV1 = "claude" | "gpt" | "cursor" | "generic";
export type HandoffFormatV1 = "markdown" | "text" | "json";

const MAX_PROMPT_LEN = 10000;

function clampAi(v: unknown): HandoffAiV1 {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "gpt" || s === "claude" || s === "cursor") return s;
  return "claude";
}

function clampFormat(v: unknown): HandoffFormatV1 {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "json" || s === "text" || s === "markdown") return s;
  return "markdown";
}

function aiDisplayName(ai: HandoffAiV1): string {
  switch (ai) {
    case "gpt": return "GPT";
    case "cursor": return "Cursor";
    case "generic": return "AI";
    case "claude":
    default: return "Claude";
  }
}

function aiRoleLine(ai: HandoffAiV1): string {
  switch (ai) {
    case "gpt":
      return "あなたは天聞アークの GPT 側監督です。運用状態を把握し、次の最小 diff カードを起案する役割です。";
    case "cursor":
      return "あなたは天聞アーク VPS 上で実装を担当する Cursor エージェントです。TENMON からの指示カードを診断なしで実行します。";
    case "generic":
      return "あなたは天聞アークの AI 監督です。運用状態を継承し、次の一手を提案してください。";
    case "claude":
    default:
      return "あなたは天聞アークの Claude 側監督です。運用状態を把握し、次の最小 diff カードを起案する役割です。";
  }
}

/**
 * JSON を fenced block 付き markdown で埋め込むときの安全化。
 * ` ``` ` が JSON 中に現れないよう、念のため置換しておく。
 */
function safeJsonForMarkdown(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2).replace(/```/g, "` ` `");
  } catch {
    return "{}";
  }
}

/**
 * 10000 文字制限を満たすため、JSON を aggressively compact 化する。
 * handoff プロンプト用途では主要シグナル（verdict / 最新カード / 推奨カード /
 * active_alerts / continuation 指標 / git 状態）だけあれば十分。
 * 詳細は /api/mc/vnext/claude-summary 等の endpoint に HTTP 再取得させればよい。
 */
function pickRecord(src: unknown, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const obj = src && typeof src === "object" && !Array.isArray(src) ? (src as Record<string, unknown>) : null;
  if (!obj) return out;
  for (const k of keys) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

function buildIntelligenceMapSectionMd(): string {
  const intel = buildDeepIntelligencePayloadV1() as Record<string, unknown>;
  const sum = (intel.summary ?? {}) as Record<string, unknown>;
  const fifty = (intel.fifty_sounds ?? {}) as Record<string, unknown>;
  const fire = (intel.fire_24h ?? {}) as Record<string, unknown>;
  const det = (intel.detail ?? {}) as {
    wired_modules?: Array<{ name: string; role: string }>;
    stub_modules?: Array<{ name: string; gap?: string }>;
    unwired_candidates?: Array<{ name: string; status: string; role?: string }>;
    post_generation_judgement?: Array<{ name: string; role: string }>;
  };
  const wired = Array.isArray(det.wired_modules) ? det.wired_modules : [];
  const stub = Array.isArray(det.stub_modules) ? det.stub_modules : [];
  const unw = Array.isArray(det.unwired_candidates) ? det.unwired_candidates : [];
  const post = Array.isArray(det.post_generation_judgement) ? det.post_generation_judgement : [];
  const fr = sum.fire_ratio_24h != null ? Number(sum.fire_ratio_24h) : Number(fire.avg_fire_ratio) || 0;
  const cov = sum.kotodama_50_coverage != null ? Number(sum.kotodama_50_coverage) : Number(fifty.coverage_ratio) || 0;
  const khsR = sum.khs_10_axes_wired_ratio != null ? Number(sum.khs_10_axes_wired_ratio) : 0;
  const lines = [
    `## 深層知能マップ (MC-19)`,
    `- **GEN prompt 注入（観測）**: ${sum.total_wired ?? "—"} modules · **shadow**: ${sum.total_shadow ?? "—"} · **dead/unwired 目安**: ${sum.total_dead_or_unwired ?? "—"}`,
    `- **五十音 INDEX 覆面率**: ${(cov * 100).toFixed(0)}%（wired_to_chat: ${String(fifty.wired_to_chat ?? "—")}）`,
    `- **KHS 10 軸 wired 率（宣言）**: ${(khsR * 100).toFixed(0)}%`,
    `- **DB 知能**: ${intel.db_total_rows} rows / ${intel.db_tables} tables`,
    `- **24h 発火（avg slot fill）**: ${(fr * 100).toFixed(0)}% · events=${sum.fire_events_24h ?? fire.events_in_window ?? "—"} · GET \`/api/mc/vnext/intelligence/fire\``,
    `- 一覧 JSON: GET \`/api/mc/vnext/intelligence\`（Bearer / MC 認証）`,
    ``,
    `### 最大の眠れる／未配線（抜粋）`,
    ...unw.slice(0, 4).map((m) => `- **${m.name}** — ${m.role}`),
    unw.length > 4 ? `- … 他 ${unw.length - 4} 件` : "",
    ``,
    `### wired（抜粋）`,
    ...wired.slice(0, 8).map((m) => `- **${m.name}** — ${m.role}`),
    wired.length > 8 ? `- … 他 ${wired.length - 8} 件` : "",
    ``,
    `### stub`,
    ...stub.map((m) => `- **${m.name}** — ${String(m.gap || "").slice(0, 120)}`),
    ``,
    `### 事後 judgement`,
    ...post.map((m) => `- **${m.name}** — ${m.role}`),
  ].filter((x) => x !== "");
  return lines.join("\n");
}

function compactSummaryForHandoff(summary: Record<string, unknown>): Record<string, unknown> {
  const overview = (summary.overview_summary ?? {}) as Record<string, unknown>;
  const continuation = (overview.continuation_summary ?? {}) as Record<string, unknown>;
  const acc = (summary.acceptance ?? {}) as Record<string, unknown>;
  const rh = (summary.repair_hub ?? {}) as Record<string, unknown>;
  const ss = (summary.source_summary ?? {}) as Record<string, unknown>;
  const intelFull = (summary.intelligence ?? {}) as Record<string, unknown>;

  const checksSlim = Array.isArray(acc.checks)
    ? (acc.checks as Record<string, unknown>[])
        .slice(0, 8)
        .map((c) => ({
          id: String(c.id ?? ""),
          status: String(c.status ?? ""),
          detail: String(c.detail ?? "").slice(0, 160),
        }))
    : [];
  const cardsSlim = Array.isArray(rh.cards)
    ? (rh.cards as Record<string, unknown>[])
        .slice(0, 5)
        .map((c) => ({
          id: String(c.id ?? c.card_id ?? ""),
          priority: c.priority ?? null,
          title: String(c.title ?? c.label ?? c.suggested_fix_area ?? c.message ?? "").slice(0, 160),
        }))
    : [];
  const problematicSlim = Array.isArray(summary.top_problematic_threads)
    ? (summary.top_problematic_threads as Record<string, unknown>[])
        .slice(0, 3)
        .map((p) => ({
          thread_id: String(p.thread_id ?? ""),
          turn_index: p.turn_index ?? null,
          reason: String(p.reason ?? ""),
          detail: String(p.detail ?? "").slice(0, 120),
          last_ts: String(p.last_ts ?? ""),
        }))
    : [];
  const alertsSlim = Array.isArray(summary.active_alerts)
    ? (summary.active_alerts as Record<string, unknown>[])
        .slice(0, 6)
        .map((a) => ({
          severity: String(a.severity ?? ""),
          category: String(a.category ?? ""),
          message: String(a.message ?? "").slice(0, 160),
        }))
    : [];
  const passedSlim = Array.isArray(summary.latest_passed_cards)
    ? (summary.latest_passed_cards as Record<string, unknown>[])
        .slice(0, 5)
        .map((c) => ({
          card_id: String(c.card_id ?? c.id ?? ""),
          title: String(c.title ?? c.label ?? "").slice(0, 140),
        }))
    : [];
  const gapsSlim = Array.isArray(summary.current_open_gaps)
    ? (summary.current_open_gaps as Record<string, unknown>[]).slice(0, 5)
    : [];
  const canonicalSlim = Array.isArray(ss.top_canonical)
    ? (ss.top_canonical as Record<string, unknown>[])
        .slice(0, 5)
        .map((s) => ({
          id: String(s.id ?? ""),
          source_name: String(s.source_name ?? "").slice(0, 120),
          source_kind: String(s.source_kind ?? ""),
        }))
    : [];

  const compact: Record<string, unknown> = {
    schema_version: summary.schema_version ?? "mc_claude_summary_v1",
    generated_at: summary.generated_at ?? null,
    overview_summary: {
      git_head: overview.git_head ?? null,
      branch: overview.branch ?? null,
      commit_message: overview.commit_message ?? null,
      acceptance_status: overview.acceptance_status ?? null,
      continuation_summary: pickRecord(continuation, [
        "follow_up_success_rate",
        "continuation_memory_hit_live",
        "continuation_sample_count_live",
        "turn0_never_persisted_rate",
        "verdict_short",
        "verdict_short_v2",
      ]),
    },
    acceptance: {
      verdict: acc.verdict ?? null,
      why_now: acc.why_now ?? null,
      nextRecommendedCard: acc.nextRecommendedCard ?? null,
      top_affected_layer: acc.top_affected_layer ?? null,
      lastVerifiedAt: acc.lastVerifiedAt ?? null,
      live_problematic_thread_count: acc.live_problematic_thread_count ?? null,
      archived_problematic_thread_count: acc.archived_problematic_thread_count ?? null,
      checks: checksSlim,
    },
    repair_hub: {
      total_candidates: rh.total_candidates ?? null,
      cards: cardsSlim,
    },
    latest_passed_cards: passedSlim,
    current_open_gaps: gapsSlim,
    top_problematic_threads: problematicSlim,
    active_alerts: alertsSlim,
    source_summary: {
      verdict_short: ss.verdict_short ?? null,
      canonical_count: ss.canonical_count ?? null,
      graph_edge_count: ss.graph_edge_count ?? null,
      top_canonical: canonicalSlim,
    },
    intelligence: pickRecord(intelFull, [
      "wired_count",
      "stub_count",
      "unwired_candidate_count",
      "post_generation_count",
      "db_total_rows",
      "db_tables",
      "chat_ts_imports",
      "fire_ratio_24h",
      "fire_events_24h",
      "kotodama_50_coverage",
      "khs_10_axes_wired_ratio",
      "endpoint",
      "fire_endpoint",
      "wired_names",
      "stub_names",
      "unwired_names",
      "post_judgement_names",
    ]),
    last_verified_at: summary.last_verified_at ?? null,
  };
  return compact;
}

function renderCardListMd(cards: unknown, limit = 5): string {
  if (!Array.isArray(cards) || cards.length === 0) return "- (なし)";
  return (cards as Record<string, unknown>[])
    .slice(0, limit)
    .map((c) => {
      const id = String(c.card_id ?? c.id ?? "CARD-?");
      const title = String(c.title ?? c.label ?? c.short_title ?? c.summary ?? "").slice(0, 140);
      return `- ${id}: ${title || "(title 未取得)"}`;
    })
    .join("\n");
}

function renderRepairCardsMd(cards: unknown, limit = 5): string {
  if (!Array.isArray(cards) || cards.length === 0) return "- (修復ハブに候補なし)";
  return (cards as Record<string, unknown>[])
    .slice(0, limit)
    .map((c) => {
      const id = String(c.id ?? c.card_id ?? "CARD-?");
      const title = String(
        c.title ?? c.label ?? c.suggested_fix_area ?? c.message ?? "",
      ).slice(0, 140);
      const priority = c.priority != null ? ` (priority=${c.priority})` : "";
      return `- ${id}: ${title || "(title 未取得)"}${priority}`;
    })
    .join("\n");
}

function renderAlertsMd(alerts: unknown, limit = 5): string {
  if (!Array.isArray(alerts) || alerts.length === 0) return "- (active alert なし)";
  return (alerts as Record<string, unknown>[])
    .slice(0, limit)
    .map((a) => {
      const sev = String(a.severity ?? "?");
      const cat = String(a.category ?? "");
      const msg = String(a.message ?? "").slice(0, 160);
      return `- [${sev}] ${cat}: ${msg}`;
    })
    .join("\n");
}

function meta(summary: Record<string, unknown>): {
  generated_at: string;
  git_head: string;
  branch: string;
  host: string;
  db_path: string;
  verdict: string;
} {
  const overview = (summary.overview_summary ?? {}) as Record<string, unknown>;
  const acceptance = (summary.acceptance ?? {}) as Record<string, unknown>;
  let dbPath = "/opt/tenmon-ark-data/kokuzo.sqlite";
  try {
    dbPath = path.join(getTenmonDataDir(), "kokuzo.sqlite");
  } catch {
    /* ignore */
  }
  return {
    generated_at: String(summary.generated_at ?? new Date().toISOString()),
    git_head: String(overview.git_head ?? "unknown"),
    branch: String(overview.branch ?? "unknown"),
    host: (() => {
      try {
        return os.hostname();
      } catch {
        return "unknown";
      }
    })(),
    db_path: dbPath,
    verdict: String(acceptance.verdict ?? "—"),
  };
}

function buildHeaderLines(ai: HandoffAiV1, m: ReturnType<typeof meta>): string {
  return [
    `# 天聞アーク (TENMON-ARK) 継承プロンプト`,
    `# generated_at: ${m.generated_at}`,
    `# git_head: ${m.git_head}`,
    `# branch: ${m.branch}`,
    `# ai: ${aiDisplayName(ai)}`,
    `# acceptance_verdict: ${m.verdict}`,
  ].join("\n");
}

function buildProjectOverview(m: ReturnType<typeof meta>): string {
  return [
    `## プロジェクト概要`,
    `- /mc/ AI-HUB 上で GPT / Claude / TENMON 共通の状態を持つ`,
    `- VPS: root@${m.host}`,
    `- DB: ${m.db_path}`,
    `- 運用原則: OBSERVE → DECIDE → PATCH → VERIFY → VERDICT`,
    `- 実装原則: 最小 diff / 既存 API 退行禁止 / VERIFY なしで完了扱いしない`,
  ].join("\n");
}

function buildRoleSection(ai: HandoffAiV1): string {
  const lines = [
    `## あなたの役割`,
    aiRoleLine(ai),
    `- 実データ（claude-summary / ledger）のみを根拠に分析する`,
    `- 次の最小 diff カードを起案し、Cursor への指示文として TENMON に渡す`,
    `- 既存 check / alerts を壊さないかを VERIFY 段階で確認する`,
  ];
  return lines.join("\n");
}

function buildClosingInstruction(): string {
  return [
    `## 依頼`,
    `上記の現在状態と完了履歴を踏まえ、`,
    `1. 観測できる重大な事実（FAIL / WATCH / ALERT）`,
    `2. 次の最小 diff カード（候補1本＋予備2本）`,
    `3. そのカードの VERIFY 手順`,
    `を簡潔に提案してください。`,
  ].join("\n");
}

function buildMarkdownV1(params: {
  ai: HandoffAiV1;
  summary: Record<string, unknown>;
  history: Record<string, unknown> | null;
  includeHistory: boolean;
}): string {
  const { ai, summary, includeHistory, history } = params;
  const m = meta(summary);

  const overviewSummary = (summary.overview_summary ?? {}) as Record<string, unknown>;
  const acceptance = (summary.acceptance ?? {}) as Record<string, unknown>;
  const repairHub = (summary.repair_hub ?? {}) as Record<string, unknown>;

  const continuation = (overviewSummary.continuation_summary ?? {}) as Record<string, unknown>;
  const continuationShort = String(
    continuation.verdict_short_v2 ?? continuation.verdict_short ?? "—",
  );

  const nextCard = String(acceptance.nextRecommendedCard ?? "—");
  const whyNow = String(acceptance.why_now ?? "—");

  const latestPassed = renderCardListMd(summary.latest_passed_cards, 5);
  const repairCards = renderRepairCardsMd(repairHub.cards, 5);
  const alerts = renderAlertsMd(summary.active_alerts, 6);

  const sections: string[] = [
    buildHeaderLines(ai, m),
    "",
    buildProjectOverview(m),
    "",
    `## 現在状態 サマリ`,
    `- acceptance.verdict: ${m.verdict}`,
    `- why_now: ${whyNow}`,
    `- continuation: ${continuationShort}`,
    `- next_recommended_card: ${nextCard}`,
    "",
    `## 直近 5 件の完了カード`,
    latestPassed,
    "",
    `## 次の推奨カード候補 (repair_hub)`,
    repairCards,
    "",
    `## Active alerts (上位 6)`,
    alerts,
    "",
    buildIntelligenceMapSectionMd(),
    "",
  ];

  // claude-summary 全文（可能なら full、溢れるなら compact）
  const primaryJson = safeJsonForMarkdown(summary);
  const draft1 = [
    ...sections,
    `## 現在状態 (claude-summary 全文)`,
    "```json",
    primaryJson,
    "```",
    "",
    buildRoleSection(ai),
    "",
    buildClosingInstruction(),
  ].join("\n");

  if (draft1.length <= MAX_PROMPT_LEN && !includeHistory) return draft1;

  // history を追加する場合 or 溢れた場合は compact 化してから再組立て
  const compactSummary = compactSummaryForHandoff({ ...summary });
  const compactJson = safeJsonForMarkdown(compactSummary);
  const historyBlock: string[] = [];
  if (includeHistory && history) {
    const compactHistory = {
      latest_passed_cards: Array.isArray(history.latest_passed_cards)
        ? (history.latest_passed_cards as unknown[]).slice(0, 12)
        : [],
      current_open_gaps: Array.isArray(history.current_open_gaps)
        ? (history.current_open_gaps as unknown[]).slice(0, 8)
        : [],
      last_verified_at: history.last_verified_at ?? null,
      history_event_count: history.history_event_count ?? null,
    };
    historyBlock.push(
      "",
      `## mcSystemHistory (compact)`,
      "```json",
      safeJsonForMarkdown(compactHistory),
      "```",
    );
  }

  const draft2 = [
    ...sections,
    `## 現在状態 (claude-summary compact)`,
    "```json",
    compactJson,
    "```",
    ...historyBlock,
    "",
    buildRoleSection(ai),
    "",
    buildClosingInstruction(),
  ].join("\n");

  if (draft2.length <= MAX_PROMPT_LEN) return draft2;

  // それでも溢れる場合は history を落とす最終手段
  const draft3 = [
    ...sections,
    `## 現在状態 (claude-summary compact)`,
    "```json",
    compactJson,
    "```",
    "",
    buildRoleSection(ai),
    "",
    buildClosingInstruction(),
    "",
    `> NOTE: mcSystemHistory は 10000 文字制限のため省略しました（/api/mc/vnext/history 参照）。`,
  ].join("\n");

  if (draft3.length <= MAX_PROMPT_LEN) return draft3;

  // 最終: hard truncate (先頭と末尾の指示は残す)
  const marker = `\n\n> NOTE: 10000 文字制限のため一部省略されました。\n`;
  return draft3.slice(0, MAX_PROMPT_LEN - marker.length) + marker;
}

function markdownToPlainText(md: string): string {
  return md
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .replace(/^# /gm, "")
    .replace(/^## /gm, "■ ")
    .replace(/^- /gm, "・ ");
}

export type HandoffPromptOptionsV1 = {
  ai?: HandoffAiV1 | string;
  format?: HandoffFormatV1 | string;
  includeHistory?: boolean;
};

export type HandoffPromptResultV1 = {
  ok: true;
  schema_version: "mc_handoff_prompt_v1";
  ai: HandoffAiV1;
  format: HandoffFormatV1;
  meta: ReturnType<typeof meta>;
  prompt: string;
  summary: Record<string, unknown>;
  history?: Record<string, unknown> | null;
  truncated: boolean;
  char_count: number;
};

export function buildHandoffPromptV1(
  opts: HandoffPromptOptionsV1 = {},
): HandoffPromptResultV1 {
  const ai = clampAi(opts.ai);
  const format = clampFormat(opts.format);
  const includeHistory = Boolean(opts.includeHistory);

  const summary = buildClaudeSummaryPayloadV1();
  const history = includeHistory ? buildVnextHistoryPayload() : null;

  const markdown = buildMarkdownV1({ ai, summary, history, includeHistory });

  let prompt: string;
  if (format === "text") {
    prompt = markdownToPlainText(markdown);
  } else {
    prompt = markdown;
  }

  const truncated = markdown.endsWith(
    "> NOTE: 10000 文字制限のため一部省略されました。\n",
  );

  return {
    ok: true,
    schema_version: "mc_handoff_prompt_v1",
    ai,
    format,
    meta: meta(summary),
    prompt,
    summary,
    history,
    truncated,
    char_count: prompt.length,
  };
}
