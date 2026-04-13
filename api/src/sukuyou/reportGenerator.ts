/**
 * 天聞アーク統合鑑定レポート v1.0
 * 
 * 宿曜経 × 天津金木 × 言霊秘書
 * 
 * 「占い」ではなく「人間OS解析レポート」
 * ①構造（再現性）＋②深度（多層分析）＋③統合（宿命→運命→天命）
 * 
 * セクション構成:
 *   §0 基本情報
 *   §1 宿命構造（不変領域）
 *   §2 運命構造（変動領域）
 *   §3 天命構造（魂の方向性）
 *   §4 人間分析（性格・能力・リスク・行動）
 *   §5 時間軸分析（過去・現在・未来）
 *   §6 相性構造（対人関係の法則）
 *   §7 開運処方箋
 *   §8 統合解読（宿命→運命→天命の統合）
 */

import {
  type Nakshatra, type Palace, type Planet, type RelationshipType,
  type Kyusei, type JuniChoku,
  NAKSHATRAS, NAKSHATRA_DATA, PALACE_DATA, PLANET_DATA,
  runFullDiagnosis, type FullDiagnosisResult
} from "./sukuyouEngine.js";

import {
  calculateThreeLayerPhase,
  analyzeNameKotodama,
  determineTaiYou,
  runCompleteDiagnosis,
  type TaiYouResult,
  type CompleteDiagnosisResult
} from "./integratedDiagnosis.js";

// ============================================
// 拡張宿データ（syukuyo.com準拠の詳細情報）
// ============================================

interface ExtendedShukuData {
  /** 十二宮の足配分（例: "獅子宮に一足、女宮に三足"） */
  palaceFootDetail: string;
  /** エレメント詳細 */
  elementDetail: string;
  /** クオリティ詳細 */
  qualityDetail: string;
  /** 惑星影響詳細 */
  planetDetail: string;
  /** 特殊運（海外運、人気運など） */
  specialFortune: string;
  /** ビューティアドバイス */
  beautyAdvice: string;
  /** ファッションアドバイス */
  fashionAdvice: string;
  /** 恋愛運上昇時期 */
  loveUpPeriod: string;
  /** 恋愛運下降時期 */
  loveDownPeriod: string;
  /** 仕事運上昇時期 */
  workUpPeriod: string;
  /** 仕事運下降時期 */
  workDownPeriod: string;
  /** 対応身体部位（syukuyo.com準拠） */
  bodyPartDetail: string;
  /** 表面人格 */
  surfacePersonality: string;
  /** 内面人格 */
  innerPersonality: string;
  /** 無意識層 */
  unconscious: string;
  /** 才能 */
  talents: string;
  /** 弱点 */
  weaknesses: string;
  /** 失敗パターン */
  failurePattern: string;
  /** 行動原理 */
  actionPrinciple: string;
  /** 判断基準 */
  judgmentCriteria: string;
  /** モチベーション源 */
  motivation: string;
}

