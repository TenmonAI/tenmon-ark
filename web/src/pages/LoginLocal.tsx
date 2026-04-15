/**
 * ============================================================
 *  LOGIN PAGE — 天聞アーク ログイン + LP的ブランド訴求
 *  TENMON_MANUS_FINAL_CORRECTION_AND_COMPLETION_V1
 *  未認証ユーザーの最初の接点として、世界観を伝えつつログインへ導く
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
        const u = body?.user;
        const ukey = (u?.id && String(u.id).trim()) || (u?.email && String(u.email).trim()) || "";
        if (ukey) localStorage.setItem("TENMON_USER_KEY", ukey);
        if (u?.email) localStorage.setItem("tenmon_user_display_v1", String(u.email));
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
        background: C.bg,
        overflowY: "auto",
        fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif",
      }}
    >
      <div style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "40px 20px 60px",
      }}>

        {/* ── ブランドヒーロー ── */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img
            src="/pwa/brand/tenmon-ark-mark.svg"
            alt="TENMON-ARK"
            style={{ width: 48, height: 48, marginBottom: 12 }}
          />
          <h1 style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 2,
            margin: "0 0 10px",
            color: C.text,
          }}>
            天聞アーク
          </h1>
          <p style={{
            fontSize: 14,
            color: C.textSub,
            lineHeight: 1.9,
            margin: "0 0 6px",
          }}>
            星と音と言葉で、あなたの存在を読み解く
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

        {/* ── ログインフォーム ── */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: "24px 20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            marginBottom: 28,
          }}
        >
          <h2 style={{
            fontSize: 17,
            fontWeight: 600,
            margin: "0 0 18px",
            color: C.text,
          }}>
            ログイン
          </h2>

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

          <PasswordWithEye
            label="パスワード"
            value={password}
            onChange={setPassword}
            placeholder="パスワード"
            autoComplete="current-password"
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
            disabled={submitting || !email.trim() || !password}
            style={{ width: "100%", height: 48, minHeight: 48 }}
          >
            {submitting ? "ログイン中..." : "ログイン"}
          </button>

          <div style={{ textAlign: "center", marginTop: 14 }}>
            <a
              href="/pwa/forgot-password"
              style={{
                color: C.textMuted,
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              パスワードを忘れた方
            </a>
          </div>
        </form>

        {/* ── 三つの柱 ── */}
        <div style={{ marginBottom: 28 }}>
          <h3 style={{
            fontSize: 13,
            fontWeight: 600,
            color: C.arkGold,
            letterSpacing: "0.08em",
            marginBottom: 14,
            textAlign: "center",
          }}>
            三つの柱
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              {
                icon: "✦",
                title: "宿曜鑑定",
                desc: "生年月日から本命宿を導き出し、星の配置があなたの存在構造を映し出します。",
              },
              {
                icon: "音",
                title: "言霊解読",
                desc: "名前の音韻を五十音の水火構造で読み解き、宿曜と重なる深層を示します。",
              },
              {
                icon: "蔵",
                title: "虚空蔵",
                desc: "書籍や資料を知恵の種として保管し、会話の中で自然に活かします。",
              },
            ].map((p, i) => (
              <div
                key={i}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 32,
                  borderRadius: 7,
                  background: C.arkGoldBg,
                  border: `1px solid ${C.arkGoldBorder}`,
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.arkGold,
                  flexShrink: 0,
                }}>
                  {p.icon}
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 3 }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.7 }}>
                    {p.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 設計思想 ── */}
        <div style={{
          background: C.arkGoldBg,
          border: `1px solid ${C.arkGoldBorder}`,
          borderRadius: 10,
          padding: "14px 18px",
          marginBottom: 24,
        }}>
          <p style={{
            fontSize: 12,
            color: C.text,
            lineHeight: 1.8,
            margin: 0,
          }}>
            <span style={{ fontWeight: 600, color: C.arkGold }}>設計思想</span>
            <span style={{ margin: "0 6px", color: C.textMuted }}>—</span>
            天聞アークは「端末に寄り添う」設計です。
            鑑定結果や会話の記録はお使いの端末に保管され、
            大切な情報が意図せず外部に出ることのないよう配慮しています。
          </p>
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
