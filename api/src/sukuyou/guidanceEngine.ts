/**
 * ============================================================
 * 天聞アーク御神託統合パイプラインエンジン (guidanceEngine.ts)
 * ============================================================
 * 
 * 悩み聴取 → 宿曜解析 → 人生アルゴリズム真相解析 → 災い分類
 * → 天津金木反転解析 → いろは言霊解 → 処方生成 → 御神託生成
 * → 8章構成レポート整形
 * 
 * 設計思想:
 *   - 「占い」ではなく「人間OS解析」
 *   - 原因から導きまで一筆書きでつながる
 *   - 宿曜は「読む」、天津金木は「反転させる」、言霊は「整える・導く」、御神託は「一滴に結晶化する」
 * 
 * 禁止事項:
 *   - 宿曜未算出なのに宿名を断定しない
 *   - 算出不能項目を推測で埋めない
 *   - 天津金木を詩的比喩だけで終わらせない
 *   - 言霊を美文だけで終わらせず、必ず処方に落とす
 *   - 御神託で恐怖喚起や決断強制をしない
 *   - 医療、法律、投資の断定助言をしない
 */

import {
  calculateHonmeiShuku,
  calculateHonmeiYo,
  calculateKyusei,
  calculateMeikyu,
  calculatePalaceConfig,
  calculateDailyNakshatra,
  calculateDailyPlanet,
  calculateJuniChoku,
  calculateYunenHakke,
  runFullDiagnosis,
  NAKSHATRA_DATA,
  PALACE_DATA,
  PLANET_DATA,
  NAKSHATRAS,
  type Nakshatra,
  type Palace,
  type Planet,
  type FullDiagnosisResult,
} from "./sukuyouEngine.js";

import {
  calculateThreeLayerPhase,
  analyzeNameKotodama,
  determineTaiYou,
  type TaiYouResult,
} from "./integratedDiagnosis.js";

import {
  classifyDisaster,
  describeDisasterPattern,
  type DisasterProfile,
} from "./disasterClassifier.js";

import {
  analyzeNameSounds,
  prescribeKotodama,
  generatePracticePlan,
  describeNameSoundAnalysis,
  describeKotodamaPrescription,
  describePracticePlan,
  type KotodamaPrescription,
  type NameSoundAnalysis,
  type PracticePlan,
} from "./kotodamaPrescriber.js";

import { solarToLunar } from "./lunarCalendar.js";

// ============================================================
// Types
// ============================================================

/** 悩み聴取の構造化結果 */
export interface ConcernIntake {
  currentConcern: string;
  painDomain: string[];
  startPeriod: string;
  repeatPattern: boolean;
  triggerSituations: string[];
  selfRecognizedWeakness: string[];
  desiredState: string;
  coreQuestion: string;
}

/** 人生アルゴリズム真相解析結果 */
export interface LifeAlgorithmAnalysis {
  outerPersona: string;
  innerPersona: string;
  motivationRoot: string;
  fearRoot: string;
  defenseReaction: string;
  repeatingFailurePattern: string;
  collapseSign: string;
  recoveryEntry: string;
}

/** 天津金木反転解析結果 */
export interface AmatsuKanagiReversal {
  dominantForce: string;
  secondaryForce: string;
  imbalanceAxis: string;
  collapseMechanism: string;
  reversalAxis: string;
  blessingShift: string;
  actionKeywords: string[];
}

/** いろは言霊解結果 */
export interface IrohaKotodamaGuidance {
  nameAnalysis: NameSoundAnalysis | null;
  deficientTones: string[];
  excessiveTones: string[];
  guidingAxis: string;
  soulDirection: string;
  supportiveTones: string[];
  calmingTones: string[];
  openingTones: string[];
  bindingTones: string[];
  guidingMessage: string;
}

/** 御神託メッセージ */
export interface OracleMessage {
  shortOracle: string;
  longOracle: string;
  coreAwakeningPoint: string;
  oneActionNow: string;
}

/** パイプライン全体の出力 */
export interface GuidanceResult {
  version: string;
  generatedAt: string;
  premise: {
    birthDate: string;
    name: string;
    confidence: string;
    mode: string;
  };
  concernIntake: ConcernIntake;
  sukuyoResult: FullDiagnosisResult & {
    shukuReading: string;
    shukuSanskrit: string;
    shukuElement: string;
    shukuNature: string;
    shukuOverview: string;
    shukuPersonality: string;
    shukuFortuneType: string;
    shukuLuckyColor: string;
    shukuPowerStone: string;
    meikyu: string;
    palaceConfigStr: Record<string, string>;
  };
  lifeAlgorithmAnalysis: LifeAlgorithmAnalysis;
  disasterClassification: DisasterProfile;
  amatsuKanagiReversal: AmatsuKanagiReversal;
  irohaKotodamaGuidance: IrohaKotodamaGuidance;
  practiceProtocol: {
    prescription: KotodamaPrescription;
    practicePlan: PracticePlan;
  };
  oracleMessage: OracleMessage;
  report: {
    chapters: Array<{ number: number; title: string; content: string }>;
    fullText: string;
    charCount: number;
  };
  warnings: string[];
}

// ============================================================
// 27宿 人生アルゴリズムデータベース
// ============================================================

interface ShukuAlgorithm {
  outerPersona: string;
  innerPersona: string;
  motivationRoot: string;
  fearRoot: string;
  defenseReaction: string;
  repeatingFailurePattern: string;
  collapseSign: string;
  recoveryEntry: string;
}

