/**
 * ============================================================
 *  PROJECT LIST — プロジェクト一覧
 * ============================================================
 * 
 * ChatRoom 左サイドに表示するプロジェクト一覧
 * ============================================================
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Plus, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectListProps {
  selectedProjectId: number | null;
  onSelectProject: (projectId: number | null) => void;
}

export function ProjectList({ selectedProjectId, onSelectProject }: ProjectListProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const { data: projects, refetch } = trpc.project.list.useQuery();
  const createProjectMutation = trpc.project.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsCreating(false);
      setNewProjectName("");
    },
  });

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createProjectMutation.mutate({ name: newProjectName.trim() });
    }
  };

  return (
    <div className="flex flex-col h-full border-r border-border bg-background">
      {/* ヘッダー */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-foreground">プロジェクト</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCreating(true)}
            className="h-6 w-6 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* 新規プロジェクト作成 */}
        {isCreating && (
          <div className="flex gap-1">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateProject();
                } else if (e.key === "Escape") {
                  setIsCreating(false);
                  setNewProjectName("");
                }
              }}
              placeholder="プロジェクト名"
              className="flex-1 px-2 py-1 text-xs border border-border rounded bg-background"
              autoFocus
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreateProject}
              className="h-6 px-2 text-xs"
            >
              作成
            </Button>
          </div>
        )}
      </div>

      {/* プロジェクト一覧 */}
      <div className="flex-1 overflow-y-auto">
        {/* 未設定 */}
        <button
          onClick={() => onSelectProject(null)}
          className={cn(
            "w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-muted transition-colors",
            selectedProjectId === null && "bg-muted"
          )}
        >
          <Folder className="h-4 w-4" />
          <span>未設定</span>
        </button>

        {/* プロジェクトリスト */}
        {projects?.map((project) => (
          <button
            key={project.id}
            onClick={() => onSelectProject(project.id)}
            className={cn(
              "w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-muted transition-colors",
              selectedProjectId === project.id && "bg-muted"
            )}
          >
            {selectedProjectId === project.id ? (
              <FolderOpen className="h-4 w-4" />
            ) : (
              <Folder className="h-4 w-4" />
            )}
            <span className="truncate">{project.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

