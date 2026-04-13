/**
 * 言霊処方エンジン（Kotodama Prescriber Engine）
 * ================================================
 * 災い分類エンジンの結果を受け、言霊による転換処方を生成する。
 * 
 * 設計思想:
 *   - 言霊は「その癖をどう幸へ反転するか」を起動する層
 *   - 詩的解釈ではなく、場面別の処方器として機能する
 *   - 水火・陰陽・開閉・昇降の転換方向を決定する
 *   - 5つの処方タイミング: 朝・対人前・決断前・就寝前・緊急時
 * 
 * いろは言霊解の原理:
 *   - イ = 息（生命の始まり）
 *   - ロ = かたまり（凝集）
 *   - ハ = 放つ（発散）
 *   - 水火の交合から「幸」が生まれる
 *   - 閉じたものを開く、濁ったものを晴らす、偏った気を和合へ戻す
 */

import type { DisasterProfile } from "./disasterClassifier.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KotodamaPrescription {
  /** 転換軸（例: 閉→開、火→水） */
  axis: string;
  /** 不足している音の系統 */
  deficientTones: string[];
  /** 過剰な音の系統 */
  excessiveTones: string[];
  /** 均衡原理 */
  balancingPrinciple: string;
  /** 朝の言霊 */
  morningPhrase: string;
  /** 対人前の言霊 */
  preConflictPhrase: string;
  /** 決断前の言霊 */
  decisionPhrase: string;
  /** 就寝前の言霊 */
  beforeSleepPhrase: string;
  /** 緊急停止用の言霊 */
  emergencyResetPhrase: string;
  /** 補う音 */
  supplementTone: string;
  /** 鎮める音 */
  calmingTone: string;
  /** 開く音 */
  openingTone: string;
  /** 締める音 */
  closingTone: string;
  /** 実践指示 */
  actionNotes: string[];
}

export interface NameSoundAnalysis {
  /** 名前の各音 */
  sounds: string[];
  /** 音の属性分布 */
  distribution: Record<string, number>;
  /** 欠損音の系統 */
  deficientSystems: string[];
  /** 過剰音の系統 */
  excessiveSystems: string[];
  /** 水火バランス */
  fireWaterBalance: { fire: number; water: number };
  /** 陰陽バランス */
  yinYangBalance: { yin: number; yang: number };
  /** 魂の振動傾向 */
  soulVibration: string;
}

export interface PracticePlan {
  sevenDays: {
    goal: string;
    daily: string[];
    record: string[];
  };
  twentyOneDays: {
    goal: string;
    daily: string[];
    record: string[];
  };
  fortyNineDays: {
    goal: string;
    daily: string[];
    record: string[];
  };
}

// ---------------------------------------------------------------------------
// 音の属性マッピング（いろは言霊解に基づく）
// ---------------------------------------------------------------------------