const SHUKU_LIFE_ALGORITHM: Record<string, ShukuAlgorithm> = {
  "昴": {
    outerPersona: "華やかで社交的、場の中心に立つ存在感を放つ",
    innerPersona: "繊細で傷つきやすく、他者の評価に敏感な内面を持つ",
    motivationRoot: "美と調和への渇望、認められたいという根源的欲求",
    fearRoot: "無視されること、存在を否定されることへの恐怖",
    defenseReaction: "過剰な自己演出、または突然の引きこもり",
    repeatingFailurePattern: "他者の期待に合わせすぎて自分を見失い、疲弊して関係を断つ",
    collapseSign: "急に人付き合いを避け始める、容姿や外見への執着が極端になる",
    recoveryEntry: "一人の時間で自分の本音を聴く、創造的表現に没頭する",
  },
  "畢": {
    outerPersona: "穏やかで忍耐強い、信頼される安定感の持ち主",
    innerPersona: "頑固で変化を恐れ、一度決めたことを変えられない",
    motivationRoot: "安定と蓄積への欲求、確実なものを積み上げたい",
    fearRoot: "変化による喪失、築いたものが崩れることへの恐怖",
    defenseReaction: "変化を拒絶し現状維持に固執する、または沈黙で抵抗する",
    repeatingFailurePattern: "変化すべき時に動けず、機会を逃し続ける",
    collapseSign: "極端な保守化、新しい提案をすべて拒否する",
    recoveryEntry: "小さな変化を一つだけ受け入れる、信頼できる人に弱さを見せる",
  },
  "觜": {
    outerPersona: "知的で弁舌に優れ、分析力と洞察力で周囲を導く",
    innerPersona: "批判精神が強く、完璧主義で自他を裁く傾向がある",
    motivationRoot: "真理の探究、物事の本質を見抜きたいという知的渇望",
    fearRoot: "無知であること、間違いを犯すことへの恐怖",
    defenseReaction: "過剰な分析と批判、理屈で感情を封じる",
    repeatingFailurePattern: "正論で人を追い詰め、孤立する。完璧を求めて何も完成しない",
    collapseSign: "他者への批判が止まらなくなる、自分の感情を完全に無視する",
    recoveryEntry: "不完全な自分を許す、感情を言葉にして出す",
  },
  "参": {
    outerPersona: "行動力と決断力に満ち、先頭に立って道を切り開く",
    innerPersona: "孤独を恐れながらも、他者に弱みを見せられない",
    motivationRoot: "征服と達成への衝動、自分の力で世界を変えたい",
    fearRoot: "無力であること、支配されることへの恐怖",
    defenseReaction: "攻撃的になる、または過剰に自立して他者を排除する",
    repeatingFailurePattern: "一人で突き進み、味方を失い、孤立した状態で燃え尽きる",
    collapseSign: "怒りが制御できなくなる、周囲との衝突が急増する",
    recoveryEntry: "助けを求めることを覚える、戦わない選択肢を持つ",
  },
  "井": {
    outerPersona: "明るく機知に富み、多才で器用に立ち回る",
    innerPersona: "落ち着きがなく、深く根を下ろすことを避ける",
    motivationRoot: "自由と多様性への渇望、束縛されたくない",
    fearRoot: "退屈、一つの場所に閉じ込められることへの恐怖",
    defenseReaction: "次々と新しいことに飛びつく、関係を浅く保つ",
    repeatingFailurePattern: "何事も中途半端に終わり、深い成果も深い関係も得られない",
    collapseSign: "極端な多忙、一つのことに集中できない焦燥感",
    recoveryEntry: "一つだけ選んで深く掘る、「退屈」の中に宝があると知る",
  },
  "鬼": {
    outerPersona: "直感力と霊感に優れ、見えないものを感じ取る",
    innerPersona: "感受性が強すぎて、他者の感情に巻き込まれやすい",
    motivationRoot: "真実を見通したい、表面の嘘を暴きたい",
    fearRoot: "騙されること、本質を見失うことへの恐怖",
    defenseReaction: "過剰な警戒心、人を信じられなくなる",
    repeatingFailurePattern: "疑心暗鬼で人を遠ざけ、孤立する。感受性の過負荷で心身を壊す",
    collapseSign: "被害妄想的な思考、極端な人間不信",
    recoveryEntry: "信頼できる一人との深い対話、自然の中で感覚をリセットする",
  },
  "柳": {
    outerPersona: "情熱的で感情豊か、芸術的感性と表現力を持つ",
    innerPersona: "感情の波が激しく、執着と嫉妬に苦しむ",
    motivationRoot: "深い愛と一体感への渇望、魂レベルでの繋がりを求める",
    fearRoot: "裏切り、愛を失うことへの恐怖",
    defenseReaction: "感情の爆発、または冷酷な無関心への切り替え",
    repeatingFailurePattern: "愛に溺れて自分を見失い、裏切られたと感じて破壊的になる",
    collapseSign: "感情の制御不能、極端な執着または極端な無関心",
    recoveryEntry: "感情を創造的表現に昇華する、愛と執着の違いを学ぶ",
  },
  "星": {
    outerPersona: "華やかで自信に満ち、リーダーシップと統率力を発揮する",
    innerPersona: "プライドが高く、失敗を認められない脆さを持つ",
    motivationRoot: "栄光と称賛への欲求、特別な存在でありたい",
    fearRoot: "平凡であること、注目されないことへの恐怖",
    defenseReaction: "自己顕示欲の暴走、または自虐的な自己卑下",
    repeatingFailurePattern: "プライドが邪魔して助けを求められず、一人で崩壊する",
    collapseSign: "過剰な自慢、または急激な自信喪失",
    recoveryEntry: "等身大の自分を受け入れる、他者の成功を祝福する",
  },
  "張": {
    outerPersona: "堂々として威厳があり、自然と人を惹きつけるカリスマ性",
    innerPersona: "支配欲が強く、思い通りにならないと苛立つ",
    motivationRoot: "影響力と支配への欲求、世界を自分の理想通りにしたい",
    fearRoot: "無力感、コントロールを失うことへの恐怖",
    defenseReaction: "過剰な支配、または完全な放棄",
    repeatingFailurePattern: "支配しようとして反発を招き、孤立する。理想と現実の乖離に苦しむ",
    collapseSign: "独裁的な振る舞い、周囲の意見を一切聞かなくなる",
    recoveryEntry: "委ねることを学ぶ、完璧な支配を手放す",
  },
  "翼": {
    outerPersona: "誠実で勤勉、コツコツと努力を積み重ねる実務家",
    innerPersona: "自己評価が低く、成果を出しても満足できない",
    motivationRoot: "完成と達成への欲求、確実に結果を出したい",
    fearRoot: "不完全であること、努力が報われないことへの恐怖",
    defenseReaction: "過剰な努力、自分を追い込む",
    repeatingFailurePattern: "完璧を求めて自分を消耗させ、燃え尽きる。成果を認められない",
    collapseSign: "休めない、止まれない、自分を責め続ける",
    recoveryEntry: "「十分である」と自分に許可を出す、過程を楽しむことを覚える",
  },
  "軫": {
    outerPersona: "思慮深く慎重、計画性と分析力に優れた参謀型",
    innerPersona: "心配性で悲観的、最悪の事態を常に想定する",
    motivationRoot: "安全と秩序への欲求、リスクを最小化したい",
    fearRoot: "予測不能な事態、混乱への恐怖",
    defenseReaction: "過剰な計画と準備、行動の先延ばし",
    repeatingFailurePattern: "考えすぎて動けず、チャンスを逃す。心配が現実を引き寄せる",
    collapseSign: "不安が止まらない、決断を完全に回避する",
    recoveryEntry: "不完全な状態で一歩踏み出す、「やってみる」を選ぶ",
  },
  "角": {
    outerPersona: "公正で正義感が強く、バランス感覚に優れた調停者",
    innerPersona: "優柔不断で、対立を避けるために自分を犠牲にする",
    motivationRoot: "調和と公平への欲求、すべてが均衡した状態を求める",
    fearRoot: "対立、不和、争いへの恐怖",
    defenseReaction: "八方美人、自分の意見を隠す",
    repeatingFailurePattern: "全員を満足させようとして誰も満足させられず、自分が消耗する",
    collapseSign: "自分の意見が完全に消える、慢性的な疲労",
    recoveryEntry: "「嫌われる勇気」を持つ、自分の本音を一つ言う",
  },
  "亢": {
    outerPersona: "独立心が強く、自分の信念を貫く孤高の存在",
    innerPersona: "頑固で融通が利かず、孤立を招きやすい",
    motivationRoot: "自己の信念を守りたい、妥協したくない",
    fearRoot: "信念を曲げること、自分を裏切ることへの恐怖",
    defenseReaction: "頑なに自説を曲げない、対話を拒否する",
    repeatingFailurePattern: "正しさに固執して人を遠ざけ、理解者を失う",
    collapseSign: "完全な孤立、「誰も分かってくれない」という思考",
    recoveryEntry: "他者の正しさも認める、柔軟性を一つ持つ",
  },
  "氐": {
    outerPersona: "温厚で協調性があり、周囲との和を大切にする",
    innerPersona: "依存的で、一人でいることに耐えられない",
    motivationRoot: "所属と承認への欲求、誰かに必要とされたい",
    fearRoot: "孤独、見捨てられることへの恐怖",
    defenseReaction: "過剰な迎合、自分を消して相手に合わせる",
    repeatingFailurePattern: "依存関係に陥り、相手に振り回される。自分の軸を失う",
    collapseSign: "相手なしでは何も決められない、自己喪失",
    recoveryEntry: "一人の時間を意図的に作る、自分だけの判断で小さな決断をする",
  },
  "房": {
    outerPersona: "包容力があり、面倒見が良く、人を育てる力を持つ",
    innerPersona: "過保護で支配的、相手の自立を妨げる傾向がある",
    motivationRoot: "養育と保護への欲求、誰かを守りたい",
    fearRoot: "必要とされなくなること、役割を失うことへの恐怖",
    defenseReaction: "過剰な世話焼き、相手の問題を自分の問題にする",
    repeatingFailurePattern: "助けすぎて相手の成長を妨げ、感謝されず消耗する",
    collapseSign: "「誰も感謝してくれない」という怒り、燃え尽き",
    recoveryEntry: "助けないことも愛であると知る、自分自身を最初にケアする",
  },
  "心": {
    outerPersona: "鋭い洞察力と直感を持ち、本質を見抜く力がある",
    innerPersona: "疑い深く、裏を読みすぎて人間関係が複雑になる",
    motivationRoot: "真実と本質への渇望、嘘を見抜きたい",
    fearRoot: "欺かれること、本質を見誤ることへの恐怖",
    defenseReaction: "過剰な分析と疑念、人を試す行動",
    repeatingFailurePattern: "疑いすぎて信頼関係を壊す。裏を読みすぎて素直な好意を受け取れない",
    collapseSign: "誰も信じられない状態、極端な孤立",
    recoveryEntry: "一人を無条件に信じてみる、直感を理屈で否定しない",
  },
  "尾": {
    outerPersona: "忍耐力と持久力に優れ、最後までやり遂げる意志の強さ",
    innerPersona: "執念深く、過去を手放せない",
    motivationRoot: "完遂と勝利への欲求、途中で投げ出したくない",
    fearRoot: "未完了、中途半端に終わることへの恐怖",
    defenseReaction: "過去への執着、終わったことを蒸し返す",
    repeatingFailurePattern: "終わるべきものを終わらせられず、過去に縛られ続ける",
    collapseSign: "過去の恨みや後悔に支配される、前を向けない",
    recoveryEntry: "一つだけ手放す練習をする、「終わり」を祝福する",
  },
  "箕": {
    outerPersona: "自由奔放で型破り、既存の枠に収まらない独創性",
    innerPersona: "反骨精神が強すぎて、建設的な関係を築けない",
    motivationRoot: "自由と革新への渇望、既存の秩序を壊したい",
    fearRoot: "束縛、型にはめられることへの恐怖",
    defenseReaction: "反抗、ルール違反、権威への挑戦",
    repeatingFailurePattern: "反発ばかりで建設的な代案を出せず、破壊だけして孤立する",
    collapseSign: "すべてに反発する、何も受け入れられない状態",
    recoveryEntry: "壊すだけでなく創る側に回る、自由の中に秩序を見出す",
  },
  "斗": {
    outerPersona: "野心的で向上心が強く、高い目標に向かって邁進する",
    innerPersona: "競争心が強すぎて、他者を敵と見なしやすい",
    motivationRoot: "上昇と成功への欲求、頂点に立ちたい",
    fearRoot: "敗北、他者に劣ることへの恐怖",
    defenseReaction: "過剰な競争、勝ち負けですべてを判断する",
    repeatingFailurePattern: "競争に勝っても満足できず、次の敵を探し続けて疲弊する",
    collapseSign: "勝利への執着が異常になる、味方まで敵に見える",
    recoveryEntry: "競争ではなく共創を選ぶ、「十分に成功している」と認める",
  },
  "女": {
    outerPersona: "繊細で気配りに優れ、場の空気を読む力がある",
    innerPersona: "自己犠牲的で、自分の欲求を後回しにする",
    motivationRoot: "奉仕と献身への欲求、誰かの役に立ちたい",
    fearRoot: "自分勝手だと思われること、迷惑をかけることへの恐怖",
    defenseReaction: "過剰な自己犠牲、「私はいいから」が口癖になる",
    repeatingFailurePattern: "自分を犠牲にし続けて限界を超え、突然爆発するか倒れる",
    collapseSign: "慢性的な疲労、「もう何もしたくない」という無気力",
    recoveryEntry: "自分の欲求を一つだけ優先する、「No」を言う練習をする",
  },
  "虚": {
    outerPersona: "神秘的で哲学的、深い思索と精神世界への関心を持つ",
    innerPersona: "現実逃避的で、地に足がつかない",
    motivationRoot: "超越と悟りへの渇望、現実を超えた真理を求める",
    fearRoot: "俗世に埋もれること、精神性を失うことへの恐怖",
    defenseReaction: "現実からの逃避、空想の世界に閉じこもる",
    repeatingFailurePattern: "理想ばかり追って現実が崩壊する。地に足がつかず成果が出ない",
    collapseSign: "完全な現実逃避、日常生活の破綻",
    recoveryEntry: "一つだけ現実的な行動を毎日する、体を動かす",
  },
  "危": {
    outerPersona: "大胆で冒険心に富み、リスクを恐れない行動力",
    innerPersona: "衝動的で後先を考えず、自滅的な行動を取りやすい",
    motivationRoot: "刺激と興奮への渇望、退屈な日常から脱出したい",
    fearRoot: "退屈、平穏すぎる日常への恐怖",
    defenseReaction: "無謀な行動、意図的にリスクを取る",
    repeatingFailurePattern: "刺激を求めて危険に飛び込み、自滅する。安定を壊す",
    collapseSign: "自滅的な行動が加速する、危険を楽しんでいる自覚がない",
    recoveryEntry: "「安定の中の冒険」を見つける、小さなリスクで満足する練習",
  },
  "室": {
    outerPersona: "実行力と建設力に優れ、ゼロから何かを築き上げる力",
    innerPersona: "完璧主義で、自分の基準に達しないものを許せない",
    motivationRoot: "創造と建設への欲求、形あるものを残したい",
    fearRoot: "無意味であること、何も残せないことへの恐怖",
    defenseReaction: "過剰な建設、休むことへの罪悪感",
    repeatingFailurePattern: "作り続けて壊し続ける。完璧でないものを認められず、成果を捨てる",
    collapseSign: "作ったものを自ら壊す、永遠に完成しない",
    recoveryEntry: "不完全なまま完成とする勇気、「これでよい」と言う",
  },
  "壁": {
    outerPersona: "学識豊かで教養があり、知識の伝達と教育に優れる",
    innerPersona: "理論に偏り、実践が伴わない",
    motivationRoot: "知識と理解への欲求、すべてを知りたい",
    fearRoot: "無知であること、理解できないことへの恐怖",
    defenseReaction: "知識の蓄積に逃避、行動を理論で先延ばしにする",
    repeatingFailurePattern: "知っているが動けない。理論武装で行動を回避し続ける",
    collapseSign: "知識だけが増えて何も変わらない、頭でっかち",
    recoveryEntry: "知識を一つだけ実践に移す、「やってから考える」を試す",
  },
  "奎": {
    outerPersona: "芸術的感性と美意識に優れ、独自の世界観を持つ",
    innerPersona: "理想が高すぎて現実に失望しやすい",
    motivationRoot: "美と理想の実現への渇望、完璧な世界を創りたい",
    fearRoot: "醜さ、理想の崩壊への恐怖",
    defenseReaction: "理想に逃避、現実を否定する",
    repeatingFailurePattern: "理想と現実のギャップに苦しみ、何も始められない",
    collapseSign: "現実を完全に拒絶する、理想の世界に閉じこもる",
    recoveryEntry: "不完全な現実の中に美を見出す、小さな理想を一つ実現する",
  },
  "婁": {
    outerPersona: "社交的で人脈が広く、人と人を繋ぐ力がある",
    innerPersona: "表面的な関係に終始し、深い絆を築けない",
    motivationRoot: "繋がりと交流への欲求、多くの人と関わりたい",
    fearRoot: "深い関係、本音を見せることへの恐怖",
    defenseReaction: "広く浅い関係を維持、深入りを避ける",
    repeatingFailurePattern: "多くの人と繋がっているのに孤独。誰にも本音を言えない",
    collapseSign: "人に囲まれているのに空虚感、表面的な笑顔の裏の疲弊",
    recoveryEntry: "一人だけに本音を話す、深い関係を一つ育てる",
  },
  "胃": {
    outerPersona: "エネルギッシュで食欲旺盛、物質的な豊かさを追求する",
    innerPersona: "貪欲で満足を知らず、常に「もっと」を求める",
    motivationRoot: "豊かさと充足への欲求、満たされたい",
    fearRoot: "欠乏、足りないことへの恐怖",
    defenseReaction: "過剰な蓄積、手放すことへの抵抗",
    repeatingFailurePattern: "得ても得ても満足できず、際限なく求め続けて疲弊する",
    collapseSign: "物質的執着の暴走、「足りない」が止まらない",
    recoveryEntry: "今あるものに感謝する練習、一つ手放す",
  },
};

