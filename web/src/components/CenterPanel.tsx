import React from "react";
import { KanagiTrace } from "../types/kanagi";

export const CenterPanel: React.FC<{ trace: KanagiTrace }> = ({ trace }) => {
  if (!trace.centerProcess && !trace.fermentation) return null;

  return (
    <div className="center-panel" style={{ padding: "16px", border: "1px solid #e5e7eb", borderRadius: "8px", marginBottom: "16px" }}>
      <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "8px" }}>正中（CENTER）</h3>
      {trace.centerProcess && (
        <>
          <p>状態: {trace.centerProcess.stage}</p>
          <p>深度: {trace.centerProcess.depth}</p>
        </>
      )}
      {trace.fermentation && trace.fermentation.active && (
        <>
          <p>発酵時間: {Math.floor(trace.fermentation.elapsed / 1000)}秒</p>
          <p>未解放エネルギー: {trace.fermentation.unresolvedEnergy}</p>
          <p>CENTER深度: {trace.fermentation.centerDepth}</p>
        </>
      )}
      <p style={{ opacity: 0.7, fontSize: "12px", marginTop: "8px" }}>
        ※ ここでは結論は出ません。矛盾は発酵中です。
      </p>
    </div>
  );
};

