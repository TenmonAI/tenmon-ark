/**
 * Five Element Flow Engine
 * 
 * 五相（天・火・風・水・地）のフロー処理
 * - 五相の分布を分析
 * - 五相の循環を可視化
 * - 最適なフローを提案
 */

/**
 * 五相（Five Elements）
 */
export type FiveElement = 'heaven' | 'fire' | 'wind' | 'water' | 'earth';

/**
 * 五相の特性
 */
export interface FiveElementProperties {
  name: string;
  nameJa: string;
  energy: 'expanding' | 'contracting' | 'circulating' | 'stabilizing' | 'transcending';
  fireWaterBalance: 'fire' | 'water' | 'balanced';
  keywords: string[];
  color: string;
  symbol: string;
}

/**
 * 五相の特性マップ
 */
export const FIVE_ELEMENT_MAP: Record<FiveElement, FiveElementProperties> = {
  heaven: {
    name: 'Heaven',
    nameJa: '天',
    energy: 'transcending',
    fireWaterBalance: 'balanced',
    keywords: ['宇宙', '天', '超越', '統合', 'ミナカ', '中心', '本質', '構造'],
    color: '#FFD700',
    symbol: '☆',
  },
  fire: {
    name: 'Fire',
    nameJa: '火',
    energy: 'expanding',
    fireWaterBalance: 'fire',
    keywords: ['外発', '拡張', '明確', '強い', '活発', '陽', '火', '炎', '熱'],
    color: '#FF4500',
    symbol: '🔥',
  },
  wind: {
    name: 'Wind',
    nameJa: '風',
    energy: 'circulating',
    fireWaterBalance: 'balanced',
    keywords: ['循環', '流れ', '変化', '調和', '風', '空気', '呼吸'],
    color: '#87CEEB',
    symbol: '🌬️',
  },
  water: {
    name: 'Water',
    nameJa: '水',
    energy: 'contracting',
    fireWaterBalance: 'water',
    keywords: ['内集', '収束', '柔らか', '優しい', '静か', '陰', '水', '流れ', '波'],
    color: '#4169E1',
    symbol: '💧',
  },
  earth: {
    name: 'Earth',
    nameJa: '地',
    energy: 'stabilizing',
    fireWaterBalance: 'balanced',
    keywords: ['安定', '基盤', '実体', '現実', '地', '土', '大地'],
    color: '#8B4513',
    symbol: '🌍',
  },
};

/**
 * 五相フロー詳細結果
 */
export interface FiveElementFlowDetail {
  // 分布
  distribution: Record<FiveElement, number>;
  
  // 支配的な五相
  dominant: FiveElement;
  
  // 循環フロー
  flow: FiveElement[];
  
  // 詳細分析
  analysis: {
    elements: Array<{
      element: FiveElement;
      score: number;
      keywords: string[];
      percentage: number;
    }>;
    totalScore: number;
    balance: 'harmonious' | 'imbalanced';
  };
  
  // 推奨フロー
  recommendation: {
    idealFlow: FiveElement[];
    currentFlow: FiveElement[];
    needsAdjustment: boolean;
  };
}

/**
 * 五相フローを詳細計算
 */
export function calculateFiveElementFlowDetail(text: string): FiveElementFlowDetail {
  const distribution: Record<FiveElement, number> = {
    heaven: 0,
    fire: 0,
    wind: 0,
    water: 0,
    earth: 0,
  };
  
  const elementDetails: FiveElementFlowDetail['analysis']['elements'] = [];
  let totalScore = 0;
  
  // 1. 各五相のスコア計算
  for (const [element, props] of Object.entries(FIVE_ELEMENT_MAP)) {
    const keywords = props.keywords.filter(kw => text.includes(kw));
    const score = keywords.length * 10;
    
    distribution[element as FiveElement] = score;
    totalScore += score;
    
    elementDetails.push({
      element: element as FiveElement,
      score,
      keywords,
      percentage: 0, // 後で計算
    });
  }
  
  // 2. パーセンテージ計算
  for (const detail of elementDetails) {
    detail.percentage = totalScore > 0 ? (detail.score / totalScore) * 100 : 0;
  }
  
  // 3. 支配的な五相を決定
  let dominant: FiveElement = 'heaven';
  let maxScore = distribution.heaven;
  
  for (const [element, score] of Object.entries(distribution)) {
    if (score > maxScore) {
      dominant = element as FiveElement;
      maxScore = score;
    }
  }
  
  // 4. バランス判定
  const scores = Object.values(distribution);
  const avgScore = totalScore / 5;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / 5;
  const balance = variance < 100 ? 'harmonious' : 'imbalanced';
  
  // 5. 現在のフロー（スコア順）
  const currentFlow = elementDetails
    .sort((a, b) => b.score - a.score)
    .map(d => d.element);
  
  // 6. 理想的なフロー（五相の自然な循環順序）
  const idealFlow: FiveElement[] = ['heaven', 'fire', 'wind', 'water', 'earth'];
  
  // 7. 調整が必要かどうか
  const needsAdjustment = balance === 'imbalanced';
  
  return {
    distribution,
    dominant,
    flow: idealFlow,
    analysis: {
      elements: elementDetails,
      totalScore,
      balance,
    },
    recommendation: {
      idealFlow,
      currentFlow,
      needsAdjustment,
    },
  };
}