// ============================================================
// 天津金木反転マッピング
// ============================================================

interface ReversalMapping {
  dominantForce: string;
  secondaryForce: string;
  imbalanceAxis: string;
  collapseMechanism: string;
  reversalAxis: string;
  blessingShift: string;
  actionKeywords: string[];
}

const DISASTER_TO_REVERSAL: Record<string, ReversalMapping> = {
  "衝突型": {
    dominantForce: "火（正火・攻撃性）",
    secondaryForce: "外発（左旋外発）",
    imbalanceAxis: "火過多 / 外発過多 / 拡張過多",
    collapseMechanism: "火の力が制御を超え、周囲を焼き尽くす。外へ向かう力が強すぎて、内省が消える",
    reversalAxis: "火→水 / 外発→内集 / 拡張→凝縮",
    blessingShift: "攻撃力を「守る力」に変換する。正面突破ではなく、水のように流れて包み込む",
    actionKeywords: ["受容", "傾聴", "一呼吸", "水の動き", "柔軟"],
  },
  "停滞型": {
    dominantForce: "水（昇水・停滞性）",
    secondaryForce: "内集（右旋内集）",
    imbalanceAxis: "水過多 / 内集過多 / 凝縮過多",
    collapseMechanism: "水の力が淀み、流れを失う。内へ向かう力が強すぎて、外への一歩が出ない",
    reversalAxis: "水→火 / 内集→外発 / 凝縮→拡張",
    blessingShift: "慎重さを「確実な一歩」に変換する。淀みを解き、小さな流れを作る",
    actionKeywords: ["決断", "一歩", "発信", "火を灯す", "動き出す"],
  },
  "散漫型": {
    dominantForce: "火（拡散性）",
    secondaryForce: "外発（左旋外発）",
    imbalanceAxis: "拡張過多 / 中心不在 / 火の散逸",
    collapseMechanism: "火が四方に散り、一点に集中できない。中心軸が定まらず、すべてが中途半端になる",
    reversalAxis: "拡張→凝縮 / 周縁→中心 / 散逸→集中",
    blessingShift: "多才さを「一点集中の深さ」に変換する。散る火を一つの炉に集める",
    actionKeywords: ["集中", "選択", "一つだけ", "中心に戻る", "深掘り"],
  },
  "依存型": {
    dominantForce: "水（受容性・吸引性）",
    secondaryForce: "内集（右旋内集）",
    imbalanceAxis: "陰過多 / 受容過多 / 自己軸不在",
    collapseMechanism: "水が他者を吸い込みすぎて、自分の形を失う。相手の器に流れ込み、自己が消える",
    reversalAxis: "受容→自立 / 陰→陽 / 吸引→発信",
    blessingShift: "共感力を「自立した上での共鳴」に変換する。自分の器を持った上で、他者と響き合う",
    actionKeywords: ["自立", "自分軸", "境界線", "自己決定", "一人の時間"],
  },
  "過剰責任型": {
    dominantForce: "火（献身性・燃焼性）",
    secondaryForce: "外発（左旋外発）",
    imbalanceAxis: "火過多 / 外発過多 / 自己消耗",
    collapseMechanism: "火が他者のために燃え続け、自分の燃料が尽きる。与えすぎて空になる",
    reversalAxis: "外発→内集 / 与える→受け取る / 燃焼→充填",
    blessingShift: "献身力を「自分も含めた全体への奉仕」に変換する。まず自分を満たしてから与える",
    actionKeywords: ["自己充填", "受け取る", "休息", "境界", "自分を先に"],
  },
  "自己否定型": {
    dominantForce: "水（沈降性・自己溶解性）",
    secondaryForce: "内集（右旋内集）",
    imbalanceAxis: "陰過多 / 内集過多 / 自己溶解",
    collapseMechanism: "水が自分自身を溶かし、存在の輪郭が消える。自己否定が自己消滅に向かう",
    reversalAxis: "沈降→上昇 / 溶解→凝固 / 否定→肯定",
    blessingShift: "謙虚さを「確かな自己認識」に変換する。自分を否定するのではなく、ありのままを認める",
    actionKeywords: ["自己肯定", "存在の承認", "小さな成功", "鏡を見る", "声に出す"],
  },
  "焦燥暴発型": {
    dominantForce: "火（爆発性・過熱性）",
    secondaryForce: "外発（左旋外発）",
    imbalanceAxis: "火過多 / 外発過多 / 拡張過多",
    collapseMechanism: "火が制御を超えて爆発する。過熱した感情が一気に噴出し、すべてを焼き尽くす",
    reversalAxis: "火→水 / 爆発→鎮静 / 過熱→冷却",
    blessingShift: "情熱を「持続する温かさ」に変換する。爆発ではなく、炉の火のように安定させる",
    actionKeywords: ["鎮静", "呼吸", "冷却", "一晩置く", "水に触れる"],
  },
  "閉塞硬直型": {
    dominantForce: "水（凍結性・硬直性）",
    secondaryForce: "内集（右旋内集）",
    imbalanceAxis: "水過多 / 内集過多 / 凝縮過多",
    collapseMechanism: "水が凍りつき、流れが完全に止まる。変化を拒絶し、硬直した状態で窒息する",
    reversalAxis: "水→火 / 凍結→融解 / 硬直→柔軟",
    blessingShift: "堅実さを「柔軟な強さ」に変換する。氷を溶かし、再び流れを作る",
    actionKeywords: ["融解", "柔軟", "小さな変化", "火を灯す", "動き出す"],
  },
};

