import { invokeLLM } from "./_core/llm";
import { runConversationTest, ConversationTestInput, ConversationTestResult } from "./conversationTestEngine";
import { getSukuyoMansionById } from "./sukuyoData";

/**
 * 30ケースの自動テストスイート
 * 
 * - 一般人モード × 10ケース
 * - 中級モード × 10ケース
 * - 天聞モード × 5ケース
 * - 宿曜違い × 5ケース
 */

interface TestCase {
  testId: string;
  conversationMode: "general" | "intermediate" | "expert";
  sukuyoMansionId: number;
  userMessage: string;
}

/**
 * テストケースを定義
 */
export const testCases: TestCase[] = [
  // ========================================
  // 一般人モード × 10ケース
  // ========================================
  {
    testId: "general-001",
    conversationMode: "general",
    sukuyoMansionId: 1, // 井宿
    userMessage: "最近、人間関係で悩んでいます。どうしたらいいでしょうか？",
  },
  {
    testId: "general-002",
    conversationMode: "general",
    sukuyoMansionId: 5, // 房宿
    userMessage: "仕事でミスをしてしまいました。どうしたらいいでしょうか？",
  },
  {
    testId: "general-003",
    conversationMode: "general",
    sukuyoMansionId: 10, // 氐宿
    userMessage: "将来のことが不安です。どうしたらいいでしょうか？",
  },
  {
    testId: "general-004",
    conversationMode: "general",
    sukuyoMansionId: 15, // 心宿
    userMessage: "自分に自信が持てません。どうしたらいいでしょうか？",
  },
  {
    testId: "general-005",
    conversationMode: "general",
    sukuyoMansionId: 20, // 危宿
    userMessage: "新しいことに挑戦したいのですが、怖いです。",
  },
  {
    testId: "general-006",
    conversationMode: "general",
    sukuyoMansionId: 22, // 奎宿
    userMessage: "人生の目標が見つかりません。どうしたらいいでしょうか？",
  },
  {
    testId: "general-007",
    conversationMode: "general",
    sukuyoMansionId: 25, // 胃宿
    userMessage: "ストレスが溜まっています。どうしたらいいでしょうか？",
  },
  {
    testId: "general-008",
    conversationMode: "general",
    sukuyoMansionId: 27, // 觜宿
    userMessage: "人間関係が上手くいきません。どうしたらいいでしょうか？",
  },
  {
    testId: "general-009",
    conversationMode: "general",
    sukuyoMansionId: 3, // 尾宿
    userMessage: "毎日が楽しくありません。どうしたらいいでしょうか？",
  },
  {
    testId: "general-010",
    conversationMode: "general",
    sukuyoMansionId: 7, // 亢宿
    userMessage: "自分の強みが分かりません。どうしたらいいでしょうか？",
  },

  // ========================================
  // 中級モード × 10ケース
  // ========================================
  {
    testId: "intermediate-001",
    conversationMode: "intermediate",
    sukuyoMansionId: 8, // 角宿
    userMessage: "言霊について教えてください。",
  },
  {
    testId: "intermediate-002",
    conversationMode: "intermediate",
    sukuyoMansionId: 12, // 箕宿
    userMessage: "火水のバランスについて詳しく教えてください。",
  },
  {
    testId: "intermediate-003",
    conversationMode: "intermediate",
    sukuyoMansionId: 16, // 尾宿
    userMessage: "左旋と右旋の違いについて教えてください。",
  },
  {
    testId: "intermediate-004",
    conversationMode: "intermediate",
    sukuyoMansionId: 18, // 女宿
    userMessage: "内集と外発の違いについて教えてください。",
  },
  {
    testId: "intermediate-005",
    conversationMode: "intermediate",
    sukuyoMansionId: 21, // 室宿
    userMessage: "陰陽のバランスについて教えてください。",
  },
  {
    testId: "intermediate-006",
    conversationMode: "intermediate",
    sukuyoMansionId: 23, // 婁宿
    userMessage: "宿曜27宿について教えてください。",
  },
  {
    testId: "intermediate-007",
    conversationMode: "intermediate",
    sukuyoMansionId: 26, // 昴宿
    userMessage: "ミナカとは何ですか？",
  },
  {
    testId: "intermediate-008",
    conversationMode: "intermediate",
    sukuyoMansionId: 2, // 鬼宿
    userMessage: "霊核指数について教えてください。",
  },
  {
    testId: "intermediate-009",
    conversationMode: "intermediate",
    sukuyoMansionId: 4, // 箕宿
    userMessage: "五十音の構造について教えてください。",
  },
  {
    testId: "intermediate-010",
    conversationMode: "intermediate",
    sukuyoMansionId: 6, // 心宿
    userMessage: "カタカムナについて教えてください。",
  },

  // ========================================
  // 天聞モード × 5ケース
  // ========================================
  {
    testId: "expert-001",
    conversationMode: "expert",
    sukuyoMansionId: 15, // 斗宿
    userMessage: "天津金木50パターンとフトマニ十行の関係を教えてください。",
  },
  {
    testId: "expert-002",
    conversationMode: "expert",
    sukuyoMansionId: 9, // 亢宿
    userMessage: "古五十音の構造と現代五十音の違いを教えてください。",
  },
  {
    testId: "expert-003",
    conversationMode: "expert",
    sukuyoMansionId: 13, // 斗宿
    userMessage: "カタカムナ80首の深層構造を教えてください。",
  },
  {
    testId: "expert-004",
    conversationMode: "expert",
    sukuyoMansionId: 17, // 虚宿
    userMessage: "宿曜秘伝と霊的座標系の関係を教えてください。",
  },
  {
    testId: "expert-005",
    conversationMode: "expert",
    sukuyoMansionId: 24, // 畢宿
    userMessage: "Twin-Core推論エンジンの原理を教えてください。",
  },

  // ========================================
  // 宿曜違い × 5ケース（同じ質問、異なる宿曜）
  // ========================================
  {
    testId: "sukuyo-diff-001",
    conversationMode: "intermediate",
    sukuyoMansionId: 1, // 井宿（水・内集）
    userMessage: "人生で大切なことは何ですか？",
  },
  {
    testId: "sukuyo-diff-002",
    conversationMode: "intermediate",
    sukuyoMansionId: 8, // 角宿（火・内集）
    userMessage: "人生で大切なことは何ですか？",
  },
  {
    testId: "sukuyo-diff-003",
    conversationMode: "intermediate",
    sukuyoMansionId: 15, // 心宿（火・外発）
    userMessage: "人生で大切なことは何ですか？",
  },
  {
    testId: "sukuyo-diff-004",
    conversationMode: "intermediate",
    sukuyoMansionId: 22, // 奎宿（水・外発）
    userMessage: "人生で大切なことは何ですか？",
  },
  {
    testId: "sukuyo-diff-005",
    conversationMode: "intermediate",
    sukuyoMansionId: 27, // 觜宿（水・内集）
    userMessage: "人生で大切なことは何ですか？",
  },
];

