/**
 * Semantic Embedder
 * OpenAI Embeddings API を使用してテキストをベクトル化
 */

import { ENV } from '../_core/env';

export type Embedding = number[];

export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
}

export interface EmbeddingError {
  error: string;
  code: 'API_ERROR' | 'INVALID_INPUT' | 'SERVICE_ERROR';
  details?: string;
}

/**
 * テキストをベクトルに変換
 * 
 * @param text - 変換するテキスト
 * @param options - オプション（モデル、次元数）
 * @returns ベクトル配列またはエラー
 */
export async function embedText(
  text: string,
  options: EmbeddingOptions = {}
): Promise<Embedding | EmbeddingError> {
  try {
    // 入力検証
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return {
        error: 'Invalid input: text must be a non-empty string',
        code: 'INVALID_INPUT',
      };
    }

    // APIキーの確認
    const apiKey = process.env.OPENAI_API_KEY || ENV.forgeApiKey;
    if (!apiKey) {
      return {
        error: 'OpenAI API key is not configured',
        code: 'SERVICE_ERROR',
        details: 'OPENAI_API_KEY or BUILT_IN_FORGE_API_KEY is not set',
      };
    }

    // モデルの選択（デフォルト: text-embedding-3-small）
    const model = options.model || 'text-embedding-3-small';
    
    // API URLの決定
    const apiUrl = ENV.forgeApiUrl || 'https://api.openai.com/v1';
    const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    const embeddingsUrl = `${baseUrl}/embeddings`;

    // リクエストボディの構築
    const requestBody: Record<string, unknown> = {
      model,
      input: text,
    };

    // 次元数の指定（text-embedding-3-small と text-embedding-3-large でサポート）
    if (options.dimensions && (model.includes('3-small') || model.includes('3-large'))) {
      requestBody.dimensions = options.dimensions;
    }

    // API呼び出し
    const response = await fetch(embeddingsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return {
        error: 'Embedding API request failed',
        code: 'API_ERROR',
        details: `${response.status} ${response.statusText}${errorText ? `: ${errorText}` : ''}`,
      };
    }

    const data = await response.json() as {
      data: Array<{ embedding: number[] }>;
      model: string;
      usage: {
        prompt_tokens: number;
        total_tokens: number;
      };
    };

    // レスポンスの検証
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      return {
        error: 'Invalid embedding response',
        code: 'API_ERROR',
        details: 'Response does not contain valid embedding data',
      };
    }

    const embedding = data.data[0].embedding;
    if (!Array.isArray(embedding) || embedding.length === 0) {
      return {
        error: 'Invalid embedding format',
        code: 'API_ERROR',
        details: 'Embedding is not a valid array',
      };
    }

    return embedding;

  } catch (error) {
    return {
      error: 'Embedding generation failed',
      code: 'SERVICE_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * 複数のテキストを一括でベクトル化
 * 
 * @param texts - 変換するテキストの配列
 * @param options - オプション
 * @returns ベクトル配列またはエラー
 */
export async function embedTexts(
  texts: string[],
  options: EmbeddingOptions = {}
): Promise<Embedding[] | EmbeddingError> {
  try {
    // 入力検証
    if (!Array.isArray(texts) || texts.length === 0) {
      return {
        error: 'Invalid input: texts must be a non-empty array',
        code: 'INVALID_INPUT',
      };
    }

    // APIキーの確認
    const apiKey = process.env.OPENAI_API_KEY || ENV.forgeApiKey;
    if (!apiKey) {
      return {
        error: 'OpenAI API key is not configured',
        code: 'SERVICE_ERROR',
        details: 'OPENAI_API_KEY or BUILT_IN_FORGE_API_KEY is not set',
      };
    }

    // モデルの選択
    const model = options.model || 'text-embedding-3-small';
    
    // API URLの決定
    const apiUrl = ENV.forgeApiUrl || 'https://api.openai.com/v1';
    const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    const embeddingsUrl = `${baseUrl}/embeddings`;

    // リクエストボディの構築
    const requestBody: Record<string, unknown> = {
      model,
      input: texts,
    };

    // 次元数の指定
    if (options.dimensions && (model.includes('3-small') || model.includes('3-large'))) {
      requestBody.dimensions = options.dimensions;
    }

    // API呼び出し
    const response = await fetch(embeddingsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return {
        error: 'Embedding API request failed',
        code: 'API_ERROR',
        details: `${response.status} ${response.statusText}${errorText ? `: ${errorText}` : ''}`,
      };
    }

    const data = await response.json() as {
      data: Array<{ embedding: number[]; index: number }>;
      model: string;
      usage: {
        prompt_tokens: number;
        total_tokens: number;
      };
    };

    // レスポンスの検証
    if (!data.data || !Array.isArray(data.data)) {
      return {
        error: 'Invalid embedding response',
        code: 'API_ERROR',
        details: 'Response does not contain valid embedding data',
      };
    }

    // インデックス順にソートして返す
    const embeddings = data.data
      .sort((a, b) => a.index - b.index)
      .map(item => item.embedding);

    return embeddings;

  } catch (error) {
    return {
      error: 'Embedding generation failed',
      code: 'SERVICE_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

