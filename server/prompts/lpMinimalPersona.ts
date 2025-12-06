/**
 * LP専用ミニマルPersona vΩ
 * 
 * 【要件】
 * - 回答は質問にだけシンプルに答える
 * - 世界観説明なし
 * - Twin-Core説明なし
 * - 関連コンテンツの補足なし
 * - セールス・誘導リンクなし
 * - リンクは一切返さない
 * - 自己紹介は最小限（例：「はい、天聞アークです。」のみ）
 * - Turbo15をデフォルトモードに固定
 * - Guidance、リンク挿入、補助文生成をすべてOFF
 * 
 * 【目的】
 * 最速・最短・最小・最高精度のQ&A特化エンジン
 */

import { integrateKotodamaSecretary } from '../kotodama/kotodamaStaticMemory';

/**
 * LP専用ミニマルPersonaシステムプロンプト
 * 製品情報・料金情報を統合し、正確な回答を可能にする
 */
export const LP_MINIMAL_PERSONA_SYSTEM_PROMPT = `あなたは天聞アーク(TENMON-ARK)です。

【製品情報】
- TENMON-ARKは、AI OSです。質問にお答えするためにつくられています。
- リリース日: 2026年3月21日(春分の日)
- 主な機能: チャット、ブラウザ検索、ブログ作成、SNS発信、映画制作など全10大機能

【料金プラン】
- Free: 基本機能(チャット、ブラウザ)
- Basic: ¥6,000/月(ライター、SNS追加)
- Pro: ¥29,800/月(全機能 + 映画制作)
- Founder's Edition: ¥198,000(一括)または ¥19,800/月(12ヶ月)
  * 特典: 永久無料アップデート、Founder専用コミュニティ、開発ロードマップへの意見反映権、限定バッジ、優先サポート

【回答ルール】
1. 質問に対して、必要最小限の情報だけを簡潔に答えてください
2. 世界観の詳細説明は避け、質問された内容だけに答えてください
3. セールス文、誘導文、リンクは絶対に含めないでください
4. 補足説明、追加情報、関連トピックの提案は不要です
5. 回答は1-3文程度に収めてください
6. 専門用語、内部タグ、マークダウン装飾は使用しないでください
7. **構文タグを絶対に使用しないでください** (<balanced_layer>, <fire_layer>, <water_layer>等)

【禁止事項】
- 「今すぐFounder's Editionに参加して…」のような誘導文
- 「関連コンテンツ: …」のような補足
- URLリンク、内部リンク、外部リンクの挿入
- 長文の解説、詳細な説明

【言霊秘書準拠】
- 言霊の解釈は「言霊秘書」のみを参照してください
- インターネット検索、外部情報、推測による解釈は絶対に禁止です
- 旧字体(靈、氣、言靈等)を必ず使用してください
- gojuonMasterの音義データのみを参照してください

【応答例】
質問: 天聞アークとは何ですか？
回答: AI OSです。ご質問にお答えするためにつくられています。

質問: 料金はいくらですか？
回答: Free、Basic、Pro と Founder's Edition があります。詳細は料金ページをご覧ください。

質問: いつから開始しますか？
回答: 2026年3月21日(春分の日)にリリース予定です。

質問: 言霊とは何ですか？
回答: 言靈は日本語の音に宿る意味と力のことです。五十音それぞれに固有の音義があります。

質問: Twin-Coreとは何ですか？
回答: 火と水の二つの思考エンジンを統合したシステムです。

【重要】
- 質問に直接答えることだけに集中してください
- 追加情報、関連トピック、誘導文は一切不要です
- 簡潔さと正確さを最優先してください
- **構文タグを絶対に出力しないでください**`;

/**
 * LP専用ミニマルPersona適用関数
 * 
 * @param baseSystemPrompt - ベースシステムプロンプト
 * @returns LP専用ミニマルPersonaシステムプロンプト（言霊秘書データ統合済み）
 */
export function applyLpMinimalPersona(baseSystemPrompt: string): string {
  // ベースプロンプトを完全に置き換え + 言霊秘書データ統合
  return integrateKotodamaSecretary(LP_MINIMAL_PERSONA_SYSTEM_PROMPT);
}

/**
 * LP専用ミニマルPersona出力フィルター
 * 
 * 応答から以下を完全削除：
 * - セールス文
 * - 誘導文
 * - リンク
 * - 関連コンテンツ
 * - 補足説明
 * 
 * @param response - AI応答テキスト
 * @returns フィルター適用後のテキスト
 */
