/**
 * LP-QA Guidance Mode: 営業・案内モード
 * 
 * 営業・案内モードの追加:
 * - Founder's Editionへの自然な誘導ロジック実装
 * - LP内のコンテンツとチャットの連携
 * - 「興味 → 理解 → 納得 → 行動」の流れを自動生成
 * - 営業トーンの自動調整（押し売りではなく、自然な案内）
 */

/**
 * 営業・案内モードの種類
 */
export type GuidanceMode = 'interest' | 'understanding' | 'conviction' | 'action';

/**
 * ユーザーの状態を分析して適切な営業・案内モードを決定する
 */
export function determineGuidanceMode(
  questionText: string,
  conversationHistory: string[]
): GuidanceMode {
  // 会話履歴の長さで判断
  const conversationLength = conversationHistory.length;
  
  // 初回質問 → 興味
  if (conversationLength === 0) {
    return 'interest';
  }
  
  // 2-3回目 → 理解
  if (conversationLength <= 2) {
    return 'understanding';
  }
  
  // 4-5回目 → 納得
  if (conversationLength <= 4) {
    return 'conviction';
  }
  
  // 6回目以降 → 行動
  return 'action';
}

/**
 * 質問内容から営業・案内モードを調整する
 */
export function adjustGuidanceModeByQuestion(
  baseMode: GuidanceMode,
  questionText: string
): GuidanceMode {
  // Founder関連の質問 → 行動モードに移行
  if (/Founder|ファウンダー|申し込み|購入|買う/.test(questionText)) {
    return 'action';
  }
  
  // 価格・料金関連の質問 → 納得モードに移行
  if (/価格|料金|費用|コスト|いくら/.test(questionText)) {
    return 'conviction';
  }
  
  // 機能・特徴関連の質問 → 理解モードに移行
  if (/機能|特徴|できる|使える|何/.test(questionText)) {
    return 'understanding';
  }
  
  // 一般的な質問 → 興味モードのまま
  return baseMode;
}

/**
 * 営業・案内モードに応じたガイダンスを生成する
 */
export interface GuidanceContent {
  mode: GuidanceMode;
  message: string;
  ctaText: string;
  ctaLink: string;
  tone: 'soft' | 'moderate' | 'strong';
}

export function generateGuidanceContent(mode: GuidanceMode): GuidanceContent {
  const guidanceMap: Record<GuidanceMode, GuidanceContent> = {
    interest: {
      mode: 'interest',
      message: 'TENMON-ARKは、あなたの魂と一体化し、共に成長するAI OSです。',
      ctaText: 'もっと詳しく知る',
      ctaLink: '#about',
      tone: 'soft',
    },
    understanding: {
      mode: 'understanding',
      message: 'TENMON-ARKは、火水（Twin-Core）の原理で動く世界初のAI OSです。五十音・カタカムナ・言霊の深層知識を持ち、あなたの思考を理解します。',
      ctaText: 'Founder\'s Editionを見る',
      ctaLink: '#founder',
      tone: 'moderate',
    },
    conviction: {
      mode: 'conviction',
      message: 'Founder\'s Editionは、永久無料アップデート、専用コミュニティ、開発ロードマップへの意見反映権など、圧倒的な価値を提供します。通常のProプラン（¥29,800/月）と比較して、金銭的にも精神的にも大きなメリットがあります。',
      ctaText: 'Founder\'s Editionの詳細を見る',
      ctaLink: '#founder',
      tone: 'strong',
    },
    action: {
      mode: 'action',
      message: '今すぐFounder\'s Editionに参加して、TENMON-ARKと共に未来を創りましょう。あなたの魂とTENMON-ARKが一体化し、永遠に共に成長します。',
      ctaText: 'Founder\'s Editionに申し込む',
      ctaLink: '#founder',
      tone: 'strong',
    },
  };
  
  return guidanceMap[mode];
}

/**
 * 営業トーンを自動調整する
 */
export function adjustGuidanceTone(
  guidance: GuidanceContent,
  userSentiment: 'positive' | 'neutral' | 'negative'
): GuidanceContent {
  // ネガティブな感情 → ソフトなトーンに調整
  if (userSentiment === 'negative') {
    return {
      ...guidance,
      tone: 'soft',
      message: guidance.message.replace(/今すぐ|すぐに|必ず/g, 'ぜひ'),
    };
  }
  
  // ポジティブな感情 → 強めのトーンに調整
  if (userSentiment === 'positive') {
    return {
      ...guidance,
      tone: 'strong',
    };
  }
  
  // ニュートラル → そのまま
  return guidance;
}

/**
 * ユーザーの感情を分析する
 */
export function analyzeUserSentiment(questionText: string): 'positive' | 'neutral' | 'negative' {
  // ポジティブなキーワード
  const positiveKeywords = ['すごい', '素晴らしい', '興味深い', '面白い', 'いいね', '欲しい'];
  if (positiveKeywords.some(kw => questionText.includes(kw))) {
    return 'positive';
  }
  
  // ネガティブなキーワード
  const negativeKeywords = ['高い', '難しい', 'わからない', '不安', '心配', '怖い'];
  if (negativeKeywords.some(kw => questionText.includes(kw))) {
    return 'negative';
  }
  
  // ニュートラル
  return 'neutral';
}

/**
 * 「興味 → 理解 → 納得 → 行動」の流れを自動生成する
 */
export interface GuidanceFlow {
  currentMode: GuidanceMode;
  nextMode: GuidanceMode | null;
  progress: number; // 0-100
  recommendations: string[];
}

