import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface CutPoint {
  start: number;
  end: number;
  type: "breath" | "mizu_to_hi" | "hi_to_mizu";
  score?: number;
}

interface CutPointTimelineProps {
  cutPoints: CutPoint[];
  duration: number;
}

export default function CutPointTimeline({ cutPoints, duration }: CutPointTimelineProps) {
  const { t } = useTranslation();

  // カット点のタイプごとの色
  const getTypeColor = (type: string) => {
    switch (type) {
      case "breath":
        return "bg-green-500";
      case "mizu_to_hi":
        return "bg-gradient-to-r from-blue-500 to-red-500";
      case "hi_to_mizu":
        return "bg-gradient-to-r from-red-500 to-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  // カット点のタイプ名
  const getTypeName = (type: string) => {
    switch (type) {
      case "breath":
        return t('ark.breathPoint');
      case "mizu_to_hi":
        return t('ark.mizuToHi');
      case "hi_to_mizu":
        return t('ark.hiToMizu');
      default:
        return type;
    }
  };

  // 時間フォーマット
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* タイムライン */}
        <div className="relative h-24 bg-muted rounded-lg overflow-hidden">
          {/* 背景グリッド */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 border-r border-border last:border-r-0"
              />
            ))}
          </div>

          {/* カット点マーカー */}
          {cutPoints.map((cutPoint, index) => {
            const position = duration > 0 ? (cutPoint.start / duration) * 100 : 0;
            return (
              <div
                key={index}
                className="absolute top-0 bottom-0 w-1 cursor-pointer hover:w-2 transition-all group"
                style={{ left: `${position}%` }}
              >
                <div className={`h-full ${getTypeColor(cutPoint.type)}`} />
                {/* ツールチップ */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                    <p className="font-medium">{getTypeName(cutPoint.type)}</p>
                    <p>{formatTime(cutPoint.start)}</p>
                    {cutPoint.score && (
                      <p className="text-muted-foreground">
                        Score: {cutPoint.score.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 凡例 */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span>{t('ark.breathPoint')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-red-500 rounded" />
            <span>{t('ark.mizuToHi')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-blue-500 rounded" />
            <span>{t('ark.hiToMizu')}</span>
          </div>
        </div>

        {/* カット点リスト */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {cutPoints.map((cutPoint, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getTypeColor(cutPoint.type)}`} />
                <div>
                  <p className="font-medium">{getTypeName(cutPoint.type)}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatTime(cutPoint.start)} - {formatTime(cutPoint.end)}
                  </p>
                </div>
              </div>
              {cutPoint.score && (
                <div className="text-sm text-muted-foreground">
                  Score: {cutPoint.score.toFixed(2)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 統計情報 */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div>
            <p className="text-sm text-muted-foreground">{t('ark.totalCutPoints')}</p>
            <p className="text-2xl font-bold">{cutPoints.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('ark.breathPoints')}</p>
            <p className="text-2xl font-bold">
              {cutPoints.filter((cp) => cp.type === "breath").length}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('ark.hiMizuShifts')}</p>
            <p className="text-2xl font-bold">
              {cutPoints.filter((cp) => cp.type.includes("_to_")).length}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
