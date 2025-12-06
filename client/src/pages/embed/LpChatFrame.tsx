import { useState } from "react";
import { trpc } from "@/lib/trpc";

/**
 * LP用チャットフレーム（超シンプル版）
 * 
 * 設計方針:
 * - IMEガード一切なし
 * - Textarea → Enterで送信、Shift+Enterで改行
 * - バグる余地を限界まで減らす
 */
export default function LpChatFrame() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const chatMutation = trpc.lpQaSimple.chat.useMutation({
    onSuccess: (data) => {
      setAnswer(data.answer ?? "");
    },
    onError: (error) => {
      setAnswer(`エラーが発生しました: ${error.message}`);
    },
  });

  const handleSend = () => {
    if (!question.trim() || chatMutation.isPending) return;
    setAnswer(""); // 前の回答をクリア
    chatMutation.mutate({ question });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0b1120] text-slate-50">
      {/* 回答表示エリア */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMutation.isPending && (
          <div className="rounded-lg bg-slate-800 p-4 text-sm text-slate-400 animate-pulse">
            回答を生成中...
          </div>
        )}
        {answer && (
          <div className="rounded-lg bg-slate-800 p-4 text-sm whitespace-pre-wrap leading-relaxed">
            {answer}
          </div>
        )}
        {chatMutation.isError && (
          <div className="rounded-lg bg-red-900/60 border border-red-500 p-3 text-xs">
            {chatMutation.error.message}
          </div>
        )}
      </div>

      {/* 入力エリア */}
      <div className="border-t border-slate-700 p-3 bg-[#0b1120]">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          className="w-full resize-none rounded-md bg-slate-900 border border-slate-700 p-3 text-sm outline-none focus:border-amber-400 transition-colors"
          placeholder="TENMON-ARK について質問を入力してください（Enterで送信、Shift+Enterで改行）"
          disabled={chatMutation.isPending}
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={handleSend}
            disabled={chatMutation.isPending || !question.trim()}
            className="px-4 py-2 rounded-md bg-amber-500 text-black text-sm font-medium hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {chatMutation.isPending ? "送信中…" : "質問する"}
          </button>
        </div>
      </div>
    </div>
  );
}
