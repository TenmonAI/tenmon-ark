import React, { useEffect, useState, useCallback, useRef } from "react";
import { useI18n } from "../../i18n/useI18n";
import {
  createNewThreadId,
  getStorageKeys,
  switchThreadCanonicalV1,
} from "../../hooks/useChat";
import { listSukuyouResults, deleteSukuyouResult, type SukuyouResultRoom } from "../../lib/sukuyouStore";
import { formatShukuLabel } from "../../lib/shukuLabel";
import {
  listChatFolders,
  createChatFolder,
  renameChatFolder,
  deleteChatFolder,
  moveThreadToFolder,
  toggleThreadPin,
  renameThread,
  getThreadsByFolder,
  getAllThreadsMeta,
  FOLDER_UPDATE_EVENT,
  type ChatFolder,
} from "../../lib/chatFolderStore";

export type GptView = "chat" | "dashboard" | "profile" | "sukuyou" | "sukuyou-room" | "feedback";

interface SidebarProps {
  view: GptView;
  onView: (v: GptView) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onOpenSukuyouRoom?: (roomId: string) => void;
  onBackToChat?: () => void;
}

type ThreadMeta = {
  id: string;
  title?: string;
  updatedAt?: number;
  folderId?: string | null;
  pinned?: boolean;
};

function loadThreads(): ThreadMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const { THREADS_META_KEY } = getStorageKeys();
    const raw = window.localStorage.getItem(THREADS_META_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, ThreadMeta>) : {};
    return Object.values(map)
      .filter((t) => t && typeof t.id === "string")
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
      });
  } catch {
    return [];
  }
}

function getActiveThreadId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const { THREAD_KEY } = getStorageKeys();
    const v = window.localStorage.getItem(THREAD_KEY);
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

