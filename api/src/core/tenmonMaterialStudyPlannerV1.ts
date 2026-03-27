/**
 * 内部資料の study queue 分類（root / mapping / comparative / auxiliary）。
 */

export type StudyMaterialKindV1 =
  | "root_khs"
  | "root_kojiki_generation"
  | "mapping_iroha"
  | "mapping_katakamuna"
  | "mapping_hokekyo"
  | "mapping_kukai"
  | "comparative_sanskrit"
  | "auxiliary_general";

export type StudyPlanItemV1 = {
  materialId: string;
  kind: StudyMaterialKindV1;
  studyPriority: number;
  studyReason: string;
  targetDigestState: "connected" | "digested" | "circulating";
};

const DEFAULT_QUEUE: readonly StudyPlanItemV1[] = [
  {
    materialId: "kotodama_hisho_khs",
    kind: "root_khs",
    studyPriority: 1,
    studyReason: "唯一の root law source",
    targetDigestState: "circulating",
  },
  {
    materialId: "iroha_kotodama_kai",
    kind: "mapping_iroha",
    studyPriority: 2,
    studyReason: "mapping layer: いろは",
    targetDigestState: "digested",
  },
  {
    materialId: "katakamuna_kotodama_kai",
    kind: "mapping_katakamuna",
    studyPriority: 3,
    studyReason: "mapping layer: カタカムナ",
    targetDigestState: "digested",
  },
  {
    materialId: "hokekyo",
    kind: "mapping_hokekyo",
    studyPriority: 4,
    studyReason: "mapping layer: 法華",
    targetDigestState: "digested",
  },
  {
    materialId: "kukai_lineage",
    kind: "mapping_kukai",
    studyPriority: 5,
    studyReason: "mapping layer: 空海",
    targetDigestState: "connected",
  },
  {
    materialId: "siddham_sandoku",
    kind: "comparative_sanskrit",
    studyPriority: 6,
    studyReason: "comparative: 悉曇・梵字",
    targetDigestState: "connected",
  },
];

export function buildDefaultStudyQueueV1(): readonly StudyPlanItemV1[] {
  return DEFAULT_QUEUE;
}
