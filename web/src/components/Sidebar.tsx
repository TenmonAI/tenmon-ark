// 左サイドバー（ChatGPT風）
import { useState } from "react";

type ChatHistory = {
  id: string;
  title: string;
  updatedAt: string;
};

export function Sidebar() {
  const [histories] = useState<ChatHistory[]>([
    { id: "1", title: "新しい会話", updatedAt: new Date().toISOString() },
  ]);

  function handleNewChat() {
    window.location.href = "/";
  }

  return (
    <div className="w-64 bg-gray-50 flex flex-col p-3 h-full">
      {/* ロゴ */}
      <div className="flex items-center gap-2 px-2 py-3">
        <div className="text-sm font-semibold text-gray-900">TENMON-ARK</div>
      </div>

      {/* 新しい会話ボタン */}
      <button
        onClick={handleNewChat}
        className="mt-2 mb-4 w-full rounded-lg bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-100 text-left"
      >
        ＋ 新しい会話
      </button>

      {/* 履歴 */}
      <div className="flex-1 space-y-1 text-sm overflow-y-auto">
        <div className="px-2 py-1 text-gray-500 text-xs">最近の会話</div>
        {histories.map((h) => (
          <div
            key={h.id}
            className="rounded-lg px-3 py-2 hover:bg-white cursor-pointer text-gray-700"
            onClick={() => window.location.href = "/"}
          >
            {h.title}
          </div>
        ))}
      </div>

      {/* ユーザー */}
      <div className="mt-3 px-2 py-2 text-xs text-gray-500 border-t border-gray-200 pt-3">
        ユーザー
      </div>
    </div>
  );
}

