export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r flex flex-col">
      {/* Header */}
      <div className="p-4 border-b font-semibold text-sm">
        TENMON-ARK
      </div>

      {/* New chat */}
      <div className="p-3">
        <button className="w-full text-left text-sm px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200">
          ＋ 新しい会話
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        <div className="text-xs text-gray-500 px-2 mt-4">
          最近の会話
        </div>

        <div className="px-2 py-2 rounded-md hover:bg-gray-100 cursor-pointer text-sm">
          天聞アーク 研究構築
        </div>
        <div className="px-2 py-2 rounded-md hover:bg-gray-100 cursor-pointer text-sm">
          天津金木 思考整理
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-3 text-xs text-gray-500">
        天聞さん
      </div>
    </aside>
  );
}
