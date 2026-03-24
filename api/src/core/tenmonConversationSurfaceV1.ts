/**
 * TENMON_AI_CONVERSATION_RECONSTRUCTION_AUTOPILOT_V1
 * TENMON_OUTPUT_PROJECTION_V1 / TENMON_ASK_CONTROL_V1 / TENMON_LONGFORM_STRUCTURE_V1（表面層）
 * - LLM・一般系の下書きから内部説明・重複段落を剥がし、最終表面を天聞会話に寄せる
 */
import {
  clampQuestionMarksInProseV1,
  clampQuestionMarksKeepLastNV1,
  parseExplicitCharTargetFromUserMessageV1,
  suppressInterrogativeTemplateSpamV1,
} from "../planning/responsePlanCore.js";

/** 投影を掛ける routeReason（新規ルート追加ではなく final projection で後退を補う） */
const ROUTES_TENMON_CONVERSATION_PROJECTION_V1 =
  /WORLDVIEW_ROUTE_V1|DEF_LLM_TOP|NATURAL_GENERAL_LLM_TOP|TENMON_SCRIPTURE_CANON_V1|KATAKAMUNA_CANON_ROUTE_V1|TENMON_SUBCONCEPT_CANON_V1|ABSTRACT_FRAME_VARIATION_V1|KANAGI_CONVERSATION_V1|R22_JUDGEMENT_PREEMPT_V1|R22_CONSCIOUSNESS_META_ROUTE_V1|R22_SELFAWARE_CONSCIOUSNESS_V1|SOUL_DEF_SURFACE_V1|SOUL_FASTPATH_VERIFIED_V1|DEF_FASTPATH_VERIFIED_V1|CONVERSATION_ENGINE_V1|N2_KANAGI_PHASE_TOP|N1_GREETING_TENMON_CANON_V1|TENMON_KOTODAMA_HISYO_FRONT_V1|CONTINUITY_ANCHOR_V1|CONTINUITY_ROUTE_HOLD_V1|R22_NEXTSTEP_FOLLOWUP_V1|R22_ESSENCE_FOLLOWUP_V1|R22_SELF_DIAGNOSIS_ROUTE_V1|SYSTEM_DIAGNOSIS_PREEMPT_V1|SCRIPTURE_LOCAL_RESOLVER_V4|GROUNDING_SELECTOR_UNRESOLVED_V1|GROUNDING_SELECTOR_GROUNDED_V1|EXPLICIT_CHAR_PREEMPT_V1/u;

/** brainstem / 表層が付ける「〇〇について、今回は分析/定義の立場で答えます。」一行を落とす */
function stripLeadingMissionPreambleV1(text: string): string {
  let t = String(text || "").trim();
  if (!t) return t;
  const re = /^[^\n\r]{0,120}について、今回は(定義|分析)の立場で答えます。\s*/u;
  if (re.test(t)) t = t.replace(re, "").trim();
  // SOUL_DEFINE_DISAMBIG_V1: 「立脚の中心は…いまは…の立場で答えます。」型の mission 前置きを一段削る
  const re2 =
    /^【天聞の所見】\s*立脚の中心は「[^」]{1,120}」です。(?:\s*[^\n]{0,200}?いまは[^\n]{0,120}の立場で答えます。)?\s*\n+/u;
  if (re2.test(t)) t = t.replace(re2, "【天聞の所見】\n").trim();
  return t;
}

/** 通常会話で冒頭に出したくない内部・機械説明（段落単位で落とす） */
function stripInternalFootingParagraphsV1(text: string): string {
  const t = String(text || "").trim();
  if (!t) return t;
  const paras = t.split(/\n\n+/u).map((p) => p.trim()).filter(Boolean);
  const badLine = (line: string) =>
    /^(立脚の中心は|参照の束は|参照の束|一貫の手がかりは|根は、|根は|いまの答えは、)/u.test(line.trim()) ||
    /^generalについて、今回は/u.test(line.trim()) ||
    /^この問いについて、今回は(定義|分析)の立場で答えます。$/u.test(line.trim()) ||
    /^この問いについて[、,]/u.test(line.trim()) ||
    /^この問いを[、,]/u.test(line.trim());
  const out: string[] = [];
  for (const p of paras) {
    const lines = p.split(/\n/u).map((x) => x.trim()).filter(Boolean);
    const kept = lines.filter((ln) => !badLine(ln));
    if (kept.length === 0) continue;
    out.push(kept.join("\n"));
  }
  return out.join("\n\n").trim() || t;
}

