import { Router, type Request, type Response } from "express";
import { getDb, dbPrepare } from "../db/index.js";

export const metaRouter = Router();

metaRouter.get("/health", (_req: Request, res: Response) => {
  res.json({
    service: "TENMON-ARK",
    status: "READY"
  });
});

metaRouter.get("/persona", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    state: {
      mode: "KANAGI",
      phase: "READY"
    }
  });
});

metaRouter.get("/memory/stats", (_req: Request, res: Response) => {
  // 実DBから件数を取得（テーブルが存在しない場合は0を返す）
  let session = 0;
  let conversation = 0;
  let kokuzo = 0;
  let training = { sessions: 0, messages: 0, rules: 0, freezes: 0 };

  try {
    const db = getDb("kokuzo");

    // テーブル存在確認ヘルパー
    const tableExists = (tableName: string): boolean => {
      try {
        const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1");
        const result = stmt.get(tableName) as any;
        return !!(result && result.name === tableName);
      } catch {
        return false;
      }
    };

    // session_memory の件数
    if (tableExists("session_memory")) {
      try {
        const stmt = dbPrepare("kokuzo", "SELECT COUNT(*) AS cnt FROM session_memory");
        session = Number((stmt.get() as any)?.cnt ?? 0);
      } catch (e: any) {
        console.warn(`[MEMORY_STATS] failed to count session_memory: ${e?.message ?? String(e)}`);
      }
    } else {
      console.warn("[MEMORY_STATS] table session_memory does not exist");
    }

    // conversation_log の件数
    if (tableExists("conversation_log")) {
      try {
        const stmt = dbPrepare("kokuzo", "SELECT COUNT(*) AS cnt FROM conversation_log");
        conversation = Number((stmt.get() as any)?.cnt ?? 0);
      } catch (e: any) {
        console.warn(`[MEMORY_STATS] failed to count conversation_log: ${e?.message ?? String(e)}`);
      }
    } else {
      console.warn("[MEMORY_STATS] table conversation_log does not exist");
    }

    // kokuzo_pages の件数（7849件を返す）
    if (tableExists("kokuzo_pages")) {
      try {
        const stmt = dbPrepare("kokuzo", "SELECT COUNT(*) AS cnt FROM kokuzo_pages");
        kokuzo = Number((stmt.get() as any)?.cnt ?? 0);
      } catch (e: any) {
        console.warn(`[MEMORY_STATS] failed to count kokuzo_pages: ${e?.message ?? String(e)}`);
      }
    } else {
      console.warn("[MEMORY_STATS] table kokuzo_pages does not exist");
    }

    // training_sessions の件数
    if (tableExists("training_sessions")) {
      try {
        const stmt = dbPrepare("kokuzo", "SELECT COUNT(*) AS cnt FROM training_sessions");
        training.sessions = Number((stmt.get() as any)?.cnt ?? 0);
      } catch (e: any) {
        console.warn(`[MEMORY_STATS] failed to count training_sessions: ${e?.message ?? String(e)}`);
      }
    }

    // training_messages の件数
    if (tableExists("training_messages")) {
      try {
        const stmt = dbPrepare("kokuzo", "SELECT COUNT(*) AS cnt FROM training_messages");
        training.messages = Number((stmt.get() as any)?.cnt ?? 0);
      } catch (e: any) {
        console.warn(`[MEMORY_STATS] failed to count training_messages: ${e?.message ?? String(e)}`);
      }
    }

    // training_rules の件数
    if (tableExists("training_rules")) {
      try {
        const stmt = dbPrepare("kokuzo", "SELECT COUNT(*) AS cnt FROM training_rules");
        training.rules = Number((stmt.get() as any)?.cnt ?? 0);
      } catch (e: any) {
        console.warn(`[MEMORY_STATS] failed to count training_rules: ${e?.message ?? String(e)}`);
      }
    }

    // training_freezes の件数
    if (tableExists("training_freezes")) {
      try {
        const stmt = dbPrepare("kokuzo", "SELECT COUNT(*) AS cnt FROM training_freezes");
        training.freezes = Number((stmt.get() as any)?.cnt ?? 0);
      } catch (e: any) {
        console.warn(`[MEMORY_STATS] failed to count training_freezes: ${e?.message ?? String(e)}`);
      }
    }
  } catch (e: any) {
    console.error(`[MEMORY_STATS] FATAL: failed to get DB: ${e?.message ?? String(e)}`);
    // エラー時も0を返す（サービスを停止させない）
  }

  res.json({
    session,
    conversation,
    kokuzo,
    training
  });
});
