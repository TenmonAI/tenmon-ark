/**
 * ULCE v3 Translation UI
 * Universal Language Conversion Engine v3
 * 意味 → 構文 → 火水の3段階翻訳パイプライン
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Languages, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Streamdown } from "streamdown";

const SUPPORTED_LANGUAGES = [
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
];

export default function ULCEV3() {
  const [sourceText, setSourceText] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("ja");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [translationResult, setTranslationResult] = useState<any>(null);

  const translateMutation = trpc.ulce.translate.useMutation();

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;

    try {
      const result = await translateMutation.mutateAsync({
        text: sourceText,
        sourceLanguage,
        targetLanguage,
      });
      setTranslationResult(result);
    } catch (error) {
      console.error("Translation failed:", error);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-400 border-green-500/50 bg-green-950/30";
    if (confidence >= 0.5) return "text-yellow-400 border-yellow-500/50 bg-yellow-950/30";
    return "text-red-400 border-red-500/50 bg-red-950/30";
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle2 className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 text-slate-100">
      {/* ヘッダー */}
      <div className="bg-slate-900/95 backdrop-blur-md border-b border-purple-500/30 shadow-lg">
        <div className="container mx-auto p-4">
          <div className="flex items-center gap-3">
            <Languages className="h-8 w-8 text-purple-400" />
            <div>
              <h1 className="text-2xl font-bold text-purple-400">ULCE v3 翻訳OS</h1>
              <p className="text-sm text-slate-400">Universal Language Conversion Engine v3</p>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="container mx-auto p-6 space-y-6">
        {/* 翻訳入力エリア */}
        <Card className="bg-slate-900/50 border-purple-500/50">
          <CardHeader>
            <CardTitle className="text-purple-400">翻訳入力</CardTitle>
            <CardDescription>テキストを入力して、言語を選択してください</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 言語選択 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">元の言語</label>
                <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="h-6 w-6 text-purple-400" />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">翻訳先の言語</label>
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* テキスト入力 */}
            <div>
              <label className="text-sm text-slate-400 mb-2 block">翻訳するテキスト</label>
              <Textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="翻訳したいテキストを入力してください..."
                className="bg-slate-800/50 border-slate-700 text-slate-100 min-h-[200px] text-base leading-relaxed"
              />
              <div className="text-xs text-slate-500 mt-1">
                {sourceText.length} 文字
              </div>
            </div>

            {/* 翻訳ボタン */}
            <Button
              onClick={handleTranslate}
              disabled={!sourceText.trim() || translateMutation.isPending}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold h-12"
            >
              {translateMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  翻訳中...
                </>
              ) : (
                <>
                  <Languages className="h-5 w-5 mr-2" />
                  翻訳する
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 翻訳結果 */}
        {translationResult && (
          <div className="space-y-4">
            {/* 翻訳品質インジケーター */}
            <Card className={`border-2 ${getConfidenceColor(translationResult.confidence)}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getConfidenceIcon(translationResult.confidence)}
                    <span className="font-semibold">翻訳品質</span>
                  </div>
                  <Badge variant="outline" className={getConfidenceColor(translationResult.confidence)}>
                    {(translationResult.confidence * 100).toFixed(0)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* 翻訳結果表示 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 原文 */}
              <Card className="bg-slate-900/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-300">原文</CardTitle>
                  <CardDescription>
                    {SUPPORTED_LANGUAGES.find(l => l.code === sourceLanguage)?.flag}{" "}
                    {SUPPORTED_LANGUAGES.find(l => l.code === sourceLanguage)?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {translationResult.original}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* 翻訳文 */}
              <Card className="bg-slate-900/50 border-purple-500/50">
                <CardHeader>
                  <CardTitle className="text-lg text-purple-400">翻訳文</CardTitle>
                  <CardDescription>
                    {SUPPORTED_LANGUAGES.find(l => l.code === targetLanguage)?.flag}{" "}
                    {SUPPORTED_LANGUAGES.find(l => l.code === targetLanguage)?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-purple-950/30 p-4 rounded-lg border border-purple-500/50">
                    <p className="text-slate-100 leading-relaxed whitespace-pre-wrap font-medium">
                      {translationResult.final}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 翻訳段階の詳細 */}
            <Card className="bg-slate-900/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-purple-400">翻訳プロセス</CardTitle>
                <CardDescription>ULCE v3の3段階翻訳パイプライン</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {translationResult.stages?.map((stage: any, index: number) => (
                  <div key={index} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                        Stage {index + 1}: {stage.stage}
                      </Badge>
                    </div>
                    <Streamdown>{stage.content}</Streamdown>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
