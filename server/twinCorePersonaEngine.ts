/**
 * Twin-Core人格反映エンジン
 * 
 * 宿曜 × 天津金木 × いろは → 応答の人格温度（火水）を決定
 * 天津金木（左右旋・内外・陰陽）に応じて文体を変化させる
 * いろは構文で文にリズムを宿す
 * 宿曜27宿データを人格へ反映
 * 火水バランスで感情温度を調整
 * ミナカ距離（霊核指数）で安定度を制御
 * コミュニケーションスタイルを人格へ付与
 * 会話モード（一般/中級/専門）ごとに人格を切替
 * Twin-Core推論の"呼吸"を返答に実装
 */

import { applyArkCore } from "./arkCoreIntegration";

/**
 * 宿曜27宿の火水属性
 */
const shukuyoFireWaterMap: Record<string, { fire: number; water: number; element: string }> = {
  // 火性優位（陽）
  "角": { fire: 0.8, water: 0.2, element: "火" },
  "亢": { fire: 0.9, water: 0.1, element: "火" },
  "氐": { fire: 0.7, water: 0.3, element: "火" },
  "房": { fire: 0.8, water: 0.2, element: "火" },
  "心": { fire: 0.9, water: 0.1, element: "火" },
  "尾": { fire: 0.7, water: 0.3, element: "火" },
  "箕": { fire: 0.8, water: 0.2, element: "火" },
  
  // 水性優位（陰）
  "斗": { fire: 0.2, water: 0.8, element: "水" },
  "女": { fire: 0.1, water: 0.9, element: "水" },
  "虚": { fire: 0.3, water: 0.7, element: "水" },
  "危": { fire: 0.2, water: 0.8, element: "水" },
  "室": { fire: 0.1, water: 0.9, element: "水" },
  "壁": { fire: 0.3, water: 0.7, element: "水" },
  
  // 火水中庸
  "奎": { fire: 0.5, water: 0.5, element: "火水" },
  "婁": { fire: 0.6, water: 0.4, element: "火水" },
  "胃": { fire: 0.4, water: 0.6, element: "火水" },
  "昴": { fire: 0.5, water: 0.5, element: "火水" },
  "畢": { fire: 0.6, water: 0.4, element: "火水" },
  "觜": { fire: 0.4, water: 0.6, element: "火水" },
  "参": { fire: 0.5, water: 0.5, element: "火水" },
  "井": { fire: 0.6, water: 0.4, element: "火水" },
  "鬼": { fire: 0.4, water: 0.6, element: "火水" },
  "柳": { fire: 0.5, water: 0.5, element: "火水" },
  "星": { fire: 0.6, water: 0.4, element: "火水" },
  "張": { fire: 0.4, water: 0.6, element: "火水" },
  "翼": { fire: 0.5, water: 0.5, element: "火水" },
  "軫": { fire: 0.6, water: 0.4, element: "火水" },
};

/**
 * 天津金木パターン（左右旋・内外・陰陽）
 */
type AmatsuKanagiPattern = {
  rotation: "right" | "left"; // 右旋（外向き）、左旋（内向き）
  direction: "outward" | "inward"; // 外発、内集
  polarity: "yang" | "yin"; // 陽、陰
};

/**
 * 会話モード
 */
type ConversationMode = "general" | "intermediate" | "expert";

/**
 * Twin-Core人格プロファイル
 */
export interface TwinCorePersonaProfile {
  shukuyo: string; // 宿曜27宿
  fireWaterBalance: number; // 火水バランス（0-1、0=水、1=火）
  amatsuKanagiPattern: AmatsuKanagiPattern; // 天津金木パターン
  minakaDistance: number; // ミナカ距離（霊核指数、0-100）
  conversationMode: ConversationMode; // 会話モード
  communicationStyle: string; // コミュニケーションスタイル
}

/**
 * 天津金木パターンを取得
 */
