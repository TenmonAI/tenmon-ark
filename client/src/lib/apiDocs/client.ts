/**
 * API Docs Client
 * API仕様を取得するクライアント関数
 */

import type { ApiDocs } from './types';

/**
 * API仕様を取得
 * 
 * @returns API仕様
 */
export async function fetchApiDocs(): Promise<ApiDocs> {
  try {
    const response = await fetch('/api/docs');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const docs = await response.json() as ApiDocs;
    return docs;

  } catch (error) {
    console.error('[API Docs] Error:', error);
    throw error;
  }
}

