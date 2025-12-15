/**
 * Self-Review Page
 * 自己診断レポートを表示
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, TrendingUp, MessageSquare, CheckCircle2 } from 'lucide-react';
import { fetchSelfReviewReport, type SelfReviewReport } from '@/lib/selfReview/client';

export default function SelfReviewPage() {
  const [report, setReport] = useState<SelfReviewReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      try {
        setIsLoading(true);
        const data = await fetchSelfReviewReport();
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'レポートの取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    loadReport();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'negative':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">自己診断レポート</h1>
        <p className="text-muted-foreground">
          最終更新: {new Date(report.generatedAt).toLocaleString('ja-JP')}
        </p>
      </div>

      {/* サマリー */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            サマリー
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{report.summary}</p>
        </CardContent>
      </Card>

      {/* フィードバック分析 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            フィードバック分析
          </CardTitle>
          <CardDescription>カテゴリ別のフィードバック分布</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {report.feedbackAnalysis.length > 0 ? (
            report.feedbackAnalysis.map((analysis, idx) => (
              <div key={idx} className="p-4 border rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{analysis.category}</span>
                    <Badge className={getSentimentColor(analysis.sentiment)}>
                      {analysis.sentiment}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {analysis.count}件 ({analysis.percentage.toFixed(1)}%)
                  </div>
                </div>
                {analysis.commonKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {analysis.commonKeywords.map((keyword, kIdx) => (
                      <Badge key={kIdx} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">フィードバックデータがありません</p>
          )}
        </CardContent>
      </Card>

      {/* 頻出問題点 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            頻出問題点
          </CardTitle>
          <CardDescription>検出された問題とその頻度</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {report.commonIssues.length > 0 ? (
            report.commonIssues.map((issue, idx) => (
              <div key={idx} className="p-4 border rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{issue.keyword}</span>
                    <Badge className={getSeverityColor(issue.severity)}>
                      {issue.severity}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    頻度: {issue.frequency}回
                  </div>
                </div>
                {issue.relatedFeedbacks.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {issue.relatedFeedbacks.map((feedback, fIdx) => (
                      <p key={fIdx} className="text-xs text-muted-foreground line-clamp-2">
                        {feedback}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">問題点は検出されませんでした</p>
          )}
        </CardContent>
      </Card>

      {/* チャットログ評価 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            チャットログ評価
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">総メッセージ数</p>
              <p className="text-2xl font-bold">{report.chatLogEvaluation.totalMessages}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">エラー率</p>
              <p className="text-2xl font-bold">
                {report.chatLogEvaluation.errorRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">曖昧回答数</p>
              <p className="text-2xl font-bold">
                {report.chatLogEvaluation.ambiguousResponses}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 改善提案 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            改善提案
          </CardTitle>
          <CardDescription>検出された改善点と推奨事項</CardDescription>
        </CardHeader>
        <CardContent>
          {report.improvementSuggestions.length > 0 ? (
            <ul className="space-y-2">
              {report.improvementSuggestions.map((suggestion, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span className="text-sm">{suggestion}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">改善提案はありません</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

