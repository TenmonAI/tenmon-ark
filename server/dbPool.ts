/**
 * Database Connection Pool
 * スケール可能なDB接続プール
 * 
 * 単一DB接続を廃止し、コネクションプールを実装
 */

import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";

// コネクションプールを作成
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL!,
  connectionLimit: 20,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Drizzleインスタンスをエクスポート
export const db = drizzle(pool);

