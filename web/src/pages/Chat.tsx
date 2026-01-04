export default function Chat() {
  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <header className="px-6 py-4 text-sm font-medium text-gray-700">
        TENMON-ARK
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto bg-white px-6 py-6">
        <div className="max-w-2xl rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
          <div className="mb-1 text-xs text-gray-500">SYSTEM</div>
          TENMON-ARK 起動。通常は THINK（会話）で進め、必要時のみ JUDGE（判断）を用いてください。
        </div>
      </main>

      {/* Input */}
      <footer className="bg-white px-6 py-4">
        <textarea
          className="w-full resize-none rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
          rows={3}
          placeholder="メッセージを入力…"
        />
      </footer>
    </div>
  );
}
