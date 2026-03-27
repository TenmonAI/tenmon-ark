/**
 * TENMON_CONVERSATION_OS_7LAYER_ARCHITECTURE_CURSOR_AUTO_V2
 *
 * Contract-only definition:
 * - Registry/schema first
 * - No runtime-wide rewire
 * - LLM is projector/surface helper only
 */

export const TENMON_CONVERSATION_OS_7LAYER_CONTRACT_CARD_V2 =
  "TENMON_CONVERSATION_OS_7LAYER_ARCHITECTURE_CURSOR_AUTO_V2" as const;

export type ConversationOsLayerIdV1 =
  | "canon"
  | "constitution"
  | "lawgraph"
  | "persona_constitution"
  | "routing"
  | "evidence_binder"
  | "surface_projector";

export type ConversationOsInvariantV1 =
  | "llm_projector_only"
  | "canon_before_routing"
  | "constitution_before_routing"
  | "lawgraph_before_routing"
  | "binder_keeps_route_reason"
  | "binder_keeps_source_pack"
  | "binder_keeps_law_trace"
  | "binder_keeps_evidence_refs"
  | "binder_keeps_uncertainty_flags"
  | "projector_style_length_format_only"
  | "runtime_wide_rewire_skipped";

export type ConversationOsLayerContractV1 = {
  layer_id: ConversationOsLayerIdV1;
  purpose: string;
  owned_modules: string[];
  invariants: ConversationOsInvariantV1[];
  inputs: string[];
  outputs: string[];
  upstream_layers: ConversationOsLayerIdV1[];
  downstream_layers: ConversationOsLayerIdV1[];
};

export type ConversationOs7LayerContractV1 = {
  card: typeof TENMON_CONVERSATION_OS_7LAYER_CONTRACT_CARD_V2;
  version: 2;
  llm_projector_only_ready: true;
  runtime_wide_rewire_skipped: true;
  layers: ConversationOsLayerContractV1[];
  nextOnPass: "TENMON_THREAD_CENTER_MEMORY_COMPLETION_CURSOR_AUTO_V2";
  nextOnFail: "TENMON_CONVERSATION_OS_7LAYER_TRACE_CURSOR_AUTO_V1";
};

export function isProjectorLayerV1(layerId: ConversationOsLayerIdV1): boolean {
  return layerId === "surface_projector";
}

