/**
 * TENMON_TRUTH_STRUCTURE_REASONING_ENGINE_CURSOR_AUTO_V1
 * 一般会話・人生相談を fractal truth structure で裁定（answer 生成はしない）。
 * 一般 LLM 知識は補助層のみ。
 */

export type TruthStructureIssueV1 =
  | "center_loss"
  | "over_split"
  | "failed_binding"
  | "unfinished_formation"
  | "broken_circulation";

export type TruthStructureFlagsV1 = {
  centerLoss: boolean;
  overSplit: boolean;
  failedBinding: boolean;
  unfinishedFormation: boolean;
  brokenCirculation: boolean;
};

/** 返却バンドル（thoughtCoreSummary.truthStructureVerdict に載せる） */
export type TruthStructureVerdictV1 = {
  card: "TENMON_TRUTH_STRUCTURE_REASONING_ENGINE_CURSOR_AUTO_V1";
  version: 1;
  /** 主な構造欠損（裁定） */
  truthStructureVerdict: TruthStructureIssueV1 | null;
  structureFlags: TruthStructureFlagsV1;
  /** 修復でまず動かす軸 */
  repairAxis: string;
  /** 次に観測する軸（一段） */
  nextAxis: string;
  centerClaimHint: string;
  nextAxisHint: string;
  llmGeneralKnowledgeLayer: "auxiliary_only";
};

/** runtime 還元用の固定順（優先裁定） */
export const TRUTH_STRUCTURE_ISSUE_ORDER_V1: readonly TruthStructureIssueV1[] = [
  "center_loss",
  "over_split",
  "failed_binding",
  "unfinished_formation",
  "broken_circulation",
] as const;

const ISSUE_ORDER: TruthStructureIssueV1[] = [...TRUTH_STRUCTURE_ISSUE_ORDER_V1];

function detectFlags(msg: string): TruthStructureFlagsV1 {
  const m = msg;
  return {
    // acceptance: 人生相談・哲学・一般 mixed
    centerLoss: /迷い|芯|中心|ぶれ|どうしたら|決められない|迷子|見失|虚無|意味が|はじめに何を|生きる意味|孤独|不安/u.test(m),
    overSplit: /切り分け|二者択一|峻別|分断|完全に別|分けすぎ|どちらか/u.test(m),
    // acceptance: 技術相談（bind / formation）
    failedBinding:
      /繋がらない|結べない|噛み合わない|ちぐはぐ|対応が取れない|ミスマッチ|インターフェース|型が合わない|依存関係|コンパイル/u.test(m),
    unfinishedFormation: /未完成|定まらない|形に|輪郭|整理できない|まとまらない|設計が|アーキテクチャ|仕様が/u.test(m),
    brokenCirculation: /ループ|繰り返し|途切れ|続かない|一度きり|同じパターン|断絶|デプロイが毎回|リリースが/u.test(m),
  };
}

function pickPrimaryIssue(f: TruthStructureFlagsV1): TruthStructureIssueV1 | null {
  const map: Record<TruthStructureIssueV1, boolean> = {
    center_loss: f.centerLoss,
    over_split: f.overSplit,
    failed_binding: f.failedBinding,
    unfinished_formation: f.unfinishedFormation,
    broken_circulation: f.brokenCirculation,
  };
  for (const k of ISSUE_ORDER) {
    if (map[k]) return k;
  }
  return null;
}

function repairAndNext(issue: TruthStructureIssueV1 | null, phase: string): { repairAxis: string; nextAxis: string } {
  const table: Record<TruthStructureIssueV1, { repairAxis: string; nextAxis: string }> = {
    center_loss: {
      repairAxis: "center: いまの中心一句を固定",
      nextAxis: "次観測: ぶれの前後で何が変わったか",
    },
    over_split: {
      repairAxis: "split: 分離を一段緩め再接続",
      nextAxis: "次観測: 峻別の根拠が何か",
    },
    failed_binding: {
      repairAxis: "bind: 対応関係を一段だけ置く",
      nextAxis: "次観測: どこで噛み合わないか",
    },
    unfinished_formation: {
      repairAxis: "formation: 輪郭を一段だけ言語化",
      nextAxis: "次観測: 何が未確定か",
    },
    broken_circulation: {
      repairAxis: "circulation: 循環の入口を一つに",
      nextAxis: "次観測: 途切れの直前",
    },
  };
  if (issue && table[issue]) return table[issue];
  return {
    repairAxis: `observe:相=${phase}`,
    nextAxis: "次観測: 観測軸を一つに絞る",
  };
}

