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

export default function LoginLocal() {
  const nextPath = useMemo(() => getNextPath(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErrorText("");

    try {
      const res = await fetch("/api/auth/local/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok || !body?.ok) {
        setErrorText(String(body?.error || "LOGIN_FAILED"));
        setSubmitting(false);
        return;
      }

      try {
        localStorage.setItem("TENMON_AUTH_OK_V1", "1");
        localStorage.removeItem("TENMON_AUTOLOGIN_DONE");
      } catch {}

      window.location.href = nextPath;
    } catch (err: any) {
      setErrorText(String(err?.message || err || "LOGIN_FAILED"));
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
        padding: 24,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--gpt-bg-primary)",
          border: "1px solid var(--gpt-border)",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 12px 28px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <img
            src="/pwa/brand/tenmon-ark-mark.svg"
            alt="TENMON-ARK"
            style={{ width: 28, height: 28 }}
          />
          <div style={{ fontSize: 24, fontWeight: 700 }}>TENMON-ARK</div>
        </div>

        <div style={{ marginBottom: 16, color: "var(--gpt-text-secondary)" }}>
          ログインしてチャットを再開します。
        </div>

        <label style={{ display: "block", marginBottom: 8, fontSize: 14 }}>メールアドレス</label>
        <input
          className="gpt-input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ marginBottom: 14 }}
        />

        <label style={{ display: "block", marginBottom: 8, fontSize: 14 }}>パスワード</label>
        <input
          className="gpt-input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          style={{ marginBottom: 16 }}
        />

        {errorText ? (
          <div
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
          disabled={submitting || !email.trim() || !password}
          style={{ width: "100%", height: 44 }}
        >
          {submitting ? "ログイン中..." : "ログイン"}
        </button>
      </form>
    </div>
  );
}

