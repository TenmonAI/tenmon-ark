export default function Chat() {
  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-6 py-4 bg-white shadow-sm">
        <div className="text-sm font-semibold flex items-center gap-2 cursor-pointer">
          TENMON-ARK
          <span className="text-gray-400">▾</span>
        </div>
      </div>

      {/* メッセージ */}
      <div className="flex-1 overflow-y-auto px-6 py-8 bg-gray-100">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-xs text-gray-400 mb-1">SYSTEM</div>
            TENMON-ARK 起動。通常は THINK（会話）で進め、必要時のみ JUDGE（判断）を用いてください。
          </div>
        </div>
      </div>

      {/* 入力欄 */}
      <div className="bg-white px-6 py-4 shadow-[0_-1px_4px_rgba(0,0,0,0.05)]">
        <div className="max-w-2xl mx-auto">
          <textarea
            className="w-full resize-none rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            rows={3}
            placeholder="メッセージを入力…"
          />
          <div className="mt-2 flex gap-2">
            <button className="rounded-lg bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300">
              Send (THINK)
            </button>
            <button className="rounded-lg bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300">
              Judge (JUDGE)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
