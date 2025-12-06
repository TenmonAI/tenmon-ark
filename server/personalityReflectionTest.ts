import { invokeLLM } from "./_core/llm";
import { getSukuyoMansionById } from "./sukuyoData";

/**
 * 会話OSへの人格反映テスト
 * 
 * 宿曜パーソナルAIが会話OSに正しく反映されているかをテストする
 */

export interface PersonalityReflectionTestCase {
  testId: string;
  conversationMode: "general" | "intermediate" | "expert";
  sukuyoMansionId: number;
  sukuyoMansionName: string;
  userMessage: string;
  expectedCharacteristics: string[];
}

export interface PersonalityReflectionTestResult {
  testId: string;
  conversationMode: string;
  sukuyoMansionName: string;
  userMessage: string;
  aiResponse: string;
  passedCharacteristics: string[];
  failedCharacteristics: string[];
  overallPass: boolean;
  notes: string;
}

/**
 * テストケースを定義
 */
export const testCases: PersonalityReflectionTestCase[] = [
  {
    testId: "test-001",
    conversationMode: "general",
    sukuyoMansionId: 1, // 昴宿
    sukuyoMansionName: "昴宿",
    userMessage: "最近、人間関係で悩んでいます。どうしたらいいでしょうか？",
    expectedCharacteristics: [
      "優しく寄り添う",
      "具体的なアドバイス",
      "専門用語を使わない",
      "火（陽）のエネルギー",
      "外発的なアプローチ",
    ],
  },
  {
    testId: "test-002",
    conversationMode: "intermediate",
    sukuyoMansionId: 8, // 角宿
    sukuyoMansionName: "角宿",
    userMessage: "言霊について教えてください。",
    expectedCharacteristics: [
      "適度に専門的",
      "火水のバランス",
      "論理的な説明",
      "水（陰）のエネルギー",
      "内集的なアプローチ",
    ],
  },
  {
    testId: "test-003",
    conversationMode: "expert",
    sukuyoMansionId: 15, // 心宿
    sukuyoMansionName: "心宿",
    userMessage: "天津金木50パターンとフトマニ十行の関係を教えてください。",
    expectedCharacteristics: [
      "天津金木50パターンを使用",
      "フトマニ十行を使用",
      "古五十音を使用",
      "火（陽）のエネルギー",
      "深層的な解説",
    ],
  },
  {
    testId: "test-004",
    conversationMode: "general",
    sukuyoMansionId: 22, // 畢宿
    sukuyoMansionName: "畢宿",
    userMessage: "仕事で失敗してしまいました。どうしたらいいでしょうか？",
    expectedCharacteristics: [
      "共感的な言葉",
      "実用的なアドバイス",
      "専門用語を使わない",
      "水（陰）のエネルギー",
      "安定的なアプローチ",
    ],
  },
  {
    testId: "test-005",
    conversationMode: "intermediate",
    sukuyoMansionId: 27, // 室宿
    sukuyoMansionName: "室宿",
    userMessage: "火水のバランスについて詳しく教えてください。",
    expectedCharacteristics: [
      "火水のバランスを説明",
      "適度に専門的",
      "火（陽）のエネルギー",
      "外発的なアプローチ",
      "具体例を含む",
    ],
  },
];

/**
 * 会話モードに応じたシステムプロンプトを生成
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
 * テストケースを実行
 */
