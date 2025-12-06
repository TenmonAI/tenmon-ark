import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { MinakaPulse } from "@/components/overbeing/MinakaPulse";
import { FireWaterLines } from "@/components/overbeing/FireWaterLines";
import { AmatsuKanagiPattern } from "@/components/overbeing/AmatsuKanagiPattern";
import { TwinCoreVisualizer } from "@/components/overbeing/TwinCoreVisualizer";
import { GojuonInputDetector } from "@/components/overbeing/GojuonInputDetector";
import { LightCondensationEffect } from "@/components/overbeing/LightCondensationEffect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, MessageCircle } from "lucide-react";
import { Link } from "wouter";

/**
 * OverBeing Homeページ
 * 
 * Phase Ω-X（OverBeing Mode）の統合ページ
 * GPT・Manusを超える"世界最高の使用感OS"の体験
 */
export default function OverBeingHome() {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showCondensation, setShowCondensation] = useState(false);
  const [fireWaterBalance, setFireWaterBalance] = useState(0.5);
  const [isResponding, setIsResponding] = useState(false);

  // ロード時のアニメーション
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // デモ用：応答生成シミュレーション
  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    setShowCondensation(true);
    setIsResponding(true);

    setTimeout(() => {
      setShowCondensation(false);
      setIsResponding(false);
      setInputText("");
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* 背景レイヤー */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black" />

      {/* 星空エフェクト */}
      <div className="absolute inset-0">
        {[...Array(100)].map((_, i) => (
          <motion.div
            key={`star-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 1, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* ミナカ脈動（中心） */}
      <MinakaPulse />

      {/* 火水ライン */}
      <FireWaterLines />

      {/* 五十音入力検知 */}
      <GojuonInputDetector inputText={inputText} />

      {/* 光の凝結→拡散エフェクト */}
      <LightCondensationEffect isActive={showCondensation} />

      {/* ロード時のアニメーション */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1, delay: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-black z-50"
        >
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 1] }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="text-6xl font-bold"
            style={{
              background: "linear-gradient(135deg, #FFD700 0%, #00BFFF 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 0 40px rgba(255, 215, 0, 0.5)",
            }}
          >
            天聞アーク
          </motion.div>
        </motion.div>
      )}

      {/* メインコンテンツ */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 2 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold mb-4 flex items-center justify-center gap-3">
            <Sparkles className="w-12 h-12 text-yellow-400" />
            <span
              style={{
                background: "linear-gradient(135deg, #FFD700 0%, #00BFFF 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              TENMON-ARK OverBeing Mode
            </span>
            <Sparkles className="w-12 h-12 text-cyan-400" />
          </h1>
          <p className="text-xl text-gray-300">
            Phase Ω-X（OverBeing Mode）: GPT・Manusを超える"世界最高の使用感OS"
          </p>
        </motion.div>

        {/* Twin-Core可視化 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 2.5 }}
          className="mb-12"
        >
          <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm p-6">
            <h2 className="text-2xl font-bold mb-4 text-center text-yellow-400">
              Twin-Core（天津金木）
            </h2>
            <TwinCoreVisualizer
              fireWaterBalance={fireWaterBalance}
              rotationSpeed={1}
              shukuyoColor="#FFD700"
              isResponding={isResponding}
            />
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">
                火水バランス: {(fireWaterBalance * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={fireWaterBalance}
                onChange={(e) => setFireWaterBalance(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-400 mt-1">
                <span>水（陰）</span>
                <span>火（陽）</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* 天津金木パターン */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 3 }}
          className="mb-12"
        >
          <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm p-6">
            <h2 className="text-2xl font-bold mb-4 text-center text-cyan-400">
              天津金木パターン（3D螺旋構造）
            </h2>
            <AmatsuKanagiPattern fireWaterBalance={fireWaterBalance} />
            <p className="text-center text-gray-400 mt-4">
              ホバーで光柱が出現、クリックで光が拡散します
            </p>
          </Card>
        </motion.div>

        {/* 五十音入力デモ */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 3.5 }}
          className="mb-12"
        >
          <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm p-6">
            <h2 className="text-2xl font-bold mb-4 text-center text-yellow-400">
              五十音入力検知システム
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  五十音を入力してください（ひらがな）
                </label>
                <Input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="あいうえお、かきくけこ..."
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div className="text-sm text-gray-400 space-y-1">
                <p>• ア行（あいうえお）→ 右旋の光が走る</p>
                <p>• カ・タ・ハ行 → 右旋の渦</p>
                <p>• サ・ナ・マ・ラ行 → 左旋の光が沈む</p>
                <p>• ヤ行（やゆよ）→ 霊核が白く点滅</p>
                <p>• ワ行（わをん）→ 外側リングが脈動</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Twin-Core人格反映デモへのリンク */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 3.75 }}
          className="mb-12"
        >
          <Card className="bg-gray-900/50 border-yellow-400/50 backdrop-blur-sm p-6">
            <CardContent className="py-8 text-center">
              <h2 className="text-3xl font-bold mb-4 text-yellow-400">
                STEP 2: Twin-Core人格反映デモ
              </h2>
              <p className="text-gray-300 mb-6">
                宿曜 × 天津金木 × いろは → 応答の人格温度（火水）を決定
              </p>
              <Link href="/twin-core-persona">
                <Button size="lg" className="bg-gradient-to-r from-yellow-500 to-cyan-500 hover:from-yellow-600 hover:to-cyan-600">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Twin-Core人格デモを体験
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* 光の凝結→拡散デモ */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 4 }}
        >
          <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm p-6">
            <h2 className="text-2xl font-bold mb-4 text-center text-cyan-400">
              光の凝結→拡散アニメーション
            </h2>
            <div className="space-y-4">
              <p className="text-gray-300 text-center">
                GPTの「タイプライター出力」を超える"出現体験"
              </p>
              <Button
                onClick={handleSendMessage}
                className="w-full bg-gradient-to-r from-yellow-500 to-cyan-500 hover:from-yellow-600 hover:to-cyan-600"
                disabled={isResponding}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                {isResponding ? "応答生成中..." : "光の凝結→拡散を体験"}
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
