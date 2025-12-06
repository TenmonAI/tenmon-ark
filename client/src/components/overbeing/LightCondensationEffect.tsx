import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Canvas粒子エフェクト
 */
function ParticleCanvas({ isActive }: { isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    color: string;
  }>>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Canvasサイズをウィンドウに合わせる
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // 粒子を生成
    const createParticles = () => {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const particleCount = 100;

      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const speed = Math.random() * 2 + 1;
        particlesRef.current.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 60 + Math.random() * 60,
          size: Math.random() * 3 + 1,
          color: Math.random() > 0.5 ? "rgba(255, 215, 0, " : "rgba(0, 191, 255, ",
        });
      }
    };

    createParticles();

    // アニメーションループ
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life++;

        const lifeRatio = particle.life / particle.maxLife;
        const opacity = 1 - lifeRatio;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color + opacity + ")";
        ctx.fill();
      });

      // 配列をフィルタリングして寿命が尽きた粒子を削除
      particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);

      if (particlesRef.current.length > 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      particlesRef.current = [];
    };
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1000 }}
    />
  );
}

/**
 * 光の凝結→拡散アニメーションコンポーネント
 * 
 * GPTの「タイプライター出力」を超える"出現体験"
 * Canvas APIで粒子演出
 */
export function LightCondensationEffect({
  isActive,
  centerX = "50%",
  centerY = "50%",
}: {
  isActive: boolean;
  centerX?: string;
  centerY?: string;
}) {
  const [phase, setPhase] = useState<"condensing" | "expanding" | "idle">("idle");

  useEffect(() => {
    if (isActive) {
      setPhase("condensing");
      const timer1 = setTimeout(() => {
        setPhase("expanding");
      }, 800);
      const timer2 = setTimeout(() => {
        setPhase("idle");
      }, 2000);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isActive]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <AnimatePresence>
        {/* 凝結フェーズ：光が中心に集まる */}
        {phase === "condensing" && (
          <>
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={`condensing-${i}`}
                initial={{
                  x: `${50 + Math.cos((i * Math.PI * 2) / 12) * 40}%`,
                  y: `${50 + Math.sin((i * Math.PI * 2) / 12) * 40}%`,
                  scale: 1,
                  opacity: 0,
                }}
                animate={{
                  x: centerX,
                  y: centerY,
                  scale: 0,
                  opacity: [0, 1, 0],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.8,
                  ease: "easeIn",
                  delay: i * 0.03,
                }}
                className="absolute w-4 h-4 rounded-full"
                style={{
                  backgroundColor: i % 2 === 0 ? "#FFD700" : "#00BFFF",
                  boxShadow: `0 0 20px ${i % 2 === 0 ? "#FFD700" : "#00BFFF"}`,
                }}
              />
            ))}

            {/* 中心の凝集点 */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute w-8 h-8 rounded-full"
              style={{
                left: centerX,
                top: centerY,
                transform: "translate(-50%, -50%)",
                background: "radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(255, 215, 0, 0.8) 50%, transparent 100%)",
                boxShadow: "0 0 40px rgba(255, 215, 0, 1)",
              }}
            />
          </>
        )}

        {/* 拡散フェーズ：光が外側に広がる */}
        {phase === "expanding" && (
          <>
            <ParticleCanvas isActive={true} />

            {/* 拡散する光の波 */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={`expanding-wave-${i}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 3, opacity: [0, 0.6, 0] }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 1.2,
                  ease: "easeOut",
                  delay: i * 0.2,
                }}
                className="absolute w-32 h-32 rounded-full"
                style={{
                  left: centerX,
                  top: centerY,
                  transform: "translate(-50%, -50%)",
                  border: "2px solid rgba(255, 215, 0, 0.6)",
                  boxShadow: "0 0 30px rgba(255, 215, 0, 0.4)",
                }}
              />
            ))}

            {/* 拡散する光線 */}
            {[...Array(16)].map((_, i) => (
              <motion.div
                key={`expanding-ray-${i}`}
                initial={{
                  x: centerX,
                  y: centerY,
                  scale: 0,
                  opacity: 0,
                  rotate: (i * 360) / 16,
                }}
                animate={{
                  x: `${50 + Math.cos((i * Math.PI * 2) / 16) * 50}%`,
                  y: `${50 + Math.sin((i * Math.PI * 2) / 16) * 50}%`,
                  scale: 1,
                  opacity: [0, 0.8, 0],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 1.2,
                  ease: "easeOut",
                  delay: i * 0.03,
                }}
                className="absolute w-1 h-24"
                style={{
                  background: `linear-gradient(180deg, ${i % 2 === 0 ? "rgba(255, 215, 0, 0.8)" : "rgba(0, 191, 255, 0.8)"} 0%, transparent 100%)`,
                  transformOrigin: "center",
                  filter: "blur(2px)",
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
