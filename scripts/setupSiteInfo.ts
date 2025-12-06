/**
 * Setup initial Site Info Memory data
 * Run via server: Add to server startup or call from tRPC
 */

import { eq } from 'drizzle-orm';
import * as db from '../server/db';

export async function setupSiteInfo() {
  console.log('[Site Info] Setting up initial data...');

  const data = [
    {
      key: 'release_status',
      value: 'pre_release',
      description: 'Current release status: pre_release, founder_only, public_beta, public_release',
    },
    {
      key: 'founder_release_date',
      value: '2025-02-28',
      description: 'Founder Edition early access date (ISO 8601 format)',
    },
    {
      key: 'public_release_date',
      value: '2025-04-01',
      description: 'Public release date (ISO 8601 format)',
    },
    {
      key: 'free_plan_available',
      value: 'false',
      description: 'Whether Free plan is available',
    },
    {
      key: 'basic_plan_available',
      value: 'false',
      description: 'Whether Basic plan is available',
    },
    {
      key: 'pro_plan_available',
      value: 'false',
      description: 'Whether Pro plan is available',
    },
    {
      key: 'founder_plan_available',
      value: 'true',
      description: 'Whether Founder plan is available',
    },
    {
      key: 'current_features',
      value: JSON.stringify([
        'Twin-Core Engine',
        'Kotodama Engine',
        'Amatsu-Kanagi Algorithm',
        'Chat Interface',
        'Voice Input',
      ]),
      description: 'Currently available features (JSON array)',
    },
    {
      key: 'upcoming_features',
      value: JSON.stringify([
        'Custom TENMON-ARK',
        'Site Crawler',
        'Advanced Memory System',
        'Multi-modal Input',
      ]),
      description: 'Upcoming features (JSON array)',
    },
  ];

  for (const item of data) {
    try {
      await db.upsertSiteInfo(item);
      console.log(`[Site Info] ✓ ${item.key}`);
    } catch (error) {
      console.error(`[Site Info] ✗ ${item.key}:`, error);
    }
  }

  console.log('[Site Info] Setup completed!');
}

// Auto-run when executed directly
setupSiteInfo()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[Site Info] Setup failed:', error);
    process.exit(1);
  });
