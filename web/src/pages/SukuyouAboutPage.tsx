/**
 * ============================================================
 *  SUKUYOU ABOUT PAGE — 宿曜経とは 特設ページ
 *  TENMON_MANUS_CARD_SUKUYOU_ABOUT_V1
 *  ライトテーマ対応 + 書籍出典明記 + 27宿詳説
 * ============================================================
 */
import React, { useRef } from "react";

/* ── ライトテーマカラー ── */
const C = {
  bg: "#fafaf7",
  card: "#ffffff",
  text: "#1f2937",
  textSub: "#6b7280",
  textMuted: "#9ca3af",
  border: "#e5e7eb",
  arkGold: "#c9a14a",
  arkGoldBg: "rgba(201,161,74,0.08)",
  arkGoldBorder: "rgba(201,161,74,0.3)",
  sectionBg: "#fffbf0",
  sectionBorder: "#f5e6c8",
  quoteBg: "#f8f5ef",
  quoteBorder: "#d4a853",
  tableBorder: "#e5e0d5",
  tableHeaderBg: "#f5f0e6",
  eastBg: "#eef7ee",
  eastBorder: "#a3d9a3",
  northBg: "#eef2f7",
  northBorder: "#a3b8d9",
  westBg: "#f7f2ee",
  westBorder: "#d9c4a3",
  southBg: "#f7eeee",
  southBorder: "#d9a3a3",
} as const;

interface SukuyouAboutPageProps {
  onBack?: () => void;
}

/* ── 27宿データ ── */
interface ShukuData {
  name: string;
  reading: string;
  keywords: string;
  goodActions: string;
  caution: string;
  description: string;
}

const EAST_SHUKU: ShukuData[] = [
  { name: "角", reading: "かくしゅく", keywords: "始動・品位・表明", goodActions: "発表、式典、装い、芸事、祈願、スタート", caution: "形や見映えを優先しすぎやすい", description: "角宿は、物事の始まりを整え、外に向けて正しく立ち上げる力を持つ宿です。古伝では、厳飾、衣服、装身具、歌舞音曲、芸事、王者の正装、祭祀などに吉とされ、「場を開く」「表に示す」働きが強い宿です。礼節、品位、見せ方、第一印象の強さに恵まれやすく、企画の起点・式典・発表・広報・表現に向きます。" },
  { name: "亢", reading: "こうしゅく", keywords: "推進・訓練・勝負", goodActions: "調教、婚礼、交友、種蒔き、技芸鍛錬", caution: "強情、対立、張りつめすぎ", description: "亢宿は、前へ出る勢いと、荒い力を統御可能な力に変える宿です。古伝では、馬の調教、技芸の訓練、婚姻、交友、穀物の種蒔きなどに吉が置かれ、暴走する力を実務へ乗せていく気配が見えます。競争心、突破力、押し出しの強さに恵まれやすい反面、張りつめすぎると対立として出やすい宿です。" },
  { name: "氐", reading: "ていしゅく", keywords: "基礎・耕作・蓄え", goodActions: "農具づくり、穀物栽培、果樹、苗木、生活基盤づくり", caution: "変化に慎重すぎて停滞しやすい", description: "氐宿は、華やかな開始よりも、土台を耕し、実りを育てる基礎の宿です。農具づくり、穀物、果樹の栽培、苗木の育成などに吉があり、生活の根を養う働きが際立ちます。堅実に積み上げること、時間を味方につけることに向いています。" },
  { name: "房", reading: "ぼうしゅく", keywords: "結縁・和合・信義", goodActions: "婚姻、交友、布施、受戒、学芸、修道", caution: "和を優先しすぎて本音を飲み込みやすい", description: "房宿は、人と人のあいだに親和・結縁・信義を生み出す宿です。結朋友、婚姻、善事、喜楽吉祥、受戒、布施、修道、学芸などに吉があり、「和する」力の強い宿として扱われています。縁をつなぎ、関係を柔らかく保ち、対立を橋渡しする資質を持ちやすい宿です。" },
  { name: "心", reading: "しんしゅく", keywords: "集中・中心・権威", goodActions: "昇位、統率、装束、調教、重要判断", caution: "執着、支配欲、貸借や出財の不向き", description: "心宿は、集中、権威、中心性を帯びた宿です。王者の事、昇位、調乗、農作に吉が見えますが、金銭の貸し借りには凶を付しています。情念が深く、集中力が高く、支配力やカリスマが出やすい半面、独占欲・極端さとして表れやすいところがあります。" },
  { name: "尾", reading: "びしゅく", keywords: "持久・継承・熟成", goodActions: "植樹、薬、洗浴、倉宅整備、長期育成", caution: "抱え込み、執念、過去への固着", description: "尾宿は、持続、蓄積、継承の力を持つ宿です。樹木の種蒔き、煎薬、洗浴、倉や宅の整備、愛喜の事に吉があり、長く生きるものを育て、守る宿意が見えます。粘り強さ、家系意識、継続力に優れ、時間をかけて成果を出すタイプに向きます。" },
  { name: "箕", reading: "きしゅく", keywords: "循環・拡散・流通", goodActions: "水路、池、橋、園圃、流通、交流拡張", caution: "焦点が散りやすい", description: "箕宿は、ため込むより流す・広げる・循環させる方向に力が働く宿です。溝渠を掘る、池を穿つ、河流を通じる、橋梁などが吉で、停滞したものを外へ出し、風通しよくすることが本質です。社交性、発散性、拡張性が強く、情報や人脈を回す力に長けます。" },
];

