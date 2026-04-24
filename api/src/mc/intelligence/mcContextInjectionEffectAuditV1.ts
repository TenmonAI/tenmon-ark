/**
 * CARD-MC-23-CONTEXT-INJECTION-EFFECT-AUDIT-V2
 * NATURAL_GENERAL の soul-root 節を chat.ts と同じビルダーで組み立て、
 * wire ON/OFF 時のプロンプト差・（任意で）LLM 応答差を実測する。
 */
import { createHash } from "node:crypto";
import {
  CURRENT_FACTS_CLAUSE,
  NATURAL_GEN_SYSTEM_TEMPLATE_V1,
  buildKamiyoSynapseClauseForNatGenV1,
} from "./naturalGenSystemStaticV1.js";
import { loadKotodamaHisho, extractSoundsFromMessage, buildKotodamaHishoContext, buildKotodamaHishoOverview } from "../../core/kotodamaHishoLoader.js";
import { queryIrohaByUserText, buildIrohaInjection } from "../../core/irohaKotodamaLoader.js";
import {
  extractKeyKotodamaFromText,
  buildKotodamaGentenInjection,
} from "../../core/kotodamaGentenLoader.js";
import { selectKanagiPhaseForIntent, buildAmaterasuAxisInjection } from "../../data/amaterasuAxisMap.js";
import { buildUnifiedSoundInjection } from "../../core/unifiedSoundLoader.js";
import { buildKotodamaOneSoundLawSystemClauseV1 } from "../../core/kotodamaOneSoundLawIndex.js";
import { buildKhsRootFractalConstitutionClauseV1 } from "../../core/khsRootFractalConstitutionV1.js";
import { buildTruthLayerArbitrationClauseV1 } from "../../core/truthLayerArbitrationKernel.js";
import { buildKatakamunaSourceAuditClauseV1 } from "../../core/katakamunaSourceAuditClassificationV1.js";
import { buildKatakamunaLineageTransformationClauseV1 } from "../../core/katakamunaLineageTransformationEngine.js";
import { buildKatakamunaMisreadExpansionGuardClauseV1 } from "../../core/katakamunaMisreadExpansionGuard.js";
import {
  detect10TruthAxes,
  buildCaramiGenClauseV1,
  buildPurificationGenClauseV1,
} from "../../core/truthAxisEngine.js";
import { llmChat } from "../../core/llmWrapper.js";
import { buildObservedModuleRowsV1 } from "./deepIntelligenceMapV1.js";
import { isMcDebugInjectionEndpointEnabledV1 } from "../../core/contextInjectionProbe.js";

export const NAT_GEN_SOUL_WIRE_KEYS = [
  "hisho",
  "iroha",
  "genten",
  "amaterasu",
  "unified_sound",
  "one_sound_law",
  "khs_root",
  "truth_layer",
  "katak_audit",
  "katak_lineage",
  "katak_misread",
  "mc22_carami",
  "mc22_purification",
] as const;

export type NatGenSoulWireKeyV1 = (typeof NAT_GEN_SOUL_WIRE_KEYS)[number];

export type NatGenSoulWireMaskV1 = Partial<Record<NatGenSoulWireKeyV1, boolean>>;

const MC21_ROUTE = "NATURAL_GENERAL_LLM_TOP_MC23_AUDIT";

function defaultMaskAllOn(): Record<NatGenSoulWireKeyV1, boolean> {
  const m = {} as Record<NatGenSoulWireKeyV1, boolean>;
  for (const k of NAT_GEN_SOUL_WIRE_KEYS) m[k] = true;
  return m;
}

function mergeMask(partial?: NatGenSoulWireMaskV1 | null): Record<NatGenSoulWireKeyV1, boolean> {
  const base = defaultMaskAllOn();
  if (!partial || typeof partial !== "object") return base;
  for (const k of NAT_GEN_SOUL_WIRE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(partial, k) && typeof partial[k] === "boolean") {
      base[k] = partial[k]!;
    }
  }
  return base;
}

function kotodamaHishoClauseForQuestion(userText: string): string {
  const t = String(userText ?? "").trim();
  if (!t) return "";
  try {
    const sounds = extractSoundsFromMessage(t);
    if (sounds.length > 0) {
      const c = buildKotodamaHishoContext(sounds, 2000);
      if (c) return c;
    }
    try {
      loadKotodamaHisho();
    } catch {
      /* ignore */
    }
    return buildKotodamaHishoOverview() || "";
  } catch {
    return "";
  }
}

