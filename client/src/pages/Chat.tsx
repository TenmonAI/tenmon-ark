export default function Chat() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 text-sm font-medium">
        TENMON-ARK
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-gray-100 rounded-lg p-4 max-w-2xl">
          <div className="text-xs text-gray-500 mb-1">SYSTEM</div>
          TENMON-ARK 起動。通常は THINK（会話）で進め、必要時のみ JUDGE（判断）を用いてください。
        </div>
      </div>

      <div className="border-t p-4">
        <textarea
          className="w-full border rounded-md p-3 text-sm"
          rows={3}
          placeholder="ここに入力してください..."
        />
        <div className="mt-2 flex gap-2">
          <button className="px-4 py-2 bg-gray-200 rounded-md">Send (THINK)</button>
          <button className="px-4 py-2 bg-gray-200 rounded-md">Judge (JUDGE)</button>
        </div>
      </div>
    </div>
  );
}
