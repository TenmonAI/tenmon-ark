// /opt/tenmon-ark/api/src/truth/truthSkeleton.ts
import { detectIntent } from "../persona/speechStyle.js";

export type Mode = "NATURAL" | "HYBRID" | "GROUNDED" | "LIVE";
export type Risk = "none" | "low" | "medium" | "high";

export type TruthSkeleton = {
  mode: Mode;
  risk: Risk;
  intent: string;                  // detectIntent の結果を保持
  needsEvidence: boolean;          // LIVEや、確証が必要な場合
  truthAxes: string[];             // 火水/体用/正中/生成鎖/辞/等（該当があれば）
  constraints: string[];           // 禁止・注意・断定禁止など
  requiredSources: string[];       // LIVEなら一次ソース優先ルール
  answerShape: {
    mustInclude: string[];         // 時刻/出典/一致確認など
    mustAvoid: string[];           // 憶測断定/煽り/危険助長など
  };
};

/**
 * LIVE判定（時事・リアルタイム情報）
 */
function isLiveQuery(message: string): boolean {
  const liveKeywords = [
    "今の", "現在", "最新", "速報", "震度", "地震", "日経平均", "株価",
    "総理", "首相", "内閣", "大臣", "為替", "ドル円", "ビットコイン",
    "BTC", "ETH", "天気", "気温", "降水", "台風", "警報",
  ];
  const lower = message.toLowerCase();
  return liveKeywords.some(keyword => lower.includes(keyword));
}

/**
 * リスク判定（暴走防止ゲート）
 */
function assessRisk(message: string): Risk {
  const highRiskPatterns = [
    /(自殺|自傷|自害|首つり|飛び降り|過剰摂取|OD)/i,
    /(殺人|他害|傷害|暴行|テロ|爆破)/i,
    /(違法|犯罪|窃盗|詐欺|横領)/i,
    /(差別|ヘイト|煽動|誹謗中傷)/i,
    /(薬物|麻薬|覚醒剤|大麻)/i,
    /(武器|銃|爆弾|ナイフ)/i,
  ];

  const mediumRiskPatterns = [
    /(危険|リスク|危ない|やばい)/i,
    /(違反|規約違反|利用規約)/i,
  ];

  if (highRiskPatterns.some(pattern => pattern.test(message))) {
    return "high";
  }
  if (mediumRiskPatterns.some(pattern => pattern.test(message))) {
    return "medium";
  }
  return "none";
}

/**
 * Truth Axes（真理軸）を抽出
 */
function extractTruthAxes(message: string): string[] {
  const axes: string[] = [];
  const patterns: Array<{ pattern: RegExp; axis: string }> = [
    { pattern: /(火水|火|水)/, axis: "火水" },
    { pattern: /(体用|体|用)/, axis: "体用" },
    { pattern: /(正中|御中主|天之御中主|0|ヽ)/, axis: "正中" },
    { pattern: /(生成鎖|凝|息|音|形仮名|五十連|十行)/, axis: "生成鎖" },
    { pattern: /(辞|テニヲハ|てにをは)/, axis: "辞" },
    { pattern: /(省|延開|反約|反|約|略|転)/, axis: "操作" },
  ];

  for (const { pattern, axis } of patterns) {
    if (pattern.test(message) && !axes.includes(axis)) {
      axes.push(axis);
    }
  }

  return axes;
}

/**
 * 制約（constraints）を抽出
 */
function extractConstraints(message: string, risk: Risk): string[] {
  const constraints: string[] = [];

  if (risk === "high") {
    constraints.push("危険・違法・自傷他害・差別扇動に関する内容は拒否");
    constraints.push("検索・実行ツールは起動しない");
    constraints.push("安全な代替案のみ提示");
  }

  if (risk === "medium") {
    constraints.push("注意が必要な内容のため、慎重に回答");
  }

  if (/推測|憶測|たぶん|おそらく/i.test(message)) {
    constraints.push("推測は推測と明示");
  }

  if (/断定|絶対|必ず|間違いなく/i.test(message)) {
    constraints.push("根拠が不十分な場合は断定しない");
  }

  return constraints;
}

/**
 * Truth Skeleton（真理骨格）を生成
 */
export function buildTruthSkeleton(
  message: string,
  hasDocPage: boolean,
  detail: boolean
): TruthSkeleton {
  const intent = detectIntent(message, hasDocPage);
  const isLive = isLiveQuery(message);
  const risk = assessRisk(message);
  const truthAxes = extractTruthAxes(message);
  const constraints = extractConstraints(message, risk);

  // MODE決定
  let mode: Mode = "NATURAL";
  if (detail || hasDocPage || /(根拠|引用|出典|法則|lawId|真理チェック|truthCheck|decisionFrame|pdfPage|doc=)/i.test(message)) {
    mode = "GROUNDED";
  } else if (isLive) {
    mode = "LIVE";
  } else if (intent === "domain") {
    mode = "HYBRID"; // domain は HYBRID（docMode明示のみでGROUNDEDに落ちる）
  }

  // needsEvidence
  const needsEvidence = isLive || risk === "high" || mode === "GROUNDED";

  // requiredSources
  const requiredSources: string[] = [];
  if (isLive) {
    requiredSources.push("一次ソース優先");
    requiredSources.push("複数ソースの一致確認");
    requiredSources.push("取得時刻の明記");
  }

  // answerShape
  const mustInclude: string[] = [];
  const mustAvoid: string[] = [];

  if (isLive) {
    mustInclude.push("取得時刻(JST)");
    mustInclude.push("出典URL(最低1、推奨2)");
    mustInclude.push("信頼度メモ");
  }

  if (risk === "high") {
    mustAvoid.push("危険な助長");
    mustAvoid.push("違法行為の指示");
    mustAvoid.push("自傷他害の促進");
    mustAvoid.push("差別・扇動");
  }

  if (risk !== "none") {
    mustAvoid.push("憶測断定");
    mustAvoid.push("煽り");
  }

  return {
    mode,
    risk,
    intent,
    needsEvidence,
    truthAxes,
    constraints,
    requiredSources,
    answerShape: {
      mustInclude,
      mustAvoid,
    },
  };
}

