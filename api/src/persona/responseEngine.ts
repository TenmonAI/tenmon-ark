import type { PersonaState } from "./personaState.js";

// CORE-5：人格状態が応答に影響する決定的ロジック
export function generateResponse(message: string, persona: PersonaState): string {
  if (persona.mode === "silent") {
    return "……";
  }

  if (persona.mode === "thinking") {
    return `少し考えさせてください。\n\nあなたはこう言いましたね：\n「${message}」`;
  }

  if (persona.mode === "engaged") {
    return `聞こえています。\n\nあなたの言葉は、確かに届いています。\n\n「${message}」`;
  }

  // calm（デフォルト）
  return `受け取りました。\n\n「${message}」`;
}

/**
 * CORE-5: 人格状態に応じてLLMの生テキストの「語り方だけ」を変える
 * 
 * 条件：
 * - 意味は変えない
 * - 情報を足さない
 * - UIを意識しない
 * - if / switch 程度の単純ロジック
 * 
 * @param rawText LLMが生成した生のテキスト
 * @param persona 現在の人格状態
 * @returns 語り方を調整したテキスト
 */
export function applyPersonaStyle(rawText: string, persona: PersonaState): string {
  if (!rawText || rawText.trim().length === 0) {
    return rawText;
  }

  // silent: 極端に短く（最初の文のみ）
  if (persona.mode === "silent") {
    const firstSentence = rawText.split("。")[0];
    if (firstSentence) {
      return firstSentence + "。";
    }
    return rawText.length > 10 ? rawText.substring(0, 10) + "…" : rawText;
  }

  // calm: 余計な装飾をしない（そのまま）
  if (persona.mode === "calm") {
    return rawText;
  }

  // thinking: 一拍置いた語り（語尾を柔らかく、間を置く）
  if (persona.mode === "thinking") {
    let styled = rawText;
    
    // 語尾の「です」「ます」を「です…」「ます…」に（ただし既に「…」がある場合は変更しない）
    styled = styled.replace(/(です|ます)([。！？\n])/g, (match, base, punct) => {
      if (punct === "。") {
        return base + "…";
      }
      return match;
    });
    
    // 文末に余韻を残す（最後の「。」を「…」に、ただし既に「…」がある場合は変更しない）
    if (styled.endsWith("。") && !styled.endsWith("…")) {
      styled = styled.slice(0, -1) + "…";
    }
    
    // 改行の前に少し間を置く（連続する改行を維持しつつ、単一改行の前に余白を感じさせる）
    // ただし、既に2つ以上の改行がある場合は変更しない
    styled = styled.replace(/([。！？])\n([^\n])/g, "$1\n\n$2");
    
    return styled;
  }

  // engaged: 反応が前のめり（語尾を強める、感嘆符を追加）
  if (persona.mode === "engaged") {
    let styled = rawText;
    
    // 語尾の「です」「ます」を「です！」「ます！」に（ただし既に「！」がある場合は変更しない）
    styled = styled.replace(/(です|ます)([。？\n])/g, (match, base, punct) => {
      if (punct === "。") {
        return base + "！";
      }
      return match;
    });
    
    // 文末に感嘆符を追加（最後の「。」を「！」に、ただし既に「！」がある場合は変更しない）
    if (styled.endsWith("。") && !styled.endsWith("！")) {
      styled = styled.slice(0, -1) + "！";
    }
    
    // 改行を減らして密度を上げる（3つ以上の連続改行を2つに）
    styled = styled.replace(/\n{3,}/g, "\n\n");
    
    return styled;
  }

  // デフォルト（calmと同じ）
  return rawText;
}