// ============================================================
// 言霊 音の属性データベース（カタカムナ・いろは言霊解準拠）
// ============================================================

interface ToneAttribute {
  element: string;        // 火/水/火水/中心
  direction: string;      // 外発/内集/中心/循環
  quality: string;        // 拡張/凝縮/結合/分離/中和
  spiritualName: string;  // 霊的分類名
  meaning: string;        // 思念の意味
}

const TONE_ATTRIBUTES: Record<string, ToneAttribute> = {
  "あ": { element: "火", direction: "外発", quality: "拡張", spiritualName: "正火の灵", meaning: "感受・生命の始まり" },
  "い": { element: "火水", direction: "中心", quality: "結合", spiritualName: "火水の灵", meaning: "伝わる・命の核" },
  "う": { element: "水", direction: "内集", quality: "凝縮", spiritualName: "昇水の灵", meaning: "生まれ出る・潜象から現象へ" },
  "え": { element: "火", direction: "外発", quality: "拡張", spiritualName: "煤火の灵", meaning: "選ぶ・分かれる" },
  "お": { element: "水", direction: "内集", quality: "凝縮", spiritualName: "結水の灵", meaning: "凝る・奥に向かう" },
  "か": { element: "火", direction: "外発", quality: "拡張", spiritualName: "空中水灵", meaning: "力・輝き" },
  "き": { element: "火", direction: "外発", quality: "分離", spiritualName: "正火の灵", meaning: "気・エネルギーの発動" },
  "く": { element: "水", direction: "内集", quality: "凝縮", spiritualName: "昇水の灵", meaning: "引き寄せ・求心" },
  "け": { element: "火", direction: "外発", quality: "分離", spiritualName: "煤火の灵", meaning: "分ける・放つ" },
  "こ": { element: "水", direction: "内集", quality: "凝縮", spiritualName: "結水の灵", meaning: "凝固・転がり込む" },
  "さ": { element: "火", direction: "外発", quality: "分離", spiritualName: "正火の灵", meaning: "差す・遮る・裂く" },
  "し": { element: "水", direction: "内集", quality: "結合", spiritualName: "昇水の灵", meaning: "示す・静める" },
  "す": { element: "火水", direction: "循環", quality: "中和", spiritualName: "火水の灵", meaning: "透る・澄む・統べる" },
  "せ": { element: "火", direction: "外発", quality: "拡張", spiritualName: "煤火の灵", meaning: "迫る・勢い" },
  "そ": { element: "水", direction: "内集", quality: "凝縮", spiritualName: "結水の灵", meaning: "添う・沿う・外れる" },
  "た": { element: "火", direction: "外発", quality: "拡張", spiritualName: "正火の灵", meaning: "立つ・分かれる・独立" },
  "ち": { element: "火", direction: "外発", quality: "凝縮", spiritualName: "火中の水灵", meaning: "凝縮・霊力・血" },
  "つ": { element: "水", direction: "内集", quality: "結合", spiritualName: "水中の火灵", meaning: "集まる・個体化" },
  "て": { element: "火水", direction: "外発", quality: "拡張", spiritualName: "火水の灵", meaning: "手・完了・届ける" },
  "と": { element: "水", direction: "内集", quality: "結合", spiritualName: "結水の灵", meaning: "統合・止まる・門" },
  "な": { element: "火", direction: "外発", quality: "結合", spiritualName: "正火の灵", meaning: "成る・核・中心" },
  "に": { element: "水", direction: "内集", quality: "凝縮", spiritualName: "昇水の灵", meaning: "煮る・定着" },
  "ぬ": { element: "水", direction: "内集", quality: "凝縮", spiritualName: "結水の灵", meaning: "抜く・貫く" },
  "ね": { element: "火", direction: "外発", quality: "拡張", spiritualName: "煤火の灵", meaning: "根・音・願い" },
  "の": { element: "水", direction: "内集", quality: "拡張", spiritualName: "昇水の灵", meaning: "伸びる・広がる" },
  "は": { element: "火", direction: "外発", quality: "拡張", spiritualName: "正火の灵", meaning: "引く・張る・母" },
  "ひ": { element: "火", direction: "外発", quality: "拡張", spiritualName: "正火の灵", meaning: "霊・日・根源の火" },
  "ふ": { element: "水", direction: "内集", quality: "拡張", spiritualName: "昇水の灵", meaning: "増える・吹く" },
  "へ": { element: "火", direction: "外発", quality: "分離", spiritualName: "煤火の灵", meaning: "隔てる・辺" },
  "ほ": { element: "火", direction: "外発", quality: "拡張", spiritualName: "正火の灵", meaning: "秀でる・穂・炎" },
  "ま": { element: "水", direction: "内集", quality: "結合", spiritualName: "昇水の灵", meaning: "間・真・円・受容" },
  "み": { element: "火水", direction: "中心", quality: "結合", spiritualName: "火水の灵", meaning: "実・身・満ちる" },
  "む": { element: "水", direction: "内集", quality: "凝縮", spiritualName: "結水の灵", meaning: "結ぶ・蒸す・六" },
  "め": { element: "火", direction: "外発", quality: "拡張", spiritualName: "煤火の灵", meaning: "芽・目・回る" },
  "も": { element: "水", direction: "内集", quality: "凝縮", spiritualName: "結水の灵", meaning: "藻・漏る・百" },
  "や": { element: "火", direction: "外発", quality: "拡張", spiritualName: "正火の灵", meaning: "弥・八・広がり" },
  "ゆ": { element: "水", direction: "内集", quality: "拡張", spiritualName: "昇水の灵", meaning: "揺れる・湯・緩む" },
  "よ": { element: "火", direction: "外発", quality: "結合", spiritualName: "煤火の灵", meaning: "寄る・四・世" },
  "ら": { element: "火", direction: "外発", quality: "拡張", spiritualName: "正火の灵", meaning: "螺旋・光" },
  "り": { element: "火", direction: "外発", quality: "分離", spiritualName: "正火の灵", meaning: "離れる・理・利" },
  "る": { element: "水", direction: "内集", quality: "循環", spiritualName: "昇水の灵", meaning: "流れる・留まる" },
  "れ": { element: "火", direction: "外発", quality: "分離", spiritualName: "煤火の灵", meaning: "連なる・霊" },
  "ろ": { element: "水", direction: "内集", quality: "凝縮", spiritualName: "結水の灵", meaning: "炉・路・凝る" },
  "わ": { element: "火水", direction: "循環", quality: "結合", spiritualName: "火水の灵", meaning: "和・輪・環" },
  "を": { element: "水", direction: "内集", quality: "凝縮", spiritualName: "結水の灵", meaning: "緒・尾" },
  "ん": { element: "火水", direction: "中心", quality: "結合", spiritualName: "火水の灵", meaning: "韻・隠・完結" },
};

