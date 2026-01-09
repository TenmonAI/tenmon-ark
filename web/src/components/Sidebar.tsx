export default function Sidebar() {
  return (
    <aside className="sticky top-0 h-screen w-64 overflow-y-auto bg-[#f7f7f8] px-3 py-4">
      <div className="mb-4 text-sm font-semibold text-gray-700">
        TENMON-ARK
      </div>

      <button className="w-full rounded-md bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
        ＋ 新しい会話
      </button>

      <div className="mt-4 space-y-1 text-sm text-gray-600">
        <div className="px-2 py-1">天聞アーク 研究構築</div>
        <div className="px-2 py-1">天津金木 思考整理</div>
      </div>
    </aside>
  );
}
