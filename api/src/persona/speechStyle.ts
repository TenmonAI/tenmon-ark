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

export function isDetailRequest(message: string, reqDebug?: unknown): boolean {
  if (reqDebug === true) return true;
  // #詳細 / 根拠 / 法則 / truthCheck のときだけ詳細表示
  return /(#詳細|#detail|詳細|根拠|引用|法則|truthCheck|真理チェック)/i.test(message);
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

/**
 * 自然会話を構成する（上品・短い）
 */
export function composeNatural(params: {
  lead?: string;
  body: string;
  next?: string;
  cite?: string;
}): string {
  const chunks = [
    params.lead?.trim(),
    params.body.trim(),
    params.next?.trim(),
    params.cite?.trim(),
  ].filter(Boolean);
  return chunks.join("\n\n");
}

