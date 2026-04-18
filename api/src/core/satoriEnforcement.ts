/**
 * SATORI_ENFORCEMENT_V1
 * 悟り判定エンジン: OMEGA 契約 (Ω = D・ΔS) の実行時強制
 *
 * 機能:
 *   1. 応答テキストの OMEGA 契約違反検出
 *   2. 4PHI 思考フレーム (SENSE→NAME→ONE_STEP→NEXT_DOOR) の適用判定
 *   3. truth_axis 2軸以上の明示保証
 *   4. 憶測・捏造・汎用AI語の検出と抑制
 *   5. 悟りスコア算出 (0.0-1.0)
 *
 * 設計方針:
 *   - 既存の __tenmonGeneralGateSoft / __tenmonSupportSanitizeV1 と共存
 *   - 破壊的変更なし: 違反検出は警告ログ + スコア付与のみ
 *   - chat.ts の res.json ラッパー内で呼び出し
 *   - tenmonFormatEnforcer.ts の後に実行
 */

// ============================================================
// §1 OMEGA 契約定義 (OMEGA_CONTRACT_v1.txt 準拠)
// ============================================================
export const OMEGA_CONTRACT = {
  formula: "Ω = D・ΔS",
  d_rules: [
    "憶測禁止",
    "decisionFrame.ku は常に object",
    "Evidence は doc/pdfPage 実在のみ",
    "GROUNDED 捏造禁止",
    "LLM 既定禁止（許可ゲートのみ）",
    "kokuzo_pages 正文の自動改変禁止",
  ],
  deltaS_rules: [
    "入力と前状態の差分を水（現象）/火（動因）/正中（判断軸）/澄濁方向として読む",
  ],
  omega_rules: [
    "応答・提案・手順・カードは D を通した生成のみ",
  ],
} as const;

// ============================================================
// §2 4PHI 思考フレーム
// ============================================================
export const FOUR_PHI_STEPS = [
  "SENSE",      // 感知: 入力の本質を捉える
  "NAME",       // 命名: 現象に名前を与える
  "ONE_STEP",   // 一歩: 具体的な次の行動を示す
  "NEXT_DOOR",  // 次扉: 次の展開への道を開く
] as const;

export type FourPhiStep = (typeof FOUR_PHI_STEPS)[number];

// ============================================================
// §3 違反パターン定義
// ============================================================

/** 憶測・汎用AI語パターン */
const SPECULATION_PATTERNS: Array<{ pattern: RegExp; severity: "high" | "medium" | "low"; label: string }> = [
  { pattern: /〜とされ(てい)?ます/g, severity: "high", label: "passive_hearsay" },
  { pattern: /〜と言われ(てい)?ます/g, severity: "high", label: "passive_hearsay" },
  { pattern: /一般的には/g, severity: "high", label: "generic_escape" },
  { pattern: /人それぞれ/g, severity: "high", label: "generic_escape" },
  { pattern: /価値観/g, severity: "medium", label: "relativism" },
  { pattern: /時と場合/g, severity: "medium", label: "relativism" },
  { pattern: /状況や視点/g, severity: "medium", label: "relativism" },
  { pattern: /可能性があります/g, severity: "medium", label: "hedge" },
  { pattern: /かもしれません/g, severity: "medium", label: "hedge" },
  { pattern: /おそらく/g, severity: "medium", label: "hedge" },
  { pattern: /多分/g, severity: "medium", label: "hedge" },
  { pattern: /私はAI/g, severity: "high", label: "self_disclosure" },
  { pattern: /AIとして/g, severity: "high", label: "self_disclosure" },
  { pattern: /データに基づ/g, severity: "low", label: "data_hedge" },
  { pattern: /統計的には/g, severity: "low", label: "data_hedge" },
  { pattern: /無理せず/g, severity: "medium", label: "generic_comfort" },
  { pattern: /少しずつ/g, severity: "low", label: "generic_comfort" },
];

