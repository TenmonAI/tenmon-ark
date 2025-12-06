/**
 * Ark Writer
 * ブログ自動生成OS
 * - 記事自動生成UI
 * - SEOプレビュー
 * - 投稿ボタン（WordPress/Medium/Dev.to）
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Send, Eye, FileText, MessageSquare } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface BlogPost {
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  seoKeywords: string[];
  metaDescription: string;
  slug: string;
  estimatedReadTime: number;
  fireWaterBalance: {
    fire: number;
    water: number;
  };
}

export default function ArkWriter() {
  const [, setLocation] = useLocation();
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState<"fire" | "water" | "balanced">("balanced");
  const [targetLanguage, setTargetLanguage] = useState("ja");
  const [wordCount, setWordCount] = useState(1000);
  const [seoOptimize, setSeoOptimize] = useState(true);
  const [generatedPost, setGeneratedPost] = useState<BlogPost | null>(null);
  const [platform, setPlatform] = useState<"wordpress" | "medium" | "dev.to">("wordpress");

  const generatePostMutation = trpc.arkWriter.generatePost.useMutation();
  const autoPublishMutation = trpc.arkWriter.autoPublish.useMutation();

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("トピックを入力してください");
      return;
    }

    try {
      const result = await generatePostMutation.mutateAsync({
        topic,
        style,
        targetLanguage,
        seoOptimize,
        wordCount,
      });
      setGeneratedPost(result);
      toast.success("記事を生成しました");
    } catch (error) {
      console.error("Failed to generate post:", error);
      toast.error("記事の生成に失敗しました");
    }
  };

  const handlePublish = async () => {
    if (!generatedPost) {
      toast.error("記事を生成してください");
      return;
    }

    try {
      const result = await autoPublishMutation.mutateAsync({
        post: generatedPost,
        platform,
      });
      toast.success(`${platform}に投稿しました`);
    } catch (error) {
      console.error("Failed to publish:", error);
      toast.error("投稿に失敗しました");
    }
  };

  const handleSendToChat = () => {
    if (!generatedPost) {
      toast.error("記事を生成してください");
      return;
    }
    
    // チャットに記事を送信
    setLocation(`/chat?message=${encodeURIComponent(`以下の記事について相談したいです：\n\nタイトル: ${generatedPost.title}\n\n${generatedPost.content.substring(0, 500)}...`)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 text-slate-100">
      {/* ヘッダー */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-amber-500/30 shadow-lg">
        <div className="container mx-auto p-4">
          <h1 className="text-2xl font-bold text-amber-400">✍️ Ark Writer - ブログ自動生成OS</h1>
          <p className="text-sm text-slate-400">Twin-Core文体エンジン × SEO最適化 × 自動投稿</p>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="container mx-auto p-6 space-y-6">
        {/* 記事生成設定 */}
        <Card className="bg-slate-900/50 border-amber-500/50">
          <CardHeader>
            <CardTitle className="text-amber-400">📝 記事生成設定</CardTitle>
            <CardDescription>トピックとスタイルを設定して記事を生成</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* トピック入力 */}
            <div className="space-y-2">
              <Label htmlFor="topic" className="text-slate-300">トピック</Label>
              <Input
                id="topic"
                type="text"
                placeholder="例: AIの未来について"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-slate-100"
              />
            </div>

            {/* スタイル選択 */}
            <div className="space-y-2">
              <Label htmlFor="style" className="text-slate-300">文体スタイル</Label>
              <Select value={style} onValueChange={(value: "fire" | "water" | "balanced") => setStyle(value)}>
                <SelectTrigger id="style" className="bg-slate-800/50 border-slate-700 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fire">🔥 火（力強い、断定的）</SelectItem>
                  <SelectItem value="water">💧 水（柔らかい、優しい）</SelectItem>
                  <SelectItem value="balanced">⚖️ バランス（中庸）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 言語選択 */}
            <div className="space-y-2">
              <Label htmlFor="language" className="text-slate-300">言語</Label>
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger id="language" className="bg-slate-800/50 border-slate-700 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="ko">한국어</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="it">Italiano</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="ru">Русский</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 文字数 */}
            <div className="space-y-2">
              <Label htmlFor="wordCount" className="text-slate-300">文字数: {wordCount}</Label>
              <input
                id="wordCount"
                type="range"
                min="500"
                max="3000"
                step="100"
                value={wordCount}
                onChange={(e) => setWordCount(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* SEO最適化 */}
            <div className="flex items-center space-x-2">
              <input
                id="seo"
                type="checkbox"
                checked={seoOptimize}
                onChange={(e) => setSeoOptimize(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="seo" className="text-slate-300">SEO最適化を有効にする</Label>
            </div>

            {/* 生成ボタン */}
            <Button
              onClick={handleGenerate}
              disabled={generatePostMutation.isPending}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
            >
              {generatePostMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  記事を生成
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 生成された記事 */}
        {generatedPost && (
          <Card className="bg-slate-900/50 border-amber-500/50">
            <CardHeader>
              <CardTitle className="text-amber-400">📄 生成された記事</CardTitle>
              <CardDescription>プレビューと投稿</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preview">
                    <Eye className="mr-2 h-4 w-4" />
                    プレビュー
                  </TabsTrigger>
                  <TabsTrigger value="seo">
                    <FileText className="mr-2 h-4 w-4" />
                    SEO情報
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="space-y-4 mt-4">
                  {/* タイトル */}
                  <div>
                    <h2 className="text-2xl font-bold text-amber-400 mb-2">{generatedPost.title}</h2>
                    <p className="text-sm text-slate-400">読了時間: 約{generatedPost.estimatedReadTime}分</p>
                  </div>

                  {/* 火水バランス */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label className="text-xs text-slate-400">火のエネルギー</Label>
                      <div className="w-full bg-slate-800 rounded-full h-2 mt-1">
                        <div 
                          className="bg-red-500 h-2 rounded-full" 
                          style={{ width: `${generatedPost.fireWaterBalance.fire}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-slate-400">水のエネルギー</Label>
                      <div className="w-full bg-slate-800 rounded-full h-2 mt-1">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${generatedPost.fireWaterBalance.water}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 抜粋 */}
                  <div>
                    <Label className="text-slate-300">抜粋</Label>
                    <p className="text-slate-400 mt-1">{generatedPost.excerpt}</p>
                  </div>

                  {/* 本文 */}
                  <div className="prose prose-invert max-w-none">
                    <Streamdown>{generatedPost.content}</Streamdown>
                  </div>

                  {/* タグ */}
                  <div>
                    <Label className="text-slate-300">タグ</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {generatedPost.tags.map((tag, index) => (
                        <span key={index} className="px-3 py-1 bg-slate-800 text-amber-400 rounded-full text-sm">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="seo" className="space-y-4 mt-4">
                  {/* スラッグ */}
                  <div>
                    <Label className="text-slate-300">スラッグ（URL）</Label>
                    <Input
                      value={generatedPost.slug}
                      readOnly
                      className="bg-slate-800/50 border-slate-700 text-slate-100 mt-1"
                    />
                  </div>

                  {/* メタディスクリプション */}
                  <div>
                    <Label className="text-slate-300">メタディスクリプション</Label>
                    <Textarea
                      value={generatedPost.metaDescription}
                      readOnly
                      className="bg-slate-800/50 border-slate-700 text-slate-100 mt-1"
                      rows={3}
                    />
                  </div>

                  {/* SEOキーワード */}
                  <div>
                    <Label className="text-slate-300">SEOキーワード</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {generatedPost.seoKeywords.map((keyword, index) => (
                        <span key={index} className="px-3 py-1 bg-slate-800 text-blue-400 rounded-full text-sm">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* アクションボタン */}
              <div className="flex gap-4">
                {/* 投稿プラットフォーム選択 */}
                <Select value={platform} onValueChange={(value: "wordpress" | "medium" | "dev.to") => setPlatform(value)}>
                  <SelectTrigger className="w-[200px] bg-slate-800/50 border-slate-700 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wordpress">WordPress</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="dev.to">Dev.to</SelectItem>
                  </SelectContent>
                </Select>

                {/* 投稿ボタン */}
                <Button
                  onClick={handlePublish}
                  disabled={autoPublishMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {autoPublishMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      投稿中...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {platform}に投稿
                    </>
                  )}
                </Button>

                {/* チャット連動ボタン */}
                <Button
                  onClick={handleSendToChat}
                  variant="outline"
                  className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  チャットで相談
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
