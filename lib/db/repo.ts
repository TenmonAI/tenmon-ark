import { Platform } from "react-native";

// 型定義は共通（Web/モバイルで同じ）
export type DbThread = {
  id: string;
  title: string | null;
  createdAt: number;
  updatedAt: number;
};

export type DbMessage = {
  id: string;
  threadId: string;
  role: string;
  text: string;
  createdAt: number;
  rawJson: string | null;
};

export type DbArtifact = {
  id: string;
  messageId: string;
  kind: string;
  payload: string;
  createdAt: number;
};

// 環境に応じて実装を切り替え
if (Platform.OS === "web") {
  // Web環境: IndexedDB実装をre-export
  export * from "./repo.web";
} else {
  // モバイル環境: 既存SQLite実装
  import type { SQLiteDatabase, SQLResultSet } from "expo-sqlite";
  import { getDb } from "./db";

  function runQuery<T = unknown>(
    db: SQLiteDatabase,
    sql: string,
    params: any[] = []
  ): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => {
      db.transaction(
        (tx) => {
          tx.executeSql(
            sql,
            params,
            (_tx, result: SQLResultSet) => {
              const rows: T[] = [];
              for (let i = 0; i < result.rows.length; i++) {
                rows.push(result.rows.item(i) as T);
              }
              resolve(rows);
            },
            (_tx, error) => {
              reject(error);
              return true;
            }
          );
        },
        (err) => reject(err)
      );
    });
  }

  function exec(db: SQLiteDatabase, sql: string, params: any[] = []): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      db.transaction(
        (tx) => {
          tx.executeSql(
            sql,
            params,
            () => resolve(),
            (_tx, error) => {
              reject(error);
              return true;
            }
          );
        },
        (err) => reject(err)
      );
    });
  }

  function makeId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random()
      .toString(16)
      .slice(2)}`;
  }

  // Threads

  export async function createThread(title: string | null = null): Promise<DbThread> {
    const db = await getDb();
    const now = Date.now();
    const id = makeId("th");
    const safeTitle = title && title.trim().length > 0 ? title : "New chat";

    await exec(
      db,
      "INSERT INTO threads (id, title, createdAt, updatedAt) VALUES (?, ?, ?, ?)",
      [id, safeTitle, now, now]
    );

    return {
      id,
      title: safeTitle,
      createdAt: now,
      updatedAt: now,
    };
  }

  export async function listThreads(): Promise<DbThread[]> {
    const db = await getDb();
    return runQuery<DbThread>(
      db,
      "SELECT id, title, createdAt, updatedAt FROM threads ORDER BY updatedAt DESC"
    );
  }

  export async function getThread(id: string): Promise<DbThread | null> {
    const db = await getDb();
    const rows = await runQuery<DbThread>(
      db,
      "SELECT id, title, createdAt, updatedAt FROM threads WHERE id = ? LIMIT 1",
      [id]
    );
    return rows[0] ?? null;
  }

  export async function updateThreadUpdatedAt(id: string, updatedAt?: number): Promise<void> {
    const db = await getDb();
    const ts = updatedAt ?? Date.now();
    await exec(db, "UPDATE threads SET updatedAt = ? WHERE id = ?", [ts, id]);
  }

  export async function touchThread(id: string, updatedAt?: number): Promise<void> {
    return updateThreadUpdatedAt(id, updatedAt);
  }

  // Messages

  export async function insertMessage(params: {
    threadId: string;
    role: "user" | "assistant" | string;
    text: string;
    createdAt?: number;
    rawJson?: unknown;
  }): Promise<DbMessage> {
    const db = await getDb();
    const id = makeId("msg");
    const createdAt = params.createdAt ?? Date.now();
    const rawJsonString =
      params.rawJson === undefined ? null : JSON.stringify(params.rawJson);

    await exec(
      db,
      "INSERT INTO messages (id, threadId, role, text, createdAt, rawJson) VALUES (?, ?, ?, ?, ?, ?)",
      [id, params.threadId, params.role, params.text, createdAt, rawJsonString]
    );

    await updateThreadUpdatedAt(params.threadId, createdAt);

    return {
      id,
      threadId: params.threadId,
      role: params.role,
      text: params.text,
      createdAt,
      rawJson: rawJsonString,
    };
  }

  export async function listMessagesByThread(threadId: string): Promise<DbMessage[]> {
    const db = await getDb();
    return runQuery<DbMessage>(
      db,
      "SELECT id, threadId, role, text, createdAt, rawJson FROM messages WHERE threadId = ? ORDER BY createdAt ASC",
      [threadId]
    );
  }

  // Artifacts

  export async function insertArtifactsForMessage(
    messageId: string,
    artifacts: Array<{ kind: string; payload: unknown }>
  ): Promise<DbArtifact[]> {
    if (artifacts.length === 0) return [];
    const db = await getDb();
    const createdAt = Date.now();

    const result: DbArtifact[] = [];
    for (const a of artifacts) {
      const id = makeId("art");
      const payload = JSON.stringify(a.payload ?? null);
      await exec(
        db,
        "INSERT INTO artifacts (id, messageId, kind, payload, createdAt) VALUES (?, ?, ?, ?, ?)",
        [id, messageId, a.kind, payload, createdAt]
      );
      result.push({ id, messageId, kind: a.kind, payload, createdAt });
    }
    return result;
  }

  export async function listArtifactsByMessage(messageId: string): Promise<DbArtifact[]> {
    const db = await getDb();
    return runQuery<DbArtifact>(
      db,
      "SELECT id, messageId, kind, payload, createdAt FROM artifacts WHERE messageId = ? ORDER BY createdAt ASC",
      [messageId]
    );
  }

  // user_prefs

  export async function getUserPref(key: string): Promise<string | null> {
    const db = await getDb();
    const rows = await runQuery<{ value: string }>(
      db,
      "SELECT value FROM user_prefs WHERE key = ? LIMIT 1",
      [key]
    );
    return rows[0]?.value ?? null;
  }

  export async function setUserPref(key: string, value: string): Promise<void> {
    const db = await getDb();
    await exec(
      db,
      "INSERT OR REPLACE INTO user_prefs (key, value) VALUES (?, ?)",
      [key, value]
    );
  }

  export const prefsGet = getUserPref;
  export const prefsSet = setUserPref;

  // Aggregate helpers

  export async function countThreads(): Promise<number> {
    const db = await getDb();
    const rows = await runQuery<{ c: number }>(db, "SELECT COUNT(*) AS c FROM threads");
    return rows[0]?.c ?? 0;
  }

  export async function countMessages(): Promise<number> {
    const db = await getDb();
    const rows = await runQuery<{ c: number }>(db, "SELECT COUNT(*) AS c FROM messages");
    return rows[0]?.c ?? 0;
  }

  export async function countArtifacts(): Promise<number> {
    const db = await getDb();
    const rows = await runQuery<{ c: number }>(db, "SELECT COUNT(*) AS c FROM artifacts");
    return rows[0]?.c ?? 0;
  }

  export async function listAllMessages(): Promise<DbMessage[]> {
    const db = await getDb();
    return runQuery<DbMessage>(
      db,
      "SELECT id, threadId, role, text, createdAt, rawJson FROM messages ORDER BY createdAt ASC"
    );
  }

  export async function listAllArtifacts(): Promise<DbArtifact[]> {
    const db = await getDb();
    return runQuery<DbArtifact>(
      db,
      "SELECT id, messageId, kind, payload, createdAt FROM artifacts ORDER BY createdAt ASC"
    );
  }

  export async function deleteAllLocalData(): Promise<void> {
    const db = await getDb();
    await exec(db, "DELETE FROM artifacts");
    await exec(db, "DELETE FROM messages");
    await exec(db, "DELETE FROM threads");
  }
}