/** 捏造パターン（存在しない典拠の生成） */
const FABRICATION_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /doc=FAKE|doc=UNKNOWN|doc=GENERATED/gi, label: "fake_doc" },
  { pattern: /pdfPage=0\b/g, label: "zero_page" },
  { pattern: /『[^』]{20,}』/g, label: "long_quote_suspect" },
];

// ============================================================
// §4 悟り判定結果型
// ============================================================
export interface SatoriVerdict {
  /** 悟りスコア (0.0-1.0, 1.0 = 完全悟り) */
  score: number;
  /** 検出された違反 */
  violations: Array<{
    type: "speculation" | "fabrication" | "missing_axis" | "missing_phi";
    label: string;
    severity: "high" | "medium" | "low";
    count: number;
  }>;
  /** 4PHI 適用状態 */
  fourPhi: {
    detected: FourPhiStep[];
    missing: FourPhiStep[];
    complete: boolean;
  };
  /** truth_axis 明示状態 */
  truthAxis: {
    mentioned: string[];
    count: number;
    sufficient: boolean; // 2軸以上
  };
  /** OMEGA 契約準拠度 */
  omegaCompliant: boolean;
}

// ============================================================
// §5 4PHI 検出
// ============================================================
const FOUR_PHI_INDICATORS: Record<FourPhiStep, string[]> = {
  SENSE: [
    "見立て", "読み", "感じ", "捉え", "察し",
    "状態", "偏り", "歪み", "失調", "サイン",
  ],
  NAME: [
    "これは", "つまり", "本質は", "核心は", "要は",
    "名づけ", "定義", "意味", "構造",
  ],
  ONE_STEP: [
    "一歩", "まず", "今すぐ", "最初に", "手放す",
    "選ぶ", "決める", "向き合う", "始める",
  ],
  NEXT_DOOR: [
    "次に", "その先", "展開", "可能性", "道",
    "扉", "方向", "向かう", "開く",
  ],
};

function detectFourPhi(text: string): { detected: FourPhiStep[]; missing: FourPhiStep[] } {
  const detected: FourPhiStep[] = [];
  const missing: FourPhiStep[] = [];

  for (const step of FOUR_PHI_STEPS) {
    const indicators = FOUR_PHI_INDICATORS[step];
    const found = indicators.some(kw => text.includes(kw));
    if (found) {
      detected.push(step);
    } else {
      missing.push(step);
    }
  }

  return { detected, missing };
}

// ============================================================
// §6 truth_axis 検出（簡易版、truthAxisEngine.ts と連携）
// ============================================================
const TRUTH_AXIS_KEYWORDS: Record<string, string[]> = {
  cycle: ["循環", "巡り", "回帰", "サイクル"],
  polarity: ["水火", "イキ", "陰陽", "対極", "澄濁"],
  center: ["正中", "まなか", "中心", "ゝ"],
  breath: ["息", "呼吸", "吐納", "氣"],
  carami: ["カラミ", "絡み", "交合", "結合"],
  order: ["秩序", "配列", "五十連", "序列"],
  correspondence: ["対応", "照応", "写像", "フラクタル"],
  manifestation: ["顕現", "形", "発現", "生成"],
  purification: ["浄化", "禊", "澄", "祓"],
  governance: ["統治", "君位", "高天原", "主宰"],
};

function detectTruthAxes(text: string): string[] {
  const found: string[] = [];
  for (const [axis, keywords] of Object.entries(TRUTH_AXIS_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      found.push(axis);
    }
  }
  return found;
}

// ============================================================
// §7 メイン判定関数
// ============================================================

/**
 * 応答テキストの悟り判定を実行する
 *
 * @param response - 応答テキスト
 * @param routeReason - ルート理由（NATURAL_GENERAL_LLM_TOP等）
 * @returns SatoriVerdict
 */
