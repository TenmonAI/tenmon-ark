/**
 * Job Scheduler for TENMON-AI
 * 
 * 定期実行ジョブのスケジューラー
 * 
 * 実行ジョブ:
 * - Memory Compression Job: 毎週日曜日 午前3時（UTC）
 */

import { runMemoryCompressionJob } from "./memoryCompression";

// Cron-like scheduler (simple implementation)
const JOBS = [
  {
    name: "Memory Compression",
    schedule: "weekly", // Every Sunday at 3:00 AM UTC
    run: runMemoryCompressionJob,
  },
];

/**
 * Start the job scheduler
 */
export function startScheduler(): void {
  console.log("[Scheduler] Starting job scheduler...");

  // Schedule weekly jobs (every Sunday at 3:00 AM UTC)
  const now = new Date();
  const nextSunday = getNextSunday(now);
  const timeUntilNextSunday = nextSunday.getTime() - now.getTime();

  console.log(`[Scheduler] Next Memory Compression Job: ${nextSunday.toISOString()}`);

  // Schedule the first run
  setTimeout(() => {
    runMemoryCompressionJob();

    // Then run every week
    setInterval(() => {
      runMemoryCompressionJob();
    }, 7 * 24 * 60 * 60 * 1000); // 7 days
  }, timeUntilNextSunday);

  console.log("[Scheduler] Job scheduler started");
}

/**
 * Get the next Sunday at 3:00 AM UTC
 */
function getNextSunday(now: Date): Date {
  const nextSunday = new Date(now);
  nextSunday.setUTCHours(3, 0, 0, 0);

  // If today is Sunday and it's before 3:00 AM, schedule for today
  if (now.getUTCDay() === 0 && now.getUTCHours() < 3) {
    return nextSunday;
  }

  // Otherwise, find the next Sunday
  const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
  nextSunday.setUTCDate(now.getUTCDate() + daysUntilSunday);

  return nextSunday;
}

/**
 * Stop the scheduler (for testing)
 */
export function stopScheduler(): void {
  console.log("[Scheduler] Stopping job scheduler...");
  // In a real implementation, you would clear all intervals/timeouts
}
