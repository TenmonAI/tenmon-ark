// v∞-2: 応答生成のコアロジック（外部連携用）

import { memoryPersistMessage } from "../memory/index.js";
import { updatePersonaFromMemory } from "../memory/kokuzoCore.js";
import { getPersonaResponse, applyPersonaStyle } from "../persona/index.js";
import { conversationCount } from "../memory/conversationStore.js";
import { getCurrentPersonaStateInternal, setPersonaState } from "../persona/personaState.js";
import { decayInertia, getEffectiveMode } from "../persona/inertia.js";
import { determineThinkingAxis, applyThinkingAxisStructure } from "../persona/thinkingAxis.js";
import { determineKanagiPhase, applyKanagiPhaseStructure } from "../persona/kanagi.js";
import { determineLexicalBias, applyLexicalBias } from "../persona/lexicalBias.js";
import { saveKokuzoMemorySeed, getRecentKokuzoMemorySeeds, getKokuzoTendency, generateSummary } from "../kokuzo/memoryStore.js";
import { adjustInertiaFromTendency, adjustThinkingAxisFromTendency, adjustLexicalBiasFromTendency, adjustInertiaFromFractal, adjustThinkingAxisFromFractal, adjustLexicalBiasFromFractal } from "../kokuzo/influence.js";
import { generateFractalSeed, saveFractalSeed, getLatestFractalSeed } from "../kokuzo/fractalStore.js";
import { expandFromFractalSeed, applyExpandedProfileToInertia, applyExpandedProfileToThinkingAxis, applyExpandedProfileToKanagiPhase, applyExpandedProfileToLexicalBias } from "../kokuzo/expansion.js";
import { observeFractalSeed, observeTendency, observeLexicalBias, observeFinalPersonaState } from "../kokuzo/observer.js";
import { incMemoryWrite } from "../ops/metrics.js";
import { isSafeMode } from "../ops/safeMode.js";
import { getIsAmbientInitialized, initializeAmbientPersona } from "./ambient.js";
import { isConversationEnabled } from "./conversation.js";
import type { InputSource } from "./inputSanitizer.js";

/**
 * PHASE A: 会話用の最終レスポンス生成処理
 * 
 * 既存のCORE-5〜9 / KOKŪZŌ / Fractalロジックを再利用
 * 新しい人格処理は作らない
 */
