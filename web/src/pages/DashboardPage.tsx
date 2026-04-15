/**
 * ============================================================
 *  DASHBOARD PAGE — 天聞アーク ダッシュボード
 *  TENMON_MANUS_FINAL_ADJUSTMENT_DIRECTIVE_V4
 *  ライトテーマ対応 + KOKUZO説明文言の安心化
 * ============================================================
 */
import React from "react";

/* ── ライトテーマカラー ── */
const C = {
  bg: "#fafaf7",
  card: "#ffffff",
  text: "#1f2937",
  textSub: "#6b7280",
  textMuted: "#9ca3af",
  border: "#e5e7eb",
  arkGold: "#c9a14a",
  arkGoldBg: "rgba(201,161,74,0.08)",
  arkGoldBorder: "rgba(201,161,74,0.25)",
} as const;

export function DashboardPage() {
  return (
    <div style={{
      width: "100%",
      height: "100%",
      overflowY: "auto",
      overflowX: "hidden",
      WebkitOverflowScrolling: "touch",
      background: C.bg,
    }}>
      <div style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "28px 20px 60px",
        fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif",
        color: C.text,
      }}>
        <h1 style={{
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 1,
          margin: "0 0 8px",
        }}>
          ダッシュボード
        </h1>
        <p style={{
          fontSize: 14,
          color: C.textSub,
          lineHeight: 1.8,
          marginBottom: 28,
        }}>
          天聞アークの各機能の状態をご確認いただけます。
        </p>

        {/* ── KOKUZO カード ── */}
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: "24px",
          marginBottom: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              color: C.arkGold,
              background: C.arkGoldBg,
              border: `1px solid ${C.arkGoldBorder}`,
              borderRadius: 6,
              padding: "3px 10px",
            }}>
              準備中
            </span>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: C.text }}>
              虚空蔵（KOKŪZŌ）
            </h2>
          </div>
          <p style={{
            fontSize: 14,
            color: C.textSub,
            lineHeight: 1.8,
            margin: "0 0 16px",
          }}>
            書籍や資料をお預けいただくと、天聞アークが内容を読み解き、
            会話の中で自然に活かせるようになります。
            現在、以下の機能を順次整備しています。
          </p>
          <div style={{
            fontSize: 13,
            color: C.textSub,
            lineHeight: 2,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#16a34a" }}>●</span>
              資料のアップロードと知恵の抽出
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: C.arkGold }}>●</span>
              進捗の可視化と監査ビュー
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: C.textMuted }}>○</span>
              Founder会員向け機能の出し分け
            </div>
          </div>
        </div>

        {/* ── 補足 ── */}
        <div style={{
          fontSize: 12,
          color: C.textMuted,
          lineHeight: 1.8,
          marginTop: 12,
        }}>
          各機能は段階的に公開されます。ご要望がありましたら、改善要望ページからお知らせください。
        </div>
      </div>
    </div>
  );
}
