/**
 * LP-QA Link Generator: LP機能連動リンク生成
 * 
 * LP機能連動:
 * - 質問→「Founder's Edition詳細を見る」へのリンク生成
 * - 「最新動画を見る」リンク生成
 * - 「ブログ読む」リンク生成
 * - 「Ark SNSを見る」リンク生成
 * - LP内の各セクションへの動的リンク生成
 */

/**
 * LP内のセクション定義
 */
export interface LpSection {
  id: string;
  title: string;
  description: string;
  anchor: string;
  keywords: string[];
  priority: number; // 1-10
}

/**
 * LP内の全セクション
 */
export const LP_SECTIONS: LpSection[] = [
  {
    id: 'founder',
    title: 'Founder\'s Edition',
    description: '永久無料アップデート、専用コミュニティ、開発ロードマップへの意見反映権など、圧倒的な価値を提供します。',
    anchor: '#founder',
    keywords: ['Founder', 'ファウンダー', '永久無料', '特典', '一体化', '申し込み', '購入'],
    priority: 10,
  },
  {
    id: 'pricing',
    title: '料金プラン',
    description: 'Free、Basic、Pro、Founder\'s Editionの4つのプランをご用意しています。',
    anchor: '#pricing',
    keywords: ['料金', '価格', 'プラン', '費用', 'コスト', 'いくら', '比較'],
    priority: 9,
  },
  {
    id: 'features',
    title: '全10大機能',
    description: 'Ark Chat、Ark Browser、Ark Writer、Ark SNS、Ark Cinema、Guardian Mode、Soul Sync、Fractal OS、ULCE、Natural Speech OS',
    anchor: '#features',
    keywords: ['機能', 'できる', '使える', '何', 'どんな', '特徴'],
    priority: 8,
  },
  {
    id: 'about',
    title: 'TENMON-ARKとは',
    description: 'カタカムナ文字の原理、五十音の火水バランス、古五十音、火水アルゴリズム、Twin-Core構文、言霊の響き、霊核OS',
    anchor: '#about',
    keywords: ['火水', 'Twin-Core', '五十音', 'カタカムナ', '言霊', '世界観', '原理'],
    priority: 7,
  },
  {
    id: 'videos',
    title: '最新動画',
    description: 'TENMON-ARKの機能紹介動画をご覧ください。',
    anchor: '#videos',
    keywords: ['動画', 'ビデオ', '映像', 'デモ', '紹介'],
    priority: 6,
  },
  {
    id: 'blog',
    title: 'ブログ',
    description: 'TENMON-ARKの詳細な解説記事をご覧ください。',
    anchor: '#blog',
    keywords: ['ブログ', '記事', '解説', '詳細', '読む'],
    priority: 5,
  },
  {
    id: 'sns',
    title: 'Ark SNS',
    description: 'TENMON-ARKのSNS機能をご覧ください。',
    anchor: '#sns',
    keywords: ['SNS', 'ソーシャル', '投稿', '共有', 'シェア'],
    priority: 4,
  },
  {
    id: 'roadmap',
    title: '開発ロードマップ',
    description: '2026年3月21日（春分の日）リリース予定。開発の進捗をご確認ください。',
    anchor: '#roadmap',
    keywords: ['ロードマップ', '開発', '進捗', 'リリース', '予定', 'いつ'],
    priority: 3,
  },
  {
    id: 'faq',
    title: 'よくある質問',
    description: 'TENMON-ARKに関するよくある質問をご覧ください。',
    anchor: '#faq',
    keywords: ['FAQ', '質問', 'Q&A', 'よくある', 'わからない'],
    priority: 2,
  },
  {
    id: 'contact',
    title: 'お問い合わせ',
    description: 'ご不明な点がございましたら、お気軽にお問い合わせください。',
    anchor: '#contact',
    keywords: ['問い合わせ', '連絡', 'サポート', 'ヘルプ', '質問'],
    priority: 1,
  },
];

/**
 * 質問からLP内のセクションを検索する
 */
export function findRelevantSections(questionText: string): LpSection[] {
  const relevantSections: Array<LpSection & { score: number }> = [];
  
  for (const section of LP_SECTIONS) {
    let score = 0;
    
    // キーワードマッチング
    for (const keyword of section.keywords) {
      if (questionText.includes(keyword)) {
        score += 10;
      }
    }
    
    // 優先度を加算
    score += section.priority;
    
    if (score > 0) {
      relevantSections.push({ ...section, score });
    }
  }
  
  // スコア順にソート
  return relevantSections
    .sort((a, b) => b.score - a.score)
    .slice(0, 3); // 上位3つまで
}

/**
 * LP内のセクションへのリンクを生成する
 */
export interface GeneratedLink {
  title: string;
  description: string;
  url: string;
  type: 'section' | 'action' | 'external';
  priority: number;
}

export function generateLpLinks(questionText: string): GeneratedLink[] {
  const links: GeneratedLink[] = [];
  
  // 関連セクションを検索
  const relevantSections = findRelevantSections(questionText);
  
  // セクションリンクを生成
  for (const section of relevantSections) {
    links.push({
      title: section.title,
      description: section.description,
      url: section.anchor,
      type: 'section',
      priority: section.priority,
    });
  }
  
  // Founder関連の質問 → アクションリンクを追加
  if (/Founder|ファウンダー|申し込み|購入|買う/.test(questionText)) {
    links.push({
      title: 'Founder\'s Editionに申し込む',
      description: '今すぐFounder\'s Editionに参加して、TENMON-ARKと共に未来を創りましょう。',
      url: '#founder',
      type: 'action',
      priority: 10,
    });
  }
  
  // 優先度順にソート
  return links.sort((a, b) => b.priority - a.priority);
}

