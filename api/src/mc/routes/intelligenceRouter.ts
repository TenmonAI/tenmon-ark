/**
 * CARD-MC-19: GET /api/mc/vnext/intelligence と /intelligence/fire
 * CARD-MC-23: GET|POST /intelligence/effect — 注入節の実測・任意 LLM 比較
 */
import { Router, type Request, type Response } from "express";
import { sanitize } from "../../core/mc/sanitizer.js";
import {
  buildDeepIntelligencePayloadV1,
  buildIntelligenceFireOnlyPayloadV1,
} from "../intelligence/deepIntelligenceMapV1.js";
import {
  buildContextInjectionEffectAuditV1,
  runMc23LlmCompareIfEnabledV1,
  NAT_GEN_SOUL_WIRE_KEYS,
  type McContextInjectionEffectAuditInputV1,
} from "../intelligence/mcContextInjectionEffectAuditV1.js";

export const mcIntelligenceObsRouter = Router();

mcIntelligenceObsRouter.get("/", (_req: Request, res: Response) => {
  res.json(sanitize(buildDeepIntelligencePayloadV1()));
});

mcIntelligenceObsRouter.get("/fire", (_req: Request, res: Response) => {
  res.json(sanitize(buildIntelligenceFireOnlyPayloadV1()));
});

/** CARD-MC-23: メタのみ、または ?question= でドライ監査 */
mcIntelligenceObsRouter.get("/effect", (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const question = String(q.question ?? "").trim();
  if (!question) {
    res.json(
      sanitize({
        ok: true,
        schema_version: "mc_context_injection_effect_audit_v2_meta",
        endpoint: "/api/mc/vnext/intelligence/effect",
        methods: ["GET", "POST"],
        wire_keys: [...NAT_GEN_SOUL_WIRE_KEYS],
        dry_audit_hint: "GET /effect?question=...&include_full_prompt=1（全文は TENMON_MC_DEBUG_INJECTION_ENDPOINT=1 または TENMON_MC_EFFECT_AUDIT_FULL_PROMPT=1 が必要）",
        llm_compare_hint:
          "POST JSON { question, run_llm_compare:true } は TENMON_MC_EFFECT_AUDIT_LLM=1 のときのみ wired 全ON/全OFF で2回 llmChat",
        post_body_shape: {
          question: "string (required for audit)",
          wire_mask: "partial Record<wire_key, boolean> optional",
          sukuyou_continuity_clause: "string optional",
          sukuyou_context_clause: "string optional",
          intent_clause: "string optional",
          include_full_prompt: "boolean",
          run_llm_compare: "boolean",
          llm_max_tokens: "number optional",
        } satisfies Record<string, string>,
      }),
    );
    return;
  }
  const includeFull = String(q.include_full_prompt ?? "").toLowerCase() === "true" || q.include_full_prompt === "1";
  const out = buildContextInjectionEffectAuditV1({
    question,
    include_full_prompt: includeFull,
  });
  res.json(sanitize(out));
});

mcIntelligenceObsRouter.post("/effect", async (req: Request, res: Response) => {
  const body = (req.body && typeof req.body === "object" ? req.body : {}) as McContextInjectionEffectAuditInputV1;
  const question = String(body.question ?? "").trim();
  if (!question) {
    res.status(400).json(sanitize({ ok: false, error: "question_required" }));
    return;
  }
  const audit = buildContextInjectionEffectAuditV1(body);
  const llm = await runMc23LlmCompareIfEnabledV1(body);
  res.json(sanitize({ ...audit, ...llm }));
});
