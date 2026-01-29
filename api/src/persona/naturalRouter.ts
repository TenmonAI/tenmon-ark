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
  // NOTE: 改行/空白に加えゼロ幅文字も吸収し、その後 Unicode正規化
  const rawCompactNorm = raw
    .replace(/[\s\u200B-\u200D\uFEFF]+/g, "")
    .normalize("NFKC");

  // datetime が動いているので、同じ “regex literal” 方式で greeting も固定
  const JA_GREET_RE =
    /(\u304a\u306f\u3088\u3046|\u3053\u3093\u306b\u3061\u306f|\u3053\u3093\u3070\u3093\u306f|\u306f\u3058\u3081\u307e\u3057\u3066|\u3088\u308d\u3057\u304f)/;

  // greeting（日本語 + 英語）
  if (
    // 先頭固定だと「絵文字/記号 + 挨拶」で漏れるのでアンカーを外す（最小差分）
    JA_GREET_RE.test(rawCompactNorm) ||
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

  // other（会話の入口）— 1)2)3) は必須（Phase19維持）
  if (ja) {
    return {
      handled: true,
      responseText:
        "了解。どの方向で話しますか？\n" +
        "1) 言灵/カタカムナ/天津金木の質問\n" +
        "2) 資料指定（doc/pdfPage）で厳密回答\n" +
        "3) いまの状況整理（何を作りたいか）",
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

