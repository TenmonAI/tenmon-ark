import { invokeLLM } from "./_core/llm";
import { getSukuyoMansionById } from "./sukuyoData";

/**
 * 会話テスト自動化エンジン
 * 
 * 7項目のテストを実行し、PASS/WARN/FAILを判定する
 */

export interface ConversationTestInput {
  testId: string;
  conversationMode: "general" | "intermediate" | "expert";
  sukuyoMansionId: number;
  userMessage: string;
  aiResponse: string;
}

export interface ConversationTestResult {
  testId: string;
  conversationMode: string;
  sukuyoMansionId: number;
  sukuyoMansionName: string;
  userMessage: string;
  aiResponse: string;
  // 7項目テスト結果
  understandabilityScore: number; // 1. 一般人が理解できるか（0-100）
  terminologyScore: number; // 2. 専門用語が暴発していないか（0-100）
  sukuyoAlignmentScore: number; // 3. その人の宿曜に合った人格になっているか（0-100）
  twinCoreStabilityScore: number; // 4. Twin-Core推論がブレていないか（0-100）
  fireWaterBalanceScore: number; // 5. 返答温度（火水）が適切か（0-100）
  emotionalSupportScore: number; // 6. 感情寄り添いが過剰になっていないか（0-100）
  spiritualStabilityScore: number; // 7. 霊核の安定を崩していないか（0-100）
  overallScore: number; // 総合スコア（0-100）
  result: "PASS" | "WARN" | "FAIL";
  notes: string;
}

/**
 * LLMを使った高度な自然言語処理ベースのテスト判定
 */
