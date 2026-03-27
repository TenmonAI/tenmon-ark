/**
 * TENMON_KOJIKI_AND_MAPPING_LAYER_CURSOR_AUTO_V1
 * 古事記 mythogenesis と KHS↔資料 mapping layer を一箇所で束ね、trace 参照を fail-closed に付与する。
 * routeReason は変更しない。
 */

import { projectMythogenesisPhaseV1, type MythogenesisPhaseBundleV1 } from "./tenmonKojikiMythogenesisMapperV1.js";
import { resolveMappingLayerBundleV1, type MappingLayerBundleV1 } from "./tenmonMappingLayerV1.js";

export const TENMON_KOJIKI_AND_MAPPING_LAYER_CARD_V1 = "TENMON_KOJIKI_AND_MAPPING_LAYER_CURSOR_AUTO_V1" as const;

export const TENMON_KOJIKI_AND_MAPPING_LAYER_TRACE_CARD_V1 = "TENMON_KOJIKI_AND_MAPPING_LAYER_TRACE_CURSOR_AUTO_V1" as const;

export type KojikiAndMappingLayerTraceV1 = {
  mythogenesisTraceNeeded: boolean;
  mappingTraceNeeded: boolean;
  nextCardIfFail: string | null;
  kojikiPhaseTraceCard: "TENMON_KOJIKI_PHASE_TRACE_CURSOR_AUTO_V1" | null;
  mappingLayerTraceCard: "TENMON_MAPPING_LAYER_TRACE_CURSOR_AUTO_V1" | null;
};

export type KojikiAndMappingLayerBundleV1 = {
  card: typeof TENMON_KOJIKI_AND_MAPPING_LAYER_CARD_V1;
  version: 1;
  mythogenesisPhase: MythogenesisPhaseBundleV1 | null;
  mappingLayer: MappingLayerBundleV1 | null;
  trace: KojikiAndMappingLayerTraceV1;
};

const KOJIKI_INTENT_RE = /古事記|神代|神話|神産み|神世|国産み|かみうみ|くにうみ|天之御中|伊邪那|淤能|大八島|五十連|呼吸|天地開闢|神世の初め/u;

const MAPPING_INTENT_RE = /カタカムナ|いろは|イロハ|空海|法華|言霊秘書|KHS|違い|比較|接点|水火|法華経/u;

/**
 * mythogenesis + mapping を一度に解決。極短文・意図に対し phase / layer が立たない場合は trace のみ（広域改変なし）。
 */
export function resolveKojikiAndMappingLayerV1(message: string, routeReason?: string): KojikiAndMappingLayerBundleV1 {
  const msg = String(message || "").replace(/\s+/gu, " ").trim();
  const rr = String(routeReason || "").trim();

  const mythogenesisPhase = projectMythogenesisPhaseV1(msg, rr);
  const mappingLayer = resolveMappingLayerBundleV1(msg, rr);

  const short = msg.length < 2;
  const kojikiLooks = KOJIKI_INTENT_RE.test(msg);
  const mappingLooks = MAPPING_INTENT_RE.test(msg);

  const mythogenesisTraceNeeded = short || (kojikiLooks && !mythogenesisPhase);
  const mappingTraceNeeded = short || (mappingLooks && !mappingLayer);

  let nextCardIfFail: string | null = null;
  if (mythogenesisTraceNeeded && mappingTraceNeeded) {
    nextCardIfFail = TENMON_KOJIKI_AND_MAPPING_LAYER_TRACE_CARD_V1;
  } else if (mythogenesisTraceNeeded) {
    nextCardIfFail = "TENMON_KOJIKI_PHASE_TRACE_CURSOR_AUTO_V1";
  } else if (mappingTraceNeeded) {
    nextCardIfFail = "TENMON_MAPPING_LAYER_TRACE_CURSOR_AUTO_V1";
  }

  const trace: KojikiAndMappingLayerTraceV1 = {
    mythogenesisTraceNeeded,
    mappingTraceNeeded,
    nextCardIfFail,
    kojikiPhaseTraceCard: mythogenesisTraceNeeded ? "TENMON_KOJIKI_PHASE_TRACE_CURSOR_AUTO_V1" : null,
    mappingLayerTraceCard: mappingTraceNeeded ? "TENMON_MAPPING_LAYER_TRACE_CURSOR_AUTO_V1" : null,
  };

  return {
    card: TENMON_KOJIKI_AND_MAPPING_LAYER_CARD_V1,
    version: 1,
    mythogenesisPhase,
    mappingLayer,
    trace,
  };
}
