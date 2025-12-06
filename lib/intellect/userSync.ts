/**
 * User-Sync Evolution（個別最適化エンジン）
 * 
 * ユーザーごとに個別最適化を行う
 * - 思考の癖
 * - 火水の傾向
 * - 宿曜の特徴
 * - 好む文章構造
 * - 会話テンポ
 * - 世界観の深度
 * 
 * 目的: 生成出力を"その人専用の人格"へ自動調整
 */

/**
 * 簡易版ユーザープロファイル（IFE用）
 */
export interface SimpleUserProfile {
  fireWaterTendency: 'fire' | 'water' | 'balanced';
  languageStyle: string;
  textStylePreference: string;
  topicPatterns: string[];
  thinkingDepth: 'shallow' | 'medium' | 'deep';
  tempo: string;
  shukuyoInfo: string;
}

/**
 * 詳細版ユーザープロファイル（内部用）
 */
export interface UserProfile {
  // ユーザーID
  userId: number;
  
  // 思考の癖
  thinkingPattern: {
    logical: number; // 論理的思考 (0-100)
    intuitive: number; // 直感的思考 (0-100)
    analytical: number; // 分析的思考 (0-100)
    creative: number; // 創造的思考 (0-100)
  };
  
  // 火水の傾向
  fireWaterTendency: {
    fire: number; // 火（外発）傾向 (0-100)
    water: number; // 水（内集）傾向 (0-100)
    minaka: number; // ミナカ（中心）傾向 (0-100)
    dominantTendency: 'fire' | 'water' | 'balanced';
  };
  
  // 宿曜の特徴
  sukuyo: {
    nakshatra: string | null; // 宿曜（27宿）
    characteristics: string[];
    compatibility: string[];
  };
  
  // 好む文章構造
  preferredStructure: {
    length: 'short' | 'medium' | 'long'; // 文章の長さ
    complexity: 'simple' | 'moderate' | 'complex'; // 複雑さ
    tone: 'formal' | 'casual' | 'balanced'; // トーン
    rhythm: 'fast' | 'moderate' | 'slow'; // リズム
  };
  
  // 会話テンポ
  conversationTempo: {
    responseSpeed: 'fast' | 'moderate' | 'slow'; // 応答速度
    messageLength: 'short' | 'medium' | 'long'; // メッセージ長
    questionFrequency: 'high' | 'moderate' | 'low'; // 質問頻度
  };
  
  // 世界観の深度
  worldviewDepth: {
    level: 'surface' | 'middle' | 'deep' | 'cosmic'; // 深度レベル
    interests: string[]; // 興味のあるトピック
    keywords: string[]; // よく使うキーワード
  };
  
  // 学習データ
  learningData: {
    totalInteractions: number; // 総インタラクション数
    lastInteraction: Date; // 最終インタラクション日時
    feedbackScore: number; // フィードバックスコア (0-100)
  };
}

/**
 * ユーザー同期結果
 */
export interface UserSyncResult {
  // ユーザープロファイル
  profile: UserProfile;
  
  // 推奨スタイル
  recommendedStyle: {
    fireWaterBalance: 'fire' | 'water' | 'balanced';
    depth: 'surface' | 'middle' | 'deep' | 'cosmic';
    tone: 'formal' | 'casual' | 'balanced';
    structure: 'linear' | 'circular' | 'spiral';
    length: 'short' | 'medium' | 'long';
  };
  
  // 調整パラメータ
  adjustmentParams: {
    fireWaterAdjustment: number; // 火水調整強度 (0-100)
    depthAdjustment: number; // 深度調整強度 (0-100)
    toneAdjustment: number; // トーン調整強度 (0-100)
  };
}

/**
 * 簡易版UserProfileを詳細版UserProfileに変換
 */
export function convertSimpleToDetailedProfile(simple: SimpleUserProfile, userId: number = 0): UserProfile {
  return {
    userId,
    thinkingPattern: {
      logical: 50,
      intuitive: 50,
      analytical: 50,
      creative: 50,
    },
    fireWaterTendency: {
      fire: simple.fireWaterTendency === 'fire' ? 80 : simple.fireWaterTendency === 'water' ? 20 : 50,
      water: simple.fireWaterTendency === 'water' ? 80 : simple.fireWaterTendency === 'fire' ? 20 : 50,
      minaka: 50,
      dominantTendency: simple.fireWaterTendency,
    },
    sukuyo: {
      nakshatra: simple.shukuyoInfo,
      characteristics: [],
      compatibility: [],
    },
    preferredStructure: {
      length: 'medium',
      complexity: 'moderate',
      tone: simple.languageStyle === '丁寧' ? 'formal' : simple.languageStyle === 'カジュアル' ? 'casual' : 'balanced',
      rhythm: simple.tempo === 'fast' ? 'fast' : simple.tempo === 'slow' ? 'slow' : 'moderate',
    },
    conversationTempo: {
      responseSpeed: simple.tempo as 'fast' | 'moderate' | 'slow',
      messageLength: 'medium',
      questionFrequency: 'moderate',
    },
    worldviewDepth: {
      level: simple.thinkingDepth === 'shallow' ? 'surface' : simple.thinkingDepth === 'deep' ? 'deep' : 'middle',
      interests: simple.topicPatterns,
      keywords: simple.topicPatterns,
    },
    learningData: {
      totalInteractions: 0,
      lastInteraction: new Date(),
      feedbackScore: 50,
    },
  };
}

