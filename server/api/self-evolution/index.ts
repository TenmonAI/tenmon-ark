/**
 * Self-Evolution API
 * 改善タスクを生成・提供
 */

import express from 'express';
import { sdk } from '../../_core/sdk';
import { summarizeFindings } from '../../selfReview/core';
import { generateImprovementTasks, classifyTasks, sortTasksByPriority, type ImprovementTask } from '../../selfEvolution/genesis';
import { identifyAutoFixableTasks, summarizeAutoFix, type AutoFixSummary } from '../../selfEvolution/autoFix';
import { feedbackIndex } from '../feedback';
import { getDb } from '../../db';
import { messages } from '../../../drizzle/schema';
import autoApplyRouter from './autoApply';
import loopRouter from './loop';

const router = express.Router();

/**
 * GET /api/self-evolution/tasks
 * 生成された改善タスク一覧を返す
 * 
 * Response:
 * - 200: { tasks: ImprovementTask[], classified: Record<TaskCategory, ImprovementTask[]> }
 * - 401: { error: string }
 */
router.get('/tasks', async (req, res) => {
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

    // Self-Review Reportを生成
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

    // Self-Review Reportを生成
    const report = await summarizeFindings(globalIndex, totalMessages, errorCount);

    // 改善タスクを生成
    const tasks = generateImprovementTasks(report);
    
    // 優先度順にソート
    const sortedTasks = sortTasksByPriority(tasks);
    
    // カテゴリ別に分類
    const classified = classifyTasks(sortedTasks);

    return res.status(200).json({
      tasks: sortedTasks,
      classified,
      reportGeneratedAt: report.generatedAt,
    });

  } catch (error) {
    console.error('[Self-Evolution] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVICE_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

/**
 * GET /api/self-evolution/autoFix
 * 改善タスクを解析し、自動修復候補（patches）を返す
 * 
 * Response:
 * - 200: AutoFixSummary
 * - 401: { error: string }
 */
router.get('/autoFix', async (req, res) => {
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

    // Self-Review Reportを生成
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

    // Self-Review Reportを生成
    const report = await summarizeFindings(globalIndex, totalMessages, errorCount);

    // 改善タスクを生成
    const tasks = generateImprovementTasks(report);
    
    // 優先度順にソート
    const sortedTasks = sortTasksByPriority(tasks);
    
    // 自動修正可能なタスクを抽出
    const autoFixableTasks = identifyAutoFixableTasks(sortedTasks);
    
    // パッチサマリーを生成
    const summary = summarizeAutoFix(autoFixableTasks);

    return res.status(200).json(summary);

  } catch (error) {
    console.error('[Self-Evolution AutoFix] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVICE_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

// AutoApply ルートをマウント
router.use('/', autoApplyRouter);
// Loop ルートをマウント
router.use('/', loopRouter);

export default router;

