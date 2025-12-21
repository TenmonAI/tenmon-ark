// AmatsuKanagi Thought Circuit (水火エンジン) API

import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import {
  loadPdfText,
  loadUploadedText,
  extractDefinitions,
  extractRules,
  extractLaws,
  indexEvidence,
  classifyIki,
  estimatePhase,
  mapToForm,
  mapToKotodama,
  determineRole,
  reason,
  verify,
  saveRuleset,
  loadRuleset,
  getLatestRuleset,
  listRulesets,
  type ExtractRequest,
  type ExtractResult,
  type ReasonRequest,
  type ReasoningResult,
  type ReasoningTrace,
} from "../kanagi/index.js";
import { runKanagiReasoner } from "../kanagi/engine/fusionReasoner.js";

const router: IRouter = Router();
const upload = multer({ dest: "uploads/" });

/**
 * POST /api/kanagi/extract
 * 
 * ファイルからrulesetを抽出
 */
router.post("/kanagi/extract", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const body = req.body as ExtractRequest;
    
    let text: string;
    let pages: Array<{ page: number; text: string }>;
    let source: string;
    
    if (body.source === "upload" && req.file) {
      // アップロードファイルから読み込み
      const result = await loadUploadedText(req.file as any);
      text = result.text;
      pages = result.pages;
      source = req.file.originalname || "uploaded";
    } else if (body.source === "path" && body.path) {
      // パスから読み込み
      const result = await loadPdfText(body.path);
      text = result.text;
      pages = result.pages;
      source = body.path;
    } else {
      return res.status(400).json({
        error: "Invalid request: file or path is required",
      });
    }
    
    // 抽出実行
    const definitions = extractDefinitions(text, source, pages);
    const rules = extractRules(text, source, pages);
    const laws = extractLaws(text, source, pages);
    
    // 証拠をインデックス化
    const allEvidence = [
      ...definitions.flatMap((d) => d.evidence),
      ...rules.flatMap((r) => r.evidence),
      ...laws.flatMap((l) => l.evidence),
    ];
    const indexedEvidence = indexEvidence(allEvidence, text, source, pages);
    
    // Rulesetを作成
    const rulesetId = uuidv4();
    const ruleset = {
      id: rulesetId,
      name: `Ruleset from ${source}`,
      version: "1.0.0",
      definitions,
      rules,
      laws,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // 保存
    await saveRuleset(ruleset);
    
    const result: ExtractResult = {
      rulesetId,
      definitions: definitions.length,
      rules: rules.length,
      laws: laws.length,
      evidence: indexedEvidence.length,
      warnings: [],
    };
    
    return res.json(result);
  } catch (error) {
    console.error("[KANAGI] Extract error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/kanagi/reason
 * 
 * 入力テキストから推論を実行（螺旋再帰版）
 * 
 * Lv5（円融無碍）: 観測円を次回思考の FACT に再注入する
 * 
 * 禁止事項:
 * - observation を要約しない
 * - 結論を生成しない
 * - LLM に躰や螺旋制御を任せない
 */
router.post("/kanagi/reason", async (req: Request, res: Response) => {
  try {
    const input = String(req.body.input ?? "");

    if (!input || input.trim().length === 0) {
      return res.status(400).json({
        error: "KANAGI_INPUT_REQUIRED",
        message: "入力が空です。思考を旋回させるには入力が必要です。",
      });
    }

    // セッションIDの確保（なければ一時IDを発行してその場限りの螺旋とする）
    const sessionId = String(req.body.session_id ?? req.body.sessionId ?? `kanagi_${Date.now()}`);

    console.log(`[KANAGI] Reason request. Session: ${sessionId}`);

    // 螺旋思考の実行
    const result = await runKanagiReasoner(input, sessionId);

    console.log(`[KANAGI] Spiral depth: ${result.spiral?.depth ?? 0}`);

    return res.json({
      session_id: sessionId,

      // 躰（原理）
      tai: result.iki.detectedBy, // 簡易的に検知要素を返す（本来はTaiPrinciple）

      // 用（現象）
      you: [input],

      // 観測円
      observation: result.observationCircle,

      // 螺旋情報（次への種子）
      spiral: result.spiral,

      provisional: true,
    });
  } catch (err) {
    console.error("[KANAGI-ERROR]", err);
    return res.status(500).json({
      error: "KANAGI_REASONING_FAILED",
      message: "正中にて思考が発酵中です",
      provisional: true,
    });
  }
});

/**
 * POST /api/kanagi/reason/legacy
 * 
 * 旧版の推論エンドポイント（互換性維持用）
 */
router.post("/kanagi/reason/legacy", async (req: Request, res: Response<ReasoningResult>) => {
  try {
    const body = req.body as ReasonRequest;
    
    if (!body.input) {
      return res.status(400).json({
        input: "",
        trace: [],
        answer: "Input is required",
        suggestedActions: [],
        warnings: ["Input is required"],
        confidence: 0,
      });
    }
    
    // Rulesetを取得
    const ruleset = body.rulesetId
      ? await loadRuleset(body.rulesetId)
      : await getLatestRuleset();
    
    if (!ruleset) {
      return res.status(404).json({
        input: body.input,
        trace: [],
        answer: "Ruleset not found",
        suggestedActions: [],
        warnings: ["Ruleset not found"],
        confidence: 0,
      });
    }
    
    // 推論トレースを構築
    const trace: ReasoningTrace[] = [];
    
    // Step 1: 入力
    trace.push({
      step: 1,
      stage: "input",
      input: body.input,
    });
    
    // Step 2: 水火分類
    const tokens = body.input.split(/\s+/);
    const ikiResult = classifyIki(tokens, ruleset);
    trace.push({
      step: 2,
      stage: "iki",
      input: body.input,
      output: `Iki State: ${ikiResult.state}`,
      state: ikiResult.state,
      confidence: ikiResult.confidence,
      evidence: ikiResult.evidence.map((e) => ({ source: ruleset.name, snippet: e })),
    });
    
    // Step 3: 位相推定
    const phaseResult = estimatePhase(body.input, ruleset);
    trace.push({
      step: 3,
      stage: "phase",
      input: body.input,
      output: `Phase: ${phaseResult.phase}`,
      state: phaseResult.phase,
      confidence: phaseResult.confidence,
      evidence: phaseResult.evidence.map((e) => ({ source: ruleset.name, snippet: e })),
    });
    
    // Step 4: 形マッピング
    const formResult = mapToForm(ikiResult.state, phaseResult.phase, ruleset);
    trace.push({
      step: 4,
      stage: "form",
      input: body.input,
      output: `Form: ${formResult.form}`,
      state: formResult.form,
      confidence: formResult.confidence,
      evidence: formResult.evidence.map((e) => ({ source: ruleset.name, snippet: e })),
    });
    
    // Step 5: 位決定
    const role = determineRole(formResult.form, ruleset);
    
    // Step 6: 言靈マッピング
    const kotodamaResult = mapToKotodama(formResult.form, role, ruleset);
    trace.push({
      step: 5,
      stage: "kotodama",
      input: body.input,
      output: `Kotodama: ${kotodamaResult.row} (Role: ${role})`,
      state: kotodamaResult.row,
      confidence: kotodamaResult.confidence,
      evidence: kotodamaResult.evidence.map((e) => ({ source: ruleset.name, snippet: e })),
    });
    
    // Step 7: 推論
    const reasoningResult = reason(body.input, trace, ruleset);
    trace.push({
      step: 6,
      stage: "reasoning",
      input: body.input,
      output: reasoningResult.interpretation,
      evidence: reasoningResult.evidence.map((e) => ({ source: ruleset.name, snippet: e })),
    });
    
    // Step 8: 検証
    const verificationResult = verify(trace, ruleset);
    trace.push({
      step: 7,
      stage: "verification",
      input: body.input,
      output: verificationResult.warnings.length > 0 ? "Warnings detected" : "No warnings",
      warnings: verificationResult.warnings,
    });
    
    // 最終結果を構築
    const finalAnswer = [
      `入力: ${body.input}`,
      `水火状態: ${ikiResult.state}`,
      `位相: ${phaseResult.phase}`,
      `形: ${formResult.form}`,
      `言靈: ${kotodamaResult.row} (${role})`,
      `解釈: ${reasoningResult.interpretation}`,
    ].join("\n");
    
    const confidence = Math.min(
      (ikiResult.confidence + phaseResult.confidence + formResult.confidence + kotodamaResult.confidence) / 4,
      1.0
    );
    
    const result: ReasoningResult = {
      input: body.input,
      trace,
      answer: finalAnswer,
      suggestedActions: reasoningResult.nextActions,
      warnings: verificationResult.warnings,
      confidence,
    };
    
    return res.json(result);
  } catch (error) {
    console.error("[KANAGI] Reason error:", error);
    return res.status(500).json({
      input: (req.body as ReasonRequest).input || "",
      trace: [],
      answer: "Error occurred during reasoning",
      suggestedActions: [],
      warnings: [error instanceof Error ? error.message : "Internal server error"],
      confidence: 0,
    });
  }
});

/**
 * GET /api/kanagi/rulesets
 * 
 * すべてのRulesetをリスト
 */
router.get("/kanagi/rulesets", async (_req: Request, res: Response) => {
  try {
    const rulesets = await listRulesets();
    return res.json(rulesets);
  } catch (error) {
    console.error("[KANAGI] List rulesets error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/kanagi/rulesets/:id
 * 
 * 特定のRulesetを取得
 */
router.get("/kanagi/rulesets/:id", async (req: Request, res: Response) => {
  try {
    const rulesetId = req.params.id;
    const ruleset = await loadRuleset(rulesetId);
    
    if (!ruleset) {
      return res.status(404).json({
        error: "Ruleset not found",
      });
    }
    
    return res.json(ruleset);
  } catch (error) {
    console.error("[KANAGI] Get ruleset error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/kanagi/fusion
 * 
 * 天津金木「核融合炉」思考実行API
 * 解決（solution）ではなく、観測（observation）を返す
 */
router.post("/kanagi/fusion", async (req: Request, res: Response) => {
  try {
    const input = String(req.body.input ?? "");
    console.log("[KANAGI-FUSION] Input received for fusion:", input);

    if (!input || input.trim().length === 0) {
      return res.status(400).json({
        error: "KANAGI_INPUT_REQUIRED",
        message: "入力が空です。思考を旋回させるには入力が必要です。",
      });
    }

    // 核融合炉の稼働
    const result = await runKanagiReasoner(input);

    console.log("[KANAGI-FUSION] Form generated:", result.form);
    console.log("[KANAGI-FUSION] Observation:", result.observationCircle.description);

    // 解決策(solution)ではなく、観測結果(observation)と軌跡(trace)を返す
    return res.json({
      output: result.observationCircle.description,
      trace: result, // フル可視化により思考をブラックボックス化しない
      unresolved: result.observationCircle.unresolved,
      meta: result.meta,
    });
  } catch (err) {
    console.error("[KANAGI-FUSION-ERROR]", err);
    
    // 思想的制約: エラー時も循環状態を返す（停止しない）
    return res.status(500).json({
      error: "KANAGI_REASONING_FAILED",
      message: "正中にて思考が臨界を超えました（システムエラー）。循環状態を維持します。",
      output: "思考が循環状態にフォールバックしました。矛盾は保持され、旋回を続けています。",
      trace: {
        input: String(req.body.input ?? ""),
        iki: { fire: 1, water: 1, detectedBy: ["ERROR_FALLBACK"] },
        phase: {
          rise: false,
          fall: false,
          open: false,
          close: false,
          center: false,
        },
        form: "CIRCLE",
        kotodama: { rowRole: "HUMAN" },
        contradictions: [],
        observationCircle: {
          description:
            "思考が循環状態にフォールバックしました。矛盾は保持され、旋回を続けています。",
          unresolved: ["エラーにより思考が中断されましたが、循環状態を維持しています"],
        },
        meta: {
          provisional: true,
          spiralDepth: 1,
        },
      },
    });
  }
});

export default router;

