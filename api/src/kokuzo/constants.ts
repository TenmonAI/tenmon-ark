// OS v∞-1: KOKŪZŌ 影響係数・閾値の集約

/**
 * 影響係数（調整の強さ）
 */
export const INFLUENCE_COEFFICIENTS = {
  // Tendency（傾向）からの影響
  TENDENCY_INERTIA: 0.1,              // 傾向からのinertia調整
  TENDENCY_LEXICAL_BIAS: 0.05,       // 傾向からのlexicalBias調整
  
  // FractalSeedからの影響（Tendencyより弱い）
  FRACTAL_INERTIA: 0.05,              // FractalSeedからのinertia調整
  FRACTAL_LEXICAL_BIAS: 0.02,         // FractalSeedからのlexicalBias調整
  
  // Expansion（展開）からの影響（初期値として）
  EXPANSION_INERTIA_INITIAL: 0.3,     // 展開プロファイルの初期inertia強度
  EXPANSION_INERTIA_ADJUSTMENT: 0.2,  // 展開プロファイルのinertia調整
  EXPANSION_LEXICAL_BIAS_INITIAL: 0.3, // 展開プロファイルの初期lexicalBias強度
  EXPANSION_LEXICAL_BIAS_ADJUSTMENT: 0.1, // 展開プロファイルのlexicalBias調整
} as const;

/**
 * Density閾値（集約度の判定）
 */
export const DENSITY_THRESHOLDS = {
  MIN_FOR_EXPANSION: 0.6,    // 展開に必要な最小density
  MIN_FOR_INFLUENCE: 0.6,    // 影響に必要な最小density
  MIN_FOR_THINKING_AXIS: 0.7, // thinkingAxis影響に必要な最小density
  MIN_FOR_STRONG_INFLUENCE: 0.8, // 強い影響に必要な最小density
} as const;

/**
 * 頻度・件数閾値
 */
export const FREQUENCY_THRESHOLDS = {
  MIN_SEED_COUNT_FOR_TENDENCY: 3,     // 傾向計算に必要な最小件数
  MIN_SEED_COUNT_FOR_FRACTAL: 5,      // FractalSeed生成に必要な最小件数
  MIN_FREQUENCY_FOR_INFLUENCE: 3,     // 影響に必要な最小頻度
  MIN_FREQUENCY_RATIO: 0.5,           // 影響に必要な最小頻度比率（50%）
  MIN_INERTIA_DIFF_FOR_ADJUSTMENT: 0.1, // inertia調整に必要な最小差分
} as const;

/**
 * 平均値閾値（inertia判定用）
 */
export const AVERAGE_THRESHOLDS = {
  HIGH_INERTIA: 0.5,    // 高い慣性と判定する閾値
  LOW_INERTIA: 0.3,     // 低い慣性と判定する閾値
} as const;

