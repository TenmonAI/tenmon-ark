// 研究開発ダッシュボード（GPT Builder風3ペイン構成）
import { useState } from "react";
import ResearchNavPanel from "@/components/research/ResearchNavPanel";
import PagesViewer from "@/components/research/PagesViewer";
import DeepExtractPanel from "@/components/research/DeepExtractPanel";
import ApprovePanel from "@/components/research/ApprovePanel";
import PreviewPanel from "@/components/research/PreviewPanel";
import type { Rule } from "@/types/research";

type ViewMode = "pages" | "deep";

export default function ResearchBuilderPage() {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("pages");
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [selectedRuleIndex, setSelectedRuleIndex] = useState<number | null>(null);
  const [rightPanelMode, setRightPanelMode] = useState<"preview" | "approve">("preview");

  async function handleUpload(files: FileList) {
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("files", f));

    const res = await fetch("/api/research/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!data.ok) {
      throw new Error(data.error || "upload failed");
    }
  }

  function handleSelectFile(id: string) {
    setSelectedFileId(id);
    setSelectedRule(null);
    setSelectedRuleIndex(null);
  }

  function handleRuleSelect(rule: Rule, index: number) {
    setSelectedRule(rule);
    setSelectedRuleIndex(index);
    setRightPanelMode("approve");
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* ヘッダー */}
      <header className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">研究開発ダッシュボード</h1>
            <p className="text-xs text-gray-500 mt-1">資料解析・ルール抽出・承認</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRightPanelMode("preview")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                rightPanelMode === "preview"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              プレビュー
            </button>
            <button
              onClick={() => setRightPanelMode("approve")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                rightPanelMode === "approve"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              承認
            </button>
          </div>
        </div>
      </header>

      {/* メインエリア（3ペイン） */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左ペイン：資料ナビ */}
        <div className="w-64 flex-shrink-0">
          <ResearchNavPanel
            selectedFileId={selectedFileId}
            onSelectFile={handleSelectFile}
            onUpload={handleUpload}
          />
        </div>

        {/* 中央ペイン：Pages / Deep抽出 */}
        <div className="flex-1 flex flex-col border-x border-gray-200">
          {/* タブ切り替え */}
          <div className="px-4 py-2 border-b border-gray-200 bg-white flex gap-2">
            <button
              onClick={() => setViewMode("pages")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                viewMode === "pages"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              ページ表示
            </button>
            <button
              onClick={() => setViewMode("deep")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                viewMode === "deep"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              深層抽出
            </button>
          </div>

          {/* コンテンツ */}
          <div className="flex-1 overflow-hidden">
            {viewMode === "pages" ? (
              <PagesViewer fileId={selectedFileId} />
            ) : (
              <DeepExtractPanel fileId={selectedFileId} onRuleSelect={handleRuleSelect} />
            )}
          </div>
        </div>

        {/* 右ペイン：プレビュー / 承認 */}
        <div className="w-80 flex-shrink-0">
          {rightPanelMode === "preview" ? (
            <PreviewPanel fileId={selectedFileId} />
          ) : (
            <ApprovePanel
              fileId={selectedFileId}
              selectedRule={selectedRule}
              selectedRuleIndex={selectedRuleIndex}
            />
          )}
        </div>
      </div>
    </div>
  );
}

