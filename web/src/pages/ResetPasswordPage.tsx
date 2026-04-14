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
    } catch (err: any) {
      setErrorText("通信エラーが発生しました。もう一度お試しください。");
      setSubmitting(false);
    }
  }

  // トークンなし
  if (!token) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "var(--bg)",
          padding: "16px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "min(100%, 420px)",
            background: "var(--gpt-bg-primary)",
            border: "1px solid var(--gpt-border)",
            borderRadius: 16,
            padding: "20px 16px",
            boxShadow: "0 12px 28px rgba(0,0,0,0.08)",
            boxSizing: "border-box",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>無効なリンクです</div>
          <p style={{ fontSize: 14, color: "var(--gpt-text-secondary)", lineHeight: 1.7, marginBottom: 16 }}>
            パスワード再設定用のリンクが無効です。
            <br />
            再度「パスワードを忘れた方」からお申し込みください。
          </p>
          <a
            href="/pwa/forgot-password"
            style={{
              display: "inline-block",
              padding: "10px 24px",
              borderRadius: 8,
              background: "var(--gpt-bg-secondary, rgba(255,255,255,0.08))",
              color: "var(--gpt-text-primary)",
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            パスワード再設定を申し込む
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--bg)",
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "min(100%, 420px)",
          background: "var(--gpt-bg-primary)",
          border: "1px solid var(--gpt-border)",
          borderRadius: 16,
          padding: "20px 16px",
          boxShadow: "0 12px 28px rgba(0,0,0,0.08)",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <img
            src="/pwa/brand/tenmon-ark-mark.svg"
            alt="TENMON-ARK"
            style={{ width: 28, height: 28 }}
          />
          <div style={{ fontSize: 22, fontWeight: 700 }}>新しいパスワードを設定</div>
        </div>

        {done ? (
          <>
            <div style={{
              marginBottom: 20,
              padding: "16px",
              borderRadius: 12,
              background: "rgba(102,187,106,0.1)",
              border: "1px solid rgba(102,187,106,0.3)",
              color: "var(--gpt-text-primary, #e0d6c4)",
              fontSize: 14,
              lineHeight: 1.7,
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
            <div style={{ marginBottom: 20, color: "var(--gpt-text-secondary)", fontSize: 14, lineHeight: 1.7 }}>
              新しいパスワードを入力してください。
            </div>

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
                  color: "#ef5350",
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
    </div>
  );
}
