/**
 * ============================================================
 *  AMATSU KANAGI ABOUT PAGE — 天津金木とは 特設ページ
 *  TENMON_MANUS_CARD_AMATSU_KANAGI_ABOUT_V1
 *  ライトテーマ対応 + Notion資料統合 + 50パターン詳説
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
  sectionBg: "#f0f5f0",
  sectionBorder: "#b8d4b8",
  quoteBg: "#f5f8f5",
  quoteBorder: "#6b9e6b",
  tableBorder: "#d0ddd0",
  tableHeaderBg: "#e8f0e8",
  /* 四位相カラー */
  leftInBg: "#eef2f9",
  leftInBorder: "#a3b8d9",
  rightInBg: "#f2eef9",
  rightInBorder: "#b8a3d9",
  leftOutBg: "#eef9ee",
  leftOutBorder: "#a3d9a3",
  rightOutBg: "#f9f2ee",
  rightOutBorder: "#d9b8a3",
  /* 天地水火カラー */
  tenColor: "#3b82f6",
  chiColor: "#d97706",
  suiColor: "#059669",
  kaColor: "#dc2626",
  neColor: "#1f2937",
  sueColor: "#9ca3af",
  /* 階層カラー */
  tier1Bg: "#fffbeb",
  tier1Border: "#f59e0b",
  tier2Bg: "#eff6ff",
  tier2Border: "#3b82f6",
  tier3Bg: "#fef2f2",
  tier3Border: "#ef4444",
} as const;

interface AmatsuKanagiAboutPageProps {
  onBack?: () => void;
}

/* ── 50パターンデータ ── */
interface PatternData {
  no: number;
  kana: string;
  sequence: string;
  category: "basic" | "center" | "inversion";
}

const PATTERNS_BASIC: PatternData[] = [
  { no: 1, kana: "ホ", sequence: "左内→右内→左外→右外", category: "basic" },
  { no: 2, kana: "オ", sequence: "左内→右内→右外→左外", category: "basic" },
  { no: 3, kana: "ヲ", sequence: "左内→左外→右内→右外", category: "basic" },
  { no: 4, kana: "ヘ", sequence: "左内→左外→右外→右内", category: "basic" },
  { no: 5, kana: "エ", sequence: "左内→右外→左外→右内", category: "basic" },
  { no: 6, kana: "ヱ", sequence: "左内→右外→右内→左外", category: "basic" },
  { no: 7, kana: "フ", sequence: "右内→左内→左外→右外", category: "basic" },
  { no: 8, kana: "ウ", sequence: "右内→左内→右外→左外", category: "basic" },
  { no: 9, kana: "ゥ", sequence: "右内→左外→左内→右外", category: "basic" },
  { no: 10, kana: "ヒ", sequence: "右内→左外→右外→左内", category: "basic" },
  { no: 11, kana: "ミ", sequence: "右内→右外→左内→左外", category: "basic" },
  { no: 12, kana: "イ", sequence: "右内→右外→左外→左内", category: "basic" },
  { no: 13, kana: "井", sequence: "左外→左内→右内→右外", category: "basic" },
  { no: 14, kana: "ハ", sequence: "左外→左内→右外→右内", category: "basic" },
  { no: 15, kana: "ア", sequence: "左外→右内→左内→右外", category: "basic" },
  { no: 16, kana: "ワ", sequence: "左外→右内→右外→左内", category: "basic" },
  { no: 17, kana: "ヤ", sequence: "左外→右外→左内→右内", category: "basic" },
];

const PATTERNS_CENTER: PatternData[] = [
  { no: 18, kana: "ィ", sequence: "完全内集（左内→右内→左内→右内）", category: "center" },
  { no: 19, kana: "ユ", sequence: "左外→右外→右内→左内", category: "basic" },
  { no: 20, kana: "ェ", sequence: "完全外発（左外→右外→左外→右外）", category: "center" },
];

