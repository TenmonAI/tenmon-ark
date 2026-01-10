// src/persona/speechStyle.ts
export type Intent = "smalltalk" | "aboutArk" | "grounded" | "domain" | "unknown";

export function detectIntent(message: string, hasDocPage: boolean): Intent {
  const t = message.trim();

  if (hasDocPage) return "grounded";

  // smalltalk
  if (/^(おはよう|こんにちは|こんばんは|やあ|もしもし|ありがとう|有難う|おやすみ|さようなら)/.test(t)) {
    return "smalltalk";
  }

  // about this system
  if (/(天聞アーク|TENMON-ARK|tenmon-ark|このAI|あなたは誰)/i.test(t)) {
    return "aboutArk";
  }

  // domain keywords
  if (/(言[霊靈灵]|言霊|言靈|言灵|ことだま|カタカムナ|いろは|天津金木|布斗麻邇|フトマニ|辞|テニヲハ)/.test(t)) {
    return "domain";
  }

  return "unknown";
}

export function shouldShowDebug(message: string, reqDebug?: unknown): boolean {
  if (reqDebug === true) return true;
  // 開発者が「根拠/引用/デバッグ」等を打った時だけ表示
  return /(debug|デバッグ|根拠|引用|法則|decisionFrame|truthCheck)/i.test(message);
}

export function isDetailRequest(message: string): boolean {
  // #詳細 / #detail / 詳細 / 根拠 / 引用 / 法則 / truthCheck / 真理チェック を確実に検出
  // 単語境界を考慮して誤検出を防ぐ
  const t = message.trim();
  return (
    /#詳細|#detail/i.test(t) || // #詳細 または #detail で始まる
    /\b(詳細|根拠|引用|法則|truthCheck|真理チェック)\b/i.test(t) // 単語境界で囲まれたキーワード
  );
}

export function replySmalltalk(message: string): string {
  const t = message.trim();

  if (/^おはよう/.test(t)) return "おはようございます。今日はどんな朝ですか。";
  if (/^こんにちは/.test(t)) return "こんにちは。いま、どんなことを整えたい気分ですか。";
  if (/^こんばんは/.test(t)) return "こんばんは。今日の締めくくりに、どんな問いを置きましょう。";
  if (/(ありがとう|有難う)/.test(t)) return "どういたしまして。続きを、どこから整えましょうか。";

  return "うん、聞いています。いま、いちばん気になっていることは何でしょう。";
}

export function replyAboutArk(): string {
  return [
    "天聞アークは、「問い」を整えて「次の一歩」へつなぐための対話システムです。",
    "必要なら資料の引用で厳密に、必要なら会話の流れを優先して柔らかく。",
    "いまは、どんな相談から始めましょう。"
  ].join("\n");
}

/**
 * 自然会話の骨格：
 * 1) 受領（短く） 2) 要点（短く） 3) 次の一歩（優しく）
 */
export function wrapNatural(params: {
  lead?: string;
  body: string;
  next?: string;
  cite?: string; // 参照情報を軽く添える場合のみ
}): string {
  const chunks = [
    params.lead?.trim(),
    params.body.trim(),
    params.next?.trim(),
    params.cite?.trim(),
  ].filter(Boolean);
  return chunks.join("\n\n");
}

// 新インターフェース用の型（自然会話ラッパ）
type NaturalParamsByFrame = {
  lead?: string;
  body: string;
  next?: string;
  cite?: string;
};

type NaturalCore = {
  appliedLaws?: Array<{ lawId: string; title?: string | null }>;
  truthCheck?: {
    items: Array<{ key: string; present: boolean; label: string }>;
  };
  doc?: string;
  pdfPage?: number;
};

type NaturalParamsByIntent = {
  message: string;
  intent: Intent;
  core?: NaturalCore;
};

/**
 * 自然会話を構成する（上品・短い）
 * - 旧: lead/body/next/cite 直接指定
 * - 新: message/intent/core から自動生成
 */
export function composeNatural(params: NaturalParamsByFrame | NaturalParamsByIntent): string {
  // intentベースの新インターフェース
  if ("message" in params) {
    const t = params.message.trim();
    const intent = params.intent;
    const core = params.core;

    let lead: string | undefined;
    let body: string;
    let next: string | undefined;
    let cite: string | undefined;

    if (intent === "smalltalk") {
      lead = undefined;
      body = t || "うん、聞いています。";
      next = "いま、いちばん気になっていることは何でしょう。";
    } else if (intent === "aboutArk") {
      body =
        "天聞アークは、「問い」を整えて次の一歩へつなぐための対話システムです。";
      next = "いまは、どんな相談から触れてみましょう。";
    } else if (intent === "domain" && core) {
      // domain + core あり: docMode 内での返答（核心語提示は残す）
      const top =
        core?.appliedLaws
          ?.slice(0, 3)
          .map((x) => String(x.title || ""))
          .map((s) => s.replace(/^核心語:\s*/, ""))
          .filter(Boolean) ?? [];

      const missing =
        core?.truthCheck?.items.filter((i) => !i.present).map((i) => i.label) ?? [];

      lead = "承知しました。";
      body = top.length
        ? `この問いは、まず「${top.join("／")}」の線から軽く整えてみるのが自然です。`
        : "この問いは、まず核になる語を一つ決めると、静かに収まりが見えてきます。";

      if (missing.length > 0) {
        next = `（補助軸：${missing.join(" / ")}）どこから一段深くしますか。`;
      } else {
        next = "どこから一段深くしますか。言葉ひとつでも構いません。";
      }

      if (core?.doc && core.pdfPage) {
        cite = `※ いまは ${core.doc} P${core.pdfPage} を土台に見ています。`;
      }
    } else if (intent === "domain") {
      // domain: 短く答えて「#詳細で根拠表示」を提示
      lead = "承知しました。";
      body = `「${t}」について、言霊秘書の観点から簡潔に答えます。\n\n` +
        `（詳細な根拠・法則・真理チェックが必要な場合は「#詳細」を付けて送信してください。）`;
      next = "さらに詳しく知りたいことがあれば、「#詳細」を付けて送信してください。";
      
      if (core?.doc && core.pdfPage) {
        cite = `※ いまは ${core.doc} P${core.pdfPage} を土台に見ています。`;
      }
    } else {
      // unknown / grounded など
      // 実際の質問に答える（一般AIとしての自然応答）
      // 注意: ここでは LLM を呼ばず、簡易的な返答を返す
      // 将来的に LLM を統合する場合は、ここで呼ぶ
      lead = "承知しました。";
      body = `「${t}」について、簡潔に答えます。\n\n` +
        `（この機能は開発中です。詳細な回答が必要な場合は「#詳細」を付けて送信してください。）`;
      next = "さらに詳しく知りたいことがあれば、教えてください。";
    }

    const chunks = [lead?.trim(), body.trim(), next?.trim(), cite?.trim()].filter(
      Boolean
    ) as string[];
    return chunks.join("\n\n");
  }

  // 旧インターフェース（既存呼び出し互換）
  const frame = params as NaturalParamsByFrame;
  const chunks = [
    frame.lead?.trim(),
    frame.body.trim(),
    frame.next?.trim(),
    frame.cite?.trim(),
  ].filter(Boolean) as string[];
  return chunks.join("\n\n");
}

