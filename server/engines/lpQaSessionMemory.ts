/**
 * LP-QA Session Memory
 * sessionId単位で会話履歴を管理する簡易メモリストア
 * 
 * 目的:
 * - LPチャットの会話が途中でリセットされないようにする
 * - Twin-Core / 火水構文の人格を一貫して維持
 * - GPTレベルの継続会話品質を実現
 */

interface SessionMemory {
  sessionId: string;
  history: string[]; // 会話履歴（user/assistant交互）
  lastAccessed: number; // 最終アクセス時刻
  locale?: string; // ユーザーのロケール
}

/**
 * セッションメモリストア（インメモリ）
 * 本番環境では Redis や Database に置き換え可能
 */
class LpQaSessionMemoryStore {
  private sessions: Map<string, SessionMemory> = new Map();
  private readonly MAX_HISTORY_LENGTH = 20; // 最大履歴数
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24時間

  /**
   * セッション履歴をロード
   */
  load(sessionId: string): string[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return [];
    }

    // タイムアウトチェック
    const now = Date.now();
    if (now - session.lastAccessed > this.SESSION_TIMEOUT) {
      this.sessions.delete(sessionId);
      return [];
    }

    // 最終アクセス時刻を更新
    session.lastAccessed = now;
    return session.history;
  }

  /**
   * セッション履歴を保存
   */
  save(sessionId: string, history: string[], locale?: string): void {
    // 履歴を最大長に制限
    const trimmedHistory = history.slice(-this.MAX_HISTORY_LENGTH);

    this.sessions.set(sessionId, {
      sessionId,
      history: trimmedHistory,
      lastAccessed: Date.now(),
      locale,
    });
  }

  /**
   * セッション情報を取得
   */
  getSession(sessionId: string): SessionMemory | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 古いセッションをクリーンアップ
   */
  cleanup(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastAccessed > this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * セッション統計を取得
   */
  getStats(): {
    totalSessions: number;
    activeSessions: number;
  } {
    const now = Date.now();
    let activeSessions = 0;

    for (const session of this.sessions.values()) {
      if (now - session.lastAccessed < 60 * 60 * 1000) { // 1時間以内
        activeSessions++;
      }
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions,
    };
  }
}

// シングルトンインスタンス
export const lpQaSessionMemory = new LpQaSessionMemoryStore();

// 定期的なクリーンアップ（1時間ごと）
setInterval(() => {
  lpQaSessionMemory.cleanup();
  console.log('[LpQaSessionMemory] Cleanup completed:', lpQaSessionMemory.getStats());
}, 60 * 60 * 1000);
