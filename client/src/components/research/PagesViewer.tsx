// 中央ペイン：Pages表示
import { useEffect, useState } from "react";
import type { PagesManifest, PageInfo } from "@/types/research";

type Props = {
  fileId: string | null;
};

export default function PagesViewer({ fileId }: Props) {
  const [manifest, setManifest] = useState<PagesManifest | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [pageText, setPageText] = useState<string>("");

  useEffect(() => {
    if (!fileId) {
      setManifest(null);
      setSelectedPage(null);
      setPageText("");
      return;
    }

    async function loadManifest() {
      setLoading(true);
      try {
        // build-pages を実行して manifest を取得
        const res = await fetch("/api/research/build-pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: fileId }),
        });

        const data = await res.json();
        if (data.ok && data.manifest) {
          setManifest(data.manifest);
          if (data.manifest.pages.length > 0) {
            setSelectedPage(1);
          }
        }
      } catch (e) {
        console.error("[PagesViewer] loadManifest error", e);
      } finally {
        setLoading(false);
      }
    }

    loadManifest();
  }, [fileId]);

  useEffect(() => {
    if (!manifest || !selectedPage || !fileId) {
      setPageText("");
      return;
    }

    const page = manifest.pages.find((p) => p.page === selectedPage);
    if (!page || !page.hasText) {
      setPageText("");
      return;
    }

    // ページテキストをAPI経由で取得
    async function loadPageText() {
      try {
        const res = await fetch(`/api/research/pages/${fileId}/text/${selectedPage}`);
        const data = await res.json();
        if (data.ok && data.text) {
          setPageText(data.text);
        } else {
          // フォールバック: manifest の textPreview を使用
          setPageText(page.textPreview || "");
        }
      } catch (e) {
        console.error("[PagesViewer] loadPageText error", e);
        // フォールバック: manifest の textPreview を使用
        setPageText(page.textPreview || "");
      }
    }

    loadPageText();
  }, [manifest, selectedPage, fileId]);

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

  if (!manifest || manifest.pages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">ページが生成されていません</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* ヘッダー */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">ページ表示</h2>
        <div className="text-xs text-gray-500">
          {manifest.pageCount} ページ中 {selectedPage || 0}
        </div>
      </div>

      {/* ページナビゲーション */}
      <div className="px-4 py-2 border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-1">
          {manifest.pages.map((p) => (
            <button
              key={p.page}
              onClick={() => setSelectedPage(p.page)}
              className={`px-2 py-1 text-xs rounded border ${
                selectedPage === p.page
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {p.page}
            </button>
          ))}
        </div>
      </div>

      {/* ページコンテンツ */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedPage && (
          <div className="space-y-4">
            {/* ページ画像（存在する場合） */}
            {manifest.pages.find((p) => p.page === selectedPage)?.hasImage && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <img
                  src={`/api/research/pages/${fileId}/image/${selectedPage}`}
                  alt={`Page ${selectedPage}`}
                  className="w-full h-auto"
                />
              </div>
            )}

            {/* ページテキスト */}
            {pageText && (
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-sm text-gray-900 whitespace-pre-wrap font-mono">{pageText}</pre>
              </div>
            )}

            {!pageText && (
              <div className="text-sm text-gray-500 text-center py-8">このページにテキストがありません</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