/** chat.ts __soulRootClauses と同順・同ビルダーで各節を生成（マスク適用前の素値） */
export function buildNatGenSoulRootPartsV1(userText: string): Record<NatGenSoulWireKeyV1, string> {
  const t = String(userText ?? "").trim();
  const out = {} as Record<NatGenSoulWireKeyV1, string>;
  for (const k of NAT_GEN_SOUL_WIRE_KEYS) out[k] = "";

  out.hisho = kotodamaHishoClauseForQuestion(t);

  let axes: ReturnType<typeof detect10TruthAxes> = [];
  try {
    axes = detect10TruthAxes(t);
  } catch {
    axes = [];
  }
  try {
    out.mc22_carami = buildCaramiGenClauseV1(t, axes, 1200);
  } catch {
    out.mc22_carami = "";
  }
  try {
    out.mc22_purification = buildPurificationGenClauseV1(t, out.hisho, axes, 1600);
  } catch {
    out.mc22_purification = "";
  }

  try {
    const hits = queryIrohaByUserText(t);
    if (hits.length > 0) out.iroha = buildIrohaInjection(hits, 1500);
  } catch {
    out.iroha = "";
  }

  try {
    const keys = extractKeyKotodamaFromText(t);
    if (keys.length > 0) out.genten = buildKotodamaGentenInjection(keys, 1000);
  } catch {
    out.genten = "";
  }

  try {
    const phase = selectKanagiPhaseForIntent(t);
    out.amaterasu = buildAmaterasuAxisInjection(phase);
  } catch {
    out.amaterasu = "";
  }

  try {
    out.unified_sound = buildUnifiedSoundInjection(t, 1200);
  } catch {
    out.unified_sound = "";
  }

  try {
    out.one_sound_law = buildKotodamaOneSoundLawSystemClauseV1(t, { maxChars: 2400, maxSounds: 6 });
  } catch {
    out.one_sound_law = "";
  }

  try {
    out.khs_root = buildKhsRootFractalConstitutionClauseV1(MC21_ROUTE, 720);
  } catch {
    out.khs_root = "";
  }
  try {
    out.truth_layer = buildTruthLayerArbitrationClauseV1(t, MC21_ROUTE, 1100);
  } catch {
    out.truth_layer = "";
  }
  try {
    out.katak_audit = buildKatakamunaSourceAuditClauseV1(t, 1400);
  } catch {
    out.katak_audit = "";
  }
  try {
    out.katak_lineage = buildKatakamunaLineageTransformationClauseV1(t, 1200);
  } catch {
    out.katak_lineage = "";
  }
  try {
    out.katak_misread = buildKatakamunaMisreadExpansionGuardClauseV1(t, 600);
  } catch {
    out.katak_misread = "";
  }

  return out;
}

function applyMask(parts: Record<NatGenSoulWireKeyV1, string>, mask: Record<NatGenSoulWireKeyV1, boolean>): string[] {
  return NAT_GEN_SOUL_WIRE_KEYS.map((k) => (mask[k] ? String(parts[k] || "").trim() : "")).filter(Boolean);
}

function sha256Short(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex").slice(0, 16);
}

function domainKeywordHits(text: string): Record<string, number> {
  const t = String(text || "");
  const patterns: Array<[string, RegExp]> = [
    ["tenmon_ark", /TENMON[- ]?ARK|天聞/giu],
    ["kotodama", /言霊|ことだま|kotodama/giu],
    ["katakamuna", /カタカムナ/gu],
    ["amatsu", /天津金木/gu],
    ["sukuyou", /宿曜|二十七宿/gu],
    ["water_fire", /水火|軽清|重濁/gu],
  ];
  const o: Record<string, number> = {};
  for (const [name, re] of patterns) {
    const m = t.match(re);
    o[name] = m ? m.length : 0;
  }
  return o;
}

function jaccardBigrams(a: string, b: string): number {
  const big = (s: string) => {
    const x = s.replace(/\s+/g, " ").trim();
    const out = new Set<string>();
    for (let i = 0; i < x.length - 1; i++) out.add(x.slice(i, i + 2));
    return out;
  };
  const A = big(a);
  const B = big(b);
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  const union = A.size + B.size - inter;
  return union > 0 ? inter / union : 0;
}

