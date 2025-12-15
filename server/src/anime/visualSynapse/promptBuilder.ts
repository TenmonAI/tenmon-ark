/**
 * Visual Synapse Prompt Builder
 * アニメ背景生成用のプロンプトビルダー
 */

export type AnimeStyle = 'ghibli' | 'mappa' | 'shinkai' | 'kyoto' | 'trigger' | 'wit';
export type BackgroundType = 'nature' | 'urban' | 'interior' | 'fantasy' | 'sci-fi' | 'abstract';
export type Mood = 'serene' | 'energetic' | 'melancholic' | 'mysterious' | 'peaceful' | 'dramatic';
export type TimeOfDay = 'dawn' | 'morning' | 'noon' | 'afternoon' | 'sunset' | 'night' | 'midnight';
export type Weather = 'clear' | 'cloudy' | 'rainy' | 'snowy' | 'foggy' | 'stormy';
export type ColorPalette = 'warm' | 'cool' | 'vibrant' | 'muted' | 'monochrome' | 'pastel';

export interface PromptOptions {
  style: AnimeStyle;
  type: BackgroundType;
  description?: string;
  mood?: Mood;
  timeOfDay?: TimeOfDay;
  weather?: Weather;
  colorPalette?: ColorPalette;
}

/**
 * スタイル別テンプレート
 */
const STYLE_TEMPLATES: Record<AnimeStyle, string> = {
  ghibli: 'Studio Ghibli style, soft colors, detailed nature, magical atmosphere, hand-drawn aesthetic',
  mappa: 'MAPPA animation style, dynamic composition, bold colors, cinematic lighting, modern anime aesthetic',
  shinkai: 'Makoto Shinkai style, photorealistic backgrounds, vibrant colors, detailed sky and clouds, emotional atmosphere',
  kyoto: 'Kyoto Animation style, soft lighting, detailed character environments, warm colors, high quality animation',
  trigger: 'Studio Trigger style, bold colors, dynamic action backgrounds, stylized art, energetic composition',
  wit: 'WIT Studio style, detailed backgrounds, realistic textures, cinematic composition, high production value',
};

/**
 * 背景タイプ別テンプレート
 */
const TYPE_TEMPLATES: Record<BackgroundType, string> = {
  nature: 'beautiful natural landscape, mountains, forests, rivers, detailed environment',
  urban: 'detailed cityscape, buildings, streets, urban environment, modern architecture',
  interior: 'detailed interior space, room, furniture, lighting, cozy atmosphere',
  fantasy: 'fantasy world, magical elements, mystical atmosphere, imaginative setting',
  'sci-fi': 'futuristic environment, sci-fi elements, advanced technology, cyberpunk aesthetic',
  abstract: 'abstract background, artistic composition, creative design, visual effects',
};

/**
 * ムード別テンプレート
 */
const MOOD_TEMPLATES: Record<Mood, string> = {
  serene: 'peaceful, calm, tranquil atmosphere',
  energetic: 'dynamic, vibrant, lively atmosphere',
  melancholic: 'sad, nostalgic, emotional atmosphere',
  mysterious: 'mysterious, enigmatic, intriguing atmosphere',
  peaceful: 'relaxing, soothing, gentle atmosphere',
  dramatic: 'intense, powerful, impactful atmosphere',
};

/**
 * 時間帯別テンプレート
 */
const TIME_TEMPLATES: Record<TimeOfDay, string> = {
  dawn: 'early morning, soft golden light, sunrise colors, gentle illumination',
  morning: 'bright morning light, clear sky, fresh atmosphere',
  noon: 'bright daylight, strong sunlight, clear visibility',
  afternoon: 'warm afternoon light, golden hour approaching, comfortable lighting',
  sunset: 'beautiful sunset, warm orange and pink colors, dramatic sky',
  night: 'night scene, moonlight, stars, dark atmosphere, artificial lights',
  midnight: 'deep night, minimal light, mysterious atmosphere, dark tones',
};

/**
 * 天候別テンプレート
 */
const WEATHER_TEMPLATES: Record<Weather, string> = {
  clear: 'clear sky, bright weather, good visibility',
  cloudy: 'cloudy sky, soft diffused light, overcast atmosphere',
  rainy: 'rainy weather, water droplets, wet surfaces, moody atmosphere',
  snowy: 'snowy weather, snowflakes, white landscape, cold atmosphere',
  foggy: 'foggy weather, misty atmosphere, reduced visibility, mysterious mood',
  stormy: 'stormy weather, dramatic clouds, intense atmosphere, dynamic lighting',
};

/**
 * カラーパレット別テンプレート
 */
