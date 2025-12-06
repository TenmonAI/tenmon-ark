/**
 * TENMON-ARK Persona Output Filter vΩ
 * 
 * 内部構文タグを除去し、自然文のみを出力する
 * 
 * 【除去対象タグ】
 * - <balanced_layer> </balanced_layer>
 * - <fire_layer> </fire_layer>
 * - <water_layer> </water_layer>
 * - <minaka_layer> </minaka_layer>
 * - その他 angle-bracket タグ全般
 * 
 * 【適用箇所】
 * - generateChatResponse() (chatAI.ts)
 * - generateChatResponseStream() (chatAI.ts)
 * - lpQaRouterV4.chat (lpQaRouterV4.ts)
 */

/**
 * 内部タグを除去し、自然文のみを返す
 * 
 * @param text - 除去前のテキスト
 * @returns 除去後のテキスト
 */
export function removeInternalTags(text: string): string {
  if (!text) return text;

  let filtered = text;

  // 1. 特定の深層構文タグを除去
  const specificTags = [
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
  specificTags.forEach(tag => {
    const openTagRegex = new RegExp(`<${tag}>`, 'gi');
    const closeTagRegex = new RegExp(`</${tag}>`, 'gi');
    filtered = filtered.replace(openTagRegex, '');
    filtered = filtered.replace(closeTagRegex, '');
  });

  // 2. その他の angle-bracket タグ全般を除去
  // ただし、HTMLタグは保持する（<a>, <b>, <i>, <strong>, <em>, <code>, <pre>, <br>, <hr>）
  const allowedHtmlTags = ['a', 'b', 'i', 'strong', 'em', 'code', 'pre', 'br', 'hr', 'ul', 'ol', 'li', 'p', 'div', 'span'];
  
  // 許可されたHTMLタグ以外のタグを除去
  filtered = filtered.replace(/<\/?([a-zA-Z0-9_-]+)[^>]*>/g, (match, tagName) => {
    if (allowedHtmlTags.includes(tagName.toLowerCase())) {
      return match; // 許可されたタグは保持
    }
    return ''; // それ以外は除去
  });

  // 3. 余分な空白・改行を整形
  // 連続する空白を1つに
  filtered = filtered.replace(/ {2,}/g, ' ');
  
  // 連続する改行を最大2つに（段落区切りを保持）
  filtered = filtered.replace(/\n{3,}/g, '\n\n');
  
  // 行頭・行末の空白を除去
  filtered = filtered
    .split('\n')
    .map(line => line.trim())
    .join('\n');
  
  // 全体のトリム
  filtered = filtered.trim();

  return filtered;
}

/**
 * ストリーミング用のリアルタイムタグ除去
 * チャンク単位で処理し、タグが分割されている場合も対応
 * 
 * @param chunk - ストリーミングチャンク
 * @param buffer - 前回の未処理バッファ
 * @returns { filtered: string, buffer: string } - 除去後のチャンクと新しいバッファ
 */
export function removeInternalTagsStreaming(chunk: string, buffer: string = ''): { filtered: string; buffer: string } {
  // バッファと新しいチャンクを結合
  const combined = buffer + chunk;

  // タグの開始または途中を検出 (<, </, <tag, </tagなど)
  const tagStartMatch = combined.match(/<\/?[a-zA-Z0-9_-]*$/);
  
  if (tagStartMatch) {
    // タグが途中で切れている可能性がある
    // タグの開始位置までを処理し、残りをバッファに保存
    const safeText = combined.substring(0, tagStartMatch.index);
    const newBuffer = combined.substring(tagStartMatch.index!);
    
    return {
      filtered: removeInternalTags(safeText),
      buffer: newBuffer,
    };
  }

  // タグが完全に含まれている場合
  return {
    filtered: removeInternalTags(combined),
    buffer: '',
  };
}

/**
 * デバッグ用: 除去されたタグをログ出力
 * 
 * @param text - 除去前のテキスト
 * @returns 除去されたタグのリスト
 */
export function detectInternalTags(text: string): string[] {
  if (!text) return [];

  const tags: string[] = [];
  const tagRegex = /<\/?([a-zA-Z0-9_-]+)[^>]*>/g;
  let match;

  while ((match = tagRegex.exec(text)) !== null) {
    const tagName = match[1];
    if (tagName && !tags.includes(tagName)) {
      tags.push(tagName);
    }
  }

  return tags;
}
