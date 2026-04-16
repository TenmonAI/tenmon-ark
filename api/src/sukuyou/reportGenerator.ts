/**
 * ============================================================
 * TENMON-ARK統合鑑定レポート生成エンジン v2.0
 * ============================================================
 * 
 * 宿曜経 × 天津金木 × 言霊 × カタカムナ
 * 
 * 9カテゴリ統合鑑定レポート（標準版 7000字）
 * 
 * §0 基本情報
 * §1 宿命構造（不変領域）
 * §2 運命構造（変動領域）
 * §3 天命構造（魂の方向）
 * §4 人間分析（災い構造解析）
 * §5 時間軸分析
 * §6 各運勢詳細
 * §7 開運処方箋（言霊処方 + 実践プラン）
 * §8 統合解読（三層統合メッセージ）
 * 
 * 依存:
 *   - sukuyouEngine.ts (runFullDiagnosis, NAKSHATRA_DATA, etc.)
 *   - integratedDiagnosis.ts (runCompleteDiagnosis)
 *   - disasterClassifier.ts (classifyDisaster, describeDisasterPattern)
 *   - kotodamaPrescriber.ts (prescribeKotodama, generatePracticePlan, etc.)
 */

import {
  runFullDiagnosis,
  NAKSHATRA_DATA,
  PALACE_DATA,
  PLANET_DATA,
  type FullDiagnosisResult,
} from "./sukuyouEngine.js";

import {
  calculateThreeLayerPhase,
  analyzeNameKotodama,
  determineTaiYou,
} from "./integratedDiagnosis.js";

import {
  classifyDisaster,
  describeDisasterPattern,
  type DisasterProfile,
} from "./disasterClassifier.js";

import {
  prescribeKotodama,
  generatePracticePlan,
  analyzeNameSounds,
  describeNameSoundAnalysis,
  describeKotodamaPrescription,
  describePracticePlan,
  type KotodamaPrescription,
  type NameSoundAnalysis,
  type PracticePlan,
} from "./kotodamaPrescriber.js";

import { solarToLunar } from "./lunarCalendar.js";

// ============================================================
// カタカムナ言霊エンジン（内蔵）
// ============================================================

/**
 * カタカムナ48音の思念体系
 * 出典: カタカムナ言靈解天道仁聞
 * 
 * フトマニ（中心図象符）= 潜象界の核
 * ヤタノカガミ = 現象化の鏡
 * ミスマルノタマ = 統合の珠
 */
const KATAKAMUNA_SHINEN: Record<string, { shinen: string; layer: string; element: string }> = {
  "ア": { shinen: "感じる・生命", layer: "現象", element: "天" },
  "イ": { shinen: "伝わる・息", layer: "現象", element: "火" },
  "ウ": { shinen: "生まれ出る・潜象の核", layer: "潜象", element: "水" },
  "エ": { shinen: "立ち上がる・枝", layer: "現象", element: "地" },
  "オ": { shinen: "奥深い・六方環境", layer: "現象", element: "天" },
  "カ": { shinen: "力・見えない力", layer: "潜象", element: "火" },
  "キ": { shinen: "エネルギー・氣", layer: "潜象", element: "火" },
  "ク": { shinen: "引き寄せる・自由", layer: "現象", element: "水" },
  "ケ": { shinen: "放射する・異なる", layer: "現象", element: "火" },
  "コ": { shinen: "転がり出る・凝集", layer: "現象", element: "地" },
  "サ": { shinen: "差・遮る・引き離す", layer: "現象", element: "水" },
  "シ": { shinen: "示す・現象", layer: "現象", element: "水" },
  "ス": { shinen: "一方向に進む・澄む", layer: "現象", element: "水" },
  "セ": { shinen: "迫る・狭まる", layer: "現象", element: "地" },
  "ソ": { shinen: "外れる・反る", layer: "現象", element: "天" },
  "タ": { shinen: "分かれる・独立", layer: "現象", element: "火" },
  "チ": { shinen: "凝縮する・霊", layer: "潜象", element: "火" },
  "ツ": { shinen: "集まる・津", layer: "現象", element: "水" },
  "テ": { shinen: "手・届く", layer: "現象", element: "地" },
  "ト": { shinen: "統合する・十", layer: "現象", element: "天" },
  "ナ": { shinen: "核・成る", layer: "潜象", element: "天" },
  "ニ": { shinen: "煮える・定着", layer: "現象", element: "火" },
  "ヌ": { shinen: "抜ける・貫く", layer: "現象", element: "水" },
  "ネ": { shinen: "根・念", layer: "潜象", element: "地" },
  "ノ": { shinen: "伸びる・時間", layer: "現象", element: "天" },
  "ハ": { shinen: "引き合う・正反", layer: "潜象", element: "火" },
  "ヒ": { shinen: "根源・霊", layer: "潜象", element: "火" },
  "フ": { shinen: "増える・二つ", layer: "現象", element: "水" },
  "ヘ": { shinen: "減る・偏る", layer: "現象", element: "地" },
  "ホ": { shinen: "引き離す・芽", layer: "現象", element: "火" },
  "マ": { shinen: "受容する・間", layer: "潜象", element: "水" },
  "ミ": { shinen: "実体・実る", layer: "現象", element: "水" },
  "ム": { shinen: "六方環境・無限", layer: "潜象", element: "天" },
  "メ": { shinen: "芽生える・目", layer: "現象", element: "地" },
  "モ": { shinen: "漂う・藻", layer: "現象", element: "水" },
  "ヤ": { shinen: "飽和する・彌", layer: "潜象", element: "天" },
  "ユ": { shinen: "揺れる・湧く", layer: "現象", element: "水" },
  "ヨ": { shinen: "新しい次元・四方", layer: "現象", element: "天" },
  "ラ": { shinen: "場・灵", layer: "潜象", element: "火" },
  "リ": { shinen: "離れる・律", layer: "現象", element: "火" },
  "ル": { shinen: "留まる・流れ", layer: "現象", element: "水" },
  "レ": { shinen: "連なる・列", layer: "現象", element: "地" },
  "ロ": { shinen: "凝る・空間", layer: "現象", element: "地" },
  "ワ": { shinen: "調和する・和", layer: "潜象", element: "天" },
  "ヰ": { shinen: "集中する", layer: "現象", element: "火" },
  "ヱ": { shinen: "恵み", layer: "現象", element: "地" },
  "ヲ": { shinen: "生命力", layer: "潜象", element: "天" },
  "ン": { shinen: "終わりと始まり・転換", layer: "潜象", element: "天" },
};

