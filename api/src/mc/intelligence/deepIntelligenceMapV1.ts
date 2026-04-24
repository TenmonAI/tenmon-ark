/**
 * CARD-MC-18 + CARD-MC-19: 深層知能マップ（宣言 × chat.ts grep × 五十音 INDEX × 発火 jsonl）。
 */
import fs from "node:fs";
import path from "node:path";
import { dbPrepare } from "../../db/index.js";
import { REPO_ROOT } from "../../core/mc/constants.js";
import {
  summarizeIntelligenceFire24hV1,
  buildIntelligenceFire7dTrendV1,
  type IntelligenceFire24hSummaryV1,
} from "../fire/intelligenceFireTracker.js";
import { auditKotodama50IndexV1, buildKotodama50MapV1 } from "./kotodama50MapV1.js";
import { buildKhsConstitutionObservabilityV1 } from "./khsConstitutionMapV1.js";
import { kotodamaBridgeHealth } from "../../core/kotodamaBridgeRegistry.js";
import { enforceKotodamaConstitutionV1 } from "../../core/kotodamaConstitutionEnforcerV1.js";

const ALLOWED_DB_TABLES = [
  "scripture_learning_ledger",
  "sacred_corpus_registry",
  "sacred_segments",
  "khs_seed_clusters",
  "khs_seeds_det_v1",
  "khs_laws",
  "khs_units",
  "khs_concepts",
  "iroha_units",
  "iroha_khs_alignment",
] as const;

export type DeepIntelligenceWiredV1 = {
  name: string;
  path: string;
  role: string;
  db_source: string | null;
};

export type DeepIntelligenceStubV1 = {
  name: string;
  path: string;
  lines: number;
  status: "stub";
  gap: string;
};

export type DeepIntelligenceUnwiredV1 = {
  name: string;
  path: string;
  lines?: number;
  role: string;
  status: string;
};

export type DeepIntelligencePostJudgementV1 = { name: string; role: string };

export type DeepIntelligenceDbRowV1 = { table: string; rows: number; role: string };

