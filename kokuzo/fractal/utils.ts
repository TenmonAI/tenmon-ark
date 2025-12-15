/**
 * 🔱 KOKŪZŌ Fractal Engine — ユーティリティ
 */

/**
 * ベクトルを正規化（L2ノルムで正規化）
 */
export function normalize(vector: number[]): number[] {
  const sum = vector.reduce((a, b) => a + b, 0);
  if (sum === 0) {
    return vector;
  }
  return vector.map(v => v / sum);
}

/**
 * Cosine similarity を計算
 */
export function cosineSimilarity(a: number[], b: number[]): number {
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

