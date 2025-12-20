import type { ThinkingAxis } from "./thinkingAxis.js";

// CORE-8: 天津金木フェーズ（内部用、UI/レスポンスには返さない）
export type KanagiPhase = "L-IN" | "L-OUT" | "R-IN" | "R-OUT";

/**
 * CORE-8: thinkingAxisからKanagiPhaseを決定する
 * 
 * 対応：
 * - introspective  -> L-IN
 * - observational  -> R-IN
 * - constructive   -> L-OUT
 * - executive      -> R-OUT
 */
export function determineKanagiPhase(thinkingAxis: ThinkingAxis): KanagiPhase {
  switch (thinkingAxis) {
    case "introspective":
      return "L-IN";
    case "observational":
      return "R-IN";
    case "constructive":
      return "L-OUT";
    case "executive":
      return "R-OUT";
    default:
      // デフォルトはR-IN（観察）
      return "R-IN";
  }
}

/**
 * CORE-8: KanagiPhaseに応じて応答文の「展開順」だけを微調整する
 * 
 * 語彙変更は禁止。
 * 既存の applyPersonaStyle / applyThinkingAxisStructure を壊さない。
 */
export function applyKanagiPhaseStructure(
  text: string,
  phase: KanagiPhase
): string {
  if (!text || text.trim().length === 0) {
    return text;
  }

  // L-IN: 内集・内省・圧縮（抽象 → 具体、文を分割）
  if (phase === "L-IN") {
    let structured = text;
    
    // 長い文を分割（50文字以上の文を「。」で分割）
    structured = structured.replace(/([^。]{50,})。/g, (_match, content) => {
      return content + "。\n";
    });
    
    // 抽象的な表現の後に具体例を促す構造（簡易版：文の順序を維持しつつ分割）
    // 「つまり」「要するに」などの抽象語の後に改行を追加
    structured = structured.replace(/(つまり|要するに|すなわち)([^。]*。)/g, "$1\n$2");
    
    return structured;
  }

  // L-OUT: 展開・説明・共有（前提 → 説明 → まとめ）
  if (phase === "L-OUT") {
    let structured = text;
    
    // 「まず」「次に」「最後に」などの順序語を検出して構造化
    const orderPatterns = /(まず|次に|最後に|第一に|第二に)/;
    if (orderPatterns.test(structured)) {
      // 順序語の前に改行を追加（構造を明確に）
      structured = structured.replace(/([。！？])(まず|次に|最後に|第一に|第二に)/g, "$1\n\n$2");
    }
    
    // まとめ語（「以上」「まとめると」）の前に改行を追加
    structured = structured.replace(/([。！？])(以上|まとめると|結論として)/g, "$1\n\n$2");
    
    return structured;
  }

  // R-IN: 観察・確認・把握（状況確認 → 判断保留）
  if (phase === "R-IN") {
    let structured = text;
    
    // 確認語（「確認」「見ると」「調べると」）を含む文を前段に配置
    const confirmPatterns = /(確認|見ると|調べると|確認すると|見てみると)/;
    if (confirmPatterns.test(structured)) {
      // 確認語を含む文を検出して、その前に改行を追加（構造を明確に）
      structured = structured.replace(/([^。]*?(?:確認|見ると|調べると|確認すると|見てみると)[^。]*。)/g, "\n$1");
    }
    
    // 「判断」「結論」などの判断語の前に改行を追加（判断保留の構造）
    structured = structured.replace(/([。！？])(判断|結論|決定)/g, "$1\n\n$2");
    
    return structured;
  }

  // R-OUT: 実行・決断・提示（結論 → 理由）
  if (phase === "R-OUT") {
    let structured = text;
    
    // 最初の文（結論）を抽出して強調
    const firstSentence = structured.split("。")[0];
    if (firstSentence && firstSentence.length > 0) {
      const rest = structured.substring(firstSentence.length + 1);
      
      // 最初の文が短い（40文字未満）かつ、残りがある場合
      if (firstSentence.length < 40 && rest.trim().length > 0) {
        // 最初の文を結論として強調（改行を追加）
        structured = firstSentence + "。\n\n" + rest;
      }
    }
    
    // 「理由」「なぜなら」「なぜかというと」などの理由語の前に改行を追加
    structured = structured.replace(/([。！？])(理由|なぜなら|なぜかというと|その理由は)/g, "$1\n\n$2");
    
    return structured;
  }

  // デフォルト：そのまま
  return text;
}