/** 拡張宿データ（全27宿） */
const EXTENDED_SHUKU_DATA: Record<Nakshatra, ExtendedShukuData> = {
  "角": {
    palaceFootDetail: "室女宮に四足属する",
    elementDetail: "風のエレメント。知性と変化を司る",
    qualityDetail: "柔軟宮。適応力と多面性を持つ",
    planetDetail: "水星の影響。知性・分析力・コミュニケーション",
    specialFortune: "技芸運・知性運に恵まれる",
    beautyAdvice: "知的な印象を活かしたシャープなスタイリングが効果的。定期的な頭皮ケアとヘアスタイルの変化で運気上昇。",
    fashionAdvice: "モノトーンにアクセントカラーを加えた知的でシャープなスタイル。エメラルドグリーンやシルバーのアクセサリーが開運。",
    loveUpPeriod: "知的な出会いが増える時期に恋愛運上昇。学びの場での出会いに注目。",
    loveDownPeriod: "理想が高くなりすぎる時期に注意。完璧を求めすぎず、相手の良い面に目を向けて。",
    workUpPeriod: "新しいプロジェクトの立ち上げ時期に才能が開花。分析力を活かせる場面で評価上昇。",
    workDownPeriod: "周囲との摩擦が生じやすい時期。協調性を意識し、独断を避けること。",
    bodyPartDetail: "腰・背骨に対応。長時間の座り仕事に注意。",
    surfacePersonality: "知的で冷静、鋭い観察力を持つ分析家。物事の本質を見抜く目を持ち、論理的に物事を整理する。",
    innerPersonality: "内面には強い創造欲と破壊衝動を秘める。古いものを壊して新しい価値を生み出したいという衝動がある。",
    unconscious: "根底には「真理への渇望」がある。世界の仕組みを解き明かし、本質に到達したいという魂の欲求。",
    talents: "分析力、創造力、独立心。物事を構造的に捉え、新しい枠組みを生み出す力。",
    weaknesses: "協調性の欠如、完璧主義、孤立傾向。自分の正しさに固執しすぎる面。",
    failurePattern: "独断で突き進み、周囲の意見を無視して孤立する。理想と現実のギャップに苦しむ。",
    actionPrinciple: "論理と分析に基づいて行動する。感情よりも理性を優先する傾向。",
    judgmentCriteria: "合理性と効率性。本質的に正しいかどうかを基準に判断する。",
    motivation: "真理の探究と新しい価値の創造。未知の領域を切り開くことに喜びを感じる。"
  },
  "亢": {
    palaceFootDetail: "天秤宮に二足属する",
    elementDetail: "風のエレメント。調和と知性を司る",
    qualityDetail: "活動宮。主導力と開拓精神を持つ",
    planetDetail: "金星の影響。美・調和・人間関係",
    specialFortune: "学問運・慈悲運に恵まれる",
    beautyAdvice: "穏やかで知的な雰囲気を活かしたナチュラルメイクが効果的。ラベンダー系の香りでリラックス。",
    fashionAdvice: "上品で落ち着いたトーンの装い。ラベンダーや白を基調とした清楚なスタイルが開運。",
    loveUpPeriod: "学びの場や文化的な活動を通じた出会いに恵まれる時期。",
    loveDownPeriod: "自分の気持ちを抑えすぎて相手に伝わらない時期。素直な表現を心がけて。",
    workUpPeriod: "教育・医療・カウンセリング分野で才能が認められる時期。",
    workDownPeriod: "理論に偏りすぎて実践が疎かになる時期。行動に移す勇気を。",
    bodyPartDetail: "胸・呼吸器に対応。深呼吸と瞑想が健康の鍵。",
    surfacePersonality: "温和で知的、穏やかな物腰で誰からも好かれる。相談役として頼られることが多い。",
    innerPersonality: "内面には強い信念と学問への情熱を秘める。表面の穏やかさとは裏腹に、正義に対する強い思いがある。",
    unconscious: "根底には「人を救いたい」という慈悲の心がある。他者の苦しみを自分のものとして感じる共感力。",
    talents: "学問的探究力、共感力、教育力。人の心に寄り添い、導く力。",
    weaknesses: "優柔不断、自己犠牲的、理論偏重。行動に移すまでに時間がかかる。",
    failurePattern: "考えすぎて行動できない。他者に尽くしすぎて自分を見失う。",
    actionPrinciple: "道徳と学問に基づいて行動する。正しいことを追求する姿勢。",
    judgmentCriteria: "道義的に正しいかどうか。人の役に立つかどうかを基準に判断。",
    motivation: "知識の探究と他者への貢献。学びを通じて世界をより良くしたいという願い。"
  },
  "氐": {
    palaceFootDetail: "天秤宮に四足属する",
    elementDetail: "風のエレメント。調和と秩序を司る",
    qualityDetail: "活動宮。忍耐力と持続力を持つ",
    planetDetail: "金星の影響。美・調和・安定",
    specialFortune: "道徳運・忍耐運に恵まれる",
    beautyAdvice: "自然体の美しさを活かしたケアが効果的。土に触れるガーデニングやアロマテラピーが開運。",
    fashionAdvice: "深緑や茶色を基調とした落ち着いたアースカラーの装い。翡翠のアクセサリーが開運。",
    loveUpPeriod: "誠実さが評価される時期。長い交際の末に実を結ぶ恋愛に恵まれる。",
    loveDownPeriod: "相手に尽くしすぎて疲弊する時期。自分の気持ちも大切にすること。",
    workUpPeriod: "地道な努力が認められる時期。不動産や土地に関わる仕事で成果。",
    workDownPeriod: "変化への対応が遅れる時期。柔軟性を意識して。",
    bodyPartDetail: "腎臓・泌尿器に対応。水分摂取と冷え対策が重要。",
    surfacePersonality: "温厚で誠実、道徳心が高く信頼される人柄。一度決めたことは最後までやり遂げる。",
    innerPersonality: "内面には強い正義感と不正への怒りを秘める。穏やかな外見とは裏腹に、信念は揺るがない。",
    unconscious: "根底には「秩序への渇望」がある。世界に正しい秩序をもたらしたいという魂の使命。",
    talents: "忍耐力、誠実さ、道徳的判断力。長期的な視点で物事を成し遂げる力。",
    weaknesses: "頑固さ、変化への抵抗、自己犠牲。柔軟性に欠ける面。",
    failurePattern: "変化を拒み、時代の流れに取り残される。自分の正義を他者に押し付ける。",
    actionPrinciple: "道徳と忍耐に基づいて行動する。急がず焦らず、着実に歩む。",
    judgmentCriteria: "道義的に正しいかどうか。長期的に見て良い結果をもたらすかどうか。",
    motivation: "正義の実現と秩序の維持。世界をより良い場所にしたいという願い。"
  },
  "房": {
    palaceFootDetail: "天蠍宮に一足属する",
    elementDetail: "水のエレメント。情熱と変容を司る",
    qualityDetail: "不動宮。安定と持続を持つ",
    planetDetail: "火星の影響。行動力・情熱・リーダーシップ",
    specialFortune: "家運・威徳運に恵まれる",
    beautyAdvice: "威厳のある佇まいを活かしたケアが効果的。ワインレッドやゴールドの装飾品で運気上昇。",
    fashionAdvice: "ワインレッドやゴールドを基調とした格調高い装い。ガーネットのアクセサリーが開運。",
    loveUpPeriod: "家庭運が上昇する時期。安定した関係を築くパートナーとの出会い。",
    loveDownPeriod: "支配的になりすぎる時期。パートナーの自由を尊重すること。",
    workUpPeriod: "リーダーシップが発揮される時期。組織を率いる立場で成果。",
    workDownPeriod: "権力に溺れやすい時期。謙虚さを忘れないこと。",
    bodyPartDetail: "心臓・循環器に対応。適度な運動と規則正しい食事が大切。",
    surfacePersonality: "威厳と徳を兼ね備え、自然とリーダーの座に就く。人望が厚く、周囲に安定感を与える。",
    innerPersonality: "内面には家族や仲間への深い愛情を秘める。守るべきもののために全力を尽くす覚悟がある。",
    unconscious: "根底には「一族の繁栄」への使命感がある。血脈と伝統を守り、次世代に繋げたいという魂の願い。",
    talents: "リーダーシップ、統率力、家族愛。組織を率い、人を育てる力。",
    weaknesses: "支配的傾向、権力への執着、変化への恐れ。",
    failurePattern: "権力に溺れ、周囲の意見を聞かなくなる。物質的豊かさに執着しすぎる。",
    actionPrinciple: "威厳と徳に基づいて行動する。家族と組織の繁栄を最優先する。",
    judgmentCriteria: "一族や組織にとって最善かどうか。長期的な繁栄に繋がるかどうか。",
    motivation: "家族と組織の繁栄。守るべきものを守り、次世代に繋げること。"
  },
  "心": {
    palaceFootDetail: "天蠍宮に四足属する",
    elementDetail: "水のエレメント。洞察と変容を司る",
    qualityDetail: "不動宮。集中力と探究心を持つ",
    planetDetail: "冥王星の影響。変容・再生・深層心理",
    specialFortune: "人気運・地位運に恵まれる",
    beautyAdvice: "神秘的な魅力を活かしたメイクが効果的。ブラックやコーラルピンクのリップで印象アップ。ストレス解消のためのアロマバスが開運。",
    fashionAdvice: "ブラックやコーラルピンクを基調としたミステリアスな装い。ルチルクォーツのアクセサリーが開運。",
    loveUpPeriod: "神秘的な魅力が増す時期。深い絆を結べるパートナーとの出会い。",
    loveDownPeriod: "猜疑心が強まる時期。相手を信じる勇気を持つこと。",
    workUpPeriod: "洞察力が冴える時期。研究・企画・カウンセリングで成果。接客・販売でも人気運が発揮される。",
    workDownPeriod: "秘密主義が裏目に出る時期。適度な情報共有を心がけて。",
    bodyPartDetail: "左ひじに対応。腱鞘炎や泌尿器の疾患に注意。女性は婦人科系にも注意。",
    surfacePersonality: "気さくでチャーミング、周りを明るくするムードメーカー。神秘的な魅力に包まれている。",
    innerPersonality: "内面には鋭い洞察力と秘密主義を秘める。人の心の動きを敏感に察知する天性のタレント性。",
    unconscious: "根底には「真実への渇望」がある。表面の華やかさの奥に、物事の核心に迫りたいという魂の欲求。",
    talents: "洞察力、演技力、再生力。人の心を読み、状況を変える力。起死回生の運。",
    weaknesses: "猜疑心、秘密主義、感情の起伏。内面の陰鬱さを隠すための過剰な演技。",
    failurePattern: "人を信用できず孤立する。秘密主義が裏目に出て信頼を失う。",
    actionPrinciple: "洞察と直感に基づいて行動する。状況を見極めてから動く慎重さ。",
    judgmentCriteria: "本質的に正しいかどうか。表面ではなく深層を見て判断する。",
    motivation: "真実の探究と人間関係の深化。表面的でない、魂レベルの繋がりを求める。"
  },
  "尾": {
    palaceFootDetail: "天蠍宮に二足属する",
    elementDetail: "水のエレメント。情熱と持続を司る",
    qualityDetail: "不動宮。忍耐と集中を持つ",
    planetDetail: "火星の影響。行動力・闘志・開拓精神",
    specialFortune: "開拓運・忍耐運に恵まれる",
    beautyAdvice: "力強さと繊細さを兼ね備えたケアが効果的。スポーツやアウトドアで心身をリフレッシュ。",
    fashionAdvice: "ダークトーンにアクセントを加えた力強いスタイル。ブラッドストーンのアクセサリーが開運。",
    loveUpPeriod: "情熱的な出会いに恵まれる時期。共に困難を乗り越えるパートナーとの縁。",
    loveDownPeriod: "独占欲が強まる時期。相手の自由を認める寛容さを。",
    workUpPeriod: "開拓精神が発揮される時期。新規事業や困難なプロジェクトで成果。",
    workDownPeriod: "頑固さが裏目に出る時期。柔軟な対応を心がけて。",
    bodyPartDetail: "右ひじに対応。関節や筋肉のケアが重要。",
    surfacePersonality: "寡黙で力強い印象。言葉は少ないが、行動で示すタイプ。",
    innerPersonality: "内面には燃えるような情熱と開拓精神を秘める。困難に立ち向かう不屈の精神。",
    unconscious: "根底には「道を切り開く」という使命感がある。未踏の領域に挑む魂の衝動。",
    talents: "忍耐力、開拓精神、集中力。困難な状況を打破する力。",
    weaknesses: "頑固さ、孤独傾向、感情表現の乏しさ。",
    failurePattern: "一人で抱え込みすぎて限界を超える。助けを求められない。",
    actionPrinciple: "信念と忍耐に基づいて行動する。一度決めたら最後までやり遂げる。",
    judgmentCriteria: "自分の信念に合致するかどうか。困難でも正しい道を選ぶ。",
    motivation: "困難の克服と新しい道の開拓。限界を超えることに喜びを感じる。"
  },
  "箕": {
    palaceFootDetail: "人馬宮に一足属する",
    elementDetail: "火のエレメント。冒険と拡大を司る",
    qualityDetail: "柔軟宮。自由と探究を持つ",
    planetDetail: "木星の影響。拡大・幸運・哲学",
    specialFortune: "冒険運・自由運に恵まれる",
    beautyAdvice: "自由で活動的な印象を活かしたケアが効果的。旅先でのスパ体験が開運。",
    fashionAdvice: "自由で活動的なスタイル。エスニックやボヘミアンテイストが似合う。ターコイズのアクセサリーが開運。",
    loveUpPeriod: "旅先や異文化交流での出会いに恵まれる時期。",
    loveDownPeriod: "自由を求めすぎて相手を傷つける時期。責任感を持つこと。",
    workUpPeriod: "海外関連や新規開拓で才能が発揮される時期。",
    workDownPeriod: "飽きっぽさが出る時期。一つのことに集中する忍耐を。",
    bodyPartDetail: "腰・大腿部に対応。運動不足に注意。",
    surfacePersonality: "自由奔放で楽天的。冒険心に富み、新しいことに挑戦する勇気がある。",
    innerPersonality: "内面には深い哲学的思索を秘める。人生の意味を探求する知的好奇心。",
    unconscious: "根底には「自由への渇望」がある。束縛を嫌い、広い世界を駆け巡りたいという魂の欲求。",
    talents: "冒険心、楽天性、哲学的思考。未知の世界を切り開く力。",
    weaknesses: "飽きっぽさ、無責任、落ち着きのなさ。",
    failurePattern: "一つのことを続けられず、中途半端に終わる。自由を求めて責任を放棄する。",
    actionPrinciple: "好奇心と冒険心に基づいて行動する。直感を信じて飛び込む。",
    judgmentCriteria: "自由であるかどうか。新しい経験が得られるかどうか。",
    motivation: "未知の世界の探究と自由の獲得。新しい経験を通じた成長。"
  },
  "斗": {
    palaceFootDetail: "磨羯宮に一足属する",
    elementDetail: "地のエレメント。実務と達成を司る",
    qualityDetail: "活動宮。目標達成力と責任感を持つ",
    planetDetail: "土星の影響。規律・忍耐・達成",
    specialFortune: "出世運・達成運に恵まれる",
    beautyAdvice: "品格のある佇まいを活かしたケアが効果的。定期的なフェイシャルエステで若々しさを維持。",
    fashionAdvice: "フォーマルで品格のある装い。ネイビーやダークグレーが基調。オニキスのアクセサリーが開運。",
    loveUpPeriod: "社会的地位が上がる時期に良縁に恵まれる。",
    loveDownPeriod: "仕事優先で恋愛が疎かになる時期。バランスを意識して。",
    workUpPeriod: "目標達成力が最大化される時期。昇進や独立のチャンス。",
    workDownPeriod: "過労に注意の時期。休息も仕事の一部と心得て。",
    bodyPartDetail: "膝・関節に対応。冷えと過労に注意。",
    surfacePersonality: "真面目で責任感が強く、目標に向かって着実に歩む。社会的信用が高い。",
    innerPersonality: "内面には強い野心と達成欲を秘める。トップに立ちたいという強い意志。",
    unconscious: "根底には「社会的使命」への意識がある。世の中の仕組みを動かしたいという魂の願い。",
    talents: "目標達成力、責任感、組織運営力。着実に成果を積み上げる力。",
    weaknesses: "融通の利かなさ、過労傾向、感情表現の乏しさ。",
    failurePattern: "仕事に没頭しすぎて人間関係を犠牲にする。完璧主義で自分を追い込む。",
    actionPrinciple: "計画と規律に基づいて行動する。目標から逆算して着実に進む。",
    judgmentCriteria: "目標達成に繋がるかどうか。社会的に意義があるかどうか。",
    motivation: "社会的達成と地位の獲得。自分の力で世の中を動かすこと。"
  },
  "女": {
    palaceFootDetail: "磨羯宮に二足属する",
    elementDetail: "地のエレメント。実務と奉仕を司る",
    qualityDetail: "活動宮。勤勉さと献身を持つ",
    planetDetail: "土星の影響。規律・忍耐・奉仕",
    specialFortune: "奉仕運・勤勉運に恵まれる",
    beautyAdvice: "清潔感と勤勉さを活かしたケアが効果的。規則正しい生活リズムが美の基本。",
    fashionAdvice: "清潔感のあるシンプルな装い。ベージュやアイボリーが基調。パールのアクセサリーが開運。",
    loveUpPeriod: "誠実さが評価される時期。職場や奉仕活動での出会い。",
    loveDownPeriod: "相手に尽くしすぎて自分を見失う時期。自分の幸せも大切に。",
    workUpPeriod: "地道な努力が報われる時期。専門性を活かした仕事で成果。",
    workDownPeriod: "過労とストレスに注意の時期。適度な休息を。",
    bodyPartDetail: "下腹部に対応。消化器系と婦人科系に注意。",
    surfacePersonality: "勤勉で献身的、誰に対しても誠実に接する。縁の下の力持ち。",
    innerPersonality: "内面には強い奉仕精神と完璧主義を秘める。人の役に立ちたいという強い思い。",
    unconscious: "根底には「奉仕と献身」の使命がある。自分を犠牲にしてでも他者を助けたいという魂の衝動。",
    talents: "勤勉さ、献身性、実務能力。細やかな気配りと確実な仕事ぶり。",
    weaknesses: "自己犠牲的、完璧主義、自己評価の低さ。",
    failurePattern: "他者に尽くしすぎて燃え尽きる。自分の価値を認められない。",
    actionPrinciple: "奉仕と勤勉に基づいて行動する。人の役に立つことを最優先する。",
    judgmentCriteria: "人の役に立つかどうか。社会に貢献できるかどうか。",
    motivation: "他者への奉仕と社会貢献。自分の働きが誰かの助けになること。"
  },
  "虚": {
    palaceFootDetail: "寶瓶宮に一足属する",
    elementDetail: "風のエレメント。革新と独創を司る",
    qualityDetail: "不動宮。独自性と先見性を持つ",
    planetDetail: "天王星の影響。革新・独創・自由",
    specialFortune: "独創運・革新運に恵まれる",
    beautyAdvice: "個性的で独創的なスタイルが効果的。最先端のスキンケアや美容法に挑戦。",
    fashionAdvice: "個性的で独創的な装い。アヴァンギャルドなデザインが似合う。アクアマリンのアクセサリーが開運。",
    loveUpPeriod: "独自の魅力が輝く時期。ユニークな出会いに恵まれる。",
    loveDownPeriod: "孤立しがちな時期。心を開く勇気を持つこと。",
    workUpPeriod: "革新的なアイデアが評価される時期。IT・テクノロジー分野で成果。",
    workDownPeriod: "周囲との温度差が生じる時期。コミュニケーションを大切に。",
    bodyPartDetail: "足首・ふくらはぎに対応。血行不良に注意。",
    surfacePersonality: "独創的で自由な発想を持つ。常識にとらわれない独自の視点で物事を見る。",
    innerPersonality: "内面には深い孤独感と理想主義を秘める。理解されない寂しさと、それでも信念を貫く強さ。",
    unconscious: "根底には「世界を変えたい」という革命的衝動がある。既存の枠組みを超えた新しい世界を夢見る。",
    talents: "独創力、先見性、革新力。既存の枠を超えた発想で新しい価値を生む力。",
    weaknesses: "孤立傾向、理想主義、現実離れ。",
    failurePattern: "理想が高すぎて現実との折り合いがつかない。孤立して支持を得られない。",
    actionPrinciple: "独自の信念と直感に基づいて行動する。常識にとらわれない自由な発想。",
    judgmentCriteria: "革新的かどうか。既存の枠を超えているかどうか。",
    motivation: "世界の変革と新しい価値の創造。誰も見たことのない未来を作ること。"
  },
  "危": {
    palaceFootDetail: "寶瓶宮に四足属する",
    elementDetail: "風のエレメント。変革と自由を司る",
    qualityDetail: "不動宮。独立心と反骨精神を持つ",
    planetDetail: "天王星の影響。変革・独立・反骨",
    specialFortune: "変革運・独立運に恵まれる",
    beautyAdvice: "個性的で大胆なスタイルが効果的。ヘアカラーやネイルで自己表現。",
    fashionAdvice: "大胆で個性的な装い。ビビッドカラーやアシンメトリーデザインが似合う。",
    loveUpPeriod: "型破りな出会いに恵まれる時期。運命的な恋の予感。",
    loveDownPeriod: "反骨精神が恋愛に悪影響を及ぼす時期。素直さを大切に。",
    workUpPeriod: "独立や起業のチャンスが訪れる時期。",
    workDownPeriod: "反抗的な態度が問題を起こす時期。協調性を意識して。",
    bodyPartDetail: "すね・足首に対応。骨折や捻挫に注意。",
    surfacePersonality: "大胆で型破り、常識にとらわれない自由人。反骨精神に富む。",
    innerPersonality: "内面には繊細さと不安を秘める。大胆な行動の裏に、認められたいという願望。",
    unconscious: "根底には「自由への闘争」がある。束縛と抑圧からの解放を求める魂の叫び。",
    talents: "大胆さ、独立心、変革力。既存の秩序を打破する力。",
    weaknesses: "反抗的、衝動的、協調性の欠如。",
    failurePattern: "反抗のための反抗に陥る。周囲との関係を壊してしまう。",
    actionPrinciple: "自由と独立に基づいて行動する。束縛を嫌い、自分の道を行く。",
    judgmentCriteria: "自由であるかどうか。束縛されていないかどうか。",
    motivation: "自由の獲得と既存秩序の変革。自分らしく生きること。"
  },
  "室": {
    palaceFootDetail: "雙魚宮に一足属する",
    elementDetail: "水のエレメント。直感と霊性を司る",
    qualityDetail: "柔軟宮。適応力と感受性を持つ",
    planetDetail: "海王星の影響。直感・霊性・芸術",
    specialFortune: "霊性運・芸術運に恵まれる",
    beautyAdvice: "神秘的で幻想的な雰囲気を活かしたケアが効果的。海や水辺でのリラクゼーションが開運。",
    fashionAdvice: "幻想的で柔らかな装い。パステルカラーや透け感のある素材が似合う。ムーンストーンのアクセサリーが開運。",
    loveUpPeriod: "直感が冴える時期。運命の相手との出会い。",
    loveDownPeriod: "現実と理想のギャップに苦しむ時期。地に足をつけること。",
    workUpPeriod: "芸術的才能が開花する時期。クリエイティブな仕事で成果。",
    workDownPeriod: "現実逃避に陥りやすい時期。責任を果たすことを忘れずに。",
    bodyPartDetail: "足の裏・リンパに対応。むくみと冷えに注意。",
    surfacePersonality: "神秘的で感受性豊か。直感力に優れ、芸術的センスがある。",
    innerPersonality: "内面には深い霊性と共感力を秘める。目に見えない世界との繋がりを感じる力。",
    unconscious: "根底には「宇宙との一体化」への渇望がある。すべてと繋がりたいという魂の願い。",
    talents: "直感力、芸術的センス、霊性。目に見えない世界を感じ取る力。",
    weaknesses: "現実逃避、依存傾向、境界線の曖昧さ。",
    failurePattern: "現実から逃げて幻想の世界に閉じこもる。他者に依存しすぎる。",
    actionPrinciple: "直感と霊性に基づいて行動する。感じるままに動く。",
    judgmentCriteria: "直感的に正しいと感じるかどうか。魂が共鳴するかどうか。",
    motivation: "霊的成長と芸術的表現。見えない世界の真実を形にすること。"
  },
  "壁": {
    palaceFootDetail: "雙魚宮に四足属する",
    elementDetail: "水のエレメント。慈悲と癒しを司る",
    qualityDetail: "柔軟宮。包容力と献身を持つ",
    planetDetail: "海王星の影響。慈悲・癒し・奉仕",
    specialFortune: "慈悲運・癒し運に恵まれる",
    beautyAdvice: "柔らかく包容力のある雰囲気を活かしたケアが効果的。アロマセラピーやヒーリングが開運。",
    fashionAdvice: "柔らかく優しい印象の装い。淡い色合いのニットやシフォンが似合う。アメジストのアクセサリーが開運。",
    loveUpPeriod: "包容力が増す時期。癒しを求める相手との出会い。",
    loveDownPeriod: "相手に依存しすぎる時期。自立心を忘れずに。",
    workUpPeriod: "癒しや奉仕の分野で才能が発揮される時期。",
    workDownPeriod: "自己犠牲が過ぎる時期。自分のケアも大切に。",
    bodyPartDetail: "足の甲・リンパに対応。むくみと免疫力低下に注意。",
    surfacePersonality: "穏やかで包容力があり、誰に対しても優しく接する。癒しのオーラを持つ。",
    innerPersonality: "内面には深い慈悲心と自己犠牲の精神を秘める。他者の苦しみを自分のものとして感じる。",
    unconscious: "根底には「無条件の愛」への渇望がある。すべてを受け入れ、すべてを癒したいという魂の使命。",
    talents: "包容力、癒しの力、慈悲心。傷ついた人を癒し、再生させる力。",
    weaknesses: "依存傾向、自己犠牲、現実逃避。",
    failurePattern: "他者に尽くしすぎて自分を見失う。依存関係に陥る。",
    actionPrinciple: "慈悲と愛に基づいて行動する。苦しんでいる人を放っておけない。",
    judgmentCriteria: "愛に基づいているかどうか。人を癒すことができるかどうか。",
    motivation: "他者の癒しと救済。無条件の愛を実践すること。"
  },
  "奎": {
    palaceFootDetail: "白羊宮に一足属する",
    elementDetail: "火のエレメント。行動と開拓を司る",
    qualityDetail: "活動宮。先駆性と勇気を持つ",
    planetDetail: "火星の影響。行動力・勇気・開拓",
    specialFortune: "開拓運・行動運に恵まれる",
    beautyAdvice: "活動的でエネルギッシュな印象を活かしたケアが効果的。スポーツで汗を流すことが美の秘訣。",
    fashionAdvice: "活動的でスポーティな装い。赤やオレンジのアクセントカラーが効果的。ルビーのアクセサリーが開運。",
    loveUpPeriod: "行動力が増す時期。積極的なアプローチが実を結ぶ。",
    loveDownPeriod: "衝動的になりすぎる時期。相手の気持ちを考えること。",
    workUpPeriod: "新規開拓やリーダーシップが発揮される時期。",
    workDownPeriod: "衝動的な判断が問題を起こす時期。冷静さを保つこと。",
    bodyPartDetail: "頭部・顔に対応。頭痛や目の疲れに注意。",
    surfacePersonality: "行動力に富み、先頭に立って道を切り開く。勇気と決断力の持ち主。",
    innerPersonality: "内面には純粋な情熱と正義感を秘める。弱い者を守りたいという強い思い。",
    unconscious: "根底には「先駆者としての使命」がある。誰よりも先に新しい道を切り開く魂の衝動。",
    talents: "行動力、決断力、勇気。先頭に立って道を切り開く力。",
    weaknesses: "衝動的、短気、持続力の欠如。",
    failurePattern: "衝動的に行動して後悔する。始めたことを最後まで続けられない。",
    actionPrinciple: "直感と勇気に基づいて行動する。考えるより先に動く。",
    judgmentCriteria: "正義に適っているかどうか。行動する価値があるかどうか。",
    motivation: "新しい道の開拓と正義の実現。先頭に立って世界を変えること。"
  },
  "婁": {
    palaceFootDetail: "白羊宮に四足属する",
    elementDetail: "火のエレメント。情熱と創造を司る",
    qualityDetail: "活動宮。創造力と情熱を持つ",
    planetDetail: "火星の影響。情熱・創造・エネルギー",
    specialFortune: "創造運・情熱運に恵まれる",
    beautyAdvice: "情熱的で華やかな印象を活かしたケアが効果的。ダンスやヨガで身体表現を磨くことが開運。",
    fashionAdvice: "華やかで情熱的な装い。赤やゴールドが基調。ガーネットのアクセサリーが開運。",
    loveUpPeriod: "情熱的な魅力が増す時期。運命的な出会いの予感。",
    loveDownPeriod: "情熱が空回りする時期。冷静さを保つこと。",
    workUpPeriod: "創造力が最大化される時期。芸術やクリエイティブ分野で成果。",
    workDownPeriod: "エネルギーの浪費に注意の時期。集中力を高めること。",
    bodyPartDetail: "頭部・額に対応。頭痛や精神的ストレスに注意。",
    surfacePersonality: "情熱的で創造力に富む。エネルギッシュで周囲を巻き込む力がある。",
    innerPersonality: "内面には繊細な芸術的感性を秘める。美しいものへの深い感動と創造への衝動。",
    unconscious: "根底には「創造と表現」の使命がある。内なる情熱を形にしたいという魂の欲求。",
    talents: "創造力、情熱、表現力。内なるビジョンを形にする力。",
    weaknesses: "衝動的、感情的、持続力の欠如。",
    failurePattern: "情熱に任せて突き進み、周囲を振り回す。エネルギーを浪費する。",
    actionPrinciple: "情熱と創造に基づいて行動する。心が動いたら即行動。",
    judgmentCriteria: "心が動くかどうか。創造的な価値があるかどうか。",
    motivation: "創造と表現。内なるビジョンを世界に示すこと。"
  },
  "胃": {
    palaceFootDetail: "白羊宮に二足属する",
    elementDetail: "火のエレメント。消化と変容を司る",
    qualityDetail: "活動宮。処理力と変換力を持つ",
    planetDetail: "火星の影響。変換・処理・消化",
    specialFortune: "変換運・処理運に恵まれる",
    beautyAdvice: "内面からの美しさを活かしたケアが効果的。食事と消化器系のケアが美の基本。",
    fashionAdvice: "温かみのある装い。アースカラーやウォームトーンが基調。タイガーアイのアクセサリーが開運。",
    loveUpPeriod: "包容力が増す時期。食事を共にすることで縁が深まる。",
    loveDownPeriod: "消化不良のようにストレスが溜まる時期。リフレッシュを。",
    workUpPeriod: "情報処理能力が最大化される時期。データ分析や企画で成果。",
    workDownPeriod: "キャパオーバーに注意の時期。優先順位をつけること。",
    bodyPartDetail: "胃・消化器に対応。暴飲暴食と胃腸の不調に注意。",
    surfacePersonality: "物事を的確に処理し、変換する力がある。情報の消化吸収が早い。",
    innerPersonality: "内面には強い変容への欲求を秘める。古いものを消化し、新しいものに変える力。",
    unconscious: "根底には「変容と再生」の使命がある。経験を糧に成長し続ける魂の力。",
    talents: "処理能力、変換力、適応力。情報や経験を消化し、新しい価値に変える力。",
    weaknesses: "キャパオーバー、ストレス耐性の低さ、消化不良。",
    failurePattern: "抱え込みすぎてパンクする。ストレスを溜め込んで爆発する。",
    actionPrinciple: "効率と処理に基づいて行動する。情報を整理し、最適な判断を下す。",
    judgmentCriteria: "効率的かどうか。消化できる範囲かどうか。",
    motivation: "情報の処理と変換。経験を糧に成長し続けること。"
  },
  "昴": {
    palaceFootDetail: "金牛宮に一足属する",
    elementDetail: "地のエレメント。安定と美を司る",
    qualityDetail: "不動宮。安定性と審美眼を持つ",
    planetDetail: "金星の影響。美・豊かさ・安定",
    specialFortune: "財運・美運に恵まれる",
    beautyAdvice: "上品で洗練された美しさを活かしたケアが効果的。高品質なスキンケアへの投資が開運。",
    fashionAdvice: "上品で洗練された装い。クリーム色やベージュが基調。ダイヤモンドのアクセサリーが開運。",
    loveUpPeriod: "美的センスが輝く時期。芸術的な場での出会いに恵まれる。",
    loveDownPeriod: "物質的な豊かさに執着する時期。心の豊かさを大切に。",
    workUpPeriod: "審美眼が活かされる時期。デザイン・ファッション・金融で成果。",
    workDownPeriod: "安定志向が変化を妨げる時期。新しいことへの挑戦を。",
    bodyPartDetail: "首・喉に対応。喉の不調や甲状腺に注意。",
    surfacePersonality: "上品で洗練された雰囲気。審美眼に優れ、美しいものを愛する。",
    innerPersonality: "内面には強い所有欲と安定への渇望を秘める。確かなものを手に入れたいという欲求。",
    unconscious: "根底には「美と豊かさの創造」の使命がある。世界に美しさと豊かさをもたらす魂の願い。",
    talents: "審美眼、安定性、財運。美しいものを見極め、豊かさを生み出す力。",
    weaknesses: "頑固さ、所有欲、変化への抵抗。",
    failurePattern: "安定に固執して成長の機会を逃す。物質的豊かさに溺れる。",
    actionPrinciple: "美と安定に基づいて行動する。確実で美しい道を選ぶ。",
    judgmentCriteria: "美しいかどうか。安定と豊かさに繋がるかどうか。",
    motivation: "美と豊かさの創造。世界に美しさと安定をもたらすこと。"
  },
  "畢": {
    palaceFootDetail: "金牛宮に四足属する",
    elementDetail: "地のエレメント。堅実と持続を司る",
    qualityDetail: "不動宮。忍耐力と堅実さを持つ",
    planetDetail: "金星の影響。堅実・持続・蓄積",
    specialFortune: "蓄財運・持続運に恵まれる",
    beautyAdvice: "堅実で自然体の美しさを活かしたケアが効果的。自然素材のスキンケアが開運。",
    fashionAdvice: "堅実で品のある装い。ブラウンやカーキが基調。エメラルドのアクセサリーが開運。",
    loveUpPeriod: "堅実な魅力が評価される時期。長く続く関係の始まり。",
    loveDownPeriod: "頑固さが恋愛を妨げる時期。柔軟性を持つこと。",
    workUpPeriod: "コツコツ積み上げた成果が認められる時期。",
    workDownPeriod: "変化に対応できない時期。柔軟な思考を。",
    bodyPartDetail: "首・肩に対応。肩こりや首の不調に注意。",
    surfacePersonality: "堅実で信頼感がある。コツコツと努力を積み重ねるタイプ。",
    innerPersonality: "内面には強い蓄積欲と安定への渇望を秘める。確実に積み上げたいという欲求。",
    unconscious: "根底には「基盤の構築」の使命がある。揺るがない土台を作りたいという魂の願い。",
    talents: "忍耐力、堅実さ、蓄積力。長期的に物事を積み上げる力。",
    weaknesses: "頑固さ、変化への恐れ、保守的。",
    failurePattern: "変化を拒み、時代に取り残される。安全な道ばかり選んで成長しない。",
    actionPrinciple: "堅実と忍耐に基づいて行動する。確実な一歩を積み重ねる。",
    judgmentCriteria: "確実かどうか。長期的に安定するかどうか。",
    motivation: "確実な蓄積と基盤の構築。揺るがない土台を作ること。"
  },
  "觜": {
    palaceFootDetail: "雙女宮に一足属する",
    elementDetail: "地のエレメント。分析と知性を司る",
    qualityDetail: "柔軟宮。分析力と適応性を持つ",
    planetDetail: "水星の影響。分析・知性・コミュニケーション",
    specialFortune: "知性運・分析運に恵まれる",
    beautyAdvice: "知的で清潔感のある印象を活かしたケアが効果的。規則正しい生活が美の基本。",
    fashionAdvice: "知的で清潔感のある装い。ネイビーやグレーが基調。サファイアのアクセサリーが開運。",
    loveUpPeriod: "知的な魅力が増す時期。会話を通じた出会いに恵まれる。",
    loveDownPeriod: "分析しすぎて恋愛を楽しめない時期。感情に素直になること。",
    workUpPeriod: "分析力が最大化される時期。研究・調査・コンサルティングで成果。",
    workDownPeriod: "細部にこだわりすぎる時期。全体像を見ること。",
    bodyPartDetail: "腸・消化器に対応。神経性の胃腸障害に注意。",
    surfacePersonality: "知的で分析的、細部まで見逃さない観察力の持ち主。",
    innerPersonality: "内面には完璧主義と不安を秘める。すべてを理解し、コントロールしたいという欲求。",
    unconscious: "根底には「秩序の理解」の使命がある。世界の仕組みを解き明かしたいという魂の願い。",
    talents: "分析力、観察力、知性。物事を細部まで見通す力。",
    weaknesses: "完璧主義、神経質、批判的。",
    failurePattern: "分析に没頭して行動できない。批判的になりすぎて人間関係を壊す。",
    actionPrinciple: "分析と知性に基づいて行動する。データと事実を重視する。",
    judgmentCriteria: "論理的に正しいかどうか。データに裏付けられているかどうか。",
    motivation: "知識の獲得と秩序の理解。世界の仕組みを解き明かすこと。"
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
  }
};

