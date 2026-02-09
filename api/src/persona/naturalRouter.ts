import { searchPagesForHybrid } from "../kokuzo/search.js";

export type NaturalType = "greeting" | "datetime" | "other";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isJapanese(message: string): boolean {
  // 空白 + ゼロ幅文字を除去し、正規化してから判定（入力経路差を吸収）
  const compact = String(message || "")
    .replace(/[\s\u200B-\u200D\uFEFF]+/g, "")
    .normalize("NFKC");
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(compact);
}

export function formatJstNowCompat(): string {
  const d = new Date();
  const jst = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const yyyy = jst.getFullYear();
  const mm = pad2(jst.getMonth() + 1);
  const dd = pad2(jst.getDate());
  const hh = pad2(jst.getHours());
  const mi = pad2(jst.getMinutes());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi} JST`;
}

export function classifyNaturalCompat(message: string): NaturalType {
  const raw = String(message || "");
  const t = raw.trim().toLowerCase();
  // NOTE: 改行/空白を吸収して判定を安定化（ターミナル貼り付け事故・UI改行混入に強くする）
  // NOTE: 空白に加えてゼロ幅文字も除去（入力経路差の吸収）
  const rawCompact = raw.replace(/[\s\u200B-\u200D\uFEFF]+/g, "");
  // NOTE: 入力経路差（Unicode正規化）を吸収
  const rawCompactNorm = rawCompact.normalize("NFKC");

  // NOTE: 万一 JA_GREET が "\\u304a..." のように二重エスケープで入っても一致できるように、
  //       raw 側も "\\u" 文字列を実体化した比較用を用意する（最小の保険）
  const rawCompactNormUnescaped = rawCompactNorm.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) =>
    String.fromCharCode(parseInt(h, 16))
  );

  // datetime が動いているので、同じ "regex literal" 方式で greeting も固定
  const JA_GREET_RE =
    /(\u304a\u306f\u3088\u3046|\u3053\u3093\u306b\u3061\u306f|\u3053\u3093\u3070\u3093\u306f|\u306f\u3058\u3081\u307e\u3057\u3066|\u3088\u308d\u3057\u304f)/;

  // greeting（日本語 + 英語）
  if (
    JA_GREET_RE.test(rawCompactNorm) ||
    JA_GREET_RE.test(rawCompactNormUnescaped) || // 二重エスケープ対策
    /^(hello|hi|hey|good\s+(morning|afternoon|evening)|greetings)\b/.test(t)
  ) {
    return "greeting";
  }

  // datetime（日本語 + 英語）
  if (
    /(\u4eca\u65e5|\u304d\u3087\u3046|\u672c\u65e5|\u65e5\u4ed8|\u4f55\u65e5|\u306a\u3093\u306b\u3061|\u4f55\u6642|\u306a\u3093\u3058|\u6642\u9593|\u4f55\u66dc\u65e5|\u66dc\u65e5|\u4eca\u4f55\u6642)/.test(rawCompactNorm) ||
    /\b(date|time|day|today|now)\b/.test(t)
  ) {
    return "datetime";
  }

  return "other";
}

export function naturalRouter(input: { message: string; mode: string }): { handled: boolean; responseText: string } {
  const message = String(input?.message ?? "");
  const typ = classifyNaturalCompat(message);
  const ja = isJapanese(message);

  if (typ === "greeting") {
    return {
      handled: true,
      responseText: ja ? "おはようございます。天聞アークです。" : "Hello. How can I help you today?",
    };
  }

  if (typ === "datetime") {
    const now = formatJstNowCompat();
    return {
      handled: true,
      responseText: ja ? `現在時刻（JST）: ${now}` : `Current time (JST): ${now}`,
    };
  }

  // other（会話の入口）— ドメイン質問はデフォルトで回答に入る（メニューは補助に格下げ）
  if (ja) {
    // ドメイン質問のキーワードをチェック（言灵、法則、カタカムナなど）
    const isDomainQuestion = /言灵|言霊|ことだま|kotodama|法則|カタカムナ|天津金木|水火|與合/i.test(message);
    
    // 相談用テンプレ（不安/過多系）— メニューを返さない（優先度: 高）
    const isAnxietyLike = /不安|こわい|怖い|動けない|しんどい|つらい|辛い|無理|焦る|焦って|詰んだ/i.test(message);
    const isOverwhelmedLike = /やることが多すぎ|やること.*多すぎ|多すぎる|終わらない|溜まって|詰んで|パンク|忙し/i.test(message);
    
    // メニュー返しは #menu または明示的な「メニュー」のみ（挨拶は greeting で処理済み）
    const isExplicitMenu = /^メニュー$|^#menu$/i.test(message.trim());
    
    if (isDomainQuestion) {
      // ドメイン質問の場合は、まず回答を試みる（メニューは最後に添える）
      return {
        handled: false, // handled=false で通常処理（HYBRID検索）にフォールスルー
        responseText: "", // 空文字で通常処理を促す
      };
    }

    // 不安系の相談用テンプレ（メニューより優先）
    if (isAnxietyLike) {
      return {
        handled: true,
        responseText: "いま一番しんどいのは 体力 ？ 気持ち ？\n\n番号でOK / 1行でもOK",
      };
    }

    // 過多系の相談用テンプレ（メニューより優先）
    if (isOverwhelmedLike) {
      return {
        handled: true,
        responseText: "いま 締切がある？ ない？\n\n番号でOK / 1行でもOK",
      };
    }

    // 明示的なメニュー要求のみメニューを表示（#menu または「メニュー」）
    if (isExplicitMenu) {
      return {
        handled: true,
        responseText:
          "了解。どの方向で話しますか？\n" +
          "1) 言灵/カタカムナ/天津金木の質問\n" +
          "2) 資料指定（doc/pdfPage）で厳密回答\n" +
          "3) いまの状況整理（何を作りたいか）",
      };
    }

    // それ以外の日本語は通常処理へフォールスルー（handled=false）
    return {
      handled: false,
      responseText: "",
    };
  }

  return {
    handled: true,
    responseText:
      "I can help with the following:\n" +
      "1) Provide guidance on available features\n" +
      "2) Explain how to use the chat mode\n" +
      "3) Share the system status or next steps",
  };
}

/**
 * 自然会話ルーティング（kokuzo統合版）
 * 
 * 仕様:
 * - 短文相談は必ず質問で終わる
 * - kokuzoの候補がある場合のみ「参考として」一文だけ織り込む（断言禁止）
 * - LLMは既定OFF（決定論で組む）
 */
export async function routeNaturalConversation(
  message: string,
  threadId: string
): Promise<{ handled: boolean; responseText: string }> {
  const trimmed = String(message || "").trim();
  const ja = isJapanese(trimmed);

  // 短文相談判定（不安/過多/迷い/焦り/つらい/眠い 等）
  const isAnxietyLike = /不安|こわい|怖い|動けない|しんどい|つらい|辛い|無理|焦る|焦って|詰んだ|眠い|疲れた/i.test(trimmed);
  const isOverwhelmedLike = /やることが多すぎ|やること.*多すぎ|多すぎる|終わらない|溜まって|詰んで|パンク|忙し/i.test(trimmed);

  // 短文一般判定（「今日は何をすればいい？」等）
  const isShortGeneral = trimmed.length < 30 && /何|どう|いつ|どこ|誰|なぜ|なんで/i.test(trimmed);

  // 短文相談: 不安系
  if (isAnxietyLike) {
    // kokuzo検索（optional、候補があれば1行だけ混ぜる）
    let snippet = "";
    try {
      const candidates = searchPagesForHybrid(null, trimmed, 3);
      if (candidates.length > 0 && candidates[0].snippet) {
        const topSnippet = String(candidates[0].snippet).slice(0, 100).trim();
        if (topSnippet.length > 0) {
          snippet = `\n\n参考の視点: ${topSnippet}${topSnippet.length >= 100 ? "..." : ""}`;
        }
      }
    } catch (e) {
      // kokuzo検索失敗時は無視（決定論テンプレのみ返す）
      console.warn("[routeNaturalConversation] kokuzo search failed:", e);
    }

    // 必ず質問で終わる（断言禁止）
    const question = ja
      ? "いま一番しんどいのは 体力 ？ 気持ち ？"
      : "What's the main concern right now: physical or emotional?";
    const nextStep = ja ? "\n\n次の1手を教えてください。" : "\n\nWhat's the next step you'd like to take?";

    return {
      handled: true,
      responseText: `${question}${snippet}${nextStep}`,
    };
  }

  // 短文相談: 過多系
  if (isOverwhelmedLike) {
    // kokuzo検索（optional、候補があれば1行だけ混ぜる）
    let snippet = "";
    try {
      const candidates = searchPagesForHybrid(null, trimmed, 3);
      if (candidates.length > 0 && candidates[0].snippet) {
        const topSnippet = String(candidates[0].snippet).slice(0, 100).trim();
        if (topSnippet.length > 0) {
          snippet = `\n\n参考の視点: ${topSnippet}${topSnippet.length >= 100 ? "..." : ""}`;
        }
      }
    } catch (e) {
      // kokuzo検索失敗時は無視（決定論テンプレのみ返す）
      console.warn("[routeNaturalConversation] kokuzo search failed:", e);
    }

    // 必ず質問で終わる（断言禁止）
    const question = ja
      ? "いま 締切がある？ ない？"
      : "Do you have a deadline right now, or not?";
    const nextStep = ja ? "\n\n次の1手を教えてください。" : "\n\nWhat's the next step you'd like to take?";

    return {
      handled: true,
      responseText: `${question}${snippet}${nextStep}`,
    };
  }

  // 短文一般（「今日は何をすればいい？」等）
  if (isShortGeneral && ja) {
    // kokuzo検索（optional、候補があれば1行だけ混ぜる）
    let snippet = "";
    try {
      const candidates = searchPagesForHybrid(null, trimmed, 3);
      if (candidates.length > 0 && candidates[0].snippet) {
        const topSnippet = String(candidates[0].snippet).slice(0, 100).trim();
        if (topSnippet.length > 0) {
          snippet = `\n\n参考の視点: ${topSnippet}${topSnippet.length >= 100 ? "..." : ""}`;
        }
      }
    } catch (e) {
      // kokuzo検索失敗時は無視（決定論テンプレのみ返す）
      console.warn("[routeNaturalConversation] kokuzo search failed:", e);
    }

    // 必ず質問で終わる（断言禁止）
    const nextStep = "\n\n次の1手を教えてください。";

    return {
      handled: true,
      responseText: `いま何をしたいですか？${snippet}${nextStep}`,
    };
  }

  // それ以外は通常処理へフォールスルー
  return {
    handled: false,
    responseText: "",
  };
}