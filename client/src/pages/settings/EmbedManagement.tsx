/**
 * EmbedManagement.tsx - Embed OS Management Page
 * 
 * 外部サイト埋め込み管理ページ
 * - Embed URL生成
 * - iframeコード表示・コピー
 * - Embed一覧表示
 * - テーマ設定
 * - 削除機能
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Copy, ExternalLink, Trash2, Plus, Code } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function EmbedManagement() {
  const [selectedType, setSelectedType] = useState<"chat" | "qa">("chat");
  const [selectedTheme, setSelectedTheme] = useState<"dark" | "light">("dark");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedEmbed, setSelectedEmbed] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: embeds, isLoading } = trpc.embed.list.useQuery();

  const createEmbed = trpc.embed.create.useMutation({
    onSuccess: (data) => {
      toast.success("Embed作成完了", {
        description: `Embed URL: ${data.embedUrl}`,
      });
      utils.embed.list.invalidate();
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Embed作成失敗", {
        description: error.message,
      });
    },
  });

  const deleteEmbed = trpc.embed.delete.useMutation({
    onSuccess: () => {
      toast.success("Embedを削除しました");
      utils.embed.list.invalidate();
    },
    onError: (error) => {
      toast.error("削除失敗", {
        description: error.message,
      });
    },
  });

  const updateTheme = trpc.embed.updateTheme.useMutation({
    onSuccess: () => {
      toast.success("テーマを変更しました");
      utils.embed.list.invalidate();
    },
    onError: (error) => {
      toast.error("テーマ変更失敗", {
        description: error.message,
      });
    },
  });

  const handleCreateEmbed = async () => {
    await createEmbed.mutateAsync({
      type: selectedType,
      theme: selectedTheme,
    });
  };

  const handleCopyCode = (code: string, type: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`${type}コードをコピーしました`);
  };

  const handleTestEmbed = (url: string) => {
    window.open(url, "_blank");
  };

  const handleDeleteEmbed = async (uniqueId: string) => {
    if (confirm("このEmbedを削除しますか？")) {
      await deleteEmbed.mutateAsync({ uniqueId });
    }
  };

  const handleThemeChange = async (uniqueId: string, theme: "dark" | "light") => {
    await updateTheme.mutateAsync({ uniqueId, theme });
  };

  const generateIframeCode = (uniqueId: string, type: "standard" | "floating" | "mobile") => {
    const baseUrl = window.location.origin;
    const embedUrl = `${baseUrl}/embed/ark-chat-${uniqueId}`;

    switch (type) {
      case "standard":
        return `<iframe
  src="${embedUrl}"
  style="width:100%;height:700px;border:0;border-radius:12px;"
></iframe>`;

      case "floating":
        return `<script src="${baseUrl}/embed/ark-floating.js"
        data-chat-url="${embedUrl}">
</script>`;

      case "mobile":
        return `<iframe
  src="${embedUrl}"
  style="width:100%;height:85vh;border:0;"
></iframe>`;

      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600 mb-2">
            Embed OS 管理
          </h1>
          <p className="text-gray-400">
            外部サイトに天聞アークを埋め込むためのEmbed URLを管理します
          </p>
        </div>

        {/* Create Button */}
        <div className="mb-8">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
                <Plus className="mr-2 h-4 w-4" />
                新しいEmbedを作る
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-amber-500/20">
              <DialogHeader>
                <DialogTitle className="text-amber-400">Embed作成</DialogTitle>
                <DialogDescription className="text-gray-400">
                  埋め込みタイプとテーマを選択してください
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Type Selection */}
                <div className="space-y-2">
                  <Label className="text-amber-400">タイプ</Label>
                  <RadioGroup value={selectedType} onValueChange={(v) => setSelectedType(v as "chat" | "qa")}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="chat" id="type-chat" />
                      <Label htmlFor="type-chat" className="text-gray-300 cursor-pointer">
                        Chat (フルチャット体験)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="qa" id="type-qa" />
                      <Label htmlFor="type-qa" className="text-gray-300 cursor-pointer">
                        QA (LP用シンプル版)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Theme Selection */}
                <div className="space-y-2">
                  <Label className="text-amber-400">テーマ</Label>
                  <RadioGroup value={selectedTheme} onValueChange={(v) => setSelectedTheme(v as "dark" | "light")}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="dark" id="theme-dark" />
                      <Label htmlFor="theme-dark" className="text-gray-300 cursor-pointer">
                        ダーク (黒 × 金)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="light" id="theme-light" />
                      <Label htmlFor="theme-light" className="text-gray-300 cursor-pointer">
                        ライト (白 × 金)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Button
                  onClick={handleCreateEmbed}
                  disabled={createEmbed.isPending}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                >
                  {createEmbed.isPending ? "作成中..." : "Embedを作成"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Embeds List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-400"></div>
            <p className="mt-4 text-amber-400">読み込み中...</p>
          </div>
        ) : embeds && embeds.length > 0 ? (
          <div className="grid gap-6">
            {embeds.map((embed) => {
              const embedUrl = `${window.location.origin}/embed/ark-chat-${embed.uniqueId}`;
              return (
                <Card key={embed.id} className="bg-gray-900/50 border-amber-500/20">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-amber-400 flex items-center gap-2">
                          <Code className="h-5 w-5" />
                          {embed.type === "chat" ? "Chat Embed" : "QA Embed"}
                        </CardTitle>
                        <CardDescription className="text-gray-400 mt-2">
                          作成日時: {new Date(embed.createdAt).toLocaleString("ja-JP")}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestEmbed(embedUrl)}
                          className="border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteEmbed(embed.uniqueId)}
                          className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Theme Toggle */}
                    <div className="mb-4">
                      <Label className="text-amber-400 text-sm">テーマ</Label>
                      <RadioGroup
                        value={embed.theme}
                        onValueChange={(v) => handleThemeChange(embed.uniqueId, v as "dark" | "light")}
                        className="flex gap-4 mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="dark" id={`theme-dark-${embed.id}`} />
                          <Label htmlFor={`theme-dark-${embed.id}`} className="text-gray-300 cursor-pointer text-sm">
                            ダーク
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="light" id={`theme-light-${embed.id}`} />
                          <Label htmlFor={`theme-light-${embed.id}`} className="text-gray-300 cursor-pointer text-sm">
                            ライト
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Embed URL */}
                    <div className="mb-4">
                      <Label className="text-amber-400 text-sm">Embed URL</Label>
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          value={embedUrl}
                          readOnly
                          className="flex-1 bg-black/50 border border-amber-500/20 rounded px-3 py-2 text-gray-300 text-sm"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyCode(embedUrl, "URL")}
                          className="border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Iframe Codes */}
                    <Tabs defaultValue="standard" className="w-full">
                      <TabsList className="bg-black/50 border border-amber-500/20">
                        <TabsTrigger value="standard" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                          標準埋め込み
                        </TabsTrigger>
                        <TabsTrigger value="floating" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                          フローティング
                        </TabsTrigger>
                        <TabsTrigger value="mobile" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                          スマホ最適化
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="standard" className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-amber-400 text-sm">標準埋め込みコード</Label>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyCode(generateIframeCode(embed.uniqueId, "standard"), "標準埋め込み")}
                            className="border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            コピー
                          </Button>
                        </div>
                        <pre className="bg-black/50 border border-amber-500/20 rounded p-4 text-gray-300 text-xs overflow-x-auto">
                          {generateIframeCode(embed.uniqueId, "standard")}
                        </pre>
                      </TabsContent>

                      <TabsContent value="floating" className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-amber-400 text-sm">フローティングチャットコード</Label>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyCode(generateIframeCode(embed.uniqueId, "floating"), "フローティング")}
                            className="border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            コピー
                          </Button>
                        </div>
                        <pre className="bg-black/50 border border-amber-500/20 rounded p-4 text-gray-300 text-xs overflow-x-auto">
                          {generateIframeCode(embed.uniqueId, "floating")}
                        </pre>
                      </TabsContent>

                      <TabsContent value="mobile" className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-amber-400 text-sm">スマホ最適化コード</Label>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyCode(generateIframeCode(embed.uniqueId, "mobile"), "スマホ最適化")}
                            className="border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            コピー
                          </Button>
                        </div>
                        <pre className="bg-black/50 border border-amber-500/20 rounded p-4 text-gray-300 text-xs overflow-x-auto">
                          {generateIframeCode(embed.uniqueId, "mobile")}
                        </pre>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Alert className="bg-gray-900/50 border-amber-500/20">
            <AlertDescription className="text-gray-400">
              まだEmbedが作成されていません。「新しいEmbedを作る」ボタンから作成してください。
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
