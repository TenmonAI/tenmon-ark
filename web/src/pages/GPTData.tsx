// カスタムGPTデータ導入ページ（Drag&Drop + アップロード）
import { useState } from "react";

export function GPTData({ id }: { id: string }) {
  const [dragging, setDragging] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    console.log("Dropped files:", files);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files) {
      console.log("Selected files:", Array.from(files));
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-6 py-4 bg-white shadow-sm">
        <div className="text-sm font-medium text-gray-900">データ導入: {id}</div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-8 bg-gray-100">
        <div className="max-w-4xl mx-auto">
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center ${
              dragging ? "border-gray-400 bg-gray-50" : "border-gray-200 bg-white"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="text-sm text-gray-600 mb-4">
              ファイルをドラッグ＆ドロップ
            </div>
            <label className="inline-block px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer text-sm">
              ファイルを選択
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}


