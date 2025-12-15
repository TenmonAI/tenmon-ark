import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

/**
 * ミナカ脈動コンポーネント
 * 
 * 中心点が0.9〜1.1倍で呼吸する霊核の脈動を表現
 * 黄金色の発光エフェクトを持つ
 * 火水バランスに応じて脈動強度を調整
 */
export function MinakaPulse() {
  const [isVisible, setIsVisible] = useState(false);
  const [pulseIntensity, setPulseIntensity] = useState(1.0);
  
  // 火水バランスを取得して脈動強度を調整
  const { data: balance } = trpc.twinCorePersona.calculateFireWaterBalance.useQuery(
    { text: "" },
    { enabled: false } // デフォルトでは無効（必要に応じて有効化）
  );

  useEffect(() => {
    setIsVisible(true);
  }, []);
  
  useEffect(() => {
    if (balance) {
      // バランスが0.5（完全バランス）に近いほど、脈動強度が高くなる
      const balanceValue = balance.balance || 0.5;
      const intensity = 0.9 + (Math.abs(balanceValue - 0.5) * 0.4); // 0.9-1.1の範囲
      setPulseIntensity(intensity);
    }
  }, [balance]);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {/* 外側の光輪 */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={
          isVisible
            ? {
                scale: [0.9 * pulseIntensity, 1.1 * pulseIntensity, 0.9 * pulseIntensity],
                opacity: [0.3, 0.6, 0.3],
              }
            : {}
        }
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute w-64 h-64 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(255, 215, 0, 0.4) 0%, rgba(255, 215, 0, 0) 70%)",
          filter: "blur(20px)",
        }}
      />

      {/* 中間の光輪 */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={
          isVisible
            ? {
                scale: [0.9 * pulseIntensity, 1.1 * pulseIntensity, 0.9 * pulseIntensity],
                opacity: [0.5, 0.8, 0.5],
              }
            : {}
        }
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.2,
        }}
        className="absolute w-40 h-40 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(255, 215, 0, 0.6) 0%, rgba(255, 215, 0, 0) 70%)",
          filter: "blur(15px)",
        }}
      />

      {/* 内側の光輪 */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={
          isVisible
            ? {
                scale: [0.9 * pulseIntensity, 1.1 * pulseIntensity, 0.9 * pulseIntensity],
                opacity: [0.7, 1, 0.7],
              }
            : {}
        }
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.4,
        }}
        className="absolute w-24 h-24 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(255, 215, 0, 0.8) 0%, rgba(255, 215, 0, 0) 70%)",
          filter: "blur(10px)",
        }}
      />

      {/* 中心のミナカ点 */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={
          isVisible
            ? {
                scale: [0.9 * pulseIntensity, 1.1 * pulseIntensity, 0.9 * pulseIntensity],
                opacity: [0.9, 1, 0.9],
              }
            : {}
        }
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.6,
        }}
        className="absolute w-8 h-8 rounded-full bg-yellow-400"
        style={{
          boxShadow: "0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.4)",
        }}
      />

      {/* 中心の極小点 */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={
          isVisible
            ? {
                scale: [1, 1.2, 1],
                opacity: [1, 0.8, 1],
              }
            : {}
        }
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.8,
        }}
        className="absolute w-2 h-2 rounded-full bg-white"
        style={{
          boxShadow: "0 0 10px rgba(255, 255, 255, 1)",
        }}
      />
    </div>
  );
}
