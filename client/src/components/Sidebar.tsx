export default function Sidebar() {
  return (
    <div className="w-64 bg-gray-50 flex flex-col p-3">
      {/* ロゴ */}
      <div className="flex items-center gap-2 px-2 py-3">
        <img
          src="/logo.png"
          alt="TENMON-ARK"
          className="h-7 w-auto"
        />
      </div>

      {/* 新しい会話 */}
      <button className="mt-2 mb-4 w-full rounded-lg bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-100">
        ＋ 新しい会話
      </button>

      {/* 履歴 */}
      <div className="flex-1 space-y-1 text-sm">
        <div className="px-2 py-1 text-gray-500 text-xs">最近の会話</div>
        <div className="rounded-lg px-3 py-2 hover:bg-white cursor-pointer">
          天聞アーク 研究構築
        </div>
        <div className="rounded-lg px-3 py-2 hover:bg-white cursor-pointer">
          天津金木 思考整理
        </div>
      </div>

      {/* ユーザー */}
      <div className="mt-3 px-2 py-2 text-xs text-gray-500">
        天聞さん
      </div>
    </div>
  );
}