const NORTH_SHUKU: ShukuData[] = [
  { name: "斗", reading: "としゅく", keywords: "器・理念・制度", goodActions: "倉庫、田宅、車輿、寺舎、長く使う仕組みづくり", caution: "形にこだわりすぎる", description: "斗宿は、器・制度・学び・保存を司る宿です。倉の設置、園林の修理、田宅・城邑・寺舎の建営などに吉があり、暮らしと社会を受け止める「入れ物」を整える働きが強い宿です。理念を形にする設計力、器量、継続できる仕組みを作る力に優れています。" },
  { name: "女", reading: "じょしゅく", keywords: "技巧・規律・微細", goodActions: "公事、修理、技芸、理髪、調整、細部管理", caution: "神経質、批判的になりやすい", description: "女宿は、繊細さ、技芸、服務、秩序づくりに向く宿です。公事、技芸、修理、理髪、按摩などが吉で、社会の細かな運用と実務に関わる色が濃く出ています。器用さ、観察眼、規律、事務処理能力に優れやすく、秘書・調整・手仕事・学芸に強みがあります。" },
  { name: "虚", reading: "きょしゅく", keywords: "余白・再編・移行", goodActions: "急ぐ事、学問、夜浴、求子法、商業、新しい技芸", caution: "足場が定まらず迷いやすい", description: "虚宿は、空白・余白・移行の宿です。急速事、学問、夜浴、求子の法、商業、新しい伎藝の設置などに吉が見え、まだ形になっていない余地を扱う力が特徴です。感受性、構想力、再編力に恵まれ、未整理のものを整理しなおすことに向きます。" },
  { name: "危", reading: "きしゅく", keywords: "危機対応・薬・判断", goodActions: "合薬、服薬、商い、納財、医療、舟船", caution: "緊張過多、出財には慎重さが必要", description: "危宿は、危うさを避けるのではなく、危機の縁で判断を研ぎ澄ます宿です。合薬・取薬・服薬が大吉で、商人の派遣、納財、医薬、舟船にも吉が置かれています。感覚が鋭く、判断が速く、危険の兆しを察する力に優れます。" },
  { name: "室", reading: "しつしゅく", keywords: "防衛・境界・粛正", goodActions: "守り、邪悪除去、秩序維持、悪の処断", caution: "一般の吉事には向かず、閉鎖的になりやすい", description: "室宿は、守る、囲う、正す、粛清するという性質が強い宿です。罪非の勘逐、凶逆の除去が示される一方、それ以外の諸事には不向きとされています。防御本能、守秘性、境界意識、家や共同体を守る力が強く出やすい宿です。" },
  { name: "壁", reading: "へきしゅく", keywords: "保存・文書・長久", goodActions: "婚姻、学問、文書、知識保存、継承、長寿増益", caution: "守りに寄りすぎてこもりやすい", description: "壁宿は、知を蓄え、命を守り、長く残す宿です。長寿増益法、城邑の建設、婚姻や喜善事に吉があります。安重宿に分類され、宮殿・寺観・倉庫・園林・久長事に向く宿とされています。保存、学問、文書、蓄積、制度、継承に強い宿です。" },
];