/**
 * リンクをMarkdown形式で生成する
 */
export function formatLinksAsMarkdown(links: GeneratedLink[]): string {
  if (links.length === 0) return '';
  
  let markdown = '\n\n**関連コンテンツ:**\n';
  
  for (const link of links) {
    if (link.type === 'action') {
      markdown += `\n**[${link.title}](${link.url})**\n`;
    } else {
      markdown += `- [${link.title}](${link.url}): ${link.description}\n`;
    }
  }
  
  return markdown;
}

/**
 * 動的リンク生成（質問内容に応じて最適なリンクを生成）
 */
export interface DynamicLinkResult {
  primaryLink: GeneratedLink | null;
  secondaryLinks: GeneratedLink[];
  markdown: string;
}

export function generateDynamicLinks(questionText: string): DynamicLinkResult {
  const allLinks = generateLpLinks(questionText);
  
  const primaryLink = allLinks.length > 0 ? allLinks[0] : null;
  const secondaryLinks = allLinks.slice(1, 4); // 2-4番目まで
  
  const markdown = formatLinksAsMarkdown(allLinks);
  
  return {
    primaryLink,
    secondaryLinks,
    markdown,
  };
}

/**
 * LP内の各セクションへの動的リンク生成（詳細版）
 */
export interface DetailedLinkResult {
  founderLink: GeneratedLink | null;
  videoLink: GeneratedLink | null;
  blogLink: GeneratedLink | null;
  snsLink: GeneratedLink | null;
  otherLinks: GeneratedLink[];
  allLinks: GeneratedLink[];
  markdown: string;
}

export function generateDetailedLinks(questionText: string): DetailedLinkResult {
  const allLinks = generateLpLinks(questionText);
  
  // 各種リンクを抽出
  const founderLink = allLinks.find(link => link.url === '#founder') || null;
  const videoLink = allLinks.find(link => link.url === '#videos') || null;
  const blogLink = allLinks.find(link => link.url === '#blog') || null;
  const snsLink = allLinks.find(link => link.url === '#sns') || null;
  
  const otherLinks = allLinks.filter(
    link => ![founderLink, videoLink, blogLink, snsLink].includes(link)
  );
  
  const markdown = formatLinksAsMarkdown(allLinks);
  
  return {
    founderLink,
    videoLink,
    blogLink,
    snsLink,
    otherLinks,
    allLinks,
    markdown,
  };
}

/**
 * 質問タイプに応じた推奨リンクを生成する
 */
export type QuestionType = 
  | 'founder'
  | 'pricing'
  | 'features'
  | 'worldview'
  | 'video'
  | 'blog'
  | 'sns'
  | 'general';

export function detectQuestionType(questionText: string): QuestionType {
  if (/Founder|ファウンダー|申し込み|購入/.test(questionText)) return 'founder';
  if (/料金|価格|プラン|費用/.test(questionText)) return 'pricing';
  if (/機能|できる|使える/.test(questionText)) return 'features';
  if (/火水|Twin-Core|五十音|カタカムナ|言霊/.test(questionText)) return 'worldview';
  if (/動画|ビデオ|映像/.test(questionText)) return 'video';
  if (/ブログ|記事|解説/.test(questionText)) return 'blog';
  if (/SNS|ソーシャル|投稿/.test(questionText)) return 'sns';
  return 'general';
}

export function generateRecommendedLinks(questionType: QuestionType): GeneratedLink[] {
  const recommendationMap: Record<QuestionType, string[]> = {
    founder: ['#founder', '#pricing', '#features'],
    pricing: ['#pricing', '#founder', '#features'],
    features: ['#features', '#about', '#videos'],
    worldview: ['#about', '#features', '#blog'],
    video: ['#videos', '#features', '#about'],
    blog: ['#blog', '#about', '#features'],
    sns: ['#sns', '#features', '#about'],
    general: ['#about', '#features', '#founder'],
  };
  
  const recommendedAnchors = recommendationMap[questionType];
  
  return LP_SECTIONS
    .filter(section => recommendedAnchors.includes(section.anchor))
    .map(section => ({
      title: section.title,
      description: section.description,
      url: section.anchor,
      type: 'section' as const,
      priority: section.priority,
    }))
    .sort((a, b) => b.priority - a.priority);
}

/**
 * LP機能連動の統合処理
 */
export interface LpLinkIntegrationResult {
  questionType: QuestionType;
  dynamicLinks: DynamicLinkResult;
  detailedLinks: DetailedLinkResult;
  recommendedLinks: GeneratedLink[];
  finalMarkdown: string;
}

export function integrateLpLinks(questionText: string): LpLinkIntegrationResult {
  const questionType = detectQuestionType(questionText);
  const dynamicLinks = generateDynamicLinks(questionText);
  const detailedLinks = generateDetailedLinks(questionText);
  const recommendedLinks = generateRecommendedLinks(questionType);
  
  // 最終Markdownを生成（重複排除）
  const allUniqueLinks = Array.from(
    new Map(
      [...dynamicLinks.primaryLink ? [dynamicLinks.primaryLink] : [], ...dynamicLinks.secondaryLinks, ...recommendedLinks]
        .map(link => [link.url, link])
    ).values()
  );
  
  const finalMarkdown = formatLinksAsMarkdown(allUniqueLinks);
  
  return {
    questionType,
    dynamicLinks,
    detailedLinks,
    recommendedLinks,
    finalMarkdown,
  };
}
