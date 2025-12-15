/**
 * AutoApply Client
 * 自動適用APIを呼び出すクライアント関数
 */

import type { AutoFixPatch } from './autoFix';

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
}

export interface AutoApplyRequest {
  patches: AutoFixPatch[];
  commitMessage: string;
}

/**
 * 改善パッチを自動適用・コミット・プッシュ
 * 
 * @param request - 自動適用リクエスト
 * @returns 自動適用結果
 */
export async function applyPatches(request: AutoApplyRequest): Promise<AutoApplyResult> {
  try {
    const response = await fetch('/api/self-evolution/autoApply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json() as AutoApplyResult;
    return result;

  } catch (error) {
    console.error('[AutoApply] Error:', error);
    throw error;
  }
}

