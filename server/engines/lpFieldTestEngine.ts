/**
 * LP Field Test Engine
 * 
 * 🌕 MEMORY UNITY vΦ Phase 8 実装
 * 
 * futomani88.com → TENMON-ARK 呼び出しログを取得し、
 * Persona一致率、Twin-Core深度、Fire/Waterバランスを計測します。
 * 
 * 仕様:
 * 1. futomani88.com → TENMON-ARK 呼び出しログ取得
 * 2. Persona一致率計測（LP-QA vs ChatOS）
 * 3. Twin-Core深度比較
 * 4. Fire/Waterバランス測定
 * 5. 自動テストレポート生成
 */

import { invokeLLM } from '../_core/llm';
import { generateChatResponse } from '../chat/chatAI';
import { getDb } from '../db';
import { lpQaLogs } from '../../drizzle/schema';
import { desc, eq } from 'drizzle-orm';

/**
 * LP-QA ログエントリ
 */
export interface LpQaLogEntry {
  id: number;
  question: string;
  response: string;
  depth: string;
  fireWaterBalance: string;
  createdAt: Date;
}

/**
 * Persona一致率テスト結果
 */
export interface PersonaMatchResult {
  questionId: number;
  question: string;
  lpQaResponse: string;
  chatOsResponse: string;
  similarity: number; // 0〜1
  twinCoreDepth: {
    lpQa: number; // 0〜1
    chatOs: number; // 0〜1
    difference: number; // 絶対値
  };
  fireWaterBalance: {
    lpQa: { fire: number; water: number }; // 0〜1
    chatOs: { fire: number; water: number }; // 0〜1
    difference: number; // 絶対値
  };
}

/**
 * テストレポート
 */
export interface FieldTestReport {
  testDate: Date;
  totalTests: number;
  averageSimilarity: number; // 0〜1
  averageTwinCoreDepthDiff: number; // 0〜1
  averageFireWaterDiff: number; // 0〜1
  personaMatchRate: number; // 0〜1（一致率）
  results: PersonaMatchResult[];
  summary: {
    highSimilarity: number; // similarity >= 0.9
    mediumSimilarity: number; // 0.7 <= similarity < 0.9
    lowSimilarity: number; // similarity < 0.7
  };
}

/**
 * futomani88.com からの LP-QA ログを取得
 * 
 * @param limit 取得する最大件数
 * @returns LP-QA ログエントリ配列
 */
export async function fetchLpQaLogs(limit: number = 10): Promise<LpQaLogEntry[]> {
  const db = await getDb();
  if (!db) {
    console.warn('[LP Field Test] Database not available');
    return [];
  }

  try {
    const logs = await db
      .select()
      .from(lpQaLogs)
      .orderBy(desc(lpQaLogs.createdAt))
      .limit(limit);

    return logs.map((log) => ({
      id: log.id,
      question: log.question,
      response: log.response,
      depth: log.depth || 'middle',
      fireWaterBalance: log.fireWaterBalance || 'balanced',
      createdAt: log.createdAt,
    }));
  } catch (error) {
    console.error('[LP Field Test] Failed to fetch LP-QA logs:', error);
    return [];
  }
}

/**
 * テキスト類似度を計算（コサイン類似度ベース）
 * 
 * @param text1 テキスト1
 * @param text2 テキスト2
 * @returns 類似度（0〜1）
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  // 簡易的な単語ベースのコサイン類似度
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);

  const wordSet = new Set([...words1, ...words2]);
  const vector1: number[] = [];
  const vector2: number[] = [];

  wordSet.forEach((word) => {
    vector1.push(words1.filter((w) => w === word).length);
    vector2.push(words2.filter((w) => w === word).length);
  });

  // コサイン類似度
  const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
  const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));

  if (magnitude1 === 0 || magnitude2 === 0) return 0;

  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Twin-Core深度を計算
 * 
 * 応答の論理的深度を分析します。
 * - 表層（surface）: 0.2
 * - 中層（middle）: 0.5
 * - 深層（deep）: 0.8
 * - 専門層（specialized）: 1.0
 * 
 * @param response 応答テキスト
 * @returns 深度（0〜1）
 */
async function calculateTwinCoreDepth(response: string): Promise<number> {
  try {
    // LLM で深度を分析
    const analysisPrompt = `以下の応答テキストの論理的深度を分析してください。

応答テキスト:
"""
${response}
"""

深度レベル:
- 表層（surface）: 0.2 - 簡単な事実や表面的な回答
- 中層（middle）: 0.5 - 一般的な説明や論理的な回答
- 深層（deep）: 0.8 - 深い洞察や専門的な分析
- 専門層（specialized）: 1.0 - 高度な専門知識や哲学的洞察

0〜1の数値のみを返してください。`;

    const llmResponse = await invokeLLM({
      messages: [
        { role: 'system', content: 'あなたはテキスト分析の専門家です。' },
        { role: 'user', content: analysisPrompt },
      ],
    });

    const content = llmResponse.choices[0]?.message?.content;
    if (!content) return 0.5; // デフォルト: 中層

    const contentStr = typeof content === 'string' ? content : (Array.isArray(content) && content[0] && 'text' in content[0] ? content[0].text : '0.5');
    const depth = parseFloat(contentStr);
    return Math.max(0, Math.min(1, depth)); // 0〜1に正規化
  } catch (error) {
    console.error('[LP Field Test] Failed to calculate Twin-Core depth:', error);
    return 0.5; // デフォルト: 中層
  }
}

