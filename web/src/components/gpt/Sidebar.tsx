import React, { useEffect, useState } from "react";
import { useI18n } from "../../i18n/useI18n";

export type GptView = "chat" | "dashboard" | "profile";

interface SidebarProps {
  view: GptView;
  onView: (v: GptView) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
}

type ThreadMeta = {
  id: string;
  title?: string;
  updatedAt?: number;
};

const THREAD_KEY = "TENMON_THREAD_ID";
const THREADS_META_KEY = "TENMON_PWA_THREADS_META_V1";
const MSGS_KEY_PREFIX = "TENMON_PWA_MSGS_V2:";

function loadThreads(): ThreadMeta[] {
  if (typeof window === "undefined") return [];
  try {
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
    const v = window.localStorage.getItem(THREAD_KEY);
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

export function Sidebar({ view, onView, onNewChat, onOpenSettings }: SidebarProps) {
  const { t } = useI18n();
  const linkClass = (v: GptView) =>
    `gpt-sidebar-item ${view === v ? "gpt-sidebar-item-active" : ""}`;

  const [threads, setThreads] = useState<ThreadMeta[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [hoverThreadId, setHoverThreadId] = useState<string | null>(null);

  useEffect(() => {
    const reload = () => {
      setThreads(loadThreads());
      setActiveThreadId(getActiveThreadId());
    };

    reload();
    window.addEventListener("tenmon:threads-updated", reload);
    window.addEventListener("storage", reload);

    return () => {
      window.removeEventListener("tenmon:threads-updated", reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  const handleSelectThread = (id: string) => {
    try {
      window.localStorage.setItem(THREAD_KEY, id);
      window.dispatchEvent(new Event("tenmon:threads-updated"));
    } catch {
      // ignore
    }
    window.location.reload();
  };

  const handleDeleteThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const raw = window.localStorage.getItem(THREADS_META_KEY);
      const map: Record<string, ThreadMeta> = raw ? JSON.parse(raw) : {};
      delete map[id];

      // remove messages storage for this thread
      window.localStorage.removeItem(MSGS_KEY_PREFIX + id);

      const remaining = Object.values(map)
        .filter((t) => t && typeof t.id === "string")
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

      let nextId: string;
      if (remaining.length > 0) {
        nextId = remaining[0].id;
      } else {
        nextId = `pwa-${Date.now().toString(36)}`;
        map[nextId] = { id: nextId, updatedAt: Date.now() };
      }

      window.localStorage.setItem(THREADS_META_KEY, JSON.stringify(map));
      window.localStorage.setItem(THREAD_KEY, nextId);
      window.dispatchEvent(new Event("tenmon:threads-updated"));
    } catch {
      // ignore
    }
    window.location.reload();
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
