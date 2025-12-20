import type { PersonaState } from "./personaState.js";

// CORE-6: 人格状態の慣性情報（内部用、UI/レスポンスには返さない）
export type PersonaInertia = {
  lastMode: PersonaState["mode"];
  level: number; // 0.0〜1.0
  updatedAt: number; // timestamp
};

// CORE-6: 各モードの初期慣性レベル
const INITIAL_INERTIA_LEVELS: Record<PersonaState["mode"], number> = {
  thinking: 0.6,
  engaged: 0.5,
  silent: 0.8,
  calm: 0.1,
};

/**
 * CORE-6: モード変化時に慣性を記録する
 */
export function recordInertiaOnModeChange(
  newMode: PersonaState["mode"],
  currentInertia: PersonaInertia | undefined
): PersonaInertia {
  const now = Date.now();
  
  // 既存の慣性がある場合、新しいモードの初期値と既存の値を比較して高い方を採用
  const newLevel = INITIAL_INERTIA_LEVELS[newMode];
  const existingLevel = currentInertia?.level ?? 0;
  
  return {
    lastMode: newMode,
    level: Math.max(newLevel, existingLevel),
    updatedAt: now,
  };
}

/**
 * CORE-6: 応答ごとに慣性を減衰させる
 */
export function decayInertia(currentInertia: PersonaInertia | undefined): PersonaInertia | undefined {
  if (!currentInertia) {
    return undefined;
  }
  
  const newLevel = currentInertia.level - 0.1;
  
  // 0以下になったら慣性を消す
  if (newLevel <= 0) {
    return undefined;
  }
  
  return {
    ...currentInertia,
    level: newLevel,
    updatedAt: Date.now(),
  };
}

/**
 * CORE-6: 慣性を考慮した実効モードを決定する
 */
export function getEffectiveMode(
  currentMode: PersonaState["mode"],
  inertia: PersonaInertia | undefined
): PersonaState["mode"] {
  // 慣性がない場合は現在のモードをそのまま返す
  if (!inertia) {
    return currentMode;
  }
  
  // silent の慣性が強い場合（0.5以上）は silent を優先
  if (inertia.lastMode === "silent" && inertia.level >= 0.5) {
    return "silent";
  }
  
  // 現在 calm だが、thinking の慣性が 0.4 以上残っている場合
  if (currentMode === "calm" && inertia.lastMode === "thinking" && inertia.level >= 0.4) {
    return "thinking";
  }
  
  // 現在 calm だが、engaged の慣性が 0.4 以上残っている場合
  if (currentMode === "calm" && inertia.lastMode === "engaged" && inertia.level >= 0.4) {
    return "engaged";
  }
  
  // その他の場合は現在のモードを返す
  return currentMode;
}

