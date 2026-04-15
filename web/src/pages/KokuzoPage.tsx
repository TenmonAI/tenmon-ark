/**
 * ============================================================
 *  KOKŪZŌ — 虚空蔵 知恵の器
 *  TENMON_MANUS_FINAL_ADJUSTMENT_DIRECTIVE_V4
 *  日本語化 + 軽量同期の安心説明 + ライトテーマ対応
 * ============================================================
 */
import { useState, useRef, useEffect } from "react";

type KokuzoFile = {
  id: number;
  filename: string;
  uploaded_at: string;
};

type KokuzoSeed = {
  id: number;
  essence: string;
  created_at: string;
};

/* ── ライトテーマカラー ── */
const C = {
  bg: "#fafaf7",
  card: "#ffffff",
  text: "#1f2937",
  textSub: "#6b7280",
  textMuted: "#9ca3af",
  border: "#e5e7eb",
  arkGold: "#c9a14a",
  arkGoldBg: "rgba(201,161,74,0.08)",
  arkGoldBorder: "rgba(201,161,74,0.25)",
  arkGreen: "#2f6f5e",
  successBg: "#f0fdf4",
  successText: "#166534",
  errorBg: "#fef2f2",
  errorText: "#991b1b",
} as const;

type ToastMsg = { type: "success" | "error" | "info"; text: string } | null;

