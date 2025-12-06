/**
 * Distributed Cloud UI
 * 分散靈核クラウド画面
 */

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Server, Cpu, HardDrive } from "lucide-react";

export default function DistributedCloud() {
  const { data: nodes } = trpc.distributedCloud.activeNodes.useQuery();


  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">☁️ Distributed Soul Cloud</h1>
        <p className="text-muted-foreground">分散靈核クラウド - 世界中の端末を統合</p>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">総ノード数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nodes?.length || 0}</div>
            <p className="text-xs text-muted-foreground">アクティブノード: {nodes?.filter((n: any) => n.status === 'active').length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">総処理能力</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nodes?.reduce((sum: number, n: any) => sum + (n.cpuContribution || 0), 0) || 0}%</div>
            <p className="text-xs text-muted-foreground">メモリ: {nodes?.reduce((sum: number, n: any) => sum + (n.memoryContribution || 0), 0) || 0}%</p>
          </CardContent>
        </Card>
      </div>

      {/* ノード一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>ノード一覧</CardTitle>
          <CardDescription>分散処理ノードの稼働状況</CardDescription>
        </CardHeader>
        <CardContent>
          {nodes && nodes.length > 0 ? (
            <div className="space-y-4">
              {nodes.map((node: any) => (
                <div key={node.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Server className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{node.id}</p>
                      <p className="text-sm text-muted-foreground">{node.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">CPU: {node.cpuUsage}%</p>
                      <Progress value={node.cpuUsage} className="w-24 h-1 mt-1" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">メモリ: {node.memoryUsage}%</p>
                      <Progress value={node.memoryUsage} className="w-24 h-1 mt-1" />
                    </div>
                    <Badge variant={node.status === "active" ? "default" : "secondary"}>
                      {node.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
}