/**
 * カタカムナ音分析
 */
function analyzeKatakamuna(nameKatakana: string): {
  sounds: Array<{ char: string; shinen: string; layer: string; element: string }>;
  layerBalance: { sensho: number; gensho: number };
  elementBalance: Record<string, number>;
  coreVibration: string;
  futomaniReading: string;
} {
  const chars = nameKatakana.replace(/[ー・\s　]/g, "").split("");
  const sounds: Array<{ char: string; shinen: string; layer: string; element: string }> = [];
  let sensho = 0;
  let gensho = 0;
  const elements: Record<string, number> = { "天": 0, "火": 0, "水": 0, "地": 0 };

  for (const ch of chars) {
    const info = KATAKAMUNA_SHINEN[ch];
    if (info) {
      sounds.push({ char: ch, ...info });
      if (info.layer === "潜象") sensho++;
      else gensho++;
      elements[info.element] = (elements[info.element] || 0) + 1;
    }
  }

  const total = sounds.length || 1;
  let coreVibration: string;
  if (sensho / total > 0.5) {
    coreVibration = "潜象界の振動が優勢。見えない力、根源的エネルギー、直感の領域に強く共鳴する魂。物質界よりも霊的・精神的な次元で本領を発揮する。";
  } else if (gensho / total > 0.7) {
    coreVibration = "現象界の振動が優勢。具体的な行動、物質的な実現、五感の世界で力を発揮する魂。地に足のついた実践力が根幹にある。";
  } else {
    coreVibration = "潜象と現象が均衡した振動。見えない世界の力を現実に顕現させる架け橋となる魂。霊的直感と実践力の両方を持つ。";
  }

  // フトマニ解読: 名前全体の思念を統合
  const shinenFlow = sounds.map(s => s.shinen).join(" → ");
  const futomaniReading = `名の思念の流れ: ${shinenFlow}。` +
    `この名は${sounds[0]?.shinen || ""}の力で始まり、` +
    `${sounds[sounds.length - 1]?.shinen || ""}の力で結ばれる。` +
    (sensho > gensho
      ? "潜象界（カムの世界）に根を持つ名であり、見えない力を現象界に引き出す使命を帯びる。"
      : "現象界（アマの世界）に根を持つ名であり、具体的な形を通じて真理を体現する使命を帯びる。");

  return {
    sounds,
    layerBalance: { sensho, gensho },
    elementBalance: elements,
    coreVibration,
    futomaniReading,
  };
}

// ============================================================
// 27宿拡張データベース
// ============================================================

/**
 * NAKSHATRA_DATA → ExtendedShukuData ブリッジ
 * 
 * NAKSHATRA_DATAの充実したsyukuyo.comデータを
 * reportGeneratorのExtendedShukuDataフォーマットに変換する。
 * データの一元管理を実現し、二重管理を排除。
 */
