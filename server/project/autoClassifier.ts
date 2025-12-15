/**
 * ============================================================
 *  PROJECT AUTO CLASSIFIER — プロジェクト自動分類システム
 * ============================================================
 * 
 * 設計思想:
 * - ユーザーに分類させない
 * - 分類は常に後から変更可能
 * - 分類ミスは致命傷にならない
 * - 記憶そのものは分断しない
 * 
 * プロジェクト = UIと作業動線のための「棚」
 * Kokūzō / Reishō / Seed は 常に横断的に存在
 * ============================================================
 */

import { getDb } from "../db";
import { projects, chatRooms, chatMessages } from "../../drizzle/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { calculateSimilarity } from "../synapticMemory";
import { getRecentChatMessages } from "../chat/chatDb";
import { getOrCreateDefaultProject } from "../routers/projectRouter";
import { TRPCError } from "@trpc/server";

export interface UploadedFile {
  fileName: string;
  mimeType: string;
  fileType?: string;
}

export interface ClassifyInput {
  text?: string;
  files?: UploadedFile[];
  conversationHistory?: string[];
  userId: number;
  conversationId?: number;
  roomId?: number;
}

export interface ClassificationResult {
  projectId: number;
  confidence: number; // 0.0 - 1.0
  reason: string; // ログ用（UI非表示）
  source: "existing" | "pattern" | "new";
}

/**
 * 用途構文パターン（Seed由来、将来的には動的に拡張可能）
 */
const PROJECT_PATTERNS: Record<string, { projectType: string; keywords: string[] }> = {
  trade: {
    projectType: "Trade",
    keywords: ["XAUUSD", "エントリー", "ATR", "ロット", "ポジション", "損切り", "利確", "チャート", "トレード", "FX", "為替"],
  },
  dev: {
    projectType: "Dev",
    keywords: ["設計", "実装", "API", "Cursor", "コード", "関数", "クラス", "バグ", "デバッグ", "テスト", "リリース"],
  },
  research: {
    projectType: "Research",
    keywords: ["法華経", "言霊", "天津金木", "五十音", "構文", "研究", "分析", "考察", "文献", "資料"],
  },
  business: {
    projectType: "Business",
    keywords: ["企画", "LP", "価格", "プラン", "マーケティング", "営業", "顧客", "売上", "収益", "戦略"],
  },
};

/**
 * テキストから用途構文を検出
 */
function detectProjectTypeFromText(text: string): { type: string; confidence: number } | null {
  const lowerText = text.toLowerCase();
  let maxConfidence = 0;
  let detectedType: string | null = null;

  for (const [key, pattern] of Object.entries(PROJECT_PATTERNS)) {
    const matchCount = pattern.keywords.filter((keyword) =>
      lowerText.includes(keyword.toLowerCase())
    ).length;
    
    if (matchCount > 0) {
      const confidence = Math.min(matchCount / pattern.keywords.length, 1.0);
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        detectedType = pattern.projectType;
      }
    }
  }

  if (detectedType && maxConfidence > 0.3) {
    return { type: detectedType, confidence: maxConfidence };
  }

  return null;
}

/**
 * 既存プロジェクトとの類似度を計算
 */
async function calculateProjectSimilarity(
  text: string,
  userId: number,
  recentProjectIds: number[]
): Promise<Array<{ projectId: number; similarity: number; seedCount: number }>> {
  const db = await getDb();
  if (!db) return [];

  const results: Array<{ projectId: number; similarity: number; seedCount: number }> = [];

  // 直近アクティブなプロジェクトを取得
  let recentProjects;
  if (recentProjectIds.length > 0) {
    // recentProjectIds に含まれるプロジェクトのみ
    recentProjects = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.userId, userId),
          inArray(projects.id, recentProjectIds)
        )
      )
      .limit(20);
  } else {
    // すべてのプロジェクトを取得
    recentProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt))
      .limit(20);
  }

  // TODO: Kokūzō Seed の出現率を計算
  // 現時点では簡易的にプロジェクト名とテキストの類似度を使用
  for (const project of recentProjects) {
    const similarity = calculateSimilarity(text, project.name);
    
    // プロジェクトに紐づく会話のメッセージを取得して類似度を計算
    const projectRooms = await db
      .select()
      .from(chatRooms)
      .where(
        and(
          eq(chatRooms.userId, userId),
          eq(chatRooms.projectId, project.id)
        )
      )
      .limit(10);

    let maxMessageSimilarity = 0;
    for (const room of projectRooms) {
      const messages = await getRecentChatMessages(room.id, 5);
      for (const msg of messages) {
        const msgSimilarity = calculateSimilarity(text, msg.content);
        maxMessageSimilarity = Math.max(maxMessageSimilarity, msgSimilarity);
      }
    }

    // プロジェクト名とメッセージの類似度の平均
    const avgSimilarity = (similarity + maxMessageSimilarity) / 2;

    if (avgSimilarity > 0.1) {
      results.push({
        projectId: project.id,
        similarity: avgSimilarity,
        seedCount: 0, // TODO: Kokūzō Seed の出現率を計算
      });
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity);
}

/**
 * 直近アクティブなプロジェクトIDを取得
 */
async function getRecentActiveProjects(userId: number, limit: number = 5): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];

  const recentRooms = await db
    .select({ projectId: chatRooms.projectId })
    .from(chatRooms)
    .where(eq(chatRooms.userId, userId))
    .orderBy(desc(chatRooms.updatedAt))
    .limit(limit * 2); // 重複を考慮して多めに取得

  const projectIds = new Set<number>();
  for (const room of recentRooms) {
    if (room.projectId) {
      projectIds.add(room.projectId);
      if (projectIds.size >= limit) break;
    }
  }

  return Array.from(projectIds);
}

