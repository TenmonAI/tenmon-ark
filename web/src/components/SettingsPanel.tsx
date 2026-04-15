/**
 * ============================================================
 *  SETTINGS PANEL — データのエクスポート/インポート
 *  TENMON_MANUS_FINAL_ADJUSTMENT_DIRECTIVE_V4
 *  ライトテーマ対応 + 日本語統一
 * ============================================================
 */
import React, { useRef, useState } from "react";
import { exportForDownload, importOverwrite, syncIdbToLocalStorageAfterImportV1 } from "../lib/exportImport";
import { TENMON_THREAD_SWITCH_EVENT } from "../hooks/useChat";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

const C = {
  bg: "#fafaf7",
  card: "#ffffff",
  text: "#1f2937",
  textSub: "#6b7280",
  textMuted: "#9ca3af",
  border: "#e5e7eb",
  arkGold: "#c9a14a",
  overlay: "rgba(0, 0, 0, 0.4)",
} as const;

export function SettingsPanel({ open, onClose, onImported }: SettingsPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!open) return null;

  const handleExport = async () => {
    try {
      const data = await exportForDownload();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `tenmon-ark-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setMessage({ type: "success", text: "エクスポートが完了しました" });
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
        reader.onload = (ev) => {
          try {
            resolve(ev.target?.result as string);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });

      const data = JSON.parse(text);
      await importOverwrite(data);
      const primaryId = await syncIdbToLocalStorageAfterImportV1();
      if (primaryId) {
        try {
          window.dispatchEvent(
            new CustomEvent(TENMON_THREAD_SWITCH_EVENT, { detail: { threadId: primaryId } })
          );
          window.dispatchEvent(new Event("tenmon:threads-updated"));
        } catch {
          /* ignore */
        }
      }
      setMessage({ type: "success", text: "インポートが完了しました（自動で同期されます）" });
      onImported();
    } catch (err) {
      console.error("Import failed:", err);
      setMessage({ type: "error", text: "インポートに失敗しました（ファイル形式をご確認ください）" });
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
        background: C.overlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.card,
          padding: 24,
          borderRadius: 12,
          maxWidth: 500,
          width: "90%",
          border: `1px solid ${C.border}`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: C.text, fontSize: 18, fontWeight: 600 }}>設定</h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: C.textMuted,
              cursor: "pointer",
              fontSize: 20,
              padding: "4px 8px",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h4 style={{ margin: "0 0 8px 0", fontSize: 14, fontWeight: 600, color: C.text }}>
            データのエクスポート / インポート
          </h4>
          <p style={{ margin: "0 0 16px 0", fontSize: 13, color: C.textSub, lineHeight: 1.7 }}>
            会話データをJSONファイルとして保存し、別の端末で復元できます。
            端末を変更するときや、バックアップとしてご利用ください。
          </p>

          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <button
              onClick={handleExport}
              style={{
                flex: 1,
                padding: 12,
                background: C.text,
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "inherit",
                transition: "opacity 0.2s",
              }}
            >
              書き出す
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                flex: 1,
                padding: 12,
                background: C.card,
                color: C.text,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "inherit",
                transition: "all 0.2s",
              }}
            >
              読み込む
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
                borderRadius: 8,
                marginBottom: 12,
                background: message.type === "success" ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${message.type === "success" ? "#86efac" : "#fca5a5"}`,
                color: message.type === "success" ? "#166534" : "#991b1b",
                fontSize: 14,
              }}
            >
              {message.text}
            </div>
          )}

          <p style={{
            margin: 0,
            fontSize: 12,
            color: "#d97706",
            lineHeight: 1.6,
            background: "#fffbeb",
            border: "1px solid #fcd34d",
            borderRadius: 6,
            padding: "8px 12px",
          }}>
            読み込みを行うと、この端末の会話データが置き換わります。
            事前に書き出しでバックアップを取ることをお勧めします。
          </p>
        </div>
      </div>
    </div>
  );
}