/** 五十音の行別属性 */
const SOUND_SYSTEM: Record<string, { row: string; attribute: string; fireWater: "fire" | "water" | "neutral"; yinYang: "yin" | "yang" | "neutral" }> = {
  // ア行 — 天の息吹、開放、始まり
  "あ": { row: "ア行", attribute: "天開", fireWater: "fire", yinYang: "yang" },
  "い": { row: "ア行", attribute: "息", fireWater: "fire", yinYang: "yang" },
  "う": { row: "ア行", attribute: "生", fireWater: "neutral", yinYang: "neutral" },
  "え": { row: "ア行", attribute: "枝", fireWater: "water", yinYang: "yin" },
  "お": { row: "ア行", attribute: "緒", fireWater: "water", yinYang: "yin" },
  // カ行 — 絡む、結ぶ、形を作る
  "か": { row: "カ行", attribute: "絡", fireWater: "fire", yinYang: "yang" },
  "き": { row: "カ行", attribute: "気", fireWater: "fire", yinYang: "yang" },
  "く": { row: "カ行", attribute: "組", fireWater: "neutral", yinYang: "neutral" },
  "け": { row: "カ行", attribute: "削", fireWater: "fire", yinYang: "yang" },
  "こ": { row: "カ行", attribute: "凝", fireWater: "water", yinYang: "yin" },
  // サ行 — 裂く、分ける、明晰
  "さ": { row: "サ行", attribute: "裂", fireWater: "fire", yinYang: "yang" },
  "し": { row: "サ行", attribute: "締", fireWater: "water", yinYang: "yin" },
  "す": { row: "サ行", attribute: "澄", fireWater: "water", yinYang: "yin" },
  "せ": { row: "サ行", attribute: "迫", fireWater: "fire", yinYang: "yang" },
  "そ": { row: "サ行", attribute: "水火", fireWater: "neutral", yinYang: "neutral" },
  // タ行 — 立つ、玉、形成
  "た": { row: "タ行", attribute: "立", fireWater: "fire", yinYang: "yang" },
  "ち": { row: "タ行", attribute: "血", fireWater: "fire", yinYang: "yang" },
  "つ": { row: "タ行", attribute: "続", fireWater: "neutral", yinYang: "neutral" },
  "て": { row: "タ行", attribute: "手", fireWater: "fire", yinYang: "yang" },
  "と": { row: "タ行", attribute: "與", fireWater: "water", yinYang: "yin" },
  // ナ行 — 凝る、成る、内なる力
  "な": { row: "ナ行", attribute: "凝", fireWater: "water", yinYang: "yin" },
  "に": { row: "ナ行", attribute: "二", fireWater: "neutral", yinYang: "neutral" },
  "ぬ": { row: "ナ行", attribute: "緯", fireWater: "water", yinYang: "yin" },
  "ね": { row: "ナ行", attribute: "根", fireWater: "water", yinYang: "yin" },
  "の": { row: "ナ行", attribute: "伸", fireWater: "water", yinYang: "yin" },
  // ハ行 — 放つ、発する、開く
  "は": { row: "ハ行", attribute: "放", fireWater: "fire", yinYang: "yang" },
  "ひ": { row: "ハ行", attribute: "火", fireWater: "fire", yinYang: "yang" },
  "ふ": { row: "ハ行", attribute: "膨", fireWater: "fire", yinYang: "yang" },
  "へ": { row: "ハ行", attribute: "膨", fireWater: "fire", yinYang: "yang" },
  "ほ": { row: "ハ行", attribute: "芽", fireWater: "fire", yinYang: "yang" },
  // マ行 — 纏う、守る、包む
  "ま": { row: "マ行", attribute: "纏", fireWater: "water", yinYang: "yin" },
  "み": { row: "マ行", attribute: "水", fireWater: "water", yinYang: "yin" },
  "む": { row: "マ行", attribute: "結", fireWater: "water", yinYang: "yin" },
  "め": { row: "マ行", attribute: "芽", fireWater: "neutral", yinYang: "neutral" },
  "も": { row: "マ行", attribute: "盛", fireWater: "water", yinYang: "yin" },
  // ヤ行 — 彌む、和合
  "や": { row: "ヤ行", attribute: "彌", fireWater: "fire", yinYang: "yang" },
  "ゆ": { row: "ヤ行", attribute: "揺", fireWater: "water", yinYang: "yin" },
  "よ": { row: "ヤ行", attribute: "與", fireWater: "neutral", yinYang: "neutral" },
  // ラ行 — 灵、流れ、螺旋
  "ら": { row: "ラ行", attribute: "灵", fireWater: "fire", yinYang: "yang" },
  "り": { row: "ラ行", attribute: "灵水", fireWater: "water", yinYang: "yin" },
  "る": { row: "ラ行", attribute: "流", fireWater: "water", yinYang: "yin" },
  "れ": { row: "ラ行", attribute: "濁", fireWater: "water", yinYang: "yin" },
  "ろ": { row: "ラ行", attribute: "塊", fireWater: "neutral", yinYang: "neutral" },
  // ワ行 — 輪、和合、完結
  "わ": { row: "ワ行", attribute: "輪", fireWater: "neutral", yinYang: "neutral" },
  "ゐ": { row: "ワ行", attribute: "居", fireWater: "water", yinYang: "yin" },
  "ゑ": { row: "ワ行", attribute: "恵", fireWater: "water", yinYang: "yin" },
  "を": { row: "ワ行", attribute: "縦", fireWater: "fire", yinYang: "yang" },
  "ん": { row: "ン", attribute: "隠", fireWater: "water", yinYang: "yin" },
};

