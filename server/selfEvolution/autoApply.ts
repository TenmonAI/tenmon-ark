/**
 * AutoApply Engine
 * 自動適用エンジン - 改善パッチを自動で適用・コミット・プッシュ
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import type { AutoFixPatch } from './autoFix';

const execAsync = promisify(exec);

export interface ApplyResult {
  success: boolean;
  filePath: string;
  message: string;
  error?: string;
}

export interface CommitResult {
  success: boolean;
  commitHash?: string;
  message: string;
  error?: string;
}

export interface PushResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface AutoApplyResult {
  applied: ApplyResult[];
  commit: CommitResult | null;
  push: PushResult | null;
  success: boolean;
  message: string;
  dryRun?: boolean; // dry-runモードかどうか
  conflicts?: Array<{ filePath: string; reason: string }>; // 衝突チェック結果
}

/**
 * パッチの安全性をチェック
 * 危険なパス（root, server/_core, env, config等）の書き換えを禁止
 * 
 * @param patch - パッチ情報
 * @returns 安全性チェック結果
 */
function patchSafetyCheck(patch: AutoFixPatch): { safe: boolean; reason?: string } {
  const filePath = patch.filePath;
  const patchContent = patch.patch;

  // 1. Path traversal チェック（../ を含むパスは拒否）
  if (filePath.includes('../') || filePath.includes('..\\')) {
    return {
      safe: false,
      reason: 'Path traversal detected: ../ is not allowed',
    };
  }

  // 2. 絶対パスのチェック（/ で始まるパスは拒否）
  if (filePath.startsWith('/') && !filePath.startsWith('./')) {
    return {
      safe: false,
      reason: 'Absolute path detected: absolute paths are not allowed',
    };
  }

  // 3. 危険なパスのチェックリスト
  const dangerousPaths = [
    '/',
    '/etc',
    '/usr',
    '/bin',
    '/sbin',
    '/var',
    '/sys',
    '/proc',
    'server/_core',
    'server/index.ts',
    'server/_core/index.ts',
    '.env',
    '.env.local',
    '.env.production',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'tsconfig.base.json',
    'drizzle.config.ts',
    'vite.config.ts',
    'tailwind.config.ts',
    'next.config.js',
    'next.config.ts',
    'node_modules',
    '.git',
    '.gitignore',
    '.github',
    'server/db.ts',
    'server/_core/sdk.ts',
    'server/_core/trpc.ts',
    'server/_core/context.ts',
  ];

  // 正規化されたパス（./ を削除、パス区切りを統一）
  const normalizedPath = filePath.replace(/^\.\//, '').replace(/\\/g, '/');

  for (const dangerousPath of dangerousPaths) {
    // 完全一致または危険パスで始まる場合は拒否
    if (normalizedPath === dangerousPath || normalizedPath.startsWith(dangerousPath + '/')) {
      return {
        safe: false,
        reason: `Dangerous path detected: ${dangerousPath} is protected`,
      };
    }
  }

  // 4. unified diff 内の path traversal チェック
  const lines = patchContent.split('\n');
  for (const line of lines) {
    // --- または +++ で始まる行（ファイルパス行）をチェック
    if (line.startsWith('---') || line.startsWith('+++')) {
      const pathInDiff = line.substring(4).trim();
      if (pathInDiff.includes('../') || pathInDiff.includes('..\\')) {
        return {
          safe: false,
          reason: 'Path traversal detected in diff: ../ is not allowed',
        };
      }
    }
  }

  return { safe: true };
}

/**
 * パッチの衝突チェック（既存ファイルとの競合を検出）
 * 
 * @param patch - パッチ情報
 * @returns 衝突チェック結果
 */
async function checkPatchConflicts(patch: AutoFixPatch): Promise<{ hasConflict: boolean; reason?: string }> {
  try {
    const filePath = patch.filePath;
    
    // ファイルが存在する場合は内容を読み込む
    if (existsSync(filePath)) {
      const currentContent = await readFile(filePath, 'utf-8');
      const patchContent = patch.patch;
      
      // unified diffをパースして、変更箇所を確認
      const lines = patchContent.split('\n');
      const fileLines = currentContent.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('@@')) {
          const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
          if (match) {
            const hunkStart = parseInt(match[1], 10) - 1; // 0-based index
            const hunkOldLines = parseInt(match[2] || '1', 10);
            
            // ファイルの範囲チェック
            if (hunkStart < 0 || hunkStart >= fileLines.length) {
              return {
                hasConflict: true,
                reason: `Hunk start position ${hunkStart} is out of bounds (file has ${fileLines.length} lines)`,
              };
            }
            
            // コンテキスト行の一致チェック
            let contextLineIndex = hunkStart;
            for (const patchLine of lines) {
              if (patchLine.startsWith(' ')) {
                // コンテキスト行（変更なし）
                const expectedLine = patchLine.substring(1);
                if (contextLineIndex < fileLines.length && fileLines[contextLineIndex] !== expectedLine) {
                  return {
                    hasConflict: true,
                    reason: `Context mismatch at line ${contextLineIndex + 1}: expected "${expectedLine}", got "${fileLines[contextLineIndex]}"`,
                  };
                }
                contextLineIndex++;
              } else if (patchLine.startsWith('-')) {
                // 削除行
                contextLineIndex++;
              }
            }
          }
        }
      }
    }
    
    return { hasConflict: false };
  } catch (error) {
    return {
      hasConflict: true,
      reason: error instanceof Error ? error.message : 'Unknown error during conflict check',
    };
  }
}

