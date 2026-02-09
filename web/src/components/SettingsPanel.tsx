import React, { useState } from "react";
import { exportAll, importAll } from "../lib/db";

export function SettingsPanel() {
  const [msg, setMsg] = useState<string>("");

  async function onExport() {
    setMsg("");
    try {
      const data = await exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tenmon_ark_export_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg("Exportしました。");
    } catch (e: any) {
      setMsg(`Export失敗: ${e?.message ?? String(e)}`);
    }
  }

  async function onImportFile(file: File | null) {
    if (!file) return;
    setMsg("");
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await importAll(json);
      setMsg("Importしました。リロードします…");
      setTimeout(() => location.reload(), 100);
setMsg("Importしました。リロードしても保持されます。");
    } catch (e: any) {
      setMsg(`Import失敗: ${e?.message ?? String(e)}`);
    }
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <div style={{ fontWeight: 700 }}>Settings</div>

      <button onClick={onExport}>Export JSON</button>

      <label style={{ display: "grid", gap: 6 }}>
        <div>Import JSON</div>
        <input type="file" accept="application/json" onChange={(e) => onImportFile(e.target.files?.[0] ?? null)} />
      </label>

      {msg ? <div style={{ whiteSpace: "pre-wrap" }}>{msg}</div> : null}

      <div style={{ fontSize: 12, opacity: 0.8 }}>
        ※ P1は threads/messages のみ。Seed圧縮はP2で追加。
      </div>
    </div>
  );
}
