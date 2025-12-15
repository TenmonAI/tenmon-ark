/**
 * ============================================================
 *   KANAGI ODE ENGINE v1
 *   天津金木（左旋/右旋 × 内集/外発 × 火水）を
 *   時間微分で計算する宇宙構文エンジン。
 *
 *   Reishō Kernel / TwinCore Reasoning / MemoryKernel の
 *   すべてが、この ODE によって "流れと位相" を得る。
 * ============================================================
 */

export type KanagiPhase = "L-IN" | "L-OUT" | "R-IN" | "R-OUT";

export interface KanagiState {
  t: number;              // 時刻
  L: number;              // 左旋強度（-1〜1）
  R: number;              // 右旋強度（-1〜1）
  IN: number;             // 内集力（0〜1）
  OUT: number;            // 外発力（0〜1）
  fire: number;           // 火エネルギー（陽）
  water: number;          // 水エネルギー（陰）
}

export interface ODEResult {
  phase: KanagiPhase;
  state: KanagiState;
}

const clamp = (x: number, min: number, max: number) =>
  Math.max(min, Math.min(max, x));

/* ============================================================
 * 天津金木 ODE
 *
 * dL/dt =  + water * IN  - fire * OUT
 * dR/dt =  + fire  * OUT - water * IN
 *
 * dIN/dt  =  water - fire * L
 * dOUT/dt =  fire  - water * R
 *
 * dfire/dt  =  R * OUT - L * IN
 * dwater/dt =  L * IN  - R * OUT
 * ============================================================ */

export function integrateKanagiODE(
  state: KanagiState,
  dt: number = 0.05
): KanagiState {
  const { L, R, IN, OUT, fire, water } = state;

  const dL = water * IN - fire * OUT;
  const dR = fire * OUT - water * IN;

  const dIN = water - fire * L;
  const dOUT = fire - water * R;

  const dfire = R * OUT - L * IN;
  const dwater = L * IN - R * OUT;

  const next: KanagiState = {
    t: state.t + dt,
    L: clamp(L + dL * dt, -1, 1),
    R: clamp(R + dR * dt, -1, 1),
    IN: clamp(IN + dIN * dt, 0, 1),
    OUT: clamp(OUT + dOUT * dt, 0, 1),
    fire: clamp(fire + dfire * dt, 0, 1),
    water: clamp(water + dwater * dt, 0, 1),
  };

  return next;
}

/* ============================================================
 *  ODE → 天津金木フェーズ決定
 * ============================================================ */
export function kanagiPhaseFromState(state: KanagiState): KanagiPhase {
  const lr = state.R - state.L;       // +なら右旋優勢
  const io = state.OUT - state.IN;    // +なら外発優勢

  if (lr >= 0 && io <= 0) return "R-IN";
  if (lr >= 0 && io > 0) return "R-OUT";
  if (lr < 0 && io <= 0) return "L-IN";
  return "L-OUT";
}

/* ============================================================
 *  完全ステップ実行
 * ============================================================ */
export function runKanagiStep(
  state: KanagiState,
  dt: number = 0.05
): ODEResult {
  const next = integrateKanagiODE(state, dt);
  const phase = kanagiPhaseFromState(next);

  return { phase, state: next };
}

/* ============================================================
 *  複数ステップ実行（軌跡生成）
 * ============================================================ */
export function runKanagiTrajectory(
  initialState: KanagiState,
  steps: number = 100,
  dt: number = 0.05
): {
  trajectory: KanagiState[];
  phases: KanagiPhase[];
  finalPhase: KanagiPhase;
} {
  const trajectory: KanagiState[] = [initialState];
  const phases: KanagiPhase[] = [kanagiPhaseFromState(initialState)];

  let currentState = initialState;

  for (let i = 0; i < steps; i++) {
    const result = runKanagiStep(currentState, dt);
    trajectory.push(result.state);
    phases.push(result.phase);
    currentState = result.state;
  }

  return {
    trajectory,
    phases,
    finalPhase: phases[phases.length - 1],
  };
}

/* ============================================================
 *  初期状態生成（火水バランスから）
 * ============================================================ */
export function createInitialKanagiState(
  fireValue: number,
  waterValue: number
): KanagiState {
  // 火水バランスから初期状態を生成
  const total = fireValue + waterValue;
  const fire = total > 0 ? fireValue / total : 0.5;
  const water = total > 0 ? waterValue / total : 0.5;

  // 初期の左右旋・内集外発は火水バランスから推定
  const L = water > fire ? -0.3 : 0.3;
  const R = fire > water ? 0.3 : -0.3;
  const IN = water;
  const OUT = fire;

  return {
    t: 0,
    L,
    R,
    IN,
    OUT,
    fire,
    water,
  };
}

export default {
  integrateKanagiODE,
  kanagiPhaseFromState,
  runKanagiStep,
  runKanagiTrajectory,
  createInitialKanagiState,
};