interface ExtendedShukuData {
  palaceFootDetail: string;
  elementDetail: string;
  qualityDetail: string;
  planetDetail: string;
  specialFortune: string;
  beautyAdvice: string;
  fashionAdvice: string;
  loveUpPeriod: string;
  loveDownPeriod: string;
  workUpPeriod: string;
  workDownPeriod: string;
  bodyPartDetail: string;
  surfacePersonality: string;
  innerPersonality: string;
  unconscious: string;
  talents: string;
  weaknesses: string;
  failurePattern: string;
  actionPrinciple: string;
  judgmentCriteria: string;
  motivation: string;
  // 新規追加フィールド（NAKSHATRA_DATAの詳細データ活用）
  personalityFull: string;
  loveAdviceFull: string;
  workAdviceFull: string;
  moneyAdviceFull: string;
  healthAdviceFull: string;
  openingAdviceFull: string;
  overviewFull: string;
  mantra: string;
  luckyColor: string;
  powerStone: string;
  famousPeople: string[];
  growthChallenge: string;
}

function buildExtendedShukuData(shukuName: string): ExtendedShukuData | undefined {
  const nd = NAKSHATRA_DATA[shukuName as keyof typeof NAKSHATRA_DATA];
  if (!nd) return undefined;

  // personalityから表裏の人格を推定
  const personalityText = nd.personality || "";
  const sentences = personalityText.split("。").filter(s => s.trim().length > 0);
  const surfacePersonality = sentences.slice(0, 2).join("。") + (sentences.length > 0 ? "。" : "");
  const innerPersonality = sentences.length > 2 
    ? sentences.slice(2, 4).join("。") + "。"
    : "内面には独自の感性と深い思考を秘める。";

  return {
    palaceFootDetail: `${nd.palaceBelong}に${nd.palaceFoot}属する`,
    elementDetail: `${nd.elementType}のエレメント。${nd.overview.split("。")[0] || ""}`,
    qualityDetail: `${nd.quality}宮。${nd.nature}の性質を持つ`,
    planetDetail: `${nd.planetInfluence}の影響。${nd.fortuneType}`,
    specialFortune: nd.fortuneType,
    beautyAdvice: nd.beauty,
    fashionAdvice: nd.fashion,
    loveUpPeriod: nd.loveTimingUp,
    loveDownPeriod: nd.loveTimingDown,
    workUpPeriod: nd.workTimingUp,
    workDownPeriod: nd.workTimingDown,
    bodyPartDetail: `${nd.bodyPart}に対応。${nd.healthAdvice.split("。")[0] || ""}`,
    surfacePersonality,
    innerPersonality,
    unconscious: `根底には「${nd.fortuneType}」の使命がある。${nd.openingAdvice.split("。")[0] || ""}`,
    talents: nd.fortuneType + "。" + (nd.openingAdvice.split("。")[1] || ""),
    weaknesses: nd.growthChallenge || "自己の偏りに気づきにくい傾向",
    failurePattern: nd.growthChallenge || "宿の偏りが極端に出る時、周囲との調和が崩れる",
    actionPrinciple: nd.openingAdvice.split("。").slice(0, 2).join("。") + "。",
    judgmentCriteria: nd.interpersonalStyle || "自分の直感と理を基準とする",
    motivation: nd.openingAdvice.split("。").slice(-2).join("。"),
    // 新規フィールド
    personalityFull: nd.personality,
    loveAdviceFull: nd.loveAdvice,
    workAdviceFull: nd.workAdvice,
    moneyAdviceFull: nd.moneyAdvice,
    healthAdviceFull: nd.healthAdvice,
    openingAdviceFull: nd.openingAdvice,
    overviewFull: nd.overview,
    mantra: nd.mantra,
    luckyColor: nd.luckyColor,
    powerStone: nd.powerStone,
    famousPeople: nd.famousPeople,
    growthChallenge: nd.growthChallenge,
  };
}

// ============================================================
// レポート生成メイン関数
// ============================================================

export interface TenmonArkReportResult {
  version: string;
  generatedAt: string;
  sections: Array<{ id: string; title: string; content: string }>;
  fullText: string;
  structuredData: {
    honmeiShuku: string;
    disasterProfile: DisasterProfile;
    kotodamaPrescription: KotodamaPrescription;
    nameSoundAnalysis?: NameSoundAnalysis;
    practicePlan: PracticePlan;
    katakamuna?: ReturnType<typeof analyzeKatakamuna>;
  };
}

