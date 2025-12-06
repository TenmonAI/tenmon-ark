/**
 * Ark Cinema
 * アニメ映画生成OS
 * - script表示
 * - storyboardビュー
 * - 動画生成ボタン
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Film, FileText, Image as ImageIcon, MessageSquare } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface Character {
  name: string;
  description: string;
  personality: string;
}

interface Scene {
  sceneNumber: number;
  location: string;
  timeOfDay: string;
  characters: string[];
  dialogue: string;
  action: string;
  cameraAngle: string;
  mood: string;
}

interface StoryboardShot {
  shotNumber: number;
  description: string;
  cameraAngle: string;
  composition: string;
  visualNotes: string;
}

interface AnimeMovie {
  title: string;
  synopsis: string;
  genre: string;
  duration: number;
  targetLanguage: string;
  characters: Character[];
  script: {
    scenes: Scene[];
  };
  storyboard: {
    shots: StoryboardShot[];
  };
  renderingOptions: {
    resolution: string;
    fps: number;
    style: string;
  };
}

export default function ArkCinema() {
  const [, setLocation] = useLocation();
  const [topic, setTopic] = useState("");
  const [genre, setGenre] = useState<"action" | "comedy" | "drama" | "fantasy" | "sci-fi">("fantasy");
  const [duration, setDuration] = useState(300);
  const [targetLanguage, setTargetLanguage] = useState("ja");
  const [generatedMovie, setGeneratedMovie] = useState<AnimeMovie | null>(null);

  const generateMovieMutation = trpc.arkCinema.generateMovie.useMutation();

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("トピックを入力してください");
      return;
    }

    try {
      const result = await generateMovieMutation.mutateAsync({
        topic,
        genre,
        duration,
        targetLanguage,
      });
      setGeneratedMovie(result);
      toast.success("アニメ映画を生成しました");
    } catch (error) {
      console.error("Failed to generate movie:", error);
      toast.error("アニメ映画の生成に失敗しました");
    }
  };

  const handleRender = () => {
    if (!generatedMovie) {
      toast.error("アニメ映画を生成してください");
      return;
    }
    
    toast.info("レンダリング機能は外部API統合後に利用可能になります");
  };

  const handleSendToChat = () => {
    if (!generatedMovie) {
      toast.error("アニメ映画を生成してください");
      return;
    }
    
    setLocation(`/chat?message=${encodeURIComponent(`以下のアニメ映画について相談したいです：\n\nタイトル: ${generatedMovie.title}\n\n${generatedMovie.synopsis}`)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 text-slate-100">
      {/* ヘッダー */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-amber-500/30 shadow-lg">
        <div className="container mx-auto p-4">
          <h1 className="text-2xl font-bold text-amber-400">🎬 Ark Cinema - アニメ映画生成OS</h1>
          <p className="text-sm text-slate-400">Script × Storyboard × レンダリング連携</p>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="container mx-auto p-6 space-y-6">
        {/* 映画生成設定 */}
        <Card className="bg-slate-900/50 border-amber-500/50">
          <CardHeader>
            <CardTitle className="text-amber-400">🎥 映画生成設定</CardTitle>
            <CardDescription>トピックとジャンルを設定してアニメ映画を生成</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* トピック入力 */}
            <div className="space-y-2">
              <Label htmlFor="topic" className="text-slate-300">トピック</Label>
              <Input
                id="topic"
                type="text"
                placeholder="例: 宇宙を旅する少年の冒険"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-slate-100"
              />
            </div>

            {/* ジャンル選択 */}
            <div className="space-y-2">
              <Label htmlFor="genre" className="text-slate-300">ジャンル</Label>
              <Select value={genre} onValueChange={(value: "action" | "comedy" | "drama" | "fantasy" | "sci-fi") => setGenre(value)}>
                <SelectTrigger id="genre" className="bg-slate-800/50 border-slate-700 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="action">⚔️ アクション</SelectItem>
                  <SelectItem value="comedy">😄 コメディ</SelectItem>
                  <SelectItem value="drama">🎭 ドラマ</SelectItem>
                  <SelectItem value="fantasy">✨ ファンタジー</SelectItem>
                  <SelectItem value="sci-fi">🚀 SF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 尺（秒） */}
            <div className="space-y-2">
              <Label htmlFor="duration" className="text-slate-300">尺: {duration}秒 ({Math.floor(duration / 60)}分{duration % 60}秒)</Label>
              <input
                id="duration"
                type="range"
                min="60"
                max="1800"
                step="30"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full"
              />
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

            {/* 生成ボタン */}
            <Button
              onClick={handleGenerate}
              disabled={generateMovieMutation.isPending}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
            >
              {generateMovieMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  アニメ映画を生成
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 生成された映画 */}
        {generatedMovie && (
          <Card className="bg-slate-900/50 border-amber-500/50">
            <CardHeader>
              <CardTitle className="text-amber-400">🎬 {generatedMovie.title}</CardTitle>
              <CardDescription>
                {generatedMovie.genre} | {Math.floor(generatedMovie.duration / 60)}分{generatedMovie.duration % 60}秒 | {generatedMovie.targetLanguage}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* あらすじ */}
              <div>
                <Label className="text-slate-300 text-lg">📖 あらすじ</Label>
                <p className="text-slate-400 mt-2">{generatedMovie.synopsis}</p>
              </div>

              <Tabs defaultValue="characters" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="characters">
                    <FileText className="mr-2 h-4 w-4" />
                    キャラクター
                  </TabsTrigger>
                  <TabsTrigger value="script">
                    <FileText className="mr-2 h-4 w-4" />
                    Script
                  </TabsTrigger>
                  <TabsTrigger value="storyboard">
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Storyboard
                  </TabsTrigger>
                </TabsList>

                {/* キャラクター */}
                <TabsContent value="characters" className="space-y-4 mt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {generatedMovie.characters.map((character, index) => (
                      <Card key={index} className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                          <CardTitle className="text-amber-400 text-lg">{character.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div>
                            <Label className="text-xs text-slate-400">説明</Label>
                            <p className="text-sm text-slate-300">{character.description}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-slate-400">性格</Label>
                            <p className="text-sm text-slate-300">{character.personality}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Script */}
                <TabsContent value="script" className="space-y-4 mt-4">
                  {generatedMovie.script.scenes.map((scene, index) => (
                    <Card key={index} className="bg-slate-800/50 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-amber-400 text-lg">
                          シーン {scene.sceneNumber}: {scene.location}
                        </CardTitle>
                        <CardDescription>
                          {scene.timeOfDay} | {scene.characters.join(", ")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-xs text-slate-400">カメラアングル</Label>
                          <p className="text-sm text-slate-300">{scene.cameraAngle}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-400">アクション</Label>
                          <p className="text-sm text-slate-300">{scene.action}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-400">セリフ</Label>
                          <div className="prose prose-invert prose-sm max-w-none">
                            <Streamdown>{scene.dialogue}</Streamdown>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-400">ムード</Label>
                          <span className="inline-block px-2 py-1 bg-slate-900 text-blue-400 rounded text-xs">
                            {scene.mood}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                {/* Storyboard */}
                <TabsContent value="storyboard" className="space-y-4 mt-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {generatedMovie.storyboard.shots.map((shot, index) => (
                      <Card key={index} className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                          <CardTitle className="text-amber-400 text-sm">
                            ショット {shot.shotNumber}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {/* ビジュアルプレースホルダー */}
                          <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center">
                            <ImageIcon className="h-12 w-12 text-slate-600" />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-400">説明</Label>
                            <p className="text-xs text-slate-300">{shot.description}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-slate-400">カメラ</Label>
                              <p className="text-xs text-slate-300">{shot.cameraAngle}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-slate-400">構図</Label>
                              <p className="text-xs text-slate-300">{shot.composition}</p>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-slate-400">ビジュアルノート</Label>
                            <p className="text-xs text-slate-300">{shot.visualNotes}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>

              {/* レンダリング設定 */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-amber-400 text-lg">⚙️ レンダリング設定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-slate-400">解像度</Label>
                      <p className="text-sm text-slate-300">{generatedMovie.renderingOptions.resolution}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">FPS</Label>
                      <p className="text-sm text-slate-300">{generatedMovie.renderingOptions.fps}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">スタイル</Label>
                      <p className="text-sm text-slate-300">{generatedMovie.renderingOptions.style}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* アクションボタン */}
              <div className="flex gap-4">
                <Button
                  onClick={handleRender}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Film className="mr-2 h-4 w-4" />
                  レンダリング開始（Blender/Unity連携）
                </Button>
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
