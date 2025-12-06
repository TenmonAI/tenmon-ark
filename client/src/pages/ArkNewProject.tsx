/**
 * TENMON-ARK New Project Page
 * 
 * 新規プロジェクト作成画面
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function ArkNewProject() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const createProjectMutation = trpc.ark.createProject.useMutation({
    onSuccess: async (data) => {
      if (file) {
        // ファイルをアップロード
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result?.toString().split(",")[1];
          if (!base64) {
            toast.error("ファイルの読み込みに失敗しました");
            return;
          }

          try {
            await uploadVideoMutation.mutateAsync({
              projectId: data.projectId,
              fileData: base64,
              mimeType: file.type,
              fileName: file.name,
            });
            toast.success("プロジェクトを作成しました");
            setLocation(`/ark/project/${data.projectId}`);
          } catch (error) {
            toast.error("ファイルのアップロードに失敗しました");
          }
        };
        reader.readAsDataURL(file);
      } else {
        toast.success("プロジェクトを作成しました");
        setLocation(`/ark/project/${data.projectId}`);
      }
    },
    onError: () => {
      toast.error("プロジェクトの作成に失敗しました");
    },
  });

  const uploadVideoMutation = trpc.ark.uploadVideo.useMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("タイトルを入力してください");
      return;
    }

    createProjectMutation.mutate({
      title,
      description,
      sourceType: "upload",
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // ファイルサイズチェック（100MB制限）
      const sizeMB = selectedFile.size / (1024 * 1024);
      if (sizeMB > 100) {
        toast.error("ファイルサイズは100MB以下にしてください");
        return;
      }

      setFile(selectedFile);
    }
  };

  if (authLoading) {
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
      <div className="container max-w-2xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>新規プロジェクト作成</CardTitle>
            <CardDescription>
              動画をアップロードして、TENMON-ARKの自動編集を開始します。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">プロジェクト名 *</Label>
                <Input
                  id="title"
                  placeholder="例: 新商品紹介動画"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">説明（任意）</Label>
                <Textarea
                  id="description"
                  placeholder="プロジェクトの説明を入力してください"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file">動画ファイル（任意）</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <Input
                    id="file"
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="max-w-xs mx-auto"
                  />
                  {file && (
                    <p className="mt-4 text-sm text-muted-foreground">
                      選択されたファイル: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    対応形式: MP4, MOV, AVI（最大100MB）
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/ark")}
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  disabled={createProjectMutation.isPending || uploadVideoMutation.isPending}
                  className="flex-1"
                >
                  {createProjectMutation.isPending || uploadVideoMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      作成中...
                    </>
                  ) : (
                    "プロジェクト作成"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