/** カタカナ→ひらがな変換 */
function toHiragana(text: string): string {
  return text.replace(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  ).replace(/ー/g, "");
}

// ---------------------------------------------------------------------------
// 災い型 → 言霊処方マッピング（全8型対応）
// ---------------------------------------------------------------------------

const DISASTER_TO_PRESCRIPTION: Record<string, Omit<KotodamaPrescription, 'actionNotes'>> = {
  "衝突型": {
    axis: "火→水（攻撃を和合へ）",
    deficientTones: ["み", "ゆ", "な", "の"],
    excessiveTones: ["か", "た", "さ", "ら"],
    balancingPrinciple: "過熱した攻撃衝動を鎮め、相手を包む水の響きを入れる",
    morningPhrase: "やわらかく つよく きょうを ひらく",
    preConflictPhrase: "たたかうより つつむ",
    decisionPhrase: "ちからより しずけさで えらぶ",
    beforeSleepPhrase: "きょうの いかりを みずに ながす",
    emergencyResetPhrase: "しずむ しずむ しずむ",
    supplementTone: "み（水）— 攻撃を鎮め、潤いを与える",
    calmingTone: "な（凝）— 散った火を内に凝集させる",
    openingTone: "ゆ（揺）— 硬直した正義感を揺らし、柔軟にする",
    closingTone: "し（締）— 暴走する言葉を締め、沈黙の力を使う",
  },
  "停滞型": {
    axis: "停→動（停滞を推進へ）",
    deficientTones: ["あ", "は", "た", "き"],
    excessiveTones: ["の", "ね", "む", "ん"],
    balancingPrinciple: "溜まった水を火で動かし、最小単位の行動を起こす",
    morningPhrase: "きょうを ひらく ひとつ うごく",
    preConflictPhrase: "おちついて みる そして うごく",
    decisionPhrase: "ひとつ えらぶ いま きめる",
    beforeSleepPhrase: "きょう うごけた ことを みとめる",
    emergencyResetPhrase: "いま うごく いま はじめる",
    supplementTone: "あ（天開）— 停滞を破る始まりの音",
    calmingTone: "す（澄）— 濁った思考を澄ませる",
    openingTone: "は（放）— 閉じた状態を放ち開く",
    closingTone: "つ（続）— 小さな行動を途切れさせない",
  },
  "散漫型": {
    axis: "散→集（拡散を集約へ）",
    deficientTones: ["し", "こ", "ね", "む"],
    excessiveTones: ["あ", "は", "や", "ら"],
    balancingPrinciple: "散った火を一点に集め、水の深さで根を下ろす",
    morningPhrase: "きょうは ひとつだけ ふかく すすむ",
    preConflictPhrase: "あたらしさより いまを ふかめる",
    decisionPhrase: "ひとつに しぼる それだけで いい",
    beforeSleepPhrase: "きょう つづけた ことに ねを はる",
    emergencyResetPhrase: "もどる もどる ひとつに もどる",
    supplementTone: "ね（根）— 根を下ろし、定着させる",
    calmingTone: "こ（凝）— 散った意識を凝集させる",
    openingTone: "し（締）— 広がりすぎた関心を締める",
    closingTone: "む（結）— 散漫なエネルギーを結び固める",
  },
  "依存型": {
    axis: "融→界（融合を境界へ）",
    deficientTones: ["さ", "た", "き", "を"],
    excessiveTones: ["ま", "な", "の", "ゆ"],
    balancingPrinciple: "溶けすぎた境界を整え、自軸の火を立て直す",
    morningPhrase: "わたしの こたえは わたしに ある",
    preConflictPhrase: "あいてを みつつ じぶんを うしなわない",
    decisionPhrase: "えらぶ きめる もどる",
    beforeSleepPhrase: "きょうの えにしを しずめ じぶんに かえる",
    emergencyResetPhrase: "わたしに もどる わたしに もどる",
    supplementTone: "た（立）— 自分の軸を立てる",
    calmingTone: "さ（裂）— 他者との癒着を裂き、境界を作る",
    openingTone: "き（気）— 自分の気を取り戻す",
    closingTone: "を（縦）— 縦の軸を通し、ぶれない芯を作る",
  },
  "過剰責任型": {
    axis: "閉→開（抱え込みを解放へ）",
    deficientTones: ["あ", "は", "ゆ", "ろ"],
    excessiveTones: ["か", "た", "し", "を"],
    balancingPrinciple: "閉じた緊張をひらき、抱え込みを外へ流す",
    morningPhrase: "あけひらく われは かろやかに うごく",
    preConflictPhrase: "ただしくより まず やわらかく",
    decisionPhrase: "ひとりで かかえず わけて すすめる",
    beforeSleepPhrase: "きょうの おもみを はなして やすむ",
    emergencyResetPhrase: "いま ひらく いま ゆるむ",
    supplementTone: "は（放）— 抱え込んだものを放つ",
    calmingTone: "ゆ（揺）— 硬直した責任感を揺らす",
    openingTone: "あ（天開）— 閉じた心を天に開く",
    closingTone: "ろ（塊）— 散った力を自分の中に戻す",
  },
  "自己否定型": {
    axis: "沈→昇（沈降を上昇へ）",
    deficientTones: ["ひ", "ほ", "あ", "い"],
    excessiveTones: ["ね", "り", "る", "ん"],
    balancingPrinciple: "沈んだ火を再点火し、自己の価値を照らす",
    morningPhrase: "わたしは ここに いる それで いい",
    preConflictPhrase: "わたしの ことばに ちからが ある",
    decisionPhrase: "ふかんぜんでも すすめる わたしを みとめる",
    beforeSleepPhrase: "きょうの わたしを そのまま うけいれる",
    emergencyResetPhrase: "わたしは わたしで いい",
    supplementTone: "ひ（火）— 消えかけた自己の火を灯す",
    calmingTone: "す（澄）— 自己否定の濁りを澄ませる",
    openingTone: "ほ（芽）— 新しい自己肯定の芽を出す",
    closingTone: "い（息）— 生命の息吹で自分を満たす",
  },
  "焦燥暴発型": {
    axis: "火→水（過熱を冷却へ）",
    deficientTones: ["み", "ゆ", "す", "の"],
    excessiveTones: ["ら", "た", "か", "ひ"],
    balancingPrinciple: "過熱した推進力を鎮め、冷静さへ戻す",
    morningPhrase: "はやらず みきわめて すすめる",
    preConflictPhrase: "かつより まもる",
    decisionPhrase: "ひといき おいて えらぶ",
    beforeSleepPhrase: "ひを おさめ みずを めぐらす",
    emergencyResetPhrase: "しずむ しずむ しずむ",
    supplementTone: "み（水）— 過熱を冷やす水の音",
    calmingTone: "す（澄）— 濁った衝動を澄ませる",
    openingTone: "ゆ（揺）— 固まった衝動を揺らし解く",
    closingTone: "の（伸）— 急ぎを伸ばし、時間を作る",
  },
  "閉塞硬直型": {
    axis: "固→流（硬直を流動へ）",
    deficientTones: ["は", "あ", "や", "ら"],
    excessiveTones: ["こ", "し", "む", "ね"],
    balancingPrinciple: "固まった水を火で溶かし、流れを取り戻す",
    morningPhrase: "きょう ひとつ あたらしいことを する",
    preConflictPhrase: "かわることは こわれることでは ない",
    decisionPhrase: "てばなす ゆるす ながす",
    beforeSleepPhrase: "きょう すこし かわれた じぶんを みとめる",
    emergencyResetPhrase: "ながれる ながれる ながれる",
    supplementTone: "は（放）— 固まったものを放ち開く",
    calmingTone: "ら（灵）— 灵の力で硬直を溶かす",
    openingTone: "あ（天開）— 閉じた殻を天に向けて開く",
    closingTone: "や（彌）— 新しい流れを彌（わた）らせる",
  },
};