/**
 * TENMON-ARK統合鑑定レポートを生成する
 * 
 * @param birthDate - 生年月日（Date型、UTCベース推奨）
 * @param name - 名前（カタカナ/ひらがな、任意）
 * @param options - オプション
 */
export function generateTenmonArkReport(
  birthDate: Date,
  name?: string,
  options?: {
    confidence?: "A" | "B" | "C" | "D";
    mode?: "BOOKCAL" | "ASTRO";
    consultationTheme?: string;
  }
): TenmonArkReportResult {
  // --- 基盤データ算出 ---
  const diagnosis = runFullDiagnosis(birthDate);
  const honmeiShuku = diagnosis.honmeiShuku;
  const shukuData = NAKSHATRA_DATA[honmeiShuku];
  const extData = buildExtendedShukuData(honmeiShuku);
  const palaceData = diagnosis.palaceConfig ? PALACE_DATA[diagnosis.palaceConfig.palace] : null;
  const planetData = PLANET_DATA[diagnosis.honmeiYo];
  const threeLayer = calculateThreeLayerPhase(birthDate);
  const taiYou = determineTaiYou(diagnosis.honmeiShuku as any, 0, birthDate);
  const lunar = solarToLunar(birthDate);

  // --- 災い分類 ---
  const disasterProfile = classifyDisaster(honmeiShuku, {
    confidence: options?.confidence,
    consultationTheme: options?.consultationTheme,
  });

  // --- 言霊処方 ---
  const nameHiragana = name ? toHiragana(name) : undefined;
  const prescription = prescribeKotodama(disasterProfile, nameHiragana);
  const practicePlan = generatePracticePlan(prescription, disasterProfile);

  // --- 名前音分析 ---
  let nameSoundAnalysis: NameSoundAnalysis | undefined;
  if (nameHiragana) {
    nameSoundAnalysis = analyzeNameSounds(nameHiragana);
  }

  // --- カタカムナ分析 ---
  let katakamuna: ReturnType<typeof analyzeKatakamuna> | undefined;
  const nameKatakana = name ? toKatakana(name) : undefined;
  if (nameKatakana) {
    katakamuna = analyzeKatakamuna(nameKatakana);
  }

  // --- 言霊名前分析（integratedDiagnosis経由） ---
  let kotodamaAnalysis: any = null;
  if (name) {
    try {
      kotodamaAnalysis = analyzeNameKotodama(name);
    } catch { /* non-fatal */ }
  }

  // --- 日付情報 ---
  const y = birthDate.getUTCFullYear();
  const m = birthDate.getUTCMonth() + 1;
  const d = birthDate.getUTCDate();
  const dateStr = `${y}年${m}月${d}日`;
  const lunarDateStr = `旧暦${lunar.year}年${lunar.month}月${lunar.day}日`;
  const confidence = options?.confidence || "B";
  const mode = options?.mode || "BOOKCAL";

  // ============================================================
  // §0 基本情報
  // ============================================================
  const section0 = buildSection0(dateStr, lunarDateStr, lunar, confidence, mode, honmeiShuku, shukuData, diagnosis);

  // ============================================================
  // §1 宿命構造（不変領域）
  // ============================================================
  const section1 = buildSection1(honmeiShuku, shukuData, extData, diagnosis, palaceData, planetData, taiYou);

  // ============================================================
  // §2 運命構造（変動領域）
  // ============================================================
  const section2 = buildSection2(threeLayer, taiYou, diagnosis, extData);

  // ============================================================
  // §3 天命構造（魂の方向）
  // ============================================================
  const section3 = buildSection3(honmeiShuku, extData, kotodamaAnalysis, katakamuna, name);

  // ============================================================
  // §4 人間分析（災い構造解析）
  // ============================================================
  const section4 = buildSection4(extData, disasterProfile, nameSoundAnalysis, nameHiragana);

  // ============================================================
  // §5 時間軸分析
  // ============================================================
  const section5 = buildSection5(extData, diagnosis, threeLayer);

  // ============================================================
  // §6 各運勢詳細
  // ============================================================
  const section6 = buildSection6(extData, shukuData, diagnosis);

  // ============================================================
  // §7 開運処方箋（言霊処方 + 実践プラン）
  // ============================================================
  const section7 = buildSection7(prescription, practicePlan, disasterProfile, shukuData, extData);

  // ============================================================
  // §8 統合解読（三層統合メッセージ）
  // ============================================================
  const section8 = buildSection8(honmeiShuku, extData, disasterProfile, prescription, threeLayer, taiYou);

  const sections = [section0, section1, section2, section3, section4, section5, section6, section7, section8];
  const fullText = sections.map(s => s.content).join("\n\n");

  return {
    version: "2.0",
    generatedAt: new Date().toISOString(),
    sections,
    fullText,
    structuredData: {
      honmeiShuku,
      disasterProfile,
      kotodamaPrescription: prescription,
      nameSoundAnalysis,
      practicePlan,
      katakamuna,
    },
  };
}