/**
 * 新規プロジェクト名を自動生成
 */
function generateProjectName(projectType: string, context: string): string {
  // 簡易的な命名ロジック
  const typeMap: Record<string, string> = {
    Trade: "Trade",
    Dev: "Dev",
    Research: "Research",
    Business: "Business",
  };

  const baseName = typeMap[projectType] || "Project";
  
  // コンテキストからキーワードを抽出（簡易版）
  const keywords = context.split(/\s+/).filter((w) => w.length > 3).slice(0, 2);
  const keyword = keywords.length > 0 ? keywords[0] : "";

  return keyword ? `${baseName} - ${keyword}` : baseName;
}

/**
 * プロジェクト自動分類（中核ロジック）
 */
export async function autoClassifyProject(input: ClassifyInput): Promise<ClassificationResult> {
  const { text = "", files = [], conversationHistory = [], userId, conversationId, roomId } = input;

  // 既存のルームで手動固定されている場合は自動分類をスキップ
  if (roomId) {
    const db = await getDb();
    if (db) {
      const room = await db
        .select()
        .from(chatRooms)
        .where(
          and(
            eq(chatRooms.id, roomId),
            eq(chatRooms.userId, userId)
          )
        )
        .limit(1);

      if (room.length > 0 && room[0].projectLocked === "manual") {
        // 手動固定されている場合は既存の projectId を返す
        const defaultProjectId = room[0].projectId || await getOrCreateDefaultProject(userId);
        return {
          projectId: defaultProjectId,
          confidence: 1.0,
          reason: "Project manually locked for this room",
          source: "existing",
        };
      }
    }
  }

  // 入力テキストを結合
  const combinedText = [
    text,
    ...files.map((f) => f.fileName),
    ...conversationHistory,
  ].join(" ");

  if (!combinedText.trim()) {
    // テキストがない場合はデフォルトプロジェクト
    const defaultProjectId = await getOrCreateDefaultProject(userId);
    return {
      projectId: defaultProjectId,
      confidence: 0.5,
      reason: "No text input, using default project",
      source: "existing",
    };
  }

  // ① 既存プロジェクト優先一致
  const recentProjectIds = await getRecentActiveProjects(userId, 5);
  const projectSimilarities = await calculateProjectSimilarity(
    combinedText,
    userId,
    recentProjectIds
  );

  // 類似度が高いプロジェクトがあれば使用
  if (projectSimilarities.length > 0 && projectSimilarities[0].similarity > 0.82) {
    const result: ClassificationResult = {
      projectId: projectSimilarities[0].projectId,
      confidence: projectSimilarities[0].similarity,
      reason: `Matched existing project (similarity: ${projectSimilarities[0].similarity.toFixed(2)})`,
      source: "existing",
    };
    
    // 仮Projectとして扱う（confidence < 0.6）
    if (result.confidence < 0.6) {
      // プロジェクトを仮Projectとしてマーク
      const db = await getDb();
      if (db) {
        await db
          .update(projects)
          .set({ isTemporaryProject: 1 })
          .where(eq(projects.id, result.projectId));
      }
    }
    
    return result;
  }

  // ② 明確な用途構文の検出
  const detectedType = detectProjectTypeFromText(combinedText);
  if (detectedType && detectedType.confidence > 0.5) {
    // 既存の同タイププロジェクトを検索
    const db = await getDb();
    if (db) {
      const existingProjects = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.userId, userId),
            // プロジェクト名にタイプが含まれる
            // TODO: より高度な検索（メタデータ、タグなど）
          )
        )
        .limit(10);

      // プロジェクト名にタイプが含まれるものを優先
      const matchingProject = existingProjects.find((p) =>
        p.name.includes(detectedType.type)
      );

      if (matchingProject) {
        return {
          projectId: matchingProject.id,
          confidence: detectedType.confidence * 0.9, // パターンマッチは少し低め
          reason: `Pattern match: ${detectedType.type} (confidence: ${detectedType.confidence.toFixed(2)})`,
          source: "pattern",
        };
      }

      // 同タイプのプロジェクトがない場合は新規作成
      const newProjectName = generateProjectName(detectedType.type, combinedText);
      const [newProject] = await db
        .insert(projects)
        .values({
          userId,
          name: newProjectName,
        });

      return {
        projectId: newProject.insertId,
        confidence: detectedType.confidence * 0.8,
        reason: `Created new project: ${newProjectName} (type: ${detectedType.type})`,
        source: "new",
      };
    }
  }

  // ③ 新規プロジェクト生成（最後の手段）
  // 類似度が低い場合は、デフォルトプロジェクトを使用
  if (projectSimilarities.length > 0 && projectSimilarities[0].similarity > 0.5) {
    return {
      projectId: projectSimilarities[0].projectId,
      confidence: projectSimilarities[0].similarity,
      reason: `Using best match (similarity: ${projectSimilarities[0].similarity.toFixed(2)})`,
      source: "existing",
    };
  }

  // デフォルトプロジェクトにフォールバック
  const defaultProjectId = await getOrCreateDefaultProject(userId);
  return {
    projectId: defaultProjectId,
    confidence: 0.5,
    reason: "No strong match found, using default project",
    source: "existing",
  };
}

