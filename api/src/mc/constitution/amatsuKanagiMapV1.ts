/**
 * CARD-MC-11-AMATSU-KANAGI-CORE-VISUALIZATION-V1
 *
 * 天聞アーク憲法 (TENMON_ARK_COMPLETION_CONSTITUTION_V1) の各条項と
 * 実装ファイルの対応マップ。/mc/ AI-HUB から GPT / Claude / TENMON が
 * 「天津金木コアがどこに実装されているか」「どの層が wired / unwired か」を
 * 直接参照できるようにする。
 *
 * 実装は docs/ark/ 系の既存憲法ドキュメント（SOUL_ROOT_CONSTITUTION_V1 ほか）
 * を論理的に集約したものとして扱う。`source_uri` はディレクトリを指し、
 * 各 impl_files は fs.existsSync で存在確認を行って `exists` フラグに
 * 反映する。宣言と実体が一致しているかは endpoint 側で明示される。
 */
import fs from "node:fs";
import path from "node:path";
import { CANON_DIR, REPO_ROOT } from "../../core/mc/constants.js";

export type AmatsuKanagiStatusV1 =
  | "implemented"
  | "implemented_but_unwired"
  | "partial"
  | "not_implemented";

export type AmatsuKanagiLayerIdV1 =
  | "structure_adjudication"
  | "reference_layer"
  | "conversation_reduction"
  | "kotodama_law"
  | "meaning_arbitration"
  | "law_promotion_gate";

export type AmatsuKanagiLayerSpecV1 = {
  /** 条項 ID（表示用・安定） */
  layer_id: AmatsuKanagiLayerIdV1;
  /** 日本語表示名 */
  layer_label_ja: string;
  /** 憲法条項参照（例: TENMON_ARK_COMPLETION_CONSTITUTION_V1:Ⅰ-1） */
  constitution_ref: string;
  /** 実装を担うべきファイル（repo root からの相対パス or function ref） */
  impl_files: string[];
  /** 宣言的な想定状態 */
  status_declared: AmatsuKanagiStatusV1;
  /** 未配線の場合の概要 */
  gap?: string;
  /** verify 指針 */
  verify_hint?: string;
};

/**
 * 憲法 → 実装の宣言マップ。
 * 文字列に `::symbol` が含まれる場合は「ファイル内の特定 symbol を担う」と
 * いう意味で、存在確認では `::` より前の部分をパスとして扱う。
 */
export const AMATSU_KANAGI_MAP: AmatsuKanagiLayerSpecV1[] = [
  {
    layer_id: "structure_adjudication",
    layer_label_ja: "構造裁定",
    constitution_ref: "TENMON_ARK_COMPLETION_CONSTITUTION_V1:Ⅰ-1",
    impl_files: [
      "api/src/routes/chat.ts::TENMON_CORE_QUESTION_ROUTE_V1",
      "api/src/core/truthAxisEngine.ts",
      "api/src/core/kotodamaKatakamunaAmatsuBridgeV1.ts",
    ],
    status_declared: "implemented",
    verify_hint: "chat.ts の top-level intercept が正常動作していること",
  },
  {
    layer_id: "reference_layer",
    layer_label_ja: "参照層",
    constitution_ref: "TENMON_ARK_COMPLETION_CONSTITUTION_V1:Ⅰ-2",
    impl_files: [
      "api/src/core/sacredCorpusRegistry.ts",
      "api/src/core/scriptureLearningLedger.ts",
      "api/src/mc/sourceRegistry_seed.ts",
    ],
    status_declared: "implemented",
    verify_hint: "sacred_corpus_registry / scripture_learning_ledger が読める",
  },
  {
    layer_id: "conversation_reduction",
    layer_label_ja: "会話還元",
    constitution_ref: "TENMON_ARK_COMPLETION_CONSTITUTION_V1:Ⅰ-3",
    impl_files: [
      "api/src/routes/chat.ts::buildContinuationHistoryV1",
      "api/src/core/tenmonLongformComposerV1.ts",
      "api/src/core/llmWrapper.ts",
    ],
    status_declared: "implemented",
    verify_hint: "continuation_memory_hit_live >= 80% を維持",
  },
  {
    layer_id: "kotodama_law",
    layer_label_ja: "言霊法",
    constitution_ref: "TENMON_ARK_COMPLETION_CONSTITUTION_V1:Ⅱ-1",
    impl_files: [
      "api/src/core/kotodamaOneSoundLawIndex.ts",
      "api/src/core/kotodamaKatakamunaAmatsuBridgeV1.ts",
    ],
    status_declared: "partial",
    gap: "CARD-MC-19: 一音法則索引は GEN_SYSTEM に配線済。katakamuna bridge は stub のまま。",
  },
  {
    layer_id: "meaning_arbitration",
    layer_label_ja: "意味裁定",
    constitution_ref: "TENMON_ARK_COMPLETION_CONSTITUTION_V1:Ⅱ-2",
    impl_files: ["api/src/core/meaningArbitrationKernel.ts"],
    status_declared: "implemented_but_unwired",
    gap: "chat.ts からの呼出が未配線",
  },
  {
    layer_id: "law_promotion_gate",
    layer_label_ja: "法昇格門",
    constitution_ref: "TENMON_ARK_COMPLETION_CONSTITUTION_V1:Ⅱ-3",
    impl_files: ["api/src/core/tenmonLawPromotionGateV1.ts"],
    status_declared: "implemented_but_unwired",
    gap: "chat.ts からの呼出が未配線",
  },
];

