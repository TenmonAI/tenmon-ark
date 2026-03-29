/** TENMON_BUILD_GREEN_RESTORE_AFTER_SHELTER_V1 */
import { applyConfidencePrefixToSurfaceV1, type ConfidenceDisplayV1 } from "./confidenceDisplayLogic.js";

/** TENMON_FOUNDER_UPDATE_MODE_AND_ANSWER_FRAME_CURSOR_AUTO_V1: 新人格ではなく profileFrame のみ。本文は gates_impl.classifyTenmonFounderUpdateFrameTriageV1（受理→現状→更新候補→次確認→承認→確定） */
export const TENMON_FOUNDER_UPDATE_PROFILE_FRAME_V1 = "founder_update_frame_v1";

/** TENMON_UNCERTAINTY_AND_CONFIDENCE_SURFACE_LOGIC: ku.confidenceDisplayV1 + responseComposer が apply。本文後処理での明示付与はこの関数のみ */
export const TENMON_UNCERTAINTY_SURFACE_LOGIC_CARD_V1 =
  "TENMON_UNCERTAINTY_AND_CONFIDENCE_SURFACE_LOGIC_CURSOR_AUTO_V1";

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
