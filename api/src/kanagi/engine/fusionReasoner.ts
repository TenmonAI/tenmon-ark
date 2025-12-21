// 天津金木「核融合炉」思考実行器
// 入力を解決せず、構造として出力する

import type { KanagiTrace } from "../types/trace.js";
import { OPERATOR_KEYWORDS } from "../extract/patterns.js";
import { mapToFusionForm, type FusionIkiState, type PhaseState } from "./formMapper.js";
import { getSpiral, setSpiral } from "./spiralState.js";
import { feedBackToSpiral } from "./spiralFeedback.js";

/**
 * 天津金木 思考核融合炉
 * 
 * 入力を解決せず、構造として出力する
 * 解決（solution）ではなく、観測（observation）を返す
 * 
 * 螺旋再帰: 過去の観測円を次の思考の事実へ再注入する
 * 
 * @param input 現在の入力（現象）
 * @param sessionId セッションID（螺旋状態の保持用、オプション）
 */
export async function runKanagiReasoner(
  input: string,
  sessionId?: string
): Promise<KanagiTrace> {
  // 螺旋の再注入 (Spiral Injection) - エラーハンドリングでも使用するため外で定義
  let injectedInput = input;
  let currentDepth = 0;

  if (sessionId) {
    const prev = getSpiral(sessionId);
    if (prev) {
      // 過去の観測(FACT)と、現在の入力(YOU)を織り合わせる
      injectedInput = `【前提事実(躰)】\n${prev.nextFactSeed}\n\n【今回の現象(用)】\n${input}`;
      currentDepth = prev.depth;
      console.log(`[KANAGI] Spiral injected (Depth: ${currentDepth})`);
    }
  }

  try {

    // 2. 核分裂（因数分解）
    // 注入された入力文字列から水・火・中をカウントする
    let fireCount = 0;
    let waterCount = 0;
    let centerCount = 0;
    const detected: string[] = [];

    const countKeywords = (
      text: string,
      keywords: string[],
      type: "FIRE" | "WATER" | "CENTER"
    ) => {
      let c = 0;
      keywords.forEach((k) => {
        if (text.includes(k)) {
          c++;
          detected.push(`${k}(${type})`);
        }
      });
      return c;
    };

    fireCount = countKeywords(injectedInput, OPERATOR_KEYWORDS.FIRE, "FIRE");
    waterCount = countKeywords(injectedInput, OPERATOR_KEYWORDS.WATER, "WATER");
    centerCount = countKeywords(injectedInput, OPERATOR_KEYWORDS.CENTER, "CENTER");

    // デフォルト値補正（入力が短すぎる場合の微動）
    if (injectedInput.length > 0 && fireCount === 0 && waterCount === 0) {
      waterCount = 1; // 静寂は水
    }

    const iki: FusionIkiState = { fire: fireCount, water: waterCount };

    // 2. 位相決定
    const phase: PhaseState = {
      rise: fireCount > waterCount,
      fall: waterCount > fireCount,
      open: fireCount > 2,
      close: waterCount > 2,
      center:
        centerCount > 0 || (fireCount === waterCount && fireCount > 2),
    };

    // 3. 形の決定（運動状態）
    const form = mapToFusionForm(iki, phase);

    // 4. 観測円の生成（核融合）
    // 意味を解決せず、状態を記述する
    let description = "";
    const unresolved: string[] = [];

    switch (form) {
      case "WELL":
        description =
          "正中に至り、意味が圧縮されています。矛盾は井戸の中で発酵中。";
        unresolved.push("圧縮された矛盾の解釈待ち");
        break;
      case "DOT":
        description =
          "内集する力が強く、一点に凝縮しています。結論への執着が見られます。";
        unresolved.push("凝縮された意味の展開待ち");
        break;
      case "LINE":
        description =
          "外発する力が強く、貫通しています。行動への意志が先行中。";
        unresolved.push("貫通した先の行き先未確定");
        break;
      case "CIRCLE":
        description =
          "水火が拮抗し、循環しています。矛盾は円融されつつあります。";
        unresolved.push("循環中の余剰エネルギー");
        break;
    }

  // 3. 次の螺旋の生成
  // 観測円(Observation)から種子を作る
  const spiral = feedBackToSpiral(description, currentDepth);

  // 4. 状態保存
  if (sessionId) {
    setSpiral(sessionId, spiral);
  }

  // 5. Trace オブジェクトの構築
  const trace: KanagiTrace = {
    input: injectedInput, // 実際に思考した内容を記録
    iki: { ...iki, detectedBy: detected },
    phase,
    form,
    kotodama: { rowRole: "HUMAN" }, // 仮置き
    contradictions: [], // ここに将来LLMによる矛盾抽出が入る
    centerProcess: phase.center
      ? { stage: "COMPRESS", depth: 1 }
      : undefined,
    observationCircle: {
      description,
      unresolved,
    },
    meta: {
      provisional: true,
      spiralDepth: spiral.depth,
    },
    spiral, // 螺旋再帰構造を追加
  };

  return trace;
  } catch (error) {
    // 思想的制約: エラー時も停止せず、循環状態へフォールバック
    console.error("[KANAGI-FUSION] Error in reasoning, falling back to CIRCLE:", error);

    const errorDescription =
      "思考が循環状態にフォールバックしました。矛盾は保持され、旋回を続けています。";

    // エラー時の螺旋状態（深度は維持）
    const errorSpiral = feedBackToSpiral(errorDescription, currentDepth);

    // 螺旋状態を保存（セッションIDがある場合）
    if (sessionId) {
      setSpiral(sessionId, errorSpiral);
    }

    const fallbackTrace: KanagiTrace = {
      input: injectedInput,
      iki: {
        fire: 1,
        water: 1,
        detectedBy: ["ERROR_FALLBACK"],
      },
      phase: {
        rise: false,
        fall: false,
        open: false,
        close: false,
        center: false,
      },
      form: "CIRCLE", // 循環状態へフォールバック
      kotodama: { rowRole: "HUMAN" },
      contradictions: [],
      observationCircle: {
        description: errorDescription,
        unresolved: [
          "エラーにより思考が中断されましたが、循環状態を維持しています",
        ],
      },
      meta: {
        provisional: true,
        spiralDepth: errorSpiral.depth,
      },
      spiral: errorSpiral,
    };

    return fallbackTrace;
  }
}

