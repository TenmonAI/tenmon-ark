/**
 * Self-Review Client
 * 自己省察レポートを取得するクライアント関数
 */

export interface FeedbackAnalysis {
  category: string;
  count: number;
  percentage: number;
  commonKeywords: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface CommonIssue {
  keyword: string;
  frequency: number;
  relatedFeedbacks: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface ChatLogEvaluation {
  totalMessages: number;
  averageResponseTime?: number;
  ambiguousResponses: number;
  errorRate: number;
  userSatisfactionScore?: number;
}

export interface SelfReviewReport {
  generatedAt: string;
  feedbackAnalysis: FeedbackAnalysis[];
  commonIssues: CommonIssue[];
  chatLogEvaluation: ChatLogEvaluation;
  improvementSuggestions: string[];
  summary: string;
}

/**
 * 自己省察レポートを取得
 * 
 * @returns 自己省察レポート
 */
export async function fetchSelfReviewReport(): Promise<SelfReviewReport> {
  try {
    const response = await fetch('/api/self-review/report');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const report = await response.json() as SelfReviewReport;
    return report;

  } catch (error) {
    console.error('[Self-Review] Error:', error);
    throw error;
  }
}

