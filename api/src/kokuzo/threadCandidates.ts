export type KokuzoCandidate = {
  doc: string;
  pdfPage: number;
  snippet: string;
  score: number;
};

type ThreadPickState = {
  candidates: KokuzoCandidate[];
  updatedAt: string;
};

type ThreadState = {
  pending?: "LANE_PICK" | "DANSHARI_STEP1" | "CASUAL_STEP1" | null;
  updatedAt: string;
};

const candidateMem = new Map<string, ThreadPickState>();
const stateMem = new Map<string, ThreadState>();

export function setThreadCandidates(threadId: string, candidates: KokuzoCandidate[]): void {
  candidateMem.set(threadId, { candidates, updatedAt: new Date().toISOString() });
}

export function getThreadCandidates(threadId: string): ThreadPickState | null {
  return candidateMem.get(threadId) ?? null;
}

export function pickFromThread(threadId: string, oneBasedIndex: number): KokuzoCandidate | null {
  const s = candidateMem.get(threadId);
  if (!s?.candidates?.length) return null;
  const i = Math.max(1, oneBasedIndex) - 1;
  return s.candidates[i] ?? null;
}

export function clearThreadCandidates(threadId: string): void {
  candidateMem.delete(threadId);
}

// Thread state management (pending state)
export function setThreadPending(threadId: string, pending: "LANE_PICK" | "DANSHARI_STEP1" | "CASUAL_STEP1" | null): void {
  stateMem.set(threadId, { pending, updatedAt: new Date().toISOString() });
}

export function getThreadPending(threadId: string): "LANE_PICK" | "DANSHARI_STEP1" | "CASUAL_STEP1" | null | undefined {
  return stateMem.get(threadId)?.pending;
}

export function clearThreadState(threadId: string): void {
  stateMem.delete(threadId);
}

  