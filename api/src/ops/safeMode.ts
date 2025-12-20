let safeMode = process.env.TENMON_SAFE_MODE === "1";
let safeReason: string | null = safeMode ? "env" : null;

// 直近1分のエラーが閾値を超えたら safe mode に入る（外部連携なし・ローカル集計のみ）
const errorTimestamps: number[] = [];
const ERROR_WINDOW_MS = 60_000;
const ERROR_THRESHOLD = 25;

function purge(now: number): void {
  while (errorTimestamps.length > 0) {
    const t = errorTimestamps[0]!;
    if (now - t <= ERROR_WINDOW_MS) break;
    errorTimestamps.shift();
  }
}

export function isSafeMode(): boolean {
  return safeMode;
}

export function getSafeModeReason(): string | null {
  return safeReason;
}

export function enterSafeMode(reason: string): void {
  safeMode = true;
  safeReason = reason;
}

export function observeErrorForSafeMode(): void {
  const now = Date.now();
  errorTimestamps.push(now);
  purge(now);
  if (!safeMode && errorTimestamps.length >= ERROR_THRESHOLD) {
    enterSafeMode(`auto: too many errors in ${ERROR_WINDOW_MS / 1000}s (${errorTimestamps.length})`);
  }
}


