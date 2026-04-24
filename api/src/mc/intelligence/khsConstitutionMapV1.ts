/**
 * CARD-MC-19: KHS / 真理軸まわりの宣言マップ（実装・配線は別途 grep / 発火で補正）。
 */
import fs from "node:fs";
import path from "node:path";
import { CANON_DIR } from "../../core/mc/constants.js";

export type KhsAxisDeclarationV1 = {
  id: string;
  label_ja: string;
  implemented: boolean;
  wired_chat_declared: boolean;
  via: string | null;
  note?: string;
};

/** 宣言（chat.ts の実 grepは deepIntelligenceMapV1 側で上書き可） */
export const KHS_TEN_AXES_DECLARATION_V1: KhsAxisDeclarationV1[] = [
  { id: "cycle", label_ja: "循環", implemented: true, wired_chat_declared: true, via: "truthAxisEngine", note: "truth_axes DB" },
  { id: "polarity", label_ja: "極性", implemented: true, wired_chat_declared: true, via: "truthAxisEngine + waterFireHint", note: "" },
  { id: "center", label_ja: "正中", implemented: true, wired_chat_declared: true, via: "truthAxisEngine", note: "" },
  { id: "breath", label_ja: "呼吸", implemented: true, wired_chat_declared: true, via: "breathEngine", note: "" },
  { id: "carami", label_ja: "絡み", implemented: false, wired_chat_declared: false, via: null, note: "未整備の可能性" },
  { id: "order", label_ja: "秩序", implemented: true, wired_chat_declared: true, via: "truthAxisEngine", note: "" },
  { id: "correspondence", label_ja: "対応", implemented: true, wired_chat_declared: true, via: "五十連・genten", note: "" },
  { id: "manifestation", label_ja: "顕現", implemented: true, wired_chat_declared: true, via: "kotodamaHishoLoader", note: "" },
  { id: "purification", label_ja: "澄濁", implemented: true, wired_chat_declared: false, via: "方向性のみ", note: "GEN 専用節は未配線の可能性" },
  { id: "governance", label_ja: "統治", implemented: true, wired_chat_declared: true, via: "tenmonLawPromotionGateV1", note: "shadow context" },
];

export type KhsSealedDocsProbeV1 = {
  id: string;
  rel_path: string;
  exists: boolean;
};

export function buildKhsConstitutionObservabilityV1(): Record<string, unknown> {
  const sealed: KhsSealedDocsProbeV1[] = [
    { id: "KHS_CORE_CONSTITUTION_v1", rel_path: "khs/KHS_CORE_CONSTITUTION_v1.txt", exists: false },
    { id: "DOMAIN_GUIDE_KOTODAMA_KHS_v1", rel_path: "khs/DOMAIN_GUIDE_KOTODAMA_KHS_v1.txt", exists: false },
    { id: "KHS_SEAL_v1", rel_path: "khs/KHS_SEAL_v1.sha256", exists: false },
  ].map((d) => {
    const abs = path.join(CANON_DIR, d.rel_path);
    let exists = false;
    try {
      exists = fs.existsSync(abs);
    } catch {
      exists = false;
    }
    return { ...d, exists };
  });

  const wired_axes = KHS_TEN_AXES_DECLARATION_V1.filter((a) => a.wired_chat_declared).length;
  const khs_10_axes_wired_ratio = KHS_TEN_AXES_DECLARATION_V1.length
    ? wired_axes / KHS_TEN_AXES_DECLARATION_V1.length
    : 0;

  return {
    khs_10_axes: KHS_TEN_AXES_DECLARATION_V1,
    khs_10_axes_wired_ratio,
    khs_core_sealed_docs: sealed,
    referenced_by_chat_ts: false,
  };
}