/**
 * ユーザープロファイルを初期化
 */
export function initializeUserProfile(userId: number): UserProfile {
  return {
    userId,
    thinkingPattern: {
      logical: 50,
      intuitive: 50,
      analytical: 50,
      creative: 50,
    },
    fireWaterTendency: {
      fire: 50,
      water: 50,
      minaka: 50,
      dominantTendency: 'balanced',
    },
    sukuyo: {
      nakshatra: null,
      characteristics: [],
      compatibility: [],
    },
    preferredStructure: {
      length: 'medium',
      complexity: 'moderate',
      tone: 'balanced',
      rhythm: 'moderate',
    },
    conversationTempo: {
      responseSpeed: 'moderate',
      messageLength: 'medium',
      questionFrequency: 'moderate',
    },
    worldviewDepth: {
      level: 'middle',
      interests: [],
      keywords: [],
    },
    learningData: {
      totalInteractions: 0,
      lastInteraction: new Date(),
      feedbackScore: 50,
    },
  };
}

/**
 * ユーザープロファイルを学習
 */
export function learnFromInteraction(
  profile: UserProfile,
  interaction: {
    userMessage: string;
    assistantMessage: string;
    feedback?: 'positive' | 'negative' | 'neutral';
  }
): UserProfile {
  const updated = { ...profile };
  
  // 1. 思考パターンの学習
  updated.thinkingPattern = learnThinkingPattern(updated.thinkingPattern, interaction.userMessage);
  
  // 2. 火水傾向の学習
  updated.fireWaterTendency = learnFireWaterTendency(updated.fireWaterTendency, interaction.userMessage);
  
  // 3. 好む文章構造の学習
  updated.preferredStructure = learnPreferredStructure(updated.preferredStructure, interaction.userMessage);
  
  // 4. 会話テンポの学習
  updated.conversationTempo = learnConversationTempo(updated.conversationTempo, interaction.userMessage);
  
  // 5. 世界観の深度の学習
  updated.worldviewDepth = learnWorldviewDepth(updated.worldviewDepth, interaction.userMessage);
  
  // 6. 学習データの更新
  updated.learningData.totalInteractions += 1;
  updated.learningData.lastInteraction = new Date();
  
  // フィードバックスコアの更新
  if (interaction.feedback === 'positive') {
    updated.learningData.feedbackScore = Math.min(100, updated.learningData.feedbackScore + 5);
  } else if (interaction.feedback === 'negative') {
    updated.learningData.feedbackScore = Math.max(0, updated.learningData.feedbackScore - 5);
  }
  
  return updated;
}

/**
 * 思考パターンを学習
 */
function learnThinkingPattern(
  current: UserProfile['thinkingPattern'],
  userMessage: string
): UserProfile['thinkingPattern'] {
  const updated = { ...current };
  
  // 論理的思考のキーワード
  const logicalKeywords = ['なぜ', '理由', '根拠', '論理', '証明'];
  const logicalCount = logicalKeywords.filter(kw => userMessage.includes(kw)).length;
  if (logicalCount > 0) {
    updated.logical = Math.min(100, updated.logical + logicalCount * 2);
  }
  
  // 直感的思考のキーワード
  const intuitiveKeywords = ['感じる', '思う', '気がする', '直感'];
  const intuitiveCount = intuitiveKeywords.filter(kw => userMessage.includes(kw)).length;
  if (intuitiveCount > 0) {
    updated.intuitive = Math.min(100, updated.intuitive + intuitiveCount * 2);
  }
  
  // 分析的思考のキーワード
  const analyticalKeywords = ['分析', '解析', '詳しく', '具体的'];
  const analyticalCount = analyticalKeywords.filter(kw => userMessage.includes(kw)).length;
  if (analyticalCount > 0) {
    updated.analytical = Math.min(100, updated.analytical + analyticalCount * 2);
  }
  
  // 創造的思考のキーワード
  const creativeKeywords = ['作る', '生成', '創造', 'アイデア'];
  const creativeCount = creativeKeywords.filter(kw => userMessage.includes(kw)).length;
  if (creativeCount > 0) {
    updated.creative = Math.min(100, updated.creative + creativeCount * 2);
  }
  
  return updated;
}

