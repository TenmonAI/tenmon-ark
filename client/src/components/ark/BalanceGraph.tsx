import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface BalanceGraphProps {
  analysisData: any;
}

export default function BalanceGraph({ analysisData }: BalanceGraphProps) {
  const { t } = useTranslation();

  if (!analysisData) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">{t('ark.noAnalysisData')}</p>
      </Card>
    );
  }

  // 火水バランスの計算
  const hiMizuBalance = analysisData.hiMizuBalance || { hi: 50, mizu: 50 };
  const aionDistribution = analysisData.aionDistribution || {};
  const energyAnalysis = analysisData.energyAnalysis || {};

  return (
    <Card className="p-6">
      <div className="space-y-8">
        {/* 火水バランス */}
        <div>
          <h3 className="text-lg font-semibold mb-4">{t('ark.hiMizuBalance')}</h3>
          <div className="space-y-4">
            {/* 火水バー */}
            <div className="relative h-12 bg-muted rounded-lg overflow-hidden">
              <div
                className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center text-white font-medium"
                style={{ width: `${hiMizuBalance.hi}%` }}
              >
                {hiMizuBalance.hi > 20 && `🔥 ${hiMizuBalance.hi}%`}
              </div>
              <div
                className="absolute top-0 right-0 bottom-0 bg-gradient-to-l from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium"
                style={{ width: `${hiMizuBalance.mizu}%` }}
              >
                {hiMizuBalance.mizu > 20 && `💧 ${hiMizuBalance.mizu}%`}
              </div>
            </div>

            {/* 火水説明 */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="font-medium text-red-500 mb-1">🔥 火（外発）</p>
                <p className="text-muted-foreground">
                  断定的・外向的・アクティブ
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="font-medium text-blue-500 mb-1">💧 水（内集）</p>
                <p className="text-muted-foreground">
                  柔らか・内向的・リフレクティブ
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 五十音分布 */}
        {Object.keys(aionDistribution).length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('ark.aionDistribution')}</h3>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(aionDistribution).map(([aion, count]: [string, any]) => (
                <div
                  key={aion}
                  className="p-3 bg-muted rounded-lg text-center hover:bg-muted/80 transition-colors"
                >
                  <p className="text-2xl font-bold">{aion}</p>
                  <p className="text-sm text-muted-foreground">{count}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* エネルギー解析 */}
        {Object.keys(energyAnalysis).length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('ark.energyAnalysis')}</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(energyAnalysis).map(([key, value]: [string, any]) => (
                <div key={key} className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">
                    {key.replace(/_/g, ' ').toUpperCase()}
                  </p>
                  <p className="text-2xl font-bold">
                    {typeof value === 'number' ? value.toFixed(2) : value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 総合評価 */}
        <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">{t('ark.overallAssessment')}</h3>
          <p className="text-muted-foreground">
            {hiMizuBalance.hi > 60
              ? t('ark.assessmentHighFire')
              : hiMizuBalance.mizu > 60
              ? t('ark.assessmentHighWater')
              : t('ark.assessmentBalanced')}
          </p>
        </div>
      </div>
    </Card>
  );
}
