import React from "react";
import { KanagiTrace } from "../types/kanagi";

export const MetaStatus: React.FC<{ trace: KanagiTrace }> = ({ trace }) => {
  return (
    <div
      style={{
        marginTop: "16px",
        padding: "12px",
        backgroundColor: "#f9fafb",
        borderRadius: "6px",
        fontSize: "12px",
        color: "#6b7280",
      }}
    >
      <p>Spiral Depth: {trace.meta.spiralDepth}</p>
      <p>Provisional: true</p>
      <p style={{ fontSize: "11px", marginTop: "4px", fontStyle: "italic" }}>
        ※ すべての観測は暫定的です
      </p>
    </div>
  );
};

