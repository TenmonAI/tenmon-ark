/**
 * Self-Review Core
 * 自己省察エンジン - フィードバックとチャットログを分析して改善点を抽出
 */

import type { SemanticIndex, Document } from '../concierge/semantic';
import { search } from '../concierge/semantic';

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
 * フィードバック内容をカテゴリ別に分析
 * 
 * @param index - Semantic Index
 * @returns カテゴリ別分析結果
 */
export async function analyzeFeedback(index: SemanticIndex): Promise<FeedbackAnalysis[]> {
  const categoryCounts: Record<string, { count: number; messages: string[] }> = {};
  let totalFeedbacks = 0;

  // Semantic Indexから "type: feedback" のドキュメントを取得
  for (const [id, document] of index.documents.entries()) {
    const metadata = document.metadata || {};
    if (metadata.type === 'feedback') {
      totalFeedbacks++;
      const category = (metadata.category as string) || 'other';
      
      if (!categoryCounts[category]) {
        categoryCounts[category] = { count: 0, messages: [] };
      }
      categoryCounts[category].count++;
      categoryCounts[category].messages.push(document.text);
    }
  }

  // カテゴリ別分析
  const analysis: FeedbackAnalysis[] = [];

  for (const [category, data] of Object.entries(categoryCounts)) {
    // 頻出キーワードを抽出（簡易版）
    const keywords = extractKeywords(data.messages);
    
    // センチメント分析（簡易版）
    const sentiment = analyzeSentiment(data.messages);

    analysis.push({
      category,
      count: data.count,
      percentage: totalFeedbacks > 0 ? (data.count / totalFeedbacks) * 100 : 0,
      commonKeywords: keywords.slice(0, 5), // 上位5つ
      sentiment,
    });
  }

  // カウント順にソート
  analysis.sort((a, b) => b.count - a.count);

  return analysis;
}

/**
 * 頻出ワードと評価ポイント抽出
 * 
 * @param index - Semantic Index
 * @returns 頻出問題点
 */
export async function detectCommonIssues(index: SemanticIndex): Promise<CommonIssue[]> {
  const keywordFrequency: Record<string, { count: number; feedbacks: string[] }> = {};
  
  // 問題を示すキーワード
  const issueKeywords = [
    '遅い', '遅延', 'エラー', 'バグ', '不具合', '問題', '改善', '要望',
    'slow', 'error', 'bug', 'issue', 'problem', 'improve', 'request',
    'わかりにくい', '使いにくい', '複雑', 'confusing', 'complex',
  ];

  // Semantic Indexからフィードバックを取得
  for (const [id, document] of index.documents.entries()) {
    const metadata = document.metadata || {};
    if (metadata.type === 'feedback') {
      const text = document.text.toLowerCase();
      
      for (const keyword of issueKeywords) {
        if (text.includes(keyword.toLowerCase())) {
          if (!keywordFrequency[keyword]) {
            keywordFrequency[keyword] = { count: 0, feedbacks: [] };
          }
          keywordFrequency[keyword].count++;
          keywordFrequency[keyword].feedbacks.push(document.text);
        }
      }
    }
  }

  // 頻出問題点を生成
  const issues: CommonIssue[] = [];

  for (const [keyword, data] of Object.entries(keywordFrequency)) {
    const severity = data.count >= 5 ? 'high' : data.count >= 2 ? 'medium' : 'low';
    
    issues.push({
      keyword,
      frequency: data.count,
      relatedFeedbacks: data.feedbacks.slice(0, 3), // 上位3つ
      severity,
    });
  }

  // 頻度順にソート
  issues.sort((a, b) => b.frequency - a.frequency);

  return issues.slice(0, 10); // 上位10個
}

/**
 * チャットログから曖昧回答・遅延を検出
 * 
 * @param totalMessages - 総メッセージ数
 * @param errorCount - エラー数
 * @returns チャットログ評価
 */
export function evaluateChatLogs(
  totalMessages: number,
  errorCount: number = 0
): ChatLogEvaluation {
  const errorRate = totalMessages > 0 ? (errorCount / totalMessages) * 100 : 0;
  
  // 簡易的な曖昧回答検出（実際の実装では、メッセージ内容を分析）
  const ambiguousResponses = Math.floor(totalMessages * 0.1); // 仮の値（10%）

  return {
    totalMessages,
    ambiguousResponses,
    errorRate,
  };
}

