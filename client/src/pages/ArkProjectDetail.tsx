/**
 * TENMON-ARK Project Detail Page
 * 
 * プロジェクト詳細画面
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, Play, Download } from "lucide-react";
import { useRoute } from "wouter";
import { toast } from "sonner";

export default function ArkProjectDetail() {
  const { user, loading: authLoading } = useAuth();
  const [, params] = useRoute("/ark/project/:id");
  const projectId = params?.id ? parseInt(params.id) : 0;

  const { data, isLoading, refetch } = trpc.ark.getProject.useQuery(
    { projectId },
    { enabled: !!user && projectId > 0 }
  );

  const transcribeMutation = trpc.ark.transcribe.useMutation({
    onSuccess: () => {
      toast.success("文字起こしが完了しました");
      refetch();
    },
    onError: () => {
      toast.error("文字起こしに失敗しました");
    },
  });

  const analyzeMutation = trpc.ark.analyze.useMutation({
    onSuccess: () => {
      toast.success("言灵解析が完了しました");
      refetch();
    },
    onError: () => {
      toast.error("言灵解析に失敗しました");
    },
  });

  const autoEditMutation = trpc.ark.autoEdit.useMutation({
    onSuccess: () => {
      toast.success("自動編集が完了しました");
      refetch();
    },
    onError: () => {
      toast.error("自動編集に失敗しました");
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>プロジェクトが見つかりません</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { project, files, transcription, analysis, tasks } = data;

  const originalFile = files.find((f) => f.fileType === "original");
  const audioFile = files.find((f) => f.fileType === "audio");

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{project.title}</h1>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
          <div className="flex items-center gap-4 mt-4">
            <span
              className={`px-3 py-1 rounded text-sm font-medium ${
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
            <span className="text-sm text-muted-foreground">
              作成日: {new Date(project.createdAt).toLocaleDateString("ja-JP")}
            </span>
          </div>
        </div>

        {/* Pipeline Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Step 1: Transcription */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. 文字起こし</CardTitle>
              <CardDescription>Whisper音声認識</CardDescription>
            </CardHeader>
            <CardContent>
              {transcription ? (
                <div className="space-y-2">
                  <p className="text-sm text-green-600 font-medium">✓ 完了</p>
                  <p className="text-xs text-muted-foreground">
                    {transcription.rawText.length}文字
                  </p>
                </div>
              ) : audioFile ? (
                <Button
                  onClick={() =>
                    transcribeMutation.mutate({
                      projectId,
                      audioUrl: audioFile.s3Url,
                    })
                  }
                  disabled={transcribeMutation.isPending}
                  size="sm"
                >
                  {transcribeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      処理中...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      実行
                    </>
                  )}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">音声ファイルが必要です</p>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. 言灵解析</CardTitle>
              <CardDescription>五十音・火水・ミナカ</CardDescription>
            </CardHeader>
            <CardContent>
              {analysis ? (
                <div className="space-y-2">
                  <p className="text-sm text-green-600 font-medium">✓ 完了</p>
                  <p className="text-xs text-muted-foreground">
                    中心: {analysis.center}
                  </p>
                </div>
              ) : transcription ? (
                <Button
                  onClick={() =>
                    analyzeMutation.mutate({
                      projectId,
                      transcriptionId: transcription.id,
                    })
                  }
                  disabled={analyzeMutation.isPending}
                  size="sm"
                >
                  {analyzeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      処理中...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      実行
                    </>
                  )}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">文字起こしが必要です</p>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Auto Edit */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3. 自動編集</CardTitle>
              <CardDescription>カット・字幕生成</CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-green-600 font-medium">✓ 完了</p>
                  <p className="text-xs text-muted-foreground">
                    {tasks.length}タスク実行済み
                  </p>
                </div>
              ) : analysis ? (
                <Button
                  onClick={() =>
                    autoEditMutation.mutate({
                      projectId,
                      analysisId: analysis.id,
                    })
                  }
                  disabled={autoEditMutation.isPending}
                  size="sm"
                >
                  {autoEditMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      処理中...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      実行
                    </>
                  )}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">言灵解析が必要です</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        {analysis && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>言灵解析結果</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">中心（ミナカ）</h4>
                <p className="text-lg">{analysis.center}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">火（外発）</h4>
                <p className="text-sm text-muted-foreground">
                  {analysis.fire ? JSON.parse(analysis.fire).percentage.toFixed(1) : 0}%
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">水（内集）</h4>
                <p className="text-sm text-muted-foreground">
                  {analysis.water ? JSON.parse(analysis.water).percentage.toFixed(1) : 0}%
                </p>
              </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transcription */}
        {transcription && (
          <Card>
            <CardHeader>
              <CardTitle>文字起こし結果</CardTitle>
              <CardDescription>
                {transcription.refinedText ? "言灵整形済み" : "生テキスト"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">
                {transcription.refinedText || transcription.rawText}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
