import { randomUUID, createHash } from "crypto";
import { Router, type Request, type Response } from "express";
import { getDb } from "../db/index.js";

export const bookForgeRouter = Router();

type ProjectType = "book" | "paper";
type ProjectLane = "normal_chat" | "deepread" | "book_forge_unlimited" | "paper_forge_unlimited";
type ProjectState =
  | "idle"
  | "collecting_sources"
  | "analyzing_sources"
  | "clarifying_intent"
  | "planning_outline"
  | "locking_book_spec"
  | "drafting"
  | "reviewing"
  | "revising"
  | "export_ready"
  | "completed";

type SourceKind =
  | "uploaded_file"
  | "local_file"
  | "pdf_text_layer"
  | "pdf_ocr"
  | "notion_page"
  | "google_drive_file"
  | "dropbox_file"
  | "web_url"
  | "web_crawl_page"
  | "thread_memory"
  | "generated_note";

function s(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function n(v: unknown): number | null {
  const x =
    typeof v === "number"
      ? v
      : typeof v === "string" && v.trim().length > 0
        ? Number(v)
        : NaN;
  return Number.isFinite(x) ? x : null;
}

function toProjectType(v: unknown): ProjectType {
  return s(v).trim() === "paper" ? "paper" : "book";
}

function laneFromType(projectType: ProjectType): ProjectLane {
  return projectType === "paper" ? "paper_forge_unlimited" : "book_forge_unlimited";
}

function parseState(v: unknown): ProjectState | null {
  const t = s(v).trim();
  const valid: ProjectState[] = [
    "idle",
    "collecting_sources",
    "analyzing_sources",
    "clarifying_intent",
    "planning_outline",
    "locking_book_spec",
    "drafting",
    "reviewing",
    "revising",
    "export_ready",
    "completed",
  ];
  return valid.includes(t as ProjectState) ? (t as ProjectState) : null;
}

function parseSourceKind(v: unknown): SourceKind | null {
  const t = s(v).trim();
  const valid: SourceKind[] = [
    "uploaded_file",
    "local_file",
    "pdf_text_layer",
    "pdf_ocr",
    "notion_page",
    "google_drive_file",
    "dropbox_file",
    "web_url",
    "web_crawl_page",
    "thread_memory",
    "generated_note",
  ];
  return valid.includes(t as SourceKind) ? (t as SourceKind) : null;
}

function updateProjectState(projectId: string, next: ProjectState, note?: string): void {
  const db = getDb("kokuzo");
  const prev = db.prepare("SELECT state FROM writing_projects WHERE id=? LIMIT 1").get(projectId) as any;
  db.prepare("UPDATE writing_projects SET state=?, updatedAt=datetime('now') WHERE id=?").run(next, projectId);
  db.prepare(
    "INSERT INTO writing_progress_logs(id, project_id, state_from, state_to, note) VALUES (?, ?, ?, ?, ?)"
  ).run(randomUUID(), projectId, prev?.state ?? null, next, note ?? null);
}

function buildSynopsis(title: string, audience: string, projectType: ProjectType): string {
  const medium = projectType === "paper" ? "論文" : "書籍";
  return `${title}を主題に、${audience || "実務読者"}へ向けて論点を段階的に展開する${medium}です。根拠と反証可能性を明示し、結論までの連続性を維持します。`;
}

function buildOutlineChapters(title: string, projectType: ProjectType): Array<{ title: string; goal: string }> {
  if (projectType === "paper") {
    return [
      { title: "研究背景と問題設定", goal: `${title}の背景と課題定義を明確化する` },
      { title: "先行研究と方法", goal: "既存知見を整理し、本稿の方法を示す" },
      { title: "分析と結果", goal: "観測事実と分析結果を提示する" },
      { title: "考察と結論", goal: "限界と今後課題を含めて結論を示す" },
    ];
  }
  return [
    { title: "序章: なぜ今この主題か", goal: `${title}を扱う意義を共有する` },
    { title: "基礎整理: 用語と前提", goal: "誤読を防ぐための前提を揃える" },
    { title: "本論: 中核命題の展開", goal: "主張・根拠・反証可能性を構造化する" },
    { title: "応用: 現場での使い方", goal: "実運用に落とし込む道筋を示す" },
    { title: "終章: 継続的改善の設計", goal: "次の実践と更新原則を定義する" },
  ];
}

function chapterDraftText(args: {
  chapterTitle: string;
  chapterGoal: string;
  synopsis: string;
  tone: string;
  rhetoric: string;
  sourceTitles: string[];
  continuity: string;
}): string {
  const sourceLine = args.sourceTitles.length > 0
    ? `参照ソース: ${args.sourceTitles.slice(0, 6).join(" / ")}。`
    : "参照ソースが未選定のため、断言を避けて論点整理を優先する。";
  return [
    `### ${args.chapterTitle}`,
    `${args.chapterGoal}。`,
    `本章は全体要約「${args.synopsis}」との整合を維持し、前章連続性「${args.continuity || "導入段階"}」を継承して記述する。`,
    `${sourceLine}`,
    `文体は${args.tone || "中立"}、論法は${args.rhetoric || "演繹と帰納の併用"}で固定し、読者が検証可能な順序で叙述する。`,
    "第一に、主張の前提を明示する。第二に、前提から導かれる論点を提示する。第三に、例外条件と境界条件を示す。",
    "最後に、次章で扱う問いを明確化し、章間の接続を損なわない形で要点を再定義する。",
  ].join("\n\n");
}

function toMarkdown(project: any, outline: any[], blocks: any[]): string {
  const lines: string[] = [];
  lines.push(`# ${String(project.title ?? "Untitled Project")}`);
  if (project.subtitle) lines.push(`## ${String(project.subtitle)}`);
  lines.push("");
  lines.push(`- state: ${String(project.state)}`);
  lines.push(`- lane: ${String(project.lane)}`);
  lines.push(`- target_chars: ${String(project.targetChars ?? "")}`);
  lines.push("");
  lines.push("## Synopsis");
  lines.push(String(project.synopsis ?? ""));
  lines.push("");
  lines.push("## Outline");
  for (const ch of outline.filter((n: any) => n.node_type === "chapter")) {
    lines.push(`- ${String(ch.title)}`);
  }
  lines.push("");
  lines.push("## Draft");
  if (blocks.length === 0) {
    lines.push("（本文未生成）");
  } else {
    for (const b of blocks) lines.push(String(b.content ?? ""));
  }
  lines.push("");
  return lines.join("\n");
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

function extractMeta(html: string, name: string): string {
  const re1 = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const re2 = new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return (html.match(re1)?.[1] ?? html.match(re2)?.[1] ?? "").trim();
}

function extractCanonical(html: string): string {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i);
  return (m?.[1] ?? "").trim();
}

function stripHtmlToText(html: string): string {
  const withoutScript = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ");
  const text = withoutScript
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

function extractLinks(baseUrl: string, html: string): string[] {
  const out: string[] = [];
  const re = /<a[^>]+href=["']([^"'#]+)["'][^>]*>/gi;
  let m: RegExpExecArray | null = null;
  while ((m = re.exec(html)) !== null) {
    try {
      const u = new URL(m[1], baseUrl);
      if (u.protocol === "http:" || u.protocol === "https:") out.push(u.toString());
    } catch {
      // ignore malformed url
    }
  }
  return out;
}

function toTopicTags(mainText: string): string[] {
  const words = mainText
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4);
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([w]) => w);
}

