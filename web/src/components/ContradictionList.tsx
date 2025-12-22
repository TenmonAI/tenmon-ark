import React from "react";
import { KanagiContradiction } from "../types/kanagi";

export const ContradictionList: React.FC<{
  list?: KanagiContradiction[];
}> = ({ list }) => {
  if (!list || list.length === 0) return null;

  return (
    <div style={{ padding: "16px", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
      <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px" }}>
        保持されている矛盾
      </h3>
      {list.map((c, i) => (
        <div
          key={i}
          style={{
            marginBottom: "16px",
            padding: "12px",
            backgroundColor: "#f9fafb",
            borderRadius: "6px",
            borderLeft: "3px solid #7a5cff",
          }}
        >
          <div style={{ marginBottom: "8px" }}>
            <strong style={{ color: "#ef4444" }}>正:</strong> {c.thesis}
          </div>
          <div style={{ marginBottom: "8px" }}>
            <strong style={{ color: "#3b82f6" }}>反:</strong> {c.antithesis}
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            緊張度: {c.tensionLevel}/10
          </div>
        </div>
      ))}
    </div>
  );
};

