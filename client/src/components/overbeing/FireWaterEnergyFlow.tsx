import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * 火水エネルギーの流れアニメーション
 * 
 * 火（金色）と水（青色）のエネルギーが流れるアニメーション。
 */
export function FireWaterEnergyFlow({ fireWaterBalance }: { fireWaterBalance: number }) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; type: 'fire' | 'water' }>>([]);
  
  useEffect(() => {
    // 粒子を生成
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      type: Math.random() < fireWaterBalance ? 'fire' : 'water' as 'fire' | 'water',
    }));
    setParticles(newParticles);
  }, [fireWaterBalance]);
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{
            x: `${particle.x}%`,
            y: `${particle.y}%`,
            opacity: 0,
          }}
          animate={{
            x: [`${particle.x}%`, `${(particle.x + 20) % 100}%`, `${particle.x}%`],
            y: [`${particle.y}%`, `${(particle.y + 20) % 100}%`, `${particle.y}%`],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
          className={`absolute w-2 h-2 rounded-full ${
            particle.type === 'fire'
              ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50'
              : 'bg-blue-400 shadow-lg shadow-blue-400/50'
          }`}
        />
      ))}
    </div>
  );
}

