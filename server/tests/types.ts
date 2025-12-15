/**
 * Test Runner Types
 * テスト実行環境の型定義
 */

export type TestPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type TestStatus = 'PASS' | 'FAIL' | 'SKIP' | 'PENDING';
export type TestCategory = 
  | 'feature' 
  | 'integration' 
  | 'evolution' 
  | 'ux';

export interface TestCase {
  id: string;
  category: TestCategory;
  feature: string;
  name: string;
  description: string;
  priority: TestPriority;
  autoRunnable: boolean; // 自動実行可能かどうか
  expectedResult: string;
  dependencies?: string[]; // 依存するテストケースID
}

export interface TestResult {
  testCaseId: string;
  status: TestStatus;
  executionTime?: number; // ミリ秒
  error?: string;
  details?: Record<string, any>;
  executedAt: string;
  executedBy?: string;
}

export interface TestSuite {
  id: string;
  name: string;
  category: TestCategory;
  testCases: TestCase[];
  results: TestResult[];
  startedAt?: string;
  completedAt?: string;
}

export interface TestSummary {
  total: number;
  pass: number;
  fail: number;
  skip: number;
  pending: number;
  passRate: number;
  highPriorityPassRate: number;
  mediumPriorityPassRate: number;
  lowPriorityPassRate: number;
  requiredConditionsMet: boolean;
  releaseEligible: 'eligible' | 'conditional' | 'not-eligible';
}

export interface ManualTestTemplate {
  testCaseId: string;
  name: string;
  description: string;
  steps: string[];
  expectedResult: string;
  screenshotRequired: boolean;
  notes?: string;
}