/**
 * TENMON_CHAT_SURFACE_DEDUP_AND_EXIT_CONTRACT_CURSOR_AUTO_V1:
 * 「次の一手」系段落が多重のとき末尾一つに。同一の疑問段落の重複を落とす。
 */
function dedupeTrailingNextStepParagraphsV1(text: string): string {
  const paras = String(text || "")
    .split(/\n\n+/u)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paras.length < 2) return String(text || "").trim();
  const stepRe = /^(【次の一手】|次の一手として)/u;
  const stepIdx: number[] = [];
  for (let i = 0; i < paras.length; i++) {
    if (stepRe.test(paras[i])) stepIdx.push(i);
  }
  if (stepIdx.length <= 1) return String(text || "").trim();
  const keep = stepIdx[stepIdx.length - 1];
  const out: string[] = [];
  for (let i = 0; i < paras.length; i++) {
    if (stepRe.test(paras[i]) && i !== keep) continue;
    out.push(paras[i]);
  }
  return out.join("\n\n").trim();
}

function dedupeIdenticalQuestionParagraphsV1(text: string): string {
  const paras = String(text || "")
    .split(/\n\n+/u)
    .map((p) => p.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of paras) {
    const key = p.replace(/\s+/gu, " ").trim();
    if (key.length >= 8 && /[？?]\s*$/.test(key)) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(p);
  }
  return out.join("\n\n").trim();
}

