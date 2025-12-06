/**
 * Shared Memory Layer
 * 
 * TENMON-ARK と Manus の間で共有されるメモリ層
 * 診断結果、修復履歴、システム状態を永続化
 */

import fs from 'fs/promises';
import path from 'path';

const SHARED_DIR = path.join(process.cwd(), 'shared', 'memory');

export interface DiagnosticReport {
  id: string;
  timestamp: number;
  systemHealth: {
    score: number; // 0-100
    status: 'healthy' | 'warning' | 'critical';
  };
  issues: Array<{
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'api' | 'ui' | 'build' | 'ssl' | 'performance' | 'security';
    description: string;
    detectedAt: number;
  }>;
  metrics: {
    apiHealth: number; // 0-100
    uiHealth: number; // 0-100
    buildHealth: number; // 0-100
    sslHealth: number; // 0-100
    performanceScore: number; // 0-100
  };
}

export interface PatchIntent {
  id: string;
  timestamp: number;
  source: 'manus' | 'tenmon-ark' | 'external-ai';
  targetIssueId: string;
  patchType: 'code-fix' | 'config-change' | 'dependency-update' | 'optimization';
  description: string;
  changes: Array<{
    file: string;
    action: 'create' | 'update' | 'delete';
    content?: string;
  }>;
  validation: {
    required: boolean;
    criteria: string[];
  };
  status: 'pending' | 'validating' | 'approved' | 'rejected' | 'applied' | 'failed';
  result?: {
    success: boolean;
    message: string;
    appliedAt: number;
  };
}

export interface SelfHealCycle {
  id: string;
  timestamp: number;
  trigger: 'diagnostic' | 'error' | 'performance-degradation' | 'security-alert';
  issueId: string;
  steps: Array<{
    step: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startedAt?: number;
    completedAt?: number;
    result?: string;
  }>;
  outcome: 'healed' | 'partially-healed' | 'failed' | 'escalated-to-manus';
  completedAt?: number;
}

export interface SystemState {
  lastUpdated: number;
  version: string;
  uptime: number;
  diagnostics: {
    lastRun: number;
    lastReportId: string;
  };
  selfHeal: {
    totalCycles: number;
    successRate: number;
    lastCycleId: string;
  };
  manus: {
    lastSync: number;
    connectionStatus: 'connected' | 'disconnected' | 'error';
  };
}

/**
 * Shared Memory Layer の初期化
 */
export async function initializeSharedMemory(): Promise<void> {
  try {
    await fs.mkdir(SHARED_DIR, { recursive: true });
    
    // 初期ファイルが存在しない場合は作成
    const files = {
      'diagnostics.json': [],
      'patches.json': [],
      'heal-cycles.json': [],
      'system-state.json': {
        lastUpdated: Date.now(),
        version: '1.0.0',
        uptime: 0,
        diagnostics: {
          lastRun: 0,
          lastReportId: '',
        },
        selfHeal: {
          totalCycles: 0,
          successRate: 100,
          lastCycleId: '',
        },
        manus: {
          lastSync: 0,
          connectionStatus: 'disconnected' as const,
        },
      },
    };

    for (const [filename, defaultContent] of Object.entries(files)) {
      const filePath = path.join(SHARED_DIR, filename);
      try {
        await fs.access(filePath);
      } catch {
        await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2));
      }
    }
  } catch (error) {
    console.error('[SharedMemory] Initialization failed:', error);
    throw error;
  }
}

/**
 * 診断レポートを保存
 */
export async function saveDiagnosticReport(report: DiagnosticReport): Promise<void> {
  const filePath = path.join(SHARED_DIR, 'diagnostics.json');
  const reports = await readJSON<DiagnosticReport[]>(filePath);
  reports.push(report);
  
  // 最新100件のみ保持
  if (reports.length > 100) {
    reports.splice(0, reports.length - 100);
  }
  
  await writeJSON(filePath, reports);
  
  // システム状態を更新
  await updateSystemState({
    diagnostics: {
      lastRun: report.timestamp,
      lastReportId: report.id,
    },
  });
}

/**
 * 最新の診断レポートを取得
 */
export async function getLatestDiagnosticReport(): Promise<DiagnosticReport | null> {
  const filePath = path.join(SHARED_DIR, 'diagnostics.json');
  const reports = await readJSON<DiagnosticReport[]>(filePath);
  return reports.length > 0 ? reports[reports.length - 1] : null;
}

/**
 * すべての診断レポートを取得
 */
