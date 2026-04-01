export type KotodamaAtomV1 = {
  symbol: string;
  shape_description: string;
  fire_water_axis: "water" | "fire" | "center" | "cycle";
  root_laws: string[];
  corresponding_terms: string[];
  scripture_occurrences: { doc: string; page: number }[];
  modern_projection: string;
  caution_notes: string[];
  lens_khs: string;
  lens_iroha: string;
  lens_katakamuna: string;
  lens_mizuho: string;
};

export type TruthGraphNodeV1 = {
  node_id: string;
  node_type: "sound" | "word" | "law" | "concept" | "scripture" | "worldview";
  label: string;
  family: string;
  confidence: "verified" | "probable" | "inferred";
  source_doc: string;
  source_page?: number;
};

export type TruthGraphEdgeV1 = {
  edge_id: string;
  from_node: string;
  to_node: string;
  relation:
    | "derives_from"
    | "corresponds_to"
    | "contrasts_with"
    | "manifests_as"
    | "prohibited_merge_with"
    | "exemplified_by"
    | "maps_to"
    | "expands";
  confidence: number;
};

export type EpistemicLayerV1 = {
  raw_input: string;
  verified_fact: string[];
  probable_interpretation: string[];
  narrative_claim: string[];
  strategic_implication: string[];
  tenmon_verdict: "harmonizes" | "expands" | "conflicts" | "unresolved";
};

export type PersonaMemoryEntryV1 = {
  memory_id: string;
  memory_type:
    | "identity"
    | "user_call_name"
    | "assistant_call_name"
    | "taboo"
    | "preference"
    | "relationship_tone"
    | "worldview_constraint";
  memory_key: string;
  memory_value: string;
  is_hard_field: boolean;
  confidence: number;
  source: "explicit" | "inferred" | "imported";
  is_pinned: boolean;
};
