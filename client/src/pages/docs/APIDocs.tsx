/**
 * API Docs Viewer
 * API仕様を表示するUI
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, FileText } from 'lucide-react';
import { fetchApiDocs } from '@/lib/apiDocs/client';
import type { ApiDocs, ApiRoute } from '@/lib/apiDocs/types';

export default function APIDocs() {
  const [docs, setDocs] = useState<ApiDocs | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<ApiRoute | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDocs = async () => {
      try {
        setIsLoading(true);
        const apiDocs = await fetchApiDocs();
        setDocs(apiDocs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load API documentation');
      } finally {
        setIsLoading(false);
      }
    };

    loadDocs();
  }, []);

  // カテゴリ一覧を取得
  const categories = docs
    ? Array.from(new Set(docs.routes.map(r => r.category || 'other')))
    : [];

  // フィルタリングされたルート
  const filteredRoutes = docs?.routes.filter(route => {
    const matchesSearch = !searchQuery || 
      route.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      route.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || route.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  }) || [];

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

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">API Documentation</h1>
        {docs && (
          <p className="text-muted-foreground">
            Version {docs.version} • Generated at {new Date(docs.generatedAt).toLocaleString()}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側: API一覧 */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Routes</CardTitle>
              <CardDescription>検索・フィルタ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 検索バー */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search APIs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              {/* カテゴリフィルタ */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="all">All</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* ルート一覧 */}
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {filteredRoutes.map((route, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedRoute(route)}
                      className={`p-3 border rounded-md cursor-pointer hover:bg-accent ${
                        selectedRoute?.path === route.path ? 'bg-accent border-primary' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{route.method}</Badge>
                        {route.category && (
                          <Badge variant="secondary" className="text-xs">
                            {route.category}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-mono text-xs truncate">{route.path}</p>
                      {route.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {route.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* 右側: 詳細表示 */}
        <div className="lg:col-span-2">
          {selectedRoute ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{selectedRoute.method}</Badge>
                  <CardTitle className="font-mono text-lg">{selectedRoute.path}</CardTitle>
                </div>
                {selectedRoute.description && (
                  <CardDescription>{selectedRoute.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 認証情報 */}
                {selectedRoute.auth && (
                  <div>
                    <h3 className="font-semibold mb-2">認証</h3>
                    <p className="text-sm">
                      {selectedRoute.auth.required ? (
                        <Badge variant="destructive">必須</Badge>
                      ) : (
                        <Badge variant="secondary">不要</Badge>
                      )}
                      {selectedRoute.auth.type && (
                        <span className="ml-2 text-muted-foreground">
                          ({selectedRoute.auth.type})
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* リクエスト */}
                {selectedRoute.input && (
                  <div>
                    <h3 className="font-semibold mb-2">Request</h3>
                    <div className="bg-muted p-4 rounded-md">
                      <p className="text-sm mb-2">
                        <strong>Content-Type:</strong> {selectedRoute.input.type === 'json' ? 'application/json' : selectedRoute.input.type === 'multipart' ? 'multipart/form-data' : selectedRoute.input.type}
                      </p>
                      {selectedRoute.input.schema && (
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(selectedRoute.input.schema, null, 2)}
                        </pre>
                      )}
                      {selectedRoute.input.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {selectedRoute.input.description}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* レスポンス */}
                {selectedRoute.output && (
                  <div>
                    <h3 className="font-semibold mb-2">Response</h3>
                    <div className="bg-muted p-4 rounded-md">
                      <p className="text-sm mb-2">
                        <strong>Content-Type:</strong> {selectedRoute.output.type === 'json' ? 'application/json' : selectedRoute.output.type}
                      </p>
                      {selectedRoute.output.schema && (
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(selectedRoute.output.schema, null, 2)}
                        </pre>
                      )}
                      {selectedRoute.output.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {selectedRoute.output.description}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Select an API</CardTitle>
                <CardDescription>
                  左側のリストからAPIを選択して詳細を表示
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center h-[600px]">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>APIを選択してください</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

