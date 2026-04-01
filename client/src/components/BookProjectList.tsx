import { useEffect, useState } from "react";

type BookProject = {
  id: string;
  title: string;
  state?: string;
  totalChars?: number;
  total_blocks?: number;
  updatedAt?: string;
};

type Props = {
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  refreshKey?: number;
};

export function BookProjectList({ selectedProjectId, onSelectProject, refreshKey = 0 }: Props) {
  const [projects, setProjects] = useState<BookProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const loadProjects = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/book/projects");
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "failed to fetch projects");
      setProjects(Array.isArray(data.projects) ? data.projects : []);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [refreshKey]);

  return (
    <div className="p-2 border border-border rounded-md bg-background">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-foreground">Book Projects</div>
        <button className="text-xs underline" onClick={loadProjects} type="button">
          reload
        </button>
      </div>
      {loading && <div className="text-xs text-muted-foreground">loading...</div>}
      {error && <div className="text-xs text-destructive">{error}</div>}
      <div className="space-y-1 max-h-52 overflow-y-auto">
        {projects.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelectProject(p.id)}
            className={`w-full text-left text-xs p-2 rounded border ${
              selectedProjectId === p.id ? "border-primary" : "border-border"
            }`}
          >
            <div className="font-medium truncate">{p.title}</div>
            <div className="text-muted-foreground">
              {p.state || "draft"} / chars:{Number(p.totalChars || 0)} / blocks:{Number(p.total_blocks || 0)}
            </div>
            <div className="text-muted-foreground">{p.updatedAt || "-"}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
