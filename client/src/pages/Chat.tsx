export default function Chat() {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-4 shadow-sm text-sm font-medium">
        TENMON-ARK
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-100">
        <div className="max-w-2xl bg-white rounded-xl p-4 shadow-sm">
          <div className="text-xs text-gray-500 mb-2">SYSTEM</div>
          <div className="text-sm leading-relaxed">
            TENMON-ARK 起動。通常は THINK（会話）で進め、必要時のみ JUDGE（判断）を用いてください。
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="px-6 py-4 bg-white shadow-inner">
        <textarea
          className="w-full resize-none rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
          rows={3}
          placeholder="メッセージを入力…"
        />
        <div className="mt-3 flex gap-2">
          <button className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-sm">
            Send (THINK)
          </button>
          <button className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-sm">
            Judge (JUDGE)
          </button>
        </div>
      </div>
    </div>
  );
}