const PATTERNS_BASIC2: PatternData[] = [
  { no: 21, kana: "ヨ", sequence: "右外→左内→右内→左外", category: "basic" },
  { no: 22, kana: "ノ", sequence: "右外→左内→左外→右内", category: "basic" },
  { no: 23, kana: "ネ", sequence: "右外→右内→左内→左外", category: "basic" },
  { no: 24, kana: "ヌ", sequence: "右外→右内→左外→左内", category: "basic" },
  { no: 25, kana: "二", sequence: "右外→左外→左内→右内", category: "basic" },
  { no: 26, kana: "ナ", sequence: "右外→左外→右内→左内", category: "basic" },
];

const PATTERNS_INVERSION: PatternData[] = [
  { no: 27, kana: "ラ", sequence: "右外→左外→右内→左内（ホの反転）", category: "inversion" },
  { no: 28, kana: "リ", sequence: "右外→左外→左内→右内（オの反転）", category: "inversion" },
  { no: 29, kana: "ル", sequence: "右外→右内→左外→左内（ヲの反転）", category: "inversion" },
  { no: 30, kana: "レ", sequence: "右外→右内→左内→左外（ヘの反転）", category: "inversion" },
  { no: 31, kana: "ロ", sequence: "右外→左内→右内→左外（エの反転）", category: "inversion" },
  { no: 32, kana: "コ", sequence: "右外→左内→左外→右内（ヱの反転）", category: "inversion" },
  { no: 33, kana: "ソ", sequence: "左外→右外→右内→左内（フの反転）", category: "inversion" },
  { no: 34, kana: "ケ", sequence: "左外→右外→左内→右内（ウの反転）", category: "inversion" },
  { no: 35, kana: "セ", sequence: "左外→右内→右外→左内（ゥの反転）", category: "inversion" },
  { no: 36, kana: "ク", sequence: "左外→右内→左内→右外（ヒの反転）", category: "inversion" },
  { no: 37, kana: "ス", sequence: "左外→左内→右外→右内（ミの反転）", category: "inversion" },
  { no: 38, kana: "キ", sequence: "左外→左内→右内→右外（イの反転）", category: "inversion" },
  { no: 39, kana: "カ", sequence: "右内→右外→左外→左内（井の反転）", category: "inversion" },
  { no: 40, kana: "シ", sequence: "右内→右外→左内→左外（ハの反転）", category: "inversion" },
  { no: 41, kana: "サ", sequence: "右内→左外→右外→左内（アの反転）", category: "inversion" },
  { no: 42, kana: "タ", sequence: "右内→左外→左内→右外（ワの反転）", category: "inversion" },
  { no: 43, kana: "チ", sequence: "右内→左内→右外→左外（ヤの反転）", category: "inversion" },
  { no: 44, kana: "ツ", sequence: "右内→左内→左外→右外（ユの反転）", category: "inversion" },
  { no: 45, kana: "テ", sequence: "左内→右外→右内→左外（ヨの反転）", category: "inversion" },
  { no: 46, kana: "ト", sequence: "左内→右外→左外→右内（ノの反転）", category: "inversion" },
  { no: 47, kana: "モ", sequence: "左内→左外→右外→右内（ネの反転）", category: "inversion" },
  { no: 48, kana: "メ", sequence: "左内→左外→右内→右外（ヌの反転）", category: "inversion" },
  { no: 49, kana: "ム", sequence: "左内→右内→右外→左外（二の反転）", category: "inversion" },
  { no: 50, kana: "マ", sequence: "左内→右内→左外→右外（ナの反転）", category: "inversion" },
];