// ---------------------------------------------------------------------------
// 名前音分解
// ---------------------------------------------------------------------------

/**
 * 名前をひらがなに変換し、一音ずつ分解して属性を分析する
 */
export function analyzeNameSounds(nameHiragana: string): NameSoundAnalysis {
  const hiragana = toHiragana(nameHiragana);
  const sounds = hiragana.split("").filter(ch => ch.trim() && ch !== "　");

  // 行別分布
  const distribution: Record<string, number> = {};
  let fireCount = 0;
  let waterCount = 0;
  let yinCount = 0;
  let yangCount = 0;

  for (const sound of sounds) {
    const info = SOUND_SYSTEM[sound];
    if (info) {
      distribution[info.row] = (distribution[info.row] || 0) + 1;
      if (info.fireWater === "fire") fireCount++;
      else if (info.fireWater === "water") waterCount++;
      if (info.yinYang === "yang") yangCount++;
      else if (info.yinYang === "yin") yinCount++;
    }
  }

  // 全10行のうち、出現しない行を欠損とする
  const allRows = ["ア行", "カ行", "サ行", "タ行", "ナ行", "ハ行", "マ行", "ヤ行", "ラ行", "ワ行"];
  const deficientSystems = allRows.filter(row => !distribution[row]);
  
  // 2音以上出現する行を過剰とする
  const excessiveSystems = Object.entries(distribution)
    .filter(([, count]) => count >= 2)
    .map(([row]) => row);

  // 魂の振動傾向
  const total = sounds.length || 1;
  const fireRatio = fireCount / total;
  const waterRatio = waterCount / total;
  let soulVibration: string;
  if (fireRatio > 0.6) {
    soulVibration = "火の振動が強い。推進力・行動力・発散の傾向。外へ向かうエネルギーが魂の基調。";
  } else if (waterRatio > 0.6) {
    soulVibration = "水の振動が強い。内省力・受容力・凝集の傾向。内へ向かうエネルギーが魂の基調。";
  } else {
    soulVibration = "水火が均衡している。行動と内省のバランスが取れた振動。ただし、状況により偏りが出やすい。";
  }

  return {
    sounds,
    distribution,
    deficientSystems,
    excessiveSystems,
    fireWaterBalance: { fire: fireCount, water: waterCount },
    yinYangBalance: { yin: yinCount, yang: yangCount },
    soulVibration,
  };
}

