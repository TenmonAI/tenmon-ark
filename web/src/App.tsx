import React, { useEffect, useState } from "react";
import { SettingsPanel } from "./components/SettingsPanel";

export default function App() {
  const [health, setHealth] = useState<{ service: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openSettings, setOpenSettings] = useState(false);

  // B) 最小diff: health を /api/audit に変更
  useEffect(() => {
    fetch(`/api/audit`)
      .then((res) => {
        if (!res.ok) throw new Error("audit api error");
        return res.json();
      })
      .then((data) => setHealth({ service: "api", status: data.readiness?.stage || "READY" }))
      .catch(() => setError("API unreachable"));
  }, []);

  // persona/memory の useEffect は一旦停止
  // useEffect(() => { ...persona... }, []);
  // useEffect(() => { ...memory... }, []);

  return (
    <>
    <div style={{ padding: 24, color: "white", background: "#05050A", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>TENMON-ARK PWA (Vite)</h1>
        <button
          onClick={() => setOpenSettings(!openSettings)}
          style={{
            background: "none",
            border: "none",
            color: "#e5e7eb",
            cursor: "pointer",
            fontSize: 20,
            padding: "4px 8px",
            opacity: 0.8,
          }}
          title="設定"
        >
          ⚙
        </button>
      </div>
      <p>UI build is alive.</p>
      
      {health && (
        <div style={{ marginTop: 16, padding: 12, background: "#1a1a2e", borderRadius: 8 }}>
          <p style={{ margin: 0 }}>
            <strong>Health:</strong> {health.service} - {health.status}
          </p>
        </div>
      )}
      
      {error && (
        <div style={{ marginTop: 16, padding: 12, background: "#2a1a1a", borderRadius: 8, color: "#ff6b6b" }}>
          <p style={{ margin: 0 }}>Error: {error}</p>
        </div>
      )}

      {openSettings ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "grid",
            placeItems: "center",
            zIndex: 9999,
          }}
          onClick={() => setOpenSettings(false)}
        >
          <div
            style={{ width: "min(720px, 92vw)", background: "#fff", borderRadius: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", padding: 12 }}>
              <div style={{ fontWeight: 700 }}>TENMON-ARK</div>
              <button onClick={() => setOpenSettings(false)}>Close</button>
            </div>
            <SettingsPanel open={true} onClose={() => setOpenSettings(false)} onImported={() => window.location.reload()} />
          </div>
        </div>
      ) : null}
    </div>
    </>
  );
}