// ============================================================
// セクション生成ヘルパー
// ============================================================

function buildSection0(
  dateStr: string, lunarDateStr: string, lunar: any,
  confidence: string, mode: string,
  honmeiShuku: string, shukuData: any, diagnosis: FullDiagnosisResult
): { id: string; title: string; content: string } {
  let text = "";
  text += `╔══════════════════════════════════════════╗\n`;
  text += `║　TENMON-ARK統合鑑定レポート v2.0　　　　║\n`;
  text += `║　宿曜経 × 天津金木 × 言霊 × カタカムナ ║\n`;
  text += `╚══════════════════════════════════════════╝\n\n`;
  text += `━━━ §0 基本情報 ━━━\n\n`;
  text += `生年月日: ${dateStr}\n`;
  text += `旧暦: ${lunarDateStr}\n`;
  text += `月名: ${getJapaneseLunarMonthName(lunar.month)}\n`;
  text += `信頼度: ${confidence}\n`;
  text += `算出モード: ${mode}\n`;
  text += `本命宿: ${honmeiShuku}宿（${shukuData?.reading || ""}・${shukuData?.sanskrit || ""}）\n`;
  text += `守護神: ${shukuData?.deity || ""}\n`;
  text += `本命曜: ${diagnosis.honmeiYo}曜\n`;
  text += `九星: ${diagnosis.kyusei}\n`;
  text += `命宮: ${diagnosis.meikyu || ""}\n`;

  return { id: "section0", title: "§0 基本情報", content: text };
}

function buildSection1(
  honmeiShuku: string, shukuData: any, extData: ExtendedShukuData | undefined,
  diagnosis: FullDiagnosisResult, palaceData: any, planetData: any, taiYou: any
): { id: string; title: string; content: string } {
  let text = `━━━ §1 宿命構造（不変領域）━━━\n\n`;

  text += `【1-1 本命宿】\n`;
  text += `宿名: ${honmeiShuku}宿\n`;
  text += `梵名: ${shukuData?.sanskrit || ""}\n`;
  text += `読み: ${shukuData?.reading || ""}\n`;
  text += `守護神: ${shukuData?.deity || ""}\n`;
  text += `水火属性: ${shukuData?.element || ""}（${shukuData?.phase || ""}）\n`;
  text += `性質: ${shukuData?.nature || ""}（${shukuData?.category || ""}）\n`;
  if (extData) {
    text += `十二宮配置: ${extData.palaceFootDetail}\n`;
    text += `エレメント: ${extData.elementDetail}\n`;
    text += `宮の性質: ${extData.qualityDetail}\n`;
    text += `惑星影響: ${extData.planetDetail}\n`;
    if (extData.overviewFull) {
      text += `\n【宿の概要】\n${extData.overviewFull}\n`;
    }
    if (extData.personalityFull) {
      text += `\n【性格詳細】\n${extData.personalityFull}\n`;
    }
  }
  text += `\n`;

  text += `【1-2 十二宮全配置】\n`;
  if (diagnosis.palaceConfig) {
    const pc = diagnosis.palaceConfig as any;
    text += `命宮: ${pc["命宮"] || diagnosis.meikyu || ""}\n`;
    text += `財帛宮: ${pc["財帛宮"] || ""}\n`;
    text += `兄弟宮: ${pc["兄弟宮"] || ""}\n`;
    text += `田宅宮: ${pc["田宅宮"] || ""}\n`;
    text += `男女宮: ${pc["男女宮"] || ""}\n`;
    text += `奴僕宮: ${pc["奴僕宮"] || ""}\n`;
    text += `妻妾宮: ${pc["妻妾宮"] || ""}\n`;
    text += `疾厄宮: ${pc["疾厄宮"] || ""}\n`;
    text += `遷移宮: ${pc["遷移宮"] || ""}\n`;
    text += `官禄宮: ${pc["官禄宮"] || ""}\n`;
    text += `福徳宮: ${pc["福徳宮"] || ""}\n`;
    text += `相貌宮: ${pc["相貌宮"] || ""}\n`;
  }
  text += `\n`;

  text += `【1-3 本命曜】\n`;
  text += `曜: ${diagnosis.honmeiYo}曜\n`;
  if (planetData) {
    text += `天体: ${planetData.celestial}\n`;
    text += `性質: ${planetData.nature}\n`;
  }
  text += `\n`;

  text += `【1-4 九星】\n`;
  text += `九星: ${diagnosis.kyusei}\n\n`;

  text += `【1-5 躰用判定】\n`;
  if (taiYou) {
    text += `判定: ${taiYou.taiYou}\n`;
    text += `火水バランス: 火${taiYou.totalFireScore} : 水${taiYou.totalWaterScore}\n`;
    text += `解説: ${taiYou.interpretation || ""}\n`;
  }
  text += `\n`;

  return { id: "section1", title: "§1 宿命構造", content: text };
}