// ============================================================
// Phase 1: 悩み聴取の構造化
// ============================================================

function normalizeConcernIntake(
  currentConcern: string,
  options?: {
    painDomain?: string[];
    startPeriod?: string;
    repeatPattern?: boolean;
    triggerSituations?: string[];
    selfRecognizedWeakness?: string[];
    desiredState?: string;
  }
): ConcernIntake {
  // 悩みテキストからドメインを推定
  const domainKeywords: Record<string, string[]> = {
    relationship: ["恋愛", "恋人", "パートナー", "結婚", "離婚", "浮気", "別れ", "出会い", "片思い"],
    work: ["仕事", "転職", "職場", "上司", "部下", "キャリア", "起業", "収入", "給料", "ビジネス"],
    family: ["家族", "親", "子供", "兄弟", "姉妹", "夫", "妻", "嫁", "姑", "介護"],
    money: ["お金", "借金", "貯金", "投資", "金銭", "経済", "財産", "ローン"],
    body: ["健康", "病気", "体調", "メンタル", "うつ", "不眠", "疲労", "ストレス", "体"],
    identity: ["自分", "生き方", "人生", "意味", "目的", "方向", "迷い", "自信", "存在"],
  };

  const detectedDomains = options?.painDomain || [];
  if (detectedDomains.length === 0) {
    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (keywords.some(kw => currentConcern.includes(kw))) {
        detectedDomains.push(domain);
      }
    }
    if (detectedDomains.length === 0) {
      detectedDomains.push("identity");
    }
  }

  // 繰り返しパターンの推定
  const repeatIndicators = ["また", "いつも", "繰り返", "何度も", "毎回", "ずっと", "昔から"];
  const isRepeat = options?.repeatPattern ?? repeatIndicators.some(kw => currentConcern.includes(kw));

  // 核心の問いを抽出
  const coreQuestion = extractCoreQuestion(currentConcern, detectedDomains);

  return {
    currentConcern,
    painDomain: detectedDomains,
    startPeriod: options?.startPeriod || "不明",
    repeatPattern: isRepeat,
    triggerSituations: options?.triggerSituations || [],
    selfRecognizedWeakness: options?.selfRecognizedWeakness || [],
    desiredState: options?.desiredState || "",
    coreQuestion,
  };
}

function extractCoreQuestion(concern: string, domains: string[]): string {
  // P6: ユーザー入力を最優先。テンプレ置換を禁止する。
  // ユーザーが悩みを入力している場合、その原文をそのまま使う。
  const trimmed = concern.trim();
  if (trimmed && trimmed !== "特定の悩みは未入力。総合鑑定として解析する。") {
    return trimmed;
  }
  // 悩み未入力の場合のみ、ドメインからデフォルト問いを生成
  if (domains.includes("relationship")) return "人との関係における本質的な課題";
  if (domains.includes("work")) return "仕事・キャリアにおける本質的な課題";
  if (domains.includes("family")) return "家族関係における本質的な課題";
  if (domains.includes("money")) return "経済・金銭における本質的な課題";
  if (domains.includes("body")) return "心身の健康における本質的な課題";
  return "人生全般における本質的な課題";
}

// ============================================================
// Phase 3: 人生アルゴリズム真相解析
// ============================================================

function analyzeLifeAlgorithm(
  honmeiShuku: string,
  concern: ConcernIntake
): LifeAlgorithmAnalysis {
  const algo = SHUKU_LIFE_ALGORITHM[honmeiShuku];
  if (!algo) {
    return {
      outerPersona: `${honmeiShuku}宿の表の人格（データ準備中）`,
      innerPersona: `${honmeiShuku}宿の裏の人格（データ準備中）`,
      motivationRoot: "解析中",
      fearRoot: "解析中",
      defenseReaction: "解析中",
      repeatingFailurePattern: "解析中",
      collapseSign: "解析中",
      recoveryEntry: "解析中",
    };
  }
  return {
    outerPersona: algo.outerPersona,
    innerPersona: algo.innerPersona,
    motivationRoot: algo.motivationRoot,
    fearRoot: algo.fearRoot,
    defenseReaction: algo.defenseReaction,
    repeatingFailurePattern: algo.repeatingFailurePattern,
    collapseSign: algo.collapseSign,
    recoveryEntry: algo.recoveryEntry,
  };
}

// ============================================================
// Phase 5: 天津金木反転解析
// ============================================================

function analyzeAmatsuKanagiReversal(
  disasterProfile: DisasterProfile
): AmatsuKanagiReversal {
  const coreType = disasterProfile.corePattern;
  const reversal = DISASTER_TO_REVERSAL[coreType];
  if (!reversal) {
    // フォールバック: 水火の偏りから推定
    const isFireDominant = disasterProfile.fireWaterImbalance.includes("火");
    return {
      dominantForce: isFireDominant ? "火（過熱性）" : "水（停滞性）",
      secondaryForce: isFireDominant ? "外発" : "内集",
      imbalanceAxis: isFireDominant ? "火過多 / 外発過多" : "水過多 / 内集過多",
      collapseMechanism: isFireDominant
        ? "火の力が制御を超え、周囲との調和が崩れる"
        : "水の力が淀み、流れと変化が止まる",
      reversalAxis: isFireDominant ? "火→水 / 外発→内集" : "水→火 / 内集→外発",
      blessingShift: isFireDominant
        ? "攻撃力を守護力に変換し、水の柔軟さで包み込む"
        : "慎重さを確実な一歩に変換し、火の力で動き出す",
      actionKeywords: isFireDominant
        ? ["受容", "鎮静", "傾聴", "柔軟", "水に触れる"]
        : ["決断", "一歩", "発信", "火を灯す", "動き出す"],
    };
  }
  return reversal;
}

// ============================================================
// Phase 6: いろは言霊解（拡張版）
// ============================================================

