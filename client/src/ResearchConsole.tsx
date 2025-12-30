import { useEffect, useMemo, useState } from "react";

type StoredFile = {
  id: string;
  originalName: string;
  storedName: string;
  mime: string;
  size: number;
  sha256: string;
  uploadedAt: string;
  extractedAt?: string;
  analyzedAt?: string;
};

type UploadRes = { ok: boolean; files?: StoredFile[]; error?: string };
type FilesRes = { ok: boolean; files?: StoredFile[]; error?: string };
type ExtractRes = { ok: boolean; id?: string; preview?: string; error?: string };
type AnalyzeRes = { ok: boolean; id?: string; ruleset?: any; error?: string };
type RulesRes = { ok: boolean; ruleset?: any; error?: string };

function bytes(n: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let x = n;
  let i = 0;
  while (x >= 1024 && i < units.length - 1) {
    x /= 1024;
    i++;
  }
  return `${x.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

async function safeJson(res: Response) {
  const raw = await res.text();
  try {
    return { ok: true, json: JSON.parse(raw), raw };
  } catch {
    return { ok: false, json: null, raw };
  }
}

export default function ResearchConsole() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [selected, setSelected] = useState<FileList | null>(null);
  const [busy, setBusy] = useState<string>(""); // "upload" | "extract:<id>" | "analyze:<id>" | "rules:<id>"
  const [msg, setMsg] = useState<string>("");
  const [preview, setPreview] = useState<Record<string, string>>({});
  const [rules, setRules] = useState<Record<string, any>>({});

  const canUpload = useMemo(() => !!selected && selected.length > 0, [selected]);

  async function refresh() {
    setMsg("");
    const res = await fetch("/api/research/files");
    const parsed = await safeJson(res);
    if (!parsed.ok) {
      setMsg("❌ files: JSON parse error");
      return;
    }
    const data = parsed.json as FilesRes;
    if (!data.ok) {
      setMsg(`❌ files: ${data.error ?? "unknown"}`);
      return;
    }
    setFiles(data.files ?? []);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function upload() {
    if (!selected || selected.length === 0) return;
    setBusy("upload");
    setMsg("");
    try {
      const fd = new FormData();
      Array.from(selected).forEach((f) => fd.append("files", f));

      const res = await fetch("/api/research/upload", { method: "POST", body: fd });
      const parsed = await safeJson(res);

      if (!parsed.ok) throw new Error("upload: JSON parse error");
      const data = parsed.json as UploadRes;
      if (!data.ok) throw new Error(data.error ?? "upload failed");

      setSelected(null);
      await refresh();
      setMsg(`✅ upload ok: ${data.files?.length ?? 0} files`);
    } catch (e: any) {
      setMsg(`❌ upload error: ${e?.message ?? e}`);
    } finally {
      setBusy("");
    }
  }

  async function extract(id: string) {
    setBusy(`extract:${id}`);
    setMsg("");
    try {
      const res = await fetch("/api/research/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const parsed = await safeJson(res);
      if (!parsed.ok) throw new Error("extract: JSON parse error");
      const data = parsed.json as ExtractRes;
      if (!data.ok) throw new Error(data.error ?? "extract failed");

      setPreview((p) => ({ ...p, [id]: data.preview ?? "" }));
      await refresh();
      setMsg(`✅ extract ok: ${id}`);
    } catch (e: any) {
      setMsg(`❌ extract error: ${e?.message ?? e}`);
    } finally {
      setBusy("");
    }
  }

  async function analyze(id: string) {
    setBusy(`analyze:${id}`);
    setMsg("");
    try {
      const res = await fetch("/api/research/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const parsed = await safeJson(res);
      if (!parsed.ok) throw new Error("analyze: JSON parse error");
      const data = parsed.json as AnalyzeRes;
      if (!data.ok) throw new Error(data.error ?? "analyze failed");

      setRules((r) => ({ ...r, [id]: data.ruleset ?? null }));
      await refresh();
      setMsg(`✅ analyze ok: ${id}`);
    } catch (e: any) {
      setMsg(`❌ analyze error: ${e?.message ?? e}`);
    } finally {
      setBusy("");
    }
  }

  async function fetchRules(id: string) {
    setBusy(`rules:${id}`);
    setMsg("");
    try {
      const res = await fetch(`/api/research/rules/${id}`);
      const parsed = await safeJson(res);
      if (!parsed.ok) throw new Error("rules: JSON parse error");
      const data = parsed.json as RulesRes;
      if (!data.ok) throw new Error(data.error ?? "rules not found");

      setRules((r) => ({ ...r, [id]: data.ruleset ?? null }));
      setMsg(`✅ rules loaded: ${id}`);
    } catch (e: any) {
      setMsg(`❌ rules error: ${e?.message ?? e}`);
    } finally {
      setBusy("");
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: "0 0 8px 0" }}>Research Console</h2>
      <div style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
        ここで資料（PDF/TXT等）をアップロード → 抽出（Extract） → 法則抽出（Analyze）できます。
        <br />
        ※ R1は「保存＋抽出＋法則JSON化」まで。会話への自動反映（学習）は次フェーズで統合します。
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <input
          type="file"
          multiple
          onChange={(e) => setSelected(e.target.files)}
          disabled={busy === "upload"}
        />
        <button
          onClick={upload}
          disabled={!canUpload || busy !== ""}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: canUpload ? "rgba(31,58,138,0.08)" : "#fff",
            fontWeight: 800,
            cursor: !canUpload || busy !== "" ? "not-allowed" : "pointer",
          }}
        >
          {busy === "upload" ? "Uploading..." : "Upload"}
        </button>

        <button
          onClick={refresh}
          disabled={busy !== ""}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: "#fff",
            fontWeight: 800,
            cursor: busy !== "" ? "not-allowed" : "pointer",
          }}
        >
          Reload
        </button>
      </div>

      {msg && (
        <div
          style={{
            whiteSpace: "pre-wrap",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 10,
            background: "#fff",
            marginBottom: 10,
          }}
        >
          {msg}
        </div>
      )}

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          background: "rgba(255,255,255,0.75)",
          padding: 12,
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Uploaded Files</div>

        {files.length === 0 ? (
          <div style={{ color: "#6b7280" }}>まだファイルはありません。まずUploadしてください。</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {files.map((f) => {
              const bExtract = busy === `extract:${f.id}`;
              const bAnalyze = busy === `analyze:${f.id}`;
              const bRules = busy === `rules:${f.id}`;
              const pv = preview[f.id];
              const rs = rules[f.id];

              return (
                <div
                  key={f.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 14,
                    background: "#fff",
                    padding: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 260 }}>
                      <div style={{ fontWeight: 800 }}>{f.originalName}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                        id: {f.id} / {bytes(f.size)} / {f.mime}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                        uploaded: {f.uploadedAt}
                        {f.extractedAt ? ` / extracted: ${f.extractedAt}` : ""}
                        {f.analyzedAt ? ` / analyzed: ${f.analyzedAt}` : ""}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <button
                        onClick={() => extract(f.id)}
                        disabled={busy !== ""}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          background: "rgba(11,122,117,0.08)",
                          fontWeight: 800,
                          cursor: busy !== "" ? "not-allowed" : "pointer",
                        }}
                      >
                        {bExtract ? "Extract..." : "Extract"}
                      </button>

                      <button
                        onClick={() => analyze(f.id)}
                        disabled={busy !== ""}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          background: "rgba(176,137,47,0.10)",
                          fontWeight: 800,
                          cursor: busy !== "" ? "not-allowed" : "pointer",
                        }}
                      >
                        {bAnalyze ? "Analyze..." : "Analyze"}
                      </button>

                      <button
                        onClick={() => fetchRules(f.id)}
                        disabled={busy !== ""}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          background: "rgba(31,58,138,0.06)",
                          fontWeight: 800,
                          cursor: busy !== "" ? "not-allowed" : "pointer",
                        }}
                      >
                        {bRules ? "Loading..." : "Rules"}
                      </button>
                    </div>
                  </div>

                  {pv ? (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontWeight: 800, marginBottom: 6 }}>Extract Preview</div>
                      <pre
                        style={{
                          whiteSpace: "pre-wrap",
                          background: "#0b1220",
                          color: "#e5e7eb",
                          borderRadius: 12,
                          padding: 10,
                          overflowX: "auto",
                        }}
                      >
                        {pv}
                      </pre>
                    </div>
                  ) : null}

                  {rs ? (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontWeight: 800, marginBottom: 6 }}>Rules JSON</div>
                      <pre
                        style={{
                          whiteSpace: "pre-wrap",
                          background: "#111",
                          color: "#a7f3d0",
                          borderRadius: 12,
                          padding: 10,
                          overflowX: "auto",
                        }}
                      >
                        {JSON.stringify(rs, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

