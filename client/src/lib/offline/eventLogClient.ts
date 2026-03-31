/**
 * ============================================================
 *  EVENT LOG CLIENT — クライアント側 Event Log ラッパー
 * ============================================================
 * 
 * ChatRoom から Event Log を簡単に使えるようにする
 * ============================================================
 */

// Temporarily stub server imports for client-only build
// import { IndexedDBEventLogStore } from "../../../server/kokuzo/offline/eventLogStore";
// import { LocalKokuzoKernel } from "../../../server/kokuzo/offline/localKokuzoKernel";

let eventLogStore: any | null = null;
let localKokuzo: any | null = null;

/**
 * Event Log Store を取得（シングルトン）
 */
function getEventLogStore() {
  console.warn("[EventLog] Stubbed - offline functionality disabled");
  return null;
}

/**
 * Local Kokūzō Kernel を取得（シングルトン）
 */
function getLocalKokuzo(): any {
  console.warn("[EventLog] Stubbed - offline functionality disabled");
  return null;
}

/**
 * チャットメッセージ追加イベントを記録
 */
export async function logChatMessageAdded(payload: {
  roomId: number;
  messageId: number;
  role: "user" | "assistant";
  content: string;
  projectId?: number | null; // プロジェクトID（メタデータ）
}): Promise<void> {
  // Stubbed - offline functionality disabled
  console.log("[EventLog] Stubbed logChatMessageAdded");
}

/**
 * ファイルアップロードイベントを記録
 */
export async function logFileUploaded(payload: {
  fileId: number;
  conversationId?: number;
  fileName: string;
}): Promise<void> {
  // Stubbed - offline functionality disabled
  console.log("[EventLog] Stubbed logFileUploaded");
}

/**
 * 学習ON/OFF切替イベントを記録
 */
export async function logLearningToggled(payload: {
  fileId: number;
  enabled: boolean;
  projectId?: number | null; // プロジェクトID（メタデータ）
}): Promise<void> {
  // Stubbed - offline functionality disabled
  console.log("[EventLog] Stubbed logLearningToggled");
}

export default {
  logChatMessageAdded,
  logFileUploaded,
  logLearningToggled,
};