export async function getAllDiagnosticReports(): Promise<DiagnosticReport[]> {
  const filePath = path.join(SHARED_DIR, 'diagnostics.json');
  return await readJSON<DiagnosticReport[]>(filePath);
}

/**
 * パッチ意図を保存
 */
export async function savePatchIntent(patch: PatchIntent): Promise<void> {
  const filePath = path.join(SHARED_DIR, 'patches.json');
  const patches = await readJSON<PatchIntent[]>(filePath);
  patches.push(patch);
  
  // 最新100件のみ保持
  if (patches.length > 100) {
    patches.splice(0, patches.length - 100);
  }
  
  await writeJSON(filePath, patches);
}

/**
 * パッチ意図を更新
 */
export async function updatePatchIntent(patchId: string, updates: Partial<PatchIntent>): Promise<void> {
  const filePath = path.join(SHARED_DIR, 'patches.json');
  const patches = await readJSON<PatchIntent[]>(filePath);
  const index = patches.findIndex(p => p.id === patchId);
  
  if (index === -1) {
    throw new Error(`Patch intent not found: ${patchId}`);
  }
  
  patches[index] = { ...patches[index], ...updates };
  await writeJSON(filePath, patches);
}

/**
 * パッチ意図を取得
 */
export async function getPatchIntent(patchId: string): Promise<PatchIntent | null> {
  const filePath = path.join(SHARED_DIR, 'patches.json');
  const patches = await readJSON<PatchIntent[]>(filePath);
  return patches.find(p => p.id === patchId) || null;
}

/**
 * すべてのパッチ意図を取得
 */
export async function getAllPatchIntents(): Promise<PatchIntent[]> {
  const filePath = path.join(SHARED_DIR, 'patches.json');
  return await readJSON<PatchIntent[]>(filePath);
}

/**
 * Self-Heal サイクルを保存
 */
export async function saveSelfHealCycle(cycle: SelfHealCycle): Promise<void> {
  const filePath = path.join(SHARED_DIR, 'heal-cycles.json');
  const cycles = await readJSON<SelfHealCycle[]>(filePath);
  cycles.push(cycle);
  
  // 最新100件のみ保持
  if (cycles.length > 100) {
    cycles.splice(0, cycles.length - 100);
  }
  
  await writeJSON(filePath, cycles);
  
  // システム状態を更新
  const allCycles = cycles;
  const successfulCycles = allCycles.filter(c => c.outcome === 'healed').length;
  const successRate = allCycles.length > 0 ? (successfulCycles / allCycles.length) * 100 : 100;
  
  await updateSystemState({
    selfHeal: {
      totalCycles: allCycles.length,
      successRate,
      lastCycleId: cycle.id,
    },
  });
}

/**
 * Self-Heal サイクルを更新
 */
export async function updateSelfHealCycle(cycleId: string, updates: Partial<SelfHealCycle>): Promise<void> {
  const filePath = path.join(SHARED_DIR, 'heal-cycles.json');
  const cycles = await readJSON<SelfHealCycle[]>(filePath);
  const index = cycles.findIndex(c => c.id === cycleId);
  
  if (index === -1) {
    throw new Error(`Self-heal cycle not found: ${cycleId}`);
  }
  
  cycles[index] = { ...cycles[index], ...updates };
  await writeJSON(filePath, cycles);
}

/**
 * すべての Self-Heal サイクルを取得
 */
export async function getAllSelfHealCycles(): Promise<SelfHealCycle[]> {
  const filePath = path.join(SHARED_DIR, 'heal-cycles.json');
  return await readJSON<SelfHealCycle[]>(filePath);
}

/**
 * システム状態を取得
 */
export async function getSystemState(): Promise<SystemState> {
  const filePath = path.join(SHARED_DIR, 'system-state.json');
  return await readJSON<SystemState>(filePath);
}

/**
 * システム状態を更新
 */
export async function updateSystemState(updates: Partial<SystemState>): Promise<void> {
  const filePath = path.join(SHARED_DIR, 'system-state.json');
  const state = await readJSON<SystemState>(filePath);
  const newState = { ...state, ...updates, lastUpdated: Date.now() };
  await writeJSON(filePath, newState);
}

/**
 * JSON ファイルを読み込み
 */
async function readJSON<T>(filePath: string): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`[SharedMemory] Failed to read ${filePath}:`, error);
    throw error;
  }
}

/**
 * JSON ファイルに書き込み
 */
async function writeJSON(filePath: string, data: unknown): Promise<void> {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`[SharedMemory] Failed to write ${filePath}:`, error);
    throw error;
  }
}
