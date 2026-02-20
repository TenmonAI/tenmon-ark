import React from "react";

export function DebugPanel({ payload }: { payload: any }) {
  // Minimal, safe: no side effects. Just render JSON.
  return (
    <div style={{ border: "1px solid #374151", borderRadius: 8, padding: 10, marginTop: 10 }}>
      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>DebugPanel</div>
      <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, margin: 0 }}>
        {JSON.stringify(payload ?? null, null, 2)}
      </pre>
    </div>
  );
}
