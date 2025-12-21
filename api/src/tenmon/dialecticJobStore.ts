// Thinking Job Store（短期）

import type { DialecticResult } from "../persona/dialecticDrive.js";

/**
 * Job の状態
 */
type JobState = {
  createdAt: number;
  promise: Promise<DialecticResult | null>;
};

/**
 * Job Store（in-memory）
 */
const jobStore = new Map<string, JobState>();

/**
 * Job の有効期限（5分）
 */
const JOB_EXPIRY_MS = 5 * 60 * 1000;

/**
 * 古いJobをクリーンアップ
 */
function cleanupOldJobs(): void {
  const now = Date.now();
  for (const [jobId, job] of jobStore.entries()) {
    if (now - job.createdAt > JOB_EXPIRY_MS) {
      jobStore.delete(jobId);
      console.log(`[DIALECTIC-JOB] Cleaned up expired job: ${jobId}`);
    }
  }
}

/**
 * Jobを作成
 * 
 * @param _input 入力テキスト（ログ用、現在は未使用）
 * @param promise DialecticDriveのPromise
 * @returns jobId と promise
 */
export function createJob(
  _input: string,
  promise: Promise<DialecticResult | null>
): { jobId: string; promise: Promise<DialecticResult | null> } {
  // 古いJobをクリーンアップ
  cleanupOldJobs();

  // JobIDを生成
  const jobId = `dialectic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // Jobを保存
  jobStore.set(jobId, {
    createdAt: Date.now(),
    promise,
  });

  console.log(`[DIALECTIC-JOB] Created job: ${jobId}`);
  return { jobId, promise };
}

/**
 * Jobを取得
 * 
 * @param jobId Job ID
 * @returns Promise（存在しない場合はnull）
 */
export function getJob(jobId: string): Promise<DialecticResult | null> | null {
  const job = jobStore.get(jobId);
  
  if (!job) {
    return null;
  }

  // 期限切れチェック
  const now = Date.now();
  if (now - job.createdAt > JOB_EXPIRY_MS) {
    jobStore.delete(jobId);
    console.log(`[DIALECTIC-JOB] Job expired: ${jobId}`);
    return null;
  }

  return job.promise;
}

/**
 * Jobを削除
 */
export function deleteJob(jobId: string): void {
  jobStore.delete(jobId);
  console.log(`[DIALECTIC-JOB] Deleted job: ${jobId}`);
}

