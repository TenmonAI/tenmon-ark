/**
 * Mission Control vNext — read-only API skeleton (CARD_MC_VNEXT_FOUNDATION_V1).
 * Rollback: unset TENMON_MC_VNEXT or remove this mount from index.ts.
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import {
  mcRequireAdminOrMcBasicNoClaude,
  mcRequireAdminOrMcBasicOrClaudeRead,
  mcVnextClaudeReadGetOnly,
} from "../../core/mc/authGuards.js";
import { sanitize } from "../../core/mc/sanitizer.js";
import { isMcVnextEnabled } from "../mcVnextFlag.js";
import { isMcVnextAnalyzerEnabled } from "../analyzer/mcVnextAnalyzerFlag.js";
import {
  buildVnextAlertsPayload,
  buildVnextCircuitPayload,
  buildVnextFilePayload,
  buildVnextGraphPayload,
  buildVnextInfraPayload,
  buildVnextOverviewPayload,
  buildVnextQualityPayload,
  buildVnextRequestPayload,
  buildVnextRepoPayload,
  buildVnextSourcesPayload,
  buildVnextThreadPayload,
  buildVnextAcceptancePayload,
  buildVnextRepairHubPayload,
} from "../vnextPayloads.js";
import { buildVnextHistoryPayload, buildVnextRegressionPayload } from "../history/mcSystemHistoryV1.js";
import { runMcVnextAnalyzerV1 } from "../analyzer/mcVnextAnalyzerV1.js";
import { isMcLedgerWritesEnabled } from "../ledger/mcLedger.js";
import { buildClaudeSummaryPayloadV1 } from "../claude/claudeSummaryV1.js";
import { buildHandoffPromptV1 } from "../claude/handoffPromptV1.js";
import { buildAmatsuKanagiPayloadV1 } from "../constitution/amatsuKanagiMapV1.js";
import { isMcClaudeNotionMirrorConfiguredV1, syncMcClaudeSummaryToNotionPageV1 } from "../notion/mcClaudeNotionMirrorV1.js";
import {
  getLastContextInjectionSnapshotV1,
  isMcDebugInjectionEndpointEnabledV1,
} from "../../core/contextInjectionProbe.js";
import { mcIntelligenceObsRouter } from "./intelligenceRouter.js";

const mcVnextRouter = Router();

/** Public: whether vNext API/UI should be offered (no auth). */
mcVnextRouter.get("/enabled", (_req: Request, res: Response) => {
  const ledgerWrites = isMcLedgerWritesEnabled();
  const cr = (process.env.TENMON_MC_CLAUDE_READ_TOKEN ?? "").trim();
  res.json({
    ok: true,
    enabled: isMcVnextEnabled(),
    analyzerEnabled: isMcVnextAnalyzerEnabled(),
    ledgerWritesEnabled: ledgerWrites,
    claude_read_lane_configured: cr.length >= 24,
    claude_summary_path: "/api/mc/vnext/claude-summary",
    notion_mirror_configured: isMcClaudeNotionMirrorConfiguredV1(),
    claude_lane_note:
      "Human: owner-only /mc/ hub. AI: GET /api/mc/vnext/claude-summary with Bearer TENMON_MC_CLAUDE_READ_TOKEN (GET-only; POST returns 403). Notion: mirror page TENMON_ARK_MC_CURRENT_STATE_FOR_CLAUDE via POST /api/mc/vnext/claude-notion-sync (founder/Basic trust only).",
    ledgerWriteHint: ledgerWrites
      ? "chat の NATURAL_GENERAL 本線（および llmChat に ledgerCtx が渡る経路）で mc_*_ledger に追記されます。宿曜御神託専用ルート等では未接続のことがあります。"
      : "TENMON_MC_VNEXT_LEDGER=1 を .env に設定し API を再起動してください（vNext 有効だけでは ledger は増えません）。",
  });
});

const protectedVnext = Router();

