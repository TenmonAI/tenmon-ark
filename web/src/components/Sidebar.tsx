export default function Sidebar() {
  return (
    <aside className="w-64 bg-[#f7f7f8] flex flex-col">
      {/* ロゴ＋バージョン */}
      <div className="px-4 py-3 text-sm font-medium text-gray-700">
        TENMON-ARK ▾
      </div>

      {/* 新規チャット */}
      <div className="px-3 py-2">
        <button className="w-full rounded-lg px-3 py-2 text-sm bg-white shadow-sm hover:bg-gray-50">
          ＋ 新しい会話
        </button>
      </div>

      {/* 履歴 */}
      <div className="flex-1 px-3 py-4 text-xs text-gray-500">
        履歴（後で）
      </div>
    </aside>
  );
}
