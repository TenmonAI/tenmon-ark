/**
 * 文体・品質の相対スコア（0〜1 近傍）。絶対評価ではなく ledger tail からのヒューリスティクス。
 * CARD_MC_VNEXT_ANALYZER_AND_ACCEPTANCE_V1
 */

const GENERIC_ESCAPE = /(一般的には|人それぞれ|価値観|状況により|私はAI|AIとして|統計的には)/;
const PRESSURE = /(絶対に|命じる|断じる|見抜いている|容赦なく)/;
const AI_FILLER = /(承知しました|なるほどですね|おっしゃる通りです)/;

export type StyleHeuristicScoresV1 = {
  conclusion_first_rate: number;
  one_paragraph_one_theme_rate: number;
  long_sentence_rate: number;
  politeness_consistency_score: number;
  pressure_phrase_rate: number;
  generic_escape_rate: number;
  tenmon_style_fit_score: number;
  readability_score: number;
};

function clamp01(x: number): number {
  if (Number.isNaN(x) || !Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export function scoreStyleOnTailsV1(tails: string[]): StyleHeuristicScoresV1 {
  const samples = tails.map((t) => String(t || "").trim()).filter(Boolean);
  if (samples.length === 0) {
    return {
      conclusion_first_rate: 0,
      one_paragraph_one_theme_rate: 0,
      long_sentence_rate: 0,
      politeness_consistency_score: 0,
      pressure_phrase_rate: 0,
      generic_escape_rate: 0,
      tenmon_style_fit_score: 0,
      readability_score: 0,
    };
  }

  let conclusion = 0;
  let oneTheme = 0;
  let longSent = 0;
  let polite = 0;
  let pressure = 0;
  let generic = 0;
  let tenmon = 0;
  let read = 0;

  for (const s of samples) {
    const head = s.slice(0, 100);
    if (/(なので|ため|第一に|要点は|結論から)/.test(head)) conclusion += 1;

    const paraBreaks = (s.match(/\n\n/g) || []).length;
    const len = s.length;
    if (len < 40 || paraBreaks <= 1) oneTheme += 1;

    const parts = s.split(/[。…]/).map((x) => x.trim()).filter(Boolean);
    const maxPart = parts.reduce((m, p) => Math.max(m, p.length), 0);
    if (maxPart > 110) longSent += 1;

    const desu = (s.match(/です|ます/g) || []).length;
    const da = (s.match(/だ。|だろ|である[。.]/g) || []).length;
    polite += clamp01(desu / Math.max(1, desu + da));

    if (PRESSURE.test(s)) pressure += 1;
    if (GENERIC_ESCAPE.test(s)) generic += 1;

    let tscore = 1;
    if (AI_FILLER.test(s)) tscore -= 0.25;
    if (GENERIC_ESCAPE.test(s)) tscore -= 0.35;
    if (PRESSURE.test(s)) tscore -= 0.2;
    if (/[。…]\s*$/.test(s)) tscore += 0.1;
    tenmon += clamp01(tscore);

    const avgLen = parts.length ? len / parts.length : len;
    read += clamp01(1 - Math.min(1, Math.abs(avgLen - 52) / 90));
  }

  const n = samples.length;
  return {
    conclusion_first_rate: conclusion / n,
    one_paragraph_one_theme_rate: oneTheme / n,
    long_sentence_rate: longSent / n,
    politeness_consistency_score: polite / n,
    pressure_phrase_rate: pressure / n,
    generic_escape_rate: generic / n,
    tenmon_style_fit_score: tenmon / n,
    readability_score: read / n,
  };
}
