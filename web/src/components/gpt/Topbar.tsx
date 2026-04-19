import React, { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n/useI18n";
import { stopPeriodicSync } from "../../lib/crossDeviceSync";

/* ── タブピル定義 ── */
interface TabPillDef {
  icon: string;
  label: string;
  color: "amber" | "blue" | "green";
  onClick?: () => void;
}

function TabPill({
  icon,
  label,
  color,
  onClick,
}: TabPillDef) {
  const colorMap = {
    amber: {
      bg: "linear-gradient(135deg, #fef3c7, #fde68a)",
      border: "#f59e0b",
      text: "#92400e",
      hoverShadow: "0 2px 8px rgba(245,158,11,0.3)",
    },
    blue: {
      bg: "linear-gradient(135deg, #e0f2fe, #bae6fd)",
      border: "#7dd3fc",
      text: "#1e3a5f",
      hoverShadow: "0 2px 8px rgba(125,211,252,0.4)",
    },
    green: {
      bg: "linear-gradient(135deg, #dcfce7, #bbf7d0)",
      border: "#86efac",
      text: "#14532d",
      hoverShadow: "0 2px 8px rgba(134,239,172,0.4)",
    },
  } as const;

  const c = colorMap[color];

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        height: 32,
        padding: "0 12px",
        fontSize: 11,
        fontWeight: 600,
        color: c.text,
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 12,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "transform 0.15s, box-shadow 0.15s",
        fontFamily: "inherit",
        scrollSnapAlign: "start",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
        (e.currentTarget as HTMLElement).style.boxShadow = c.hoverShadow;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

/* ── Topbar Props ── */
type TopbarProps = {
  title?: string;
  onOpenSidebar?: () => void;
  isSidebarOpen?: boolean;
  showBackToChat?: boolean;
  onBackToChat?: () => void;
  onSukuyouAbout?: () => void;
  onKotodamaAbout?: () => void;
  onAmatsuKanagiAbout?: () => void;
};

export function Topbar({
  title = "TENMON-ARK",
  onOpenSidebar,
  isSidebarOpen,
  showBackToChat,
  onBackToChat,
  onSukuyouAbout,
  onKotodamaAbout,
  onAmatsuKanagiAbout,
}: TopbarProps) {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("click", onDocClick);
    window.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      window.removeEventListener("keydown", onEsc);
    };
  }, []);

  async function handleLogout() {
    try {
      const res = await fetch("/api/auth/local/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        console.warn("logout request failed", res.status);
      }
    } catch (e) {
      console.warn("logout request error", e);
    }

    try {
      stopPeriodicSync();
    } catch {}

    try {
      localStorage.removeItem("TENMON_AUTH_OK_V1");
      localStorage.removeItem("TENMON_AUTOLOGIN_DONE");
      localStorage.removeItem("TENMON_FOUNDER_KEY");
      localStorage.removeItem("TENMON_USER_KEY");
      localStorage.removeItem("tenmon_user_display_v1");
      localStorage.removeItem("TENMON_SYNC_PENDING_CHANGES");
      localStorage.removeItem("TENMON_SYNC_LAST_PULL_AT");
    } catch {}

    window.location.href = "/pwa/login-local";
  }

  const accountName =
    (typeof window !== "undefined" &&
      window.localStorage.getItem("tenmon_user_display_v1")) ||
    "Account";

  /* ── タブ定義 ── */
  const tabs: TabPillDef[] = [
    { icon: "☆", label: "宿曜経とは", color: "amber", onClick: onSukuyouAbout },
    { icon: "✦", label: "言霊秘書とは", color: "blue", onClick: onKotodamaAbout },
    { icon: "◇", label: "天津金木とは", color: "green", onClick: onAmatsuKanagiAbout },
  ];

  return (
    <header
      className="gpt-topbar"
      style={{
        height: "auto",
        minHeight: "unset",
        flexDirection: "column",
        padding: 0,
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      {/* ── 上段: コントロール帯 ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: 52,
          minHeight: 52,
          padding: "0 12px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* ハンバーガー */}
        {onOpenSidebar ? (
          <button
            type="button"
            className="gpt-topbar-hamburger"
            onClick={onOpenSidebar}
            aria-label="Open menu"
            style={{ flexShrink: 0 }}
          >
            <span aria-hidden="true">{isSidebarOpen ? "×" : "☰"}</span>
          </button>
        ) : null}

        {/* 戻るボタン — flex-none + whitespace-nowrap で崩れ防止 */}
        {showBackToChat && onBackToChat ? (
          <button
            type="button"
            onClick={onBackToChat}
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              color: "var(--muted, rgba(17,24,39,0.65))",
              cursor: "pointer",
              fontSize: 13,
              padding: "4px 8px",
              borderRadius: 6,
              transition: "background 0.15s, color 0.15s",
              whiteSpace: "nowrap",
              height: 40,
              minWidth: 40,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--hover, rgba(0,0,0,0.04))";
              (e.currentTarget as HTMLElement).style.color = "var(--text, #111827)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "none";
              (e.currentTarget as HTMLElement).style.color = "var(--muted, rgba(17,24,39,0.65))";
            }}
            title="最後のチャットに戻る"
            aria-label="チャットに戻る"
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>←</span>
            <span className="topbar-back-label">チャットに戻る</span>
          </button>
        ) : null}

        {/* タイトル (中央寄せ、min-w-0 で flex 収縮を許可) */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <img
            src="brand/tenmon-ark-mark.svg"
            alt="TENMON-ARK"
            className="gpt-brand-mark"
            style={{ flexShrink: 0 }}
          />
          <span
            className="gpt-topbar-title"
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </span>
        </div>

        {/* アカウントメニュー */}
        <div
          className="gpt-topbar-right"
          ref={wrapRef}
          style={{ position: "relative", flexShrink: 0 }}
        >
          <button
            type="button"
            className="gpt-account-btn"
            aria-label="Account menu"
            title={accountName}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="gpt-account-avatar" aria-hidden="true">
              ⦿
            </span>
            <span className="gpt-account-name">{accountName}</span>
            <span className="gpt-account-caret" aria-hidden="true">
              ▾
            </span>
          </button>

          {menuOpen ? (
            <div className="gpt-account-menu">
              <button
                type="button"
                onClick={handleLogout}
                className="gpt-account-menu-item"
              >
                ログアウト
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── 下段: タブ帯 (横スクロール + フェードマスク) ── */}
      <nav
        style={{
          position: "relative",
          borderTop: "1px solid var(--gpt-border, #e5e7eb)",
          width: "100%",
        }}
        aria-label="ダッシュボード機能"
      >
        <div
          className="scrollbar-none"
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            padding: "8px 12px",
            WebkitOverflowScrolling: "touch",
            scrollSnapType: "x mandatory",
          }}
        >
          {tabs.map((tab, i) => (
            <TabPill key={i} {...tab} />
          ))}
        </div>

        {/* 右端フェードマスク (スクロール可能を示唆) */}
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 32,
            background: "linear-gradient(to left, var(--gpt-bg-primary, #ffffff), transparent)",
          }}
          aria-hidden="true"
        />
      </nav>
    </header>
  );
}
