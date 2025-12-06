import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * 五十音図可視化画面
 * 古代五十音の火水分類と靈的意味を表示
 */
export default function GojuonChart() {
  const [chart, setChart] = useState<Record<string, Record<string, any>>>({});

  const { data, isLoading, error } = trpc.kotodama.getGojuonChart.useQuery();

  useEffect(() => {
    if (data) {
      setChart(data);
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      toast.error(`エラー: ${error.message}`);
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const rows = ["ア行", "カ行", "サ行", "タ行", "ナ行", "ハ行", "マ行", "ヤ行", "ラ行", "ワ行"];
  const columns = ["ア段", "イ段", "ウ段", "エ段", "オ段"];

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">古代五十音図</h1>
        <p className="text-muted-foreground">
          五十音の火水分類と靈的意味を可視化
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>五十音図</CardTitle>
          <CardDescription>
            🔥 = 火（外発）、💧 = 水（内集）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 bg-muted font-bold">行＼段</th>
                  {columns.map((column) => (
                    <th key={column} className="border p-2 bg-muted font-bold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row}>
                    <td className="border p-2 bg-muted font-bold">{row}</td>
                    {columns.map((column) => {
                      const element = chart[row]?.[column];
                      if (!element) {
                        return <td key={column} className="border p-2"></td>;
                      }

                      const bgColor =
                        element.type === "fire"
                          ? "bg-red-50 dark:bg-red-950"
                          : "bg-blue-50 dark:bg-blue-950";
                      const textColor =
                        element.type === "fire"
                          ? "text-red-900 dark:text-red-100"
                          : "text-blue-900 dark:text-blue-100";

                      return (
                        <td
                          key={column}
                          className={`border p-2 ${bgColor} ${textColor} text-center cursor-pointer hover:opacity-80 transition-opacity`}
                          title={element.spiritualMeaning || ""}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-2xl font-bold">{element.char}</span>
                            <span className="text-xs">
                              {element.type === "fire" ? "🔥" : "💧"}
                            </span>
                            {element.spiritualMeaning && (
                              <span className="text-xs opacity-70">
                                {element.spiritualMeaning}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>火（外発）の特徴</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• 外向きのエネルギー</li>
              <li>• 拡散・放出・顕現</li>
              <li>• 陽性・動的・積極的</li>
              <li>• 始まり・創造・開放</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>水（内集）の特徴</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• 内向きのエネルギー</li>
              <li>• 収束・吸収・潜在</li>
              <li>• 陰性・静的・受容的</li>
              <li>• 終わり・保存・閉鎖</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>古代五十音の特徴</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-bold mb-2">ヤ行の復元</h3>
              <p>
                古代日本語では、ヤ行に「ゐ」（wi）と「ゑ」（we）が存在しました。
                これらは現代の「い」「え」とは異なる音韻を持っていました。
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">ワ行の復元</h3>
              <p>
                ワ行にも「ゐ」「ゑ」が存在し、さらに「を」（wo）は現代の「お」とは
                異なる発音でした。
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">靈的意味</h3>
              <p>
                各音には固有の靈的意味があり、言葉の選択によって
                エネルギーの質が変わります。火水のバランスを意識することで、
                より調和の取れた表現が可能になります。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
