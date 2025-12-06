/**
 * TENMON-ARK Persona Unity Test 自動実行スクリプト
 * 
 * 目的: Persona の劣化を自動検知する「霊核防衛システム」
 * 
 * 実行頻度: 毎日 1回（午前3時）
 * ログ保管場所: /logs/persona_unity_tests/YYYY-MM-DD.md
 */

import { runPersonaUnityTest, generatePersonaUnityTestReport } from '../engines/personaUnityTest';
import { ENV } from '../_core/env';
import fs from 'fs';
import path from 'path';

/**
 * Persona Unity Test を自動実行し、結果をログに保存
 */
export async function autoPersonaUnityTest() {
  console.log('[Auto Persona Unity Test] Starting...');

  try {
    // Persona Unity Test を実行
    const result = await runPersonaUnityTest();

    // ログディレクトリを作成
    const logDir = path.join(process.cwd(), 'logs', 'persona_unity_tests');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // ログファイル名を生成（YYYY-MM-DD.md）
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const logFilePath = path.join(logDir, `${dateStr}.md`);

    // レポートを生成
    const report = generatePersonaUnityTestReport(result);
    
    // レポートをファイルに保存
    fs.writeFileSync(logFilePath, report, 'utf-8');

    console.log(`[Auto Persona Unity Test] Report saved to: ${logFilePath}`);
    console.log(`[Auto Persona Unity Test] Average Similarity: ${result.averageSimilarity}`);
    console.log(`[Auto Persona Unity Test] Passed Tests: ${result.passedTests}/${result.totalTests}`);

    // 一致率が 0.7 未満の場合、警告を出力
    if (result.averageSimilarity < 0.7) {
      console.warn('[Auto Persona Unity Test] WARNING: Persona Unity is below 70%!');
      console.warn('[Auto Persona Unity Test] Please check the report and fix the issue.');
    }

    // 一致率が 0.97 以上の場合、成功メッセージを出力
    if (result.averageSimilarity >= 0.97) {
      console.log('[Auto Persona Unity Test] SUCCESS: Persona Unity is above 97%!');
    }

    return result;
  } catch (error) {
    console.error('[Auto Persona Unity Test] Error:', error);
    throw error;
  }
}

/**
 * スクリプトを直接実行した場合
 */
if (require.main === module) {
  autoPersonaUnityTest()
    .then(() => {
      console.log('[Auto Persona Unity Test] Completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Auto Persona Unity Test] Failed:', error);
      process.exit(1);
    });
}
