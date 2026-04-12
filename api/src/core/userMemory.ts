/**
 * userMemory.ts — 天聞アーク ユーザー別記憶・成長保持
 * 
 * 各ユーザーの端末から、ユーザーに合わせた成長と記憶を保持:
 * - ユーザープロファイル管理
 * - 長期記憶 (洞察・好み・文脈・マイルストーン・訂正)
 * - 記憶の重要度と減衰
 * - ユーザー別成長レベル
 */

import { dbPrepare } from "../db/index.js";

// ============================================================
// 1. 型定義
// ============================================================

export type UserProfile = {
  userId: string;
  displayName: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  totalTurns: number;
  growthLevel: number;
  metaJson: string;
};

export type UserMemoryEntry = {
  id?: number;
  userId: string;
  memoryType: "insight" | "preference" | "context" | "milestone" | "correction";
  content: string;
  importance: number;
  decayRate: number;
  lastAccessedAt: string;
  createdAt: string;
};

// ============================================================
// 2. ユーザープロファイル管理
// ============================================================

let _upsertProfileStmt: any = null;
let _getProfileStmt: any = null;
let _incrementTurnsStmt: any = null;
let _updateGrowthLevelStmt: any = null;

function ensureProfileStmts() {
  try {
    if (!_upsertProfileStmt) {
      _upsertProfileStmt = dbPrepare(
        "consciousness",
        `INSERT INTO user_profiles (userId, displayName, firstSeenAt, lastSeenAt, totalTurns, growthLevel, metaJson)
         VALUES (?, ?, datetime('now'), datetime('now'), 0, 0, '{}')
         ON CONFLICT(userId) DO UPDATE SET lastSeenAt = datetime('now')`
      );
    }
    if (!_getProfileStmt) {
      _getProfileStmt = dbPrepare(
        "consciousness",
        `SELECT userId, displayName, firstSeenAt, lastSeenAt, totalTurns, growthLevel, metaJson
         FROM user_profiles WHERE userId = ?`
      );
    }
    if (!_incrementTurnsStmt) {
      _incrementTurnsStmt = dbPrepare(
        "consciousness",
        `UPDATE user_profiles SET totalTurns = totalTurns + 1, lastSeenAt = datetime('now') WHERE userId = ?`
      );
    }
    if (!_updateGrowthLevelStmt) {
      _updateGrowthLevelStmt = dbPrepare(
        "consciousness",
        `UPDATE user_profiles SET growthLevel = ?, lastSeenAt = datetime('now') WHERE userId = ?`
      );
    }
  } catch {
    // DB未初期化時は無視
  }
}

/**
 * ユーザープロファイルを取得 (なければ作成)
 */
export function ensureUserProfile(userId: string, displayName?: string): UserProfile | null {
  try {
    ensureProfileStmts();
    if (!_upsertProfileStmt || !_getProfileStmt) return null;

    _upsertProfileStmt.run(userId, displayName || null);
    const row = _getProfileStmt.get(userId) as any;
    if (!row) return null;

    return {
      userId: row.userId,
      displayName: row.displayName,
      firstSeenAt: row.firstSeenAt,
      lastSeenAt: row.lastSeenAt,
      totalTurns: Number(row.totalTurns || 0),
      growthLevel: Number(row.growthLevel || 0),
      metaJson: row.metaJson || "{}",
    };
  } catch (e) {
    console.warn("[USER-MEMORY] ensureUserProfile failed:", e);
    return null;
  }
}

/**
 * ターン数をインクリメント
 */
export function incrementUserTurns(userId: string): void {
  try {
    ensureProfileStmts();
    if (_incrementTurnsStmt) {
      _incrementTurnsStmt.run(userId);
    }
  } catch {
    // 無視
  }
}

/**
 * 成長レベルを更新
 */
export function updateGrowthLevel(userId: string, level: number): void {
  try {
    ensureProfileStmts();
    if (_updateGrowthLevelStmt) {
      _updateGrowthLevelStmt.run(level, userId);
    }
  } catch {
    // 無視
  }
}

/**
 * ターン数から成長レベルを計算
 */
export function computeGrowthLevel(totalTurns: number): number {
  // 対数スケール: 10ターン=Lv1, 30=Lv2, 100=Lv3, 300=Lv4, 1000=Lv5...
  if (totalTurns <= 0) return 0;
  return Math.floor(Math.log10(totalTurns) * 2);
}

// ============================================================
// 3. 長期記憶管理
// ============================================================

let _insertMemoryStmt: any = null;
let _getMemoriesStmt: any = null;
let _getMemoriesByTypeStmt: any = null;
let _searchMemoriesStmt: any = null;
let _touchMemoryStmt: any = null;
let _decayMemoriesStmt: any = null;

