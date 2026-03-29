/**
 * TENMON_KATAKAMUNA_LINEAGE_AND_TRANSFORMATION_ENGINE_CURSOR_AUTO_V1
 * カタカムナの「継承の軸」と「意味変形の軸」を分離して保持する（史実断定はしない）。
 * 宇野多美恵以降の変貌は transformation / 普及系として整理し、本流そのものとして断定しない。
 */

import { KATAKAMUNA_SOURCE_AUDIT_ENTRIES_V1 } from "./katakamunaSourceAuditClassificationV1.js";

export type KatakamunaHistoricalCertaintyLaneV1 = "high" | "medium" | "low" | "placeholder";

/** 系譜エッジ: 誰から誰へ（伝達経路）。教義変形は transformation と混ぜない。 */
export type KatakamunaLineageEdgeV1 = {
  schema: "TENMON_KATAKAMUNA_LINEAGE_EDGE_V1";
  id: string;
  source_person: string | null;
  target_person: string | null;
  medium: string;
  transmission_role: string;
  historical_certainty: KatakamunaHistoricalCertaintyLaneV1;
  audit_ref: string | null;
};

/** 変形層: どこで意味が滑ったか（継承の「事実」断定とは別軸）。 */
export type KatakamunaTransformationLayerV1 = {
  schema: "TENMON_KATAKAMUNA_TRANSFORMATION_LAYER_V1";
  id: string;
  anchor_label: string;
  audit_ref: string | null;
  doctrinal_shift: string;
  interpretation_shift: string;
  life_advice_shift: string;
  healing_shift: string;
  spirituality_shift: string;
  mythic_expansion_shift: string;
  divergence_tags: readonly KatakamunaDivergenceTagV1[];
};

/** 分岐タグ（普及・心理化等を本流と混線させない） */
export type KatakamunaDivergenceTagV1 = "本流" | "普及" | "生活化" | "心理化" | "神秘化" | "再統合";

export type KatakamunaLineageTransformationBundleV1 = {
  schema: "TENMON_KATAKAMUNA_LINEAGE_TRANSFORMATION_BUNDLE_V1";
  card: "TENMON_KATAKAMUNA_LINEAGE_AND_TRANSFORMATION_ENGINE_CURSOR_AUTO_V1";
  version: 1;
  lineage_edges: readonly KatakamunaLineageEdgeV1[];
  transformation_stages: readonly KatakamunaTransformationLayerV1[];
  lineage_summary: string;
  transformation_summary: string;
  divergence_map: Readonly<Record<string, readonly KatakamunaDivergenceTagV1[]>>;
  unresolved_points: readonly string[];
  nextOnPass: string;
  nextOnFail: string;
};

/** 監査エントリ id → 分岐タグ（複数可） */
function divergenceTagsForAuditId(id: string): KatakamunaDivergenceTagV1[] {
  const fixed: Record<string, KatakamunaDivergenceTagV1[]> = {
    primary_manuscript_placeholder: ["本流"],
    narazaki_satsuki_lineage_core: ["本流"],
    soozishou_lineage: ["本流"],
    uno_tamie_popular: ["普及"],
    yoshino_nobuko_popular: ["普及"],
    kawai_ayako_psych: ["普及", "心理化"],
    itagaki_akiko_popular: ["普及"],
    amano_shigemi_commentary: ["本流"],
    tenmon_ark_reintegration_corpus: ["再統合"],
    modern_katakamuna_books_bucket: ["普及", "生活化"],
    katakamuna_mystified_misc: ["神秘化", "普及"],
  };
  return fixed[id] ?? ["普及"];
}

