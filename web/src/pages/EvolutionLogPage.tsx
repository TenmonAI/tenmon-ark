import React, { useState } from "react";
import {
  evolutionLogV1,
  type EvolutionLogEntry,
  type EvolutionLogBadge,
} from "../data/evolution_log_v1";

/**
 * Founder 向け進化ログ Phase α (静的版)
 *
 * - スマホ 1 列 / PC 2 列 grid
 * - 最新 1 件 (CLAMP-REPAIR) は Description / Context / Try-it 常時表示
 * - 他は title / date / badge のみ表示、tap で展開
 * - 「← 戻る」で /pwa/ (chat) に戻る
 * - in-memory state のみ (localStorage / sessionStorage 不使用)
 */

const C = {
  bg: "#fafaf7",
  card: "#ffffff",
  text: "#1f2937",
  textSub: "#6b7280",
  textMuted: "#9ca3af",
  border: "#e5e7eb",
  arkGold: "#c9a14a",
  arkGoldBg: "rgba(201,161,74,0.08)",
  arkGoldBorder: "rgba(201,161,74,0.3)",
} as const;

const BADGE_STYLE: Record<
  EvolutionLogBadge,
  { bg: string; text: string; border: string }
> = {
  改善: { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
  整備: { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" },
  新規: { bg: "#dcfce7", text: "#166534", border: "#86efac" },
};

function Badge({ kind }: { kind: EvolutionLogBadge }) {
  const c = BADGE_STYLE[kind];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 600,
        color: c.text,
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 6,
        lineHeight: 1.4,
      }}
    >
      {kind}
    </span>
  );
}

interface CardProps {
  entry: EvolutionLogEntry;
  expanded: boolean;
  onToggle: () => void;
  initiallyOpen: boolean;
}

function EvolutionCard({ entry, expanded, onToggle, initiallyOpen }: CardProps) {
  const isExpanded = initiallyOpen || expanded;
  const hasDescription =
    !!entry.summary.description ||
    !!entry.summary.context ||
    !!entry.summary.tryItExample;
  const isInteractive = hasDescription && !initiallyOpen;

  return (
    <article
      onClick={isInteractive ? onToggle : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle();
              }
            }
          : undefined
      }
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-expanded={isInteractive ? isExpanded : undefined}
      style={{
        background: C.card,
        border: `1px solid ${initiallyOpen ? C.arkGoldBorder : C.border}`,
        borderRadius: 14,
        padding: "16px 18px",
        cursor: isInteractive ? "pointer" : "default",
        transition:
          "box-shadow 250ms ease-out, border-color 250ms ease-out",
        boxShadow: initiallyOpen
          ? `0 2px 12px ${C.arkGoldBg}`
          : "0 1px 3px rgba(0,0,0,0.04)",
        outline: "none",
      }}
      onFocus={(e) => {
        if (isInteractive) {
          (e.currentTarget as HTMLElement).style.boxShadow =
            `0 0 0 2px ${C.arkGoldBorder}`;
        }
      }}
      onBlur={(e) => {
        if (isInteractive) {
          (e.currentTarget as HTMLElement).style.boxShadow =
            "0 1px 3px rgba(0,0,0,0.04)";
        }
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <span
          style={{ fontSize: 22, lineHeight: 1.2, flexShrink: 0 }}
          aria-hidden
        >
          {entry.emoji}
        </span>
        <h2
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: C.text,
            margin: 0,
            flex: 1,
            lineHeight: 1.4,
          }}
        >
          {entry.title}
        </h2>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: isExpanded ? 12 : 0,
        }}
      >
        <time
          dateTime={entry.date}
          style={{ fontSize: 12, color: C.textSub }}
        >
          {entry.date}
        </time>
        <Badge kind={entry.badge} />
      </div>

      {isExpanded && (
        <div style={{ marginTop: 4 }}>
          <p
            style={{
              fontSize: 14,
              color: C.text,
              lineHeight: 1.7,
              margin: "0 0 12px 0",
            }}
          >
            {entry.summary.description}
          </p>
          {entry.summary.context && (
            <p
              style={{
                fontSize: 13,
                color: C.textSub,
                lineHeight: 1.6,
                margin: "0 0 12px 0",
                fontStyle: "italic",
              }}
            >
              {entry.summary.context}
            </p>
          )}
          {entry.summary.tryItExample && (
            <div
              style={{
                marginTop: 12,
                padding: "12px 14px",
                background: C.arkGoldBg,
                border: `1px solid ${C.arkGoldBorder}`,
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.arkGold,
                  marginBottom: 6,
                }}
              >
                <span aria-hidden>💬</span> 試してみる
              </div>
              <blockquote
                style={{
                  fontSize: 13,
                  color: C.text,
                  margin: "0 0 6px 0",
                  padding: 0,
                  fontStyle: "italic",
                }}
              >
                「{entry.summary.tryItExample}」
              </blockquote>
              {entry.summary.tryItDescription && (
                <p
                  style={{
                    fontSize: 12,
                    color: C.textSub,
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {entry.summary.tryItDescription}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {isInteractive && (
        <div
          style={{
            marginTop: isExpanded ? 12 : 6,
            fontSize: 11,
            color: C.textMuted,
            textAlign: "right",
          }}
        >
          {isExpanded ? "▲ 閉じる" : "▼ 詳しく見る"}
        </div>
      )}
    </article>
  );
}

export default function EvolutionLogPage() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const handleBack = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/pwa/";
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", "Helvetica Neue", "Hiragino Kaku Gothic ProN", sans-serif',
      }}
    >
      <style>{`
        .tenmon-evo-grid {
          display: grid;
          gap: 14px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 1024px) {
          .tenmon-evo-grid {
            grid-template-columns: 1fr 1fr;
            gap: 18px;
          }
        }
      `}</style>

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: C.card,
          borderBottom: `1px solid ${C.border}`,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={handleBack}
          style={{
            background: "transparent",
            border: "none",
            color: C.text,
            fontSize: 14,
            cursor: "pointer",
            padding: "6px 10px",
            borderRadius: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontFamily: "inherit",
          }}
          aria-label="戻る"
        >
          <span aria-hidden>←</span>
          <span>戻る</span>
        </button>
        <h1
          style={{
            fontSize: 16,
            fontWeight: 700,
            margin: 0,
            color: C.text,
            flex: 1,
            textAlign: "center",
            paddingRight: 64,
          }}
        >
          進化ログ <span aria-hidden>🌱</span>
        </h1>
      </header>

      <main
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "20px 16px 40px",
        }}
      >
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: C.textSub,
            margin: "0 0 14px 0",
            paddingLeft: 4,
          }}
        >
          <span aria-hidden>📅</span> 最近の進化
        </h2>

        <div className="tenmon-evo-grid">
          {evolutionLogV1.map((entry, idx) => {
            const isLatest = idx === 0;
            return (
              <EvolutionCard
                key={entry.id}
                entry={entry}
                expanded={!!expanded[entry.id]}
                onToggle={() =>
                  setExpanded((prev) => ({
                    ...prev,
                    [entry.id]: !prev[entry.id],
                  }))
                }
                initiallyOpen={isLatest}
              />
            );
          })}
        </div>

        <p
          style={{
            marginTop: 32,
            fontSize: 12,
            color: C.textSub,
            textAlign: "center",
            lineHeight: 1.7,
          }}
        >
          天聞アークは、複数の Founder の声をもとに
          <br />
          少しずつ整い続けています。
        </p>
      </main>
    </div>
  );
}
