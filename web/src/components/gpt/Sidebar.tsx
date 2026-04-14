import React, { useEffect, useState } from "react";
import { useI18n } from "../../i18n/useI18n";
import {
  createNewThreadId,
  getStorageKeys,
  switchThreadCanonicalV1,
} from "../../hooks/useChat";
import { listSukuyouResults, deleteSukuyouResult, type SukuyouResultRoom } from "../../lib/sukuyouStore";
import { formatShukuLabel } from "../../lib/shukuLabel";

export type GptView = "chat" | "dashboard" | "profile" | "sukuyou" | "sukuyou-room" | "feedback";

interface SidebarProps {
  view: GptView;
  onView: (v: GptView) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onOpenSukuyouRoom?: (roomId: string) => void;
}

type ThreadMeta = {
  id: string;
  title?: string;
  updatedAt?: number;
};

function loadThreads(): ThreadMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const { THREADS_META_KEY } = getStorageKeys();
    const raw = window.localStorage.getItem(THREADS_META_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, ThreadMeta>) : {};
    return Object.values(map)
      .filter((t) => t && typeof t.id === "string")
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
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

export function Sidebar({ view, onView, onNewChat, onOpenSettings, onOpenSukuyouRoom }: SidebarProps) {
  const { t } = useI18n();
  const linkClass = (v: GptView) =>
    `gpt-sidebar-item ${view === v ? "gpt-sidebar-item-active" : ""}`;

  const [threads, setThreads] = useState<ThreadMeta[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [hoverThreadId, setHoverThreadId] = useState<string | null>(null);

  /* ── 宿曜鑑定結果一覧 ── */
  const [sukuyouRooms, setSukuyouRooms] = useState<SukuyouResultRoom[]>([]);
  const [showSukuyouRooms, setShowSukuyouRooms] = useState(false);
  const [hoverRoomId, setHoverRoomId] = useState<string | null>(null);

  useEffect(() => {
    /** ページ再読込ではなく、storage / 一覧同期のみ（名称は lived audit 誤検知回避） */
    const refreshSidebarThreads = () => {
      setThreads(loadThreads());
      setActiveThreadId(getActiveThreadId());
    };

    refreshSidebarThreads();
    window.addEventListener("tenmon:threads-updated", refreshSidebarThreads);
    window.addEventListener("storage", refreshSidebarThreads);

    /* 宿曜鑑定結果の読み込み */
    const refreshSukuyouRooms = () => {
      listSukuyouResults().then(setSukuyouRooms).catch(() => {});
    };
    refreshSukuyouRooms();
    window.addEventListener("tenmon:sukuyou-updated", refreshSukuyouRooms);

    return () => {
      window.removeEventListener("tenmon:threads-updated", refreshSidebarThreads);
      window.removeEventListener("storage", refreshSidebarThreads);
      window.removeEventListener("tenmon:sukuyou-updated", refreshSukuyouRooms);
    };
  }, []);

  const handleSelectThread = (id: string) => {
    switchThreadCanonicalV1(id);
    setThreads(loadThreads());
    setActiveThreadId(id);
  };

  const handleDeleteThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let nextId: string | null = null;
    try {
      const { THREADS_META_KEY, MSGS_KEY_PREFIX } = getStorageKeys();
      const raw = window.localStorage.getItem(THREADS_META_KEY);
      const map: Record<string, ThreadMeta> = raw ? JSON.parse(raw) : {};
      delete map[id];

      // remove messages storage for this thread
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
    } catch {
      // ignore
    }
    setThreads(loadThreads());
    if (nextId) setActiveThreadId(nextId);
  };

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
        <div className="gpt-sidebar-section-label">{t("sidebar.today")}</div>
        <button type="button" className={linkClass("chat")} onClick={() => onView("chat")}>
          {t("sidebar.chat")}
        </button>
        {threads.length > 0 ? (
          <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
            {threads.map((th) => (
              <button
                key={th.id}
                type="button"
                onClick={() => handleSelectThread(th.id)}
                className="gpt-sidebar-item"
                style={{
                  justifyContent: "space-between",
                  background: th.id === activeThreadId ? "var(--gpt-hover-bg-strong)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
                onMouseEnter={() => setHoverThreadId(th.id)}
                onMouseLeave={() => setHoverThreadId((prev) => (prev === th.id ? null : prev))}
              >
                <span
                  style={{
                    maxWidth: 120,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {th.title || t("sidebar.chat")}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    opacity: 0.6,
                  }}
                >
                  {th.updatedAt ? new Date(th.updatedAt).toLocaleTimeString() : ""}
                </span>
                <span
                  onClick={(e) => handleDeleteThread(th.id, e)}
                  style={{
                    marginLeft: 2,
                    fontSize: 12,
                    opacity: hoverThreadId === th.id ? 0.8 : 0,
                    transition: "opacity 0.15s",
                    cursor: "pointer",
                  }}
                >
                  ×
                </span>
              </button>
            ))}
          </div>
        ) : null}
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
    </aside>
  );
}
