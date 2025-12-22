// v∞-2: 外部連携用の唯一の入口エンドポイント

import { Router, type IRouter, type Request, type Response } from "express";
import { getSessionId } from "../memory/sessionId.js";
import { sanitizeInput, type InputSource } from "../tenmon/inputSanitizer.js";
import { respond } from "../tenmon/respond.js";
import { runDialecticDrive, deterministicFallback } from "../persona/dialecticDrive.js";
import { createJob, getJob } from "../tenmon/dialecticJobStore.js";
import { storeDialecticResult } from "../persona/kanagiDialecticCore.js";
import { isSafeMode } from "../core/taiFreeze.js";
import { secureTrace } from "../core/secureTrace.js";
import { runKanagiReasoner } from "../kanagi/engine/fusionReasoner.js";

const router: IRouter = Router();

export type TenmonRespondRequestBody = {
  input: string;
  source?: InputSource;
  sessionId?: string;
  jobId?: string; // 既存Jobの再開用
};

export type TenmonRespondResponseBody = {
  output: string;
  meta?: {
    mode?: "integrated" | "thinking" | "safemode";
    jobId?: string;
    tai_integrity?: boolean;
    spiral_depth?: number;
  };
  trace?: unknown;
  provisional?: boolean;
};

/**
 * v∞-2: 外部連携用の唯一の入口エンドポイント
 * 
 * 入力：
 * - input: テキスト入力
 * - source: 入力ソース（web / voice / device / agent）
 * - sessionId: セッションID（オプション）
 * 
 * 出力：
 * - output: 応答テキストのみ（状態・ログは一切返さない）
 */
router.post("/tenmon/respond", async (req: Request, res: Response<TenmonRespondResponseBody>) => {
  const body = req.body as TenmonRespondRequestBody;
  
  // 入力の検証
  if (!body || typeof body.input === "undefined") {
    return res.status(400).json({
      output: "input is required",
    });
  }
  
  // sourceの検証（デフォルトは"web"）
  const source: InputSource = body.source || "web";
  if (!["web", "voice", "device", "agent"].includes(source)) {
    return res.status(400).json({
      output: "invalid source",
    });
  }
  
  // 入力の正規化・サニタイズ
  const sanitized = sanitizeInput(body.input, source);
  
  if (!sanitized.isValid) {
    return res.status(400).json({
      output: sanitized.error || "invalid input",
    });
  }
  
  // sessionIdの取得（指定されていない場合は自動生成）
  const sessionId = body.sessionId || getSessionId(req);
  
  // jobIdが指定されている場合は、既存のJobを取得
  if (body.jobId && typeof body.jobId === "string") {
    const jobPromise = getJob(body.jobId);
    if (jobPromise) {
      try {
        const result = await Promise.race([
          jobPromise,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 100)),
        ]);
        
        if (result) {
          // DialecticDriveの結果をKanagiTetraStateに保存
          storeDialecticResult(sessionId, result);
          
          // 観測円を返す（結論ではない）
          const output = formatObservationCircle(result);
          return res.json({
            output,
            meta: {
              mode: "integrated",
            },
          });
        }
      } catch (error) {
        console.error(`[DIALECTIC] Job error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  
  // DialecticDriveを起動する条件をチェック
  const shouldRunDialectic = shouldTriggerDialectic(sanitized.text);
  
  if (shouldRunDialectic) {
    // DialecticDriveを非同期で起動
    const dialecticPromise = runDialecticDrive(sanitized.text);
    
    // 最大8秒まで待つ
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.log("[DIALECTIC] timeout");
        resolve(null);
      }, 8000);
    });
    
    const result = await Promise.race([dialecticPromise, timeoutPromise]);
    
    if (result) {
      // DialecticDriveの結果をKanagiTetraStateに保存
      storeDialecticResult(sessionId, result);
      
      // 完了：観測円を返す（結論ではない）
      const output = formatObservationCircle(result);
      return res.json({
        output,
        meta: {
          mode: "integrated",
        },
      });
    } else {
      // タイムアウトまたはLLM失敗
      // まず、LLMが失敗した場合は決定論的フォールバックを試す
      const finalResult = await dialecticPromise.catch(() => null);
      if (!finalResult) {
        // LLM失敗時は決定論的フォールバック
        const fallback = deterministicFallback(
          `「${sanitized.text}」について肯定的に解釈すると、`,
          `「${sanitized.text}」について否定的に解釈すると、`
        );
        
        // フォールバック結果もKanagiTetraStateに保存
        storeDialecticResult(sessionId, fallback);
        
        const output = formatObservationCircle(fallback);
        return res.json({
          output,
          meta: {
            mode: "integrated",
          },
        });
      }
      
      // タイムアウト：thinkingを返す
      const { jobId } = createJob(sanitized.text, dialecticPromise);
      console.log(`[DIALECTIC] timeout jobId=${jobId}`);
      
      return res.json({
        output: "……統合中（続きが必要です）。",
        meta: {
          mode: "thinking",
          jobId,
        },
      });
    }
  }
  
  // 通常の応答生成（コアロジック）
  // 螺旋再帰を含む思考実行
  try {
    const kanagiTrace = await runKanagiReasoner(sanitized.text, sessionId);
    
    // 安全な Trace を生成（躰整合性検証を含む）
    const secureKanagiTrace = secureTrace(kanagiTrace);
    
    // 出力は常に provisional: true（躰制約）
    const integrityVerified = (secureKanagiTrace.meta as any)?.integrity_verified ?? true;
    const spiralDepth = secureKanagiTrace.meta?.spiralDepth || 0;
    const observationDescription = secureKanagiTrace.observationCircle?.description || "Observation pending";
    
    return res.json({
      output: observationDescription,
      meta: {
        mode: "integrated",
        tai_integrity: integrityVerified,
        spiral_depth: spiralDepth,
      },
      trace: secureKanagiTrace,
      provisional: true,
    });
  } catch (error) {
    console.error("[TENMON] Error in reasoning:", error);
    
    // エラー時も SafeMode チェック
    if (isSafeMode()) {
      return res.status(503).json({
        output: "SAFE MODE: Tai integrity compromised",
        meta: {
          mode: "safemode",
        },
        provisional: true,
      });
    }
    
    // 通常の応答生成（フォールバック）
    const output = respond(sanitized.text, sessionId, source);
    
    return res.json({
      output,
      provisional: true,
    });
  }
});

/**
 * 観測円をフォーマット（結論を返さない）
 */
function formatObservationCircle(result: import("../persona/dialecticDrive.js").DialecticResult): string {
  let output = result.observationCircle;
  
  // 未解決の緊張を明示
  if (result.unresolvedTensions.length > 0) {
    output += "\n\n未解決の緊張：\n";
    for (const tension of result.unresolvedTensions) {
      output += `- ${tension}\n`;
    }
  }
  
  // 結論を出さないことを明示
  output += "\n\n（結論は出さない。矛盾は織りなされ、旋回し、上昇している。）";
  
  return output;
}

/**
 * DialecticDriveを起動する条件を判定
 */
function shouldTriggerDialectic(input: string): boolean {
  const normalized = input.toLowerCase();
  
  // キーワードチェック
  const keywords = [
    "設計",
    "矛盾",
    "なぜ",
    "どうすれば",
    "統合",
    "対立",
    "相反",
    "両立",
    "解決",
    "design",
    "contradiction",
    "why",
    "how",
    "integrate",
    "conflict",
    "resolve",
  ];
  
  return keywords.some((keyword) => normalized.includes(keyword));
}

export default router;

