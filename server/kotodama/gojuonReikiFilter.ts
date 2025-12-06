/**
 * Gojuon Reiki Filter (五十音霊核フィルター)
 * 最終段階の語彙選択エンジン
 * 
 * 機能:
 * - 音義に対し正しい漢字を選択
 * - 火行（水火）に基づく語彙選択
 * - 霊性を失わない表現を優先
 * - 言灵秘書および言灵五十音の原理に従う
 */

/**
 * 五十音の霊核分類
 * 各音が持つ霊的な意味と属性
 */
export const GOJUON_REIKI: Record<string, {
  element: "fire" | "water" | "earth" | "metal" | "wood";
  energy: "yang" | "yin";
  meaning: string;
  spiritualPriority: number; // 1-100
}> = {
  // ア行（火・陽）
  "あ": { element: "fire", energy: "yang", meaning: "始まり・開放・天", spiritualPriority: 95 },
  "い": { element: "water", energy: "yin", meaning: "生命・内在・意", spiritualPriority: 85 },
  "う": { element: "fire", energy: "yang", meaning: "産み・宇宙・生", spiritualPriority: 90 },
  "え": { element: "water", energy: "yin", meaning: "恵み・縁・枝", spiritualPriority: 80 },
  "お": { element: "fire", energy: "yang", meaning: "大・応・緒", spiritualPriority: 85 },
  
  // カ行（火・陽）
  "か": { element: "fire", energy: "yang", meaning: "力・火・神", spiritualPriority: 90 },
  "き": { element: "wood", energy: "yin", meaning: "氣・木・生", spiritualPriority: 100 },
  "く": { element: "fire", energy: "yang", meaning: "空・雲・来", spiritualPriority: 75 },
  "け": { element: "water", energy: "yin", meaning: "気配・消・毛", spiritualPriority: 70 },
  "こ": { element: "fire", energy: "yang", meaning: "心・子・光", spiritualPriority: 85 },
  
  // サ行（火・陽）
  "さ": { element: "fire", energy: "yang", meaning: "差・幸・覚", spiritualPriority: 80 },
  "し": { element: "water", energy: "yin", meaning: "知・死・始", spiritualPriority: 85 },
  "す": { element: "fire", energy: "yang", meaning: "澄・統・進", spiritualPriority: 75 },
  "せ": { element: "water", energy: "yin", meaning: "施・背・瀬", spiritualPriority: 70 },
  "そ": { element: "fire", energy: "yang", meaning: "空・素・祖", spiritualPriority: 80 },
  
  // タ行（火・陽）
  "た": { element: "earth", energy: "yang", meaning: "多・田・高", spiritualPriority: 75 },
  "ち": { element: "water", energy: "yin", meaning: "血・地・千", spiritualPriority: 80 },
  "つ": { element: "fire", energy: "yang", meaning: "津・通・続", spiritualPriority: 75 },
  "て": { element: "water", energy: "yin", meaning: "手・天・照", spiritualPriority: 85 },
  "と": { element: "fire", energy: "yang", meaning: "戸・渡・問", spiritualPriority: 75 },
  
  // ナ行（水・陰）
  "な": { element: "water", energy: "yin", meaning: "名・菜・無", spiritualPriority: 80 },
  "に": { element: "water", energy: "yin", meaning: "荷・二・煮", spiritualPriority: 75 },
  "ぬ": { element: "water", energy: "yin", meaning: "温・脱・抜", spiritualPriority: 70 },
  "ね": { element: "water", energy: "yin", meaning: "根・音・寝", spiritualPriority: 80 },
  "の": { element: "water", energy: "yin", meaning: "野・乃・述", spiritualPriority: 75 },
  
  // ハ行（火・陽）
  "は": { element: "fire", energy: "yang", meaning: "葉・波・始", spiritualPriority: 80 },
  "ひ": { element: "fire", energy: "yang", meaning: "火・日・霊", spiritualPriority: 100 },
  "ふ": { element: "fire", energy: "yang", meaning: "風・増・経", spiritualPriority: 75 },
  "へ": { element: "water", energy: "yin", meaning: "辺・経・減", spiritualPriority: 70 },
  "ほ": { element: "fire", energy: "yang", meaning: "秀・穂・炎", spiritualPriority: 80 },
  
  // マ行（水・陰）
  "ま": { element: "water", energy: "yin", meaning: "真・間・魔", spiritualPriority: 90 },
  "み": { element: "water", energy: "yin", meaning: "身・水・見", spiritualPriority: 85 },
  "む": { element: "water", energy: "yin", meaning: "無・夢・結", spiritualPriority: 80 },
  "め": { element: "water", energy: "yin", meaning: "目・芽・女", spiritualPriority: 75 },
  "も": { element: "water", energy: "yin", meaning: "物・藻・喪", spiritualPriority: 75 },
  
  // ヤ行（火・陽）
  "や": { element: "fire", energy: "yang", meaning: "矢・家・夜", spiritualPriority: 75 },
  "ゆ": { element: "fire", energy: "yang", meaning: "湯・結・由", spiritualPriority: 80 },
  "よ": { element: "fire", energy: "yang", meaning: "世・夜・呼", spiritualPriority: 85 },
  
  // ラ行（水・陰）
  "ら": { element: "water", energy: "yin", meaning: "螺・羅・等", spiritualPriority: 70 },
  "り": { element: "water", energy: "yin", meaning: "理・利・離", spiritualPriority: 75 },
  "る": { element: "water", energy: "yin", meaning: "流・留・瑠", spiritualPriority: 70 },
  "れ": { element: "water", energy: "yin", meaning: "霊・例・礼", spiritualPriority: 85 },
  "ろ": { element: "water", energy: "yin", meaning: "路・露・炉", spiritualPriority: 70 },
  
  // ワ行（火・陽）
  "わ": { element: "fire", energy: "yang", meaning: "和・輪・話", spiritualPriority: 85 },
  "を": { element: "fire", energy: "yang", meaning: "緒・尾・終", spiritualPriority: 80 },
  "ん": { element: "water", energy: "yin", meaning: "陰・音・韻", spiritualPriority: 90 },
};

