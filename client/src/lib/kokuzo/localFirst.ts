/**
 * ============================================================
 *  LOCAL-FIRST CONVERSATION LOADING
 * ============================================================
 * 
 * 会話ロードを local → offline buffer → global の順に解決
 * ChatRoom はネット状態を参照しない
 * ============================================================
 */

import { IndexedDBEventLogStore } from "../../../server/kokuzo/offline/eventLogStore";

export interface ConversationMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface ConversationData {
  id: number;
  title: string;
  messages: ConversationMessage[];
}

/**
 * Local-first で会話を取得
 * 優先順位: Local Kokūzō → Offline Sync Buffer → Global
 */
export async function getConversationLocalFirst(params: {
  conversationId: number;
  globalMessages?: ConversationMessage[]; // Globalから取得したメッセージ（オプション）
}): Promise<ConversationData | null> {
  const { conversationId, globalMessages } = params;

  try {
    // 1. Local Kokūzō から取得
    const eventLogStore = new IndexedDBEventLogStore();
    const events = await eventLogStore.replay(0);
    
    // CHAT_MESSAGE_ADDED イベントをフィルタ
    const chatEvents = events.filter(
      (e) => e.data?.type === "CHAT_MESSAGE_ADDED" && e.data?.payload?.roomId === conversationId
    );

    if (chatEvents.length > 0) {
      // Local から会話を構築
      const localMessages: ConversationMessage[] = chatEvents.map((e) => ({
        id: e.data.payload.messageId || 0,
        role: e.data.payload.role,
        content: e.data.payload.content,
        createdAt: new Date(e.timestamp),
      }));

      // Local と Global をマージ（Local優先）
      const mergedMessages = globalMessages 
        ? [...localMessages, ...globalMessages.filter(gm => !localMessages.find(lm => lm.id === gm.id))]
        : localMessages;

      return {
        id: conversationId,
        title: `会話 ${conversationId}`,
        messages: mergedMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
      };
    }

    // 2. Offline Sync Buffer から取得（TODO: 実装）
    // const syncBuffer = await getOfflineSyncBuffer(conversationId);
    // if (syncBuffer) {
    //   return syncBuffer;
    // }

    // 3. Global から取得（フォールバック）
    if (globalMessages && globalMessages.length > 0) {
      return {
        id: conversationId,
        title: `会話 ${conversationId}`,
        messages: globalMessages,
      };
    }

    // すべて失敗した場合は null を返す（EmptyState に落とす）
    return null;
  } catch (error) {
    // エラーは無視（EmptyState に落とすだけ）
    console.warn("[LocalFirst] Failed to get conversation:", error);
    return null;
  }
}

export default {
  getConversationLocalFirst,
};

