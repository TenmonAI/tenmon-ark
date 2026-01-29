export type NaturalType = "greeting" | "datetime" | "other";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isJapanese(message: string): boolean {
  return /[ぁ-んァ-ン一-龯]/.test(message);
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
  const rawCompact = raw.replace(/\s+/g, "");

  // greeting（日本語 + 英語）
  if (
    /^(おはよう|こんにちは|こんばんは|はじめまして|よろしく)/.test(rawCompact) ||
    /^(hello|hi|hey|good\s+(morning|afternoon|evening)|greetings)\b/.test(t)
  ) {
    return "greeting";
  }

  // datetime（日本語 + 英語）
  if (
    /(今日|きょう|本日|日付|何日|なんにち|何時|なんじ|時間|何曜日|曜日|今何時)/.test(rawCompact) ||
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