const WEST_SHUKU: ShukuData[] = [
  { name: "奎", reading: "けいしゅく", keywords: "美・礼節・整理", goodActions: "珍宝、倉庫、衣服、遠行、和善事、整序", caution: "体裁や美に偏りやすい", description: "奎宿は、品格、整序、美しさと蓄財を結ぶ宿です。珍宝、倉庫、衣服飾り、遠行、和善事に吉があり、物を数え、保ち、整え、必要に応じて動かす力が見えます。和善宿に分類され、礼節、美意識、計数、整理能力に優れます。" },
  { name: "婁", reading: "ろうしゅく", keywords: "縁結び・即応・流通", goodActions: "薬の授受、出売、仲介、初動の速い仕事", caution: "軽率、早のみこみ", description: "婁宿は、急ぎ動くときに力を発揮する宿です。急速事、薬の授受、出売などに吉があり、ためらわず実行に移すこと、流通させることと相性がよい宿です。愛嬌、関係形成、売買感覚、初動の速さが出やすく、営業・仲介・接客に向きます。" },
  { name: "胃", reading: "いしゅく", keywords: "実務・受容・統制", goodActions: "公事、管理、訓練、実務運営、生活維持", caution: "締めつけが強くなりやすい", description: "胃宿は、受け取り、整え、処理し、秩序立てる宿です。公事、王者の善事、厳整の事に吉があり、全体の統制と運営に強い宿です。猛悪宿にも分類され、必要なら強く締める力も持ちます。現実処理能力、管理力、養う力が高い宿です。" },
  { name: "昴", reading: "ぼうしゅく", keywords: "火・起動・純化", goodActions: "火を使う事、煎煮、種蒔き、鍛造、勝負ごと", caution: "焦燥、熱くなりすぎる", description: "昴宿は、火、熱、純化、点火の宿です。火を使う仕事、煎煮、種蒔き、石金作、敵を伐つこと、勝事などに吉があり、火と活力に関わる行為が目立ちます。熱意、突破力、純化力が強く、停滞を焼き切る力がありますが、勢いが過剰だと焦りにもなりやすい宿です。" },
  { name: "畢", reading: "ひつしゅく", keywords: "安定・建設・持続", goodActions: "農桑、婚姻、田宅修理、橋梁、安定事業", caution: "貸借や投機には慎重さが必要", description: "畢宿は、二十七宿の中でも特に安定・建設・長期維持に強い宿です。農桑、種蒔き、田宅修理、婚姻、橋梁、安定の事に吉があります。安重宿に分類され、宮殿・寺観・倉庫・久長事に向く宿です。腰を据えて形にする力、保守力、生活力に秀でます。" },
  { name: "觜", reading: "ししゅく", keywords: "集中・選別・精密", goodActions: "急事、和善事、婚姻、新宅、修理、祭星曜", caution: "過集中、神経の尖り", description: "觜宿は、焦点を絞り、必要なことを素早く選び取る宿です。急を要する事と和善事の両方に吉があり、和善宿に分類されます。神経の鋭さ、言葉の選び、手順の精密さに優れ、狙いを定めて成果を出す力があります。" },
  { name: "参", reading: "しんしゅく", keywords: "突破・剛毅・決断", goodActions: "求財、穿地、池、猟、関所、強い実行", caution: "攻めすぎ、敵を作りやすい", description: "参宿は、切り込む、決める、奪りにいく、という強い行動性を持つ宿です。求財、剛厳事、池を穿つこと、猟などに吉があります。毒害宿に分類され、闘争、兵、斬決に向くとされます。決断、勝負勘、商才、攻勢に強く、起業・営業・交渉に向きます。" },
];

