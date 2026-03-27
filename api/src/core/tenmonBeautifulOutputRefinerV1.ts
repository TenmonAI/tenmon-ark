/**
 * TENMON_BEAUTIFUL_OUTPUT_REFINEMENT_V1
 * 本文の意味を増やさず、段落・空白・重複・質問密度だけを軽く整える（routeReason / decisionFrame / thoughtCoreSummary は触らない）。
 */

/** surface 契約から必要フィールドのみ（循環 import 回避） */
export type BeautifulRefinementContractSliceV1 = {
  surfaceContractKey: string;
  toneProfile: "tenmon_define" | "tenmon_scripture" | "tenmon_selfaware" | "tenmon_concept";
  allowQuestion: boolean;
  closingShape: "ask_one_axis" | "soft_next_step" | "no_question";
  shortformShape: "short_define" | "short_analysis" | "continuity";
};

function splitParas(text: string): string[] {
  return String(text || "")
    .split(/\n\s*\n/u)
    .map((x) => x.trim())
    .filter(Boolean);
}

function joinParas(paras: string[]): string {
  return paras.join("\n\n").trim();
}

function normLine(s: string): string {
  return s.replace(/\s+/gu, " ").trim();
}

/** 隣接段落が同一（正規化後）なら 1 つに */
function collapseAdjacentIdenticalParagraphs(paras: string[]): string[] {
  const out: string[] = [];
  for (const p of paras) {
    const n = normLine(p);
    if (n.length < 8) {
      out.push(p);
      continue;
    }
    if (out.length && normLine(out[out.length - 1]) === n) continue;
    out.push(p);
  }
  return out;
}

/**
 * 短い段落が直後の段落にほぼ含まれるとき、短い方を落とす（言い換え重複の削減）。
 * fail-closed: 長さ差が小さい／含まれ方が弱いときは何もしない。
 */
function dropSubsumedShortParagraphs(paras: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < paras.length; i++) {
    const cur = paras[i];
    const n = normLine(cur);
    const next = paras[i + 1];
    if (n.length >= 24 && next) {
      const nn = normLine(next);
      if (nn.length > n.length + 16 && nn.includes(n)) {
        continue;
      }
    }
    if (out.length && n.length >= 24) {
      const prev = normLine(out[out.length - 1]);
      if (prev.length >= 24 && n.length > prev.length + 16 && n.includes(prev)) {
        out[out.length - 1] = cur;
        continue;
      }
    }
    out.push(cur);
  }
  return out;
}

/** finalize の圧縮と独立した、文単位の連続重複のみ落とす（新規文意なし） */
function compressRepeatedSentenceRuns(text: string): string {
  let t = String(text || "").trim();
  if (!t) return t;
  t = t.replace(/([^。！？\n]{8,200}[。！？])(?:\s*\1){1,}/gu, "$1");
  return t;
}

/** 行内の過剰スペース */
function collapseInternalMultispaces(text: string): string {
  return String(text || "")
    .split("\n")
    .map((ln) => ln.replace(/[ \t]{2,}/gu, " ").trimEnd())
    .join("\n")
    .trim();
}

/**
 * 一般説明系で「段落末がすべて疑問」に偏ったとき、最終段落以外の末尾 ? を句点へ（問い返し過多の抑制）。
 */
function softenExcessiveParagraphQuestions(text: string, contract: BeautifulRefinementContractSliceV1): string {
  if (contract.shortformShape === "continuity") return text;
  if (!contract.allowQuestion) return text;
  if (contract.surfaceContractKey !== "general_define_v1" && contract.surfaceContractKey !== "default_general_v1") {
    return text;
  }
  const paras = splitParas(text);
  if (paras.length < 2) return text;
  let qParas = 0;
  for (const p of paras) {
    if (/[？?][\s」』）]*$/u.test(p.trim())) qParas++;
  }
  if (qParas < 3) return text;
  const last = paras.length - 1;
  return joinParas(
    paras.map((p, i) => {
      if (i === last) return p;
      return p.replace(/[？?]+([\s」』）]*)$/u, "。$1");
    }),
  );
}

/**
 * scripture: 句点直後の不要スペース・空行の詰め（詩化はしない）
 */
function tightenScriptureBreathing(text: string, contract: BeautifulRefinementContractSliceV1): string {
  if (contract.toneProfile !== "tenmon_scripture") return text;
  let t = text.replace(/。\s{2,}/gu, "。");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

export function applyBeautifulOutputRefinementV1(args: { surface: string; contract: BeautifulRefinementContractSliceV1 }): string {
  let raw = String(args.surface || "").trim();
  const c = args.contract;
  if (!raw) return raw;

  let head = "";
  let rest = raw;
  const headMatch = /^(【[^】]+】\s*\n*)/u.exec(raw);
  if (headMatch) {
    head = headMatch[1].trimEnd();
    rest = raw.slice(headMatch[0].length).trim();
  }

  let paras = splitParas(rest);
  if (paras.length === 0) paras = [rest];

  paras = collapseAdjacentIdenticalParagraphs(paras);
  paras = dropSubsumedShortParagraphs(paras);
  rest = joinParas(paras);
  rest = compressRepeatedSentenceRuns(rest);
  rest = collapseInternalMultispaces(rest);
  rest = softenExcessiveParagraphQuestions(rest, c);
  rest = tightenScriptureBreathing(rest, c);
  rest = rest.replace(/\n{3,}/g, "\n\n").trim();

  const out = head ? `${head}\n\n${rest}`.trim() : rest;
  return out.replace(/\n{3,}/g, "\n\n").trim();
}