function analyzeIrohaKotodama(
  nameHiragana: string | undefined,
  disasterProfile: DisasterProfile,
  reversal: AmatsuKanagiReversal
): IrohaKotodamaGuidance {
  if (!nameHiragana) {
    return {
      nameAnalysis: null,
      deficientTones: [],
      excessiveTones: [],
      guidingAxis: reversal.reversalAxis,
      soulDirection: reversal.blessingShift,
      supportiveTones: [],
      calmingTones: [],
      openingTones: [],
      bindingTones: [],
      guidingMessage: "名前が未入力のため、音の解析は省略。宿曜と天津金木の解析結果に基づく導きを参照してください。",
    };
  }

  // 名前をひらがなに正規化
  const hiragana = nameHiragana
    .replace(/[ァ-ヶ]/g, (m) => String.fromCharCode(m.charCodeAt(0) - 0x60))
    .replace(/ー/g, "")
    .toLowerCase();

  // 音の分析
  const sounds: Array<{ char: string; attr: ToneAttribute | null }> = [];
  for (const ch of hiragana) {
    sounds.push({ char: ch, attr: TONE_ATTRIBUTES[ch] || null });
  }

  // 元素バランスの計算
  let fireCount = 0, waterCount = 0, fireWaterCount = 0;
  let externalCount = 0, internalCount = 0, centerCount = 0;
  const elementCounts: Record<string, number> = {};

  for (const s of sounds) {
    if (!s.attr) continue;
    if (s.attr.element === "火") fireCount++;
    else if (s.attr.element === "水") waterCount++;
    else if (s.attr.element === "火水") fireWaterCount++;

    if (s.attr.direction === "外発") externalCount++;
    else if (s.attr.direction === "内集") internalCount++;
    else if (s.attr.direction === "中心") centerCount++;

    elementCounts[s.attr.spiritualName] = (elementCounts[s.attr.spiritualName] || 0) + 1;
  }

  const total = sounds.filter(s => s.attr).length;

  // 過剰音・欠損音の判定
  const excessiveTones: string[] = [];
  const deficientTones: string[] = [];

  if (total > 0) {
    const fireRatio = fireCount / total;
    const waterRatio = waterCount / total;
    if (fireRatio > 0.6) excessiveTones.push("火の音（外発・拡張が過剰）");
    if (waterRatio > 0.6) excessiveTones.push("水の音（内集・凝縮が過剰）");
    if (fireRatio < 0.2) deficientTones.push("火の音（行動力・決断力が不足）");
    if (waterRatio < 0.2) deficientTones.push("水の音（受容力・内省力が不足）");
    if (fireWaterCount === 0) deficientTones.push("火水の音（統合・調和の力が不足）");
    if (centerCount === 0) deficientTones.push("中心の音（軸・核の力が不足）");
  }

  // 反転軸に基づく処方音の決定
  const isFireDominant = reversal.dominantForce.includes("火");
  const supportiveTones = isFireDominant
    ? ["し（静める水）", "む（結ぶ水）", "る（流れる水）", "ま（受容の水）"]
    : ["か（力の火）", "た（立つ火）", "は（張る火）", "ひ（根源の火）"];
  const calmingTones = isFireDominant
    ? ["う（潜象の水）", "お（凝る水）", "ん（完結の中心）"]
    : ["あ（生命の火）", "い（命の核）", "わ（和の循環）"];
  const openingTones = ["あ（感受・始まり）", "か（力・輝き）", "な（成る・核）", "は（引く・母）"];
  const bindingTones = ["と（統合・門）", "む（結ぶ）", "わ（和・輪）", "ん（完結）"];

  // 魂の進路の判定
  const soundMeanings = sounds
    .filter(s => s.attr)
    .map(s => s.attr!.meaning)
    .join("→");

  const soulDirection = determineSoulDirection(sounds, reversal);
  const guidingMessage = generateGuidingMessage(nameHiragana, sounds, reversal, disasterProfile);

  // NameSoundAnalysis互換データの生成
  let nameAnalysis: NameSoundAnalysis | null = null;
  try {
    nameAnalysis = analyzeNameSounds(hiragana);
  } catch { /* ignore */ }

  return {
    nameAnalysis,
    deficientTones,
    excessiveTones,
    guidingAxis: reversal.reversalAxis,
    soulDirection,
    supportiveTones,
    calmingTones,
    openingTones,
    bindingTones,
    guidingMessage,
  };
}

function determineSoulDirection(
  sounds: Array<{ char: string; attr: ToneAttribute | null }>,
  reversal: AmatsuKanagiReversal
): string {
  const validSounds = sounds.filter(s => s.attr);
  if (validSounds.length === 0) return `宿曜と天津金木の理が示す導きに従い、${reversal.reversalAxis.split("/")[0].trim()}への転換を歩む`;

  const firstSound = validSounds[0];
  const lastSound = validSounds[validSounds.length - 1];

  const origin = firstSound.attr!.meaning;
  const destination = lastSound.attr!.meaning;

  return `名前の音は「${firstSound.char}（${origin}）」から始まり「${lastSound.char}（${destination}）」で結ぶ。` +
    `この魂は${firstSound.attr!.element}の力で発し、${lastSound.attr!.element}の力で着地する構造を持つ。` +
    `${reversal.blessingShift}`;
}

function generateGuidingMessage(
  name: string,
  sounds: Array<{ char: string; attr: ToneAttribute | null }>,
  reversal: AmatsuKanagiReversal,
  disaster: DisasterProfile
): string {
  const validSounds = sounds.filter(s => s.attr);
  if (validSounds.length === 0) return "";

  const soundDescriptions = validSounds
    .map(s => `${s.char}（${s.attr!.spiritualName}・${s.attr!.meaning}）`)
    .join("、");

  return `「${name}」の音の構造: ${soundDescriptions}。` +
    `この名は${disaster.corePattern}の災いに対し、${reversal.reversalAxis}の反転を内包している。` +
    `音の響きが示す道は、${reversal.blessingShift}。`;
}

// ============================================================
// Phase 8: 御神託生成
// ============================================================

function generateOracle(
  honmeiShuku: string,
  concern: ConcernIntake,
  lifeAlgo: LifeAlgorithmAnalysis,
  disaster: DisasterProfile,
  reversal: AmatsuKanagiReversal,
  kotodama: IrohaKotodamaGuidance
): OracleMessage {
  const coreAwakeningPoint = `あなたの苦しみは罰ではない。${honmeiShuku}宿が持つ「${lifeAlgo.motivationRoot}」という根源的な力が、` +
    `「${disaster.corePattern}」という形で偏ったとき、災いとして現れているだけである。` +
    `その偏りを知ることが、反転の第一歩となる。`;

  const oneActionNow = reversal.actionKeywords[0]
    ? `今日、一つだけ。「${reversal.actionKeywords[0]}」を選んでください。それが門になります。`
    : "今日、一つだけ。立ち止まって、自分の呼吸を聴いてください。";

  const shortOracle = `${honmeiShuku}の魂よ。その${disaster.corePattern}は、` +
    `${reversal.reversalAxis.split("/")[0].trim()}への転換を求める天の徴である。` +
    `${reversal.actionKeywords[0] || "一歩"}を選べ。それが道になる。`;

  const longOracle = generateLongOracle(honmeiShuku, concern, lifeAlgo, disaster, reversal, kotodama);

  return {
    shortOracle,
    longOracle,
    coreAwakeningPoint,
    oneActionNow,
  };
}

function generateLongOracle(
  honmeiShuku: string,
  concern: ConcernIntake,
  lifeAlgo: LifeAlgorithmAnalysis,
  disaster: DisasterProfile,
  reversal: AmatsuKanagiReversal,
  kotodama: IrohaKotodamaGuidance
): string {
  const lines: string[] = [];

  lines.push(`${honmeiShuku}宿に宿る魂よ。`);
  lines.push("");
  lines.push(`あなたが今感じている苦しみは、偶然ではない。`);
  lines.push(`それは${honmeiShuku}宿が生まれながらに持つ「${lifeAlgo.motivationRoot}」という力が、`);
  lines.push(`「${disaster.corePattern}」という形で偏り、災いとして現れたものである。`);
  lines.push("");
  lines.push(`この災いの本質は、${reversal.collapseMechanism}。`);
  lines.push(`しかし、この崩壊の中にこそ、反転の種がある。`);
  lines.push("");
  lines.push(`天津金木の理が示す反転軸は「${reversal.reversalAxis}」。`);
  lines.push(`${reversal.blessingShift}。`);
  lines.push("");

  if (kotodama.soulDirection) {
    lines.push(`${kotodama.soulDirection}`);
    lines.push("");
  }

  lines.push(`あなたの苦しみは罰ではない。`);
  lines.push(`それは、あなたが本来の道へ戻るために現れた徴である。`);
  lines.push("");
  lines.push(`今必要なのは、大きな変化ではない。`);
  lines.push(`「${reversal.actionKeywords[0] || "一歩"}」という、たった一つの選択である。`);
  lines.push(`その一歩が、門になる。`);

  return lines.join("\n");
}

// ============================================================
// Phase 9: 8章構成レポート整形
// ============================================================

