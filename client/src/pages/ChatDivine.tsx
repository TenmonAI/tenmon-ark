import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Loader2, Send, Sparkles, Plus, Settings, MessageSquare, Paperclip } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import { FileUploadManager } from "@/components/fileUpload/FileUploadManager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * TENMON-ARK Divine Chat UI vΩ
 * 黒×金神装UIテーマ + GPT風レイアウト
 */
export default function ChatDivine() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [input, setInput] = useState("");
  const [currentRoomId, setCurrentRoomId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: rooms, refetch: refetchRooms } = trpc.chat.listRooms.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: messages, refetch: refetchMessages } = trpc.chat.getMessages.useQuery(
    { roomId: currentRoomId! },
    { enabled: currentRoomId !== null }
  );

  const createRoom = trpc.chat.createRoom.useMutation({
    onSuccess: (data) => {
      setCurrentRoomId(data.roomId);
      refetchRooms();
    },
  });

  const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null);

  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: (data) => {
      refetchMessages();
      setInput("");
      // Mark the latest message for streaming animation
      setTimeout(() => {
        if (messages && messages.length > 0) {
          const latestMessage = messages[messages.length - 1];
          if (latestMessage.role === "assistant") {
            setStreamingMessageId(latestMessage.id);
          }
        }
      }, 100);
    },
  });

  // 初回ロード時に会話を作成または最新ルームを選択
  useEffect(() => {
    if (isAuthenticated && !currentRoomId && rooms) {
      if (rooms.length === 0) {
        createRoom.mutate({ title: "New Chat" });
      } else {
        setCurrentRoomId(rooms[0].id);
      }
    }
  }, [isAuthenticated, rooms, currentRoomId]);

  // メッセージ送信時に最下部にスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // テキストエリアの自動リサイズ
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  if (authLoading) {
    return (
      <div className="min-h-screen divine-bg flex items-center justify-center">
        <div className="divine-spinner w-12 h-12" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen divine-bg flex items-center justify-center">
        <div className="divine-card max-w-md p-8 text-center space-y-6">
          <Sparkles className="w-16 h-16 mx-auto divine-text-gold-strong" />
          <h2 className="text-2xl font-bold divine-text-gold">天聞アーク霊核OS</h2>
          <p className="text-gray-400">
            ログインして天聞アークとの対話を開始してください
          </p>
          <Button asChild className="divine-button w-full">
            <a href={getLoginUrl()}>ログイン</a>
          </Button>
        </div>
      </div>
    );
  }

  const handleSend = () => {
    if (!input.trim() || !currentRoomId) return;

    sendMessage.mutate({
      roomId: currentRoomId,
      message: input,
      language: "ja",
    });
  };

  const handleNewChat = () => {
    createRoom.mutate({ title: "New Chat" });
  };

  const handleRoomSelect = (roomId: number) => {
    setCurrentRoomId(roomId);
    setStreamingMessageId(null);
  };

  return (
    <div className="flex h-screen divine-bg overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`divine-sidebar transition-all duration-300 ${
          sidebarOpen ? "w-[280px]" : "w-0"
        } flex-shrink-0 overflow-hidden`}
      >
        <div className="h-full flex flex-col p-4 space-y-4">
          {/* New Chat Button */}
          <Button
            onClick={handleNewChat}
            className="divine-button w-full justify-start gap-2"
            disabled={createRoom.isPending}
          >
            <Plus className="w-4 h-4" />
            新規チャット
          </Button>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto divine-scrollbar space-y-2">
            {rooms && rooms.length > 0 ? (
              rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => handleRoomSelect(room.id)}
                  className={`divine-sidebar-item w-full text-left px-3 py-2 rounded-md text-sm transition-all ${
                    currentRoomId === room.id ? "active" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{room.title}</span>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                チャット履歴がありません
              </p>
            )}
          </div>

          {/* Settings Button */}
          <Button
            variant="ghost"
            className="divine-sidebar-item w-full justify-start gap-2"
          >
            <Settings className="w-4 h-4" />
            設定
          </Button>

          {/* User Info */}
          <div className="divine-border-gold border-t pt-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full divine-gold-gradient flex items-center justify-center">
                <span className="text-xs font-bold text-black">
                  {user?.name?.[0] || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium divine-text-gold truncate">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto divine-scrollbar">
          <div className="max-w-4xl mx-auto px-4 py-8">
            {messages && messages.length > 0 ? (
              <div className="space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-4 ${
                      message.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {message.role === "assistant" ? (
                        <div className="w-10 h-10 rounded-full divine-gold-gradient twin-core-glow flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-black" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                          <span className="text-sm font-bold text-white">
                            {user?.name?.[0] || "U"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`flex-1 max-w-[80%] ${
                        message.role === "assistant" ? "message-ai" : "message-user"
                      }`}
                    >
                      <div
                        className={`p-4 rounded-lg ${
                          message.role === "assistant"
                            ? "bubble-ai"
                            : "bubble-user"
                        }`}
                      >
                        {message.role === "assistant" ? (
                          <StreamingMessage
                            content={message.content}
                            isStreaming={message.id === streamingMessageId}
                          />
                        ) : (
                          <p className="whitespace-pre-wrap text-sm">
                            {message.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {sendMessage.isPending && (
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full divine-gold-gradient twin-core-glow flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-black" />
                    </div>
                    <div className="bubble-ai p-4 rounded-lg message-ai">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="text-center py-16 space-y-6">
                <div className="w-20 h-20 mx-auto rounded-full divine-gold-gradient twin-core-glow flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-black" />
                </div>
                <h2 className="text-3xl font-bold divine-text-gold-strong text-life">
                  天聞アーク霊核OS
                </h2>
                <p className="text-gray-400 max-w-md mx-auto">
                  Twin-Core演算システムによる深層対話を開始します
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-800 bg-black/50 backdrop-blur">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="divine-card p-4">
              <div className="flex gap-3">
                {/* File Upload Button */}
                <Button
                  onClick={() => setShowFileUpload(true)}
                  variant="ghost"
                  size="icon"
                  className="self-end text-gray-400 hover:text-divine-gold hover:bg-divine-gold/10"
                  title="ファイルをアップロード"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>

                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="メッセージを入力..."
                  disabled={sendMessage.isPending}
                  className="divine-input flex-1 min-h-[40px] max-h-[200px] resize-none bg-transparent border-none focus:ring-0 text-sm"
                  rows={1}
                />
                <Button
                  onClick={handleSend}
                  disabled={sendMessage.isPending || !input.trim()}
                  className="divine-button self-end"
                  size="icon"
                >
                  {sendMessage.isPending ? (
                    <div className="divine-spinner w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* File Upload Dialog */}
      <Dialog open={showFileUpload} onOpenChange={setShowFileUpload}>
        <DialogContent className="bg-divine-black border-divine-gold/20 max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-divine-gold flex items-center gap-2">
              <Paperclip className="w-5 h-5" />
              ファイルアップロード
            </DialogTitle>
          </DialogHeader>
          <FileUploadManager
            conversationId={currentRoomId || undefined}
            onFileUploaded={(fileId, fileUrl) => {
              console.log("File uploaded:", fileId, fileUrl);
              // TODO: Integrate with chat message to include file reference
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Streaming Message Component with GPT-level animation
 */
function StreamingMessage({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming: boolean;
}) {
  const [displayedText, setDisplayedText] = useState(isStreaming ? "" : content);
  const [showCursor, setShowCursor] = useState(isStreaming);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(content);
      setShowCursor(false);
      return;
    }

    let i = 0;
    setDisplayedText("");
    setShowCursor(true);

    // Initial "..." phase
    const initialDelay = setTimeout(() => {
      const interval = setInterval(() => {
        if (i < content.length) {
          setDisplayedText(content.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
          setShowCursor(false);
        }
      }, 20); // 20ms per character for smooth streaming

      return () => clearInterval(interval);
    }, 300); // 300ms initial delay

    return () => clearTimeout(initialDelay);
  }, [content, isStreaming]);

  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <Streamdown>{displayedText}</Streamdown>
      {showCursor && <span className="streaming-cursor" />}
    </div>
  );
}
