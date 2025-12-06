import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

/**
 * TENMON-ARK 五十音図コンポーネント vΩ-K
 * 
 * 言霊秘書準拠の五十音を水火の色分けで表示
 */

const SUIKA_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "水": { bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-900 dark:text-blue-100", border: "border-blue-300 dark:border-blue-700" },
  "火": { bg: "bg-red-50 dark:bg-red-950", text: "text-red-900 dark:text-red-100", border: "border-red-300 dark:border-red-700" },
  "空": { bg: "bg-gray-50 dark:bg-gray-900", text: "text-gray-900 dark:text-gray-100", border: "border-gray-300 dark:border-gray-700" },
  "中": { bg: "bg-yellow-50 dark:bg-yellow-950", text: "text-yellow-900 dark:text-yellow-100", border: "border-yellow-300 dark:border-yellow-700" },
  "正": { bg: "bg-green-50 dark:bg-green-950", text: "text-green-900 dark:text-green-100", border: "border-green-300 dark:border-green-700" },
  "影": { bg: "bg-purple-50 dark:bg-purple-950", text: "text-purple-900 dark:text-purple-100", border: "border-purple-300 dark:border-purple-700" },
  "昇": { bg: "bg-orange-50 dark:bg-orange-950", text: "text-orange-900 dark:text-orange-100", border: "border-orange-300 dark:border-orange-700" },
  "濁": { bg: "bg-indigo-50 dark:bg-indigo-950", text: "text-indigo-900 dark:text-indigo-100", border: "border-indigo-300 dark:border-indigo-700" },
};

const GYOU_ORDER = ["ア行", "カ行", "サ行", "タ行", "ナ行", "ハ行", "マ行", "ヤ行", "ラ行", "ワ行"];
const DAN_ORDER = ["ア段", "イ段", "ウ段", "エ段", "オ段"];

interface GojuonCellProps {
  kana?: {
    kana: string;
    romaji: string;
    suikaType: string;
    suikaDetail: string | null;
    ongi: string;
  };
  onClick?: () => void;
}

function GojuonCell({ kana, onClick }: GojuonCellProps) {
  if (!kana) {
    return (
      <div className="aspect-square border border-border bg-muted/20 rounded-md" />
    );
  }

  const colors = SUIKA_COLORS[kana.suikaType] || SUIKA_COLORS["空"];

  return (
    <button
      onClick={onClick}
      className={`aspect-square border-2 ${colors.border} ${colors.bg} rounded-md p-2 hover:scale-105 transition-transform cursor-pointer group`}
    >
      <div className="flex flex-col items-center justify-center h-full">
        <div className={`text-2xl font-bold ${colors.text}`}>{kana.kana}</div>
        <div className={`text-xs ${colors.text} opacity-70`}>{kana.romaji}</div>
        <Badge variant="outline" className={`mt-1 text-xs ${colors.text} border-current`}>
          {kana.suikaType}
        </Badge>
      </div>
    </button>
  );
}

interface GojuonChartProps {
  onKanaSelect?: (kana: any) => void;
}

export function GojuonChart({ onKanaSelect }: GojuonChartProps) {
  const { data: gojuonData, isLoading } = trpc.kotodama.getAllGojuon.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!gojuonData || gojuonData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>五十音図</CardTitle>
          <CardDescription>データが登録されていません</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // 五十音を行・段で整理
  const gojuonMap = new Map<string, Map<string, any>>();
  
  for (const kana of gojuonData) {
    if (!gojuonMap.has(kana.gyou)) {
      gojuonMap.set(kana.gyou, new Map());
    }
    gojuonMap.get(kana.gyou)!.set(kana.dan, kana);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>五十音図 (言霊秘書準拠)</CardTitle>
        <CardDescription>
          水火の法則に基づく五十音の配置。色分けは水火タイプを表します。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* ヘッダー行 (段) */}
            <div className="grid grid-cols-6 gap-2 mb-2">
              <div className="aspect-square flex items-center justify-center text-sm font-semibold text-muted-foreground">
                行 / 段
              </div>
              {DAN_ORDER.map((dan) => (
                <div key={dan} className="aspect-square flex items-center justify-center text-sm font-semibold text-muted-foreground">
                  {dan.replace("段", "")}
                </div>
              ))}
            </div>

            {/* 五十音グリッド */}
            {GYOU_ORDER.map((gyou) => {
              const gyouData = gojuonMap.get(gyou);
              
              return (
                <div key={gyou} className="grid grid-cols-6 gap-2 mb-2">
                  {/* 行ラベル */}
                  <div className="aspect-square flex items-center justify-center text-sm font-semibold text-muted-foreground">
                    {gyou.replace("行", "")}
                  </div>

                  {/* 各段の仮名 */}
                  {DAN_ORDER.map((dan) => {
                    const kana = gyouData?.get(dan);
                    return (
                      <GojuonCell
                        key={`${gyou}-${dan}`}
                        kana={kana}
                        onClick={() => kana && onKanaSelect?.(kana)}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* 凡例 */}
        <div className="mt-6 pt-6 border-t">
          <h4 className="text-sm font-semibold mb-3">水火タイプ凡例</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(SUIKA_COLORS).map(([type, colors]) => (
              <div key={type} className={`flex items-center gap-2 p-2 rounded-md ${colors.bg} border ${colors.border}`}>
                <div className={`w-4 h-4 rounded-full ${colors.bg} border-2 ${colors.border}`} />
                <span className={`text-sm font-medium ${colors.text}`}>{type}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
