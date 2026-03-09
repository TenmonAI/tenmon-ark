export function computeHeartPhase(
  entropy: number,
  truthWeight: number,
  hasSeed: boolean
): string {
  if (truthWeight > 0.8 && hasSeed) return "CENTER";

  if (entropy < 0.2) return "L-IN";

  if (entropy < 0.4) return "L-OUT";

  if (entropy < 0.7) return "R-IN";

  return "R-OUT";
}

export type KanagiPhase = "L-IN" | "R-IN" | "L-OUT" | "R-OUT" | "CENTER";

export interface WaterFireVector {
  waterScore: number;   // 0..1
  fireScore: number;    // 0..1
  balance: number;      // -1..1  (minus = water, plus = fire)
}

export interface HeartState {
  userPhase: KanagiPhase;
  userVector: WaterFireVector;
  arkTargetPhase: KanagiPhase;
  entropy: number;      // 0..1
}

const FIRE_RE = /[あいうアイイ]/g;   // 最小近似でよい
const WATER_RE = /[うおウオ]/g;
const TURN_RE = /[えエ]/g;

function count(re: RegExp, text: string): number {
  const m = text.match(re);
  return m ? m.length : 0;
}

export function computeWaterFireVector(text: string): WaterFireVector {
  const s = String(text || "");
  const fire = count(FIRE_RE, s);
  const water = count(WATER_RE, s);
  const turn = count(TURN_RE, s) * 0.5;
  const total = fire + water + turn;

  if (total <= 0) {
    return { waterScore: 0.5, fireScore: 0.5, balance: 0 };
  }

  const fireScore = Math.max(0, Math.min(1, (fire + turn * 0.5) / total));
  const waterScore = Math.max(0, Math.min(1, (water + turn * 0.5) / total));
  const balance = Math.max(-1, Math.min(1, fireScore - waterScore));

  return { waterScore, fireScore, balance };
}

export function inferUserPhase(text: string, v: WaterFireVector): KanagiPhase {
  const t = String(text || "");
  const hasQuestion = /[？?]/.test(t);
  const hasExclaim = /[！!]/.test(t);

  if (Math.abs(v.balance) < 0.08) return "CENTER";

  if (v.balance > 0) {
    return hasExclaim ? "L-OUT" : "R-OUT";
  }

  return hasQuestion ? "R-IN" : "L-IN";
}

export function inferArkTargetPhase(userPhase: KanagiPhase): KanagiPhase {
  switch (userPhase) {
    case "L-OUT": return "R-IN";
    case "R-OUT": return "L-IN";
    case "L-IN": return "R-OUT";
    case "R-IN": return "L-OUT";
    default: return "CENTER";
  }
}

export function computeEntropy(v: WaterFireVector): number {
  const d = Math.abs(v.balance);
  return Math.max(0, Math.min(1, 1 - d));
}

export function computeHeartState(text: string): HeartState {
  const userVector = computeWaterFireVector(text);
  const userPhase = inferUserPhase(text, userVector);
  const arkTargetPhase = inferArkTargetPhase(userPhase);
  const entropy = computeEntropy(userVector);
  return { userPhase, userVector, arkTargetPhase, entropy };
}
