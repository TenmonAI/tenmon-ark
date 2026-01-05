import { useState, useEffect } from "react";

type FileInfo = {
  id: string;
  name: string;
  size: number;
  createdAt: string;
};

type Settings = {
  name: string;
  description: string;
  instructions: string;
  files: FileInfo[];
};

type Props = {
  onBack: () => void;
};

export default function SettingsPage({ onBack }: Props) {
  const [settings, setSettings] = useState<Settings>({
    name: "TENMON-ARK",
    description: "",
    instructions: "",
    files: [],
  });
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isLoading, setIsLoading] = useState(false);

  // 設定を取得
  useEffect(() => {
    loadSettings();
    loadFiles();
  }, []);

  async function loadSettings() {
    // まず localStorage から読み込む
    try {
      const cached = localStorage.getItem("tenmon_settings");
      if (cached) {
        const data = JSON.parse(cached);
        setSettings((prev) => ({ ...prev, ...data }));
      }
    } catch (err: any) {
      console.error("Failed to load from localStorage:", err);
    }

    // その後 API を呼んで上書き更新
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({ ...prev, ...data }));
        // API から取得したデータを localStorage にも保存
        localStorage.setItem("tenmon_settings", JSON.stringify({
          name: data.name,
          description: data.description,
          instructions: data.instructions,
        }));
      }
    } catch (err: any) {
      console.error("Failed to load settings:", err);
    }
  }

  async function loadFiles() {
    try {
      const res = await fetch("/api/knowledge/list");
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({ ...prev, files: data.files || [] }));
      }
    } catch (err: any) {
      console.error("Failed to load files:", err);
    }
  }

  async function saveSettings() {
    setIsLoading(true);
    try {
      const data = {
        name: settings.name,
        description: settings.description,
        instructions: settings.instructions,
      };

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        // localStorage に保存
        localStorage.setItem("tenmon_settings", JSON.stringify(data));
        alert("設定を保存しました");
      } else {
        alert("設定の保存に失敗しました");
      }
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      alert("設定の保存に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFileUpload(files: FileList) {
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });

    try {
      const res = await fetch("/api/knowledge/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({
          ...prev,
          files: [...prev.files, ...(data.files || [])],
        }));
        setUploadProgress({});
      } else {
        alert("ファイルのアップロードに失敗しました");
      }
    } catch (err: any) {
      console.error("Failed to upload files:", err);
      alert("ファイルのアップロードに失敗しました");
    }
  }

  async function handleDeleteFile(id: string) {
    if (!confirm("このファイルを削除しますか？")) return;

    try {
      const res = await fetch(`/api/knowledge/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSettings((prev) => ({
          ...prev,
          files: prev.files.filter((f) => f.id !== id),
        }));
      } else {
        alert("ファイルの削除に失敗しました");
      }
    } catch (err: any) {
      console.error("Failed to delete file:", err);
      alert("ファイルの削除に失敗しました");
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files);
    }
  }

  const totalSize = settings.files.reduce((sum, f) => sum + f.size, 0);
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: "24px" }}>
        <button
          onClick={onBack}
          style={{
            marginBottom: "16px",
            padding: "8px 16px",
            fontSize: "14px",
            color: "#6b7280",
            backgroundColor: "transparent",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          ← チャットに戻る
        </button>
        <h1 style={{ fontSize: "20px", fontWeight: "600", color: "#111827", margin: 0 }}>
          カスタム天聞アーク
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "8px" }}>
          天聞アークの設定と知識ベースを管理します
        </p>
      </div>

      {/* セクションA: 名称 */}
      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px" }}>
          名称
        </label>
        <input
          type="text"
          value={settings.name}
          onChange={(e) => setSettings({ ...settings, name: e.target.value })}
          style={{
            width: "100%",
            padding: "8px 12px",
            fontSize: "14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
          }}
          placeholder="TENMON-ARK"
        />
      </div>

      {/* セクションB: 説明 */}
      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px" }}>
          説明
        </label>
        <textarea
          value={settings.description}
          onChange={(e) => setSettings({ ...settings, description: e.target.value })}
          rows={3}
          style={{
            width: "100%",
            padding: "8px 12px",
            fontSize: "14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            resize: "vertical",
          }}
          placeholder="この天聞アークの説明を入力してください"
        />
      </div>

      {/* セクションC: Instructions */}
      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px" }}>
          Instructions（追加指示）
        </label>
        <textarea
          value={settings.instructions}
          onChange={(e) => setSettings({ ...settings, instructions: e.target.value })}
          rows={8}
          style={{
            width: "100%",
            padding: "8px 12px",
            fontSize: "14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            resize: "vertical",
            fontFamily: "monospace",
          }}
          placeholder="天聞アークへの追加指示を入力してください"
        />
      </div>

      {/* セクションD: Knowledge（資料アップロード） */}
      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px" }}>
          Knowledge（資料）
        </label>

        {/* ドラッグ&ドロップエリア */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${isDragging ? "#3b82f6" : "#d1d5db"}`,
            borderRadius: "8px",
            padding: "32px",
            textAlign: "center",
            backgroundColor: isDragging ? "#eff6ff" : "#f9fafb",
            marginBottom: "16px",
            cursor: "pointer",
          }}
        >
          <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 8px 0" }}>
            ファイルをここにドラッグ&ドロップ
          </p>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 16px 0" }}>または</p>
          <input
            type="file"
            multiple
            accept=".txt,.md,.json"
            onChange={handleFileSelect}
            style={{ display: "none" }}
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            style={{
              display: "inline-block",
              padding: "8px 16px",
              fontSize: "14px",
              color: "#ffffff",
              backgroundColor: "#3b82f6",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            ファイルを選択
          </label>
        </div>

        {/* アップロード状況 */}
        {settings.files.length > 0 && (
          <div style={{ marginBottom: "16px", fontSize: "12px", color: "#6b7280" }}>
            アップロード済み: {settings.files.length} 件 / 合計サイズ: {formatSize(totalSize)}
          </div>
        )}

        {/* 既存ファイル一覧 */}
        {settings.files.length > 0 && (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", overflow: "hidden" }}>
            {settings.files.map((file) => (
              <div
                key={file.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", color: "#111827", marginBottom: "4px" }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    {formatSize(file.size)} / {new Date(file.createdAt).toLocaleDateString("ja-JP")}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteFile(file.id)}
                  style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                    color: "#dc2626",
                    backgroundColor: "transparent",
                    border: "1px solid #dc2626",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 保存ボタン */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
        <button
          onClick={onBack}
          style={{
            padding: "10px 20px",
            fontSize: "14px",
            color: "#374151",
            backgroundColor: "transparent",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          キャンセル
        </button>
        <button
          onClick={saveSettings}
          disabled={isLoading}
          style={{
            padding: "10px 20px",
            fontSize: "14px",
            color: "#ffffff",
            backgroundColor: isLoading ? "#9ca3af" : "#3b82f6",
            border: "none",
            borderRadius: "6px",
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
        >
          {isLoading ? "保存中..." : "保存"}
        </button>
      </div>
    </div>
  );
}

