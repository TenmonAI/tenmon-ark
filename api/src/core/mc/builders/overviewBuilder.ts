// api/src/core/mc/builders/overviewBuilder.ts
// MC V2 FINAL — §8.4 Overview Builder

import { readState, allFileStatuses } from '../stateReader.js';
import type { McOverview, McLiveState, McgitState, McIssues, McTruthCircuit } from '../types.js';
import { HEALTH_ENDPOINT, SERVICE_NAME } from '../constants.js';
import { readGitLiveStateV1 } from '../gitLiveState.js';

/**
 * Build the overview object by aggregating data from collector JSONs.
 * This is a pure read-only aggregation — no side effects.
 */
export function buildOverview(): McOverview {
  let liveState: McLiveState | null = null;
  let gitState: McgitState | null = null;
  let issues: McIssues | null = null;
  let truthCircuit: McTruthCircuit | null = null;

  try { liveState = readState<McLiveState>('live_state'); } catch (e) { console.warn('[MC] readState(live_state) failed:', e); }
  try { gitState = readState<McgitState>('git_state'); } catch (e) { console.warn('[MC] readState(git_state) failed:', e); }
  try { issues = readState<McIssues>('issues'); } catch (e) { console.warn('[MC] readState(issues) failed:', e); }
  try { truthCircuit = readState<McTruthCircuit>('truth_circuit'); } catch (e) { console.warn('[MC] readState(truth_circuit) failed:', e); }

  const fileStatuses = allFileStatuses();

  // Compute freshness detail
  const freshnessDetail: Record<string, string> = {};
  for (const [key, info] of Object.entries(fileStatuses)) {
    if (info.mtime) {
      freshnessDetail[key] = info.mtime;
    }
  }

  // Count issues by severity
  const criticalBlockers = issues?.items?.filter(i => i.severity === 'critical' && !i.resolved).length ?? 0;
  const warnings = issues?.items?.filter(i => !i.resolved && i.severity !== 'critical').length ?? 0;
  const contradictionsCount = 0; // Phase 2

  const overview: McOverview = {
    generated_at: new Date().toISOString(),
    source_files: Object.values(fileStatuses)
      .filter(f => f.exists)
      .map(f => f.path),
    stale: false,

    service: {
      name: SERVICE_NAME,
      status: liveState?.service?.active ? 'running' : 'unknown',
      uptime_sec: liveState?.service?.uptime_sec ?? null,
    },

    health: {
      ok: liveState?.health?.ok ?? false,
      endpoint: HEALTH_ENDPOINT,
      response_ms: liveState?.health?.response_ms ?? 0,
    },

    // CARD-MC-09D: live git を優先。collector JSON の head_subject / head_date は
    //   live 側で取れないので、そこだけは gitState フォールバックを保持する。
    git: (() => {
      const live = readGitLiveStateV1();
      if (live.ok) {
        return {
          branch: live.branch || gitState?.branch || 'unknown',
          head_sha_short: live.head_sha_short,
          last_commit_at: gitState?.head_date ?? 'unknown',
          last_commit_subject: gitState?.head_subject ?? 'unknown',
          dirty: live.dirty ?? gitState?.dirty ?? false,
        };
      }
      return {
        branch: gitState?.branch ?? 'unknown',
        head_sha_short: gitState?.head_sha_short ?? 'unknown',
        last_commit_at: gitState?.head_date ?? 'unknown',
        last_commit_subject: gitState?.head_subject ?? 'unknown',
        dirty: gitState?.dirty ?? false,
      };
    })(),

    state: {
      critical_blockers: criticalBlockers,
      warnings,
      contradictions_count: contradictionsCount,
    },

    freshness_detail: {
      last_collector_run: freshnessDetail,
      last_notion_sync: fileStatuses.notion_sync?.mtime ?? null,
      last_ai_handoff_build: fileStatuses.ai_handoff?.mtime ?? null,
    },

    links: {
      overview: '/api/mc/overview',
      ai_handoff: '/api/mc/ai-handoff.json',
      handoff: '/api/mc/handoff',
      live_state: '/api/mc/live-state',
      git_state: '/api/mc/git-state',
    },
  };

  return overview;
}
