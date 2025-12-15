/**
 * Concierge Semantic Search API
 * セマンティック検索エンドポイント
 */

import express from 'express';
import { z } from 'zod';
import { sdk } from '../../_core/sdk';
import { createIndex, addDocument, search, type SemanticIndex, type Document } from '../../concierge/semantic';

const router = express.Router();

// Zodスキーマ: セマンティック検索リクエスト
const semanticSearchRequestSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  limit: z.number().int().positive().optional().default(10),
});

// Zodスキーマ: セマンティックインデックス追加リクエスト
const semanticIndexAddRequestSchema = z.object({
  document: z.object({
    id: z.string().min(1, 'Document ID is required'),
    text: z.string().min(1, 'Document text is required'),
    metadata: z.record(z.any()).optional(),
  }),
});

// Zodスキーマ: レスポンス形式の統一
const semanticSearchSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    results: z.array(z.any()),
  }),
});

const semanticSearchErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.string().optional(),
  }),
});

// インデックスをメモリに保持（本番環境ではデータベースやRedisなどに保存）
const globalIndex: SemanticIndex = createIndex();

/**
 * POST /api/concierge/semantic-search
 * セマンティック検索を実行
 * 
 * Request:
 * - query: 検索クエリ（必須）
 * - limit: 返す結果の最大数（オプション、デフォルト: 10）
 * 
 * Response:
 * - 200: { results: Array<{ document: Document, score: number }> }
 * - 400: { error: string }
 */
router.post('/semantic-search', express.json(), async (req, res) => {
  try {
    // 認証チェック
    const user = await sdk.authenticateRequest(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    // リクエストボディの検証（zod）
    let bodyData: z.infer<typeof semanticSearchRequestSchema>;
    try {
      bodyData = semanticSearchRequestSchema.parse(req.body);
    } catch (zodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid request body',
          details: zodError instanceof z.ZodError ? zodError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') : 'Validation failed',
        },
      });
    }

    // セマンティック検索を実行
    const searchResult = await search(globalIndex, bodyData.query, bodyData.limit);

    if ('error' in searchResult) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: searchResult.error || 'Search failed',
        },
      });
    }

    // 成功レスポンス（zod検証済み形式）
    const successResponse = {
      success: true as const,
      data: {
        results: searchResult,
      },
    };

    // zod検証（型安全性のため）
    semanticSearchSuccessResponseSchema.parse(successResponse);

    return res.status(200).json(successResponse);

  } catch (error) {
    console.error('[Semantic Search] Error:', error);
    
    // zod検証エラーの場合は詳細を返す
    if (error instanceof z.ZodError) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Response validation failed',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVICE_ERROR',
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    });
  }
});

/**
 * POST /api/concierge/semantic-index/add
 * ドキュメントをインデックスに追加
 * 
 * Request:
 * - document: { id: string, text: string, metadata?: object }
 * 
 * Response:
 * - 200: { success: boolean }
 * - 400: { error: string }
 */
router.post('/semantic-index/add', express.json(), async (req, res) => {
  try {
    // 認証チェック
    const user = await sdk.authenticateRequest(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    // リクエストボディの検証（zod）
    let bodyData: z.infer<typeof semanticIndexAddRequestSchema>;
    try {
      bodyData = semanticIndexAddRequestSchema.parse(req.body);
    } catch (zodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid request body',
          details: zodError instanceof z.ZodError ? zodError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') : 'Validation failed',
        },
      });
    }

    const doc: Document = {
      id: bodyData.document.id,
      text: bodyData.document.text,
      metadata: bodyData.document.metadata || {},
    };

    // ドキュメントを追加
    const result = await addDocument(globalIndex, doc);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ADD_ERROR',
          message: result.error || 'Failed to add document',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        documentId: doc.id,
      },
    });

  } catch (error) {
    console.error('[Semantic Index Add] Error:', error);
    
    // zod検証エラーの場合は詳細を返す
    if (error instanceof z.ZodError) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVICE_ERROR',
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    });
  }
});

export default router;