const COLOR_TEMPLATES: Record<ColorPalette, string> = {
  warm: 'warm color palette, oranges, reds, yellows, cozy tones',
  cool: 'cool color palette, blues, greens, purples, refreshing tones',
  vibrant: 'vibrant colors, high saturation, energetic palette, bold hues',
  muted: 'muted colors, desaturated tones, soft palette, subtle hues',
  monochrome: 'monochrome palette, grayscale, black and white, minimalist',
  pastel: 'pastel colors, soft hues, gentle tones, delicate palette',
};

/**
 * プリセットプロンプト
 */
export const PRESETS = {
  anime_background: {
    ghibli: {
      type: 'nature' as BackgroundType,
      style: 'ghibli' as AnimeStyle,
      description: 'beautiful natural landscape in Studio Ghibli style',
    },
    mappa: {
      type: 'urban' as BackgroundType,
      style: 'mappa' as AnimeStyle,
      description: 'dynamic cityscape in MAPPA animation style',
    },
    shinkai: {
      type: 'nature' as BackgroundType,
      style: 'shinkai' as AnimeStyle,
      description: 'photorealistic landscape in Makoto Shinkai style',
    },
  },
  studio_scene: {
    ghibli: {
      type: 'interior' as BackgroundType,
      style: 'ghibli' as AnimeStyle,
      description: 'cozy interior space in Studio Ghibli style',
    },
    mappa: {
      type: 'interior' as BackgroundType,
      style: 'mappa' as AnimeStyle,
      description: 'modern interior in MAPPA animation style',
    },
    shinkai: {
      type: 'interior' as BackgroundType,
      style: 'shinkai' as AnimeStyle,
      description: 'detailed interior in Makoto Shinkai style',
    },
  },
};

/**
 * プロンプトを構築
 */
export function buildPrompt(options: PromptOptions): string {
  const parts: string[] = [];

  // タイプテンプレート
  parts.push(TYPE_TEMPLATES[options.type]);

  // スタイルテンプレート
  parts.push(STYLE_TEMPLATES[options.style]);

  // 説明
  if (options.description) {
    parts.push(options.description);
  }

  // ムード
  if (options.mood) {
    parts.push(MOOD_TEMPLATES[options.mood]);
  }

  // 時間帯
  if (options.timeOfDay) {
    parts.push(TIME_TEMPLATES[options.timeOfDay]);
  }

  // 天候
  if (options.weather) {
    parts.push(WEATHER_TEMPLATES[options.weather]);
  }

  // カラーパレット
  if (options.colorPalette) {
    parts.push(COLOR_TEMPLATES[options.colorPalette]);
  }

  /**
   * 🔱 TENMON-ARK Worldview Enhancement Layer
   * 天聞アーク世界観の核（火・水・深度・光学・構文的統一）を背景生成に反映
   * - cinematic構図
   * - volumetric光学
   * - fractal depth（天津金木のらせん構造）
   * - 光（水火）の呼吸表現
   */
  parts.push(
    'cinematic wide-angle shot, ultra-deep perspective, fractal-inspired composition, natural flow of light and shadow, atmospheric depth, volumetric lighting, subsurface scattering, soft ambient occlusion, film-grade dynamic range, hyperdetailed textures, ethereal energy, subtle sacred geometry'
  );

  /**
   * 🔥 天聞アーク固有の「火」の表現（光）
   * 光源の方向・呼吸・時間の流れ
   */
  parts.push(
    'glowing highlights, breathing light gradients, soft radiant bloom, reflective surfaces responding to light'
  );

  /**
   * 💧 天聞アーク固有の「水」の表現（影/反射/奥行き）
   */
  parts.push(
    'liquid reflections, flowing shadow motion, depth-enhancing mist, smooth tonal transitions'
  );

  /**
   * ❌ Negative Prompt — ノイズ軽減・破綻防止
   */
  parts.push(
    'no distorted shapes, no disfigured features, no low-resolution textures, no oversaturated lighting, no artifacts, no blurry areas'
  );

  // 品質タグ
  parts.push('masterpiece, best quality, highly detailed, professional, 8k, artstation quality, ultra sharp, perfect composition');

  return parts.join(', ');
}

/**
 * プリセットからプロンプトを構築
 */
export function buildPresetPrompt(
  preset: keyof typeof PRESETS,
  style: AnimeStyle,
  options?: Partial<PromptOptions>
): string {
  const presetConfig = PRESETS[preset][style];
  if (!presetConfig) {
    throw new Error(`Preset ${preset} with style ${style} not found`);
  }

  return buildPrompt({
    ...presetConfig,
    ...options,
  });
}

