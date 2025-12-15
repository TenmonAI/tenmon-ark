/**
 * Visual Synapse Engine
 * アニメ背景生成エンジン
 */

import { callAIImageModel, GenerateImageOptions, GenerateImageResponse } from './imageGenerator';
import { storagePut } from '../../../storage';

export interface GenerateBackgroundOptions extends GenerateImageOptions {
  saveToKokuzo?: boolean;
}

export interface GenerateBackgroundResponse {
  url: string;
  kokuzoUrl?: string;
  metadata: {
    style: string;
    type: string;
    prompt: string;
    generatedAt: string;
  };
}

/**
 * 背景画像を生成
 */
export async function generateBackground(
  options: GenerateBackgroundOptions
): Promise<GenerateBackgroundResponse> {
  try {
    // AI画像生成
    const imageResult = await callAIImageModel(options);

    // Kokuzo Storageに保存（オプション）
    let kokuzoUrl: string | undefined;
    if (options.saveToKokuzo !== false && imageResult.base64) {
      try {
        const buffer = Buffer.from(imageResult.base64, 'base64');
        const { url } = await storagePut(
          `anime/backgrounds/${Date.now()}-${options.style}-${options.type}.png`,
          buffer,
          'image/png'
        );
        kokuzoUrl = url;
      } catch (error) {
        // Kokuzo保存エラーは警告のみ（画像生成は成功）
        console.warn('Failed to save to Kokuzo Storage:', error);
      }
    }

    return {
      url: imageResult.url,
      kokuzoUrl,
      metadata: imageResult.metadata,
    };
  } catch (error) {
    throw new Error(`Background generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

