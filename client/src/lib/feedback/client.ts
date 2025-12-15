/**
 * Feedback Client
 * フィードバックAPIを呼び出すクライアント関数
 */

export interface FeedbackRequest {
  message: string;
  category: string;
  page?: string;
}

export interface FeedbackResponse {
  success: boolean;
  feedbackId: string;
}

export interface FeedbackError {
  error: string;
  code: string;
  details?: string;
}

/**
 * フィードバックを送信
 * 
 * @param feedback - フィードバック情報
 * @returns レスポンス
 */
export async function submitFeedback(feedback: FeedbackRequest): Promise<FeedbackResponse> {
  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedback),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' })) as FeedbackError;
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json() as FeedbackResponse;
    return data;

  } catch (error) {
    console.error('[Feedback] Error:', error);
    throw error;
  }
}

