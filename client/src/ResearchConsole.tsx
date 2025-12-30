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
  // サーバ側で保存している場合に表示できる（無ければUI側メモリで補完）
  extractUsed?: string;
};

type UploadRes = { ok: boolean; files?: StoredFile[]; error?: string };
type FilesRes = { ok: boolean; files?: StoredFile[]; error?: string };

type ExtractRes = {
  ok: boolean;
  id?: string;
  preview?: string;
  used?: string; // "ocr" | "pdftotext-raw" | "pdftotext-layout" | "plain"
  error?: string;
};

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

function usedLabel(used?: string) {
  const u = (used ?? "").toLowerCase();
  if (!u) return "未判定";
  if (u.includes("ocr")) return "OCR（画像文字起こし）";
  if (u.includes("layout")) return "pdftotext（layout）";
  if (u.includes("raw")) return "pdftotext（raw）";
  if (u.includes("plain")) return "テキスト（そのまま）";
  return u;
}

async function safeJson(res: Response) {
  const raw = await res.text();
  try {
    return { ok: true as const, json: JSON.parse(raw), raw };
  } catch {
    return { ok: false as const, json: null, raw };
  }
}

export default function ResearchConsole() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [selected, setSelected] = useState<FileList | null>(null);

  const [busy, setBusy] = useState<string>(""); // upload | extract:<id> | ocr:<id> | analyze:<id> | deep:<id> | rules:<id>
  const [msg, setMsg] = useState<string>("");

  const [preview, setPreview] = useState<Record<string, string>>({});
  const [usedMap, setUsedMap] = useState<Record<string, string>>({}); // UI側の抽出方式メモリ（filesに無い場合の補完）

  const [rulesR1, setRulesR1] = useState<Record<string, any>>({});
  const [rulesR2, setRulesR2] = useState<Record<string, any>>({});
  const [openRules, setOpenRules] = useState<Record<string, boolean>>({}); // id -> open

  const canUpload = useMemo(() => !!selected && selected.length > 0, [selected]);

  async function refresh() {
    setMsg("");
    const res = await fetch("/api/research/files");
    const parsed = await safeJson(res);

    if (!parsed.ok) {
      setMsg(`❌ 一覧取得：JSONではありません\n${parsed.raw.slice(0, 600)}`);
      return;
    }
    const data = parsed.json as FilesRes;
    if (!data.ok) {
      setMsg(`❌ 一覧取得：${data.error ?? "unknown"}`);
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

      if (!parsed.ok) throw new Error(`アップロード：JSONではありません\n${parsed.raw.slice(0, 600)}`);
      const data = parsed.json as UploadRes;
      if (!data.ok) throw new Error(data.error ?? "upload failed");

      setSelected(null);
      await refresh();
      setMsg(`✅ アップロード完了：${data.files?.length ?? 0} 件`);
    } catch (e: any) {
      setMsg(`❌ アップロード失敗：${e?.message ?? e}`);
    } finally {
      setBusy("");
    }
  }

  async function extract(id: string, mode: "auto" | "ocr") {
    setBusy(`${mode === "ocr" ? "ocr" : "extract"}:${id}`);
    setMsg("");

    try {
      const res = await fetch("/api/research/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // mode を渡す（APIが未対応でも無視されるだけ）
        body: JSON.stringify({ id, mode }),
      });

      const parsed = await safeJson(res);
      if (!parsed.ok) throw new Error(`抽出：JSONではありません\n${parsed.raw.slice(0, 600)}`);
      const data = parsed.json as ExtractRes;
      if (!data.ok) throw new Error(data.error ?? "extract failed");

      const pv = data.preview ?? "";
      const used = data.used ?? "";

      setPreview((p) => ({ ...p, [id]: pv }));
      if (used) setUsedMap((m) => ({ ...m, [id]: used }));

      await refresh();
      setMsg(`✅ 抽出完了：${id}（${usedLabel(used)}）`);
    } catch (e: any) {
      setMsg(`❌ 抽出失敗：${e?.message ?? e}`);
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
      if (!parsed.ok) throw new Error(`解析：JSONではありません\n${parsed.raw.slice(0, 600)}`);
      const data = parsed.json as AnalyzeRes;
      if (!data.ok) throw new Error(data.error ?? "analyze failed");

      setRulesR1((r) => ({ ...r, [id]: data.ruleset ?? null }));
      setOpenRules((o) => ({ ...o, [id]: true }));

      await refresh();
      setMsg(`✅ 解析（通常）完了：${id}`);
    } catch (e: any) {
      setMsg(`❌ 解析（通常）失敗：${e?.message ?? e}`);
    } finally {
      setBusy("");
    }
  }

  async function analyzeDeep(id: string) {
    setBusy(`deep:${id}`);
    setMsg("");

    try {
      const res = await fetch("/api/research/analyze-deep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const parsed = await safeJson(res);
      if (!parsed.ok) throw new Error(`深層解析：JSONではありません\n${parsed.raw.slice(0, 600)}`);
      const data = parsed.json as AnalyzeRes;
      if (!data.ok) throw new Error(data.error ?? "analyze-deep failed");

      setRulesR2((r) => ({ ...r, [id]: data.ruleset ?? null }));
      setOpenRules((o) => ({ ...o, [id]: true }));

      await refresh();
      setMsg(`✅ 深層解析（全文）完了：${id}`);
    } catch (e: any) {
      setMsg(`❌ 深層解析（全文）失敗：${e?.message ?? e}`);
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

      if (!parsed.ok) throw new Error(`ルール取得：JSONではありません\n${parsed.raw.slice(0, 600)}`);
      const data = parsed.json as RulesRes;
      if (!data.ok) throw new Error(data.error ?? "rules not found");

      // どちらの形式でも表示できるように、入ってきたJSONをそのまま保存
      setRulesR1((r) => ({ ...r, [id]: data.ruleset ?? null }));
      setOpenRules((o) => ({ ...o, [id]: true }));

      setMsg(`✅ ルール読み込み：${id}`);
    } catch (e: any) {
      setMsg(`❌ ルール取得失敗：${e?.message ?? e}`);
    } finally {
      setBusy("");
    }
  }

  function toggleRules(id: string) {
    setOpenRules((o) => ({ ...o, [id]: !o[id] }));
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: "0 0 8px 0" }}>研究コンソール</h2>
      <div style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>
        ここで資料（PDF/TXT等）をアップロード → 抽出（テキスト化） → 解析（法則JSON化）できます。
        <br />
        <b>深層解析（全文）</b>は全ページ相当をチャンク分割して解析します（R2）。
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <input type="file" multiple onChange={(e) => setSelected(e.target.files)} disabled={busy === "upload"} />
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
          {busy === "upload" ? "アップロード中…" : "アップロード"}
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
          再読込
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
        <div style={{ fontWeight: 900, marginBottom: 8 }}>アップロード済み一覧</div>

        {files.length === 0 ? (
          <div style={{ color: "#6b7280" }}>まだファイルはありません。まず「アップロード」を行ってください。</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {files.map((f) => {
              const bExtract = busy === `extract:${f.id}`;
              const bOCR = busy === `ocr:${f.id}`;
              const bAnalyze = busy === `analyze:${f.id}`;
              const bDeep = busy === `deep:${f.id}`;
              const bRules = busy === `rules:${f.id}`;

              const pv = preview[f.id];
              const used = f.extractUsed ?? usedMap[f.id];

              const r2 = rulesR2[f.id];
              const r1 = rulesR1[f.id];

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
                    <div style={{ minWidth: 320 }}>
                      <div style={{ fontWeight: 900, fontSize: 16 }}>{f.originalName}</div>

                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6, lineHeight: 1.7 }}>
                        <div>
                          <b>ID</b>: {f.id}
                        </div>
                        <div>
                          <b>サイズ</b>: {bytes(f.size)} / <b>MIME</b>: {f.mime}
                        </div>
                        <div>
                          <b>アップロード</b>: {f.uploadedAt}
                          {f.extractedAt ? ` / 抽出: ${f.extractedAt}` : ""}
                          {f.analyzedAt ? ` / 解析: ${f.analyzedAt}` : ""}
                        </div>
                        <div>
                          <b>抽出方式</b>: {usedLabel(used)}
                          {used ? `（${used}）` : ""}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <button
                        onClick={() => extract(f.id, "auto")}
                        disabled={busy !== ""}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          background: "rgba(11,122,117,0.08)",
                          fontWeight: 900,
                          cursor: busy !== "" ? "not-allowed" : "pointer",
                        }}
                      >
                        {bExtract ? "抽出中…" : "抽出"}
                      </button>

                      <button
                        onClick={() => extract(f.id, "ocr")}
                        disabled={busy !== ""}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          background: "rgba(31,58,138,0.08)",
                          fontWeight: 900,
                          cursor: busy !== "" ? "not-allowed" : "pointer",
                        }}
                      >
                        {bOCR ? "OCR中…" : "抽出（OCR強制）"}
                      </button>

                      <button
                        onClick={() => analyze(f.id)}
                        disabled={busy !== ""}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          background: "rgba(176,137,47,0.10)",
                          fontWeight: 900,
                          cursor: busy !== "" ? "not-allowed" : "pointer",
                        }}
                      >
                        {bAnalyze ? "解析中…" : "解析（通常）"}
                      </button>

                      <button
                        onClick={() => analyzeDeep(f.id)}
                        disabled={busy !== ""}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          background: "rgba(176,137,47,0.18)",
                          fontWeight: 900,
                          cursor: busy !== "" ? "not-allowed" : "pointer",
                        }}
                        title="全文をチャンク分割して深層抽出します"
                      >
                        {bDeep ? "深層解析中…" : "深層解析（全文）"}
                      </button>

                      <button
                        onClick={() => fetchRules(f.id)}
                        disabled={busy !== ""}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          background: "#fff",
                          fontWeight: 900,
                          cursor: busy !== "" ? "not-allowed" : "pointer",
                        }}
                      >
                        {bRules ? "読み込み中…" : "ルール表示"}
                      </button>

                      <button
                        onClick={() => toggleRules(f.id)}
                        disabled={busy !== ""}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          background: "#fff",
                          fontWeight: 900,
                          cursor: busy !== "" ? "not-allowed" : "pointer",
                        }}
                      >
                        {openRules[f.id] ? "結果を閉じる" : "結果を見る"}
                      </button>
                    </div>
                  </div>

                  {pv ? (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>抽出プレビュー（先頭）</div>
                      <pre
                        style={{
                          whiteSpace: "pre-wrap",
                          background: "#0b1220",
                          color: "#e5e7eb",
                          borderRadius: 12,
                          padding: 10,
                          overflowX: "auto",
                          maxHeight: 260,
                        }}
                      >
                        {pv}
                      </pre>
                    </div>
                  ) : null}

                  {openRules[f.id] ? (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>解析結果</div>

                      {r2 ? (
                        <>
                          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                            表示：<b>深層解析（全文）</b>（R2）
                          </div>
                          <pre
                            style={{
                              whiteSpace: "pre-wrap",
                              background: "#111",
                              color: "#a7f3d0",
                              borderRadius: 12,
                              padding: 10,
                              overflowX: "auto",
                              maxHeight: 420,
                            }}
                          >
                            {JSON.stringify(r2, null, 2)}
                          </pre>
                        </>
                      ) : r1 ? (
                        <>
                          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                            表示：解析（通常）（R1）
                          </div>
                          <pre
                            style={{
                              whiteSpace: "pre-wrap",
                              background: "#111",
                              color: "#a7f3d0",
                              borderRadius: 12,
                              padding: 10,
                              overflowX: "auto",
                              maxHeight: 420,
                            }}
                          >
                            {JSON.stringify(r1, null, 2)}
                          </pre>
                        </>
                      ) : (
                        <div style={{ color: "#6b7280" }}>
                          まだ解析結果がありません。<b>解析（通常）</b>または<b>深層解析（全文）</b>を実行してください。
                        </div>
                      )}
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

