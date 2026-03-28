/**
 * 内部資料の study queue 分類（root / mapping / comparative / auxiliary）。
 * TENMON_MATERIAL_STUDY_PLANNER_NAS_SOURCE_BIND: NAS locator を queue に同梱（本文は取り込まない）。
 */

import { MATERIAL_DIGEST_LEDGER_CATALOG_V1 } from "./tenmonMaterialDigestLedgerV1.js";
import { buildTenmonNasLocatorManifestV1 } from "./tenmonNasArchiveBridgeV1.js";

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
  /** NAS archive 上の相対パス（論理） */
  nasRelativePath?: string | null;
  nasLocatorRef?: string | null;
};

const DEFAULT_QUEUE_RAW: readonly StudyPlanItemV1[] = [
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

function bindNasLocatorsToStudyQueueV1(items: readonly StudyPlanItemV1[]): StudyPlanItemV1[] {
  const man = buildTenmonNasLocatorManifestV1(
    MATERIAL_DIGEST_LEDGER_CATALOG_V1.map((e) => ({ id: e.id, category: e.category })),
  );
  const byId = new Map(man.entries.map((e) => [e.materialId, e]));
  return items.map((it) => {
    const row = byId.get(it.materialId);
    return {
      ...it,
      nasRelativePath: row?.nas_relative_path ?? null,
      nasLocatorRef: row?.locator_ref ?? null,
    };
  });
}

export function buildDefaultStudyQueueV1(): readonly StudyPlanItemV1[] {
  return bindNasLocatorsToStudyQueueV1(DEFAULT_QUEUE_RAW);
}
