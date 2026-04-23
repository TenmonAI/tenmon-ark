import React from "react";
import { C } from "../../pages/mc/McLayout";

export default function VnextJsonPanel({ title, data }: { title: string; data: unknown }) {
  const text = JSON.stringify(data, null, 2);
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {title}
      </div>
      <pre
        style={{
          margin: 0,
          padding: 14,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          fontSize: 11,
          lineHeight: 1.45,
          overflow: "auto",
          maxHeight: "55vh",
          color: C.textSub,
        }}
      >
        {text}
      </pre>
    </div>
  );
}
