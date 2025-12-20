import { dbPrepare } from "../db/index.js";
import { conversationCount, conversationReadRecent } from "./conversationStore.js";
import { setPersonaState, getCurrentPersonaStateInternal } from "../persona/personaState.js";
import { recordInertiaOnModeChange } from "../persona/inertia.js";
import type { KokuzoCoreRow, MemoryRole } from "./memoryTypes.js";

function nowIso(): string {
  return new Date().toISOString();
}

const upsertStmt = dbPrepare(
  "kokuzo",
  "INSERT INTO kokuzo_core (key, summary, importance, updated_at) VALUES (?, ?, ?, ?) " +
    "ON CONFLICT(key) DO UPDATE SET summary = excluded.summary, importance = excluded.importance, updated_at = excluded.updated_at"
);

const deleteStmt = dbPrepare("kokuzo", "DELETE FROM kokuzo_core WHERE key = ?");

const readStmt = dbPrepare("kokuzo", "SELECT key, summary, importance, updated_at FROM kokuzo_core WHERE key = ?");

export type KokuzoUpdatePolicy = {
  // 会話ログの件数がこの倍数のときのみ更新
  everyTurns: number;
  // 更新時に参照する直近ログ数
  windowSize: number;
};

const defaultPolicy: KokuzoUpdatePolicy = {
  everyTurns: 20,
  windowSize: 40,
};

function kokuzoKeyForSession(sessionId: string): string {
  return `session:${sessionId}`;
}

function summarize(rows: Array<{ role: MemoryRole; content: string }>): string {
  // ルールベース要約（将来LLMに置換可能）
  // 直近の user / assistant の発話を短く圧縮
  const parts = rows
    .map((r) => {
      const prefix = r.role === "user" ? "U" : "A";
      const text = r.content.replace(/\s+/g, " ").trim();
      const clipped = text.length > 80 ? text.slice(0, 77) + "..." : text;
      return `${prefix}:${clipped}`;
    })
    .reverse();

  const merged = parts.join(" / ");
  return merged.length > 800 ? merged.slice(0, 797) + "..." : merged;
}

export function kokuzoMaybeUpdate(sessionId: string, policy: KokuzoUpdatePolicy = defaultPolicy): KokuzoCoreRow | null {
  const cnt = conversationCount(sessionId);

  if (cnt === 0) return null;
  if (cnt % policy.everyTurns !== 0) return null;

  const recent = conversationReadRecent(sessionId, policy.windowSize);
  if (recent.length === 0) return null;

  const summary = summarize(recent.map((r) => ({ role: r.role, content: r.content })));
  const key = kokuzoKeyForSession(sessionId);
  const updatedAt = nowIso();
  const importance = Math.min(1, 0.3 + cnt / 500);

  upsertStmt.run(key, summary, importance, updatedAt);

  return { key, summary, importance, updatedAt };
}

export function kokuzoRead(sessionId: string): KokuzoCoreRow | null {
  const key = kokuzoKeyForSession(sessionId);
  const row = readStmt.get(key) as
    | { key: string; summary: string; importance: number; updated_at: string }
    | undefined;

  if (!row) return null;
  return {
    key: row.key,
    summary: row.summary,
    importance: Number(row.importance),
    updatedAt: row.updated_at,
  };
}

export function kokuzoClear(sessionId: string): void {
  deleteStmt.run(kokuzoKeyForSession(sessionId));
}

// CORE-6: Memory → PersonaState の変化ルール（慣性・余韻付き）
export function updatePersonaFromMemory(memory: {
  lastUserMessage?: string;
  recentMessageCount: number;
}): void {
  const current = getCurrentPersonaStateInternal();

  // 高負荷状態 → 前のめり
  if (memory.recentMessageCount > 5) {
    const newInertia = recordInertiaOnModeChange("engaged", current._inertia);
    setPersonaState({
      mode: "engaged",
      phase: "responding",
      inertia: Math.min(current.inertia + 3, 10),
      _inertia: newInertia,
    });
    return;
  }

  // 長文 → 思考モード
  if (memory.lastUserMessage && memory.lastUserMessage.length > 100) {
    const newInertia = recordInertiaOnModeChange("thinking", current._inertia);
    setPersonaState({
      mode: "thinking",
      phase: "listening",
      inertia: Math.min(current.inertia + 2, 10),
      _inertia: newInertia,
    });
    return;
  }

  // 落ち着いてきた場合：慣性を減衰（既存のinertiaも減衰）
  if (current.inertia > 0) {
    setPersonaState({
      ...current,
      inertia: current.inertia - 1,
    });
    return;
  }

  // 完全沈静化
  const newInertia = recordInertiaOnModeChange("calm", current._inertia);
  setPersonaState({
    mode: "calm",
    phase: "awake",
    inertia: 0,
    _inertia: newInertia,
  });
}
