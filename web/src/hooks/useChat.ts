/**
 * TENMON_PWA_THREAD_URL_CONSTITUTION_CURSOR_AUTO_V1
 * thread identity 解決順（固定）: URL threadId → backend response.threadId → localStorage → 新規生成。
 * send 成功後は backend の threadId を正典順にマージし、URL / React state / localStorage を同期。
 * popstate / TENMON_THREAD_SWITCH_EVENT を尊重。PWA チャット輸送は threadId のみ（旧 session 名義のフィールドは付けない）。
 *
 * A6: sendMessage(input, displayText?) — displayText が渡された場合、ユーザーバブルには
 *     displayText を表示し、API には input（raw seed 等）を送信する。
 */
import { useEffect, useRef, useState } from "react";
import { postChat } from "../api/chat";

export type ChatRole = "user" | "assistant";
export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  at: string;
  _payload?: any;
};

const USER_KEY_STORAGE = "TENMON_USER_KEY";

/** TENMON_PWA_NEWCHAT_SURFACE_BINDING_V1: Sidebar New Chat / reset と state を同期 */
export const TENMON_THREAD_SWITCH_EVENT = "tenmon:thread-switch" as const;

export function getStorageKeys(): { THREAD_KEY: string; THREADS_META_KEY: string; MSGS_KEY_PREFIX: string } {
  const userKey = typeof window !== "undefined" ? (localStorage.getItem(USER_KEY_STORAGE) || "").trim() : "";
  return {
    THREAD_KEY: userKey ? `TENMON_THREAD_ID:${userKey}` : "TENMON_THREAD_ID",
    THREADS_META_KEY: userKey ? `TENMON_PWA_THREADS_META_V1:${userKey}` : "TENMON_PWA_THREADS_META_V1",
    MSGS_KEY_PREFIX: userKey ? `TENMON_PWA_MSGS_V2:${userKey}:` : "TENMON_PWA_MSGS_V2:",
  };
}

type ThreadMeta = {
  id: string;
  title?: string;
  updatedAt?: number;
};

function loadThreadMetaMap(): Record<string, ThreadMeta> {
  try {
    const { THREADS_META_KEY } = getStorageKeys();
    const raw = localStorage.getItem(THREADS_META_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ThreadMeta>) : {};
  } catch {
    return {};
  }
}

