/**
 * TENMON_ARK_CHAT_NAV_AND_FOLDER_OS_V1 — FIX-A
 * ナビゲーション状態の永続化ユーティリティ
 *
 * ダッシュボード / 設定に入っても、元のチャットへ自然に戻れるようにする。
 */

export type NavView = "chat" | "dashboard" | "profile" | "sukuyou" | "sukuyou-room" | "feedback";

export interface NavState {
  lastActiveView: NavView;
  lastActiveThreadId: string | null;
  lastActiveChatFolderId: string | null;
  lastActiveSukuyouRoomId: string | null;
}

const NAV_STATE_KEY = "TENMON_NAV_STATE_V1";

function getUserKey(): string {
  try {
    return localStorage.getItem("TENMON_USER_KEY") || "";
  } catch {
    return "";
  }
}

function storageKey(): string {
  const uk = getUserKey();
  return uk ? `${NAV_STATE_KEY}:${uk}` : NAV_STATE_KEY;
}

const DEFAULT_STATE: NavState = {
  lastActiveView: "chat",
  lastActiveThreadId: null,
  lastActiveChatFolderId: null,
  lastActiveSukuyouRoomId: null,
};

export function loadNavState(): NavState {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveNavState(partial: Partial<NavState>): void {
  try {
    const current = loadNavState();
    const next = { ...current, ...partial };
    localStorage.setItem(storageKey(), JSON.stringify(next));
  } catch {
    // ignore
  }
}

/**
 * チャットビューに入った時に呼ぶ
 */
export function markChatActive(threadId: string, folderId?: string | null): void {
  saveNavState({
    lastActiveView: "chat",
    lastActiveThreadId: threadId,
    lastActiveChatFolderId: folderId ?? null,
  });
}

/**
 * 非チャットビューに入った時に呼ぶ（threadIdは保持）
 */
export function markViewActive(view: NavView): void {
  saveNavState({ lastActiveView: view });
}

/**
 * 「最後のチャットに戻る」用のthreadIdを取得
 */
export function getLastActiveThreadId(): string | null {
  return loadNavState().lastActiveThreadId;
}

/**
 * 「最後のチャットに戻る」用のフォルダーIDを取得
 */
export function getLastActiveFolderId(): string | null {
  return loadNavState().lastActiveChatFolderId;
}
