/**
 * Persona Detector
 * 入力メッセージのintent分析によりPersonaを自動判定
 */

export type PersonaType = 'architect' | 'guardian' | 'companion' | 'silent';

export interface PersonaConfig {
  type: PersonaType;
  name: string;
  color: string;
  description: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  headerBgColor: string;
  /** Reishō Tone Vector（霊核トーンベクトル） */
  reishoToneVector?: number[];
}

export const PERSONA_CONFIGS: Record<PersonaType, PersonaConfig> = {
  architect: {
    type: 'architect',
    name: 'Architect',
    color: 'blue',
    description: '深い分析・構築依頼',
    bgColor: '#dbeafe',
    textColor: '#1e40af',
    borderColor: '#3b82f6',
    headerBgColor: '#1e40af',
    reishoToneVector: [0.8, 0.2, 0.6, 0.4, 0.7], // 火優勢、右旋、外発
  },
  guardian: {
    type: 'guardian',
    name: 'Guardian',
    color: 'red',
    description: '安全・警戒・トラブル',
    bgColor: '#fee2e2',
    textColor: '#991b1b',
    borderColor: '#ef4444',
    headerBgColor: '#991b1b',
    reishoToneVector: [0.9, 0.1, 0.8, 0.2, 0.9], // 火優勢、右旋、外発（警戒）
  },
  companion: {
    type: 'companion',
    name: 'Companion',
    color: 'pink',
    description: '雑談・感情ケア',
    bgColor: '#fce7f3',
    textColor: '#9d174d',
    borderColor: '#ec4899',
    headerBgColor: '#9d174d',
    reishoToneVector: [0.4, 0.6, 0.3, 0.7, 0.5], // 水優勢、左旋、内集
  },
  silent: {
    type: 'silent',
    name: 'Silent',
    color: 'gray',
    description: '簡単操作系',
    bgColor: '#f3f4f6',
    textColor: '#374151',
    borderColor: '#6b7280',
    headerBgColor: '#374151',
    reishoToneVector: [0.5, 0.5, 0.5, 0.5, 0.5], // 中庸
  },
};

/**
 * Architect キーワード
 */
const ARCHITECT_KEYWORDS = [
  '設計', '構築', '実装', '開発', 'アーキテクチャ', 'システム', '構造',
  '分析', '解析', '調査', '研究', '考察', '検討', '設計', '計画',
  '最適化', '改善', '効率化', 'パフォーマンス', 'アルゴリズム',
  'architecture', 'design', 'build', 'implement', 'develop', 'system',
  'analyze', 'analysis', 'investigate', 'research', 'optimize', 'improve',
];

/**
 * Guardian キーワード
 */
const GUARDIAN_KEYWORDS = [
  '危険', '安全', 'セキュリティ', '保護', '防御', '警戒', '警告',
  'トラブル', '問題', 'エラー', 'バグ', '脆弱性', '攻撃', '脅威',
  '緊急', '重要', '注意', '確認', 'チェック', '監視',
  'danger', 'safe', 'security', 'protect', 'defense', 'warning',
  'trouble', 'problem', 'error', 'bug', 'vulnerability', 'attack', 'threat',
  'urgent', 'important', 'check', 'monitor',
];

/**
 * Companion キーワード
 */
const COMPANION_KEYWORDS = [
  'こんにちは', 'おはよう', 'こんばんは', 'ありがとう', 'どうも',
  '元気', '調子', '気分', '感情', '気持ち', '感じ', '思う', '考える',
  '話', '会話', '雑談', '相談', '悩み', '助けて', '困った',
  'hello', 'hi', 'thanks', 'thank you', 'how are you', 'feel', 'feeling',
  'talk', 'chat', 'conversation', 'help', 'worry', 'trouble',
];

/**
 * Silent キーワード（簡単操作系）
 */
const SILENT_KEYWORDS = [
  '開く', '閉じる', '表示', '非表示', '切り替え', '変更', '設定',
  'open', 'close', 'show', 'hide', 'toggle', 'change', 'setting',
];

