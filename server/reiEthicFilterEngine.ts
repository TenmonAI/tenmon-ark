/**
 * 霊核倫理フィルタエンジン（Rei-Ethic Filter Engine）
 * 
 * 誹謗中傷・スパム・詐欺・情報操作を自動検知し、
 * 霊核倫理スコアを計算して悪意テキストを中和する。
 * 
 * 天津金木の火水構造に基づく倫理判定：
 * - 火（陽）= 建設的・創造的・成長促進的な言葉
 * - 水（陰）= 破壊的・攻撃的・成長阻害的な言葉
 * 
 * 倫理スコア（0-100）:
 * - 90-100: 極めて建設的（火の極）
 * - 70-89: 建設的（火寄り）
 * - 50-69: 中立（火水バランス）
 * - 30-49: やや破壊的（水寄り）
 * - 10-29: 破壊的（水の極）
 * - 0-9: 極めて破壊的（闇）
 */

export interface EthicAnalysisResult {
  /** 倫理スコア（0-100） */
  ethicScore: number;
  /** 検知された脅威タイプ */
  detectedThreats: ThreatType[];
  /** 脅威の詳細 */
  threatDetails: ThreatDetail[];
  /** 火水バランス（-100〜100、正=火、負=水） */
  fireWaterBalance: number;
  /** 中和が必要かどうか */
  needsNeutralization: boolean;
  /** 中和後のテキスト（必要な場合のみ） */
  neutralizedText?: string;
  /** 判定理由 */
  reason: string;
}

export type ThreatType = 
  | "defamation"        // 誹謗中傷
  | "spam"              // スパム
  | "fraud"             // 詐欺
  | "manipulation"      // 情報操作
  | "hate_speech"       // ヘイトスピーチ
  | "violence"          // 暴力的表現
  | "sexual_content"    // 性的表現
  | "illegal_content";  // 違法コンテンツ

export interface ThreatDetail {
  type: ThreatType;
  severity: number; // 0-100
  matchedPatterns: string[];
  position?: { start: number; end: number };
}

/**
 * 誹謗中傷パターン（日本語・英語）
 */
const DEFAMATION_PATTERNS = [
  // 日本語
  /死ね|殺す|消えろ|くたばれ|クズ|ゴミ|カス|バカ|アホ|間抜け|無能|役立たず|価値がない/gi,
  /気持ち悪い|キモい|ブサイク|デブ|ハゲ|チビ/gi,
  // 英語
  /\b(die|kill|stupid|idiot|moron|loser|worthless|useless|ugly|disgusting)\b/gi,
  /\b(fuck|shit|damn|bitch|asshole|bastard)\b/gi,
];

/**
 * スパムパターン
 */
const SPAM_PATTERNS = [
  // 連続した同じ文字・記号
  /(.)\1{10,}/g,
  // 過剰な絵文字
  /([\uD800-\uDFFF]){10,}/g,
  // URLの過剰な繰り返し
  /(https?:\/\/[^\s]+\s*){5,}/gi,
  // 「今すぐクリック」系
  /今すぐ|クリック|登録|無料|稼げる|儲かる|限定|特別/gi,
  /\b(click|free|earn|money|limited|special|offer|now)\b/gi,
];

/**
 * 詐欺パターン
 */
const FRAUD_PATTERNS = [
  // 金銭要求
  /振込|送金|入金|口座|カード番号|暗証番号|パスワード/gi,
  /\b(transfer|payment|account|card number|password|pin)\b/gi,
  // 偽装
  /当選|賞金|プレゼント|無料|限定|特別オファー/gi,
  /\b(winner|prize|gift|free|limited|special offer)\b/gi,
];

/**
 * 情報操作パターン
 */
const MANIPULATION_PATTERNS = [
  // 断定的な虚偽
  /絶対|必ず|確実|100%|間違いない|真実は/gi,
  /\b(absolutely|definitely|certainly|100%|guaranteed|truth is)\b/gi,
  // 煽動
  /みんな|全員|誰も|常識|当然|普通/gi,
  /\b(everyone|nobody|always|never|obvious|common sense)\b/gi,
];

/**
 * テキストの倫理分析を実行
 */
