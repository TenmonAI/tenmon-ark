/**
 * Test API
 * テスト実行・結果取得API
 */

import express from 'express';
import { sdk } from '../../_core/sdk';
import { generateTestCases } from '../../tests/testCases';
import { runTestSuite, summarizeTestResults, formatFailedTestsForEvolution, type TestResult, type TestSummary } from '../../tests/runner';
import { generateAllManualTestTemplates, type ManualTestTemplate } from '../../tests/manualTestTemplate';
import type { TestCase } from '../../tests/types';

const router = express.Router();

/**
 * GET /api/tests/cases
 * テストケース一覧を取得
 */
router.get('/cases', async (req, res) => {
  try {
    const testCases = generateTestCases();
    return res.status(200).json({ testCases });
  } catch (error) {
    console.error('[Test API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVICE_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

/**
 * POST /api/tests/run
 * テストスイートを実行
 * 
 * Request:
 * - suiteId: string
 * - testCaseIds?: string[] (指定された場合、そのテストケースのみ実行)
 * - category?: 'feature' | 'integration' | 'evolution' | 'ux'
 */
router.post('/run', express.json(), async (req, res) => {
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

    const { suiteId, testCaseIds, category } = req.body;

    const allTestCases = generateTestCases();
    let testCasesToRun: TestCase[] = allTestCases;

    // フィルタリング
    if (testCaseIds && Array.isArray(testCaseIds)) {
      testCasesToRun = allTestCases.filter(tc => testCaseIds.includes(tc.id));
    } else if (category) {
      testCasesToRun = allTestCases.filter(tc => tc.category === category);
    }

    // テストスイートを実行
    const results = await runTestSuite(suiteId, testCasesToRun, {
      userId: user.id,
      userPlan: user.plan,
    });

    // 結果を集計
    const summary = summarizeTestResults(testCasesToRun);

    return res.status(200).json({
      suiteId,
      results,
      summary,
    });

  } catch (error) {
    console.error('[Test API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVICE_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

/**
 * GET /api/tests/summary
 * テスト結果サマリーを取得
 */
router.get('/summary', async (req, res) => {
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

    const testCases = generateTestCases();
    const summary = summarizeTestResults(testCases);

    return res.status(200).json(summary);

  } catch (error) {
    console.error('[Test API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVICE_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

/**
 * GET /api/tests/manual-templates
 * 手動テスト用テンプレート一覧を取得
 */
router.get('/manual-templates', async (req, res) => {
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

    const templates = generateAllManualTestTemplates();

    return res.status(200).json({ templates });

  } catch (error) {
    console.error('[Test API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVICE_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

/**
 * POST /api/tests/manual-result
 * 手動テスト結果を記録
 * 
 * Request:
 * - testCaseId: string
 * - status: 'PASS' | 'FAIL' | 'SKIP'
 * - notes?: string
 * - screenshotUrl?: string
 */
router.post('/manual-result', express.json(), async (req, res) => {
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

    const { testCaseId, status, notes, screenshotUrl } = req.body;

    if (!testCaseId || !status) {
      return res.status(400).json({
        error: 'Invalid request: testCaseId and status are required',
        code: 'INVALID_INPUT',
      });
    }

    if (!['PASS', 'FAIL', 'SKIP'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid request: status must be PASS, FAIL, or SKIP',
        code: 'INVALID_INPUT',
      });
    }

    // 手動テスト結果を記録（runner.tsのtestResultsに追加）
    const { recordManualTestResult } = await import('../../tests/runner');
    const result = await recordManualTestResult({
      testCaseId,
      status,
      notes,
      screenshotUrl,
      executedBy: user.id,
    });

    return res.status(200).json({ result });

  } catch (error) {
    console.error('[Test API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVICE_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

/**
 * GET /api/tests/failed-for-evolution
 * FAIL項目をSelf-Evolutionに渡せる形式で取得
 */
router.get('/failed-for-evolution', async (req, res) => {
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

    const testCases = generateTestCases();
    const failedTestsReport = formatFailedTestsForEvolution(testCases);

    return res.status(200).json({
      report: failedTestsReport,
      format: 'issue-genesis-ready',
    });

  } catch (error) {
    console.error('[Test API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVICE_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

export default router;

