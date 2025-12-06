import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import * as THREE from "three";

/**
 * 天津金木パターンの3D螺旋構造
 */
function SpiralStructure({ fireWaterBalance = 0.5 }: { fireWaterBalance?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  // 螺旋構造のジオメトリ生成
  const spiralGeometry = () => {
    const points: THREE.Vector3[] = [];
    const particleCount = 1000;

    for (let i = 0; i < particleCount; i++) {
      const t = (i / particleCount) * Math.PI * 8; // 8回転
      const radius = 2 + t * 0.1;
      const x = radius * Math.cos(t);
      const y = t * 0.3 - 4;
      const z = radius * Math.sin(t);
      points.push(new THREE.Vector3(x, y, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  };

  // 火水バランスに応じた色
  const fireColor = new THREE.Color(1, 0.84, 0); // 金色
  const waterColor = new THREE.Color(0, 0.75, 1); // 青色
  const balancedColor = new THREE.Color().lerpColors(waterColor, fireColor, fireWaterBalance);

  return (
    <group>
      {/* 螺旋ライン */}
      <line>
        <bufferGeometry attach="geometry" {...spiralGeometry()} />
        <lineBasicMaterial attach="material" color={balancedColor} linewidth={2} />
      </line>

      {/* 螺旋粒子 */}
      <points ref={particlesRef}>
        <bufferGeometry attach="geometry" {...spiralGeometry()} />
        <pointsMaterial
          attach="material"
          color={balancedColor}
          size={0.1}
          sizeAttenuation
          transparent
          opacity={0.8}
        />
      </points>

      {/* 中心軸 */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 10, 32]} />
        <meshStandardMaterial color={balancedColor} emissive={balancedColor} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

/**
 * 天津金木パターンコンポーネント
 * 
 * 50パターンの光柱アニメーション
 * ホバー時の光柱出現エフェクト
 * Three.js 3D表現
 */
export function AmatsuKanagiPattern({ fireWaterBalance = 0.5 }: { fireWaterBalance?: number }) {
  const [isHovered, setIsHovered] = useState(false);
  const [rotation, setRotation] = useState(0);

  return (
    <motion.div
      className="relative w-full h-96"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      animate={{ rotate: rotation }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
    >
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 5, 10], fov: 50 }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00bfff" />
        
        <SpiralStructure fireWaterBalance={fireWaterBalance} />
        
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={2}
        />
      </Canvas>

      {/* ホバー時の光柱エフェクト */}
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="absolute inset-0 pointer-events-none"
        >
          {/* 光柱 */}
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "100%" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute left-1/2 top-0 -translate-x-1/2 w-1"
            style={{
              background: "linear-gradient(180deg, rgba(255, 215, 0, 0) 0%, rgba(255, 215, 0, 0.8) 50%, rgba(255, 215, 0, 0) 100%)",
              boxShadow: "0 0 20px rgba(255, 215, 0, 0.6)",
              filter: "blur(3px)",
            }}
          />

          {/* 光の拡散エフェクト */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`light-ray-${i}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 2, opacity: [0, 0.6, 0] }}
              transition={{
                duration: 1.5,
                delay: i * 0.1,
                ease: "easeOut",
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-32"
              style={{
                background: "linear-gradient(180deg, rgba(255, 215, 0, 0.6) 0%, transparent 100%)",
                transform: `rotate(${i * 45}deg)`,
                transformOrigin: "center",
                filter: "blur(5px)",
              }}
            />
          ))}
        </motion.div>
      )}

      {/* クリック時の光の拡散エフェクト */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        onClick={() => setRotation(rotation + 360)}
      >
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          whileTap={{ scale: 3, opacity: [0, 0.8, 0] }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(255, 215, 0, 0.6) 0%, transparent 70%)",
            filter: "blur(20px)",
          }}
        />
      </motion.div>
    </motion.div>
  );
}
