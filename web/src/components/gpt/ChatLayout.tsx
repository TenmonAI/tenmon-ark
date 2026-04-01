import React, { useEffect, useMemo, useState } from "react";
import { useChat } from "../../hooks/useChat";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import {
  attachBookSource,
  createBookProject,
  crawlSeed,
  exportMarkdown,
  generateDraft,
  generateOutline,
  getBookProject,
  importDocSource,
  listBookProjects,
  runReview,
} from "../../api/bookForge";

type BuildMode = "normal_chat" | "deepread" | "book_forge_unlimited" | "paper_forge_unlimited" | "summary_rebuild";
type ProjectTab = "project" | "sources" | "outline" | "style" | "progress" | "export";

function modeLabel(mode: BuildMode): string {
  if (mode === "normal_chat") return "通常会話";
  if (mode === "deepread") return "深読";
  if (mode === "book_forge_unlimited") return "書籍構築";
  if (mode === "paper_forge_unlimited") return "論文構築";
  return "要約再構成";
}

export function ChatLayout({ initialMode }: { initialMode?: string }) {
  const { messages, sendMessage, loading } = useChat();
  const [mode, setMode] = useState<BuildMode>(
    initialMode === "book_forge_unlimited" || initialMode === "paper_forge_unlimited"
      ? (initialMode as BuildMode)
      : "normal_chat"
  );
  const [tab, setTab] = useState<ProjectTab>("project");
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  const [activeProject, setActiveProject] = useState<any | null>(null);
  const [uiBusy, setUiBusy] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [seedUrl, setSeedUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [projectTitle, setProjectTitle] = useState("");

  const isForgeMode = mode === "book_forge_unlimited" || mode === "paper_forge_unlimited";

  const pushLog = (line: string) => {
    setLogLines((prev) => [`${new Date().toLocaleTimeString()} ${line}`, ...prev].slice(0, 120));
  };

  const refreshProjects = async () => {
    const r = await listBookProjects();
    if (r?.ok && Array.isArray(r.projects)) {
      setProjects(r.projects);
      if (!activeProjectId && r.projects[0]?.id) setActiveProjectId(String(r.projects[0].id));
    }
  };

  const refreshActiveProject = async (projectId: string) => {
    if (!projectId) return;
    const r = await getBookProject(projectId);
    if (r?.ok) setActiveProject(r);
  };

  useEffect(() => {
    refreshProjects().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!activeProjectId) return;
    refreshActiveProject(activeProjectId).catch(() => undefined);
  }, [activeProjectId]);

  const activeProjectMeta = useMemo(() => activeProject?.project ?? null, [activeProject]);
  const outline = Array.isArray(activeProject?.outline) ? activeProject.outline : [];
  const sources = Array.isArray(activeProject?.sources) ? activeProject.sources : [];
  const blocks = Array.isArray(activeProject?.blocks) ? activeProject.blocks : [];
  const exportsList = Array.isArray(activeProject?.exports) ? activeProject.exports : [];

  const ensureProject = async (): Promise<string | null> => {
    if (activeProjectId) return activeProjectId;
    setUiBusy(true);
    try {
      const r = await createBookProject({
        projectType: mode === "paper_forge_unlimited" ? "paper" : "book",
        title: projectTitle.trim() || (mode === "paper_forge_unlimited" ? "論文構築プロジェクト" : "書籍構築プロジェクト"),
        targetChars: mode === "paper_forge_unlimited" ? 60000 : 60000,
        audience: "一般読者",
        tone: "丁寧",
        rhetoric: "命題→根拠→結論",
      });
      if (r?.ok && r.projectId) {
        const id = String(r.projectId);
        setActiveProjectId(id);
        await refreshProjects();
        await refreshActiveProject(id);
        pushLog(`project作成: ${id}`);
        return id;
      }
      pushLog(`project作成失敗: ${String(r?.error ?? "unknown")}`);
      return null;
    } finally {
      setUiBusy(false);
    }
  };

  const onCreateProject = async () => {
    await ensureProject();
  };

  const onAttachUrlSource = async () => {
    const pid = await ensureProject();
    if (!pid) return;
    if (!sourceUrl.trim()) return;
    setUiBusy(true);
    try {
      const r = await attachBookSource(pid, {
        sourceKind: "web_url",
        connectorType: "url_fetch",
        title: sourceUrl.trim(),
        url: sourceUrl.trim(),
      });
      pushLog(r?.ok ? `URL source登録: ${sourceUrl.trim()}` : `URL source失敗: ${String(r?.error ?? "unknown")}`);
      await refreshActiveProject(pid);
    } finally {
      setUiBusy(false);
    }
  };

  const onAttachDoc = async (doc: string) => {
    const pid = await ensureProject();
    if (!pid) return;
    setUiBusy(true);
    try {
      const r = await importDocSource(pid, doc);
      pushLog(r?.ok ? `doc取込: ${doc}` : `doc取込失敗: ${String(r?.error ?? "unknown")}`);
      await refreshActiveProject(pid);
    } finally {
      setUiBusy(false);
    }
  };

  const onCrawl = async () => {
    const pid = await ensureProject();
    if (!pid || !seedUrl.trim()) return;
    setUiBusy(true);
    try {
      const r = await crawlSeed(pid, seedUrl.trim());
      pushLog(r?.ok ? `crawl完了: pages=${String(r.pagesCrawled ?? 0)}` : `crawl失敗: ${String(r?.error ?? "unknown")}`);
      await refreshActiveProject(pid);
    } finally {
      setUiBusy(false);
    }
  };

  const onOutline = async () => {
    const pid = await ensureProject();
    if (!pid) return;
    setUiBusy(true);
    try {
      const r = await generateOutline(pid, { title: projectTitle.trim() || undefined });
      pushLog(r?.ok ? `目次生成: chapters=${Array.isArray(r.outline) ? r.outline.length : 0}` : `目次生成失敗`);
      await refreshActiveProject(pid);
    } finally {
      setUiBusy(false);
    }
  };

  const onDraft = async () => {
    const pid = await ensureProject();
    if (!pid) return;
    setUiBusy(true);
    try {
      const r = await generateDraft(pid);
      pushLog(r?.ok ? `執筆完了: totalChars=${String(r.totalChars ?? 0)}` : `執筆失敗`);
      await refreshActiveProject(pid);
    } finally {
      setUiBusy(false);
    }
  };

  const onReview = async () => {
    const pid = await ensureProject();
    if (!pid) return;
    setUiBusy(true);
    try {
      const r = await runReview(pid);
      pushLog(r?.ok ? `見直し: ${String(r.result ?? "unknown")}` : `見直し失敗`);
      await refreshActiveProject(pid);
    } finally {
      setUiBusy(false);
    }
  };

  const onExport = async () => {
    const pid = await ensureProject();
    if (!pid) return;
    setUiBusy(true);
    try {
      const r = await exportMarkdown(pid);
      pushLog(r?.ok ? `書き出し完了: chars=${String(r.totalChars ?? 0)}` : `書き出し失敗`);
      await refreshActiveProject(pid);
    } finally {
      setUiBusy(false);
    }
  };

  return (
    <div className="gpt-chat-layout">
      <div className="book-mode-bar">
        {(["normal_chat", "deepread", "book_forge_unlimited", "paper_forge_unlimited", "summary_rebuild"] as BuildMode[]).map((m) => (
          <button
            key={m}
            type="button"
            className={`book-mode-btn ${mode === m ? "book-mode-btn-active" : ""}`}
            onClick={() => setMode(m)}
            disabled={uiBusy || loading}
          >
            {modeLabel(m)}
          </button>
        ))}
      </div>

      {isForgeMode && (
        <div className="book-main-actions">
          <button type="button" className="gpt-btn gpt-btn-primary" onClick={onCreateProject} disabled={uiBusy}>
            📖 書籍構築
          </button>
          <button type="button" className="gpt-btn gpt-btn-primary" onClick={() => setMode("paper_forge_unlimited")} disabled={uiBusy}>
            🧾 論文構築
          </button>
          <input
            className="gpt-input book-title-input"
            placeholder="プロジェクト名"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            disabled={uiBusy}
          />
        </div>
      )}

      <div className="book-layout">
        <div className="book-chat-column">
          <MessageList messages={messages} loading={loading || uiBusy} />
          <Composer onSend={sendMessage} loading={loading || uiBusy} />
        </div>

        {isForgeMode && (
          <aside className="book-project-panel">
            <div className="book-panel-tabs">
              {([
                ["project", "プロジェクト"],
                ["sources", "ソース"],
                ["outline", "構成"],
                ["style", "文体"],
                ["progress", "進捗"],
                ["export", "出力"],
              ] as Array<[ProjectTab, string]>).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className={`book-tab-btn ${tab === k ? "book-tab-btn-active" : ""}`}
                  onClick={() => setTab(k)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="book-panel-content gpt-scroll">
              {tab === "project" && (
                <div className="book-section">
                  <div className="book-row">
                    <select
                      className="gpt-input"
                      value={activeProjectId}
                      onChange={(e) => setActiveProjectId(e.target.value)}
                      disabled={uiBusy}
                    >
                      <option value="">プロジェクトを選択</option>
                      {projects.map((p: any) => (
                        <option key={String(p.id)} value={String(p.id)}>
                          {String(p.title)} ({String(p.state)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="book-actions-grid">
                    <button type="button" className="gpt-btn" onClick={onOutline} disabled={uiBusy}>目次生成</button>
                    <button type="button" className="gpt-btn" onClick={onDraft} disabled={uiBusy}>執筆開始</button>
                    <button type="button" className="gpt-btn" onClick={onReview} disabled={uiBusy}>見直し</button>
                    <button type="button" className="gpt-btn" onClick={onExport} disabled={uiBusy}>書き出し</button>
                  </div>
                  <div className="book-meta">
                    <div>state: {String(activeProjectMeta?.state ?? "-")}</div>
                    <div>lane: {String(activeProjectMeta?.lane ?? "-")}</div>
                    <div>target_chars: {String(activeProjectMeta?.targetChars ?? "-")}</div>
                    <div>total_chars: {String(activeProjectMeta?.totalChars ?? "-")}</div>
                  </div>
                </div>
              )}

              {tab === "sources" && (
                <div className="book-section">
                  <div className="book-source-buttons">
                    <button type="button" className="gpt-btn" onClick={onAttachUrlSource} disabled={uiBusy}>URL</button>
                    <button type="button" className="gpt-btn" onClick={() => onAttachDoc("KHS")} disabled={uiBusy}>ファイル(PDF/KHS)</button>
                    <button type="button" className="gpt-btn" onClick={() => onAttachDoc("KHS")} disabled={uiBusy}>Dropbox</button>
                    <button type="button" className="gpt-btn" onClick={() => onAttachDoc("KHS")} disabled={uiBusy}>Drive</button>
                    <button type="button" className="gpt-btn" onClick={() => onAttachDoc("KHS")} disabled={uiBusy}>Notion</button>
                  </div>
                  <input
                    className="gpt-input"
                    placeholder="https://example.com/article"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    disabled={uiBusy}
                  />
                  <div className="book-row">
                    <input
                      className="gpt-input"
                      placeholder="crawl seed URL"
                      value={seedUrl}
                      onChange={(e) => setSeedUrl(e.target.value)}
                      disabled={uiBusy}
                    />
                    <button type="button" className="gpt-btn" onClick={onCrawl} disabled={uiBusy || !seedUrl.trim()}>
                      ブログ回遊
                    </button>
                  </div>
                  <div className="book-list">
                    {sources.map((s0: any) => (
                      <div key={String(s0.id)} className="book-list-item">
                        <div>{String(s0.title ?? s0.source_kind)}</div>
                        <div className="book-muted">{String(s0.source_kind)} / conf={String(s0.confidence ?? "-")}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "outline" && (
                <div className="book-section">
                  <div className="book-list">
                    {outline.map((o: any) => (
                      <div key={String(o.id)} className="book-list-item">
                        <div>{String(o.title)}</div>
                        <div className="book-muted">{String(o.goal ?? "")}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "style" && (
                <div className="book-section">
                  <div className="book-meta">
                    <div>tone: {String(activeProjectMeta?.tone ?? "-")}</div>
                    <div>rhetoric: {String(activeProjectMeta?.rhetoric ?? "-")}</div>
                    <div>synopsis: {String(activeProjectMeta?.synopsis ?? "-")}</div>
                  </div>
                </div>
              )}

              {tab === "progress" && (
                <div className="book-section">
                  <div className="book-meta">
                    <div>blocks: {String(blocks.length)}</div>
                    <div>exports: {String(exportsList.length)}</div>
                  </div>
                  <div className="book-log-list">
                    {logLines.map((line, idx) => (
                      <div key={`${idx}:${line}`} className="book-log-line">{line}</div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "export" && (
                <div className="book-section">
                  <div className="book-list">
                    {exportsList.map((e0: any) => (
                      <div key={String(e0.id)} className="book-list-item">
                        <div>{String(e0.format)} / {String(e0.status)}</div>
                        <div className="book-muted">chars={String(e0.total_chars ?? 0)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
