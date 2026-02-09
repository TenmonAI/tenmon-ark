import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  NativeScrollEvent,
  NativeSyntheticEvent,
  LayoutChangeEvent,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  listMessagesByThread,
  insertMessage,
  listArtifactsByMessage,
  insertArtifactsForMessage,
  type DbMessage,
  type DbArtifact,
} from "../../../../lib/db/repo";
import { postChat } from "../../../../lib/api/client";
import type { Candidate, Evidence } from "../../../../types/api";
import { ChatBubble } from "../../../../components/ChatBubble";
import { ComposerBar } from "../../../../components/ComposerBar";
import { LoadingGlyph } from "../../../../components/LoadingGlyph";
import { ThinkingRipple } from "../../../../components/ThinkingRipple";
import { ArtifactCard } from "../../../../components/ArtifactCard";
import { NewMessagesBanner } from "../../../../components/NewMessagesBanner";
import { JumpToBottomButton } from "../../../../components/JumpToBottomButton";
import { Toast } from "../../../../components/Toast";
import { tokens } from "../../../../lib/ui/theme";
import { MOTION } from "../../../../lib/ui/motion";
import { MC } from "../../../../lib/ui/microcopy";

type UiMessage = DbMessage & {
  localId: string;
  failed?: boolean;
};

type UiArtifacts = {
  evidence: DbArtifact[];
  candidates: DbArtifact[];
};

