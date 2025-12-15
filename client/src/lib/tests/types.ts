/**
 * Test Client Types
 * テストクライアントの型定義
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
  autoRunnable: boolean;
  expectedResult: string;
  dependencies?: string[];
}

export interface TestResult {
  testCaseId: string;
  status: TestStatus;
  executionTime?: number;
  error?: string;
  details?: Record<string, any>;
  executedAt: string;
  executedBy?: string;
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