// ============================================
// レポート生成関数
// ============================================

export interface TenmonArkReport {
  version: string;
  generatedAt: string;
  sections: ReportSection[];
  fullText: string;
}

interface ReportSection {
  id: string;
  title: string;
  content: string;
}

/**
 * 天聞アーク統合鑑定レポート v1.0 生成
 * 
 * 「占い」ではなく「人間OS解析レポート」
 */
export function generateTenmonArkReport(
  birthDate: Date,
  katakanaName?: string,
  birthTime?: string,
  birthPlace?: string
): TenmonArkReport {
  const diagnosis = runCompleteDiagnosis(birthDate, katakanaName);
  const sukuyou = diagnosis.sukuyou;
  const shukuData = sukuyou.shukuData;
  const extended = EXTENDED_SHUKU_DATA[sukuyou.honmeiShuku];

  const birthYear = birthDate.getUTCFullYear();
  const birthMonth = birthDate.getUTCMonth() + 1;
  const birthDay = birthDate.getUTCDate();
  const dateStr = `${birthYear}年${birthMonth}月${birthDay}日`;

  const sections: ReportSection[] = [];
  let fullText = "";

  // ═══════════════════════════════════════════
  // §0 基本情報
  // ═══════════════════════════════════════════
  const s0 = buildSection("basic-info", "§0. 基本情報", [
    `===========================================`,
    `【天聞アーク統合鑑定レポート v1.0】`,
    `宿曜経 × 天津金木 × 言霊秘書`,
    `===========================================`,
    ``,
    `生年月日: ${dateStr}`,
    birthTime ? `出生時刻: ${birthTime}` : `出生時刻: 不明`,
    birthPlace ? `出生地/TZ: ${birthPlace}` : `出生地/TZ: 不明`,
    `信頼度: ${sukuyou.lookupUsed ? "A（ルックアップテーブル完全一致）" : "B（旧暦計算フォールバック）"}`,
    `算出モード: ${sukuyou.lookupUsed ? "BOOKCAL（syukuyo.com準拠）" : "ASTRO（旧暦計算）"}`,
    ``,
    `旧暦: ${sukuyou.lunarDate.year}年${sukuyou.lunarDate.month}月${sukuyou.lunarDate.day}日`,
    `月名: ${sukuyou.lunarDate.monthName}`,
    `月相: ${sukuyou.lunarDate.lunarPhase}`,
  ]);
  sections.push(s0);
  fullText += s0.content + "\n\n";

  // ═══════════════════════════════════════════
  // §1 宿命構造（不変領域）
  // ═══════════════════════════════════════════
  const s1Lines = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `§1. 宿命構造（不変領域）`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `【1-1 本命宿】`,
    `  宿名: ${sukuyou.honmeiShuku}宿（${shukuData.reading}）`,
    `  梵名（サンスクリット）: ${shukuData.sanskrit}`,
    `  守護神: ${shukuData.deity}`,
    `  星数: ${shukuData.starCount}星（${shukuData.starShape}）`,
    `  性質分類: ${shukuData.nature}（${shukuData.category}）`,
    `  運勢タイプ: ${shukuData.fortuneType}`,
    `  特殊運: ${extended.specialFortune}`,
    `  真言: ${shukuData.mantra}`,
    ``,
    `【1-2 水火属性（言霊属性）】`,
    `  言霊属性: ${shukuData.element}（${shukuData.phase}）`,
    `  水火スコア: 火${shukuData.fireScore} : 水${shukuData.waterScore}`,
    `  → ${shukuData.fireScore > shukuData.waterScore ? "火（外発）優勢 — 外に向かって表現し、世界を広げる力が強い" : shukuData.fireScore < shukuData.waterScore ? "水（内集）優勢 — 内面を深め、根幹を固める力が強い" : "水火均衡 — 内集と外発のバランスが取れた調和の状態"}`,
    ``,
    `【1-3 十二宮配置】`,
    `  命宮: ${sukuyou.meikyu}`,
    `  足配分: ${extended.palaceFootDetail}`,
    `  エレメント: ${extended.elementDetail}`,
    `  クオリティ: ${extended.qualityDetail}`,
    `  惑星影響: ${extended.planetDetail}`,
    ``,
    `  十二宮全配置:`,
  ];

  for (const [house, palace] of Object.entries(sukuyou.palaceConfig)) {
    s1Lines.push(`    ${house}: ${palace}`);
  }

  s1Lines.push(``);
  s1Lines.push(`【1-4 本命曜】`);
  s1Lines.push(`  曜: ${sukuyou.honmeiYo}曜（${sukuyou.planetData.celestial}）`);
  s1Lines.push(`  梵名: ${sukuyou.planetData.sanskrit}`);
  s1Lines.push(`  五行: ${sukuyou.planetData.element}`);
  s1Lines.push(`  言霊属性: ${sukuyou.planetData.kotodamaElement}`);
  s1Lines.push(`  吉凶: ${sukuyou.planetData.nature}`);
  s1Lines.push(``);
  s1Lines.push(`【1-5 九星】`);
  s1Lines.push(`  ${sukuyou.kyusei}`);

  const s1 = buildSection("fate-structure", "§1. 宿命構造（不変領域）", s1Lines);
  sections.push(s1);
  fullText += s1.content + "\n\n";

  // ═══════════════════════════════════════════
  // §2 運命構造（変動領域）
  // ═══════════════════════════════════════════
  const s2Lines = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `§2. 運命構造（変動領域）`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `【2-1 天津金木 三層位相（現在の宇宙的位相）】`,
    `  ${diagnosis.threeLayer.civilization.description}`,
    `  ${diagnosis.threeLayer.year.description}`,
    `  ${diagnosis.threeLayer.day.description}`,
    ``,
    `【2-2 躰/用 総合判定】`,
    `  判定: ${diagnosis.taiYou.taiYou}`,
    `  総合火水: 火${Math.round(diagnosis.taiYou.totalFireScore)} : 水${Math.round(diagnosis.taiYou.totalWaterScore)}`,
    `  ${diagnosis.taiYou.interpretation}`,
    ``,
    `【2-3 今日の運勢】`,
    `  直宿: ${sukuyou.dailyNakshatra}宿`,
    `  命宿との関係: ${sukuyou.dailyRelation}`,
    `  直曜: ${sukuyou.dailyPlanet}曜`,
    `  十二直: ${sukuyou.juniChoku}`,
    `  遊年八卦: ${sukuyou.yunenHakke.trigram}（${sukuyou.yunenHakke.fortune}）`,
    `  → ${sukuyou.yunenHakke.description}`,
    ``,
    `【2-4 運勢上昇・下降時期】`,
    `  恋愛運上昇: ${extended.loveUpPeriod}`,
    `  恋愛運下降: ${extended.loveDownPeriod}`,
    `  仕事運上昇: ${extended.workUpPeriod}`,
    `  仕事運下降: ${extended.workDownPeriod}`,
  ];

  const s2 = buildSection("destiny-structure", "§2. 運命構造（変動領域）", s2Lines);
  sections.push(s2);
  fullText += s2.content + "\n\n";

  // ═══════════════════════════════════════════
  // §3 天命構造（魂の方向性）
  // ═══════════════════════════════════════════
  const s3Lines = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `§3. 天命構造（魂の方向性）`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `【3-1 魂の根源的衝動（無意識層）】`,
    `  ${extended.unconscious}`,
    ``,
    `【3-2 天命の方向性】`,
    `  ${sukuyou.honmeiShuku}宿の天命は「${shukuData.fortuneType}」に集約される。`,
    `  ${shukuData.element}の言霊属性が示す通り、${shukuData.phase === "外発" ? "外に向かって力を発揮し、世界を変革する" : shukuData.phase === "内集" ? "内面を深め、根幹から世界を支える" : "内集と外発の均衡の中で、調和をもたらす"}使命を持つ。`,
  ];

  if (diagnosis.nameAnalysis) {
    s3Lines.push(``);
    s3Lines.push(`【3-3 名前の言霊解析】`);
    s3Lines.push(`  名前: ${katakanaName}`);
    s3Lines.push(`  水火バランス: 火${Math.round(diagnosis.nameAnalysis.fireScore)} : 水${Math.round(diagnosis.nameAnalysis.waterScore)}`);
    s3Lines.push(`  属性: ${diagnosis.nameAnalysis.dominantAttribute}`);
    s3Lines.push(``);
    s3Lines.push(`  音の構造:`);
    for (const s of diagnosis.nameAnalysis.sounds) {
      if (s.kotodama) {
        s3Lines.push(`    ${s.char} → ${s.kotodama.attribute}（火${s.kotodama.fireScore}:水${s.kotodama.waterScore}）`);
      }
    }
    const nameFireDominant = diagnosis.nameAnalysis.fireScore > diagnosis.nameAnalysis.waterScore;
    const shukuFireDominant = shukuData.fireScore > shukuData.waterScore;
    s3Lines.push(``);
    if (nameFireDominant === shukuFireDominant) {
      s3Lines.push(`  → 名前と命宿の水火属性が一致しており、天命に沿った名前である。`);
      s3Lines.push(`    名前の持つ言霊の力が宿の特性を強化し、本来の才能を最大限に引き出す。`);
    } else {
      s3Lines.push(`  → 名前と命宿の水火属性が対照的であり、内面にバランスの取れた二面性を持つ。`);
      s3Lines.push(`    名前の言霊が宿の偏りを補完し、より調和のとれた人格形成を促す。`);
    }
  }

  s3Lines.push(``);
  s3Lines.push(`【3-4 真言と開運】`);
  s3Lines.push(`  真言: ${shukuData.mantra}`);
  s3Lines.push(`  → この真言を唱えることで、${sukuyou.honmeiShuku}宿の守護神${shukuData.deity}との霊的回路が開かれる。`);

  const s3 = buildSection("soul-direction", "§3. 天命構造（魂の方向性）", s3Lines);
  sections.push(s3);
  fullText += s3.content + "\n\n";

  // ═══════════════════════════════════════════
  // §4 人間分析（性格・能力・リスク・行動）
  // ═══════════════════════════════════════════
  const s4Lines = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `§4. 人間分析（人間OS解析）`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `【A. 基本構造】`,
    `  本命宿: ${sukuyou.honmeiShuku}宿`,
    `  天津金木位相: ${diagnosis.taiYou.taiYou}（火${Math.round(diagnosis.taiYou.totalFireScore)}:水${Math.round(diagnosis.taiYou.totalWaterScore)}）`,
    diagnosis.nameAnalysis ? `  言霊音構造: ${diagnosis.nameAnalysis.dominantAttribute}` : `  言霊音構造: （名前未入力）`,
    ``,
    `【B. 性格分析】`,
    `  ◆ 表面人格（外界に見せる顔）`,
    `  ${extended.surfacePersonality}`,
    ``,
    `  ◆ 内面人格（内に秘める本質）`,
    `  ${extended.innerPersonality}`,
    ``,
    `  ◆ 無意識層（魂の根源）`,
    `  ${extended.unconscious}`,
    ``,
    `  ◆ 基本的性格（総合）`,
    `  ${shukuData.personality}`,
    ``,
    `  ◆ 対人関係の特徴`,
    `  ${shukuData.interpersonalStyle}`,
    ``,
    `【C. 能力分析】`,
    `  ◆ 才能`,
    `  ${extended.talents}`,
    ``,
    `  ◆ 適職`,
    `  ${shukuData.workAdvice}`,
    ``,
    `  ◆ 強み`,
    `  ${extended.actionPrinciple}`,
    ``,
    `【D. リスク分析】`,
    `  ◆ 弱点`,
    `  ${extended.weaknesses}`,
    ``,
    `  ◆ 人間関係リスク`,
    `  ${shukuData.growthChallenge}`,
    ``,
    `  ◆ 失敗パターン`,
    `  ${extended.failurePattern}`,
    ``,
    `【E. 行動分析】`,
    `  ◆ 行動原理`,
    `  ${extended.actionPrinciple}`,
    ``,
    `  ◆ 判断基準`,
    `  ${extended.judgmentCriteria}`,
    ``,
    `  ◆ モチベーション源`,
    `  ${extended.motivation}`,
  ];

  const s4 = buildSection("human-analysis", "§4. 人間分析（人間OS解析）", s4Lines);
  sections.push(s4);
  fullText += s4.content + "\n\n";

  // ═══════════════════════════════════════════
  // §5 時間軸分析
  // ═══════════════════════════════════════════
  const s5Lines = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `§5. 時間軸分析（過去・現在・未来）`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `【F-1. 過去傾向（宿命層）】`,
    `  ${sukuyou.honmeiShuku}宿の宿命として、${shukuData.nature}の性質を持って生まれた。`,
    `  ${shukuData.deity}の守護のもと、${shukuData.element}の言霊属性が人生の基盤を形成してきた。`,
    `  九星${sukuyou.kyusei}の影響により、${sukuyou.kyusei.includes("水") ? "知恵と柔軟性" : sukuyou.kyusei.includes("木") ? "成長と発展" : sukuyou.kyusei.includes("火") ? "情熱と輝き" : sukuyou.kyusei.includes("土") ? "安定と信頼" : sukuyou.kyusei.includes("金") ? "決断と実行" : "多面的な力"}を蓄えてきた。`,
    ``,
    `【F-2. 現在運命（運命層）】`,
    `  現在の躰/用判定: ${diagnosis.taiYou.taiYou}`,
    `  ${diagnosis.taiYou.interpretation}`,
    ``,
    `  今日の直宿${sukuyou.dailyNakshatra}宿との関係は「${sukuyou.dailyRelation}」。`,
    `  十二直は「${sukuyou.juniChoku}」、遊年八卦は「${sukuyou.yunenHakke.trigram}」（${sukuyou.yunenHakke.fortune}）。`,
    ``,
    `【F-3. 未来方向（天命層）】`,
    `  ${extended.unconscious}`,
    `  この魂の方向性に沿って生きることで、${shukuData.fortuneType}が最大限に発揮される。`,
    `  ${shukuData.openingAdvice}`,
  ];

  const s5 = buildSection("time-axis", "§5. 時間軸分析", s5Lines);
  sections.push(s5);
  fullText += s5.content + "\n\n";

  // ═══════════════════════════════════════════
  // §6 恋愛・金運・健康
  // ═══════════════════════════════════════════
  const s6Lines = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `§6. 各運勢詳細分析`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `【6-1 恋愛運】`,
    `  ${shukuData.loveAdvice}`,
    ``,
    `  上昇時期: ${extended.loveUpPeriod}`,
    `  下降時期: ${extended.loveDownPeriod}`,
    ``,
    `【6-2 仕事運・適職】`,
    `  ${shukuData.workAdvice}`,
    ``,
    `  上昇時期: ${extended.workUpPeriod}`,
    `  下降時期: ${extended.workDownPeriod}`,
    ``,
    `【6-3 金運】`,
    `  ${shukuData.moneyAdvice}`,
    ``,
    `【6-4 健康運】`,
    `  ${shukuData.healthAdvice}`,
    `  対応部位: ${extended.bodyPartDetail}`,
    ``,
    `【6-5 ビューティアドバイス】`,
    `  ${extended.beautyAdvice}`,
    ``,
    `【6-6 ファッションアドバイス】`,
    `  ${extended.fashionAdvice}`,
  ];

  const s6 = buildSection("fortune-details", "§6. 各運勢詳細分析", s6Lines);
  sections.push(s6);
  fullText += s6.content + "\n\n";

  // ═══════════════════════════════════════════
  // §7 開運処方箋
  // ═══════════════════════════════════════════
  const s7Lines = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `§7. 開運処方箋`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `【7-1 開運法アドバイス】`,
    `  ${shukuData.openingAdvice}`,
    ``,
    `【7-2 開運アイテム】`,
    `  ラッキーカラー: ${shukuData.luckyColor}`,
    `  パワーストーン: ${shukuData.powerStone}`,
    `  真言: ${shukuData.mantra}`,
    ``,
    `【7-3 吉凶行事】`,
    `  吉行事: ${shukuData.auspicious.join("、")}`,
    `  凶行事: ${shukuData.inauspicious.join("、") || "特になし"}`,
    ``,
    `【7-4 成長課題】`,
    `  ${shukuData.growthChallenge}`,
  ];

  const s7 = buildSection("prescription", "§7. 開運処方箋", s7Lines);
  sections.push(s7);
  fullText += s7.content + "\n\n";

  // ═══════════════════════════════════════════
  // §8 統合解読
  // ═══════════════════════════════════════════
  const s8Lines = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `§8. 統合解読（宿命→運命→天命）`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `【宿命（不変の構造）】`,
    `  ${sukuyou.honmeiShuku}宿・${sukuyou.honmeiYo}曜・${sukuyou.kyusei}・${sukuyou.meikyu}`,
    `  → あなたは${shukuData.deity}の守護のもと、${shukuData.element}の言霊属性を持って生まれた。`,
    `  → ${extended.surfacePersonality}`,
    ``,
    `【運命（変動する力場）】`,
    `  現在の躰/用: ${diagnosis.taiYou.taiYou}（火${Math.round(diagnosis.taiYou.totalFireScore)}:水${Math.round(diagnosis.taiYou.totalWaterScore)}）`,
    `  → ${diagnosis.taiYou.taiYou === "躰" ? "今は内面を充実させ、エネルギーを蓄える時期。" : diagnosis.taiYou.taiYou === "用" ? "今は外に向けて表現し、行動を起こす時期。" : "内集と外発のバランスが取れた調和の時期。"}`,
    `  → 天津金木の三層位相が示す宇宙的な力場の中で、あなたの運命は動いている。`,
    ``,
    `【天命（魂の方向性）】`,
    `  ${extended.unconscious}`,
    `  → ${shukuData.fortuneType}を最大限に発揮し、`,
    `  → ${extended.motivation}`,
    ``,
    `【統合メッセージ】`,
    `  ${sukuyou.honmeiShuku}宿のあなたは、宿命として${shukuData.element}の力を持ち、`,
    `  運命として現在${diagnosis.taiYou.taiYou}の位相にある。`,
    `  そして天命として、${extended.motivation.split("。")[0]}という使命を帯びている。`,
    ``,
    `  この三層が統合されたとき、あなたは本来の力を最大限に発揮できる。`,
    `  ${shukuData.openingAdvice}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `同宿の有名人: ${shukuData.famousPeople.join("、")}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `【天聞アーク統合鑑定レポート v1.0 — 完】`,
    `算出エンジン: 天聞アーク宿曜経×天津金木×言霊秘書 統合診断システム`,
    `精度保証: ${sukuyou.lookupUsed ? "syukuyo.com完全一致ルックアップテーブル使用" : "旧暦計算フォールバック使用"}`,
  ];

  const s8 = buildSection("integration", "§8. 統合解読", s8Lines);
  sections.push(s8);
  fullText += s8.content;

  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    sections,
    fullText
  };
}

function buildSection(id: string, title: string, lines: string[]): ReportSection {
  return {
    id,
    title,
    content: lines.join("\n")
  };
}

// Export extended data for potential use
export { EXTENDED_SHUKU_DATA };
export type { ExtendedShukuData };
