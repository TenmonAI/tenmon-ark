// 右ペイン：思考参照プレビュー
import { useEffect, useState } from "react";
import type { StoredFile } from "@/types/research";

type Props = {
  fileId: string | null;
};

export default function PreviewPanel({ fileId }: Props) {
  const [file, setFile] = useState<StoredFile | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fileId) {
      setFile(null);
      setPreview("");
      return;
    }

    async function loadPreview() {
      setLoading(true);
      try {
        // ファイル情報を取得
        const filesRes = await fetch("/api/research/files");
        const filesData = await filesRes.json();
        if (filesData.ok && Array.isArray(filesData.files)) {
          const found = filesData.files.find((f: StoredFile) => f.id === fileId);
          if (found) {
            setFile(found);
          }
        }

        // 抽出プレビューを取得
        const extractRes = await fetch("/api/research/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: fileId }),
        });

        const extractData = await extractRes.json();
        if (extractData.ok && extractData.preview) {
          setPreview(extractData.preview);
        }
      } catch (e) {
        console.error("[PreviewPanel] loadPreview error", e);
      } finally {
        setLoading(false);
      }
    }

    loadPreview();
  }, [fileId]);

  if (!fileId) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">左側から資料を選択してください</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">読み込み中...</div>
      </div>
    );
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* ヘッダー */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900">プレビュー</h2>
      </div>

      {/* ファイル情報 */}
      {file && (
        <div className="px-4 py-3 border-b border-gray-200 space-y-2">
          <div>
            <div className="text-xs font-medium text-gray-500">ファイル名</div>
            <div className="text-sm text-gray-900 truncate">{file.originalName}</div>
          </div>
          <div className="flex gap-4 text-xs text-gray-500">
            <span>{formatSize(file.size)}</span>
            <span>{file.mime}</span>
          </div>
          {file.extractedAt && (
            <div className="text-xs text-gray-500">
              抽出: {new Date(file.extractedAt).toLocaleString("ja-JP")}
            </div>
          )}
        </div>
      )}

      {/* プレビュー */}
      <div className="flex-1 overflow-y-auto p-4">
        {preview ? (
          <pre className="text-xs text-gray-900 whitespace-pre-wrap font-mono bg-gray-50 rounded p-3">
            {preview}
          </pre>
        ) : (
          <div className="text-sm text-gray-500 text-center py-8">プレビューがありません</div>
        )}
      </div>
    </div>
  );
}