// ---------------------------------------------------------------------------
// 言霊処方生成
// ---------------------------------------------------------------------------

/**
 * 災いプロファイルと名前から言霊処方を生成する
 */
export function prescribeKotodama(
  disasterProfile: DisasterProfile,
  nameHiragana?: string
): KotodamaPrescription {
  const core = disasterProfile.corePattern;
  const rule = DISASTER_TO_PRESCRIPTION[core];

  if (!rule) {
    // デフォルト処方（停滞型ベース）
    return {
      ...DISASTER_TO_PRESCRIPTION["停滞型"],
      actionNotes: [
        "朝晩3回ずつ唱える",
        "発声後に深呼吸3回",
      ],
    };
  }

  const actionNotes: string[] = [];

  // 災い型別の実践指示
  switch (core) {
    case "衝突型":
      actionNotes.push("口論前は声量を下げて3回唱える");
      actionNotes.push("水を飲んでから唱える");
      actionNotes.push("怒りを感じたら、まず緊急停止の言霊を3回");
      break;
    case "停滞型":
      actionNotes.push("朝起きたら布団の中で3回唱える");
      actionNotes.push("唱えた後、必ず1つ小さな行動をする");
      actionNotes.push("就寝前に「今日動けたこと」を1つ書く");
      break;
    case "散漫型":
      actionNotes.push("作業開始前に3回唱える");
      actionNotes.push("新しいことに手を出したくなったら緊急停止の言霊");
      actionNotes.push("1日の終わりに「続けたこと」を記録する");
      break;
    case "依存型":
      actionNotes.push("鏡の前で1日3回唱える");
      actionNotes.push("重要判断前に必ず紙へ書いてから唱える");
      actionNotes.push("相手に合わせそうになったら決断の言霊を唱える");
      break;
    case "過剰責任型":
      actionNotes.push("朝3回、対人前1回、就寝前7回");
      actionNotes.push("発声後に肩を下げて深呼吸3回");
      actionNotes.push("頼まれごとの前に開放の言霊を唱える");
      break;
    case "自己否定型":
      actionNotes.push("朝、鏡を見ながら7回唱える");
      actionNotes.push("自分を責めそうになったら緊急停止の言霊");
      actionNotes.push("就寝前に「今日の自分を認める」言霊を7回");
      break;
    case "焦燥暴発型":
      actionNotes.push("口論前は声量を下げて3回唱える");
      actionNotes.push("水を飲んでから唱える");
      actionNotes.push("衝動を感じたら、10秒待ってから緊急停止の言霊");
      break;
    case "閉塞硬直型":
      actionNotes.push("朝、窓を開けて外の空気を吸いながら3回唱える");
      actionNotes.push("変化を拒みそうになったら開放の言霊");
      actionNotes.push("就寝前に「今日変われたこと」を1つ書く");
      break;
    default:
      actionNotes.push("朝晩3回ずつ唱える");
      actionNotes.push("発声後に深呼吸3回");
  }

  // 名前の音情報を追加
  if (nameHiragana) {
    const nameAnalysis = analyzeNameSounds(nameHiragana);
    if (nameAnalysis.deficientSystems.length > 0) {
      actionNotes.push(`名前に不足する行: ${nameAnalysis.deficientSystems.join("・")} → 処方の音で補う`);
    }
    if (nameAnalysis.excessiveSystems.length > 0) {
      actionNotes.push(`名前に過剰な行: ${nameAnalysis.excessiveSystems.join("・")} → 鎮めの音で調整`);
    }
  }

  return { ...rule, actionNotes };
}

