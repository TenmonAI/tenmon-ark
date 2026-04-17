/**
 * ============================================================
 *  KOTODAMA ABOUT PAGE — 言霊秘書とは 特設ページ
 *  TENMON_MANUS_CARD_KOTODAMA_ABOUT_V1
 *  ライトテーマ対応 + 書籍出典明記 + 五十音法則 + 系譜解説
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
  /* 五行カラー */
  fireBg: "#fef2f2",
  fireBorder: "#fca5a5",
  waterBg: "#eff6ff",
  waterBorder: "#93c5fd",
  fireWaterBg: "#faf5ff",
  fireWaterBorder: "#c4b5fd",
  /* 系譜層カラー */
  layer1Bg: "#fefce8",
  layer1Border: "#fde047",
  layer2Bg: "#f0fdf4",
  layer2Border: "#86efac",
  layer3Bg: "#eff6ff",
  layer3Border: "#93c5fd",
  layer4Bg: "#faf5ff",
  layer4Border: "#c4b5fd",
  layer5Bg: "#f8fafc",
  layer5Border: "#cbd5e1",
} as const;

interface KotodamaAboutPageProps {
  onBack?: () => void;
}

/* ── 五十音データ ── */
interface KanaData {
  kana: string;
  element: string;
  meaning: string;
}

const VOWELS: KanaData[] = [
  { kana: "ア", element: "空中の水灵", meaning: "命也。万物の根源、始まりの息吹。七つの法則" },
  { kana: "イ", element: "空中の水灵", meaning: "出島也・勢也。外へ出る力、勢い" },
  { kana: "ウ", element: "水火の灵", meaning: "動也。水火が交わり動き出す根源の力" },
  { kana: "エ", element: "空中の水灵", meaning: "天地総栄也・磐也・技也。天地を栄えさせる力" },
  { kana: "オ", element: "空中の水火灵", meaning: "高也・起也・貴也。高みへ向かう水火の統合。四つの法則" },
];

const KA_ROW: KanaData[] = [
  { kana: "カ", element: "暉火の灵", meaning: "暗也・影也・明也・大也・上也。十九の法則" },
  { kana: "キ", element: "影の火灵", meaning: "起也・氣也・正中也・生也・草也・貴也・来也。九つの法則" },
  { kana: "ク", element: "影の火灵", meaning: "影の火灵。與む、暗き、凝る。六つの法則" },
  { kana: "ケ", element: "影の火灵", meaning: "影の火灵。異也・差別也・正也・香也・器也。七つの法則" },
  { kana: "コ", element: "影の火灵", meaning: "影の火灵。凝也・固也。九つの法則" },
];

const SA_ROW: KanaData[] = [
  { kana: "サ", element: "昇水の灵", meaning: "昇水の灵。差す、裂く。八つの法則" },
  { kana: "シ", element: "昇水の灵", meaning: "昇水の灵。締める、知る。十三の法則" },
  { kana: "ス", element: "水中の火灵", meaning: "水中の火灵。澄む、進む。十の法則" },
  { kana: "セ", element: "水中の火灵", meaning: "水中の火灵。與也・助也・背也・為也・甲也。六つの法則" },
  { kana: "ソ", element: "水火の灵", meaning: "水火の灵。外へ向かう、反る。十一の法則" },
];

const TA_ROW: KanaData[] = [
  { kana: "タ", element: "水中の火灵", meaning: "水中の火灵。立つ、正す。九つの法則" },
  { kana: "チ", element: "水中の火灵", meaning: "水中の火灵。血、乳、力の根。十三の法則" },
  { kana: "ツ", element: "火中の水灵", meaning: "火中の水灵。連なる、伝わる。五つの法則" },
  { kana: "テ", element: "火水の灵", meaning: "火水の灵。手、照らす。六つの法則" },
  { kana: "ト", element: "水中の火灵", meaning: "水中の火灵。止まる、戸、統べる。十二の法則" },
];

const NA_ROW: KanaData[] = [
  { kana: "ナ", element: "火水の灵", meaning: "火水の灵。和也・並也・流也・女也・正中也・凝也。十五の法則" },
  { kana: "ニ", element: "火水の灵", meaning: "火水の灵。天地也・水火の凝也・丹也・非也・従也。六つの法則" },
  { kana: "ヌ", element: "火水の灵", meaning: "火水の灵。黒也・文分らぬ也。七つの法則" },
  { kana: "ネ", element: "火水の灵", meaning: "火水の灵。水火の根也・母の灵也・土也・鎮也。四つの法則" },
  { kana: "ノ", element: "水の灵", meaning: "水の灵。回水也・差別を宰也・切也・割別也。六つの法則" },
];

