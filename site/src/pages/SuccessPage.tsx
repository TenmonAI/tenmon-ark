import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export function SuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"verifying" | "ok" | "fail" | "no_session">("verifying");

  useEffect(() => {
    if (!sessionId) {
      setStatus("no_session");
      return;
    }
    let cancelled = false;
    fetch(`/api/billing/session/verify?session_id=${encodeURIComponent(sessionId)}`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { ok?: boolean; founder?: boolean } | null) => {
        if (cancelled) return;
        if (data?.ok && data?.founder) {
          setStatus("ok");
          window.location.href = "/pwa/";
        } else {
          setStatus("fail");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("fail");
      });
    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <div style={{ padding: "2rem", maxWidth: 720, margin: "0 auto" }}>
      {status === "verifying" && <p style={{ color: "#666" }}>決済を確認しています…</p>}
      {status === "ok" && <p style={{ color: "#666" }}>リダイレクトしています…</p>}
      {status === "no_session" && (
        <>
          <p style={{ color: "#666" }}>セッションIDが指定されていません。決済完了後は自動でこのページへリダイレクトされます。</p>
          <a href="/pricing" style={{ color: "var(--ark-accent)", fontSize: "0.9rem" }}>料金ページへ</a>
          {" · "}
          <a href="/" style={{ color: "var(--ark-accent)", fontSize: "0.9rem" }}>トップへ</a>
        </>
      )}
      {status === "fail" && (
        <>
          <p style={{ color: "#c00" }}>確認に失敗しました。ログインしてから再度お試しください。</p>
          <a href="/pwa/" style={{ color: "var(--ark-accent)", fontSize: "0.9rem" }}>アプリへ</a>
        </>
      )}
    </div>
  );
}