/**
 * Fire/Waterバランスを計算
 * 
 * 応答の火（外発）と水（内集）のバランスを分析します。
 * 
 * @param response 応答テキスト
 * @returns { fire: number, water: number }（各0〜1、合計1.0）
 */
async function calculateFireWaterBalance(response: string): Promise<{ fire: number; water: number }> {
  try {
    // LLM で火水バランスを分析
    const analysisPrompt = `以下の応答テキストの火（外発）と水（内集）のバランスを分析してください。

応答テキスト:
"""
${response}
"""

火（外発）の特徴:
- 積極的、行動的、外向的
- 明確、直接的、断定的
- エネルギッシュ、情熱的

水（内集）の特徴:
- 受容的、内省的、内向的
- 柔軟、間接的、示唆的
- 静謐、穏やか

JSON形式で返してください:
{ "fire": 0.0〜1.0, "water": 0.0〜1.0 }
（fire + water = 1.0）`;

    const llmResponse = await invokeLLM({
      messages: [
        { role: 'system', content: 'あなたはテキスト分析の専門家です。' },
        { role: 'user', content: analysisPrompt },
      ],
    });

    const content = llmResponse.choices[0]?.message?.content;
    if (!content) return { fire: 0.5, water: 0.5 }; // デフォルト: バランス

    const contentStr = typeof content === 'string' ? content : (Array.isArray(content) && content[0] && 'text' in content[0] ? content[0].text : '{}');
    const balance = JSON.parse(contentStr);

    // 正規化（合計を1.0にする）
    const total = balance.fire + balance.water;
    if (total === 0) return { fire: 0.5, water: 0.5 };

    return {
      fire: balance.fire / total,
      water: balance.water / total,
    };
  } catch (error) {
    console.error('[LP Field Test] Failed to calculate Fire/Water balance:', error);
    return { fire: 0.5, water: 0.5 }; // デフォルト: バランス
  }
}

/**
 * LP-QA vs ChatOS の Persona一致率テストを実行
 * 
 * @param logEntry LP-QA ログエントリ
 * @returns Persona一致率テスト結果
 */
export async function runPersonaMatchTest(logEntry: LpQaLogEntry): Promise<PersonaMatchResult> {
  // ChatOS で同じ質問に応答
  const chatOsResponse = await generateChatResponse({
    userId: 0, // テスト用仮想ユーザー
    roomId: 0, // テスト用仮想ルーム
    messages: [
      {
        id: 0,
        role: 'user',
        content: logEntry.question,
        roomId: 0,
        createdAt: new Date(),
      },
    ],
    language: 'ja',
  });

  // 類似度計算
  const similarity = calculateTextSimilarity(logEntry.response, chatOsResponse);

  // Twin-Core深度計算
  const lpQaDepth = await calculateTwinCoreDepth(logEntry.response);
  const chatOsDepth = await calculateTwinCoreDepth(chatOsResponse);
  const depthDiff = Math.abs(lpQaDepth - chatOsDepth);

  // Fire/Waterバランス計算
  const lpQaBalance = await calculateFireWaterBalance(logEntry.response);
  const chatOsBalance = await calculateFireWaterBalance(chatOsResponse);
  const balanceDiff = Math.abs(lpQaBalance.fire - chatOsBalance.fire);

  return {
    questionId: logEntry.id,
    question: logEntry.question,
    lpQaResponse: logEntry.response,
    chatOsResponse,
    similarity,
    twinCoreDepth: {
      lpQa: lpQaDepth,
      chatOs: chatOsDepth,
      difference: depthDiff,
    },
    fireWaterBalance: {
      lpQa: lpQaBalance,
      chatOs: chatOsBalance,
      difference: balanceDiff,
    },
  };
}

/**
 * LP実地テストを実行し、レポートを生成
 * 
 * @param testCount テスト実行件数
 * @returns フィールドテストレポート
 */
