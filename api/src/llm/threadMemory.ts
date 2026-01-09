// /opt/tenmon-ark/api/src/llm/threadMemory.ts
import type { ChatMsg } from "./client.js";
import { getThreadHistory, saveMessage } from "../db/threads.js";

type Turn = { role: "user" | "assistant"; content: string; at: number };

const MAX_TURNS = 12;
const STORE = new Map<string, Turn[]>();

/**
 * メッセージを保存（プロセスメモリ + SQLite）
 */
export function pushTurn(threadId: string, turn: Turn) {
  // プロセスメモリ（高速アクセス用）
  const arr = STORE.get(threadId) ?? [];
  arr.push(turn);
  const trimmed = arr.slice(Math.max(0, arr.length - MAX_TURNS));
  STORE.set(threadId, trimmed);

  // SQLite（永続化）
  try {
    saveMessage(threadId, turn.role, turn.content);
  } catch (e) {
    console.warn("[THREAD-MEMORY] Failed to save to SQLite:", e);
    // SQLiteが失敗してもプロセスメモリは動作する
  }
}

/**
 * コンテキストを取得（SQLite優先、フォールバックはプロセスメモリ）
 */
export function getContext(threadId: string): ChatMsg[] {
  // SQLiteから取得を試みる
  try {
    const history = getThreadHistory(threadId, MAX_TURNS);
    if (history.length > 0) {
      // プロセスメモリも同期
      const turns: Turn[] = history.map((h, i) => ({
        role: h.role,
        content: h.content,
        at: Date.now() - (history.length - i) * 1000, // 簡易タイムスタンプ
      }));
      STORE.set(threadId, turns);
      return history;
    }
  } catch (e) {
    console.warn("[THREAD-MEMORY] Failed to load from SQLite:", e);
  }

  // フォールバック: プロセスメモリ
  const arr = STORE.get(threadId) ?? [];
  return arr.map(t => ({ role: t.role, content: t.content }));
}

