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

/* ── ライトテーマ対応カラーパレット ── */
const C = {
  textPrimary: "var(--text, #111827)",
  textSecondary: "var(--muted, rgba(17,24,39,0.65))",
  textMuted: "rgba(17,24,39,0.45)",
  accent: "var(--ark-gold, #c9a14a)",
  accentBg: "rgba(201,161,74,0.12)",
  accentBorder: "rgba(201,161,74,0.35)",
  hoverBg: "var(--hover, rgba(0,0,0,0.04))",
  hoverBgStrong: "var(--gpt-hover-bg-strong, rgba(0,0,0,0.06))",
  inputBg: "var(--input-bg, #ffffff)",
  inputBorder: "var(--input-border, rgba(0,0,0,0.12))",
  border: "var(--border, rgba(0,0,0,0.08))",
  sidebarBg: "var(--sidebar-bg, #f7f7f8)",
  danger: "#dc2626",
  white: "#ffffff",
} as const;

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
              background: C.inputBg,
              border: `1px solid ${C.accentBorder}`,
              borderRadius: 4,
              color: C.textPrimary,
              fontSize: 12,
              padding: "4px 6px",
              outline: "none",
            }}
          />
        </div>
      );
    }

    const isActive = th.id === activeThreadId;
    const label = th.title || "新しいチャット";
    const truncated = label.length > 22 ? label.slice(0, 22) + "…" : label;
    const timeStr = th.updatedAt
      ? new Date(th.updatedAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })
      : "";

    return (
      <div
        key={th.id}
        onClick={() => handleSelectThread(th.id)}
        onContextMenu={(e) => handleThreadContextMenu(th.id, e)}
        onMouseEnter={() => setHoverThreadId(th.id)}
        onMouseLeave={() => setHoverThreadId(null)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 8px",
          borderRadius: 6,
          cursor: "pointer",
          background: isActive ? C.hoverBgStrong : "transparent",
          transition: "background 0.1s",
          position: "relative",
        }}
      >
        <span style={{
          fontSize: 12,
          color: isActive ? C.textPrimary : C.textSecondary,
          fontWeight: isActive ? 600 : 400,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
          minWidth: 0,
        }}>
          {th.pinned && <span style={{ fontSize: 10, color: C.accent, marginRight: 3 }}>📌</span>}
          {truncated}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: C.textMuted }}>
            {timeStr}
          </span>
          <span
            onClick={(e) => handleThreadMenuClick(th.id, e)}
            style={{
              opacity: hoverThreadId === th.id ? 0.7 : 0,
              transition: "opacity 0.15s",
              cursor: "pointer",
              fontSize: 14,
              padding: "0 2px",
              color: C.textSecondary,
            }}
          >
            ⋯
          </span>
        </span>
      </div>
    );
  };

  /* ── フォルダー内スレッド描画 ── */
  const renderFolderThreads = (folderId: string) => {
    const folderThreads = threads.filter((t) => t.folderId === folderId);
    if (folderThreads.length === 0) {
      return (
        <div style={{ fontSize: 11, color: C.textMuted, padding: "4px 16px", fontStyle: "italic" }}>
          チャットなし
        </div>
      );
    }
    return folderThreads.map(renderThread);
  };

  /* ── 未分類スレッド ── */
  const uncategorizedThreads = threads.filter(
    (t) => !t.folderId || !folders.some((f) => f.id === t.folderId)
  );

  return (
    <aside className="gpt-sidebar">
      <div className="gpt-sidebar-top">
        <button type="button" className="gpt-btn gpt-btn-primary gpt-sidebar-new-chat" onClick={onNewChat}>
          + {t("sidebar.newChat")}
        </button>
      </div>

      <nav className="gpt-sidebar-history">
        {/* ── 宿曜鑑定結果セクション ── */}
        <div style={{ marginBottom: 4 }}>
          <button
            type="button"
            onClick={() => {
              setShowSukuyouRooms(!showSukuyouRooms);
              if (!showSukuyouRooms) onView("sukuyou");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              width: "100%",
              background: view === "sukuyou" || view === "sukuyou-room" ? C.accentBg : "transparent",
              border: `1px solid ${view === "sukuyou" || view === "sukuyou-room" ? C.accentBorder : "transparent"}`,
              borderRadius: 6,
              padding: "8px 10px",
              cursor: "pointer",
              color: C.accent,
              fontSize: 13,
              fontWeight: 600,
              textAlign: "left",
              fontFamily: "inherit",
            }}
          >
            <span style={{ fontSize: 14 }}>☽</span>
            <span>宿曜鑑定結果</span>
            <span style={{
              marginLeft: "auto",
              fontSize: 11,
              color: C.textMuted,
              fontWeight: 400,
            }}>
              {sukuyouRooms.length > 0 ? `${sukuyouRooms.length}件` : ""}
            </span>
          </button>

          {showSukuyouRooms && (
            <div style={{ paddingLeft: 8, marginTop: 2 }}>
              {/* ── 新規鑑定CTA ── */}
              <button
                type="button"
                onClick={() => onView("sukuyou")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  width: "100%",
                  background: "none",
                  border: `1px dashed ${C.accentBorder}`,
                  borderRadius: 5,
                  padding: "6px 8px",
                  cursor: "pointer",
                  color: C.accent,
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: "inherit",
                  marginBottom: 4,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.accentBg; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
              >
                <span style={{ fontSize: 14 }}>+</span>
                <span>新しい鑑定を始める</span>
              </button>

              {/* ── 鑑定記録一覧 ── */}
              {sukuyouRooms.length > 0 ? sukuyouRooms.map((room) => {
                const shukuLabel = formatShukuLabel(room.honmeiShuku);
                /* タイトル: 名前あり→「名前 — 本命宿」、名前なし→「本命宿」のみ */
                const titleLine = room.name
                  ? `${room.name} — ${shukuLabel}`
                  : shukuLabel || "鑑定結果";
                const dateStr = room.createdAt
                  ? new Date(room.createdAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })
                  : "";
                const birthStr = room.birthDate || "";
                const subLine = [birthStr, dateStr].filter(Boolean).join(" ・ ");
                return (
                  <div
                    key={room.id}
                    onClick={() => onOpenSukuyouRoom?.(room.id)}
                    onMouseEnter={() => setHoverRoomId(room.id)}
                    onMouseLeave={() => setHoverRoomId(null)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      padding: "7px 8px",
                      borderRadius: 6,
                      cursor: "pointer",
                      background: hoverRoomId === room.id ? C.hoverBg : "transparent",
                      transition: "background 0.1s",
                      marginBottom: 2,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 7, minWidth: 0, flex: 1 }}>
                      <span style={{
                        fontSize: 13, flexShrink: 0, marginTop: 1,
                        opacity: 0.6,
                      }}>☆</span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: C.textPrimary,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {titleLine}
                        </div>
                        {subLine && (
                          <div style={{
                            fontSize: 10,
                            color: C.textMuted,
                            marginTop: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>
                            {subLine}
                          </div>
                        )}
                      </div>
                    </div>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`「${titleLine}」の鑑定記録を削除しますか？`)) {
                          deleteSukuyouResult(room.id).then(() => {
                            listSukuyouResults().then(setSukuyouRooms).catch(() => {});
                          });
                        }
                      }}
                      style={{
                        opacity: hoverRoomId === room.id ? 0.7 : 0,
                        transition: "opacity 0.15s",
                        cursor: "pointer",
                        fontSize: 12,
                        padding: "0 2px",
                        color: C.danger,
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      ×
                    </span>
                  </div>
                );
              }) : (
                <div style={{ fontSize: 11, color: C.textMuted, padding: "4px 8px", fontStyle: "italic" }}>
                  鑑定記録がまだありません
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── チャットセクションヘッダー ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 4px 2px",
        }}>
          <button
            type="button"
            onClick={() => setShowChatSection(!showChatSection)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              border: "none",
              cursor: "pointer",
              padding: "6px 4px",
              color: C.textSecondary,
              fontSize: 12,
              fontWeight: 600,
              background: "none",
              fontFamily: "inherit",
            }}
          >
            <span style={{ fontSize: 9 }}>{showChatSection ? "▼" : "▶"}</span>
            <span>チャット</span>
            <span style={{ fontSize: 10, color: C.textMuted }}>({threads.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setCreatingFolder(true)}
            title="フォルダーを作成"
            style={{
              background: "none",
              border: "none",
              color: C.textSecondary,
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
                    background: C.inputBg,
                    border: `1px solid ${C.accentBorder}`,
                    borderRadius: 4,
                    color: C.textPrimary,
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
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.hoverBg; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                    <span style={{ fontSize: 9, color: C.textMuted }}>{expandedFolders.has(folder.id) ? "▼" : "▶"}</span>
                    <span style={{ fontSize: 12 }}>📁</span>
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
                          background: C.inputBg,
                          border: `1px solid ${C.accentBorder}`,
                          borderRadius: 3,
                          color: C.textPrimary,
                          fontSize: 11,
                          padding: "2px 4px",
                          outline: "none",
                          width: 80,
                        }}
                      />
                    ) : (
                      <span style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: C.textPrimary,
                        maxWidth: 90,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {folder.name}
                      </span>
                    )}
                    <span style={{ fontSize: 9, color: C.textMuted }}>
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
                      style={{ fontSize: 10, cursor: "pointer", color: C.textMuted, padding: "0 2px" }}
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
                      style={{ fontSize: 10, cursor: "pointer", color: C.textMuted, padding: "0 2px" }}
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
                    color: C.textMuted,
                    padding: "6px 8px 2px",
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
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
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8 }}>
                  チャットがまだありません
                </div>
                <button
                  type="button"
                  onClick={onNewChat}
                  style={{
                    background: C.accentBg,
                    border: `1px solid ${C.accentBorder}`,
                    color: C.accent,
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "inherit",
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
            borderTop: `1px solid ${C.border}`,
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
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "4px 0",
            zIndex: 9999,
            minWidth: 140,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
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
          <div style={{ height: 1, background: C.border, margin: "2px 0" }} />
          <button
            type="button"
            onClick={() => { handleDeleteThread(contextMenu.threadId); setContextMenu(null); }}
            style={{ ...ctxMenuItemStyle, color: C.danger }}
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
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "12px",
            zIndex: 10000,
            minWidth: 200,
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: C.textPrimary }}>
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
                border: `1px solid ${C.border}`,
                color: C.textSecondary,
                borderRadius: 4,
                padding: "4px 10px",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "inherit",
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
  color: "var(--text, #111827)",
  fontSize: 12,
  padding: "6px 12px",
  textAlign: "left",
  cursor: "pointer",
  transition: "background 0.1s",
  fontFamily: "inherit",
};
