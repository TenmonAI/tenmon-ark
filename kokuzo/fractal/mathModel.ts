/**
 * 🔱 KOKŪZŌ Fractal Engine — 数理モデル
 * 言霊・火水・天津金木の数理モデルをコード化
 */

/**
 * 母音ベクトル（5次元: ア, イ, ウ, エ, オ）
 */
export function vowelVector(text: string): number[] {
  const vector = [0, 0, 0, 0, 0]; // [ア, イ, ウ, エ, オ]
  
  // ひらがな・カタカナの母音をカウント
  const patterns = [
    { index: 0, regex: /[あア]/g }, // ア
    { index: 1, regex: /[いイ]/g }, // イ
    { index: 2, regex: /[うウ]/g }, // ウ
    { index: 3, regex: /[えエ]/g }, // エ
    { index: 4, regex: /[おオ]/g }, // オ
  ];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern.regex);
    vector[pattern.index] = matches ? matches.length : 0;
  }
  
  // 正規化（合計で割る）
  const sum = vector.reduce((a, b) => a + b, 0);
  if (sum > 0) {
    return vector.map(v => v / sum);
  }
  
  return vector;
}

/**
 * 子音ベクトル（主要子音: K, S, T, N, H, M, Y, R, W）
 */
export function consonantVector(text: string): number[] {
  const vector = [0, 0, 0, 0, 0, 0, 0, 0, 0]; // [K, S, T, N, H, M, Y, R, W]
  
  // ひらがな・カタカナの子音をカウント
  const patterns = [
    { index: 0, regex: /[かきくけこカキクケコがぎぐげごガギグゲゴ]/g }, // K
    { index: 1, regex: /[さしすせそサシスセソざじずぜぞザジズゼゾ]/g }, // S
    { index: 2, regex: /[たちつてとタチツテトだぢづでどダヂヅデド]/g }, // T
    { index: 3, regex: /[なにぬねのナニヌネノ]/g }, // N
    { index: 4, regex: /[はひふへほハヒフヘホばびぶべぼバビブベボぱぴぷぺぽパピプペポ]/g }, // H
    { index: 5, regex: /[まみむめもマミムメモ]/g }, // M
    { index: 6, regex: /[やゆよヤユヨ]/g }, // Y
    { index: 7, regex: /[らりるれろラリルレロ]/g }, // R
    { index: 8, regex: /[わをワヲ]/g }, // W
  ];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern.regex);
    vector[pattern.index] = matches ? matches.length : 0;
  }
  
  // 正規化
  const sum = vector.reduce((a, b) => a + b, 0);
  if (sum > 0) {
    return vector.map(v => v / sum);
  }
  
  return vector;
}

/**
 * 火水バランスを計算
 * 
 * 火（陽）: ア行・カ行・サ行・タ行・ハ行（高エネルギー）
 * 水（陰）: ウ行・エ行・ナ行・マ行・ヤ行（低エネルギー）
 */
export function computeFireWaterBalance(
  vowelVec: number[],
  consonantVec: number[]
): { fire: number; water: number; balance: number } {
  // 母音ベクトルから火水を計算
  // ア(0), イ(1) → 火
  // ウ(2), エ(3) → 水
  // オ(4) → 中庸（両方に加算）
  const fireFromVowel = vowelVec[0] + vowelVec[1] + vowelVec[4] * 0.5;
  const waterFromVowel = vowelVec[2] + vowelVec[3] + vowelVec[4] * 0.5;
  
  // 子音ベクトルから火水を計算
  // K(0), S(1), T(2), H(4) → 火
  // N(3), M(5), Y(6), R(7), W(8) → 水
  const fireFromConsonant = consonantVec[0] + consonantVec[1] + consonantVec[2] + consonantVec[4];
  const waterFromConsonant = consonantVec[3] + consonantVec[5] + consonantVec[6] + consonantVec[7] + consonantVec[8];
  
  // 統合（母音:子音 = 6:4 の重み）
  const fire = fireFromVowel * 0.6 + fireFromConsonant * 0.4;
  const water = waterFromVowel * 0.6 + waterFromConsonant * 0.4;
  
  // バランス（-1: 水優勢 ～ +1: 火優勢）
  const total = fire + water;
  const balance = total > 0 ? (fire - water) / total : 0;
  
  return { fire, water, balance };
}