function buildSection2(
  threeLayer: any, taiYou: any, diagnosis: FullDiagnosisResult, extData: ExtendedShukuData | undefined
): { id: string; title: string; content: string } {
  let text = `━━━ §2 運命構造（変動領域）━━━\n\n`;

  text += `【2-1 天津金木三層位相】\n`;
  text += `文明層: ${threeLayer.civilization.description}\n`;
  text += `年層: ${threeLayer.year.description}\n`;
  text += `日層: ${threeLayer.day.description}\n\n`;

  text += `【2-2 今日の運勢】\n`;
  if (diagnosis.dailyRelation) {
    text += `直宿との関係: ${diagnosis.dailyRelation}\n`;
  }
  text += `十二直: ${diagnosis.juniChoku || ""}\n`;
  text += `遊年八卦: ${diagnosis.yunenHakke?.trigram || ""}（${diagnosis.yunenHakke?.fortune || ""}）\n\n`;

  if (extData) {
    text += `【2-3 上昇・下降時期】\n`;
    text += `恋愛上昇期: ${extData.loveUpPeriod}\n`;
    text += `恋愛下降期: ${extData.loveDownPeriod}\n`;
    text += `仕事上昇期: ${extData.workUpPeriod}\n`;
    text += `仕事下降期: ${extData.workDownPeriod}\n\n`;
  }

  return { id: "section2", title: "§2 運命構造", content: text };
}

function buildSection3(
  honmeiShuku: string, extData: ExtendedShukuData | undefined,
  kotodamaAnalysis: any, katakamuna: ReturnType<typeof analyzeKatakamuna> | undefined,
  name?: string
): { id: string; title: string; content: string } {
  let text = `━━━ §3 天命構造（魂の方向）━━━\n\n`;

  text += `【3-1 魂の根源的衝動】\n`;
  if (extData) {
    text += `${extData.unconscious}\n\n`;
  }

  text += `【3-2 天命の方向性】\n`;
  if (extData) {
    text += `${extData.motivation}\n\n`;
  }

  if (name && kotodamaAnalysis) {
    text += `【3-3 名前の言霊解析】\n`;
    text += `名前: ${name}\n`;
    if (kotodamaAnalysis.sounds) {
      text += `音の分解: ${kotodamaAnalysis.sounds.map((s: any) => `${s.char}（${s.kotodama?.attribute || ""}）`).join(" ・ ")}\n`;
    }
    if (kotodamaAnalysis.interpretation) {
      text += `言霊解読: ${kotodamaAnalysis.interpretation}\n`;
    }
    if (kotodamaAnalysis.fireWater) {
      text += `水火バランス: ${kotodamaAnalysis.fireWater}\n`;
    }
    text += `\n`;
  }

  if (name && katakamuna) {
    text += `【3-4 カタカムナ言霊解析】\n`;
    text += `名前: ${name}\n`;
    text += `思念分解:\n`;
    for (const s of katakamuna.sounds) {
      text += `　${s.char} — ${s.shinen}（${s.layer}・${s.element}）\n`;
    }
    text += `\n`;
    text += `潜象/現象バランス: 潜象${katakamuna.layerBalance.sensho}音 / 現象${katakamuna.layerBalance.gensho}音\n`;
    text += `四元素分布: 天${katakamuna.elementBalance["天"] || 0} / 火${katakamuna.elementBalance["火"] || 0} / 水${katakamuna.elementBalance["水"] || 0} / 地${katakamuna.elementBalance["地"] || 0}\n`;
    text += `核心振動: ${katakamuna.coreVibration}\n`;
    text += `フトマニ解読: ${katakamuna.futomaniReading}\n\n`;
  }

  return { id: "section3", title: "§3 天命構造", content: text };
}

