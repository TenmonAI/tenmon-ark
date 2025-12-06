import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Languages, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function UniversalConverter() {
  const [inputText, setInputText] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "ko" | "zh" | "ar" | "hi" | "sa" | "la">("en");
  const [convertedText, setConvertedText] = useState("");
  const [fireWaterBalance, setFireWaterBalance] = useState<{ fire: number; water: number; balance: number } | null>(null);
  const [spiritualScore, setSpiritualScore] = useState<number | null>(null);
  const [spiritualDistance, setSpiritualDistance] = useState<{
    fireWaterBalance: number;
    distanceFromCenter: number;
    spiritualDistance: number;
    interpretation: string;
  } | null>(null);

  const convertMutation = trpc.universal.convertToSpiritual.useMutation({
    onSuccess: (data) => {
      setConvertedText(data.converted);
      setFireWaterBalance(data.fireWaterBalance);
      setSpiritualScore(data.spiritualScore);
      toast.success("Conversion completed successfully!");
    },
    onError: (error) => {
      toast.error(`Conversion failed: ${error.message}`);
    },
  });

  // 霊的距離を取得
  const { data: distanceData } = trpc.universal.calculateSpiritualDistance.useQuery(
    { text: inputText, language: selectedLanguage },
    { enabled: !!inputText && inputText.length > 0 }
  );

  useEffect(() => {
    if (distanceData) {
      setSpiritualDistance(distanceData);
    }
  }, [distanceData]);

  const handleConvert = () => {
    if (!inputText.trim()) {
      toast.error("Please enter text to convert");
      return;
    }

    convertMutation.mutate({
      text: inputText,
      language: selectedLanguage,
      balanceFireWater: true,
    });
  };

  const getBalanceColor = (balance: number) => {
    if (balance < 0.4) return "text-blue-500";
    if (balance > 0.6) return "text-red-500";
    return "text-green-500";
  };

  const getScoreColor = (score: number) => {
    if (score < 40) return "text-red-500";
    if (score < 70) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="container max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            Universal Language Engine
          </h1>
          <p className="text-slate-400">
            Transform text into spiritual language across 5 world languages
          </p>
        </div>

        {/* Main Converter */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages className="w-5 h-5" />
                Input Text
              </CardTitle>
              <CardDescription>Enter text to convert to spiritual language</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Language</label>
                <Select value={selectedLanguage} onValueChange={(value: any) => setSelectedLanguage(value)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ko">한국어 (Korean)</SelectItem>
                    <SelectItem value="zh">中文 (Chinese)</SelectItem>
                    <SelectItem value="ar">العربية (Arabic)</SelectItem>
                    <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                    <SelectItem value="sa">संस्कृतम् (Sanskrit)</SelectItem>
                    <SelectItem value="la">Latina (Latin)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Textarea
                placeholder="Enter text here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="min-h-[200px] bg-slate-800 border-slate-700 text-slate-100"
              />

              <Button
                onClick={handleConvert}
                disabled={convertMutation.isPending}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {convertMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Convert to Spiritual Language
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Output Section */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Spiritual Output
              </CardTitle>
              <CardDescription>Converted spiritual language</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={convertedText}
                readOnly
                placeholder="Converted text will appear here..."
                className="min-h-[200px] bg-slate-800 border-slate-700 text-slate-100"
              />

              {spiritualScore !== null && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Spiritual Score</span>
                    <span className={`text-2xl font-bold ${getScoreColor(spiritualScore)}`}>
                      {spiritualScore}/100
                    </span>
                  </div>
                  <Progress value={spiritualScore} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Fire-Water Balance */}
        {fireWaterBalance && (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-400" />
                Fire-Water Balance Analysis
              </CardTitle>
              <CardDescription>Energetic balance of the converted text</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Fire (陽)</span>
                    <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
                      {fireWaterBalance.fire}
                    </Badge>
                  </div>
                  <Progress value={(fireWaterBalance.fire / (fireWaterBalance.fire + fireWaterBalance.water)) * 100} className="h-2 bg-red-900/30" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Water (陰)</span>
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      {fireWaterBalance.water}
                    </Badge>
                  </div>
                  <Progress value={(fireWaterBalance.water / (fireWaterBalance.fire + fireWaterBalance.water)) * 100} className="h-2 bg-blue-900/30" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Balance</span>
                    <span className={`text-lg font-bold ${getBalanceColor(fireWaterBalance.balance)}`}>
                      {(fireWaterBalance.balance * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={fireWaterBalance.balance * 100} className="h-2" />
                </div>
              </div>

              <div className="mt-4 p-4 bg-slate-800/50 rounded-lg">
                <p className="text-sm text-slate-400">
                  {fireWaterBalance.balance < 0.4 && "⚠️ Water-dominant: Consider adding more expansive, outward energy."}
                  {fireWaterBalance.balance > 0.6 && "⚠️ Fire-dominant: Consider adding more contractive, inward energy."}
                  {fireWaterBalance.balance >= 0.4 && fireWaterBalance.balance <= 0.6 && "✅ Well-balanced: Fire and Water energies are in harmony."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 霊的距離（ミナカからの距離） */}
        {spiritualDistance && (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                霊的距離（ミナカからの距離）
              </CardTitle>
              <CardDescription>世界言語の中心（ミナカ）からの距離</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">距離スコア</span>
                  <span className={`text-2xl font-bold ${
                    spiritualDistance.spiritualDistance < 20 ? 'text-green-400' :
                    spiritualDistance.spiritualDistance < 50 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {spiritualDistance.spiritualDistance}/100
                  </span>
                </div>
                <Progress value={spiritualDistance.spiritualDistance} className="h-2" />
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <p className="text-sm text-slate-300">
                    {spiritualDistance.interpretation}
                  </p>
                </div>
                <div className="text-xs text-slate-400">
                  火水バランス: {(spiritualDistance.fireWaterBalance * 100).toFixed(1)}% 火性
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Language Statistics */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle>Supported Languages</CardTitle>
            <CardDescription>Universal Language Engine supports 8 languages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="text-2xl mb-1">🇯🇵</div>
                <div className="font-semibold">日本語</div>
                <div className="text-sm text-slate-400">Japanese</div>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="text-2xl mb-1">🇬🇧</div>
                <div className="font-semibold">English</div>
                <div className="text-sm text-slate-400">English</div>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="text-2xl mb-1">🇰🇷</div>
                <div className="font-semibold">한국어</div>
                <div className="text-sm text-slate-400">Korean</div>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="text-2xl mb-1">🇨🇳</div>
                <div className="font-semibold">中文</div>
                <div className="text-sm text-slate-400">Chinese</div>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="text-2xl mb-1">🇸🇦</div>
                <div className="font-semibold">العربية</div>
                <div className="text-sm text-slate-400">Arabic</div>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="text-2xl mb-1">🇮🇳</div>
                <div className="font-semibold">हिन्दी</div>
                <div className="text-sm text-slate-400">Hindi</div>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="text-2xl mb-1">🕉️</div>
                <div className="font-semibold">संस्कृतम्</div>
                <div className="text-sm text-slate-400">Sanskrit</div>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="text-2xl mb-1">🏛️</div>
                <div className="font-semibold">Latina</div>
                <div className="text-sm text-slate-400">Latin</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