/** soul-root スロット → deepIntelligence `modules[].name`（MC-22 は同一 engine を共有） */
const WIRE_TO_DEEP_MODULE: Record<NatGenSoulWireKeyV1, string> = {
  hisho: "kotodamaHishoLoader",
  iroha: "irohaKotodamaLoader",
  genten: "kotodamaGentenLoader",
  amaterasu: "amaterasuAxisMap",
  unified_sound: "unifiedSoundLoader",
  one_sound_law: "kotodamaOneSoundLawIndex",
  khs_root: "khsRootFractalConstitutionV1",
  truth_layer: "truthLayerArbitrationKernel",
  katak_audit: "katakamunaSourceAuditClassificationV1",
  katak_lineage: "katakamunaLineageTransformationEngine",
  katak_misread: "katakamunaMisreadExpansionGuard",
  mc22_carami: "truthAxisEngine",
  mc22_purification: "truthAxisEngine",
};

export type McContextInjectionEffectAuditInputV1 = {
  question: string;
  wire_mask?: NatGenSoulWireMaskV1 | null;
  /** 宿曜継続・コンテキストは thread 依存のため、監査では任意文字列で上乗せ */
  sukuyou_continuity_clause?: string;
  sukuyou_context_clause?: string;
  /** 既定の短い意図節（chat の __intentClause 近似） */
  intent_clause?: string;
  include_full_prompt?: boolean;
  /** TENMON_MC_EFFECT_AUDIT_LLM=1 のときのみ実行 */
  run_llm_compare?: boolean;
  llm_max_tokens?: number;
};

export function buildContextInjectionEffectAuditV1(input: McContextInjectionEffectAuditInputV1): Record<string, unknown> {
  const question = String(input.question ?? "").trim().slice(0, 4000);
  const mask = mergeMask(input.wire_mask);
  const parts = buildNatGenSoulRootPartsV1(question);
  const clauses = NAT_GEN_SOUL_WIRE_KEYS.map((id) => {
    const raw = String(parts[id] || "");
    return {
      id,
      chars_raw: raw.length,
      chars_active: mask[id] ? raw.length : 0,
      active: Boolean(mask[id] && raw.length > 0),
      preview_head: raw.slice(0, 120),
    };
  });

  const kamiyo = buildKamiyoSynapseClauseForNatGenV1();
  const genBase = NATURAL_GEN_SYSTEM_TEMPLATE_V1 + CURRENT_FACTS_CLAUSE + kamiyo;
  const sukGen = String(input.sukuyou_continuity_clause ?? "").trim();
  const sukCtx = String(input.sukuyou_context_clause ?? "").trim();
  const intent = String(input.intent_clause ?? "").trim() || "\n\n【応答長目標】1500 tokens\n";

  const soulOn = applyMask(parts, mask).join("\n");
  const soulChars = soulOn.length;
  const fullPrompt = genBase + sukGen + sukCtx + (soulOn ? "\n" + soulOn : "") + intent;

  const allOn = defaultMaskAllOn();
  const soulAllOn = applyMask(parts, allOn).join("\n");
  const soulCharsAllOn = soulAllOn.length;

  const per_slot_delta: Array<{ slot: NatGenSoulWireKeyV1; soul_chars_if_disabled: number; char_delta_vs_all_on: number }> = [];
  for (const slot of NAT_GEN_SOUL_WIRE_KEYS) {
    const m = { ...allOn, [slot]: false };
    const soulOffOne = applyMask(parts, m).join("\n");
    const len = soulOffOne.length;
    per_slot_delta.push({
      slot,
      soul_chars_if_disabled: len,
      char_delta_vs_all_on: soulCharsAllOn - len,
    });
  }

  const modules = buildObservedModuleRowsV1();
  const wired_module_effect_map = NAT_GEN_SOUL_WIRE_KEYS.map((slot) => {
    const modName = WIRE_TO_DEEP_MODULE[slot];
    const row = modules.find((r) => String(r.name) === modName);
    const ch = parts[slot].length;
    const pd = per_slot_delta.find((p) => p.slot === slot);
    return {
      audit_wire_key: slot,
      deep_intelligence_module: modName,
      wired_chat: row ? Boolean(row.wired_chat) : null,
      prompt_inject_gen: row ? Boolean(row.prompt_inject_gen) : null,
      clause_chars_for_question: ch,
      char_contribution_if_disabled: pd?.char_delta_vs_all_on ?? null,
    };
  });

  const fullPromptAllowed =
    Boolean(input.include_full_prompt) &&
    (isMcDebugInjectionEndpointEnabledV1() || String(process.env.TENMON_MC_EFFECT_AUDIT_FULL_PROMPT ?? "").trim() === "1");

  return {
    ok: true,
    schema_version: "mc_context_injection_effect_audit_v2",
    generated_at: new Date().toISOString(),
    question,
    wire_mask_resolved: mask,
    prompt: {
      gen_base_chars: genBase.length,
      sukuyou_continuity_chars: sukGen.length,
      sukuyou_context_chars: sukCtx.length,
      soul_clauses_chars: soulChars,
      soul_clauses_chars_all_slots_on: soulCharsAllOn,
      intent_chars: intent.length,
      total_chars: fullPrompt.length,
      sha256_16: sha256Short(fullPrompt),
      full_text: fullPromptAllowed ? fullPrompt : null,
      full_text_omitted_reason: fullPromptAllowed
        ? null
        : "set TENMON_MC_DEBUG_INJECTION_ENDPOINT=1 or TENMON_MC_EFFECT_AUDIT_FULL_PROMPT=1 and include_full_prompt:true",
    },
    clauses,
    per_slot_char_delta: per_slot_delta,
    correlation_stub: {
      note: "各 slot の char_delta_vs_all_on が大きいほど、その配線がプロンプト体積に効いている実測。応答本文との相関は run_llm_compare で domain_keyword_hits / jaccard を参照。",
    },
    wired_module_effect_map,
  };
}

