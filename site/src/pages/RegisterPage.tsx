import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") ?? "/pwa/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [meta, setMeta] = useState("待機中");

  async function register() {
    if (password !== password2) {
      setMeta(JSON.stringify({ ok: false, error: "PASSWORD_MISMATCH" }, null, 2));
      return;
    }
    const r = await fetch("/api/auth/local/register", {
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
      window.location.href = `/login?next=${encodeURIComponent(next)}`;
    }
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Register</h1>
      <p style={{ color: "#666", marginBottom: "1rem" }}>
        新規アカウントを作成します。登録後、承認済みメールのみログイン可能です。
      </p>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
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
            placeholder="password (8文字以上)"
            style={{ width: "100%", padding: "12px 44px 12px 12px", borderRadius: 8, border: "1px solid #ccc", boxSizing: "border-box" }}
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            style={{
              position: "absolute",
              right: 8,
             fontSize: 16
            }}
            aria-label="toggle password"
            title="toggle password"
          >
            ◌̸
          </button>
        </div>

        <div style={{ marginBottom: 10 }}>
          <input
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            type={showPw ? "text" : "password"}
            placeholder="password 確認"
            style={{ width: "100%", padding: "12px", borderRadius: 8, border: "1px solid #ccc", boxSizing: "border-box" }}
          />
        </div>

        <button
          onClick={register}
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
          新規登録
        </button>

        <div style={{ fontSize: 12, color: "#666", marginTop: 10, whiteSpace: "pre-wrap" }}>{meta}</div>

        <div style={{ marginTop: 12 }}>
          <Link to={`/login?next=${encodeURIComponent(next)}`}>ログインへ戻る</Link>
        </div>
      </div>
    </div>
  );
}
