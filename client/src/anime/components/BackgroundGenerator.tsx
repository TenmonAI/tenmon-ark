/**
 * Background Generator Component
 * アニメ背景生成UI
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BackgroundPreview } from './BackgroundPreview';
import { Loader2 } from 'lucide-react';

export function BackgroundGenerator() {
  const [style, setStyle] = useState<'ghibli' | 'mappa' | 'shinkai' | 'kyoto' | 'trigger' | 'wit'>('ghibli');
  const [type, setType] = useState<'nature' | 'urban' | 'interior' | 'fantasy' | 'sci-fi' | 'abstract'>('nature');
  const [description, setDescription] = useState('');
  const [mood, setMood] = useState<'serene' | 'energetic' | 'melancholic' | 'mysterious' | 'peaceful' | 'dramatic' | undefined>();
  const [timeOfDay, setTimeOfDay] = useState<'dawn' | 'morning' | 'noon' | 'afternoon' | 'sunset' | 'night' | 'midnight' | undefined>();
  const [weather, setWeather] = useState<'clear' | 'cloudy' | 'rainy' | 'snowy' | 'foggy' | 'stormy' | undefined>();
  const [colorPalette, setColorPalette] = useState<'warm' | 'cool' | 'vibrant' | 'muted' | 'monochrome' | 'pastel' | undefined>();
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateMutation = trpc.animeBackground.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedUrl(data.data.url);
      setError(null);
    },
    onError: (error) => {
      setError(error.message);
      setGeneratedUrl(null);
    },
  });

  const handleGenerate = () => {
    setError(null);
    generateMutation.mutate({
      style,
      type,
      description: description || undefined,
      mood,
      timeOfDay,
      weather,
      colorPalette,
    });
  };

  return (
    <div className="space-y-6 p-6 bg-slate-900 rounded-lg border border-slate-800">
      <h2 className="text-2xl font-bold text-white">背景生成</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="style">スタイル</Label>
          <Select value={style} onValueChange={(v) => setStyle(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ghibli">Studio Ghibli</SelectItem>
              <SelectItem value="mappa">MAPPA</SelectItem>
              <SelectItem value="shinkai">Makoto Shinkai</SelectItem>
              <SelectItem value="kyoto">Kyoto Animation</SelectItem>
              <SelectItem value="trigger">Studio Trigger</SelectItem>
              <SelectItem value="wit">WIT Studio</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="type">背景タイプ</Label>
          <Select value={type} onValueChange={(v) => setType(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nature">自然</SelectItem>
              <SelectItem value="urban">都市</SelectItem>
              <SelectItem value="interior">室内</SelectItem>
              <SelectItem value="fantasy">ファンタジー</SelectItem>
              <SelectItem value="sci-fi">SF</SelectItem>
              <SelectItem value="abstract">抽象</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="mood">ムード</Label>
          <Select value={mood || ''} onValueChange={(v) => setMood(v ? (v as any) : undefined)}>
            <SelectTrigger>
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">なし</SelectItem>
              <SelectItem value="serene">静か</SelectItem>
              <SelectItem value="energetic">エネルギッシュ</SelectItem>
              <SelectItem value="melancholic">メランコリック</SelectItem>
              <SelectItem value="mysterious">神秘的</SelectItem>
              <SelectItem value="peaceful">平和</SelectItem>
              <SelectItem value="dramatic">ドラマチック</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="timeOfDay">時間帯</Label>
          <Select value={timeOfDay || ''} onValueChange={(v) => setTimeOfDay(v ? (v as any) : undefined)}>
            <SelectTrigger>
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">なし</SelectItem>
              <SelectItem value="dawn">夜明け</SelectItem>
              <SelectItem value="morning">朝</SelectItem>
              <SelectItem value="noon">正午</SelectItem>
              <SelectItem value="afternoon">午後</SelectItem>
              <SelectItem value="sunset">夕焼け</SelectItem>
              <SelectItem value="night">夜</SelectItem>
              <SelectItem value="midnight">真夜中</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="weather">天候</Label>
          <Select value={weather || ''} onValueChange={(v) => setWeather(v ? (v as any) : undefined)}>
            <SelectTrigger>
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">なし</SelectItem>
              <SelectItem value="clear">晴れ</SelectItem>
              <SelectItem value="cloudy">曇り</SelectItem>
              <SelectItem value="rainy">雨</SelectItem>
              <SelectItem value="snowy">雪</SelectItem>
              <SelectItem value="foggy">霧</SelectItem>
              <SelectItem value="stormy">嵐</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="colorPalette">カラーパレット</Label>
          <Select value={colorPalette || ''} onValueChange={(v) => setColorPalette(v ? (v as any) : undefined)}>
            <SelectTrigger>
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">なし</SelectItem>
              <SelectItem value="warm">暖色</SelectItem>
              <SelectItem value="cool">寒色</SelectItem>
              <SelectItem value="vibrant">鮮やか</SelectItem>
              <SelectItem value="muted">落ち着いた</SelectItem>
              <SelectItem value="monochrome">モノクロ</SelectItem>
              <SelectItem value="pastel">パステル</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">説明（オプション）</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="追加の説明を入力..."
          className="mt-2"
        />
      </div>

      <Button
        onClick={handleGenerate}
        disabled={generateMutation.isPending}
        className="w-full"
      >
        {generateMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            生成中...
          </>
        ) : (
          '背景を生成'
        )}
      </Button>

      {error && (
        <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {generatedUrl && (
        <BackgroundPreview url={generatedUrl} />
      )}
    </div>
  );
}

