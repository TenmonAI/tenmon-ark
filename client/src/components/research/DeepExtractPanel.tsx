// 中央ペイン：Deep抽出結果
import { useEffect, useState } from "react";
import type { Ruleset, Rule } from "@/types/research";

type Props = {
  fileId: string | null;
  onRuleSelect?: (rule: Rule, index: number) => void;
};

export default function DeepExtractPanel({ fileId, onRuleSelect }: Props) {
  const [ruleset, setRuleset] = useState<Ruleset | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRuleIndex, setSelectedRuleIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!fileId) {
      setRuleset(null);
      setSelectedRuleIndex(null);
      return;
    }

    async function loadDeepExtract() {
      setLoading(true);
      try {
        const res = await fetch("/api/research/analyze-deep", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: fileId }),
        });

        const data = await res.json();
        if (data.ok && data.ruleset) {
          setRuleset(data.ruleset);
        }
      } catch (e) {
        console.error("[DeepExtractPanel] loadDeepExtract error", e);
      } finally {
        setLoading(false);
      }
    }

    loadDeepExtract();
  }, [fileId]);

  function handleRuleClick(rule: Rule, index: number) {
    setSelectedRuleIndex(index);
    onRuleSelect?.(rule, index);
  }

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
        <div className="text-sm text-gray-500">深層解析中...</div>
      </div>
    );
  }

  if (!ruleset || ruleset.rules.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">
          {ruleset?.emptyReason || "ルールが抽出されていません"}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* ヘッダー */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">深層抽出結果</h2>
          <div className="text-xs text-gray-500">
            {ruleset.rules.length} ルール
            {ruleset.version === "R2" && ruleset.chunks && ` (${ruleset.chunks} チャンク)`}
          </div>
        </div>
      </div>

      {/* ルール一覧 */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {ruleset.rules.map((rule, idx) => (
          <button
            key={idx}
            onClick={() => handleRuleClick(rule, idx)}
            className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
              selectedRuleIndex === idx ? "bg-blue-50 border-l-2 border-blue-500" : ""
            }`}
          >
            <div className="text-sm font-medium text-gray-900">{rule.title}</div>
            <div className="mt-1 text-xs text-gray-700">{rule.rule}</div>
            {rule.evidence && (
              <div className="mt-2 text-xs text-gray-500 italic line-clamp-2">{rule.evidence}</div>
            )}
            {rule.note && (
              <div className="mt-1 text-xs text-gray-400">注: {rule.note}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}


