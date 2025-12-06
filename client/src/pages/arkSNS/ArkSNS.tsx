/**
 * Ark SNS
 * 自動SNS発信OS
 * - 投稿プレビュー
 * - メディア生成プレビュー
 * - 投稿先選択（X/Instagram/YouTube）
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Send, Image as ImageIcon, Video, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface SNSPost {
  platform: "x" | "instagram" | "youtube";
  content: string;
  media?: {
    type: "image" | "video";
    url: string;
  }[];
  hashtags: string[];
  scheduledAt?: Date;
}

interface GeneratedPosts {
  x?: SNSPost;
  instagram?: SNSPost;
  youtube?: SNSPost;
}

export default function ArkSNS() {
  const [, setLocation] = useLocation();
  const [topic, setTopic] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<("x" | "instagram" | "youtube")[]>(["x"]);
  const [targetLanguage, setTargetLanguage] = useState("ja");
  const [includeMedia, setIncludeMedia] = useState(false);
  const [autoSchedule, setAutoSchedule] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPosts | null>(null);

  const generatePostsMutation = trpc.arkSNS.generatePosts.useMutation();
  const publishMutation = trpc.arkSNS.publish.useMutation();

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("トピックを入力してください");
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast.error("投稿先を選択してください");
      return;
    }

    try {
      const result = await generatePostsMutation.mutateAsync({
        topic,
        platforms: selectedPlatforms,
        targetLanguage,
        includeMedia,
        autoSchedule,
      });
      setGeneratedPosts(result);
      toast.success("投稿を生成しました");
    } catch (error) {
      console.error("Failed to generate posts:", error);
      toast.error("投稿の生成に失敗しました");
    }
  };

  const handlePublish = async (post: SNSPost) => {
    try {
      await publishMutation.mutateAsync({ post });
      toast.success(`${post.platform}に投稿しました`);
    } catch (error) {
      console.error("Failed to publish:", error);
      toast.error("投稿に失敗しました");
    }
  };

  const handleSendToChat = (post: SNSPost) => {
    setLocation(`/chat?message=${encodeURIComponent(`以下の${post.platform}投稿について相談したいです：\n\n${post.content}`)}`);
  };

  const togglePlatform = (platform: "x" | "instagram" | "youtube") => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const getPlatformIcon = (platform: "x" | "instagram" | "youtube") => {
    switch (platform) {
      case "x":
        return "𝕏";
      case "instagram":
        return "📷";
      case "youtube":
        return "▶️";
    }
  };

  const getPlatformName = (platform: "x" | "instagram" | "youtube") => {
    switch (platform) {
      case "x":
        return "X (Twitter)";
      case "instagram":
        return "Instagram";
      case "youtube":
        return "YouTube";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 text-slate-100">
      {/* ヘッダー */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-amber-500/30 shadow-lg">
        <div className="container mx-auto p-4">
          <h1 className="text-2xl font-bold text-amber-400">📱 Ark SNS - 自動SNS発信OS</h1>
          <p className="text-sm text-slate-400">多言語対応 × メディア生成 × 自動投稿</p>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="container mx-auto p-6 space-y-6">
        {/* 投稿生成設定 */}
        <Card className="bg-slate-900/50 border-amber-500/50">
          <CardHeader>
            <CardTitle className="text-amber-400">✨ 投稿生成設定</CardTitle>
            <CardDescription>トピックとプラットフォームを設定して投稿を生成</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* トピック入力 */}
            <div className="space-y-2">
              <Label htmlFor="topic" className="text-slate-300">トピック</Label>
              <Input
                id="topic"
                type="text"
                placeholder="例: 新製品のリリース情報"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-slate-100"
              />
            </div>

            {/* プラットフォーム選択 */}
            <div className="space-y-2">
              <Label className="text-slate-300">投稿先プラットフォーム</Label>
              <div className="flex gap-4">
                {(["x", "instagram", "youtube"] as const).map((platform) => (
                  <div key={platform} className="flex items-center space-x-2">
                    <Checkbox
                      id={platform}
                      checked={selectedPlatforms.includes(platform)}
                      onCheckedChange={() => togglePlatform(platform)}
                    />
                    <Label htmlFor={platform} className="text-slate-300 cursor-pointer">
                      {getPlatformIcon(platform)} {getPlatformName(platform)}
                    </Label>
                  </div>
                ))}
              </div>
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

            {/* メディア生成 */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="media"
                checked={includeMedia}
                onCheckedChange={(checked) => setIncludeMedia(checked as boolean)}
              />
              <Label htmlFor="media" className="text-slate-300">メディア（画像/動画）を自動生成</Label>
            </div>

            {/* 自動スケジュール */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="schedule"
                checked={autoSchedule}
                onCheckedChange={(checked) => setAutoSchedule(checked as boolean)}
              />
              <Label htmlFor="schedule" className="text-slate-300">最適な時間に自動投稿</Label>
            </div>

            {/* 生成ボタン */}
            <Button
              onClick={handleGenerate}
              disabled={generatePostsMutation.isPending}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
            >
              {generatePostsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  投稿を生成
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 生成された投稿 */}
        {generatedPosts && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {selectedPlatforms.map((platform) => {
              const post = generatedPosts[platform];
              if (!post) return null;

              return (
                <Card key={platform} className="bg-slate-900/50 border-amber-500/50">
                  <CardHeader>
                    <CardTitle className="text-amber-400 flex items-center gap-2">
                      <span className="text-2xl">{getPlatformIcon(platform)}</span>
                      {getPlatformName(platform)}
                    </CardTitle>
                    <CardDescription>投稿プレビュー</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* メディアプレビュー */}
                    {post.media && post.media.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-slate-300">メディア</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {post.media.map((media, index) => (
                            <div key={index} className="relative aspect-square bg-slate-800 rounded-lg overflow-hidden">
                              {media.type === "image" ? (
                                <div className="flex items-center justify-center h-full">
                                  <ImageIcon className="h-12 w-12 text-slate-600" />
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <Video className="h-12 w-12 text-slate-600" />
                                </div>
                              )}
                              <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1 text-xs text-center">
                                {media.type === "image" ? "画像" : "動画"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 投稿内容 */}
                    <div className="space-y-2">
                      <Label className="text-slate-300">投稿内容</Label>
                      <Textarea
                        value={post.content}
                        readOnly
                        className="bg-slate-800/50 border-slate-700 text-slate-100"
                        rows={6}
                      />
                    </div>

                    {/* ハッシュタグ */}
                    <div className="space-y-2">
                      <Label className="text-slate-300">ハッシュタグ</Label>
                      <div className="flex flex-wrap gap-2">
                        {post.hashtags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-slate-800 text-blue-400 rounded text-sm">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* スケジュール */}
                    {post.scheduledAt && (
                      <div className="text-sm text-slate-400">
                        投稿予定: {new Date(post.scheduledAt).toLocaleString("ja-JP")}
                      </div>
                    )}

                    {/* アクションボタン */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handlePublish(post)}
                        disabled={publishMutation.isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        {publishMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        投稿
                      </Button>
                      <Button
                        onClick={() => handleSendToChat(post)}
                        variant="outline"
                        className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