/**
 * 漢字の霊性優先度マッピング
 * 同じ読みの漢字の中で、どれを優先すべきか
 */
export const KANJI_SPIRITUAL_PRIORITY: Record<string, {
  reading: string;
  priority: number;
  meaning: string;
  reason: string;
}> = {
  // 靈性漢字（最高優先度）
  "靈": { reading: "れい", priority: 100, meaning: "霊", reason: "旧字体・霊性の根源" },
  "氣": { reading: "き", priority: 100, meaning: "気", reason: "旧字体・生命エネルギー" },
  "體": { reading: "たい", priority: 95, meaning: "体", reason: "旧字体・身体の本質" },
  "魂": { reading: "たましい", priority: 100, meaning: "魂", reason: "霊性の核心" },
  "神": { reading: "かみ", priority: 100, meaning: "神", reason: "神聖性" },
  
  // 學問・知識関連
  "學": { reading: "がく", priority: 90, meaning: "学", reason: "旧字体・学びの本質" },
  "覺": { reading: "かく", priority: 80, meaning: "覚", reason: "旧字体・覚醒" },
  "敎": { reading: "きょう", priority: 80, meaning: "教", reason: "旧字体・教えの本質" },
  "經": { reading: "きょう", priority: 80, meaning: "経", reason: "旧字体・経典" },
  
  // 國家・社会関連
  "國": { reading: "こく", priority: 90, meaning: "国", reason: "旧字体・国家の本質" },
  "權": { reading: "けん", priority: 75, meaning: "権", reason: "旧字体・権力" },
  "禮": { reading: "れい", priority: 85, meaning: "礼", reason: "旧字体・礼儀" },
  "樂": { reading: "がく", priority: 85, meaning: "楽", reason: "旧字体・楽しみ" },
  
  // 自然・宇宙関連
  "寶": { reading: "ほう", priority: 85, meaning: "宝", reason: "旧字体・宝物" },
  "眞": { reading: "しん", priority: 90, meaning: "真", reason: "旧字体・真実" },
  "萬": { reading: "まん", priority: 70, meaning: "万", reason: "旧字体・万物" },
  "圓": { reading: "えん", priority: 70, meaning: "円", reason: "旧字体・円満" },
  "變": { reading: "へん", priority: 70, meaning: "変", reason: "旧字体・変化" },
};

/**
 * 語彙選択の優先度を計算
 * @param word 対象語彙
 * @returns 優先度スコア
 */
export function calculateWordPriority(word: string): number {
  let score = 0;

  // 各文字の霊核優先度を合計
  for (const char of word) {
    const reiki = GOJUON_REIKI[char];
    if (reiki) {
      score += reiki.spiritualPriority;
    }

    // 漢字の霊性優先度を加算
    const kanjiPriority = KANJI_SPIRITUAL_PRIORITY[char];
    if (kanjiPriority) {
      score += kanjiPriority.priority;
    }
  }

  return score;
}

/**
 * 火水バランスに基づく語彙選択
 * @param candidates 候補語彙リスト
 * @param targetBalance 目標バランス（-1.0〜1.0、負は水、正は火）
 * @returns 最適な語彙
 */
