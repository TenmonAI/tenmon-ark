/**
 * McLive.tsx — Mission Control V2 Live State Page
 * §15 Frontend: Live VPS state viewer
 */
import React, { useEffect, useState } from "react";
import McLayout, { C } from "./McLayout";

export default function McLive() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/mc/live-state", { credentials: "include" })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const renderSection = (title: string, obj: Record<string, any> | undefined) => {
    if (!obj) return null;
    return (
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20, marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginTop: 0, marginBottom: 12, color: C.textSub }}>{title}</h3>
        <div style={{ fontSize: 12 }}>
          {Object.entries(obj).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${C.border}22` }}>
              <span style={{ color: C.textMuted }}>{k}</span>
              <span style={{ color: typeof v === "boolean" ? (v ? C.green : C.red) : C.text, fontVariantNumeric: "tabular-nums" }}>
                {typeof v === "object" ? JSON.stringify(v) : String(v)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <McLayout activePage="live">
      <div style={{ maxWidth: 900 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: C.accent }}>Live State</h1>
        <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 24px" }}>
          {data?.generated_at ? `Collected: ${new Date(data.generated_at).toLocaleString("ja-JP")}` : "Loading..."}
        </p>

        {loading && <div style={{ color: C.textSub, padding: 40, textAlign: "center" }}>Loading...</div>}
        {error && <div style={{ color: C.red, padding: 20, background: "rgba(239,68,68,0.1)", borderRadius: 8 }}>Error: {error}. Run the collector first.</div>}

        {data && (
          <>
            {renderSection("Host", data.host)}
            {renderSection("Service", data.service)}
            {renderSection("Health", data.health)}
            {renderSection("Resources", data.resources ? {
              ...data.resources,
              disk: undefined,
              load_avg: data.resources.load_avg?.join(", "),
            } : undefined)}
            {data.resources?.disk && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20, marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginTop: 0, marginBottom: 12, color: C.textSub }}>Disk</h3>
                {data.resources.disk.map((d: any, i: number) => (
                  <div key={i} style={{ fontSize: 12, display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                    <span>{d.path}</span>
                    <span style={{ color: d.percent > 90 ? C.red : C.text }}>{d.used_gb}GB used / {d.free_gb}GB free ({d.percent}%)</span>
                  </div>
                ))}
              </div>
            )}
            {data.recent_errors?.length > 0 && (
              <div style={{ background: C.card, border: `1px solid ${C.red}33`, borderRadius: 8, padding: 20, marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginTop: 0, marginBottom: 12, color: C.red }}>Recent Errors ({data.recent_errors.length})</h3>
                {data.recent_errors.map((e: any, i: number) => (
                  <div key={i} style={{ fontSize: 11, color: C.textSub, padding: "4px 0", borderBottom: `1px solid ${C.border}22`, wordBreak: "break-all" }}>
                    {e.message_preview}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </McLayout>
  );
}
