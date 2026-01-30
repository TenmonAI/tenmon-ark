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
  
  const mem = new Map<string, ThreadPickState>();
  
  export function setThreadCandidates(threadId: string, candidates: KokuzoCandidate[]): void {
    mem.set(threadId, { candidates, updatedAt: new Date().toISOString() });
  }
  
  export function getThreadCandidates(threadId: string): ThreadPickState | null {
    return mem.get(threadId) ?? null;
  }
  
  export function pickFromThread(threadId: string, oneBasedIndex: number): KokuzoCandidate | null {
    const s = mem.get(threadId);
    if (!s?.candidates?.length) return null;
    const i = Math.max(1, oneBasedIndex) - 1;
    return s.candidates[i] ?? null;
  }
  
  export function clearThreadCandidates(threadId: string): void {
    mem.delete(threadId);
  }
  

  