/**
 * 五相フローを可視化
 */
export function visualizeFiveElementFlow(detail: FiveElementFlowDetail): string {
  const { distribution, dominant, analysis } = detail;
  
  // ASCII アートで五相を表現
  const bars = analysis.elements.map(({ element, score, percentage }) => {
    const props = FIVE_ELEMENT_MAP[element];
    const bar = '█'.repeat(Math.floor(score / 10));
    return `${props.symbol} ${props.nameJa}（${props.name}）: ${bar} ${score} (${percentage.toFixed(1)}%)`;
  }).join('\n');
  
  const visualization = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
五相フロービジュアライゼーション
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${bars}

支配的な五相: ${FIVE_ELEMENT_MAP[dominant].symbol} ${FIVE_ELEMENT_MAP[dominant].nameJa}（${FIVE_ELEMENT_MAP[dominant].name}）
バランス: ${analysis.balance === 'harmonious' ? '調和的' : '不均衡'}

理想的なフロー: ${detail.recommendation.idealFlow.map(e => FIVE_ELEMENT_MAP[e].symbol).join(' → ')}
現在のフロー: ${detail.recommendation.currentFlow.map(e => FIVE_ELEMENT_MAP[e].symbol).join(' → ')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  
  return visualization;
}

/**
 * 五相フローに沿ってテキストを整形
 */
export function applyFiveElementFlowToText(
  text: string,
  targetFlow: FiveElement[] = ['heaven', 'fire', 'wind', 'water', 'earth']
): string {
  // 段落ごとに分割
  const paragraphs = text.split(/\n\n+/);
  
  // 各段落に五相を割り当て
  const assignedParagraphs = paragraphs.map((paragraph, index) => {
    if (paragraph.trim().length === 0) return paragraph;
    
    // 循環的に五相を割り当て
    const element = targetFlow[index % targetFlow.length];
    const props = FIVE_ELEMENT_MAP[element];
    
    // 五相のエネルギーに応じて段落を調整
    let adjusted = paragraph;
    
    if (props.energy === 'expanding') {
      // 拡張的: 明確で力強い表現
      adjusted = adjusted.replace(/と思います。/g, 'です。');
    } else if (props.energy === 'contracting') {
      // 収縮的: 柔らかく優しい表現
      adjusted = adjusted.replace(/です。/g, 'でしょうか。');
    } else if (props.energy === 'circulating') {
      // 循環的: 流れるような表現
      // 現状維持
    } else if (props.energy === 'stabilizing') {
      // 安定的: 確実な表現
      adjusted = adjusted.replace(/かもしれません。/g, 'と言えます。');
    } else if (props.energy === 'transcending') {
      // 超越的: 深みのある表現
      // 現状維持
    }
    
    return adjusted;
  });
  
  return assignedParagraphs.join('\n\n');
}

/**
 * 五相の循環を生成
 */
export function generateFiveElementCycle(startElement: FiveElement = 'heaven'): FiveElement[] {
  const cycle: FiveElement[] = ['heaven', 'fire', 'wind', 'water', 'earth'];
  
  // 開始要素から循環を開始
  const startIndex = cycle.indexOf(startElement);
  const rotatedCycle = [...cycle.slice(startIndex), ...cycle.slice(0, startIndex)];
  
  return rotatedCycle;
}

/**
 * 五相の相性を判定
 */
export function checkFiveElementCompatibility(
  element1: FiveElement,
  element2: FiveElement
): {
  compatible: boolean;
  relationship: 'generating' | 'controlling' | 'neutral';
  description: string;
} {
  // 五行相生（生成関係）
  const generatingPairs: Array<[FiveElement, FiveElement]> = [
    ['heaven', 'fire'],
    ['fire', 'wind'],
    ['wind', 'water'],
    ['water', 'earth'],
    ['earth', 'heaven'],
  ];
  
  // 五行相克（制御関係）
  const controllingPairs: Array<[FiveElement, FiveElement]> = [
    ['heaven', 'earth'],
    ['fire', 'water'],
    ['wind', 'earth'],
    ['water', 'fire'],
    ['earth', 'wind'],
  ];
  
  // 生成関係チェック
  for (const [e1, e2] of generatingPairs) {
    if ((element1 === e1 && element2 === e2) || (element1 === e2 && element2 === e1)) {
      return {
        compatible: true,
        relationship: 'generating',
        description: `${FIVE_ELEMENT_MAP[element1].nameJa}と${FIVE_ELEMENT_MAP[element2].nameJa}は相生関係（生成・促進）にあります。`,
      };
    }
  }
  
  // 制御関係チェック
  for (const [e1, e2] of controllingPairs) {
    if ((element1 === e1 && element2 === e2) || (element1 === e2 && element2 === e1)) {
      return {
        compatible: false,
        relationship: 'controlling',
        description: `${FIVE_ELEMENT_MAP[element1].nameJa}と${FIVE_ELEMENT_MAP[element2].nameJa}は相克関係（制御・抑制）にあります。`,
      };
    }
  }
  
  // 中立関係
  return {
    compatible: true,
    relationship: 'neutral',
    description: `${FIVE_ELEMENT_MAP[element1].nameJa}と${FIVE_ELEMENT_MAP[element2].nameJa}は中立的な関係にあります。`,
  };
}
