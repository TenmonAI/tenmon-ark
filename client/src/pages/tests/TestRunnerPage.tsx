/**
 * Test Runner Page
 * テスト実行・結果表示UI
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Play, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { 
  fetchTestCases, 
  runTestSuite, 
  fetchTestSummary, 
  fetchManualTestTemplates,
  submitManualTestResult,
  fetchFailedTestsForEvolution,
  type TestCase,
  type TestResult,
  type TestSummary,
  type ManualTestTemplate,
} from '@/lib/tests/client';
import { useAuth } from '@/_core/hooks/useAuth';
import { toast } from 'sonner';

export default function TestRunnerPage() {
  const { user } = useAuth();
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [testResults, setTestResults] = useState<Map<string, TestResult>>(new Map());
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [manualTemplates, setManualTemplates] = useState<ManualTestTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'feature' | 'integration' | 'evolution' | 'ux' | 'all'>('all');
  
  const isFounder = user && (user.plan === 'founder' || user.plan === 'dev');

  useEffect(() => {
    if (isFounder) {
      loadTestData();
    }
  }, [isFounder]);

  const loadTestData = async () => {
    try {
      setIsLoading(true);
      const [cases, templates, currentSummary] = await Promise.all([
        fetchTestCases(),
        fetchManualTestTemplates(),
        fetchTestSummary(),
      ]);
      setTestCases(cases);
      setManualTemplates(templates);
      setSummary(currentSummary);
    } catch (err) {
      toast.error('テストデータの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunTests = async (category?: string) => {
    setIsRunning(true);
    try {
      const suiteId = `suite_${Date.now()}`;
      const response = await runTestSuite({
        suiteId,
        category: category as any,
      });
      
      // 結果をマップに変換
      const resultsMap = new Map<string, TestResult>();
      response.results.forEach(r => resultsMap.set(r.testCaseId, r));
      setTestResults(resultsMap);
      setSummary(response.summary);
      
      toast.success('テスト実行が完了しました');
    } catch (err) {
      toast.error('テスト実行に失敗しました');
    } finally {
      setIsRunning(false);
    }
  };

  const handleManualTestResult = async (testCaseId: string, status: 'PASS' | 'FAIL' | 'SKIP', notes?: string) => {
    try {
      await submitManualTestResult({ testCaseId, status, notes });
      toast.success('手動テスト結果を記録しました');
      await loadTestData();
    } catch (err) {
      toast.error('手動テスト結果の記録に失敗しました');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'FAIL':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'SKIP':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASS':
        return <Badge className="bg-green-100 text-green-800">PASS</Badge>;
      case 'FAIL':
        return <Badge className="bg-red-100 text-red-800">FAIL</Badge>;
      case 'SKIP':
        return <Badge className="bg-yellow-100 text-yellow-800">SKIP</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">PENDING</Badge>;
    }
  };

  if (!isFounder) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">この機能はFounder/Devプランのみ利用可能です</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const filteredTestCases = selectedCategory === 'all' 
    ? testCases 
    : testCases.filter(tc => tc.category === selectedCategory);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Test Runner</h1>
        <p className="text-muted-foreground">
          テスト実行・結果表示
        </p>
      </div>

      {/* テスト実行コントロール */}
      <Card>
        <CardHeader>
          <CardTitle>テスト実行</CardTitle>
          <CardDescription>
            自動実行可能なテストを実行します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={() => handleRunTests()}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  実行中...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  全テスト実行
                </>
              )}
            </Button>
            <Button
              onClick={() => handleRunTests('feature')}
              disabled={isRunning}
              variant="outline"
            >
              Feature Tests
            </Button>
            <Button
              onClick={() => handleRunTests('integration')}
              disabled={isRunning}
              variant="outline"
            >
              Integration Tests
            </Button>
            <Button
              onClick={() => handleRunTests('evolution')}
              disabled={isRunning}
              variant="outline"
            >
              Evolution Tests
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* テスト結果サマリー */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>テスト結果サマリー</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">総数</p>
                <p className="text-2xl font-bold">{summary.total}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">PASS</p>
                <p className="text-2xl font-bold text-green-600">{summary.pass}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">FAIL</p>
                <p className="text-2xl font-bold text-red-600">{summary.fail}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">合格率</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.passRate.toFixed(1)}%</p>
              </div>
            </div>
            <div className="mt-4">
              <Badge className={summary.releaseEligible === 'eligible' ? 'bg-green-100 text-green-800' : 
                               summary.releaseEligible === 'conditional' ? 'bg-yellow-100 text-yellow-800' : 
                               'bg-red-100 text-red-800'}>
                {summary.releaseEligible === 'eligible' ? 'リリース可能' : 
                 summary.releaseEligible === 'conditional' ? '条件付きリリース可能' : 
                 'リリース不可'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* テストケース一覧 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>テストケース一覧</CardTitle>
            <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="feature">Feature</TabsTrigger>
                <TabsTrigger value="integration">Integration</TabsTrigger>
                <TabsTrigger value="evolution">Evolution</TabsTrigger>
                <TabsTrigger value="ux">UX</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredTestCases.map(testCase => {
              const result = testResults.get(testCase.id);
              return (
                <div
                  key={testCase.id}
                  className="p-3 border rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {result && getStatusIcon(result.status)}
                        <span className="font-semibold">{testCase.name}</span>
                        <Badge className={testCase.priority === 'HIGH' ? 'bg-red-100 text-red-800' : 
                                         testCase.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 
                                         'bg-gray-100 text-gray-800'}>
                          {testCase.priority}
                        </Badge>
                        {testCase.autoRunnable ? (
                          <Badge className="bg-blue-100 text-blue-800">Auto</Badge>
                        ) : (
                          <Badge className="bg-purple-100 text-purple-800">Manual</Badge>
                        )}
                        {result && getStatusBadge(result.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{testCase.description}</p>
                      {result && result.error && (
                        <p className="text-xs text-red-500 mt-1">{result.error}</p>
                      )}
                    </div>
                    {!testCase.autoRunnable && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleManualTestResult(testCase.id, 'PASS')}
                        >
                          PASS
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleManualTestResult(testCase.id, 'FAIL')}
                        >
                          FAIL
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleManualTestResult(testCase.id, 'SKIP')}
                        >
                          SKIP
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

