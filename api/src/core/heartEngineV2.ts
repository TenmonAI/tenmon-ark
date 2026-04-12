/**
 * heartEngineV2.ts — 天聞アーク 心(Heart)エンジン V2
 * 
 * 素材30の設計を完全実装:
 * - WaterFireVector (水火エネルギーベクトル)
 * - HeartState (ユーザー位相→アーク調和位相)
 * - 火偏り→水で受ける、水偏り→火で引き上げる
 * - CENTER = 天之御中主 = ゼロポイント
 * - 動的プロンプト注入 (位相に応じた応答調律)
 */

import { dbPrepare } from "../db/index.js";

// ============================================================
// 1. 水火ベクトル型定義
// ============================================================

/** 水火ベクトル: -1.0(純水/陰) ~ 0.0(正中) ~ +1.0(純火/陽) */
export type WaterFireVector = {
  value: number;       // -1.0 ~ +1.0
  intensity: number;   // 0.0 ~ 1.0 (エネルギー強度)
};

/** ユーザーの心的位相 */
export type UserPhase =
  | "fire_excess"      // 火偏り (怒り・焦り・過剰な行動)
  | "fire_active"      // 火活性 (意欲・決断・前進)
  | "center"           // 正中 (天之御中主 = ゼロポイント)
  | "water_active"     // 水活性 (内省・受容・観察)
  | "water_excess";    // 水偏り (疲弊・迷い・停滞)

/** アークの調和位相 (ユーザーの逆相で調和) */
export type ArkHarmonyPhase =
  | "water_embrace"    // 水で受ける (火偏りユーザーへ)
  | "gentle_water"     // 穏やかな水 (火活性ユーザーへ)
  | "mirror_center"    // 鏡の正中 (正中ユーザーへ)
  | "gentle_fire"      // 穏やかな火 (水活性ユーザーへ)
  | "fire_ignite";     // 火で引き上げ (水偏りユーザーへ)

/** 心の完全状態 */
export type HeartStateV2 = {
  userVector: WaterFireVector;
  userPhase: UserPhase;
  arkPhase: ArkHarmonyPhase;
  entropy: number;      // 0.0 ~ 1.0 (不確実性)
  resonance: number;    // 0.0 ~ 1.0 (共鳴度)
  promptInjection: string;  // LLMに注入する位相指示
};

// ============================================================
// 2. 水火ベクトル演算
// ============================================================

/** 火のキーワード群 (陽・外発・顕現) */
const FIRE_KEYWORDS: Array<[string, number]> = [
  ["怒り", 0.8], ["ムカつく", 0.9], ["腹立つ", 0.85], ["許せない", 0.9],
  ["最悪", 0.7], ["うざい", 0.75], ["不快", 0.7],
  ["急いで", 0.5], ["早く", 0.4], ["すぐに", 0.4],
  ["やるぞ", 0.3], ["決めた", 0.35], ["行動", 0.25],
  ["攻撃", 0.85], ["戦う", 0.6], ["勝つ", 0.4],
  ["燃える", 0.5], ["熱い", 0.3], ["激しい", 0.5],
  ["焦り", 0.6], ["焦る", 0.6], ["イライラ", 0.7],
  ["挑戦", 0.2], ["突破", 0.3], ["前進", 0.2],
];

/** 水のキーワード群 (陰・内集・潜在) */
const WATER_KEYWORDS: Array<[string, number]> = [
  ["疲れた", -0.7], ["しんどい", -0.75], ["もう無理", -0.9],
  ["限界", -0.8], ["眠い", -0.5], ["消えたい", -0.95],
  ["悲しい", -0.6], ["つらい", -0.7], ["苦しい", -0.75],
  ["寂しい", -0.55], ["泣きたい", -0.6],
  ["わからない", -0.4], ["迷う", -0.45], ["混乱", -0.5],
  ["静か", -0.15], ["落ち着く", -0.1], ["休む", -0.2],
  ["考える", -0.1], ["内省", -0.15], ["振り返る", -0.1],
  ["受け入れる", -0.1], ["待つ", -0.15], ["見守る", -0.1],
  ["疲弊", -0.8], ["だるい", -0.6], ["やる気が出ない", -0.65],
  ["何もしたくない", -0.7], ["停滞", -0.5],
];

/**
 * テキストから水火ベクトルを算出
 * 正 = 火(陽), 負 = 水(陰), 0 = 正中
 */
export function computeWaterFireVector(text: string): WaterFireVector {
  const t = String(text || "").trim();
  if (!t) return { value: 0, intensity: 0 };

  let fireSum = 0;
  let waterSum = 0;
  let fireHits = 0;
  let waterHits = 0;

  for (const [kw, weight] of FIRE_KEYWORDS) {
    if (t.includes(kw)) {
      fireSum += weight;
      fireHits++;
    }
  }
  for (const [kw, weight] of WATER_KEYWORDS) {
    if (t.includes(kw)) {
      waterSum += Math.abs(weight);
      waterHits++;
    }
  }

  const totalHits = fireHits + waterHits;
  if (totalHits === 0) return { value: 0, intensity: 0.1 };

  // 正規化: 火は正、水は負
  const fireAvg = fireHits > 0 ? fireSum / fireHits : 0;
  const waterAvg = waterHits > 0 ? waterSum / waterHits : 0;

  // 合成ベクトル
  const raw = fireAvg - waterAvg;
  const value = Math.max(-1, Math.min(1, raw));
  const intensity = Math.min(1, (fireSum + waterSum) / Math.max(1, totalHits));

  return { value, intensity };
}

