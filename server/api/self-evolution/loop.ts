/**
 * Self-Evolution Loop API
 * 自己進化ループを実行・管理
 */

import express from 'express';
import { sdk } from '../../../_core/sdk';
import { runEvolutionCycle, getCycleHistory, getLatestCycle, type CycleLog } from '../../../selfEvolution/loop';
import { feedbackIndex } from '../../feedback';
import { getDb } from '../../../db';
import { messages } from '../../../../drizzle/schema';

const router = express.Router();

/**
 * POST /api/self-evolution/runCycle
 * 進化サイクルを手動で実行
 * 
 * Request:
 * - autoApply: boolean (optional, default: false)
 * 
 * Response:
 * - 200: CycleLog
 * - 401: { error: string }
 */
router.post('/runCycle', express.json(), async (req, res) => {
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
    const { autoApply } = req.body;
    const shouldAutoApply = user.plan === 'founder' && autoApply === true;

    // Semantic Indexを取得
    const globalIndex = feedbackIndex;
    
    const db = await getDb();
    if (!db) {
      return res.status(500).json({
        error: 'Database not available',
        code: 'SERVICE_ERROR',
      });
    }

    // チャットログを取得
    const allMessages = await db.select().from(messages);
    const totalMessages = allMessages.length;
    const errorCount = allMessages.filter(msg => 
      msg.content && msg.content.toLowerCase().includes('error')
    ).length;

    // 進化サイクルを実行
    const cycleLog = await runEvolutionCycle(
      globalIndex,
      totalMessages,
      errorCount,
      shouldAutoApply
    );

    return res.status(200).json(cycleLog);

  } catch (error) {
    console.error('[Self-Evolution Loop] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVICE_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

/**
 * GET /api/self-evolution/cycleHistory
 * 過去のループ履歴を取得
 * 
 * Query:
 * - limit: number (optional, default: 10)
 * 
 * Response:
 * - 200: { cycles: CycleLog[], latest: CycleLog | null }
 * - 401: { error: string }
 */
router.get('/cycleHistory', async (req, res) => {
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

    // クエリパラメータを取得
    const limit = parseInt(req.query.limit as string, 10) || 10;

    // サイクル履歴を取得
    const cycles = getCycleHistory(limit);
    const latest = getLatestCycle();

    return res.status(200).json({
      cycles,
      latest,
    });

  } catch (error) {
    console.error('[Self-Evolution Loop History] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVICE_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

export default router;

