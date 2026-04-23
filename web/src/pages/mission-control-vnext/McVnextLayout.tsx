/**
 * Mission Control vNext — layout + nav (CARD_MC_VNEXT_FOUNDATION_V1).
 */
import React, { useState } from "react";
import { C } from "../mc/McLayout";

export type McVnextNavKey =
  | "overview"
  | "circuit"
  | "thread"
  | "repo"
  | "file"
  | "graph"
  | "sources"
  | "infra"
  | "quality"
  | "alerts"
  | "acceptance"
  | "repair"
  | "history";

const NAV: Array<{ key: McVnextNavKey; label: string; icon: string; href: string }> = [
  { key: "overview", label: "Top overview", icon: "◎", href: "/mc/vnext/" },
  { key: "circuit", label: "Conversation circuit", icon: "⎈", href: "/mc/vnext/circuit" },
  { key: "thread", label: "Thread trace", icon: "≋", href: "/mc/vnext/thread/demo-thread" },
  { key: "repo", label: "Repo / tree", icon: "⎔", href: "/mc/vnext/repo" },
  { key: "file", label: "File detail", icon: "⌗", href: "/mc/vnext/file/api/src/index.ts" },
  { key: "graph", label: "Sacred / persona / learning", icon: "✧", href: "/mc/vnext/graph" },
  { key: "sources", label: "Sources map", icon: "◇", href: "/mc/vnext/sources" },
  { key: "infra", label: "Infra / storage", icon: "⌂", href: "/mc/vnext/infra" },
  { key: "quality", label: "Dialogue quality", icon: "◐", href: "/mc/vnext/quality" },
  { key: "alerts", label: "Alerts / regression", icon: "⚠", href: "/mc/vnext/alerts" },
  { key: "acceptance", label: "Acceptance", icon: "✓", href: "/mc/vnext/acceptance" },
  { key: "repair", label: "Repair hub", icon: "⚒", href: "/mc/vnext/repair" },
  { key: "history", label: "System history", icon: "☷", href: "/mc/vnext/history" },
];

export interface McVnextLayoutProps {
  active: McVnextNavKey;
  children: React.ReactNode;
  banner?: React.ReactNode;
}

export default function McVnextLayout({ active, children, banner }: McVnextLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: "'Inter', 'Noto Sans JP', sans-serif",
      }}
    >
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }}
        />
      )}

      <aside
        style={{
          width: 240,
          background: C.sidebar,
          borderRight: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          position: sidebarOpen ? "fixed" : undefined,
          zIndex: sidebarOpen ? 50 : undefined,
          height: sidebarOpen ? "100vh" : undefined,
          left: sidebarOpen ? 0 : undefined,
          top: sidebarOpen ? 0 : undefined,
        }}
      >
        <div style={{ padding: "18px 14px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, letterSpacing: 0.8 }}>MISSION CONTROL</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>vNext · read-only audit · canonical /mc/*</div>
        </div>
        <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
          {NAV.map((item) => {
            const isActive = active === item.key;
            return (
              <a
                key={item.key + item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 6,
                  textDecoration: "none",
                  color: isActive ? C.accent : C.textSub,
                  background: isActive ? C.accentBg : "transparent",
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  marginBottom: 2,
                }}
              >
                <span style={{ width: 20, textAlign: "center" }}>{item.icon}</span>
                {item.label}
              </a>
            );
          })}
        </nav>
        <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.border}`, fontSize: 10, color: C.textMuted }}>
          <a href="/mc/sources" style={{ color: C.textMuted, textDecoration: "none", display: "block", marginBottom: 6 }}>
            ← Sources shortcut
          </a>
          <a href="/mc/" style={{ color: C.textMuted, textDecoration: "none", display: "block", marginBottom: 6 }}>
            ← Formal hub /mc/
          </a>
          <a href="/mc/classic/" style={{ color: C.textMuted, textDecoration: "none", display: "block", marginBottom: 6 }}>
            ← MC P5 (classic)
          </a>
          <a href="/pwa/" style={{ color: C.textMuted, textDecoration: "none" }}>
            ← ARK
          </a>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            display: "none",
            padding: "10px 14px",
            borderBottom: `1px solid ${C.border}`,
            alignItems: "center",
            gap: 10,
          }}
          className="mc-vnext-mobile-header"
        >
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            style={{ background: "none", border: "none", color: C.text, fontSize: 18, cursor: "pointer" }}
          >
            ☰
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>MC vNext</span>
        </header>
        <div style={{ flex: 1, padding: "22px 26px", overflowY: "auto" }}>
          {banner}
          {children}
        </div>
      </main>

      <style>{`
        @media (max-width: 900px) {
          .mc-vnext-mobile-header { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
