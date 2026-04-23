/**
 * McLayout.tsx — Mission Control V2 Layout
 * §15 Frontend: Shared layout with sidebar navigation
 */
import React, { useState } from "react";

const C = {
  bg: "#0f1117",
  sidebar: "#161922",
  card: "#1c1f2b",
  cardHover: "#252838",
  text: "#e4e4e7",
  textSub: "#9ca3af",
  textMuted: "#6b7280",
  border: "#2d3040",
  accent: "#c9a14a",
  accentBg: "rgba(201,161,74,0.08)",
  green: "#22c55e",
  red: "#ef4444",
  orange: "#f59e0b",
} as const;

interface McLayoutProps {
  children: React.ReactNode;
  activePage: string;
}

const NAV_ITEMS = [
  { key: "overview", label: "Overview", icon: "◉", path: "/mc/classic/" },
  { key: "handoff", label: "AI Handoff", icon: "⬡", path: "/mc/classic/handoff" },
  { key: "live", label: "Live State", icon: "◈", path: "/mc/classic/live" },
  { key: "git", label: "Git State", icon: "⌥", path: "/mc/classic/git" },
  { key: "soul", label: "Soul Root", icon: "✦", path: "/mc/classic/soul" },
  { key: "vnext", label: "AI-HUB / MC vNext", icon: "⎆", path: "/mc/vnext/" },
];

export default function McLayout({ children, activePage }: McLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', 'Noto Sans JP', sans-serif" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: 220,
        background: C.sidebar,
        borderRight: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        position: sidebarOpen ? "fixed" : undefined,
        zIndex: sidebarOpen ? 50 : undefined,
        height: sidebarOpen ? "100vh" : undefined,
        transform: sidebarOpen ? "translateX(0)" : undefined,
      }}
        className="mc-sidebar"
      >
        {/* Logo */}
        <div style={{ padding: "20px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18, color: C.accent }}>◉</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.accent, letterSpacing: 1 }}>MISSION CONTROL</div>
              <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: 0.5 }}>TENMON-ARK classic · formal hub is /mc/</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {NAV_ITEMS.map(item => {
            const isActive = activePage === item.key;
            return (
              <a
                key={item.key}
                href={item.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 6,
                  textDecoration: "none",
                  color: isActive ? C.accent : C.textSub,
                  background: isActive ? C.accentBg : "transparent",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  marginBottom: 2,
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>{item.icon}</span>
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, fontSize: 10, color: C.textMuted }}>
          <a href="/mc/" style={{ color: C.textMuted, textDecoration: "none", display: "block", marginBottom: 6 }}>
            ← Formal hub /mc/
          </a>
          <a href="/pwa/" style={{ color: C.textMuted, textDecoration: "none" }}>← Back to ARK</a>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Mobile header */}
        <header style={{
          display: "none",
          padding: "12px 16px",
          borderBottom: `1px solid ${C.border}`,
          alignItems: "center",
          gap: 12,
        }}
          className="mc-mobile-header"
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: "none", border: "none", color: C.text, fontSize: 20, cursor: "pointer" }}
          >
            ☰
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.accent, letterSpacing: 1 }}>MISSION CONTROL</span>
        </header>

        {/* Page content */}
        <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>
          {children}
        </div>
      </main>

      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 768px) {
          .mc-sidebar {
            position: fixed !important;
            transform: translateX(-100%) !important;
            z-index: 50 !important;
            height: 100vh !important;
          }
          .mc-sidebar[style*="translateX(0)"] {
            transform: translateX(0) !important;
          }
          .mc-mobile-header {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}

export { C };