function buildSection4(
  extData: ExtendedShukuData | undefined,
  disasterProfile: DisasterProfile,
  nameSoundAnalysis: NameSoundAnalysis | undefined,
  nameHiragana?: string
): { id: string; title: string; content: string } {
  let text = `━━━ §4 人間分析（災い構造解析）━━━\n\n`;

  if (extData) {
    text += `【4-1 表面人格】\n`;
    text += `${extData.surfacePersonality}\n\n`;

    text += `【4-2 内面人格】\n`;
    text += `${extData.innerPersonality}\n\n`;

    text += `【4-3 無意識層】\n`;
    text += `${extData.unconscious}\n\n`;

    text += `【4-4 才能】\n`;
    text += `${extData.talents}\n\n`;

    text += `【4-5 弱点】\n`;
    text += `${extData.weaknesses}\n\n`;

    text += `【4-6 失敗パターン】\n`;
    text += `${extData.failurePattern}\n\n`;

    text += `【4-7 行動原理】\n`;
    text += `${extData.actionPrinciple}\n\n`;

    text += `【4-8 判断基準】\n`;
    text += `${extData.judgmentCriteria}\n\n`;

    text += `【4-9 モチベーション】\n`;
    text += `${extData.motivation}\n\n`;
  }

  text += `【4-10 災い構造プロファイル】\n`;
  text += describeDisasterPattern(disasterProfile);
  text += `\n`;

  if (nameSoundAnalysis && nameHiragana) {
    text += `【4-11 名前音の構造分析】\n`;
    text += describeNameSoundAnalysis(nameSoundAnalysis, nameHiragana);
    text += `\n`;
  }

  return { id: "section4", title: "§4 人間分析", content: text };
}

function buildSection5(
  extData: ExtendedShukuData | undefined,
  diagnosis: FullDiagnosisResult,
  threeLayer: any
): { id: string; title: string; content: string } {
  let text = `━━━ §5 時間軸分析 ━━━\n\n`;

  text += `【5-1 過去傾向】\n`;
  if (extData) {
    text += `宿命的な反復パターン: ${extData.failurePattern}\n`;
    text += `これまでの人生で、この宿の持つ「${extData.weaknesses}」が繰り返し現れてきた可能性が高い。\n\n`;
  }

  text += `【5-2 現在運命】\n`;
  text += `天津金木の現在位相:\n`;
  text += `　文明層: ${threeLayer.civilization.description}\n`;
  text += `　年層: ${threeLayer.year.description}\n`;
  text += `　日層: ${threeLayer.day.description}\n`;
  if (diagnosis.dailyRelation) {
    text += `今日の命宿と直宿の関係: ${diagnosis.dailyRelation}\n`;
  }
  text += `\n`;

  text += `【5-3 未来方向】\n`;
  if (extData) {
    text += `魂の方向性: ${extData.motivation}\n`;
    text += `天命に向かうために必要なこと: ${extData.actionPrinciple}\n\n`;
  }

  return { id: "section5", title: "§5 時間軸分析", content: text };
}

function buildSection6(
  extData: ExtendedShukuData | undefined,
  shukuData: any,
  diagnosis: FullDiagnosisResult
): { id: string; title: string; content: string } {
  let text = `━━━ §6 各運勢詳細 ━━━\n\n`;

  if (extData) {
    text += `【6-1 恋愛運】\n`;
    if (extData.loveAdviceFull) {
      text += `${extData.loveAdviceFull}\n\n`;
    }
    text += `上昇期: ${extData.loveUpPeriod}\n`;
    text += `下降期: ${extData.loveDownPeriod}\n\n`;

    text += `【6-2 仕事運】\n`;
    if (extData.workAdviceFull) {
      text += `${extData.workAdviceFull}\n\n`;
    }
    text += `上昇期: ${extData.workUpPeriod}\n`;
    text += `下降期: ${extData.workDownPeriod}\n`;
    if (extData.specialFortune) {
      text += `特殊運: ${extData.specialFortune}\n`;
    }
    text += `\n`;

    text += `【6-3 金運】\n`;
    if (extData.moneyAdviceFull) {
      text += `${extData.moneyAdviceFull}\n\n`;
    }
    text += `特殊運: ${extData.specialFortune}\n\n`;

    text += `【6-4 健康運】\n`;
    if (extData.healthAdviceFull) {
      text += `${extData.healthAdviceFull}\n\n`;
    }
    text += `対応部位: ${extData.bodyPartDetail}\n\n`;

    text += `【6-5 ビューティ】\n`;
    text += `${extData.beautyAdvice}\n\n`;

    text += `【6-6 ファッション】\n`;
    text += `${extData.fashionAdvice}\n\n`;

    text += `【6-7 開運法】\n`;
    if (extData.openingAdviceFull) {
      text += `${extData.openingAdviceFull}\n`;
    }
    text += `ラッキーカラー: ${extData.luckyColor || "（宿別データ参照）"}\n`;
    text += `パワーストーン: ${extData.powerStone || "（宿別データ参照）"}\n`;
    if (extData.mantra) {
      text += `真言: ${extData.mantra}\n`;
    }
    text += `\n`;

    if (extData.famousPeople && extData.famousPeople.length > 0) {
      text += `【6-8 同宿の有名人】\n`;
      text += `${extData.famousPeople.join("、")}\n\n`;
    }
  }

  text += `【6-9 吉凶行事】\n`;
  if (shukuData) {
    text += `吉行事: ${shukuData.auspicious?.join("、") || "なし"}\n`;
    text += `凶行事: ${shukuData.inauspicious?.join("、") || "なし"}\n`;
  }
  text += `\n`;

  return { id: "section6", title: "§6 各運勢詳細", content: text };
}