export const DEEP_INTELLIGENCE_MAP = {
  wired_modules: [
    { name: "kotodamaHishoLoader", path: "core/kotodamaHishoLoader.ts", role: "言霊秘書注入", db_source: null },
    { name: "irohaKotodamaLoader", path: "core/irohaKotodamaLoader.ts", role: "いろは言霊解", db_source: "iroha_units" },
    { name: "kotodamaGentenLoader", path: "core/kotodamaGentenLoader.ts", role: "言霊原典", db_source: null },
    { name: "constitutionLoader", path: "core/constitutionLoader.ts", role: "憲法／自己同一 clause", db_source: null },
    { name: "truthAxisEngine", path: "core/truthAxisEngine.ts", role: "10 真理軸検出", db_source: "truth_axes" },
    { name: "meaningArbitrationKernel", path: "core/meaningArbitrationKernel.ts", role: "意味裁定", db_source: null },
    { name: "tenmonLawPromotionGateV1", path: "core/tenmonLawPromotionGateV1.ts", role: "法昇格門", db_source: "khs_laws" },
    { name: "saikihoLawSet", path: "kotodama/saikihoLawSet.ts", role: "サイキホウ法則", db_source: "khs_laws" },
    { name: "fourLayerTags", path: "kotodama/fourLayerTags.ts", role: "四層タグ", db_source: null },
    { name: "kojikiTags", path: "kojiki/kojikiTags.ts", role: "古事記タグ", db_source: null },
    { name: "mythMapEdges", path: "myth/mythMapEdges.ts", role: "神話マップ", db_source: null },
    { name: "kanaPhysicsMap", path: "koshiki/kanaPhysicsMap.ts", role: "カナ物理マップ", db_source: null },
    { name: "breathEngine", path: "koshiki/breathEngine.ts", role: "呼吸律", db_source: null },
    { name: "teniwoha", path: "koshiki/teniwoha.ts", role: "てにをは判定", db_source: null },
    { name: "itsura", path: "koshiki/itsura.ts", role: "いつら", db_source: null },
    { name: "amaterasuAxisMap", path: "data/amaterasuAxisMap.ts", role: "アマテラス軸", db_source: null },
    { name: "unifiedSoundLoader", path: "core/unifiedSoundLoader.ts", role: "統合音注入", db_source: null },
    { name: "kotodamaConnector", path: "kotodama/kotodamaConnector.ts", role: "言霊連結", db_source: null },
    {
      name: "kotodamaOneSoundLawIndex",
      path: "core/kotodamaOneSoundLawIndex.ts",
      role: "一音法則索引→GEN_SYSTEM（buildKotodamaOneSoundLawSystemClauseV1 · chat.ts 本線）",
      db_source: null,
    },
    {
      name: "katakamunaSourceAuditClassificationV1",
      path: "core/katakamunaSourceAuditClassificationV1.ts",
      role: "CARD-MC-21: カタカムナ出典監査（GEN soul-root）",
      db_source: null,
    },
    {
      name: "katakamunaLineageTransformationEngine",
      path: "core/katakamunaLineageTransformationEngine.ts",
      role: "CARD-MC-21: 系譜・変形 engine（GEN soul-root）",
      db_source: null,
    },
    {
      name: "truthLayerArbitrationKernel",
      path: "core/truthLayerArbitrationKernel.ts",
      role: "CARD-MC-21: 真理層 root kernel（GEN soul-root）",
      db_source: null,
    },
    {
      name: "khsRootFractalConstitutionV1",
      path: "core/khsRootFractalConstitutionV1.ts",
      role: "CARD-MC-21: KHS ルートフラクタル憲法（GEN soul-root）",
      db_source: null,
    },
    {
      name: "katakamunaMisreadExpansionGuard",
      path: "core/katakamunaMisreadExpansionGuard.ts",
      role: "CARD-MC-21: 誤読拡張ガード（GEN soul-root）",
      db_source: null,
    },
  ] as DeepIntelligenceWiredV1[],

  stub_modules: [
    {
      name: "kotodamaKatakamunaAmatsuBridgeV1",
      path: "core/kotodamaKatakamunaAmatsuBridgeV1.ts",
      lines: 19,
      status: "stub" as const,
      gap: "sounds=[], phase=neutral で固定、言霊解析ロジック未実装",
    },
  ] as DeepIntelligenceStubV1[],

  unwired_candidates: [] as DeepIntelligenceUnwiredV1[],

  post_generation_judgement: [
    { name: "verdictEngineV1", role: "伝統×天聞マッピング" },
    { name: "satoriVerdict", role: "悟り判定" },
    { name: "irohaGrounding", role: "いろは根拠化" },
  ] as DeepIntelligencePostJudgementV1[],

  db_intelligence: [
    { table: "scripture_learning_ledger", rows: 5392, role: "聖典学習履歴" },
    { table: "sacred_corpus_registry", rows: 1014, role: "14+ 伝統の聖典" },
    { table: "sacred_segments", rows: 2211, role: "セグメント化聖典" },
    { table: "khs_seed_clusters", rows: 5153, role: "言霊秘書シード" },
    { table: "khs_seeds_det_v1", rows: 1408, role: "言霊秘書シード決定" },
    { table: "khs_laws", rows: 371, role: "言霊秘書法則" },
    { table: "khs_units", rows: 360, role: "言霊秘書ユニット" },
    { table: "khs_concepts", rows: 137, role: "言霊秘書概念" },
    { table: "iroha_units", rows: 21, role: "いろは言霊解" },
    { table: "iroha_khs_alignment", rows: 10, role: "いろは×言霊秘書アライメント" },
  ] as DeepIntelligenceDbRowV1[],
};

let chatTsCache: { mtime: number; src: string } | null = null;

function readChatTsSourceV1(): string {
  const p = path.join(REPO_ROOT, "api/src/routes/chat.ts");
  try {
    const st = fs.statSync(p);
    if (chatTsCache && chatTsCache.mtime === st.mtimeMs) return chatTsCache.src;
    const src = fs.readFileSync(p, "utf8");
    chatTsCache = { mtime: st.mtimeMs, src };
    return src;
  } catch {
    return "";
  }
}