const SOUTH_SHUKU: ShukuData[] = [
  { name: "井", reading: "せいしゅく", keywords: "成就・恵み・湧出", goodActions: "布施、祭法、婚姻、納婦、置立成就、子息繁盛", caution: "与えすぎ、広げすぎ", description: "井宿は、恵みを湧かせ、物事を成就へ導く泉の宿です。布施が大果を生み、置立の事は成就し、祭法・婚姻に吉とされます。与えることで巡りを生み、周囲を潤し、共同体の中に恩恵を呼び込む力があります。" },
  { name: "鬼", reading: "きしゅく", keywords: "吉祥・祭祀・生命力", goodActions: "長寿祈願、生業開始、官位、遠行、理髪、新衣、洗浴", caution: "大吉ゆえの過信", description: "鬼宿は、二十七宿の中でも特に吉祥性が強い宿として重視されます。「所作皆吉」とまで言われ、長寿、生業の開始、官位、福徳増長など人生の多くの重要事に吉が及びます。生命力、霊的感受、祭祀性、徳の集まりやすさがある宿です。" },
  { name: "柳", reading: "りゅうしゅく", keywords: "攻防・試練・計略", goodActions: "伐逆、攻城、掩襲、討叛、潜行、策略", caution: "怨恨、攻撃性、執念", description: "柳宿は、細くしなやかに見えて、実際には非常に鋭い宿です。逆を伐つこと、城を攻めること、掩襲、討叛、潜行に吉があり、毒害宿に分類されます。観察眼、忍耐、機を見る知恵、静かな攻防感覚に優れ、試練の場で真価を発揮します。" },
  { name: "星", reading: "せいしゅく", keywords: "種まき・生活基盤・文明", goodActions: "種蒔き、五穀、修宅、祖先祭祀、住定業、修理", caution: "労務過多、争いが広がりやすい", description: "星宿は、種を蒔き、暮らしを立て、場を住める状態へ整える宿です。種蒔き、五穀・菜の栽培、修宅、祖先祭祀、住定業に吉があります。猛悪宿にも分類され、穏やかに見えて実は文明的・制度的な力を持っています。" },
  { name: "張", reading: "ちょうしゅく", keywords: "祝賀・拡張・愛敬", goodActions: "喜慶、婚姻、装飾、愛敬法、果木、立市", caution: "勢いが散りやすい", description: "張宿は、拡張、祝意、華やかさ、愛敬の宿です。喜慶事、婚姻、宅の修理、衣服や厳飾物、愛敬法に吉があります。猛悪宿にも分類され、広げる力が強いぶん、良いものを伸ばすことも、争いを拡大することもある宿です。人気、発信力、祝祭性に秀でます。" },
  { name: "翼", reading: "よくしゅく", keywords: "支援・制度・安定発展", goodActions: "宅垣、市、城邑、車輿、農商業、安定事", caution: "主役より補佐に回りやすい", description: "翼宿は、支える・制度化する・安定へ導く宿です。「所作皆吉」とまで言われ、安重宿に分類されます。補佐力、制度感覚、支援性、組織を持続させる力に優れ、全体の機能を安定させることで大きな価値を出します。" },
  { name: "軫", reading: "しんしゅく", keywords: "移動・外交・感応", goodActions: "遠行、理髪、技芸、男女の縁、穿池、園圃、外交", caution: "腰が定まりにくい", description: "軫宿は、移動、外交、機転、応答の宿です。急速事、外国への遠行、技芸の学習、男女の縁、南行大吉が示され、動きながら物事を整える宿です。感応力、旅運、外交性、レスポンスの速さがあり、旅・交渉・翻訳・仲介に向きます。" },
];

