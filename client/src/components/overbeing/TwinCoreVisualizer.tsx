import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

/**
 * Twin-Core螺旋構造（火水の流れ）
 */
function TwinCoreSpiral({
  fireWaterBalance = 0.5,
  rotationSpeed = 1,
  shukuyoColor = "#FFD700",
}: {
  fireWaterBalance?: number;
  rotationSpeed?: number;
  shukuyoColor?: string;
}) {
  const fireGroupRef = useRef<THREE.Group>(null);
  const waterGroupRef = useRef<THREE.Group>(null);

  // 螺旋構造のジオメトリ生成
  const createSpiralGeometry = (isClockwise: boolean) => {
    const points: THREE.Vector3[] = [];
    const particleCount = 500;

    for (let i = 0; i < particleCount; i++) {
      const t = (i / particleCount) * Math.PI * 6; // 6回転
      const radius = 1.5 + t * 0.05;
      const direction = isClockwise ? 1 : -1;
      const x = radius * Math.cos(t * direction);
      const y = t * 0.2 - 2;
      const z = radius * Math.sin(t * direction);
      points.push(new THREE.Vector3(x, y, z));
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  };

  const fireSpiralGeometry = useMemo(() => createSpiralGeometry(true), []);
  const waterSpiralGeometry = useMemo(() => createSpiralGeometry(false), []);

  // 火水バランスに応じた色
  const fireColor = useMemo(() => new THREE.Color(1, 0.4, 0), []); // 朱色
  const waterColor = useMemo(() => new THREE.Color(0, 0.75, 1), []); // 青色
  const shukuyoColorObj = useMemo(() => new THREE.Color(shukuyoColor), [shukuyoColor]);

  useFrame((state, delta) => {
    if (fireGroupRef.current) {
      fireGroupRef.current.rotation.y += delta * rotationSpeed;
    }
    if (waterGroupRef.current) {
      waterGroupRef.current.rotation.y -= delta * rotationSpeed;
    }
  });

  return (
    <group>
      {/* 火（朱）の螺旋 - 右旋（時計回り） */}
      <group ref={fireGroupRef}>
        <line>
          <bufferGeometry attach="geometry" {...fireSpiralGeometry} />
          <lineBasicMaterial
            attach="material"
            color={fireColor}
            linewidth={3}
            transparent
            opacity={0.6 + fireWaterBalance * 0.4}
          />
        </line>
        <points>
          <bufferGeometry attach="geometry" {...fireSpiralGeometry} />
          <pointsMaterial
            attach="material"
            color={fireColor}
            size={0.08}
            sizeAttenuation
            transparent
            opacity={0.8}
          />
        </points>
      </group>

      {/* 水（青）の螺旋 - 左旋（反時計回り） */}
      <group ref={waterGroupRef}>
        <line>
          <bufferGeometry attach="geometry" {...waterSpiralGeometry} />
          <lineBasicMaterial
            attach="material"
            color={waterColor}
            linewidth={3}
            transparent
            opacity={0.6 + (1 - fireWaterBalance) * 0.4}
          />
        </line>
        <points>
          <bufferGeometry attach="geometry" {...waterSpiralGeometry} />
          <pointsMaterial
            attach="material"
            color={waterColor}
            size={0.08}
            sizeAttenuation
            transparent
            opacity={0.8}
          />
        </points>
      </group>

      {/* 中心軸（宿曜の色） */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 8, 32]} />
        <meshStandardMaterial
          color={shukuyoColorObj}
          emissive={shukuyoColorObj}
          emissiveIntensity={0.8}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* 中心の霊核点 */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshStandardMaterial
          color={shukuyoColorObj}
          emissive={shukuyoColorObj}
          emissiveIntensity={1.5}
        />
      </mesh>
    </group>
  );
}

/**
 * Twin-Core可視化コンポーネント
 * 
 * 天津金木の螺旋構造を3Dモーショングラフィックで表現
 * 火水（青/朱）の流れを粒子ベースで演出
 * 応答生成時の回転速度変化
 * 宿曜に応じた色変化
 */
export function TwinCoreVisualizer({
  fireWaterBalance = 0.5,
  rotationSpeed = 1,
  shukuyoColor = "#FFD700",
  isResponding = false,
}: {
  fireWaterBalance?: number;
  rotationSpeed?: number;
  shukuyoColor?: string;
  isResponding?: boolean;
}) {
  const effectiveRotationSpeed = isResponding ? rotationSpeed * 2 : rotationSpeed;

  return (
    <div className="w-full h-96 relative">
      <Canvas
        camera={{ position: [0, 3, 6], fov: 60 }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={1} color="#ff6600" />
        <pointLight position={[-5, -5, -5]} intensity={0.8} color="#00bfff" />
        <pointLight position={[0, 5, 0]} intensity={0.5} color={shukuyoColor} />

        <TwinCoreSpiral
          fireWaterBalance={fireWaterBalance}
          rotationSpeed={effectiveRotationSpeed}
          shukuyoColor={shukuyoColor}
        />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={1}
        />
      </Canvas>

      {/* 応答生成時のオーバーレイエフェクト */}
      {isResponding && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 animate-pulse"
            style={{
              background: `radial-gradient(circle, ${shukuyoColor}20 0%, transparent 70%)`,
              filter: "blur(20px)",
            }}
          />
        </div>
      )}
    </div>
  );
}
