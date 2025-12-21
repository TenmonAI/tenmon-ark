// 天津金木 Dialectic Drive（LLM矛盾生成＋統合）

import { callLLMJSON } from "../core/llm.js";

/**
 * 弁証核の結果
 */
export type DialecticResult = {
  thesis: string; // 肯定（テーゼ）
  antithesis: string; // 否定（アンチテーゼ）
  centerSeed: {
    common: string; // 共通項
    differences: string; // 決定的差異
    tension: string; // 緊張点
  };
  observationCircle: string; // 観測円（視座） - 結論ではない
  unresolvedTensions: string[]; // 未解決の緊張
};

/**
 * 矛盾生成のLLM応答形式
 */
type ContradictionResponse = {
  thesis: string;
  antithesis: string;
};

/**
 * 正中圧縮のLLM応答形式
 */
type CenterCompressionResponse = {
  common: string;
  differences: string;
  tension: string;
};

/**
 * 観測円のLLM応答形式
 */
type ObservationCircleResponse = {
  observationCircle: string;
  unresolvedTensions: string[];
};

/**
 * ================================
 * Dialectic Drive 本体
 * ================================
 * 
 * 入力から矛盾を生成し、正中で圧縮し、統合する
 */
export async function runDialecticDrive(input: string): Promise<DialecticResult | null> {
  console.log("[DIALECTIC] start", { input: input.substring(0, 50) });

  // Step 1: 矛盾生成（Thesis / Antithesis）
  const contradictions = await generateContradictions(input);
  if (!contradictions) {
    console.log("[DIALECTIC] generateContradictions failed, returning null");
    return null;
  }

  // Step 2: 正中圧縮（Center Compression）
  const centerSeed = await centerCompression(contradictions.thesis, contradictions.antithesis);
  if (!centerSeed) {
    console.log("[DIALECTIC] centerCompression failed, returning null");
    return null;
  }

  // Step 3: 観測円の生成（統合ではない）
  const observation = await generateObservationCircle(centerSeed, contradictions.thesis, contradictions.antithesis);
  if (!observation) {
    console.log("[DIALECTIC] generateObservationCircle failed, returning null");
    return null;
  }

  const result: DialecticResult = {
    thesis: contradictions.thesis,
    antithesis: contradictions.antithesis,
    centerSeed,
    observationCircle: observation.observationCircle,
    unresolvedTensions: observation.unresolvedTensions,
  };

  console.log("[DIALECTIC] done");
  return result;
}

/**
 * Step 1: 矛盾生成
 * 
 * LLMに「肯定（Thesis）」「否定（Antithesis）」を生成させる
 */
async function generateContradictions(input: string): Promise<ContradictionResponse | null> {
  const prompt = `以下の入力について、肯定（Thesis）と否定（Antithesis）の2つの対立する解釈を生成してください。

入力: ${input}

以下のJSON形式で応答してください：
{
  "thesis": "肯定的な解釈（テーゼ）",
  "antithesis": "否定的な解釈（アンチテーゼ）"
}`;

  const response = await callLLMJSON<ContradictionResponse>(prompt);
  return response;
}

/**
 * Step 2: 正中圧縮
 * 
 * LLMに「共通項」「決定的差異」「緊張点」を生成させる
 */
async function centerCompression(
  thesis: string,
  antithesis: string
): Promise<DialecticResult["centerSeed"] | null> {
  const prompt = `以下の2つの対立する解釈について、正中（CENTER）での圧縮を行ってください。

テーゼ（肯定）: ${thesis}
アンチテーゼ（否定）: ${antithesis}

以下のJSON形式で応答してください：
{
  "common": "両者の共通項",
  "differences": "決定的な差異",
  "tension": "緊張点（矛盾の核心）"
}`;

  const response = await callLLMJSON<CenterCompressionResponse>(prompt);
  return response;
}

/**
 * Step 3: 観測円の生成
 * 
 * LLMに「新しい観測円（視座）」を描写させる
 * 結論を出さず、現在の観測位置を描写する
 */
async function generateObservationCircle(
  centerSeed: DialecticResult["centerSeed"],
  thesis: string,
  antithesis: string
): Promise<{ observationCircle: string; unresolvedTensions: string[] } | null> {
  const prompt = `以下の矛盾について、結論を出さず、現在の観測位置（視座）を描写してください。

テーゼ（肯定）: ${thesis}
アンチテーゼ（否定）: ${antithesis}
共通項: ${centerSeed.common}
決定的差異: ${centerSeed.differences}
緊張点: ${centerSeed.tension}

重要：
- 結論を出さないこと
- 矛盾を解決しないこと
- 現在の観測位置を描写すること
- 未解決の緊張を明示すること

以下のJSON形式で応答してください：
{
  "observationCircle": "現在の観測位置を描写する文（結論ではない）",
  "unresolvedTensions": ["未解決の緊張1", "未解決の緊張2"]
}`;

  const response = await callLLMJSON<ObservationCircleResponse>(prompt);
  if (!response) {
    return null;
  }
  
  return {
    observationCircle: response.observationCircle,
    unresolvedTensions: response.unresolvedTensions || [],
  };
}

/**
 * 決定論的フォールバック
 * 
 * LLMが失敗した場合の代替処理
 * 結論を出さず、観測円を描写する
 */
export function deterministicFallback(thesis: string, antithesis: string): DialecticResult {
  return {
    thesis,
    antithesis,
    centerSeed: {
      common: "両方の視点が存在する",
      differences: `${thesis.substring(0, 50)}... と ${antithesis.substring(0, 50)}... の対立`,
      tension: "矛盾を排除せず、両方を保持する必要がある",
    },
    observationCircle: `一方で、${thesis.substring(0, 100)}。\n\n他方で、${antithesis.substring(0, 100)}。\n\nこれらの矛盾は織りなされ、旋回し、上昇している。現在の観測位置からは、両方の視点が同時に存在していることが見える。`,
    unresolvedTensions: [
      "肯定と否定の対立は未解決のまま保持される",
      "矛盾は溶け合わず、共旋上昇している",
    ],
  };
}