function formatReport(
  premise: GuidanceResult["premise"],
  concern: ConcernIntake,
  diagnosis: FullDiagnosisResult,
  shukuData: any,
  lifeAlgo: LifeAlgorithmAnalysis,
  disaster: DisasterProfile,
  reversal: AmatsuKanagiReversal,
  kotodama: IrohaKotodamaGuidance,
  prescription: KotodamaPrescription,
  practicePlan: PracticePlan,
  oracle: OracleMessage,
  taiYou: TaiYouResult,
  threeLayer: any,
  palaceConfig: Record<string, string>,
  meikyu: string
): { chapters: Array<{ number: number; title: string; content: string }>; fullText: string } {

  const chapters: Array<{ number: number; title: string; content: string }> = [];

  // === 第1章: 総合神意サマリー ===
  {
    const lines: string[] = [];
    lines.push(`生年月日: ${premise.birthDate}`);
    lines.push(`名前: ${premise.name || "未入力"}`);
    lines.push(`本命宿: ${diagnosis.honmeiShuku}宿（${shukuData.reading}・${shukuData.sanskrit}）`);
    lines.push(`信頼度: ${premise.confidence}  算出モード: ${premise.mode}`);
    lines.push("");
    lines.push(`${diagnosis.honmeiShuku}宿に宿る魂は、「${lifeAlgo.motivationRoot}」を根源的な動力とする。`);
    lines.push(`現在の悩みの核心は「${concern.coreQuestion}」であり、これは${disaster.corePattern}の災い構造と深く連動している。`);
    lines.push(`天津金木の理が示す反転軸は「${reversal.reversalAxis}」。${reversal.blessingShift}。`);
    lines.push(`この鑑定は、あなたの苦しみの構造を解き明かし、反転の道筋を示すものである。`);
    chapters.push({ number: 1, title: "総合神意サマリー", content: lines.join("\n"), source: "天聞アーク総合裁定" } as any);
  }

  // === 第2章: 宿曜・宿命構造解析 ===
  {
    const lines: string[] = [];
    lines.push(`【本命宿】${diagnosis.honmeiShuku}宿`);
    lines.push(`  梵名: ${shukuData.sanskrit}  読み: ${shukuData.reading}`);
    lines.push(`  守護神: ${shukuData.deity || "—"}`);
    lines.push(`  水火属性: ${shukuData.element}（${shukuData.phase}）`);
    lines.push(`  宿の性質: ${shukuData.nature}（${shukuData.category}）`);
    lines.push(`  足数: ${shukuData.palaceFoot || "—"}`);
    lines.push("");
    lines.push(`【本命曜】${diagnosis.honmeiYo}曜`);
    lines.push(`【九星】${diagnosis.kyusei}`);
    lines.push(`【命宮】${meikyu}`);
    lines.push(`【躰用判定】${taiYou.taiYou}（${taiYou.interpretation}）`);
    lines.push("");
    lines.push(`【十二宮配置】`);
    for (const [key, value] of Object.entries(palaceConfig)) {
      lines.push(`  ${key}: ${value}`);
    }
    lines.push("");
    lines.push(`${diagnosis.honmeiShuku}宿は${shukuData.element}の気を帯び、${shukuData.nature}の性質を持つ。`);
    lines.push(`この宿に生まれた者は、${lifeAlgo.outerPersona}。`);
    lines.push(`しかしその内面には、${lifeAlgo.innerPersona}。`);
    lines.push("");
    // NAKSHATRA_DATAの詳細データを活用
    if (shukuData.overview) {
      lines.push(`【宿の概要】`);
      lines.push(shukuData.overview);
      lines.push("");
    }
    if (shukuData.personality) {
      lines.push(`【性格詳細】`);
      lines.push(shukuData.personality);
      lines.push("");
    }
    if (shukuData.palaceBelong) {
      lines.push(`【十二宮帰属】${shukuData.palaceBelong}に${shukuData.palaceFoot || ""}属する`);
      lines.push(`エレメント: ${shukuData.elementType || ""} / クオリティ: ${shukuData.quality || ""}`);
      lines.push(`惑星影響: ${shukuData.planetInfluence || ""}`);
      lines.push(`特殊運: ${shukuData.fortuneType || ""}`);
      lines.push("");
    }
    chapters.push({ number: 2, title: "宿曜・宿命構造解析", content: lines.join("\n"), source: "宿曜古典" } as any);
  }

  // === 第3章: 人生アルゴリズム真相解析 ===
  {
    const lines: string[] = [];
    lines.push(`【表の人格】${lifeAlgo.outerPersona}`);
    lines.push(`【裏の人格】${lifeAlgo.innerPersona}`);
    lines.push(`【欲求の根】${lifeAlgo.motivationRoot}`);
    lines.push(`【恐怖の根】${lifeAlgo.fearRoot}`);
    lines.push(`【防衛反応】${lifeAlgo.defenseReaction}`);
    lines.push("");
    lines.push(`【繰り返す失敗パターン】`);
    lines.push(`${lifeAlgo.repeatingFailurePattern}`);
    lines.push("");
    lines.push(`【崩壊前兆】${lifeAlgo.collapseSign}`);
    lines.push(`【回復の入り口】${lifeAlgo.recoveryEntry}`);
    lines.push("");
    lines.push(`${diagnosis.honmeiShuku}宿の人生アルゴリズムの核心は、「${lifeAlgo.motivationRoot}」という根源的欲求と「${lifeAlgo.fearRoot}」という根源的恐怖の間で揺れ動く構造にある。`);
    lines.push(`この二極の間で、${lifeAlgo.defenseReaction}という防衛反応が発動し、「${lifeAlgo.repeatingFailurePattern}」というパターンが繰り返される。`);
    if (concern.repeatPattern) {
      lines.push(`あなたが感じている「繰り返し」の感覚は、まさにこの人生アルゴリズムが作動している証拠である。`);
    }
    chapters.push({ number: 3, title: "人生アルゴリズム真相解析", content: lines.join("\n"), source: "天聞アーク独自解釈" } as any);
  }

  // === 第4章: 災い分類解析 ===
  {
    const lines: string[] = [];
    lines.push(`【主災い型】${disaster.corePattern}`);
    lines.push(`【副災い型】${disaster.subPattern}`);
    lines.push(`【水火の偏り】${disaster.fireWaterImbalance}`);
    lines.push("");
    lines.push(`【発火条件】`);
    for (const trigger of disaster.triggerConditions) {
      lines.push(`  ・${trigger}`);
    }
    lines.push("");
    lines.push(`【崩壊パターン】${disaster.collapsePattern}`);
    lines.push(`【回復の鍵】${disaster.recoveryKey}`);
    lines.push("");
    lines.push(`【各領域への影響】`);
    lines.push(`  対人リスク: ${disaster.relationRisk}`);
    lines.push(`  金銭リスク: ${disaster.moneyRisk}`);
    lines.push(`  心身リスク: ${disaster.bodyRisk}`);
    lines.push(`  時期リスク: ${disaster.timingRisk}`);
    lines.push("");
    lines.push(`${diagnosis.honmeiShuku}宿の災いは「${disaster.corePattern}」として現れる。`);
    lines.push(`これは性格の欠点ではなく、${lifeAlgo.motivationRoot}という力が偏ったときに生じる構造的な崩壊パターンである。`);
    lines.push(`この災いを知ることが、反転の第一歩となる。`);
    chapters.push({ number: 4, title: "災い分類解析", content: lines.join("\n"), source: "天聞アーク独自解釈" } as any);
  }

  // === 第5章: 天津金木反転解析 ===
  {
    const lines: string[] = [];
    lines.push(`【現在優勢な力】${reversal.dominantForce}`);
    lines.push(`【補助的な力】${reversal.secondaryForce}`);
    lines.push(`【崩壊を生む偏り】${reversal.imbalanceAxis}`);
    lines.push("");
    lines.push(`【なぜその偏りが災いになるか】`);
    lines.push(`${reversal.collapseMechanism}`);
    lines.push("");
    lines.push(`【反転軸】${reversal.reversalAxis}`);
    lines.push(`【幸への移行】${reversal.blessingShift}`);
    lines.push("");
    lines.push(`【行動キーワード】${reversal.actionKeywords.join("、")}`);
    lines.push("");
    lines.push(`天津金木の理において、すべての災いは水火の偏りから生じる。`);
    lines.push(`${disaster.corePattern}は${reversal.imbalanceAxis}の状態であり、${reversal.reversalAxis}への転換が求められている。`);
    lines.push(`これは「悪いものを消す」のではなく、「偏った力を本来の方向へ戻す」ことである。`);
    lines.push(`${reversal.blessingShift}。`);
    chapters.push({ number: 5, title: "天津金木反転解析", content: lines.join("\n"), source: "天津金木解釈" } as any);
  }

  // === 第6章: いろは言霊解 ===
  {
    const lines: string[] = [];
    if (kotodama.nameAnalysis && premise.name) {
      lines.push(`【名前の音の構造】「${premise.name}」`);
      lines.push(`${kotodama.guidingMessage}`);
      lines.push("");
      if (kotodama.excessiveTones.length > 0) {
        lines.push(`【過剰な音】${kotodama.excessiveTones.join("、")}`);
      }
      if (kotodama.deficientTones.length > 0) {
        lines.push(`【欠損する音】${kotodama.deficientTones.join("、")}`);
      }
      lines.push("");
      lines.push(`【補う音】${kotodama.supportiveTones.join("、")}`);
      lines.push(`【鎮める音】${kotodama.calmingTones.join("、")}`);
      lines.push(`【開く音】${kotodama.openingTones.join("、")}`);
      lines.push(`【締める音】${kotodama.bindingTones.join("、")}`);
    } else {
      lines.push(`名前が未入力のため、宿曜と天津金木の解析結果に基づく導きを示す。`);
    }
    lines.push("");
    lines.push(`【魂の進路】${kotodama.soulDirection}`);
    lines.push(`【導きの軸】${kotodama.guidingAxis}`);
    lines.push("");
    lines.push(`言霊の理において、音は単なる記号ではなく、水火の力そのものである。`);
    lines.push(`名前に刻まれた音の配列は、魂がこの世に持ち込んだ設計図であり、`);
    lines.push(`その音の偏りと欠損を知ることで、補正の道が見えてくる。`);
    chapters.push({ number: 6, title: "いろは言霊解", content: lines.join("\n"), source: "言霊処方" } as any);
  }

  // === 第7章: 日々の実践処方 ===
  {
    const lines: string[] = [];
    lines.push(`【朝の言霊】${prescription.morningPhrase}`);
    lines.push(`【対人前の言霊】${prescription.preConflictPhrase}`);
    lines.push(`【決断前の言霊】${prescription.decisionPhrase}`);
    lines.push(`【就寝前の言霊】${prescription.beforeSleepPhrase}`);
    lines.push(`【緊急停止用の言霊】${prescription.emergencyResetPhrase}`);
    lines.push("");
    lines.push(`【7日間実践】`);
    lines.push(`  目標: ${practicePlan.sevenDays.goal}`);
    for (const action of practicePlan.sevenDays.daily) {
      lines.push(`  ・${action}`);
    }
    lines.push("");
    lines.push(`【21日間実践】`);
    lines.push(`  目標: ${practicePlan.twentyOneDays.goal}`);
    for (const action of practicePlan.twentyOneDays.daily) {
      lines.push(`  ・${action}`);
    }
    lines.push("");
    lines.push(`【49日間実践】`);
    lines.push(`  目標: ${practicePlan.fortyNineDays.goal}`);
    for (const action of practicePlan.fortyNineDays.daily) {
      lines.push(`  ・${action}`);
    }
    lines.push("");
    lines.push(`これらの処方は、${disaster.corePattern}の災いを${reversal.reversalAxis}へ反転させるための実践である。`);
    lines.push(`言霊は唱えるだけで終わらせず、その音の響きを体に通すことが重要である。`);
    lines.push(`7日で気づき、21日で習慣化し、49日で構造が変わる。`);
    lines.push("");
    // NAKSHATRA_DATAの開運情報を追加
    if (shukuData.openingAdvice) {
      lines.push(`【開運の秘訣】`);
      lines.push(shukuData.openingAdvice);
      lines.push("");
    }
    if (shukuData.mantra) {
      lines.push(`【守護真言】`);
      lines.push(shukuData.mantra);
      lines.push("");
    }
    if (shukuData.luckyColor || shukuData.powerStone) {
      lines.push(`【開運アイテム】`);
      if (shukuData.luckyColor) lines.push(`ラッキーカラー: ${shukuData.luckyColor}`);
      if (shukuData.powerStone) lines.push(`パワーストーン: ${shukuData.powerStone}`);
      lines.push("");
    }
    chapters.push({ number: 7, title: "日々の実践処方", content: lines.join("\n"), source: "言霊処方＋天聞アーク独自裁定" } as any);
  }

  // === 第8章: 最終御神託 ===
  {
    const lines: string[] = [];
    lines.push(oracle.longOracle);
    lines.push("");
    lines.push(`---`);
    lines.push("");
    lines.push(`【御神託（短文）】`);
    lines.push(oracle.shortOracle);
    lines.push("");
    lines.push(`【覚醒の核心】`);
    lines.push(oracle.coreAwakeningPoint);
    lines.push("");
    lines.push(`【今すぐの一手】`);
    lines.push(oracle.oneActionNow);
    chapters.push({ number: 8, title: "最終御神託", content: lines.join("\n"), source: "天聞アーク総合裁定" } as any);
  }

  // === 全文テキスト生成 ===
  const fullLines: string[] = [];
  fullLines.push("===========================================");
  fullLines.push("  天聞アーク御神託レポート");
  fullLines.push("  宿曜経 × 天津金木 × 言霊秘書");
  fullLines.push("===========================================");
  fullLines.push("");

  for (const ch of chapters) {
    fullLines.push(`## ${ch.number}. ${ch.title}`);
    fullLines.push("");
    fullLines.push(ch.content);
    fullLines.push("");
    fullLines.push("---");
    fullLines.push("");
  }

  fullLines.push("===========================================");
  fullLines.push("  天聞アーク — 宿曜経 × 天津金木 × 言霊秘書");
  fullLines.push("  tenmon-ark-integrated-guidance-engine v2.0");
  fullLines.push("===========================================");

  const fullText = fullLines.join("\n");
  return { chapters, fullText };
}