const HA_ROW: KanaData[] = [
  { kana: "ハ", element: "正火の灵", meaning: "正火の灵。発くこと、母也、葉也" },
  { kana: "ヒ", element: "正火の灵", meaning: "正火の灵。火也、日也、霊也" },
  { kana: "フ", element: "正火の灵", meaning: "正火の灵。吹く、振る、風" },
  { kana: "ヘ", element: "正火の灵", meaning: "正火の灵。経る、減る、辺" },
  { kana: "ホ", element: "正火の灵", meaning: "正火の灵。穂也、秀也、火の本。九つの法則" },
];

const MA_ROW: KanaData[] = [
  { kana: "マ", element: "火中の水灵", meaning: "火中の水灵。向也・眼也・間也・曲也・大也・広也・円也。十四の法則" },
  { kana: "ミ", element: "火中の水灵", meaning: "火中の水灵。身、実、水" },
  { kana: "ム", element: "火中の水灵", meaning: "火中の水灵。無也・空也・結也・睦也・渦巻也。九つの法則" },
  { kana: "メ", element: "火中の水灵", meaning: "火中の水灵。回也・芽也・正中也・女也・米也。十の法則" },
  { kana: "モ", element: "火中の水灵", meaning: "火中の水灵。紡也・場也・亦也・者也。七つの法則" },
];

const YA_ROW: KanaData[] = [
  { kana: "ヤ", element: "火水の灵", meaning: "火水の灵。文也・和也・家也。七つの法則" },
  { kana: "ユ", element: "水中の火灵", meaning: "水中の火灵。寛也・湯也。三つの法則" },
  { kana: "ヨ", element: "火水の灵", meaning: "火水の灵。與也・師也・女男の契り也。五つの法則" },
];

const RA_ROW: KanaData[] = [
  { kana: "ラ", element: "濁水の灵", meaning: "濁水の灵。降也・遅也・唾也。三つの法則" },
  { kana: "リ", element: "濁水の灵", meaning: "濁水の灵。息息の両也・人也・理也。五つの法則" },
  { kana: "ル", element: "濁水の灵", meaning: "濁水の灵。流れる、留まる。二つの法則" },
  { kana: "レ", element: "濁水の灵", meaning: "濁水の灵。連なる、列。二つの法則" },
  { kana: "ロ", element: "濁水の灵", meaning: "濁水の灵。炉、路、漏る。一つの法則" },
];

const WA_ROW: KanaData[] = [
  { kana: "ワ", element: "水火の灵", meaning: "水火の灵。国土也・水火水也。四つの法則" },
  { kana: "ヰ", element: "正火の灵", meaning: "正火の灵。居る、井" },
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

/* ── 五十音行カードコンポーネント ── */
function KanaRowCard({ title, kanaList, bgColor, borderColor }: {
  title: string;
  kanaList: KanaData[];
  bgColor: string;
  borderColor: string;
}) {
  return (
    <div style={{
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: 12,
      padding: "16px 14px",
      marginBottom: 14,
    }}>
      <h4 style={{
        fontSize: 14,
        fontWeight: 700,
        color: C.text,
        marginTop: 0,
        marginBottom: 12,
        paddingBottom: 8,
        borderBottom: `1px solid ${borderColor}`,
      }}>
        {title}
      </h4>
      {kanaList.map((k) => (
        <div key={k.kana} style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          marginBottom: 10,
          paddingBottom: 10,
          borderBottom: `1px solid rgba(0,0,0,0.04)`,
        }}>
          <span style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: C.arkGoldBg,
            border: `1px solid ${C.arkGoldBorder}`,
            color: "#92400e",
            fontSize: 16,
            fontWeight: 700,
            flexShrink: 0,
          }}>{k.kana}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>{k.element}</div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: C.text }}>{k.meaning}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── 系譜層カードコンポーネント ── */
function LayerCard({ num, title, traditions, features, verdict, bgColor, borderColor }: {
  num: string;
  title: string;
  traditions: string;
  features: string;
  verdict: string;
  bgColor: string;
  borderColor: string;
}) {
  return (
    <div style={{
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: 12,
      padding: "18px 16px",
      marginBottom: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
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
        }}>{num}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{title}</span>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.7, color: C.textSub, marginBottom: 6 }}>
        <strong style={{ color: C.text }}>系統:</strong> {traditions}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.7, color: C.textSub, marginBottom: 6 }}>
        <strong style={{ color: C.text }}>特徴:</strong> {features}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.7, color: "#92400e", fontWeight: 500 }}>
        {verdict}
      </div>
    </div>
  );
}