/**
 * Reishō トーンベクトルからPersonaを判定
 * 
 * @param fireWaterBalance - 火水バランス（-1: 水優勢 ～ +1: 火優勢）
 * @param kanagiPhase - 天津金木フェーズ
 * @returns 判定されたPersona
 */
export function detectPersonaByReisho(
  fireWaterBalance: number,
  kanagiPhase: "L-IN" | "L-OUT" | "R-IN" | "R-OUT"
): PersonaType {
  // 火優勢 + 右旋 + 外発 → Architect / Guardian
  if (fireWaterBalance > 0.3) {
    if (kanagiPhase === "R-OUT") {
      return 'architect';
    } else if (kanagiPhase === "R-IN") {
      return 'guardian';
    }
  }
  
  // 水優勢 + 左旋 + 内集 → Companion
  if (fireWaterBalance < -0.3) {
    if (kanagiPhase === "L-IN") {
      return 'companion';
    }
  }
  
  // 中庸 → Silent
  return 'silent';
}

/**
 * メッセージのintentを分析してPersonaを判定
 * 
 * @param message - 入力メッセージ
 * @param isMobile - モバイル環境かどうか（オプション）
 * @param fireWaterBalance - 火水バランス（オプション、Reishō統合用）
 * @param kanagiPhase - 天津金木フェーズ（オプション、Reishō統合用）
 * @returns 判定されたPersona
 */
export function detectPersona(
  message: string,
  isMobile: boolean = false,
  fireWaterBalance?: number,
  kanagiPhase?: "L-IN" | "L-OUT" | "R-IN" | "R-OUT"
): PersonaType {
  // Reishō パラメータが提供されている場合、それを使用
  if (fireWaterBalance !== undefined && kanagiPhase !== undefined) {
    const reishoPersona = detectPersonaByReisho(fireWaterBalance, kanagiPhase);
    // Reishō判定とキーワード判定を統合（重み: Reishō 60%, キーワード 40%）
    const keywordPersona = detectPersonaByKeywords(message, isMobile);
    
    // 重み付き統合
    if (reishoPersona === keywordPersona) {
      return reishoPersona;
    }
    // 異なる場合はReishōを優先
    return reishoPersona;
  }
  
  // 従来のキーワードベース判定
  return detectPersonaByKeywords(message, isMobile);
}

/**
 * キーワードベースでPersonaを判定（内部関数）
 */
function detectPersonaByKeywords(message: string, isMobile: boolean): PersonaType {
  const lowerMessage = message.toLowerCase();
  const messageLength = message.length;

  // モバイル環境で短いメッセージの場合はSilent
  if (isMobile && messageLength < 20) {
    const hasSilentKeyword = SILENT_KEYWORDS.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    );
    if (hasSilentKeyword) {
      return 'silent';
    }
  }

  // キーワードマッチング
  const architectScore = ARCHITECT_KEYWORDS.filter(keyword => 
    lowerMessage.includes(keyword.toLowerCase())
  ).length;

  const guardianScore = GUARDIAN_KEYWORDS.filter(keyword => 
    lowerMessage.includes(keyword.toLowerCase())
  ).length;

  const companionScore = COMPANION_KEYWORDS.filter(keyword => 
    lowerMessage.includes(keyword.toLowerCase())
  ).length;

  // スコアが最も高いPersonaを選択
  const scores = [
    { type: 'architect' as PersonaType, score: architectScore },
    { type: 'guardian' as PersonaType, score: guardianScore },
    { type: 'companion' as PersonaType, score: companionScore },
  ];

  scores.sort((a, b) => b.score - a.score);

  // スコアが0の場合はCompanion（デフォルト）
  if (scores[0].score === 0) {
    return 'companion';
  }

  return scores[0].type;
}

/**
 * Persona設定を取得
 * 
 * @param persona - Personaタイプ
 * @returns Persona設定
 */
export function getPersonaConfig(persona: PersonaType): PersonaConfig {
  return PERSONA_CONFIGS[persona];
}

