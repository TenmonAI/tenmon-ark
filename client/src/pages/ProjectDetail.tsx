import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import EditPreview from "@/components/ark/EditPreview";
import CutPointTimeline from "@/components/ark/CutPointTimeline";
import SubtitlePreview from "@/components/ark/SubtitlePreview";
import BalanceGraph from "@/components/ark/BalanceGraph";

export default function ProjectDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const projectId = parseInt(id || "0", 10);

  // プロジェクト情報を取得
  const { data: project, isLoading: projectLoading } = trpc.ark.getProject.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  // 編集結果を取得
  const { data: editResult, isLoading: editLoading } = trpc.ark.getEditResult.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  // SRTダウンロード
  const handleDownloadSRT = () => {
    if (!editResult?.subtitleData) return;
    
    const subtitles = JSON.parse(editResult.subtitleData);
    const srt = generateSRT(subtitles);
    downloadFile(srt, `${project?.project.title || 'subtitle'}.srt`, 'text/plain');
  };

  // VTTダウンロード
  const handleDownloadVTT = () => {
    if (!editResult?.subtitleData) return;
    
    const subtitles = JSON.parse(editResult.subtitleData);
    const vtt = generateVTT(subtitles);
    downloadFile(vtt, `${project?.project.title || 'subtitle'}.vtt`, 'text/vtt');
  };

  if (projectLoading || editLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{t('ark.projectNotFound')}</p>
        <Button onClick={() => setLocation('/ark/projects')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('ark.backToProjects')}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <div className="border-b bg-card">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/ark/projects')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('ark.backToProjects')}
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{project.project.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {t('ark.createdAt')}: {new Date(project.project.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            
            {editResult && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadSRT}
                >
                  <Download className="w-4 h-4 mr-2" />
                  SRT
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadVTT}
                >
                  <Download className="w-4 h-4 mr-2" />
                  VTT
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="container py-6">
        {editResult ? (
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="preview">{t('ark.preview')}</TabsTrigger>
              <TabsTrigger value="timeline">{t('ark.timeline')}</TabsTrigger>
              <TabsTrigger value="subtitles">{t('ark.subtitles')}</TabsTrigger>
              <TabsTrigger value="analysis">{t('ark.analysis')}</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="mt-6">
              <EditPreview
                project={project}
                editResult={editResult}
              />
            </TabsContent>

            <TabsContent value="timeline" className="mt-6">
              <CutPointTimeline
                cutPoints={editResult.cutPointData ? JSON.parse(editResult.cutPointData) : []}
                duration={0}
              />
            </TabsContent>

            <TabsContent value="subtitles" className="mt-6">
              <SubtitlePreview
                subtitles={editResult.subtitleData ? JSON.parse(editResult.subtitleData) : []}
              />
            </TabsContent>

            <TabsContent value="analysis" className="mt-6">
              <BalanceGraph
                analysisData={editResult.analysisData ? JSON.parse(editResult.analysisData) : null}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">{t('ark.noEditResult')}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {t('ark.processingInProgress')}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

// SRT生成関数
function generateSRT(subtitles: any[]): string {
  return subtitles
    .map((sub, index) => {
      const startTime = formatSRTTime(sub.start);
      const endTime = formatSRTTime(sub.end);
      return `${index + 1}\n${startTime} --> ${endTime}\n${sub.subtitle}\n`;
    })
    .join('\n');
}

// VTT生成関数
function generateVTT(subtitles: any[]): string {
  const header = 'WEBVTT\n\n';
  const content = subtitles
    .map((sub) => {
      const startTime = formatVTTTime(sub.start);
      const endTime = formatVTTTime(sub.end);
      return `${startTime} --> ${endTime}\n${sub.subtitle}\n`;
    })
    .join('\n');
  return header + content;
}

// SRT時間フォーマット（00:00:00,000）
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)},${pad(ms, 3)}`;
}

// VTT時間フォーマット（00:00:00.000）
function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)}.${pad(ms, 3)}`;
}

// ゼロパディング
function pad(num: number, size: number): string {
  return num.toString().padStart(size, '0');
}

// ファイルダウンロード
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
