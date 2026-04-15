/**
 * ============================================================
 *  DASHBOARD PAGE — 天聞アーク ダッシュボード
 *  TENMON_MANUS_FINAL_EXECUTION_DIRECTIVE_V5
 *  価値言語化 + 三つの柱紹介 + LP的ブランドメッセージ
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
  arkGoldBg: "rgba(201,161,74,0.06)",
  arkGoldBorder: "rgba(201,161,74,0.20)",
  arkGreen: "#2f6f5e",
} as const;

/* ── 三つの柱データ ── */
const pillars = [
  {
    icon: "✦",
    title: "宿曜鑑定",
    desc: "宿曜経に基づき、生年月日から本命宿を導き出します。星の配置があなたの存在構造を映し出します。",
    status: "稼働中",
    statusColor: "#16a34a",
    navigable: true,
    action: "sukuyou" as const,
    cta: "鑑定を始める →",
  },
  {
    icon: "音",
    title: "言霊解読",
    desc: "名前の音韻を五十音の水火構造で読み解きます。名前に宿る響きが、宿曜と重なり合う深層を示します。",
    status: "稼働中",
    statusColor: "#16a34a",
    navigable: true,
    action: "sukuyou" as const,
    cta: "名前を読み解く →",
  },
  {
    icon: "蔵",
    title: "虚空蔵（KOKŪZŌ）",
    desc: "書籍や資料をお預けいただくと、知恵の種として保管し、会話の中で自然に活かします。",
    status: "準備中",
    statusColor: C.arkGold,
    navigable: false,
    action: null,
    cta: null,
  },
] as const;

interface DashboardPageProps {
  onNavigate?: (view: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
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
        maxWidth: 680,
        margin: "0 auto",
        padding: "32px 20px 60px",
        fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif",
        color: C.text,
      }}>

        {/* ── ヒーローセクション ── */}
        <div style={{
          textAlign: "center",
          marginBottom: 36,
          padding: "0 8px",
        }}>
          <h1 style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 1.5,
            margin: "0 0 12px",
            color: C.text,
          }}>
            天聞アーク
          </h1>
          <p style={{
            fontSize: 14,
            color: C.textSub,
            lineHeight: 1.9,
            margin: "0 0 8px",
          }}>
            あなたの存在を、星と音と言葉で読み解く
          </p>
          <p style={{
            fontSize: 12,
            color: C.textMuted,
            lineHeight: 1.7,
            margin: 0,
          }}>
            宿曜経の星の智慧と、五十音の言霊構造を重ね合わせ、
            あなたの存在の深層を多角的に照らし出します。
          </p>
        </div>

        {/* ── 三つの柱 ── */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          marginBottom: 32,
        }}>
          {pillars.map((p, i) => (
            <div
              key={i}
              onClick={p.navigable && onNavigate && p.action ? () => onNavigate(p.action) : undefined}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: "20px 24px",
                transition: "box-shadow 0.2s, transform 0.15s",
                cursor: p.navigable ? "pointer" : "default",
                ...(p.navigable ? {
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                } : {}),
              }}
              onMouseEnter={p.navigable ? (e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(201,161,74,0.15)";
                (e.currentTarget as HTMLDivElement).style.borderColor = C.arkGoldBorder;
              } : undefined}
              onMouseLeave={p.navigable ? (e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                (e.currentTarget as HTMLDivElement).style.borderColor = C.border;
              } : undefined}
            >
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 10,
              }}>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: C.arkGoldBg,
                  border: `1px solid ${C.arkGoldBorder}`,
                  fontSize: 16,
                  fontWeight: 700,
                  color: C.arkGold,
                  flexShrink: 0,
                }}>
                  {p.icon}
                </span>
                <div style={{ flex: 1 }}>
                  <h2 style={{
                    fontSize: 15,
                    fontWeight: 600,
                    margin: 0,
                    color: C.text,
                  }}>
                    {p.title}
                  </h2>
                </div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: p.statusColor,
                  background: `${p.statusColor}12`,
                  border: `1px solid ${p.statusColor}30`,
                  borderRadius: 6,
                  padding: "2px 10px",
                  flexShrink: 0,
                }}>
                  {p.status}
                </span>
              </div>
              <p style={{
                fontSize: 13,
                color: C.textSub,
                lineHeight: 1.8,
                margin: 0,
              }}>
                {p.desc}
              </p>
              {p.navigable && (
                <div style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: C.arkGold,
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                }}>
                  {p.cta}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── 軽量同期の思想 ── */}
        <div style={{
          background: C.arkGoldBg,
          border: `1px solid ${C.arkGoldBorder}`,
          borderRadius: 10,
          padding: "16px 20px",
          marginBottom: 24,
        }}>
          <p style={{
            fontSize: 13,
            color: C.text,
            lineHeight: 1.8,
            margin: 0,
          }}>
            <span style={{ fontWeight: 600, color: C.arkGold }}>設計思想</span>
            <span style={{ margin: "0 8px", color: C.textMuted }}>—</span>
            天聞アークは「端末に寄り添う」設計です。
            鑑定結果や会話の記録はお使いの端末に保管され、
            サーバーとの同期は必要最小限にとどめています。
            大切な情報が意図せず外部に出ることのないよう配慮しています。
          </p>
        </div>

        {/* ── 補足 ── */}
        <div style={{
          fontSize: 12,
          color: C.textMuted,
          lineHeight: 1.8,
          textAlign: "center",
          paddingTop: 12,
          borderTop: `1px solid ${C.border}`,
        }}>
          天聞アークの各機能は、あなたの存在の深まりとともに順次解放されます。
          ご意見やご要望がありましたら、改善要望ページよりお聞かせください。
        </div>
      </div>
    </div>
  );
}
