// /opt/tenmon-ark/api/src/llm/threadMemory.ts
import type { ChatMsg } from "./client.js";

type Turn = { role: "user" | "assistant"; content: string; at: number };

const MAX_TURNS = 12;
const STORE = new Map<string, Turn[]>();

export function pushTurn(threadId: string, turn: Turn) {
  const arr = STORE.get(threadId) ?? [];
  arr.push(turn);
  const trimmed = arr.slice(Math.max(0, arr.length - MAX_TURNS));
  STORE.set(threadId, trimmed);
}

export function getContext(threadId: string): ChatMsg[] {
  const arr = STORE.get(threadId) ?? [];
  return arr.map(t => ({ role: t.role, content: t.content }));
}