function dedupeNearDuplicateShortLinesV1(text: string): string {
  const lines = String(text || "").split("\n");
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const s = line.replace(/\s+/gu, " ").trim();
    const key = s.replace(/[。！？?！]/gu, "").trim();
    if (key.length >= 10 && key.length <= 120) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** hold / continuity 系ゲート本文の最終 dedup（大型 rewriting 禁止・projection 先頭の隣接 dedupe と二重でも無害） */
export function dedupeNextStepAndQuestionSurfaceV1(text: string): string {
  let t = String(text || "").trim();
  if (!t) return t;
  t = dedupeAdjacentParagraphsV1(t);
  t = dedupeTrailingNextStepParagraphsV1(t);
  t = dedupeIdenticalQuestionParagraphsV1(t);
  t = dedupeNearDuplicateShortLinesV1(t);
  return t.replace(/\n{3,}/g, "\n\n").trim();
}

/** 隣接同一段落の圧縮（R22 系の同文反復など）— 連続3重まで繰り返し除去 */
function dedupeAdjacentParagraphsV1(text: string): string {
  let t = String(text || "").trim();
  for (let pass = 0; pass < 8; pass++) {
    const paras = t.split(/\n\n+/u).map((p) => p.trim()).filter(Boolean);
    const next: string[] = [];
    for (const p of paras) {
      if (next.length && next[next.length - 1] === p) continue;
      next.push(p);
    }
    const joined = next.join("\n\n").trim();
    if (joined === t) break;
    t = joined;
  }
  return t;
}

function normalizeDigitsJa(s: string): string {
  return String(s || "").replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
}

/**
 * 明示字数（3000/8000 等）がある長文依頼で、見出しが無いときだけ五段骨格ラベルを付与（本文は増やさない）
 * PACK_E: 中心／展開／対比・深掘り／統合／次の一手。既に骨格見出しがある場合は触らない。
 */
function applyLongformSectionLabelsIfRequestedV1(body: string, rawMessage: string): string {
  const msg = normalizeDigitsJa(String(rawMessage || "").trim());
  const target = parseExplicitCharTargetFromUserMessageV1(msg) || 0;
  if (target < 2400) return body;
  let t = String(body || "").trim();
  if (!t || t.length < 900) return t;
  if (
    /【答え】|【問いの核】|【構造分解】|【中心】|【展開】|【対比・深掘り】|【統合】|【次の一手】|【見立て】|【着地】/u.test(
      t
    )
  ) {
    return t;
  }
  const paras = t.split(/\n\n+/u).map((p) => p.trim()).filter(Boolean);
  const maxParas = target >= 5200 ? 12 : 8;
  if (paras.length < 2 || paras.length > maxParas) return t;
  const bookStrong = /(本の第|第[一二三四五六七八九十\d]{1,4}章|第一章|章立てで|書籍として)/u.test(msg);
  const labels = bookStrong
    ? ["【章：中心】", "【章：展開】", "【章：対比・深掘り】", "【章：統合】", "【章：次の一手】"]
    : ["【中心】", "【展開】", "【対比・深掘り】", "【統合】", "【次の一手】"];
  const head = bookStrong ? "【書籍／章モード】以下を一章の骨格として読んでください。\n\n" : "";
  const mapped = paras
    .map((p, i) => {
      if (i >= labels.length) return p;
      if (/^【/u.test(p)) return p;
      return `${labels[i]}\n${p}`;
    })
    .join("\n\n")
    .trim();
  return (head + mapped).trim();
}

/** finalize 等：responseComposer を経由しない長文にも五段ラベルを付与 */
export function applyTenmonLongformSectionLabelsOnlyV1(body: string, rawMessage: string): string {
  return applyLongformSectionLabelsIfRequestedV1(body, rawMessage);
}

export type TenmonConversationProjectionContextV1 = {
  routeReason: string;
  rawMessage?: string;
};

/**
 * responseComposer 出口で一度だけ適用。routeReason が対象外なら無変更。
 */
export function applyTenmonConversationProjectionV1(
  body: string,
  ctx: TenmonConversationProjectionContextV1
): string {
  const rr = String(ctx.routeReason || "").trim();
  if (!rr || !ROUTES_TENMON_CONVERSATION_PROJECTION_V1.test(rr)) {
    return String(body || "").trim();
  }
  let t = stripLeadingMissionPreambleV1(body);
  /** EXPLICIT も長文五段・重複除去まで通す（先頭 mission だけ先に削る） */
  t = stripInternalFootingParagraphsV1(t);
  t = dedupeAdjacentParagraphsV1(t);
  const maxQ = /BEAUTY_COMPILER|beauty/i.test(rr) ? 2 : 1;
  t = clampQuestionMarksInProseV1(t, maxQ);
  t = applyLongformSectionLabelsIfRequestedV1(t, String(ctx.rawMessage ?? ""));
  // PACK_C_V1: judgement / continuity / kanagi の同型問い連打を抑え、次の一手系は末尾一問に収束
  if (
    /R22_JUDGEMENT_PREEMPT_V1|CONTINUITY_ANCHOR_V1|CONTINUITY_ROUTE_HOLD_V1|R22_NEXTSTEP_FOLLOWUP_V1|R22_ESSENCE_FOLLOWUP_V1|KANAGI_CONVERSATION_V1|R22_SELF_DIAGNOSIS_ROUTE_V1|SYSTEM_DIAGNOSIS_PREEMPT_V1/u.test(
      rr
    )
  ) {
    t = suppressInterrogativeTemplateSpamV1(t);
  }
  /** PACK_F: 一般／定義 LLM 最終帯もテンプレ問い連打を抑え、末尾一問に収束 */
  if (/DEF_LLM_TOP|NATURAL_GENERAL_LLM_TOP/u.test(rr)) {
    t = suppressInterrogativeTemplateSpamV1(t);
    t = clampQuestionMarksKeepLastNV1(t, 1);
  }
  if (/R22_JUDGEMENT_PREEMPT_V1|R22_NEXTSTEP_FOLLOWUP_V1|R22_ESSENCE_FOLLOWUP_V1|CONTINUITY_ROUTE_HOLD_V1/u.test(rr)) {
    t = clampQuestionMarksKeepLastNV1(t, 1);
  }
  if (/CONTINUITY_ROUTE_HOLD_V1|CONTINUITY_ANCHOR_V1|R22_NEXTSTEP_FOLLOWUP_V1|R22_ESSENCE_FOLLOWUP_V1/u.test(rr)) {
    t = dedupeNextStepAndQuestionSurfaceV1(t);
  }
  return t.trim();
}

/** TENMON_CHAT_RUNTIME_SURFACE_REPAIR_PDCA_V1: （補助）次の一手 を route / 明示字数で抑止 */
const STRIP_HELPER_TAIL_ROUTES_V1 = new Set<string>([
  "DEF_FASTPATH_VERIFIED_V1",
  "SOUL_FASTPATH_VERIFIED_V1",
  "TENMON_SUBCONCEPT_CANON_V1",
  "TENMON_SCRIPTURE_CANON_V1",
  "KATAKAMUNA_CANON_ROUTE_V1",
  "R22_JUDGEMENT_PREEMPT_V1",
  "KANAGI_CONVERSATION_V1",
  "R22_CONSCIOUSNESS_META_ROUTE_V1",
  "R22_SELFAWARE_CONSCIOUSNESS_V1",
  "TRUTH_GATE_RETURN_V2",
  "EXPLICIT_CHAR_PREEMPT_V1",
  /** STAGE1: finalize 合成の（補助）帯を next_step / continuity でも剥がす */
  "R22_NEXTSTEP_FOLLOWUP_V1",
  "R22_ESSENCE_FOLLOWUP_V1",
  "CONTINUITY_ANCHOR_V1",
  "CONTINUITY_ROUTE_HOLD_V1",
  /** STAGE1_SURFACE_BLEED_V1: 一般 LLM 帯の（補助）末尾を常時剥がす（本文核は増やさない） */
  "NATURAL_GENERAL_LLM_TOP",
  "DEF_LLM_TOP",
]);

export function stripHelperTailByRouteV1(
  text: string,
  routeReason?: string | null,
  explicitLengthRequested?: number | null
): string {
  const t = String(text || "");
  const rr = String(routeReason || "");
  const n = Number(explicitLengthRequested || 0) || 0;
  if (!STRIP_HELPER_TAIL_ROUTES_V1.has(rr) && n < 2400) {
    return t;
  }
  return t.replace(/\n*（補助）次の一手:[\s\S]*$/u, "").trim();
}

/** フォレンジックで確認済みの route 向けに汎用・立脚前置きを削る */
const GENERIC_RUNTIME_PREAMBLE_ROUTES_V1 = new Set<string>([
  "SOUL_FASTPATH_VERIFIED_V1",
  "TENMON_SUBCONCEPT_CANON_V1",
  "TENMON_SCRIPTURE_CANON_V1",
  "R22_CONSCIOUSNESS_META_ROUTE_V1",
  "R22_SELFAWARE_CONSCIOUSNESS_V1",
  "TRUTH_GATE_RETURN_V2",
  /** STAGE1: next_step / continuity の mission 行表出抑止 */
  "R22_NEXTSTEP_FOLLOWUP_V1",
  "R22_ESSENCE_FOLLOWUP_V1",
  "CONTINUITY_ANCHOR_V1",
  "CONTINUITY_ROUTE_HOLD_V1",
  /** STAGE1_SURFACE_BLEED_V1: mission 一行の表に出しを抑止 */
  "NATURAL_GENERAL_LLM_TOP",
  "DEF_LLM_TOP",
]);

const CENTER_RUNTIME_PREAMBLE_ROUTES_V1 = new Set<string>([
  "DEF_FASTPATH_VERIFIED_V1",
  "TRUTH_GATE_RETURN_V2",
  "R22_SELFAWARE_CONSCIOUSNESS_V1",
  /** STAGE1: 長文五段ラベル直後の立脚・参照束機械句を抑止 */
  "EXPLICIT_CHAR_PREEMPT_V1",
]);

function stripGenericRuntimeMissionLinesV1(t: string): string {
  return t
    .split(/\n/u)
    .filter((ln) => {
      const s = ln.trim();
      if (!s) return true;
      if (/^この問いについて、今回は(?:定義|分析)の立場で答えます。$/u.test(s)) return false;
      if (/^意識について、今回は分析の立場で答えます。$/u.test(s)) return false;
      if (/^言霊秘書(?:（経典法則）)?について、今回は分析の立場で答えます。$/u.test(s)) return false;
      return true;
    })
    .join("\n")
    .trim();
}

function stripCenterRuntimeMechanicalPhrasesV1(t: string): string {
  let s = String(t || "");
  s = s.replace(/立脚の中心は「[^」]+」です。\s*/gu, "");
  s = s.replace(/いまの読み方は参照束（[^）]*）に沿っています。\s*/gu, "");
  s = s.replace(/いまは(?:定義|分析)の立場で答えます。\s*/gu, "");
  s = s.replace(/(?:^|\n)\s*参照の束は[^。]*。\s*/gmu, "\n");
  return s.trim();
}

export function suppressRuntimePreambleByRouteV1(text: string, routeReason?: string | null): string {
  let t = String(text || "").trim();
  const rr = String(routeReason || "");
  if (GENERIC_RUNTIME_PREAMBLE_ROUTES_V1.has(rr)) {
    t = stripGenericRuntimeMissionLinesV1(t);
    t = t.replace(/^この問いについて、今回は(?:定義|分析)の立場で答えます。\s*/u, "").trim();
    t = t.replace(/^意識について、今回は分析の立場で答えます。\s*/u, "").trim();
    t = t.replace(/^言霊秘書(?:（経典法則）)?について、今回は分析の立場で答えます。\s*/u, "").trim();
    /** 見出し直後に本文と同一行で付く mission 行 */
    t = t
      .replace(/この問いについて、今回は(?:定義|分析)の立場で答えます。\s*/gu, "")
      .replace(/意識について、今回は分析の立場で答えます。\s*/gu, "")
      .replace(/言霊秘書(?:（経典法則）)?について、今回は分析の立場で答えます。\s*/gu, "")
      .trim();
  }
  if (CENTER_RUNTIME_PREAMBLE_ROUTES_V1.has(rr)) {
    t = stripCenterRuntimeMechanicalPhrasesV1(t);
    t = t.replace(/^\s*立脚の中心は「[^」]+」です。(?:参照[^。]*。)?\s*/gmu, "").trim();
    t = t.replace(/^\s*参照の束は[^。]*。\s*/gmu, "").trim();
  }
  return t;
}

/** 段落 i が 直前2段落の本文を隙間なく連結したものと同一なら除去（空白正規化で比較） */
function dropAdjacentMergedParagraphDuplicateV1(text: string): string {
  const paras = String(text || "")
    .split(/\n{2,}/u)
    .map((x) => x.trim())
    .filter(Boolean);
  if (paras.length < 3) return String(text || "").trim();
  const norm = (s: string) => s.replace(/\s+/gu, "");
  const out = [...paras];
  for (let i = 2; i < out.length; i++) {
    const merged = norm(out[i - 2]! + out[i - 1]!);
    const cur = norm(out[i]!);
    if (merged.length >= 32 && cur === merged) {
      out.splice(i, 1);
      i -= 1;
    }
  }
  return out.join("\n\n").trim();
}

/** 段落・連続行・文末の短い反復を圧縮 */
export function dedupeRuntimeSurfaceV1(
  text: string,
  opts?: { skipGlobalParagraphDedupe?: boolean }
): string {
  let t = String(text || "").trim();
  if (!t) return t;

  if (!opts?.skipGlobalParagraphDedupe) {
    const paras = t.split(/\n{2,}/u).map((x) => x.trim()).filter(Boolean);
    const seen = new Set<string>();
    const outParas: string[] = [];
    for (const p of paras) {
      if (seen.has(p)) continue;
      seen.add(p);
      outParas.push(p);
    }
    t = outParas.join("\n\n");
    /** JUDGEMENT_MERGED_TAIL_DEDUPE_V1: 直前2段落を改行なしで連結した文が直後に再出する二重貼りを落とす（R22_JUDGEMENT_PREEMPT_V1 等） */
    t = dropAdjacentMergedParagraphDuplicateV1(t);
  }

  const lines = t.split("\n");
  const outLines: string[] = [];
  let prev: string | null = null;
  for (const line of lines) {
    const x = line.trim();
    if (prev !== null && x === prev && x !== "") {
      continue;
    }
    outLines.push(line);
    prev = x;
  }
  t = outLines.join("\n");

  try {
    t = t.replace(/(\b[^。！？\n]{6,}?[。！？])\s*\1+/gu, "$1");
  } catch {
    /* fail-open */
  }

  /** 段落内で同一文が再出現したら除去（判断／支援の二重貼り付け対策） */
  const dedupeSentencesInBlock = (block: string): string => {
    const raw = String(block || "").trim();
    if (!raw) return raw;
    const parts = raw.split(/(?<=[。！？])/u).map((x) => x.trim()).filter(Boolean);
    const seen = new Set<string>();
    const outS: string[] = [];
    for (const p of parts) {
      const key = p.replace(/\s+/gu, "").trim();
      if (key.length >= 8 && seen.has(key)) continue;
      if (key.length >= 8) seen.add(key);
      outS.push(p);
    }
    return outS.join("");
  };
  t = t
    .split(/\n\n+/u)
    .map((blk) => dedupeSentencesInBlock(blk))
    .filter(Boolean)
    .join("\n\n");

  t = t.replace(/\n{3,}/g, "\n\n").trim();
  return t;
}

export function applyRuntimeSurfaceRepairV1(input: {
  text: string;
  routeReason?: string | null;
  explicitLengthRequested?: number | null;
  /** 明示長文パッドの同一プール段落を残す */
  relaxRepeatParagraphDedupe?: boolean;
}): string {
  let t = String(input.text || "");
  const rr = String(input.routeReason ?? "");
  t = suppressRuntimePreambleByRouteV1(t, input.routeReason ?? null);
  t = stripHelperTailByRouteV1(t, input.routeReason ?? null, input.explicitLengthRequested ?? null);
  /**
   * STAGE1_SURFACE_BLEED_V1: 監査・参照束・典拠メタ行を段落／行で落とす（canon 高速系ルートは含めない）。
   */
  if (
    /^(NATURAL_GENERAL_LLM_TOP|DEF_LLM_TOP|R22_NEXTSTEP_FOLLOWUP_V1|R22_ESSENCE_FOLLOWUP_V1|CONTINUITY_ANCHOR_V1|CONTINUITY_ROUTE_HOLD_V1|R22_CONSCIOUSNESS_META_ROUTE_V1|EXPLICIT_CHAR_PREEMPT_V1)$/u.test(
      rr
    )
  ) {
    t = stripInternalFootingParagraphsV1(t);
    t = t
      .split(/\n/u)
      .filter((ln) => {
        const s = ln.trim();
        if (/参照束（内部名は省略）/u.test(s)) return false;
        if (/^いまの答えは、典拠は/u.test(s)) return false;
        return true;
      })
      .join("\n")
      .trim();
    t = dedupeAdjacentParagraphsV1(t);
  }
  /** STAGE1: 五段ラベルと LLM 見出しの偶発的二重【中心】のみ圧縮（本文増やさない） */
  if (rr === "EXPLICIT_CHAR_PREEMPT_V1") {
    t = t.replace(/(^|\n)【中心】[ \t]*\n+\s*【中心】[ \t]*(?=\n|$)/gu, "$1【中心】");
  }
  t = dedupeRuntimeSurfaceV1(t, {
    skipGlobalParagraphDedupe: Boolean(input.relaxRepeatParagraphDedupe),
  });
  return t.trim();
}