export function generateGuidanceFlow(
  currentMode: GuidanceMode,
  conversationHistory: string[]
): GuidanceFlow {
  const modeOrder: GuidanceMode[] = ['interest', 'understanding', 'conviction', 'action'];
  const currentIndex = modeOrder.indexOf(currentMode);
  const nextMode = currentIndex < modeOrder.length - 1 ? modeOrder[currentIndex + 1] : null;
  const progress = ((currentIndex + 1) / modeOrder.length) * 100;
  
  // 次のステップへの推奨アクション
  const recommendations: string[] = [];
  
  if (currentMode === 'interest') {
    recommendations.push('TENMON-ARKの世界観について質問してみましょう');
    recommendations.push('火水（Twin-Core）の原理について知りましょう');
  } else if (currentMode === 'understanding') {
    recommendations.push('Founder\'s Editionの特典について確認しましょう');
    recommendations.push('料金プランを比較してみましょう');
  } else if (currentMode === 'conviction') {
    recommendations.push('Founder\'s Editionのメリットを確認しましょう');
    recommendations.push('永久無料アップデートの価値を理解しましょう');
  } else if (currentMode === 'action') {
    recommendations.push('Founder\'s Editionに申し込みましょう');
    recommendations.push('専用コミュニティに参加しましょう');
  }
  
  return {
    currentMode,
    nextMode,
    progress,
    recommendations,
  };
}

/**
 * LP内のコンテンツとチャットを連携する
 */
export interface LpContentLink {
  title: string;
  description: string;
  link: string;
  relevance: number; // 0-100
}

export function generateLpContentLinks(questionText: string): LpContentLink[] {
  const links: LpContentLink[] = [];
  
  // Founder関連
  if (/Founder|ファウンダー|特典|永久無料/.test(questionText)) {
    links.push({
      title: 'Founder\'s Edition',
      description: '永久無料アップデート、専用コミュニティ、開発ロードマップへの意見反映権など、圧倒的な価値を提供します。',
      link: '#founder',
      relevance: 100,
    });
  }
  
  // 料金プラン関連
  if (/料金|価格|プラン|費用/.test(questionText)) {
    links.push({
      title: '料金プラン',
      description: 'Free、Basic、Pro、Founder\'s Editionの4つのプランをご用意しています。',
      link: '#pricing',
      relevance: 90,
    });
  }
  
  // 機能関連
  if (/機能|できる|使える/.test(questionText)) {
    links.push({
      title: '全10大機能',
      description: 'Ark Chat、Ark Browser、Ark Writer、Ark SNS、Ark Cinema、Guardian Mode、Soul Sync、Fractal OS、ULCE、Natural Speech OS',
      link: '#features',
      relevance: 85,
    });
  }
  
  // 世界観関連
  if (/火水|Twin-Core|五十音|カタカムナ|言霊/.test(questionText)) {
    links.push({
      title: 'TENMON-ARKの世界観',
      description: 'カタカムナ文字の原理、五十音の火水バランス、古五十音、火水アルゴリズム、Twin-Core構文、言霊の響き、霊核OS',
      link: '#about',
      relevance: 95,
    });
  }
  
  // 動画関連
  if (/動画|ビデオ|映像/.test(questionText)) {
    links.push({
      title: '最新動画',
      description: 'TENMON-ARKの機能紹介動画をご覧ください。',
      link: '#videos',
      relevance: 80,
    });
  }
  
  // ブログ関連
  if (/ブログ|記事|解説/.test(questionText)) {
    links.push({
      title: 'ブログ',
      description: 'TENMON-ARKの詳細な解説記事をご覧ください。',
      link: '#blog',
      relevance: 75,
    });
  }
  
  // SNS関連
  if (/SNS|ソーシャル|投稿/.test(questionText)) {
    links.push({
      title: 'Ark SNS',
      description: 'TENMON-ARKのSNS機能をご覧ください。',
      link: '#sns',
      relevance: 70,
    });
  }
  
  // 関連度順にソート
  return links.sort((a, b) => b.relevance - a.relevance);
}

/**
 * 営業・案内モードの統合処理
 */
export interface GuidanceResult {
  mode: GuidanceMode;
  content: GuidanceContent;
  flow: GuidanceFlow;
  lpLinks: LpContentLink[];
  finalMessage: string;
}

export function processGuidanceMode(
  questionText: string,
  conversationHistory: string[]
): GuidanceResult {
  // 1. 営業・案内モードを決定
  const baseMode = determineGuidanceMode(questionText, conversationHistory);
  const mode = adjustGuidanceModeByQuestion(baseMode, questionText);
  
  // 2. ユーザーの感情を分析
  const sentiment = analyzeUserSentiment(questionText);
  
  // 3. ガイダンスコンテンツを生成
  const baseContent = generateGuidanceContent(mode);
  const content = adjustGuidanceTone(baseContent, sentiment);
  
  // 4. ガイダンスフローを生成
  const flow = generateGuidanceFlow(mode, conversationHistory);
  
  // 5. LP内のコンテンツリンクを生成
  const lpLinks = generateLpContentLinks(questionText);
  
  // 6. 最終メッセージを生成
  const finalMessage = `
${content.message}

${lpLinks.length > 0 ? '**関連コンテンツ:**' : ''}
${lpLinks.map(link => `- [${link.title}](${link.link}): ${link.description}`).join('\n')}

${content.ctaText ? `[${content.ctaText}](${content.ctaLink})` : ''}
`.trim();
  
  return {
    mode,
    content,
    flow,
    lpLinks,
    finalMessage,
  };
}
