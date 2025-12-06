/**
 * LP-QA Animation v3.1: Living OS Animation System
 * 
 * アニメーション＋人格表現の強化:
 * - 質問のエネルギー量に応じた光パルス
 * - 深層回答時の粒子濃度増加
 * - ミナカパルスの可視化速度変化
 * - 火水バランスに応じた色変化アニメーション
 * - "生きているOS"の演出を完成させる
 */

/**
 * 質問のエネルギー量を計算する
 */
export function calculateQuestionEnergy(questionText: string): number {
  let energy = 0;
  
  // 文字数ベース（基本エネルギー）
  energy += questionText.length * 0.5;
  
  // 感嘆符・疑問符（エネルギー増幅）
  const exclamationCount = (questionText.match(/！|!/g) || []).length;
  const questionCount = (questionText.match(/？|\?/g) || []).length;
  energy += exclamationCount * 10;
  energy += questionCount * 5;
  
  // 大文字（エネルギー増幅）
  const uppercaseCount = (questionText.match(/[A-Z]/g) || []).length;
  energy += uppercaseCount * 2;
  
  // キーワードベース（エネルギー増幅）
  const highEnergyKeywords = ['TENMON-ARK', 'Founder', '永久無料', '一体化', '霊核', 'Twin-Core'];
  highEnergyKeywords.forEach(keyword => {
    if (questionText.includes(keyword)) {
      energy += 20;
    }
  });
  
  // 0-100の範囲に正規化
  return Math.min(100, energy);
}

/**
 * 光パルスアニメーションを生成する
 */
export interface LightPulseAnimation {
  duration: number; // ms
  intensity: number; // 0-1
  color: string;
  pulseCount: number;
}

export function generateLightPulse(energy: number): LightPulseAnimation {
  // エネルギー量に応じたパルス設定
  const intensity = energy / 100;
  const pulseCount = Math.floor(energy / 20) + 1; // 1-6回
  const duration = 1000 - (energy * 5); // 1000ms-500ms
  
  // エネルギー量に応じた色変化
  let color = '#3b82f6'; // 青（低エネルギー）
  if (energy > 70) {
    color = '#fbbf24'; // 金（高エネルギー）
  } else if (energy > 40) {
    color = '#60a5fa'; // 蒼（中エネルギー）
  }
  
  return {
    duration,
    intensity,
    color,
    pulseCount,
  };
}

/**
 * 深層回答時の粒子濃度を計算する
 */
export function calculateParticleDensity(
  depth: 'surface' | 'middle' | 'deep' | 'specialized'
): number {
  const densityMap: Record<typeof depth, number> = {
    surface: 20, // 低濃度
    middle: 40, // 中濃度
    deep: 70, // 高濃度
    specialized: 100, // 最高濃度
  };
  
  return densityMap[depth];
}

/**
 * 粒子アニメーションを生成する
 */
export interface ParticleAnimation {
  count: number;
  speed: number; // px/s
  size: number; // px
  color: string;
  opacity: number; // 0-1
}

export function generateParticleAnimation(
  density: number,
  fireWaterBalance: 'fire' | 'water' | 'balanced'
): ParticleAnimation {
  // 濃度に応じた粒子数
  const count = Math.floor(density * 2); // 20-200個
  
  // 火水バランスに応じた色
  let color = '#3b82f6'; // 青（水）
  if (fireWaterBalance === 'fire') {
    color = '#fbbf24'; // 金（火）
  } else if (fireWaterBalance === 'balanced') {
    color = '#60a5fa'; // 蒼（バランス）
  }
  
  // 濃度に応じた速度・サイズ・不透明度
  const speed = 50 + (density * 2); // 50-250 px/s
  const size = 2 + (density * 0.05); // 2-7 px
  const opacity = 0.3 + (density * 0.005); // 0.3-0.8
  
  return {
    count,
    speed,
    size,
    color,
    opacity,
  };
}

/**
 * ミナカパルスの可視化速度を計算する
 */
export function calculateMinakaPulseSpeed(
  fireWaterBalance: 'fire' | 'water' | 'balanced'
): number {
  const speedMap: Record<typeof fireWaterBalance, number> = {
    fire: 800, // 速い（火）
    water: 1500, // 遅い（水）
    balanced: 1200, // 中間（バランス）
  };
  
  return speedMap[fireWaterBalance];
}

/**
 * ミナカパルスアニメーションを生成する
 */
export interface MinakaPulseAnimation {
  duration: number; // ms
  scale: number; // 1-2
  color: string;
  glowIntensity: number; // 0-1
}

