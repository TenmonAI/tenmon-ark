/**
 * AutoFix Engine
 * 自動修復エンジン - 改善タスクから自動修復パッチを生成
 */

import type { ImprovementTask, TaskCategory } from './genesis';

export interface AutoFixPatch {
  id: string;
  taskId: string;
  filePath: string;
  patch: string; // 差分形式の文字列（Cursor用）
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedImpact: string;
}

export interface AutoFixableTask {
  task: ImprovementTask;
  patches: AutoFixPatch[];
  autoFixable: boolean;
  reason?: string;
}

export interface AutoFixSummary {
  totalTasks: number;
  autoFixableCount: number;
  patches: AutoFixPatch[];
  tasks: AutoFixableTask[];
  generatedAt: string;
}

/**
 * 改善タスクのうち、自動修正が可能なものを抽出
 * 
 * @param tasks - 改善タスクの配列
 * @returns 自動修正可能なタスクの配列
 */
export function identifyAutoFixableTasks(tasks: ImprovementTask[]): AutoFixableTask[] {
  const autoFixableTasks: AutoFixableTask[] = [];

  for (const task of tasks) {
    const autoFixable = isAutoFixable(task);
    
    if (autoFixable.canFix) {
      const patches = generateFixPatch(task);
      autoFixableTasks.push({
        task,
        patches,
        autoFixable: true,
      });
    } else {
      autoFixableTasks.push({
        task,
        patches: [],
        autoFixable: false,
        reason: autoFixable.reason,
      });
    }
  }

  return autoFixableTasks;
}

/**
 * タスクが自動修正可能かどうかを判定
 */
function isAutoFixable(task: ImprovementTask): { canFix: boolean; reason?: string } {
  // UI/UXカテゴリの一部は自動修正可能
  if (task.category === 'ui-ux') {
    const lowerTitle = task.title.toLowerCase();
    const lowerDesc = task.description.toLowerCase();
    
    // 色・スタイル関連は自動修正可能
    if (lowerTitle.includes('色') || lowerTitle.includes('color') ||
        lowerDesc.includes('色') || lowerDesc.includes('color') ||
        lowerTitle.includes('スタイル') || lowerTitle.includes('style')) {
      return { canFix: true };
    }
    
    // レイアウト関連は一部自動修正可能
    if (lowerTitle.includes('レイアウト') || lowerTitle.includes('layout') ||
        lowerTitle.includes('配置') || lowerTitle.includes('position')) {
      return { canFix: true };
    }
  }

  // 推論精度カテゴリのエラーハンドリング改善は自動修正可能
  if (task.category === 'reasoning') {
    const lowerTitle = task.title.toLowerCase();
    const lowerDesc = task.description.toLowerCase();
    
    if (lowerTitle.includes('エラー') || lowerTitle.includes('error') ||
        lowerDesc.includes('エラー') || lowerDesc.includes('error')) {
      return { canFix: true };
    }
  }

  // 音声カテゴリの一部は自動修正可能
  if (task.category === 'voice') {
    const lowerTitle = task.title.toLowerCase();
    
    if (lowerTitle.includes('ui') || lowerTitle.includes('表示') ||
        lowerTitle.includes('ボタン') || lowerTitle.includes('button')) {
      return { canFix: true };
    }
  }

  // その他のカテゴリは基本的に自動修正不可
  return { 
    canFix: false, 
    reason: `${task.category}カテゴリのタスクは自動修正が困難です。手動での対応が必要です。` 
  };
}

/**
 * Cursor用の改善パッチ案を生成（差分形式の文字列）
 * 
 * @param task - 改善タスク
 * @returns パッチの配列
 */
export function generateFixPatch(task: ImprovementTask): AutoFixPatch[] {
  const patches: AutoFixPatch[] = [];

  // タスクの内容に基づいてパッチを生成
  if (task.category === 'ui-ux') {
    const patch = generateUIPatch(task);
    if (patch) {
      patches.push(patch);
    }
  } else if (task.category === 'reasoning') {
    const patch = generateReasoningPatch(task);
    if (patch) {
      patches.push(patch);
    }
  } else if (task.category === 'voice') {
    const patch = generateVoicePatch(task);
    if (patch) {
      patches.push(patch);
    }
  }

  return patches;
}

/**
 * UI/UX関連のパッチを生成
 */
function generateUIPatch(task: ImprovementTask): AutoFixPatch | null {
  const lowerTitle = task.title.toLowerCase();
  const lowerDesc = task.description.toLowerCase();

  // 色・スタイル関連のパッチ
  if (lowerTitle.includes('色') || lowerTitle.includes('color') ||
      lowerDesc.includes('色') || lowerDesc.includes('color')) {
    return {
      id: `patch_${task.id}_ui_color`,
      taskId: task.id,
      filePath: 'client/src/styles/chatgpt-ui.css',
      patch: generateColorPatch(task),
      description: 'UI色の改善パッチ',
      riskLevel: 'low',
      estimatedImpact: 'UIの視認性向上',
    };
  }

  // レイアウト関連のパッチ
  if (lowerTitle.includes('レイアウト') || lowerTitle.includes('layout')) {
    return {
      id: `patch_${task.id}_ui_layout`,
      taskId: task.id,
      filePath: 'client/src/styles/chatgpt-ui.css',
      patch: generateLayoutPatch(task),
      description: 'レイアウト改善パッチ',
      riskLevel: 'medium',
      estimatedImpact: 'UIの使いやすさ向上',
    };
  }

  return null;
}

