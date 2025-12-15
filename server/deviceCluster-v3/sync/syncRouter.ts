/**
 * Sync Router
 * 同期エンジンのAPI
 */

import express from 'express';
import { sdk } from '../../../_core/sdk';

const router = express.Router();

/**
 * GET /api/deviceCluster-v3/sync/ping
 * ping に応答するエンドポイント
 */
router.get('/ping', async (req, res) => {
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

    return res.status(200).json({
      serverTime: Date.now(),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Sync Router] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVICE_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

export default router;

