import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export function AppGate() {
  const [searchParams] = useSearchParams();
  const stripeSessionId = searchParams.get("stripe_session_id");
  const [status, setStatus] = useState<"linking" | "me" | "redirect">("linking");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (stripeSessionId) {
        try {
          const res = await fetch("/api/billing/link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: stripeSessionId }),
            credentials: "include",
          });
          if (!res.ok && !cancelled) {
            setStatus("me");
            return;
          }
        } catch {
          if (!cancelled) setStatus("me");
          return;
        }
      }
      if (cancelled) return;
      setStatus("me");
    };
    run();
    return () => { cancelled = true; };
  }, [stripeSessionId]);

  useEffect(() => {
    if (status !== "me") return;
    let cancelled = false;
    fetch("/api/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { founder?: boolean } | null) => {
        if (cancelled) return;
        setStatus("redirect");
        if (data?.founder) {
          window.location.href = "/pwa/";
        } else {
          window.location.href = "/pricing?next=/pwa/";
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("redirect");
          window.location.href = "/login?next=/pwa/";
        }
      });
    return () => { cancelled = true; };
  }, [status]);

  return (
    <div style={{ padding: "2rem", maxWidth: 720, margin: "0 auto" }}>
      <p style={{ color: "#666" }}>
        {status === "linking" && "Linking session…"}
        {(status === "me" || status === "redirect") && "Redirecting…"}
      </p>
    </div>
  );
}
