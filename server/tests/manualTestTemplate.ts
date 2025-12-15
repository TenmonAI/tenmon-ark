/**
 * Manual Test Template Generator
 * 手動テスト用テンプレート生成
 */

import type { TestCase, ManualTestTemplate } from './types';
import { generateTestCases } from './testCases';

/**
 * 手動テスト用テンプレートを生成
 */
export function generateManualTestTemplate(testCase: TestCase): ManualTestTemplate {
  const steps: string[] = [];
  let screenshotRequired = false;

  // テストケースごとの手動テスト手順を生成
  switch (testCase.id) {
    // UI表示系のテスト
    case 'whisper-1':
      steps.push('1. ChatRoomを開く');
      steps.push('2. マイクボタンをクリック');
      steps.push('3. 録音が開始されることを確認');
      screenshotRequired = true;
      break;

    case 'whisper-2':
      steps.push('1. 録音中にマイクボタンをクリック');
      steps.push('2. 録音が停止されることを確認');
      screenshotRequired = true;
      break;

    case 'whisper-19':
      steps.push('1. 録音を開始');
      steps.push('2. "音声入力中"が表示されることを確認');
      screenshotRequired = true;
      break;

    case 'whisper-20':
      steps.push('1. 録音を停止');
      steps.push('2. "変換中"が表示されることを確認');
      screenshotRequired = true;
      break;

    case 'visual-25':
      steps.push('1. 背景生成を開始');
      steps.push('2. ローディング表示を確認');
      screenshotRequired = true;
      break;

    case 'visual-26':
      steps.push('1. 背景生成が完了');
      steps.push('2. プレビュー画像が表示されることを確認');
      screenshotRequired = true;
      break;

    case 'visual-27':
      steps.push('1. 生成された背景を表示');
      steps.push('2. ダウンロードボタンをクリック');
      steps.push('3. 画像がダウンロードされることを確認');
      screenshotRequired = true;
      break;

    case 'mobile-12':
      steps.push('1. MobileOSページを開く');
      steps.push('2. デバイス接続状態が表示されることを確認');
      screenshotRequired = true;
      break;

    case 'semantic-15':
      steps.push('1. Dashboardを開く');
      steps.push('2. Semantic Searchバーから検索を実行');
      steps.push('3. 検索結果が表示されることを確認');
      screenshotRequired = true;
      break;

    case 'feedback-20':
      steps.push('1. Dashboardを開く');
      steps.push('2. "改善を提案"ボタンが表示されることを確認（Founderのみ）');
      screenshotRequired = true;
      break;

    case 'feedback-21':
      steps.push('1. ChatRoomを開く');
      steps.push('2. "改善を提案"ボタンが表示されることを確認（Founderのみ）');
      screenshotRequired = true;
      break;

    case 'integration-whisper-2':
      steps.push('1. 音声入力を実行');
      steps.push('2. 文字起こしが完了');
      steps.push('3. ChatRoomの入力欄に自動挿入されることを確認');
      screenshotRequired = true;
      break;

    // UX体験系のテスト
    case 'ux-dashboard-1':
      steps.push('1. ホームページからDashboardに遷移');
      steps.push('2. 正常に表示されることを確認');
      screenshotRequired = true;
      break;

    case 'ux-chatroom-4':
      steps.push('1. ChatRoomでメッセージを送信');
      steps.push('2. フェードインアニメーションが動作することを確認');
      screenshotRequired = true;
      break;

    case 'ux-chatroom-10':
      steps.push('1. ChatRoomでメッセージを送信');
      steps.push('2. ChatBubbleの出現アニメーションを確認');
      screenshotRequired = true;
      break;

    case 'ux-chatroom-11':
      steps.push('1. ChatRoomでメッセージを送信（Reasoning Stepsあり）');
      steps.push('2. "Show Reasoning"ボタンが表示されることを確認');
      screenshotRequired = true;
      break;

    case 'ux-chatroom-12':
      steps.push('1. "Show Reasoning"ボタンをクリック');
      steps.push('2. Reasoning Stepsが展開されることを確認');
      screenshotRequired = true;
      break;

    case 'ux-chatroom-13':
      steps.push('1. 展開されたReasoning Stepsを折り畳む');
      steps.push('2. ステップが非表示になることを確認');
      screenshotRequired = true;
      break;

    case 'ux-chatroom-16':
      steps.push('1. 音声入力を実行');
      steps.push('2. 自動送信オプションを有効にする');
      steps.push('3. 文字起こし完了後に自動送信されることを確認');
      screenshotRequired = true;
      break;

    case 'ux-chatroom-27':
      steps.push('1. モバイルデバイスでChatRoomを開く');
      steps.push('2. レイアウトが正しく表示されることを確認');
      screenshotRequired = true;
      break;

    case 'ux-chatroom-28':
      steps.push('1. タブレットでChatRoomを開く');
      steps.push('2. レイアウトが正しく表示されることを確認');
      screenshotRequired = true;
      break;

    case 'ux-chatroom-29':
      steps.push('1. デスクトップでChatRoomを開く');
      steps.push('2. レイアウトが正しく表示されることを確認');
      screenshotRequired = true;
      break;

    default:
      // デフォルトの手順
      steps.push(`1. ${testCase.feature}の機能を実行`);
      steps.push(`2. ${testCase.expectedResult}を確認`);
      break;
  }

  return {
    testCaseId: testCase.id,
    name: testCase.name,
    description: testCase.description,
    steps,
    expectedResult: testCase.expectedResult,
    screenshotRequired,
    notes: testCase.autoRunnable 
      ? 'このテストは自動実行可能です。手動テストは任意です。'
      : 'このテストは手動テストが必要です。',
  };
}

/**
 * すべての手動テストテンプレートを生成
 */
export function generateAllManualTestTemplates(): ManualTestTemplate[] {
  const testCases = generateTestCases();
  const manualTestCases = testCases.filter(tc => !tc.autoRunnable);
  
  return manualTestCases.map(tc => generateManualTestTemplate(tc));
}

