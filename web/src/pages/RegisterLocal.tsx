import React, { useMemo, useState } from "react";
import { PasswordWithEye } from "../components/PasswordWithEye";

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

function errorToMessage(error: string): string {
  if (error === "PASSWORD_MISMATCH") return "パスワードが一致しません。";
  if (error === "EMAIL_EXISTS") return "このメールアドレスは既に登録されています。";
  if (error === "REGISTER_FAILED" || error === "BAD_EMAIL" || error === "WEAK_PASSWORD" || error === "PASSWORD_CONFIRM_REQUIRED") {
    return "入力内容を確認してください。";
  }
  return error || "登録に失敗しました。しばらくしてからお試しください。";
}

export default function RegisterLocal() {
  const nextPath = useMemo(() => getNextPath(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (password !== passwordConfirm) {
      setErrorText("PASSWORD_MISMATCH");
      return;
    }
    setSubmitting(true);
    setErrorText("");

    try {
      const res = await fetch("/api/auth/local/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
          password_confirm: passwordConfirm,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok || !body?.ok) {
        setErrorText(errorToMessage(String(body?.error || "REGISTER_FAILED")));
        setSubmitting(false);
        return;
      }

      try {
        localStorage.setItem("TENMON_AUTH_OK_V1", "1");
        localStorage.removeItem("TENMON_AUTOLOGIN_DONE");
        const u = body?.user;
        const ukey = (u?.id && String(u.id).trim()) || (u?.email && String(u.email).trim()) || "";
        if (ukey) localStorage.setItem("TENMON_USER_KEY", ukey);
        if (u?.email) localStorage.setItem("tenmon_user_display_v1", String(u.email));
      } catch {}

      window.location.href = nextPath;
    } catch {
      setErrorText("登録に失敗しました。しばらくしてからお試しください。");
      setSubmitting(false);
    }
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
      <form
        onSubmit={handleSubmit}
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
          <div style={{ fontSize: 22, fontWeight: 700 }}>新規登録</div>
        </div>

        <div style={{ marginBottom: 16, color: "var(--gpt-text-secondary)", fontSize: 14 }}>
          TENMON-ARK のアカウントを作成します
        </div>

        <label style={{ display: "block", marginBottom: 8, fontSize: 14 }}>メールアドレス</label>
        <input
          className="gpt-input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ marginBottom: 14, width: "100%", boxSizing: "border-box" }}
        />

        <PasswordWithEye
          label="パスワード（8文字以上）"
          value={password}
          onChange={setPassword}
          placeholder="8文字以上"
          autoComplete="new-password"
        />

        <PasswordWithEye
          label="確認用"
          value={passwordConfirm}
          onChange={setPasswordConfirm}
          placeholder="同じパスワードを再入力"
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
            {errorToMessage(errorText)}
          </div>
        ) : null}

        <button
          type="submit"
          className="gpt-btn gpt-btn-primary"
          disabled={submitting || !email.trim() || !password || !passwordConfirm}
          style={{ width: "100%", height: 48, minHeight: 48 }}
        >
          {submitting ? "登録中..." : "登録してはじめる"}
        </button>

        <div style={{ marginTop: 16, fontSize: 14 }}>
          <a
            href={`/pwa/login-local.html?next=${encodeURIComponent(nextPath)}`}
            style={{ color: "var(--gpt-link)" }}
          >
            すでにアカウントをお持ちの方はこちら
          </a>
        </div>
      </form>
    </div>
  );
}
