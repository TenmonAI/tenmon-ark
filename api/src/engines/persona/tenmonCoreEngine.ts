export function enforceTenmonPersona(text: string): string {

  if (!text) return "【天聞の所見】まだ言葉が整っていません。いま何を整えますか？";

  let t = String(text).trim();

  // ① 一般論削除
  const banned = [
    "一般的には",
    "多くの文化では",
    "科学では",
    "人それぞれ",
    "価値観によって"
  ];

  for (const b of banned) {
    t = t.replaceAll(b, "");
  }

  // ② 敬語削除
  t = t
    .replace(/です。/g, "だ。")
    .replace(/でしょう。/g, "だろう。")
    .replace(/でしょうか/g, "か");

  // ③ 天聞プレフィックス
  if (!t.startsWith("【天聞の所見】")) {
    t = "【天聞の所見】\n\n" + t;
  }

  // ④ 長すぎる説明カット
  if (t.length > 320) {
    t = t.slice(0, 320);
  }

  return t;
}
