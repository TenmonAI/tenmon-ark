import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type GrowthEntry = {
  id: number | string | null;
  thread_id: string | null;
  candidateType: string | null;
  created_at: string | null;
  payload: Record<string, unknown>;
  stabilityScore: number | null;
  driftRisk: boolean | null;
};

type TenmonDashboardResponse = {
  ok: boolean;
  truthSource: {
    centerKey: string | null;
    lawNames: string[];
    source_priority: string | null;
    subgraph_nodes: number | null;
  };
  growth: {
    latest5: GrowthEntry[];
    secondOrderReflectionCount: number;
  };
  audit: {
    routeReason: string | null;
    densityTarget: string | null;
    lawsUsedCount: number | null;
    reflectionScore: {
      center_fidelity: number | null;
      provenance_fidelity: number | null;
      beauty_score: number | null;
      continuity_score: number | null;
    };
  };
};

function scoreLabel(v: number | null): string {
  if (typeof v !== "number") return "-";
  return v.toFixed(2);
}

export default function TenmonDashboard() {
  const [data, setData] = useState<TenmonDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/tenmon/dashboard");
      const body = (await res.json()) as TenmonDashboardResponse & { error?: string };
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error || `dashboard fetch failed (${res.status})`);
      }
      setData(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const latestReflection = useMemo(() => {
    return data?.growth.latest5.find((x) => x.candidateType === "2nd_order_reflection") ?? null;
  }, [data]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">TENMON Evolution Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Truth Source / Growth / Audit の最新状態を可視化
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadDashboard()}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            再取得
          </Button>
        </div>

        {error ? (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                ダッシュボード取得エラー
              </CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <Tabs defaultValue="truth-source" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="truth-source">Truth Source</TabsTrigger>
            <TabsTrigger value="growth">Growth</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="reflection">Reflection</TabsTrigger>
            <TabsTrigger value="raw">Raw</TabsTrigger>
          </TabsList>

          <TabsContent value="truth-source">
            <Card>
              <CardHeader>
                <CardTitle>Truth Source</CardTitle>
                <CardDescription>center/law/source_priority の最新値</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>centerKey: <Badge variant="outline">{data?.truthSource.centerKey ?? "-"}</Badge></div>
                <div>subgraph_nodes: {data?.truthSource.subgraph_nodes ?? "-"}</div>
                <div>source_priority: {data?.truthSource.source_priority ?? "-"}</div>
                <div className="flex flex-wrap gap-2">
                  {(data?.truthSource.lawNames ?? []).length === 0 ? (
                    <span className="text-muted-foreground">lawNames: -</span>
                  ) : (
                    (data?.truthSource.lawNames ?? []).map((x) => (
                      <Badge key={x} variant="secondary">{x}</Badge>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="growth">
            <Card>
              <CardHeader>
                <CardTitle>Growth</CardTitle>
                <CardDescription>kanagi_growth_ledger 最新5件</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  secondOrderReflectionCount: {data?.growth.secondOrderReflectionCount ?? 0}
                </div>
                {(data?.growth.latest5 ?? []).map((row, idx) => (
                  <div key={`${row.id ?? "row"}-${idx}`} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{row.candidateType ?? "-"}</Badge>
                      <span className="text-muted-foreground">{row.created_at ?? "-"}</span>
                    </div>
                    <div className="mt-1">thread: {row.thread_id ?? "-"}</div>
                    <div className="mt-1">stability: {scoreLabel(row.stabilityScore)}</div>
                    <div className="mt-1">driftRisk: {row.driftRisk == null ? "-" : String(row.driftRisk)}</div>
                  </div>
                ))}
                {(data?.growth.latest5 ?? []).length === 0 ? (
                  <div className="text-sm text-muted-foreground">レコードなし</div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Audit</CardTitle>
                <CardDescription>routeReason / density / lawsUsed の監査表示</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>routeReason: {data?.audit.routeReason ?? "-"}</div>
                <div>densityTarget: {data?.audit.densityTarget ?? "-"}</div>
                <div>lawsUsedCount: {data?.audit.lawsUsedCount ?? "-"}</div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reflection">
            <Card>
              <CardHeader>
                <CardTitle>Reflection</CardTitle>
                <CardDescription>2nd_order_reflection スコアの最新値</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>center_fidelity: {scoreLabel(data?.audit.reflectionScore.center_fidelity ?? null)}</div>
                <div>provenance_fidelity: {scoreLabel(data?.audit.reflectionScore.provenance_fidelity ?? null)}</div>
                <div>beauty_score: {scoreLabel(data?.audit.reflectionScore.beauty_score ?? null)}</div>
                <div>continuity_score: {scoreLabel(data?.audit.reflectionScore.continuity_score ?? null)}</div>
                <div className="text-muted-foreground">
                  latest reflection entry: {latestReflection?.created_at ?? "-"}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="raw">
            <Card>
              <CardHeader>
                <CardTitle>Raw JSON</CardTitle>
                <CardDescription>API応答の生JSON（検証用）</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="max-h-[480px] overflow-auto rounded-md border p-3 text-xs">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
