/**
 * Self-Evolution Page
 * 改善タスク一覧を表示
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle, TrendingUp, MessageSquare, CheckCircle2, Code, Mic, Smartphone, Shield } from 'lucide-react';
import { fetchImprovementTasks, type ImprovementTask, type TaskCategory } from '@/lib/selfEvolution/client';
import { ALPHA_TRANSITION_DURATION } from '@/lib/mobileOS/alphaFlow';

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  'ui-ux': 'UI/UX',
  'reasoning': '推論精度',
  'voice': '音声',
  'device': 'デバイス',
  'security': 'セキュリティ',
  'other': 'その他',
};

const CATEGORY_ICONS: Record<TaskCategory, typeof Code> = {
  'ui-ux': Code,
  'reasoning': TrendingUp,
  'voice': Mic,
  'device': Smartphone,
  'security': Shield,
  'other': AlertCircle,
};

export default function SelfEvolutionPage() {
  const [tasks, setTasks] = useState<ImprovementTask[]>([]);
  const [classified, setClassified] = useState<Record<TaskCategory, ImprovementTask[]>>({
    'ui-ux': [],
    'reasoning': [],
    'voice': [],
    'device': [],
    'security': [],
    'other': [],
  });
  const [reportGeneratedAt, setReportGeneratedAt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | 'all'>('all');

  useEffect(() => {
    const loadTasks = async () => {
      try {
        setIsLoading(true);
        const data = await fetchImprovementTasks();
        setTasks(data.tasks);
        setClassified(data.classified);
        setReportGeneratedAt(data.reportGeneratedAt);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'タスクの取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    loadTasks();
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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

  const getSourceColor = (type: string) => {
    switch (type) {
      case 'feedback':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'chat-log':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'issue':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const displayTasks = selectedCategory === 'all' 
    ? tasks 
    : classified[selectedCategory] || [];

  return (
    <div 
      className="container mx-auto p-6 space-y-6"
      style={{
        animation: `fadeInUp ${ALPHA_TRANSITION_DURATION}ms ease-out`,
      }}
    >
      <div className="mb-6 relative">
        {/* 光学アニメーション（背景グラデーション） */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none rounded-lg"
          style={{
            background: `radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.3) 0%, transparent 70%)`,
            animation: `pulse ${ALPHA_TRANSITION_DURATION * 4}ms ease-in-out infinite`,
          }}
        />
        <div className="relative">
          <h1 className="text-3xl font-bold mb-2">Self-Evolution OS</h1>
          <p className="text-muted-foreground">
            改善タスク一覧 • 最終更新: {reportGeneratedAt ? new Date(reportGeneratedAt).toLocaleString('ja-JP') : 'N/A'}
          </p>
        </div>
      </div>

      {/* カテゴリタブ */}
      <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as TaskCategory | 'all')}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all">すべて</TabsTrigger>
          {Object.entries(CATEGORY_LABELS).map(([category, label]) => {
            const Icon = CATEGORY_ICONS[category as TaskCategory];
            const count = classified[category as TaskCategory]?.length || 0;
            return (
              <TabsTrigger key={category} value={category}>
                <Icon className="w-4 h-4 mr-1" />
                {label} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* タスク一覧 */}
        <div className="mt-6 space-y-4">
          {displayTasks.length > 0 ? (
            displayTasks.map((task, index) => {
              const Icon = CATEGORY_ICONS[task.category];
              return (
                <Card 
                  key={task.id} 
                  className="hover:shadow-lg transition-all relative overflow-hidden"
                  style={{
                    animation: `fadeInUp ${ALPHA_TRANSITION_DURATION}ms ease-out both`,
                    animationDelay: `${index * 50}ms`,
                    transition: `all ${ALPHA_TRANSITION_DURATION}ms ease-out`,
                  }}
                >
                  {/* 光学アニメーション（カード内） */}
                  <div
                    className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)`,
                      filter: 'blur(20px)',
                      transform: 'translate(50%, -50%)',
                    }}
                  />
                  <CardHeader className="relative">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <Icon className="w-5 h-5 text-primary" />
                        <CardTitle className="text-lg">{task.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                        </Badge>
                        <Badge variant="outline" className={getSourceColor(task.source.type)}>
                          {task.source.type === 'feedback' ? 'フィードバック' : 
                           task.source.type === 'chat-log' ? 'チャットログ' : '問題'}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription>
                      {CATEGORY_LABELS[task.category]} • {new Date(task.createdAt).toLocaleString('ja-JP')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground mb-3">{task.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>参照: {task.source.reference}</span>
                      {task.estimatedEffort && (
                        <>
                          <span>•</span>
                          <span>工数: {task.estimatedEffort === 'high' ? '高' : task.estimatedEffort === 'medium' ? '中' : '低'}</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                改善タスクはありません
              </CardContent>
            </Card>
          )}
        </div>
      </Tabs>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">総タスク数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{tasks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">高優先度</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {tasks.filter(t => t.priority === 'high').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">中優先度</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">
              {tasks.filter(t => t.priority === 'medium').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">低優先度</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {tasks.filter(t => t.priority === 'low').length}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