const LINEAGE_EDGES_V1: readonly KatakamunaLineageEdgeV1[] = [
  {
    schema: "TENMON_KATAKAMUNA_LINEAGE_EDGE_V1",
    id: "edge_material_to_narazaki",
    source_person: null,
    target_person: "楢崎皐月",
    medium: "写本・講義・伝承メモ（層は NAS で分離）",
    transmission_role: "口述・整理・体系化の受け皿",
    historical_certainty: "placeholder",
    audit_ref: "primary_manuscript_placeholder",
  },
  {
    schema: "TENMON_KATAKAMUNA_LINEAGE_EDGE_V1",
    id: "edge_narazaki_to_similarity",
    source_person: "楢崎皐月",
    target_person: null,
    medium: "図象・相似象系資料",
    transmission_role: "構造写像の分岐系統",
    historical_certainty: "low",
    audit_ref: "soozishou_lineage",
  },
  {
    schema: "TENMON_KATAKAMUNA_LINEAGE_EDGE_V1",
    id: "edge_narazaki_to_uno",
    source_person: "楢崎皐月",
    target_person: "宇野多美恵",
    medium: "書籍・講義・二次テキスト",
    transmission_role: "普及・再説明（継承の主軸そのものと同一視しない）",
    historical_certainty: "medium",
    audit_ref: "uno_tamie_popular",
  },
  {
    schema: "TENMON_KATAKAMUNA_LINEAGE_EDGE_V1",
    id: "edge_popular_bucket",
    source_person: null,
    target_person: "吉野信子・板垣昭子・他",
    medium: "各種出版物",
    transmission_role: "二次以降の読み取り・再編集",
    historical_certainty: "placeholder",
    audit_ref: "modern_katakamuna_books_bucket",
  },
  {
    schema: "TENMON_KATAKAMUNA_LINEAGE_EDGE_V1",
    id: "edge_tenmon_reintegration",
    source_person: null,
    target_person: "TENMON-ARK",
    medium: "内部正典・写像メモ（parsed）",
    transmission_role: "再統合・境界拘束（出版社本文と分離）",
    historical_certainty: "medium",
    audit_ref: "tenmon_ark_reintegration_corpus",
  },
];

const TRANSFORMATION_STAGES_V1: readonly KatakamunaTransformationLayerV1[] = [
  {
    schema: "TENMON_KATAKAMUNA_TRANSFORMATION_LAYER_V1",
    id: "stage_narazaki_systematization",
    anchor_label: "楢崎系・体系化段",
    audit_ref: "narazaki_satsuki_lineage_core",
    doctrinal_shift: "口述・断片を教学秩序へ再配置した圧力（詳細は資料層ごとに要検証）。",
    interpretation_shift: "用語と段階学習の固定化。",
    life_advice_shift: "実践課題の明示化が増えうる。",
    healing_shift: "主として教学枠。癒し主導へはこの段だけでは断定しない。",
    spirituality_shift: "スピリチュアル市場語への接続は限定的（コーパス依存）。",
    mythic_expansion_shift: "神代語彙の説明的拡張が起きうる。",
    divergence_tags: ["本流"],
  },
  {
    schema: "TENMON_KATAKAMUNA_TRANSFORMATION_LAYER_V1",
    id: "stage_uno_popularization",
    anchor_label: "宇野多美恵以降・普及変形",
    audit_ref: "uno_tamie_popular",
    doctrinal_shift: "本流の全内容を代表する形への圧縮・一般向け再説明（≠ 本流の代替）。",
    interpretation_shift: "読者向けに比喩・要約が増える。",
    life_advice_shift: "日常技法・自己啓発的フレーズが増えうる。",
    healing_shift: "安心・自己肯定の語彙が増えうる（心理化の前段）。",
    spirituality_shift: "スピリチュアル棚とのラベル共有が増えうる。",
    mythic_expansion_shift: "物語化・神秘語の増幅が起きうる（別エントリで監査）。",
    divergence_tags: ["普及"],
  },
  {
    schema: "TENMON_KATAKAMUNA_TRANSFORMATION_LAYER_V1",
    id: "stage_kawai_psychologized",
    anchor_label: "川ヰ亜哉子系・心理化",
    audit_ref: "kawai_ayako_psych",
    doctrinal_shift: "心理療法・自己理解フレームへの寄与（教義の全置換ではない）。",
    interpretation_shift: "内面・感情語彙への寄せ。",
    life_advice_shift: "高い。日課・ワーク形式へ。",
    healing_shift: "高い。ケア・回復語彙が中心になりうる。",
    spirituality_shift: "中〜高。",
    mythic_expansion_shift: "低〜中。",
    divergence_tags: ["普及", "心理化"],
  },
  {
    schema: "TENMON_KATAKAMUNA_TRANSFORMATION_LAYER_V1",
    id: "stage_mystified_market",
    anchor_label: "神秘化・市場拡散",
    audit_ref: "katakamuna_mystified_misc",
    doctrinal_shift: "断定性・特権性の修辞増幅。",
    interpretation_shift: "秘伝・特別感の強調。",
    life_advice_shift: "儀式・特別実践の提示。",
    healing_shift: "奇跡・浄化語彙。",
    spirituality_shift: "高い。",
    mythic_expansion_shift: "高い。",
    divergence_tags: ["神秘化", "普及"],
  },
  {
    schema: "TENMON_KATAKAMUNA_TRANSFORMATION_LAYER_V1",
    id: "stage_tenmon_reintegration",
    anchor_label: "天聞再統合",
    audit_ref: "tenmon_ark_reintegration_corpus",
    doctrinal_shift: "外部コーパスを天聞境界・写像規則へ再束ねる（新教義の捏造ではない）。",
    interpretation_shift: "会話・学習に耐える表層への正規化。",
    life_advice_shift: "会話設計上の一歩への圧縮。",
    healing_shift: "過剰癒し語を抑止する契約と競合しうる。",
    spirituality_shift: "正典・境界の明示。",
    mythic_expansion_shift: "神話語は写像として扱う方針と整合。",
    divergence_tags: ["再統合"],
  },
];

