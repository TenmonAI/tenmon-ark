/**
 * ============================================================
 * 天聞アーク統合鑑定レポート生成エンジン v2.0
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
}

const EXTENDED_SHUKU_DATA: Record<string, ExtendedShukuData> = {
  "昴": {
    palaceFootDetail: "白羊宮に三足属する",
    elementDetail: "火のエレメント。衝動と開拓を司る",
    qualityDetail: "活動宮。先駆的な行動力と開拓精神を持つ",
    planetDetail: "火星の影響。闘争心・行動力・開拓",
    specialFortune: "開拓運・リーダー運に恵まれる",
    beautyAdvice: "大胆で華やかな印象を活かしたケアが効果的。赤系のリップやチークで運気上昇。",
    fashionAdvice: "華やかで存在感のある装い。赤やゴールドが基調。ダイヤモンドのアクセサリーが開運。",
    loveUpPeriod: "情熱的な魅力が増す時期。積極的なアプローチが吉。",
    loveDownPeriod: "自己中心的になりすぎる時期。相手の気持ちを優先すること。",
    workUpPeriod: "新規プロジェクトの立ち上げに最適。リーダーシップが発揮される。",
    workDownPeriod: "衝動的な判断に注意。一呼吸おいてから決断を。",
    bodyPartDetail: "頭部・顔面に対応。頭痛や顔面の怪我に注意。",
    surfacePersonality: "華やかで存在感があり、自然とリーダーの座に就く。開拓精神に溢れ、新しいことに果敢に挑む。",
    innerPersonality: "内面には強い闘争心と不安を秘める。常に先頭に立たねばという使命感と、失敗への恐れが共存する。",
    unconscious: "根底には「開拓」の使命がある。誰も踏み入れていない領域を切り開き、道を作りたいという魂の衝動。",
    talents: "リーダーシップ、開拓力、決断力。新しい道を切り開く力。",
    weaknesses: "衝動的、短気、自己中心的。",
    failurePattern: "衝動的に動いて後始末ができない。周囲を置き去りにして孤立する。",
    actionPrinciple: "直感と衝動に基づいて行動する。考えるより先に動く。",
    judgmentCriteria: "新しいかどうか。挑戦的かどうか。",
    motivation: "未知の領域の開拓。誰もやったことのないことへの挑戦。"
  },
  "畢": {
    palaceFootDetail: "金牛宮に一足属する",
    elementDetail: "地のエレメント。安定と蓄積を司る",
    qualityDetail: "不動宮。堅実さと持続力を持つ",
    planetDetail: "金星の影響。美・豊穣・安定",
    specialFortune: "財運・安定運に恵まれる",
    beautyAdvice: "ナチュラルで上品な印象を活かしたケアが効果的。肌の質感を大切にしたスキンケアが基本。",
    fashionAdvice: "上質で落ち着いた装い。アースカラーが基調。エメラルドのアクセサリーが開運。",
    loveUpPeriod: "穏やかな魅力が増す時期。安定した関係が築ける。",
    loveDownPeriod: "執着が強くなる時期。手放す勇気を持つこと。",
    workUpPeriod: "堅実な成果が認められる時期。長期プロジェクトで成功。",
    workDownPeriod: "変化を恐れすぎる時期。柔軟性を意識して。",
    bodyPartDetail: "首・喉に対応。甲状腺や喉の不調に注意。",
    surfacePersonality: "穏やかで堅実、信頼感のある人柄。美的センスに優れ、物質的な豊かさを大切にする。",
    innerPersonality: "内面には強い執着心と安定への渇望を秘める。一度手に入れたものを手放すことへの深い恐れ。",
    unconscious: "根底には「蓄積と保全」の使命がある。価値あるものを守り、次世代に受け継ぎたいという魂の願い。",
    talents: "堅実さ、美的センス、持続力。価値あるものを見極め、守り育てる力。",
    weaknesses: "執着、頑固、変化への恐れ。",
    failurePattern: "変化を拒んで時代に取り残される。執着が人間関係を壊す。",
    actionPrinciple: "安定と蓄積に基づいて行動する。確実な一歩を積み重ねる。",
    judgmentCriteria: "安定しているかどうか。価値があるかどうか。",
    motivation: "物質的・精神的な豊かさの蓄積。美しいものに囲まれた安定した生活。"
  },
  "觜": {
    palaceFootDetail: "金牛宮に二足属する",
    elementDetail: "地のエレメント。知性と伝達を司る",
    qualityDetail: "不動宮。知的好奇心と伝達力を持つ",
    planetDetail: "金星と水星の影響。知性・美・伝達",
    specialFortune: "知性運・伝達運に恵まれる",
    beautyAdvice: "知的で洗練された印象を活かしたケアが効果的。唇のケアが運気上昇の鍵。",
    fashionAdvice: "知的で洗練された装い。ライトブルーやシルバーが基調。アクアマリンのアクセサリーが開運。",
    loveUpPeriod: "知的な魅力が増す時期。会話から始まる恋愛に恵まれる。",
    loveDownPeriod: "言葉が鋭くなりすぎる時期。柔らかい表現を心がけて。",
    workUpPeriod: "伝達力が最大化される時期。プレゼン・執筆・教育で成果。",
    workDownPeriod: "情報過多で混乱する時期。優先順位を明確にすること。",
    bodyPartDetail: "肩・腕に対応。肩こりや腕の疲労に注意。",
    surfacePersonality: "知的で弁が立ち、情報収集力に優れる。多才で器用、複数のことを同時にこなす。",
    innerPersonality: "内面には強い知的好奇心と不安定さを秘める。一つに絞れない焦りと、すべてを知りたいという欲求。",
    unconscious: "根底には「知の伝達」の使命がある。学んだことを言葉にして伝え、世界を繋ぎたいという魂の願い。",
    talents: "知性、伝達力、多才。言葉で人と世界を繋ぐ力。",
    weaknesses: "散漫、二面性、落ち着きのなさ。",
    failurePattern: "興味が移りすぎて何も完成しない。言葉が鋭すぎて人を傷つける。",
    actionPrinciple: "知的好奇心に基づいて行動する。情報を集め、伝え、繋ぐ。",
    judgmentCriteria: "知的に面白いかどうか。伝える価値があるかどうか。",
    motivation: "知識の獲得と伝達。言葉で世界を繋ぐこと。"
  },
  "参": {
    palaceFootDetail: "雙女宮に四足属する",
    elementDetail: "地のエレメント。実務と奉仕を司る",
    qualityDetail: "柔軟宮。実務能力と献身を持つ",
    planetDetail: "水星の影響。実務・技術・奉仕",
    specialFortune: "技術運・実務運に恵まれる",
    beautyAdvice: "清潔感と実用性を兼ね備えたケアが効果的。手先のケアが美の基本。",
    fashionAdvice: "実用的で清潔感のある装い。白やライトブルーが基調。ペリドットのアクセサリーが開運。",
    loveUpPeriod: "誠実さが評価される時期。職場での出会いに恵まれる。",
    loveDownPeriod: "仕事優先で恋愛が疎かになる時期。バランスを意識して。",
    workUpPeriod: "技術力が認められる時期。専門分野で成果。",
    workDownPeriod: "過労に注意の時期。休息を忘れずに。",
    bodyPartDetail: "腸・下腹部に対応。消化器系の不調に注意。",
    surfacePersonality: "実務能力に優れ、確実に仕事をこなす。技術的な才能がある。",
    innerPersonality: "内面には強い奉仕精神と完璧主義を秘める。人の役に立ちたいという強い思い。",
    unconscious: "根底には「技術による奉仕」の使命がある。自分の技術で世界を良くしたいという魂の願い。",
    talents: "実務能力、技術力、奉仕精神。確実に仕事をこなし、人の役に立つ力。",
    weaknesses: "完璧主義、過労傾向、自己評価の低さ。",
    failurePattern: "完璧を求めすぎて疲弊する。自分の価値を認められない。",
    actionPrinciple: "実務と技術に基づいて行動する。確実で丁寧な仕事を心がける。",
    judgmentCriteria: "実用的かどうか。技術的に正しいかどうか。",
    motivation: "技術の向上と社会貢献。自分の技術で人の役に立つこと。"
  },
  "井": {
    palaceFootDetail: "巨蟹宮に一足属する",
    elementDetail: "水のエレメント。感情と家庭を司る",
    qualityDetail: "活動宮。保護力と感受性を持つ",
    planetDetail: "月の影響。感情・直感・母性",
    specialFortune: "家庭運・感受性運に恵まれる",
    beautyAdvice: "柔らかく温かい印象を活かしたケアが効果的。月光浴やシルバーのアクセサリーが開運。",
    fashionAdvice: "柔らかく温かみのある装い。シルバーや白が基調。ムーンストーンのアクセサリーが開運。",
    loveUpPeriod: "母性的な魅力が増す時期。家庭的な出会いに恵まれる。",
    loveDownPeriod: "感情的になりすぎる時期。冷静さを保つこと。",
    workUpPeriod: "直感力が冴える時期。人の心に寄り添う仕事で成果。",
    workDownPeriod: "感情に振り回される時期。客観性を意識して。",
    bodyPartDetail: "胸・乳房に対応。胸部の不調と感情的ストレスに注意。",
    surfacePersonality: "温かく包容力があり、家庭的な雰囲気を持つ。感受性が豊か。",
    innerPersonality: "内面には強い保護本能と感情の深さを秘める。大切な人を守りたいという強い思い。",
    unconscious: "根底には「守護と養育」の使命がある。すべてを包み込み、育てたいという魂の願い。",
    talents: "感受性、包容力、直感力。人の心に寄り添い、守る力。",
    weaknesses: "感情的、過保護、依存傾向。",
    failurePattern: "感情に振り回されて判断を誤る。過保護になって相手の成長を妨げる。",
    actionPrinciple: "感情と直感に基づいて行動する。心が動いたら守りに入る。",
    judgmentCriteria: "大切な人を守れるかどうか。感情的に正しいと感じるかどうか。",
    motivation: "大切な人の保護と養育。安全で温かい場所を作ること。"
  },
  "鬼": {
    palaceFootDetail: "巨蟹宮に四足属する",
    elementDetail: "水のエレメント。霊性と変容を司る",
    qualityDetail: "活動宮。霊感と変容力を持つ",
    planetDetail: "月の影響。霊性・直感・変容",
    specialFortune: "霊感運・変容運に恵まれる",
    beautyAdvice: "神秘的で深みのある印象を活かしたケアが効果的。瞑想やヒーリングが開運。",
    fashionAdvice: "神秘的で深みのある装い。紫や深い青が基調。アメジストのアクセサリーが開運。",
    loveUpPeriod: "霊的な繋がりを感じる出会いの時期。前世からの縁。",
    loveDownPeriod: "感情の起伏が激しくなる時期。瞑想で心を鎮めること。",
    workUpPeriod: "直感力が最大化される時期。カウンセリングや芸術で成果。",
    workDownPeriod: "現実離れしやすい時期。地に足をつけること。",
    bodyPartDetail: "胃・消化器に対応。精神的ストレスからくる胃腸障害に注意。",
    surfacePersonality: "神秘的で深い洞察力を持つ。目に見えない世界を感じ取る力がある。",
    innerPersonality: "内面には強い霊性と変容への欲求を秘める。古いものを手放し、新しく生まれ変わりたいという衝動。",
    unconscious: "根底には「霊的覚醒」の使命がある。魂のレベルで目覚め、真実を見通す力を得たいという願い。",
    talents: "霊感、直感力、変容力。目に見えない世界を感じ取り、変容を促す力。",
    weaknesses: "感情の起伏、現実離れ、孤立傾向。",
    failurePattern: "霊的な世界に没頭して現実を見失う。感情に振り回される。",
    actionPrinciple: "直感と霊性に基づいて行動する。見えない世界からのメッセージに従う。",
    judgmentCriteria: "霊的に正しいかどうか。魂の成長に繋がるかどうか。",
    motivation: "霊的覚醒と変容。魂のレベルで成長し、真実に到達すること。"
  },
  "柳": {
    palaceFootDetail: "獅子宮に一足属する",
    elementDetail: "火のエレメント。創造と表現を司る",
    qualityDetail: "不動宮。創造力と自己表現を持つ",
    planetDetail: "太陽の影響。創造・表現・輝き",
    specialFortune: "表現運・創造運に恵まれる",
    beautyAdvice: "華やかで存在感のある印象を活かしたケアが効果的。ヘアスタイルの変化で運気上昇。",
    fashionAdvice: "華やかで存在感のある装い。ゴールドや赤が基調。ルビーのアクセサリーが開運。",
    loveUpPeriod: "華やかな魅力が増す時期。パーティーやイベントでの出会い。",
    loveDownPeriod: "自己中心的になりすぎる時期。相手の気持ちを考えること。",
    workUpPeriod: "創造力と表現力が最大化される時期。芸術・エンタメで成果。",
    workDownPeriod: "プライドが邪魔をする時期。謙虚さを忘れずに。",
    bodyPartDetail: "心臓・背中に対応。心臓疾患と背中の痛みに注意。",
    surfacePersonality: "華やかで存在感があり、自然と注目を集める。創造力と表現力に優れる。",
    innerPersonality: "内面には強い自己表現欲と承認欲求を秘める。自分の存在を認めてほしいという切実な願い。",
    unconscious: "根底には「輝きの放射」の使命がある。太陽のように周囲を照らし、希望を与えたいという魂の願い。",
    talents: "創造力、表現力、カリスマ性。人を惹きつけ、感動を与える力。",
    weaknesses: "自己中心的、プライドの高さ、承認欲求。",
    failurePattern: "自己中心的になって周囲を振り回す。プライドが邪魔をして助けを求められない。",
    actionPrinciple: "創造と表現に基づいて行動する。自分の輝きを世界に示す。",
    judgmentCriteria: "自分らしいかどうか。創造的な価値があるかどうか。",
    motivation: "自己表現と創造。自分の輝きで世界を照らすこと。"
  },
  "星": {
    palaceFootDetail: "獅子宮に二足属する",
    elementDetail: "火のエレメント。輝きと権威を司る",
    qualityDetail: "不動宮。権威と指導力を持つ",
    planetDetail: "太陽の影響。権威・指導・輝き",
    specialFortune: "権威運・指導運に恵まれる",
    beautyAdvice: "堂々とした存在感を活かしたケアが効果的。姿勢を正し、堂々と振る舞うことが美の基本。",
    fashionAdvice: "堂々とした存在感のある装い。ゴールドやロイヤルブルーが基調。サンストーンのアクセサリーが開運。",
    loveUpPeriod: "カリスマ性が増す時期。尊敬から始まる恋愛。",
    loveDownPeriod: "支配的になりすぎる時期。対等な関係を意識すること。",
    workUpPeriod: "指導力が発揮される時期。管理職やリーダーとして成果。",
    workDownPeriod: "権威主義に陥る時期。部下の意見にも耳を傾けること。",
    bodyPartDetail: "心臓・脊椎に対応。心臓疾患と腰痛に注意。",
    surfacePersonality: "堂々とした存在感と権威を持つ。自然とリーダーの座に就く。",
    innerPersonality: "内面には強い責任感と使命感を秘める。人を導き、守る覚悟がある。",
    unconscious: "根底には「王としての使命」がある。人々を導き、より良い世界を作りたいという魂の願い。",
    talents: "指導力、権威、カリスマ性。人を導き、組織を率いる力。",
    weaknesses: "権威主義、支配的、プライドの高さ。",
    failurePattern: "権力に溺れて独裁的になる。プライドが邪魔をして過ちを認められない。",
    actionPrinciple: "責任と使命に基づいて行動する。リーダーとして先頭に立つ。",
    judgmentCriteria: "人々のためになるかどうか。リーダーとして正しいかどうか。",
    motivation: "人々の指導と社会の発展。より良い世界を作ること。"
  },
  "張": {
    palaceFootDetail: "獅子宮に三足属する",
    elementDetail: "火のエレメント。拡大と祝福を司る",
    qualityDetail: "不動宮。拡大力と祝福を持つ",
    planetDetail: "太陽の影響。拡大・祝福・繁栄",
    specialFortune: "祝福運・繁栄運に恵まれる",
    beautyAdvice: "華やかで祝福に満ちた印象を活かしたケアが効果的。笑顔が最大の美容法。",
    fashionAdvice: "華やかで祝福感のある装い。オレンジやイエローが基調。シトリンのアクセサリーが開運。",
    loveUpPeriod: "祝福に満ちた出会いの時期。結婚運も上昇。",
    loveDownPeriod: "楽観的すぎて問題を見逃す時期。現実を直視すること。",
    workUpPeriod: "拡大と繁栄の時期。事業拡大や昇進のチャンス。",
    workDownPeriod: "拡大しすぎて収拾がつかなくなる時期。足元を固めること。",
    bodyPartDetail: "胃・上腹部に対応。暴飲暴食と消化器の不調に注意。",
    surfacePersonality: "華やかで楽天的、祝福のオーラを持つ。周囲を明るくする力がある。",
    innerPersonality: "内面には強い拡大欲と繁栄への渇望を秘める。すべてを大きく広げたいという衝動。",
    unconscious: "根底には「祝福の拡散」の使命がある。世界に喜びと繁栄をもたらしたいという魂の願い。",
    talents: "拡大力、楽天性、祝福力。周囲に喜びと繁栄をもたらす力。",
    weaknesses: "楽観的すぎ、浪費傾向、現実逃避。",
    failurePattern: "楽観的すぎて問題を放置する。拡大しすぎて破綻する。",
    actionPrinciple: "楽観と拡大に基づいて行動する。大きなビジョンを持って動く。",
    judgmentCriteria: "拡大と繁栄に繋がるかどうか。喜びをもたらすかどうか。",
    motivation: "繁栄の拡大と祝福の拡散。世界に喜びをもたらすこと。"
  },
  "翼": {
    palaceFootDetail: "獅子宮に一足、女宮に三足属する",
    elementDetail: "火と地のエレメント。情欲的な火と実質的な地を表す",
    qualityDetail: "不動宮と柔軟宮。大胆不敵な度胸と思索力・秩序的な面を併せ持つ",
    planetDetail: "太陽と水星の影響。生命力のエネルギー源と、友好的で知性と表現を示す",
    specialFortune: "27宿の中で最も強い「海外運」に恵まれる",
    beautyAdvice: "肩こりが多いので定期的なマッサージが必要。ストレス解消はリラクゼーションが一番の回復。エステの全身コースや海外でのビューティーケア旅行も運気アップ。",
    fashionAdvice: "少女のようなセンチメンタルでロマンティックなスタイル。ギャザーやフレアのスカートに大きなリボンなどデコラティブな装い。大胆に肩開きやワンショルダーのシャーリングワンピースも似合う。コンサバティブスタイルも存在感が増す。",
    loveUpPeriod: "4月「親」、5月「栄」、8月「親」。異性からの憧れの的になりやすくモテ期に突入。イメージチェンジを試みると魅力がグンとアップ。",
    loveDownPeriod: "1月「衰」、9月「衰」、3月「壊」、11月「壊」。愛する人に対して批判的モードにスイッチが入る。取るに足らないことに目がゆき過ぎて厳しく責めたてないよう注意。",
    workUpPeriod: "2月「危」、5月「栄」、7月「成」、10月「危」、12月「業」。金運上昇は6月「安」。信念を貫き通すことで新たなチャンスや才能が開花。",
    workDownPeriod: "1月「衰」、3月「壊」、9月「衰」、11月「壊」。不本意な立場に追いやられ、予定通りに運ばず八方塞がりに。理想と現実の歯車がかみ合わなくなる時期。",
    bodyPartDetail: "左肩に対応。不慮の事故による肩の脱臼に注意。無理を重ねると肩こり、疲労や精神的ストレスから動脈硬化・高血圧・心臓病、肝臓・すい臓・胃腸のポリープや腫瘍の危険も。定期的な健診を。",
    surfacePersonality: "物事の本質を見抜き、正義感と強い意志で信念を貫きとおす。遠い処に飛んで行く羽ばたく強さとやり抜く自信を持つ。コツコツと積み上げられた風格と威厳が備わる。",
    innerPersonality: "我慢強くゆっくりペースで進める頑固一徹な面がある。スケールの大きい理想を夢見る部分と、現実の歯車が合わず葛藤する内面。海外に縁があり、音楽や映画、華やかなものが大好きなエンターテイメント性も。",
    unconscious: "根底には「翼」の名が示す通り、遠くへ飛翔し、未知の世界を切り開きたいという魂の衝動がある。理想の世界を実現するために、国境を超えて羽ばたく使命。",
    talents: "本質を見抜く力、信念の強さ、海外運、エンターテイメント性。緻密な頭脳プレイと存在感。",
    weaknesses: "強引でワンマンに見える面、理想と現実のギャップへの葛藤、どうでもいいことに労力を費やす傾向。",
    failurePattern: "理想が高すぎて現実との折り合いがつかない。支配的傾向が人間関係を壊す。些細なことに目くじらを立てる。",
    actionPrinciple: "信念と正義に基づいて行動する。一度決めたことは最後までやり遂げる頑固一徹。",
    judgmentCriteria: "本質的に正しいかどうか。自分の信念に合致するかどうか。",
    motivation: "理想の実現と海外への飛翔。想像力を働かせ、なりたい人物像を追い求めること。"
  },
  "軫": {
    palaceFootDetail: "室女宮に二足属する",
    elementDetail: "地のエレメント。分析と完成を司る",
    qualityDetail: "柔軟宮。完成力と分析力を持つ",
    planetDetail: "水星の影響。完成・分析・統合",
    specialFortune: "完成運・統合運に恵まれる",
    beautyAdvice: "洗練された完成度の高い印象を活かしたケアが効果的。細部まで丁寧なケアが美の基本。",
    fashionAdvice: "洗練された完成度の高い装い。アイボリーやライトグレーが基調。パールのアクセサリーが開運。",
    loveUpPeriod: "洗練された魅力が増す時期。知的な出会いに恵まれる。",
    loveDownPeriod: "完璧主義が恋愛を妨げる時期。不完全さを受け入れること。",
    workUpPeriod: "完成度の高い仕事が評価される時期。品質管理や編集で成果。",
    workDownPeriod: "完璧主義で仕事が進まない時期。80%で前に進む勇気を。",
    bodyPartDetail: "腸・下腹部に対応。消化器系の不調と神経性の症状に注意。",
    surfacePersonality: "洗練されて完成度が高い。細部まで行き届いた仕事ぶりで信頼される。",
    innerPersonality: "内面には強い完璧主義と統合への欲求を秘める。すべてを完璧に仕上げたいという衝動。",
    unconscious: "根底には「完成と統合」の使命がある。バラバラなものを一つに統合し、完成させたいという魂の願い。",
    talents: "完成力、分析力、統合力。物事を完璧に仕上げ、統合する力。",
    weaknesses: "完璧主義、批判的、神経質。",
    failurePattern: "完璧を求めすぎて何も完成しない。批判的になりすぎて人間関係を壊す。",
    actionPrinciple: "完成と統合に基づいて行動する。細部まで丁寧に仕上げる。",
    judgmentCriteria: "完成度が高いかどうか。統合されているかどうか。",
    motivation: "完成と統合。バラバラなものを一つにまとめ、完璧に仕上げること。"
  },
  "角": {
    palaceFootDetail: "天秤宮に一足属する",
    elementDetail: "風のエレメント。均衡と調和を司る",
    qualityDetail: "活動宮。調和力とバランス感覚を持つ",
    planetDetail: "金星の影響。美・調和・外交",
    specialFortune: "調和運・外交運に恵まれる",
    beautyAdvice: "バランスの取れた上品な印象を活かしたケアが効果的。左右対称の美を意識して。",
    fashionAdvice: "エレガントでバランスの取れた装い。パステルカラーが基調。オパールのアクセサリーが開運。",
    loveUpPeriod: "調和的な魅力が増す時期。理想的なパートナーとの出会い。",
    loveDownPeriod: "優柔不断になる時期。自分の気持ちを優先すること。",
    workUpPeriod: "外交力が発揮される時期。交渉・仲裁・デザインで成果。",
    workDownPeriod: "八方美人になりすぎる時期。自分の立場を明確にすること。",
    bodyPartDetail: "腰・腎臓に対応。腰痛と腎臓の不調に注意。",
    surfacePersonality: "エレガントでバランス感覚に優れる。人間関係の調和を重んじ、外交的な才能がある。",
    innerPersonality: "内面には強い正義感と完璧な調和への渇望を秘める。不公平や不調和に対する深い苦しみ。",
    unconscious: "根底には「調和の創造」の使命がある。対立するものを統合し、美しい均衡を生み出したいという魂の願い。",
    talents: "調和力、外交力、美的センス。対立を統合し、均衡を生み出す力。",
    weaknesses: "優柔不断、八方美人、自己主張の弱さ。",
    failurePattern: "全員を満足させようとして誰も満足させられない。自分の意見を持てない。",
    actionPrinciple: "調和とバランスに基づいて行動する。対立を避け、統合を目指す。",
    judgmentCriteria: "公平かどうか。調和が保たれるかどうか。",
    motivation: "調和の創造と美の実現。世界に均衡と美をもたらすこと。"
  },
  "亢": {
    palaceFootDetail: "天秤宮に二足属する",
    elementDetail: "風のエレメント。深層の調和を司る",
    qualityDetail: "活動宮。深い洞察力と調和力を持つ",
    planetDetail: "金星の影響。深層美・内なる調和",
    specialFortune: "洞察運・深層調和運に恵まれる",
    beautyAdvice: "内面の美しさを外に表すケアが効果的。瞑想と呼吸法で内側から輝く。",
    fashionAdvice: "シンプルで深みのある装い。ネイビーやダークグリーンが基調。ラピスラズリのアクセサリーが開運。",
    loveUpPeriod: "深い魅力が増す時期。魂レベルでの出会い。",
    loveDownPeriod: "相手に求めすぎる時期。完璧な関係は存在しないと知ること。",
    workUpPeriod: "洞察力が冴える時期。研究・分析・カウンセリングで成果。",
    workDownPeriod: "考えすぎて動けない時期。行動に移す勇気を。",
    bodyPartDetail: "腰・下背部に対応。腰痛と泌尿器系の不調に注意。",
    surfacePersonality: "穏やかで思慮深い。表面的な付き合いを嫌い、深い関係を求める。",
    innerPersonality: "内面には強い探究心と完璧な調和への渇望を秘める。物事の本質を見極めたいという衝動。",
    unconscious: "根底には「深層の真理」への到達の使命がある。表面を超えて本質に触れたいという魂の願い。",
    talents: "洞察力、分析力、深い理解力。物事の本質を見抜く力。",
    weaknesses: "考えすぎ、完璧主義、人間関係の狭さ。",
    failurePattern: "分析に没頭して行動できない。理想が高すぎて現実に適応できない。",
    actionPrinciple: "深い洞察に基づいて行動する。本質を見極めてから動く。",
    judgmentCriteria: "本質的に正しいかどうか。深い意味があるかどうか。",
    motivation: "真理の探究と深層の理解。物事の本質に到達すること。"
  },
  "氐": {
    palaceFootDetail: "天蝎宮に一足属する",
    elementDetail: "水のエレメント。変容と再生を司る",
    qualityDetail: "不動宮。変容力と再生力を持つ",
    planetDetail: "冥王星の影響。変容・死と再生・深層",
    specialFortune: "変容運・再生運に恵まれる",
    beautyAdvice: "神秘的で深みのある印象を活かしたケアが効果的。デトックスが開運の鍵。",
    fashionAdvice: "神秘的で深みのある装い。黒やダークレッドが基調。ガーネットのアクセサリーが開運。",
    loveUpPeriod: "深い絆が生まれる時期。運命的な出会い。",
    loveDownPeriod: "嫉妬や執着が強くなる時期。信頼を基盤にすること。",
    workUpPeriod: "変革力が発揮される時期。組織改革や新規事業で成果。",
    workDownPeriod: "権力闘争に巻き込まれる時期。冷静さを保つこと。",
    bodyPartDetail: "生殖器・排泄器に対応。婦人科系・泌尿器系の不調に注意。",
    surfacePersonality: "神秘的で深い存在感を持つ。表面的なことに興味がなく、本質を追求する。",
    innerPersonality: "内面には強い変容への欲求と、死と再生のサイクルへの理解を秘める。",
    unconscious: "根底には「変容と再生」の使命がある。古いものを壊し、新しいものを生み出す力。",
    talents: "変容力、再生力、深い洞察力。破壊と創造を司る力。",
    weaknesses: "執着、嫉妬、支配欲。",
    failurePattern: "執着が強すぎて手放せない。支配欲が人間関係を壊す。",
    actionPrinciple: "変容と再生に基づいて行動する。古いものを手放し、新しいものを生み出す。",
    judgmentCriteria: "本質的な変容に繋がるかどうか。",
    motivation: "変容と再生。古い自分を壊し、新しい自分に生まれ変わること。"
  },
  "房": {
    palaceFootDetail: "天蝎宮に二足属する",
    elementDetail: "水のエレメント。情熱と深層を司る",
    qualityDetail: "不動宮。情熱と深い感情を持つ",
    planetDetail: "冥王星の影響。情熱・深層心理・変容",
    specialFortune: "情熱運・深層運に恵まれる",
    beautyAdvice: "情熱的で深みのある印象を活かしたケアが効果的。目元のケアが運気上昇の鍵。",
    fashionAdvice: "情熱的で深みのある装い。ワインレッドやブラックが基調。ルビーのアクセサリーが開運。",
    loveUpPeriod: "情熱的な魅力が最大化される時期。深い絆が生まれる。",
    loveDownPeriod: "嫉妬心が燃え上がる時期。信頼関係を大切にすること。",
    workUpPeriod: "集中力が最大化される時期。研究・調査で成果。",
    workDownPeriod: "のめり込みすぎる時期。バランスを意識して。",
    bodyPartDetail: "生殖器・下腹部に対応。婦人科系の不調に注意。",
    surfacePersonality: "情熱的で深い魅力を持つ。一度決めたことには全身全霊で取り組む。",
    innerPersonality: "内面には激しい情熱と深い感情を秘める。すべてを賭けて愛し、すべてを賭けて闘う。",
    unconscious: "根底には「深層の情熱」の使命がある。魂の奥底から湧き上がる力で世界を変えたいという願い。",
    talents: "情熱、集中力、深い感情力。すべてを賭けて取り組む力。",
    weaknesses: "嫉妬、執着、極端さ。",
    failurePattern: "感情が暴走して制御不能になる。嫉妬が人間関係を破壊する。",
    actionPrinciple: "情熱と深い感情に基づいて行動する。中途半端は許さない。",
    judgmentCriteria: "魂が燃えるかどうか。全力を注ぐ価値があるかどうか。",
    motivation: "深い情熱の実現。魂の奥底から湧き上がる力を世界に解き放つこと。"
  },
  "心": {
    palaceFootDetail: "天蝎宮に三足属する",
    elementDetail: "水のエレメント。核心と洞察を司る",
    qualityDetail: "不動宮。核心を見抜く力と深い洞察力を持つ",
    planetDetail: "冥王星の影響。核心・洞察・変容",
    specialFortune: "洞察運・核心運に恵まれる",
    beautyAdvice: "深い知性と神秘性を活かしたケアが効果的。心臓を守るための有酸素運動が開運。",
    fashionAdvice: "シャープで知的な装い。黒やダークブルーが基調。ブラックオニキスのアクセサリーが開運。",
    loveUpPeriod: "深い魅力が増す時期。魂レベルでの出会いに恵まれる。",
    loveDownPeriod: "疑心暗鬼になる時期。相手を信じる勇気を持つこと。",
    workUpPeriod: "洞察力が最大化される時期。戦略立案・分析で成果。",
    workDownPeriod: "疑心暗鬼で判断が鈍る時期。信頼できる人に相談を。",
    bodyPartDetail: "心臓に対応。心臓疾患と精神的ストレスに注意。",
    surfacePersonality: "鋭い洞察力と知性を持つ。物事の核心を一瞬で見抜く力がある。",
    innerPersonality: "内面には強い探究心と疑念を秘める。すべてを見通したいという欲求と、信じることへの恐れ。",
    unconscious: "根底には「核心の解明」の使命がある。世界の真の姿を見抜き、真実を明らかにしたいという魂の願い。",
    talents: "洞察力、分析力、戦略性。物事の核心を見抜き、最適解を導く力。",
    weaknesses: "疑心暗鬼、冷酷さ、孤立傾向。",
    failurePattern: "誰も信じられなくなって孤立する。冷酷な判断で人間関係を壊す。",
    actionPrinciple: "洞察と分析に基づいて行動する。核心を見極めてから動く。",
    judgmentCriteria: "真実かどうか。核心に迫っているかどうか。",
    motivation: "真実の解明と核心への到達。世界の真の姿を見抜くこと。"
  },
  "尾": {
    palaceFootDetail: "人馬宮に一足属する",
    elementDetail: "火のエレメント。冒険と拡大を司る",
    qualityDetail: "柔軟宮。冒険心と哲学的思考を持つ",
    planetDetail: "木星の影響。拡大・冒険・哲学",
    specialFortune: "冒険運・哲学運に恵まれる",
    beautyAdvice: "活動的で健康的な印象を活かしたケアが効果的。アウトドア活動が運気上昇の鍵。",
    fashionAdvice: "活動的で自由な装い。パープルやターコイズが基調。ターコイズのアクセサリーが開運。",
    loveUpPeriod: "冒険的な魅力が増す時期。旅先での出会いに恵まれる。",
    loveDownPeriod: "自由を求めすぎる時期。パートナーとの約束を大切にすること。",
    workUpPeriod: "拡大と冒険の時期。海外展開や新規事業で成果。",
    workDownPeriod: "無計画に拡大しすぎる時期。戦略を練ること。",
    bodyPartDetail: "太もも・肝臓に対応。肝臓の不調と下半身の怪我に注意。",
    surfacePersonality: "自由で冒険心に溢れ、哲学的な思考を持つ。束縛を嫌い、広い世界を求める。",
    innerPersonality: "内面には強い自由への渇望と真理への探究心を秘める。どこまでも遠くへ行きたいという衝動。",
    unconscious: "根底には「真理の探究」の使命がある。世界を旅し、多様な真理に触れたいという魂の願い。",
    talents: "冒険心、哲学的思考、拡大力。未知の世界を切り開き、真理を探究する力。",
    weaknesses: "無計画、飽きっぽさ、責任回避。",
    failurePattern: "自由を求めすぎて責任から逃げる。計画なしに拡大して破綻する。",
    actionPrinciple: "冒険と探究に基づいて行動する。未知の世界に飛び込む。",
    judgmentCriteria: "自由かどうか。真理に近づけるかどうか。",
    motivation: "自由と真理の探究。世界を旅し、多様な真理に触れること。"
  },
  "箕": {
    palaceFootDetail: "人馬宮に二足属する",
    elementDetail: "火のエレメント。浄化と選別を司る",
    qualityDetail: "柔軟宮。浄化力と選別力を持つ",
    planetDetail: "木星の影響。浄化・拡大・選別",
    specialFortune: "浄化運・選別運に恵まれる",
    beautyAdvice: "清浄で透明感のある印象を活かしたケアが効果的。デトックスと浄化が美の基本。",
    fashionAdvice: "清浄で透明感のある装い。白やクリアカラーが基調。クリスタルのアクセサリーが開運。",
    loveUpPeriod: "純粋な魅力が増す時期。真実の愛に出会える。",
    loveDownPeriod: "相手を選びすぎる時期。完璧を求めすぎないこと。",
    workUpPeriod: "浄化と選別の力が発揮される時期。整理・改革で成果。",
    workDownPeriod: "切り捨てすぎる時期。残すべきものを見極めること。",
    bodyPartDetail: "太もも・臀部に対応。坐骨神経痛と下半身の不調に注意。",
    surfacePersonality: "清浄で透明感があり、不要なものを見抜く力がある。浄化と選別の達人。",
    innerPersonality: "内面には強い浄化欲と完璧な純粋さへの渇望を秘める。汚れたものを許せないという衝動。",
    unconscious: "根底には「浄化と選別」の使命がある。不要なものを取り除き、本質だけを残したいという魂の願い。",
    talents: "浄化力、選別力、透明性。不要なものを見抜き、取り除く力。",
    weaknesses: "潔癖、排他的、切り捨てすぎ。",
    failurePattern: "不完全なものを許せずに人間関係を壊す。切り捨てすぎて孤立する。",
    actionPrinciple: "浄化と選別に基づいて行動する。不要なものを取り除き、本質を残す。",
    judgmentCriteria: "純粋かどうか。本質的かどうか。",
    motivation: "浄化と選別。不要なものを取り除き、純粋な本質だけを残すこと。"
  },
  "斗": {
    palaceFootDetail: "磨羯宮に一足属する",
    elementDetail: "地のエレメント。構造と達成を司る",
    qualityDetail: "活動宮。構造力と達成力を持つ",
    planetDetail: "土星の影響。構造・制限・達成",
    specialFortune: "達成運・構造運に恵まれる",
    beautyAdvice: "堅実で信頼感のある印象を活かしたケアが効果的。骨格を活かしたメイクが開運。",
    fashionAdvice: "堅実で格式のある装い。ダークグレーやネイビーが基調。オニキスのアクセサリーが開運。",
    loveUpPeriod: "信頼感が増す時期。年上や社会的地位のある人との出会い。",
    loveDownPeriod: "仕事優先で恋愛が疎かになる時期。感情表現を大切にすること。",
    workUpPeriod: "構造力が発揮される時期。組織構築や長期計画で成果。",
    workDownPeriod: "硬直化する時期。柔軟性を意識すること。",
    bodyPartDetail: "膝・骨格に対応。膝の不調と骨折に注意。",
    surfacePersonality: "堅実で責任感が強く、社会的な信頼を得る。構造的な思考力に優れる。",
    innerPersonality: "内面には強い達成欲と社会的成功への渇望を秘める。頂点に立ちたいという野心。",
    unconscious: "根底には「構造の構築」の使命がある。永続する構造を作り、社会に貢献したいという魂の願い。",
    talents: "構造力、達成力、責任感。永続する構造を作り上げる力。",
    weaknesses: "硬直、冷酷さ、感情の抑圧。",
    failurePattern: "感情を抑圧しすぎて爆発する。硬直化して変化に対応できない。",
    actionPrinciple: "構造と計画に基づいて行動する。長期的な視点で動く。",
    judgmentCriteria: "構造的に正しいかどうか。長期的に持続するかどうか。",
    motivation: "社会的達成と構造の構築。永続する価値を作り上げること。"
  },
  "女": {
    palaceFootDetail: "磨羯宮に二足属する",
    elementDetail: "地のエレメント。忍耐と達成を司る",
    qualityDetail: "活動宮。忍耐力と実行力を持つ",
    planetDetail: "土星の影響。忍耐・制限・達成",
    specialFortune: "忍耐運・達成運に恵まれる",
    beautyAdvice: "落ち着いた品格のある印象を活かしたケアが効果的。アンチエイジングケアが開運。",
    fashionAdvice: "品格のある落ち着いた装い。ブラウンやベージュが基調。ガーネットのアクセサリーが開運。",
    loveUpPeriod: "品格が増す時期。誠実な出会いに恵まれる。",
    loveDownPeriod: "壁を作りすぎる時期。心を開く勇気を持つこと。",
    workUpPeriod: "忍耐力が報われる時期。長年の努力が実を結ぶ。",
    workDownPeriod: "我慢しすぎる時期。限界を認めて助けを求めること。",
    bodyPartDetail: "膝・関節に対応。関節痛と骨の不調に注意。",
    surfacePersonality: "忍耐強く、黙々と努力を続ける。口数は少ないが、確実に成果を出す。",
    innerPersonality: "内面には強い忍耐力と達成への執念を秘める。どんな困難にも耐え抜く覚悟。",
    unconscious: "根底には「忍耐による達成」の使命がある。時間をかけて確実に目標を達成したいという魂の願い。",
    talents: "忍耐力、実行力、堅実さ。時間をかけて確実に達成する力。",
    weaknesses: "頑固、感情の抑圧、孤立傾向。",
    failurePattern: "我慢しすぎて心身を壊す。助けを求められずに孤立する。",
    actionPrinciple: "忍耐と堅実さに基づいて行動する。一歩一歩確実に進む。",
    judgmentCriteria: "忍耐に値するかどうか。長期的に達成できるかどうか。",
    motivation: "忍耐による達成。時間をかけて確実に目標に到達すること。"
  },
  "虚": {
    palaceFootDetail: "宝瓶宮に一足属する",
    elementDetail: "風のエレメント。革新と独創を司る",
    qualityDetail: "不動宮。革新力と独創性を持つ",
    planetDetail: "天王星の影響。革新・独創・自由",
    specialFortune: "革新運・独創運に恵まれる",
    beautyAdvice: "個性的でユニークな印象を活かしたケアが効果的。最新テクノロジーを取り入れたケアが開運。",
    fashionAdvice: "個性的でユニークな装い。エレクトリックブルーやシルバーが基調。アメジストのアクセサリーが開運。",
    loveUpPeriod: "個性的な魅力が増す時期。ユニークな出会いに恵まれる。",
    loveDownPeriod: "距離を置きすぎる時期。親密さを恐れないこと。",
    workUpPeriod: "革新力が発揮される時期。テクノロジー・発明で成果。",
    workDownPeriod: "突飛すぎるアイデアに走る時期。実現可能性を考えること。",
    bodyPartDetail: "足首・ふくらはぎに対応。足首の捻挫と循環器系の不調に注意。",
    surfacePersonality: "独創的で革新的、常識にとらわれない自由な発想を持つ。",
    innerPersonality: "内面には強い独立心と人類全体への関心を秘める。個人よりも全体の進化を考える。",
    unconscious: "根底には「革新と進化」の使命がある。古い枠組みを壊し、新しい時代を切り開きたいという魂の願い。",
    talents: "革新力、独創性、未来志向。古い枠組みを壊し、新しいものを生み出す力。",
    weaknesses: "変人扱い、孤立、現実離れ。",
    failurePattern: "独創的すぎて誰にも理解されない。現実離れしたアイデアに固執する。",
    actionPrinciple: "革新と独創に基づいて行動する。常識を超えた発想で動く。",
    judgmentCriteria: "革新的かどうか。未来に繋がるかどうか。",
    motivation: "革新と進化。古い枠組みを壊し、新しい時代を切り開くこと。"
  },
  "危": {
    palaceFootDetail: "宝瓶宮に二足属する",
    elementDetail: "風のエレメント。変革と解放を司る",
    qualityDetail: "不動宮。変革力と解放力を持つ",
    planetDetail: "天王星の影響。変革・解放・覚醒",
    specialFortune: "変革運・解放運に恵まれる",
    beautyAdvice: "自由で解放的な印象を活かしたケアが効果的。束縛を解くリラクゼーションが開運。",
    fashionAdvice: "自由で解放的な装い。ターコイズやラベンダーが基調。アクアマリンのアクセサリーが開運。",
    loveUpPeriod: "自由な魅力が増す時期。束縛のない関係が築ける。",
    loveDownPeriod: "反抗的になる時期。相手の立場も理解すること。",
    workUpPeriod: "変革力が発揮される時期。改革・イノベーションで成果。",
    workDownPeriod: "破壊的になりすぎる時期。建設的な変革を心がけること。",
    bodyPartDetail: "足首・循環器に対応。血行不良と足の不調に注意。",
    surfacePersonality: "自由で反骨精神に溢れ、既存の枠組みに挑戦する。変革者としての資質を持つ。",
    innerPersonality: "内面には強い解放欲と変革への衝動を秘める。すべての束縛を打ち破りたいという渇望。",
    unconscious: "根底には「解放と覚醒」の使命がある。人々を束縛から解放し、覚醒に導きたいという魂の願い。",
    talents: "変革力、解放力、覚醒力。束縛を打ち破り、新しい可能性を開く力。",
    weaknesses: "反抗的、破壊的、不安定。",
    failurePattern: "破壊だけして建設しない。反抗のための反抗に陥る。",
    actionPrinciple: "変革と解放に基づいて行動する。束縛を打ち破り、自由を勝ち取る。",
    judgmentCriteria: "解放に繋がるかどうか。束縛を打ち破れるかどうか。",
    motivation: "解放と覚醒。すべての束縛を打ち破り、真の自由を実現すること。"
  },
  "室": {
    palaceFootDetail: "雙魚宮に一足属する",
    elementDetail: "水のエレメント。夢と直感を司る",
    qualityDetail: "柔軟宮。夢想力と直感力を持つ",
    planetDetail: "海王星の影響。夢・直感・霊性",
    specialFortune: "夢想運・直感運に恵まれる",
    beautyAdvice: "夢幻的で柔らかい印象を活かしたケアが効果的。アロマテラピーが開運の鍵。",
    fashionAdvice: "夢幻的で柔らかい装い。ラベンダーやシーグリーンが基調。アクアマリンのアクセサリーが開運。",
    loveUpPeriod: "夢幻的な魅力が増す時期。ロマンティックな出会い。",
    loveDownPeriod: "現実逃避しやすい時期。地に足をつけること。",
    workUpPeriod: "直感力が冴える時期。芸術・音楽・ヒーリングで成果。",
    workDownPeriod: "現実離れする時期。実務的な面も忘れずに。",
    bodyPartDetail: "足・リンパに対応。足のむくみとリンパの不調に注意。",
    surfacePersonality: "夢幻的で柔らかい雰囲気を持つ。直感力に優れ、芸術的な才能がある。",
    innerPersonality: "内面には強い夢想力と霊的な感受性を秘める。目に見えない世界との繋がりを感じる。",
    unconscious: "根底には「夢の実現」の使命がある。見えない世界の美しさを現実に顕現させたいという魂の願い。",
    talents: "夢想力、直感力、芸術性。見えない世界の美しさを形にする力。",
    weaknesses: "現実逃避、優柔不断、依存傾向。",
    failurePattern: "夢の世界に逃避して現実を放棄する。他者に依存して自立できない。",
    actionPrinciple: "夢と直感に基づいて行動する。見えない世界からのインスピレーションに従う。",
    judgmentCriteria: "美しいかどうか。直感的に正しいかどうか。",
    motivation: "夢の実現と霊的な美の顕現。見えない世界の美しさを現実に形にすること。"
  },
  "壁": {
    palaceFootDetail: "雙魚宮に二足属する",
    elementDetail: "水のエレメント。慈悲と癒しを司る",
    qualityDetail: "柔軟宮。慈悲力と癒しの力を持つ",
    planetDetail: "海王星の影響。慈悲・癒し・犠牲",
    specialFortune: "慈悲運・癒し運に恵まれる",
    beautyAdvice: "慈悲深く穏やかな印象を活かしたケアが効果的。水辺でのリラクゼーションが開運。",
    fashionAdvice: "穏やかで慈悲深い装い。アクアブルーやホワイトが基調。ムーンストーンのアクセサリーが開運。",
    loveUpPeriod: "慈悲深い魅力が増す時期。癒しの関係が築ける。",
    loveDownPeriod: "自己犠牲が過ぎる時期。自分自身も大切にすること。",
    workUpPeriod: "癒しの力が発揮される時期。医療・福祉・カウンセリングで成果。",
    workDownPeriod: "他者の問題を背負いすぎる時期。境界線を引くこと。",
    bodyPartDetail: "足裏・免疫系に対応。免疫力の低下と足の不調に注意。",
    surfacePersonality: "慈悲深く穏やかで、すべてを受け入れる包容力を持つ。癒しの力がある。",
    innerPersonality: "内面には強い慈悲心と自己犠牲の傾向を秘める。すべての苦しみを引き受けたいという衝動。",
    unconscious: "根底には「慈悲と癒し」の使命がある。すべての存在の苦しみを癒し、救いたいという魂の願い。",
    talents: "慈悲力、癒しの力、受容力。すべてを受け入れ、癒す力。",
    weaknesses: "自己犠牲、境界線の曖昧さ、現実逃避。",
    failurePattern: "自己犠牲が過ぎて自分を失う。境界線が引けずに消耗する。",
    actionPrinciple: "慈悲と癒しに基づいて行動する。苦しむ者に手を差し伸べる。",
    judgmentCriteria: "苦しみを癒せるかどうか。慈悲に基づいているかどうか。",
    motivation: "慈悲と癒し。すべての存在の苦しみを癒すこと。"
  },
  "奎": {
    palaceFootDetail: "白羊宮に一足属する",
    elementDetail: "火のエレメント。先駆と開始を司る",
    qualityDetail: "活動宮。先駆力と開始力を持つ",
    planetDetail: "火星の影響。先駆・開始・衝動",
    specialFortune: "先駆運・開始運に恵まれる",
    beautyAdvice: "活動的で先駆的な印象を活かしたケアが効果的。スポーツで体を動かすことが開運。",
    fashionAdvice: "活動的で先駆的な装い。赤やオレンジが基調。カーネリアンのアクセサリーが開運。",
    loveUpPeriod: "行動力が増す時期。積極的なアプローチが吉。",
    loveDownPeriod: "衝動的になりすぎる時期。相手のペースも大切にすること。",
    workUpPeriod: "先駆力が発揮される時期。新規事業の立ち上げで成果。",
    workDownPeriod: "見切り発車しすぎる時期。計画を練ること。",
    bodyPartDetail: "頭部・額に対応。頭痛と頭部の怪我に注意。",
    surfacePersonality: "行動力に溢れ、先駆的な精神を持つ。誰よりも早く動き出す。",
    innerPersonality: "内面には強い衝動と開始への渇望を秘める。新しいことを始めずにはいられない。",
    unconscious: "根底には「先駆と開始」の使命がある。誰よりも先に新しい道を切り開きたいという魂の願い。",
    talents: "行動力、先駆力、開始力。誰よりも早く動き出し、道を切り開く力。",
    weaknesses: "衝動的、短気、持続力の欠如。",
    failurePattern: "始めるのは得意だが続かない。衝動的に動いて後悔する。",
    actionPrinciple: "衝動と直感に基づいて行動する。考えるより先に動く。",
    judgmentCriteria: "新しいかどうか。先駆的かどうか。",
    motivation: "先駆と開始。誰よりも先に新しいことを始めること。"
  },
  "婁": {
    palaceFootDetail: "白羊宮に二足属する",
    elementDetail: "火のエレメント。統率と組織を司る",
    qualityDetail: "活動宮。統率力と組織力を持つ",
    planetDetail: "火星の影響。統率・組織・戦略",
    specialFortune: "統率運・組織運に恵まれる",
    beautyAdvice: "力強く統率力のある印象を活かしたケアが効果的。体幹トレーニングが開運。",
    fashionAdvice: "力強く統率力のある装い。レッドやブラックが基調。ルビーのアクセサリーが開運。",
    loveUpPeriod: "リーダーシップが魅力になる時期。頼れる存在として注目される。",
    loveDownPeriod: "支配的になりすぎる時期。パートナーの自主性を尊重すること。",
    workUpPeriod: "統率力が発揮される時期。チームリーダーやプロジェクトマネージャーとして成果。",
    workDownPeriod: "独断的になりすぎる時期。チームの意見を聞くこと。",
    bodyPartDetail: "頭部・筋肉に対応。頭痛と筋肉の緊張に注意。",
    surfacePersonality: "統率力に優れ、組織を率いる力がある。戦略的な思考で目標を達成する。",
    innerPersonality: "内面には強い統率欲と勝利への渇望を秘める。常に先頭に立ち、勝ちたいという衝動。",
    unconscious: "根底には「統率と勝利」の使命がある。組織を率いて勝利に導きたいという魂の願い。",
    talents: "統率力、組織力、戦略性。組織を率いて目標を達成する力。",
    weaknesses: "独断的、支配的、攻撃的。",
    failurePattern: "独断的になって組織を崩壊させる。攻撃的になって敵を作る。",
    actionPrinciple: "統率と戦略に基づいて行動する。組織を率いて目標に向かう。",
    judgmentCriteria: "勝てるかどうか。戦略的に正しいかどうか。",
    motivation: "統率と勝利。組織を率いて勝利を勝ち取ること。"
  },
  "胃": {
    palaceFootDetail: "金牛宮に一足属する",
    elementDetail: "地のエレメント。消化と蓄積を司る",
    qualityDetail: "不動宮。消化力と蓄積力を持つ",
    planetDetail: "金星の影響。消化・蓄積・豊穣",
    specialFortune: "蓄積運・豊穣運に恵まれる",
    beautyAdvice: "豊かで温かい印象を活かしたケアが効果的。食事の質を高めることが美の基本。",
    fashionAdvice: "豊かで温かみのある装い。アースカラーやグリーンが基調。エメラルドのアクセサリーが開運。",
    loveUpPeriod: "包容力が増す時期。安定した関係が築ける。",
    loveDownPeriod: "執着が強くなる時期。手放す勇気を持つこと。",
    workUpPeriod: "蓄積力が発揮される時期。資産形成や長期投資で成果。",
    workDownPeriod: "溜め込みすぎる時期。適度に放出すること。",
    bodyPartDetail: "胃・消化器に対応。胃腸の不調と食生活の乱れに注意。",
    surfacePersonality: "穏やかで包容力があり、物質的な豊かさを大切にする。食に対するこだわりが強い。",
    innerPersonality: "内面には強い蓄積欲と安定への渇望を秘める。すべてを取り込み、消化し、自分のものにしたいという衝動。",
    unconscious: "根底には「消化と蓄積」の使命がある。経験を消化し、知恵として蓄積したいという魂の願い。",
    talents: "消化力、蓄積力、包容力。経験を消化し、知恵に変える力。",
    weaknesses: "執着、溜め込み、変化への恐れ。",
    failurePattern: "溜め込みすぎて消化不良を起こす。変化を恐れて停滞する。",
    actionPrinciple: "蓄積と消化に基づいて行動する。経験を取り込み、自分のものにする。",
    judgmentCriteria: "蓄積に値するかどうか。消化できるかどうか。",
    motivation: "蓄積と消化。経験を消化し、知恵として蓄積すること。"
  }
};

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
 * 天聞アーク統合鑑定レポートを生成する
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
  const extData = EXTENDED_SHUKU_DATA[honmeiShuku];
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
  text += `║　天聞アーク統合鑑定レポート v2.0　　　　║\n`;
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
    text += `上昇期: ${extData.loveUpPeriod}\n`;
    text += `下降期: ${extData.loveDownPeriod}\n\n`;

    text += `【6-2 仕事運】\n`;
    text += `上昇期: ${extData.workUpPeriod}\n`;
    text += `下降期: ${extData.workDownPeriod}\n`;
    if (extData.specialFortune) {
      text += `特殊運: ${extData.specialFortune}\n`;
    }
    text += `\n`;

    text += `【6-3 金運】\n`;
    text += `特殊運: ${extData.specialFortune}\n\n`;

    text += `【6-4 健康運】\n`;
    text += `対応部位: ${extData.bodyPartDetail}\n\n`;

    text += `【6-5 ビューティ】\n`;
    text += `${extData.beautyAdvice}\n\n`;

    text += `【6-6 ファッション】\n`;
    text += `${extData.fashionAdvice}\n\n`;
  }

  text += `【6-7 吉凶行事】\n`;
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
  }
  if (extData) {
    text += `ファッション開運: ${extData.fashionAdvice}\n`;
    text += `ビューティ開運: ${extData.beautyAdvice}\n`;
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
  text += `　天聞アーク — 人間OS解析レポート 完\n`;
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
