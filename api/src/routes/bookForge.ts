import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { getDb } from "../db/index.js";
import { llmChat } from "../core/llmWrapper.js";

export const bookForgeRouter = Router();

type BookChapter = {
  idx: number;
  title: string;
  objective: string;
  continuitySummary?: string;
  text?: string;
  chars?: number;
};

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function ensureBookForgeTables(): void {
  const db = getDb("kokuzo");
  db.exec(`
    CREATE TABLE IF NOT EXISTS writing_projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      topic TEXT NOT NULL,
      outline_json TEXT,
      draft_json TEXT,
      review_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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

function buildDefaultOutline(topic: string): BookChapter[] {
  const t = topic || "主題";
  return [
    { idx: 1, title: `${t}の定義と射程`, objective: `${t}の基本概念を定義する` },
    { idx: 2, title: `${t}の歴史的背景`, objective: "背景と発展の流れを整理する" },
    { idx: 3, title: `${t}の実践と応用`, objective: "実践面と具体例を示す" },
    { idx: 4, title: `${t}の課題と展望`, objective: "限界と今後の展望を提示する" },
  ];
}

function summarizeContinuity(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 8);
  return lines.join(" / ").slice(0, 240);
}

async function generateChapter(args: {
  title: string;
  objective: string;
  topic: string;
  continuitySummary: string;
}): Promise<string> {
  const system = [
    "あなたは書籍執筆エンジン。",
    "OCR is not truth を厳守し、生OCRを真理として断定しない。",
    "placeholder や定型ダミー文を出力しない。",
    "章タイトルに沿って一貫した本文だけを返す。",
  ].join("\n");
  const user = [
    `書籍テーマ: ${args.topic}`,
    `章タイトル: ${args.title}`,
    `章目的: ${args.objective}`,
    args.continuitySummary ? `前章要約: ${args.continuitySummary}` : "前章要約: なし",
    "要件:",
    "- 日本語で500字以上",
    "- 見出しを1つだけ含める（## 章タイトル）",
    "- 具体性を持たせる",
    "- 断定が必要な箇所は留保表現を使う",
  ].join("\n");

  const out = await llmChat({ system, history: [], user });
  const text = String(out?.text || "").trim();
  if (!text) {
    return `## ${args.title}\n${args.objective}を中心に、背景・要点・実践上の示唆を段階的に整理する。断定に依存せず、観測可能な範囲で論点を提示する。`;
  }
  return text;
}