function generateConversationalResponse(
  input: string,
  sessionId: string
): string {

  // CORE-4: 記憶の流れ（必須）
  // user message -> sessionMemory.add -> conversationStore.append -> kokuzoCore.maybeUpdate
  memoryPersistMessage(sessionId, "user", input);
  incMemoryWrite();

  // CORE-4: Memory 状態を取得して PersonaState を更新
  const recentCount = conversationCount(sessionId);
  const memorySnapshot = {
    lastUserMessage: input,
    recentMessageCount: recentCount,
  };
  updatePersonaFromMemory(memorySnapshot);

  // KOKŪZŌ: FractalSeedから展開されたプロファイルを初期値として弱く適用
  const currentInternal = getCurrentPersonaStateInternal();
  const fractalSeed = getLatestFractalSeed(currentInternal.personaId);
  
  // OS v∞-1: FractalSeedを観測
  observeFractalSeed(fractalSeed, "before-expansion");
  
  const expandedProfile = expandFromFractalSeed(fractalSeed);
  
  // 展開されたプロファイルを初期値として弱く適用（後続処理で自然に上書きされる）
  let initialInertia = applyExpandedProfileToInertia(currentInternal._inertia, expandedProfile);
  if (initialInertia !== currentInternal._inertia) {
    setPersonaState({ _inertia: initialInertia });
  }

  // KOKŪZŌ: 直近の記憶を参照して傾向を取得
  const recentSeeds = getRecentKokuzoMemorySeeds(5);
  const tendency = getKokuzoTendency(recentSeeds);
  
  // OS v∞-1: Tendencyを観測
  observeTendency(tendency, "before-adjustment");

  // CORE-6: 応答ごとに慣性を減衰
  let decayedInertia = decayInertia(initialInertia || currentInternal._inertia);
  
  // KOKŪZŌ: 傾向をもとにinertiaを微調整
  decayedInertia = adjustInertiaFromTendency(decayedInertia, tendency);
  
  // KOKŪZŌ: FractalSeedをもとにinertiaを弱く微調整
  decayedInertia = adjustInertiaFromFractal(decayedInertia, fractalSeed);
  
  if (decayedInertia !== currentInternal._inertia) {
    setPersonaState({ _inertia: decayedInertia });
  }

  // CORE-6: 慣性を考慮した実効モードを決定
  const currentState = getCurrentPersonaStateInternal();
  const effectiveMode = getEffectiveMode(currentState.mode, currentState._inertia);

  // CORE-7: 思考軸を決定
  // KOKŪZŌ: 展開されたプロファイルのbaseThinkingAxisを初期値として加味
  const baseThinkingAxis = applyExpandedProfileToThinkingAxis(expandedProfile);
  let thinkingAxis = baseThinkingAxis || determineThinkingAxis(
    effectiveMode,
    currentState._inertia,
    recentCount
  );
  
  // KOKŪZŌ: 傾向をもとにthinkingAxisを微調整
  thinkingAxis = adjustThinkingAxisFromTendency(thinkingAxis, tendency);
  
  // KOKŪZŌ: FractalSeedをもとにthinkingAxisを弱く微調整
  thinkingAxis = adjustThinkingAxisFromFractal(thinkingAxis, fractalSeed);
  
  setPersonaState({ _thinkingAxis: thinkingAxis });

  // CORE-5: 応答生成
  const rawReply = getPersonaResponse(input);

  // CORE-5: 実効モードを含むPersonaStateを作成してapplyPersonaStyleに渡す
  const effectivePersona = {
    ...currentState,
    mode: effectiveMode,
  };
  const styledReply = applyPersonaStyle(rawReply, effectivePersona);

  // CORE-7: 思考軸に応じて応答文の構造を微調整
  const axisStructuredReply = applyThinkingAxisStructure(styledReply, thinkingAxis);

  // CORE-8: 天津金木フェーズを決定
  // KOKŪZŌ: 展開されたプロファイルのbaseKanagiPhaseを初期値として加味
  const baseKanagiPhase = applyExpandedProfileToKanagiPhase(expandedProfile);
  const kanagiPhase = baseKanagiPhase || determineKanagiPhase(thinkingAxis);
  setPersonaState({ _kanagiPhase: kanagiPhase });

  // CORE-8: 天津金木フェーズに応じて応答文の展開順を微調整
  const kanagiStructuredReply = applyKanagiPhaseStructure(axisStructuredReply, kanagiPhase);

  // CORE-9: 語彙選択バイアスを決定
  let lexicalBias = determineLexicalBias(kanagiPhase, thinkingAxis, currentState._inertia);
  
  // KOKŪZŌ: 展開されたプロファイルのbaseLexicalBiasを初期値として弱く加味
  const baseLexicalBias = applyExpandedProfileToLexicalBias(lexicalBias, expandedProfile);
  if (baseLexicalBias) {
    lexicalBias = baseLexicalBias;
  }
  
  // KOKŪZŌ: 傾向をもとにlexicalBiasを微調整
  lexicalBias = adjustLexicalBiasFromTendency(lexicalBias, tendency);
  
  // KOKŪZŌ: FractalSeedをもとにlexicalBiasを弱く微調整
  lexicalBias = adjustLexicalBiasFromFractal(lexicalBias, fractalSeed);
  
  // OS v∞-1: 最終的なLexicalBiasを観測
  observeLexicalBias(lexicalBias, "final");

  // CORE-9: 語彙選択バイアスに応じてテキストを選択・調整
  const finalReply = applyLexicalBias(kanagiStructuredReply, lexicalBias);
  
  // OS v∞-1: 最終的な人格状態を観測
  observeFinalPersonaState(
    thinkingAxis,
    kanagiPhase,
    lexicalBias,
    currentState._inertia?.level,
    "response-complete"
  );

  // 応答を Memory に保存
  memoryPersistMessage(sessionId, "assistant", finalReply);
  incMemoryWrite();

  // KOKŪZŌ: 応答完了後に記憶シードを保存
  const summary = generateSummary(finalReply);
  if (summary) {
    const seed = {
      id: `${sessionId}-${Date.now()}`,
      personaId: currentState.personaId,
      summary,
      thinkingAxis,
      kanagiPhase,
      lexicalBias,
      inertiaSnapshot: currentState._inertia?.level ?? 0,
      createdAt: Date.now(),
    };
    saveKokuzoMemorySeed(seed);
    
    // KOKŪZŌ: 直近10件からFractalSeedを生成（定期的に）
    const recentSeedsForFractal = getRecentKokuzoMemorySeeds(10);
    if (recentSeedsForFractal.length >= 10) {
      const fractal = generateFractalSeed(recentSeedsForFractal, currentState.personaId);
      if (fractal) {
        saveFractalSeed(fractal);
      }
    }
  }

  return finalReply;
}

/**
 * PHASE A: 最小応答生成処理（互換維持用）
 */
function generateMinimalResponse(_input: string): string {
  // 簡潔な応答のみを返す（人格ロジックは変更しない）
  return "受け取りました。";
}

/**
 * v∞-2: 応答生成のコアロジック
 * 
 * 外部入力はすべて以下に集約：
 * - 入力正規化（既に完了している前提）
 * - 人格初期化（Fractal Expansion 1回）
 * - CORE-5〜9 → KOKŪZŌ → Fractal の通常フロー
 * 
 * @param input 正規化済みの入力テキスト
 * @param sessionId セッションID
 * @param _source 入力ソース（ログ用、人格ロジックには影響しない）
 * @returns 応答テキスト
 */
export function respond(
  input: string,
  sessionId: string,
  _source: InputSource = "web"
): string {
  // v∞-3: 初期化チェック（前段に1箇所のみ）
  if (!getIsAmbientInitialized()) {
    initializeAmbientPersona();
  }
  
  if (isSafeMode()) {
    // Safe mode: memory write を抑制し、応答を最小化（暴走・DoS・異常時の防護）
    return "安全運用モード（safe mode）です。現在は機能を制限して応答します。";
  }
  
  // PHASE A: 会話解放フラグによる明確な分岐（最終出力生成の直前）
  const conversationEnabled = isConversationEnabled();
  
  if (conversationEnabled) {
    // 会話用の最終レスポンス生成処理（既存ロジックを再利用）
    return generateConversationalResponse(input, sessionId);
  } else {
    // 最小応答（互換維持）
    return generateMinimalResponse(input);
  }
}

