/**
 * Discovery Router
 * デバイス検出のAPI（stub）
 */

import express from 'express';
import { sdk } from '../../../_core/sdk';

const router = express.Router();

/**
 * POST /api/deviceCluster-v3/discovery/scan
 * デバイスをスキャン（stub）
 */
router.post('/scan', express.json(), async (req, res) => {
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

    // TODO: mDNS / LAN スキャンを実装

    return res.status(200).json({
      success: true,
      devices: [],
    });

  } catch (error) {
    console.error('[Discovery Router] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVICE_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

export default router;

