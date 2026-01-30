// 天津金木「核融合炉」思考実行器
// 入力を解決せず、構造として出力する

import type { KanagiTrace } from "../types/trace.js";
import { OPERATOR_KEYWORDS } from "../extract/patterns.js";
import { mapToFusionForm, type FusionIkiState, type PhaseState } from "./formMapper.js";
import { getSpiral, setSpiral } from "./spiralState.js";
import { feedBackToSpiral } from "./spiralFeedback.js";
import { assignTokenRoles } from "./tokenRoleAssigner.js";
import { detectLoop } from "./loopDetector.js";
import {
  startFermentation,
  getFermentation,
  releaseFermentation,
} from "./fermentationStore.js";
import { generateContradiction } from "../llm/dialecticLLM.js";
import { extractSounds, matchPatterns } from "./soundExtractor.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// 五十音パターンデータを読み込む
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const patternsPath = join(__dirname, "../../../../shared/kanagi/amatsuKanagi50Patterns.json");
let patternsData: any = null;
try {
  const patternsContent = readFileSync(patternsPath, "utf-8");
  patternsData = JSON.parse(patternsContent);
} catch (error) {
  console.warn("[KANAGI] Failed to load patterns data:", error);
  patternsData = { patterns: [] };
}

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

    // CENTER 発酵ログが存在する場合、優先的に躰として注入
    const fermentation = getFermentation(sessionId);
    if (fermentation && fermentation.state === "FERMENTING") {
      injectedInput = `
【前提事実（躰｜発酵中）】
未解決矛盾数: ${fermentation.contradictions.length}
発酵時間: ${fermentation.elapsed}ms
未解放エネルギー: ${fermentation.unresolvedEnergy}

【今回の現象（用）】
${input}
`.trim();

      console.log(
        "[KANAGI-CENTER] Fermentation injected",
        sessionId
      );
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

    // PHASE 4: 五十音パターンの「動き」をエネルギー補正に反映
    const sounds = extractSounds(input);
    const patternHits = matchPatterns(sounds, patternsData.patterns || []);
    
    // 動き（Movements）から fire/water を補正
    let movementFire = 0;
    let movementWater = 0;
    for (const hit of patternHits) {
      for (const movement of hit.movements) {
        if (movement.includes("外発")) movementFire++;
        if (movement.includes("内集")) movementWater++;
      }
    }
    
    // 補正値を加算（既存のカウントに上乗せ）
    fireCount += movementFire;
    waterCount += movementWater;

    // デフォルト値補正（入力が短すぎる場合の微動）
    if (injectedInput.length > 0 && fireCount === 0 && waterCount === 0) {
      waterCount = 1; // 静寂は水
    }

    const iki: FusionIkiState = { fire: fireCount, water: waterCount };

    // Token 単位の役割割当（形態素解析ベース）
    const assignments = await assignTokenRoles(input);

    // --- LOOP DETECTION (執着検知) ---
    let loopInfo = { loopDetected: false, count: 0 };

    if (sessionId) {
      const roles = assignments.map(a => a.role);
      loopInfo = detectLoop(sessionId, input, roles);

      if (loopInfo.loopDetected) {
        // 思考停止ではなく「正中へ戻す」
        console.log(`[KANAGI] Loop detected (count: ${loopInfo.count}), forcing CENTER`);
      }
    }

    // 2. 位相決定
    const phase: PhaseState = {
      rise: fireCount > waterCount,
      fall: waterCount > fireCount,
      open: fireCount > 2,
      close: waterCount > 2,
      center:
        loopInfo.loopDetected || // ループ検知時は強制的に CENTER
        centerCount > 0 || 
        (fireCount === waterCount && fireCount > 2),
    };

    // PHASE 5: 霊（Hi）の最小導入
    // CENTERが一定条件を超えたら spirit を立てる
    let spiritCount = 0;
    if (phase.center && centerCount >= 2) {
      spiritCount = 1; // 正中が深い場合に霊を立てる
    }

    // ===== 矛盾生成フェーズ（LLM） =====
    // 過去の矛盾を保持（発酵ログから取得、または既存の矛盾）
    let contradictions: Array<{
      thesis: string;
      antithesis: string;
      tensionLevel: number;
    }> = [];

    // 発酵ログから既存の矛盾を取得
    if (sessionId) {
      const fermentation = getFermentation(sessionId);
      if (fermentation && fermentation.contradictions.length > 0) {
        contradictions = fermentation.contradictions.map(c => ({
          thesis: c.thesis,
          antithesis: c.antithesis,
          tensionLevel: c.tension,
        }));
      }
    }

    // LLM で新しい矛盾を生成（CENTER または Spiral 時に実行）
    // [SAFETY] Runtime LLM usage is strictly prohibited - generateContradiction always returns null
    try {
      const result = await generateContradiction(injectedInput);

      if (result) {
        contradictions.push({
          thesis: result.thesis,
          antithesis: result.antithesis,
          tensionLevel: result.tension,
        });
      }
    } catch (e) {
      // [SAFETY] Runtime LLM errors are suppressed (no logging)
    }

    // CENTER に入った場合、発酵を開始
    if (phase.center && sessionId) {
      startFermentation(sessionId, {
        sessionId,
        contradictions: contradictions.map(c => ({
          thesis: c.thesis,
          antithesis: c.antithesis,
          tension: c.tensionLevel,
        })),
        assignments,
        centerDepth: currentDepth + 1,
        unresolvedEnergy: Math.abs(iki.fire - iki.water) + centerCount,
      });

      console.log(
        "[KANAGI-CENTER] Fermentation started",
        sessionId
      );
    }

    // CENTER から離脱したら発酵を解放
    if (!phase.center && sessionId) {
      const released = releaseFermentation(sessionId);
      if (released) {
        console.log(
          "[KANAGI-CENTER] Fermentation released",
          sessionId
        );
      }
    }

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

  // PHASE 3: 五十音パターンの照合（既に上で抽出済み）
  // sounds と patternHits は上で既に計算済み

  // 5. Trace オブジェクトの構築
  const trace: KanagiTrace = {
    input: injectedInput, // 実際に思考した内容を記録
    iki: { ...iki, detectedBy: detected },
    phase: {
      center: phase.center,
      rise: phase.rise,
      fall: phase.fall,
      open: phase.open,
      close: phase.close,
    },
    form,
    kotodama: {
      rowRole: "HUMAN", // 仮置き
      hits: patternHits,
      top: patternHits.length > 0 ? patternHits[0] : undefined,
    },
      contradictions, // LLM で生成された矛盾（過去の矛盾も保持）
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
      // 新形式のフィールド（後方互換性のためオプショナル）
      taiyou: {
        fire: iki.fire,
        water: iki.water,
        spirit: spiritCount > 0 ? spiritCount : undefined, // PHASE 5: 霊（Hi）
        assignments,
        evidence: detected,
      },
      provisional: true,
      violations: [],
      loop: {
        detected: loopInfo.loopDetected,
        count: loopInfo.count,
      },
    };

    // 発酵状態を trace に追加
    const fermentation = sessionId
      ? getFermentation(sessionId)
      : null;

    trace.fermentation = fermentation
      ? {
          active: fermentation.state === "FERMENTING",
          elapsed: fermentation.elapsed,
          unresolvedEnergy: fermentation.unresolvedEnergy,
          centerDepth: fermentation.centerDepth,
        }
      : undefined;

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
        center: false,
        rise: false,
        fall: false,
        open: false,
        close: false,
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
      // 新形式のフィールド
      taiyou: {
        fire: 1,
        water: 1,
        assignments: [],
        evidence: ["ERROR_FALLBACK"],
      },
      provisional: true,
      violations: [],
      loop: {
        detected: false,
        count: 0,
      },
      fermentation: undefined,
    };

    return fallbackTrace;
  }
}

