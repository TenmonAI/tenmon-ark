// カスタムGPT詳細ページ
export function GPTDetail({ id }: { id: string }) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-6 py-4 bg-white shadow-sm">
        <div className="text-sm font-medium text-gray-900">GPT詳細: {id}</div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-8 bg-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-sm text-gray-500">GPT詳細は準備中です</div>
        </div>
      </div>
    </div>
  );
}

