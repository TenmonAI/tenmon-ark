export default function Chat() {
  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <header className="px-6 py-4 text-sm font-medium text-gray-700 shadow-sm">
        TENMON-ARK Chat
      </header>

      {/* メッセージエリア */}
      <main className="flex-1 overflow-y-auto bg-[#f7f7f8] px-6 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
            <div className="mb-1 text-xs text-gray-500">SYSTEM</div>
            TENMON-ARK 起動。まずは THINK モードのみ有効。
          </div>
        </div>
      </main>

      {/* 入力欄 */}
      <footer className="bg-white px-6 py-4 shadow-[0_-1px_8px_rgba(0,0,0,0.06)]">
        <textarea
          className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none"
          rows={3}
          placeholder="メッセージを入力…"
        />
        <div className="mt-2 flex gap-2">
          <button className="rounded-md bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300">
            THINK
          </button>
        </div>
      </footer>
    </div>
  );
}