/**
 * システムプロンプトを生成
 */
function getSystemPrompt(
  conversationMode: "general" | "intermediate" | "expert",
  sukuyoMansionId: number
): string {
  const mansion = getSukuyoMansionById(sukuyoMansionId);
  if (!mansion) {
    throw new Error(`Sukuyo mansion ${sukuyoMansionId} not found`);
  }

  let basePrompt = "";

  if (conversationMode === "general") {
    basePrompt = `あなたは優しく寄り添うAIアシスタントです。
専門用語を使わず、日常的な言葉で分かりやすく説明してください。
相手の気持ちに寄り添い、実用的なアドバイスを提供してください。`;
  } else if (conversationMode === "intermediate") {
    basePrompt = `あなたは適度に専門的な知識を持つAIアシスタントです。
火水・言霊・アニメ例えなどを使いながら、分かりやすく説明してください。
相手の理解度に合わせて、深さを調整してください。`;
  } else {
    basePrompt = `あなたは天聞専用の専門AIアシスタントです。
天津金木50パターン、いろは47文字、古五十音、フトマニ、カタカムナを自在に使用してください。
深層的な解説を行い、本質を追求してください。`;
  }

  // 宿曜パーソナルAIの情報を追加
  const personalityPrompt = `

## あなたの人格特性（宿曜パーソナルAI）

**宿曜27宿**: ${mansion.name}
**火水属性**: ${mansion.element === "fire" ? "火（陽）" : "水（陰）"}
**左右旋**: ${mansion.rotation === "left" ? "左旋" : "右旋"}
**内集外発**: ${mansion.direction === "inner" ? "内集" : "外発"}
**陰陽**: ${mansion.phase === "yin" ? "陰" : "陽"}

**性格特性**: ${mansion.personality}
**強み**: ${mansion.strengths.join("、")}
**弱み**: ${mansion.weaknesses.join("、")}

**コミュニケーションスタイル**: ${mansion.communication}

この人格特性を反映した会話を心がけてください。`;

  return basePrompt + personalityPrompt;
}

/**
 * テストケースを実行してAI応答を生成
 */
