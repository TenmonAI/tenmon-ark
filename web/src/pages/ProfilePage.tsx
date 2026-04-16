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
} as const;

export function ProfilePage() {
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
        maxWidth: 580,
        margin: "0 auto",
        padding: "32px 20px 60px",
        fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif",
        color: C.text,
      }}>
        <h1 style={{
          fontSize: 20,
          fontWeight: 700,
          margin: "0 0 24px",
          letterSpacing: "0.04em",
        }}>
          プロフィール
        </h1>

        {/* アカウント */}
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "16px 20px",
          marginBottom: 14,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: C.arkGold,
            letterSpacing: "0.06em",
            marginBottom: 6,
          }}>
            アカウント
          </div>
          <p style={{ fontSize: 14, color: C.text, margin: 0, lineHeight: 1.7 }}>
            TENMON-ARK（ローカル認証）
          </p>
        </div>

        {/* プラン */}
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "16px 20px",
          marginBottom: 14,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: C.arkGold,
            letterSpacing: "0.06em",
            marginBottom: 6,
          }}>
            ご利用プラン
          </div>
          <p style={{ fontSize: 14, color: C.text, margin: 0, lineHeight: 1.7 }}>
            スタンダード
          </p>
        </div>

        {/* データ保管 */}
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "16px 20px",
          marginBottom: 14,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: C.arkGold,
            letterSpacing: "0.06em",
            marginBottom: 6,
          }}>
            データ保管
          </div>
          <p style={{ fontSize: 13, color: C.textSub, margin: 0, lineHeight: 1.8 }}>
            会話や鑑定結果は、お使いのブラウザ内に保管されています。
            データの書き出し・読み込みは「設定」から行えます。
          </p>
        </div>

        {/* バージョン情報 */}
        <div style={{
          background: C.arkGoldBg,
          border: `1px solid ${C.arkGoldBorder}`,
          borderRadius: 10,
          padding: "14px 20px",
          marginTop: 20,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: C.arkGold,
            letterSpacing: "0.06em",
            marginBottom: 4,
          }}>
            TENMON-ARK
          </div>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0, lineHeight: 1.7 }}>
            バージョン 1.1 — 存在構造の総合解読AI
          </p>
        </div>
      </div>
    </div>
  );
}
