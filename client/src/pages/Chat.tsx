import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { AnimatedMessage } from "@/components/AnimatedMessage";
import { TypingIndicator } from "@/components/TypingIndicator";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Loader2, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useImeGuard } from "@/hooks/useImeGuard";
import { useAutoScroll } from "@/hooks/useAutoScroll";

export default function Chat() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [input, setInput] = useState("");
  const [currentRoomId, setCurrentRoomId] = useState<number | null>(null);
  const { t, i18n } = useTranslation();

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

  const [latestMessageId, setLatestMessageId] = useState<number | null>(null);

  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: (data) => {
      refetchMessages();
      setInput("");
      // Mark the latest message for animation
      setTimeout(() => {
        if (messages && messages.length > 0) {
          setLatestMessageId(messages[messages.length - 1].id);
        }
      }, 100);
    },
  });

  // 初回ロード時に会話を作成または最新ルームを選択
  useEffect(() => {
    if (isAuthenticated && !currentRoomId && rooms) {
      if (rooms.length === 0) {
        createRoom.mutate({ title: t("chat.new_chat") || "New Chat" });
      } else {
        setCurrentRoomId(rooms[0].id);
      }
    }
  }, [isAuthenticated, rooms, currentRoomId]);

  // モバイル版スクロールオートフォーカス機能
  const { bottomRef, containerRef, handleScroll } = useAutoScroll(messages, {
    enabled: true,
    threshold: 100,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <Sparkles className="w-16 h-16 mx-auto text-primary" />
            <h2 className="text-2xl font-bold">{t("chat.login_required")}</h2>
            <p className="text-muted-foreground">
              {t("chat.login_description")}
            </p>
            <Button asChild>
              <a href={getLoginUrl()}>{t("auth.login")}</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSend = () => {
    if (!input.trim() || !currentRoomId) return;

    sendMessage.mutate({
      roomId: currentRoomId,
      message: input,
      language: i18n.language,
    });
  };

  const handleNewChat = () => {
    createRoom.mutate({ title: t("chat.new_chat") || "New Chat" });
  };

  const handleRoomSelect = (roomId: number) => {
    setCurrentRoomId(roomId);
  };

  // IME Guard vΩ∞ 統合
  const {
    handleCompositionStart,
    handleCompositionUpdate,
    handleCompositionEnd,
    handleKeyDown: imeHandleKeyDown,
    handleKeyPress,
  } = useImeGuard(handleSend);

  return (
    <ChatLayout
      currentRoomId={currentRoomId}
      onRoomSelect={handleRoomSelect}
      onNewChat={handleNewChat}
    >
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto" ref={containerRef} onScroll={handleScroll}>
        <div className="container py-8 max-w-4xl">
          {messages && messages.length > 0 ? (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <Card
                    className={`max-w-[80%] ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border-accent/30"
                    }`}
                  >
                    <CardContent className="p-4">
                      {message.role === "assistant" ? (
                        <AnimatedMessage
                          content={message.content}
                          isNew={message.id === latestMessageId}
                          speed={15}
                        />
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
              {sendMessage.isPending && (
                <div className="flex justify-start">
                  <Card className="bg-card border-accent/30">
                    <CardContent className="p-4">
                      <TypingIndicator />
                    </CardContent>
                  </Card>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          ) : (
            <div className="text-center py-16 space-y-4">
              <Sparkles className="w-16 h-16 mx-auto text-primary" />
              <h2 className="text-2xl font-bold">{t("chat.welcome_title")}</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                {t("chat.welcome_description")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card/50 backdrop-blur">
        <div className="container py-4 max-w-4xl">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onCompositionStart={handleCompositionStart}
              onCompositionUpdate={handleCompositionUpdate}
              onCompositionEnd={handleCompositionEnd}
              onKeyDown={imeHandleKeyDown}
              onKeyPress={handleKeyPress}
              placeholder={t("chat.input_placeholder") || "Type a message..."}
              disabled={sendMessage.isPending}
              className="flex-1 min-h-[40px] max-h-[200px] resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              rows={1}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 200) + 'px';
              }}
            />
            <Button onClick={handleSend} disabled={sendMessage.isPending || !input.trim()}>
              {sendMessage.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </ChatLayout>
  );
}
