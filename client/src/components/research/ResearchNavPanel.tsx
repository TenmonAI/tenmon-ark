// 左ペイン：資料・解析ナビゲーション
import { useEffect, useState } from "react";
import type { StoredFile } from "@/types/research";

type Props = {
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
  onUpload: (files: FileList) => Promise<void>;
};

export default function ResearchNavPanel({ selectedFileId, onSelectFile, onUpload }: Props) {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function loadFiles() {
    setLoading(true);
    try {
      const res = await fetch("/api/research/files");
      const data = await res.json();
      if (data.ok && Array.isArray(data.files)) {
        setFiles(data.files);
      }
    } catch (e) {
      console.error("[ResearchNavPanel] loadFiles error", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFiles();
  }, []);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    setUploading(true);
    try {
      await onUpload(selected);
      await loadFiles();
    } catch (e) {
      console.error("[ResearchNavPanel] upload error", e);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString("ja-JP", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  return (
    <div className="h-full flex flex-col border-r border-gray-200 bg-white">
      {/* ヘッダー */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900">資料一覧</h2>
      </div>

      {/* アップロード */}
      <div className="px-4 py-3 border-b border-gray-200">
        <label className="block">
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            accept=".pdf,.txt,.md,.json,.csv"
          />
          <div className="w-full px-3 py-2 text-sm text-center border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer disabled:opacity-50">
            {uploading ? "アップロード中..." : "ファイルを追加"}
          </div>
        </label>
      </div>

      {/* ファイル一覧 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">読み込み中...</div>
        ) : files.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">ファイルがありません</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {files.map((f) => (
              <button
                key={f.id}
                onClick={() => onSelectFile(f.id)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  selectedFileId === f.id ? "bg-blue-50 border-l-2 border-blue-500" : ""
                }`}
              >
                <div className="text-sm font-medium text-gray-900 truncate">{f.originalName}</div>
                <div className="mt-1 text-xs text-gray-500">
                  {formatSize(f.size)} • {formatDate(f.uploadedAt)}
                </div>
                <div className="mt-1 flex gap-2 text-xs text-gray-400">
                  {f.extractedAt && <span>抽出済</span>}
                  {f.analyzedAt && <span>解析済</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

