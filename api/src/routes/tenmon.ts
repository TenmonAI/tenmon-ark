// v∞-2: 外部連携用の唯一の入口エンドポイント

import { Router, type IRouter, type Request, type Response } from "express";
import { getSessionId } from "../memory/sessionId.js";
import { sanitizeInput, type InputSource } from "../tenmon/inputSanitizer.js";
import { respond } from "../tenmon/respond.js";

const router: IRouter = Router();

export type TenmonRespondRequestBody = {
  input: string;
  source?: InputSource;
  sessionId?: string;
};

export type TenmonRespondResponseBody = {
  output: string;
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
router.post("/tenmon/respond", (req: Request, res: Response<TenmonRespondResponseBody>) => {
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
  
  // 応答生成（コアロジック）
  const output = respond(sanitized.text, sessionId, source);
  
  // 外部に返すレスポンスはテキストのみ
  return res.json({
    output,
  });
});

export default router;

