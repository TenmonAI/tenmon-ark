/**
 * TENMON-ARK Video Projects Page
 * 
 * 動画プロジェクト一覧画面
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Video } from "lucide-react";
import { Link } from "wouter";

export default function ArkProjects() {
  const { user, loading: authLoading } = useAuth();
  const { data: projects, isLoading } = trpc.ark.listProjects.useQuery(undefined, {
    enabled: !!user,
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>ログインが必要です</CardTitle>
            <CardDescription>
              TENMON-ARK 動画制作OSを使用するには、ログインしてください。
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">TENMON-ARK</h1>
            <p className="text-muted-foreground">動画制作OS V1 - Phase A</p>
          </div>
          <Link href="/ark/new">
            <Button size="lg">
              <Plus className="w-5 h-5 mr-2" />
              新規プロジェクト
            </Button>
          </Link>
        </div>

        {/* Projects Grid */}
        {projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link key={project.id} href={`/ark/project/${project.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <Video className="w-8 h-8 text-primary" />
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          project.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : project.status === "processing"
                            ? "bg-blue-100 text-blue-800"
                            : project.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {project.status === "completed"
                          ? "完了"
                          : project.status === "processing"
                          ? "処理中"
                          : project.status === "failed"
                          ? "失敗"
                          : "待機中"}
                      </span>
                    </div>
                    <CardTitle className="mt-4">{project.title}</CardTitle>
                    {project.description && (
                      <CardDescription className="line-clamp-2">
                        {project.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <p>作成日: {new Date(project.createdAt).toLocaleDateString("ja-JP")}</p>
                      <p className="mt-1">
                        ソース: {project.sourceType === "upload" ? "アップロード" : project.sourceType}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Video className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">プロジェクトがありません</h3>
              <p className="text-muted-foreground mb-6">
                新しい動画プロジェクトを作成して、TENMON-ARKの自動編集を体験してください。
              </p>
              <Link href="/ark/new">
                <Button>
                  <Plus className="w-5 h-5 mr-2" />
                  新規プロジェクト作成
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