const UNRESOLVED_V1: readonly string[] = [
  "写本層の年代・筆写系譜は NAS 実体と照合して historical_certainty を更新すること。",
  "楢崎系外の口述系統がある場合は lineage_edges にエッジ追加し、transmission_role を分離すること。",
  "宇野以降の各著者ごとに transformation_stages を細分化するかはコーパス取り込み後に判断。",
  "similarity_symbol 系と narazaki 系の時系列は資料確証後に edge を再配線すること。",
];

function buildDivergenceMapV1(): Record<string, readonly KatakamunaDivergenceTagV1[]> {
  const m: Record<string, KatakamunaDivergenceTagV1[]> = {};
  for (const e of KATAKAMUNA_SOURCE_AUDIT_ENTRIES_V1) {
    m[e.id] = divergenceTagsForAuditId(e.id);
  }
  return m;
}

export function buildKatakamunaLineageTransformationBundleV1(): KatakamunaLineageTransformationBundleV1 {
  const lineage_summary =
    "継承は「誰から誰へ」のエッジとして保持する。楢崎皐月を介した分岐（相似象系・宇野系普及）を別エッジで示し、宇野多美恵以降を本流の単線延長として断定しない。";
  const transformation_summary =
    "意味の滑りは transformation_stages で記述する。教義変形・解釈・生活化・癒し・スピリチュアル・神話拡張を分欄に分け、historical certainty とは混ぜない。宇野段は「普及」タグで本流と区別する。";

  return {
    schema: "TENMON_KATAKAMUNA_LINEAGE_TRANSFORMATION_BUNDLE_V1",
    card: "TENMON_KATAKAMUNA_LINEAGE_AND_TRANSFORMATION_ENGINE_CURSOR_AUTO_V1",
    version: 1,
    lineage_edges: LINEAGE_EDGES_V1,
    transformation_stages: TRANSFORMATION_STAGES_V1,
    lineage_summary,
    transformation_summary,
    divergence_map: buildDivergenceMapV1(),
    unresolved_points: UNRESOLVED_V1,
    nextOnPass: "TENMON_KATAKAMUNA_TENMON_REINTEGRATION_AND_BOUNDARY_BIND_CURSOR_AUTO_V1",
    nextOnFail: "TENMON_KATAKAMUNA_LINEAGE_AND_TRANSFORMATION_ENGINE_RETRY_CURSOR_AUTO_V1",
  };
}
