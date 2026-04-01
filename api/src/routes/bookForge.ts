import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { getDb } from "../db/index.js";

export const bookForgeRouter = Router();

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asJson(v: unknown): string {
  try {
    return JSON.stringify(v ?? null);
  } catch {
    return "null";
  }
}

bookForgeRouter.get("/book/projects", (_req: Request, res: Response) => {
  try {
    const db = getDb("kokuzo");
    const rows = db.prepare(
      "SELECT * FROM writing_projects ORDER BY updatedAt DESC, createdAt DESC LIMIT 200"
    ).all() as any[];
    return res.json({ ok: true, count: rows.length, projects: rows });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.post("/book/project", (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as any;
    const title = s(body.title) || "新規プロジェクト";
    const topic = s(body.topic) || null;
    const bookSpec = s(body.bookSpec) || null;
    const id = randomUUID();

    const db = getDb("kokuzo");
    db.prepare(
      `INSERT INTO writing_projects
      (id, title, state, topic, bookSpec, continuitySummary, totalChars, total_blocks, createdAt, updatedAt, created_at, updated_at)
      VALUES (?, ?, 'draft', ?, ?, NULL, 0, 0, datetime('now'), datetime('now'), datetime('now'), datetime('now'))`
    ).run(id, title, topic, bookSpec);

    db.prepare(
      `INSERT INTO writing_progress_logs
      (id, projectId, prevState, nextState, note, createdAt, created_at)
      VALUES (?, ?, NULL, 'draft', 'project created', datetime('now'), datetime('now'))`
    ).run(randomUUID(), id);

    return res.status(201).json({ ok: true, id, projectId: id, title, topic, state: "draft" });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.post("/book/project/:id/outline", (req: Request, res: Response) => {
  try {
    const projectId = s(req.params.id);
    if (!projectId) return res.status(400).json({ ok: false, error: "project id required" });
    const body = (req.body ?? {}) as any;
    const topic = s(body.topic) || "未設定テーマ";

    const db = getDb("kokuzo");
    const project = db.prepare("SELECT id, title, topic FROM writing_projects WHERE id=? LIMIT 1").get(projectId) as any;
    if (!project?.id) return res.status(404).json({ ok: false, error: "project not found" });

    const headings = [
      { heading: "導入", goal: `${topic}の全体像を定義` },
      { heading: "構造", goal: "主要概念を整理" },
      { heading: "実践", goal: "適用手順を提示" },
      { heading: "要約", goal: "次の一手を明示" },
    ];

    const tx = db.prepare(
      `INSERT INTO writing_outline_nodes
      (id, projectId, parentId, idx, heading, goal, depth, createdAt, created_at)
      VALUES (?, ?, NULL, ?, ?, ?, 1, datetime('now'), datetime('now'))`
    );
    const txBlock = db.prepare(
      `INSERT INTO writing_draft_blocks
      (id, projectId, chapterIndex, heading, goal, content, chars, continuitySummary, createdAt, updatedAt, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, '', 0, NULL, datetime('now'), datetime('now'), datetime('now'), datetime('now'))`
    );
    for (let i = 0; i < headings.length; i++) {
      const h = headings[i];
      tx.run(randomUUID(), projectId, i, h.heading, h.goal);
      txBlock.run(randomUUID(), projectId, i, h.heading, h.goal);
    }

    db.prepare("UPDATE writing_projects SET updatedAt=datetime('now'), updated_at=datetime('now') WHERE id=?").run(projectId);
    return res.json({ ok: true, projectId, count: headings.length, outline: headings });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.get("/book/project/:id/export", (req: Request, res: Response) => {
  try {
    const projectId = s(req.params.id);
    if (!projectId) return res.status(400).json({ ok: false, error: "project id required" });

    const db = getDb("kokuzo");
    const project = db.prepare("SELECT * FROM writing_projects WHERE id=? LIMIT 1").get(projectId) as any;
    if (!project?.id) return res.status(404).json({ ok: false, error: "project not found" });

    const blocks = db.prepare(
      "SELECT chapterIndex, heading, goal, content FROM writing_draft_blocks WHERE projectId=? ORDER BY chapterIndex ASC"
    ).all(projectId) as any[];

    const mdLines: string[] = [];
    mdLines.push(`# ${String(project.title || "Untitled")}`);
    if (project.topic) mdLines.push(`\nテーマ: ${String(project.topic)}`);
    mdLines.push("");
    for (const b of blocks) {
      mdLines.push(`## ${String(b.heading || `Chapter ${Number(b.chapterIndex) + 1}`)}`);
      if (b.goal) mdLines.push(`目的: ${String(b.goal)}`);
      mdLines.push(String(b.content || "（本文未作成）"));
      mdLines.push("");
    }
    const content = mdLines.join("\n").trim();
    const bytes = Buffer.byteLength(content, "utf8");

    const artifactId = randomUUID();
    db.prepare(
      `INSERT INTO export_artifacts
      (id, projectId, format, content, bytes, createdAt, created_at)
      VALUES (?, ?, 'markdown', ?, ?, datetime('now'), datetime('now'))`
    ).run(artifactId, projectId, content, bytes);

    db.prepare(
      `INSERT INTO export_jobs
      (id, projectId, status, message, artifactId, createdAt, created_at)
      VALUES (?, ?, 'done', 'exported', ?, datetime('now'), datetime('now'))`
    ).run(randomUUID(), projectId, artifactId);

    db.prepare(
      "UPDATE writing_projects SET updatedAt=datetime('now'), updated_at=datetime('now') WHERE id=?"
    ).run(projectId);

    return res.json({
      ok: true,
      projectId,
      artifactId,
      format: "markdown",
      bytes,
      preview: content.slice(0, 300),
      meta: asJson({ blocks: blocks.length }),
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});
