import fs from "node:fs";
import path from "node:path";

export type IrohaActionPattern = {
  actionKey: string;
  displayName: string;
  aliases: string[];
  short_definition: string;
  standard_definition: string;
  negative_definition: string;
  trigger_signals: string[];
  next_step_style: string;
  related_axes: string[];
  confidence_hint: number;
};

type IrohaActionPatternsCanon = {
  schema: string;
  updated_at: string;
  locale: string;
  source_notes?: string[];
  patterns: IrohaActionPattern[];
};

export type IrohaCounselClassificationResult = {
  actionKey: string;
  displayName: string;
  confidence: number;
  matchedSignals: string[];
  nextStepStyle: string | null;
};

let __irohaPatternsCache: IrohaActionPatternsCanon | null = null;

function irohaCanonPath(): string {
  // canon は repo ルート直下 `canon/` にある想定
  return path.resolve(process.cwd(), "../canon/tenmon_iroha_action_patterns_v1.json");
}

/**
 * TENMON_IROHA_ACTION_PATTERNS_V1 を読み込む。失敗時は空パターンで返す（会話は落とさない）。
 */
export function loadIrohaActionPatterns(): IrohaActionPatternsCanon {
  if (__irohaPatternsCache) return __irohaPatternsCache;
  try {
    const canonPath = irohaCanonPath();
    const raw = fs.readFileSync(canonPath, "utf-8");
    const json = JSON.parse(raw) as IrohaActionPatternsCanon;
    if (!json || !Array.isArray(json.patterns)) {
      throw new Error("invalid iroha action patterns canon");
    }
    __irohaPatternsCache = json;
    return json;
  } catch (_) {
    __irohaPatternsCache = {
      schema: "TENMON_IROHA_ACTION_PATTERNS_V1",
      updated_at: "",
      locale: "ja-JP",
      source_notes: [],
      patterns: [],
    };
    return __irohaPatternsCache;
  }
}

const KEYWORD_RULES: Record<string, RegExp[]> = {
  organize: [
    /整理/u,
    /片付け/u,
    /片づけ/u,
    /混乱/u,
    /頭の中/u,
    /どう整理/u,
  ],
  defer: [
    /保留/u,
    /まだ決めない/u,
    /決められないから寝かせる/u,
    /寝かせる/u,
    /様子を見る/u,
  ],
  cut: [
    /断つ/u,
    /やめる/u,
    /やめたい/u,
    /切る/u,
    /距離を置/u,
  ],
  entrust: [
    /任せる/u,
    /委ねる/u,
    /委ねたい/u,
    /流れに任せる/u,
  ],
  discern: [
    /見極める/u,
    /どちらがいい/u,
    /どちらが正しい/u,
    /どちら/u,
    /判断/u,
    /中心/u,
    /落ち込んでいる/u,
    /落ち込んでいます/u,
    /落ち込んでて/u,
    /全部ずれて見える/u,
    /全部ずれてる/u,
    /ずれて見える/u,
  ],
  inherit: [
    /継承/u,
    /受け継ぐ/u,
    /受け継い/u,
    /渡す/u,
    /残す/u,
  ],
};

/**
 * 入力テキストをいろは行動パターンに分類する（pure 判定）。
 * マッチが無い場合は null を返す。
 */
export function classifyIrohaCounselInput(input: string): IrohaCounselClassificationResult | null {

  // R10_DEFER_SIGNAL_COVERAGE_V1: 「整理 or 保留」問いは defer を優先で返す
  if (/保留/.test(input) && /整理/.test(input)) {
    return {
      actionKey: "defer",
      displayName: "保留する",
      confidence: 0.78,
      matchedSignals: ["/整理/u", "/保留/u"]
    };
  }
  const text = String(input || "").trim();
  if (!text) return null;

  const canon = loadIrohaActionPatterns();
  if (!canon.patterns.length) return null;

  let best: IrohaCounselClassificationResult | null = null;

  for (const pattern of canon.patterns) {
    const rules = KEYWORD_RULES[pattern.actionKey];
    if (!rules || !rules.length) continue;

    const matchedSignals: string[] = [];
    for (const re of rules) {
      if (re.test(text)) {
        matchedSignals.push(String(re));
      }
    }

    if (!matchedSignals.length) continue;

    const confidence = typeof pattern.confidence_hint === "number"
      ? pattern.confidence_hint
      : 0.5;

    const result: IrohaCounselClassificationResult = {
      actionKey: pattern.actionKey,
      displayName: pattern.displayName,
      confidence,
      matchedSignals,
      nextStepStyle: pattern.next_step_style ?? null,
    };

    if (!best || result.confidence > best.confidence) {
      best = result;
    }
  }

  return best;
}

/**
 * 入力テキストから actionKey を推定し、対応するパターン本体と classification 情報を返す。
 */
export function resolveIrohaActionPattern(input: string): {
  pattern: IrohaActionPattern | null;
  classification: IrohaCounselClassificationResult | null;
} {
  const classification = classifyIrohaCounselInput(input);
  if (!classification) {
    return { pattern: null, classification: null };
  }

  const canon = loadIrohaActionPatterns();
  const pattern = canon.patterns.find((p) => p.actionKey === classification.actionKey) ?? null;
  return { pattern, classification };
}