export type AmatsuKanagiImplFileProbeV1 = {
  ref: string;
  path: string;
  symbol: string | null;
  exists: boolean;
};

export type AmatsuKanagiLayerProbeV1 = AmatsuKanagiLayerSpecV1 & {
  impl_probes: AmatsuKanagiImplFileProbeV1[];
  impl_exists_count: number;
  impl_total: number;
  status_resolved: AmatsuKanagiStatusV1;
};

export type AmatsuKanagiPayloadV1 = {
  ok: true;
  schema_version: "mc_amatsu_kanagi_v1";
  generated_at: string;
  repo_root: string;
  constitution_doc_candidates: Array<{ path: string; exists: boolean }>;
  layers: AmatsuKanagiLayerProbeV1[];
  summary: {
    total_layers: number;
    implemented_layers: number;
    unwired_layers: number;
    partial_layers: number;
    not_implemented_layers: number;
    implementation_ratio: number;
    wired_ratio: number;
  };
};

function splitSymbolRef(ref: string): { path: string; symbol: string | null } {
  const idx = ref.indexOf("::");
  if (idx < 0) return { path: ref, symbol: null };
  return { path: ref.slice(0, idx), symbol: ref.slice(idx + 2) };
}

function probeImplFile(ref: string): AmatsuKanagiImplFileProbeV1 {
  const { path: rel, symbol } = splitSymbolRef(ref);
  const abs = path.isAbsolute(rel) ? rel : path.join(REPO_ROOT, rel);
  let exists = false;
  try {
    exists = fs.existsSync(abs);
  } catch {
    exists = false;
  }
  return { ref, path: abs, symbol, exists };
}

function resolveStatus(
  declared: AmatsuKanagiStatusV1,
  probes: AmatsuKanagiImplFileProbeV1[],
): AmatsuKanagiStatusV1 {
  const existed = probes.filter((p) => p.exists).length;
  if (probes.length === 0) return "not_implemented";
  if (existed === 0) return "not_implemented";
  if (existed < probes.length) return "partial";
  // 全ファイル存在 → 宣言をそのまま採用（implemented / implemented_but_unwired）
  return declared === "not_implemented" ? "implemented" : declared;
}

export function buildAmatsuKanagiPayloadV1(): AmatsuKanagiPayloadV1 {
  const layers: AmatsuKanagiLayerProbeV1[] = AMATSU_KANAGI_MAP.map((layer) => {
    const probes = layer.impl_files.map(probeImplFile);
    const status_resolved = resolveStatus(layer.status_declared, probes);
    return {
      ...layer,
      impl_probes: probes,
      impl_exists_count: probes.filter((p) => p.exists).length,
      impl_total: probes.length,
      status_resolved,
    };
  });

  const implemented = layers.filter((l) => l.status_resolved === "implemented").length;
  const unwired = layers.filter((l) => l.status_resolved === "implemented_but_unwired").length;
  const partial = layers.filter((l) => l.status_resolved === "partial").length;
  const notImplemented = layers.filter((l) => l.status_resolved === "not_implemented").length;
  const total = layers.length;
  const implementation_ratio =
    total > 0 ? (implemented + unwired + partial) / total : 0;
  const wired_ratio = total > 0 ? implemented / total : 0;

  // 憲法ドキュメントの候補（既存/予定）を同時に露出する。
  const docCandidates = [
    path.join(CANON_DIR, "TENMON_ARK_COMPLETION_CONSTITUTION_V1.md"),
    path.join(CANON_DIR, "TENMON_ARK_SOUL_ROOT_CONSTITUTION_V1.md"),
    path.join(CANON_DIR, "TENMON_ARK_SOUL_ROOT_CONSTITUTION_V1_1_ADDENDUM.md"),
    path.join(CANON_DIR, "TENMON_ARK_SOUL_ROOT_CONSTITUTION_V1_2_ADDENDUM.md"),
  ].map((p) => {
    let exists = false;
    try {
      exists = fs.existsSync(p);
    } catch {
      exists = false;
    }
    return { path: p, exists };
  });

  return {
    ok: true,
    schema_version: "mc_amatsu_kanagi_v1",
    generated_at: new Date().toISOString(),
    repo_root: REPO_ROOT,
    constitution_doc_candidates: docCandidates,
    layers,
    summary: {
      total_layers: total,
      implemented_layers: implemented,
      unwired_layers: unwired,
      partial_layers: partial,
      not_implemented_layers: notImplemented,
      implementation_ratio,
      wired_ratio,
    },
  };
}