export async function runPersonalityReflectionTest(
  testCase: PersonalityReflectionTestCase
): Promise<PersonalityReflectionTestResult> {
  const systemPrompt = getSystemPrompt(
    testCase.conversationMode,
    testCase.sukuyoMansionId
  );

  // LLMを呼び出して応答を生成
  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: testCase.userMessage },
    ],
  });

  const aiResponse = typeof response.choices[0]?.message?.content === "string" 
    ? response.choices[0].message.content 
    : "";

  // 期待される特性が応答に含まれているかをチェック
  const passedCharacteristics: string[] = [];
  const failedCharacteristics: string[] = [];

  for (const characteristic of testCase.expectedCharacteristics) {
    // 簡易的なチェック（実際にはより高度な自然言語処理が必要）
    let passed = false;

    if (characteristic === "優しく寄り添う") {
      passed = /優しく|寄り添|共感|理解|大丈夫/.test(aiResponse);
    } else if (characteristic === "具体的なアドバイス") {
      passed = /まず|次に|そして|具体的|方法|ステップ/.test(aiResponse);
    } else if (characteristic === "専門用語を使わない") {
      passed = !/天津金木|フトマニ|カタカムナ|古五十音/.test(aiResponse);
    } else if (characteristic === "火（陽）のエネルギー") {
      passed = /情熱|エネルギー|行動|前向き|積極的/.test(aiResponse);
    } else if (characteristic === "外発的なアプローチ") {
      passed = /行動|実践|試す|やってみ|チャレンジ/.test(aiResponse);
    } else if (characteristic === "適度に専門的") {
      passed = /火水|言霊|エネルギー|バランス/.test(aiResponse);
    } else if (characteristic === "火水のバランス") {
      passed = /火水|バランス|調和|陰陽/.test(aiResponse);
    } else if (characteristic === "論理的な説明") {
      passed = /つまり|したがって|なぜなら|理由|原理/.test(aiResponse);
    } else if (characteristic === "水（陰）のエネルギー") {
      passed = /安定|落ち着|冷静|論理|内面/.test(aiResponse);
    } else if (characteristic === "内集的なアプローチ") {
      passed = /内面|自分|振り返|考え|見つめ/.test(aiResponse);
    } else if (characteristic === "天津金木50パターンを使用") {
      passed = /天津金木|パターン|五十音|音霊/.test(aiResponse);
    } else if (characteristic === "フトマニ十行を使用") {
      passed = /フトマニ|十行|ミナカ|宇宙/.test(aiResponse);
    } else if (characteristic === "古五十音を使用") {
      passed = /古五十音|五十音|音霊|言霊/.test(aiResponse);
    } else if (characteristic === "深層的な解説") {
      passed = /本質|根源|深層|霊的|宇宙/.test(aiResponse);
    } else if (characteristic === "共感的な言葉") {
      passed = /辛い|大変|分かり|理解|寄り添/.test(aiResponse);
    } else if (characteristic === "実用的なアドバイス") {
      passed = /まず|次に|方法|具体的|実践/.test(aiResponse);
    } else if (characteristic === "安定的なアプローチ") {
      passed = /安定|落ち着|冷静|慎重|じっくり/.test(aiResponse);
    } else if (characteristic === "具体例を含む") {
      passed = /例えば|たとえば|具体的|実際|ケース/.test(aiResponse);
    }

    if (passed) {
      passedCharacteristics.push(characteristic);
    } else {
      failedCharacteristics.push(characteristic);
    }
  }

  const overallPass = failedCharacteristics.length === 0;

  return {
    testId: testCase.testId,
    conversationMode: testCase.conversationMode,
    sukuyoMansionName: testCase.sukuyoMansionName,
    userMessage: testCase.userMessage,
    aiResponse,
    passedCharacteristics,
    failedCharacteristics,
    overallPass,
    notes: overallPass
      ? "すべての期待される特性が応答に含まれています。"
      : `以下の特性が不足しています: ${failedCharacteristics.join("、")}`,
  };
}

/**
 * すべてのテストケースを実行
 */
export async function runAllPersonalityReflectionTests(): Promise<
  PersonalityReflectionTestResult[]
> {
  const results: PersonalityReflectionTestResult[] = [];

  for (const testCase of testCases) {
    console.log(`Running test: ${testCase.testId}...`);
    const result = await runPersonalityReflectionTest(testCase);
    results.push(result);
    console.log(`Test ${testCase.testId} completed: ${result.overallPass ? "PASS" : "FAIL"}`);
  }

  return results;
}
