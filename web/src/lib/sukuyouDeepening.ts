/**
 * ============================================================
 *  TENMON_MANUS_CARD_KANTEI_UI_V1
 *  宿曜鑑定 深化データ — フロントエンド計算モジュール
 *  API変更なし。sukuyouSeedV1のkyusei/meikyuから全て算出。
 * ============================================================
 */

/* ── 九星→五行マッピング ── */
const KYUSEI_TO_GOGYO: Record<string, string> = {
  一白水星: "水", 二黒土星: "土", 三碧木星: "木", 四緑木星: "木",
  五黄土星: "土", 六白金星: "金", 七赤金星: "金", 八白土星: "土", 九紫火星: "火",
};

/* ── 命宮→五行マッピング（PALACE_DATA準拠） ── */
const MEIKYU_TO_GOGYO: Record<string, string> = {
  白羊宮: "火", 金牛宮: "金", 双児宮: "水", 巨蟹宮: "水",
  獅子宮: "火", 処女宮: "水", 天秤宮: "金", 天蠍宮: "火",
  人馬宮: "木", 磨羯宮: "土", 宝瓶宮: "土", 双魚宮: "木",
};

/* ── 五行相生相克判定 ── */
const SEISOU: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const SOUKOKU: Record<string, string> = { 木: "土", 火: "金", 土: "水", 金: "木", 水: "火" };

export interface GogyoRelation {
  relation: string;
  description: string;
  depth: string;
  kyuseiElement: string;
  meikyuElement: string;
}

export function analyzeGogyoRelation(kyusei: string, meikyu: string): GogyoRelation | null {
  const ke = KYUSEI_TO_GOGYO[kyusei];
  const me = MEIKYU_TO_GOGYO[meikyu];
  if (!ke || !me) return null;

  const base = { kyuseiElement: ke, meikyuElement: me };

  if (ke === me) {
    return { ...base, relation: "比和", description: `${ke}×${me}: 同質の力が重なる`, depth: `内側（九星）と外側（命宮）が同じ${ke}の質を持つ。一つの方向に力が集中する集中型。` };
  }
  if (SEISOU[ke] === me) {
    return { ...base, relation: "相生", description: `${ke}が${me}を生む`, depth: `九星の${ke}質が命宮の${me}質を育て支える。内側が外側の表現を自然に強化する統合型。` };
  }
  if (SEISOU[me] === ke) {
    return { ...base, relation: "相生（逆方向）", description: `${me}が${ke}を生む`, depth: `命宮の${me}質が九星の${ke}質を育てる。外側の経験が内側の年輪を育てる成長型。` };
  }
  if (SOUKOKU[ke] === me) {
    return { ...base, relation: "相克", description: `${ke}が${me}を克する`, depth: `九星の${ke}質が命宮の${me}質と葛藤を生む。この葛藤こそがこの人物の成長の核心にある。` };
  }
  if (SOUKOKU[me] === ke) {
    return { ...base, relation: "逆克", description: `${me}が${ke}を克する`, depth: `命宮の${me}質が九星の${ke}質を抑制する。外側の自分が内側の本質を覆い隠している可能性がある。` };
  }
  return { ...base, relation: "独立", description: `${ke}と${me}: 中立的な関係`, depth: `両者が独立した力を持つ複数軸型。複数の顔を持つ人物。` };
}

/* ── 中宮星算出（デジタルルート法） ── */
function calcChukyuStar(year: number): number {
  let sum = year;
  while (sum >= 10) {
    sum = String(sum).split("").reduce((a, b) => a + parseInt(b, 10), 0);
  }
  let chukyu = 11 - sum;
  if (chukyu > 9) chukyu -= 9;
  if (chukyu <= 0) chukyu += 9;
  return chukyu;
}

const CHUKYU_NAMES = ["", "一白水星", "二黒土星", "三碧木星", "四緑木星", "五黄土星", "六白金星", "七赤金星", "八白土星", "九紫火星"];

const KYUSEI_TO_NUM: Record<string, number> = {
  一白水星: 1, 二黒土星: 2, 三碧木星: 3, 四緑木星: 4, 五黄土星: 5,
  六白金星: 6, 七赤金星: 7, 八白土星: 8, 九紫火星: 9,
};

