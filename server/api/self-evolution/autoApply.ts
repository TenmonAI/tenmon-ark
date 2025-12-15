/**
 * AutoApply API
 * 改善パッチを自動適用・コミット・プッシュ
 */

import express from 'express';
import { sdk } from '../../../_core/sdk';
import { runAutoApplyPipeline, type AutoApplyResult } from '../../../selfEvolution/autoApply';
import type { AutoFixPatch } from '../../../selfEvolution/autoFix';

const router = express.Router();

/**
 * POST /api/self-evolution/autoApply
 * 改善パッチを自動適用・コミット・プッシュ
 * 
 * Request:
 * - patches: AutoFixPatch[]
 * - commitMessage: string
 * 
 * Response:
 * - 200: AutoApplyResult
 * - 401: { error: string }
 */
router.post('/autoApply', express.json(), async (req, res) => {
  try {
    // 認証チェック
    const user = await sdk.authenticateRequest(req);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    }

    // Founder/Devプランのみアクセス可能
    if (user.plan !== 'founder' && user.plan !== 'dev') {
      return res.status(403).json({
        error: 'Forbidden: This feature is only available for Founder/Dev plans',
        code: 'FORBIDDEN',
      });
    }

    // リクエストボディの検証
    const { patches, commitMessage } = req.body;

    if (!patches || !Array.isArray(patches) || patches.length === 0) {
      return res.status(400).json({
        error: 'Invalid request: patches is required and must be a non-empty array',
        code: 'INVALID_INPUT',
      });
    }

    if (!commitMessage || typeof commitMessage !== 'string' || commitMessage.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid request: commitMessage is required',
        code: 'INVALID_INPUT',
      });
    }

    // パッチを検証
    const validPatches: AutoFixPatch[] = [];
    for (const patch of patches) {
      if (patch.id && patch.filePath && patch.patch) {
        validPatches.push(patch as AutoFixPatch);
      }
    }

    if (validPatches.length === 0) {
      return res.status(400).json({
        error: 'Invalid request: no valid patches found',
        code: 'INVALID_INPUT',
      });
    }

    // 自動適用パイプラインを実行
    const result = await runAutoApplyPipeline(validPatches, commitMessage.trim());

    return res.status(200).json(result);

  } catch (error) {
    console.error('[AutoApply] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVICE_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

export default router;