export function judgeSatori(
  response: string,
  routeReason?: string
): SatoriVerdict {
  if (!response || typeof response !== "string") {
    return {
      score: 0,
      violations: [],
      fourPhi: { detected: [], missing: [...FOUR_PHI_STEPS], complete: false },
      truthAxis: { mentioned: [], count: 0, sufficient: false },
      omegaCompliant: false,
    };
  }

  const violations: SatoriVerdict["violations"] = [];

  // ---- 憶測パターン検出 ----
  for (const spec of SPECULATION_PATTERNS) {
    const matches = response.match(spec.pattern);
    if (matches && matches.length > 0) {
      violations.push({
        type: "speculation",
        label: spec.label,
        severity: spec.severity,
        count: matches.length,
      });
    }
  }

  // ---- 捏造パターン検出 ----
  for (const fab of FABRICATION_PATTERNS) {
    const matches = response.match(fab.pattern);
    if (matches && matches.length > 0) {
      violations.push({
        type: "fabrication",
        label: fab.label,
        severity: "high",
        count: matches.length,
      });
    }
  }

  // ---- 4PHI 検出 ----
  const phi = detectFourPhi(response);
  if (phi.missing.length > 0 && response.length > 200) {
    // 長い応答で 4PHI が不完全な場合のみ警告
    violations.push({
      type: "missing_phi",
      label: `missing_${phi.missing.join("_")}`,
      severity: "low",
      count: phi.missing.length,
    });
  }

  // ---- truth_axis 検出 ----
  const axes = detectTruthAxes(response);
  if (axes.length < 2 && response.length > 200) {
    violations.push({
      type: "missing_axis",
      label: `only_${axes.length}_axes`,
      severity: "medium",
      count: 1,
    });
  }

  // ---- スコア算出 ----
  let score = 1.0;
  for (const v of violations) {
    if (v.severity === "high") score -= 0.15 * v.count;
    else if (v.severity === "medium") score -= 0.08 * v.count;
    else score -= 0.03 * v.count;
  }
  // 4PHI ボーナス
  score += phi.detected.length * 0.05;
  // truth_axis ボーナス
  score += Math.min(axes.length, 4) * 0.03;

  score = Math.max(0, Math.min(1, score));

  // ---- OMEGA 準拠判定 ----
  const hasHighViolation = violations.some(v => v.severity === "high");
  const omegaCompliant = !hasHighViolation && axes.length >= 2;

  return {
    score: Math.round(score * 100) / 100,
    violations,
    fourPhi: {
      detected: phi.detected,
      missing: phi.missing,
      complete: phi.missing.length === 0,
    },
    truthAxis: {
      mentioned: axes,
      count: axes.length,
      sufficient: axes.length >= 2,
    },
    omegaCompliant,
  };
}

// ============================================================
// §8 chat.ts 統合用ヘルパー
// ============================================================

/**
 * decisionFrame.ku に悟り判定結果を注入する
 *
 * 使い方 (chat.ts の res.json ラッパー内):
 * ```
 * import { attachSatoriVerdict } from "../core/satoriEnforcement.js";
 * // ...
 * attachSatoriVerdict(obj);
 * ```
 */
export function attachSatoriVerdict(obj: any): void {
  if (!obj || typeof obj !== "object") return;

  const response = (obj as any).response;
  if (typeof response !== "string") return;

  const df = (obj as any).decisionFrame;
  if (!df || typeof df !== "object") return;

  const ku = df.ku && typeof df.ku === "object" ? df.ku : {};
  df.ku = ku;

  const routeReason = String(ku.routeReason || "");
  const verdict = judgeSatori(response, routeReason);

  // 悟り判定結果を ku に注入
  ku.satoriVerdict = {
    score: verdict.score,
    omegaCompliant: verdict.omegaCompliant,
    violationCount: verdict.violations.length,
    highViolations: verdict.violations.filter(v => v.severity === "high").length,
    fourPhiComplete: verdict.fourPhi.complete,
    truthAxisCount: verdict.truthAxis.count,
    truthAxisSufficient: verdict.truthAxis.sufficient,
  };

  // 高重要度違反がある場合はログ出力
  if (verdict.violations.some(v => v.severity === "high")) {
    console.warn(
      `[SATORI] OMEGA violation detected: score=${verdict.score}, violations=${JSON.stringify(
        verdict.violations.filter(v => v.severity === "high").map(v => v.label)
      )}`
    );
  }
}