export async function runFieldTest(testCount: number = 10): Promise<FieldTestReport> {
  const logs = await fetchLpQaLogs(testCount);

  if (logs.length === 0) {
    return {
      testDate: new Date(),
      totalTests: 0,
      averageSimilarity: 0,
      averageTwinCoreDepthDiff: 0,
      averageFireWaterDiff: 0,
      personaMatchRate: 0,
      results: [],
      summary: {
        highSimilarity: 0,
        mediumSimilarity: 0,
        lowSimilarity: 0,
      },
    };
  }

  // 各ログに対してテストを実行
  const results: PersonaMatchResult[] = [];
  for (const log of logs) {
    const result = await runPersonaMatchTest(log);
    results.push(result);
  }

  // 統計計算
  const totalTests = results.length;
  const averageSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / totalTests;
  const averageTwinCoreDepthDiff =
    results.reduce((sum, r) => sum + r.twinCoreDepth.difference, 0) / totalTests;
  const averageFireWaterDiff =
    results.reduce((sum, r) => sum + r.fireWaterBalance.difference, 0) / totalTests;

  // Persona一致率（similarity >= 0.7 を一致とみなす）
  const matchCount = results.filter((r) => r.similarity >= 0.7).length;
  const personaMatchRate = matchCount / totalTests;

  // サマリー
  const highSimilarity = results.filter((r) => r.similarity >= 0.9).length;
  const mediumSimilarity = results.filter((r) => r.similarity >= 0.7 && r.similarity < 0.9).length;
  const lowSimilarity = results.filter((r) => r.similarity < 0.7).length;

  return {
    testDate: new Date(),
    totalTests,
    averageSimilarity,
    averageTwinCoreDepthDiff,
    averageFireWaterDiff,
    personaMatchRate,
    results,
    summary: {
      highSimilarity,
      mediumSimilarity,
      lowSimilarity,
    },
  };
}

/**
 * テストレポートをMarkdown形式で生成
 * 
 * @param report フィールドテストレポート
 * @returns Markdownテキスト
 */
export function generateTestReportMarkdown(report: FieldTestReport): string {
  const { testDate, totalTests, averageSimilarity, averageTwinCoreDepthDiff, averageFireWaterDiff, personaMatchRate, results, summary } = report;

  let markdown = `# 🌕 TENMON-ARK LP実地テストレポート

**テスト日時**: ${testDate.toISOString()}
**テスト件数**: ${totalTests}件

## 📊 総合評価

| 指標 | 値 | 評価 |
|------|-----|------|
| **Persona一致率** | ${(personaMatchRate * 100).toFixed(2)}% | ${personaMatchRate >= 0.97 ? '✅ 目標達成' : personaMatchRate >= 0.9 ? '⚠️ 良好' : '❌ 要改善'} |
| **平均類似度** | ${(averageSimilarity * 100).toFixed(2)}% | ${averageSimilarity >= 0.9 ? '✅ 優秀' : averageSimilarity >= 0.7 ? '⚠️ 良好' : '❌ 要改善'} |
| **Twin-Core深度差** | ${(averageTwinCoreDepthDiff * 100).toFixed(2)}% | ${averageTwinCoreDepthDiff <= 0.1 ? '✅ 優秀' : averageTwinCoreDepthDiff <= 0.2 ? '⚠️ 良好' : '❌ 要改善'} |
| **Fire/Water差** | ${(averageFireWaterDiff * 100).toFixed(2)}% | ${averageFireWaterDiff <= 0.1 ? '✅ 優秀' : averageFireWaterDiff <= 0.2 ? '⚠️ 良好' : '❌ 要改善'} |

## 📈 類似度分布

| 類似度レベル | 件数 | 割合 |
|-------------|------|------|
| 高（≥90%） | ${summary.highSimilarity}件 | ${((summary.highSimilarity / totalTests) * 100).toFixed(1)}% |
| 中（70-89%） | ${summary.mediumSimilarity}件 | ${((summary.mediumSimilarity / totalTests) * 100).toFixed(1)}% |
| 低（<70%） | ${summary.lowSimilarity}件 | ${((summary.lowSimilarity / totalTests) * 100).toFixed(1)}% |

## 🔍 詳細結果

`;

  results.forEach((result, index) => {
    markdown += `### テスト ${index + 1}: 質問ID ${result.questionId}

**質問**: ${result.question}

**類似度**: ${(result.similarity * 100).toFixed(2)}%

**Twin-Core深度**:
- LP-QA: ${(result.twinCoreDepth.lpQa * 100).toFixed(1)}%
- ChatOS: ${(result.twinCoreDepth.chatOs * 100).toFixed(1)}%
- 差: ${(result.twinCoreDepth.difference * 100).toFixed(1)}%

**Fire/Waterバランス**:
- LP-QA: 🔥 ${(result.fireWaterBalance.lpQa.fire * 100).toFixed(1)}% / 💧 ${(result.fireWaterBalance.lpQa.water * 100).toFixed(1)}%
- ChatOS: 🔥 ${(result.fireWaterBalance.chatOs.fire * 100).toFixed(1)}% / 💧 ${(result.fireWaterBalance.chatOs.water * 100).toFixed(1)}%
- 差: ${(result.fireWaterBalance.difference * 100).toFixed(1)}%

---

`;
  });

  markdown += `## 🎯 結論

`;

  if (personaMatchRate >= 0.97) {
    markdown += `✅ **目標達成**: Persona一致率 ${(personaMatchRate * 100).toFixed(2)}% を達成しました。LP-QA と ChatOS の人格統一が確認されました。\n`;
  } else if (personaMatchRate >= 0.9) {
    markdown += `⚠️ **良好**: Persona一致率 ${(personaMatchRate * 100).toFixed(2)}% です。目標の97%には届きませんが、良好な結果です。\n`;
  } else {
    markdown += `❌ **要改善**: Persona一致率 ${(personaMatchRate * 100).toFixed(2)}% です。目標の97%に到達するため、さらなる調整が必要です。\n`;
  }

  return markdown;
}
