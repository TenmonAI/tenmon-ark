import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") ?? searchParams.get("returnTo") ?? "/pwa/";
  const stripeSessionId = searchParams.get("stripe_session_id");
  const startUrl = `/api/auth/oidc/start?next=${encodeURIComponent(next)}${stripeSessionId ? `&stripe_session_id=${encodeURIComponent(stripeSessionId)}` : ""}`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [meta, setMeta] = useState("待機中");

  async function localLogin() {
    const r = await fetch("/api/auth/local/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    });
    const j = await r.json().catch(() => ({}));
    setMeta(JSON.stringify(j, null, 2));
    if (r.ok && j?.ok) {
      window.location.href = next;
    }
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Login</h1>
      <p style={{ color: "#666", marginBottom: "1rem" }}>
        TENMON-ARK へログインします。
      </p>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ marginBottom: 10 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="email"
            style={{ width: "100%", padding: "12px", borderRadius: 8, border: "1px solid #ccc", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ marginBottom: 10, position: "relative" }}>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPw ? "text" : "password"}
            placeholder="password"
            style={{ width: "100%", padding: "12px 44px 12px 12px", borderRadius: 8, border: "1px solid #ccc", boxSizing: "border-box" }}
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            style={{
              position: "absolute",
              right: 8,
              top: 8,
              width: 28,
              height: 28,
              border: 0,
              background: "transparent",
              cursor: "pointer",
              fontSize: 16
            }}
            aria-label="toggle password"
            title="toggle password"
          >
            ◌̸
          </button>
        </div>

        <button
          onClick={localLogin}
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            background: "#1a1a1a",
            color: "#fff",
            border: 0,
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Email + Password でログイン
        </button>

        <div style={{ fontSize: 12, color: "#666", marginTop: 10, whiteSpace: "pre-wrap" }}>{meta}</div>

        <div style={{ marginTop: 12 }}>
          <Link to={`/register?next=${encodeURIComponent(next)}`}>新規登録はこちら</Link>
        </div>
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <p style={{ color: "#666", marginBottom: "1rem" }}>
          OIDC（Auth0 / Keycloak 等）でログインする場合はこちら。
        </p>
        <a
          href={startUrl}
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            background: "#1a1a1a",
            color: "#fff",
            textDecoration: "none",
            borderRadius: 8,
          }}
        >
          OIDC Login
        </a>
      </div>
    </div>
  );
}
