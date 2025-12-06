import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Mic, MicOff, Plus, Send, Settings, LayoutDashboard, Trash2, User, CreditCard, Sparkles, MessageSquarePlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ThinkingPhases } from "@/components/ThinkingPhases";
import { StreamingMessage } from "@/components/StreamingMessage";
import { MessageProgressBar } from "@/components/MessageProgressBar";
import { useTranslation } from "react-i18next";
import { ChatMenuSheet } from "@/components/mobile/ChatMenuSheet";
import { useChatStreaming } from "@/hooks/useChatStreaming";
import { Streamdown } from "streamdown";
import { PersonaModeSelector } from "@/components/PersonaModeSelector";
import { useImeGuard } from "@/hooks/useImeGuard";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import "@/styles/chatgpt-ui.css";

/**
 * ChatGPT UI Complete Adoption
 * - ChatGPT v4の白黒UIに1px単位で完全一致
 * - 白背景 (#FFFFFF)、黒文字 (#111111)
 * - チャットバブル丸み 12px、入力欄丸み 20px
 * - 行間 1.6、フォントサイズ 15-16px
 * - シンプルな白黒UI（背景・枠線・影などの演出なし）
 */
export default function ChatRoom() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [currentRoomId, setCurrentRoomId] = useState<number | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { t, i18n } = useTranslation();

  // Streaming Hook
  const {
    sendMessage: sendStreamingMessage,
    isStreaming,
    streamingContent,
    currentPhase,
  } = useChatStreaming({
    onComplete: (response, roomId) => {
      refetchMessages();
      setInputMessage("");
      setErrorMessage(null);
      setLastFailedMessage(null);
      if (roomId !== currentRoomId) {
        setCurrentRoomId(roomId);
        refetchRooms();
      }
    },
    onError: (error) => {
      setErrorMessage(error);
      setLastFailedMessage(inputMessage);
    },
  });

  // チャットルーム一覧取得
  const { data: rooms, refetch: refetchRooms } =
    trpc.chat.listRooms.useQuery(undefined, {
      enabled: isAuthenticated,
    });

  // 現在のチャットルームのメッセージ取得
  const { data: messages, refetch: refetchMessages } =
    trpc.chat.getMessages.useQuery(
      { roomId: currentRoomId! },
      {
        enabled: currentRoomId !== null,
      }
    );

  // 新規チャット作成
  const createRoomMutation = trpc.chat.createRoom.useMutation({
    onSuccess: (data) => {
      refetchRooms();
      setCurrentRoomId(data.roomId);
    },
  });

  // チャット削除
  const deleteRoomMutation = trpc.chat.deleteRoom.useMutation({
    onSuccess: () => {
      refetchRooms();
      setCurrentRoomId(null);
    },
  });

  // 認証チェック
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  // 最初のチャットルームを自動選択
  useEffect(() => {
    if (rooms && rooms.length > 0 && currentRoomId === null) {
      setCurrentRoomId(rooms[0].id);
    }
  }, [rooms, currentRoomId]);

  // メッセージ送信時に最下部にスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    setErrorMessage(null);
    sendStreamingMessage({
      roomId: currentRoomId || undefined,
      message: inputMessage.trim(),
      language: i18n.language,
    });
  };

  // GPT-Level IME Guard vΩ-FINAL - ネイティブイベント使用
  useImeGuard(textareaRef, handleSendMessage);

  // Voice Recording
  const { state: voiceState, startRecording, stopRecording, error: voiceError } = useVoiceRecording({
    onTranscriptionComplete: (text) => {
      setInputMessage(prev => prev ? `${prev}\n${text}` : text);
    },
    onError: (error) => {
      setErrorMessage(error);
    },
  });

  const handleRetry = () => {
    if (lastFailedMessage) {
      setInputMessage(lastFailedMessage);
      setErrorMessage(null);
      sendStreamingMessage({
        roomId: currentRoomId || undefined,
        message: lastFailedMessage,
        language: i18n.language,
      });
    }
  };

  const handleNewChat = () => {
    createRoomMutation.mutate({
      title: t("chat.new_chat") || `New Chat ${new Date().toLocaleDateString()}`,
    });
  };

  const handleDeleteChat = (roomId: number) => {
    setRoomToDelete(roomId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteChat = () => {
    if (roomToDelete !== null) {
      deleteRoomMutation.mutate({ roomId: roomToDelete });
      setDeleteDialogOpen(false);
      setRoomToDelete(null);
    }
  };

  if (authLoading) {
    return (
      <div className="chatgpt-container">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page-container min-h-screen flex chatgpt-container w-full max-w-full overflow-x-hidden">
      {/* スマホ用メニュー */}
      <ChatMenuSheet
        rooms={rooms || []}
        currentRoomId={currentRoomId}
        onSelectRoom={setCurrentRoomId}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        isCreating={createRoomMutation.isPending}
        userName={user?.name}
      />
      
      {/* 左サイドバー：チャットルーム一覧（スマホでは非表示） */}
      <div className="hidden md:flex w-64 border-r border-border bg-background flex-col">
        <div className="p-4 border-b border-border">
          <Button
            onClick={handleNewChat}
            className="w-full font-semibold bg-primary text-primary-foreground"
            disabled={createRoomMutation.isPending}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("chat.new_chat")}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {rooms?.map((room) => (
            <Card
              key={room.id}
              className={`p-3 cursor-pointer transition-all group ${
                currentRoomId === room.id
                  ? "border-2"
                  : "border hover:bg-gray-50"
              }`}
              style={{
                backgroundColor: currentRoomId === room.id ? "var(--card)" : "var(--background)",
                borderColor: currentRoomId === room.id ? "var(--primary)" : "var(--border)",
              }}
              onClick={() => setCurrentRoomId(room.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{room.title}</p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    {new Date(room.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChat(room.id);
                  }}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="p-4 border-t border-border space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setLocation('/dashboard')}
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            ダッシュボード
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setLocation('/settings')}
          >
            <Settings className="w-4 h-4 mr-2" />
            設定
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setLocation('/profile')}
          >
            <User className="w-4 h-4 mr-2" />
            プロフィール
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setLocation('/subscription')}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            プラン管理
          </Button>
          {user && (user.plan === 'pro' || user.plan === 'founder' || user.plan === 'dev') && (
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => setLocation('/custom-arks')}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Custom ARK
            </Button>
          )}
          {user && (user.plan === 'founder' || user.plan === 'dev') && (
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => setLocation('/founder-feedback')}
            >
              <MessageSquarePlus className="w-4 h-4 mr-2" />
              Founder Feedback
            </Button>
          )}
          <div className="text-xs text-muted-foreground pt-2">
            <p className="font-semibold text-foreground">TENMON-ARK</p>
            <p className="mt-1">{t("app.subtitle")}</p>
            {user ? <p className="mt-1 truncate">{user.name}</p> : null}
          </div>
        </div>
      </div>

      {/* 右メインエリア：会話履歴と入力欄 */}
      <div className="flex-1 flex flex-col h-screen w-full max-w-full overflow-x-hidden">
        {currentRoomId || isStreaming ? (
          <>
            {/* ヘッダー */}
            <header className="flex items-center justify-between p-3 border-b border-border bg-background">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setLocation('/dashboard')}
                  className="md:hidden"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <div className="text-sm font-semibold">TENMON-ARK</div>
                  <div className="text-xs text-muted-foreground">{user?.name || 'Guest'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setLocation('/settings')}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </header>
            {/* メッセージ履歴 */}
            <div className="chatgpt-messages">
              {messages?.filter(msg => msg.content && msg.content.trim()).map((msg) => (
                <div
                  key={msg.id}
                  className={`chatgpt-message ${
                    msg.role === "user" ? "chatgpt-message-user" : "chatgpt-message-assistant"
                  }`}
                >
                  <div className="chatgpt-message-content">
                    <Streamdown>{msg.content}</Streamdown>
                  </div>
                </div>
              ))}

              {/* Thinking Phases表示 */}
              {currentPhase && <ThinkingPhases currentPhase={currentPhase} />}

              {/* ストリーミング中のメッセージ */}
              {isStreaming && !currentPhase && streamingContent && (
                <div className="chatgpt-message chatgpt-message-assistant">
                  <div className="chatgpt-message-content">
                    <StreamingMessage content={streamingContent} isComplete={false} />
                  </div>
                </div>
              )}

              {/* ローディング表示 */}
              {isStreaming && !streamingContent && !currentPhase && (
                <div className="chatgpt-message chatgpt-message-assistant">
                  <div className="chatgpt-loading">
                    <div className="chatgpt-loading-dot"></div>
                    <div className="chatgpt-loading-dot"></div>
                    <div className="chatgpt-loading-dot"></div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* プログレスバー */}
            <MessageProgressBar isVisible={isStreaming} />

            {/* エラーメッセージと再試行ボタン */}
            {errorMessage && (
              <div className="max-w-4xl mx-auto px-4 py-3">
                <div className="rounded-lg p-4 flex items-center justify-between" style={{ backgroundColor: "#fee2e2", border: "1px solid #fca5a5" }}>
                  <div className="flex items-center gap-3">
                    <div style={{ color: "#dc2626" }}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#dc2626" }}>エラー</p>
                      <p className="text-xs" style={{ color: "#111111" }}>{errorMessage}</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleRetry}
                    variant="outline"
                    size="sm"
                    style={{ backgroundColor: "#fee2e2", borderColor: "#fca5a5", color: "#dc2626" }}
                  >
                    再試行
                  </Button>
                </div>
              </div>
            )}

            {/* 入力エリア */}
            <div className="chatgpt-input-container">
              {/* モード切替UI */}
              <div className="mb-3 flex justify-end">
                <PersonaModeSelector />
              </div>
              <div className="chatgpt-input-wrapper">
                <Textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={t("chat.input_placeholder") || "Type a message..."}
                  className="chatgpt-textarea"
                  rows={3}
                  disabled={isStreaming}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={voiceState === 'recording' ? stopRecording : startRecording}
                    disabled={isStreaming || voiceState === 'processing'}
                    className={`chatgpt-send-button ${voiceState === 'recording' ? 'recording' : ''}`}
                    title={voiceState === 'recording' ? '音声入力停止' : '音声入力開始'}
                  >
                    {voiceState === 'processing' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : voiceState === 'recording' ? (
                      <MicOff className="w-4 h-4 text-red-500" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isStreaming}
                    className={`chatgpt-send-button ${isStreaming ? "sending" : ""}`}
                  >
                    {isStreaming ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <p className="text-xs text-center mt-2" style={{ color: "#8e8e8e" }}>
                {t("chat.footer_message")}
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-bold mb-4 text-foreground">TENMON-ARK</p>
              <p className="mb-6 text-muted-foreground">{t("chat.welcome_message")}</p>
              <Button
                onClick={handleNewChat}
                className="font-semibold bg-primary text-primary-foreground"
                disabled={createRoomMutation.isPending}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("chat.new_chat")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("chat.delete_confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("chat.delete_confirm_message")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteChat}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