function vnextGate(_req: Request, res: Response, next: NextFunction): void {
  if (!isMcVnextEnabled()) {
    res.status(404).json({ ok: false, error: "MC_VNEXT_DISABLED" });
    return;
  }
  next();
}

protectedVnext.use(vnextGate);
// CARD-MC-13: founder JWT OR nginx MC basic trust.
// CARD-MC-16: OR TENMON_MC_CLAUDE_READ_TOKEN（Bearer）read-only。write 系は別スタックのみ。
protectedVnext.use(mcRequireAdminOrMcBasicOrClaudeRead);
protectedVnext.use(mcVnextClaudeReadGetOnly);

/** Notion ミラー等 — Claude read Bearer は拒否 */
const vnextOperatorOnly = Router();
vnextOperatorOnly.use(vnextGate);
vnextOperatorOnly.use(mcRequireAdminOrMcBasicNoClaude);
vnextOperatorOnly.post("/claude-notion-sync", async (_req: Request, res: Response) => {
  const summary = buildClaudeSummaryPayloadV1();
  const out = await syncMcClaudeSummaryToNotionPageV1(summary);
  if (!out.ok) {
    res.status(out.error?.includes("NOT_") ? 400 : 502).json({
      ok: false,
      error: out.error,
      notion_page_id: out.notion_page_id,
    });
    return;
  }
  res.json({
    ok: true,
    notion_page_id: out.notion_page_id,
    blocks_written: out.blocks_written,
    blocks_removed: out.blocks_removed,
    generated_at: summary.generated_at,
  });
});
mcVnextRouter.use("/claude-notion-sync", vnextOperatorOnly);

protectedVnext.get("/overview", (_req: Request, res: Response) => {
  res.json(sanitize(buildVnextOverviewPayload()));
});

protectedVnext.get("/circuit", (req: Request, res: Response) => {
  const threadId = String((req.query as { threadId?: string }).threadId ?? "");
  res.json(sanitize(buildVnextCircuitPayload(threadId)));
});

protectedVnext.get("/thread/:threadId", (req: Request, res: Response) => {
  const threadId = String(req.params.threadId ?? "");
  res.json(sanitize(buildVnextThreadPayload(threadId)));
});

protectedVnext.get("/request/:requestId", (req: Request, res: Response) => {
  const requestId = String(req.params.requestId ?? "");
  res.json(sanitize(buildVnextRequestPayload(requestId)));
});

protectedVnext.get("/repo", (_req: Request, res: Response) => {
  res.json(sanitize(buildVnextRepoPayload()));
});

protectedVnext.get("/file", (req: Request, res: Response) => {
  const rel = String((req.query as { rel?: string }).rel ?? "");
  res.json(sanitize(buildVnextFilePayload(rel)));
});

protectedVnext.get("/sources", (_req: Request, res: Response) => {
  res.json(sanitize(buildVnextSourcesPayload()));
});

protectedVnext.get("/infra", (_req: Request, res: Response) => {
  res.json(sanitize(buildVnextInfraPayload()));
});

protectedVnext.get("/quality", (_req: Request, res: Response) => {
  res.json(sanitize(buildVnextQualityPayload()));
});

protectedVnext.get("/alerts", (_req: Request, res: Response) => {
  res.json(sanitize(buildVnextAlertsPayload()));
});

protectedVnext.get("/acceptance", (_req: Request, res: Response) => {
  res.json(sanitize(buildVnextAcceptancePayload()));
});

protectedVnext.get("/repair-hub", (_req: Request, res: Response) => {
  res.json(sanitize(buildVnextRepairHubPayload()));
});

protectedVnext.get("/history", (_req: Request, res: Response) => {
  res.json(sanitize(buildVnextHistoryPayload()));
});

protectedVnext.get("/claude-summary", (_req: Request, res: Response) => {
  res.json(sanitize(buildClaudeSummaryPayloadV1()));
});

