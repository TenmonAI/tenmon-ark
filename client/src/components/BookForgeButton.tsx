import { useState } from "react";
import { BookProjectList } from "./BookProjectList";

type DraftBlock = { heading?: string; content?: string };

export function BookForgeButton() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [title, setTitle] = useState("Book Forge Draft");
  const [topic, setTopic] = useState("法華経と空海");
  const [status, setStatus] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastExport, setLastExport] = useState("");

  const createProject = async () => {
    setStatus("creating...");
    try {
      const res = await fetch("/api/book/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, topic }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "create failed");
      setProjectId(String(data.projectId));
      setStatus(`project created: ${data.projectId}`);
      setRefreshKey((x) => x + 1);
    } catch (e: any) {
      setStatus(`create failed: ${String(e?.message || e)}`);
    }
  };

  const generateOutline = async () => {
    if (!projectId) return setStatus("select or create project first");
    setStatus("outline...");
    try {
      const res = await fetch(`/api/book/project/${projectId}/outline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "outline failed");
      setStatus(`outline ok: ${Array.isArray(data.outline) ? data.outline.length : 0} chapters`);
      setRefreshKey((x) => x + 1);
    } catch (e: any) {
      setStatus(`outline failed: ${String(e?.message || e)}`);
    }
  };

  const draftAll = async () => {
    if (!projectId) return setStatus("select or create project first");
    setStatus("drafting...");
    try {
      const res = await fetch(`/api/book/project/${projectId}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetChars: 1200 }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "draft failed");
      const blocks = Array.isArray(data.blocks) ? (data.blocks as DraftBlock[]) : [];
      setStatus(`draft ok: ${blocks.length} blocks`);
      setRefreshKey((x) => x + 1);
    } catch (e: any) {
      setStatus(`draft failed: ${String(e?.message || e)}`);
    }
  };

  const exportMarkdown = async () => {
    if (!projectId) return setStatus("select or create project first");
    setStatus("exporting...");
    try {
      const res = await fetch(`/api/book/project/${projectId}/export`);
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "export failed");
      const text = String(data.content || "");
      setLastExport(text.slice(0, 500));
      setStatus(`export ok: ${text.length} chars`);
      setRefreshKey((x) => x + 1);
    } catch (e: any) {
      setStatus(`export failed: ${String(e?.message || e)}`);
    }
  };

  return (
    <div className="p-3 border border-border rounded-md bg-card/30 space-y-2">
      <div className="text-xs font-semibold text-foreground">Book Forge</div>
      <div className="grid gap-1">
        <input
          className="text-xs border border-border rounded px-2 py-1 bg-background"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="title"
        />
        <input
          className="text-xs border border-border rounded px-2 py-1 bg-background"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="topic"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        <button type="button" onClick={createProject} className="text-xs px-2 py-1 border rounded">
          プロジェクト作成
        </button>
        <button type="button" onClick={generateOutline} className="text-xs px-2 py-1 border rounded">
          目次生成
        </button>
        <button type="button" onClick={draftAll} className="text-xs px-2 py-1 border rounded">
          全章執筆
        </button>
        <button type="button" onClick={exportMarkdown} className="text-xs px-2 py-1 border rounded">
          markdown export
        </button>
      </div>
      <div className="text-xs text-muted-foreground break-all">projectId: {projectId || "-"}</div>
      <div className="text-xs text-muted-foreground">{status}</div>
      <BookProjectList
        selectedProjectId={projectId}
        onSelectProject={(id) => setProjectId(id)}
        refreshKey={refreshKey}
      />
      {lastExport ? (
        <pre className="text-xs whitespace-pre-wrap border border-border rounded p-2 max-h-32 overflow-y-auto">
          {lastExport}
        </pre>
      ) : null}
    </div>
  );
}
