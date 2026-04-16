/**
 * ============================================================
 *  SETTINGS PANEL — データのエクスポート/インポート
 *  TENMON_MANUS_FINAL_COMPLETION_V3
 *  インライン表示対応（SettingsModal内で使用）
 * ============================================================
 */
import React, { useRef, useState } from "react";
import { exportForDownload, importOverwrite, syncIdbToLocalStorageAfterImportV1 } from "../lib/exportImport";
import { TENMON_THREAD_SWITCH_EVENT } from "../hooks/useChat";
import { syncPushAllExistingData } from "../lib/crossDeviceSync";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

const OWNER_EMAIL = "kouyoo4444@gmail.com";

export function SettingsPanel({ open, onClose, onImported }: SettingsPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteExpiry, setInviteExpiry] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  const isOwner = (() => {
    try {
      return localStorage.getItem("tenmon_user_display_v1") === OWNER_EMAIL;
    } catch { return false; }
  })();

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
    <div>
      <div className="gpt-page-card">
        <h3 className="gpt-page-card-title">データのエクスポート / インポート</h3>
        <p style={{
          margin: "4px 0 16px",
          fontSize: 13,
          color: "var(--gpt-text-secondary, #6b7280)",
          lineHeight: 1.7,
        }}>
          会話データ・宿曜鑑定結果・フォルダー構成をまとめてJSONファイルとして保存し、
          別の端末で復元できます。端末を変更するときや、バックアップとしてご利用ください。
        </p>

        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <button
            onClick={handleExport}
            style={{
              flex: 1,
              padding: 12,
              background: "var(--text, #1f2937)",
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
              background: "var(--card, #ffffff)",
              color: "var(--text, #1f2937)",
              border: "1px solid var(--border, #e5e7eb)",
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
          読み込みを行うと、この端末の会話データ・鑑定結果・フォルダー構成がすべて置き換わります。
          事前に書き出しでバックアップを取ることをお勧めします。
        </p>
      </div>

      {/* OWNER_INVITE_UI_V1: オーナー専用 招待リンク発行 */}
      {isOwner && (
        <div className="gpt-page-card" style={{ marginTop: 16 }}>
          <h3 className="gpt-page-card-title">招待リンク発行</h3>
          <p style={{
            margin: "4px 0 16px",
            fontSize: 13,
            color: "var(--gpt-text-secondary, #6b7280)",
            lineHeight: 1.7,
          }}>
            TENMON-ARKへの招待リンクを生成します。リンクは7日間有効です。
          </p>

          <button
            onClick={async () => {
              setInviteLoading(true);
              setInviteCopied(false);
              try {
                const res = await fetch("/api/auth/invite/generate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ note: "オーナー招待" }),
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                const url = data.inviteUrl || data.url || "";
                setInviteUrl(url);
                const expDate = new Date();
                expDate.setDate(expDate.getDate() + 7);
                setInviteExpiry(expDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" }));
                if (url && navigator.clipboard) {
                  await navigator.clipboard.writeText(url);
                  setInviteCopied(true);
                  setTimeout(() => setInviteCopied(false), 2000);
                }
              } catch (err) {
                console.error("Invite generation failed:", err);
                setInviteUrl(null);
                setInviteExpiry(null);
                setMessage({ type: "error", text: "招待リンクの生成に失敗しました" });
                setTimeout(() => setMessage(null), 3000);
              } finally {
                setInviteLoading(false);
              }
            }}
            disabled={inviteLoading}
            style={{
              width: "100%",
              padding: 12,
              background: inviteLoading ? "#9ca3af" : "#1a1a1a",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              cursor: inviteLoading ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "inherit",
              transition: "all 0.2s",
            }}
          >
            {inviteLoading ? "生成中…" : "招待リンクを生成する"}
          </button>

          {inviteUrl && (
            <div style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 8,
              background: "#f9fafb",
              border: "1px solid var(--border, #e5e7eb)",
            }}>
              <p style={{ margin: "0 0 6px", fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
                生成されたURL:
              </p>
              <p style={{
                margin: "0 0 8px",
                fontSize: 12.5,
                color: "var(--text, #1f2937)",
                wordBreak: "break-all",
                lineHeight: 1.6,
                fontFamily: "monospace",
              }}>
                {inviteUrl}
              </p>
              {inviteExpiry && (
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "#6b7280" }}>
                  有効期限: {inviteExpiry}まで
                </p>
              )}
              <button
                onClick={async () => {
                  if (inviteUrl && navigator.clipboard) {
                    await navigator.clipboard.writeText(inviteUrl);
                    setInviteCopied(true);
                    setTimeout(() => setInviteCopied(false), 2000);
                  }
                }}
                style={{
                  padding: "6px 14px",
                  background: inviteCopied ? "#166534" : "var(--text, #1f2937)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: "inherit",
                  transition: "all 0.2s",
                }}
              >
                {inviteCopied ? "コピーしました \u2713" : "URLをコピー"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* SYNC_PHASE_A_FRONTEND_CONNECT_V1: クロスデバイス同期セクション */}
      <div className="gpt-page-card" style={{ marginTop: 16 }}>
        <h3 className="gpt-page-card-title">クロスデバイス同期</h3>
        <p style={{
          margin: "4px 0 16px",
          fontSize: 13,
          color: "var(--gpt-text-secondary, #6b7280)",
          lineHeight: 1.7,
        }}>
          この端末にある会話・フォルダー・宿曜鑑定結果をサーバーに送信し、
          他の端末（PC↔スマホ）と共有します。新規作成分は自動同期されますが、
          既存データをまとめて送る場合はこちらをお使いください。
        </p>

        <button
          onClick={async () => {
            setSyncing(true);
            setMessage(null);
            try {
              const result = await syncPushAllExistingData();
              const total = result.threads + result.folders + result.rooms;
              setMessage({
                type: "success",
                text: `同期完了: 会話 ${result.threads}件・フォルダー ${result.folders}件・宿曜鑑定 ${result.rooms}件を送信しました`,
              });
              setTimeout(() => setMessage(null), 5000);
            } catch (err) {
              console.error("Bulk sync failed:", err);
              setMessage({ type: "error", text: "同期に失敗しました。ネットワークを確認してください" });
              setTimeout(() => setMessage(null), 5000);
            } finally {
              setSyncing(false);
            }
          }}
          disabled={syncing}
          style={{
            width: "100%",
            padding: 12,
            background: syncing ? "#9ca3af" : "var(--ark-gold, #c9a14a)",
            color: "#ffffff",
            border: "none",
            borderRadius: 8,
            cursor: syncing ? "not-allowed" : "pointer",
            fontSize: 14,
            fontWeight: 500,
            fontFamily: "inherit",
            transition: "all 0.2s",
          }}
        >
          {syncing ? "同期中…" : "この端末のデータを他の端末と共有"}
        </button>
      </div>
    </div>
  );
}
