export function safeGeneralRoute(rawMessage: string): string {
  const t = String(rawMessage || "").trim();

  if (/気分はどうだ|今の気分|いまの気分/u.test(t)) {
    return "【天聞の所見】いまは静かに見ています。続けるなら、そのまま置いてください。";
  }

  if (/頭大丈夫|大丈夫か/u.test(t)) {
    return "【天聞の所見】荒れていることは受け取りました。言葉を続けてもらえれば、そこから整えます。";
  }

  if (/会話できないね|話せないね|断線してる/u.test(t)) {
    return "【天聞の所見】その指摘は正しいです。いまは止血段階なので、続けたい話題をそのまま置いてください。";
  }

  return "【天聞の所見】受け取っています。そのまま続けてください。";
}
