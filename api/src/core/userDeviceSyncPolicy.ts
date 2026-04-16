// TENMON_KOKUZO_RECENT_SUMMARY_SEED_LIMIT_LOCK_V1
// summary生成単位: 30分無操作または24ターン超過（非同期キュー前提）
export const SUMMARY_WINDOW_IDLE_MINUTES = 30;
export const SUMMARY_WINDOW_TURN_COUNT = 24;
export const RECENT_TURNS_LIMIT = 8;
export const SUMMARY_MAX_CHARS = 500;
export const SEED_MAX_BYTES = 2048;
export const SUMMARY_QUEUE_WORKERS = Number(process.env.TENMON_SUMMARY_QUEUE_WORKERS || 1);

export function validateSyncPayloadSize(kind: string, payloadJson: string): { ok: boolean; reason?: string } {
  if ((kind === "seed" || kind === "seedRef") && Buffer.byteLength(payloadJson, "utf8") > SEED_MAX_BYTES) {
    return { ok: false, reason: "seed_max_bytes" };
  }
  if (kind === "summary" && payloadJson.length > SUMMARY_MAX_CHARS) {
    return { ok: false, reason: "summary_max_chars" };
  }
  return { ok: true };
}