function saveThreadMetaMap(map: Record<string, ThreadMeta>) {
  try {
    const { THREADS_META_KEY } = getStorageKeys();
    localStorage.setItem(THREADS_META_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function inferTitle(msgs: ChatMessage[]): string | undefined {
  // TITLE_SANITIZE_V1: [SUKUYOU_SEED]や内部文字列を含むメッセージをスキップ
  const firstUser = msgs.find((m) => m.role === "user" && !m.content?.includes("[SUKUYOU_SEED]"));
  const firstAssistant = msgs.find((m) => m.role === "assistant");
  const base = (firstUser || firstAssistant)?.content?.trim();
  if (!base) return undefined;
  let oneLine = base.split(/\r?\n/)[0] || base;
  // 内部タグ・seed文字列の除去
  oneLine = oneLine.replace(/\[SUKUYOU_SEED\][^]*/g, "").replace(/\[.*?\]/g, "").trim();
  if (!oneLine) return undefined;
  return oneLine.length > 40 ? `${oneLine.slice(0, 40)}…` : oneLine;
}

function touchThreadMeta(threadId: string, msgs: ChatMessage[]) {
  try {
    const map = loadThreadMetaMap();
    const prev = map[threadId] || { id: threadId };
    const title = prev.title || inferTitle(msgs);
    map[threadId] = {
      id: threadId,
      title,
      updatedAt: Date.now(),
    };
    saveThreadMetaMap(map);
  } catch {
    // ignore
  }
}

/** 現在の URL から `threadId` クエリを読む（`?threadId=` および `#...?threadId=`） */
export function readThreadIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const u = new URL(window.location.href);
    const fromSearch = u.searchParams.get("threadId");
    if (fromSearch?.trim()) return fromSearch.trim();
    const hash = window.location.hash || "";
    const iq = hash.indexOf("?");
    if (iq >= 0) {
      const sp = new URLSearchParams(hash.slice(iq + 1));
      const h = sp.get("threadId");
      if (h?.trim()) return h.trim();
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** 採用した threadId を URL に同期（replaceState のみ・ページ再読込なし） */
export function writeThreadIdToUrl(threadId: string): void {
  if (typeof window === "undefined") return;
  const tid = String(threadId || "").trim();
  if (!tid) return;
  try {
    const u = new URL(window.location.href);
    u.searchParams.set("threadId", tid);
    window.history.replaceState(window.history.state, "", u.toString());
  } catch {
    /* ignore */
  }
}

/**
 * 正典順: URL > backend response.threadId > localStorage > 新規生成
 * backendId は未取得時は null でよい。
 */
export function resolveCanonicalThreadId(
  urlId: string | null | undefined,
  backendId: string | null | undefined,
  storageId: string | null | undefined
): string {
  const u = urlId?.trim();
  if (u) return u;
  const b = backendId != null ? String(backendId).trim() : "";
  if (b) return b;
  const s = storageId?.trim();
  if (s) return s;
  return `pwa-${Date.now().toString(36)}`;
}

/** hydrate / switch / send 後に URL と localStorage を同一 threadId で揃える（ナビゲーション再発行なし） */
export function persistThreadIdToStorageAndUrl(id: string) {
  try {
    const { THREAD_KEY } = getStorageKeys();
    localStorage.setItem(THREAD_KEY, id);
  } catch {
    // ignore
  }
  writeThreadIdToUrl(id);
}

export function createNewThreadId(): string {
  return `pwa-${Date.now().toString(36)}`;
}

/** PWA 側の canonical thread switch（new/existing/restore で同一経路） */
export function switchThreadCanonicalV1(threadId: string): void {
  const tid = String(threadId || "").trim();
  if (!tid) return;
  persistThreadIdToStorageAndUrl(tid);
  try {
    window.dispatchEvent(new CustomEvent(TENMON_THREAD_SWITCH_EVENT, { detail: { threadId: tid } }));
    window.dispatchEvent(new Event("tenmon:threads-updated"));
  } catch {
    // ignore
  }
}

/**
 * URL 優先で threadId を解決し、localStorage + URL に同期して返す。
 * （単一真実源のため、呼び出し側は hydrate または明示同期時に利用）
 */
export function getThreadId(): string {
  const url = readThreadIdFromUrl();
  const { THREAD_KEY } = getStorageKeys();
  let storage = "";
  try {
    storage = localStorage.getItem(THREAD_KEY) || "";
  } catch {
    /* ignore */
  }
  const id = resolveCanonicalThreadId(url, null, storage);
  persistThreadIdToStorageAndUrl(id);
  return id;
}

function loadMessages(threadId: string): ChatMessage[] {
  try {
    const { MSGS_KEY_PREFIX } = getStorageKeys();
    const raw = localStorage.getItem(MSGS_KEY_PREFIX + threadId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(threadId: string, messages: ChatMessage[]) {
  try {
    const { MSGS_KEY_PREFIX } = getStorageKeys();
    localStorage.setItem(MSGS_KEY_PREFIX + threadId, JSON.stringify(messages));
  } catch {}
}

export function useChat() {
  const [threadId, setThreadId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [lastFailedInput, setLastFailedInput] = useState<string | null>(null);
  const hydratedRef = useRef(false);
  const threadIdRef = useRef<string>("");

  useEffect(() => {
    threadIdRef.current = threadId;
  }, [threadId]);

  useEffect(() => {
    const url = readThreadIdFromUrl();
    const { THREAD_KEY } = getStorageKeys();
    let storage = "";
    try {
      storage = localStorage.getItem(THREAD_KEY) || "";
    } catch {
      /* ignore */
    }
    const tid = resolveCanonicalThreadId(url, null, storage);
    persistThreadIdToStorageAndUrl(tid);
    setThreadId(tid);
    setMessages(loadMessages(tid));
    try {
      const map = loadThreadMetaMap();
      if (!map[tid]) {
        map[tid] = { id: tid, updatedAt: Date.now() };
        saveThreadMetaMap(map);
      }
    } catch {
      // ignore
    }
    hydratedRef.current = true;
  }, []);

  /** thread switch: state + messages + storage/URL は上記と同一（ページ再読込なし） */
  useEffect(() => {
    const onSwitch = (e: Event) => {
      const ce = e as CustomEvent<{ threadId?: string }>;
      const tid = String(ce.detail?.threadId ?? "").trim();
      if (!tid) return;
      persistThreadIdToStorageAndUrl(tid);
      setThreadId(tid);
      setMessages(loadMessages(tid));
      try {
        const map = loadThreadMetaMap();
        if (!map[tid]) {
          map[tid] = { id: tid, updatedAt: Date.now() };
          saveThreadMetaMap(map);
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener(TENMON_THREAD_SWITCH_EVENT, onSwitch as EventListener);
    return () => window.removeEventListener(TENMON_THREAD_SWITCH_EVENT, onSwitch as EventListener);
  }, []);

  /** ブラウザ戻る/進む・hash 変更で URL 優先の thread を再同期（ナビゲーション再発行なし） */
  useEffect(() => {
    const onUrlThreadChange = () => {
      const urlTid = readThreadIdFromUrl();
      const { THREAD_KEY } = getStorageKeys();
      let storage = "";
      try {
        storage = localStorage.getItem(THREAD_KEY) || "";
      } catch {
        /* ignore */
      }
      const resolved = resolveCanonicalThreadId(urlTid, null, storage);
      if (resolved === threadIdRef.current) return;
      persistThreadIdToStorageAndUrl(resolved);
      setThreadId(resolved);
      setMessages(loadMessages(resolved));
      try {
        const map = loadThreadMetaMap();
        if (!map[resolved]) {
          map[resolved] = { id: resolved, updatedAt: Date.now() };
          saveThreadMetaMap(map);
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("popstate", onUrlThreadChange);
    window.addEventListener("hashchange", onUrlThreadChange);
    return () => {
      window.removeEventListener("popstate", onUrlThreadChange);
      window.removeEventListener("hashchange", onUrlThreadChange);
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current || !threadId) return;
    saveMessages(threadId, messages);
    touchThreadMeta(threadId, messages);
    try {
      window.dispatchEvent(new Event("tenmon:threads-updated"));
    } catch {
      // ignore (e.g. SSR)
    }
  }, [threadId, messages]);

  /**
   * A6: sendMessage(input, displayText?)
   * - input: APIに送信するテキスト（raw seed等を含む場合がある）
   * - displayText: ユーザーバブルに表示するテキスト（省略時はinputをそのまま表示）
   */
  async function sendMessage(input: string, displayText?: string) {
    const text = String(input || "").trim();
    if (!text || !threadId) return;

    // A6: ユーザーバブルに表示するコンテンツ（displayText指定時はそちらを使用）
    const visibleContent = displayText ? String(displayText).trim() : text;

    const userMsg: ChatMessage = {
      id: `${threadId}:u:${Date.now()}`,
      role: "user",
      content: visibleContent,
      at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      setLoading(true);
      setError(false);
      setLastFailedInput(null);
      const out = await postChat({ message: text, threadId });
      const backendTid = out?.threadId != null ? String(out.threadId).trim() : "";
      const { THREAD_KEY } = getStorageKeys();
      let storageRaw = "";
      try {
        storageRaw = localStorage.getItem(THREAD_KEY) || "";
      } catch {
        /* ignore */
      }
      // 正典順: URL > backend.threadId > localStorage >（send 前 state は storage と揃える前提）
      const urlNow = readThreadIdFromUrl();
      const resolved = resolveCanonicalThreadId(urlNow, backendTid || null, storageRaw || null);
      persistThreadIdToStorageAndUrl(resolved);

      const assistantMsg: ChatMessage = {
        id: `${resolved}:a:${Date.now()}`,
        role: "assistant",
        content: String(out?.response || ""),
        at: new Date().toISOString(),
        _payload: out,
      };

      if (resolved !== threadId) {
        // 旧 thread の optimistic user を永続から外し、resolved 側へ会話を単一化
        try {
          const oldMsgs = loadMessages(threadId);
          const withoutOptimistic = oldMsgs.filter((m) => m.id !== userMsg.id);
          saveMessages(threadId, withoutOptimistic);
        } catch {
          /* ignore */
        }
        setThreadId(resolved);
        const base = loadMessages(resolved);
        setMessages([...base, userMsg, assistantMsg]);
      } else {
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      setError(true);
      setLastFailedInput(text);
      const errorMsg: ChatMessage = {
        id: `${threadId}:err:${Date.now()}`,
        role: "assistant",
        content: "通信が不安定な状態です。少し時間をおいてから再度お試しください。",
        at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function retryLastMessage() {
    if (!lastFailedInput) return;
    // エラーメッセージを削除して再送
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.id?.includes(":err:")) return prev.slice(0, -1);
      return prev;
    });
    const input = lastFailedInput;
    setLastFailedInput(null);
    setError(false);
    sendMessage(input);
  }

  /**
   * TENMON_PWA_NEWCHAT_SURFACE_BINDING_V1: フルページ再読込は行わない。
   * GptShell.handleNewChat と同一パス（persist → thread-switch → threads-updated）
   */
  function resetThread() {
    switchThreadCanonicalV1(createNewThreadId());
  }

  return {
    threadId,
    messages,
    loading,
    error,
    lastFailedInput,
    sendMessage,
    resetThread,
    retryLastMessage,
  };
}
