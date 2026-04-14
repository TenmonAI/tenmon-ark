/**
 * ============================================================
 *  SUKUYOU PAGE — 宿曜鑑定専用ページ
 * ============================================================
 *
 * 入力フォーム → guidance API → レポート表示 → コピー → チャットへ送る
 * ============================================================
 */
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Copy, Send, Loader2, Star } from "lucide-react";
import { useLocation } from "wouter";

interface GuidanceResult {
  success: boolean;
  honmeiShuku: string;
  disasterType: string;
  reversalAxis: string;
  oracle: string;
  report: {
    chapters: Array<{ title: string; body: string }>;
    fullText: string;
    charCount: number;
  };
  premise: {
    birthDate: string;
    name: string | null;
    nakshatra: string;
    nakshatraJp: string;
    confidence: number;
  };
  warnings: string[];
}

export default function SukuyouPage() {
  const [, navigate] = useLocation();

  // Form state
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [name, setName] = useState("");
  const [concern, setConcern] = useState("");

  // Result state
  const [result, setResult] = useState<GuidanceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!birthYear || !birthMonth || !birthDay) {
      setError("生年月日を入力してください");
      return;
    }
    const y = parseInt(birthYear);
    const m = parseInt(birthMonth);
    const d = parseInt(birthDay);
    if (isNaN(y) || isNaN(m) || isNaN(d) || y < 1900 || y > 2025 || m < 1 || m > 12 || d < 1 || d > 31) {
      setError("生年月日の値が不正です");
      return;
    }
    const birthDate = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/sukuyou/guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthDate,
          name: name.trim() || null,
          currentConcern: concern.trim() || null,
          confidence: 0.85,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "鑑定中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [birthYear, birthMonth, birthDay, name, concern]);

  const handleCopy = useCallback(async () => {
    if (!result?.report?.fullText) return;
    try {
      await navigator.clipboard.writeText(result.report.fullText);
      toast.success("鑑定レポートをクリップボードにコピーしました");
    } catch {
      // Fallback for non-HTTPS
      const textarea = document.createElement("textarea");
      textarea.value = result.report.fullText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast.success("鑑定レポートをクリップボードにコピーしました");
    }
  }, [result]);

  const handleSendToChat = useCallback(() => {
    if (!result) return;
    const seed = `[SUKUYOU_SEED] ${result.premise?.birthDate || ""} / ${result.honmeiShuku || ""} / ${result.disasterType || ""}`;
    // Navigate to chat with the seed as a query parameter
    navigate(`/chat?sukuyouSeed=${encodeURIComponent(seed)}`);
  }, [result, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-amber-500/20 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/chat")}
            className="text-amber-400 hover:text-amber-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-amber-400 flex items-center gap-2">
              <Star className="w-5 h-5" />
              宿曜鑑定
            </h1>
            <p className="text-xs text-slate-400">天聞アーク御神託パイプライン</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Input Form */}
        <Card className="bg-slate-800/50 border-amber-500/20">
          <CardHeader>
            <CardTitle className="text-amber-400 text-base">基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Birth Date */}
            <div>
              <Label className="text-slate-300 text-sm">生年月日（必須）</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  placeholder="1979"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-slate-100 w-24"
                  min={1900}
                  max={2025}
                />
                <span className="text-slate-400 self-center">年</span>
                <Input
                  type="number"
                  placeholder="9"
                  value={birthMonth}
                  onChange={(e) => setBirthMonth(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-slate-100 w-16"
                  min={1}
                  max={12}
                />
                <span className="text-slate-400 self-center">月</span>
                <Input
                  type="number"
                  placeholder="20"
                  value={birthDay}
                  onChange={(e) => setBirthDay(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-slate-100 w-16"
                  min={1}
                  max={31}
                />
                <span className="text-slate-400 self-center">日</span>
              </div>
            </div>

            {/* Name */}
            <div>
              <Label className="text-slate-300 text-sm">名前（任意）</Label>
              <Input
                type="text"
                placeholder="横山航介"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-slate-100 mt-1"
              />
            </div>

            {/* Concern */}
            <div>
              <Label className="text-slate-300 text-sm">現在の悩み・相談内容（任意）</Label>
              <Textarea
                placeholder="最近、仕事の方向性に迷いがあります…"
                value={concern}
                onChange={(e) => setConcern(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-slate-100 mt-1 min-h-[80px]"
              />
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  鑑定中…
                </>
              ) : (
                "御神託を受ける"
              )}
            </Button>

            {error && (
              <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded p-3">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Result */}
        {result && (
          <div className="space-y-4">
            {/* Summary Card */}
            <Card className="bg-slate-800/50 border-amber-500/30">
              <CardHeader>
                <CardTitle className="text-amber-400 text-base flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  鑑定結果
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-400">本命宿:</span>
                    <span className="ml-2 text-amber-300 font-bold">{result.honmeiShuku}</span>
                  </div>
                  {result.premise?.name && (
                    <div>
                      <span className="text-slate-400">名前:</span>
                      <span className="ml-2 text-slate-200">{result.premise.name}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400">災い分類:</span>
                    <span className="ml-2 text-slate-200">{result.disasterType}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">反転軸:</span>
                    <span className="ml-2 text-slate-200">{result.reversalAxis}</span>
                  </div>
                </div>
                {result.oracle && (
                  <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded">
                    <p className="text-sm text-amber-200 font-medium">御神託</p>
                    <p className="text-slate-200 text-sm mt-1">{result.oracle}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Full Report */}
            <Card className="bg-slate-800/50 border-slate-600/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-amber-400 text-base">御神託レポート全文</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    コピー
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSendToChat}
                    className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                  >
                    <Send className="w-3 h-3 mr-1" />
                    チャットへ送る
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-slate-200 text-sm leading-relaxed font-sans bg-transparent p-0 m-0">
                    {result.report.fullText}
                  </pre>
                </div>
                <div className="mt-3 text-xs text-slate-500 text-right">
                  {result.report.charCount.toLocaleString()} 文字
                </div>
              </CardContent>
            </Card>

            {/* Chapters (collapsible) */}
            {result.report.chapters && result.report.chapters.length > 0 && (
              <Card className="bg-slate-800/50 border-slate-600/50">
                <CardHeader>
                  <CardTitle className="text-amber-400 text-base">章別表示</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.report.chapters.map((ch, i) => (
                    <div key={i} className="border-b border-slate-700/50 pb-3 last:border-0">
                      <h3 className="text-amber-300 text-sm font-bold mb-1">{ch.title}</h3>
                      <p className="text-slate-300 text-sm whitespace-pre-wrap">{ch.body}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Warnings */}
            {result.warnings && result.warnings.length > 0 && (
              <div className="text-xs text-slate-500 space-y-1">
                {result.warnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