function ensureMemoryStmts() {
  try {
    if (!_insertMemoryStmt) {
      _insertMemoryStmt = dbPrepare(
        "consciousness",
        `INSERT INTO user_memory (userId, memoryType, content, importance, decayRate, lastAccessedAt, createdAt)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      );
    }
    if (!_getMemoriesStmt) {
      _getMemoriesStmt = dbPrepare(
        "consciousness",
        `SELECT * FROM user_memory WHERE userId = ? ORDER BY importance DESC, lastAccessedAt DESC LIMIT ?`
      );
    }
    if (!_getMemoriesByTypeStmt) {
      _getMemoriesByTypeStmt = dbPrepare(
        "consciousness",
        `SELECT * FROM user_memory WHERE userId = ? AND memoryType = ? ORDER BY importance DESC LIMIT ?`
      );
    }
    if (!_searchMemoriesStmt) {
      _searchMemoriesStmt = dbPrepare(
        "consciousness",
        `SELECT * FROM user_memory WHERE userId = ? AND content LIKE ? ORDER BY importance DESC LIMIT ?`
      );
    }
    if (!_touchMemoryStmt) {
      _touchMemoryStmt = dbPrepare(
        "consciousness",
        `UPDATE user_memory SET lastAccessedAt = datetime('now'), importance = MIN(1.0, importance + 0.05) WHERE id = ?`
      );
    }
    if (!_decayMemoriesStmt) {
      _decayMemoriesStmt = dbPrepare(
        "consciousness",
        `UPDATE user_memory SET importance = MAX(0.01, importance - decayRate)
         WHERE userId = ? AND lastAccessedAt < datetime('now', '-7 days')`
      );
    }
  } catch {
    // DB未初期化時は無視
  }
}

/**
 * 記憶を保存
 */
export function saveUserMemory(entry: Omit<UserMemoryEntry, "id" | "lastAccessedAt" | "createdAt">): number | null {
  try {
    ensureMemoryStmts();
    if (!_insertMemoryStmt) return null;

    const result = _insertMemoryStmt.run(
      entry.userId,
      entry.memoryType,
      entry.content,
      entry.importance,
      entry.decayRate
    );
    return Number((result as any)?.lastInsertRowid ?? 0) || null;
  } catch (e) {
    console.warn("[USER-MEMORY] saveUserMemory failed:", e);
    return null;
  }
}

/**
 * ユーザーの記憶を取得 (重要度順)
 */
export function getUserMemories(userId: string, limit: number = 10): UserMemoryEntry[] {
  try {
    ensureMemoryStmts();
    if (!_getMemoriesStmt) return [];
    return _getMemoriesStmt.all(userId, limit) as UserMemoryEntry[];
  } catch {
    return [];
  }
}

/**
 * タイプ別の記憶を取得
 */
export function getUserMemoriesByType(
  userId: string,
  memoryType: UserMemoryEntry["memoryType"],
  limit: number = 5
): UserMemoryEntry[] {
  try {
    ensureMemoryStmts();
    if (!_getMemoriesByTypeStmt) return [];
    return _getMemoriesByTypeStmt.all(userId, memoryType, limit) as UserMemoryEntry[];
  } catch {
    return [];
  }
}

/**
 * キーワードで記憶を検索
 */
export function searchUserMemories(userId: string, query: string, limit: number = 5): UserMemoryEntry[] {
  try {
    ensureMemoryStmts();
    if (!_searchMemoriesStmt) return [];
    return _searchMemoriesStmt.all(userId, `%${query}%`, limit) as UserMemoryEntry[];
  } catch {
    return [];
  }
}

/**
 * 記憶にアクセス (重要度微増)
 */
export function touchMemory(memoryId: number): void {
  try {
    ensureMemoryStmts();
    if (_touchMemoryStmt) {
      _touchMemoryStmt.run(memoryId);
    }
  } catch {
    // 無視
  }
}

/**
 * 古い記憶を減衰
 */
export function decayUserMemories(userId: string): void {
  try {
    ensureMemoryStmts();
    if (_decayMemoriesStmt) {
      _decayMemoriesStmt.run(userId);
    }
  } catch {
    // 無視
  }
}

// ============================================================
// 4. 会話からの記憶抽出 (決定的)
// ============================================================

/**
 * 会話から記憶すべき情報を抽出
 */
export function extractMemorableInsights(
  userId: string,
  userText: string,
  assistantText: string
): UserMemoryEntry[] {
  const entries: UserMemoryEntry[] = [];
  const u = String(userText || "").trim();
  const a = String(assistantText || "").trim();

  // 1. 訂正の検出 (ユーザーが「違う」「間違い」等)
  const correctionKeywords = ["違う", "間違い", "そうじゃない", "訂正", "修正", "正しくは", "実は"];
  for (const kw of correctionKeywords) {
    if (u.includes(kw)) {
      entries.push({
        userId,
        memoryType: "correction",
        content: `訂正: ${u.slice(0, 200)}`,
        importance: 0.9,
        decayRate: 0.001,
        lastAccessedAt: "",
        createdAt: "",
      });
      break;
    }
  }

  // 2. 好みの検出
  const preferenceKeywords = ["好き", "嫌い", "苦手", "得意", "興味", "関心", "専門"];
  for (const kw of preferenceKeywords) {
    if (u.includes(kw)) {
      entries.push({
        userId,
        memoryType: "preference",
        content: `好み: ${u.slice(0, 200)}`,
        importance: 0.6,
        decayRate: 0.005,
        lastAccessedAt: "",
        createdAt: "",
      });
      break;
    }
  }

  // 3. 洞察の検出 (深い会話)
  const insightKeywords = ["なるほど", "理解した", "そういうことか", "つまり", "本質", "真理", "法則", "構造"];
  for (const kw of insightKeywords) {
    if (u.includes(kw) || a.includes(kw)) {
      const core = a.split(/[。\n]/)[0]?.trim() || a.slice(0, 200);
      entries.push({
        userId,
        memoryType: "insight",
        content: `洞察: ${core}`,
        importance: 0.7,
        decayRate: 0.003,
        lastAccessedAt: "",
        createdAt: "",
      });
      break;
    }
  }

  return entries;
}

// ============================================================
// 5. ユーザーコンテキスト生成 (LLMプロンプトに注入)
// ============================================================

/**
 * ユーザー別の記憶コンテキストを生成
 */
export function buildUserContext(userId: string, userText: string): string {
  const profile = ensureUserProfile(userId);
  if (!profile) return "";

  const lines: string[] = [];

  // 1. ユーザープロファイル
  const levelNames = ["初心", "入門", "修行", "求道", "覚醒", "悟道", "円融", "天通"];
  const levelName = levelNames[Math.min(profile.growthLevel, levelNames.length - 1)] || "天通";
  if (profile.totalTurns > 0) {
    lines.push(`【ユーザー記憶】対話回数: ${profile.totalTurns}回 / 成長段階: ${levelName}(Lv${profile.growthLevel})`);
  }

  // 2. 関連する記憶を検索
  const keywords = String(userText || "").split(/[\s。、？！]+/).filter(w => w.length >= 2).slice(0, 3);
  const relevantMemories: UserMemoryEntry[] = [];
  for (const kw of keywords) {
    const found = searchUserMemories(userId, kw, 2);
    for (const m of found) {
      if (!relevantMemories.some(r => r.id === m.id)) {
        relevantMemories.push(m);
        if (m.id) touchMemory(m.id);
      }
    }
  }

  // 3. 訂正記憶 (常に参照)
  const corrections = getUserMemoriesByType(userId, "correction", 3);
  for (const c of corrections) {
    if (!relevantMemories.some(r => r.id === c.id)) {
      relevantMemories.push(c);
    }
  }

  if (relevantMemories.length > 0) {
    for (const m of relevantMemories.slice(0, 5)) {
      lines.push(`・[${m.memoryType}] ${m.content}`);
    }
  }

  // 4. 記憶減衰を実行 (バックグラウンド)
  decayUserMemories(userId);

  if (lines.length === 0) return "";
  return lines.join("\n");
}

/**
 * 会話後のユーザー記憶更新
 */
export function updateUserMemoryAfterConversation(
  userId: string,
  userText: string,
  assistantText: string
): void {
  try {
    // ターン数インクリメント
    incrementUserTurns(userId);

    // 記憶抽出・保存
    const insights = extractMemorableInsights(userId, userText, assistantText);
    for (const entry of insights) {
      saveUserMemory(entry);
    }

    // 成長レベル更新
    const profile = ensureUserProfile(userId);
    if (profile) {
      const newLevel = computeGrowthLevel(profile.totalTurns + 1);
      if (newLevel > profile.growthLevel) {
        updateGrowthLevel(userId, newLevel);
        console.log(`[USER-MEMORY] ${userId} leveled up: ${profile.growthLevel} -> ${newLevel}`);
      }
    }
  } catch (e) {
    console.warn("[USER-MEMORY] updateAfterConversation failed:", e);
  }
}
