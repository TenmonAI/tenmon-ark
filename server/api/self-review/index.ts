/**
 * Self-Review API
 * 自己省察レポートを生成・提供
 */

import express from 'express';
import { sdk } from '../../_core/sdk';
import { summarizeFindings, type SelfReviewReport } from '../../selfReview/core';
import { getDb } from '../../db';
import { chatRooms, messages } from '../../../drizzle/schema';
import { feedbackIndex } from '../feedback';

const router = express.Router();

/**
 * GET /api/self-review/report
 * 最新の自己省察レポートを返す
 * 
 * Response:
 * - 200: SelfReviewReport
 * - 401: { error: string }
 */
router.get('/report', async (req, res) => {
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

    // Feedback APIのインデックスを使用（共有）
    const globalIndex = feedbackIndex;

    // チャットログを取得
    const db = await getDb();
    if (!db) {
      return res.status(500).json({
        error: 'Database not available',
        code: 'SERVICE_ERROR',
      });
    }

    // 総メッセージ数とエラー数を取得
    const allRooms = await db.select().from(chatRooms);
    const allMessages = await db.select().from(messages);
    
    const totalMessages = allMessages.length;
    const errorCount = allMessages.filter(msg => 
      msg.content && msg.content.toLowerCase().includes('error')
    ).length;

    // 自己省察レポートを生成
    const report = await summarizeFindings(globalIndex, totalMessages, errorCount);

    return res.status(200).json(report);

  } catch (error) {
    console.error('[Self-Review] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVICE_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

export default router;