export function analyzeEthics(text: string): EthicAnalysisResult {
  const threats: ThreatDetail[] = [];
  let totalSeverity = 0;

  // 誹謗中傷検知
  for (const pattern of DEFAMATION_PATTERNS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      const severity = Math.min(100, matches.length * 20);
      totalSeverity += severity;
      threats.push({
        type: "defamation",
        severity,
        matchedPatterns: matches,
      });
    }
  }

  // スパム検知
  for (const pattern of SPAM_PATTERNS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      const severity = Math.min(100, matches.length * 15);
      totalSeverity += severity;
      threats.push({
        type: "spam",
        severity,
        matchedPatterns: matches.map(m => m.substring(0, 50)),
      });
    }
  }

  // 詐欺検知
  for (const pattern of FRAUD_PATTERNS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      const severity = Math.min(100, matches.length * 25);
      totalSeverity += severity;
      threats.push({
        type: "fraud",
        severity,
        matchedPatterns: matches,
      });
    }
  }

  // 情報操作検知
  for (const pattern of MANIPULATION_PATTERNS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      const severity = Math.min(100, matches.length * 10);
      totalSeverity += severity;
      threats.push({
        type: "manipulation",
        severity,
        matchedPatterns: matches,
      });
    }
  }

  // 倫理スコア計算（0-100）
  // totalSeverityが高いほどスコアが低くなる
  const ethicScore = Math.max(0, 100 - totalSeverity);

  // 火水バランス計算
  // 火（建設的）= 正の値、水（破壊的）= 負の値
  const fireWaterBalance = ethicScore - 50;

  // 中和が必要かどうか（スコア50以下）
  const needsNeutralization = ethicScore < 50;

  // 検知された脅威タイプ
  const detectedThreats = Array.from(new Set(threats.map(t => t.type)));

  // 判定理由
  let reason = "";
  if (ethicScore >= 90) {
    reason = "極めて建設的で霊的に調和したテキストです。";
  } else if (ethicScore >= 70) {
    reason = "建設的で健全なテキストです。";
  } else if (ethicScore >= 50) {
    reason = "中立的なテキストです。";
  } else if (ethicScore >= 30) {
    reason = `やや破壊的な要素が含まれています。検知された脅威: ${detectedThreats.join(", ")}`;
  } else if (ethicScore >= 10) {
    reason = `破壊的な要素が多く含まれています。検知された脅威: ${detectedThreats.join(", ")}`;
  } else {
    reason = `極めて破壊的で危険なテキストです。検知された脅威: ${detectedThreats.join(", ")}`;
  }

  // 中和後のテキスト生成
  let neutralizedText: string | undefined;
  if (needsNeutralization) {
    neutralizedText = neutralizeText(text, threats);
  }

  return {
    ethicScore,
    detectedThreats,
    threatDetails: threats,
    fireWaterBalance,
    needsNeutralization,
    neutralizedText,
    reason,
  };
}

/**
 * 悪意テキストを中和（無害化）
 */
function neutralizeText(text: string, threats: ThreatDetail[]): string {
  let neutralized = text;

  // 誹謗中傷を中和
  for (const threat of threats) {
    if (threat.type === "defamation") {
      for (const pattern of threat.matchedPatterns) {
        // 攻撃的な言葉を「[削除済み]」に置換
        neutralized = neutralized.replace(new RegExp(pattern, "gi"), "[削除済み]");
      }
    }
  }

  // スパムを中和
  for (const threat of threats) {
    if (threat.type === "spam") {
      // 連続文字を短縮
      neutralized = neutralized.replace(/(.)\1{10,}/g, "$1$1$1");
      // 過剰な絵文字を削除
      neutralized = neutralized.replace(/([\uD800-\uDFFF]){10,}/g, "");
    }
  }

  // 詐欺を中和
  for (const threat of threats) {
    if (threat.type === "fraud") {
      for (const pattern of threat.matchedPatterns) {
        // 詐欺的な言葉を「[警告: 詐欺の可能性]」に置換
        neutralized = neutralized.replace(new RegExp(pattern, "gi"), "[警告: 詐欺の可能性]");
      }
    }
  }

  // 情報操作を中和
  for (const threat of threats) {
    if (threat.type === "manipulation") {
      // 断定的な表現を柔らかく
      neutralized = neutralized.replace(/絶対|必ず|確実|100%/gi, "おそらく");
      neutralized = neutralized.replace(/\b(absolutely|definitely|certainly|100%)\b/gi, "probably");
    }
  }

  return neutralized;
}

/**
 * 倫理フィルタを適用（自動中和）
 * スコアが閾値以下の場合、中和後のテキストを返す
 */
export function applyEthicFilter(
  text: string,
  threshold: number = 50
): { filtered: string; analysis: EthicAnalysisResult } {
  const analysis = analyzeEthics(text);
  
  if (analysis.ethicScore < threshold && analysis.neutralizedText) {
    return {
      filtered: analysis.neutralizedText,
      analysis,
    };
  }

  return {
    filtered: text,
    analysis,
  };
}

/**
 * バッチ処理用：複数テキストの倫理分析
 */
export function analyzeBatchEthics(texts: string[]): EthicAnalysisResult[] {
  return texts.map(text => analyzeEthics(text));
}

/**
 * 統計情報取得
 */
export function getEthicStatistics(analyses: EthicAnalysisResult[]): {
  averageScore: number;
  averageFireWaterBalance: number;
  threatCounts: Record<ThreatType, number>;
  neutralizationRate: number;
} {
  const totalScore = analyses.reduce((sum, a) => sum + a.ethicScore, 0);
  const totalBalance = analyses.reduce((sum, a) => sum + a.fireWaterBalance, 0);
  const neutralizationCount = analyses.filter(a => a.needsNeutralization).length;

  const threatCounts: Record<ThreatType, number> = {
    defamation: 0,
    spam: 0,
    fraud: 0,
    manipulation: 0,
    hate_speech: 0,
    violence: 0,
    sexual_content: 0,
    illegal_content: 0,
  };

  for (const analysis of analyses) {
    for (const threat of analysis.detectedThreats) {
      threatCounts[threat]++;
    }
  }

  return {
    averageScore: analyses.length > 0 ? totalScore / analyses.length : 0,
    averageFireWaterBalance: analyses.length > 0 ? totalBalance / analyses.length : 0,
    threatCounts,
    neutralizationRate: analyses.length > 0 ? neutralizationCount / analyses.length : 0,
  };
}