/**
 * 推論精度関連のパッチを生成
 */
function generateReasoningPatch(task: ImprovementTask): AutoFixPatch | null {
  const lowerTitle = task.title.toLowerCase();
  const lowerDesc = task.description.toLowerCase();

  // エラーハンドリング改善のパッチ
  if (lowerTitle.includes('エラー') || lowerTitle.includes('error') ||
      lowerDesc.includes('エラー') || lowerDesc.includes('error')) {
    return {
      id: `patch_${task.id}_reasoning_error`,
      taskId: task.id,
      filePath: 'server/chat/atlasChatRouter.ts',
      patch: generateErrorHandlingPatch(task),
      description: 'エラーハンドリング改善パッチ',
      riskLevel: 'medium',
      estimatedImpact: 'エラー率の低下、安定性向上',
    };
  }

  return null;
}

/**
 * 音声関連のパッチを生成
 */
function generateVoicePatch(task: ImprovementTask): AutoFixPatch | null {
  const lowerTitle = task.title.toLowerCase();

  // UI改善のパッチ
  if (lowerTitle.includes('ui') || lowerTitle.includes('表示') ||
      lowerTitle.includes('ボタン') || lowerTitle.includes('button')) {
    return {
      id: `patch_${task.id}_voice_ui`,
      taskId: task.id,
      filePath: 'client/src/components/voice/SpeechInputButton.tsx',
      patch: generateVoiceUIPatch(task),
      description: '音声入力UI改善パッチ',
      riskLevel: 'low',
      estimatedImpact: '音声入力の使いやすさ向上',
    };
  }

  return null;
}

/**
 * 色関連のパッチを生成（差分形式）
 */
function generateColorPatch(task: ImprovementTask): string {
  return `--- a/client/src/styles/chatgpt-ui.css
+++ b/client/src/styles/chatgpt-ui.css
@@ -60,6 +60,10 @@
 .chatgpt-message-content {
   background-color: #f4f4f4;
   color: #111111;
+  /* 改善: コントラスト比を向上 */
+  background-color: #f8f8f8;
+  color: #0a0a0a;
   padding: 0.75rem 1rem;
   border-radius: 18px;
   max-width: 80%;
`;
}

/**
 * レイアウト関連のパッチを生成（差分形式）
 */
function generateLayoutPatch(task: ImprovementTask): string {
  return `--- a/client/src/styles/chatgpt-ui.css
+++ b/client/src/styles/chatgpt-ui.css
@@ -44,6 +44,8 @@
 .chatgpt-message {
   margin-bottom: 1.5rem;
   display: flex;
+  /* 改善: メッセージ間のスペーシングを最適化 */
+  margin-bottom: 1.25rem;
   flex-direction: column;
   gap: 0.5rem;
`;
}

/**
 * エラーハンドリング改善のパッチを生成（差分形式）
 */
function generateErrorHandlingPatch(task: ImprovementTask): string {
  return `--- a/server/chat/atlasChatRouter.ts
+++ b/server/chat/atlasChatRouter.ts
@@ -186,6 +186,10 @@
       } catch (error) {
         throw new TRPCError({
           code: 'INTERNAL_SERVER_ERROR',
+          // 改善: エラーメッセージを詳細化
+          message: error instanceof Error 
+            ? \`Chat generation failed: \${error.message}\`
+            : 'Chat generation failed',
           details: error instanceof Error ? error.message : 'An unexpected error occurred',
         });
       }
`;
}

/**
 * 音声入力UI改善のパッチを生成（差分形式）
 */
function generateVoiceUIPatch(task: ImprovementTask): string {
  return `--- a/client/src/components/voice/SpeechInputButton.tsx
+++ b/client/src/components/voice/SpeechInputButton.tsx
@@ -54,6 +54,8 @@
   return (
     <div className={\`flex flex-col gap-2 \${className || ''}\`}>
       <Button
+        // 改善: ボタンのアクセシビリティ向上
+        aria-label={isRecording ? '録音停止' : '録音開始'}
         onClick={handleClick}
         disabled={isProcessing}
         variant={isRecording ? 'destructive' : 'default'}
`;
}

/**
 * 人間が承認すべきパッチ一覧を作成
 * 
 * @param tasks - 自動修正可能なタスクの配列
 * @returns パッチサマリー
 */
export function summarizeAutoFix(tasks: AutoFixableTask[]): AutoFixSummary {
  const autoFixableTasks = tasks.filter(t => t.autoFixable);
  const allPatches: AutoFixPatch[] = [];

  for (const task of autoFixableTasks) {
    allPatches.push(...task.patches);
  }

  return {
    totalTasks: tasks.length,
    autoFixableCount: autoFixableTasks.length,
    patches: allPatches,
    tasks: autoFixableTasks,
    generatedAt: new Date().toISOString(),
  };
}

