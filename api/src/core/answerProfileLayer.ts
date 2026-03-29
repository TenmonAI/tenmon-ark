/** TENMON_BUILD_GREEN_RESTORE_AFTER_SHELTER_V1 */
import {
  applyConfidencePrefixToSurfaceV1,
  type ConfidenceDisplayV1,
  type UncertaintyConfidenceSurfaceLevelV1,
} from "./confidenceDisplayLogic.js";

export type { UncertaintyConfidenceSurfaceLevelV1 };
export { surfacePrefixForUncertaintyLevelV6 } from "./confidenceDisplayLogic.js";

/** TENMON_FOUNDER_UPDATE_MODE_AND_ANSWER_FRAME_CURSOR_AUTO_V1: 新人格ではなく profileFrame のみ。本文は gates_impl.classifyTenmonFounderUpdateFrameTriageV1（受理→現状→更新候補→次確認→承認→確定） */
export const TENMON_FOUNDER_UPDATE_PROFILE_FRAME_V1 = "founder_update_frame_v1";

/** TENMON_UNCERTAINTY_CONFIDENCE_SURFACE_MASTER_V6: ku.confidenceDisplayV1.surfacePrefix（gates_impl polish 後・冪等1回） */
export const TENMON_UNCERTAINTY_SURFACE_LOGIC_CARD_V1 =
  "TENMON_UNCERTAINTY_CONFIDENCE_SURFACE_MASTER_CURSOR_AUTO_V6";

/** 表層のみ。high は surfacePrefix 空で compose 側はスキップ */
export function applyUncertaintySurfacePrefixIfAnyV1(text: string, cd: ConfidenceDisplayV1 | null | undefined): string {
  if (!cd?.surfacePrefix) return String(text ?? "");
  return applyConfidencePrefixToSurfaceV1(String(text ?? ""), cd);
}

export type AnswerProfileLayerV1 = {
  profileFrame?: string | null;
  [k: string]: unknown;
};

export function applyAnswerProfilePostComposeV1(text: string, profileFrame: string | null): string {
  let t = String(text ?? "").replace(/\r/g, "").trim();
  if (!t) return t;
  if (profileFrame === TENMON_FOUNDER_UPDATE_PROFILE_FRAME_V1) {
    if (!t.startsWith("【天聞の所見】")) t = "【天聞の所見】" + t;
    return t
      .replace(/【天聞の所見】\s*【天聞の所見】/g, "【天聞の所見】")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();
  }
  return t;
}
