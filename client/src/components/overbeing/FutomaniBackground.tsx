import { motion } from 'framer-motion';

/**
 * フトマニ十行の背面レイヤー（十字構造）
 * 
 * 十行（縦）× 十列（横）の十字構造を背景に表示する。
 */
export function FutomaniBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-20">
      {/* 縦線（10行） */}
      <div className="absolute inset-0 flex justify-between">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={`vertical-${i}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.2,
            }}
            className="w-px h-full bg-gradient-to-b from-transparent via-cyan-400 to-transparent"
            style={{
              left: `${(i + 1) * 10}%`,
            }}
          />
        ))}
      </div>
      
      {/* 横線（10列） */}
      <div className="absolute inset-0 flex flex-col justify-between">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={`horizontal-${i}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.2,
            }}
            className="w-full h-px bg-gradient-to-r from-transparent via-yellow-400 to-transparent"
            style={{
              top: `${(i + 1) * 10}%`,
            }}
          />
        ))}
      </div>
      
      {/* 中心点（ミナカ） */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-yellow-400"
        style={{
          boxShadow: '0 0 20px rgba(255, 215, 0, 0.8)',
        }}
      />
    </div>
  );
}