/**
 * 火水傾向を学習
 */
function learnFireWaterTendency(
  current: UserProfile['fireWaterTendency'],
  userMessage: string
): UserProfile['fireWaterTendency'] {
  const updated = { ...current };
  
  // 火（外発）のキーワード
  const fireKeywords = ['明確', '強い', '活発', '積極的'];
  const fireCount = fireKeywords.filter(kw => userMessage.includes(kw)).length;
  if (fireCount > 0) {
    updated.fire = Math.min(100, updated.fire + fireCount * 2);
  }
  
  // 水（内集）のキーワード
  const waterKeywords = ['柔らか', '優しい', '穏やか', '静か'];
  const waterCount = waterKeywords.filter(kw => userMessage.includes(kw)).length;
  if (waterCount > 0) {
    updated.water = Math.min(100, updated.water + waterCount * 2);
  }
  
  // ミナカ（中心）のキーワード
  const minakaKeywords = ['調和', 'バランス', '統合', 'ミナカ'];
  const minakaCount = minakaKeywords.filter(kw => userMessage.includes(kw)).length;
  if (minakaCount > 0) {
    updated.minaka = Math.min(100, updated.minaka + minakaCount * 2);
  }
  
  // 支配的傾向を決定
  if (updated.minaka > Math.max(updated.fire, updated.water)) {
    updated.dominantTendency = 'balanced';
  } else if (updated.fire > updated.water) {
    updated.dominantTendency = 'fire';
  } else {
    updated.dominantTendency = 'water';
  }
  
  return updated;
}

/**
 * 好む文章構造を学習
 */
function learnPreferredStructure(
  current: UserProfile['preferredStructure'],
  userMessage: string
): UserProfile['preferredStructure'] {
  const updated = { ...current };
  
  // 文章の長さを学習
  if (userMessage.length < 50) {
    updated.length = 'short';
  } else if (userMessage.length < 200) {
    updated.length = 'medium';
  } else {
    updated.length = 'long';
  }
  
  // 複雑さを学習（専門用語の数で判定）
  const complexKeywords = ['構造', '本質', '統合', '循環', '調和'];
  const complexCount = complexKeywords.filter(kw => userMessage.includes(kw)).length;
  if (complexCount >= 3) {
    updated.complexity = 'complex';
  } else if (complexCount >= 1) {
    updated.complexity = 'moderate';
  } else {
    updated.complexity = 'simple';
  }
  
  // トーンを学習
  const formalKeywords = ['です', 'ます', 'である'];
  const casualKeywords = ['だよ', 'だね', 'かな'];
  const formalCount = formalKeywords.filter(kw => userMessage.includes(kw)).length;
  const casualCount = casualKeywords.filter(kw => userMessage.includes(kw)).length;
  if (formalCount > casualCount) {
    updated.tone = 'formal';
  } else if (casualCount > formalCount) {
    updated.tone = 'casual';
  } else {
    updated.tone = 'balanced';
  }
  
  return updated;
}

/**
 * 会話テンポを学習
 */
function learnConversationTempo(
  current: UserProfile['conversationTempo'],
  userMessage: string
): UserProfile['conversationTempo'] {
  const updated = { ...current };
  
  // メッセージ長を学習
  if (userMessage.length < 50) {
    updated.messageLength = 'short';
  } else if (userMessage.length < 200) {
    updated.messageLength = 'medium';
  } else {
    updated.messageLength = 'long';
  }
  
  // 質問頻度を学習
  const questionCount = (userMessage.match(/？/g) || []).length + (userMessage.match(/\?/g) || []).length;
  if (questionCount >= 3) {
    updated.questionFrequency = 'high';
  } else if (questionCount >= 1) {
    updated.questionFrequency = 'moderate';
  } else {
    updated.questionFrequency = 'low';
  }
  
  return updated;
}

/**
 * 世界観の深度を学習
 */