/** `core/foo.ts` または `data/foo.ts`（api/src からの相対）が chat.ts の import に現れるか。 */
export function isModulePathReferencedInChatTsV1(relFromApiSrc: string): boolean {
  const src = readChatTsSourceV1();
  if (!src) return false;
  const norm = relFromApiSrc
    .replace(/\\/g, "/")
    .replace(/^api\/src\//, "")
    .replace(/\.ts$/i, "");
  const base = path.basename(norm);
  return src.includes(norm) || src.includes(`${norm}.js`) || src.includes(`/${base}.js`);
}

function fileHeadHasDeadMarkerV1(relPath: string): boolean {
  const abs = path.join(REPO_ROOT, "api/src", relPath.replace(/^api\/src\//, ""));
  try {
    const head = fs.readFileSync(abs, "utf8").split("\n").slice(0, 14).join("\n");
    // CARD-MC-20: 「DEAD_FILE ではない」等の否定説明を dead 扱いしない（kotodamaOneSoundLawIndex 等）
    if (/DEAD_FILE\s*では\s*な/u.test(head)) return false;
    return /DEAD_FILE\s*[:\[=]|@deprecated.*孤立/u.test(head);
  } catch {
    return false;
  }
}

function safeCount(table: string, fallback: number): number {
  if (!ALLOWED_DB_TABLES.includes(table as (typeof ALLOWED_DB_TABLES)[number])) return fallback;
  if (!/^[a-z0-9_]+$/i.test(table)) return fallback;
  try {
    const row = dbPrepare("kokuzo", `SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number };
    const n = Number(row?.c);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

export function readChatTsImportLineCountV1(): number {
  const src = readChatTsSourceV1();
  if (!src) return 0;
  let n = 0;
  for (const line of src.split("\n")) {
    if (/^\s*import\s+/.test(line)) n += 1;
  }
  return n;
}

/** GEN_SYSTEM soul-root に clause として載る想定（truth は probe のみ → false） */
function promptInjectDeclared(name: string): boolean {
  const inject = new Set([
    "kotodamaHishoLoader",
    "irohaKotodamaLoader",
    "kotodamaGentenLoader",
    "unifiedSoundLoader",
    "amaterasuAxisMap",
    "kotodamaOneSoundLawIndex",
    "constitutionLoader",
    "katakamunaSourceAuditClassificationV1",
    "katakamunaLineageTransformationEngine",
    "truthLayerArbitrationKernel",
    "khsRootFractalConstitutionV1",
    "katakamunaMisreadExpansionGuard",
  ]);
  return inject.has(name);
}

function shadowOnly(name: string): boolean {
  return (
    name === "kotodamaKatakamunaAmatsuBridgeV1" ||
    name === "meaningArbitrationKernel" ||
    name === "tenmonLawPromotionGateV1"
  );
}

function postJudgementWiredInChatV1(src: string, name: string): boolean {
  if (name === "verdictEngineV1") return /buildTenmonVerdictEngineV1|verdictEngineV1/.test(src);
  if (name === "satoriVerdict") return /attachSatoriVerdict/.test(src);
  if (name === "irohaGrounding") return /checkIrohaGrounding|irohaGrounding/.test(src);
  return false;
}

export function buildObservedModuleRowsV1(): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const srcAll = readChatTsSourceV1();
  for (const m of DEEP_INTELLIGENCE_MAP.wired_modules) {
    const wired = isModulePathReferencedInChatTsV1(m.path);
    const dead = fileHeadHasDeadMarkerV1(m.path);
    const shadow = shadowOnly(m.name);
    rows.push({
      name: m.name,
      path: `api/src/${m.path}`,
      role: m.role,
      wired_chat: wired,
      prompt_inject_gen: Boolean(promptInjectDeclared(m.name) && wired && !shadow),
      dead_file_marker: dead,
      shadow_only: shadow,
    });
  }
  for (const s of DEEP_INTELLIGENCE_MAP.stub_modules) {
    rows.push({
      name: s.name,
      path: `api/src/${s.path}`,
      role: "stub",
      wired_chat: isModulePathReferencedInChatTsV1(s.path),
      prompt_inject_gen: false,
      dead_file_marker: fileHeadHasDeadMarkerV1(s.path),
      shadow_only: true,
      gap: s.gap,
    });
  }
  for (const u of DEEP_INTELLIGENCE_MAP.unwired_candidates) {
    rows.push({
      name: u.name,
      path: `api/src/${u.path}`,
      role: u.role,
      wired_chat: isModulePathReferencedInChatTsV1(u.path),
      prompt_inject_gen: false,
      dead_file_marker: fileHeadHasDeadMarkerV1(u.path),
      shadow_only: false,
      status: u.status,
    });
  }
  for (const p of DEEP_INTELLIGENCE_MAP.post_generation_judgement) {
    rows.push({
      name: p.name,
      path: "(post_generation)",
      role: p.role,
      wired_chat: postJudgementWiredInChatV1(srcAll, p.name),
      prompt_inject_gen: false,
      dead_file_marker: false,
      shadow_only: false,
      post_generation: true,
    });
  }
  return rows;
}

/** CARD-MC-20: `one_sound` スロットと modules 行の真偽整合（DEAD_FILE 誤認の否定材料）。 */
function enrichModulesMc20TruthV1(
  modules: Record<string, unknown>[],
  fire: IntelligenceFire24hSummaryV1,
): Record<string, unknown>[] {
  const oneInSlots = fire.slot_names_fired.includes("one_sound");
  return modules.map((m) => {
    if (String(m.name) !== "kotodamaOneSoundLawIndex") return m;
    const wired = Boolean(m.wired_chat);
    const pinj = Boolean(m.prompt_inject_gen);
    const dead = Boolean(m.dead_file_marker);
    return {
      ...m,
      status_mc20: dead ? "dead_file_head_marker" : wired && pinj ? "wired_active" : wired ? "wired_partial" : "unwired_observed",
      mc20_fire_tracker_alignment: {
        fire_slot: "one_sound",
        slot_seen_in_24h: oneInSlots,
        /** jsonl の one_sound は __kotodamaOneSoundLawClause（buildKotodamaOneSoundLawSystemClauseV1）由来で、秘書ローダーとは独立 */
        same_module_as_slot_binding: true,
        contradiction: Boolean(dead && oneInSlots) || Boolean(!wired && oneInSlots),
        note:
          dead && oneInSlots
            ? "要調査: 先頭に DEAD マーカーがあるのに 24h で one_sound が記録（古い jsonl の可能性）"
            : !wired && oneInSlots
              ? "要調査: chat 未 grep 配線なのに one_sound が記録（デプロイ不一致の可能性）"
              : "chat import + buildKotodamaOneSoundLawSystemClauseV1 + fire one_sound は同一経路（MC-20）",
      },
    };
  });
}

function buildMc20FireTruthAuditV1(
  fire: IntelligenceFire24hSummaryV1,
  modules: Record<string, unknown>[],
): Record<string, unknown> {
  const row = modules.find((x) => String(x.name) === "kotodamaOneSoundLawIndex");
  const wired = Boolean(row?.wired_chat);
  const pinj = Boolean(row?.prompt_inject_gen);
  const dead = Boolean(row?.dead_file_marker);
  const oneInSlots = fire.slot_names_fired.includes("one_sound");
  return {
    schema: "mc20_fire_truth_audit_v1",
    one_sound_jsonl_semantics:
      "appendIntelligenceFireEventV1({ … one_sound: Boolean(__kotodamaOneSoundLawClause) }) — clause は chat.ts 内で buildKotodamaOneSoundLawSystemClauseV1（kotodamaOneSoundLawIndex.ts）が生成",
    kotodamaOneSoundLawIndex_head_scan_dead: dead,
    kotodamaOneSoundLawIndex_wired_chat: wired,
    kotodamaOneSoundLawIndex_prompt_inject_gen: pinj,
    slot_names_fired_24h: fire.slot_names_fired,
    one_sound_seen_in_window: oneInSlots,
    /** DEAD_FILE 宣言と「発火している」外観の矛盾は、head に DEAD が無い・かつ wired のとき否定 */
    dead_file_vs_fire_contradiction: Boolean(dead && oneInSlots),
    /** wired かつ prompt なのに一度も one_sound が立っていない＝トラフィック不足の可能性（非矛盾） */
    wired_but_one_sound_never_logged: Boolean(wired && pinj && !dead && fire.events_in_window >= 3 && !oneInSlots),
  };
}

function buildGapsV1(rows: Record<string, unknown>[], fifty: Record<string, unknown>): Array<Record<string, unknown>> {
  const gaps: Array<Record<string, unknown>> = [];
  const khs = rows.find((r) => String(r.name) === "khsRootFractalConstitutionV1");
  if (khs && !khs.wired_chat) {
    gaps.push({
      id: "khs_root_fractal",
      severity: "MED",
      action: "khsRootFractalConstitutionV1 を chat から参照するか、意図的除外をドキュメント化",
    });
  }
  if (Number(fifty.coverage_ratio) < 1) {
    gaps.push({
      id: "kotodama50_coverage",
      severity: "LOW",
      action: "五十音 INDEX に欠番あり",
    });
  }
  return gaps;
}

export function buildIntelligenceFireOnlyPayloadV1(): Record<string, unknown> {
  return {
    ok: true,
    schema_version: "mc_intelligence_fire_v1",
    generated_at: new Date().toISOString(),
    fire_24h: summarizeIntelligenceFire24hV1(),
  };
}

export function buildDeepIntelligencePayloadV1(): Record<string, unknown> {
  const chat_ts_imports = readChatTsImportLineCountV1();
  const dbRows: DeepIntelligenceDbRowV1[] = DEEP_INTELLIGENCE_MAP.db_intelligence.map((d) => ({
    ...d,
    rows: safeCount(d.table, d.rows),
  }));
  const db_total_rows = dbRows.reduce((s, r) => s + r.rows, 0);
  const audit50 = auditKotodama50IndexV1() as Record<string, unknown>;
  const fifty: Record<string, unknown> = {
    ...audit50,
    wired_to_chat: isModulePathReferencedInChatTsV1("core/kotodamaOneSoundLawIndex.ts"),
  };
  let kotodama_50_coverage_payload: Record<string, unknown>;
  try {
    const m = buildKotodama50MapV1();
    fifty.coverage_ratio = m.coverage_ratio_entry;
    kotodama_50_coverage_payload = {
      total: m.total_canonical,
      with_entry: m.with_entry,
      with_water_fire: m.with_water_fire,
      with_textual_grounding: m.with_textual_grounding,
      with_source_page: m.with_source_page,
      with_shape_position: m.with_shape_position,
      with_modern_alias: m.with_modern_alias,
      coverage_ratio: m.coverage_ratio_entry,
      coverage_ratio_grounding: m.coverage_ratio_grounding,
      sounds: m.sounds,
      constitution_ref: m.constitution_ref,
      notes: m.notes,
    };
  } catch (err) {
    kotodama_50_coverage_payload = { total: 50, error: String(err) };
  }
  const khsObs = buildKhsConstitutionObservabilityV1() as Record<string, unknown>;
  const fire = summarizeIntelligenceFire24hV1();
  const modulesRaw = buildObservedModuleRowsV1();
  const modules = enrichModulesMc20TruthV1(modulesRaw, fire);
  const mc20 = buildMc20FireTruthAuditV1(fire, modules);
  const src = readChatTsSourceV1();
  const khsSealed = (khsObs.khs_core_sealed_docs ?? []) as { exists?: boolean }[];
  const khs_docs_any = khsSealed.some((d) => d.exists);
  const khsReferencedInChat = /KHS_CORE|DOMAIN_GUIDE_KOTODAMA_KHS/i.test(src);
  (khsObs as Record<string, unknown>).referenced_by_chat_ts = khsReferencedInChat;

  const wired_prompt = modules.filter(
    (m) => m.prompt_inject_gen === true && m.shadow_only !== true && m.post_generation !== true,
  );
  const shadow_m = modules.filter((m) => m.shadow_only === true);
  const dead_or_weak = modules.filter(
    (m) =>
      m.dead_file_marker === true ||
      (m.wired_chat === false &&
        m.post_generation !== true &&
        (String(m.path).includes("/core/") || String(m.path).includes("/kotodama/") || String(m.path).includes("/data/"))),
  );

  const fire_ratio_24h = fire.avg_fire_ratio;
  const fire7 = buildIntelligenceFire7dTrendV1(7);
  const fire_ratio_7d = fire7.avg_fire_ratio_window;
  const kotodama_50_coverage_summary = Number(fifty.coverage_ratio) || 0;
  const khs_10_axes_wired_ratio = Number(khsObs.khs_10_axes_wired_ratio) || 0;

  const summary = {
    total_wired: wired_prompt.length,
    total_shadow: shadow_m.length,
    total_dead_or_unwired: dead_or_weak.length,
    prompt_inject_chars_avg: null as number | null,
    fire_ratio_24h,
    fire_ratio_7d,
    kotodama_50_coverage: kotodama_50_coverage_summary,
    khs_10_axes_wired_ratio,
    db_total_rows,
    chat_ts_imports,
    fire_events_24h: fire.events_in_window,
    fire_events_7d: fire7.events_total,
    khs_sealed_docs_present: khs_docs_any,
  };

  const gaps = buildGapsV1(modules, fifty);

  const kotodama_bridges = (() => {
    try {
      const h = kotodamaBridgeHealth();
      return {
        total: h.total,
        has_primary_bridge: h.hasPrimaryBridge,
        has_separation_policy: h.hasSeparationPolicy,
        entries: h.entries,
        constitution_ref: "KOTODAMA_CONSTITUTION_V1",
        status:
          h.hasPrimaryBridge && h.hasSeparationPolicy ? "registered_not_synced" : "incomplete",
        notes:
          "橋渡しページは静的レジストリとして登録。Notion MCP 実取得は別カード。",
      };
    } catch (err) {
      return { total: 0, error: String(err) };
    }
  })();

  const kotodama_constitution_enforcer = (() => {
    try {
      const r = enforceKotodamaConstitutionV1();
      return {
        verdict: r.verdict,
        total_checks: r.total_checks,
        violation_count_error: r.violation_count_error,
        violation_count_warn: r.violation_count_warn,
        violations: r.violations.map((v) => ({
          article: v.article,
          severity: v.severity,
          title: v.title,
          observed: v.observed,
          expected: v.expected,
        })),
        constitution_ref: r.constitution_ref,
        timestamp: r.timestamp,
      };
    } catch (err) {
      return { verdict: "unknown" as const, error: String(err) };
    }
  })();

  const detail = {
    wired_modules: DEEP_INTELLIGENCE_MAP.wired_modules,
    stub_modules: DEEP_INTELLIGENCE_MAP.stub_modules,
    unwired_candidates: DEEP_INTELLIGENCE_MAP.unwired_candidates,
    post_generation_judgement: DEEP_INTELLIGENCE_MAP.post_generation_judgement,
    db_intelligence: dbRows,
  };

  return {
    ok: true,
    schema_version: "mc_deep_intelligence_obs_v1",
    generated_at: new Date().toISOString(),
    summary,
    modules,
    kotodama_50_coverage: kotodama_50_coverage_payload,
    fifty_sounds: fifty,
    khs_10_axes: khsObs,
    fire_24h: fire,
    fire_7d_trend: fire7,
    mc20_fire_truth_audit: mc20,
    gaps,
    kotodama_bridges,
    kotodama_constitution_enforcer,
    wired_count: DEEP_INTELLIGENCE_MAP.wired_modules.length,
    stub_count: DEEP_INTELLIGENCE_MAP.stub_modules.length,
    unwired_candidate_count: DEEP_INTELLIGENCE_MAP.unwired_candidates.length,
    post_generation_count: DEEP_INTELLIGENCE_MAP.post_generation_judgement.length,
    db_tables: dbRows.length,
    chat_ts_imports,
    db_total_rows,
    detail,
  };
}

export function buildDeepIntelligenceSummaryForClaudeV1(): Record<string, unknown> {
  const full = buildDeepIntelligencePayloadV1();
  const s = (full.summary ?? {}) as Record<string, unknown>;
  const fire = full.fire_24h as Record<string, unknown>;
  return {
    wired_count: full.wired_count,
    stub_count: full.stub_count,
    unwired_candidate_count: full.unwired_candidate_count,
    post_generation_count: full.post_generation_count,
    db_total_rows: full.db_total_rows,
    db_tables: full.db_tables,
    chat_ts_imports: full.chat_ts_imports,
    fire_ratio_24h: s.fire_ratio_24h ?? fire?.avg_fire_ratio,
    fire_ratio_7d: s.fire_ratio_7d ?? (full as { fire_7d_trend?: { avg_fire_ratio_window?: number } }).fire_7d_trend?.avg_fire_ratio_window,
    fire_events_24h: s.fire_events_24h ?? fire?.events_in_window,
    fire_events_7d: s.fire_events_7d ?? (full as { fire_7d_trend?: { events_total?: number } }).fire_7d_trend?.events_total,
    kotodama_50_coverage: s.kotodama_50_coverage,
    khs_10_axes_wired_ratio: s.khs_10_axes_wired_ratio,
    endpoint: "/api/mc/vnext/intelligence",
    fire_endpoint: "/api/mc/vnext/intelligence/fire",
    effect_endpoint: "/api/mc/vnext/intelligence/effect",
    wired_names: DEEP_INTELLIGENCE_MAP.wired_modules.map((m) => m.name),
    stub_names: DEEP_INTELLIGENCE_MAP.stub_modules.map((m) => m.name),
    unwired_names: DEEP_INTELLIGENCE_MAP.unwired_candidates.map((m) => m.name),
    post_judgement_names: DEEP_INTELLIGENCE_MAP.post_generation_judgement.map((m) => m.name),
    db_table_rows: ((full.detail as { db_intelligence: DeepIntelligenceDbRowV1[] })?.db_intelligence || []).map(
      (r) => ({ table: r.table, rows: r.rows }),
    ),
  };
}
