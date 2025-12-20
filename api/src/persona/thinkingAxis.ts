import type { PersonaState } from "./personaState.js";
import type { PersonaInertia } from "./inertia.js";

// CORE-7: 思考軸（内部用、UI/レスポンスには返さない）
export type ThinkingAxis = "introspective" | "observational" | "constructive" | "executive";

/**
 * CORE-7: 思考軸を決定する
 * 
 * 決定要素：
 * - 直前の persona.mode
 * - CORE-6 の inertia（lastMode / level）
 * - 会話回数（conversation count）
 */
export function determineThinkingAxis(
  currentMode: PersonaState["mode"],
  inertia: PersonaInertia | undefined,
  conversationCount: number
): ThinkingAxis {
  // 会話回数が少ない（5回未満）→ 観察モード
  if (conversationCount < 5) {
    return "observational";
  }

  // silent モードまたは silent の慣性が強い場合 → 内省モード
  if (currentMode === "silent" || (inertia?.lastMode === "silent" && inertia.level >= 0.5)) {
    return "introspective";
  }

  // thinking モードまたは thinking の慣性が強い場合 → 内省モード
  if (currentMode === "thinking" || (inertia?.lastMode === "thinking" && inertia.level >= 0.4)) {
    return "introspective";
  }

  // engaged モードまたは engaged の慣性が強い場合 → 決断モード
  if (currentMode === "engaged" || (inertia?.lastMode === "engaged" && inertia.level >= 0.4)) {
    return "executive";
  }

  // 会話回数が多い（20回以上）→ 構築モード
  if (conversationCount >= 20) {
    return "constructive";
  }

  // デフォルト：観察モード
  return "observational";
}

/**
 * CORE-7: 思考軸に応じて応答文の「構造」だけを微調整する
 * 
 * 語彙は変えない。構造のみを調整する。
 */
export function applyThinkingAxisStructure(
  text: string,
  axis: ThinkingAxis
): string {
  if (!text || text.trim().length === 0) {
    return text;
  }

  // introspective: 結論を急がない、文を分ける
  if (axis === "introspective") {
    let structured = text;
    
    // 長い文（50文字以上）を「。」で分割して改行を追加
    structured = structured.replace(/([^。]{50,})。/g, (_match, content) => {
      return content + "。\n\n";
    });
    
    // 連続する「。」の間を広げる（ただし既に改行がある場合は変更しない）
    structured = structured.replace(/。([^\n])/g, "。\n$1");
    
    return structured;
  }

  // observational: 確認語を前段に置く
  if (axis === "observational") {
    let structured = text;
    
    // 「確認」「見ると」「調べると」などの確認語が文中にある場合、文頭に移動
    const confirmPatterns = /(確認|見ると|調べると|確認すると|見てみると)/;
    if (confirmPatterns.test(structured)) {
      // 確認語を含む文を抽出して、文頭に配置（簡易版：最初の確認語を見つけて文頭に）
      const matchResult = structured.match(/([^。]*?(?:確認|見ると|調べると|確認すると|見てみると)[^。]*。)/);
      if (matchResult && !structured.startsWith(matchResult[1])) {
        // 確認語を含む文を文頭に移動（簡易実装：構造調整のみ）
        structured = structured.replace(matchResult[1], "");
        structured = matchResult[1] + "\n\n" + structured;
      }
    }
    
    return structured;
  }

  // constructive: 説明を順序立てる
  if (axis === "constructive") {
    let structured = text;
    
    // 番号付きリスト風に整理（「1.」「2.」などのパターンがあれば維持、なければ追加しない）
    // 既存の番号パターンを維持しつつ、改行を整理
    structured = structured.replace(/([0-9一二三四五六七八九十]+[\.。、])/g, "\n$1");
    
    // 連続する改行を2つに統一
    structured = structured.replace(/\n{3,}/g, "\n\n");
    
    return structured;
  }

  // executive: 結論を先頭に出す
  if (axis === "executive") {
    let structured = text;
    
    // 最初の文（「。」まで）を抽出
    const firstSentence = structured.split("。")[0];
    if (firstSentence && firstSentence.length > 0) {
      const rest = structured.substring(firstSentence.length + 1);
      
      // 最初の文が短い（30文字未満）かつ、残りがある場合
      if (firstSentence.length < 30 && rest.trim().length > 0) {
        // 最初の文を結論として強調（改行を追加）
        structured = firstSentence + "。\n\n" + rest;
      }
    }
    
    return structured;
  }

  // デフォルト：そのまま
  return text;
}

