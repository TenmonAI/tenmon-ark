/**
 * ============================================================
 *  FORGOT PASSWORD PAGE — パスワード再設定
 *  TENMON_MANUS_FINAL_COMPLETION_V3
 *  LoginLocal.tsx と統一したブランドスタイル
 * ============================================================
 */
import React, { useMemo, useState } from "react";

function getNextPath(): string {
  try {
    const u = new URL(window.location.href);
    const next = (u.searchParams.get("next") || "/pwa/").trim();
    if (!next.startsWith("/")) return "/pwa/";
    return next || "/pwa/";
  } catch {
    return "/pwa/";
  }
}

/* ── ライトテーマカラー ── */
const C = {
  bg: "#fafaf7",
  card: "#ffffff",
  text: "#1f2937",
  textSub: "#6b7280",
  textMuted: "#9ca3af",
  border: "#e5e7eb",
  arkGold: "#c9a14a",
} as const;

export default function ForgotPasswordPage() {
  const nextPath = useMemo(() => getNextPath(), []);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorText, setErrorText] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErrorText("");

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        overflowY: "auto",
        fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif",
      }}
    >
      <div style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "60px 20px 60px",
      }}>

        {/* ── ブランドヘッダー ── */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img
            src="/pwa/brand/tenmon-ark-mark.svg"
            alt="TENMON-ARK"
            style={{ width: 40, height: 40, marginBottom: 10 }}
          />
          <h1 style={{
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 1,
            margin: "0 0 6px",
            color: C.text,
          }}>
            パスワードの再設定
          </h1>
          <p style={{
            fontSize: 13,
            color: C.textMuted,
            margin: 0,
          }}>
            TENMON-ARK
          </p>
        </div>

        {/* ── メインカード ── */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: "24px 20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            marginBottom: 24,
          }}
        >
          {sent ? (
            <>
              <div style={{
                marginBottom: 20,
                padding: "16px",
                borderRadius: 10,
                background: "rgba(102,187,106,0.08)",
                border: "1px solid rgba(102,187,106,0.25)",
                color: C.text,
                fontSize: 14,
                lineHeight: 1.8,
              }}>
                入力されたメールアドレス宛に、再設定用のご案内を送信しました。
                <br /><br />
                登録状況にかかわらず、しばらく待っても届かない場合は迷惑メールフォルダもご確認ください。
              </div>
              <a
                href={`/pwa/login-local.html?next=${encodeURIComponent(nextPath)}`}
                style={{
                  display: "block",
                  textAlign: "center",
                  color: C.textSub,
                  fontSize: 14,
                  textDecoration: "none",
                  padding: "8px 0",
                }}
              >
                ログイン画面に戻る
              </a>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <p style={{
                marginBottom: 18,
                color: C.textSub,
                fontSize: 14,
                lineHeight: 1.8,
              }}>
                ご登録のメールアドレスを入力してください。
                再設定用のリンクをお送りします。
              </p>

              <label style={{ display: "block", marginBottom: 8, fontSize: 14, color: C.text }}>
                メールアドレス
              </label>
              <input
                className="gpt-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ marginBottom: 14, width: "100%", boxSizing: "border-box" }}
              />

              {errorText ? (
                <div
                  role="alert"
                  style={{
                    marginBottom: 14,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "rgba(185,28,28,0.08)",
                    border: "1px solid rgba(185,28,28,0.18)",
                    color: "#991b1b",
                    fontSize: 14,
                  }}
                >
                  {errorText}
                </div>
              ) : null}

              <button
                type="submit"
                className="gpt-btn gpt-btn-primary"
                disabled={submitting || !email.trim()}
                style={{ width: "100%", height: 48, minHeight: 48, marginBottom: 12 }}
              >
                {submitting ? "送信中..." : "再設定リンクを送信"}
              </button>

              <div style={{ textAlign: "center" }}>
                <a
                  href={`/pwa/login-local.html?next=${encodeURIComponent(nextPath)}`}
                  style={{
                    color: C.textMuted,
                    fontSize: 13,
                    textDecoration: "none",
                  }}
                >
                  ログイン画面に戻る
                </a>
              </div>
            </form>
          )}
        </div>

        {/* ── フッター ── */}
        <div style={{
          fontSize: 11,
          color: C.textMuted,
          textAlign: "center",
          lineHeight: 1.7,
        }}>
          TENMON-ARK — 存在構造の総合解読AI
        </div>
      </div>
    </div>
  );
}
