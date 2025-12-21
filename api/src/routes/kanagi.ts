// AmatsuKanagi Thought Circuit (水火エンジン) API

import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { mapForm, type Phase } from "../kanagi/formMapper.js";
import { RX } from "../kanagi/extract/regex.js";
// TokenRole は assignTokenRoles の戻り値で使用されるため、ここでは型インポート不要
import {
  loadPdfText,
  loadUploadedText,
  extractDefinitions,
  extractRules,
  extractLaws,
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
// assignTokenRoles は fusionReasoner.ts 内で呼ばれるため、ここでは不要

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
    } else if ((body as any).path) {
      // パスから読み込み
      const result = await loadPdfText((body as any).path);
      text = result.text;
      pages = result.pages;
      source = (body as any).path;
    } else {
      return res.status(400).json({
        error: "Invalid request: file or path is required",
      });
    }
    
    // 抽出実行
    const definitions = extractDefinitions(text, source, pages);
    const rules = extractRules(text, source, pages);
    const laws = extractLaws(text, source, pages);
    
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
      evidence: 0,
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
 * 決定論 Tai/You 抽出（LLMに依存しない最初の核）
 * 
 * 役割で火水を決める（動かす＝火、動く＝水）
 * 名称で固定しない（状況で反転する）
 * 
 * @param input 入力テキスト
 * @returns 躰用エネルギー判定と位相・形
 */
function taiYouFromText(input: string): {
  fire: number;
  water: number;
  phase: Phase;
  form: "CIRCLE" | "DOT" | "WELL" | "LINE";
  evidence: string[];
} {
  // 超ミニ：キーワードで fire/water を数える（後で形態素/依存解析に差し替え）
  const FIRE = ["動かす", "促す", "開く", "発", "昇", "外", "火"];
  const WATER = ["動く", "動かされる", "受ける", "閉", "降", "内", "水"];
  const CENTER = ["凝", "正中", "井", "核", "芯", "源"];

  let fire = 0,
    water = 0,
    center = 0;
  const evidence: string[] = [];

  for (const k of FIRE) {
    if (input.includes(k)) {
      fire++;
      evidence.push(`${k}:FIRE`);
    }
  }
  for (const k of WATER) {
    if (input.includes(k)) {
      water++;
      evidence.push(`${k}:WATER`);
    }
  }
  for (const k of CENTER) {
    if (input.includes(k)) {
      center++;
      evidence.push(`${k}:CENTER`);
    }
  }

  // "役割反転"の根拠（言霊秘書の明記）に対応する検出（文字列一致）
  for (const r of RX.TAIYOU_CORE) {
    if (r.test(input)) {
      evidence.push(`TAIYOU_CORE_MATCH:${String(r)}`);
    }
  }

  const phase: Phase = {
    center: center > 0 || (fire === water && fire >= 2),
    rise: fire > water,
    fall: water > fire,
    open: fire >= 2,
    close: water >= 2,
  };

  const form = mapForm({ fire, water }, phase);

  return { fire, water, phase, form, evidence };
}

/**
 * POST /api/kanagi/reason
 * 
 * 入力テキストから推論を実行（螺旋再帰版）
 * 
 * Lv5（円融無碍）: 観測円を次回思考の FACT に再注入する
 * 
 * 出力は「答え」ではなく trace（観測円＋躰用判定）を返す
 * 
 * 禁止事項:
 * - observation を要約しない
 * - 結論を生成しない
 * - LLM に躰や螺旋制御を任せない
 */
router.post("/kanagi/reason", async (req: Request, res: Response) => {
  try {
    const input = String(req.body?.input ?? "");

    if (!input || input.trim().length === 0) {
      return res.status(400).json({
        error: "KANAGI_INPUT_REQUIRED",
        message: "入力が空です。思考を旋回させるには入力が必要です。",
        provisional: true,
      });
    }

    // セッションIDの確保（なければ一時IDを発行してその場限りの螺旋とする）
    const sessionId = String(
      req.body.session_id ?? req.body.sessionId ?? `kanagi_${Date.now()}`
    );

    console.log(`[KANAGI] Reason request. Session: ${sessionId}`);

    // 螺旋思考の実行（既存の runKanagiReasoner を使用）
    // この中で assignTokenRoles とループ検知が実行される
    const result = await runKanagiReasoner(input, sessionId);

    // 決定論 Tai/You 抽出（LLMに依存しない最初の核）
    const t = taiYouFromText(input);

    // 新しい trace 構造を構築
    // result から assignments と loop を取得
    const trace = {
      input,
      taiyou: {
        fire: t.fire,
        water: t.water,
        assignments: result.taiyou.assignments, // fusionReasoner で割り当てられた assignments
        evidence: t.evidence,
      },
      phase: result.phase, // ループ検知により center が強制される可能性がある
      form: result.form, // ループ検知により WELL になる可能性がある
      spiral: result.spiral || {
        depth: 1,
        previousObservation: "",
        nextFactSeed: "",
      },
      provisional: true as const,
      violations: [] as string[],
      tai_freeze: {
        enabled: true,
        tai_hash: result.meta?.tai_hash || "",
        integrity_verified: result.meta?.integrity_verified ?? true,
      },
      loop: result.loop, // ループ検知情報
      // 後方互換性のためのフィールド
      iki: result.iki,
      observationCircle: result.observationCircle,
      meta: result.meta,
    };

    console.log(`[KANAGI] Spiral depth: ${trace.spiral.depth}`);

    return res.json({ trace });
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
    const reasoningResult = reason(body.input, trace as any, ruleset);
    trace.push({
      step: 6,
      stage: "reasoning" as const,
      input: body.input,
      output: reasoningResult.interpretation,
      evidence: reasoningResult.evidence.map((e) => ({ source: ruleset.name, snippet: e })),
    });
    
    // Step 8: 検証
    const verificationResult = verify(trace as any, ruleset);
    trace.push({
      step: 7,
      stage: "verification" as const,
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
    console.log("[KANAGI-FUSION] Observation:", result.observationCircle?.description || "N/A");

    // 解決策(solution)ではなく、観測結果(observation)と軌跡(trace)を返す
    return res.json({
      output: result.observationCircle?.description || "Observation pending",
      trace: result, // フル可視化により思考をブラックボックス化しない
      unresolved: result.observationCircle?.unresolved || [],
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

