/**
 * ============================================================
 *  RESET PASSWORD PAGE — パスワード再設定（トークン付き）
 *  TENMON_MANUS_FINAL_COMPLETION_V3
 *  LoginLocal.tsx と統一したブランドスタイル
 * ============================================================
 */
import React, { useMemo, useState } from "react";
import { PasswordWithEye } from "../components/PasswordWithEye";

function getToken(): string {
  try {
    const u = new URL(window.location.href);
    return (u.searchParams.get("token") || "").trim();
  } catch {
    return "";
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
} as const;

export default function ResetPasswordPage() {
  const token = useMemo(() => getToken(), []);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errorText, setErrorText] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setErrorText("");

    if (password.length < 8) {
      setErrorText("パスワードは8文字以上で入力してください");
      return;
    }
    if (password !== passwordConfirm) {
      setErrorText("パスワードが一致しません");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          password_confirm: passwordConfirm,
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok || !body?.ok) {
        setErrorText(body?.message || body?.error || "パスワードの更新に失敗しました");
        setSubmitting(false);
        return;
      }

      setDone(true);
    } catch {
      setErrorText("通信エラーが発生しました。もう一度お試しください。");
      setSubmitting(false);
    }
  }

  /* ── トークンなし ── */
  if (!token) {
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
          padding: "80px 20px 60px",
          textAlign: "center",
        }}>
          <img
            src="/pwa/brand/tenmon-ark-mark.svg"
            alt="TENMON-ARK"
            style={{ width: 40, height: 40, marginBottom: 16 }}
          />
          <div style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: "28px 20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            marginBottom: 24,
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: C.text }}>
              無効なリンクです
            </div>
            <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.8, marginBottom: 20 }}>
              パスワード再設定用のリンクが無効です。
              <br />
              再度「パスワードを忘れた方」からお申し込みください。
            </p>
            <a
              href="/pwa/forgot-password"
              className="gpt-btn gpt-btn-primary"
              style={{
                display: "inline-block",
                padding: "10px 24px",
                textDecoration: "none",
                fontSize: 14,
              }}
            >
              パスワード再設定を申し込む
            </a>
          </div>
          <div style={{ fontSize: 11, color: C.textMuted }}>
            TENMON-ARK — 存在構造の総合解読AI
          </div>
        </div>
      </div>
    );
  }

  /* ── メインフォーム ── */
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
            新しいパスワードを設定
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
          {done ? (
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
                パスワードを更新しました。
                <br />
                ログイン画面へ戻ってご利用ください。
              </div>
              <a
                href="/pwa/login-local.html?next=/pwa/"
                className="gpt-btn gpt-btn-primary"
                style={{
                  display: "block",
                  textAlign: "center",
                  width: "100%",
                  height: 48,
                  minHeight: 48,
                  lineHeight: "48px",
                  textDecoration: "none",
                  boxSizing: "border-box",
                }}
              >
                ログイン画面へ
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
                新しいパスワードを入力してください。
              </p>

              <PasswordWithEye
                label="新しいパスワード"
                value={password}
                onChange={setPassword}
                placeholder="8文字以上"
                autoComplete="new-password"
              />

              <PasswordWithEye
                label="新しいパスワード（確認）"
                value={passwordConfirm}
                onChange={setPasswordConfirm}
                placeholder="もう一度入力"
                autoComplete="new-password"
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
                disabled={submitting || !password || !passwordConfirm}
                style={{ width: "100%", height: 48, minHeight: 48 }}
              >
                {submitting ? "更新中..." : "パスワードを更新する"}
              </button>
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
