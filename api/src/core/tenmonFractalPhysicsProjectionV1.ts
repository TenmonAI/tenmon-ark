/**
 * 物理との相関は projection（断定禁止・root 従属禁止）。
 */

export const FRACTAL_PHYSICS_AXES_V1 = [
  "循環",
  "分離",
  "結合",
  "中心",
  "振動",
  "渦",
  "波",
  "呼吸",
  "位相",
  "スケール反復",
] as const;

export type FractalPhysicsProjectionBundleV1 = {
  card: "TENMON_SELF_LEARNING_KHS_SANSKRIT_FRACTAL_AUTOSTUDY_CURSOR_AUTO_V1";
  physicsProjectionAxis: string;
  projectionConfidence: number;
  needsEvidence: true;
  fractalPhysicsHint: string;
};

export function projectFractalPhysicsV1(message: string): FractalPhysicsProjectionBundleV1 {
  const msg = String(message || "").replace(/\s+/gu, " ").trim();
  let ax = "位相";
  if (/ループ|循環/u.test(msg)) ax = "循環";
  else if (/分離|峻別/u.test(msg)) ax = "分離";
  else if (/結合|結び/u.test(msg)) ax = "結合";
  else if (/波|振動/u.test(msg)) ax = "波";
  else if (/呼吸|息/u.test(msg)) ax = "呼吸";
  return {
    card: "TENMON_SELF_LEARNING_KHS_SANSKRIT_FRACTAL_AUTOSTUDY_CURSOR_AUTO_V1",
    physicsProjectionAxis: ax,
    projectionConfidence: 0.45,
    needsEvidence: true,
    fractalPhysicsHint:
      "言霊法則と物理は写像として扱い、未証明の断定をしない。root law は physics に従属させない。",
  };
}