/**
 * 自己省察レポートを生成
 * 
 * @param index - Semantic Index
 * @param totalMessages - 総メッセージ数
 * @param errorCount - エラー数
 * @returns 自己省察レポート
 */
export async function summarizeFindings(
  index: SemanticIndex,
  totalMessages: number = 0,
  errorCount: number = 0
): Promise<SelfReviewReport> {
  const feedbackAnalysis = await analyzeFeedback(index);
  const commonIssues = await detectCommonIssues(index);
  const chatLogEvaluation = evaluateChatLogs(totalMessages, errorCount);

  // 改善提案を生成
  const improvementSuggestions: string[] = [];

  // カテゴリ別の改善提案
  for (const analysis of feedbackAnalysis) {
    if (analysis.sentiment === 'negative' && analysis.count >= 2) {
      improvementSuggestions.push(
        `${analysis.category}カテゴリのフィードバックが${analysis.count}件あります。改善を検討してください。`
      );
    }
  }

  // 頻出問題点の改善提案
  for (const issue of commonIssues) {
    if (issue.severity === 'high') {
      improvementSuggestions.push(
        `「${issue.keyword}」に関する問題が${issue.frequency}回報告されています。優先的に対応を検討してください。`
      );
    }
  }

  // エラー率が高い場合の改善提案
  if (chatLogEvaluation.errorRate > 5) {
    improvementSuggestions.push(
      `エラー率が${chatLogEvaluation.errorRate.toFixed(1)}%と高めです。安定性の向上を検討してください。`
    );
  }

  // サマリーを生成
  const summary = generateSummary(feedbackAnalysis, commonIssues, chatLogEvaluation);

  return {
    generatedAt: new Date().toISOString(),
    feedbackAnalysis,
    commonIssues,
    chatLogEvaluation,
    improvementSuggestions,
    summary,
  };
}

/**
 * キーワードを抽出（簡易版）
 */
function extractKeywords(messages: string[]): string[] {
  const wordFrequency: Record<string, number> = {};
  const stopWords = new Set(['の', 'に', 'は', 'を', 'が', 'で', 'と', 'も', 'など', 'the', 'a', 'an', 'is', 'are', 'was', 'were']);

  for (const message of messages) {
    const words = message.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 2 && !stopWords.has(word)) {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      }
    }
  }

  return Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * センチメント分析（簡易版）
 */
function analyzeSentiment(messages: string[]): 'positive' | 'neutral' | 'negative' {
  const positiveWords = ['良い', 'いい', '素晴らしい', '便利', 'good', 'great', 'excellent', 'useful'];
  const negativeWords = ['悪い', 'ダメ', '問題', '不具合', 'bad', 'problem', 'error', 'issue'];

  let positiveCount = 0;
  let negativeCount = 0;

  for (const message of messages) {
    const lowerMessage = message.toLowerCase();
    for (const word of positiveWords) {
      if (lowerMessage.includes(word.toLowerCase())) {
        positiveCount++;
      }
    }
    for (const word of negativeWords) {
      if (lowerMessage.includes(word.toLowerCase())) {
        negativeCount++;
      }
    }
  }

  if (positiveCount > negativeCount) {
    return 'positive';
  } else if (negativeCount > positiveCount) {
    return 'negative';
  } else {
    return 'neutral';
  }
}

/**
 * サマリーを生成
 */
function generateSummary(
  feedbackAnalysis: FeedbackAnalysis[],
  commonIssues: CommonIssue[],
  chatLogEvaluation: ChatLogEvaluation
): string {
  const totalFeedbacks = feedbackAnalysis.reduce((sum, a) => sum + a.count, 0);
  const highSeverityIssues = commonIssues.filter(i => i.severity === 'high').length;

  let summary = `自己診断レポート: `;
  
  if (totalFeedbacks > 0) {
    summary += `フィードバック${totalFeedbacks}件を分析。`;
  }
  
  if (highSeverityIssues > 0) {
    summary += `高優先度の問題が${highSeverityIssues}件検出されました。`;
  }
  
  if (chatLogEvaluation.errorRate > 0) {
    summary += `エラー率は${chatLogEvaluation.errorRate.toFixed(1)}%です。`;
  }

  return summary;
}