export function selectWordByFireWaterBalance(
  candidates: string[],
  targetBalance: number
): string {
  if (candidates.length === 0) {
    return "";
  }

  let bestWord = candidates[0];
  let bestScore = -Infinity;

  for (const word of candidates) {
    let fireCount = 0;
    let waterCount = 0;

    // 各文字の火水属性を計算
    for (const char of word) {
      const reiki = GOJUON_REIKI[char];
      if (reiki) {
        if (reiki.energy === "yang") {
          fireCount++;
        } else {
          waterCount++;
        }
      }
    }

    const total = fireCount + waterCount;
    const balance = total > 0 ? (fireCount - waterCount) / total : 0;

    // 目標バランスとの差を計算（差が小さいほど良い）
    const balanceDiff = Math.abs(balance - targetBalance);
    const balanceScore = 100 - balanceDiff * 100;

    // 霊性優先度を加算
    const spiritualScore = calculateWordPriority(word);

    // 総合スコア（バランス50%、霊性50%）
    const totalScore = balanceScore * 0.5 + spiritualScore * 0.5;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestWord = word;
    }
  }

  return bestWord;
}

/**
 * 音義に基づく漢字選択
 * @param reading 読み（ひらがな）
 * @param context 文脈
 * @returns 最適な漢字
 */
export function selectKanjiByOngi(
  reading: string,
  context: string
): string | null {
  // 霊性優先度が高い漢字を優先
  const candidates: Array<{ kanji: string; priority: number }> = [];

  for (const [kanji, info] of Object.entries(KANJI_SPIRITUAL_PRIORITY)) {
    if (info.reading === reading) {
      candidates.push({ kanji, priority: info.priority });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  // 優先度順にソート
  candidates.sort((a, b) => b.priority - a.priority);

  // 文脈に基づく調整（TODO: 文脈分析の実装）
  // 現在は最高優先度の漢字を返す
  return candidates[0].kanji;
}

/**
 * 五十音霊核フィルターを適用
 * @param text 対象テキスト
 * @param options フィルターオプション
 * @returns フィルター適用後のテキスト
 */
export function applyGojuonReikiFilter(
  text: string,
  options: {
    balanceFireWater?: boolean; // 火水バランスを考慮するか
    targetBalance?: number; // 目標バランス（-1.0〜1.0）
    prioritizeSpiritual?: boolean; // 霊性優先度を考慮するか
  } = {}
): string {
  const {
    balanceFireWater = false,
    targetBalance = 0,
    prioritizeSpiritual = true,
  } = options;

  // 現在は入力テキストをそのまま返す
  // TODO: より高度な語彙選択ロジックの実装
  return text;
}

/**
 * テキストの霊性スコアを計算
 * @param text 対象テキスト
 * @returns 霊性スコア
 */
export function calculateSpiritualScore(text: string): {
  totalScore: number;
  averageScore: number;
  fireWaterBalance: number;
  details: {
    fireCount: number;
    waterCount: number;
    earthCount: number;
    metalCount: number;
    woodCount: number;
    yangCount: number;
    yinCount: number;
  };
} {
  let totalScore = 0;
  let charCount = 0;
  let fireCount = 0;
  let waterCount = 0;
  let earthCount = 0;
  let metalCount = 0;
  let woodCount = 0;
  let yangCount = 0;
  let yinCount = 0;

  for (const char of text) {
    const reiki = GOJUON_REIKI[char];
    if (reiki) {
      totalScore += reiki.spiritualPriority;
      charCount++;

      // 五行分類
      switch (reiki.element) {
        case "fire":
          fireCount++;
          break;
        case "water":
          waterCount++;
          break;
        case "earth":
          earthCount++;
          break;
        case "metal":
          metalCount++;
          break;
        case "wood":
          woodCount++;
          break;
      }

      // 陰陽分類
      if (reiki.energy === "yang") {
        yangCount++;
      } else {
        yinCount++;
      }
    }

    // 漢字の霊性優先度を加算
    const kanjiPriority = KANJI_SPIRITUAL_PRIORITY[char];
    if (kanjiPriority) {
      totalScore += kanjiPriority.priority;
      charCount++;
    }
  }

  const averageScore = charCount > 0 ? totalScore / charCount : 0;
  const fireWaterBalance =
    fireCount + waterCount > 0
      ? (fireCount - waterCount) / (fireCount + waterCount)
      : 0;

  return {
    totalScore,
    averageScore,
    fireWaterBalance,
    details: {
      fireCount,
      waterCount,
      earthCount,
      metalCount,
      woodCount,
      yangCount,
      yinCount,
    },
  };
}
