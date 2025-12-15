/**
 * File Teleport Router
 * ファイル瞬間移動を処理
 */

import express from 'express';
import { sdk } from '../../../_core/sdk';
import * as fs from 'fs';
import * as path from 'path';

const router = express.Router();

/**
 * POST /api/deviceCluster-v3/teleport/send
 * ファイルを瞬間移動
 */
router.post('/send', express.json(), async (req, res) => {
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

    const { fileName, fileType, fileSize, base64, targetDeviceId } = req.body;

    if (!fileName || !base64) {
      return res.status(400).json({
        error: 'Invalid request: fileName and base64 are required',
        code: 'INVALID_INPUT',
      });
    }

    // /tmp/teleport ディレクトリを作成（存在しない場合）
    const teleportDir = path.join(process.cwd(), 'tmp', 'teleport');
    if (!fs.existsSync(teleportDir)) {
      fs.mkdirSync(teleportDir, { recursive: true });
    }

    // Base64 をデコードしてファイルに保存
    const buffer = Buffer.from(base64, 'base64');
    const filePath = path.join(teleportDir, fileName);
    fs.writeFileSync(filePath, buffer);

    return res.status(200).json({
      success: true,
      filePath,
      fileName,
      fileType,
      fileSize,
      targetDeviceId,
    });

  } catch (error) {
    console.error('[File Teleport Router] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVICE_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

/**
 * POST /api/deviceCluster-v3/teleport/fastlane/start
 * FastLane転送を開始
 */
router.post('/fastlane/start', express.json(), async (req, res) => {
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

    const { fileName, fileSize, fileType, targetDeviceId } = req.body;

    // TODO: FastLane転送を開始

    return res.status(200).json({
      success: true,
      transferId: `fastlane_${Date.now()}`,
    });

  } catch (error) {
    console.error('[File Teleport Router] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVICE_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

/**
 * POST /api/deviceCluster-v3/teleport/fastlane/chunk
 * FastLaneチャンクを受信
 */
router.post('/fastlane/chunk', express.json(), async (req, res) => {
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

    const { transferId, chunkId, sequence, data } = req.body;

    // TODO: FastLaneチャンクを受信

    return res.status(200).json({
      success: true,
      transferId,
      chunkId,
      sequence,
    });

  } catch (error) {
    console.error('[File Teleport Router] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVICE_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

/**
 * POST /api/deviceCluster-v3/teleport/fastlane/complete
 * FastLane転送完了
 */
router.post('/fastlane/complete', express.json(), async (req, res) => {
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

    const { transferId } = req.body;

    // TODO: FastLane転送完了処理

    return res.status(200).json({
      success: true,
      transferId,
      filePath: `/tmp/fastlane/${transferId}`,
    });

  } catch (error) {
    console.error('[File Teleport Router] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVICE_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

export default router;

