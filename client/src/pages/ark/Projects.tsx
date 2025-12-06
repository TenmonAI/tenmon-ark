import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Trash2, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * プロジェクト一覧画面
 * 動画制作プロジェクトの一覧を表示し、新規作成・削除・詳細表示を行う
 */
export default function Projects() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  // プロジェクト一覧を取得
  const { data: projects, isLoading, refetch } = trpc.ark.listProjects.useQuery(undefined, {
    enabled: !!user,
  });

  // プロジェクト削除
  const deleteProjectMutation = trpc.ark.deleteProject.useMutation({
    onSuccess: () => {
      toast.success(t("ark.projects.deleteSuccess"));
      refetch();
    },
    onError: (error) => {
      toast.error(t("ark.projects.deleteError") + ": " + error.message);
    },
  });

  const handleDeleteProject = (projectId: number) => {
    deleteProjectMutation.mutate({ projectId });
  };

  const handleCreateProject = () => {
    setLocation("/ark/create");
  };

  const handleViewProject = (projectId: number) => {
    setLocation(`/ark/project/${projectId}`);
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{t("auth.loginRequired")}</CardTitle>
            <CardDescription>{t("auth.loginRequiredDescription")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("ark.projects.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("ark.projects.description")}</p>
        </div>
        <Button onClick={handleCreateProject} size="lg">
          <Plus className="w-5 h-5 mr-2" />
          {t("ark.projects.createNew")}
        </Button>
      </div>

      {projects && projects.length === 0 ? (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>{t("ark.projects.noProjects")}</CardTitle>
            <CardDescription>{t("ark.projects.noProjectsDescription")}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={handleCreateProject} className="w-full">
              <Plus className="w-5 h-5 mr-2" />
              {t("ark.projects.createFirst")}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects?.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader onClick={() => handleViewProject(project.id)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Video className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent onClick={() => handleViewProject(project.id)}>
                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                )}
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t("ark.projects.status")}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        project.status === "completed"
                          ? "bg-green-500/10 text-green-500"
                          : project.status === "processing"
                            ? "bg-blue-500/10 text-blue-500"
                            : project.status === "failed"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-gray-500/10 text-gray-500"
                      }`}
                    >
                      {t(`ark.projects.statusLabels.${project.status}`)}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => handleViewProject(project.id)}>
                  {t("ark.projects.viewDetails")}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => e.stopPropagation()}
                      disabled={deleteProjectMutation.isPending}
                    >
                      {deleteProjectMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-destructive" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("ark.projects.deleteConfirmTitle")}</AlertDialogTitle>
                      <AlertDialogDescription>{t("ark.projects.deleteConfirmDescription")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteProject(project.id)}>
                        {t("common.delete")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