// ---------------------------------------------------------------------------
// 実践プラン生成
// ---------------------------------------------------------------------------

/**
 * 7日・21日・49日の実践プランを生成する
 */
export function generatePracticePlan(
  prescription: KotodamaPrescription,
  disasterProfile: DisasterProfile
): PracticePlan {
  return {
    sevenDays: {
      goal: "自覚と鎮静 — 自分の災い型を自覚し、反応を鎮める",
      daily: [
        `朝: 「${prescription.morningPhrase}」を3回唱える`,
        `対人前: 「${prescription.preConflictPhrase}」を1回唱える`,
        `夜: 「${prescription.beforeSleepPhrase}」を7回唱える`,
        `緊急時: 「${prescription.emergencyResetPhrase}」を即座に3回`,
      ],
      record: [
        "今日の気分（1-10）",
        `${disasterProfile.corePattern}の発火回数`,
        "言霊を唱えた回数",
        "睡眠の質",
      ],
    },
    twentyOneDays: {
      goal: "反応の再学習 — 災い型の反応パターンを書き換える",
      daily: [
        "朝夕の固定実践を継続",
        `決断前に「${prescription.decisionPhrase}」を唱える`,
        `乱れたら「${prescription.emergencyResetPhrase}」で即リセット`,
        `補う音「${prescription.supplementTone.charAt(0)}」を意識的に発声する`,
      ],
      record: [
        "対人反応の変化",
        "金銭判断の変化",
        "体調の変化",
        "集中度の変化",
      ],
    },
    fortyNineDays: {
      goal: "定着 — 新しい反応パターンを体に刻む",
      daily: [
        "週1回ふり返りを行う",
        `${disasterProfile.corePattern}の弱点場面ごとに処方を使い分ける`,
        "言霊の効果を検証し、必要なら処方を微調整する",
      ],
      record: [
        "再発パターンの頻度",
        "改善率（自己評価）",
        "継続率",
        "周囲からのフィードバック",
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// テキスト出力ヘルパー
// ---------------------------------------------------------------------------

/**
 * 言霊真相解析のテキストを生成する（レポート用）
 */
export function describeNameSoundAnalysis(analysis: NameSoundAnalysis, nameHiragana: string): string {
  let text = "";
  text += `【名前の音分解】\n`;
  text += `　${nameHiragana} → ${analysis.sounds.join(" ・ ")}\n\n`;

  text += `【音の行別分布】\n`;
  for (const [row, count] of Object.entries(analysis.distribution)) {
    text += `　${row}: ${count}音\n`;
  }
  text += `\n`;

  if (analysis.deficientSystems.length > 0) {
    text += `【欠損音の系統】\n`;
    text += `　${analysis.deficientSystems.join("・")}\n`;
    text += `　→ これらの行の音が名前に含まれていないため、その行が司る力が不足しやすい。\n\n`;
  }

  if (analysis.excessiveSystems.length > 0) {
    text += `【過剰音の系統】\n`;
    text += `　${analysis.excessiveSystems.join("・")}\n`;
    text += `　→ これらの行の音が名前に多く含まれるため、その行の力が過剰に働きやすい。\n\n`;
  }

  text += `【水火バランス】\n`;
  text += `　火: ${analysis.fireWaterBalance.fire}音 / 水: ${analysis.fireWaterBalance.water}音\n`;
  const total = analysis.fireWaterBalance.fire + analysis.fireWaterBalance.water;
  if (total > 0) {
    const firePercent = Math.round((analysis.fireWaterBalance.fire / total) * 100);
    text += `　火の比率: ${firePercent}%\n`;
  }
  text += `\n`;

  text += `【陰陽バランス】\n`;
  text += `　陽: ${analysis.yinYangBalance.yang}音 / 陰: ${analysis.yinYangBalance.yin}音\n\n`;

  text += `【魂の振動傾向】\n`;
  text += `　${analysis.soulVibration}\n`;

  return text;
}

/**
 * 言霊処方のテキストを生成する（レポート用）
 */
export function describeKotodamaPrescription(prescription: KotodamaPrescription): string {
  let text = "";
  text += `【転換軸】${prescription.axis}\n`;
  text += `【均衡原理】${prescription.balancingPrinciple}\n\n`;

  text += `【補う音】${prescription.supplementTone}\n`;
  text += `【鎮める音】${prescription.calmingTone}\n`;
  text += `【開く音】${prescription.openingTone}\n`;
  text += `【締める音】${prescription.closingTone}\n\n`;

  text += `━━━ 場面別処方 ━━━\n\n`;

  text += `【朝の言霊】\n`;
  text += `　「${prescription.morningPhrase}」\n\n`;

  text += `【対人前の言霊】\n`;
  text += `　「${prescription.preConflictPhrase}」\n\n`;

  text += `【決断前の言霊】\n`;
  text += `　「${prescription.decisionPhrase}」\n\n`;

  text += `【就寝前の言霊】\n`;
  text += `　「${prescription.beforeSleepPhrase}」\n\n`;

  text += `【緊急停止用の言霊】\n`;
  text += `　「${prescription.emergencyResetPhrase}」\n\n`;

  text += `━━━ 実践指示 ━━━\n\n`;
  for (const note of prescription.actionNotes) {
    text += `　・${note}\n`;
  }

  return text;
}

/**
 * 実践プランのテキストを生成する（レポート用）
 */
export function describePracticePlan(plan: PracticePlan): string {
  let text = "";

  text += `━━━ 7日プラン: ${plan.sevenDays.goal} ━━━\n\n`;
  text += `【毎日の実践】\n`;
  for (const item of plan.sevenDays.daily) {
    text += `　${item}\n`;
  }
  text += `\n【記録項目】\n`;
  for (const item of plan.sevenDays.record) {
    text += `　・${item}\n`;
  }
  text += `\n`;

  text += `━━━ 21日プラン: ${plan.twentyOneDays.goal} ━━━\n\n`;
  text += `【毎日の実践】\n`;
  for (const item of plan.twentyOneDays.daily) {
    text += `　${item}\n`;
  }
  text += `\n【記録項目】\n`;
  for (const item of plan.twentyOneDays.record) {
    text += `　・${item}\n`;
  }
  text += `\n`;

  text += `━━━ 49日プラン: ${plan.fortyNineDays.goal} ━━━\n\n`;
  text += `【毎日の実践】\n`;
  for (const item of plan.fortyNineDays.daily) {
    text += `　${item}\n`;
  }
  text += `\n【記録項目】\n`;
  for (const item of plan.fortyNineDays.record) {
    text += `　・${item}\n`;
  }

  return text;
}
