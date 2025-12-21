// PHASE R-5: Short-Term Memory (STM) - 会話履歴管理

/**
 * PHASE R-5: 会話の1ターン（ユーザーまたはアシスタントの発話）
 */
export type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
  timestamp: number; // Unix timestamp (milliseconds)
};

/**
 * PHASE R-5: 会話履歴の最大保持数（5ラリー = 10メッセージ）
 */
const MAX_CONVERSATION_TURNS = 10;

/**
 * PHASE R-5: 会話履歴に新しいターンを追加
 * 
 * 最大保持数を超えた場合、古いターンを削除する（FIFO）
 * 
 * @param history 現在の会話履歴
 * @param role 発話者の役割（"user" | "assistant"）
 * @param content 発話内容
 * @returns 更新された会話履歴
 */
export function addConversationTurn(
  history: ConversationTurn[],
  role: "user" | "assistant",
  content: string
): ConversationTurn[] {
  const newTurn: ConversationTurn = {
    role,
    content,
    timestamp: Date.now(),
  };

  const updated = [...history, newTurn];

  // 最大保持数を超えた場合、古いターンを削除
  if (updated.length > MAX_CONVERSATION_TURNS) {
    return updated.slice(-MAX_CONVERSATION_TURNS);
  }

  return updated;
}

/**
 * PHASE R-5: 会話履歴から直近Nラリーを取得
 * 
 * @param history 会話履歴
 * @param rounds 取得するラリー数（デフォルト: 5）
 * @returns 直近Nラリーの会話履歴
 */
export function getRecentConversationRounds(
  history: ConversationTurn[],
  rounds: number = 5
): ConversationTurn[] {
  // 1ラリー = 2ターン（user + assistant）
  const turnsToGet = rounds * 2;
  return history.slice(-turnsToGet);
}

/**
 * PHASE R-5: 会話履歴をクリア
 * 
 * @returns 空の会話履歴
 */
export function clearConversationHistory(): ConversationTurn[] {
  return [];
}

/**
 * PHASE R-5: 会話履歴を文字列形式で取得（プロンプト用）
 * 
 * @param history 会話履歴
 * @param maxRounds 最大ラリー数（デフォルト: 5）
 * @returns 会話履歴の文字列表現
 */
export function formatConversationHistory(
  history: ConversationTurn[],
  maxRounds: number = 5
): string {
  const recent = getRecentConversationRounds(history, maxRounds);
  
  if (recent.length === 0) {
    return "";
  }

  return recent
    .map((turn) => {
      const roleLabel = turn.role === "user" ? "User" : "Assistant";
      return `${roleLabel}: ${turn.content}`;
    })
    .join("\n\n");
}

/**
 * PHASE R-5: 会話履歴の統計情報を取得
 */
export type ConversationStats = {
  totalTurns: number;
  userTurns: number;
  assistantTurns: number;
  rounds: number; // ラリー数（user + assistant のペア数）
  oldestTimestamp: number | null;
  newestTimestamp: number | null;
};

export function getConversationStats(history: ConversationTurn[]): ConversationStats {
  if (history.length === 0) {
    return {
      totalTurns: 0,
      userTurns: 0,
      assistantTurns: 0,
      rounds: 0,
      oldestTimestamp: null,
      newestTimestamp: null,
    };
  }

  const userTurns = history.filter((t) => t.role === "user").length;
  const assistantTurns = history.filter((t) => t.role === "assistant").length;
  const rounds = Math.floor(history.length / 2);

  return {
    totalTurns: history.length,
    userTurns,
    assistantTurns,
    rounds,
    oldestTimestamp: history[0]?.timestamp ?? null,
    newestTimestamp: history[history.length - 1]?.timestamp ?? null,
  };
}

