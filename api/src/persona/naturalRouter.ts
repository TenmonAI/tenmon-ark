// NATURAL モード用ルーター
// chat.ts から移動したロジック（挙動変更なし）

/**
 * JST時刻をフォーマットする
 */
export function formatJstNow(): string {
  const now = new Date();
  // JST に変換（UTC+9）
  const jstOffset = 9 * 60; // 分単位
  const jstTime = new Date(now.getTime() + (jstOffset - now.getTimezoneOffset()) * 60 * 1000);
  
  const year = jstTime.getFullYear();
  const month = String(jstTime.getMonth() + 1).padStart(2, "0");
  const day = String(jstTime.getDate()).padStart(2, "0");
  const weekday = jstTime.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", weekday: "short" });
  const hour = String(jstTime.getHours()).padStart(2, "0");
  const minute = String(jstTime.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}（${weekday}）${hour}:${minute}（JST）`;
}

/**
 * メッセージを NATURAL モードのタイプに分類する
 */
export function classifyNatural(message: string): "greeting" | "datetime" | "other" {
  const m = message.toLowerCase().trim();
  
  // greeting判定（日本語: おはよう/こんにちは/こんばんは/はじめまして/よろしく / 英語: hello/hi/good morning/good afternoon/good evening）
  if (/^(おはよう|こんにちは|こんばんは|おはようございます|はじめまして|よろしく)/.test(m) ||
      /^(hello|hi|hey|good\s+(morning|afternoon|evening)|greetings)/.test(m)) {
    return "greeting";
  }
  
  // datetime判定（日本語: 今日は何日/今日の日付/今何時/何曜日 / 英語: date/time/what date/what time/what day）
  if (/(今日|きょう|本日|ほんじつ).*(何日|なんにち|日付|ひづけ|いつ|何曜日|なんようび|曜日)/.test(m) ||
      /(今日|きょう|本日|ほんじつ).*(ですか|？|\?)/.test(m) ||
      /(今日の日付|きょうのひづけ|何日|なんにち|日付|ひづけ|何曜日|なんようび|曜日|今何時|いまなんじ|時間)/.test(m) ||
      /(what\s+(date|time|day)|current\s+(date|time)|today|now)/.test(m)) {
    return "datetime";
  }
  
  return "other";
}

/**
 * NATURAL モードの responseText を生成する
 * 工程2-α: 配線化のため、responseText のみを返す（decisionFrame は chat.ts 側で組み立てる）
 */
export function naturalRouter(input: { message: string; mode: string }): {
  handled: boolean;
  responseText: string;
} {
  const { message } = input;
  const naturalType = classifyNatural(message);
  let responseText: string;
  
  if (naturalType === "greeting") {
    // A. greeting: 挨拶への自然な返答（時刻に応じた挨拶を返す）
    const hour = new Date().getHours();
    let greeting: string;
    if (hour >= 5 && hour < 12) {
      greeting = "おはようございます";
    } else if (hour >= 12 && hour < 18) {
      greeting = "こんにちは";
    } else {
      greeting = "こんばんは";
    }
    responseText = `${greeting}。天聞アークです。\n\n『言灵/カタカムナ/天津金木』は #詳細 を付けると根拠候補を提示できます。`;
  } else if (naturalType === "datetime") {
    // B. date/time: JSTで返す
    const jstNow = formatJstNow();
    responseText = `今日は${jstNow}です。`;
  } else {
    // C. smalltalk誘導: それ以外 → 選択肢3つ + 資料指定の例
    responseText = "了解。どういう方向で話しますか？\n\n";
    responseText += "1) 言灵/カタカムナ/天津金木の質問\n";
    responseText += "2) 資料指定（doc/pdfPage）で厳密回答\n";
    responseText += "3) いまの状況整理（何を作りたいか）\n\n";
    responseText += "資料指定の例：\n";
    responseText += "例）言霊秘書.pdf pdfPage=6 言灵とは？ #詳細\n";
    responseText += "例）いろは最終原稿.pdf pdfPage=1 真言とは？ #詳細";
  }
  
  return {
    handled: true,
    responseText,
  };
}

