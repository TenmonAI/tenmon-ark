import React, { useRef, useState } from "react";
import { exportAll, importAll } from "../lib/db";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export function SettingsPanel({ open, onClose, onImported }: SettingsPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!open) return null;

  const handleExport = async () => {
    try {
      const data = await exportAll();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `tenmon-ark-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setMessage({ type: "success", text: "エクスポート成功" });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error("Export failed:", err);
      setMessage({ type: "error", text: "エクスポートに失敗しました" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            resolve(e.target?.result as string);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });

      const data = JSON.parse(text);
      await importAll(data);
      setMessage({ type: "success", text: "Importしました。リロードします…" });
      setTimeout(() => location.reload(), 100);
    } catch (err) {
      console.error("Import failed:", err);
      setMessage({ type: "error", text: "インポートに失敗しました（形式が違う可能性）" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#1a1a1a",
          padding: 24,
          borderRadius: 12,
          maxWidth: 500,
          width: "90%",
          border: "1px solid #333",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: "#e5e7eb" }}>設定</h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#e5e7eb",
              cursor: "pointer",
              fontSize: 20,
              padding: "4px 8px",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h4 style={{ margin: "0 0 8px 0", fontSize: 14, color: "#e5e7eb" }}>データのエクスポート/インポート</h4>
          <p style={{ margin: "0 0 16px 0", fontSize: 12, opacity: 0.8, color: "#e5e7eb" }}>
            会話データをJSONファイルで保存し、別端末で復元できます。
          </p>

          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <button
              onClick={handleExport}
              style={{
                flex: 1,
                padding: 12,
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Export JSON
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                flex: 1,
                padding: 12,
                background: "#059669",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Import JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={handleImport}
            />
          </div>

          {message && (
            <div
              style={{
                padding: 12,
                borderRadius: 6,
                marginBottom: 12,
                background: message.type === "success" ? "#059669" : "#dc2626",
                color: "white",
                fontSize: 14,
              }}
            >
              {message.text}
            </div>
          )}

          <p style={{ margin: 0, fontSize: 11, opacity: 0.7, color: "#fbbf24" }}>
            ⚠️ Importすると端末内データが置き換わります
          </p>
        </div>
      </div>
    </div>
  );
}
