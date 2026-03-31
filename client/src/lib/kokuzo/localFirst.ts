/**
 * ============================================================
 *  LOCAL-FIRST CONVERSATION LOADING
 * ============================================================
 * 
 * 会話ロードを local → offline buffer → global の順に解決
 * ChatRoom はネット状態を参照しない
 * ============================================================
 */

// Temporarily stub server imports for client-only build
// import { IndexedDBEventLogStore } from "../../../server/kokuzo/offline/eventLogStore";

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
    console.log("[LocalFirst] Stubbed - offline functionality disabled");
    
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

