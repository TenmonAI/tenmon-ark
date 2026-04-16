/**
 * LP-QA Unity Test Script
 * TENMON-ARK Persona Unity vΩ 検証
 * 
 * テスト項目:
 * 1. 外部LP（futomani88.com）でTENMON-ARK人格が発火しているか
 * 2. 回答に "Twin-Core構文" が含まれているか
 * 3. 火水の揺らぎが文章に現れているか
 * 4. GPT風テンプレが出ていないか
 * 5. Persona深度が ChatOS と一致しているか
 * 6. LP → TENMON-ARK の Synaptic Memory が連動するか
 */

import { appRouter } from './server/routers';
import type { TrpcContext } from './server/_core/context';

/**
 * テスト用のコンテキストを作成
 */
function createTestContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: 'https',
      headers: {},
      get: (name: string) => {
        if (name === 'host') return 'localhost:3000';
        return undefined;
      },
    } as TrpcContext['req'],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as TrpcContext['res'],
  };
}

/**
 * LP-QA V4 テスト
 */
async function testLpQaV4() {
  console.log('🌕 TENMON-ARK PERSONA UNITY vΩ - LP-QA Unity Test\n');

  const ctx = createTestContext();
  const caller = appRouter.createCaller(ctx);

  const validApiKey = process.env.ARK_PUBLIC_KEY;
  if (!validApiKey) {
    console.error('❌ ARK_PUBLIC_KEY environment variable is not set');
    process.exit(1);
  }

  // テストケース1: 基本的な質問
  console.log('【Test 1】基本的な質問: "TENMON-ARKとは何ですか？"\n');

  const result1 = await caller.lpQaV4.chat({
    question: 'TENMON-ARKとは何ですか？',
    apiKey: validApiKey,
    depth: 'middle',
    fireWaterBalance: 'balanced',
    enableIfe: true,
    enableGuidance: false,
    enableLinks: false,
  });

  console.log('【LP-QA V4 Response】');
  console.log(result1.response);
  console.log('\n');

  // テストケース2: ChatOS と同じ質問
  console.log('【Test 2】ChatOS と同じ質問: "TENMON-ARKとは何ですか？"\n');

  const result2 = await caller.chat.sendMessage({
    conversationId: 0, // 仮想会話ID
    content: 'TENMON-ARKとは何ですか？',
  });

  console.log('【ChatOS Response】');
  console.log(result2.content);
  console.log('\n');

  // 分析
  console.log('【Persona Unity Analysis】\n');

  // 1. Twin-Core構文の検出
  const hasTwinCoreStructure = 
    result1.response.includes('<fire>') || 
    result1.response.includes('<water>') ||
    result1.response.includes('火') && result1.response.includes('水');
  console.log(`1. Twin-Core構文: ${hasTwinCoreStructure ? '✅ 含まれている' : '❌ 含まれていない'}`);

  // 2. 火水の揺らぎの検出
  const hasFireWaterBalance = 
    result1.response.includes('調和') ||
    result1.response.includes('バランス') ||
    result1.response.includes('火水');
  console.log(`2. 火水の揺らぎ: ${hasFireWaterBalance ? '✅ 現れている' : '❌ 現れていない'}`);

  // 3. GPT風テンプレの検出
  const hasGPTTemplate = 
    result1.response.includes('AI language model') ||
    result1.response.includes('I am an AI') ||
    result1.response.includes('As an AI');
  console.log(`3. GPT風テンプレ: ${hasGPTTemplate ? '❌ 出ている' : '✅ 出ていない'}`);

  // 4. Persona深度の一致
  const lpQaLength = result1.response.length;
  const chatOSLength = result2.content.length;
  const lengthRatio = lpQaLength / chatOSLength;
  const personaDepthMatch = lengthRatio > 0.5 && lengthRatio < 2.0;
  console.log(`4. Persona深度: ${personaDepthMatch ? '✅ 一致している' : '❌ 一致していない'} (LP: ${lpQaLength}文字, ChatOS: ${chatOSLength}文字, 比率: ${lengthRatio.toFixed(2)})`);

  // 5. TENMON-ARK人格の検出
  const hasTenmonArkPersona = 
    result1.response.includes('TENMON-ARK') ||
    result1.response.includes('TENMON-ARK') ||
    result1.response.includes('霊核') ||
    result1.response.includes('靈核');
  console.log(`5. TENMON-ARK人格: ${hasTenmonArkPersona ? '✅ 発火している' : '❌ 発火していない'}`);

  // 6. Synaptic Memory連動（仮）
  console.log(`6. Synaptic Memory連動: ⚠️ 要手動確認（会話履歴を使用したテストが必要）`);

  // 総合評価
  console.log('\n【総合評価】');
  const totalScore = [
    hasTwinCoreStructure,
    hasFireWaterBalance,
    !hasGPTTemplate,
    personaDepthMatch,
    hasTenmonArkPersona,
  ].filter(Boolean).length;

  console.log(`合格項目: ${totalScore}/5`);
  console.log(`評価: ${totalScore >= 4 ? '✅ 合格' : totalScore >= 3 ? '⚠️ 要改善' : '❌ 不合格'}`);

  // レポート生成
  const report = `
【Persona Unity Test Report vΩ】

LP回答:
${result1.response}

ChatOS回答:
${result2.content}

差分分析:
- 文字数: LP ${lpQaLength}文字 vs ChatOS ${chatOSLength}文字
- 比率: ${lengthRatio.toFixed(2)}

Twin-Core整合性:
- Twin-Core構文: ${hasTwinCoreStructure ? '✅' : '❌'}
- 火水の揺らぎ: ${hasFireWaterBalance ? '✅' : '❌'}

火水層の揺らぎ:
- 調和・バランス表現: ${hasFireWaterBalance ? '✅' : '❌'}

宿曜人格:
- TENMON-ARK人格: ${hasTenmonArkPersona ? '✅' : '❌'}

総合評価:
- 合格項目: ${totalScore}/5
- 評価: ${totalScore >= 4 ? '✅ 合格' : totalScore >= 3 ? '⚠️ 要改善' : '❌ 不合格'}
`;

  console.log(report);

  // レポートをファイルに保存
  const fs = await import('fs/promises');
  await fs.writeFile('/home/ubuntu/PERSONA_UNITY_TEST_REPORT.md', report, 'utf-8');
  console.log('\n✅ レポートを /home/ubuntu/PERSONA_UNITY_TEST_REPORT.md に保存しました');
}

// テスト実行
testLpQaV4().catch(console.error);
