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
import { useSpeechInput } from "@/hooks/useSpeechInput";
import { ReasoningStepsViewer } from "@/components/chat/ReasoningStepsViewer";
import { Badge } from "@/components/ui/badge";
import { ALPHA_TRANSITION_DURATION } from "@/lib/mobileOS/alphaFlow";
import { FeedbackModal } from "@/components/feedback/FeedbackModal";
import { MessageSquarePlus } from "lucide-react";
import { usePersonaState } from "@/state/persona/usePersonaState";
import { PersonaBadge } from "@/components/chat/PersonaBadge";
import { PersonaChatBubble } from "@/components/chat/PersonaChatBubble";
import { OfflineStatusBar } from "@/components/ui/offline/OfflineStatusBar";
import { FileUploadZone } from "@/components/fileUpload/FileUploadZone";
import { FileList } from "@/components/fileUpload/FileList";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BookOpen, Save } from "lucide-react";
import { logChatMessageAdded, logFileUploaded, logLearningToggled } from "@/lib/offline/eventLogClient";
import { setupAutoSync } from "@/lib/offline/syncFabricClient";
import { setupRestoreOnStartup } from "@/lib/offline/restoreFromSnapshot";
import { getConversationLocalFirst } from "@/lib/kokuzo/localFirst";
import { ProjectList } from "@/components/project/ProjectList";
import { storeExperience, getMemorySummaryForAPI } from "@/lib/kokuzo";
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
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<number | null>(null);
  const [showReasoning, setShowReasoning] = useState<number | null>(null);
  const [deepAnalysis, setDeepAnalysis] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [laws, setLaws] = useState<any[]>([]);
  const [isLoadingLaws, setIsLoadingLaws] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
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
    onComplete: async (response, roomId) => {
      // Event Log に記録（Local-first: ネットがあっても必ずLocalに書く）
      try {
        await logChatMessageAdded({
          roomId: roomId || currentRoomId || 0,
          messageId: 0, // TODO: 実際のメッセージIDを取得
          role: "assistant",
          content: response,
          projectId: selectedProjectId, // プロジェクトIDをメタデータに付与
        });
      } catch (error) {
        console.warn("[ChatRoom] Failed to log assistant message:", error);
      }

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

  // チャットルーム一覧取得（プロジェクトでフィルタ）
  const { data: rooms, refetch: refetchRooms } =
    trpc.chat.listRooms.useQuery(
      { projectId: selectedProjectId },
      {
        enabled: isAuthenticated,
      }
    );

  // プロジェクト切り替え時に現在の会話をリセット（別プロジェクトの会話を開かないように）
  useEffect(() => {
    // プロジェクトが変更されたら、現在の会話を閉じる
    setCurrentRoomId(null);
  }, [selectedProjectId]);

  // 現在のチャットルームのメッセージ取得
  const { data: messages, isLoading: messagesLoading, error: messagesError, refetch: refetchMessages } =
    trpc.chat.getMessages.useQuery(
      { roomId: currentRoomId! },
      {
        enabled: currentRoomId !== null && isAuthenticated,
      }
    );

  // ファイルアップロード
  const uploadFileMutation = trpc.fileUpload.uploadFile.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.fileId ? "ファイルをアップロードしました" : "アップロード完了"}`);
    },
    onError: (error) => {
      toast.error(`アップロードに失敗しました: ${error.message}`);
    },
  });

  // ファイル一覧取得（会話単位）
  const { data: uploadedFiles, refetch: refetchFiles } = trpc.fileUpload.listFiles.useQuery(
    {
      conversationId: currentRoomId || undefined,
      limit: 50,
    },
    {
      enabled: currentRoomId !== null,
    }
  );

  // ファイル削除
  const deleteFileMutation = trpc.fileUpload.deleteFile.useMutation({
    onSuccess: () => {
      refetchFiles();
      toast.success("ファイルを削除しました");
    },
    onError: (error) => {
      toast.error(`ファイルの削除に失敗しました: ${error.message}`);
    },
  });

  // ファイル処理（学習ON/OFF）
  const processFileMutation = trpc.fileUpload.processFile.useMutation({
    onSuccess: () => {
      refetchFiles();
      toast.success("ファイルを処理しました");
    },
    onError: (error) => {
      toast.error(`ファイルの処理に失敗しました: ${error.message}`);
    },
  });

  // 学習ON/OFFトグル
  const handleToggleLearning = async (fileId: number, enabled: boolean) => {
    // Event Log に記録（Local-first: ネットがあっても必ずLocalに書く）
    try {
      await logLearningToggled({
        fileId,
        enabled,
        projectId: selectedProjectId, // プロジェクトIDをメタデータに付与
      });
    } catch (error) {
      console.warn("[ChatRoom] Failed to log learning toggle:", error);
    }

    if (enabled) {
      // ON: processFileを呼ぶ（Kokūzō ingest実行）
      processFileMutation.mutate({ fileId });
    } else {
      // OFF: 学習を停止（現時点では処理済みファイルの学習を無効化する機能はない）
      toast.info("学習を停止するには、ファイルを削除してください");
    }
  };

  // ファイルアップロード処理（既存の tRPC 経由）
  const handleFileUpload = async (files: File[]) => {
    for (const file of files) {
      try {
        // Convert file to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            // Remove data URL prefix
            const base64Data = base64.split(",")[1] || base64;
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Upload file
        const uploadResult = await uploadFileMutation.mutateAsync({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          fileData: base64,
          conversationId: currentRoomId || undefined,
          projectId: selectedProjectId, // プロジェクトIDをメタデータに付与
        });

        // Event Log に記録（Local-first: ネットがあっても必ずLocalに書く）
        try {
          await logFileUploaded({
            fileId: uploadResult.fileId || 0,
            conversationId: currentRoomId || undefined,
            fileName: file.name,
          });
        } catch (error) {
          console.warn("[ChatRoom] Failed to log file upload:", error);
        }

        // Refetch files list
        refetchFiles();
      } catch (error) {
        console.error("File upload error:", error);
      }
    }
  };

  // ファイルアップロード処理（新規 /api/upload エンドポイント使用）
  const handleFileUploadToVPS = async (files: File[]) => {
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          if (response.status === 413) {
            toast.error(`ファイルサイズが200MBを超えています: ${file.name}`);
          } else {
            toast.error(`アップロードに失敗しました: ${file.name}`);
          }
          continue;
        }

        const data = await response.json();
        
        if (data.ok) {
          toast.success(`ファイルを保存しました: ${data.fileName}`);
          
          // Event Log に記録（Local-first: ネットがあっても必ずLocalに書く）
          try {
            await logFileUploaded({
              fileId: 0, // /api/upload は fileId を返さない
              conversationId: currentRoomId || undefined,
              fileName: data.fileName,
            });
          } catch (error) {
            console.warn("[ChatRoom] Failed to log file upload:", error);
          }

          // チャットに「保存完了」メッセージを表示（system メッセージとして）
          // 注: 既存のメッセージシステムに追加する場合は、適切な方法で実装
        } else {
          toast.error(`アップロードに失敗しました: ${data.error || "Unknown error"}`);
        }
      } catch (error) {
        console.error("[ChatRoom] File upload to VPS error:", error);
        toast.error(`アップロードに失敗しました: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  };

  // ファイル操作ハンドラー
  const handleFileView = (file: any) => {
    window.open(file.fileUrl, "_blank");
  };

  const handleFileDownload = (file: any) => {
    const link = document.createElement("a");
    link.href = file.fileUrl;
    link.download = file.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileDelete = (fileId: number) => {
    deleteFileMutation.mutate({ fileId });
  };

  // Convert uploaded files to FilePreviewData
  const filePreviewData =
    uploadedFiles?.map((file) => ({
      ...file,
      createdAt: new Date(file.createdAt),
    })) || [];

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

  // 自動同期をセットアップ（再接続時に黙って同期）
  useEffect(() => {
    const cleanup = setupAutoSync();
    return cleanup;
  }, []);

  // 再起動・電源断からの完全復帰
  useEffect(() => {
    setupRestoreOnStartup();
  }, []);

  // ページロード時に記憶を想起（将来の拡張用、現時点ではログのみ）
  useEffect(() => {
    const loadMemory = async () => {
      try {
        const { recallMemory } = await import("@/lib/kokuzo");
        const memories = await recallMemory();
        if (memories.length > 0) {
          console.log(`[Kokuzo Node] Loaded ${memories.length} memories from local storage`);
        }
      } catch (error) {
        console.warn("[ChatRoom] Failed to recall memory:", error);
      }
    };
    loadMemory();
  }, []);

  // 学習一覧を取得
  const fetchLaws = async () => {
    if (!currentRoomId) return;
    
    setIsLoadingLaws(true);
    try {
      const response = await fetch(`/api/law/list?threadId=room-${currentRoomId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.ok && data.laws) {
        setLaws(data.laws);
      }
    } catch (error) {
      console.error("[ChatRoom] Failed to fetch laws:", error);
    } finally {
      setIsLoadingLaws(false);
    }
  };

  // ルーム変更時に学習一覧を取得
  useEffect(() => {
    if (currentRoomId) {
      fetchLaws();
    } else {
      setLaws([]);
    }
  }, [currentRoomId]);

  // 新メッセージ時のみ自動スクロール（ユーザーが上にスクロールしている場合は無視）
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      setIsUserScrolling(true);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsUserScrolling(false);
      }, 1000);
    };

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // 新メッセージが追加された時のみ自動スクロール
  useEffect(() => {
    if (!isUserScrolling && (messages?.length || streamingContent)) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages?.length, streamingContent, isUserScrolling]);

  // 応答完了時にフォーカスを入力欄に戻す
  useEffect(() => {
    if (!isStreaming && textareaRef.current) {
      // 少し遅延させて自然な動作にする
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isStreaming]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    // 深層解析ONのとき、送信文字列の末尾に " #詳細" を付ける
    const messageToSend = deepAnalysis 
      ? `${inputMessage.trim()} #詳細`
      : inputMessage.trim();

    // Personaを自動判定
    const isMobile = window.innerWidth < 768;
    detectAndSetPersona(messageToSend, isMobile);

    // 虚空蔵ノード: 体験を記憶に保存（端末完結、中央サーバーには送信しない）
    try {
      await storeExperience(messageToSend);
    } catch (error) {
      console.warn("[ChatRoom] Failed to store experience:", error);
    }

    // Event Log に記録（Local-first: ネットがあっても必ずLocalに書く）
    try {
      await logChatMessageAdded({
        roomId: currentRoomId || 0,
        messageId: 0, // TODO: 実際のメッセージIDを取得
        role: "user",
        content: messageToSend,
        projectId: selectedProjectId, // プロジェクトIDをメタデータに付与
      });
    } catch (error) {
      console.warn("[ChatRoom] Failed to log user message:", error);
    }

    // 深層解析ONのとき、通常の /api/chat エンドポイントを使用して candidates を取得
    if (deepAnalysis) {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            threadId: `room-${currentRoomId || 0}`,
            message: messageToSend,
          }),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // candidates を保存
        if (data.candidates && Array.isArray(data.candidates)) {
          setCandidates(data.candidates);
        } else {
          setCandidates([]);
        }
        
        // ストリーミングメッセージも送信（通常の応答表示のため）
        const memorySummary: any[] = [];
        try {
          const summary = await getMemorySummaryForAPI(10);
          memorySummary.push(...summary);
        } catch (error) {
          console.warn("[ChatRoom] Failed to get memory summary:", error);
        }
        
        setErrorMessage(null);
        sendStreamingMessage({
          roomId: currentRoomId || undefined,
          message: messageToSend,
          language: i18n.language,
          persona: persona.current,
          projectId: selectedProjectId,
          memorySummary,
        });
      } catch (error) {
        console.error("[ChatRoom] Failed to fetch candidates:", error);
        setErrorMessage(error instanceof Error ? error.message : "Failed to fetch candidates");
        setCandidates([]);
      }
    } else {
      // 通常のストリーミング送信
      const memorySummary: any[] = [];
      try {
        const summary = await getMemorySummaryForAPI(10);
        memorySummary.push(...summary);
      } catch (error) {
        console.warn("[ChatRoom] Failed to get memory summary:", error);
      }

      setErrorMessage(null);
      sendStreamingMessage({
        roomId: currentRoomId || undefined,
        message: messageToSend,
        language: i18n.language,
        persona: persona.current,
        projectId: selectedProjectId,
        memorySummary,
      });
    }
  };

  // Persona State
  const { persona, detectAndSetPersona } = usePersonaState('companion');

  // GPT-Level IME Guard vΩ-FINAL - ネイティブイベント使用
  // IME変換中は送信を禁止、Ctrl/Cmd+Enterで送信
  useImeGuard(textareaRef, handleSendMessage, currentRoomId);

  // Whisper STT統合（音声入力）
  const [autoSendAfterVoice, setAutoSendAfterVoice] = useState(false);
  const { 
    state: voiceState, 
    transcript: voiceTranscript,
    startRecording, 
    stopRecording, 
    cancelRecording,
    error: voiceError,
    isRecording,
    isProcessing,
  } = useSpeechInput({
    language: i18n.language,
    onTranscriptionComplete: (result) => {
      setInputMessage(result.text);
      // 自動送信オプションが有効な場合
      if (autoSendAfterVoice && result.text.trim()) {
        setTimeout(() => {
          // Personaを自動判定
          const isMobile = window.innerWidth < 768;
          detectAndSetPersona(result.text.trim(), isMobile);
          
          sendStreamingMessage({
            roomId: currentRoomId || undefined,
            message: result.text.trim(),
            language: i18n.language,
            persona: persona.current,
          });
        }, 300);
      }
    },
    onError: (error) => {
      setErrorMessage(error);
    },
  });

  // 音声入力のテキストを自動挿入
  useEffect(() => {
    if (voiceTranscript && !autoSendAfterVoice) {
      setInputMessage(voiceTranscript);
    }
  }, [voiceTranscript, autoSendAfterVoice]);

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
            aria-label="新しいチャットを作成"
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
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setCurrentRoomId(room.id);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`チャットルーム: ${room.title}`}
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
                  aria-label={`チャットルーム「${room.title}」を削除`}
                  tabIndex={0}
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
            aria-label="ダッシュボードに移動"
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            ダッシュボード
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setLocation('/settings')}
            aria-label="設定に移動"
          >
            <Settings className="w-4 h-4 mr-2" />
            設定
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setLocation('/profile')}
            aria-label="プロフィールに移動"
          >
            <User className="w-4 h-4 mr-2" />
            プロフィール
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setLocation('/subscription')}
            aria-label="プラン管理に移動"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            プラン管理
          </Button>
          {user && (user.plan === 'pro' || user.plan === 'founder' || user.plan === 'dev') && (
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => setLocation('/custom-arks')}
              aria-label="Custom ARK に移動"
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
              aria-label="Founder Feedback に移動"
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

      {/* 左サイドバー: プロジェクト一覧 */}
      <div className="w-48 border-r border-border hidden md:block">
        <ProjectList
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
        />
      </div>

      {/* 右サイドバー: 学習一覧 */}
      {currentRoomId && (
        <div className="w-64 border-l border-border hidden lg:block overflow-y-auto">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium text-foreground">学習一覧</h3>
          </div>
          <div className="p-2 space-y-2">
            {isLoadingLaws ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : laws.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                学習した項目はありません
              </p>
            ) : (
              laws.map((law) => (
                <Card
                  key={law.id}
                  className="p-2 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => {
                    const pinMessage = `doc=${law.doc} pdfPage=${law.pdfPage}`;
                    setInputMessage(pinMessage);
                    setDeepAnalysis(true);
                    setTimeout(() => {
                      handleSendMessage();
                    }, 100);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-xs font-medium text-foreground truncate">
                          {law.doc} P{law.pdfPage}
                        </span>
                      </div>
                      {law.tags && law.tags.length > 0 && (
                        <div className="flex gap-1 mb-1 flex-wrap">
                          {law.tags.map((tag: string, tagIdx: number) => (
                            <Badge key={tagIdx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {law.quote}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* 右メインエリア：会話履歴と入力欄 */}
      <div className="flex-1 flex flex-col h-screen w-full max-w-full overflow-x-hidden">
        {currentRoomId || isStreaming ? (
          <>
            {/* ヘッダー（動的グラデーション） */}
            <header
              className="flex items-center justify-between p-3 border-b border-border relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${persona.config.headerBgColor} 0%, ${persona.config.headerBgColor}dd 50%, ${persona.config.headerBgColor}aa 100%)`,
                color: '#ffffff',
                transition: `background ${ALPHA_TRANSITION_DURATION}ms ease-in-out`,
                position: 'relative',
              }}
            >
              {/* グラデーションオーバーレイ（微細な動き） */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.3) 0%, transparent 70%)`,
                  animation: `pulse ${ALPHA_TRANSITION_DURATION * 4}ms ease-in-out infinite`,
                }}
              />
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setLocation('/dashboard')}
                  className="md:hidden"
                  aria-label="ダッシュボードに戻る"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold">TENMON-ARK</div>
                    {/* Persona Tone 表示（動的） */}
                    <PersonaBadge persona={persona.current} />
                  </div>
                  <div
                    className="text-xs"
                    style={{
                      color: '#ffffff',
                      opacity: 0.9,
                    }}
                  >
                    {user?.name || 'Guest'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {user && (user.plan === 'founder' || user.plan === 'dev') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFeedbackModalOpen(true)}
                    className="text-xs"
                    aria-label="改善を提案"
                  >
                    <MessageSquarePlus className="w-3 h-3 mr-1" />
                    改善を提案
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setLocation('/settings')}
                  aria-label="設定を開く"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </header>
            {/* メッセージ履歴 */}
            <div className="chatgpt-messages" ref={messagesContainerRef}>
              {messagesLoading ? (
                <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" aria-hidden="true" />
                  <p className="ml-2 text-xs text-muted-foreground">読み込み中</p>
                </div>
              ) : messagesError ? (
                <div className="flex flex-col items-center justify-center py-12" role="alert">
                  <p className="text-sm text-destructive mb-3">再試行できます</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => refetchMessages()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        refetchMessages();
                      }
                    }}
                    tabIndex={0}
                  >
                    再試行
                  </Button>
                </div>
              ) : !messages || messages.filter(msg => msg.content && msg.content.trim()).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12" role="status" aria-live="polite">
                  <p className="text-sm font-medium text-foreground mb-4">何でも聞いてください</p>
                </div>
              ) : (
                messages.filter(msg => msg.content && msg.content.trim()).map((msg, idx) => {
                // Atlas Chatのreasoning情報を取得（メタデータから）
                const reasoningData = (msg as any).reasoning;
                const personaData = (msg as any).persona;
                // メッセージのpersonaを取得（なければ現在のpersonaを使用）
                const messagePersona = personaData?.id || persona.current;
                
                return (
                  <PersonaChatBubble
                    key={msg.id}
                    persona={messagePersona}
                    role={msg.role as 'user' | 'assistant'}
                    style={{
                      animation: `fadeInUp ${ALPHA_TRANSITION_DURATION}ms ease-out ${idx * 30}ms both`,
                    }}
                  >
                    <Streamdown>{msg.content}</Streamdown>
                    
                    {/* 学習されたことの可視化（極小表示、邪魔禁止） */}
                    {msg.role === "assistant" && (
                      <>
                        {/* usedSeeds/usedFilesがある場合のみ表示 */}
                        {((msg as any).usedSeeds?.length > 0 || (msg as any).usedFiles?.length > 0) && (
                          <button
                            className="text-xs text-muted-foreground hover:underline mt-1 block"
                            onClick={() => setShowReasoning(showReasoning === msg.id ? null : msg.id)}
                            aria-label="使われた記憶を見る"
                          >
                            この回答は {((msg as any).usedSeeds?.length || 0) + ((msg as any).usedFiles?.length || 0)} 個の記憶を参照
                          </button>
                        )}
                        
                        {/* Reasoning Steps Viewer（手動展開のみ） */}
                        {showReasoning === msg.id && (
                          <div className="mt-2">
                            <ReasoningStepsViewer
                              steps={reasoningData?.steps || []}
                              finalThought={reasoningData?.finalThought}
                              currentProjectId={selectedProjectId}
                              usedSeeds={(msg as any).usedSeeds?.map((s: any) => ({
                                id: s.seedId || '',
                                name: s.title,
                                type: undefined,
                                projectId: s.projectId || null,
                              })) || []}
                              usedFiles={(msg as any).usedFiles?.map((f: any) => ({
                                id: Number(f.fileId) || 0,
                                fileName: f.name || '',
                                fileType: 'other' as const,
                                fileSize: 0,
                                fileUrl: '',
                                mimeType: '',
                                createdAt: new Date(),
                                projectId: f.projectId || null,
                              })) || []}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </PersonaChatBubble>
                );
              }))}

              {/* Thinking Phases表示 */}
              {currentPhase && <ThinkingPhases currentPhase={currentPhase} />}

              {/* ストリーミング中のメッセージ */}
              {isStreaming && !currentPhase && streamingContent && (
                <PersonaChatBubble persona={persona.current} role="assistant">
                  <StreamingMessage content={streamingContent} isComplete={false} />
                </PersonaChatBubble>
              )}
              
              {/* 音声入力中・変換中UI */}
              {(isRecording || isProcessing) && (
                <div className="chatgpt-message chatgpt-message-user">
                  <div className="chatgpt-message-content">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {isRecording && (
                        <>
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" aria-hidden="true" />
                          <span>音声入力中...</span>
                        </>
                      )}
                      {isProcessing && (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                          <span>変換中...</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ローディング表示（控えめに） */}
              {isStreaming && !streamingContent && !currentPhase && (
                <PersonaChatBubble persona={persona.current} role="assistant">
                  <div className="chatgpt-loading" role="status" aria-live="polite" aria-label="応答を生成中">
                    <div className="chatgpt-loading-dot"></div>
                    <div className="chatgpt-loading-dot"></div>
                    <div className="chatgpt-loading-dot"></div>
                  </div>
                </PersonaChatBubble>
              )}

              <div ref={messagesEndRef} />
              
              {/* Candidates 表示（深層解析ONのとき） */}
              {candidates.length > 0 && (
                <div className="max-w-4xl mx-auto px-4 py-3 space-y-3">
                  <h3 className="text-sm font-medium text-foreground mb-2">検索候補</h3>
                  {candidates.map((candidate, idx) => (
                    <Card key={idx} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-foreground">
                              {candidate.doc} P{candidate.pdfPage}
                            </span>
                            {candidate.tags && candidate.tags.length > 0 && (
                              <div className="flex gap-1">
                                {candidate.tags.map((tag: string, tagIdx: number) => (
                                  <Badge key={tagIdx} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {candidate.snippet}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const pinMessage = `doc=${candidate.doc} pdfPage=${candidate.pdfPage}`;
                              setInputMessage(pinMessage);
                              setDeepAnalysis(true);
                              setTimeout(() => {
                                handleSendMessage();
                              }, 100);
                            }}
                          >
                            <BookOpen className="w-3 h-3 mr-1" />
                            深掘り
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                const response = await fetch("/api/law/commit", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    threadId: `room-${currentRoomId || 0}`,
                                    doc: candidate.doc,
                                    pdfPage: candidate.pdfPage,
                                  }),
                                });
                                
                                if (!response.ok) {
                                  throw new Error(`HTTP error! status: ${response.status}`);
                                }
                                
                                const data = await response.json();
                                if (data.ok) {
                                  toast.success("学習を保存しました");
                                  // 学習一覧を再取得
                                  await fetchLaws();
                                } else {
                                  throw new Error(data.error || "Failed to commit law");
                                }
                              } catch (error) {
                                console.error("[ChatRoom] Failed to commit law:", error);
                                toast.error(error instanceof Error ? error.message : "学習の保存に失敗しました");
                              }
                            }}
                          >
                            <Save className="w-3 h-3 mr-1" />
                            学習
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* プログレスバー */}
            <MessageProgressBar isVisible={isStreaming} />

            {/* エラーメッセージと再試行ボタン */}
            {errorMessage && (
              <div className="max-w-4xl mx-auto px-4 py-3" role="alert">
                <div className="rounded-lg p-3 flex items-center justify-between" style={{ backgroundColor: "#fee2e2", border: "1px solid #fca5a5" }}>
                  <p className="text-sm" style={{ color: "#111111" }}>再試行できます</p>
                  <Button
                    onClick={handleRetry}
                    variant="outline"
                    size="sm"
                    style={{ backgroundColor: "#fee2e2", borderColor: "#fca5a5", color: "#dc2626" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleRetry();
                      }
                    }}
                    tabIndex={0}
                    aria-label="再試行"
                  >
                    再試行
                  </Button>
                </div>
              </div>
            )}

            {/* ファイル一覧（会話単位） */}
            {currentRoomId && filePreviewData.length > 0 && (
              <div className="max-w-4xl mx-auto px-4 py-3 border-b border-border">
                <h3 className="text-sm font-medium text-foreground mb-2">このチャットのファイル</h3>
                <FileList
                  files={filePreviewData}
                  loading={false}
                  onDelete={handleFileDelete}
                  onView={handleFileView}
                  onDownload={handleFileDownload}
                  onToggleLearning={handleToggleLearning}
                />
              </div>
            )}

            {/* 入力エリア */}
            <div className="chatgpt-input-container">
              {/* ファイルアップロードゾーン（既存の tRPC 経由） */}
              <div className="mb-3">
                <FileUploadZone
                  onFilesSelected={handleFileUpload}
                  disabled={isStreaming}
                />
              </div>
              {/* ファイルアップロードゾーン（新規 /api/upload 経由、VPS保存） */}
              <div className="mb-3">
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-muted transition-colors"
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const files = Array.from(e.dataTransfer.files);
                    if (files.length > 0) {
                      await handleFileUploadToVPS(files);
                    }
                  }}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.multiple = true;
                    input.onchange = async (e) => {
                      const files = Array.from((e.target as HTMLInputElement).files || []);
                      if (files.length > 0) {
                        await handleFileUploadToVPS(files);
                      }
                    };
                    input.click();
                  }}
                >
                  <p className="text-sm text-muted-foreground">ここにドロップ（VPS保存）</p>
                  <p className="text-xs text-muted-foreground mt-1">またはクリックして選択</p>
                </div>
              </div>
              {/* モード切替UI */}
              <div className="mb-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Switch
                    id="deep-analysis"
                    checked={deepAnalysis}
                    onCheckedChange={setDeepAnalysis}
                  />
                  <Label htmlFor="deep-analysis" className="text-sm cursor-pointer">
                    深層解析
                  </Label>
                </div>
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
                  aria-label="メッセージ入力欄"
                  aria-describedby="input-hint"
                />
                <span id="input-hint" className="sr-only">Ctrl+Enter または Cmd+Enter で送信、Shift+Enter で改行</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isStreaming || isProcessing}
                    className={`chatgpt-send-button ${isRecording ? 'recording' : ''}`}
                    title={isRecording ? '音声入力停止' : '音声入力開始'}
                    aria-label={isRecording ? '音声入力停止' : '音声入力開始'}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (isRecording) {
                          stopRecording();
                        } else {
                          startRecording();
                        }
                      }
                    }}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isRecording ? (
                      <MicOff className="w-4 h-4 text-red-500" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>
                  {/* 自動送信トグル（オプション） */}
                  {voiceTranscript && (
                    <button
                      type="button"
                      onClick={() => setAutoSendAfterVoice(!autoSendAfterVoice)}
                      className={`text-xs px-2 py-1 rounded ${autoSendAfterVoice ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                      title="音声入力後に自動送信"
                      aria-label={autoSendAfterVoice ? "自動送信を無効にする" : "自動送信を有効にする"}
                      tabIndex={0}
                    >
                      自動送信
                    </button>
                  )}
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isStreaming}
                    className={`chatgpt-send-button ${isStreaming ? "sending" : ""}`}
                    aria-label="メッセージを送信"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (!isStreaming && inputMessage.trim()) {
                          handleSendMessage();
                        }
                      }
                    }}
                  >
                    {isStreaming ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              {/* フッターメッセージは最小化（長時間使用時の視覚的負担を減らす） */}
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
                aria-label="新しいチャットを作成"
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

      {/* Feedback Modal */}
      <FeedbackModal
        open={feedbackModalOpen}
        onOpenChange={setFeedbackModalOpen}
        defaultPage="ChatRoom"
      />

      {/* Offline Status Bar */}
      <OfflineStatusBar />
    </div>
  );
}
