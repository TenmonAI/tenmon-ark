/**
 * 美しい日本語 + ノイズ行削減（TPO字数は answerLength と TENMON_CONVERSATION_BASELINE_V2.writing で拡張）
 * CHAT_TS_STAGE1_SURFACE_POLISH: surface_bleed_zero
 * CHAT_TS_STAGE5: TENMON_CONVERSATION_BASELINE_V2.sealPillars（主命題先行・美しい日本語・TPO）と整合
 *
 * TENMON_KG2B_FRACTAL_LANGUAGE_RENDERER_V1: HYBRID の detailPlan.evidence（KHS スロット）を
 * 脚注列挙にせず本文へ自然に織り込む（捏造なし・BAD quote 除外）。
 */
import { TENMON_CONVERSATION_BASELINE_V2 } from "./tenmonConstitutionV2.js";
import { evaluateKokuzoBadHeuristicV1 } from "./kokuzoBadGuardV1.js";
import { clampQuestionMarksKeepLastNV1 } from "../planning/responsePlanCore.js";
import { dedupeNextStepAndQuestionSurfaceV1 } from "./tenmonConversationSurfaceV1.js";
import { applyAnswerProfilePostComposeV1 } from "./answerProfileLayer.js";

export type KhsFractalEvidenceSlotV1 = {
  doc?: string;
  pdfPage?: number | null;
  quote?: string;
  lawKey?: string;
  termKey?: string;
  quoteHash?: string;
  seedId?: string;
};

/** KG2 の evidence[]（quote スロット）かどうかの軽量判定（契約は変更しない） */
export function isKhsFractalEvidenceArrayV1(ev: unknown): ev is KhsFractalEvidenceSlotV1[] {
  if (!Array.isArray(ev) || ev.length === 0) return false;
  let ok = 0;
  for (const x of ev) {
    if (!x || typeof x !== "object") continue;
    const q = String((x as KhsFractalEvidenceSlotV1).quote ?? "").trim();
    if (q.length >= 4) ok++;
  }
  return ok > 0;
}

