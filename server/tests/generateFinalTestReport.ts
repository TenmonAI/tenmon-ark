/**
 * 🔱 TENMON-ARK Final Test Report Generator
 * 最終テストレポートを生成
 */

import { runFinalSystemTest } from './finalSystemTest';
import { writeFile } from 'fs/promises';

/**
 * 最終テストレポートを生成
 */
export async function generateFinalTestReport(): Promise<string> {
  console.log('[Final Test] Starting final system test...');
  const testResult = await runFinalSystemTest();

  const report = buildTestReport(testResult);

  // レポートをファイルに書き込み
  await writeFile('TENMON_ARK_FINAL_TEST_REPORT.md', report, 'utf-8');

  console.log('[Final Test] ✅ Test report generated: TENMON_ARK_FINAL_TEST_REPORT.md');
  return 'TENMON_ARK_FINAL_TEST_REPORT.md';
}

/**
 * テストレポートを構築
 */
function buildTestReport(result: Awaited<ReturnType<typeof runFinalSystemTest>>): string {
  const passRate = result.total > 0 ? Math.round((result.passed / result.total) * 100) : 0;

  return `# 🔱 TENMON-ARK Final Test Report

**実行日時**: ${new Date().toISOString()}  
**テスト結果**: ${result.passed}/${result.total} 通過 (${passRate}%)

---

## テストサマリー

| カテゴリ | 通過 | 失敗 | スキップ | 合計 |
|---------|------|------|---------|------|
| Core OS | ${result.summary.coreOS.passed} | ${result.summary.coreOS.failed} | - | ${result.summary.coreOS.passed + result.summary.coreOS.failed} |
| Concierge | ${result.summary.concierge.passed} | ${result.summary.concierge.failed} | - | ${result.summary.concierge.passed + result.summary.concierge.failed} |
| Multi-Tenant | ${result.summary.multiTenant.passed} | ${result.summary.multiTenant.failed} | - | ${result.summary.multiTenant.passed + result.summary.multiTenant.failed} |
| Self-Evolution | ${result.summary.selfEvolution.passed} | ${result.summary.selfEvolution.failed} | - | ${result.summary.selfEvolution.passed + result.summary.selfEvolution.failed} |
| **合計** | **${result.passed}** | **${result.failed}** | **${result.skipped}** | **${result.total}** |

---

## テスト詳細

${result.results.map(test => `
### ${test.testId}: ${test.name}
- **ステータス**: ${test.status === 'PASSED' ? '✅ 通過' : test.status === 'FAILED' ? '❌ 失敗' : '⏸️ スキップ'}
- **実行時間**: ${test.duration}ms
${test.error ? `- **エラー**: ${test.error}` : ''}
`).join('\n')}

---

## 結論

${result.failed === 0 ? '✅ **すべてのテストが通過しました**' : `⚠️ **${result.failed}件のテストが失敗しました**`}

**推奨**: ${result.failed === 0 ? 'リリース準備が整いました。' : '失敗したテストを修正してから再度テストを実行してください。'}

---

**テスト完了**: ✅ FINAL_TEST_COMPLETE
`;
}

