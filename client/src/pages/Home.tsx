import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { MinakaPulse } from '@/components/overbeing/MinakaPulse';
import { FireWaterLines } from '@/components/overbeing/FireWaterLines';
import { AmatsuKanagiPattern } from '@/components/overbeing/AmatsuKanagiPattern';
import { GojuonInputDetector } from '@/components/overbeing/GojuonInputDetector';
import { TwinCoreVisualizer } from '@/components/overbeing/TwinCoreVisualizer';
import { LightCondensationEffect } from '@/components/overbeing/LightCondensationEffect';
import { FutomaniBackground } from '@/components/overbeing/FutomaniBackground';
import { FireWaterEnergyFlow } from '@/components/overbeing/FireWaterEnergyFlow';
import { AmatsuKanagiPatternTooltip } from '@/components/overbeing/AmatsuKanagiPatternTooltip';
import { motion } from 'framer-motion';
import HinomizuCore from '@/components/HinomizuCore';
import { startDrone } from '@/lib/drone';

/**
 * TENMON-ARK Home Page
 * 五十音火水霊核マップ（言霊秘書100%準拠）
 */
export default function Home() {
  const [hoveredPattern, setHoveredPattern] = useState<number | null>(null);
  const [fireWaterBalance, setFireWaterBalance] = useState(0.5);
  const [showCondensation, setShowCondensation] = useState(false);
  
  // 天津金木50パターンを取得
  const { data: patterns, isLoading } = trpc.amatsuKanagi.getAllPatterns.useQuery();
  
  // 火水バランスを計算
  useEffect(() => {
    if (patterns && patterns.length > 0) {
      const fireCount = patterns.filter(p => p.category.includes('火')).length;
      const waterCount = patterns.filter(p => p.category.includes('水')).length;
      const total = fireCount + waterCount;
      setFireWaterBalance(total > 0 ? fireCount / total : 0.5);
    }
  }, [patterns]);

  // 光の凝結→拡散エフェクトをトリガー
  useEffect(() => {
    if (patterns && patterns.length > 0) {
      setShowCondensation(true);
      setTimeout(() => setShowCondensation(false), 2000);
    }
  }, [patterns]);

  // 低周波ドローン起動（ユーザー操作必須）
  useEffect(() => {
    const handler = () => {
      startDrone();
    };
    window.addEventListener('click', handler, { once: true });
    return () => {
      window.removeEventListener('click', handler);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* 背景レイヤー */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black" />
      
      {/* 火水中枢コア（Three.js） */}
      <HinomizuCore />
      
      {/* フトマニ十行の背面レイヤー（十字構造） */}
      <FutomaniBackground />
      
      {/* 火水エネルギーの流れアニメーション */}
      <FireWaterEnergyFlow fireWaterBalance={fireWaterBalance} />
      
      {/* ミナカ脈動（中心） */}
      <MinakaPulse />
      
      {/* 火水ライン */}
      <FireWaterLines />
      
      {/* 光の凝結→拡散エフェクト */}
      <LightCondensationEffect isActive={showCondensation} />
      
      {/* メインコンテンツ */}
      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-6xl font-bold bg-gradient-to-r from-yellow-400 via-cyan-400 to-yellow-400 bg-clip-text text-transparent mb-4"
          >
          TENMON-ARK
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl text-cyan-400"
          >
            五十音火水霊核マップ
          </motion.p>
        </div>
        
        {/* 五十音図 */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-cyan-400">読み込み中...</div>
          </div>
        ) : (
          <div className="grid grid-cols-10 gap-2 max-w-6xl mx-auto mb-12">
            {patterns?.map((pattern) => (
              <motion.div
                key={pattern.number}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: pattern.number * 0.01 }}
                onHoverStart={() => setHoveredPattern(pattern.number)}
                onHoverEnd={() => setHoveredPattern(null)}
                className={`
                  relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-300
                  ${pattern.category.includes('火') ? 'border-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20' : ''}
                  ${pattern.category.includes('水') ? 'border-blue-500 bg-blue-500/10 hover:bg-blue-500/20' : ''}
                  ${pattern.special ? 'border-purple-500 bg-purple-500/20 ring-2 ring-purple-500' : ''}
                  hover:scale-110 hover:shadow-lg
                `}
              >
                {/* パターン番号 */}
                <div className="text-xs text-gray-400 mb-1">
                  #{pattern.number}
                </div>
                
                {/* 音 */}
                <div className="text-2xl font-bold text-center mb-2">
                  {pattern.sound}
                </div>
                
                {/* 左右旋・内集外発 */}
                {pattern.movements && (
                  <div className="text-xs text-center space-y-1">
                    {pattern.movements.map((movement: string, idx: number) => (
                      <div key={idx} className="text-gray-300">
                        {movement.includes('左旋') && '←'}
                        {movement.includes('右旋') && '→'}
                        {movement.includes('内集') && '↓'}
                        {movement.includes('外発') && '↑'}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* ホバー時の詳細表示 */}
                {hoveredPattern === pattern.number && (
                  <AmatsuKanagiPatternTooltip pattern={pattern} />
                )}
              </motion.div>
            ))}
          </div>
        )}
        
        {/* Twin-Core可視化 */}
        <div className="max-w-4xl mx-auto mb-12">
          <TwinCoreVisualizer fireWaterBalance={fireWaterBalance} />
        </div>
        
        {/* 天津金木パターン3D表示 */}
        <div className="max-w-4xl mx-auto">
          <AmatsuKanagiPattern fireWaterBalance={fireWaterBalance} />
        </div>
      </div>
    </div>
  );
}
