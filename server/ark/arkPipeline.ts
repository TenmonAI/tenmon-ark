/**
 * TENMON-ARK Phase A: 統合フローパイプライン
 * 
 * video → whisper → kotodamaAnalysis → breathCutEngine → kotodamaSubtitleEngine → editResult
 * 
 * 【フロー】
 * 1. INPUT層：動画アップロード → Whisper文字起こし
 * 2. ANALYSIS層：言灵解析（五十音・火水・ミナカ）
 * 3. EDIT層：呼吸カット点検出 → 字幕生成
 * 4. OUTPUT層：編集結果をDBに保存
 */

import { transcribeAudio } from '../_core/voiceTranscription';
import { analyzeKotodama } from './kotodamaEngine';
import { executeBreathCutEngine, type CutPoint, type TranscriptionSegment } from './breathCutEngine';
import { executeKotodamaSubtitleEngine, type Subtitle, convertToSRT, convertToVTT } from './kotodamaSubtitleEngine';
import { getDb } from '../db';
import { videoProjects, transcriptions, kotodamaAnalysis, editResults } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export interface ArkPipelineInput {
  projectId: number;
  videoFileUrl: string;
  audioFileUrl: string;
}

export interface ArkPipelineOutput {
  projectId: number;
  transcriptionId: number;
  kotodamaAnalysisId: number;
  editResultId: number;
  cutPoints: CutPoint[];
  subtitles: Subtitle[];
  srtContent: string;
  vttContent: string;
}

/**
 * TENMON-ARK Phase A 統合パイプライン
 * 
 * @param input パイプライン入力
 * @returns パイプライン出力
 */
export async function executeArkPipeline(input: ArkPipelineInput): Promise<ArkPipelineOutput> {
  const db = await getDb();
  if (!db) {
    throw new Error('[ARK Pipeline] Database not available');
  }

  console.log(`[ARK Pipeline] Starting pipeline for project ${input.projectId}`);

  // ========================================
  // 1. INPUT層：Whisper文字起こし
  // ========================================
  console.log('[ARK Pipeline] Step 1: Whisper transcription');
  
  const whisperResult = await transcribeAudio({
    audioUrl: input.audioFileUrl,
    language: 'ja'
  });

  // エラーチェック
  if ('error' in whisperResult) {
    throw new Error(`[ARK Pipeline] Whisper transcription failed: ${whisperResult.error}`);
  }

  // 文字起こし結果をDBに保存
  const [transcriptionRecord] = await db.insert(transcriptions).values({
    projectId: input.projectId,
    rawText: whisperResult.text,
    segments: JSON.stringify(whisperResult.segments || []),
    language: whisperResult.language || 'ja'
  }).$returningId();

  if (!transcriptionRecord) {
    throw new Error('[ARK Pipeline] Failed to save transcription');
  }

  console.log(`[ARK Pipeline] Transcription saved: ID ${transcriptionRecord.id}`);

  // ========================================
  // 2. ANALYSIS層：言灵解析
  // ========================================
  console.log('[ARK Pipeline] Step 2: Kotodama analysis');

  const transcriptionSegments: TranscriptionSegment[] = whisperResult.segments?.map((seg: any) => ({
    start: seg.start,
    end: seg.end,
    text: seg.text
  })) || [];

  const kotodamaResult = await analyzeKotodama({
    projectId: input.projectId,
    transcriptionId: transcriptionRecord.id,
    text: whisperResult.text,
    segments: transcriptionSegments
  });

  // 言灵解析結果はanalyzeKotodama内でDBに保存済み
  const kotodamaRecord = { id: kotodamaResult.analysisId };

  if (!kotodamaRecord) {
    throw new Error('[ARK Pipeline] Failed to save kotodama analysis');
  }

  console.log(`[ARK Pipeline] Kotodama analysis saved: ID ${kotodamaRecord.id}`);

  // ========================================
  // 3. EDIT層：呼吸カット点検出
  // ========================================
  console.log('[ARK Pipeline] Step 3: Breath-Cut Engine');

  const kotodamaSegments = transcriptionSegments.map((seg, index) => ({
    start: seg.start,
    end: seg.end,
    text: seg.text,
    hiMizu: (index % 2 === 0 ? 'hi' : 'mizu') as 'hi' | 'mizu', // 仮の火水判定
    aion: 'A', // 仮の五十音階層
    minaka: index === Math.floor(transcriptionSegments.length / 2) // 中央をミナカとする
  }));

  const cutPoints = executeBreathCutEngine(transcriptionSegments, kotodamaSegments);

  console.log(`[ARK Pipeline] Cut points detected: ${cutPoints.length} points`);

  // ========================================
  // 4. EDIT層：字幕生成
  // ========================================
  console.log('[ARK Pipeline] Step 4: Kotodama Subtitle Engine');

  const subtitles = executeKotodamaSubtitleEngine(kotodamaSegments, cutPoints);

  console.log(`[ARK Pipeline] Subtitles generated: ${subtitles.length} subtitles`);

  // ========================================
  // 5. OUTPUT層：編集結果をDBに保存
  // ========================================
  console.log('[ARK Pipeline] Step 5: Save edit results');

  const srtContent = convertToSRT(subtitles);
  const vttContent = convertToVTT(subtitles);

  // カット点を保存
  await db.insert(editResults).values({
    projectId: input.projectId,
    taskId: 0, // 仮のtaskId（後で実装）
    resultType: 'cut_points',
    data: JSON.stringify(cutPoints)
  });

  // 字幕を保存
  const [editResultRecord] = await db.insert(editResults).values({
    projectId: input.projectId,
    taskId: 0, // 仮のtaskId（後で実装）
    resultType: 'subtitles',
    data: JSON.stringify({ subtitles, srtContent, vttContent })
  }).$returningId();

  if (!editResultRecord) {
    throw new Error('[ARK Pipeline] Failed to save edit result');
  }

  console.log(`[ARK Pipeline] Edit result saved: ID ${editResultRecord.id}`);

  // プロジェクトのステータスを更新
  await db.update(videoProjects)
    .set({
      status: 'completed',
      updatedAt: new Date()
    })
    .where(eq(videoProjects.id, input.projectId));

  console.log(`[ARK Pipeline] Pipeline completed for project ${input.projectId}`);

  return {
    projectId: input.projectId,
    transcriptionId: transcriptionRecord.id,
    kotodamaAnalysisId: kotodamaRecord.id,
    editResultId: editResultRecord.id,
    cutPoints,
    subtitles,
    srtContent,
    vttContent
  };
}

/**
 * パイプラインのエラーハンドリング
 * 
 * @param projectId プロジェクトID
 * @param error エラーオブジェクト
 */
export async function handlePipelineError(projectId: number, error: Error): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error('[ARK Pipeline] Database not available for error handling');
    return;
  }

  console.error(`[ARK Pipeline] Error in project ${projectId}:`, error);

  // プロジェクトのステータスを失敗に更新
  await db.update(videoProjects)
    .set({
      status: 'failed',
      updatedAt: new Date()
    })
    .where(eq(videoProjects.id, projectId));
}
