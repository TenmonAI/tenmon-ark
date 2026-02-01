// api/src/health/readiness.ts
// Readiness state management for /api/audit endpoint

type ReadinessStage = "listen" | "db" | "kokuzo";

const readinessState = {
  listen: false,
  db: new Set<string>(),
  kokuzoVerified: false,
};

/**
 * Mark server as listening
 */
export function markListenReady(): void {
  readinessState.listen = true;
  console.log(`[READINESS] listen ready`);
}

/**
 * Mark database as ready
 */
export function markDbReady(kind: string): void {
  readinessState.db.add(kind);
  console.log(`[READINESS] db ready kind=${kind} (total: ${readinessState.db.size})`);
}

/**
 * Mark kokuzo_pages verification as complete
 */
export function markKokuzoVerified(): void {
  readinessState.kokuzoVerified = true;
  console.log(`[READINESS] kokuzo verified`);
}

/**
 * Check if all readiness stages are complete
 */
export function isReady(): boolean {
  return (
    readinessState.listen &&
    readinessState.db.has("kokuzo") &&
    readinessState.kokuzoVerified
  );
}

/**
 * Get readiness status for debugging
 */
export function getReadinessStatus(): {
  ready: boolean;
  stages: {
    listen: boolean;
    db: string[];
    kokuzoVerified: boolean;
  };
} {
  return {
    ready: isReady(),
    stages: {
      listen: readinessState.listen,
      db: Array.from(readinessState.db),
      kokuzoVerified: readinessState.kokuzoVerified,
    },
  };
}