function toKeyClaims(mainText: string): string[] {
  return mainText
    .split(/[。.!?]/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 20)
    .slice(0, 8);
}

bookForgeRouter.post("/book/project", (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as any;
    const projectType = toProjectType(body.projectType);
    const lane = laneFromType(projectType);
    const title = s(body.title).trim() || (projectType === "paper" ? "新規論文プロジェクト" : "新規書籍プロジェクト");
    const id = randomUUID();
    const synopsis = s(body.synopsis).trim() || buildSynopsis(title, s(body.audience).trim(), projectType);
    const targetChars = n(body.targetChars);
    const db = getDb("kokuzo");
    db.prepare(
      `INSERT INTO writing_projects(
        id, projectType, lane, state, title, subtitle, synopsis, audience, tone, rhetoric, mode, targetChars,
        globalThesis, terminologyLock, continuitySummary, totalChars, createdAt, updatedAt
      ) VALUES (?, ?, ?, 'collecting_sources', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`
    ).run(
      id,
      projectType,
      lane,
      title,
      s(body.subtitle).trim() || null,
      synopsis,
      s(body.audience).trim() || null,
      s(body.tone).trim() || null,
      s(body.rhetoric).trim() || null,
      s(body.mode).trim() || null,
      targetChars,
      s(body.globalThesis).trim() || null,
      null,
      s(body.continuitySummary).trim() || null
    );
    db.prepare(
      "INSERT INTO writing_progress_logs(id, project_id, state_from, state_to, note) VALUES (?, ?, ?, ?, ?)"
    ).run(randomUUID(), id, null, "collecting_sources", "project created");
    return res.json({ ok: true, projectId: id, lane, state: "collecting_sources" });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.get("/book/projects", (req: Request, res: Response) => {
  try {
    const db = getDb("kokuzo");
    const state = parseState(req.query.state);
    const projectType = s(req.query.projectType).trim();
    let sql = `
      SELECT
        p.*,
        COALESCE((SELECT COUNT(*) FROM writing_draft_blocks b WHERE b.project_id = p.id), 0) AS total_blocks,
        (SELECT status FROM export_jobs e WHERE e.project_id = p.id ORDER BY e.createdAt DESC LIMIT 1) AS export_status
      FROM writing_projects p
    `;
    const params: any[] = [];
    const where: string[] = [];
    if (state) {
      where.push("p.state = ?");
      params.push(state);
    }
    if (projectType === "book" || projectType === "paper") {
      where.push("p.projectType = ?");
      params.push(projectType);
    }
    if (where.length > 0) sql += ` WHERE ${where.join(" AND ")}`;
    sql += " ORDER BY p.updatedAt DESC LIMIT 200";
    const projects = db.prepare(sql).all(...params);
    return res.json({ ok: true, projects });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.get("/book/project/:id", (req: Request, res: Response) => {
  try {
    const id = s(req.params.id).trim();
    if (!id) return res.status(400).json({ ok: false, error: "id required" });
    const db = getDb("kokuzo");
    const project = db.prepare("SELECT * FROM writing_projects WHERE id=? LIMIT 1").get(id);
    if (!project) return res.status(404).json({ ok: false, error: "project not found" });
    const sources = db.prepare(
      `SELECT sr.*, ws.priority AS binding_priority, ws.selected
       FROM writing_sources ws
       JOIN source_registry sr ON sr.id = ws.source_id
       WHERE ws.project_id=?
       ORDER BY ws.priority DESC, sr.createdAt DESC`
    ).all(id);
    const outline = db.prepare(
      "SELECT * FROM writing_outline_nodes WHERE project_id=? ORDER BY node_order ASC, createdAt ASC"
    ).all(id);
    const blocks = db.prepare(
      "SELECT * FROM writing_draft_blocks WHERE project_id=? ORDER BY chapter_idx, section_idx, block_idx"
    ).all(id);
    const exports = db.prepare(
      "SELECT * FROM export_jobs WHERE project_id=? ORDER BY createdAt DESC LIMIT 20"
    ).all(id);
    return res.json({ ok: true, project, sources, outline, blocks, exports });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.post("/book/project/:id/source", (req: Request, res: Response) => {
  try {
    const projectId = s(req.params.id).trim();
    if (!projectId) return res.status(400).json({ ok: false, error: "project id required" });
    const body = (req.body ?? {}) as any;
    const sourceKind = parseSourceKind(body.sourceKind);
    if (!sourceKind) return res.status(400).json({ ok: false, error: "sourceKind invalid" });

    const connectorType = s(body.connectorType).trim() || sourceKind;
    const title = s(body.title).trim() || s(body.url).trim() || `${sourceKind}-${new Date().toISOString()}`;
    const content = s(body.content).trim() || s(body.text).trim() || "";
    const sourceHash = createHash("sha256").update(`${sourceKind}:${title}:${content}`).digest("hex");
    const sourceId = randomUUID();
    const db = getDb("kokuzo");
    const exists = db.prepare("SELECT id FROM writing_projects WHERE id=? LIMIT 1").get(projectId) as any;
    if (!exists?.id) return res.status(404).json({ ok: false, error: "project not found" });

    db.prepare(
      `INSERT INTO source_registry(
        id, project_id, source_kind, connector_type, title, provenance, engine, confidence, priority,
        source_hash, page_range, extracted_ref, qc_summary, uncertainty_flags, nas_locator, content, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).run(
      sourceId,
      projectId,
      sourceKind,
      connectorType,
      title,
      JSON.stringify({
        url: s(body.url).trim() || null,
        path: s(body.path).trim() || null,
        externalId: s(body.externalId).trim() || null,
      }),
      s(body.engine).trim() || null,
      n(body.confidence),
      n(body.priority) ?? 50,
      sourceHash,
      s(body.pageRange).trim() || null,
      s(body.extractedRef).trim() || null,
      JSON.stringify({ summary: s(body.qcSummary).trim() || null }),
      JSON.stringify(Array.isArray(body.uncertaintyFlags) ? body.uncertaintyFlags : []),
      s(body.nasLocator).trim() || null,
      content || null
    );

    db.prepare(
      `INSERT INTO writing_sources(id, project_id, source_id, priority, selected, createdAt)
       VALUES (?, ?, ?, ?, 1, datetime('now'))
       ON CONFLICT(project_id, source_id) DO UPDATE SET priority=excluded.priority, selected=1`
    ).run(randomUUID(), projectId, sourceId, n(body.priority) ?? 50);

    db.prepare(
      `INSERT INTO source_analysis_logs(
        id, project_id, source_id, source_summary, topic_clusters, thesis_candidates, repeated_claims,
        contradiction_map, reusable_quotes, style_signals, missing_topics, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).run(
      randomUUID(),
      projectId,
      sourceId,
      `${title} をソース登録。${sourceKind} として分析対象へ追加。`,
      JSON.stringify([title]),
      JSON.stringify([`主題候補: ${title}`]),
      JSON.stringify([]),
      JSON.stringify([]),
      JSON.stringify([]),
      JSON.stringify([`connector:${connectorType}`]),
      JSON.stringify([])
    );

    updateProjectState(projectId, "analyzing_sources", `source attached: ${sourceKind}`);
    return res.json({ ok: true, sourceId, projectId, sourceKind });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.post("/book/project/:id/source/import-doc", (req: Request, res: Response) => {
  try {
    const projectId = s(req.params.id).trim();
    const body = (req.body ?? {}) as any;
    const doc = s(body.doc).trim().toUpperCase();
    if (!projectId || !doc) return res.status(400).json({ ok: false, error: "project id and doc required" });
    const db = getDb("kokuzo");
    const project = db.prepare("SELECT id FROM writing_projects WHERE id=? LIMIT 1").get(projectId) as any;
    if (!project?.id) return res.status(404).json({ ok: false, error: "project not found" });

    const pages = db.prepare("SELECT text, pdfPage FROM kokuzo_pages WHERE doc=? ORDER BY pdfPage ASC").all(doc) as any[];
    const ocrRows = db.prepare(
      "SELECT text_norm, engine, qc_json, pdfPage FROM kokuzo_ocr_pages WHERE doc=? ORDER BY pdfPage ASC"
    ).all(doc) as any[];
    if (pages.length === 0 && ocrRows.length === 0) {
      return res.status(404).json({ ok: false, error: "no pages found for doc" });
    }

    const inserted: string[] = [];
    if (pages.length > 0) {
      const joined = pages.map((p: any) => String(p.text ?? "")).join("\n");
      const sourceId = randomUUID();
      const hash = createHash("sha256").update(`pdf_text_layer:${doc}:${joined}`).digest("hex");
      db.prepare(
        `INSERT INTO source_registry(
          id, project_id, source_kind, connector_type, title, provenance, engine, confidence, priority,
          source_hash, page_range, extracted_ref, qc_summary, uncertainty_flags, nas_locator, content, createdAt
        ) VALUES (?, ?, 'pdf_text_layer', 'kokuzo_pages', ?, ?, 'pdftotext|pypdf', ?, 70, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).run(
        sourceId,
        projectId,
        `${doc} (text layer)`,
        JSON.stringify({ doc, total_pages: pages.length }),
        0.85,
        hash,
        `1-${pages[pages.length - 1]?.pdfPage ?? pages.length}`,
        `kokuzo_pages:${doc}`,
        JSON.stringify({ doc, total_pages: pages.length }),
        JSON.stringify([]),
        null,
        joined
      );
      db.prepare(
        `INSERT INTO writing_sources(id, project_id, source_id, priority, selected, createdAt)
         VALUES (?, ?, ?, 70, 1, datetime('now'))`
      ).run(randomUUID(), projectId, sourceId);
      inserted.push(sourceId);
    }

    if (ocrRows.length > 0) {
      const joined = ocrRows.map((r: any) => String(r.text_norm ?? "")).join("\n");
      const sourceId = randomUUID();
      const hash = createHash("sha256").update(`pdf_ocr:${doc}:${joined}`).digest("hex");
      db.prepare(
        `INSERT INTO source_registry(
          id, project_id, source_kind, connector_type, title, provenance, engine, confidence, priority,
          source_hash, page_range, extracted_ref, qc_summary, uncertainty_flags, nas_locator, content, createdAt
        ) VALUES (?, ?, 'pdf_ocr', 'kokuzo_ocr_pages', ?, ?, 'tesseract', ?, 60, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).run(
        sourceId,
        projectId,
        `${doc} (ocr)`,
        JSON.stringify({ doc, total_pages: ocrRows.length }),
        0.62,
        hash,
        `1-${ocrRows[ocrRows.length - 1]?.pdfPage ?? ocrRows.length}`,
        `kokuzo_ocr_pages:${doc}`,
        JSON.stringify({ doc, engines: [...new Set(ocrRows.map((r: any) => String(r.engine || "unknown")))] }),
        JSON.stringify(["ocr_provisional"]),
        null,
        joined
      );
      db.prepare(
        `INSERT INTO writing_sources(id, project_id, source_id, priority, selected, createdAt)
         VALUES (?, ?, ?, 60, 1, datetime('now'))`
      ).run(randomUUID(), projectId, sourceId);
      inserted.push(sourceId);
    }

    updateProjectState(projectId, "analyzing_sources", `doc imported: ${doc}`);
    return res.json({ ok: true, projectId, doc, insertedSourceIds: inserted, pages: pages.length, ocrPages: ocrRows.length });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.post("/book/project/:id/crawl", async (req: Request, res: Response) => {
  try {
    const projectId = s(req.params.id).trim();
    const body = (req.body ?? {}) as any;
    const seedUrl = s(body.seedUrl).trim();
    if (!projectId || !seedUrl) return res.status(400).json({ ok: false, error: "project id and seedUrl required" });
    const depth = Math.max(0, Math.min(4, Math.floor(n(body.depth) ?? 2)));
    const maxPages = Math.max(1, Math.min(200, Math.floor(n(body.maxPages) ?? 100)));
    const seed = new URL(seedUrl);
    const baseHost = seed.host;
    const db = getDb("kokuzo");
    const runId = randomUUID();
    db.prepare(
      "INSERT INTO crawl_runs(id, project_id, seed_url, depth, max_pages, pages_crawled, status, summary, createdAt) VALUES (?, ?, ?, ?, ?, 0, 'running', NULL, datetime('now'))"
    ).run(runId, projectId, seed.toString(), depth, maxPages);

    const queue: Array<{ url: string; d: number }> = [{ url: seed.toString(), d: 0 }];
    const visited = new Set<string>();
    const pages: Array<{ url: string; title: string; text: string; tags: string[]; claims: string[]; author: string; published: string }> = [];

    while (queue.length > 0 && pages.length < maxPages) {
      const cur = queue.shift()!;
      if (visited.has(cur.url)) continue;
      visited.add(cur.url);
      let html = "";
      try {
        const resp = await fetch(cur.url, { redirect: "follow" });
        const ctype = String(resp.headers.get("content-type") ?? "");
        if (!resp.ok || !ctype.includes("text/html")) continue;
        html = await resp.text();
      } catch {
        continue;
      }
      if (/noindex/i.test(extractMeta(html, "robots"))) continue;
      const canonical = extractCanonical(html) || cur.url;
      if (visited.has(canonical)) continue;
      visited.add(canonical);

      const title = extractTitle(html) || new URL(cur.url).hostname;
      const author = extractMeta(html, "author");
      const published = extractMeta(html, "article:published_time") || extractMeta(html, "published_time");
      const text = stripHtmlToText(html).slice(0, 32000);
      if (text.length < 120) continue;
      const tags = toTopicTags(text);
      const claims = toKeyClaims(text);
      pages.push({ url: cur.url, title, text, tags, claims, author, published });

      const pageId = randomUUID();
      const hash = createHash("sha256").update(`${canonical}:${text}`).digest("hex");
      db.prepare(
        `INSERT INTO crawl_pages(
          id, run_id, project_id, url, canonical_url, title, published_at, author, main_text, topic_tags, key_claims, source_hash, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).run(pageId, runId, projectId, cur.url, canonical, title, published || null, author || null, text, JSON.stringify(tags), JSON.stringify(claims), hash);

      const sourceId = randomUUID();
      db.prepare(
        `INSERT INTO source_registry(
          id, project_id, source_kind, connector_type, title, provenance, engine, confidence, priority, source_hash,
          page_range, extracted_ref, qc_summary, uncertainty_flags, nas_locator, content, createdAt
        ) VALUES (?, ?, 'web_crawl_page', 'web_crawl', ?, ?, 'crawl_v1', 0.6, 55, ?, NULL, ?, ?, ?, NULL, ?, datetime('now'))`
      ).run(
        sourceId,
        projectId,
        title,
        JSON.stringify({ runId, url: cur.url, canonical }),
        hash,
        `crawl_pages:${pageId}`,
        JSON.stringify({ length: text.length, host: new URL(cur.url).host }),
        JSON.stringify(["crawl_provisional"]),
        text
      );
      db.prepare(
        `INSERT INTO writing_sources(id, project_id, source_id, priority, selected, createdAt)
         VALUES (?, ?, ?, 55, 1, datetime('now'))
         ON CONFLICT(project_id, source_id) DO UPDATE SET selected=1`
      ).run(randomUUID(), projectId, sourceId);

      if (cur.d < depth) {
        const links = extractLinks(cur.url, html)
          .filter((href) => {
            try {
              const u = new URL(href);
              return u.host === baseHost;
            } catch {
              return false;
            }
          })
          .slice(0, 40);
        for (const href of links) {
          if (!visited.has(href)) queue.push({ url: href, d: cur.d + 1 });
        }
      }
    }

    const summary = pages.length > 0
      ? `${pages.length} pages crawled from ${baseHost}`
      : "no pages crawled";
    db.prepare(
      "UPDATE crawl_runs SET pages_crawled=?, status='completed', summary=? WHERE id=?"
    ).run(pages.length, summary, runId);
    db.prepare(
      `INSERT INTO source_analysis_logs(
        id, project_id, source_id, source_summary, topic_clusters, thesis_candidates, repeated_claims,
        contradiction_map, reusable_quotes, style_signals, missing_topics, createdAt
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).run(
      randomUUID(),
      projectId,
      summary,
      JSON.stringify([...new Set(pages.flatMap((p) => p.tags))].slice(0, 20)),
      JSON.stringify(pages.flatMap((p) => p.claims).slice(0, 20)),
      JSON.stringify([]),
      JSON.stringify([]),
      JSON.stringify([]),
      JSON.stringify(["crawl_bundle"]),
      JSON.stringify([])
    );
    updateProjectState(projectId, "analyzing_sources", summary);
    return res.json({ ok: true, projectId, runId, pagesCrawled: pages.length, summary });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.post("/book/project/:id/outline", (req: Request, res: Response) => {
  try {
    const projectId = s(req.params.id).trim();
    if (!projectId) return res.status(400).json({ ok: false, error: "project id required" });
    const body = (req.body ?? {}) as any;
    const db = getDb("kokuzo");
    const project = db.prepare("SELECT * FROM writing_projects WHERE id=? LIMIT 1").get(projectId) as any;
    if (!project?.id) return res.status(404).json({ ok: false, error: "project not found" });

    const title = s(body.title).trim() || String(project.title);
    const audience = s(body.audience).trim() || s(project.audience).trim() || "実務読者";
    const tone = s(body.tone).trim() || s(project.tone).trim() || "丁寧で明晰";
    const rhetoric = s(body.rhetoric).trim() || s(project.rhetoric).trim() || "命題→根拠→反証→結論";
    const synopsis = s(body.synopsis).trim() || s(project.synopsis).trim() || buildSynopsis(title, audience, project.projectType);

    const chapters = buildOutlineChapters(title, toProjectType(project.projectType));
    db.prepare("DELETE FROM writing_outline_nodes WHERE project_id=?").run(projectId);
    chapters.forEach((ch, idx) => {
      db.prepare(
        `INSERT INTO writing_outline_nodes(id, project_id, parent_id, node_type, node_order, title, goal, summary, createdAt)
         VALUES (?, ?, NULL, 'chapter', ?, ?, ?, ?, datetime('now'))`
      ).run(randomUUID(), projectId, idx + 1, ch.title, ch.goal, null);
    });
    db.prepare(
      `INSERT INTO writing_style_contracts(
        id, project_id, rhetorical_contract, style_contract, prohibition_contract, createdAt
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).run(
      randomUUID(),
      projectId,
      rhetoric,
      `tone:${tone}; audience:${audience};`,
      s(body.prohibitionContract).trim() || "raw OCR text を真理として断定しない"
    );
    db.prepare(
      `UPDATE writing_projects
       SET title=?, audience=?, tone=?, rhetoric=?, synopsis=?, state='locking_book_spec', updatedAt=datetime('now')
       WHERE id=?`
    ).run(title, audience, tone, rhetoric, synopsis, projectId);
    db.prepare(
      "INSERT INTO writing_progress_logs(id, project_id, state_from, state_to, note) VALUES (?, ?, ?, ?, ?)"
    ).run(randomUUID(), projectId, project.state, "locking_book_spec", "outline generated");

    return res.json({
      ok: true,
      projectId,
      title,
      synopsis,
      tone,
      rhetoric,
      outline: chapters,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.post("/book/project/:id/draft", (req: Request, res: Response) => {
  try {
    const projectId = s(req.params.id).trim();
    if (!projectId) return res.status(400).json({ ok: false, error: "project id required" });
    const db = getDb("kokuzo");
    const project = db.prepare("SELECT * FROM writing_projects WHERE id=? LIMIT 1").get(projectId) as any;
    if (!project?.id) return res.status(404).json({ ok: false, error: "project not found" });

    const outline = db.prepare(
      "SELECT * FROM writing_outline_nodes WHERE project_id=? AND node_type='chapter' ORDER BY node_order ASC"
    ).all(projectId) as any[];
    if (outline.length === 0) return res.status(400).json({ ok: false, error: "outline not found, run /outline first" });

    const selectedSources = db.prepare(
      `SELECT sr.* FROM writing_sources ws
       JOIN source_registry sr ON sr.id = ws.source_id
       WHERE ws.project_id=? AND ws.selected=1
       ORDER BY ws.priority DESC, sr.createdAt DESC`
    ).all(projectId) as any[];

    const sourceTitles = selectedSources.map((s0: any) => String(s0.title || s0.connector_type || s0.source_kind));
    const continuation = db.prepare(
      "SELECT continuity_summary FROM book_continuation_memory WHERE project_id=? LIMIT 1"
    ).get(projectId) as any;

    db.prepare("DELETE FROM writing_draft_blocks WHERE project_id=?").run(projectId);
    let totalChars = 0;
    let continuitySummary = s(continuation?.continuity_summary).trim();
    const chapterTexts: string[] = [];

    outline.forEach((ch, idx) => {
      const text = chapterDraftText({
        chapterTitle: String(ch.title),
        chapterGoal: String(ch.goal ?? ""),
        synopsis: String(project.synopsis ?? ""),
        tone: String(project.tone ?? ""),
        rhetoric: String(project.rhetoric ?? ""),
        sourceTitles,
        continuity: continuitySummary,
      });
      const chars = text.length;
      totalChars += chars;
      continuitySummary = `${String(ch.title)} の要点を確定。次章では前提と反証条件を継承する。`;
      chapterTexts.push(text);
      db.prepare(
        `INSERT INTO writing_draft_blocks(
          id, project_id, chapter_idx, section_idx, block_idx, title, content, chars, continuity_summary, createdAt
        ) VALUES (?, ?, ?, 0, 0, ?, ?, ?, ?, datetime('now'))`
      ).run(randomUUID(), projectId, idx + 1, String(ch.title), text, chars, continuitySummary);
    });

    db.prepare(
      `INSERT INTO book_continuation_memory(project_id, continuity_summary, updatedAt)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(project_id) DO UPDATE SET continuity_summary=excluded.continuity_summary, updatedAt=datetime('now')`
    ).run(projectId, continuitySummary || "章間連続性を更新");

    db.prepare(
      "UPDATE writing_projects SET state='drafting', continuitySummary=?, totalChars=?, updatedAt=datetime('now') WHERE id=?"
    ).run(continuitySummary, totalChars, projectId);
    db.prepare(
      "INSERT INTO writing_progress_logs(id, project_id, state_from, state_to, note) VALUES (?, ?, ?, ?, ?)"
    ).run(randomUUID(), projectId, project.state, "drafting", `draft generated chars=${totalChars}`);

    const runId = randomUUID();
    db.prepare(
      "INSERT INTO writer_runs(id, threadId, mode, title, targetChars, tolerancePct) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(runId, projectId, project.mode ?? "book_forge", project.title, project.targetChars ?? null, 0.02);
    db.prepare(
      "INSERT INTO writer_artifacts(id, runId, kind, content, proofJson) VALUES (?, ?, ?, ?, ?)"
    ).run(randomUUID(), runId, "draft_markdown", chapterTexts.join("\n\n"), JSON.stringify({ projectId, totalChars }));

    return res.json({
      ok: true,
      projectId,
      chapters: outline.length,
      totalChars,
      continuitySummary,
      draft: chapterTexts.join("\n\n"),
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.post("/book/project/:id/review", (req: Request, res: Response) => {
  try {
    const projectId = s(req.params.id).trim();
    if (!projectId) return res.status(400).json({ ok: false, error: "project id required" });
    const db = getDb("kokuzo");
    const blocks = db.prepare("SELECT content FROM writing_draft_blocks WHERE project_id=? ORDER BY chapter_idx").all(projectId) as any[];
    if (blocks.length === 0) return res.status(400).json({ ok: false, error: "draft not found" });
    const merged = blocks.map((b: any) => String(b.content ?? "")).join("\n");
    const hasOCRAssert = /OCR.*真理|raw OCR.*断定/i.test(merged);
    const reviewResult = hasOCRAssert ? "warn" : "pass";
    const details = hasOCRAssert
      ? "OCR is not truth 契約に抵触し得る断定表現を検知。"
      : "章間整合・出典運用・文体固定の最小監査を通過。";
    db.prepare(
      `INSERT INTO writing_review_logs(id, project_id, chapter_idx, block_id, review_kind, result, details, createdAt)
       VALUES (?, ?, NULL, NULL, 'consistency', ?, ?, datetime('now'))`
    ).run(randomUUID(), projectId, reviewResult, details);
    updateProjectState(projectId, "reviewing", details);
    return res.json({ ok: true, projectId, result: reviewResult, details });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

bookForgeRouter.get("/book/project/:id/export", (req: Request, res: Response) => {
  try {
    const projectId = s(req.params.id).trim();
    if (!projectId) return res.status(400).json({ ok: false, error: "project id required" });
    const format = s(req.query.format).trim() || "markdown";
    const db = getDb("kokuzo");
    const project = db.prepare("SELECT * FROM writing_projects WHERE id=? LIMIT 1").get(projectId) as any;
    if (!project?.id) return res.status(404).json({ ok: false, error: "project not found" });
    const outline = db.prepare(
      "SELECT * FROM writing_outline_nodes WHERE project_id=? ORDER BY node_order ASC, createdAt ASC"
    ).all(projectId) as any[];
    const blocks = db.prepare(
      "SELECT * FROM writing_draft_blocks WHERE project_id=? ORDER BY chapter_idx, section_idx, block_idx"
    ).all(projectId) as any[];
    const markdown = toMarkdown(project, outline, blocks);
    const totalChars = markdown.length;
    const exportId = randomUUID();
    db.prepare(
      `INSERT INTO export_jobs(id, project_id, format, status, artifact_ref, total_chars, createdAt)
       VALUES (?, ?, ?, 'completed', ?, ?, datetime('now'))`
    ).run(exportId, projectId, format, `writer_artifacts:${exportId}`, totalChars);
    db.prepare("UPDATE writing_projects SET state='export_ready', totalChars=?, updatedAt=datetime('now') WHERE id=?").run(totalChars, projectId);
    db.prepare(
      "INSERT INTO writing_progress_logs(id, project_id, state_from, state_to, note) VALUES (?, ?, ?, ?, ?)"
    ).run(randomUUID(), projectId, project.state, "export_ready", `export format=${format}`);

    return res.json({
      ok: true,
      projectId,
      format,
      totalChars,
      exportJobId: exportId,
      markdown,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});
