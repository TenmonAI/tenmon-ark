import React from "react";
import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <div style={{ padding: "2rem", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>TENMON-ARK</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>天聞アーク — 導線</p>
      <p style={{ marginBottom: "1rem" }}>
        Founder プランでアプリを解禁し、チャットを利用できます。
      </p>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Link to="/pricing" style={{ padding: "0.5rem 1rem", background: "#1a1a1a", color: "#fff", textDecoration: "none", borderRadius: 8 }}>
          Pricing
        </Link>
        <Link to="/login" style={{ padding: "0.5rem 1rem", border: "1px solid #ccc", color: "#111", textDecoration: "none", borderRadius: 8 }}>
          Login
        </Link>
      </div>
      <p style={{ marginTop: "2rem", fontSize: "0.85rem", color: "#666" }}>
        <Link to="/terms" style={{ color: "#2f6f5e" }}>利用規約</Link>
        {" · "}
        <Link to="/privacy" style={{ color: "#2f6f5e" }}>プライバシーポリシー</Link>
      </p>
    </div>
  );
}
