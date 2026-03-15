export function enforceTenmonPersona(text: string, options?: { maxLength?: number | null }): string {

  if (!text) {
    return "【天聞の所見】まだ言葉が整っていない。いま何を整える？";
  }

  let t = String(text).trim();

  // 一般論除去
  const banned = [
    "一般的には",
    "多くの文化では",
    "科学では",
    "人それぞれ",
    "価値観によって",
    "象徴します",
    "考えられます",
    "重要です",
    "見られます"
  ];

  for (const b of banned) {
    t = t.replaceAll(b, "");
  }

  // 語尾強制
  t = t
    .replace(/です。/g, "だ。")
    .replace(/でしょう。/g, "だろう。")
    .replace(/でしょうか/g, "か")
    .replace(/あります。/g, "ある。");

  // 三段構造強調
  t = t.replace(/。/g, "。\n\n");

  // TENMONプレフィックス
  if (!t.startsWith("【天聞の所見】")) {
    t = "【天聞の所見】\n\n" + t;
  }

  // 長さ制限（未指定時は 350）
  const maxLen = options?.maxLength != null && typeof options.maxLength === "number" ? options.maxLength : 350;
  if (t.length > maxLen) {
    t = t.slice(0, maxLen);
  }

  return t;
}