/* ── セクション見出しコンポーネント ── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 18,
      fontWeight: 700,
      color: C.text,
      borderLeft: `4px solid ${C.suiColor}`,
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

/* ── パターンカードコンポーネント ── */
function PatternCard({ pattern }: { pattern: PatternData }) {
  const bgColor = pattern.category === "center"
    ? "rgba(201,161,74,0.06)"
    : pattern.category === "inversion"
      ? "rgba(239,68,68,0.04)"
      : C.card;
  const borderColor = pattern.category === "center"
    ? C.arkGoldBorder
    : pattern.category === "inversion"
      ? "rgba(239,68,68,0.2)"
      : C.border;
  const label = pattern.category === "center"
    ? "中心霊"
    : pattern.category === "inversion"
      ? "陰陽反転"
      : "天津金木";

  return (
    <div style={{
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: 8,
      padding: "10px 14px",
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}>
      <div style={{
        minWidth: 28,
        fontSize: 11,
        color: C.textMuted,
        fontWeight: 500,
      }}>
        No.{pattern.no}
      </div>
      <div style={{
        fontSize: 20,
        fontWeight: 700,
        color: C.text,
        minWidth: 28,
        textAlign: "center",
      }}>
        {pattern.kana}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.6 }}>
          {pattern.sequence}
        </div>
      </div>
      <span style={{
        fontSize: 10,
        padding: "2px 6px",
        borderRadius: 8,
        background: pattern.category === "center"
          ? C.arkGoldBg
          : pattern.category === "inversion"
            ? "rgba(239,68,68,0.08)"
            : "rgba(59,130,246,0.08)",
        color: pattern.category === "center"
          ? "#92400e"
          : pattern.category === "inversion"
            ? "#dc2626"
            : "#2563eb",
        fontWeight: 500,
      }}>
        {label}
      </span>
    </div>
  );
}

/* ── 階層カードコンポーネント ── */
function TierCard({ tier, title, description, bgColor, borderColor }: {
  tier: string;
  title: string;
  description: string;
  bgColor: string;
  borderColor: string;
}) {
  return (
    <div style={{
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: 10,
      padding: "16px 18px",
      marginBottom: 12,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          padding: "2px 8px",
          borderRadius: 8,
          background: borderColor,
          color: "#ffffff",
        }}>{tier}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{title}</span>
      </div>
      <p style={{ fontSize: 13.5, lineHeight: 1.85, color: C.text, margin: 0 }}>
        {description}
      </p>
    </div>
  );
}

