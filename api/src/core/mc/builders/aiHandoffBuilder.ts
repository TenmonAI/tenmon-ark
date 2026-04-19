// api/src/core/mc/builders/aiHandoffBuilder.ts
// MC V2 FINAL — §8.3 AI Handoff Builder

import fs from 'node:fs';
import { readState } from '../stateReader.js';
import { REPO_ROOT, DATA_ROOT, CANON_DIR, CANON_DOCS } from '../constants.js';
import type { McAiHandoff, McgitState, McIssues } from '../types.js';

/**
 * Build the AI handoff JSON.
 * This is the primary document that Manus/Claude/Cursor reads
 * to understand the current state of TENMON-ARK.
 */
export function buildAiHandoff(): McAiHandoff {
  const gitState = readState<McgitState>('git_state');
  const issues = readState<McIssues>('issues');

  // Detect soul root bind status by checking if files exist
  const soulRootFiles: Record<string, string> = {
    irohaKotodamaLoader: 'api/src/core/irohaKotodamaLoader.ts',
    kotodamaGentenLoader: 'api/src/core/kotodamaGentenLoader.ts',
    amaterasuAxisMap: 'api/src/data/amaterasuAxisMap.ts',
    unifiedSoundLoader: 'api/src/core/unifiedSoundLoader.ts',
    satoriEnforcement: 'api/src/core/satoriEnforcement.ts',
    constitutionLoader: 'api/src/core/constitutionLoader.ts',
    truthAxisEngine: 'api/src/core/truthAxisEngine.ts',
    kotodamaHishoLoader: 'api/src/core/kotodamaHishoLoader.ts',
  };

  const bindStatus: Record<string, boolean> = {};
  for (const [name, relPath] of Object.entries(soulRootFiles)) {
    const fullPath = `${REPO_ROOT}/${relPath}`;
    bindStatus[name] = fs.existsSync(fullPath);
  }

  // Count iroha paragraphs from JSON
  let irohaParagraphs = 0;
  try {
    const irohaPath = `${REPO_ROOT}/server/data/iroha_kotodama_hisho.json`;
    if (fs.existsSync(irohaPath)) {
      const raw = fs.readFileSync(irohaPath, 'utf-8');
      const data = JSON.parse(raw);
      if (data?.content && Array.isArray(data.content)) {
        irohaParagraphs = data.content.length;
      }
    }
  } catch { /* ignore */ }

  // Count genten sounds (kotodama_meanings is a Record<string, ...> with 12 entries)
  let gentenSounds = 0;
  try {
    // File lives at repo root, not api/src/data/
    const gentenPath = `${REPO_ROOT}/kotodama_genten_data.json`;
    if (fs.existsSync(gentenPath)) {
      const raw = fs.readFileSync(gentenPath, 'utf-8');
      const data = JSON.parse(raw);
      if (data?.kotodama_meanings && typeof data.kotodama_meanings === 'object') {
        gentenSounds = Object.keys(data.kotodama_meanings).length;
      }
    }
  } catch { /* ignore */ }

  // Canon documents that must not be touched
  const doNotTouch: string[] = [];
  for (const doc of CANON_DOCS) {
    const fullPath = `${CANON_DIR}/${doc}`;
    if (fs.existsSync(fullPath)) {
      doNotTouch.push(`docs/ark/${doc}`);
    }
  }

  const handoff: McAiHandoff = {
    generated_at: new Date().toISOString(),
    source_files: ['git_state.json', 'issues.json', 'repo scan'],
    stale: false,
    version: 'v1',

    identity: {
      project: 'TENMON-ARK',
      definition: '悟りを開いた世界初のAI — 天聞アーク',
      founder: 'TENMON (天聞)',
      founder_aliases: ['TENMON', '天聞', 'テンモン'],
    },

    canonical_runtime: {
      git_sha: gitState?.head_sha_short ?? 'unknown',
      branch: gitState?.branch ?? 'unknown',
      service: 'tenmon-ark-api.service',
      repo_root: REPO_ROOT,
      data_root: DATA_ROOT,
    },

    soul_root: {
      status: Object.values(bindStatus).every(v => v) ? 'fully_connected' : 'partially_connected',
      iroha_paragraphs: irohaParagraphs,
      genten_sounds: gentenSounds,
      amaterasu_anchors: 6,
      bind_status: bindStatus,
    },

    start_here_quickstart: [
      'git pull origin feature/unfreeze-v4',
      'Read docs/ark/TENMON_ARK_SOUL_ROOT_CONSTITUTION_V1.md',
      'Read docs/ark/TENMON_MC_IMPLEMENTATION_DIRECTIVE_V2_FINAL.md',
      'curl http://127.0.0.1:3000/api/mc/overview',
      'curl http://127.0.0.1:3000/api/mc/ai-handoff.json',
    ],

    do_not_touch: doNotTouch,

    known_issues: issues?.items?.filter(i => !i.resolved).slice(0, 20) ?? [],

    open_tasks_from_notion: 0, // Phase 2: notion_sync integration
  };

  return handoff;
}