export function Sidebar({ view, onView, onNewChat, onOpenSettings, onOpenSukuyouRoom, onBackToChat }: SidebarProps) {
  const { t } = useI18n();
  const linkClass = (v: GptView) =>
    `gpt-sidebar-item ${view === v ? "gpt-sidebar-item-active" : ""}`;

  const [threads, setThreads] = useState<ThreadMeta[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [hoverThreadId, setHoverThreadId] = useState<string | null>(null);

  /* ── フォルダー ── */
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showChatSection, setShowChatSection] = useState(true);

  /* ── フォルダー作成 ── */
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  /* ── フォルダー名変更 ── */
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState("");
  const renameFolderInputRef = useRef<HTMLInputElement>(null);

  /* ── スレッドコンテキストメニュー ── */
  const [contextMenu, setContextMenu] = useState<{ threadId: string; x: number; y: number } | null>(null);

  /* ── スレッド名変更 ── */
  const [renamingThreadId, setRenamingThreadId] = useState<string | null>(null);
  const [renameThreadValue, setRenameThreadValue] = useState("");
  const renameThreadInputRef = useRef<HTMLInputElement>(null);

  /* ── フォルダー移動メニュー ── */
  const [movingThreadId, setMovingThreadId] = useState<string | null>(null);

  /* ── 宿曜鑑定結果一覧 ── */
  const [sukuyouRooms, setSukuyouRooms] = useState<SukuyouResultRoom[]>([]);
  const [showSukuyouRooms, setShowSukuyouRooms] = useState(false);
  const [hoverRoomId, setHoverRoomId] = useState<string | null>(null);

  /* ── データ読み込み ── */
  const refreshAll = useCallback(() => {
    setThreads(loadThreads());
    setActiveThreadId(getActiveThreadId());
    listChatFolders().then(setFolders).catch(() => {});
  }, []);

  useEffect(() => {
    refreshAll();
    window.addEventListener("tenmon:threads-updated", refreshAll);
    window.addEventListener("storage", refreshAll);
    window.addEventListener(FOLDER_UPDATE_EVENT, refreshAll);

    const refreshSukuyouRooms = () => {
      listSukuyouResults().then(setSukuyouRooms).catch(() => {});
    };
    refreshSukuyouRooms();
    window.addEventListener("tenmon:sukuyou-updated", refreshSukuyouRooms);

    return () => {
      window.removeEventListener("tenmon:threads-updated", refreshAll);
      window.removeEventListener("storage", refreshAll);
      window.removeEventListener(FOLDER_UPDATE_EVENT, refreshAll);
      window.removeEventListener("tenmon:sukuyou-updated", refreshSukuyouRooms);
    };
  }, [refreshAll]);

  /* ── フォルダー作成入力にフォーカス ── */
  useEffect(() => {
    if (creatingFolder && newFolderInputRef.current) {
      newFolderInputRef.current.focus();
    }
  }, [creatingFolder]);

  useEffect(() => {
    if (renamingFolderId && renameFolderInputRef.current) {
      renameFolderInputRef.current.focus();
      renameFolderInputRef.current.select();
    }
  }, [renamingFolderId]);

  useEffect(() => {
    if (renamingThreadId && renameThreadInputRef.current) {
      renameThreadInputRef.current.focus();
      renameThreadInputRef.current.select();
    }
  }, [renamingThreadId]);

  /* ── コンテキストメニューを閉じる ── */
  useEffect(() => {
    if (!contextMenu && !movingThreadId) return;
    const close = () => { setContextMenu(null); setMovingThreadId(null); };
    const timer = setTimeout(() => {
      document.addEventListener("click", close, { once: true });
    }, 50);
    return () => { clearTimeout(timer); document.removeEventListener("click", close); };
  }, [contextMenu, movingThreadId]);

  const handleSelectThread = (id: string) => {
    switchThreadCanonicalV1(id);
    setThreads(loadThreads());
    setActiveThreadId(id);
    if (view !== "chat") onView("chat");
  };

  const handleDeleteThread = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    let nextId: string | null = null;
    try {
      const { THREADS_META_KEY, MSGS_KEY_PREFIX } = getStorageKeys();
      const raw = window.localStorage.getItem(THREADS_META_KEY);
      const map: Record<string, ThreadMeta> = raw ? JSON.parse(raw) : {};
      delete map[id];
      window.localStorage.removeItem(MSGS_KEY_PREFIX + id);
      const remaining = Object.values(map)
        .filter((t) => t && typeof t.id === "string")
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
      if (remaining.length > 0) {
        nextId = remaining[0].id;
      } else {
        nextId = createNewThreadId();
        map[nextId] = { id: nextId, updatedAt: Date.now() };
      }
      window.localStorage.setItem(THREADS_META_KEY, JSON.stringify(map));
      switchThreadCanonicalV1(nextId);
    } catch {}
    setThreads(loadThreads());
    if (nextId) setActiveThreadId(nextId);
    setContextMenu(null);
  };

  /* ── フォルダー操作 ── */
  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) { setCreatingFolder(false); return; }
    const folder = await createChatFolder(name);
    setExpandedFolders((prev) => new Set([...prev, folder.id]));
    setNewFolderName("");
    setCreatingFolder(false);
  };

  const handleRenameFolder = async (id: string) => {
    const name = renameFolderValue.trim();
    if (name) {
      await renameChatFolder(id, name);
    }
    setRenamingFolderId(null);
  };

  const handleDeleteFolder = async (id: string) => {
    await deleteChatFolder(id);
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── スレッドコンテキストメニュー ── */
  const handleThreadContextMenu = (threadId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ threadId, x: e.clientX, y: e.clientY });
  };

  const handleThreadMenuClick = (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenu({ threadId, x: rect.right, y: rect.top });
  };

  /* ── スレッド名変更 ── */
  const handleRenameThread = (threadId: string) => {
    const th = threads.find((t) => t.id === threadId);
    setRenameThreadValue(th?.title || "");
    setRenamingThreadId(threadId);
    setContextMenu(null);
  };

  const commitRenameThread = () => {
    if (renamingThreadId && renameThreadValue.trim()) {
      renameThread(renamingThreadId, renameThreadValue.trim());
    }
    setRenamingThreadId(null);
  };

  /* ── フォルダー移動 ── */
  const handleMoveThread = (threadId: string) => {
    setMovingThreadId(threadId);
    setContextMenu(null);
  };

  const commitMoveThread = (folderId: string | null) => {
    if (movingThreadId) {
      moveThreadToFolder(movingThreadId, folderId);
    }
    setMovingThreadId(null);
  };

  /* ── ピン留め ── */
  const handleTogglePin = (threadId: string) => {
    toggleThreadPin(threadId);
    setContextMenu(null);
  };

  /* ── スレッド描画 ── */
  const renderThread = (th: ThreadMeta) => {
    if (renamingThreadId === th.id) {
      return (
        <div key={th.id} style={{ padding: "2px 4px" }}>
          <input
            ref={renameThreadInputRef}
            type="text"
            value={renameThreadValue}
            onChange={(e) => setRenameThreadValue(e.target.value)}
            onBlur={commitRenameThread}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRenameThread();
              if (e.key === "Escape") setRenamingThreadId(null);
            }}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(212,175,55,0.4)",
              borderRadius: 4,
              color: "#f0e6d4",
              fontSize: 12,
              padding: "4px 6px",
              outline: "none",
            }}
          />
        </div>
      );
    }

    return (
      <button
        key={th.id}
        type="button"
        onClick={() => handleSelectThread(th.id)}
        onContextMenu={(e) => handleThreadContextMenu(th.id, e)}
        className="gpt-sidebar-item"
        style={{
          justifyContent: "space-between",
          background: th.id === activeThreadId ? "var(--gpt-hover-bg-strong)" : "transparent",
          display: "flex",
          alignItems: "center",
          gap: 4,
          paddingLeft: 12,
        }}
        onMouseEnter={() => setHoverThreadId(th.id)}
        onMouseLeave={() => setHoverThreadId((prev) => (prev === th.id ? null : prev))}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0, flex: 1 }}>
          {th.pinned && <span style={{ fontSize: 10, color: "#d4af37" }}>📌</span>}
          <span
            style={{
              maxWidth: 110,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {th.title || t("sidebar.chat")}
          </span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
          <span style={{ fontSize: 10, opacity: 0.5 }}>
            {th.updatedAt ? new Date(th.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
          </span>
          <span
            onClick={(e) => handleThreadMenuClick(th.id, e)}
            style={{
              fontSize: 14,
              opacity: hoverThreadId === th.id ? 0.8 : 0,
              transition: "opacity 0.15s",
              cursor: "pointer",
              padding: "0 2px",
            }}
          >
            ⋯
          </span>
        </span>
      </button>
    );
  };

  /* ── フォルダー内スレッド ── */
  const renderFolderThreads = (folderId: string) => {
    const folderThreads = threads.filter((t) => t.folderId === folderId);
    if (folderThreads.length === 0) {
      return (
        <div style={{ fontSize: 10, opacity: 0.4, padding: "4px 16px", fontStyle: "italic" }}>
          空のフォルダー
        </div>
      );
    }
    return folderThreads.map(renderThread);
  };

  /* ── 未分類スレッド ── */
  const uncategorizedThreads = threads.filter((t) => !t.folderId);

  return (
    <aside className="gpt-sidebar">
      <div className="gpt-sidebar-top">
        <button type="button" className="gpt-btn gpt-btn-primary gpt-sidebar-new-chat" onClick={onNewChat}>
          + {t("sidebar.newChat")}
        </button>
        <button type="button" className="gpt-sidebar-search" aria-label="Search">
          <span>🔍</span>
          <span>{t("sidebar.search")}</span>
        </button>
        <button
          type="button"
          className={linkClass("sukuyou")}
          onClick={() => onView("sukuyou")}
          style={{
            marginTop: 4,
            background: view === "sukuyou" || view === "sukuyou-room" ? "rgba(212, 175, 55, 0.15)" : "transparent",
            border: "1px solid rgba(212, 175, 55, 0.3)",
            color: "#d4af37",
            borderRadius: 8,
            fontWeight: 600,
          }}
        >
          ✦ 宿曜鑑定
        </button>

        {/* 鑑定結果フォルダー */}
        {sukuyouRooms.length > 0 && (
          <div style={{ marginTop: 2 }}>
            <button
              type="button"
              onClick={() => setShowSukuyouRooms(!showSukuyouRooms)}
              className="gpt-sidebar-item"
              style={{
                fontSize: 11,
                color: "#d4af37",
                opacity: 0.8,
                padding: "4px 8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
              }}
            >
              <span>鑑定結果 ({sukuyouRooms.length})</span>
              <span style={{ fontSize: 9 }}>{showSukuyouRooms ? "▲" : "▼"}</span>
            </button>
            {showSukuyouRooms && (
              <div style={{ display: "flex", flexDirection: "column", gap: 1, paddingLeft: 4 }}>
                {sukuyouRooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => onOpenSukuyouRoom?.(room.id)}
                    className="gpt-sidebar-item"
                    style={{
                      fontSize: 11,
                      padding: "6px 8px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 4,
                    }}
                    onMouseEnter={() => setHoverRoomId(room.id)}
                    onMouseLeave={() => setHoverRoomId(prev => prev === room.id ? null : prev)}
                  >
                    <span style={{
                      maxWidth: 110,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "#d4af37",
                    }}>
                      {formatShukuLabel(room.honmeiShuku)}
                    </span>
                    <span style={{ fontSize: 9, opacity: 0.5 }}>
                      {room.name || new Date(room.createdAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                    </span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSukuyouResult(room.id).then(() => {
                          listSukuyouResults().then(setSukuyouRooms).catch(() => {});
                        });
                      }}
                      style={{
                        marginLeft: 2,
                        fontSize: 12,
                        opacity: hoverRoomId === room.id ? 0.8 : 0,
                        transition: "opacity 0.15s",
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <nav className="gpt-scroll gpt-sidebar-history">
        {/* ── チャットセクション ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
          <button
            type="button"
            onClick={() => setShowChatSection(!showChatSection)}
            className="gpt-sidebar-section-label"
            style={{
              cursor: "pointer",
              background: "none",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 4px",
              color: "inherit",
              fontSize: "inherit",
              fontWeight: "inherit",
            }}
          >
            <span style={{ fontSize: 9 }}>{showChatSection ? "▼" : "▶"}</span>
            <span>チャット</span>
            <span style={{ fontSize: 10, opacity: 0.5 }}>({threads.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setCreatingFolder(true)}
            title="フォルダーを作成"
            style={{
              background: "none",
              border: "none",
              color: "var(--gpt-text-secondary, #b8a88a)",
              cursor: "pointer",
              fontSize: 16,
              padding: "2px 6px",
              borderRadius: 4,
              lineHeight: 1,
            }}
          >
            +
          </button>
        </div>

        {showChatSection && (
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {/* フォルダー作成入力 */}
            {creatingFolder && (
              <div style={{ padding: "4px 8px" }}>
                <input
                  ref={newFolderInputRef}
                  type="text"
                  placeholder="フォルダー名..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onBlur={handleCreateFolder}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateFolder();
                    if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName(""); }
                  }}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(212,175,55,0.4)",
                    borderRadius: 4,
                    color: "#f0e6d4",
                    fontSize: 12,
                    padding: "4px 6px",
                    outline: "none",
                  }}
                />
              </div>
            )}

            {/* フォルダー一覧 */}
            {folders.map((folder) => (
              <div key={folder.id}>
                {/* フォルダーヘッダー */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "4px 8px",
                    cursor: "pointer",
                    borderRadius: 4,
                    transition: "background 0.1s",
                  }}
                  onClick={() => toggleFolder(folder.id)}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                    <span style={{ fontSize: 9 }}>{expandedFolders.has(folder.id) ? "▼" : "▶"}</span>
                    <span style={{ fontSize: 12, color: folder.color || "#d4af37" }}>📁</span>
                    {renamingFolderId === folder.id ? (
                      <input
                        ref={renameFolderInputRef}
                        type="text"
                        value={renameFolderValue}
                        onChange={(e) => setRenameFolderValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={() => handleRenameFolder(folder.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameFolder(folder.id);
                          if (e.key === "Escape") setRenamingFolderId(null);
                        }}
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(212,175,55,0.4)",
                          borderRadius: 3,
                          color: "#f0e6d4",
                          fontSize: 11,
                          padding: "2px 4px",
                          outline: "none",
                          width: 80,
                        }}
                      />
                    ) : (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--gpt-text-secondary, #b8a88a)",
                        maxWidth: 90,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {folder.name}
                      </span>
                    )}
                    <span style={{ fontSize: 9, opacity: 0.4 }}>
                      ({threads.filter((t) => t.folderId === folder.id).length})
                    </span>
                  </span>
                  <span style={{ display: "flex", gap: 2 }}>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameFolderValue(folder.name);
                        setRenamingFolderId(folder.id);
                      }}
                      title="名前変更"
                      style={{ fontSize: 10, cursor: "pointer", opacity: 0.5, padding: "0 2px" }}
                    >
                      ✏
                    </span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`「${folder.name}」フォルダーを削除しますか？\nチャットは未分類に移動されます。`)) {
                          handleDeleteFolder(folder.id);
                        }
                      }}
                      title="削除"
                      style={{ fontSize: 10, cursor: "pointer", opacity: 0.5, padding: "0 2px" }}
                    >
                      ×
                    </span>
                  </span>
                </div>
                {/* フォルダー内スレッド */}
                {expandedFolders.has(folder.id) && (
                  <div style={{ paddingLeft: 8 }}>
                    {renderFolderThreads(folder.id)}
                  </div>
                )}
              </div>
            ))}

            {/* 未分類 */}
            {uncategorizedThreads.length > 0 && (
              <div>
                {folders.length > 0 && (
                  <div style={{
                    fontSize: 10,
                    opacity: 0.5,
                    padding: "6px 8px 2px",
                    fontWeight: 600,
                    letterSpacing: 0.5,
                  }}>
                    未分類
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {uncategorizedThreads.map(renderThread)}
                </div>
              </div>
            )}

            {/* 空状態 */}
            {threads.length === 0 && folders.length === 0 && (
              <div style={{ padding: "12px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 8 }}>
                  チャットがまだありません
                </div>
                <button
                  type="button"
                  onClick={onNewChat}
                  style={{
                    background: "rgba(212,175,55,0.15)",
                    border: "1px solid rgba(212,175,55,0.3)",
                    color: "#d4af37",
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  新しいチャットを始める
                </button>
              </div>
            )}
          </div>
        )}

        <div className="gpt-sidebar-section-label">{t("sidebar.explore")}</div>
        <button type="button" className={linkClass("dashboard")} onClick={() => onView("dashboard")}>
          {t("sidebar.dashboard")}
        </button>
        <button type="button" className={linkClass("profile")} onClick={() => onView("profile")}>
          {t("sidebar.profile")}
        </button>
        <button
          type="button"
          className={linkClass("feedback")}
          onClick={() => onView("feedback")}
          style={{
            marginTop: 4,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: 8,
          }}
        >
          ✉ 改善のご要望
        </button>
      </nav>

      <div className="gpt-sidebar-bottom">
        <button type="button" className="gpt-sidebar-item" onClick={onOpenSettings}>
          ⚙️ {t("sidebar.settings")}
        </button>
        <div className="gpt-sidebar-user">
          <div className="gpt-sidebar-avatar">
            <img
              src="brand/tenmon-ark-mark.svg"
              alt="TENMON-ARK"
              className="gpt-brand-mark"
            />
          </div>
          <div className="gpt-sidebar-user-lines">
            <div className="gpt-sidebar-user-line-main">{t("sidebar.brandLine1")}</div>
            <div className="gpt-sidebar-user-line-sub">{t("sidebar.brandLine2")}</div>
          </div>
        </div>
      </div>

      {/* ── スレッドコンテキストメニュー ── */}
      {contextMenu && (
        <div
          style={{
            position: "fixed",
            left: contextMenu.x,
            top: contextMenu.y,
            background: "var(--sidebar-bg, #1a1612)",
            border: "1px solid rgba(212,175,55,0.3)",
            borderRadius: 8,
            padding: "4px 0",
            zIndex: 9999,
            minWidth: 140,
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => handleRenameThread(contextMenu.threadId)}
            style={ctxMenuItemStyle}
          >
            ✏ 名前変更
          </button>
          <button
            type="button"
            onClick={() => handleMoveThread(contextMenu.threadId)}
            style={ctxMenuItemStyle}
          >
            📁 フォルダー移動
          </button>
          <button
            type="button"
            onClick={() => handleTogglePin(contextMenu.threadId)}
            style={ctxMenuItemStyle}
          >
            📌 {threads.find((t) => t.id === contextMenu.threadId)?.pinned ? "ピン解除" : "ピン留め"}
          </button>
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "2px 0" }} />
          <button
            type="button"
            onClick={() => { handleDeleteThread(contextMenu.threadId); setContextMenu(null); }}
            style={{ ...ctxMenuItemStyle, color: "#e74c3c" }}
          >
            🗑 削除
          </button>
        </div>
      )}

      {/* ── フォルダー移動メニュー ── */}
      {movingThreadId && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            background: "var(--sidebar-bg, #1a1612)",
            border: "1px solid rgba(212,175,55,0.3)",
            borderRadius: 10,
            padding: "12px",
            zIndex: 10000,
            minWidth: 200,
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#f0e6d4" }}>
            移動先フォルダー
          </div>
          <button
            type="button"
            onClick={() => commitMoveThread(null)}
            style={{ ...ctxMenuItemStyle, marginBottom: 2 }}
          >
            📋 未分類
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => commitMoveThread(f.id)}
              style={{ ...ctxMenuItemStyle, marginBottom: 2 }}
            >
              📁 {f.name}
            </button>
          ))}
          <div style={{ marginTop: 8, textAlign: "right" }}>
            <button
              type="button"
              onClick={() => setMovingThreadId(null)}
              style={{
                background: "none",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#b8a88a",
                borderRadius: 4,
                padding: "4px 10px",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

/* ── コンテキストメニューアイテムスタイル ── */
const ctxMenuItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  background: "none",
  border: "none",
  color: "#f0e6d4",
  fontSize: 12,
  padding: "6px 12px",
  textAlign: "left",
  cursor: "pointer",
  transition: "background 0.1s",
};
