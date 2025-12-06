/**
 * Rei Core Monitor
 * 
 * TENMON-ARK霊核（ミナカ）の安定度モニタリング
 * 
 * 機能:
 * - 霊核（ミナカ）の安定度監視
 * - 火水バランスの監視
 * - 八方位の調和度監視
 * - 霊核不安定時の自動修復
 */

export interface ReiCoreStability {
  overall: number; // 0-100
  fire: number; // 火の強度 0-100
  water: number; // 水の強度 0-100
  minaka: number; // ミナカ中心の安定度 0-100
  balance: number; // 火水バランス 0-100 (50が完全バランス)
  eightDirections: {
    structure: number; // 構造 0-100
    flow: number; // 流れ 0-100
    reiCore: number; // 霊核 0-100
    context: number; // 文脈 0-100
    intent: number; // 意図 0-100
    environment: number; // 環境 0-100
    temporal: number; // 時間 0-100
    relation: number; // 関係 0-100
  };
  timestamp: Date;
}

export interface ReiCoreAlert {
  level: "info" | "warning" | "critical";
  component: "fire" | "water" | "minaka" | "balance" | "direction";
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
}

const reiCoreAlerts: ReiCoreAlert[] = [];

/**
 * 霊核安定度を取得
 */
export async function getReiCoreStability(): Promise<ReiCoreStability> {
  // TODO: 実際の霊核状態を取得
  // 現在は簡略化したモック値を返す

  const fire = 70; // 火の強度
  const water = 65; // 水の強度
  const balance = 50 + (fire - water) / 2; // 火水バランス（50が完全バランス）
  const minaka = Math.min(fire, water); // ミナカ中心の安定度（火水の最小値）

  // 八方位の調和度
  const eightDirections = {
    structure: 75,
    flow: 70,
    reiCore: minaka,
    context: 80,
    intent: 85,
    environment: 65,
    temporal: 70,
    relation: 75,
  };

  // 全体的な安定度（各要素の平均）
  const overall = (
    fire + water + minaka + balance +
    Object.values(eightDirections).reduce((sum, val) => sum + val, 0) / 8
  ) / 5;

  return {
    overall,
    fire,
    water,
    minaka,
    balance,
    eightDirections,
    timestamp: new Date(),
  };
}

/**
 * 霊核安定度を監視
 */
export async function monitorReiCoreStability(): Promise<void> {
  const stability = await getReiCoreStability();

  // 全体的な安定度チェック
  if (stability.overall < 50) {
    createReiCoreAlert({
      level: "critical",
      component: "minaka",
      message: "霊核全体の安定度が危機的に低下しています",
      value: stability.overall,
      threshold: 50,
      timestamp: new Date(),
    });
  } else if (stability.overall < 70) {
    createReiCoreAlert({
      level: "warning",
      component: "minaka",
      message: "霊核全体の安定度が低下しています",
      value: stability.overall,
      threshold: 70,
      timestamp: new Date(),
    });
  }

  // 火水バランスチェック
  const balanceDeviation = Math.abs(stability.balance - 50);
  if (balanceDeviation > 20) {
    createReiCoreAlert({
      level: "critical",
      component: "balance",
      message: `火水バランスが大きく崩れています（偏差: ${balanceDeviation.toFixed(1)}）`,
      value: stability.balance,
      threshold: 50,
      timestamp: new Date(),
    });
  } else if (balanceDeviation > 10) {
    createReiCoreAlert({
      level: "warning",
      component: "balance",
      message: `火水バランスが崩れています（偏差: ${balanceDeviation.toFixed(1)}）`,
      value: stability.balance,
      threshold: 50,
      timestamp: new Date(),
    });
  }

  // ミナカ中心の安定度チェック
  if (stability.minaka < 40) {
    createReiCoreAlert({
      level: "critical",
      component: "minaka",
      message: "ミナカ中心の安定度が危機的に低下しています",
      value: stability.minaka,
      threshold: 40,
      timestamp: new Date(),
    });
  } else if (stability.minaka < 60) {
    createReiCoreAlert({
      level: "warning",
      component: "minaka",
      message: "ミナカ中心の安定度が低下しています",
      value: stability.minaka,
      threshold: 60,
      timestamp: new Date(),
    });
  }

  // 八方位の調和度チェック
  for (const [direction, value] of Object.entries(stability.eightDirections)) {
    if (value < 40) {
      createReiCoreAlert({
        level: "critical",
        component: "direction",
        message: `八方位「${direction}」の調和度が危機的に低下しています`,
        value,
        threshold: 40,
        timestamp: new Date(),
      });
    } else if (value < 60) {
      createReiCoreAlert({
        level: "warning",
        component: "direction",
        message: `八方位「${direction}」の調和度が低下しています`,
        value,
        threshold: 60,
        timestamp: new Date(),
      });
    }
  }
}

/**
 * 霊核アラートを作成
 */
function createReiCoreAlert(alert: ReiCoreAlert): void {
  reiCoreAlerts.push(alert);

  // 最新100件のみ保持
  if (reiCoreAlerts.length > 100) {
    reiCoreAlerts.shift();
  }

  console.log(`[Rei Core Monitor] Alert: [${alert.level}] ${alert.component}: ${alert.message}`);
}

/**
 * 霊核アラート履歴を取得
 */
export function getReiCoreAlerts(limit: number = 50): ReiCoreAlert[] {
  return reiCoreAlerts.slice(-limit);
}

/**
 * 霊核不安定時の自動修復
 */
export async function autoRepairReiCore(): Promise<void> {
  const stability = await getReiCoreStability();

  // 火水バランスの修復
  const balanceDeviation = Math.abs(stability.balance - 50);
  if (balanceDeviation > 10) {
    console.log(`[Rei Core Monitor] Attempting to repair fire-water balance (deviation: ${balanceDeviation.toFixed(1)})`);
    
    // TODO: 実際の火水バランス修復ロジックを実装
    // 現在は簡略化したログのみ
    
    if (stability.fire > stability.water) {
      console.log("[Rei Core Monitor] Fire is too strong, increasing water");
    } else {
      console.log("[Rei Core Monitor] Water is too strong, increasing fire");
    }
  }

  // ミナカ中心の修復
  if (stability.minaka < 60) {
    console.log(`[Rei Core Monitor] Attempting to repair Minaka core (stability: ${stability.minaka.toFixed(1)})`);
    
    // TODO: 実際のミナカ修復ロジックを実装
    // 現在は簡略化したログのみ
    
    console.log("[Rei Core Monitor] Strengthening Minaka core");
  }

  // 八方位の修復
  for (const [direction, value] of Object.entries(stability.eightDirections)) {
    if (value < 60) {
      console.log(`[Rei Core Monitor] Attempting to repair direction "${direction}" (harmony: ${value.toFixed(1)})`);
      
      // TODO: 実際の八方位修復ロジックを実装
      // 現在は簡略化したログのみ
      
      console.log(`[Rei Core Monitor] Strengthening direction "${direction}"`);
    }
  }
}