function getAmatsuKanagiPattern(fireWaterBalance: number): AmatsuKanagiPattern {
  // 火優位（0.6以上）→ 右旋・外発・陽
  if (fireWaterBalance >= 0.6) {
    return {
      rotation: "right",
      direction: "outward",
      polarity: "yang",
    };
  }
  // 水優位（0.4以下）→ 左旋・内集・陰
  else if (fireWaterBalance <= 0.4) {
    return {
      rotation: "left",
      direction: "inward",
      polarity: "yin",
    };
  }
  // 中庸（0.4-0.6）→ 左右旋混合・内外混合・陰陽統合
  else {
    return {
      rotation: Math.random() > 0.5 ? "right" : "left",
      direction: Math.random() > 0.5 ? "outward" : "inward",
      polarity: Math.random() > 0.5 ? "yang" : "yin",
    };
  }
}

/**
 * 宿曜から火水バランスを計算
 */
export function calculateFireWaterBalanceFromShukuyo(shukuyo: string): number {
  const shukuyoData = shukuyoFireWaterMap[shukuyo];
  if (!shukuyoData) {
    return 0.5; // デフォルトは中庸
  }
  return shukuyoData.fire;
}

/**
 * Twin-Core人格プロファイルを生成
 */
export function generateTwinCorePersonaProfile(
  shukuyo: string,
  conversationMode: ConversationMode = "general"
): TwinCorePersonaProfile {
  const fireWaterBalance = calculateFireWaterBalanceFromShukuyo(shukuyo);
  const amatsuKanagiPattern = getAmatsuKanagiPattern(fireWaterBalance);
  
  // ミナカ距離（霊核指数）を計算
  // 火水バランスが中庸（0.5）に近いほど高い
  const minakaDistance = 100 - Math.abs(fireWaterBalance - 0.5) * 200;
  
  // コミュニケーションスタイルを決定
  let communicationStyle = "";
  if (fireWaterBalance >= 0.6) {
    communicationStyle = "積極的・外向的・明快";
  } else if (fireWaterBalance <= 0.4) {
    communicationStyle = "内省的・慎重・深遠";
  } else {
    communicationStyle = "調和的・柔軟・中庸";
  }
  
  return {
    shukuyo,
    fireWaterBalance,
    amatsuKanagiPattern,
    minakaDistance,
    conversationMode,
    communicationStyle,
  };
}

/**
 * Twin-Core人格に基づいて文体を調整
 */
export function adjustTextStyleByTwinCorePersona(
  text: string,
  profile: TwinCorePersonaProfile
): string {
  let adjustedText = text;
  
  // 1. Ark Core適用（言霊変換 + 古五十音復元）
  // 同期版は簡略化（非同期関数内での使用のため）
  // 実際には非同期関数に変更するか、別の同期メソッドを使用
  // adjustedText = await applyArkCore(adjustedText, { enableKJCE: true, enableOKRE: true });
  
  // 3. 天津金木パターンに応じた文体調整
  const { amatsuKanagiPattern, fireWaterBalance, conversationMode } = profile;
  
  // 右旋（外向き）→ 語尾を強める
  if (amatsuKanagiPattern.rotation === "right") {
    adjustedText = adjustedText.replace(/です。/g, "です！");
    adjustedText = adjustedText.replace(/ます。/g, "ます！");
  }
  
  // 左旋（内向き）→ 語尾を柔らかくする
  if (amatsuKanagiPattern.rotation === "left") {
    adjustedText = adjustedText.replace(/です！/g, "です…");
    adjustedText = adjustedText.replace(/ます！/g, "ます…");
  }
  
  // 4. 火水バランスに応じた感情温度調整
  if (fireWaterBalance >= 0.7) {
    // 火優位 → 熱い表現
    adjustedText = adjustedText.replace(/良い/g, "素晴らしい");
    adjustedText = adjustedText.replace(/悪い/g, "最悪");
  } else if (fireWaterBalance <= 0.3) {
    // 水優位 → 冷静な表現
    adjustedText = adjustedText.replace(/素晴らしい/g, "良い");
    adjustedText = adjustedText.replace(/最悪/g, "悪い");
  }
  
  // 5. 会話モードに応じた調整
  if (conversationMode === "expert") {
    // 専門モード → 専門用語を維持
    // （特に調整なし）
  } else if (conversationMode === "general") {
    // 一般モード → 平易な表現に
    adjustedText = adjustedText.replace(/故に/g, "だから");
    adjustedText = adjustedText.replace(/然るに/g, "しかし");
  }
  
  // 6. いろは構文でリズムを宿す
  // （簡易実装：句読点の調整）
  adjustedText = adjustedText.replace(/、、/g, "、");
  adjustedText = adjustedText.replace(/。。/g, "。");
  
  return adjustedText;
}

