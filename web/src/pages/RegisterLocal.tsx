/**
 * ============================================================
 *  REGISTER LOCAL PAGE — 新規登録
 *  TENMON_MANUS_FINAL_COMPLETION_V3
 *  LoginLocal.tsx と統一したブランドスタイル
 * ============================================================
 */
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
        background: C.bg,
        overflowY: "auto",
        fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif",
      }}
    >
      <div style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "48px 20px 60px",
      }}>

        {/* ── ブランドヘッダー ── */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img
            src="/pwa/brand/tenmon-ark-mark.svg"
            alt="天聞アーク"
            style={{ width: 40, height: 40, marginBottom: 10 }}
          />
          <h1 style={{
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 1,
            margin: "0 0 6px",
            color: C.text,
          }}>
            新規登録
          </h1>
          <p style={{
            fontSize: 13,
            color: C.textMuted,
            margin: 0,
          }}>
            天聞アークのアカウントを作成します
          </p>
        </div>

        {/* ── メインカード ── */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: "24px 20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            marginBottom: 24,
          }}
        >
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
            style={{ marginBottom: 16, width: "100%", boxSizing: "border-box" }}
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
            style={{ width: "100%", height: 48, minHeight: 48, marginBottom: 12 }}
          >
            {submitting ? "登録中..." : "登録してはじめる"}
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
              すでにアカウントをお持ちの方はこちら
            </a>
          </div>
        </form>

        {/* ── 三つの柱 ── */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 24,
        }}>
          {[
            { icon: "☽", title: "宿曜占星術", desc: "生年月日から本命宿を導き、運命の傾向を読み解きます" },
            { icon: "言", title: "言霊解読", desc: "名前の音韻構造から、存在の本質を解析します" },
            { icon: "∞", title: "名前統合", desc: "宿曜と言霊を統合し、あなただけの存在構造を明らかにします" },
          ].map((p, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "12px 14px",
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
            }}>
              <span style={{
                fontSize: 18,
                flexShrink: 0,
                width: 28,
                textAlign: "center",
                opacity: 0.7,
              }}>{p.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.6 }}>{p.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── フッター ── */}
        <div style={{
          fontSize: 11,
          color: C.textMuted,
          textAlign: "center",
          lineHeight: 1.7,
        }}>
          天聞アーク — 存在構造の総合解読AI
        </div>
      </div>
    </div>
  );
}
