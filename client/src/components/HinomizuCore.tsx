/**
 * ============================================================
 *  HINOMIZU CORE — 火水中枢コア
 * ============================================================
 * 
 * 天津金木の運動構造を持つ中枢コアUI
 * 火は降り、水は渦巻き昇る
 * ============================================================
 */

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

/**
 * 火の螺旋（降り）
 * 位置 = f(t) = -|sin(t)| * 密度係数
 * 回転 = +ω₁
 * エネルギー = 収束
 */
function FireSpiral() {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // 回転: +ω₁ (正の回転)
    ref.current.rotation.y = t * 0.6;
    // 位置: 降り（呼吸感）
    ref.current.position.y = Math.sin(t) * 0.2;
    // エネルギー密度（収束）
    ref.current.scale.setScalar(1 + Math.sin(t * 2) * 0.05);
  });

  return (
    <mesh ref={ref}>
      <cylinderGeometry args={[0.05, 0.2, 2, 32, 1, true]} />
      <meshStandardMaterial
        color="#ffcc66"
        emissive="#ff9900"
        emissiveIntensity={1.2}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

/**
 * 水の螺旋（昇り）
 * 位置 = +|sin(t + 位相差)| * 拡散係数
 * 回転 = -ω₂
 * エネルギー = 拡張
 */
function WaterSpiral() {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // 回転: -ω₂ (負の回転、火と逆)
    ref.current.rotation.y = -t * 0.4;
    // 位置: 昇り（呼吸感、位相差で火と同期しない）
    ref.current.position.y = -Math.sin(t) * 0.3;
  });

  return (
    <mesh ref={ref}>
      <torusGeometry args={[0.6, 0.02, 16, 100]} />
      <meshStandardMaterial
        color="#66ccff"
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}

/**
 * 正中軸（不動、Z軸）
 */
function CentralAxis() {
  const ref = useRef<THREE.Mesh>(null!);

  return (
    <mesh ref={ref} position={[0, 0, 0]}>
      <cylinderGeometry args={[0.01, 0.01, 3, 8]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#ffffff"
        emissiveIntensity={0.3}
        transparent
        opacity={0.2}
      />
    </mesh>
  );
}

/**
 * Hinomizu Core コンポーネント
 */
export default function HinomizuCore() {
  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[2, 2, 2]} intensity={1.2} />
        <pointLight position={[-2, -2, -2]} intensity={0.8} />
        
        {/* 正中軸（不動） */}
        <CentralAxis />
        
        {/* 火の螺旋（降り） */}
        <FireSpiral />
        
        {/* 水の螺旋（昇り） */}
        <WaterSpiral />
      </Canvas>
    </div>
  );
}