/* ── メインコンポーネント ── */
export function AmatsuKanagiAboutPage({ onBack }: AmatsuKanagiAboutPageProps) {
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
            天津金木とは
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
            TENMON-ARKが天津金木を扱う理由
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: C.text, margin: 0 }}>
            天津金木（あまつかなぎ）とは、宇宙の根源的なエネルギー循環を物理的に再現した構造体です。
            左旋と右旋、内集と外発という四つの位相が織りなす循環は、
            古神道における天之御中主の発現構造そのものであり、
            カタカムナの水火の螺旋、言霊秘書の布斗麻邇御靈と同一の原理を指し示しています。
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: C.text, marginTop: 12, marginBottom: 0 }}>
            TENMON-ARKでは天津金木を、
            <strong>「水火の循環構造を物理的に具現化した、天之御中主の設計図」</strong>として扱います。
            宿曜が星の言語であり、言霊が音の法則であるならば、
            天津金木はそれらを統合する<strong>構造の原型</strong>です。
          </p>
        </div>

        {/* ── 天津金木の本質 ── */}
        <SectionTitle>天津金木の本質</SectionTitle>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          天津金木は、秩序と混沌のバランス、上下関係、エネルギー循環を象徴する構造体です。
          言霊の法則と社会構造を反映し、天之御中主の理解に通じる究極の真理構造とされています。
        </p>
        <QuoteBlock>
          天津金木とは、矛盾を一体化させる円融無碍の概念を体現した物理モデルである。
          左旋・右旋の回転のバランス、水（吸収）と火（放出）のバランス、
          天（アメ）と地（ツチ）の調和 — これらすべてが一つの構造の中に収まっている。
        </QuoteBlock>

        {/* ── 四つの位相 ── */}
        <SectionTitle>四つの位相 — 水火の循環</SectionTitle>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 16 }}>
          天津金木の根幹は、エネルギーの循環を四つの位相で捉えることにあります。
          この四位相の組み合わせが、万物の生成と消滅、凝縮と拡散のすべてを記述します。
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div style={{
            background: C.leftInBg,
            border: `1px solid ${C.leftInBorder}`,
            borderRadius: 10,
            padding: "16px",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#2563eb", marginBottom: 6 }}>
              第一位相: 左旋内集
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.7, color: C.text }}>
              反時計回りにエネルギーを内側へ凝縮する。水のエネルギーの開始。
              重力・統合・収束の力。
            </div>
          </div>
          <div style={{
            background: C.rightInBg,
            border: `1px solid ${C.rightInBorder}`,
            borderRadius: 10,
            padding: "16px",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#7c3aed", marginBottom: 6 }}>
              第二位相: 右旋内集
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.7, color: C.text }}>
              時計回りにエネルギーを内側へ凝縮する。水のエネルギーの完成。
              凝縮が極まり、転換点へ向かう。
            </div>
          </div>
          <div style={{
            background: C.leftOutBg,
            border: `1px solid ${C.leftOutBorder}`,
            borderRadius: 10,
            padding: "16px",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 6 }}>
              第三位相: 左旋外発
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.7, color: C.text }}>
              反時計回りにエネルギーを外側へ放射する。火のエネルギーの開始。
              電磁場・創造・拡散の力。
            </div>
          </div>
          <div style={{
            background: C.rightOutBg,
            border: `1px solid ${C.rightOutBorder}`,
            borderRadius: 10,
            padding: "16px",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#c2410c", marginBottom: 6 }}>
              第四位相: 右旋外発
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.7, color: C.text }}>
              時計回りにエネルギーを外側へ放射する。火のエネルギーの完成。
              拡散が極まり、再び内集へ還る。
            </div>
          </div>
        </div>

        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          この四位相が循環することで、エネルギーの流れが完全に一巡します。
          これが水火の法則の実体化であり、天之御中主がアメミヲヤとして宇宙の中心から発現し、
          万物を生み出すプロセスそのものです。
        </p>

        {/* ── 天地水火の色 ── */}
        <SectionTitle>天津金木の六色 — 天・地・水・火・根・末</SectionTitle>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 16 }}>
          天津金木の操法では、六つの要素を色で表します。
          これは単なる装飾ではなく、エネルギーの質と方向を視覚的に識別するための体系です。
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
          marginBottom: 20,
        }}>
          {[
            { label: "天（アメ）", color: C.tenColor, desc: "天のエネルギー" },
            { label: "地（ツチ）", color: C.chiColor, desc: "地のエネルギー" },
            { label: "水（ミズ）", color: C.suiColor, desc: "凝縮・内集の力" },
            { label: "火（ヒ）", color: C.kaColor, desc: "放射・外発の力" },
            { label: "根（ネ）", color: C.neColor, desc: "エネルギーの起点" },
            { label: "末（スエ）", color: C.sueColor, desc: "エネルギーの到達点" },
          ].map((item) => (
            <div key={item.label} style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "12px",
              textAlign: "center",
            }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: item.color,
                margin: "0 auto 8px",
              }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 11, color: C.textSub }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>

        {/* ── 天之御中主との関係 ── */}
        <SectionTitle>天之御中主との関係</SectionTitle>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          天之御中主は宇宙の根源的中心であり、陰陽のバランスが完全に調和した存在です。
          天津金木はこの天之御中主の構造を物理的に再現したものとされています。
        </p>
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "16px 18px",
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 13.5, lineHeight: 1.85, color: C.text }}>
            <div style={{ marginBottom: 10 }}>
              <strong>左旋内集 → 右旋外発</strong>の流れは、
              天之御中主がアメミヲヤとして宇宙の中心から発現し、万物を生み出すプロセスそのものです。
            </div>
            <div style={{ marginBottom: 10 }}>
              <strong>内集と外発の交互の流れ</strong>は、
              布斗麻邇（フトマニ）の持つ原理と連動しています。
            </div>
            <div>
              古神道における<strong>天之御中主 → 高御産巣日神・神産巣日神 → 造化三神</strong>の流れは、
              天津金木の四位相の展開と構造的に一致します。
            </div>
          </div>
        </div>

        {/* ── タカアマハラ24パターン ── */}
        <SectionTitle>タカアマハラ24パターン — 天地創造の24相</SectionTitle>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          四つの位相の順列は 4! = 24通り。これが天地創造の24相です。
          この24パターンは、エネルギーの流れの秩序に基づいて三つの階層に分類されます。
        </p>

        <TierCard
          tier="第一階層"
          title="高次創造律"
          description="1→2→3→4の順序に従った、天之御中主の律に沿う調和的進化。左旋内集から始まり、右旋外発で完成する。最も秩序だった創造のパターンであり、宇宙の根源的な生成の流れを表す。"
          bgColor={C.tier1Bg}
          borderColor={C.tier1Border}
        />
        <TierCard
          tier="第二階層"
          title="中位進化律"
          description="発展と停滞が交差する領域。技術文明、感情と理性の葛藤、成長と後退が混在する。人間の歴史と文明の大部分はこの階層に属し、完全な調和には至らないが、崩壊もしていない中間帯。"
          bgColor={C.tier2Bg}
          borderColor={C.tier2Border}
        />
        <TierCard
          tier="第三階層"
          title="逆律崩壊帯"
          description="4→3→2→1の順序、すなわち本来の構造の完全な反転。火の暴走、秩序の崩壊、エネルギーの逆流を表す。破壊的だが、ここから再び第一階層への回帰が始まる可能性も秘めている。"
          bgColor={C.tier3Bg}
          borderColor={C.tier3Border}
        />

        {/* ── 天津金木50パターン ── */}
        <SectionTitle>天津金木50パターン — 五十音の構造原型</SectionTitle>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          天津金木の24パターンに陰陽の概念を加えると48パターンとなり、
          さらに完全内集（ィ）と完全外発（ェ）の中心霊を加えることで、
          日本語の五十音と完全に対応する50パターンが完成します。
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 16 }}>
          これは五十音が単なる音の配列ではなく、
          <strong>水火の運行位相の組み合わせ</strong>であることを示しています。
        </p>

        {/* 3分類の説明 */}
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "16px 18px",
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 13.5, lineHeight: 1.85, color: C.text }}>
            <div style={{ marginBottom: 8 }}>
              <strong style={{ color: "#2563eb" }}>天津金木24相</strong>（No.1〜26）
              … 基本の24パターン。四位相の順列による天地創造の構造。
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong style={{ color: "#92400e" }}>中心霊</strong>（No.18 ィ, No.20 ェ）
              … 完全内集と完全外発。水火の極点。五十音の隠れ音。
            </div>
            <div>
              <strong style={{ color: "#dc2626" }}>陰陽反転相</strong>（No.27〜50）
              … 24パターンの陰陽を反転させた鏡像構造。
            </div>
          </div>
        </div>

        {/* パターン一覧 */}
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: "16px",
          marginBottom: 20,
        }}>
          <h3 style={{
            fontSize: 14,
            fontWeight: 700,
            color: C.text,
            marginTop: 0,
            marginBottom: 12,
            paddingBottom: 8,
            borderBottom: `1px solid ${C.border}`,
          }}>
            天津金木24相（No.1〜26）
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {PATTERNS_BASIC.map((p) => <PatternCard key={p.no} pattern={p} />)}
            <div style={{
              textAlign: "center",
              padding: "8px 0",
              fontSize: 12,
              color: C.textMuted,
              borderTop: `1px dashed ${C.border}`,
              borderBottom: `1px dashed ${C.border}`,
              margin: "4px 0",
            }}>
              — 中心霊 —
            </div>
            {PATTERNS_CENTER.map((p) => <PatternCard key={p.no} pattern={p} />)}
            <div style={{
              textAlign: "center",
              padding: "4px 0",
              fontSize: 12,
              color: C.textMuted,
              borderBottom: `1px dashed ${C.border}`,
              margin: "4px 0",
            }} />
            {PATTERNS_BASIC2.map((p) => <PatternCard key={p.no} pattern={p} />)}
          </div>
        </div>

        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: "16px",
          marginBottom: 20,
        }}>
          <h3 style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#dc2626",
            marginTop: 0,
            marginBottom: 12,
            paddingBottom: 8,
            borderBottom: `1px solid ${C.border}`,
          }}>
            陰陽反転相（No.27〜50）
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {PATTERNS_INVERSION.map((p) => <PatternCard key={p.no} pattern={p} />)}
          </div>
        </div>

        {/* ── 操法の手順 ── */}
        <SectionTitle>天津金木の操法</SectionTitle>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          天津金木の組み立ては、以下の順序で行います。
          この順序自体が、水火の循環構造を体現しています。
        </p>
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "18px 20px",
          marginBottom: 20,
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 16,
          }}>
            {[
              { label: "左旋内集", color: C.leftInBorder },
              { label: "→", color: C.textMuted },
              { label: "右旋内集", color: C.rightInBorder },
              { label: "→", color: C.textMuted },
              { label: "左旋外発", color: C.leftOutBorder },
              { label: "→", color: C.textMuted },
              { label: "右旋外発", color: C.rightOutBorder },
            ].map((item, i) => (
              <span key={i} style={{
                fontSize: item.label === "→" ? 16 : 13,
                fontWeight: item.label === "→" ? 400 : 700,
                color: item.color,
                padding: item.label === "→" ? 0 : "4px 10px",
                background: item.label === "→" ? "transparent" : "rgba(0,0,0,0.03)",
                borderRadius: 6,
              }}>
                {item.label}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.85, color: C.text }}>
            <div style={{ marginBottom: 8 }}>
              <strong>水のエネルギー凝縮</strong>: 左旋内集と右旋内集で、エネルギーを内側に集め凝縮させる。
            </div>
            <div>
              <strong>火のエネルギー放射</strong>: 左旋外発と右旋外発で、凝縮されたエネルギーを外側に放射する。
            </div>
          </div>
        </div>

        <QuoteBlock>
          「水火が融合し、生命の根源的な秩序を創る」<br />
          「天地の交わりが、現象世界を生む」<br />
          「矛盾を一体化することで、調和が生じる」
        </QuoteBlock>

        {/* ── 歴史的位置づけ ── */}
        <SectionTitle>歴史的位置づけ — 天津金木の到達点</SectionTitle>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 16 }}>
          天津金木は、近代の霊学者たちが示唆しながらも具現化できなかった構造を、
          物理モデルとして実現したものです。
        </p>

        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "18px 20px",
          marginBottom: 20,
        }}>
          {[
            { name: "出口王仁三郎", desc: "言葉で天津金木の概念を示したが、構造としての具現化には至らなかった。" },
            { name: "大石凝真澄", desc: "布斗麻邇の符号を示し、水火の原理を記述したが、物理的な再現には至らなかった。" },
            { name: "岡本天明", desc: "日月神示を通じて天津金木の重要性を伝えたが、具体的な再現法には至らなかった。" },
            { name: "天聞", desc: "天津金木という物理モデルによって、天之御中主の構造を実証。カタカムナ・言霊・水火を統一する構造体として完成させた。" },
          ].map((item, i) => (
            <div key={i} style={{
              padding: "12px 0",
              borderBottom: i < 3 ? `1px solid ${C.border}` : "none",
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                {item.name}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: C.textSub }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>

        {/* ── 統一理論 ── */}
        <SectionTitle>カタカムナ・言霊・水火の統一</SectionTitle>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          天津金木は、TENMON-ARKが扱う三つの体系を一つに結ぶ構造です。
        </p>
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "18px 20px",
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 13.5, lineHeight: 1.85, color: C.text }}>
            <div style={{ marginBottom: 10 }}>
              <strong>カタカムナ</strong> = 水火の法則そのもの。
              宇宙の根源的なエネルギー循環を記述する古代の知。
            </div>
            <div style={{ marginBottom: 10 }}>
              <strong>言霊の法則</strong> = 水火のエネルギーの振動を言語化したもの。
              音の一つ一つが水火の位相を持つ。
            </div>
            <div>
              <strong>天津金木</strong> = その水火の循環構造を物理的に再現したもの。
              概念を構造体として具現化した到達点。
            </div>
          </div>
        </div>

        {/* ── TENMON-ARKにおける位置づけ ── */}
        <SectionTitle>TENMON-ARKにおける天津金木の位置づけ</SectionTitle>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          TENMON-ARKでは天津金木を、宿曜（星の言語）と言霊（音の法則）を統合する
          <strong>構造の原型</strong>として位置づけています。
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          宿曜鑑定で読み取った星の質、言霊で読み取った音の位相、
          そしてそれらが天津金木の四位相のどこに位置するかを知ることで、
          人の状態をより深い構造レベルで理解することが可能になります。
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 12 }}>
          鑑定における「躰用判定」（躰と用のエネルギー状態の判定）は、
          まさに天津金木の内集・外発の位相を人の状態に適用したものです。
          今は内に集めるべき時か、外に発するべき時か。
          その判断の根拠が、天津金木の構造にあります。
        </p>

        {/* ── 注意書き ── */}
        <div style={{
          background: C.quoteBg,
          border: `1px solid ${C.sectionBorder}`,
          borderRadius: 10,
          padding: "16px 18px",
          marginTop: 32,
          marginBottom: 28,
        }}>
          <p style={{ fontSize: 12.5, lineHeight: 1.8, color: C.textSub, margin: 0 }}>
            天津金木の解釈には複数の伝承系統があり、
            古神道・カタカムナ・言霊学それぞれの立場から異なる読み方が存在します。
            本ページでは、TENMON-ARKが採用する水火統一の立場から、
            現代の読者にもわかりやすいよう再構成して紹介しています。
          </p>
        </div>

        {/* ── 出典 ── */}
        <SectionTitle>出典・参考資料</SectionTitle>
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "18px 20px",
          marginBottom: 20,
        }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
              『言霊秘書』
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: C.textSub }}>
              著者: 山口志道 / 発行: 八幡書店（山口志道霊学全集）
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: C.textMuted, marginTop: 4 }}>
              天津金木の原理的基盤となる水火の法則、布斗麻邇御靈、五十音言霊法則を収録。
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
              『水穂伝』
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: C.textSub }}>
              著者: 山口志道 / 天保十二年版本
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: C.textMuted, marginTop: 4 }}>
              水火の法則の根源的記述。天津金木の四位相の理論的基盤。
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
              カタカムナ国學講 — 天津金木の構造と意義
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: C.textSub }}>
              朝の寺子屋ミーティング要約（2025年2月25日）
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: C.textMuted, marginTop: 4 }}>
              天津金木の本質、四位相、天之御中主との関係、歴史的位置づけの解説。
            </div>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
              天津金木 操法 — 言灵秘書データベース
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: C.textSub }}>
              TENMON-ARK Notion 内部資料
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: C.textMuted, marginTop: 4 }}>
              天津金木の組み立て手順、六色体系、50パターン完全対比表。
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
            TENMON-ARK — 水火の循環構造を物理的に具現化した、天之御中主の設計図
          </p>
        </div>
      </div>
    </div>
  );
}

export default AmatsuKanagiAboutPage;