/* ── セクション見出しコンポーネント ── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 18,
      fontWeight: 700,
      color: C.text,
      borderLeft: `4px solid ${C.arkGold}`,
      paddingLeft: 12,
      marginTop: 40,
      marginBottom: 16,
      letterSpacing: 0.5,
    }}>
      {children}
    </h2>
  );
}

/* ── 引用ブロックコンポーネント ── */
function QuoteBlock({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: C.quoteBg,
      borderLeft: `3px solid ${C.quoteBorder}`,
      padding: "14px 18px",
      margin: "16px 0",
      fontSize: 14,
      lineHeight: 1.85,
      color: C.text,
      borderRadius: "0 6px 6px 0",
      fontStyle: "italic",
    }}>
      {children}
    </div>
  );
}

/* ── 宿カードコンポーネント ── */
function ShukuCard({ shuku }: { shuku: ShukuData }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: "16px 18px",
      marginBottom: 12,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{shuku.name}宿</span>
        <span style={{ fontSize: 12, color: C.textMuted }}>（{shuku.reading}）</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {shuku.keywords.split("・").map((kw, i) => (
          <span key={i} style={{
            fontSize: 11,
            padding: "2px 8px",
            background: C.arkGoldBg,
            border: `1px solid ${C.arkGoldBorder}`,
            borderRadius: 10,
            color: "#92400e",
            fontWeight: 500,
          }}>{kw}</span>
        ))}
      </div>
      <p style={{ fontSize: 13.5, lineHeight: 1.85, color: C.text, margin: "0 0 10px" }}>
        {shuku.description}
      </p>
      <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.7 }}>
        <div><strong style={{ color: C.text }}>吉行動:</strong> {shuku.goodActions}</div>
        <div><strong style={{ color: "#b45309" }}>注意:</strong> {shuku.caution}</div>
      </div>
    </div>
  );
}

/* ── 方位セクションコンポーネント ── */
function DirectionSection({ title, shukuList, bgColor, borderColor }: {
  title: string;
  shukuList: ShukuData[];
  bgColor: string;
  borderColor: string;
}) {
  return (
    <div style={{
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: 12,
      padding: "20px 16px",
      marginBottom: 20,
    }}>
      <h3 style={{
        fontSize: 15,
        fontWeight: 700,
        color: C.text,
        marginBottom: 14,
        paddingBottom: 8,
        borderBottom: `1px solid ${borderColor}`,
      }}>
        {title}
      </h3>
      {shukuList.map((s) => <ShukuCard key={s.name} shuku={s} />)}
    </div>
  );
}