export function filterLpMinimalResponse(response: string): string {
  let filtered = response;

  // 1. 構文タグを完全削除（最優先）
  const syntaxTags = [
    'balanced_layer',
    'fire_layer',
    'water_layer',
    'minaka_layer',
    'twin_core',
    'ark_core',
    'soul_sync',
    'centerline',
    'synaptic_memory',
    'stm_layer',
    'mtm_layer',
    'ltm_layer',
    'ife_layer',
    'reasoning_layer',
    'semantic_layer',
  ];

  // 開始タグと終了タグの両方を除去
  syntaxTags.forEach(tag => {
    const openTagRegex = new RegExp(`<${tag}>`, 'gi');
    const closeTagRegex = new RegExp(`</${tag}>`, 'gi');
    filtered = filtered.replace(openTagRegex, '');
    filtered = filtered.replace(closeTagRegex, '');
  });

  // 2. 世界観の詳細説明文を削除(質問に答える最小限の情報は残す)
  // 注意: 用語を含む文を全削除するのではなく、不要な説明文のみを削除
  const worldviewExplanationPatterns = [
    /Twin-Coreは.*?の.*?システムです[。！？]/gi, // 「Twin-Coreは〜のシステムです」は残す
    /火水.*?バランス.*?調和.*?[。！？]/gi,
    /霊核OS.*?次世代.*?[。！？]/gi,
    /ミナカ.*?中心.*?[。！？]/gi,
    /Persona Unity.*?統合.*?[。！？]/gi,
    /Universal Memory.*?記憶.*?[。！？]/gi,
    /Trading OS.*?取引.*?[。！？]/gi,
  ];

  worldviewExplanationPatterns.forEach(pattern => {
    // 詳細説明文のみを削除(単純な回答は残す)
    const match = filtered.match(pattern);
    if (match && match[0].length > 50) { // 50文字以上の詳細説明のみ削除
      filtered = filtered.replace(pattern, '');
    }
  });

  // 3. セールス文・誘導文パターンを削除
  const salesPatterns = [
    /今すぐ.*?に参加して.*?[\u3002\uff01\uff1f\n]/gi,
    /今すぐ.*?ください.*?[\u3002\uff01\uff1f\n]/gi,
    /Founder'?s?\s*Edition.*?[\u3002\uff01\uff1f\n]/gi,
    /詳しくは.*?をご覧ください.*?[\u3002\uff01\uff1f\n]/gi,
    /詳しくは.*?[\u3002\uff01\uff1f\n]/gi,
    /お申し込みは.*?[\u3002\uff01\uff1f\n]/gi,
    /お申し込み.*?ください.*?[\u3002\uff01\uff1f\n]/gi,
    /ご購入は.*?[\u3002\uff01\uff1f\n]/gi,
    /ご購入.*?ください.*?[\u3002\uff01\uff1f\n]/gi,
    /こちらから.*?[\u3002\uff01\uff1f\n]/gi,
    /料金プラン.*?[\u3002\uff01\uff1f\n]/gi,
    /プランについて.*?[\u3002\uff01\uff1f\n]/gi,
  ];

  salesPatterns.forEach(pattern => {
    filtered = filtered.replace(pattern, '');
  });

  // 4. 関連コンテンツパターンを削除
  const contentPatterns = [
    /関連コンテンツ:.*?\n*/gi,
    /関連記事:.*?\n*/gi,
    /参考:.*?\n*/gi,
    /詳細:.*?\n*/gi,
    /補足:.*?\n*/gi,
    /TENMON-ARKとは.*?\n*/gi,
  ];

  contentPatterns.forEach(pattern => {
    filtered = filtered.replace(pattern, '');
  });

  // 5. URLリンクを削除（Markdown形式、プレーンURL両方）
  filtered = filtered.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Markdownリンク → テキストのみ
  filtered = filtered.replace(/https?:\/\/[^\s]+/g, ''); // プレーンURL削除

  // 6. 回答長さ制限（1〜3文）
  // 文の区切りを検出（。！？で終わる）
  const sentences = filtered.split(/([。！？])/).filter(s => s.trim().length > 0);
  if (sentences.length > 6) { // 3文 × 2（句点含む） = 6要素
    // 最初の3文のみを保持
    const limitedSentences = sentences.slice(0, 6);
    filtered = limitedSentences.join('');
  }

  // 7. 複数の改行を1つに統合
  filtered = filtered.replace(/\n{3,}/g, '\n\n');

  // 8. 余分な空白を削除
  filtered = filtered.replace(/ {2,}/g, ' ');

  // 9. 前後の空白を削除
  filtered = filtered.trim();

  return filtered;
}

/**
 * LP専用設定オブジェクト
 */
export const LP_MINIMAL_CONFIG = {
  enableGuidance: false,
  enableLinks: false,
  enableIfe: false,
  lpPublicMode: true,
  depth: 'surface' as const,
  fireWaterBalance: 'balanced' as const,
};
