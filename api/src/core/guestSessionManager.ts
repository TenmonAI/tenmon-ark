/**
 * TENMON_GUEST_SESSION_V1
 * ゲストセッション管理: ターン数、IP レート制限
 *
 * module-scope Map（API 再起動で消える）。
 * 将来 Redis 等に移行する場合はこのファイルだけ差し替える。
 */

// ── Types ──

export interface GuestSession {
  sessionId: string;
  turnCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  ip: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}

interface IpRateEntry {
  sessionCount: number;
  resetAt: Date;
}

// ── State ──

const guestSessions = new Map<string, GuestSession>();
const ipRateLimit = new Map<string, IpRateEntry>();

// ── Config ──

const MAX_TURNS_PER_SESSION = 20;
const MAX_SESSIONS_PER_IP_PER_HOUR = 3;
const SESSION_TTL_HOURS = 2;

// ── Public API ──

/**
 * セッションを取得または新規作成する。
 * IP レート制限に引っかかった場合は null を返す。
 */
export function getOrCreateSession(
  sessionId: string,
  ip: string,
): GuestSession | null {
  const now = new Date();
  const ipEntry = ipRateLimit.get(ip);

  if (!ipEntry || now > ipEntry.resetAt) {
    // 新しい時間枠を開始
    ipRateLimit.set(ip, {
      sessionCount: 1,
      resetAt: new Date(now.getTime() + 3_600_000),
    });
  } else {
    // 既存の時間枠内
    if (
      ipEntry.sessionCount >= MAX_SESSIONS_PER_IP_PER_HOUR &&
      !guestSessions.has(sessionId)
    ) {
      return null; // レート制限
    }
    if (!guestSessions.has(sessionId)) {
      ipEntry.sessionCount += 1;
    }
  }

  let session = guestSessions.get(sessionId);
  if (!session) {
    session = {
      sessionId,
      turnCount: 0,
      firstSeenAt: now,
      lastSeenAt: now,
      ip,
      history: [],
    };
    guestSessions.set(sessionId, session);
  }

  return session;
}

/**
 * セッションにユーザー発話と AI 応答を記録する。
 * 履歴は直近 8 ターン（16 メッセージ）のみ保持。
 */
export function updateSession(
  session: GuestSession,
  userMessage: string,
  aiResponse: string,
): void {
  session.turnCount += 1;
  session.lastSeenAt = new Date();
  session.history.push({ role: "user", content: userMessage });
  session.history.push({ role: "assistant", content: aiResponse });

  // 直近 8 ターン（16 メッセージ）のみ保持
  if (session.history.length > 16) {
    session.history = session.history.slice(-16);
  }

  guestSessions.set(session.sessionId, session);
}

/**
 * ターン上限に達しているかを判定する。
 */
export function isLimitReached(session: GuestSession): boolean {
  return session.turnCount >= MAX_TURNS_PER_SESSION;
}

// ── Cleanup (10 分ごと) ──

setInterval(() => {
  const now = new Date();
  const cutoff = new Date(now.getTime() - SESSION_TTL_HOURS * 3_600_000);

  for (const [id, session] of guestSessions.entries()) {
    if (session.lastSeenAt < cutoff) {
      guestSessions.delete(id);
    }
  }

  for (const [ip, entry] of ipRateLimit.entries()) {
    if (now > entry.resetAt) {
      ipRateLimit.delete(ip);
    }
  }
}, 600_000);
