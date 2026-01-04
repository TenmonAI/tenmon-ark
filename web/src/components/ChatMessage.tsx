// チャットメッセージ（ChatGPT風）
type MessageProps = {
  role: "user" | "assistant";
  content: string;
};

export function ChatMessage({ role, content }: MessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-6`}>
      <div className={`max-w-2xl ${isUser ? "bg-gray-200" : "bg-white"} rounded-xl p-4 shadow-sm`}>
        <div className="text-sm leading-relaxed text-gray-900 whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </div>
  );
}
