import type { SQLiteDatabase } from "expo-sqlite";

type Migration = {
  id: number;
  up: (db: SQLiteDatabase) => Promise<void>;
};

async function execSql(db: SQLiteDatabase, sql: string, params: any[] = []): Promise<void> {
  await new Promise<void>((resolve, reject) => {
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

async function getUserPref(db: SQLiteDatabase, key: string): Promise<string | null> {
  return new Promise<string | null>((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          "CREATE TABLE IF NOT EXISTS user_prefs (key TEXT PRIMARY KEY, value TEXT)",
          [],
          () => {},
          () => false
        );
        tx.executeSql(
          "SELECT value FROM user_prefs WHERE key = ? LIMIT 1",
          [key],
          (_tx, result) => {
            if (result.rows.length > 0) {
              resolve(String(result.rows.item(0).value ?? ""));
            } else {
              resolve(null);
            }
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

async function setUserPref(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await execSql(
    db,
    "INSERT OR REPLACE INTO user_prefs (key, value) VALUES (?, ?)",
    [key, value]
  );
}

const migrations: Migration[] = [
  {
    id: 1,
    up: async (db) => {
      // 基本4テーブル + index
      await execSql(
        db,
        `CREATE TABLE IF NOT EXISTS threads (
          id TEXT PRIMARY KEY,
          title TEXT,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        )`
      );

      await execSql(
        db,
        `CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          threadId TEXT NOT NULL,
          role TEXT NOT NULL,
          text TEXT NOT NULL,
          createdAt INTEGER NOT NULL,
          rawJson TEXT NULL,
          FOREIGN KEY (threadId) REFERENCES threads(id) ON DELETE CASCADE
        )`
      );

      await execSql(
        db,
        `CREATE TABLE IF NOT EXISTS artifacts (
          id TEXT PRIMARY KEY,
          messageId TEXT NOT NULL,
          kind TEXT NOT NULL,
          payload TEXT NOT NULL,
          createdAt INTEGER NOT NULL,
          FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE
        )`
      );

      await execSql(
        db,
        `CREATE TABLE IF NOT EXISTS user_prefs (
          key TEXT PRIMARY KEY,
          value TEXT
        )`
      );

      await execSql(
        db,
        "CREATE INDEX IF NOT EXISTS idx_messages_thread_createdAt ON messages(threadId, createdAt)"
      );

      await execSql(
        db,
        "CREATE INDEX IF NOT EXISTS idx_threads_updatedAt ON threads(updatedAt)"
      );

      await execSql(
        db,
        "CREATE INDEX IF NOT EXISTS idx_artifacts_messageId ON artifacts(messageId)"
      );
    },
  },
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const raw = await getUserPref(db, "schema_version");
  let current = 0;
  if (raw) {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n) && n > 0) {
      current = n;
    }
  }

  const pending = migrations.filter((m) => m.id > current).sort((a, b) => a.id - b.id);
  for (const m of pending) {
    await m.up(db);
    await setUserPref(db, "schema_version", String(m.id));
  }
}

