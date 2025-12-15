/**
 * Snapshot Cron — DB Snapshot定期生成
 * 
 * 定期的にSnapshotを生成し、EventLogをgzip保存
 */

import { createSnapshot } from './eventLifecycleManager';
import { getSnapshotStore } from './snapshotStore';
import { getEventLogStore } from './eventLogStore';
import * as zlib from 'zlib';
import * as fs from 'fs/promises';
import * as path from 'path';

const SNAPSHOT_INTERVAL_MS = 60 * 60 * 1000; // 1時間ごと
const EVENTLOG_BACKUP_DIR = path.join(process.cwd(), 'backups', 'eventlogs');

let cronInterval: NodeJS.Timeout | null = null;

/**
 * EventLogをgzip圧縮して保存
 */
async function saveEventLogGzip(): Promise<void> {
  try {
    const eventLogStore = getEventLogStore();
    const events = await eventLogStore.getAll();

    // gzip圧縮
    const json = JSON.stringify(events, null, 2);
    const compressed = zlib.gzipSync(json);

    // バックアップディレクトリを作成
    await fs.mkdir(EVENTLOG_BACKUP_DIR, { recursive: true });

    // ファイル名: eventlog-YYYYMMDD-HHMMSS.json.gz
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `eventlog-${timestamp}.json.gz`;
    const filepath = path.join(EVENTLOG_BACKUP_DIR, filename);

    await fs.writeFile(filepath, compressed);

    console.log(`[Snapshot Cron] EventLog saved: ${filename}`);
  } catch (error) {
    console.error('[Snapshot Cron] Failed to save EventLog:', error);
  }
}

/**
 * DB Snapshotを生成
 */
async function createDBSnapshot(): Promise<void> {
  try {
    const snapshotStore = getSnapshotStore();
    const snapshot = await createSnapshot();

    if (snapshot) {
      await snapshotStore.save(snapshot);
      console.log('[Snapshot Cron] DB Snapshot created');
    }
  } catch (error) {
    console.error('[Snapshot Cron] Failed to create DB Snapshot:', error);
  }
}

/**
 * Snapshot Cronを開始
 */
export function startSnapshotCron(): void {
  if (cronInterval) {
    clearInterval(cronInterval);
  }

  // 初回実行
  createDBSnapshot();
  saveEventLogGzip();

  // 定期実行
  cronInterval = setInterval(async () => {
    await createDBSnapshot();
    await saveEventLogGzip();
  }, SNAPSHOT_INTERVAL_MS);

  console.log('[Snapshot Cron] Started (interval: 1 hour)');
}

/**
 * Snapshot Cronを停止
 */
export function stopSnapshotCron(): void {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log('[Snapshot Cron] Stopped');
  }
}