export default function ChatScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const threadId = params.id;

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [artifactsByMessage, setArtifactsByMessage] = useState<
    Record<string, UiArtifacts>
  >({});
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTargetId, setTypingTargetId] = useState<string | null>(null);
  const [typingFullText, setTypingFullText] = useState<string>("");

  const listRef = useRef<FlatList<UiMessage> | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const scrollLockRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Guard: invalid threadId
  if (!threadId) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Invalid thread.</Text>
      </View>
    );
  }

  const loadInitial = useCallback(async () => {
    try {
      setLoading(true);
      const dbMessages = await listMessagesByThread(threadId);
      const uiMessages: UiMessage[] = dbMessages.map((m) => ({
        ...m,
        localId: m.id,
      }));
      setMessages(uiMessages);

      // Load artifacts for assistant messages
      const nextArtifacts: Record<string, UiArtifacts> = {};
      for (const m of dbMessages) {
        if (m.role !== "assistant") continue;
        const arts = await listArtifactsByMessage(m.id);
        const evidence = arts.filter((a) => a.kind === "evidence");
        const candidates = arts.filter((a) => a.kind === "candidates");
        nextArtifacts[m.id] = { evidence, candidates };
      }
      setArtifactsByMessage(nextArtifacts);
    } catch (e) {
      console.warn("[Chat] failed to load messages", e);
    } finally {
      setLoading(false);
      // after initial load, ensure we're at bottom
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: false });
      }, 0);
    }
  }, [threadId]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const threshold = MOTION.scroll.atBottomThreshold || 72;

  const handleLayout = (e: LayoutChangeEvent) => {
    setViewportHeight(e.nativeEvent.layout.height);
  };

  const handleContentSizeChange = (_w: number, h: number) => {
    setContentHeight(h);
    if (isAtBottom && !scrollLockRef.current) {
      listRef.current?.scrollToEnd({ animated: true });
    } else if (!isAtBottom) {
      setNewMessagesCount((c) => c + 1);
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom =
      contentSize.height - (contentOffset.y + layoutMeasurement.height);
    const atBottom = distanceFromBottom < threshold;
    setIsAtBottom(atBottom);
    if (atBottom) {
      setNewMessagesCount(0);
    }
  };

  const scrollToBottom = () => {
    if (!listRef.current) return;
    if (scrollLockRef.current) return;
    scrollLockRef.current = true;
    listRef.current.scrollToEnd({ animated: true });
    setTimeout(() => {
      scrollLockRef.current = false;
    }, MOTION.scroll.jumpDuration || 220);
  };

  const startTypingAnimation = (messageId: string, fullText: string) => {
    if (!fullText) {
      setIsTyping(false);
      setTypingTargetId(null);
      return;
    }
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    setIsTyping(true);
    setTypingTargetId(messageId);
    setTypingFullText(fullText);

    let index = 0;
    const length = fullText.length;
    const baseMin = MOTION.typing.chunkMin;
    const baseMax = MOTION.typing.chunkMax;
    const boostThreshold = MOTION.typing.boostThresholdChars;
    const boostFactor =
      length > boostThreshold ? MOTION.typing.boostFactor : 1.0;

    const step = () => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const nextIndex = Math.min(length, index + 4);
          return {
            ...m,
            text: fullText.slice(0, nextIndex),
          };
        })
      );
      index += 4;
      if (index >= length || !typingTargetId || typingTargetId !== messageId) {
        setIsTyping(false);
        setTypingTargetId(null);
        return;
      }
      const baseDelay =
        baseMin +
        Math.random() * Math.max(1, baseMax - baseMin);
      const delay = baseDelay * boostFactor;
      typingTimerRef.current = setTimeout(step, delay);
    };

    typingTimerRef.current = setTimeout(step, 40);
  };

  const handleStopTyping = () => {
    if (!typingTargetId) return;
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    const id = typingTargetId;
    const full = typingFullText;
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, text: full } : m))
    );
    setIsTyping(false);
    setTypingTargetId(null);
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || isSending) return;
    setDraft("");

    const createdAt = Date.now();
    // a) user message DB + UI
    let userMsg: DbMessage;
    try {
      userMsg = await insertMessage({
        threadId,
        role: "user",
        text,
        createdAt,
        rawJson: { clientStatus: "sent" },
      });
      const uiUser: UiMessage = { ...userMsg, localId: userMsg.id };
      setMessages((prev) => [...prev, uiUser]);
    } catch (e) {
      console.warn("[Chat] failed to insert user message", e);
      return;
    }

    // c) loading assistant placeholder (UI only)
    const placeholderId = `local_assistant_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: placeholderId,
        localId: placeholderId,
        threadId,
        role: "assistant",
        text: "",
        createdAt: Date.now(),
        rawJson: null,
      },
    ]);
    setIsSending(true);

    try {
      const res = await postChat({ threadId, message: text });

      // f) assistant message DB
      const assistantFullText = res.responseText;
      const assistant = await insertMessage({
        threadId,
        role: "assistant",
        text: "", // start empty; typing will fill
        createdAt: Date.now(),
        rawJson: res.raw,
      });

      // replace placeholder with real assistant message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? { ...assistant, localId: assistant.id }
            : m
        )
      );

      // artifacts
      const evidenceArtifacts: DbArtifact[] = [];
      const candidateArtifacts: DbArtifact[] = [];
      if (res.evidence && res.evidence.length > 0) {
        const payloads = res.evidence.map((e) => ({
          kind: "evidence",
          payload: e as Evidence,
        }));
        const inserted = await insertArtifactsForMessage(
          assistant.id,
          payloads.map((p) => ({ kind: p.kind, payload: p.payload }))
        );
        evidenceArtifacts.push(...inserted.filter((a) => a.kind === "evidence"));
      }
      if (res.candidates && res.candidates.length > 0) {
        const payloads = res.candidates.map((c) => ({
          kind: "candidates",
          payload: c as Candidate,
        }));
        const inserted = await insertArtifactsForMessage(
          assistant.id,
          payloads.map((p) => ({ kind: p.kind, payload: p.payload }))
        );
        candidateArtifacts.push(...inserted.filter((a) => a.kind === "candidates"));
      }
      if (evidenceArtifacts.length || candidateArtifacts.length) {
        setArtifactsByMessage((prev) => ({
          ...prev,
          [assistant.id]: {
            evidence: evidenceArtifacts,
            candidates: candidateArtifacts,
          },
        }));
      }

      // start typing animation
      startTypingAnimation(assistant.id, assistantFullText);
    } catch (e: any) {
      console.warn("[Chat] postChat failed", e);
      // mark last user as failed & remove placeholder
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== placeholderId)
          .map((m) =>
            m.id === userMsg.id ? { ...m, failed: true } : m
          )
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleRetry = (msg: UiMessage) => {
    setDraft(msg.text);
  };

  const renderItem = ({ item }: { item: UiMessage }) => {
    const arts = artifactsByMessage[item.id];
    const isAssistant = item.role === "assistant";

    return (
      <View style={styles.messageBlock}>
        <ChatBubble role={item.role as "user" | "assistant"} text={item.text} />
        {item.failed && item.role === "user" && (
          <View style={styles.retryRow}>
            <Text style={styles.failedText}>Send failed.</Text>
            <Text
              style={styles.retryText}
              onPress={() => handleRetry(item)}
            >
              Retry
            </Text>
          </View>
        )}
        {isAssistant && isTyping && typingTargetId === item.id && (
          <View style={styles.thinkingRow}>
            <ThinkingRipple size={48} />
            <View style={{ marginLeft: tokens.spacing.sm }}>
              <LoadingGlyph size={16} />
            </View>
          </View>
        )}
        {isAssistant && arts && (
          <View style={{ marginHorizontal: tokens.spacing.md }}>
            {arts.evidence.length > 0 && (
              <ArtifactCard
                kind="evidence"
                items={arts.evidence.map((a) => {
                  const payload = JSON.parse(a.payload || "{}") as Evidence;
                  return {
                    id: a.id,
                    doc: payload.doc,
                    pdfPage: payload.pdfPage,
                    quote: payload.quote,
                  };
                })}
                onDiveIn={(prompt) => setDraft(prompt)}
              />
            )}
            {arts.candidates.length > 0 && (
              <ArtifactCard
                kind="candidates"
                items={arts.candidates.map((a) => {
                  const payload = JSON.parse(a.payload || "{}") as Candidate;
                  return {
                    id: a.id,
                    doc: payload.doc,
                    pdfPage: payload.pdfPage,
                    snippet: payload.snippet,
                    tags: payload.tags,
                  };
                })}
              />
            )}
          </View>
        )}
      </View>
    );
  };

  const keyExtractor = (item: UiMessage) => item.localId;

  const content = (
    <>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayout}
        windowSize={10}
        initialNumToRender={20}
        removeClippedSubviews={true}
      />
      <NewMessagesBanner
        count={newMessagesCount}
        onPress={scrollToBottom}
      />
      <JumpToBottomButton
        visible={!isAtBottom && messages.length > 0}
        onPress={scrollToBottom}
      />
    </>
  );

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <View style={styles.flex}>{loading ? <View style={styles.center}><Text style={styles.loadingText}>Loading…</Text></View> : content}</View>
        <ComposerBar
          value={draft}
          onChange={setDraft}
          onSend={handleSend}
          disabled={false}
          isSending={isSending}
          onStopTyping={isTyping ? handleStopTyping : undefined}
        />
        <Toast />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: tokens.colors.dark.background,
  },
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: tokens.colors.dark.textSecondary,
    fontSize: tokens.typography.size.sm,
  },
  errorText: {
    color: tokens.colors.dark.textPrimary,
    fontSize: tokens.typography.size.sm,
  },
  listContent: {
    paddingBottom: tokens.spacing.lg * 2,
  },
  messageBlock: {
    marginVertical: tokens.spacing.xs,
  },
  retryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: tokens.spacing.md,
    marginTop: tokens.spacing.xs,
    gap: tokens.spacing.xs,
  },
  failedText: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.dark.textMuted,
  },
  retryText: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.dark.accentStrong,
  },
  thinkingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: tokens.spacing.md,
    marginTop: tokens.spacing.xs,
  },
});

