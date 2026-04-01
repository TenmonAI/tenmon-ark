import type { CSSProperties } from "react";
import type { PersonaItem } from "./PersonaListPane";

type Props = {
  selected: PersonaItem | null;
  loading: boolean;
  previewThread: string;
  previewMsg: string;
  previewResponse: string;
  onDeploy: (id: string) => void;
  onStartPreview: (id: string) => void;
  onPreviewMsgChange: (v: string) => void;
  onSendPreview: () => void;
};

export function PersonaPreviewChat(props: Props): JSX.Element {
  const { selected } = props;

  if (!selected) {
    return (
      <div style={{ width: "360px", borderLeft: "1px solid #1e293b", padding: "16px", overflowY: "auto" }}>
        <div style={{ color: "#6b7280", fontSize: "13px" }}>← ペルソナを選択してください</div>
      </div>
    );
  }

  const inp: CSSProperties = {
    width: "100%",
    padding: "8px",
    background: "#1f2937",
    border: "1px solid #374151",
    borderRadius: "6px",
    color: "#e5e7eb",
    marginBottom: "8px",
    fontSize: "13px",
    boxSizing: "border-box",
  };
  const btn = (bg: string): CSSProperties => ({
    padding: "8px 16px",
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    marginRight: "8px",
  });

  return (
    <div style={{ width: "360px", borderLeft: "1px solid #1e293b", padding: "16px", overflowY: "auto" }}>
      <h3 style={{ color: "#a78bfa", fontSize: "15px", marginBottom: "12px" }}>{selected.name}</h3>
      <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "8px" }}>ID: {selected.id.slice(0, 16)}...</div>
      <div style={{ marginBottom: "16px" }}>
        {selected.role_summary && <div style={{ fontSize: "12px", marginBottom: "4px" }}>役割: {selected.role_summary}</div>}
        {selected.system_mantra && <div style={{ fontSize: "12px", marginBottom: "4px" }}>マントラ: {selected.system_mantra}</div>}
        <div style={{ fontSize: "12px" }}>記憶: {selected.memory_inheritance_mode || "未設定"}</div>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        <button onClick={() => props.onDeploy(selected.id)} disabled={props.loading} style={btn("#10b981")}>
          🚀 デプロイ
        </button>
        <button onClick={() => props.onStartPreview(selected.id)} disabled={props.loading} style={btn("#f59e0b")}>
          👁 Preview開始
        </button>
      </div>

      {props.previewThread && (
        <div style={{ background: "#1e293b", borderRadius: "8px", padding: "12px" }}>
          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "8px" }}>
            Preview: {props.previewThread.slice(-16)}
          </div>
          {props.previewResponse && (
            <div
              style={{
                fontSize: "12px",
                padding: "8px",
                background: "#0f172a",
                borderRadius: "6px",
                marginBottom: "8px",
                maxHeight: "200px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {props.previewResponse}
            </div>
          )}
          <input
            value={props.previewMsg}
            onChange={(e) => props.onPreviewMsgChange(e.target.value)}
            placeholder="テストメッセージを入力..."
            onKeyDown={(e) => {
              if (e.key === "Enter") props.onSendPreview();
            }}
            style={inp}
          />
          <button onClick={props.onSendPreview} disabled={props.loading} style={btn("#3b82f6")}>
            送信
          </button>
        </div>
      )}
    </div>
  );
}

export default PersonaPreviewChat;