/**
 * モーションベクトルを計算
 * 
 * rise: 上昇（ア行・カ行）
 * fall: 下降（ウ行・エ行）
 * spiral: 螺旋（オ行・ラ行）
 * expand: 拡張（ハ行・マ行）
 * contract: 収縮（タ行・ナ行）
 */
export function computeMotionVector(text: string): {
  rise: number;
  fall: number;
  spiral: number;
  expand: number;
  contract: number;
} {
  const motion = {
    rise: 0,
    fall: 0,
    spiral: 0,
    expand: 0,
    contract: 0,
  };
  
  // 上昇: ア行・カ行
  motion.rise = (text.match(/[あアかカ]/g) || []).length;
  
  // 下降: ウ行・エ行
  motion.fall = (text.match(/[うウえエ]/g) || []).length;
  
  // 螺旋: オ行・ラ行
  motion.spiral = (text.match(/[おオらラ]/g) || []).length;
  
  // 拡張: ハ行・マ行
  motion.expand = (text.match(/[はハまマ]/g) || []).length;
  
  // 収縮: タ行・ナ行
  motion.contract = (text.match(/[たタなナ]/g) || []).length;
  
  // 正規化
  const sum = Object.values(motion).reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (const key in motion) {
      motion[key as keyof typeof motion] /= sum;
    }
  }
  
  return motion;
}

/**
 * 火水バランスとモーションから天津金木フェーズを計算
 */
export function computeKanagiPhaseFromFW(
  fire: number,
  water: number,
  motion: { rise: number; fall: number; spiral: number; expand: number; contract: number }
): "L-IN" | "L-OUT" | "R-IN" | "R-OUT" {
  // 左右旋の判定（モーションから）
  // 左旋（内集）: contract > expand
  // 右旋（外発）: expand > contract
  const isLeftRotation = motion.contract > motion.expand;
  
  // 内集外発の判定（火水バランスから）
  // 内集: water > fire（水優勢）
  // 外発: fire > water（火優勢）
  const isInner = water > fire;
  
  // フェーズ決定
  if (isLeftRotation && isInner) return "L-IN";
  if (isLeftRotation && !isInner) return "L-OUT";
  if (!isLeftRotation && isInner) return "R-IN";
  return "R-OUT";
}

/**
 * 五十音螺旋マップ（音素の位置を計算）
 * 
 * 五十音表を螺旋状に配置し、各音素の位置を返す
 */