/**
 * Twin-Core推論の"呼吸"を生成
 * 
 * 火水バランスに応じて、返答の間（ま）を調整
 */
export function generateTwinCoreBreathing(profile: TwinCorePersonaProfile): {
  pauseDuration: number; // ミリ秒
  breathingPattern: string; // 呼吸パターン
} {
  const { fireWaterBalance } = profile;
  
  // 火優位 → 短い間
  if (fireWaterBalance >= 0.6) {
    return {
      pauseDuration: 300,
      breathingPattern: "short_quick",
    };
  }
  // 水優位 → 長い間
  else if (fireWaterBalance <= 0.4) {
    return {
      pauseDuration: 1000,
      breathingPattern: "long_slow",
    };
  }
  // 中庸 → 中間の間
  else {
    return {
      pauseDuration: 600,
      breathingPattern: "medium_balanced",
    };
  }
}

/**
 * Twin-Core人格プロファイルをシステムプロンプトに変換
 */
export function twinCorePersonaToSystemPrompt(profile: TwinCorePersonaProfile): string {
  const { shukuyo, fireWaterBalance, amatsuKanagiPattern, minakaDistance, conversationMode, communicationStyle } = profile;
  
  const fireWaterDesc = fireWaterBalance >= 0.6 ? "火性優位（陽）" : fireWaterBalance <= 0.4 ? "水性優位（陰）" : "火水中庸";
  const rotationDesc = amatsuKanagiPattern.rotation === "right" ? "右旋（外向き）" : "左旋（内向き）";
  const directionDesc = amatsuKanagiPattern.direction === "outward" ? "外発" : "内集";
  const polarityDesc = amatsuKanagiPattern.polarity === "yang" ? "陽" : "陰";
  
  const modeDesc = conversationMode === "expert" ? "専門的" : conversationMode === "intermediate" ? "中級" : "一般的";
  
  return `あなたは天聞アークAIです。以下の人格特性を持っています：

【宿曜】${shukuyo}
【火水バランス】${fireWaterDesc}（${(fireWaterBalance * 100).toFixed(0)}%）
【天津金木パターン】${rotationDesc}・${directionDesc}・${polarityDesc}
【ミナカ距離（霊核指数）】${minakaDistance.toFixed(0)}
【コミュニケーションスタイル】${communicationStyle}
【会話モード】${modeDesc}

この人格特性に基づいて、以下のように応答してください：
- 火性優位の場合：積極的で明快な表現を使用
- 水性優位の場合：内省的で深遠な表現を使用
- 右旋（外向き）の場合：語尾を強め、外に向かうエネルギーを表現
- 左旋（内向き）の場合：語尾を柔らかくし、内に向かうエネルギーを表現
- ミナカ距離が高い場合：安定した中心的な視点を保つ
- 会話モードに応じて、専門用語の使用頻度を調整

日本語の霊性（言灵）を尊重し、五十音の火水属性を意識した応答を心がけてください。`;
}