function learnWorldviewDepth(
  current: UserProfile['worldviewDepth'],
  userMessage: string
): UserProfile['worldviewDepth'] {
  const updated = { ...current };
  
  // 深度キーワード
  const cosmicKeywords = ['宇宙', '統合', 'ミナカ', '中心', '本質', '構造'];
  const deepKeywords = ['火水', 'Twin-Core', '言霊', '天津金木', 'いろは'];
  const middleKeywords = ['調和', 'バランス', '循環', '変化'];
  
  const cosmicCount = cosmicKeywords.filter(kw => userMessage.includes(kw)).length;
  const deepCount = deepKeywords.filter(kw => userMessage.includes(kw)).length;
  const middleCount = middleKeywords.filter(kw => userMessage.includes(kw)).length;
  
  // 深度レベルを決定
  if (cosmicCount >= 2) {
    updated.level = 'cosmic';
  } else if (deepCount >= 2) {
    updated.level = 'deep';
  } else if (middleCount >= 2) {
    updated.level = 'middle';
  } else {
    updated.level = 'surface';
  }
  
  // キーワードを追加
  const newKeywords = [
    ...cosmicKeywords.filter(kw => userMessage.includes(kw)),
    ...deepKeywords.filter(kw => userMessage.includes(kw)),
    ...middleKeywords.filter(kw => userMessage.includes(kw)),
  ];
  
  for (const keyword of newKeywords) {
    if (!updated.keywords.includes(keyword)) {
      updated.keywords.push(keyword);
    }
  }
  
  return updated;
}

/**
 * ユーザー同期を実行
 */
export function syncWithUser(profile: UserProfile): UserSyncResult {
  // 推奨スタイルを決定
  const recommendedStyle = {
    fireWaterBalance: profile.fireWaterTendency.dominantTendency,
    depth: profile.worldviewDepth.level,
    tone: profile.preferredStructure.tone,
    structure: determineStructure(profile),
    length: profile.preferredStructure.length,
  };
  
  // 調整パラメータを計算
  const adjustmentParams = {
    fireWaterAdjustment: Math.abs(profile.fireWaterTendency.fire - profile.fireWaterTendency.water),
    depthAdjustment: profile.worldviewDepth.level === 'cosmic' ? 100 : profile.worldviewDepth.level === 'deep' ? 75 : profile.worldviewDepth.level === 'middle' ? 50 : 25,
    toneAdjustment: profile.preferredStructure.tone === 'formal' ? 75 : profile.preferredStructure.tone === 'casual' ? 25 : 50,
  };
  
  return {
    profile,
    recommendedStyle,
    adjustmentParams,
  };
}

/**
 * 構造を決定
 */
function determineStructure(profile: UserProfile): 'linear' | 'circular' | 'spiral' {
  const { thinkingPattern, worldviewDepth } = profile;
  
  // 論理的思考が強い場合、直線的
  if (thinkingPattern.logical > 70) {
    return 'linear';
  }
  
  // 直感的思考が強い場合、循環的
  if (thinkingPattern.intuitive > 70) {
    return 'circular';
  }
  
  // 深度が高い場合、螺旋的
  if (worldviewDepth.level === 'cosmic' || worldviewDepth.level === 'deep') {
    return 'spiral';
  }
  
  // デフォルトは循環的
  return 'circular';
}

/**
 * ユーザー同期を適用してテキストを調整
 */
export function applyUserSync(text: string, syncResult: UserSyncResult): string {
  let adjusted = text;
  
  const { recommendedStyle, adjustmentParams } = syncResult;
  
  // 1. 火水バランス調整
  if (adjustmentParams.fireWaterAdjustment > 50) {
    if (recommendedStyle.fireWaterBalance === 'fire') {
      adjusted = adjusted.replace(/と思います。/g, 'です。');
      adjusted = adjusted.replace(/かもしれません。/g, 'でしょう。');
    } else if (recommendedStyle.fireWaterBalance === 'water') {
      adjusted = adjusted.replace(/です。/g, 'でしょうか。');
      adjusted = adjusted.replace(/である。/g, 'と感じます。');
    }
  }
  
  // 2. 深度調整
  if (adjustmentParams.depthAdjustment > 75) {
    // 深い表現を追加
    adjusted += `\n\n（この構造は、宇宙の本質的な調和を表しています。）`;
  }
  
  // 3. トーン調整
  if (recommendedStyle.tone === 'formal') {
    adjusted = adjusted.replace(/だよ/g, 'です');
    adjusted = adjusted.replace(/だね/g, 'ですね');
  } else if (recommendedStyle.tone === 'casual') {
    adjusted = adjusted.replace(/です。/g, 'だよ。');
    adjusted = adjusted.replace(/ます。/g, 'ますね。');
  }
  
  // 4. 長さ調整
  if (recommendedStyle.length === 'short' && adjusted.length > 200) {
    // 簡潔化（簡易実装）
    adjusted = adjusted.substring(0, 200) + '...';
  }
  
  return adjusted;
}
