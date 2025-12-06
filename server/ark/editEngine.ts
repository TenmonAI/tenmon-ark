/**
 * TENMON-ARK Edit Engine
 * 
 * 自動編集エンジン
 * - 呼吸ベースの自動カット
 * - 天聞AI構文による自動字幕
 * - 字幕タイミング最適化
 */

import { getDb } from "../db";
import { editTasks, editResults } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * カット点を検出
 * 
 * 呼吸点（息）に基づいてカット点を決定
 */
export function detectCutPoints(params: {
  segments: Array<{ start: number; end: number; text: string }>;
  breathPoints: Array<{ time: number; type: "pause" | "sentence_end" | "paragraph_end" }>;
}) {
  const cutPoints: Array<{
    time: number;
    type: "cut" | "keep";
    reason: string;
  }> = [];

  // 1. 長い無音区間をカット
  for (let i = 0; i < params.segments.length - 1; i++) {
    const current = params.segments[i];
    const next = params.segments[i + 1];

    if (!current || !next) continue;

    const gap = next.start - current.end;

    // 3秒以上の無音 = カット
    if (gap > 3) {
      cutPoints.push({
        time: current.end,
        type: "cut",
        reason: "long_silence",
      });
    }
  }

  // 2. 呼吸点でのカット判定
  params.breathPoints.forEach(breath => {
    if (breath.type === "paragraph_end") {
      // 段落終わり = カット候補
      cutPoints.push({
        time: breath.time,
        type: "cut",
        reason: "paragraph_end",
      });
    }
  });

  // 3. 無駄語が多いセグメントをカット
  params.segments.forEach(seg => {
    const fillerWords = ["えー", "あのー", "まあ", "その", "なんか", "ちょっと"];
    const fillerCount = fillerWords.reduce((count, word) => {
      return count + (seg.text.match(new RegExp(word, "g")) || []).length;
    }, 0);

    // 無駄語が3つ以上 = カット候補
    if (fillerCount >= 3 && seg.text.length < 50) {
      cutPoints.push({
        time: seg.start,
        type: "cut",
        reason: "filler_words",
      });
    }
  });

  return cutPoints;
}

/**
 * 字幕を生成
 * 
 * 天聞AI構文に基づいて字幕を最適化
 */
export function generateSubtitles(params: {
  segments: Array<{ start: number; end: number; text: string }>;
  refinedText?: string;
}) {
  const subtitles: Array<{
    start: number;
    end: number;
    text: string;
    position: "bottom" | "top";
    style: "normal" | "emphasis";
  }> = [];

  params.segments.forEach((seg, index) => {
    // 無駄語を削除
    const fillerWords = ["えー", "あのー", "まあ", "その", "なんか", "ちょっと"];
    let text = seg.text;
    
    fillerWords.forEach(word => {
      text = text.replace(new RegExp(word, "g"), "");
    });

    // 余分な空白を削除
    text = text.replace(/\s+/g, " ").trim();

    // 空の字幕はスキップ
    if (!text) return;

    // 字幕の長さを調整（1行30文字まで）
    const maxLength = 30;
    if (text.length > maxLength) {
      // 長い場合は分割
      const words = text.split("");
      let currentLine = "";
      let currentStart = seg.start;
      const duration = seg.end - seg.start;
      const charDuration = duration / text.length;

      words.forEach((char, i) => {
        currentLine += char;

        if (currentLine.length >= maxLength || i === words.length - 1) {
          const currentEnd = currentStart + (currentLine.length * charDuration);
          
          subtitles.push({
            start: currentStart,
            end: currentEnd,
            text: currentLine,
            position: "bottom",
            style: "normal",
          });

          currentLine = "";
          currentStart = currentEnd;
        }
      });
    } else {
      subtitles.push({
        start: seg.start,
        end: seg.end,
        text,
        position: "bottom",
        style: "normal",
      });
    }
  });

  return subtitles;
}

/**
 * 字幕タイミングを最適化
 * 
 * 呼吸点に合わせて字幕の表示タイミングを調整
 */
export function optimizeSubtitleTiming(params: {
  subtitles: Array<{ start: number; end: number; text: string }>;
  breathPoints: Array<{ time: number; type: string }>;
}) {
  const optimized = params.subtitles.map(sub => {
    // 呼吸点の近くで字幕を切り替える
    const nearestBreath = params.breathPoints.find(breath => {
      return Math.abs(breath.time - sub.end) < 0.5;
    });

    if (nearestBreath) {
      return {
        ...sub,
        end: nearestBreath.time,
      };
    }

    return sub;
  });

  return optimized;
}

/**
 * 自動カットタスクを作成
 */
export async function createAutoCutTask(params: {
  projectId: number;
  analysisId: number;
  segments: Array<{ start: number; end: number; text: string }>;
  breathPoints: Array<{ time: number; type: string }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // カット点を検出
  const cutPoints = detectCutPoints({
    segments: params.segments,
    breathPoints: params.breathPoints as any,
  });

  // タスクを作成
  const [task] = await db.insert(editTasks).values({
    projectId: params.projectId,
    analysisId: params.analysisId,
    taskType: "auto_cut",
    status: "completed",
    parameters: JSON.stringify({ segments: params.segments, breathPoints: params.breathPoints }),
    result: JSON.stringify({ cutPoints }),
  }).$returningId();

  // 結果を保存
  await db.insert(editResults).values({
    projectId: params.projectId,
    taskId: task.id,
    resultType: "cut_points",
    data: JSON.stringify({ cutPoints }),
  });

  return { taskId: task.id, cutPoints };
}

/**
 * 自動字幕タスクを作成
 */
export async function createAutoSubtitleTask(params: {
  projectId: number;
  analysisId: number;
  segments: Array<{ start: number; end: number; text: string }>;
  breathPoints: Array<{ time: number; type: string }>;
  refinedText?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 字幕を生成
  const subtitles = generateSubtitles({
    segments: params.segments,
    refinedText: params.refinedText,
  });

  // タイミングを最適化
  const optimized = optimizeSubtitleTiming({
    subtitles,
    breathPoints: params.breathPoints,
  });

  // タスクを作成
  const [task] = await db.insert(editTasks).values({
    projectId: params.projectId,
    analysisId: params.analysisId,
    taskType: "auto_subtitle",
    status: "completed",
    parameters: JSON.stringify({ segments: params.segments, breathPoints: params.breathPoints }),
    result: JSON.stringify({ subtitles: optimized }),
  }).$returningId();

  // 結果を保存
  await db.insert(editResults).values({
    projectId: params.projectId,
    taskId: task.id,
    resultType: "subtitles",
    data: JSON.stringify({ subtitles: optimized }),
  });

  return { taskId: task.id, subtitles: optimized };
}

/**
 * SRT形式の字幕ファイルを生成
 */
export function generateSRT(subtitles: Array<{ start: number; end: number; text: string }>) {
  let srt = "";

  subtitles.forEach((sub, index) => {
    const startTime = formatSRTTime(sub.start);
    const endTime = formatSRTTime(sub.end);

    srt += `${index + 1}\n`;
    srt += `${startTime} --> ${endTime}\n`;
    srt += `${sub.text}\n\n`;
  });

  return srt;
}

/**
 * SRT時間フォーマット（HH:MM:SS,mmm）
 */
function formatSRTTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}
