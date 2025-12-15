/**
 * Test Client
 * テスト実行・結果取得のクライアント関数
 */

import type { TestCase, TestResult, TestSummary, ManualTestTemplate } from './types';

export interface RunTestSuiteRequest {
  suiteId: string;
  testCaseIds?: string[];
  category?: 'feature' | 'integration' | 'evolution' | 'ux';
}

export interface RunTestSuiteResponse {
  suiteId: string;
  results: TestResult[];
  summary: TestSummary;
}

export interface ManualTestResultRequest {
  testCaseId: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  notes?: string;
  screenshotUrl?: string;
}

/**
 * テストケース一覧を取得
 */
export async function fetchTestCases(): Promise<TestCase[]> {
  try {
    const response = await fetch('/api/tests/cases');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json() as { testCases: TestCase[] };
    return data.testCases;
  } catch (error) {
    console.error('[Test Client] Error:', error);
    throw error;
  }
}

/**
 * テストスイートを実行
 */
export async function runTestSuite(request: RunTestSuiteRequest): Promise<RunTestSuiteResponse> {
  try {
    const response = await fetch('/api/tests/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json() as RunTestSuiteResponse;
    return data;

  } catch (error) {
    console.error('[Test Client] Error:', error);
    throw error;
  }
}

/**
 * テスト結果サマリーを取得
 */
export async function fetchTestSummary(): Promise<TestSummary> {
  try {
    const response = await fetch('/api/tests/summary');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json() as TestSummary;
    return data;
  } catch (error) {
    console.error('[Test Client] Error:', error);
    throw error;
  }
}

/**
 * 手動テスト用テンプレート一覧を取得
 */
export async function fetchManualTestTemplates(): Promise<ManualTestTemplate[]> {
  try {
    const response = await fetch('/api/tests/manual-templates');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json() as { templates: ManualTestTemplate[] };
    return data.templates;
  } catch (error) {
    console.error('[Test Client] Error:', error);
    throw error;
  }
}

/**
 * 手動テスト結果を記録
 */
export async function submitManualTestResult(request: ManualTestResultRequest): Promise<TestResult> {
  try {
    const response = await fetch('/api/tests/manual-result', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json() as { result: TestResult };
    return data.result;

  } catch (error) {
    console.error('[Test Client] Error:', error);
    throw error;
  }
}

/**
 * FAIL項目をSelf-Evolutionに渡せる形式で取得
 */
export async function fetchFailedTestsForEvolution(): Promise<{ report: string; format: string }> {
  try {
    const response = await fetch('/api/tests/failed-for-evolution');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json() as { report: string; format: string };
    return data;
  } catch (error) {
    console.error('[Test Client] Error:', error);
    throw error;
  }
}

