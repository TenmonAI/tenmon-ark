/**
 * ============================================================
 *  EVENT LOG CLIENT — クライアント側 Event Log ラッパー
 * ============================================================
 * 
 * ChatRoom から Event Log を簡単に使えるようにする
 * ============================================================
 */

import { IndexedDBEventLogStore } from "../../../server/kokuzo/offline/eventLogStore";
import { LocalKokuzoKernel } from "../../../server/kokuzo/offline/localKokuzoKernel";

let eventLogStore: IndexedDBEventLogStore | null = null;
let localKokuzo: LocalKokuzoKernel | null = null;

/**
 * Event Log Store を取得（シングルトン）
 */
function getEventLogStore() {
  if (!eventLogStore) {
    eventLogStore = new IndexedDBEventLogStore();
  }
  return eventLogStore;
}

/**
 * Local Kokūzō Kernel を取得（シングルトン）
 */
function getLocalKokuzo(): LocalKokuzoKernel {
  if (!localKokuzo) {
    localKokuzo = new LocalKokuzoKernel();
  }
  return localKokuzo;
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
  try {
    const kokuzo = getLocalKokuzo();
    await kokuzo.appendEvent({
      type: "CHAT_MESSAGE_ADDED",
      conversationId: payload.roomId,
      payload: {
        ...payload,
        projectId: payload.projectId || null,
      },
    });
  } catch (error) {
    console.warn("[EventLog] Failed to log chat message:", error);
    // エラーは無視（オフラインでも動作を継続）
  }
}

/**
 * ファイルアップロードイベントを記録
 */
export async function logFileUploaded(payload: {
  fileId: number;
  conversationId?: number;
  fileName: string;
}): Promise<void> {
  try {
    const kokuzo = getLocalKokuzo();
    await kokuzo.appendEvent({
      type: "FILE_UPLOADED",
      conversationId: payload.conversationId,
      fileId: payload.fileId,
      payload,
    });
  } catch (error) {
    console.warn("[EventLog] Failed to log file upload:", error);
    // エラーは無視（オフラインでも動作を継続）
  }
}

/**
 * 学習ON/OFF切替イベントを記録
 */
export async function logLearningToggled(payload: {
  fileId: number;
  enabled: boolean;
  projectId?: number | null; // プロジェクトID（メタデータ）
}): Promise<void> {
  try {
    const kokuzo = getLocalKokuzo();
    await kokuzo.appendEvent({
      type: "LEARNING_TOGGLED",
      fileId: payload.fileId,
      enabled: payload.enabled,
      payload: {
        projectId: payload.projectId || null,
      },
    });
  } catch (error) {
    console.warn("[EventLog] Failed to log learning toggle:", error);
    // エラーは無視（オフラインでも動作を継続）
  }
}

export default {
  logChatMessageAdded,
  logFileUploaded,
  logLearningToggled,
};

