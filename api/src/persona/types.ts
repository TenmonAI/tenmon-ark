// 天津金木思考回路：弁証核の型定義

/**
 * 天津金木の4層構造
 */
export enum KanagiLayer {
  FACT = "fact",              // 事実層
  INTERPRETATION = "interpretation", // 解釈層（複数必須）
  VALUE = "value",           // 価値層
  ACTION = "action",         // 行動層
}

/**
 * 回転構造（KanagiIntegration）
 * 
 * 矛盾は溶け合わず、織りなされ、旋回し、上昇する
 * 結論を出さないことが「合」である
 */
export interface KanagiIntegration {
  /**
   * 観測円（視座）
   * 現在の観測位置を描写する（結論ではない）
   */
  observationCircle: string;
  
  /**
   * 未解決の緊張（unresolved tensions）
   * 矛盾が保持されていることを明示
   */
  unresolvedTensions: string[];
  
  /**
   * 回転位相（depth）
   * CENTER通過ごとに増加し、観測の深さを示す
   */
  rotationDepth: number;
}

/**
 * 天津金木の4面体状態（TetraState）
 * 
 * 矛盾を排除せず同時保持する構造
 */
export interface KanagiTetraState {
  /**
   * 事実層：観察された事実の集合（矛盾を許容）
   */
  fact: string[];
  
  /**
   * 解釈層：事実に対する解釈の集合（複数必須、矛盾を許容）
   */
  interpretation: string[]; // 複数必須
  
  /**
   * 価値層：価値判断の集合（矛盾を許容）
   */
  value: string[];
  
  /**
   * 行動層：行動方針の集合（矛盾を許容）
   */
  action: string[];
  
  /**
   * 回転構造（円融無碍＝共旋上昇）
   * null の場合は観測中
   */
  integration: KanagiIntegration | null;
  
  /**
   * CENTER状態での蓄積度
   */
  centerAccumulation: number;
  
  /**
   * テーゼ（肯定）とアンチテーゼ（否定）
   * CENTER状態で保持される
   */
  thesis?: string;
  antithesis?: string;
}