const NENUN_POSITION_DEF: Record<number, { palace: string; direction: string; meaning: string; advice: string }> = {
  1: { palace: "坎宮", direction: "北", meaning: "水の位: 深化・内省・準備の年", advice: "焦らず内側を整える。水面下での準備が翌年以降に実を結ぶ" },
  2: { palace: "坤宮", direction: "南西", meaning: "土の位: 育成・奉仕・縁の年", advice: "人のために動くことが自分の運を開く年" },
  3: { palace: "震宮", direction: "東", meaning: "木の位: 発展・行動・始動の年", advice: "積極的に動いてよい年。新規挑戦に吉" },
  4: { palace: "巽宮", direction: "南東", meaning: "木の位: 信用・交流・整備の年", advice: "人脈と情報収集を大切に。遠方との縁が開く" },
  5: { palace: "中宮", direction: "中央", meaning: "五黄回座（八方塞がり）: 変動・転換", advice: "新規事業・移転・大きな変化は慎重に。神仏への祈願が有効" },
  6: { palace: "乾宮", direction: "北西", meaning: "金の位: 実力・権威・完成の年", advice: "責任ある立場を引き受けてよい年。実力を示す好機" },
  7: { palace: "兌宮", direction: "西", meaning: "金の位: 収穫・喜び・成果の年", advice: "これまでの積み重ねが形になる年。発信に吉" },
  8: { palace: "艮宮", direction: "北東", meaning: "土の位: 変革・蓄積・転機の年", advice: "古いものを手放し新しいものを受け入れる準備を" },
  9: { palace: "離宮", direction: "南", meaning: "火の位: 公明・拡大・最高潮の年", advice: "積極的に表に出てよい年。発信・発表・公開に最吉" },
};

export interface NenUn {
  targetYear: number;
  chukyuName: string;
  starPosition: number;
  palace: string;
  direction: string;
  meaning: string;
  advice: string;
  isHapposagari: boolean;
}

export function calcNenUn(kyusei: string, targetYear: number): NenUn | null {
  const starNum = KYUSEI_TO_NUM[kyusei];
  if (!starNum) return null;
  const chukyu = calcChukyuStar(targetYear);
  const position = ((((starNum - 1 + (5 - chukyu)) % 9) + 9) % 9) + 1;
  const def = NENUN_POSITION_DEF[position];
  if (!def) return null;
  return {
    targetYear,
    chukyuName: CHUKYU_NAMES[chukyu] || "",
    starPosition: position,
    palace: def.palace,
    direction: def.direction,
    meaning: def.meaning,
    advice: def.advice,
    isHapposagari: position === 5,
  };
}

/* ── 宿深化データ（軽量版: UI表示用フィールドのみ） ── */
export interface ShukuDeepUI {
  name: string;
  irohaPhase: string;
  irohaSound: string;
  tenchiPhase: string;
  coreNature: string;
  coreConflict: string;
  deepQuestion1: string;
  deepQuestion2: string;
  deepQuestion3: string;
  reversalSign: string;
  element: string;
}

