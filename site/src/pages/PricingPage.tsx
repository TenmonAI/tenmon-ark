import React, { useState } from "react";
import { Link } from "react-router-dom";

export function PricingPage() {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "founder" }),
        credentials: "include",
      });
      if (res.status === 401) {
        window.location.href = "/login?next=/pricing";
        return;
      }
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Pricing</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>Founder プランでアプリを利用できます。</p>
      <div style={{ marginBottom: "1.5rem" }}>
        <button
          type="button"
          onClick={handleCheckout}
          disabled={loading}
          style={{
            padding: "0.75rem 1.5rem",
            background: "#1a1a1a",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Redirecting…" : "決済へ進む"}
        </button>
      </div>
      <Link to="/login" style={{ color: "#666", fontSize: "0.9rem" }}>Already have an account? Login</Link>
    </div>
  );
}
