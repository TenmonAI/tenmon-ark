/**
 * Device Registry Router
 * デバイスレジストリのAPI
 */

import express from 'express';
import { sdk } from '../../../_core/sdk';
import * as deviceRegistry from './deviceRegistry';

const router = express.Router();

/**
 * GET /api/deviceCluster-v3/registry/list
 * デバイス一覧を取得
 */
router.get('/list', async (req, res) => {
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

    const devices = deviceRegistry.list();

    return res.status(200).json({ devices });

  } catch (error) {
    console.error('[Device Registry Router] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVICE_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

/**
 * POST /api/deviceCluster-v3/registry/register
 * デバイスを登録
 */
router.post('/register', express.json(), async (req, res) => {
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

    const device = req.body;
    deviceRegistry.register(device);

    return res.status(200).json({ success: true, device });

  } catch (error) {
    console.error('[Device Registry Router] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVICE_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

export default router;

