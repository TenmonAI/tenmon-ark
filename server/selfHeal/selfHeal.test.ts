/**
 * TENMON-ARK Self-Heal OS v1.0
 * 統合テスト
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { diagnosticsEngine, DiagnosticIssue } from './diagnosticsEngine';
import { selfReportLayer } from './selfReportLayer';
import { selfPatchLayer, PatchProposal } from './selfPatchLayer';
import { selfVerifyEngine } from './selfVerifyEngine';
import { selfEvolveFoundation } from './selfEvolveFoundation';
import { selfHealOS } from './selfHealOS';

describe('Self-Heal OS v1.0 - Phase 1: Diagnostics Engine', () => {
  beforeEach(() => {
    diagnosticsEngine.clearIssues();
  });

  it('should detect React 19 undefined return', () => {
    const issue = diagnosticsEngine.checkUIRenderTree('TestComponent', undefined);
    expect(issue).not.toBeNull();
    expect(issue?.type).toBe('ui');
    expect(issue?.severity).toBe('critical');
    expect(issue?.message).toContain('undefined');
  });

  it('should detect empty fragment', () => {
    const emptyFragment = {
      type: Symbol.for('react.fragment'),
      props: undefined,
    };
    const issue = diagnosticsEngine.checkUIRenderTree('TestComponent', emptyFragment);
    expect(issue).not.toBeNull();
    expect(issue?.type).toBe('ui');
    expect(issue?.severity).toBe('high');
  });

  it('should detect tRPC errors', () => {
    const error = new Error('tRPC procedure failed');
    const issue = diagnosticsEngine.checkTRPCIO('test.procedure', { test: true }, null, error);
    expect(issue).not.toBeNull();
    expect(issue?.type).toBe('api');
    expect(issue?.severity).toBe('high');
  });

  it('should detect API 5xx errors', () => {
    const issue = diagnosticsEngine.checkAPIResponse('/api/test', 500, null);
    expect(issue).not.toBeNull();
    expect(issue?.type).toBe('api');
    expect(issue?.severity).toBe('critical');
  });

  it('should detect build mismatch', () => {
    const issue = diagnosticsEngine.checkBuildMismatch('hash-123', 'hash-456');
    expect(issue).not.toBeNull();
    expect(issue?.type).toBe('build');
    expect(issue?.severity).toBe('critical');
  });

  it('should generate diagnostic report', () => {
    // 複数のイシューを記録
    diagnosticsEngine.recordIssue({
      type: 'ui',
      severity: 'critical',
      message: 'Test UI issue',
      timestamp: Date.now(),
    });
    diagnosticsEngine.recordIssue({
      type: 'api',
      severity: 'high',
      message: 'Test API issue',
      timestamp: Date.now(),
    });

    const report = diagnosticsEngine.generateReport();
    expect(report.uiIssues.length).toBe(1);
    expect(report.apiIssues.length).toBe(1);
    expect(report.systemHealth.overall).toBeLessThan(100);
    expect(report.suggestions.length).toBeGreaterThan(0);
  });

  it('should calculate system health correctly', () => {
    const report = diagnosticsEngine.generateReport();
    expect(report.systemHealth.overall).toBeGreaterThanOrEqual(0);
    expect(report.systemHealth.overall).toBeLessThanOrEqual(100);
  });
});

describe('Self-Heal OS v1.0 - Phase 2: Self-Report Layer', () => {
  beforeEach(() => {
    diagnosticsEngine.clearIssues();
    selfReportLayer.clearReportHistory();
  });

  it('should determine severity correctly', () => {
    // 複数のcriticalイシューを記録してシステムヘルスを70未満にする
    diagnosticsEngine.recordIssue({
      type: 'ui',
      severity: 'critical',
      message: 'Critical issue 1',
      timestamp: Date.now(),
    });
    diagnosticsEngine.recordIssue({
      type: 'ui',
      severity: 'critical',
      message: 'Critical issue 2',
      timestamp: Date.now(),
    });

    const report = diagnosticsEngine.generateReport();
    expect(report.systemHealth.overall).toBeLessThan(70);
  });

  it('should detect affected routes', () => {
    diagnosticsEngine.recordIssue({
      type: 'router',
      severity: 'medium',
      message: 'Route error',
      location: '/test/route',
      timestamp: Date.now(),
    });

    const report = diagnosticsEngine.generateReport();
    expect(report).toBeDefined();
  });

  it('should determine auto-report threshold', () => {
    const report = diagnosticsEngine.generateReport();
    const shouldReport = selfReportLayer.shouldAutoReport(report, 70);
    expect(typeof shouldReport).toBe('boolean');
  });

  it('should store report history', async () => {
    const report = diagnosticsEngine.generateReport();
    const systemInfo = {
      version: '1.0.0',
      environment: 'test',
    };

    // Note: sendReport will fail in test environment, but history should still be recorded
    try {
      await selfReportLayer.sendReport(report, 'test', systemInfo);
    } catch {
      // Expected to fail in test environment
    }

    const history = selfReportLayer.getReportHistory();
    expect(history.length).toBeGreaterThan(0);
  });
});

describe('Self-Heal OS v1.0 - Phase 3: Self-Patch Layer', () => {
  beforeEach(() => {
    diagnosticsEngine.clearIssues();
  });

  it('should validate patch proposal', () => {
    const patch: PatchProposal = {
      patchType: 'ui',
      changedFiles: ['client/src/components/Test.tsx'],
      codeDiff: 'return null;',
      reasoning: 'Fix undefined return',
      expectedOutcome: 'Component returns null instead of undefined',
      timestamp: Date.now(),
      priority: 8,
      riskLevel: 'low',
    };

    diagnosticsEngine.recordIssue({
      type: 'ui',
      severity: 'critical',
      message: 'Test issue',
      timestamp: Date.now(),
    });

    const report = diagnosticsEngine.generateReport();
    const validation = selfPatchLayer.validatePatch(patch, report);

    expect(validation.valid).toBe(true);
    expect(validation.safetyScore).toBeGreaterThan(0);
  });

  it('should reject invalid patch', () => {
    const patch: PatchProposal = {
      patchType: 'ui',
      changedFiles: Array(15).fill('test.ts'), // Too many files
      codeDiff: '',
      reasoning: '',
      expectedOutcome: '',
      timestamp: Date.now(),
      priority: 1,
      riskLevel: 'high',
    };

    const report = diagnosticsEngine.generateReport();
    const validation = selfPatchLayer.validatePatch(patch, report);

    expect(validation.valid).toBe(false);
    expect(validation.warnings.length).toBeGreaterThan(0);
  });

  it('should perform safety precheck', async () => {
    const patch: PatchProposal = {
      patchType: 'ui',
      changedFiles: ['client/src/components/Test.tsx'],
      codeDiff: 'return null;',
      reasoning: 'Fix undefined return',
      expectedOutcome: 'Component returns null',
      timestamp: Date.now(),
      priority: 8,
      riskLevel: 'low',
    };

    const safetyCheck = await selfPatchLayer.performSafetyPrecheck(patch);
    expect(safetyCheck.passed).toBeDefined();
    expect(safetyCheck.checks).toBeDefined();
  });

  it('should record patch history', () => {
    const patch: PatchProposal = {
      patchType: 'ui',
      changedFiles: ['test.tsx'],
      codeDiff: 'test',
      reasoning: 'test',
      expectedOutcome: 'test',
      timestamp: Date.now(),
      priority: 5,
      riskLevel: 'low',
    };

    selfPatchLayer.recordPatch(patch);
    const history = selfPatchLayer.getPatchHistory();
    expect(history.length).toBeGreaterThan(0);
  });
});

describe('Self-Heal OS v1.0 - Phase 4: Self-Verify Engine', () => {
  beforeEach(() => {
    diagnosticsEngine.clearIssues();
    selfVerifyEngine.clearConsoleErrors();
    selfVerifyEngine.clearErrorBoundaryLogs();
  });

  it('should check error recurrence', async () => {
    const originalReport = diagnosticsEngine.generateReport();
    const patch: PatchProposal = {
      patchType: 'ui',
      changedFiles: ['test.tsx'],
      codeDiff: 'return null;',
      reasoning: 'Fix undefined return',
      expectedOutcome: 'No more undefined returns',
      timestamp: Date.now(),
      priority: 8,
      riskLevel: 'low',
    };

    const noRecurrence = await selfVerifyEngine.checkErrorRecurrence(originalReport, patch);
    expect(typeof noRecurrence).toBe('boolean');
  });

  it('should record console errors', () => {
    selfVerifyEngine.recordConsoleError('Test console error');
    const isClean = selfVerifyEngine.checkConsoleClean();
    expect(isClean).toBe(false);
  });

  it('should record ErrorBoundary logs', () => {
    selfVerifyEngine.recordErrorBoundaryLog('Test ErrorBoundary log');
    const isClean = selfVerifyEngine.checkErrorBoundaryClean();
    expect(isClean).toBe(false);
  });

  it('should perform comprehensive verification', async () => {
    const originalReport = diagnosticsEngine.generateReport();
    const patch: PatchProposal = {
      patchType: 'ui',
      changedFiles: ['test.tsx'],
      codeDiff: 'return null;',
      reasoning: 'Fix',
      expectedOutcome: 'Fixed',
      timestamp: Date.now(),
      priority: 8,
      riskLevel: 'low',
    };

    const verification = await selfVerifyEngine.performVerification(originalReport, patch);
    expect(verification.passed).toBeDefined();
    expect(verification.overallScore).toBeGreaterThanOrEqual(0);
    expect(verification.overallScore).toBeLessThanOrEqual(100);
    expect(verification.checks).toBeDefined();
  });

  it('should generate Self-Heal confirmation', async () => {
    const originalReport = diagnosticsEngine.generateReport();
    const patch: PatchProposal = {
      patchType: 'ui',
      changedFiles: ['test.tsx'],
      codeDiff: 'return null;',
      reasoning: 'Fix',
      expectedOutcome: 'Fixed',
      timestamp: Date.now(),
      priority: 8,
      riskLevel: 'low',
    };

    const verification = await selfVerifyEngine.performVerification(originalReport, patch);
    const confirmation = selfVerifyEngine.generateSelfHealConfirmation(verification);

    expect(confirmation.confirmed).toBeDefined();
    expect(confirmation.message).toBeDefined();
    expect(confirmation.verificationResult).toBe(verification);
  });
});

describe('Self-Heal OS v1.0 - Phase 5: Self-Evolve Foundation', () => {
  beforeEach(() => {
    diagnosticsEngine.clearIssues();
    selfEvolveFoundation.clearFailureMemory();
    selfEvolveFoundation.clearPredictiveAlerts();
    selfEvolveFoundation.clearOptimizationSuggestions();
  });

  it('should learn from failure', async () => {
    const issue: DiagnosticIssue = {
      type: 'ui',
      severity: 'critical',
      message: 'Component returned undefined',
      location: 'TestComponent',
      timestamp: Date.now(),
    };

    const patch: PatchProposal = {
      patchType: 'ui',
      changedFiles: ['test.tsx'],
      codeDiff: 'return null;',
      reasoning: 'Fix undefined return',
      expectedOutcome: 'Component returns null',
      timestamp: Date.now(),
      priority: 8,
      riskLevel: 'low',
    };

    diagnosticsEngine.recordIssue(issue);
    const report = diagnosticsEngine.generateReport();
    const verification = await selfVerifyEngine.performVerification(report, patch);

    selfEvolveFoundation.learnFromFailure(issue, patch, verification);

    const memory = selfEvolveFoundation.getFailureMemory();
    expect(memory.size).toBeGreaterThan(0);
  });

  it('should predict issues', () => {
    diagnosticsEngine.recordIssue({
      type: 'ui',
      severity: 'high',
      message: 'Test issue',
      timestamp: Date.now(),
    });

    const report = diagnosticsEngine.generateReport();
    const alerts = selfEvolveFoundation.predictIssues(report);

    expect(Array.isArray(alerts)).toBe(true);
  });

  it('should generate optimization suggestions', () => {
    const report = diagnosticsEngine.generateReport();
    const performanceMetrics = {
      pageLoadTime: 5000,
      apiResponseTime: 2000,
      buildTime: 90000,
    };

    const suggestions = selfEvolveFoundation.generateOptimizationSuggestions(report, performanceMetrics);
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('should calculate evolution metrics', () => {
    const metrics = selfEvolveFoundation.getEvolutionMetrics();

    expect(metrics.totalFailuresLearned).toBeGreaterThanOrEqual(0);
    expect(metrics.preventedIssues).toBeGreaterThanOrEqual(0);
    expect(metrics.optimizationsApplied).toBeGreaterThanOrEqual(0);
    expect(metrics.systemReliability).toBeGreaterThanOrEqual(0);
    expect(metrics.systemReliability).toBeLessThanOrEqual(100);
    expect(metrics.evolutionScore).toBeGreaterThanOrEqual(0);
    expect(metrics.evolutionScore).toBeLessThanOrEqual(100);
  });

  it('should prevent issues', () => {
    const alert = {
      alertType: 'warning' as const,
      prediction: 'Test prediction',
      confidence: 80,
      timestamp: Date.now(),
      suggestedAction: 'Test action',
      preventiveMeasures: ['Test measure'],
    };

    selfEvolveFoundation.preventIssue(alert);
    const metrics = selfEvolveFoundation.getEvolutionMetrics();
    expect(metrics.preventedIssues).toBeGreaterThan(0);
  });

  it('should apply optimization', () => {
    const suggestion = {
      category: 'performance' as const,
      suggestion: 'Test optimization',
      impact: 'high' as const,
      effort: 'low' as const,
      priority: 9,
      timestamp: Date.now(),
    };

    selfEvolveFoundation.applyOptimization(suggestion);
    const metrics = selfEvolveFoundation.getEvolutionMetrics();
    expect(metrics.optimizationsApplied).toBeGreaterThan(0);
  });
});

describe('Self-Heal OS v1.0 - Phase 6: Integration', () => {
  beforeEach(() => {
    diagnosticsEngine.clearIssues();
  });

  it('should run diagnostics', async () => {
    const report = await selfHealOS.runDiagnostics();
    expect(report).toBeDefined();
    expect(report.systemHealth).toBeDefined();
    expect(report.systemHealth.overall).toBeGreaterThanOrEqual(0);
    expect(report.systemHealth.overall).toBeLessThanOrEqual(100);
  });

  it('should get Self-Heal OS status', () => {
    const status = selfHealOS.getStatus();

    expect(status.isHealthy).toBeDefined();
    expect(status.systemHealth).toBeGreaterThanOrEqual(0);
    expect(status.systemHealth).toBeLessThanOrEqual(100);
    expect(status.activeCycles).toBeGreaterThanOrEqual(0);
    expect(status.totalCyclesCompleted).toBeGreaterThanOrEqual(0);
    expect(status.successRate).toBeGreaterThanOrEqual(0);
    expect(status.successRate).toBeLessThanOrEqual(100);
    expect(status.evolutionMetrics).toBeDefined();
  });

  it('should validate patch', async () => {
    const patch: PatchProposal = {
      patchType: 'ui',
      changedFiles: ['test.tsx'],
      codeDiff: 'return null;',
      reasoning: 'Fix undefined return',
      expectedOutcome: 'Component returns null',
      timestamp: Date.now(),
      priority: 8,
      riskLevel: 'low',
    };

    diagnosticsEngine.recordIssue({
      type: 'ui',
      severity: 'critical',
      message: 'Test issue',
      timestamp: Date.now(),
    });

    const report = await selfHealOS.runDiagnostics();
    const validation = await selfHealOS.validatePatch(patch, report);

    expect(validation.valid).toBeDefined();
    expect(validation.safetyScore).toBeGreaterThanOrEqual(0);
  });

  it('should perform safety check', async () => {
    const patch: PatchProposal = {
      patchType: 'ui',
      changedFiles: ['test.tsx'],
      codeDiff: 'return null;',
      reasoning: 'Fix',
      expectedOutcome: 'Fixed',
      timestamp: Date.now(),
      priority: 8,
      riskLevel: 'low',
    };

    const safetyCheck = await selfHealOS.performSafetyCheck(patch);
    expect(safetyCheck.passed).toBeDefined();
  });

  it('should verify repair', async () => {
    const report = await selfHealOS.runDiagnostics();
    const patch: PatchProposal = {
      patchType: 'ui',
      changedFiles: ['test.tsx'],
      codeDiff: 'return null;',
      reasoning: 'Fix',
      expectedOutcome: 'Fixed',
      timestamp: Date.now(),
      priority: 8,
      riskLevel: 'low',
    };

    const verification = await selfHealOS.verifyRepair(report, patch);
    expect(verification.passed).toBeDefined();
    expect(verification.overallScore).toBeGreaterThanOrEqual(0);
  });

  it('should generate confirmation', async () => {
    const report = await selfHealOS.runDiagnostics();
    const patch: PatchProposal = {
      patchType: 'ui',
      changedFiles: ['test.tsx'],
      codeDiff: 'return null;',
      reasoning: 'Fix',
      expectedOutcome: 'Fixed',
      timestamp: Date.now(),
      priority: 8,
      riskLevel: 'low',
    };

    const verification = await selfHealOS.verifyRepair(report, patch);
    const confirmation = selfHealOS.generateConfirmation(verification);

    expect(confirmation.confirmed).toBeDefined();
    expect(confirmation.message).toBeDefined();
  });

  it('should learn from failure', async () => {
    const report = await selfHealOS.runDiagnostics();
    const patch: PatchProposal = {
      patchType: 'ui',
      changedFiles: ['test.tsx'],
      codeDiff: 'return null;',
      reasoning: 'Fix',
      expectedOutcome: 'Fixed',
      timestamp: Date.now(),
      priority: 8,
      riskLevel: 'low',
    };

    diagnosticsEngine.recordIssue({
      type: 'ui',
      severity: 'critical',
      message: 'Test issue',
      timestamp: Date.now(),
    });

    const updatedReport = await selfHealOS.runDiagnostics();
    const verification = await selfHealOS.verifyRepair(updatedReport, patch);

    selfHealOS.learnFromFailure(updatedReport, patch, verification);

    const memory = selfEvolveFoundation.getFailureMemory();
    expect(memory.size).toBeGreaterThan(0);
  });

  it('should predict issues', async () => {
    const report = await selfHealOS.runDiagnostics();
    const alerts = selfHealOS.predictIssues(report);

    expect(Array.isArray(alerts)).toBe(true);
  });

  it('should generate optimizations', async () => {
    const report = await selfHealOS.runDiagnostics();
    const suggestions = selfHealOS.generateOptimizations(report);

    expect(Array.isArray(suggestions)).toBe(true);
  });
});
