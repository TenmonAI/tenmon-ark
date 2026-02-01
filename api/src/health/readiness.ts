// api/src/health/readiness.ts
export type DbKind = "kokuzo" | "audit" | "persona";

type State = {
  listenReady: boolean;
  dbReady: Record<DbKind, boolean>;
  kokuzoVerified: boolean;
  startedAt: number;
};

const state: State = {
  listenReady: false,
  dbReady: { kokuzo: false, audit: false, persona: false },
  kokuzoVerified: false,
  startedAt: Date.now(),
};

export function markListenReady() {
  state.listenReady = true;
}

export function markDbReady(kind: DbKind) {
  state.dbReady[kind] = true;
}

export function markKokuzoVerified() {
  state.kokuzoVerified = true;
}

export function getReadiness() {
  const uptimeMs = Date.now() - state.startedAt;
  const ready =
    state.listenReady &&
    state.dbReady.kokuzo &&
    state.dbReady.audit &&
    state.dbReady.persona &&
    state.kokuzoVerified;
  // "どこで止まってるか"が一目で分かる stage
  let stage = "READY";
  if (!state.listenReady) stage = "WAIT_LISTEN";
  else if (!state.dbReady.kokuzo) stage = "WAIT_DB_KOKUZO";
  else if (!state.dbReady.audit) stage = "WAIT_DB_AUDIT";
  else if (!state.dbReady.persona) stage = "WAIT_DB_PERSONA";
  else if (!state.kokuzoVerified) stage = "WAIT_KOKUZO_VERIFY";

  return {
    ready,
    stage,
    uptimeMs,
    listenReady: state.listenReady,
    dbReady: { ...state.dbReady },
    kokuzoVerified: state.kokuzoVerified,
  };
}
