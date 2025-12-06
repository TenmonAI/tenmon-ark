/**
 * User-Sync Evolution: テキスト入力学習
 * - 次に押す可能性の高い単語を予測
 * - 入力欄に「光のヒント」として透過表示
 */

interface WordPair {
  word: string;
  nextWord: string;
  count: number;
}

interface WordFrequency {
  [word: string]: {
    [nextWord: string]: number;
  };
}

const WORD_FREQUENCY_KEY = 'ark_word_frequency';
const INPUT_HISTORY_KEY = 'ark_input_history';
const MAX_HISTORY_SIZE = 1000;
const MIN_CONFIDENCE_THRESHOLD = 2; // 最低出現回数

/**
 * 入力テキストを記録
 */
export function recordInput(text: string): void {
  const history = getInputHistory();
  history.push({
    text,
    timestamp: Date.now(),
  });

  // 履歴サイズ制限
  if (history.length > MAX_HISTORY_SIZE) {
    history.shift();
  }

  localStorage.setItem(INPUT_HISTORY_KEY, JSON.stringify(history));

  // 単語ペアを学習
  learnWordPairs(text);
}

/**
 * 入力履歴を取得
 */
export function getInputHistory(): Array<{ text: string; timestamp: number }> {
  const stored = localStorage.getItem(INPUT_HISTORY_KEY);
  return stored ? JSON.parse(stored) : [];
}

/**
 * 単語ペアを学習
 */
function learnWordPairs(text: string): void {
  const words = tokenizeText(text);
  const frequency = getWordFrequency();

  for (let i = 0; i < words.length - 1; i++) {
    const word = words[i];
    const nextWord = words[i + 1];

    if (!frequency[word]) {
      frequency[word] = {};
    }

    if (!frequency[word][nextWord]) {
      frequency[word][nextWord] = 0;
    }

    frequency[word][nextWord]++;
  }

  localStorage.setItem(WORD_FREQUENCY_KEY, JSON.stringify(frequency));
}

/**
 * テキストをトークン化（単語分割）
 */
function tokenizeText(text: string): string[] {
  // 日本語・英語混在対応
  return text
    .replace(/([ぁ-ん]|[ァ-ヴ]|[一-龠])+/g, ' $& ')
    .split(/\s+/)
    .filter((word) => word.length > 0);
}

/**
 * 単語頻度を取得
 */
export function getWordFrequency(): WordFrequency {
  const stored = localStorage.getItem(WORD_FREQUENCY_KEY);
  return stored ? JSON.parse(stored) : {};
}

/**
 * 次の単語を予測
 * @param currentWord 現在入力中の単語
 * @param topN 上位N個の予測を返す
 */
export function predictNextWord(currentWord: string, topN: number = 3): string[] {
  const frequency = getWordFrequency();
  const nextWords = frequency[currentWord];

  if (!nextWords) return [];

  // 頻度順にソート
  const sorted = Object.entries(nextWords)
    .filter(([_, count]) => count >= MIN_CONFIDENCE_THRESHOLD)
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN)
    .map(([word]) => word);

  return sorted;
}

/**
 * 入力中のテキストから次の単語を予測
 * @param inputText 現在の入力テキスト
 */
export function predictFromInput(inputText: string): string[] {
  const words = tokenizeText(inputText);
  if (words.length === 0) return [];

  const lastWord = words[words.length - 1];
  return predictNextWord(lastWord);
}

/**
 * 予測単語の信頼度を取得（0-100）
 */
export function getPredictionConfidence(currentWord: string, nextWord: string): number {
  const frequency = getWordFrequency();
  const nextWords = frequency[currentWord];

  if (!nextWords || !nextWords[nextWord]) return 0;

  const totalCount = Object.values(nextWords).reduce((sum, count) => sum + count, 0);
  const wordCount = nextWords[nextWord];

  return Math.round((wordCount / totalCount) * 100);
}

/**
 * 入力履歴をクリア
 */
export function clearInputHistory(): void {
  localStorage.removeItem(INPUT_HISTORY_KEY);
  localStorage.removeItem(WORD_FREQUENCY_KEY);
}

/**
 * よく使う単語トップNを取得
 */
export function getTopWords(topN: number = 10): Array<{ word: string; count: number }> {
  const frequency = getWordFrequency();
  const wordCounts: { [word: string]: number } = {};

  // 全単語の出現回数を集計
  Object.entries(frequency).forEach(([word, nextWords]) => {
    const totalCount = Object.values(nextWords).reduce((sum, count) => sum + count, 0);
    wordCounts[word] = (wordCounts[word] || 0) + totalCount;
  });

  // 頻度順にソート
  return Object.entries(wordCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }));
}

/**
 * 入力パターン分析
 */
export function analyzeInputPattern(): {
  totalInputs: number;
  averageLength: number;
  uniqueWords: number;
  mostUsedWords: Array<{ word: string; count: number }>;
} {
  const history = getInputHistory();
  const frequency = getWordFrequency();

  const totalInputs = history.length;
  const averageLength =
    history.reduce((sum, h) => sum + h.text.length, 0) / (totalInputs || 1);
  const uniqueWords = Object.keys(frequency).length;
  const mostUsedWords = getTopWords(5);

  return {
    totalInputs,
    averageLength: Math.round(averageLength),
    uniqueWords,
    mostUsedWords,
  };
}
