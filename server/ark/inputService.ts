/**
 * TENMON-ARK INPUT Service
 * 
 * 動画取得 → 音声抽出 → 文字起こし → 言灵整形
 */

import { getDb } from "../db";
import { videoProjects, videoFiles, transcriptions, processingQueue } from "../../drizzle/schema";
import { storagePut } from "../storage";
import { transcribeAudio } from "../_core/voiceTranscription";
import { eq } from "drizzle-orm";

/**
 * 動画プロジェクトを作成
 */
export async function createVideoProject(params: {
  userId: number;
  title: string;
  description?: string;
  sourceType: "upload" | "youtube" | "vimeo";
  sourceUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [project] = await db.insert(videoProjects).values({
    userId: params.userId,
    title: params.title,
    description: params.description,
    sourceType: params.sourceType,
    sourceUrl: params.sourceUrl,
    status: "pending",
  }).$returningId();

  return project.id;
}

/**
 * 動画ファイルをアップロード
 */
export async function uploadVideoFile(params: {
  projectId: number;
  fileBuffer: Buffer;
  mimeType: string;
  fileName: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // S3にアップロード
  const fileKey = `ark/videos/${params.projectId}/${Date.now()}-${params.fileName}`;
  const { url } = await storagePut(fileKey, params.fileBuffer, params.mimeType);

  // DBに保存
  const [file] = await db.insert(videoFiles).values({
    projectId: params.projectId,
    fileType: "original",
    s3Key: fileKey,
    s3Url: url,
    mimeType: params.mimeType,
    fileSize: params.fileBuffer.length,
  }).$returningId();

  return { fileId: file.id, url };
}

/**
 * 音声を抽出（FFmpegを使用）
 * 
 * Note: FFmpegはサーバー環境にインストールされている前提
 */
export async function extractAudio(params: {
  projectId: number;
  videoS3Url: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // TODO: FFmpegで音声抽出
  // 1. S3から動画をダウンロード
  // 2. FFmpegで音声抽出（MP3）
  // 3. S3にアップロード
  // 4. DBに保存

  // 仮実装（実際のFFmpeg処理は後で実装）
  const audioKey = `ark/audio/${params.projectId}/${Date.now()}.mp3`;
  const audioUrl = params.videoS3Url; // 仮

  const [file] = await db.insert(videoFiles).values({
    projectId: params.projectId,
    fileType: "audio",
    s3Key: audioKey,
    s3Url: audioUrl,
    mimeType: "audio/mp3",
  }).$returningId();

  return { audioFileId: file.id, audioUrl };
}

/**
 * 音声を文字起こし（Whisper）
 */
export async function transcribeVideo(params: {
  projectId: number;
  audioUrl: string;
  language?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Whisper APIで文字起こし
  const result = await transcribeAudio({
    audioUrl: params.audioUrl,
    language: params.language,
  });

  // エラーチェック
  if ('error' in result) {
    throw new Error(`Transcription failed: ${result.error}`);
  }

  // セグメントを整形
  const segments = result.segments?.map((seg: any) => ({
    start: seg.start,
    end: seg.end,
    text: seg.text,
  })) || [];

  // DBに保存
  const [transcription] = await db.insert(transcriptions).values({
    projectId: params.projectId,
    language: result.language || params.language || "ja",
    rawText: result.text,
    segments: JSON.stringify(segments),
  }).$returningId();

  return { transcriptionId: transcription.id, text: result.text, segments };
}

/**
 * 言灵整形（無駄語削除・構文区切り）
 */
export async function refineTranscription(params: {
  transcriptionId: number;
  rawText: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 無駄語削除（「えー」「あのー」「まあ」など）
  const fillerWords = ["えー", "あのー", "まあ", "その", "なんか", "ちょっと"];
  let refined = params.rawText;
  
  fillerWords.forEach(word => {
    refined = refined.replace(new RegExp(word, "g"), "");
  });

  // 余分な空白を削除
  refined = refined.replace(/\s+/g, " ").trim();

  // DBを更新
  await db.update(transcriptions)
    .set({ refinedText: refined })
    .where(eq(transcriptions.id, params.transcriptionId));

  return { refinedText: refined };
}

/**
 * 処理キューにタスクを追加
 */
export async function enqueueTask(params: {
  projectId: number;
  queueType: "transcription" | "analysis" | "edit" | "render";
  priority?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [task] = await db.insert(processingQueue).values({
    projectId: params.projectId,
    queueType: params.queueType,
    priority: params.priority || 5,
    status: "pending",
  }).$returningId();

  return task.id;
}

/**
 * 処理キューのタスクを取得
 */
export async function dequeueTask(queueType: "transcription" | "analysis" | "edit" | "render") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 優先度が高く、ステータスがpendingのタスクを取得
  const tasks = await db.select()
    .from(processingQueue)
    .where(eq(processingQueue.queueType, queueType))
    .orderBy(processingQueue.priority)
    .limit(1);

  if (tasks.length === 0) return null;

  const task = tasks[0];

  // ステータスをprocessingに更新
  await db.update(processingQueue)
    .set({ status: "processing", startedAt: new Date() })
    .where(eq(processingQueue.id, task.id));

  return task;
}

/**
 * 処理キューのタスクを完了
 */
export async function completeTask(taskId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(processingQueue)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(processingQueue.id, taskId));
}

/**
 * 処理キューのタスクを失敗
 */
export async function failTask(taskId: number, errorMessage: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [task] = await db.select()
    .from(processingQueue)
    .where(eq(processingQueue.id, taskId))
    .limit(1);

  if (!task) return;

  const retryCount = task.retryCount + 1;

  if (retryCount < task.maxRetries) {
    // リトライ
    await db.update(processingQueue)
      .set({ status: "pending", retryCount, errorMessage })
      .where(eq(processingQueue.id, taskId));
  } else {
    // 最大リトライ回数を超えたので失敗
    await db.update(processingQueue)
      .set({ status: "failed", retryCount, errorMessage, completedAt: new Date() })
      .where(eq(processingQueue.id, taskId));
  }
}
