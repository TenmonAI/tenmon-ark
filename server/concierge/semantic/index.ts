/**
 * Semantic Index
 * セマンティック検索用のインデックス構造
 * シンプルな cosine similarity を使用
 */

import { embedText, type Embedding } from '../embedder';

export interface Document {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  document: Document;
  score: number;
}

export interface SemanticIndex {
  documents: Map<string, Document>;
  embeddings: Map<string, Embedding>;
}

/**
 * Cosine similarity を計算
 * 
 * @param a - ベクトルA
 * @param b - ベクトルB
 * @returns 類似度（0-1）
 */
function cosineSimilarity(a: Embedding, b: Embedding): number {
  if (a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * 新しいSemantic Indexを作成
 * 
 * @returns 空のインデックス
 */
export function createIndex(): SemanticIndex {
  return {
    documents: new Map(),
    embeddings: new Map(),
  };
}

/**
 * ドキュメントをインデックスに追加
 * 
 * @param index - インデックス
 * @param document - 追加するドキュメント
 * @returns 成功/失敗
 */
export async function addDocument(
  index: SemanticIndex,
  document: Document
): Promise<{ success: boolean; error?: string }> {
  try {
    // 既に存在する場合は更新
    if (index.documents.has(document.id)) {
      // 既存のドキュメントを更新
      index.documents.set(document.id, document);
      
      // 新しいエンベディングを生成
      const embeddingResult = await embedText(document.text);
      if ('error' in embeddingResult) {
        return {
          success: false,
          error: embeddingResult.error,
        };
      }
      
      index.embeddings.set(document.id, embeddingResult);
      return { success: true };
    }

    // 新しいドキュメントを追加
    index.documents.set(document.id, document);

    // エンベディングを生成
    const embeddingResult = await embedText(document.text);
    if ('error' in embeddingResult) {
      // エンベディング生成に失敗した場合はドキュメントも削除
      index.documents.delete(document.id);
      return {
        success: false,
        error: embeddingResult.error,
      };
    }

    index.embeddings.set(document.id, embeddingResult);
    return { success: true };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add document',
    };
  }
}

/**
 * クエリでセマンティック検索を実行
 * 
 * @param index - インデックス
 * @param query - 検索クエリ
 * @param limit - 返す結果の最大数（デフォルト: 10）
 * @returns 検索結果の配列
 */
export async function search(
  index: SemanticIndex,
  query: string,
  limit: number = 10
): Promise<SearchResult[] | { error: string }> {
  try {
    // クエリのエンベディングを生成
    const queryEmbeddingResult = await embedText(query);
    if ('error' in queryEmbeddingResult) {
      return {
        error: queryEmbeddingResult.error,
      };
    }

    const queryEmbedding = queryEmbeddingResult;

    // すべてのドキュメントとの類似度を計算
    const results: SearchResult[] = [];

    for (const [id, document] of index.documents.entries()) {
      const documentEmbedding = index.embeddings.get(id);
      if (!documentEmbedding) {
        continue; // エンベディングが存在しない場合はスキップ
      }

      const score = cosineSimilarity(queryEmbedding, documentEmbedding);
      results.push({
        document,
        score,
      });
    }

    // スコアでソート（降順）
    results.sort((a, b) => b.score - a.score);

    // 上位limit件を返す
    return results.slice(0, limit);

  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Search failed',
    };
  }
}

/**
 * ドキュメントをインデックスから削除
 * 
 * @param index - インデックス
 * @param id - 削除するドキュメントのID
 */
export function removeDocument(index: SemanticIndex, id: string): void {
  index.documents.delete(id);
  index.embeddings.delete(id);
}

/**
 * インデックスのサイズを取得
 * 
 * @param index - インデックス
 * @returns ドキュメント数
 */
export function getIndexSize(index: SemanticIndex): number {
  return index.documents.size;
}

/**
 * サイト別インデックス管理（グローバル）
 */
const siteIndexes = new Map<string, SemanticIndex>();

/**
 * サイト別インデックスを取得（存在しない場合は作成）
 * 
 * @param siteId - サイトID
 * @returns インデックス
 */
export function getSiteIndex(siteId: string): SemanticIndex {
  if (!siteIndexes.has(siteId)) {
    siteIndexes.set(siteId, createIndex());
  }
  return siteIndexes.get(siteId)!;
}

/**
 * サイト別インデックスにドキュメントを追加
 * 
 * @param siteId - サイトID
 * @param document - 追加するドキュメント
 * @returns 成功/失敗
 */
export async function addDocumentToIndex(
  siteId: string,
  document: Document
): Promise<{ success: boolean; error?: string }> {
  const index = getSiteIndex(siteId);
  return await addDocument(index, document);
}

/**
 * サイト別インデックスで検索
 * 
 * @param query - 検索クエリ
 * @param limit - 返す結果の最大数
 * @param options - オプション（siteIdでフィルタ）
 * @returns 検索結果の配列
 */
export async function semanticSearch(
  query: string,
  limit: number = 10,
  options?: { siteId?: string }
): Promise<SearchResult[]> {
  if (options?.siteId) {
    // サイト別インデックスで検索
    const index = getSiteIndex(options.siteId);
    const result = await search(index, query, limit);
    if ('error' in result) {
      console.error('[Semantic Search] Error:', result.error);
      return [];
    }
    return result;
  }

  // 全サイトのインデックスを統合して検索（デフォルト動作）
  // TODO: グローバルインデックスがある場合はそれを使用
  return [];
}

/**
 * サイト別インデックスの統計を取得
 * 
 * @param options - オプション（siteIdでフィルタ）
 * @returns 統計情報
 */
export async function getIndexStats(options?: { siteId?: string }): Promise<{
  documentCount: number;
  siteId?: string;
}> {
  if (options?.siteId) {
    const index = getSiteIndex(options.siteId);
    return {
      documentCount: getIndexSize(index),
      siteId: options.siteId,
    };
  }

  // 全サイトの統計を合計
  let totalCount = 0;
  for (const index of siteIndexes.values()) {
    totalCount += getIndexSize(index);
  }

  return {
    documentCount: totalCount,
  };
}

