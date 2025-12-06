/**
 * Setup initial Site Info Memory data
 * Run: node scripts/setupSiteInfo.mjs
 */

import { drizzle } from 'drizzle-orm/mysql2';
import { siteInfo } from '../drizzle/schema.js';

const db = drizzle(process.env.DATABASE_URL);

async function setupSiteInfo() {
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
      await db
        .insert(siteInfo)
        .values(item)
        .onDuplicateKeyUpdate({
          set: {
            value: item.value,
            description: item.description,
            updatedAt: new Date(),
          },
        });
      console.log(`[Site Info] ✓ ${item.key}`);
    } catch (error) {
      console.error(`[Site Info] ✗ ${item.key}:`, error.message);
    }
  }

  console.log('[Site Info] Setup completed!');
  process.exit(0);
}

setupSiteInfo().catch((error) => {
  console.error('[Site Info] Setup failed:', error);
  process.exit(1);
});
