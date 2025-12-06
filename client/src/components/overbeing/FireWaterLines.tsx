import { motion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * 火水ラインコンポーネント
 * 
 * 青（陰・水）と金（陽・火）の2本の光が交互に走る
 * 粒子ベースの演出で火水のエネルギーを表現
 */
export function FireWaterLines() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* 火（陽）ライン - 金色 */}
      <motion.div
        initial={{ x: "-100%", opacity: 0 }}
        animate={
          isVisible
            ? {
                x: ["0%", "100%"],
                opacity: [0, 1, 1, 0],
              }
            : {}
        }
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          repeatDelay: 1,
        }}
        className="absolute top-1/3 left-0 w-full h-1"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(255, 215, 0, 0.8) 50%, transparent 100%)",
          boxShadow: "0 0 20px rgba(255, 215, 0, 0.6)",
          filter: "blur(2px)",
        }}
      />

      {/* 火ライン粒子群 */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`fire-particle-${i}`}
          initial={{ x: "-10%", y: "33.33%", opacity: 0 }}
          animate={
            isVisible
              ? {
                  x: ["0%", "100%"],
                  y: [`${33.33 + Math.sin(i * 0.5) * 2}%`, `${33.33 + Math.sin(i * 0.5 + Math.PI) * 2}%`],
                  opacity: [0, 1, 1, 0],
                  scale: [0.5, 1, 0.5],
                }
              : {}
          }
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.15,
            repeatDelay: 1,
          }}
          className="absolute w-2 h-2 rounded-full bg-yellow-400"
          style={{
            boxShadow: "0 0 10px rgba(255, 215, 0, 0.8)",
          }}
        />
      ))}

      {/* 水（陰）ライン - 青色 */}
      <motion.div
        initial={{ x: "100%", opacity: 0 }}
        animate={
          isVisible
            ? {
                x: ["0%", "-100%"],
                opacity: [0, 1, 1, 0],
              }
            : {}
        }
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1.5,
          repeatDelay: 1,
        }}
        className="absolute top-2/3 right-0 w-full h-1"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(0, 191, 255, 0.8) 50%, transparent 100%)",
          boxShadow: "0 0 20px rgba(0, 191, 255, 0.6)",
          filter: "blur(2px)",
        }}
      />

      {/* 水ライン粒子群 */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`water-particle-${i}`}
          initial={{ x: "110%", y: "66.67%", opacity: 0 }}
          animate={
            isVisible
              ? {
                  x: ["100%", "0%"],
                  y: [`${66.67 + Math.sin(i * 0.5) * 2}%`, `${66.67 + Math.sin(i * 0.5 + Math.PI) * 2}%`],
                  opacity: [0, 1, 1, 0],
                  scale: [0.5, 1, 0.5],
                }
              : {}
          }
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5 + i * 0.15,
            repeatDelay: 1,
          }}
          className="absolute w-2 h-2 rounded-full bg-cyan-400"
          style={{
            boxShadow: "0 0 10px rgba(0, 191, 255, 0.8)",
          }}
        />
      ))}

      {/* 中央の交差点エフェクト */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={
          isVisible
            ? {
                scale: [0, 1.5, 0],
                opacity: [0, 0.8, 0],
              }
            : {}
        }
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "easeOut",
          repeatDelay: 2,
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(255, 215, 0, 0.4) 0%, rgba(0, 191, 255, 0.4) 50%, transparent 100%)",
          filter: "blur(10px)",
        }}
      />
    </div>
  );
}
