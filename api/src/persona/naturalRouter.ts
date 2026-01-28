// NATURAL モード用ルーター
// chat.ts から移動したロジック（挙動変更なし、ルールベースのみ）

/**
 * JST時刻をフォーマットする（YYYY-MM-DD（曜）HH:MM JST）
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
  return `${year}-${month}-${day}（${weekday}）${hour}:${minute} JST`;
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
 * 日本語メッセージかどうかを判定する（ひらがな/カタカナ/漢字を含むか）
 */
function isJapanese(message: string): boolean {
  return /[ぁ-んァ-ン一-龯]/.test(message);
}

/**
 * NATURAL モードの responseText を生成する
 * - greeting/datetime/other をルールベースで決定
 * - decisionFrame は chat.ts 側で組み立てる
 */
export function naturalRouter(input: { message: string; mode: string }): {
  handled: boolean;
  responseText: string;
} {
  const { message } = input;
  const naturalType = classifyNatural(message);
  const ja = isJapanese(message);
  let responseText: string;
  
  if (naturalType === "greeting") {
    // greeting: JSTに応じた挨拶 + 「#詳細で根拠候補提示できます」を1行
    const hour = new Date().getHours();
    if (ja) {
      let greeting: string;
      if (hour >= 5 && hour < 12) {
        greeting = "おはようございます";
      } else if (hour >= 12 && hour < 18) {
        greeting = "こんにちは";
      } else {
        greeting = "こんばんは";
      }
      responseText = `${greeting}。天聞アークです。#詳細で根拠候補提示できます。`;
    } else {
      let greeting: string;
      if (hour >= 5 && hour < 12) {
        greeting = "Good morning";
      } else if (hour >= 12 && hour < 18) {
        greeting = "Good afternoon";
      } else {
        greeting = "Good evening";
      }
      responseText = `${greeting}, this is Tenmon-ARK. You can send #detail to see evidence candidates.`;
    }
  } else if (naturalType === "datetime") {
    // datetime: YYYY-MM-DD（曜）HH:MM JST（言語共通）
    responseText = formatJstNow();
  } else {
    // other: 「どの方向？」 + 1)2)3) を必ず含む（日本語/英語で分岐）
    if (ja) {
      responseText = "どの方向で話しますか？\n\n";
      responseText += "1) 言灵/カタカムナ/天津金木の質問\n";
      responseText += "2) 資料指定（doc/pdfPage）で厳密回答\n";
      responseText += "3) いまの状況整理（何を作りたいか）";
    } else {
      responseText = "Which direction would you like to go?\n\n";
      responseText += "1) Questions about Kotodama / Katakamuna / Amatsu Kanagi\n";
      responseText += "2) Strict answers with doc/pdfPage specified\n";
      responseText += "3)整理 what you are trying to build now";
    }
  }
  
  return {
    handled: true,
    responseText,
  };
}

