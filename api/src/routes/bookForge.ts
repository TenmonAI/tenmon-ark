import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { Router, type Request, type Response } from "express";
import { getDb } from "../db/index.js";
import { llmChat } from "../core/llmWrapper.js";

type OutlineNode = { heading: string; goal: string; targetChars?: number };

export const bookForgeRouter = Router();

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function n(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const x = Number(v);
    return Number.isFinite(x) ? x : null;
  }
  return null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function hasOpenAiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY && String(process.env.OPENAI_API_KEY).trim());
}

function defaultOutline(topic: string): OutlineNode[] {
  return [
    { heading: "序章", goal: `${topic}の問題設定と前提を明確化する`, targetChars: 900 },
    { heading: "本論1", goal: `${topic}の中核概念を分解して説明する`, targetChars: 1200 },
    { heading: "本論2", goal: `${topic}の実践・応用面を具体化する`, targetChars: 1200 },
    { heading: "結語", goal: `${topic}の要点を統合し次の行動へ接続する`, targetChars: 900 },
  ];
}

function parseOutlineFromText(text: string): OutlineNode[] | null {
  const raw = String(text || "").trim();
  const m = raw.match(/\[[\s\S]*\]/);
  if (!m) return null;
  try {
    const arr = JSON.parse(m[0]);
    if (!Array.isArray(arr)) return null;
    const nodes: OutlineNode[] = arr
      .map((x: any) => ({
        heading: s(x?.heading || x?.title),
        goal: s(x?.goal || x?.purpose),
        targetChars: n(x?.targetChars) ?? undefined,
      }))
      .filter((x) => x.heading && x.goal);
    return nodes.length ? nodes : null;
  } catch {
    return null;
  }
}

function logProgress(projectId: string, prevState: string | null, nextState: string, note = ""): void {
  const db = getDb("kokuzo");
  const id = randomUUID();
  db.prepare(
    `INSERT INTO writing_progress_logs(
      id, projectId, prevState, prev_state, nextState, next_state, note,
      createdAt, updatedAt, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'), datetime('now'))`
  ).run(id, projectId, prevState, prevState, nextState, nextState, note);
}

function setProjectState(projectId: string, nextState: string, note = ""): void {
  const db = getDb("kokuzo");
  const row = db.prepare(`SELECT state FROM writing_projects WHERE id=? LIMIT 1`).get(projectId) as any;
  if (!row) throw new Error("project not found");
  const prevState = String(row.state || "");
  db.prepare(
    `UPDATE writing_projects
     SET state=?, updatedAt=datetime('now'), updated_at=datetime('now')
     WHERE id=?`
  ).run(nextState, projectId);
  logProgress(projectId, prevState || null, nextState, note);
}

function getProjectOrNull(projectId: string): any | null {
  const db = getDb("kokuzo");
  const row = db.prepare(`SELECT * FROM writing_projects WHERE id=? LIMIT 1`).get(projectId) as any;
  return row || null;
}

async function generateOutlineWithGpt(topic: string, bookSpec: string): Promise<OutlineNode[] | null> {
  if (!hasOpenAiKey()) return null;
  const system = "あなたは編集者です。章立てのみをJSON配列で返してください。";
  const user =
    `topic: ${topic}\nbookSpec: ${bookSpec || "(none)"}\n\n` +
    "出力形式: [{\"heading\":\"...\",\"goal\":\"...\",\"targetChars\":1000}] のJSON配列のみ。";
  try {
    const out = await llmChat({ system, history: [], user });
    return parseOutlineFromText(String(out?.text ?? ""));
  } catch {
    return null;
  }
}

async function generateDraftBlockWithGpt(params: {
  projectTitle: string;
  chapterHeading: string;
  chapterGoal: string;
  targetChars: number;
  continuitySummary: string;
  topic: string;
  bookSpec: string;
}): Promise<string> {
  const system = "あなたは天聞AIの執筆補助。根拠未提示の断定を避け、実文章で執筆する。";
  const user =
    `title: ${params.projectTitle}\n` +
    `topic: ${params.topic}\n` +
    `heading: ${params.chapterHeading}\n` +
    `goal: ${params.chapterGoal}\n` +
    `targetChars: ${params.targetChars}\n` +
    `bookSpec: ${params.bookSpec || "(none)"}\n` +
    `continuitySummary: ${params.continuitySummary || "(none)"}\n\n` +
    "本文のみを返す。箇条書き多用は禁止。";
  const out = await llmChat({ system, history: [], user });
  const text = String(out?.text ?? "").trim();
  if (text.length < 80) throw new Error("draft generation too short");
  return text;
}