/**
 * パッチの dry-run チェック（実際に適用せずに検証）
 * 
 * @param patch - パッチ情報
 * @returns dry-run結果
 */
async function dryRunPatch(patch: AutoFixPatch): Promise<{ valid: boolean; error?: string; conflicts?: Array<{ filePath: string; reason: string }> }> {
  try {
    const filePath = patch.filePath;
    const patchContent = patch.patch;

    // ファイルが存在する場合は内容を読み込む（検証用）
    if (existsSync(filePath)) {
      await readFile(filePath, 'utf-8');
    }

    // unified diff の基本的な構文チェック
    const lines = patchContent.split('\n');
    let hasHunk = false;

    for (const line of lines) {
      // hunkヘッダーの存在を確認
      if (line.startsWith('@@')) {
        hasHunk = true;
        const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
        if (!match) {
          return {
            valid: false,
            error: 'Invalid hunk header format',
          };
        }
      }
    }

    if (!hasHunk) {
      return {
        valid: false,
        error: 'No valid hunk found in patch',
      };
    }

    // 衝突チェック
    const conflictCheck = await checkPatchConflicts(patch);
    if (conflictCheck.hasConflict) {
      return {
        valid: false,
        error: conflictCheck.reason || 'Patch conflicts detected',
        conflicts: conflictCheck.hasConflict ? [{ filePath: patch.filePath, reason: conflictCheck.reason || 'Unknown conflict' }] : undefined,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error during dry-run',
    };
  }
}

/**
 * ローカルに unified diff を適用
 * 
 * @param patch - パッチ情報
 * @returns 適用結果
 */
export async function applyPatch(patch: AutoFixPatch): Promise<ApplyResult> {
  try {
    // 1. 安全性チェック
    const safetyCheck = patchSafetyCheck(patch);
    if (!safetyCheck.safe) {
      return {
        success: false,
        filePath: patch.filePath,
        message: `パッチの安全性チェックに失敗しました: ${safetyCheck.reason}`,
        error: safetyCheck.reason,
      };
    }

    // 2. Dry-run チェック
    const dryRunResult = await dryRunPatch(patch);
    if (!dryRunResult.valid) {
      return {
        success: false,
        filePath: patch.filePath,
        message: `パッチのdry-runチェックに失敗しました: ${dryRunResult.error}`,
        error: dryRunResult.error,
      };
    }

    const filePath = patch.filePath;
    const patchContent = patch.patch;
  try {
    const filePath = patch.filePath;
    const patchContent = patch.patch;

    // ファイルが存在するか確認
    if (!existsSync(filePath)) {
      // ディレクトリが存在しない場合は作成
      const dir = dirname(filePath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
      // 新規ファイルの場合は空のファイルを作成
      await writeFile(filePath, '', 'utf-8');
    }

    // unified diffをパースして適用
    const result = await applyUnifiedDiff(filePath, patchContent);

    return {
      success: true,
      filePath,
      message: `パッチを適用しました: ${filePath}`,
    };

  } catch (error) {
    return {
      success: false,
      filePath: patch.filePath,
      message: `パッチの適用に失敗しました`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * unified diffをパースして適用
 */
async function applyUnifiedDiff(filePath: string, patchContent: string): Promise<void> {
  // ファイルの現在の内容を読み込む
  let fileContent = '';
  if (existsSync(filePath)) {
    fileContent = await readFile(filePath, 'utf-8');
  }

  // unified diffをパース
  const lines = patchContent.split('\n');
  const fileLines = fileContent.split('\n');
  const newLines: string[] = [];
  
  let i = 0;
  let inHunk = false;
  let hunkStart = 0;
  let hunkOldLines = 0;
  let hunkNewLines = 0;
  let hunkContext = 0;

  for (const line of lines) {
    // ファイルパス行をスキップ
    if (line.startsWith('---') || line.startsWith('+++')) {
      continue;
    }

    // hunkヘッダーをパース
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (match) {
        inHunk = true;
        hunkStart = parseInt(match[1], 10) - 1; // 0-based index
        hunkOldLines = parseInt(match[2] || '1', 10);
        hunkNewLines = parseInt(match[3] || '1', 10);
        hunkContext = parseInt(match[4] || '1', 10);
        
        // hunk開始位置まで既存の行をコピー
        while (i < hunkStart && i < fileLines.length) {
          newLines.push(fileLines[i]);
          i++;
        }
      }
      continue;
    }

    if (inHunk) {
      if (line.startsWith(' ')) {
        // コンテキスト行（変更なし）
        if (i < fileLines.length && fileLines[i] === line.substring(1)) {
          newLines.push(fileLines[i]);
          i++;
        }
      } else if (line.startsWith('-')) {
        // 削除行
        i++; // 既存の行をスキップ
      } else if (line.startsWith('+')) {
        // 追加行
        newLines.push(line.substring(1));
      } else if (line.trim() === '') {
        // 空行（hunk終了）
        inHunk = false;
      }
    }
  }

  // 残りの行をコピー
  while (i < fileLines.length) {
    newLines.push(fileLines[i]);
    i++;
  }

  // ファイルに書き込む
  const newContent = newLines.join('\n');
  await writeFile(filePath, newContent, 'utf-8');
}

/**
 * `git add .` → `git commit -m` を実行
 * 
 * @param message - コミットメッセージ
 * @returns コミット結果
 */
export async function commitChanges(message: string): Promise<CommitResult> {
  try {
    // git add .
    await execAsync('git add .', {
      cwd: process.cwd(),
    });

    // git commit -m
    const { stdout } = await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
      cwd: process.cwd(),
    });

    // コミットハッシュを抽出
    const commitHashMatch = stdout.match(/\[([a-f0-9]+)\]/);
    const commitHash = commitHashMatch ? commitHashMatch[1] : undefined;

    return {
      success: true,
      commitHash,
      message: '変更をコミットしました',
    };

  } catch (error) {
    return {
      success: false,
      message: 'コミットに失敗しました',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * `git push` を実行
 * 
 * @returns プッシュ結果
 */
export async function pushChanges(): Promise<PushResult> {
  try {
    const { stdout } = await execAsync('git push', {
      cwd: process.cwd(),
    });

    return {
      success: true,
      message: '変更をプッシュしました',
    };

  } catch (error) {
    return {
      success: false,
      message: 'プッシュに失敗しました',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * patch適用 → commit → push の一連処理
 * 
 * @param patches - 適用するパッチの配列
 * @param commitMessage - コミットメッセージ
 * @param dryRun - dry-runモード（実際には適用しない）
 * @returns 自動適用結果
 */
export async function runAutoApplyPipeline(
  patches: AutoFixPatch[],
  commitMessage: string,
  dryRun: boolean = false
): Promise<AutoApplyResult> {
  const applied: ApplyResult[] = [];
  let allSuccess = true;
  let hasSafetyError = false;
  const conflicts: Array<{ filePath: string; reason: string }> = [];

  // 1. すべてのパッチの安全性を事前チェック
  for (const patch of patches) {
    const safetyCheck = patchSafetyCheck(patch);
    if (!safetyCheck.safe) {
      applied.push({
        success: false,
        filePath: patch.filePath,
        message: `パッチの安全性チェックに失敗しました: ${safetyCheck.reason}`,
        error: safetyCheck.reason,
      });
      allSuccess = false;
      hasSafetyError = true;
    }
  }

  // 安全性エラーがある場合は、適用せずに終了（commit/push しない）
  if (hasSafetyError) {
    return {
      applied,
      commit: null,
      push: null,
      success: false,
      message: '安全性チェックに失敗したパッチが検出されました。適用を中止しました。',
      dryRun,
      conflicts,
    };
  }

  // 2. すべてのパッチの dry-run チェック（衝突チェック含む）
  for (const patch of patches) {
    const dryRunResult = await dryRunPatch(patch);
    if (!dryRunResult.valid) {
      applied.push({
        success: false,
        filePath: patch.filePath,
        message: `パッチのdry-runチェックに失敗しました: ${dryRunResult.error}`,
        error: dryRunResult.error,
      });
      allSuccess = false;
      
      // 衝突情報を記録
      if (dryRunResult.conflicts) {
        conflicts.push(...dryRunResult.conflicts);
      }
    }
  }

  // dry-run に失敗したパッチがある場合は、適用せずに終了（commit/push しない）
  if (!allSuccess) {
    return {
      applied,
      commit: null,
      push: null,
      success: false,
      message: 'dry-runチェックに失敗したパッチが検出されました。適用を中止しました。',
      dryRun,
      conflicts,
    };
  }

  // dry-runモードの場合はここで終了（実際の適用は行わない）
  if (dryRun) {
    return {
      applied: patches.map(patch => ({
        success: true,
        filePath: patch.filePath,
        message: `[DRY-RUN] パッチは適用可能です: ${patch.filePath}`,
      })),
      commit: null,
      push: null,
      success: true,
      message: `[DRY-RUN] ${patches.length}件のパッチは適用可能です（実際には適用されていません）`,
      dryRun: true,
      conflicts,
    };
  }

  // 3. パッチを適用（すべての安全性チェックとdry-runが成功した場合のみ）
  for (const patch of patches) {
    const result = await applyPatch(patch);
    applied.push(result);
    if (!result.success) {
      allSuccess = false;
    }
  }

  // パッチ適用に失敗した場合はここで終了（commit/push しない）
  if (!allSuccess) {
    return {
      applied,
      commit: null,
      push: null,
      success: false,
      message: '一部のパッチの適用に失敗しました。コミット・プッシュは実行されませんでした。',
      dryRun: false,
      conflicts,
    };
  }

  // 4. コミット（全パッチが安全に適用できた場合のみ）
  const commit = await commitChanges(commitMessage);
  if (!commit.success) {
    return {
      applied,
      commit,
      push: null,
      success: false,
      message: 'パッチの適用は成功しましたが、コミットに失敗しました。プッシュは実行されませんでした。',
      dryRun: false,
      conflicts,
    };
  }

  // 5. プッシュ（全パッチが安全に適用でき、コミットも成功した場合のみ）
  const push = await pushChanges();
  if (!push.success) {
    return {
      applied,
      commit,
      push,
      success: false,
      message: 'パッチの適用とコミットは成功しましたが、プッシュに失敗しました。',
      dryRun: false,
      conflicts,
    };
  }

  return {
    applied,
    commit,
    push,
    success: true,
    message: 'すべてのパッチを安全に適用し、コミット・プッシュしました',
    dryRun: false,
    conflicts,
  };
}

