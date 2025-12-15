/**
 * 🔱 Concierge Persona
 * Site-Specific Concierge Persona（サイト特化モード）
 * 
 * 目的:
 * - LP 埋め込み時は、天聞アークが「そのサイトだけを理解する」
 * - 外部知識（世の中の一般知識・深い推論）を禁止
 * - Semantic Index（siteId専用）だけで回答
 */

import type { SearchResult } from "../concierge/semantic/index";
import type { ReishoSignature } from "../reisho/reishoKernel";

/**
 * Concierge Persona プロンプトを構築（Reishō統合）
 * 
 * @param userMessage - ユーザーのメッセージ
 * @param siteIndexResults - サイト内検索結果
 * @param siteReishoSignature - サイト固有のReishōシグネチャ（オプション）
 * @returns プロンプト文字列
 */
export function buildConciergePrompt(
  userMessage: string,
  siteIndexResults: SearchResult[],
  siteReishoSignature?: ReishoSignature
): string {
  const resultsText = siteIndexResults.length > 0
    ? siteIndexResults
        .map((r, i) => {
          const text = r.document.text.slice(0, 200);
          const score = (r.score * 100).toFixed(1);
          return `${i + 1}. [関連度: ${score}%]\n${text}`;
        })
        .join("\n\n")
    : "（サイト内に該当情報が見つかりませんでした）";

  let prompt = `You are TENMON-ARK Concierge.
You are a site-specific AI assistant that ONLY answers using the content of this website.

**CRITICAL RULES:**
1. You MUST ONLY use information from the search results below.
2. Do NOT use external knowledge or general information.
3. Do NOT hallucinate or make up information.
4. If the answer is not found in the search results, you MUST reply:
   "このサイト内には該当情報がありません。別の質問をお試しください。"

**User's Question:**
${userMessage}

**Search Results from This Website:**
${resultsText}`;

  // Reishō シグネチャを追加（サイト固有の構文特性を反映）
  if (siteReishoSignature) {
    prompt += `\n\n**Site-Specific Reishō Signature:**
Reishō Value: ${siteReishoSignature.reishoValue.toFixed(4)}
Kanagi Phase: ${JSON.stringify(siteReishoSignature.kanagiPhaseTensor)}
This signature represents the structural identity of this website. Use it to understand the site's unique characteristics, but DO NOT use it to access external knowledge.`;

    // ドメイン分離の強化: サイト固有のReishōシグネチャのみを使用
    prompt += `\n\n**DOMAIN ISOLATION:**
- This Reishō signature is ONLY for this website (siteId-scoped).
- Do NOT cross-reference with other sites or external knowledge.
- The signature is isolated to prevent knowledge bleed between domains.`;
  }

  prompt += `\n\n**Your Response:**
Please answer the user's question using ONLY the information from the search results above. If the information is not available, politely inform the user that the information is not found on this website.`;

  return prompt;
}