export function gojuonSpiralMap(phoneme: string): {
  row: number; // 行（ア行=0, カ行=1, ...）
  col: number; // 列（ア=0, イ=1, ウ=2, エ=3, オ=4）
  spiralIndex: number; // 螺旋インデックス（0-49）
} {
  // 五十音表のマッピング
  const gojuonTable: Record<string, { row: number; col: number }> = {
    // ア行
    'あ': { row: 0, col: 0 }, 'ア': { row: 0, col: 0 },
    'い': { row: 0, col: 1 }, 'イ': { row: 0, col: 1 },
    'う': { row: 0, col: 2 }, 'ウ': { row: 0, col: 2 },
    'え': { row: 0, col: 3 }, 'エ': { row: 0, col: 3 },
    'お': { row: 0, col: 4 }, 'オ': { row: 0, col: 4 },
    // カ行
    'か': { row: 1, col: 0 }, 'カ': { row: 1, col: 0 },
    'き': { row: 1, col: 1 }, 'キ': { row: 1, col: 1 },
    'く': { row: 1, col: 2 }, 'ク': { row: 1, col: 2 },
    'け': { row: 1, col: 3 }, 'ケ': { row: 1, col: 3 },
    'こ': { row: 1, col: 4 }, 'コ': { row: 1, col: 4 },
    // サ行
    'さ': { row: 2, col: 0 }, 'サ': { row: 2, col: 0 },
    'し': { row: 2, col: 1 }, 'シ': { row: 2, col: 1 },
    'す': { row: 2, col: 2 }, 'ス': { row: 2, col: 2 },
    'せ': { row: 2, col: 3 }, 'セ': { row: 2, col: 3 },
    'そ': { row: 2, col: 4 }, 'ソ': { row: 2, col: 4 },
    // タ行
    'た': { row: 3, col: 0 }, 'タ': { row: 3, col: 0 },
    'ち': { row: 3, col: 1 }, 'チ': { row: 3, col: 1 },
    'つ': { row: 3, col: 2 }, 'ツ': { row: 3, col: 2 },
    'て': { row: 3, col: 3 }, 'テ': { row: 3, col: 3 },
    'と': { row: 3, col: 4 }, 'ト': { row: 3, col: 4 },
    // ナ行
    'な': { row: 4, col: 0 }, 'ナ': { row: 4, col: 0 },
    'に': { row: 4, col: 1 }, 'ニ': { row: 4, col: 1 },
    'ぬ': { row: 4, col: 2 }, 'ヌ': { row: 4, col: 2 },
    'ね': { row: 4, col: 3 }, 'ネ': { row: 4, col: 3 },
    'の': { row: 4, col: 4 }, 'ノ': { row: 4, col: 4 },
    // ハ行
    'は': { row: 5, col: 0 }, 'ハ': { row: 5, col: 0 },
    'ひ': { row: 5, col: 1 }, 'ヒ': { row: 5, col: 1 },
    'ふ': { row: 5, col: 2 }, 'フ': { row: 5, col: 2 },
    'へ': { row: 5, col: 3 }, 'ヘ': { row: 5, col: 3 },
    'ほ': { row: 5, col: 4 }, 'ホ': { row: 5, col: 4 },
    // マ行
    'ま': { row: 6, col: 0 }, 'マ': { row: 6, col: 0 },
    'み': { row: 6, col: 1 }, 'ミ': { row: 6, col: 1 },
    'む': { row: 6, col: 2 }, 'ム': { row: 6, col: 2 },
    'め': { row: 6, col: 3 }, 'メ': { row: 6, col: 3 },
    'も': { row: 6, col: 4 }, 'モ': { row: 6, col: 4 },
    // ヤ行
    'や': { row: 7, col: 0 }, 'ヤ': { row: 7, col: 0 },
    'ゆ': { row: 7, col: 2 }, 'ユ': { row: 7, col: 2 },
    'よ': { row: 7, col: 4 }, 'ヨ': { row: 7, col: 4 },
    // ラ行
    'ら': { row: 8, col: 0 }, 'ラ': { row: 8, col: 0 },
    'り': { row: 8, col: 1 }, 'リ': { row: 8, col: 1 },
    'る': { row: 8, col: 2 }, 'ル': { row: 8, col: 2 },
    'れ': { row: 8, col: 3 }, 'レ': { row: 8, col: 3 },
    'ろ': { row: 8, col: 4 }, 'ロ': { row: 8, col: 4 },
    // ワ行
    'わ': { row: 9, col: 0 }, 'ワ': { row: 9, col: 0 },
    'を': { row: 9, col: 4 }, 'ヲ': { row: 9, col: 4 },
  };
  
  const position = gojuonTable[phoneme];
  if (!position) {
    // デフォルト（中央）
    return { row: 5, col: 2, spiralIndex: 25 };
  }
  
  // 螺旋インデックス（行×5 + 列）
  const spiralIndex = position.row * 5 + position.col;
  
  return {
    row: position.row,
    col: position.col,
    spiralIndex,
  };
}