function detectPhase(msg: string, rr: string): string {
  if (/人生|恋愛|仕事|家族|悩み|相談|離婚|育児|人間関係|メンタル/u.test(msg)) return "life_dialogue";
  if (/哲学|存在論|存在|自由|倫理|死\b|虚無|意味は|意識\b/u.test(msg)) return "philosophy";
  if (/実装|API|コード|バグ|エラー|TypeScript|サーバ|デプロイ|ビルド|CI/u.test(msg)) return "technical";
  if (
    /法華|経典|言霊|古事記|神話|五十音|カタカムナ|水火|火水/u.test(msg) ||
    /SCRIPTURE|TENMON_SCRIPTURE|TRUTH_GATE|K1_TRACE/u.test(rr)
  ) {
    return "scripture_general_mixed";
  }
  return "general_inquiry";
}

/** 人生/技術相談の本文密度（finalize hint へ。裁定語彙を自然文で足す） */
function densityNudgeForIssueV1(issue: TruthStructureIssueV1 | null): string {
  switch (issue) {
    case "center_loss":
      return "中心を一文で固定し、次の軸で修復の手順を一段だけ立てる。";
    case "over_split":
      return "分断を一段緩め、結びと循環を一つに戻す。";
    case "failed_binding":
      return "結びの対応を一段だけ置き、ループの切り分けを次の軸で観測する。";
    case "unfinished_formation":
      return "輪郭を一段だけ言語化し、次の軸で形を立て直す。";
    case "broken_circulation":
      return "循環の入口を一つにし、修復の次の一手を一軸に絞る。";
    default:
      return "中心と軸を一つに絞り、修復の次の一手を一段だけ置く。";
  }
}

function buildHints(
  phase: string,
  issue: TruthStructureIssueV1 | null,
  repairAxis: string,
  nextAxis: string,
  routeReason: string,
): { centerClaimHint: string; nextAxisHint: string } {
  const rr = String(routeReason || "").trim();
  const mixedOrGeneral =
    phase === "scripture_general_mixed" ||
    /NATURAL_GENERAL|GENERAL_KNOWLEDGE|^GENERAL_/u.test(rr);
  const densityEligible =
    phase === "life_dialogue" ||
    phase === "technical" ||
    (phase === "general_inquiry" && /NATURAL_GENERAL|GENERAL_KNOWLEDGE_EXPLAIN_ROUTE/u.test(rr));
  let center = mixedOrGeneral ? "root_reasoning: " : "";
  center += `truth_structure:相=${phase}。`;
  if (issue) center += `verdict=${issue}。`;
  /** 裁定の自然文（中心/分断/結び/循環/修復）を repair ラベルより前に置き、240 字切りで落ちにくくする */
  if (densityEligible && issue) {
    center += `${densityNudgeForIssueV1(issue)} `;
  }
  center += repairAxis.slice(0, 120);
  if (center.length > 240) center = center.slice(0, 237) + "...";
  let next = `次軸: ${nextAxis}`;
  if (mixedOrGeneral) next = `root_reasoning: ${next}`;
  return { centerClaimHint: center.trim(), nextAxisHint: next.slice(0, 240).trim() };
}

/** automation / seal 用 */
export function getTruthStructureReasoningEngineSealPayloadV1(): {
  card: "TENMON_TRUTH_STRUCTURE_REASONING_ENGINE_CURSOR_AUTO_V1";
  truth_structure_reasoning_ready: true;
  verdict_projection_ready: true;
  issue_axes: readonly TruthStructureIssueV1[];
  llm_layer: "auxiliary_only";
} {
  return {
    card: "TENMON_TRUTH_STRUCTURE_REASONING_ENGINE_CURSOR_AUTO_V1",
    truth_structure_reasoning_ready: true,
    verdict_projection_ready: true,
    issue_axes: TRUTH_STRUCTURE_ISSUE_ORDER_V1,
    llm_layer: "auxiliary_only",
  };
}

/**
 * 空・極短は null（fail-closed）。それ以外は裁定バンドルを返す。
 */
export function resolveTruthStructureVerdictV1(message: string, routeReason?: string): TruthStructureVerdictV1 | null {
  const msg = String(message || "").replace(/\s+/gu, " ").trim();
  if (msg.length < 2) return null;

  const rr = String(routeReason || "").trim();
  const phase = detectPhase(msg, rr);
  const structureFlags = detectFlags(msg);
  let truthStructureVerdict = pickPrimaryIssue(structureFlags);
  if (!truthStructureVerdict && msg.length >= 4) {
    truthStructureVerdict = "center_loss";
  }

  const { repairAxis, nextAxis } = repairAndNext(truthStructureVerdict, phase);
  const { centerClaimHint, nextAxisHint } = buildHints(phase, truthStructureVerdict, repairAxis, nextAxis, rr);

  return {
    card: "TENMON_TRUTH_STRUCTURE_REASONING_ENGINE_CURSOR_AUTO_V1",
    version: 1,
    truthStructureVerdict,
    structureFlags,
    repairAxis,
    nextAxis,
    centerClaimHint,
    nextAxisHint,
    llmGeneralKnowledgeLayer: "auxiliary_only",
  };
}
