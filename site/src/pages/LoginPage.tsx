import React from "react";
import { useSearchParams } from "react-router-dom";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") ?? searchParams.get("returnTo") ?? "/pwa/";
  const stripeSessionId = searchParams.get("stripe_session_id");
  const startUrl = `/api/auth/oidc/start?next=${encodeURIComponent(next)}${stripeSessionId ? `&stripe_session_id=${encodeURIComponent(stripeSessionId)}` : ""}`;

  return (
    <div style={{ padding: "2rem", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Login</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>
        OIDC（Auth0 / Keycloak 等）でログインします。Google / Apple / Facebook / LINE は IdP 側で利用可能です。
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
        Login
      </a>
    </div>
  );
}
