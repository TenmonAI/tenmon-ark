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
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      // セキュリティ: 成功/失敗にかかわらず同じ表示
      setSent(true);
    } catch (err: any) {
      // ネットワークエラーでも送信完了として表示
      setSent(true);
    } finally {
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
          <div style={{ fontSize: 22, fontWeight: 700 }}>パスワードの再設定</div>
        </div>

        {sent ? (
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
              入力されたメールアドレス宛に、再設定用のご案内を送信しました。
              <br /><br />
              登録状況にかかわらず、しばらく待っても届かない場合は迷惑メールフォルダもご確認ください。
            </div>
            <a
              href={`/pwa/login-local.html?next=${encodeURIComponent(nextPath)}`}
              style={{
                display: "block",
                textAlign: "center",
                color: "var(--gpt-text-secondary)",
                fontSize: 14,
                textDecoration: "none",
                padding: "12px 0",
              }}
            >
              ログイン画面に戻る
            </a>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20, color: "var(--gpt-text-secondary)", fontSize: 14, lineHeight: 1.7 }}>
              ご登録のメールアドレスを入力してください。
              <br />
              再設定用のリンクをお送りします。
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

            <a
              href={`/pwa/login-local.html?next=${encodeURIComponent(nextPath)}`}
              style={{
                display: "block",
                textAlign: "center",
                color: "var(--gpt-text-secondary)",
                fontSize: 14,
                textDecoration: "none",
                padding: "8px 0",
              }}
            >
              ログイン画面に戻る
            </a>
          </form>
        )}
      </div>
    </div>
  );
}
