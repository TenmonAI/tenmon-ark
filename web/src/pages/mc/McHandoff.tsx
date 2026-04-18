/**
 * McHandoff.tsx — Mission Control V2 AI Handoff Page
 * §15 Frontend: AI handoff JSON viewer with copy-to-clipboard
 */
import React, { useEffect, useState } from "react";
import McLayout, { C } from "./McLayout";

export default function McHandoff() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/mc/ai-handoff.json", { credentials: "include" })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const handleCopy = () => {
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const renderValue = (val: any, depth: number = 0): React.ReactNode => {
    if (val === null || val === undefined) return <span style={{ color: C.textMuted }}>null</span>;
    if (typeof val === "boolean") return <span style={{ color: val ? C.green : C.red }}>{String(val)}</span>;
    if (typeof val === "number") return <span style={{ color: "#93c5fd" }}>{val}</span>;
    if (typeof val === "string") return <span style={{ color: "#fbbf24" }}>"{val}"</span>;
    if (Array.isArray(val)) {
      if (val.length === 0) return <span style={{ color: C.textMuted }}>[]</span>;
      return (
        <div style={{ marginLeft: depth > 0 ? 16 : 0 }}>
          {val.map((item, i) => (
            <div key={i} style={{ marginBottom: 2 }}>
              <span style={{ color: C.textMuted }}>[{i}] </span>
              {renderValue(item, depth + 1)}
            </div>
          ))}
        </div>
      );
    }
    if (typeof val === "object") {
      return (
        <div style={{ marginLeft: depth > 0 ? 16 : 0 }}>
          {Object.entries(val).map(([k, v]) => (
            <div key={k} style={{ marginBottom: 2 }}>
              <span style={{ color: "#a78bfa" }}>{k}</span>
              <span style={{ color: C.textMuted }}>: </span>
              {renderValue(v, depth + 1)}
            </div>
          ))}
        </div>
      );
    }
    return <span>{String(val)}</span>;
  };

  return (
    <McLayout activePage="handoff">
      <div style={{ maxWidth: 900 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: C.accent }}>AI Handoff Document</h1>
            <p style={{ fontSize: 12, color: C.textMuted, margin: "4px 0 0" }}>
              Primary document for Manus/Claude/Cursor context injection
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleCopy}
              style={{
                background: copied ? "rgba(34,197,94,0.15)" : C.accentBg,
                border: `1px solid ${copied ? C.green + "33" : C.accent + "33"}`,
                color: copied ? C.green : C.accent,
                padding: "6px 14px",
                borderRadius: 6,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {copied ? "Copied!" : "Copy JSON"}
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: C.accentBg,
                border: `1px solid ${C.accent}33`,
                color: C.accent,
                padding: "6px 14px",
                borderRadius: 6,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Refresh
            </button>
          </div>
        </div>

        {loading && <div style={{ color: C.textSub, padding: 40, textAlign: "center" }}>Loading...</div>}
        {error && <div style={{ color: C.red, padding: 20, background: "rgba(239,68,68,0.1)", borderRadius: 8 }}>Error: {error}</div>}

        {data && (
          <>
            {/* Identity card */}
            {data.identity && (
              <div style={{
                background: C.card,
                border: `1px solid ${C.accent}33`,
                borderRadius: 8,
                padding: 20,
                marginBottom: 16,
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.accent, marginBottom: 8 }}>
                  {data.identity.project}
                </div>
                <div style={{ fontSize: 13, color: C.textSub }}>{data.identity.definition}</div>
              </div>
            )}

            {/* Soul Root status */}
            {data.soul_root && (
              <div style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: 20,
                marginBottom: 16,
              }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginTop: 0, marginBottom: 12, color: C.textSub }}>Soul Root Status</h3>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 12 }}>
                  <div>
                    <span style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      background: data.soul_root.status === "fully_connected" ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)",
                      color: data.soul_root.status === "fully_connected" ? C.green : C.orange,
                    }}>
                      {data.soul_root.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: C.textSub }}>
                    Iroha: {data.soul_root.iroha_paragraphs} paragraphs
                  </div>
                  <div style={{ fontSize: 12, color: C.textSub }}>
                    Genten: {data.soul_root.genten_sounds} sounds
                  </div>
                  <div style={{ fontSize: 12, color: C.textSub }}>
                    Amaterasu: {data.soul_root.amaterasu_anchors} anchors
                  </div>
                </div>
                {data.soul_root.bind_status && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 4 }}>
                    {Object.entries(data.soul_root.bind_status).map(([name, bound]) => (
                      <div key={name} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: bound ? C.green : C.red,
                          display: "inline-block",
                        }} />
                        <span style={{ color: bound ? C.text : C.textMuted }}>{name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Full JSON tree */}
            <div style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: 20,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize: 12,
              lineHeight: 1.6,
              overflowX: "auto",
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginTop: 0, marginBottom: 12, color: C.textSub, fontFamily: "'Inter', sans-serif" }}>Full JSON</h3>
              {renderValue(data)}
            </div>
          </>
        )}
      </div>
    </McLayout>
  );
}