/* ── メインコンポーネント ── */
export function SukuyouAboutPage({ onBack }: SukuyouAboutPageProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      style={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        background: C.bg,
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "28px 20px 80px",
          fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif",
          color: C.text,
        }}
      >
        {/* ── ヘッダー ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          {onBack && (
            <button
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                color: C.textSub,
                borderRadius: 8,
                padding: "7px 16px",
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "inherit",
                transition: "all 0.2s",
              }}
              onClick={onBack}
            >
              ← 戻る
            </button>
          )}
          <h1 style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 1.5,
            color: C.text,
            margin: 0,
          }}>
            宿曜経とは
          </h1>
        </div>
        <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 28 }}>
          TENMON-ARK 特設ページ
        </p>

        {/* ── 導入 ── */}
        <div style={{
          background: C.sectionBg,
          border: `1px solid ${C.sectionBorder}`,
          borderRadius: 12,
          padding: "22px 20px",
          marginBottom: 28,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginTop: 0, marginBottom: 12 }}>
            TENMON-ARKが宿曜を扱う理由
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: C.text, margin: 0 }}>
            宿曜とは、月の通り道である二十七宿、日月五星から成る七曜、そして十二宮を用いて、
            人の性質、運の流れ、相性、行動に適した時を読む東洋の占星体系です。
            これは単なる「今日の運勢」を見るだけのものではありません。
            古い宿曜の系統では、その人が生まれ持った質、今どのような時流の中にいるか、
            誰と結ぶと伸び、誰と組むと摩耗しやすいか、何を始めるとよいか、何を避けるべきかを、
            時間・関係・行為の三つの軸で読んでいきます。
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: C.text, marginTop: 12, marginBottom: 0 }}>
            TENMON-ARKでは宿曜を、ただの占いとしてではなく、
            <strong>「人と時の構文を読むための星の言語」</strong>として扱います。
          </p>
        </div>

        {/* ── 宿曜と空海 ── */}
        <SectionTitle>宿曜と空海の関係</SectionTitle>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          真言密教の伝承では、宿曜は弘法大師空海と深く結びついた法として語られてきました。
          『宿曜経占真伝』には、はっきりと次のように記されています。
        </p>
        <QuoteBlock>
          「宿曜経者、我弘法大師之承来也」
        </QuoteBlock>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          また『密教占星法』でも、安然の『八家秘録』や『弘法大師行化記』の裏書など、
          弘法大師と宿曜経を結びつける記録に言及しています。
          史料学的に絶対断定するというより、真言密教の伝承上、空海将来の法として重視されてきた、
          と読むのがもっとも自然で誠実です。
        </p>
        <QuoteBlock>
          宿曜は、真言密教の伝承の中で、弘法大師空海とも深く結びつけて語られてきた星の法です。
          単なる吉凶占いではなく、時と行いの整いを読むための密教的な暦法・占星法として受け継がれてきました。
        </QuoteBlock>

        {/* ── 基本構造 ── */}
        <SectionTitle>宿曜の基本構造</SectionTitle>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 16 }}>
          宿曜は「七曜・二十七宿・十二宮」で読みます。その骨格は非常にシンプルです。
        </p>
        <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
          {[
            { num: "1", title: "二十七宿", desc: "月が約一か月で巡る二十七の星区分。人の生まれ持った質や、日の吉凶、行動との相性を見る中心。" },
            { num: "2", title: "七曜", desc: "日・月・火・水・木・金・土の七つ。その日の空気、その時の働き、動くべきか止まるべきかを見る。" },
            { num: "3", title: "十二宮", desc: "天空を十二に分けた区分。季節性、社会性、人生領域、月と星の配置を読むための枠組み。" },
            { num: "4", title: "命宿", desc: "その人の「生まれ宿」。宿曜ではまずこの命宿を知ることが土台になる。" },
            { num: "5", title: "三九法", desc: "命宿を起点にして二十七宿を配列し、栄・衰・安・危・成・壊・友・親などの関係を見る秘法。相性や時期判断で特に重要。" },
          ].map((item) => (
            <div key={item.num} style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "14px 16px",
              display: "flex",
              gap: 12,
            }}>
              <span style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: C.arkGoldBg,
                border: `1px solid ${C.arkGoldBorder}`,
                color: "#92400e",
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}>{item.num}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: C.textSub }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── 二十七宿と二十八宿 ── */}
        <SectionTitle>二十七宿と二十八宿の違い</SectionTitle>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          『宿曜経占真伝』では、中国では二十八宿を用い、インドでは二十七宿を用いるという説明があり、
          さらに牛宿を除く理由にも触れています。
          『密教占星法』も、二十七宿・十二宮・七曜の関係を整理し、月を軸に宿と宮が定まることを解説しています。
        </p>
        <QuoteBlock>
          宿曜には中国系の二十八宿と、インド系の二十七宿の系統があります。
          日本の宿曜では、二十七宿を重視する伝承が強く、月の巡りと人の運命をより密接に結びつけて読みます。
        </QuoteBlock>

        {/* ── 宿曜では何を読むのか ── */}
        <SectionTitle>宿曜では何を読むのか</SectionTitle>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 16 }}>
          宿曜は大きく分けて、次の四つを読みます。
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
          {[
            { label: "性質", desc: "基本的な気質、得意不得意、心の癖" },
            { label: "時", desc: "動くべき時か、待つべき時か、整えるべき時か" },
            { label: "関係", desc: "栄か衰か、友か壊か" },
            { label: "行為", desc: "婚姻、移動、建築、学び、契約など" },
          ].map((item) => (
            <div key={item.label} style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "12px 14px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.arkGold, marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontSize: 12, lineHeight: 1.6, color: C.textSub }}>{item.desc}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.85, color: C.textSub }}>
          実際に書中では、祭祀、出行、婚姻、建築、農事、軍事、医薬、裁衣、倉庫、交友など
          非常に広い日常実践に使われていたことが語られています。
          古伝では、吉凶の強さは「日一倍・宿四倍・曜八倍・時は万倍」という重みづけで語られます。
        </p>

        {/* ── 二十七宿の並び ── */}
        <SectionTitle>二十七宿の並び</SectionTitle>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          宿曜で使う二十七宿は、次の順で巡ります。
        </p>
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "16px 18px",
          marginBottom: 20,
          textAlign: "center",
        }}>
          <p style={{ fontSize: 14, lineHeight: 2.2, color: C.text, margin: 0, letterSpacing: 1 }}>
            角 → 亢 → 氐 → 房 → 心 → 尾 → 箕 → 斗 → 女 → 虚 → 危 → 室 → 壁 → 奎 → 婁 → 胃 → 昴 → 畢 → 觜 → 参 → 井 → 鬼 → 柳 → 星 → 張 → 翼 → 軫
          </p>
          <p style={{ fontSize: 11, color: C.textMuted, marginTop: 8, marginBottom: 0 }}>
            ※ 日本の宿曜では通常、牛宿を除いた二十七宿で数えます。
          </p>
        </div>

        {/* ── 27宿詳説 ── */}
        <SectionTitle>二十七宿 詳説</SectionTitle>
        <p style={{ fontSize: 13.5, lineHeight: 1.85, color: C.textSub, marginBottom: 20 }}>
          以下は、『宿曜経占真伝』下巻の「二十七宿所為吉凶暦」と、『密教占星法』第七章の各宿解説・宿分類をもとに、
          現代の読者にもわかりやすいよう再構成した詳説です。
          同じ宿でも命宿・直日・七曜・三九法との関係で吉凶は反転しうるため、
          以下は「その宿の基礎的傾向」として読むのが適切です。
        </p>

        <DirectionSection title="東方七宿" shukuList={EAST_SHUKU} bgColor={C.eastBg} borderColor={C.eastBorder} />
        <DirectionSection title="北方六宿" shukuList={NORTH_SHUKU} bgColor={C.northBg} borderColor={C.northBorder} />
        <DirectionSection title="西方七宿" shukuList={WEST_SHUKU} bgColor={C.westBg} borderColor={C.westBorder} />
        <DirectionSection title="南方七宿" shukuList={SOUTH_SHUKU} bgColor={C.southBg} borderColor={C.southBorder} />

        {/* ── 命宿の調べ方 ── */}
        <SectionTitle>自分の命宿の調べ方</SectionTitle>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          宿曜では、最初に自分の命宿を定めます。
          命宿とは、その人が生まれたときにもっとも深く結びついた宿で、
          性質、相性、時の読み方、三九法の起点になります。
        </p>
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "18px 20px",
          marginBottom: 20,
        }}>
          {[
            { step: "1", title: "生まれた月の「十五日の宿」を確認する", desc: "その月の十五日に月がかかっている宿（望宿）を調べます。" },
            { step: "2", title: "誕生日が十五日以前なら、逆に数える", desc: "生まれた日が一日〜十五日のあいだなら、十五日の宿から逆順に数えます。" },
            { step: "3", title: "誕生日が十六日以後なら、順に数える", desc: "生まれた日が十六日以後なら、十五日の宿から順に数えます。" },
            { step: "4", title: "行き着いた宿が「命宿」", desc: "誕生日の日に当たった宿が、その人の命宿です。" },
          ].map((item) => (
            <div key={item.step} style={{
              display: "flex",
              gap: 12,
              marginBottom: 14,
              paddingBottom: 14,
              borderBottom: item.step !== "4" ? `1px solid ${C.border}` : "none",
            }}>
              <span style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: C.arkGoldBg,
                border: `1px solid ${C.arkGoldBorder}`,
                color: "#92400e",
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}>{item.step}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: C.textSub }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── 三九法 ── */}
        <SectionTitle>三九法とは何か</SectionTitle>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          宿曜の面白さは、単なる「自分の宿」だけでは終わらないことです。
          命宿を第一として数え、栄・衰・安・危・成・壊・友・親という関係性を見ていきます。
          さらに二九・三九へと展開して、業宿と胎宿まで読むのが特徴です。
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
          gap: 8,
          marginBottom: 16,
        }}>
          {[
            { label: "栄", desc: "伸びる", color: "#16a34a" },
            { label: "安", desc: "落ち着く", color: "#2563eb" },
            { label: "成", desc: "形になる", color: "#7c3aed" },
            { label: "友・親", desc: "結びやすい", color: "#c9a14a" },
            { label: "衰", desc: "弱りやすい", color: "#9ca3af" },
            { label: "危", desc: "不安定", color: "#d97706" },
            { label: "壊", desc: "崩れやすい", color: "#dc2626" },
          ].map((item) => (
            <div key={item.label} style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "10px 8px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: item.color, marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: C.textSub }}>{item.desc}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          三九法は次の三段で構成されます。
        </p>
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "16px 18px",
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 13.5, lineHeight: 1.85, color: C.text }}>
            <div style={{ marginBottom: 8 }}><strong>一九</strong> … 命宿を起点に、栄・衰・安・危・成・壊・友・親を置く</div>
            <div style={{ marginBottom: 8 }}><strong>二九</strong> … 業宿を起点に同じく九宿を置く</div>
            <div><strong>三九</strong> … 胎宿を起点に同じく九宿を置く</div>
          </div>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          これによって、相手と結ぶと伸びるのか、疲れやすい縁なのか、
          今の行動が通りやすいのか、どの時期に慎重であるべきかを読んでいきます。
        </p>

        {/* ── TENMON-ARKにおける位置づけ ── */}
        <SectionTitle>TENMON-ARKにおける宿曜の位置づけ</SectionTitle>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          TENMON-ARKでは宿曜を、人の宿命を固定するものとしてではなく、
          時の質を読み、行動を整え、関係を選び直すための知として扱います。
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          宿曜の本質は、「あなたはこういう人間だ」と決めつけることではありません。
          むしろ、いま自分に流れている星の質は何か、いま動くべきか整えるべきか、
          どの縁を深めどの縁を慎むべきか、どの行為がいま通りやすいかを知り、
          生き方を整えるために使うことにあります。
        </p>

        {/* ── 注意書き ── */}
        <div style={{
          background: "#f8f5ef",
          border: `1px solid ${C.sectionBorder}`,
          borderRadius: 10,
          padding: "16px 18px",
          marginTop: 32,
          marginBottom: 28,
        }}>
          <p style={{ fontSize: 12.5, lineHeight: 1.8, color: C.textSub, margin: 0 }}>
            宿曜には複数の伝承系統と異本があり、解釈には流派差があります。
            本ページでは、真言密教系の宿曜伝承をもとに、現代の読者にもわかりやすいよう再構成して紹介しています。
          </p>
        </div>

        {/* ── 出典 ── */}
        <SectionTitle>出典書籍</SectionTitle>
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "18px 20px",
          marginBottom: 20,
        }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
              『宿曜経占真伝』（上下巻）
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: C.textSub }}>
              著者: 若原敬経 / 発行: 其中堂蔵版 / 全522ページ
            </div>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
              『密教占星法』
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: C.textSub }}>
              著者: 森田龍僊（高野山大学 名誉教授） / 発行: 大学出版部 / 全970ページ
            </div>
          </div>
        </div>

        {/* ── フッター ── */}
        <div style={{
          textAlign: "center",
          paddingTop: 28,
          borderTop: `1px solid ${C.border}`,
          marginTop: 20,
        }}>
          <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>
            TENMON-ARK — 人と時の構文を読むための星の言語
          </p>
        </div>
      </div>
    </div>
  );
}

export default SukuyouAboutPage;