bookForgeRouter.get("/book/projects", (_req: Request, res: Response) => {
  try {
    ensureBookForgeTables();
    const db = getDb("kokuzo");
    const projects = db
      .prepare("SELECT id, title, topic, created_at, updated_at FROM writing_projects ORDER BY updated_at DESC")
      .all();
    return res.json({ ok: true, projects });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.post("/book/project", (req: Request, res: Response) => {
  try {
    ensureBookForgeTables();
    const title = s((req.body ?? {}).title) || "新規書籍";
    const topic = s((req.body ?? {}).topic) || title;
    const projectId = randomUUID();
    const db = getDb("kokuzo");
    db.prepare(
      "INSERT INTO writing_projects(id,title,topic,created_at,updated_at) VALUES(?,?,?,datetime('now'),datetime('now'))"
    ).run(projectId, title, topic);
    return res.json({ ok: true, projectId, id: projectId, title, topic });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.post("/book/project/:id/outline", (req: Request, res: Response) => {
  try {
    ensureBookForgeTables();
    const projectId = s(req.params.id);
    if (!projectId) return res.status(400).json({ ok: false, error: "project id required" });

    const db = getDb("kokuzo");
    const row = db.prepare("SELECT id, topic FROM writing_projects WHERE id=? LIMIT 1").get(projectId) as
      | { id: string; topic: string }
      | undefined;
    if (!row?.id) return res.status(404).json({ ok: false, error: "project not found" });

    const topic = s((req.body ?? {}).topic) || s(row.topic) || "主題";
    const outlineIn = Array.isArray((req.body ?? {}).outline) ? (req.body as any).outline : null;
    const outline: BookChapter[] = outlineIn && outlineIn.length > 0
      ? outlineIn.map((x: any, i: number) => ({
          idx: Number(i + 1),
          title: s(x?.title) || `第${i + 1}章`,
          objective: s(x?.objective) || s(x?.goal) || "章の要点を整理する",
        }))
      : buildDefaultOutline(topic);

    db.prepare("UPDATE writing_projects SET topic=?, outline_json=?, updated_at=datetime('now') WHERE id=?").run(
      topic,
      JSON.stringify(outline),
      projectId
    );

    return res.json({ ok: true, projectId, outline, topic });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.post("/book/project/:id/draft", async (req: Request, res: Response) => {
  try {
    ensureBookForgeTables();
    if (!process.env.OPENAI_API_KEY || !String(process.env.OPENAI_API_KEY).trim()) {
      return res.status(503).json({ ok: false, error: "OPENAI_API_KEY is not configured" });
    }

    const projectId = s(req.params.id);
    if (!projectId) return res.status(400).json({ ok: false, error: "project id required" });

    const db = getDb("kokuzo");
    const row = db
      .prepare("SELECT id, title, topic, outline_json FROM writing_projects WHERE id=? LIMIT 1")
      .get(projectId) as { id: string; title: string; topic: string; outline_json?: string } | undefined;
    if (!row?.id) return res.status(404).json({ ok: false, error: "project not found" });

    let outline = buildDefaultOutline(row.topic);
    if (row.outline_json) {
      try {
        const parsed = JSON.parse(row.outline_json) as BookChapter[];
        if (Array.isArray(parsed) && parsed.length > 0) outline = parsed;
      } catch {
        // keep default
      }
    }

    const chapters: BookChapter[] = [];
    let continuitySummary = "";
    let totalChars = 0;
    for (const ch of outline) {
      const text = await generateChapter({
        title: ch.title,
        objective: ch.objective,
        topic: row.topic,
        continuitySummary,
      });
      const chars = text.length;
      totalChars += chars;
      continuitySummary = summarizeContinuity(text);
      chapters.push({ ...ch, text, chars, continuitySummary });
    }

    db.prepare("UPDATE writing_projects SET draft_json=?, updated_at=datetime('now') WHERE id=?").run(
      JSON.stringify({
        title: row.title,
        topic: row.topic,
        chapters,
        totalChars,
      }),
      projectId
    );

    return res.json({ ok: true, projectId, chapters, totalChars });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.post("/book/project/:id/review", (req: Request, res: Response) => {
  try {
    ensureBookForgeTables();
    const projectId = s(req.params.id);
    const db = getDb("kokuzo");
    const row = db
      .prepare("SELECT draft_json FROM writing_projects WHERE id=? LIMIT 1")
      .get(projectId) as { draft_json?: string } | undefined;
    if (!row) return res.status(404).json({ ok: false, error: "project not found" });

    const draft = row.draft_json ? JSON.parse(row.draft_json) : {};
    const allText = JSON.stringify(draft);
    const placeholderHit = /safeFillerLine|placeholder/i.test(allText);
    const ocrContractOk = !/OCR\s*raw\s*text\s*is\s*truth/i.test(allText);
    const findings: string[] = [];
    if (placeholderHit) findings.push("placeholder_detected");
    if (!ocrContractOk) findings.push("ocr_truth_violation");
    if (s((req.body ?? {}).note).toLowerCase().includes("ocr is not truth")) {
      findings.push("contract_note_received");
    }

    const passed = !placeholderHit && ocrContractOk;
    const report = {
      passed,
      checks: {
        placeholderDetected: placeholderHit,
        ocrContractPreserved: ocrContractOk,
      },
      findings,
    };

    db.prepare("UPDATE writing_projects SET review_json=?, updated_at=datetime('now') WHERE id=?").run(
      JSON.stringify(report),
      projectId
    );
    return res.json({ ok: true, projectId, report });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.get("/book/project/:id/export", (req: Request, res: Response) => {
  try {
    ensureBookForgeTables();
    const projectId = s(req.params.id);
    const db = getDb("kokuzo");
    const row = db
      .prepare("SELECT title, topic, draft_json FROM writing_projects WHERE id=? LIMIT 1")
      .get(projectId) as { title?: string; topic?: string; draft_json?: string } | undefined;
    if (!row) return res.status(404).json({ ok: false, error: "project not found" });

    const draft = row.draft_json ? JSON.parse(row.draft_json) : {};
    const chapters: BookChapter[] = Array.isArray(draft?.chapters) ? draft.chapters : [];
    const body = [`# ${s(row.title) || "無題"}`, `テーマ: ${s(row.topic)}`, ""]
      .concat(chapters.map((c) => String(c.text || `## ${c.title}\n`)))
      .join("\n\n");
    return res.json({ ok: true, projectId, markdown: body, chars: body.length });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