export async function runMc23LlmCompareIfEnabledV1(
  input: McContextInjectionEffectAuditInputV1,
): Promise<Record<string, unknown>> {
  const allow = String(process.env.TENMON_MC_EFFECT_AUDIT_LLM ?? "").trim() === "1" && Boolean(input.run_llm_compare);
  if (!allow) {
    return {
      llm_compare: {
        skipped: true,
        reason: input.run_llm_compare ? "set TENMON_MC_EFFECT_AUDIT_LLM=1" : "run_llm_compare not requested",
      },
    };
  }
  const question = String(input.question ?? "").trim().slice(0, 4000);
  if (question.length < 4) {
    return { llm_compare: { skipped: true, reason: "question_too_short" } };
  }
  const maskOn = mergeMask(null);
  const maskOff = defaultMaskAllOn();
  for (const k of NAT_GEN_SOUL_WIRE_KEYS) maskOff[k] = false;

  const parts = buildNatGenSoulRootPartsV1(question);
  const kamiyo = buildKamiyoSynapseClauseForNatGenV1();
  const genBase = NATURAL_GEN_SYSTEM_TEMPLATE_V1 + CURRENT_FACTS_CLAUSE + kamiyo;
  const sukGen = String(input.sukuyou_continuity_clause ?? "").trim();
  const sukCtx = String(input.sukuyou_context_clause ?? "").trim();
  const intent = String(input.intent_clause ?? "").trim() || "\n\n【応答長目標】1500 tokens\n";
  const maxTok = Math.min(2048, Math.max(256, Number(input.llm_max_tokens) || 900));

  const soulOn = applyMask(parts, maskOn).join("\n");
  const sysOn = genBase + sukGen + sukCtx + (soulOn ? "\n" + soulOn : "") + intent;
  const sysOff = genBase + sukGen + sukCtx + intent;

  try {
    const rOn = await llmChat({ system: sysOn, user: question, history: [], maxTokens: maxTok, timeout: 55000 });
    const rOff = await llmChat({ system: sysOff, user: question, history: [], maxTokens: maxTok, timeout: 55000 });
    const bodyOn = String(rOn?.text || "").trim();
    const bodyOff = String(rOff?.text || "").trim();
    const hitsOn = domainKeywordHits(bodyOn);
    const hitsOff = domainKeywordHits(bodyOff);
    const kwDelta: Record<string, number> = {};
    for (const k of new Set([...Object.keys(hitsOn), ...Object.keys(hitsOff)])) {
      kwDelta[k] = (hitsOn[k] || 0) - (hitsOff[k] || 0);
    }

    return {
      llm_compare: {
        skipped: false,
        max_tokens: maxTok,
        wired_all_on: { ok: rOn?.ok !== false, provider: rOn?.providerUsed || rOn?.provider, chars: bodyOn.length },
        wired_all_off: { ok: rOff?.ok !== false, provider: rOff?.providerUsed || rOff?.provider, chars: bodyOff.length },
        response_quality_stub: {
          jaccard_bigrams: jaccardBigrams(bodyOn, bodyOff),
          domain_keyword_delta_on_minus_off: kwDelta,
        },
        response_preview: {
          wired_all_on_head: bodyOn.slice(0, 360),
          wired_all_off_head: bodyOff.slice(0, 360),
        },
      },
    };
  } catch (e: unknown) {
    return {
      llm_compare: {
        skipped: false,
        error: String((e as { message?: string })?.message || e),
      },
    };
  }
}