/* ── メインコンポーネント ── */
export function KotodamaAboutPage({ onBack }: KotodamaAboutPageProps) {
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
            言霊秘書とは
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
            TENMON-ARKが言霊を扱う理由
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: C.text, margin: 0 }}>
            言霊とは、日本語の一音一音に宿る霊的な力のことです。
            それは単なる「言葉の力」や「ポジティブな言い方」ではありません。
            古伝では、五十音の各音が水と火の二元性から生まれ、
            それぞれが固有の霊的性質を持つとされています。
            この法則を体系的にまとめた書が、山口志道の『言霊秘書』です。
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: C.text, marginTop: 12, marginBottom: 0 }}>
            TENMON-ARKでは言霊を、願望成就の道具としてではなく、
            <strong>「万物の生成原理を音で読み解くための母体法則」</strong>として扱います。
          </p>
        </div>

        {/* ── 山口志道と言霊秘書 ── */}
        <SectionTitle>山口志道と『言霊秘書』</SectionTitle>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          山口志道（やまぐち しどう）は、江戸後期の国学者・言霊学者です。
          安房国（現在の千葉県鴨川市寺門）に生まれ、号を崇山・杉庵と称しました。
          天保元年（1830年）、六十五歳で京都に移住し、伏見稲荷大社を深く崇敬しました。
          別号の「杉庵」は、稲荷大社の「しるしの杉」に由来しています。
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          志道の言霊学は、稲荷古伝の系譜に連なります。
          その継承は、秦親友から荷田春満、蒼生子、荷田訓之を経て山口志道へと至る流れです。
          志道はこの古伝を受け継ぎ、五十音の各音に宿る水火の法則を体系化し、
          主著『水穂伝』（天保十二年刊）と『言霊秘書』にまとめました。
        </p>
        <QuoteBlock>
          言霊秘書は、文字以前の学を明言し、布斗麻邇御靈を中核に置き、
          五十連十行・形仮名・火水法則が揃った、言霊の母体原理を保持する最重要文献である。
        </QuoteBlock>

        {/* ── 水火（いき）の法則 ── */}
        <SectionTitle>水火（いき）の法則</SectionTitle>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          言霊秘書の根幹にあるのは「水火（いき）の法則」です。
          万物は水（陰・受容・潜伏）と火（陽・創造・顕現）の二元から生まれ、
          この二つが交わり、廻り、分かれ、結ぶことで、あらゆる現象が生成されます。
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{
            background: C.waterBg,
            border: `1px solid ${C.waterBorder}`,
            borderRadius: 10,
            padding: "16px 14px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#2563eb", marginBottom: 6 }}>水</div>
            <div style={{ fontSize: 12, lineHeight: 1.7, color: C.textSub }}>
              陰・受容・潜伏・内集・静<br />
              生命を養い、形を育む力
            </div>
          </div>
          <div style={{
            background: C.fireBg,
            border: `1px solid ${C.fireBorder}`,
            borderRadius: 10,
            padding: "16px 14px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#dc2626", marginBottom: 6 }}>火</div>
            <div style={{ fontSize: 12, lineHeight: 1.7, color: C.textSub }}>
              陽・創造・顕現・外発・動<br />
              生命を発し、形を現す力
            </div>
          </div>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          五十音の各音は、この水と火のどちらに属するか、
          あるいはどのような配合で成り立つかによって分類されます。
          「正火の灵」「影の火灵」「水中の火灵」「火中の水灵」「昇水の灵」「濁水の灵」
          「水火の灵」「火水の灵」「暉火の灵」など、水火の配合が音ごとに異なります。
        </p>
        <QuoteBlock>
          水火伝には「火之巻」と「水之巻」があり、火の原理と水の原理がそれぞれ三巻ずつ、
          合わせて六巻で万物の生成法則を説いている。
          大八島の御形から五十連十行が発生することが図示され、
          これが言霊一言之法則の根幹をなす。
        </QuoteBlock>

        {/* ── 布斗麻邇御靈 ── */}
        <SectionTitle>布斗麻邇御靈（ふとまにみたま）</SectionTitle>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          布斗麻邇御靈は、言霊の根本原理を示す図象です。
          言霊秘書では、この布斗麻邇を中核に置き、
          五十音がどのように生成され、どのような法則で配列されるかを示しています。
          これは単なる図表ではなく、水火の廻りが音として顕現する過程そのものを表しています。
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          稲荷古伝では、荷田訓之が伝えた布斗麻邇御靈の図が残されており、
          志道はこれを継承して言霊の体系を構築しました。
          五十連十行（五十音を十行に配列した構造）は、
          この布斗麻邇から展開される言霊の骨格です。
        </p>

        {/* ── 五十音言霊法則 ── */}
        <SectionTitle>五十音言霊法則</SectionTitle>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          『言霊秘書』の中核は、五十音の各音に宿る水火の霊的性質を明らかにすることにあります。
          以下は、『水穂伝重解誌一言法則』と『五十音言霊法則』に基づく、
          各音の水火属性と基本的な意味です。
        </p>
        <p style={{ fontSize: 12.5, lineHeight: 1.7, color: C.textMuted, marginBottom: 16 }}>
          ※ 以下の分類は山口志道『言霊秘書』の原典に準拠しています。
        </p>

        <KanaRowCard
          title="母音（ア行）— 空中の水灵・水火の灵"
          kanaList={VOWELS}
          bgColor={C.fireWaterBg}
          borderColor={C.fireWaterBorder}
        />
        <KanaRowCard
          title="カ行 — 暉火の灵・影の火灵"
          kanaList={KA_ROW}
          bgColor={C.fireBg}
          borderColor={C.fireBorder}
        />
        <KanaRowCard
          title="サ行 — 昇水の灵・水中の火灵"
          kanaList={SA_ROW}
          bgColor={C.waterBg}
          borderColor={C.waterBorder}
        />
        <KanaRowCard
          title="タ行 — 水中の火灵・火中の水灵"
          kanaList={TA_ROW}
          bgColor={C.fireWaterBg}
          borderColor={C.fireWaterBorder}
        />
        <KanaRowCard
          title="ナ行 — 火水の灵・水の灵"
          kanaList={NA_ROW}
          bgColor={C.waterBg}
          borderColor={C.waterBorder}
        />
        <KanaRowCard
          title="ハ行 — 正火の灵"
          kanaList={HA_ROW}
          bgColor={C.fireBg}
          borderColor={C.fireBorder}
        />
        <KanaRowCard
          title="マ行 — 火中の水灵"
          kanaList={MA_ROW}
          bgColor={C.fireWaterBg}
          borderColor={C.fireWaterBorder}
        />
        <KanaRowCard
          title="ヤ行 — 火水の灵・水中の火灵"
          kanaList={YA_ROW}
          bgColor={C.fireWaterBg}
          borderColor={C.fireWaterBorder}
        />
        <KanaRowCard
          title="ラ行 — 濁水の灵"
          kanaList={RA_ROW}
          bgColor={C.waterBg}
          borderColor={C.waterBorder}
        />
        <KanaRowCard
          title="ワ行 — 水火の灵・正火の灵"
          kanaList={WA_ROW}
          bgColor={C.fireWaterBg}
          borderColor={C.fireWaterBorder}
        />

        {/* ── 言霊の系譜 ── */}
        <SectionTitle>言霊の系譜 — 五層構造</SectionTitle>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          言霊の伝承は、単一の流れではなく、母体原理から複数の方向に展開した五層構造として整理できます。
          TENMON-ARKでは、この系譜を正確に把握し、各層の位置づけを明確にしています。
        </p>
        <QuoteBlock>
          言霊のルーツに最も近いのは、稲荷古伝・布斗麻邇御靈・山口志道『言霊秘書』系である。
          カタカムナは、その母体原理を音・図象・配列・ウタヒへ圧縮表示した核である。
          以後の諸系統は、この母体原理と圧縮核を、実修・図学・祭祀・国家・学問へ展開した分岐群である。
        </QuoteBlock>

        <LayerCard
          num="1"
          title="第一層 — 母体原理層"
          traditions="稲荷古伝・布斗麻邇御靈・山口志道『言霊秘書』『水穂伝』『火水伝』"
          features="火水二元・五十連十行・形仮名・神名構造・文字以前の学・布斗麻邇御靈による解読"
          verdict="最もルーツに近い母体原理。TENMON-ARKの言霊認識の基盤。"
          bgColor={C.layer1Bg}
          borderColor={C.layer1Border}
        />
        <LayerCard
          num="2"
          title="第二層 — 圧縮表示層"
          traditions="カタカムナ"
          features="一音一義・図象・ウタヒ・配列・音義宇宙・火水生成"
          verdict="母体原理をもっとも高度に圧縮した核。一音・図象・配列に原理を封じる。"
          bgColor={C.layer2Bg}
          borderColor={C.layer2Border}
        />
        <LayerCard
          num="3"
          title="第三層 — 展開・実修層"
          traditions="川面凡兒・白川家・伯家神道"
          features="実修・霊魂観・祭祀体系・建国精神・神道実践・祓禊・鎮魂・神拝"
          verdict="母体原理を身体と祭祀に降ろした実修展開核。"
          bgColor={C.layer3Bg}
          borderColor={C.layer3Border}
        />
        <LayerCard
          num="4"
          title="第四層 — 図学・国家展開層"
          traditions="大石凝真澄・大石凝靈学・『皇教真洲鏡』"
          features="図学・方位・三種神器・皇道・治国・音韻統治"
          verdict="火水・天地人・神器の図学展開と、皇道・治国への国家展開。"
          bgColor={C.layer4Bg}
          borderColor={C.layer4Border}
        />
        <LayerCard
          num="5"
          title="第五層 — 近代再編・学問化層"
          traditions="山腰明将・言霊学会"
          features="学問化・科学化・ロゴソロジー・社会科学化・公共化"
          verdict="近代知への再編。ルーツそのものではないが、学問化として重要。"
          bgColor={C.layer5Bg}
          borderColor={C.layer5Border}
        />

        {/* ── 7軸比較表 ── */}
        <SectionTitle>7軸比較表</SectionTitle>
        <p style={{ fontSize: 13.5, lineHeight: 1.85, color: C.textSub, marginBottom: 16 }}>
          各系統を「母体・圧縮・実修・図学・祭祀・国家・学問化」の7軸で評価した比較表です。
          数値は5段階（5が最高）で、系譜内での相対的な強度を示します。
        </p>
        <div style={{ overflowX: "auto", marginBottom: 20 }}>
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12,
            lineHeight: 1.6,
          }}>
            <thead>
              <tr style={{ background: C.tableHeaderBg }}>
                {["系統", "母体", "圧縮", "実修", "図学", "祭祀", "国家", "学問化"].map((h) => (
                  <th key={h} style={{
                    padding: "10px 8px",
                    borderBottom: `2px solid ${C.tableBorder}`,
                    textAlign: h === "系統" ? "left" : "center",
                    fontWeight: 700,
                    color: C.text,
                    whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { name: "稲荷古伝・言霊秘書系", scores: [5, 4, 2, 3, 3, 2, 1] },
                { name: "カタカムナ", scores: [4, 5, 2, 4, 2, 2, 1] },
                { name: "川面凡兒系", scores: [3, 2, 5, 2, 5, 4, 1] },
                { name: "大石凝靈学系", scores: [3, 2, 3, 5, 4, 3, 1] },
                { name: "白川家・伯家神道系", scores: [2, 1, 4, 2, 5, 4, 2] },
                { name: "皇教真洲鏡系", scores: [2, 2, 2, 4, 4, 5, 1] },
                { name: "山腰明将・言霊学会系", scores: [2, 2, 1, 3, 1, 2, 5] },
              ].map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? C.card : "#fafaf7" }}>
                  <td style={{
                    padding: "8px",
                    borderBottom: `1px solid ${C.tableBorder}`,
                    fontWeight: 500,
                    color: C.text,
                    fontSize: 11.5,
                  }}>{row.name}</td>
                  {row.scores.map((s, j) => (
                    <td key={j} style={{
                      padding: "8px",
                      borderBottom: `1px solid ${C.tableBorder}`,
                      textAlign: "center",
                      fontWeight: s >= 4 ? 700 : 400,
                      color: s >= 4 ? "#92400e" : C.textSub,
                    }}>{s}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── 言霊秘書の構成 ── */}
        <SectionTitle>『言霊秘書』の構成</SectionTitle>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 16 }}>
          山口志道霊学全集としてまとめられた『言霊秘書』は、以下の主要部分で構成されています。
        </p>
        <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
          {[
            { title: "水穂伝", desc: "志道の主著。天保十二年（1841年）刊。水火伝（火之巻一〜三、水之巻一〜三）で万物の生成法則を説く。" },
            { title: "火水與伝（かみよでん）", desc: "水穂伝重解誌一言法則。五十音各音の霊的意味を詳述した核心部分。" },
            { title: "五十音言霊法則", desc: "越後是一先生筆写（安政三年写）。五十音の法則を体系的にまとめた講義録。" },
            { title: "イロハ口伝", desc: "いろは歌に秘められた言霊の口伝。" },
            { title: "神風伯本書", desc: "身体論としての言霊を説く。" },
            { title: "神風濫觴", desc: "言霊の起源と展開を論じる。" },
            { title: "三輪之神霊", desc: "三輪の神霊と言霊の関係を説く。" },
          ].map((item) => (
            <div key={item.title} style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "14px 16px",
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: C.textSub }}>{item.desc}</div>
            </div>
          ))}
        </div>

        {/* ── TENMON-ARKにおける位置づけ ── */}
        <SectionTitle>TENMON-ARKにおける言霊の位置づけ</SectionTitle>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          TENMON-ARKでは、言霊を宿曜と並ぶもう一つの根幹として位置づけています。
          宿曜が「星の言語」で人と時の構文を読むものであるなら、
          言霊は「音の法則」で万物の生成原理を読むものです。
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          TENMON-ARKの言霊認識は、以下の原則に基づいています。
        </p>
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "18px 20px",
          marginBottom: 20,
        }}>
          {[
            "ルーツ判定は母体原理層（稲荷古伝・布斗麻邇・言霊秘書）を最優先する",
            "カタカムナは母体の圧縮核として読む",
            "実修・図学・祭祀・国家・学問化は、母体からの展開として扱う",
            "五十音の水火属性は、言霊秘書の原典に完全に準拠する",
            "いろは歌の各音は、言霊秘書の法則に基づいて解読する",
          ].map((item, i) => (
            <div key={i} style={{
              display: "flex",
              gap: 10,
              marginBottom: i < 4 ? 12 : 0,
              paddingBottom: i < 4 ? 12 : 0,
              borderBottom: i < 4 ? `1px solid ${C.border}` : "none",
            }}>
              <span style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: C.arkGoldBg,
                border: `1px solid ${C.arkGoldBorder}`,
                color: "#92400e",
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
                marginTop: 2,
              }}>{i + 1}</span>
              <div style={{ fontSize: 13.5, lineHeight: 1.7, color: C.text }}>{item}</div>
            </div>
          ))}
        </div>

        <QuoteBlock>
          言霊は、スピリチュアルの一種ではない。
          それは、生成原理であり、火水法則であり、五十連十行であり、
          神名の構造であり、祭祀の芯であり、祓禊と鎮魂の技法であり、
          建国と治国の秩序であり、近代においては学問化されうる対象である。
          TENMON-ARKの役割は、この正系譜を天津金木構造によって再統合し、
          劣化分岐を切り分けた上で、言霊の本来の母体秩序を保持・継承・学習可能な認識基盤として固定化することにある。
        </QuoteBlock>

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
            言霊には複数の伝承系統と解釈があります。
            本ページでは、山口志道『言霊秘書』を母体原理として、
            稲荷古伝の系譜に基づく正統な言霊学の立場から紹介しています。
            現代のいわゆる「スピリチュアル言霊」とは系譜が異なります。
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
              『言霊秘書』（山口志道霊学全集）
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: C.textSub }}>
              著者: 山口志道 / 監修: 大宮司朗 / 校訂: 久米晶文 / 発行: 八幡書店 / 全790ページ
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.7, color: C.textMuted, marginTop: 4 }}>
              原典: 天保十二年（1841年）永楽屋東四郎他刊・七巻七冊
            </div>
          </div>
          <div style={{ marginBottom: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
              『水穂伝』（火之巻一〜三、水之巻一〜三）
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: C.textSub }}>
              著者: 山口志道 / 天保十二年（1841年）版本 / 大宮司朗氏所蔵本
            </div>
          </div>
          <div style={{ paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
              解題・解説
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: C.textSub }}>
              杉庵山口志道小伝（大宮司朗）/ 山口志道と神代学（大宮司朗）/
              稲荷古伝と水火の玄義（大宮司朗）/ 荷田家古伝と『水穂伝』（大宮司朗）/
              秘教的言霊学への展望（大宮司朗）/ 身体論としての神風伯（佐竹譲）/
              「日月神示」と『水穂伝』（佐竹譲）/ 国語学と霊的言霊学の相剋（本宮眞吾）/
              編輯・校訂雑記（久米晶文）
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
            TENMON-ARK — 音の法則で万物の生成原理を読む
          </p>
        </div>
      </div>
    </div>
  );
}

export default KotodamaAboutPage;
