/**
 * Cursor Router
 * robotjs を使って OS のマウス操作を実行（Mac/Windows互換）
 */

import express from 'express';
import { sdk } from '../../../_core/sdk';

const router = express.Router();

/**
 * POST /api/deviceCluster-v3/cursor/move
 * カーソルを移動
 */
router.post('/move', express.json(), async (req, res) => {
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

    const { x, y, deviceId } = req.body;

    // TODO: robotjs を使って OS のマウス操作を実行
    // const robot = require('robotjs');
    // robot.moveMouse(x, y);

    return res.status(200).json({
      success: true,
      x,
      y,
      deviceId,
    });

  } catch (error) {
    console.error('[Cursor Router] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVICE_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

/**
 * POST /api/deviceCluster-v3/cursor/click
 * クリックを実行
 */
router.post('/click', express.json(), async (req, res) => {
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

    const { button, x, y, deviceId } = req.body;

    // TODO: robotjs を使って OS のマウス操作を実行
    // const robot = require('robotjs');
    // robot.moveMouse(x, y);
    // robot.mouseClick(button === 'left' ? 'left' : button === 'right' ? 'right' : 'middle');

    return res.status(200).json({
      success: true,
      button,
      x,
      y,
      deviceId,
    });

  } catch (error) {
    console.error('[Cursor Router] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVICE_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

export default router;

