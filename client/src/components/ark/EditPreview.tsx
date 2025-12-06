import { useState, useRef, useEffect } from "react";
import ReactPlayer from "react-player";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

interface EditPreviewProps {
  project: any;
  editResult: any;
}

export default function EditPreview({ project, editResult }: EditPreviewProps) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSubtitle, setCurrentSubtitle] = useState<any>(null);
  const playerRef = useRef<any>(null);

  // 字幕データをパース
  const subtitles = editResult.subtitleData ? JSON.parse(editResult.subtitleData) : [];

  // 現在の字幕を更新
  useEffect(() => {
    const subtitle = subtitles.find(
      (sub: any) => currentTime >= sub.start && currentTime <= sub.end
    );
    setCurrentSubtitle(subtitle || null);
  }, [currentTime, subtitles]);

  // 動画ソースURL
  const videoUrl = project.files?.[0]?.url || project.project.sourceUrl;

  // 火水による色の取得
  const getSubtitleColor = (hiMizu: string) => {
    if (hiMizu === "fire") return "text-red-400";
    if (hiMizu === "water") return "text-blue-400";
    return "text-white";
  };

  const PlayerComponent = ReactPlayer as any;

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* 動画プレーヤー */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <PlayerComponent
            ref={playerRef}
            url={videoUrl}
            playing={playing}
            muted={muted}
            width="100%"
            height="100%"
            onProgress={(state: any) => setCurrentTime(state.playedSeconds)}
            onDuration={setDuration}
            progressInterval={100}
          />

          {/* 字幕オーバーレイ */}
          {currentSubtitle && (
            <div className="absolute bottom-16 left-0 right-0 flex justify-center px-4">
              <div className="bg-black/80 px-6 py-3 rounded-lg backdrop-blur-sm">
                <p
                  className={`text-xl font-medium text-center ${getSubtitleColor(
                    currentSubtitle.hi_mizu
                  )}`}
                >
                  {currentSubtitle.subtitle}
                </p>
              </div>
            </div>
          )}

          {/* コントロールバー */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex items-center gap-4">
              {/* 再生/一時停止ボタン */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPlaying(!playing)}
                className="text-white hover:bg-white/20"
              >
                {playing ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </Button>

              {/* プログレスバー */}
              <div className="flex-1">
                <input
                  type="range"
                  min={0}
                  max={duration}
                  value={currentTime}
                  onChange={(e) => {
                    const time = parseFloat(e.target.value);
                    setCurrentTime(time);
                    playerRef.current?.seekTo(time, "seconds");
                  }}
                  className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                />
                <div className="flex justify-between text-xs text-white/70 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* ミュートボタン */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMuted(!muted)}
                className="text-white hover:bg-white/20"
              >
                {muted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* 字幕情報 */}
        {currentSubtitle && (
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">火水</p>
              <p className="font-medium">
                {currentSubtitle.hi_mizu === "fire" ? "🔥 火" : "💧 水"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">五十音</p>
              <p className="font-medium">{currentSubtitle.aion || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">スタイル</p>
              <p className="font-medium">{currentSubtitle.style || "-"}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// 時間フォーマット（MM:SS）
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