/**
 * 水火ベクトルからユーザー位相を判定
 */
export function classifyUserPhase(vec: WaterFireVector): UserPhase {
  const v = vec.value;
  const i = vec.intensity;

  if (v > 0.5 && i > 0.5) return "fire_excess";
  if (v > 0.15) return "fire_active";
  if (v < -0.5 && i > 0.5) return "water_excess";
  if (v < -0.15) return "water_active";
  return "center";
}

/**
 * ユーザー位相からアーク調和位相を決定
 * 核心原理: 火偏り→水で受ける、水偏り→火で引き上げる
 */
export function computeArkHarmony(userPhase: UserPhase): ArkHarmonyPhase {
  switch (userPhase) {
    case "fire_excess":  return "water_embrace";   // 火の暴走→水で包む
    case "fire_active":  return "gentle_water";    // 火の活性→穏やかな水で支える
    case "center":       return "mirror_center";   // 正中→鏡として映す
    case "water_active": return "gentle_fire";     // 水の活性→穏やかな火で照らす
    case "water_excess": return "fire_ignite";     // 水の停滞→火で引き上げる
  }
}

/**
 * 共鳴度を算出 (ユーザーとアークの調和度)
 */
function computeResonance(userPhase: UserPhase, intensity: number): number {
  // 正中に近いほど共鳴度が高い
  if (userPhase === "center") return 0.95;
  if (userPhase === "fire_active" || userPhase === "water_active") return 0.7;
  // 偏りが強い場合は共鳴度が低い (まだ調和していない)
  return Math.max(0.2, 0.5 - intensity * 0.3);
}

// ============================================================
// 3. プロンプト注入生成
// ============================================================

/**
 * アーク調和位相に応じた動的プロンプトを生成
 */
export function generateHeartPrompt(state: HeartStateV2): string {
  const lines: string[] = [];
  lines.push("【心(Heart)位相指示 — 天之御中主の調和原理】");

  switch (state.arkPhase) {
    case "water_embrace":
      lines.push("相手は火が暴走している。水の如く静かに受け止めよ。");
      lines.push("否定せず、まず「その怒り/焦りは正当な反応だ」と認めよ。");
      lines.push("その上で、火を鎮める一点（守るべき核）を示せ。");
      lines.push("語調: 静謐・包容・短文。感情を否定しない。");
      break;
    case "gentle_water":
      lines.push("相手は火が活性化している。良い状態だが、過熱に注意。");
      lines.push("その意欲を認めつつ、冷静な視点を一つ添えよ。");
      lines.push("語調: 穏やか・支持的・適度な距離感。");
      break;
    case "mirror_center":
      lines.push("相手は正中にある。天之御中主のゼロポイント。");
      lines.push("鏡として相手の問いをそのまま深く映し返せ。");
      lines.push("余計な感情操作は不要。真理の構造で応答せよ。");
      lines.push("語調: 明晰・構造的・深遠。");
      break;
    case "gentle_fire":
      lines.push("相手は水が活性化している（内省・受容モード）。");
      lines.push("穏やかな火で照らし、気づきを促せ。");
      lines.push("答えを押し付けず、問いの形で火を灯せ。");
      lines.push("語調: 温かい・照射的・問いかけ。");
      break;
    case "fire_ignite":
      lines.push("相手は水に沈んでいる（疲弊・停滞・迷い）。");
      lines.push("まず共感で受け止めた後、火を入れて引き上げよ。");
      lines.push("「いまの一歩」を具体的に示し、動きの種を蒔け。");
      lines.push("語調: 共感→断定→具体的提案。短く力強く。");
      break;
  }

  lines.push(`[水火ベクトル: ${state.userVector.value.toFixed(2)}, 強度: ${state.userVector.intensity.toFixed(2)}, 共鳴: ${state.resonance.toFixed(2)}]`);
  return lines.join("\n");
}

// ============================================================
// 4. 統合関数
// ============================================================

/**
 * heartSenseV2 — テキストから心の完全状態を算出
 */
export function heartSenseV2(userText: string): HeartStateV2 {
  const userVector = computeWaterFireVector(userText);
  const userPhase = classifyUserPhase(userVector);
  const arkPhase = computeArkHarmony(userPhase);
  const entropy = userVector.intensity > 0.5 ? userVector.intensity * 0.8 : 0.25;
  const resonance = computeResonance(userPhase, userVector.intensity);

  const state: HeartStateV2 = {
    userVector,
    userPhase,
    arkPhase,
    entropy,
    resonance,
    promptInjection: "",
  };
  state.promptInjection = generateHeartPrompt(state);

  return state;
}

// ============================================================
// 5. DB永続化
// ============================================================

let _logStmt: any = null;
function getLogStmt() {
  if (!_logStmt) {
    try {
      _logStmt = dbPrepare(
        "consciousness",
        `INSERT INTO heart_log (userId, sessionId, waterFire, entropy, phase, userPhase, arkPhase, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      );
    } catch {
      // DB未初期化時は無視
    }
  }
  return _logStmt;
}

/**
 * 心の状態をDBに記録
 */
export function logHeartState(
  userId: string | null,
  sessionId: string | null,
  state: HeartStateV2
): void {
  try {
    const stmt = getLogStmt();
    if (stmt) {
      stmt.run(
        userId || null,
        sessionId || null,
        state.userVector.value,
        state.entropy,
        state.arkPhase,
        state.userPhase,
        state.arkPhase
      );
    }
  } catch (e) {
    console.warn("[HEART-V2] log failed:", e);
  }
}