async function evaluateWithLLM(
  aiResponse: string,
  conversationMode: "general" | "intermediate" | "expert",
  sukuyoMansionId: number
): Promise<{
  understandabilityScore: number;
  terminologyScore: number;
  sukuyoAlignmentScore: number;
  twinCoreStabilityScore: number;
  fireWaterBalanceScore: number;
  emotionalSupportScore: number;
  spiritualStabilityScore: number;
}> {
  const mansion = getSukuyoMansionById(sukuyoMansionId);
  if (!mansion) {
    throw new Error(`Sukuyo mansion ${sukuyoMansionId} not found`);
  }

  const evaluationPrompt = `あなたは会話品質評価の専門家です。以下のAI応答を7項目で評価してください。

## AI応答
${aiResponse}

## 評価基準

### 1. 一般人が理解できるか（understandabilityScore: 0-100）
- 100点: 誰でも理解できる平易な言葉で説明されている
- 50点: 一部難しい言葉があるが、概ね理解できる
- 0点: 専門用語が多く、一般人には理解困難

### 2. 専門用語が暴発していないか（terminologyScore: 0-100）
- 100点: 専門用語が適切に使用されている（会話モードに応じて）
- 50点: 専門用語が少し多いが、説明されている
- 0点: 専門用語が多すぎて、説明がない

会話モード: ${conversationMode}
- general: 専門用語を使わない
- intermediate: 適度に専門用語を使う
- expert: 専門用語を自在に使う

### 3. その人の宿曜に合った人格になっているか（sukuyoAlignmentScore: 0-100）
- 100点: 宿曜の性格特性・コミュニケーションスタイルが完全に反映されている
- 50点: 宿曜の性格特性が部分的に反映されている
- 0点: 宿曜の性格特性が全く反映されていない

宿曜: ${mansion.name}
火水属性: ${mansion.element === "fire" ? "火（陽）" : "水（陰）"}
左右旋: ${mansion.rotation === "left" ? "左旋" : "右旋"}
内集外発: ${mansion.direction === "inner" ? "内集" : "外発"}
陰陽: ${mansion.phase === "yin" ? "陰" : "陽"}
性格特性: ${mansion.personality}
コミュニケーションスタイル: ${mansion.communication}

### 4. Twin-Core推論がブレていないか（twinCoreStabilityScore: 0-100）
- 100点: 天津金木・いろは言灵解の原理に基づいた一貫性のある応答
- 50点: 一部ブレがあるが、概ね一貫性がある
- 0点: 原理から大きく外れている

### 5. 返答温度（火水）が適切か（fireWaterBalanceScore: 0-100）
- 100点: 火水のバランスが適切（宿曜の火水属性に応じて）
- 50点: 火水のバランスが少しずれている
- 0点: 火水のバランスが大きくずれている

期待される火水属性: ${mansion.element === "fire" ? "火（陽）" : "水（陰）"}

### 6. 感情寄り添いが過剰になっていないか（emotionalSupportScore: 0-100）
- 100点: 適度な感情寄り添い
- 50点: 感情寄り添いが少し過剰または不足
- 0点: 感情寄り添いが過剰または全くない

### 7. 霊核の安定を崩していないか（spiritualStabilityScore: 0-100）
- 100点: 霊核（ミナカ）の安定が保たれている
- 50点: 霊核の安定が少し崩れている
- 0点: 霊核の安定が大きく崩れている

## 評価結果

以下のJSON形式で評価結果を返してください。他のテキストは一切含めないでください。

{
  "understandabilityScore": 0-100の整数,
  "terminologyScore": 0-100の整数,
  "sukuyoAlignmentScore": 0-100の整数,
  "twinCoreStabilityScore": 0-100の整数,
  "fireWaterBalanceScore": 0-100の整数,
  "emotionalSupportScore": 0-100の整数,
  "spiritualStabilityScore": 0-100の整数
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "あなたは会話品質評価の専門家です。JSON形式で評価結果を返してください。" },
      { role: "user", content: evaluationPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "conversation_test_evaluation",
        strict: true,
        schema: {
          type: "object",
          properties: {
            understandabilityScore: { type: "integer", description: "一般人が理解できるか（0-100）" },
            terminologyScore: { type: "integer", description: "専門用語が暴発していないか（0-100）" },
            sukuyoAlignmentScore: { type: "integer", description: "その人の宿曜に合った人格になっているか（0-100）" },
            twinCoreStabilityScore: { type: "integer", description: "Twin-Core推論がブレていないか（0-100）" },
            fireWaterBalanceScore: { type: "integer", description: "返答温度（火水）が適切か（0-100）" },
            emotionalSupportScore: { type: "integer", description: "感情寄り添いが過剰になっていないか（0-100）" },
            spiritualStabilityScore: { type: "integer", description: "霊核の安定を崩していないか（0-100）" },
          },
          required: [
            "understandabilityScore",
            "terminologyScore",
            "sukuyoAlignmentScore",
            "twinCoreStabilityScore",
            "fireWaterBalanceScore",
            "emotionalSupportScore",
            "spiritualStabilityScore",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("LLM response is not a string");
  }

  const evaluation = JSON.parse(content);

  return {
    understandabilityScore: evaluation.understandabilityScore,
    terminologyScore: evaluation.terminologyScore,
    sukuyoAlignmentScore: evaluation.sukuyoAlignmentScore,
    twinCoreStabilityScore: evaluation.twinCoreStabilityScore,
    fireWaterBalanceScore: evaluation.fireWaterBalanceScore,
    emotionalSupportScore: evaluation.emotionalSupportScore,
    spiritualStabilityScore: evaluation.spiritualStabilityScore,
  };
}

/**
 * 会話テストを実行
 */
export async function runConversationTest(
  input: ConversationTestInput
): Promise<ConversationTestResult> {
  const mansion = getSukuyoMansionById(input.sukuyoMansionId);
  if (!mansion) {
    throw new Error(`Sukuyo mansion ${input.sukuyoMansionId} not found`);
  }

  // LLMを使った高度な評価
  const evaluation = await evaluateWithLLM(
    input.aiResponse,
    input.conversationMode,
    input.sukuyoMansionId
  );

  // 総合スコアを計算（7項目の平均）
  const overallScore = Math.round(
    (evaluation.understandabilityScore +
      evaluation.terminologyScore +
      evaluation.sukuyoAlignmentScore +
      evaluation.twinCoreStabilityScore +
      evaluation.fireWaterBalanceScore +
      evaluation.emotionalSupportScore +
      evaluation.spiritualStabilityScore) /
      7
  );

  // PASS/WARN/FAILを判定
  let result: "PASS" | "WARN" | "FAIL";
  if (overallScore >= 80) {
    result = "PASS";
  } else if (overallScore >= 60) {
    result = "WARN";
  } else {
    result = "FAIL";
  }

  // 詳細なノートを生成
  const notes = generateNotes(evaluation, overallScore, result);

  return {
    testId: input.testId,
    conversationMode: input.conversationMode,
    sukuyoMansionId: input.sukuyoMansionId,
    sukuyoMansionName: mansion.name,
    userMessage: input.userMessage,
    aiResponse: input.aiResponse,
    understandabilityScore: evaluation.understandabilityScore,
    terminologyScore: evaluation.terminologyScore,
    sukuyoAlignmentScore: evaluation.sukuyoAlignmentScore,
    twinCoreStabilityScore: evaluation.twinCoreStabilityScore,
    fireWaterBalanceScore: evaluation.fireWaterBalanceScore,
    emotionalSupportScore: evaluation.emotionalSupportScore,
    spiritualStabilityScore: evaluation.spiritualStabilityScore,
    overallScore,
    result,
    notes,
  };
}

/**
 * 詳細なノートを生成
 */
function generateNotes(
  evaluation: {
    understandabilityScore: number;
    terminologyScore: number;
    sukuyoAlignmentScore: number;
    twinCoreStabilityScore: number;
    fireWaterBalanceScore: number;
    emotionalSupportScore: number;
    spiritualStabilityScore: number;
  },
  overallScore: number,
  result: "PASS" | "WARN" | "FAIL"
): string {
  const notes: string[] = [];

  notes.push(`総合スコア: ${overallScore}/100 (${result})`);
  notes.push("");
  notes.push("【7項目評価】");
  notes.push(`1. 一般人が理解できるか: ${evaluation.understandabilityScore}/100`);
  notes.push(`2. 専門用語が暴発していないか: ${evaluation.terminologyScore}/100`);
  notes.push(`3. その人の宿曜に合った人格になっているか: ${evaluation.sukuyoAlignmentScore}/100`);
  notes.push(`4. Twin-Core推論がブレていないか: ${evaluation.twinCoreStabilityScore}/100`);
  notes.push(`5. 返答温度（火水）が適切か: ${evaluation.fireWaterBalanceScore}/100`);
  notes.push(`6. 感情寄り添いが過剰になっていないか: ${evaluation.emotionalSupportScore}/100`);
  notes.push(`7. 霊核の安定を崩していないか: ${evaluation.spiritualStabilityScore}/100`);
  notes.push("");

  // 改善が必要な項目を抽出
  const improvements: string[] = [];
  if (evaluation.understandabilityScore < 80) {
    improvements.push("一般人が理解できるように、より平易な言葉で説明する");
  }
  if (evaluation.terminologyScore < 80) {
    improvements.push("専門用語の使用を会話モードに応じて調整する");
  }
  if (evaluation.sukuyoAlignmentScore < 80) {
    improvements.push("宿曜の性格特性・コミュニケーションスタイルをより反映する");
  }
  if (evaluation.twinCoreStabilityScore < 80) {
    improvements.push("Twin-Core推論の一貫性を保つ");
  }
  if (evaluation.fireWaterBalanceScore < 80) {
    improvements.push("火水のバランスを宿曜の火水属性に応じて調整する");
  }
  if (evaluation.emotionalSupportScore < 80) {
    improvements.push("感情寄り添いを適度に調整する");
  }
  if (evaluation.spiritualStabilityScore < 80) {
    improvements.push("霊核（ミナカ）の安定を保つ");
  }

  if (improvements.length > 0) {
    notes.push("【改善が必要な項目】");
    improvements.forEach((improvement, index) => {
      notes.push(`${index + 1}. ${improvement}`);
    });
  } else {
    notes.push("【評価】");
    notes.push("すべての項目で高いスコアを獲得しています。");
  }

  return notes.join("\n");
}