/**
 * CARD-MC-HANDOFF-V1:
 *   GET /api/mc/vnext/handoff-prompt?ai=claude|gpt|cursor&format=markdown|text|json&include_history=false（省略時 true・CARD-MC-25）
 *   Bearer auth（protectedVnext 配下）。TENMON が新 AI トークルーム起動時に
 *   1 コマンドで前会話の文脈を継承するための 1 枚プロンプト生成器。
 */
protectedVnext.get("/handoff-prompt", (req: Request, res: Response) => {
  const q = req.query as Record<string, unknown>;
  const ihRaw = String(q.include_history ?? "").trim().toLowerCase();
  const includeHistory = !(ihRaw === "false" || ihRaw === "0");
  const result = buildHandoffPromptV1({
    ai: typeof q.ai === "string" ? q.ai : undefined,
    format: typeof q.format === "string" ? q.format : undefined,
    includeHistory,
  });

  if (result.format === "json") {
    res.json(sanitize(result) as Record<string, unknown>);
    return;
  }

  const contentType =
    result.format === "markdown" ? "text/markdown; charset=utf-8" : "text/plain; charset=utf-8";
  res.setHeader("Content-Type", contentType);
  // sanitize は文字列に作用して token などを消してくれるが、object が期待されるため手動適用
  res.setHeader("X-MC-Handoff-Ai", result.ai);
  res.setHeader("X-MC-Handoff-Format", result.format);
  res.setHeader("X-MC-Handoff-Char-Count", String(result.char_count));
  res.setHeader("X-MC-Handoff-Truncated", String(result.truncated));
  res.setHeader("X-MC-Handoff-Schema", result.schema_version);
  res.send(result.prompt);
});

protectedVnext.get("/regression", (_req: Request, res: Response) => {
  res.json(sanitize(buildVnextRegressionPayload()));
});

protectedVnext.get("/analyzer", (_req: Request, res: Response) => {
  res.json(sanitize(runMcVnextAnalyzerV1()));
});

protectedVnext.get("/graph", (_req: Request, res: Response) => {
  res.json(sanitize(buildVnextGraphPayload()));
});

/**
 * CARD-MC-11-AMATSU-KANAGI-CORE-VISUALIZATION-V1:
 *   天津金木コア（憲法→実装マップ）。GPT/Claude が /mc/ から直接
 *   「構造裁定・参照・会話還元・言霊法・意味裁定・法昇格門」の
 *   実装ファイル存在・wired/unwired 状態を読めるようにする。
 */
protectedVnext.get("/constitution", (_req: Request, res: Response) => {
  res.json(sanitize(buildAmatsuKanagiPayloadV1()));
});

/**
 * CARD-MC-18 + CARD-MC-19: 深層知能（宣言 × grep × 五十音 × 発火 jsonl）。
 *   GET /intelligence  · GET /intelligence/fire
 */
protectedVnext.use("/intelligence", mcIntelligenceObsRouter);

/**
 * CARD-MC-16-V2: 直近の /api/chat が記録した __debug_injections のスナップショット。
 * TENMON_MC_DEBUG_INJECTION_ENDPOINT=1 のときのみ有効（それ以外は 404）。
 */
protectedVnext.get("/debug/last-injection", (_req: Request, res: Response) => {
  if (!isMcDebugInjectionEndpointEnabledV1()) {
    res.status(404).json({ ok: false, error: "MC_DEBUG_INJECTION_ENDPOINT_DISABLED" });
    return;
  }
  const snap = getLastContextInjectionSnapshotV1();
  if (!snap.ok) {
    res.json(sanitize({ ok: false, reason: snap.reason }));
    return;
  }
  res.json(
    sanitize({
      ok: true,
      captured_at: snap.captured_at,
      threadId: snap.threadId,
      injections: snap.injections,
    }),
  );
});

mcVnextRouter.use(protectedVnext);

export default mcVnextRouter;
