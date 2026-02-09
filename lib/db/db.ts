import * as SQLite from "expo-sqlite";
import type { SQLTransaction, SQLiteDatabase } from "expo-sqlite";
import { runMigrations } from "./migrations";

let dbPromise: Promise<SQLiteDatabase> | null = null;

async function initDb(): Promise<SQLiteDatabase> {
  const db = SQLite.openDatabase("tenmon-ark.db");

  // PRAGMA 設定とマイグレーションをまとめて実行
  await new Promise<void>((resolve, reject) => {
    db.transaction(
      (tx: SQLTransaction) => {
        tx.executeSql("PRAGMA foreign_keys = ON;");
        tx.executeSql("PRAGMA journal_mode = WAL;");
        tx.executeSql("PRAGMA synchronous = NORMAL;");
      },
      (error) => {
        reject(error);
      },
      () => {
        resolve();
      }
    );
  });

  // スキーママイグレーション
  await runMigrations(db);

  return db;
}

/**
 * SQLite DB を取得（シングルトン）
 * 呼び出し側で try/catch してエラーを扱えるようにする。
 */
export async function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = initDb();
  }
  return dbPromise;
}

