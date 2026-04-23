// api/src/routes/mc.ts
// MC V2 FINAL — §7 Express Router (Phase 1: Read-only)

import { Router, Request, Response } from 'express';
import { mcRequireAuth, mcRequireAdmin, maybeAuth } from '../core/mc/authGuards.js';
import { readState, readRawJson, allFileStatuses } from '../core/mc/stateReader.js';
import { sanitize, auditForLeaks } from '../core/mc/sanitizer.js';
import { buildOverview } from '../core/mc/builders/overviewBuilder.js';
import { buildAiHandoff } from '../core/mc/builders/aiHandoffBuilder.js';
import { buildHandoffMarkdown } from '../core/mc/builders/handoffBuilder.js';
import type { McFileKey } from '../core/mc/stateReader.js';

const mcRouter = Router();

// ── Health ──────────────────────────────────────────────
mcRouter.get('/health', (_req: Request, res: Response) => {
  const statuses = allFileStatuses();
  const collectorCount = Object.values(statuses).filter(s => s.exists).length;
  const totalCollectors = Object.keys(statuses).length;

  res.json({
    ok: true,
    mc_version: 'v2-phase1',
    collectors_available: `${collectorCount}/${totalCollectors}`,
    generated_at: new Date().toISOString(),
  });
});

// ── Owner-only gate for nginx auth_request ───────────────
mcRouter.get('/access', mcRequireAdmin, (_req: Request, res: Response) => {
  res.status(204).end();
});

// ── PUBLIC SSOT (外部 AI が認証なしで読める) ─────────────
mcRouter.get('/overview', maybeAuth, (_req: Request, res: Response) => {
  try {
    const overview = buildOverview();
    res.json(sanitize(overview));
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'OVERVIEW_BUILD_FAILED', detail: err?.message });
  }
});

function sendAiHandoff(_req: Request, res: Response): void {
  try {
    const handoff = buildAiHandoff();
    const sanitized = sanitize(handoff);

    const jsonStr = JSON.stringify(sanitized);
    const leaks = auditForLeaks(jsonStr);
    if (leaks.length > 0) {
      console.error('[MC] ai-handoff leak audit FAILED:', leaks);
      res.status(500).json({ ok: false, error: 'LEAK_DETECTED' });
      return;
    }

    res.json(sanitized);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'HANDOFF_BUILD_FAILED', detail: err?.message });
  }
}

mcRouter.get('/ai-handoff.json', maybeAuth, sendAiHandoff);
mcRouter.get('/ai-handoff', maybeAuth, sendAiHandoff);

mcRouter.get('/handoff', maybeAuth, (req: Request, res: Response) => {
  try {
    const handoff = buildHandoffMarkdown();
    const accept = req.headers.accept || '';
    if (accept.includes('text/markdown') || accept.includes('text/plain')) {
      res.type('text/markdown').send(handoff.markdown);
    } else {
      res.json(handoff);
    }
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'HANDOFF_BUILD_FAILED', detail: err?.message });
  }
});

// ── Individual collector endpoints ──────────────────────
const COLLECTOR_ENDPOINTS: Array<{ path: string; key: McFileKey }> = [
  { path: '/live-state',      key: 'live_state' },
  { path: '/git-state',       key: 'git_state' },
  { path: '/db-status',       key: 'db_status' },
  { path: '/vps-assets',      key: 'vps_assets' },
  { path: '/runtime-logs',    key: 'runtime_logs' },
  { path: '/security-audit',  key: 'security_audit' },
  { path: '/truth-circuit',   key: 'truth_circuit' },
  { path: '/issues',          key: 'issues' },
  { path: '/contradictions',  key: 'contradictions' },
  { path: '/notion-sync',     key: 'notion_sync' },
];

const PUBLIC_COLLECTOR_KEYS = new Set<McFileKey>(['truth_circuit', 'issues']);

for (const { path, key } of COLLECTOR_ENDPOINTS) {
  const authMw = PUBLIC_COLLECTOR_KEYS.has(key) ? maybeAuth : mcRequireAuth;
  mcRouter.get(path, authMw, (_req: Request, res: Response) => {
    const data = readState(key);
    if (!data) {
      return res.status(404).json({
        ok: false,
        error: 'NOT_COLLECTED_YET',
        key,
        hint: `Run the ${key} collector first`,
      });
    }
    res.json(sanitize(data));
  });
}

// ── File statuses (admin only) ──────────────────────────
mcRouter.get('/file-statuses', mcRequireAdmin, (_req: Request, res: Response) => {
  res.json({
    generated_at: new Date().toISOString(),
    files: allFileStatuses(),
  });
});

// ── Raw JSON download (admin only) ──────────────────────
mcRouter.get('/raw/:key', mcRequireAdmin, (req: Request, res: Response) => {
  const key = req.params.key?.replace(/-/g, '_') as McFileKey;
  const raw = readRawJson(key);
  if (!raw) {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND', key });
  }

  // Sanitize even raw output
  try {
    const parsed = JSON.parse(raw);
    const sanitized = sanitize(parsed);
    res.type('application/json').send(JSON.stringify(sanitized, null, 2));
  } catch {
    res.status(500).json({ ok: false, error: 'PARSE_FAILED' });
  }
});

export default mcRouter;