export function KokuzoPage() {
  const [files, setFiles] = useState<KokuzoFile[]>([]);
  const [seeds, setSeeds] = useState<KokuzoSeed[]>([]);
  const [uploading, setUploading] = useState(false);
  const [indexing, setIndexing] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState<ToastMsg>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const showToast = (msg: ToastMsg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    loadFiles();
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  const loadFiles = async () => {
    try {
      const res = await fetch("/api/kokuzo/files");
      const data = await res.json();
      if (data.success) setFiles(data.files);
    } catch (error) {
      console.error("[KOKUZO] Failed to load files", error);
    }
  };

  const loadSeeds = async (fileId: number) => {
    try {
      const res = await fetch(`/api/kokuzo/seeds?file_id=${fileId}`);
      const data = await res.json();
      if (data.success) setSeeds(data.seeds);
    } catch (error) {
      console.error("[KOKUZO] Failed to load seeds", error);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/kokuzo/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        await loadFiles();
        showToast({ type: "success", text: `「${file.name}」をアップロードしました` });
      } else {
        showToast({ type: "error", text: `アップロードに失敗しました: ${data.error}` });
      }
    } catch (error) {
      console.error("[KOKUZO] Upload error", error);
      showToast({ type: "error", text: "アップロードに失敗しました。接続をご確認ください。" });
    } finally {
      setUploading(false);
    }
  };

  const handleIndex = async (fileId: number) => {
    setIndexing(fileId);
    try {
      const res = await fetch("/api/kokuzo/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: fileId }),
      });
      const data = await res.json();
      if (data.success) {
        await loadSeeds(fileId);
        showToast({ type: "success", text: `${data.chunks}件の知恵の種を抽出しました` });
      } else {
        showToast({ type: "error", text: `解析に失敗しました: ${data.error}` });
      }
    } catch (error) {
      console.error("[KOKUZO] Index error", error);
      showToast({ type: "error", text: "解析に失敗しました。接続をご確認ください。" });
    } finally {
      setIndexing(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  /* ── 共通スタイル ── */
  const sectionCard: React.CSSProperties = {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: "24px",
    marginBottom: 20,
  };

  return (
    <div style={{
      width: "100%",
      height: "100%",
      overflowY: "auto",
      overflowX: "hidden",
      WebkitOverflowScrolling: "touch",
      background: C.bg,
    }}>
      <div style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "28px 20px 60px",
        fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif",
        color: C.text,
      }}>

        {/* ── ヘッダー ── */}
        <h1 style={{
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 1,
          margin: "0 0 8px",
          color: C.text,
        }}>
          虚空蔵（KOKŪZŌ）
        </h1>
        <p style={{
          fontSize: 14,
          color: C.textSub,
          lineHeight: 1.8,
          marginBottom: 24,
        }}>
          天聞アークの「知恵の器」です。書籍や資料をお預けいただくと、
          内容を読み解き、会話の中で活かせる「知恵の種」として保管します。
        </p>

        {/* ── 軽量同期の説明 ── */}
        <div style={{
          ...sectionCard,
          background: C.arkGoldBg,
          border: `1px solid ${C.arkGoldBorder}`,
          padding: "16px 20px",
        }}>
          <div style={{
            fontSize: 13,
            color: C.text,
            lineHeight: 1.8,
          }}>
            <span style={{ fontWeight: 600, color: C.arkGold }}>安心してお使いいただけます</span>
            <span style={{ margin: "0 8px", color: C.textMuted }}>—</span>
            お預けいただいた資料はお使いの端末に安全に保管されます。
            サーバーとの同期は必要最小限にとどめ、
            大切な内容が外部に漏れることのないよう設計しています。
            端末を変えるときは、設定画面からデータを書き出して引き継ぐことができます。
          </div>
        </div>

        {/* ── トースト通知 ── */}
        {toast && (
          <div style={{
            background: toast.type === "success" ? C.successBg
              : toast.type === "error" ? C.errorBg
              : C.arkGoldBg,
            border: `1px solid ${
              toast.type === "success" ? "#86efac"
              : toast.type === "error" ? "#fca5a5"
              : C.arkGoldBorder
            }`,
            borderRadius: 10,
            padding: "12px 16px",
            color: toast.type === "success" ? C.successText
              : toast.type === "error" ? C.errorText
              : C.text,
            fontSize: 14,
            marginBottom: 20,
            lineHeight: 1.6,
            transition: "opacity 0.3s",
          }}>
            {toast.text}
          </div>
        )}

        {/* ── アップロードエリア ── */}
        <div
          style={{
            ...sectionCard,
            border: `2px dashed ${dragActive ? C.arkGold : C.border}`,
            background: dragActive ? C.arkGoldBg : C.card,
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
          <div style={{ fontSize: 32, marginBottom: 8, color: C.textMuted }}>
            📄
          </div>
          <p style={{ fontSize: 14, color: C.textSub, margin: "0 0 4px" }}>
            ここにファイルをドラッグ、またはクリックして選択
          </p>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
            PDF・テキスト・文書ファイルに対応しています
          </p>
          {uploading && (
            <p style={{ fontSize: 13, color: C.arkGold, marginTop: 12, fontWeight: 500 }}>
              アップロード中...
            </p>
          )}
        </div>

        {/* ── ファイル一覧 ── */}
        <div style={sectionCard}>
          <h2 style={{
            fontSize: 16,
            fontWeight: 600,
            margin: "0 0 16px",
            color: C.text,
          }}>
            お預かりしている資料
          </h2>
          {files.length === 0 ? (
            <p style={{ fontSize: 14, color: C.textMuted }}>
              まだ資料がありません。上のエリアからファイルをお預けください。
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {files.map((file) => (
                <div
                  key={file.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    background: C.bg,
                  }}
                >
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: C.text, margin: "0 0 2px" }}>
                      {file.filename}
                    </p>
                    <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
                      {file.uploaded_at}
                    </p>
                  </div>
                  <button
                    style={{
                      padding: "8px 16px",
                      background: indexing === file.id ? C.border : C.text,
                      color: indexing === file.id ? C.textSub : "#ffffff",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: indexing === file.id ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.2s",
                    }}
                    onClick={() => handleIndex(file.id)}
                    disabled={indexing === file.id}
                  >
                    {indexing === file.id ? "解析中..." : "知恵を抽出する"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 知恵の種一覧 ── */}
        {seeds.length > 0 && (
          <div style={sectionCard}>
            <h2 style={{
              fontSize: 16,
              fontWeight: 600,
              margin: "0 0 16px",
              color: C.text,
            }}>
              抽出された知恵の種
            </h2>
            <p style={{
              fontSize: 13,
              color: C.textSub,
              margin: "0 0 16px",
              lineHeight: 1.7,
            }}>
              資料から読み取った要点です。これらは会話の中で、必要に応じて参照されます。
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {seeds.map((seed) => (
                <div
                  key={seed.id}
                  style={{
                    padding: "14px 16px",
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    background: C.bg,
                  }}
                >
                  <p style={{
                    fontSize: 14,
                    color: C.text,
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.7,
                    margin: "0 0 6px",
                  }}>
                    {seed.essence}
                  </p>
                  <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>
                    {seed.created_at}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 補足説明 ── */}
        <div style={{
          fontSize: 12,
          color: C.textMuted,
          lineHeight: 1.8,
          marginTop: 12,
          paddingTop: 16,
          borderTop: `1px solid ${C.border}`,
        }}>
          虚空蔵（KOKŪZŌ）は、天聞アークの記憶と知恵を司る仕組みです。
          お預けいただいた資料は端末内に保管され、会話の文脈に応じて自然に活用されます。
          データの取り扱いについてご不明な点がありましたら、改善要望からお知らせください。
        </div>
      </div>
    </div>
  );
}