const SHUKU_DEEP_UI: ShukuDeepUI[] = [
  { name: "角宿", irohaPhase: "イロハニホヘト", irohaSound: "イ", tenchiPhase: "父母の息が凝り放たれる始まり", coreNature: "品位と礼節を重んじる始まりの宿", coreConflict: "勢いと体面の間で、本音が後回しになりやすい", deepQuestion1: "今最初の線を引くべき場所はどこか", deepQuestion2: "誰の目のための品位になっているか", deepQuestion3: "始まりを遅らせている恐れは何か", reversalSign: "小さな失礼を気にしすぎるとき", element: "水" },
  { name: "亢宿", irohaPhase: "ニホヘト", irohaSound: "ニ", tenchiPhase: "二つに分かれる力が現れる", coreNature: "推進と勢い。前へ進むエンジンが強い", coreConflict: "制御不能な加速と、他者への圧", deepQuestion1: "その勢いは本当に自分の意志から来ているか", deepQuestion2: "止まることで見えるものは何か", deepQuestion3: "加速の先に何を求めているのか", reversalSign: "人が離れ始めるとき", element: "金" },
  { name: "氐宿", irohaPhase: "ホヘト", irohaSound: "ホ", tenchiPhase: "根が張り始める", coreNature: "根源的な安定を求める宿", coreConflict: "安定への執着が変化を拒む", deepQuestion1: "今の安定は本当の安定か", deepQuestion2: "手放すべき安定はどれか", deepQuestion3: "根を張る場所は自分で選んだか", reversalSign: "変化を恐れて動けないとき", element: "土" },
  { name: "房宿", irohaPhase: "ヘト", irohaSound: "ヘ", tenchiPhase: "内側に部屋が生まれる", coreNature: "内面の豊かさと創造性の宿", coreConflict: "内側の世界に閉じこもりがち", deepQuestion1: "内側の豊かさを誰と分かち合うか", deepQuestion2: "閉じた扉の向こうに何があるか", deepQuestion3: "創造は誰のためか", reversalSign: "孤独を心地よく感じすぎるとき", element: "火" },
  { name: "心宿", irohaPhase: "ト", irohaSound: "ト", tenchiPhase: "核心に火が灯る", coreNature: "情熱と直感の宿。核心を突く力", coreConflict: "激しさが周囲を焼く", deepQuestion1: "その情熱は何を照らしているか", deepQuestion2: "燃やしているのは自分か他者か", deepQuestion3: "静かな火はどこにあるか", reversalSign: "怒りが止まらないとき", element: "火" },
  { name: "尾宿", irohaPhase: "チリヌルヲ", irohaSound: "チ", tenchiPhase: "尾を引く力が現れる", coreNature: "持続力と忍耐の宿", coreConflict: "執着と忍耐の境界が曖昧", deepQuestion1: "続けていることは本当に必要か", deepQuestion2: "手放す勇気はどこにあるか", deepQuestion3: "忍耐の先に何を見ているか", reversalSign: "疲弊しても止められないとき", element: "火" },
  { name: "箕宿", irohaPhase: "リヌルヲ", irohaSound: "リ", tenchiPhase: "風が吹き散らす", coreNature: "自由と拡散の宿。風のように動く", coreConflict: "散漫さと集中力の欠如", deepQuestion1: "風はどこへ向かっているか", deepQuestion2: "散らしているのは何か", deepQuestion3: "一つに留まることで何が見えるか", reversalSign: "飽きが早くなったとき", element: "水" },
  { name: "斗宿", irohaPhase: "ヌルヲ", irohaSound: "ヌ", tenchiPhase: "量る力が現れる", coreNature: "判断力と公正さの宿", coreConflict: "裁く側に立ちすぎる", deepQuestion1: "その判断は誰のためか", deepQuestion2: "裁かれる側の気持ちを知っているか", deepQuestion3: "正しさの外にあるものは何か", reversalSign: "他者を評価しすぎるとき", element: "木" },
  { name: "女宿", irohaPhase: "ルヲ", irohaSound: "ル", tenchiPhase: "流れる水が形を変える", coreNature: "適応力と柔軟性の宿", coreConflict: "自分の形を失いやすい", deepQuestion1: "今の自分は誰の形か", deepQuestion2: "流されているのか、流れているのか", deepQuestion3: "自分の形とは何か", reversalSign: "誰にでも合わせてしまうとき", element: "水" },
  { name: "虚宿", irohaPhase: "ヲ", irohaSound: "ヲ", tenchiPhase: "空虚の中に種が落ちる", coreNature: "空虚と可能性の宿。何もないところから始める", coreConflict: "虚しさに飲まれやすい", deepQuestion1: "空虚の中に何を見ているか", deepQuestion2: "何もないことは本当に何もないか", deepQuestion3: "種はどこに落ちたか", reversalSign: "意味を求めすぎるとき", element: "土" },
  { name: "危宿", irohaPhase: "ワカヨタレソ", irohaSound: "ワ", tenchiPhase: "崖の縁に立つ", coreNature: "危機と覚醒の宿。極限で力を発揮する", coreConflict: "孤立型。危機を自ら作り出す", deepQuestion1: "その危機は本物か自作か", deepQuestion2: "崖から降りることは敗北か", deepQuestion3: "安全な場所はどこにあるか", reversalSign: "孤立を誇りに感じるとき", element: "火" },
  { name: "室宿", irohaPhase: "カヨタレソ", irohaSound: "カ", tenchiPhase: "部屋が完成する", coreNature: "完成と安住の宿。場を作る力", coreConflict: "完成した場から出られない", deepQuestion1: "この部屋は誰のために作ったか", deepQuestion2: "壁の外に何があるか", deepQuestion3: "完成は終わりか始まりか", reversalSign: "変化を拒むとき", element: "火" },
  { name: "壁宿", irohaPhase: "ヨタレソ", irohaSound: "ヨ", tenchiPhase: "壁が立ちはだかる", coreNature: "境界と守護の宿。壁を作り守る", coreConflict: "壁が自分自身を閉じ込める", deepQuestion1: "その壁は誰を守っているか", deepQuestion2: "壁の向こうに何を恐れているか", deepQuestion3: "壁を溶かす方法は何か", reversalSign: "人を寄せ付けないとき", element: "水" },
  { name: "奎宿", irohaPhase: "タレソ", irohaSound: "タ", tenchiPhase: "種が地に落ちる", coreNature: "知性と学びの宿。種を蒔く力", coreConflict: "知識に溺れて行動が遅れる", deepQuestion1: "学んだことをどう使うか", deepQuestion2: "知識は行動の代わりになるか", deepQuestion3: "種を蒔く場所は決まったか", reversalSign: "調べすぎて動けないとき", element: "木" },
  { name: "婁宿", irohaPhase: "レソ", irohaSound: "レ", tenchiPhase: "糸が紡がれ始める", coreNature: "つなぐ力と調和の宿", coreConflict: "つなぎすぎて自分を見失う", deepQuestion1: "誰と誰をつないでいるか", deepQuestion2: "つなぐことで何を得ているか", deepQuestion3: "自分自身とつながっているか", reversalSign: "仲介役に疲れたとき", element: "金" },
  { name: "胃宿", irohaPhase: "ソ", irohaSound: "ソ", tenchiPhase: "消化する力が現れる", coreNature: "受容と消化の宿。何でも取り込む", coreConflict: "取り込みすぎて消化不良", deepQuestion1: "今消化すべきものは何か", deepQuestion2: "吐き出すべきものはないか", deepQuestion3: "本当に必要な栄養は何か", reversalSign: "情報過多で混乱するとき", element: "土" },
  { name: "昴宿", irohaPhase: "ツネナラム", irohaSound: "ツ", tenchiPhase: "星が集まり輝く", coreNature: "華やかさと集合の宿。人を集める力", coreConflict: "表面的な輝きに頼りがち", deepQuestion1: "その輝きは内側から来ているか", deepQuestion2: "集まった人は何を求めているか", deepQuestion3: "一人になったとき何が残るか", reversalSign: "注目されないと不安なとき", element: "金" },
  { name: "畢宿", irohaPhase: "ネナラム", irohaSound: "ネ", tenchiPhase: "網が広がる", coreNature: "包容力と粘り強さの宿", coreConflict: "包み込みすぎて相手を窒息させる", deepQuestion1: "その包容は相手が望んでいるか", deepQuestion2: "手放すことは愛ではないか", deepQuestion3: "網の目の大きさは適切か", reversalSign: "相手の自由を制限するとき", element: "火" },
  { name: "觜宿", irohaPhase: "ナラム", irohaSound: "ナ", tenchiPhase: "嘴が鋭く光る", coreNature: "鋭い洞察と言葉の宿", coreConflict: "言葉が刃になりやすい", deepQuestion1: "その言葉は誰を傷つけているか", deepQuestion2: "沈黙の中に何があるか", deepQuestion3: "鋭さを優しさに変える方法は", reversalSign: "正論で人を追い詰めるとき", element: "火" },
  { name: "参宿", irohaPhase: "ラム", irohaSound: "ラ", tenchiPhase: "三つの星が並ぶ", coreNature: "行動力と冒険の宿。三つの道を持つ", coreConflict: "多方面に手を出しすぎる", deepQuestion1: "三つの道のうちどれが本道か", deepQuestion2: "冒険は逃避ではないか", deepQuestion3: "一つに絞る勇気はあるか", reversalSign: "落ち着きがなくなったとき", element: "水" },
  { name: "井宿", irohaPhase: "ム", irohaSound: "ム", tenchiPhase: "井戸の水が湧く", coreNature: "深い知恵と静けさの宿", coreConflict: "深すぎて人に伝わらない", deepQuestion1: "その深さを誰と共有するか", deepQuestion2: "水面に映るものは何か", deepQuestion3: "汲み上げる勇気はあるか", reversalSign: "理解されないと感じるとき", element: "水" },
  { name: "鬼宿", irohaPhase: "ウヰノオクヤマ", irohaSound: "ウ", tenchiPhase: "見えない力が動く", coreNature: "霊感と直感の宿。見えないものを感じる", coreConflict: "見えすぎて現実から離れる", deepQuestion1: "見えているものは本物か", deepQuestion2: "現実と霊感のバランスはどこか", deepQuestion3: "その力を何に使うか", reversalSign: "現実逃避が始まるとき", element: "金" },
  { name: "柳宿", irohaPhase: "ヰノオクヤマ", irohaSound: "ヰ", tenchiPhase: "柳が風に揺れる", coreNature: "しなやかさと感受性の宿", coreConflict: "感情に振り回されやすい", deepQuestion1: "その感情は自分のものか", deepQuestion2: "しなやかさと弱さの違いは何か", deepQuestion3: "折れない芯はどこにあるか", reversalSign: "感情の波が大きすぎるとき", element: "土" },
  { name: "星宿", irohaPhase: "ノオクヤマ", irohaSound: "ノ", tenchiPhase: "一つの星が輝く", coreNature: "個性と自己表現の宿", coreConflict: "自己主張が強すぎる", deepQuestion1: "その輝きは誰を照らしているか", deepQuestion2: "他の星との距離は適切か", deepQuestion3: "輝きの源は何か", reversalSign: "自分だけが正しいと感じるとき", element: "火" },
  { name: "張宿", irohaPhase: "オクヤマ", irohaSound: "オ", tenchiPhase: "弓が張られる", coreNature: "緊張と集中の宿。的を射る力", coreConflict: "緊張が解けない", deepQuestion1: "何を狙っているのか", deepQuestion2: "弓を下ろす時はいつか", deepQuestion3: "的は本当にそこにあるか", reversalSign: "リラックスできないとき", element: "火" },
  { name: "翼宿", irohaPhase: "クヤマ", irohaSound: "ク", tenchiPhase: "翼が広がる", coreNature: "拡張と飛翔の宿。広い視野を持つ", coreConflict: "地に足がつかない", deepQuestion1: "翼はどこへ向かっているか", deepQuestion2: "着地する場所は決まっているか", deepQuestion3: "飛ぶことと逃げることの違いは", reversalSign: "現実から目を逸らすとき", element: "火" },
  { name: "軫宿", irohaPhase: "ヤマ", irohaSound: "ヤ", tenchiPhase: "車輪が回り始める", coreNature: "循環と完成の宿。物事を回す力", coreConflict: "同じところを回り続ける", deepQuestion1: "この循環は上昇しているか", deepQuestion2: "降りるべき車輪はどれか", deepQuestion3: "回転の先に何があるか", reversalSign: "同じ失敗を繰り返すとき", element: "水" },
];

export function getShukuDeepUI(honmeiShuku: string): ShukuDeepUI | null {
  return SHUKU_DEEP_UI.find(s => s.name === honmeiShuku) || null;
}

/* ── 統合深化データ ── */
export interface DeepeningData {
  gogyoRelation: GogyoRelation | null;
  nenUn: NenUn | null;
  shukuDeep: ShukuDeepUI | null;
}

export function computeDeepeningData(params: {
  honmeiShuku?: string;
  kyusei?: string;
  meikyu?: string;
}): DeepeningData {
  const { honmeiShuku, kyusei, meikyu } = params;
  return {
    gogyoRelation: kyusei && meikyu ? analyzeGogyoRelation(kyusei, meikyu) : null,
    nenUn: kyusei ? calcNenUn(kyusei, new Date().getFullYear()) : null,
    shukuDeep: honmeiShuku ? getShukuDeepUI(honmeiShuku) : null,
  };
}