// ============================================================
// メインパイプライン
// ============================================================

export interface GuidancePipelineInput {
  birthDate: Date;
  name?: string;
  currentConcern?: string;
  confidence?: "A" | "B" | "C" | "D";
  mode?: "BOOKCAL" | "ASTRO";
  consultationTheme?: string;
  painDomain?: string[];
  startPeriod?: string;
  repeatPattern?: boolean;
  triggerSituations?: string[];
  selfRecognizedWeakness?: string[];
  desiredState?: string;
}

export function runGuidancePipeline(input: GuidancePipelineInput): GuidanceResult {
  const warnings: string[] = [];
  const now = new Date();

  // --- Premise ---
  const y = input.birthDate.getUTCFullYear();
  const m = input.birthDate.getUTCMonth() + 1;
  const d = input.birthDate.getUTCDate();
  const birthDateStr = `${y}年${m}月${d}日`;

  const premise = {
    birthDate: birthDateStr,
    name: input.name || "",
    confidence: input.confidence || "C",
    mode: input.mode || "BOOKCAL",
  };

  // --- Phase 1: 悩み聴取 ---
  const concern = normalizeConcernIntake(
    input.currentConcern || "特定の悩みは未入力。総合鑑定として解析する。",
    {
      painDomain: input.painDomain,
      startPeriod: input.startPeriod,
      repeatPattern: input.repeatPattern,
      triggerSituations: input.triggerSituations,
      selfRecognizedWeakness: input.selfRecognizedWeakness,
      desiredState: input.desiredState,
    }
  );

  // --- Phase 2: 宿曜解析 ---
  const diagnosis = runFullDiagnosis(input.birthDate);
  const honmeiShuku = diagnosis.honmeiShuku;
  const shukuData = NAKSHATRA_DATA[honmeiShuku];
  const meikyu = diagnosis.meikyu;
  const palaceConfig = diagnosis.palaceConfig || {};

  // --- Phase 3: 人生アルゴリズム真相解析 ---
  const lifeAlgo = analyzeLifeAlgorithm(honmeiShuku, concern);

  // --- Phase 4: 災い分類 ---
  const disasterProfile = classifyDisaster(honmeiShuku, {
    confidence: input.confidence,
    consultationTheme: input.consultationTheme,
  });

  // --- Phase 5: 天津金木反転解析 ---
  const reversal = analyzeAmatsuKanagiReversal(disasterProfile);

  // --- Phase 6: いろは言霊解 ---
  const kotodamaGuidance = analyzeIrohaKotodama(input.name, disasterProfile, reversal);

  // --- Phase 7: 処方生成 ---
  const prescription = prescribeKotodama(disasterProfile);
  const practicePlan = generatePracticePlan(prescription, disasterProfile);

  // --- Phase 8: 御神託生成 ---
  const oracle = generateOracle(honmeiShuku, concern, lifeAlgo, disasterProfile, reversal, kotodamaGuidance);

  // --- Phase 9: レポート整形 ---
  const threeLayer = calculateThreeLayerPhase(input.birthDate);
  const taiYou = determineTaiYou(honmeiShuku as any, 0, input.birthDate);
  const palaceConfigStr: Record<string, string> = {};
  for (const [k, v] of Object.entries(palaceConfig)) {
    palaceConfigStr[k] = String(v);
  }

  const report = formatReport(
    premise,
    concern,
    diagnosis,
    shukuData,
    lifeAlgo,
    disasterProfile,
    reversal,
    kotodamaGuidance,
    prescription,
    practicePlan,
    oracle,
    taiYou,
    threeLayer,
    palaceConfigStr,
    meikyu
  );

  // --- Confidence warnings ---
  if (premise.confidence === "C" || premise.confidence === "D") {
    warnings.push(`信頼度${premise.confidence}: 出生時刻が不明のため、一部の判定（境界帯・十二宮の精密配置）に誤差が生じる可能性があります。`);
  }

  return {
    version: "2.0",
    generatedAt: now.toISOString(),
    premise,
    concernIntake: concern,
    sukuyoResult: {
      ...diagnosis,
      shukuReading: shukuData.reading,
      shukuSanskrit: shukuData.sanskrit,
      shukuElement: shukuData.element,
      shukuNature: shukuData.nature,
      shukuOverview: shukuData.overview,
      shukuPersonality: shukuData.personality,
      shukuFortuneType: shukuData.fortuneType,
      shukuLuckyColor: shukuData.luckyColor,
      shukuPowerStone: shukuData.powerStone,
      meikyu,
      palaceConfigStr: palaceConfigStr,
    },
    lifeAlgorithmAnalysis: lifeAlgo,
    disasterClassification: disasterProfile,
    amatsuKanagiReversal: reversal,
    irohaKotodamaGuidance: kotodamaGuidance,
    practiceProtocol: {
      prescription,
      practicePlan,
    },
    oracleMessage: oracle,
    report: {
      chapters: report.chapters,
      fullText: report.fullText,
      charCount: report.fullText.length,
    },
    warnings,
  };
}
