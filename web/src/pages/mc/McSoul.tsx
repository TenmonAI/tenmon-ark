/**
 * McSoul.tsx — Mission Control V2 Soul Root Page
 * §15 Frontend: Soul root bind status and iroha connection viewer
 */
import React, { useEffect, useState } from "react";
import McLayout, { C } from "./McLayout";

export default function McSoul() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/mc/ai-handoff.json", { credentials: "include" })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const sr = data?.soul_root;
  const bindEntries = sr?.bind_status ? Object.entries(sr.bind_status) : [];
  const boundCount = bindEntries.filter(([, v]) => v).length;
  const totalCount = bindEntries.length;
  const pct = totalCount > 0 ? Math.round((boundCount / totalCount) * 100) : 0;

  return (
    <McLayout activePage="soul">
      <div style={{ maxWidth: 900 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: C.accent }}>Soul Root Status</h1>
        <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 24px" }}>
          魂の根幹接続状態 — いろは言霊解・五十連法則・天照軸
        </p>

        {loading && <div style={{ color: C.textSub, padding: 40, textAlign: "center" }}>Loading...</div>}
        {error && <div style={{ color: C.red, padding: 20, background: "rgba(239,68,68,0.1)", borderRadius: 8 }}>Error: {error}</div>}

        {sr && (
          <>
            {/* Status overview */}
            <div style={{
              background: C.card,
              border: `1px solid ${pct === 100 ? C.green + "44" : C.orange + "44"}`,
              borderRadius: 8,
              padding: 24,
              marginBottom: 16,
              textAlign: "center",
            }}>
              <div style={{ fontSize: 48, fontWeight: 700, color: pct === 100 ? C.green : C.orange, fontVariantNumeric: "tabular-nums" }}>
                {pct}%
              </div>
              <div style={{ fontSize: 14, color: C.textSub, marginTop: 4 }}>
                {sr.status === "fully_connected" ? "Fully Connected" : "Partially Connected"}
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 8 }}>
                {boundCount}/{totalCount} modules bound to chat.ts + guest.ts
              </div>
            </div>

            {/* Asset counts */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "16px 20px" }}>
                <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Iroha Paragraphs</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.accent }}>{sr.iroha_paragraphs}</div>
                <div style={{ fontSize: 11, color: C.textSub }}>いろは言霊解 原典</div>
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "16px 20px" }}>
                <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Genten Sounds</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.accent }}>{sr.genten_sounds}</div>
                <div style={{ fontSize: 11, color: C.textSub }}>五十連法則</div>
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "16px 20px" }}>
                <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Amaterasu Anchors</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.accent }}>{sr.amaterasu_anchors}</div>
                <div style={{ fontSize: 11, color: C.textSub }}>天照軸アンカー</div>
              </div>
            </div>

            {/* Bind status detail */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginTop: 0, marginBottom: 16, color: C.textSub }}>Module Bind Status</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
                {bindEntries.map(([name, bound]) => (
                  <div key={name} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: 6,
                    background: bound ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
                    border: `1px solid ${bound ? C.green + "22" : C.red + "22"}`,
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: bound ? C.green : C.red,
                      flexShrink: 0,
                    }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: bound ? C.text : C.textMuted }}>{name}</div>
                      <div style={{ fontSize: 10, color: C.textMuted }}>{bound ? "Connected" : "Not connected"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </McLayout>
  );
}