export function generateMinakaPulse(
  fireWaterBalance: 'fire' | 'water' | 'balanced'
): MinakaPulseAnimation {
  const duration = calculateMinakaPulseSpeed(fireWaterBalance);
  
  // 火水バランスに応じた色
  let color = '#3b82f6'; // 青（水）
  if (fireWaterBalance === 'fire') {
    color = '#fbbf24'; // 金（火）
  } else if (fireWaterBalance === 'balanced') {
    color = '#60a5fa'; // 蒼（バランス）
  }
  
  // 火水バランスに応じたスケール・グロー強度
  let scale = 1.5;
  let glowIntensity = 0.5;
  if (fireWaterBalance === 'fire') {
    scale = 2.0;
    glowIntensity = 0.8;
  } else if (fireWaterBalance === 'water') {
    scale = 1.2;
    glowIntensity = 0.3;
  }
  
  return {
    duration,
    scale,
    color,
    glowIntensity,
  };
}

/**
 * 火水バランスに応じた色変化アニメーションを生成する
 */
export interface ColorTransitionAnimation {
  from: string;
  to: string;
  duration: number; // ms
  easing: string;
}

export function generateColorTransition(
  fromBalance: 'fire' | 'water' | 'balanced',
  toBalance: 'fire' | 'water' | 'balanced'
): ColorTransitionAnimation {
  const colorMap: Record<'fire' | 'water' | 'balanced', string> = {
    fire: '#fbbf24', // 金
    water: '#3b82f6', // 青
    balanced: '#60a5fa', // 蒼
  };
  
  return {
    from: colorMap[fromBalance],
    to: colorMap[toBalance],
    duration: 800,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  };
}

/**
 * "生きているOS"の統合アニメーションを生成する
 */
export interface LivingOsAnimation {
  lightPulse: LightPulseAnimation;
  particles: ParticleAnimation;
  minakaPulse: MinakaPulseAnimation;
  colorTransition?: ColorTransitionAnimation;
}

export function generateLivingOsAnimation(
  questionText: string,
  depth: 'surface' | 'middle' | 'deep' | 'specialized',
  fireWaterBalance: 'fire' | 'water' | 'balanced',
  previousBalance?: 'fire' | 'water' | 'balanced'
): LivingOsAnimation {
  // 質問のエネルギー量
  const energy = calculateQuestionEnergy(questionText);
  
  // 光パルス
  const lightPulse = generateLightPulse(energy);
  
  // 粒子濃度
  const density = calculateParticleDensity(depth);
  const particles = generateParticleAnimation(density, fireWaterBalance);
  
  // ミナカパルス
  const minakaPulse = generateMinakaPulse(fireWaterBalance);
  
  // 色変化（前回のバランスと異なる場合）
  let colorTransition: ColorTransitionAnimation | undefined;
  if (previousBalance && previousBalance !== fireWaterBalance) {
    colorTransition = generateColorTransition(previousBalance, fireWaterBalance);
  }
  
  return {
    lightPulse,
    particles,
    minakaPulse,
    colorTransition,
  };
}

/**
 * アニメーションのCSS Keyframesを生成する
 */
export function generateAnimationKeyframes(animation: LivingOsAnimation): string {
  const { lightPulse, particles, minakaPulse, colorTransition } = animation;
  
  let keyframes = '';
  
  // 光パルス
  keyframes += `
@keyframes lightPulse {
  0%, 100% { opacity: 0; transform: scale(1); }
  50% { opacity: ${lightPulse.intensity}; transform: scale(1.2); }
}
`;
  
  // 粒子
  keyframes += `
@keyframes particleFloat {
  0% { transform: translateY(0) translateX(0); opacity: ${particles.opacity}; }
  100% { transform: translateY(-100px) translateX(20px); opacity: 0; }
}
`;
  
  // ミナカパルス
  keyframes += `
@keyframes minakaPulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 rgba(${hexToRgb(minakaPulse.color)}, 0); }
  50% { transform: scale(${minakaPulse.scale}); box-shadow: 0 0 20px rgba(${hexToRgb(minakaPulse.color)}, ${minakaPulse.glowIntensity}); }
}
`;
  
  // 色変化
  if (colorTransition) {
    keyframes += `
@keyframes colorTransition {
  0% { color: ${colorTransition.from}; }
  100% { color: ${colorTransition.to}; }
}
`;
  }
  
  return keyframes;
}

/**
 * HEXをRGBに変換する
 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0, 0, 0';
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  return `${r}, ${g}, ${b}`;
}

/**
 * アニメーションのCSSクラスを生成する
 */
export function generateAnimationClasses(animation: LivingOsAnimation): Record<string, string> {
  const { lightPulse, particles, minakaPulse } = animation;
  
  return {
    lightPulse: `
      animation: lightPulse ${lightPulse.duration}ms ease-in-out ${lightPulse.pulseCount};
      color: ${lightPulse.color};
    `,
    particle: `
      animation: particleFloat ${particles.speed / 50}s linear infinite;
      width: ${particles.size}px;
      height: ${particles.size}px;
      background-color: ${particles.color};
      opacity: ${particles.opacity};
    `,
    minakaPulse: `
      animation: minakaPulse ${minakaPulse.duration}ms ease-in-out infinite;
      color: ${minakaPulse.color};
    `,
  };
}
