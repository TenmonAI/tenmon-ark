// v∞-3: Ambient / Device 常駐（起動時の人格初期化）

import { getCurrentPersonaStateInternal, setPersonaState } from "../persona/personaState.js";
import { getLatestFractalSeed } from "../kokuzo/fractalStore.js";
import { expandFromFractalSeed, applyExpandedProfileToInertia, applyExpandedProfileToThinkingAxis, applyExpandedProfileToKanagiPhase } from "../kokuzo/expansion.js";

// v∞-3: 初期化済みフラグ（外部非公開）
let isAmbientInitialized = false;

/**
 * v∞-3: 初期化済みかどうかを取得
 */
export function getIsAmbientInitialized(): boolean {
  return isAmbientInitialized;
}

/**
 * v∞-3: API起動時に一度だけ実行される人格初期化処理
 * 
 * 内容：
 * - 最新の FractalSeed を取得
 * - Fractal Expansion を1回だけ実行
 * - PersonaState の初期値を生成・保持
 * 
 * この初期化は「1プロセスにつき1回」
 */
export function initializeAmbientPersona(): void {
  if (isAmbientInitialized) {
    // 既に初期化済みの場合は何もしない
    return;
  }
  
  const currentState = getCurrentPersonaStateInternal();
  const personaId = currentState.personaId;
  
  // 最新のFractalSeedを取得
  const fractalSeed = getLatestFractalSeed(personaId);
  
  if (!fractalSeed) {
    // FractalSeedがない場合は初期化をスキップ（デフォルト状態のまま）
    isAmbientInitialized = true;
    return;
  }
  
  // Fractal Expansionを1回だけ実行
  const expandedProfile = expandFromFractalSeed(fractalSeed);
  
  if (!expandedProfile) {
    // 展開できない場合は初期化をスキップ
    isAmbientInitialized = true;
    return;
  }
  
  // PersonaStateの初期値を生成・保持
  // inertiaの初期化
  const initialInertia = applyExpandedProfileToInertia(currentState._inertia, expandedProfile);
  if (initialInertia !== currentState._inertia) {
    setPersonaState({ _inertia: initialInertia });
  }
  
  // thinkingAxisの初期化（存在する場合のみ）
  const baseThinkingAxis = applyExpandedProfileToThinkingAxis(expandedProfile);
  if (baseThinkingAxis) {
    setPersonaState({ _thinkingAxis: baseThinkingAxis });
  }
  
  // kanagiPhaseの初期化（存在する場合のみ）
  const baseKanagiPhase = applyExpandedProfileToKanagiPhase(expandedProfile);
  if (baseKanagiPhase) {
    setPersonaState({ _kanagiPhase: baseKanagiPhase });
  }
  
  // 初期化完了
  isAmbientInitialized = true;
}

