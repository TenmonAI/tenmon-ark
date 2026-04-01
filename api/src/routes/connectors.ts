import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { getDb } from "../db/index.js";

export const connectorsRouter = Router();

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

type ConnectorType =
  | "dropbox"
  | "google_drive"
  | "google_docs"
  | "notion"
  | "notebooklm"
  | "local_file";

function ensureConnectorTables(): void {
  const db = getDb("kokuzo");
  db.exec(`
    CREATE TABLE IF NOT EXISTS source_registry (
      id TEXT PRIMARY KEY,
      sourceType TEXT,
      source_type TEXT,
      uri TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      metaJson TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS writing_sources (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      sourceId TEXT NOT NULL,
      sourceType TEXT NOT NULL,
      doc TEXT,
      note TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

connectorsRouter.get("/connectors/list", (_req: Request, res: Response) => {
  return res.json({
    ok: true,
    connectors: [
      { type: "notion", label: "Notion", status: "partial", note: "page/db 読取のみ。PWA連動未実装" },
      { type: "google_drive", label: "Google Drive", status: "planned", note: "OAuth設定後に利用可能" },
      { type: "google_docs", label: "Google Docs", status: "planned", note: "OAuth設定後に利用可能" },
      { type: "dropbox", label: "Dropbox", status: "planned", note: "OAuth設定後に利用可能" },
      { type: "notebooklm", label: "NotebookLM", status: "planned", note: "API公開後に対応予定" },
      { type: "local_file", label: "ローカルファイル", status: "active", note: "PDF/txt/md アップロード対応" },
    ],
  });
});

connectorsRouter.post("/connectors/ingest", (req: Request, res: Response) => {
  try {
    ensureConnectorTables();
    const body = (req.body ?? {}) as any;
    const connectorType = s(body.connectorType) as ConnectorType;
    const projectId = s(body.projectId);
    const url = s(body.url);
    const title = s(body.title) || url || `${connectorType}-${Date.now()}`;
    const content = s(body.content) || s(body.text);

    if (!connectorType) return res.status(400).json({ ok: false, error: "connectorType required" });

    const db = getDb("kokuzo");
    const sourceId = randomUUID();
    db.prepare(
      `INSERT INTO source_registry
      (id,sourceType,source_type,uri,status,metaJson,createdAt,created_at)
      VALUES(?,?,?,?,'active',?,datetime('now'),datetime('now'))`
    ).run(
      sourceId,
      connectorType,
      connectorType,
      url || null,
      JSON.stringify({ title, projectId: projectId || null, url, hasContent: Boolean(content) })
    );

    if (projectId) {
      const project = db.prepare("SELECT id FROM writing_projects WHERE id=? LIMIT 1").get(projectId) as any;
      if (project?.id) {
        db.prepare(
          `INSERT INTO writing_sources(id,projectId,sourceId,sourceType,doc,note,createdAt,created_at)
          VALUES(?,?,?,?,?,?,datetime('now'),datetime('now'))`
        ).run(randomUUID(), projectId, sourceId, connectorType, null, title);
      }
    }

    return res.json({
      ok: true,
      sourceId,
      connectorType,
      title,
      note:
        connectorType === "local_file"
          ? "コンテンツ取り込み完了"
          : `${connectorType}連携は現在スタブ実装です。OAuth設定後に完全対応予定。`,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

connectorsRouter.get("/connectors/notion/pages", async (_req: Request, res: Response) => {
  try {
    const notionToken = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY;
    if (!notionToken) {
      return res.json({ ok: false, error: "NOTION_TOKEN not set", note: "環境変数 NOTION_TOKEN を設定してください" });
    }
    const r = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filter: { property: "object", value: "page" }, page_size: 20 }),
    });
    if (!r.ok) return res.status(r.status).json({ ok: false, error: `Notion API ${r.status}` });
    const d = (await r.json()) as any;
    const pages = (d.results || []).map((p: any) => ({
      id: p.id,
      title:
        p.properties?.title?.title?.[0]?.plain_text ||
        p.properties?.Name?.title?.[0]?.plain_text ||
        "(untitled)",
      url: p.url,
    }));
    return res.json({ ok: true, pages, count: pages.length });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});
