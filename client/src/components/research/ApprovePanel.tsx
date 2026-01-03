// 右ペイン：承認パネル
import { useState } from "react";
import type { Rule } from "@/types/research";

type Props = {
  fileId: string | null;
  selectedRule: Rule | null;
  selectedRuleIndex: number | null;
};

export default function ApprovePanel({ fileId, selectedRule, selectedRuleIndex }: Props) {
  const [approved, setApproved] = useState<Set<number>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string>("");

  async function handleApprove() {
    if (!fileId || selectedRuleIndex === null) return;

    setProcessing(true);
    setMessage("");

    try {
      const res = await fetch("/api/research/approve-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: fileId,
          ruleIds: [selectedRuleIndex],
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setApproved((prev) => new Set([...prev, selectedRuleIndex]));
        setMessage(`承認完了: ${data.approved || 0}件追加 (${data.total || 0}件合計)`);
      } else {
        setMessage(`エラー: ${data.error || "unknown"}`);
      }
    } catch (e: any) {
      setMessage(`エラー: ${e?.message || "unknown"}`);
    } finally {
      setProcessing(false);
    }
  }

  if (!fileId || !selectedRule) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">中央からルールを選択してください</div>
      </div>
    );
  }

  const isApproved = selectedRuleIndex !== null && approved.has(selectedRuleIndex);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* ヘッダー */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900">承認</h2>
      </div>

      {/* ルール詳細 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">タイトル</div>
          <div className="text-sm text-gray-900">{selectedRule.title}</div>
        </div>

        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">ルール</div>
          <div className="text-sm text-gray-900">{selectedRule.rule}</div>
        </div>

        {selectedRule.evidence && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">根拠</div>
            <div className="text-xs text-gray-700 bg-gray-50 rounded p-2 italic">
              {selectedRule.evidence}
            </div>
          </div>
        )}

        {selectedRule.note && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">注記</div>
            <div className="text-xs text-gray-600">{selectedRule.note}</div>
          </div>
        )}

        {message && (
          <div className={`text-xs p-2 rounded ${message.includes("エラー") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
            {message}
          </div>
        )}
      </div>

      {/* アクション */}
      <div className="px-4 py-3 border-t border-gray-200">
        <button
          onClick={handleApprove}
          disabled={processing || isApproved}
          className={`w-full px-4 py-2 text-sm font-medium rounded-md ${
            isApproved
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : processing
              ? "bg-blue-200 text-blue-700 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {isApproved ? "承認済み" : processing ? "処理中..." : "承認して固定ルールに追加"}
        </button>
      </div>
    </div>
  );
}