function normWs(s: string): string {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

function trimQuoteForFractalWeaveV1(quote: string, max: number): string {
  let t = normWs(quote);
  if (t.length <= max) return t;
  const slice = t.slice(0, max);
  const last = Math.max(slice.lastIndexOf("。"), slice.lastIndexOf("、"));
  if (last > 40) return slice.slice(0, last + 1);
  return slice.replace(/[,、]\s*$/u, "") + "…";
}

function softLawAxisLabelV1(lawKey: string, termKey: string): string {
  const t = String(termKey || "").trim();
  if (t.length >= 2 && t.length <= 28) return t;
  let lk = String(lawKey || "")
    .replace(/^KHSL:LAW:[^:]*:?/giu, "")
    .replace(/^KHSL?:[A-Z0-9_]+:?/giu, "")
    .replace(/_/gu, " ")
    .trim();
  if (lk.length > 36) lk = lk.slice(0, 36) + "…";
  return lk;
}

/**
 * HYBRID 表面本文の末尾に、法則→根拠の流れを一段の自然文で追加（doc=/pdfPage= 形式は使わない）
 */
export function weaveKhsEvidenceIntoHybridSurfaceV1(input: {
  surfaceBody: string;
  evidence: unknown;
}): string {
  const body = String(input.surfaceBody ?? "").trim();
  if (!body) return body;
  if (!isKhsFractalEvidenceArrayV1(input.evidence)) return body;

  const slots: KhsFractalEvidenceSlotV1[] = [];
  for (const raw of (input.evidence as KhsFractalEvidenceSlotV1[]).slice(0, 4)) {
    if (!raw || typeof raw !== "object") continue;
    const quote = String(raw.quote ?? "").trim();
    if (quote.length < 4) continue;
    if (evaluateKokuzoBadHeuristicV1(quote).isBad) continue;
    slots.push(raw);
  }
  if (slots.length === 0) return body;

  const q0 = trimQuoteForFractalWeaveV1(String(slots[0].quote), 130);
  const ax0 = softLawAxisLabelV1(String(slots[0].lawKey ?? ""), String(slots[0].termKey ?? ""));
  let addition = "";
  if (slots.length === 1) {
    addition = ax0
      ? `この見立ては、${ax0}の筋に沿っており、資料の記述には「${q0}」とある旨が芯になります。`
      : `資料の記述には「${q0}」とあり、いまの問いへの手がかりになります。`;
  } else {
    const q1 = trimQuoteForFractalWeaveV1(String(slots[1].quote ?? ""), 110);
    const ax1 = softLawAxisLabelV1(String(slots[1].lawKey ?? ""), String(slots[1].termKey ?? ""));
    if (ax0 && ax1) {
      addition = `まず${ax0}では「${q0}」と示されています。${ax1}の整理とも重なり、「${q1}」という記述が論点を補います。`;
    } else if (ax0) {
      addition = `${ax0}の線では「${q0}」と読み取れ、あわせて「${q1}」という記述も重なります。`;
    } else {
      addition = `資料には「${q0}」と「${q1}」という記述が重なり、いまの問いを支えます。`;
    }
  }

  const probe = q0.slice(0, Math.min(20, q0.length));
  if (probe && body.includes(probe)) return body;

  return `${body}\n\n${addition}`.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * 行頭〜改行までの定型ノイズ（generic preamble / 補助脚注 / 還元テンプレ）
 * ^ 付きは段落頭のテンプレ向け
 */
export const TENMON_SURFACE_NOISE_PATTERNS_V3: RegExp[] = [
  /^この問いについて、今回は[^\n]*答えます。\n?/gm,
  /^[^\n]{1,48}について、今回は(?:分析|定義|説明)の立場で答えます。\n?/gm,
  /^続きが求められているようですね。[^\n]*\n?/gm,
  /^一貫の手がかりは、[^\n]*\n?/gm,
  /^いまの答えは、典拠は[^\n]*\n?/gm,
  /^【前回の芯】[^\n]*\n?/gm,
  /^【いまの差分】[^\n]*\n?/gm,
  /^【次の一手】[^\n]*\n?/gm,
  /^（次の一手の記録）[^\n]*\n?/gm,
  /^言霊の線のまま、直前の論点を[^\n]*\n?/gm,
  /^この中心を中心に、直前の論点を一段だけ継ぎます。?[^\n]*\n?/gm,
  /^次の一手として、中心を一つ保ち、次に見る点を一つ決めてください。?\n?/gm,
  /^次の一手として、判断軸を一つ選び、その軸から深めてください。?\n?/gm,
  /^いま私は、中心を崩さずにどこへ接続するかを見ています。?\n?/gm,
  /^いまの気持ちのほうを見ています。?[^\n]*\n?/gm,
  /^その芯を一語だけ先に置いてください。?\n?/gm,
  /^どの側面について知りたいですか[。？?]?\n?/gm,
  /^どの分野に興味がありますか[。？?]?\n?/gm,
  /^具体的にどの部分を深めたいですか[。？?]?\n?/gm,
  /^次のどれで進めますか[。？?]?\n?/gm,
  /^どこから入りますか[。？?]?\n?/gm,
  /^あなたはこの書をどう使いますか[。？?]?\n?/gm,
  /^いま触れたい一点を[^\n]*\n?/gm,
  /^まずどちらですか[。？?]?\n?/gm,
  /^この中心を中心に、直前の論点を[^\n]*\n?/gm,
  /^（補助）次の一手[:：][^\n]*\n?/gm,
  /^定義は補完待ちです。?\n?/gm,
  /^経典に根ざす法則（呼称は人間向けに要約）について、今回は分析の立場で答えます。?\n?/gm,
  /^判断軸（内部参照は要約表示）について、今回は分析の立場で答えます。?\n?/gm,
  /^[^\n]{1,48}について、今回はcodeの立場で答えます。?\n?/gm,
  /^還元として、いまの主題を一句に圧し、説明と判断を分けずに一段で言い切る。\n?/gm,
];

/**
 * 行頭に限らず残存するサブストリング（seal surface_audit と同一キー）を落とす。
 * longform は段落が長いため、貪欲に本文まで食わないよう文・行単位で抑える。
 */
const TENMON_SURFACE_NOISE_FLEX_PATTERNS_V3: RegExp[] = [
  /この問いについて、今回は[^。\n．]{0,320}[。．]?/gu,
  /続きが求められているようですね。[^。\n．]{0,200}[。．]?/gu,
  /一貫の手がかりは、[^\n]{0,480}/gu,
  /いまの答えは、典拠は[^\n]{0,480}/gu,
  /【前回の芯】[^\n]{0,480}/gu,
  /【いまの差分】[^\n]{0,480}/gu,
  /【次の一手】[^\n]{0,680}/gu,
  /（次の一手の記録）[^\n]{0,480}/gu,
  /言霊の線のまま、直前の論点を[^\n]{0,360}/gu,
  /この中心を中心に、直前の論点を一段だけ継ぎます。?[^\n]{0,360}/gu,
  /次の一手として、中心を一つ保ち、次に見る点を一つ決めてください。?/gu,
  /次の一手として、判断軸を一つ選び、その軸から深めてください。?/gu,
  /いま私は、中心を崩さずにどこへ接続するかを見ています。?/gu,
  /いまの気持ちのほうを見ています。?[^\n]{0,240}/gu,
  /その芯を一語だけ先に置いてください。?/gu,
  /どの側面について知りたいですか[。？?]?/gu,
  /どの分野に興味がありますか[。？?]?/gu,
  /具体的にどの部分を深めたいですか[。？?]?/gu,
  /次のどれで進めますか[。？?]?/gu,
  /どこから入りますか[。？?]?/gu,
  /あなたはこの書をどう使いますか[。？?]?/gu,
  /いま触れたい一点を[^\n]{0,120}/gu,
  /まずどちらですか[。？?]?/gu,
  /この中心を中心に、直前の論点を[^\n]{0,360}/gu,
  /（補助）次の一手[:：][^\n]{0,600}/gu,
  /還元として、いまの主題を一句に圧し[^。\n．]{0,360}[。．]?/gu,
  /還元として、いまの主題を一句に圧し、説明と判断を分けずに一段で言い切る。/gu,
  /この問いについて、今回は分析の立場で答えます。/gu,
  /[^。\n]{1,48}について、今回は(?:分析|定義|説明)の立場で答えます。/gu,
  /定義は補完待ちです。?/gu,
  /経典に根ざす法則（呼称は人間向けに要約）について、今回は分析の立場で答えます。?/gu,
  /判断軸（内部参照は要約表示）について、今回は分析の立場で答えます。?/gu,
  /[^\n]{1,48}について、今回はcodeの立場で答えます。?/gu,
];

export function trimTenmonSurfaceNoiseV3(text: string): string {
  const original = String(text ?? "");
  let t = original;
  for (const pat of TENMON_SURFACE_NOISE_PATTERNS_V3) {
    t = t.replace(pat, "");
  }
  for (const pat of TENMON_SURFACE_NOISE_FLEX_PATTERNS_V3) {
    t = t.replace(pat, "");
  }
  /** 同一行にノイズ片だけが残るケース */
  t = t
    .split("\n")
    .map((line) => {
      const s = line.trim();
      if (
        /^この問いについて、今回は/u.test(s) ||
        /^[^\n]{1,48}について、今回は(?:分析|定義|説明)の立場で答えます。?$/u.test(s) ||
        /^一貫の手がかりは、/u.test(s) ||
        /^いまの答えは、典拠は/u.test(s) ||
        /^【前回の芯】/u.test(s) ||
        /^【いまの差分】/u.test(s) ||
        /^【次の一手】/u.test(s) ||
        /^（次の一手の記録）/u.test(s) ||
        /^次の一手として、中心を一つ保ち、次に見る点を一つ決めてください。?$/u.test(s) ||
        /^次の一手として、判断軸を一つ選び、その軸から深めてください。?$/u.test(s) ||
        /^その芯を一語だけ先に置いてください。?$/u.test(s) ||
        /^どの側面について知りたいですか[。？?]?$/u.test(s) ||
        /^どの分野に興味がありますか[。？?]?$/u.test(s) ||
        /^具体的にどの部分を深めたいですか[。？?]?$/u.test(s) ||
        /^次のどれで進めますか[。？?]?$/u.test(s) ||
        /^どこから入りますか[。？?]?$/u.test(s) ||
        /^あなたはこの書をどう使いますか[。？?]?$/u.test(s) ||
        /^いま触れたい一点を/u.test(s) ||
        /^まずどちらですか[。？?]?$/u.test(s) ||
        /^この中心を中心に、直前の論点を/u.test(s) ||
        /^（補助）次の一手/u.test(s) ||
        /^定義は補完待ちです。?$/u.test(s) ||
        /^経典に根ざす法則（呼称は人間向けに要約）について、今回は分析の立場で答えます。?$/u.test(s) ||
        /^判断軸（内部参照は要約表示）について、今回は分析の立場で答えます。?$/u.test(s) ||
        /^[^\n]{1,48}について、今回はcodeの立場で答えます。?$/u.test(s) ||
        /^還元として、いまの主題を一句に圧し/u.test(s)
      ) {
        return "";
      }
      return line;
    })
    .join("\n");
  /** 連続見出しの軽い正規化（必須条件ではない・過剰マージは避ける） */
  t = t.replace(/(【天聞の所見】\s*){2,}/g, "【天聞の所見】\n");
  /** STAGE3: 三弧 longform の所見直後の空行過多のみ抑える（【見立て】本文は保持） */
  if (/【見立て】/u.test(t) && /【着地】/u.test(t)) {
    t = t.replace(/【天聞の所見】\s*\n{2,}(?=【見立て】)/u, "【天聞の所見】\n");
  }
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.replace(/[ \t]+\n/g, "\n");
  t = t.replace(/\n[ \t]+/g, "\n");
  t = t.trim();
  if (!t) {
    const hadContinuityMeta =
      /【前回の芯】|【いまの差分】|【次の一手】|（次の一手の記録）/u.test(original);
    if (hadContinuityMeta) {
      return "前の流れを保ったまま、要点を一つだけ続けます。";
    }
  }
  return t;
}

/** TENMON_FINAL_PWA_SURFACE_LAST_MILE_V1: 内部 route 定数が本文へ漏れた場合のみ除去（文脈を壊さない） */
export function stripInternalRouteTokensFromSurfaceV1(text: string): string {
  let t = String(text ?? "");
  t = t.replace(/^\s*R22_[A-Z0-9_]+_V1\s*$/gmu, "");
  t = t.replace(/^\s*CONTINUITY_ROUTE_HOLD_V1\s*$/gmu, "");
  t = t.replace(/^\s*priorRouteReasonEcho\s*[:：]\s*[A-Z0-9_]+\s*$/gmu, "");
  t = t.replace(/^\s*priorRouteReason(?:Carry|Echo)?\s*[:：]\s*[^\n]+$/gimu, "");
  t = t.replace(/^\s*root_reasoning\s*[:：]\s*[^\n]+$/gimu, "");
  t = t.replace(/^\s*truth_structure\s*[:：]\s*[^\n]+$/gimu, "");
  t = t.replace(/^\s*center\s*[:：]\s*[^\n]+$/gimu, "");
  t = t.replace(/^\s*次軸\s*[:：]\s*[^\n]+$/gimu, "");
  t = t.replace(/^\s*次観測\s*[:：]\s*[^\n]+$/gimu, "");
  t = t.replace(/^\s*semanticNucleus\s*[:：]\s*[^\n]+$/gimu, "");
  t = t.replace(/^\s*threadCore\s*[:：]\s*[^\n]+$/gimu, "");
  t = t.replace(/^\s*["']?verdict["']?\s*[:：]\s*[^\n]+$/gimu, "");
  t = t.replace(/^\s*["']?decisionFrame["']?\s*[:：]\s*[^\n]+$/gimu, "");
  t = t.replace(/^\s*["']?thoughtCoreSummary["']?\s*[:：]\s*[^\n]+$/gimu, "");
  t = t.replace(/^\s*["']?center(Key|Meaning|Label|Claim)["']?\s*[:：]\s*[^\n]+$/gimu, "");
  t = t.replace(/\b(priorRouteReason|priorRouteReasonCarry|priorRouteReasonEcho|decisionFrame|thoughtCoreSummary|keep_center_one_step)\b/g, "");
  t = t.replace(/\broot_reasoning\b/gi, "");
  t = t.replace(/\bsemanticNucleus\b/gi, "");
  t = t.replace(/\bcenterKey\b/gi, "");
  t = t.replace(/\bcenterLabel\b/gi, "");
  t = t.replace(/\bcenterClaim\b/gi, "");
  t = t.replace(/\bcenterMeaning\b/gi, "");
  t = t.replace(/\bthreadCore\b/gi, "");
  t = t.replace(
    /\b(?:routeEvidenceTraceV1|personaConstitutionRuntimeV1|verdictEngineV1|verdictSections|threadCoreLinkSurfaceV1|thoughtCoreSummary|inputCognitionSplitV1|truthLayerArbitrationV1|truthLayerArbitrationKernelV1|tenmonDiscernmentJudgementBundleV1|answerProfileLayerV1|confidenceDisplayV1|omegaContract|seedKernel|expressionPlan|comfortTuning|providerPlan|brainstemDecision|selfLearningAutostudyV1)\b/g,
    "",
  );
  t = t.replace(/\b[A-Z][A-Z0-9_]{4,}_V1\b/g, "");
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  return t;
}

const TENMON_SURFACE_MIN_JP_CHARS_EXIT_V1 = 120;
const TENMON_SURFACE_MIN_PAD_BRIDGE_EXIT_V1 =
  "次に深めたいのは、前提の確認か具体例の提示か、どちらか一方に絞ると議論が安定しやすいです。";

/**
 * ゲート単一出口: 内部構造漏れの最終掃除＋短文への自然な橋渡し（プローブの meta_leak / 字数下限と整合）
 */
export function polishTenmonChatResponseSurfaceExitV1(text: string, routeReason: string): string {
  const rr = String(routeReason || "").trim();
  let t = stripInternalRouteTokensFromSurfaceV1(String(text ?? "").trim());
  if (!t) return t;
  const skipMin =
    /^FACTUAL_CURRENT_(DATE|PERSON|WEATHER)_V1$/u.test(rr) ||
    /^GROUNDING_SELECTOR_/u.test(rr) ||
    rr === "TENMON_SUBCONCEPT_CANON_V1" ||
    rr.startsWith("RELEASE_PREEMPT_");
  if (!skipMin && t.length < TENMON_SURFACE_MIN_JP_CHARS_EXIT_V1) {
    const pad = TENMON_SURFACE_MIN_PAD_BRIDGE_EXIT_V1;
    if (!t.includes(pad.slice(0, 18))) {
      t = `${t}\n\n${pad}`.trim();
    }
  }
  return t;
}

/**
 * TENMON_FINAL_PWA_SURFACE_LAST_MILE_V1 Rule 2/3/5:
 * nextstep / continuity / compare で「次の一手として…」段落が二重に付いた場合、末尾を一つに収束。
 */
export function applySurfaceLastMileClosingDedupeV1(text: string, routeReason: string): string {
  const rr = String(routeReason ?? "").trim();
  if (
    !/^(R22_NEXTSTEP_FOLLOWUP_V1|CONTINUITY_ANCHOR_V1|CONTINUITY_ROUTE_HOLD_V1|R22_ESSENCE_FOLLOWUP_V1|R22_COMPARE_ASK_V1|R22_COMPARE_FOLLOWUP_V1|RELEASE_PREEMPT_STRICT_COMPARE_BEFORE_TRUTH_V1)$/u.test(
      rr
    )
  ) {
    return String(text ?? "").trim();
  }
  let t = String(text ?? "").trim();
  if (!t) return t;
  const paras = t.split(/\n\n+/u).map((p) => p.trim()).filter(Boolean);
  const stepRe =
    /^(次の一手として|この中心を中心に、直前の論点を|次は、いまの中心を一つ保ったまま)/u;
  const stepIdx = paras.map((p, i) => (stepRe.test(p) ? i : -1)).filter((i) => i >= 0);
  if (stepIdx.length <= 1) return t;
  const kept: string[] = [];
  let lastStep = -1;
  for (let i = paras.length - 1; i >= 0; i--) {
    if (stepRe.test(paras[i])) {
      if (lastStep < 0) lastStep = i;
      continue;
    }
    kept.unshift(paras[i]);
  }
  if (lastStep >= 0) kept.push(paras[lastStep]);
  return kept.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

function dedupeGreetingLinesV1(text: string): string {
  const lines = String(text ?? "").split("\n");
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const s = line.trim();
    if (/^(おはようございます|こんにちは|こんばんは|はじめまして)[！!。]?$/u.test(s)) {
      if (seen.has(s)) continue;
      seen.add(s);
    }
    out.push(line);
  }
  return out.join("\n").trim();
}

export function applyTenmonConversationBaselineV2(input: {
  text: string;
  answerLength?: string | null;
  answerMode?: string | null;
  answerFrame?: string | null;
}): string {
  void TENMON_CONVERSATION_BASELINE_V2;
  let t = String(input.text ?? "").trim();
  t = trimTenmonSurfaceNoiseV3(t);
  if (!t) return t;

  if (!t.startsWith("【天聞の所見】")) {
    t = "【天聞の所見】" + t;
  }

  t = t.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n").trim();

  if (!/[？?。．…]\s*$/.test(t)) {
    t += "。";
  }

  const lenKey = String(input.answerLength || "medium").toLowerCase();
  const band =
    lenKey === "short"
      ? TENMON_CONVERSATION_BASELINE_V2.writing.short
      : lenKey === "long"
        ? TENMON_CONVERSATION_BASELINE_V2.writing.long
        : TENMON_CONVERSATION_BASELINE_V2.writing.medium;

  if (t.length > band.max) {
    t = t.slice(0, Math.max(band.min, band.max - 1)) + "…";
  }

  return t;
}

/** 段落を正規化して完全同一のブロックを除去（compare / selfaware） */
export function dedupeFullyDuplicateParagraphsV1(text: string): string {
  const raw = String(text ?? "").trim();
  if (!raw) return raw;
  const parts = raw.split(/\n\s*\n+/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.replace(/\s+/g, " ").trim();
    if (key.length < 12) {
      out.push(p);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** scripture: 目次・書名羅列っぽい行を落とす（本文契約は routeReason 不変） */
export function stripScriptureTocLeakV1(text: string): string {
  let t = String(text ?? "");
  const lines = t.split("\n");
  const kept: string[] = [];
  for (const line of lines) {
    const s = line.trim();
    if (!s) {
      kept.push(line);
      continue;
    }
    if (/^第[0-9０-９一二三四五六七八九十百千]+(章|節|編|部)/u.test(s)) continue;
    if (/^[0-9０-９]{1,3}[\.．、]\s*[^\n]{0,100}$/u.test(s) && s.length < 120) continue;
    if (/^[・•]\s*[^・\n]{1,48}\s*[・•]\s*[^・\n]{1,48}\s*$/u.test(s)) continue;
    if (/^(目次|もくじ|一覧|収録|巻[の之]?)/u.test(s) && s.length < 80) continue;
    kept.push(line);
  }
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** longform: メタ説明逃避の定型を落とす */
export function stripLongformMetaEscapismV1(text: string): string {
  let t = String(text ?? "");
  const paras = t.split(/\n\s*\n+/);
  const cleaned = paras.map((p) => {
    let x = p.trim();
    x = x.replace(
      /^(本回答では|以下では|以下に|この章では|まず前提として|ここではまず|本稿では)[^。\n]{0,200}[。\n]?/u,
      "",
    );
    x = x.replace(/^(まず|次に|続いて|最後に)、[^。\n]{0,80}として説明します[。．]?/u, "");
    return x.trim();
  });
  return cleaned.filter(Boolean).join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** general (NATURAL_GENERAL): 先頭の抽象詩的一行を落として次段落へ寄せる */
export function trimGeneralAbstractPoeticDriftV1(text: string, userMessage: string): string {
  let t = String(text ?? "").trim();
  const um = String(userMessage ?? "").trim();
  const isFactualProbe = /とは何|なに|どう|なぜ|比較|違い|説明して|教えて/u.test(um);
  if (!isFactualProbe) return t;
  const lines = t.split("\n");
  if (lines.length < 2) return t;
  const first = lines[0]?.trim() ?? "";
  if (first.length < 8 || first.length > 140) return t;
  const hasOverlap =
    um.length >= 2 &&
    [...um].some((ch, i) => i < um.length - 1 && first.includes(um.slice(i, i + 2)));
  const looksPoeticOnly =
    /^[^。]{0,120}[。．]?$/u.test(first) &&
    /(そこに|ひとすじ|静寂|まばゆい|光が|風が|影が|いま、|まだ、)/u.test(first) &&
    !/[？?]/.test(first);
  if (looksPoeticOnly && !hasOverlap) {
    return lines.slice(1).join("\n").trim();
  }
  return t;
}

export type ExitContractLockInputV1 = {
  surface: string;
  routeReason: string;
  userMessage: string;
  answerLength?: string | null;
  /** prior / ku からの出口枠（CONTINUITY_ROUTE_HOLD_V1 等の疑問符数の最終クランプに使用） */
  answerFrame?: string | null;
  /** head 合成前の本文に対する処理（scripture / longform / general） */
  preCompose: boolean;
};

/**
 * CHAT_TS_EXIT_CONTRACT_LOCK: 5 probe 向け出口の最終正規化（routeReason は変更しない）
 * - preCompose true: body 段階
 * - preCompose false: 全文（compare/selfaware の重複段落）
 */
export function applyExitContractLockV1(input: ExitContractLockInputV1): string {
  const rr = String(input.routeReason ?? "").trim();
  const um = String(input.userMessage ?? "");
  let t = String(input.surface ?? "");
  const originalSurface = t;

  if (input.preCompose) {
    if (rr === "NATURAL_GENERAL_LLM_TOP") {
      t = trimGeneralAbstractPoeticDriftV1(t, um);
    }
    if (/TENMON_SCRIPTURE_CANON_V1|SCRIPTURE_LOCAL_RESOLVER/u.test(rr)) {
      t = stripScriptureTocLeakV1(t);
    }
    const longish =
      String(input.answerLength ?? "").toLowerCase() === "long" ||
      rr === "EXPLICIT_CHAR_PREEMPT_V1" ||
      t.length >= 520;
    if (longish) {
      t = stripLongformMetaEscapismV1(t);
    }
  } else {
    if (rr === "RELEASE_PREEMPT_STRICT_COMPARE_BEFORE_TRUTH_V1") {
      t = dedupeFullyDuplicateParagraphsV1(t);
    }
    if (rr === "R22_SELFAWARE_CONSCIOUSNESS_V1") {
      t = dedupeFullyDuplicateParagraphsV1(t);
    }
  }

  if (rr === "CONTINUITY_ROUTE_HOLD_V1") {
    t = dedupeNextStepAndQuestionSurfaceV1(t);
    const af = String(input.answerFrame ?? "").trim().toLowerCase();
    if (af === "statement_plus_one_question" || af === "statement_plus_question") {
      t = clampQuestionMarksKeepLastNV1(t, 2);
    } else {
      t = clampQuestionMarksKeepLastNV1(t, 1);
    }
  }

  t = dedupeGreetingLinesV1(t);
  const stripped = trimTenmonSurfaceNoiseV3(t);
  if (rr !== "CONTINUITY_ROUTE_HOLD_V1" || stripped) {
    return stripped;
  }

  // continuity の user-visible surface が空になった場合のみ、内部メタ行を除去した残り本文を救済する
  const fallback = String(originalSurface)
    .split(/\n/u)
    .map((line) =>
      line
        .replace(/【前回の芯】[^\n]*/gu, "")
        .replace(/【いまの差分】[^\n]*/gu, "")
        .replace(/【次の一手】[^\n]*/gu, "")
        .replace(/（次の一手の記録）[^\n]*/gu, "")
        .trim()
    )
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (fallback) return fallback;
  return "前の流れを保ったまま、要点を一つだけ続けます。";
}

/** TENMON_SUPPORT_AND_FOUNDER_ANSWER_PROFILE_LAYER_V1: profileFrame に応じた composer / exit 共通の軽量整形 */
export function applyAnswerProfileSurfaceContractV2(input: {
  text: string;
  profileFrame?: string | null;
}): string {
  return applyAnswerProfilePostComposeV1(String(input.text ?? ""), input.profileFrame ?? null);
}

/**
 * TENMON_CONVERSATION_DISCERNMENT_PROJECTOR_BIND_CURSOR_AUTO_V1
 * 投影は responseComposer 主経路。軟リードは D/ΔS・裁定の直後に入り、【次の一手】/ONE_STEP ブロックより前で切る（trimTenmonSurfaceNoiseV3 は系譜/構造リードを消さない）。
 */
export {
  applyConversationDiscernmentSoftLeadV1,
  buildConversationDiscernmentProjectionBundleV1,
} from "./tenmonConversationDiscernmentProjectorV1.js";
