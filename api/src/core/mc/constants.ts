// api/src/core/mc/constants.ts
// MC V2 FINAL — §8.1 定数定義

import path from 'node:path';

// ── Paths ───────────────────────────────────────────────
export const DATA_ROOT = process.env.TENMON_DATA_ROOT || '/opt/tenmon-ark-data';
export const REPO_ROOT = process.env.TENMON_REPO_ROOT || '/opt/tenmon-ark-repo';
export const MC_DATA_DIR = path.join(DATA_ROOT, 'mc');
export const DB_PATH = path.join(DATA_ROOT, 'kokuzo.sqlite');
export const CANON_DIR = path.join(REPO_ROOT, 'docs', 'ark');

// ── JSON file paths ─────────────────────────────────────
export const MC_FILES = {
  live_state:      path.join(MC_DATA_DIR, 'live_state.json'),
  git_state:       path.join(MC_DATA_DIR, 'git_state.json'),
  db_status:       path.join(MC_DATA_DIR, 'db_status.json'),
  vps_assets:      path.join(MC_DATA_DIR, 'vps_assets.json'),
  runtime_logs:    path.join(MC_DATA_DIR, 'runtime_logs.json'),
  security_audit:  path.join(MC_DATA_DIR, 'security_audit.json'),
  truth_circuit:   path.join(MC_DATA_DIR, 'truth_circuit.json'),
  issues:          path.join(MC_DATA_DIR, 'issues.json'),
  contradictions:  path.join(MC_DATA_DIR, 'contradictions.json'),
  notion_sync:     path.join(MC_DATA_DIR, 'notion_sync.json'),
  ai_handoff:      path.join(MC_DATA_DIR, 'ai-handoff.json'),
  overview:        path.join(MC_DATA_DIR, 'overview.json'),
} as const;

// ── Canon documents ─────────────────────────────────────
export const CANON_DOCS = [
  'KHS_CORE_CONSTITUTION_v1.txt',
  'TENMON_ARK_SOUL_ROOT_CONSTITUTION_V1.md',
  'TENMON_ARK_SOUL_ROOT_CONSTITUTION_V1_1_ADDENDUM.md',
  'TENMON_ARK_SOUL_ROOT_CONSTITUTION_V1_2_ADDENDUM.md',
  'OMEGA_CONTRACT_v1.txt',
  'ARK_EQUATION_DIRECTIVE_vNext.txt',
] as const;

// ── Timing (seconds) ────────────────────────────────────
export const COLLECTOR_INTERVALS = {
  live_state:      5 * 60,   // 5 min
  git_state:       10 * 60,  // 10 min
  db_status:       30 * 60,  // 30 min
  vps_assets:      60 * 60,  // 1 hour
  runtime_logs:    5 * 60,   // 5 min
  security_audit:  6 * 3600, // 6 hours
  truth_circuit:   30 * 60,  // 30 min
  notion_sync:     15 * 60,  // 15 min
  ai_handoff:      10 * 60,  // 10 min
  overview:        5 * 60,   // 5 min
} as const;

// ── Stale thresholds (seconds) ──────────────────────────
export const STALE_THRESHOLDS = {
  live_state:      15 * 60,  // 15 min
  git_state:       30 * 60,  // 30 min
  db_status:       60 * 60,  // 1 hour
  vps_assets:      2 * 3600, // 2 hours
  runtime_logs:    15 * 60,  // 15 min
  security_audit:  12 * 3600,// 12 hours
  truth_circuit:   60 * 60,  // 1 hour
  notion_sync:     30 * 60,  // 30 min
  ai_handoff:      30 * 60,  // 30 min
  overview:        15 * 60,  // 15 min
  contradictions:  30 * 60,  // 30 min
  issues:          30 * 60,  // 30 min
} as const;

// ── Service ─────────────────────────────────────────────
export const SERVICE_NAME = 'tenmon-ark-api';
export const HEALTH_ENDPOINT = 'http://127.0.0.1:3000/health';
export const API_PORT = 3000;

// ── Sanitizer patterns (§12) ────────────────────────────
export const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9_-]{20,}/g,                  // OpenAI
  /AIza[a-zA-Z0-9_-]{35}/g,                   // Google
  /ghp_[a-zA-Z0-9]{36}/g,                     // GitHub PAT
  /gho_[a-zA-Z0-9]{36}/g,                     // GitHub OAuth
  /ntn_[a-zA-Z0-9]{40,}/g,                    // Notion
  /xoxb-[a-zA-Z0-9-]+/g,                      // Slack bot
  /xoxp-[a-zA-Z0-9-]+/g,                      // Slack user
  /AKIA[A-Z0-9]{16}/g,                        // AWS Access Key
  /(?:password|secret|token|key)\s*[:=]\s*["']?[^\s"']{8,}/gi,
  /Bearer\s+[a-zA-Z0-9._-]{20,}/g,
] as const;

// ── Severity weights ────────────────────────────────────
export const SEVERITY_WEIGHTS: Record<string, number> = {
  critical: 100,
  high: 50,
  medium: 20,
  low: 5,
  info: 1,
};