bookForgeRouter.get("/book/projects", (_req: Request, res: Response) => {
  try {
    const db = getDb("kokuzo");
    const rows = db.prepare(
      `SELECT
        p.*,
        COALESCE(COUNT(b.id), 0) AS blocks_count
      FROM writing_projects p
      LEFT JOIN writing_draft_blocks b ON b.projectId = p.id
      GROUP BY p.id
      ORDER BY p.updatedAt DESC`
    ).all() as any[];
    return res.json({
      ok: true,
      projects: rows.map((r) => ({
        ...r,
        total_blocks: Number(r.total_blocks ?? r.blocks_count ?? 0),
        updatedAt: r.updatedAt || r.updated_at || nowIso(),
      })),
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.post("/book/project", (req: Request, res: Response) => {
  try {
    const title = s((req.body as any)?.title) || "Book Forge Draft";
    const topic = s((req.body as any)?.topic);
    const bookSpec = s((req.body as any)?.bookSpec);
    const id = randomUUID();
    const db = getDb("kokuzo");
    db.prepare(
      `INSERT INTO writing_projects(
        id, title, topic, bookSpec, state, continuitySummary, totalChars, total_blocks,
        createdAt, updatedAt, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'draft', '', 0, 0, datetime('now'), datetime('now'), datetime('now'), datetime('now'))`
    ).run(id, title, topic, bookSpec);
    logProgress(id, null, "draft", "project created");
    return res.json({ ok: true, projectId: id, state: "draft" });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.get("/book/project/:id", (req: Request, res: Response) => {
  try {
    const projectId = s(req.params.id);
    const db = getDb("kokuzo");
    const project = getProjectOrNull(projectId);
    if (!project) return res.status(404).json({ ok: false, error: "project not found" });
    const outline = db.prepare(
      `SELECT * FROM writing_outline_nodes WHERE projectId=? ORDER BY idx ASC`
    ).all(projectId);
    const blocks = db.prepare(
      `SELECT * FROM writing_draft_blocks WHERE projectId=? ORDER BY chapterIndex ASC`
    ).all(projectId);
    const sources = db.prepare(
      `SELECT * FROM writing_sources WHERE projectId=? ORDER BY createdAt ASC`
    ).all(projectId);
    return res.json({ ok: true, project, outline, blocks, sources });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.post("/book/project/:id/source", (req: Request, res: Response) => {
  try {
    const projectId = s(req.params.id);
    const db = getDb("kokuzo");
    const project = getProjectOrNull(projectId);
    if (!project) return res.status(404).json({ ok: false, error: "project not found" });

    const sourceType = s((req.body as any)?.sourceType || (req.body as any)?.source_type || "manual");
    const uri = s((req.body as any)?.uri);
    const doc = s((req.body as any)?.doc);
    const note = s((req.body as any)?.note);
    const pdfPage = n((req.body as any)?.pdfPage);
    let sourceId = s((req.body as any)?.sourceId);
    if (!sourceId) {
      sourceId = randomUUID();
      db.prepare(
        `INSERT INTO source_registry(
          id, sourceType, source_type, uri, status, metaJson,
          createdAt, updatedAt, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'active', '{}', datetime('now'), datetime('now'), datetime('now'), datetime('now'))`
      ).run(sourceId, sourceType, sourceType, uri);
    }

    const id = randomUUID();
    db.prepare(
      `INSERT INTO writing_sources(
        id, projectId, sourceId, sourceType, source_type, doc, pdfPage, note,
        createdAt, updatedAt, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'), datetime('now'))`
    ).run(id, projectId, sourceId, sourceType, sourceType, doc || null, pdfPage, note || null);
    return res.json({ ok: true, sourceId: id });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.post("/book/project/:id/outline", async (req: Request, res: Response) => {
  try {
    const projectId = s(req.params.id);
    const db = getDb("kokuzo");
    const project = getProjectOrNull(projectId);
    if (!project) return res.status(404).json({ ok: false, error: "project not found" });

    const topic = s((req.body as any)?.topic) || s(project.topic) || s(project.title) || "book";
    const bookSpec = s((req.body as any)?.bookSpec) || s(project.bookSpec);
    const llmOutline = await generateOutlineWithGpt(topic, bookSpec);
    const outline = llmOutline && llmOutline.length ? llmOutline : defaultOutline(topic);

    db.prepare(`DELETE FROM writing_outline_nodes WHERE projectId=?`).run(projectId);
    for (let i = 0; i < outline.length; i++) {
      const n0 = outline[i]!;
      db.prepare(
        `INSERT INTO writing_outline_nodes(
          id, projectId, parentId, parent_id, idx, heading, goal, depth,
          createdAt, updatedAt, created_at, updated_at
        ) VALUES (?, ?, NULL, NULL, ?, ?, ?, 1, datetime('now'), datetime('now'), datetime('now'), datetime('now'))`
      ).run(randomUUID(), projectId, i, n0.heading, n0.goal);
    }

    db.prepare(
      `UPDATE writing_projects
       SET topic=?, bookSpec=?, updatedAt=datetime('now'), updated_at=datetime('now')
       WHERE id=?`
    ).run(topic, bookSpec, projectId);
    setProjectState(projectId, "outlined", llmOutline ? "outline generated by gpt" : "outline fallback");

    return res.json({ ok: true, projectId, outline, fallbackUsed: !llmOutline });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.post("/book/project/:id/draft", async (req: Request, res: Response) => {
  try {
    if (!hasOpenAiKey()) {
      return res.status(503).json({ ok: false, error: "OPENAI_API_KEY is required for draft generation" });
    }
    const projectId = s(req.params.id);
    const db = getDb("kokuzo");
    const project = getProjectOrNull(projectId);
    if (!project) return res.status(404).json({ ok: false, error: "project not found" });

    let nodes = db.prepare(
      `SELECT idx, heading, goal FROM writing_outline_nodes WHERE projectId=? ORDER BY idx ASC`
    ).all(projectId) as any[];
    if (!nodes.length) {
      const fallback = defaultOutline(s(project.topic) || s(project.title));
      for (let i = 0; i < fallback.length; i++) {
        const n0 = fallback[i]!;
        db.prepare(
          `INSERT INTO writing_outline_nodes(
            id, projectId, parentId, parent_id, idx, heading, goal, depth,
            createdAt, updatedAt, created_at, updated_at
          ) VALUES (?, ?, NULL, NULL, ?, ?, ?, 1, datetime('now'), datetime('now'), datetime('now'), datetime('now'))`
        ).run(randomUUID(), projectId, i, n0.heading, n0.goal);
      }
      nodes = db.prepare(
        `SELECT idx, heading, goal FROM writing_outline_nodes WHERE projectId=? ORDER BY idx ASC`
      ).all(projectId) as any[];
    }

    db.prepare(`DELETE FROM writing_draft_blocks WHERE projectId=?`).run(projectId);
    const draftBlocks: any[] = [];

    const writeChapterRecursive = async (index: number, continuitySummary: string): Promise<string> => {
      if (index >= nodes.length) return continuitySummary;
      const node = nodes[index]!;
      const targetChars = n((req.body as any)?.targetChars) ?? 1200;
      const content = await generateDraftBlockWithGpt({
        projectTitle: s(project.title),
        chapterHeading: s(node.heading),
        chapterGoal: s(node.goal),
        targetChars,
        continuitySummary,
        topic: s(project.topic),
        bookSpec: s(project.bookSpec),
      });
      const chars = content.length;
      const id = randomUUID();
      const nextSummary = content.slice(0, 300);
      db.prepare(
        `INSERT INTO writing_draft_blocks(
          id, projectId, chapterIndex, heading, goal, content, chars, continuitySummary,
          createdAt, updatedAt, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'), datetime('now'))`
      ).run(id, projectId, Number(node.idx ?? index), s(node.heading), s(node.goal), content, chars, nextSummary);
      draftBlocks.push({ id, chapterIndex: Number(node.idx ?? index), heading: s(node.heading), content, chars });
      return writeChapterRecursive(index + 1, nextSummary);
    };

    const finalSummary = await writeChapterRecursive(0, "");
    const totalChars = draftBlocks.reduce((a, b) => a + Number(b.chars || 0), 0);
    db.prepare(
      `UPDATE writing_projects
       SET continuitySummary=?, totalChars=?, total_blocks=?, updatedAt=datetime('now'), updated_at=datetime('now')
       WHERE id=?`
    ).run(finalSummary, totalChars, draftBlocks.length, projectId);
    setProjectState(projectId, "drafted", "draft generated");

    return res.json({ ok: true, projectId, blocks: draftBlocks, totalChars });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.post("/book/project/:id/review", (req: Request, res: Response) => {
  try {
    const projectId = s(req.params.id);
    const db = getDb("kokuzo");
    const project = getProjectOrNull(projectId);
    if (!project) return res.status(404).json({ ok: false, error: "project not found" });

    const blocks = db.prepare(
      `SELECT heading, content FROM writing_draft_blocks WHERE projectId=? ORDER BY chapterIndex ASC`
    ).all(projectId) as any[];
    const text = blocks.map((b) => String(b.content || "")).join("\n\n");
    const logs: Array<{ level: "warn" | "info"; message: string }> = [];

    if (/OCR.{0,8}(真実|絶対|完全|100%|正しい)/i.test(text)) {
      logs.push({ level: "warn", message: "OCR is not truth 契約に抵触する断定表現を検出" });
    } else {
      logs.push({ level: "info", message: "OCR is not truth 契約に抵触なし" });
    }

    if (/必ず|絶対|完全に証明/.test(text)) {
      logs.push({ level: "warn", message: "断定過多のため要再確認" });
    }

    for (const l of logs) {
      db.prepare(
        `INSERT INTO writing_review_logs(
          id, projectId, level, message, details,
          createdAt, updatedAt, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'), datetime('now'))`
      ).run(randomUUID(), projectId, l.level, l.message, JSON.stringify({ by: "bookForgeReview" }));
    }
    setProjectState(projectId, "reviewed", "review completed");
    return res.json({ ok: true, projectId, logs });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.get("/book/project/:id/export", (req: Request, res: Response) => {
  try {
    const projectId = s(req.params.id);
    const db = getDb("kokuzo");
    const project = getProjectOrNull(projectId);
    if (!project) return res.status(404).json({ ok: false, error: "project not found" });
    const blocks = db.prepare(
      `SELECT chapterIndex, heading, content FROM writing_draft_blocks WHERE projectId=? ORDER BY chapterIndex ASC`
    ).all(projectId) as any[];
    if (!blocks.length) return res.status(400).json({ ok: false, error: "no draft blocks" });

    const markdown =
      `# ${s(project.title) || "Book Forge"}\n\n` +
      blocks.map((b) => `## ${s(b.heading)}\n\n${String(b.content || "").trim()}`).join("\n\n");
    const artifactId = randomUUID();
    db.prepare(
      `INSERT INTO export_artifacts(
        id, projectId, format, content, bytes,
        createdAt, updatedAt, created_at, updated_at
      ) VALUES (?, ?, 'markdown', ?, ?, datetime('now'), datetime('now'), datetime('now'), datetime('now'))`
    ).run(artifactId, projectId, markdown, Buffer.byteLength(markdown, "utf8"));
    db.prepare(
      `INSERT INTO export_jobs(
        id, projectId, status, message, artifactId,
        createdAt, updatedAt, created_at, updated_at
      ) VALUES (?, ?, 'done', 'export completed', ?, datetime('now'), datetime('now'), datetime('now'), datetime('now'))`
    ).run(randomUUID(), projectId, artifactId);
    setProjectState(projectId, "exported", "markdown export");
    return res.json({ ok: true, projectId, format: "markdown", content: markdown });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.patch("/book/project/:id/state", (req: Request, res: Response) => {
  try {
    const projectId = s(req.params.id);
    const nextState = s((req.body as any)?.state);
    const note = s((req.body as any)?.note);
    if (!nextState) return res.status(400).json({ ok: false, error: "state required" });
    if (!getProjectOrNull(projectId)) return res.status(404).json({ ok: false, error: "project not found" });
    setProjectState(projectId, nextState, note || "state patched");
    return res.json({ ok: true, projectId, state: nextState });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.get("/ocr/runtime/verify", (_req: Request, res: Response) => {
  try {
    const bins = ["pdftotext", "tesseract", "convert", "ocrmypdf"];
    const runtime = bins.map((cmd) => {
      const out = spawnSync("bash", ["-lc", `command -v ${cmd}`], { encoding: "utf8" });
      return {
        command: cmd,
        available: out.status === 0,
        path: String(out.stdout || "").trim() || null,
      };
    });
    return res.json({ ok: true, runtime });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});