function buildSection7(
  prescription: KotodamaPrescription,
  practicePlan: PracticePlan,
  disasterProfile: DisasterProfile,
  shukuData: any,
  extData: ExtendedShukuData | undefined
): { id: string; title: string; content: string } {
  let text = `━━━ §7 開運処方箋（言霊処方 + 実践プラン）━━━\n\n`;

  text += `【7-1 言霊処方】\n`;
  text += describeKotodamaPrescription(prescription);
  text += `\n`;

  text += `【7-2 実践プラン】\n`;
  text += describePracticePlan(practicePlan);
  text += `\n`;

  text += `【7-3 開運法】\n`;
  if (shukuData) {
    text += `ラッキーカラー: ${shukuData.luckyColor || "（宿別データ参照）"}\n`;
    text += `パワーストーン: ${shukuData.powerStone || "（宿別データ参照）"}\n`;
    if (shukuData.mantra) {
      text += `真言: ${shukuData.mantra}\n`;
    }
  }
  if (extData) {
    text += `ファッション開運: ${extData.fashionAdvice}\n`;
    text += `ビューティ開運: ${extData.beautyAdvice}\n`;
    if (extData.openingAdviceFull) {
      text += `開運の秘訣: ${extData.openingAdviceFull}\n`;
    }
  }
  text += `\n`;

  text += `【7-4 成長課題】\n`;
  text += `主災い型「${disasterProfile.corePattern}」の克服が最大の成長課題。\n`;
  text += `回復の鍵: ${disasterProfile.recoveryKey}\n`;
  text += `\n`;

  return { id: "section7", title: "§7 開運処方箋", content: text };
}

function buildSection8(
  honmeiShuku: string,
  extData: ExtendedShukuData | undefined,
  disasterProfile: DisasterProfile,
  prescription: KotodamaPrescription,
  threeLayer: any,
  taiYou: any
): { id: string; title: string; content: string } {
  let text = `━━━ §8 統合解読（三層統合メッセージ）━━━\n\n`;

  text += `【宿命 → 運命 → 天命】\n\n`;

  // 宿命層
  text += `■ 宿命（変えられないもの）\n`;
  text += `あなたは${honmeiShuku}宿として生まれた。`;
  if (extData) {
    text += `${extData.surfacePersonality.split("。")[0]}。`;
    text += `その根底には${extData.unconscious.split("。")[0]}。\n\n`;
  } else {
    text += `\n\n`;
  }

  // 運命層
  text += `■ 運命（変えられるもの）\n`;
  text += `宿命的な災い型は「${disasterProfile.corePattern}」。`;
  text += `${disasterProfile.collapsePattern}。`;
  text += `しかし、この反応回路は書き換えることができる。`;
  text += `言霊処方の転換軸「${prescription.axis}」を通じて、`;
  text += `${prescription.balancingPrinciple}。\n\n`;

  // 天命層
  text += `■ 天命（向かうべき場所）\n`;
  if (extData) {
    text += `${extData.motivation}。`;
    text += `${extData.unconscious.split("。").slice(-2, -1)[0] || extData.unconscious.split("。")[0]}。`;
  }
  text += `天津金木の現在位相は「${threeLayer.year.description}」であり、`;
  if (taiYou) {
    text += `躰用判定は「${taiYou.taiYou}」。`;
  }
  text += `この流れに乗ることで、宿命を運命へ、運命を天命へと昇華させることができる。\n\n`;

  text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `　TENMON-ARK — 人間OS解析レポート 完\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  return { id: "section8", title: "§8 統合解読", content: text };
}

// ============================================================
// ユーティリティ
// ============================================================

function getJapaneseLunarMonthName(month: number): string {
  const names: Record<number, string> = {
    1: "睦月", 2: "如月", 3: "弥生", 4: "卯月",
    5: "皐月", 6: "水無月", 7: "文月", 8: "葉月",
    9: "長月", 10: "神無月", 11: "霜月", 12: "師走",
  };
  return names[month] || `${month}月`;
}

function toHiragana(str: string): string {
  return str.replace(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  ).replace(/ー/g, "");
}

function toKatakana(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}
