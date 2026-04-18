// api/src/core/mc/builders/handoffBuilder.ts
// MC V2 FINAL — Handoff Markdown Builder (Canon document reader)

import fs from 'node:fs';
import { CANON_DIR, CANON_DOCS } from '../constants.js';
import type { McHandoff } from '../types.js';

/**
 * Build a Markdown handoff document by concatenating canon documents
 * with a generated header showing current state.
 */
export function buildHandoffMarkdown(): McHandoff {
  const sections: string[] = [];

  sections.push('# TENMON-ARK Mission Control — Handoff Document');
  sections.push('');
  sections.push(`> Generated: ${new Date().toISOString()}`);
  sections.push('');
  sections.push('## Canon Documents');
  sections.push('');

  for (const doc of CANON_DOCS) {
    const fullPath = `${CANON_DIR}/${doc}`;
    try {
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        sections.push(`### ${doc}`);
        sections.push(`- Path: \`docs/ark/${doc}\``);
        sections.push(`- Size: ${(stat.size / 1024).toFixed(1)} KB`);
        sections.push(`- Last modified: ${stat.mtime.toISOString()}`);
        sections.push('');
      }
    } catch {
      sections.push(`### ${doc} — NOT FOUND`);
      sections.push('');
    }
  }

  sections.push('## Quick Reference');
  sections.push('');
  sections.push('| Endpoint | Description |');
  sections.push('|----------|-------------|');
  sections.push('| `/api/mc/overview` | System overview (aggregated) |');
  sections.push('| `/api/mc/ai-handoff.json` | AI handoff document |');
  sections.push('| `/api/mc/handoff` | This document (Markdown) |');
  sections.push('| `/api/mc/live-state` | Live VPS state |');
  sections.push('| `/api/mc/git-state` | Git repository state |');
  sections.push('| `/api/mc/health` | MC health check |');
  sections.push('');

  return {
    markdown: sections.join('\n'),
    generated_at: new Date().toISOString(),
    source: 'handoffBuilder',
  };
}
