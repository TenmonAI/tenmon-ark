/**
 * Feedback API
 * フィードバックを受け取り、Semantic Indexに登録
 */

import express from 'express';
import { z } from 'zod';
import { sdk } from '../../_core/sdk';
import { addDocument, type SemanticIndex, type Document } from '../../concierge/semantic';
import { createIndex } from '../../concierge/semantic';

const router = express.Router();

// フィードバックをメモリに保持（簡易JSON DB）
interface Feedback {
  id: string;
  userId: string;
  message: string;
  category: string;
  page?: string;
  timestamp: string;
}

const feedbacks: Feedback[] = [];
const globalIndex: SemanticIndex = createIndex();

// Self-Review APIからアクセス可能にするためエクスポート
export { globalIndex as feedbackIndex, feedbacks };

// Zodスキーマ: フィードバックリクエスト
const feedbackRequestSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  category: z.string().min(1, 'Category is required'),
  page: z.string().optional(),
});

// Zodスキーマ: レスポンス形式の統一
const feedbackSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    feedbackId: z.string(),
  }),
});

const feedbackErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.string().optional(),
  }),
});

/**
 * POST /api/feedback
 * フィードバックを受け取り、Semantic Indexに登録
 * 
 * Request:
 * - message: フィードバックメッセージ（必須）
 * - category: カテゴリ（必須）
 * - page: ページ名（オプション）
 * 
 * Response:
 * - 200: { success: boolean, feedbackId: string }
 * - 400: { error: string, code: string }
 */
router.post('/feedback', express.json(), async (req, res) => {
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
    let bodyData: z.infer<typeof feedbackRequestSchema>;
    try {
      bodyData = feedbackRequestSchema.parse(req.body);
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

    const timestamp = new Date().toISOString();
    const feedbackId = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // フィードバックを保存
    const feedback: Feedback = {
      id: feedbackId,
      userId: user.id,
      message: bodyData.message.trim(),
      category: bodyData.category.trim(),
      page: bodyData.page ? bodyData.page.trim() : undefined,
      timestamp,
    };

    feedbacks.push(feedback);

    // Semantic Indexに登録
    const document: Document = {
      id: feedbackId,
      text: bodyData.message.trim(),
      metadata: {
        category: bodyData.category.trim(),
        page: bodyData.page ? bodyData.page.trim() : undefined,
        userId: user.id,
        timestamp,
        type: 'feedback',
      },
    };

    const result = await addDocument(globalIndex, document);

    if (!result.success) {
      console.error('[Feedback] Failed to add to semantic index:', result);
      // インデックス登録失敗は警告のみ（フィードバックは保存済み）
    }

    // 成功レスポンス（zod検証済み形式）
    const successResponse = {
      success: true as const,
      data: {
        feedbackId,
      },
    };

    // zod検証（型安全性のため）
    feedbackSuccessResponseSchema.parse(successResponse);

    return res.status(200).json(successResponse);

  } catch (error) {
    console.error('[Feedback] Error:', error);
    
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

export default router;

