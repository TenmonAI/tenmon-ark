import React from "react";
import { Link } from "react-router-dom";

export function TermsPage() {
  return (
    <div style={{ padding: "2rem", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>利用規約</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>Terms of Service (仮)</p>
      <p style={{ marginBottom: "1rem" }}>本ページは準備中です。</p>
      <Link to="/" style={{ color: "#2f6f5e", fontSize: "0.9rem" }}>トップへ</Link>
    </div>
  );
}
