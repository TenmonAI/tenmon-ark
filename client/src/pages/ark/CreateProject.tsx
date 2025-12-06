import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, Upload, Video } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

/**
 * プロジェクト作成画面
 * 動画をアップロードして新しいプロジェクトを作成する
 */
export default function CreateProject() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // プロジェクト作成
  const createProjectMutation = trpc.ark.createProject.useMutation({
    onSuccess: (data) => {
      toast.success(t("ark.create.projectCreated"));
      // プロジェクト作成後、動画をアップロード
      if (videoFile) {
        uploadVideo(data.projectId);
      } else {
        setLocation(`/ark/project/${data.projectId}`);
      }
    },
    onError: (error) => {
      toast.error(t("ark.create.createError") + ": " + error.message);
      setIsUploading(false);
    },
  });

  // 動画アップロード
  const uploadVideoMutation = trpc.ark.uploadVideo.useMutation({
    onSuccess: (data, variables) => {
      toast.success(t("ark.create.uploadSuccess"));
      setIsUploading(false);
      setUploadProgress(100);
      // アップロード完了後、プロジェクト詳細画面に遷移
      setLocation(`/ark/project/${variables.projectId}`);
    },
    onError: (error) => {
      toast.error(t("ark.create.uploadError") + ": " + error.message);
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  const uploadVideo = async (projectId: number) => {
    if (!videoFile) return;

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // ファイルをBase64に変換
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        const base64String = base64Data.split(",")[1]; // Remove data:video/mp4;base64, prefix

        setUploadProgress(30);

        // アップロード実行
        await uploadVideoMutation.mutateAsync({
          projectId,
          fileData: base64String,
          mimeType: videoFile.type,
          fileName: videoFile.name,
        });
      };
      reader.readAsDataURL(videoFile);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(t("ark.create.uploadError"));
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error(t("ark.create.titleRequired"));
      return;
    }

    if (!videoFile) {
      toast.error(t("ark.create.videoRequired"));
      return;
    }

    // 16MB制限チェック
    const maxSize = 16 * 1024 * 1024; // 16MB
    if (videoFile.size > maxSize) {
      toast.error(t("ark.create.fileTooLarge"));
      return;
    }

    setIsUploading(true);
    createProjectMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      sourceType: "upload",
      sourceUrl: undefined,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 動画ファイルかチェック
      if (!file.type.startsWith("video/")) {
        toast.error(t("ark.create.invalidFileType"));
        return;
      }

      // 16MB制限チェック
      const maxSize = 16 * 1024 * 1024; // 16MB
      if (file.size > maxSize) {
        toast.error(t("ark.create.fileTooLarge"));
        return;
      }

      setVideoFile(file);
    }
  };

  if (authLoading) {
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
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Video className="w-6 h-6" />
            {t("ark.create.title")}
          </CardTitle>
          <CardDescription>{t("ark.create.description")}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">{t("ark.create.projectTitle")}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("ark.create.projectTitlePlaceholder")}
                disabled={isUploading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("ark.create.projectDescription")}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("ark.create.projectDescriptionPlaceholder")}
                disabled={isUploading}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="video">{t("ark.create.videoFile")}</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                {videoFile ? (
                  <div className="space-y-2">
                    <Video className="w-12 h-12 mx-auto text-primary" />
                    <p className="text-sm font-medium">{videoFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(videoFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {!isUploading && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setVideoFile(null)}
                      >
                        {t("ark.create.removeFile")}
                      </Button>
                    )}
                  </div>
                ) : (
                  <label htmlFor="video" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">{t("ark.create.uploadVideo")}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("ark.create.uploadVideoHint")}
                    </p>
                    <Input
                      id="video"
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {isUploading && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{t("ark.create.uploading")}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/ark/projects")}
              disabled={isUploading}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isUploading || !title.trim() || !videoFile}>
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("ark.create.creating")}
                </>
              ) : (
                t("ark.create.createProject")
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