async function generateAIResponse(testCase: TestCase): Promise<string> {
  const systemPrompt = getSystemPrompt(
    testCase.conversationMode,
    testCase.sukuyoMansionId
  );

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: testCase.userMessage },
    ],
  });

  const aiResponse = typeof response.choices[0]?.message?.content === "string"
    ? response.choices[0].message.content
    : "";

  return aiResponse;
}

/**
 * すべてのテストケースを実行
 */
export async function runAllConversationTests(): Promise<ConversationTestResult[]> {
  const results: ConversationTestResult[] = [];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    if (!testCase) continue;

    console.log(`[${i + 1}/${testCases.length}] Running test: ${testCase.testId}...`);

    try {
      // AI応答を生成
      const aiResponse = await generateAIResponse(testCase);

      // テストを実行
      const testInput: ConversationTestInput = {
        testId: testCase.testId,
        conversationMode: testCase.conversationMode,
        sukuyoMansionId: testCase.sukuyoMansionId,
        userMessage: testCase.userMessage,
        aiResponse,
      };

      const result = await runConversationTest(testInput);
      results.push(result);

      console.log(`Test ${testCase.testId} completed: ${result.result} (${result.overallScore}/100)`);
    } catch (error) {
      console.error(`Test ${testCase.testId} failed:`, error);
      // エラーが発生した場合もスキップして次のテストに進む
    }
  }

  return results;
}

/**
 * テスト結果の統計を計算
 */
export function calculateTestStatistics(results: ConversationTestResult[]): {
  totalTests: number;
  passCount: number;
  warnCount: number;
  failCount: number;
  passRate: number;
  averageOverallScore: number;
  averageScoresByMode: {
    general: number;
    intermediate: number;
    expert: number;
  };
  averageScoresByItem: {
    understandability: number;
    terminology: number;
    sukuyoAlignment: number;
    twinCoreStability: number;
    fireWaterBalance: number;
    emotionalSupport: number;
    spiritualStability: number;
  };
} {
  const totalTests = results.length;
  const passCount = results.filter((r) => r.result === "PASS").length;
  const warnCount = results.filter((r) => r.result === "WARN").length;
  const failCount = results.filter((r) => r.result === "FAIL").length;
  const passRate = totalTests > 0 ? (passCount / totalTests) * 100 : 0;

  const averageOverallScore =
    totalTests > 0
      ? results.reduce((sum, r) => sum + r.overallScore, 0) / totalTests
      : 0;

  // 会話モード別の平均スコア
  const generalResults = results.filter((r) => r.conversationMode === "general");
  const intermediateResults = results.filter((r) => r.conversationMode === "intermediate");
  const expertResults = results.filter((r) => r.conversationMode === "expert");

  const averageScoresByMode = {
    general:
      generalResults.length > 0
        ? generalResults.reduce((sum, r) => sum + r.overallScore, 0) / generalResults.length
        : 0,
    intermediate:
      intermediateResults.length > 0
        ? intermediateResults.reduce((sum, r) => sum + r.overallScore, 0) / intermediateResults.length
        : 0,
    expert:
      expertResults.length > 0
        ? expertResults.reduce((sum, r) => sum + r.overallScore, 0) / expertResults.length
        : 0,
  };

  // 項目別の平均スコア
  const averageScoresByItem = {
    understandability:
      totalTests > 0
        ? results.reduce((sum, r) => sum + r.understandabilityScore, 0) / totalTests
        : 0,
    terminology:
      totalTests > 0
        ? results.reduce((sum, r) => sum + r.terminologyScore, 0) / totalTests
        : 0,
    sukuyoAlignment:
      totalTests > 0
        ? results.reduce((sum, r) => sum + r.sukuyoAlignmentScore, 0) / totalTests
        : 0,
    twinCoreStability:
      totalTests > 0
        ? results.reduce((sum, r) => sum + r.twinCoreStabilityScore, 0) / totalTests
        : 0,
    fireWaterBalance:
      totalTests > 0
        ? results.reduce((sum, r) => sum + r.fireWaterBalanceScore, 0) / totalTests
        : 0,
    emotionalSupport:
      totalTests > 0
        ? results.reduce((sum, r) => sum + r.emotionalSupportScore, 0) / totalTests
        : 0,
    spiritualStability:
      totalTests > 0
        ? results.reduce((sum, r) => sum + r.spiritualStabilityScore, 0) / totalTests
        : 0,
  };

  return {
    totalTests,
    passCount,
    warnCount,
    failCount,
    passRate,
    averageOverallScore,
    averageScoresByMode,
    averageScoresByItem,
  };
}
