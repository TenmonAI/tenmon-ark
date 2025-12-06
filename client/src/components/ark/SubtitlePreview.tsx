import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface Subtitle {
  start: number;
  end: number;
  subtitle: string;
  hi_mizu: "fire" | "water";
  aion?: string;
  color?: string;
  style?: string;
}

interface SubtitlePreviewProps {
  subtitles: Subtitle[];
}

export default function SubtitlePreview({ subtitles }: SubtitlePreviewProps) {
  const { t } = useTranslation();

  // 火水による色の取得
  const getHiMizuColor = (hiMizu: string) => {
    if (hiMizu === "fire") return "text-red-500 bg-red-500/10 border-red-500/30";
    if (hiMizu === "water") return "text-blue-500 bg-blue-500/10 border-blue-500/30";
    return "text-gray-500 bg-gray-500/10 border-gray-500/30";
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
      <div className="space-y-4">
        {/* 統計情報 */}
        <div className="grid grid-cols-3 gap-4 pb-4 border-b">
          <div>
            <p className="text-sm text-muted-foreground">{t('ark.totalSubtitles')}</p>
            <p className="text-2xl font-bold">{subtitles.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('ark.fireSubtitles')}</p>
            <p className="text-2xl font-bold text-red-500">
              {subtitles.filter((s) => s.hi_mizu === "fire").length}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('ark.waterSubtitles')}</p>
            <p className="text-2xl font-bold text-blue-500">
              {subtitles.filter((s) => s.hi_mizu === "water").length}
            </p>
          </div>
        </div>

        {/* 字幕リスト */}
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {subtitles.map((subtitle, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${getHiMizuColor(subtitle.hi_mizu)}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-lg font-medium mb-2">{subtitle.subtitle}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {formatTime(subtitle.start)} → {formatTime(subtitle.end)}
                    </span>
                    <span className="text-xs px-2 py-1 bg-background rounded">
                      {(subtitle.end - subtitle.start).toFixed(2)}s
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    {subtitle.hi_mizu === "fire" ? (
                      <span className="text-red-500">🔥 火</span>
                    ) : (
                      <span className="text-blue-500">💧 水</span>
                    )}
                  </div>
                  {subtitle.aion && (
                    <span className="text-xs px-2 py-1 bg-background rounded">
                      {subtitle.aion}
                    </span>
                  )}
                  {subtitle.style && (
                    <span className="text-xs px-2 py-1 bg-background rounded">
                      {subtitle.style}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 凡例 */}
        <div className="flex flex-wrap gap-4 pt-4 border-t text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500/20 border border-red-500/30 rounded" />
            <span>{t('ark.fireStyle')}: 断定的・外発的・赤系</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500/20 border border-blue-500/30 rounded" />
            <span>{t('ark.waterStyle')}: 柔らか・内集的・青系</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
