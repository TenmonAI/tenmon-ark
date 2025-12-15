/**
 * Visual Synapse Image Generator
 * AI画像生成API統合（OpenAI DALL-E 3, Stability AI, Flux）
 */

import { buildPrompt, PromptOptions } from './promptBuilder';

export type ImageProvider = 'openai' | 'stability' | 'flux';
export type ImageSize = '1024x1024' | '1792x1024' | '1024x1792' | '512x512' | '768x768';

export interface GenerateImageOptions extends PromptOptions {
  provider?: ImageProvider;
  size?: ImageSize;
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  saveToKokuzo?: boolean;
}

export interface GenerateImageResponse {
  url: string;
  base64?: string;
  provider: ImageProvider;
  metadata: {
    style: string;
    type: string;
    prompt: string;
    generatedAt: string;
  };
}

/**
 * プロバイダーを自動検出
 */
function detectProvider(): ImageProvider {
  if (process.env.OPENAI_API_KEY) {
    return 'openai';
  }
  if (process.env.STABILITY_API_KEY) {
    return 'stability';
  }
  if (process.env.FLUX_API_KEY) {
    return 'flux';
  }
  throw new Error('No image generation API key found. Please set OPENAI_API_KEY, STABILITY_API_KEY, or FLUX_API_KEY');
}

/**
 * OpenAI DALL-E 3で画像生成
 */
async function generateWithOpenAI(
  prompt: string,
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const size = options.size || '1024x1024';
  const quality = options.quality || 'standard';
  const style = options.style || 'vivid';

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size,
      quality,
      style,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const imageUrl = data.data[0]?.url;

  if (!imageUrl) {
    throw new Error('No image URL returned from OpenAI');
  }

  // base64変換（必要に応じて）
  let base64: string | undefined;
  if (options.saveToKokuzo) {
    const imageResponse = await fetch(imageUrl);
    const buffer = await imageResponse.arrayBuffer();
    base64 = Buffer.from(buffer).toString('base64');
  }

  return {
    url: imageUrl,
    base64,
    provider: 'openai',
    metadata: {
      style: options.style || 'unknown',
      type: options.type,
      prompt,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Stability AIで画像生成
 */
async function generateWithStability(
  prompt: string,
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) {
    throw new Error('STABILITY_API_KEY is not set');
  }

  const size = options.size || '1024x1024';
  const [width, height] = size.split('x').map(Number);
  const aspectRatio = width / height;

  const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      Accept: 'image/png',
    },
    body: JSON.stringify({
      prompt,
      aspect_ratio: aspectRatio,
      output_format: 'png',
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`Stability AI API error: ${error.error?.message || response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  // Kokuzo Storageに保存
  const { storagePut } = await import('../../../storage');
  const { url } = await storagePut(
    `anime/backgrounds/${Date.now()}.png`,
    Buffer.from(buffer),
    'image/png'
  );

  return {
    url,
    base64,
    provider: 'stability',
    metadata: {
      style: options.style || 'unknown',
      type: options.type,
      prompt,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Fluxで画像生成（プレースホルダー）
 */
async function generateWithFlux(
  prompt: string,
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  // TODO: Flux API実装待ち
  throw new Error('Flux API is not yet implemented');
}

/**
 * AI画像生成を実行
 */
export async function callAIImageModel(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const prompt = buildPrompt(options);
  const provider = options.provider || detectProvider();

  switch (provider) {
    case 'openai':
      return generateWithOpenAI(prompt, options);
    case 'stability':
      return generateWithStability(prompt, options);
    case 'flux':
      return generateWithFlux(prompt, options);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

