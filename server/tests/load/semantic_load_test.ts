/**
 * Semantic Index Load Test
 * 2万件のドキュメントで負荷テストを実行
 */

import { createIndex, addDocument, search, type SemanticIndex, type Document } from '../../concierge/semantic';

/**
 * テスト用のドキュメントを生成
 */
function generateTestDocuments(count: number): Document[] {
  const documents: Document[] = [];
  const categories = ['tech', 'science', 'art', 'philosophy', 'history'];
  const topics = [
    'artificial intelligence', 'quantum computing', 'neural networks',
    'machine learning', 'deep learning', 'natural language processing',
    'computer vision', 'robotics', 'blockchain', 'cryptocurrency',
  ];

  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length];
    const topic = topics[i % topics.length];
    const text = `This is a test document about ${topic} in the ${category} category. Document ID: ${i}. ` +
      `It contains information about ${topic} and its applications in ${category}. ` +
      `This document is part of a load test to evaluate the performance of the semantic index.`;

    documents.push({
      id: `test_doc_${i}`,
      text,
      metadata: {
        category,
        topic,
        index: i,
        timestamp: new Date().toISOString(),
      },
    });
  }

  return documents;
}

/**
 * 負荷テストを実行
 */
export async function runSemanticLoadTest(
  documentCount: number = 20000,
  searchQueries: string[] = [
    'artificial intelligence',
    'quantum computing',
    'machine learning',
    'blockchain',
    'neural networks',
  ]
): Promise<{
  indexCreationTime: number;
  documentAdditionTime: number;
  averageSearchTime: number;
  searchResults: Array<{ query: string; time: number; resultCount: number }>;
  memoryUsage: NodeJS.MemoryUsage;
}> {
  console.log(`[Semantic Load Test] Starting load test with ${documentCount} documents...`);

  // 1. インデックス作成
  const indexStartTime = performance.now();
  const index: SemanticIndex = createIndex();
  const indexCreationTime = performance.now() - indexStartTime;
  console.log(`[Semantic Load Test] Index created in ${indexCreationTime.toFixed(2)}ms`);

  // 2. ドキュメント追加
  const documents = generateTestDocuments(documentCount);
  const addStartTime = performance.now();
  
  let addedCount = 0;
  for (const doc of documents) {
    const result = await addDocument(index, doc);
    if (result.success) {
      addedCount++;
    }
    
    // 進捗表示（1000件ごと）
    if (addedCount % 1000 === 0) {
      console.log(`[Semantic Load Test] Added ${addedCount}/${documentCount} documents...`);
    }
  }
  
  const documentAdditionTime = performance.now() - addStartTime;
  console.log(`[Semantic Load Test] Added ${addedCount} documents in ${documentAdditionTime.toFixed(2)}ms`);
  console.log(`[Semantic Load Test] Average time per document: ${(documentAdditionTime / addedCount).toFixed(2)}ms`);

  // 3. 検索テスト
  const searchResults: Array<{ query: string; time: number; resultCount: number }> = [];
  let totalSearchTime = 0;

  for (const query of searchQueries) {
    const searchStartTime = performance.now();
    const result = await search(index, query, 10);
    const searchTime = performance.now() - searchStartTime;
    
    const resultCount = Array.isArray(result) ? result.length : 0;
    searchResults.push({
      query,
      time: searchTime,
      resultCount,
    });
    
    totalSearchTime += searchTime;
    console.log(`[Semantic Load Test] Search "${query}": ${resultCount} results in ${searchTime.toFixed(2)}ms`);
  }

  const averageSearchTime = totalSearchTime / searchQueries.length;

  // 4. メモリ使用量
  const memoryUsage = process.memoryUsage();

  console.log(`[Semantic Load Test] Load test completed:`);
  console.log(`  - Index creation: ${indexCreationTime.toFixed(2)}ms`);
  console.log(`  - Document addition: ${documentAdditionTime.toFixed(2)}ms`);
  console.log(`  - Average search time: ${averageSearchTime.toFixed(2)}ms`);
  console.log(`  - Memory usage: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);

  return {
    indexCreationTime,
    documentAdditionTime,
    averageSearchTime,
    searchResults,
    memoryUsage,
  };
}

/**
 * ベンチマーク結果を比較
 */
export function compareBenchmarkResults(
  results: Array<{
    documentCount: number;
    indexCreationTime: number;
    documentAdditionTime: number;
    averageSearchTime: number;
  }>
): {
  fastestIndexCreation: number;
  fastestDocumentAddition: number;
  fastestSearch: number;
  recommendations: string[];
} {
  const fastestIndexCreation = Math.min(...results.map(r => r.indexCreationTime));
  const fastestDocumentAddition = Math.min(...results.map(r => r.documentAdditionTime));
  const fastestSearch = Math.min(...results.map(r => r.averageSearchTime));

  const recommendations: string[] = [];

  // パフォーマンス推奨事項
  if (fastestSearch > 100) {
    recommendations.push('検索時間が100msを超えています。インデックスの最適化を検討してください。');
  }

  if (fastestDocumentAddition > 1000) {
    recommendations.push('ドキュメント追加時間が長いです。バッチ処理の実装を検討してください。');
  }

  return {
    fastestIndexCreation,
    fastestDocumentAddition,
    fastestSearch,
    recommendations,
  };
}

// CLI実行用（Node.js v22+ ESM対応）
// 使用方法: node --loader tsx server/tests/load/semantic_load_test.ts [documentCount] [query1] [query2] ...
// または: npx tsx server/tests/load/semantic_load_test.ts [documentCount] [query1] [query2] ...
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('semantic_load_test.ts')) {
  const documentCount = parseInt(process.argv[2] || '20000', 10);
  const queries = process.argv.slice(3) || [
    'artificial intelligence',
    'quantum computing',
    'machine learning',
  ];

  runSemanticLoadTest(documentCount, queries)
    .then((results) => {
      console.log('\n[Semantic Load Test] Results:');
      console.log(JSON.stringify(results, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Semantic Load Test] Error:', error);
      process.exit(1);
    });
}

