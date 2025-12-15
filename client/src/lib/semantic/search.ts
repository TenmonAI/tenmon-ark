/**
 * Semantic Search Client
 * セマンティック検索のクライアント側関数
 */

export interface SearchResult {
  document: {
    id: string;
    text: string;
    metadata?: Record<string, unknown>;
  };
  score: number;
}

export interface SemanticSearchResponse {
  results: SearchResult[];
}

export interface SemanticSearchError {
  error: string;
  code: string;
  details?: string;
}

/**
 * セマンティック検索を実行
 * 
 * @param query - 検索クエリ
 * @param limit - 返す結果の最大数（デフォルト: 10）
 * @returns 検索結果の配列
 */
export async function semanticSearch(
  query: string,
  limit: number = 10
): Promise<SearchResult[]> {
  try {
    const response = await fetch('/api/concierge/semantic-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' })) as SemanticSearchError;
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json() as SemanticSearchResponse;
    return data.results;

  } catch (error) {
    console.error('[Semantic Search] Error:', error);
    throw error;
  }
}

/**
 * ドキュメントをインデックスに追加
 * 
 * @param document - 追加するドキュメント
 * @returns 成功/失敗
 */
export async function addDocumentToIndex(document: {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/concierge/semantic-index/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' })) as SemanticSearchError;
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}`,
      };
    }

    const data = await response.json() as { success: boolean };
    return { success: data.success };

  } catch (error) {
    console.error('[Add Document] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add document',
    };
  }
}

