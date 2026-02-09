import React, { useState } from "react";
import { SpiralCanvas } from "../components/SpiralCanvas";
import { CenterPanel } from "../components/CenterPanel";
import { ContradictionList } from "../components/ContradictionList";
import { MetaStatus } from "../components/MetaStatus";
import { KanagiTrace } from "../types/kanagi";
import { API_BASE_URL } from "../config/api.js";

export default function KanagiPage() {
  const [trace, setTrace] = useState<KanagiTrace | null>(null);
  const [message, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  async function run(userInput: string) {
    if (!userInput.trim() || loading) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/kanagi/reason`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput, threadId: "ui-test" }),
      });
      const json = await res.json();
      setTrace(json.trace);
    } catch (error) {
      console.error("Failed to run Kanagi reasoner:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "24px" }}>
        天津金木 思考螺旋可視化
      </h1>

      <div style={{ marginBottom: "24px" }}>
        <textarea
          value={message}
          onChange={(e) => setInput(e.target.value)}
          placeholder="思考を回すための入力..."
          style={{
            width: "100%",
            minHeight: "80px",
            padding: "12px",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "14px",
          }}
        />
        <button
          onClick={() => run(message)}
          disabled={loading || !message.trim()}
          style={{
            marginTop: "12px",
            padding: "8px 16px",
            backgroundColor: "#7a5cff",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: loading || !message.trim() ? "not-allowed" : "pointer",
            opacity: loading || !message.trim() ? 0.5 : 1,
          }}
        >
          {loading ? "思考中..." : "思考を回す"}
        </button>
      </div>

      {trace && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px" }}>
              螺旋構造
            </h2>
            <SpiralCanvas trace={trace} />
            <MetaStatus trace={trace} />
          </div>

          <div>
            <CenterPanel trace={trace} />
            <ContradictionList list={trace.contradictions} />
          </div>
        </div>
      )}

      {!trace && (
        <div style={{ textAlign: "center", padding: "48px", color: "#9ca3af" }}>
          <p>入力して「思考を回す」をクリックしてください</p>
          <p style={{ fontSize: "12px", marginTop: "8px" }}>
            ※ 解答は表示されません。思考の運動（螺旋・CENTER・矛盾）だけを観測します。
          </p>
        </div>
      )}
    </div>
  );
}

