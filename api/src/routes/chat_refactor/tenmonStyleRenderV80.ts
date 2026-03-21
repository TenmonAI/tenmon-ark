/**
 * CHAT_SAFE_REFACTOR_PATCH80_TENMON_STYLE_RENDERER_V1
 * 句読点・余分空白・改行の整理と、追記ブロック前での軽い間（息継ぎ）を入れる。
 * 意味・route / contract には触れない純テキスト整形のみ。
 */

export function shouldApplyTenmonStyleRenderV80(input: {
  mode: string;
  routeReason: string;
  response: string;
}): boolean {
  if (String(input.mode ?? "") === "GROUNDED") return false;
  const rr = String(input.routeReason ?? "");
  if (/SMOKE|FASTPATH_GREETING|DET_PASSPHRASE|NATURAL_FALLBACK$/i.test(rr)) return false;
  const r = String(input.response ?? "").trim();
  if (r.length < 24) return false;
  return true;
}

/**
 * 天聞追記（PATCH77〜79）が本文末尾に付いたとき、前段との息継ぎを付けて cadence を整える。
 */
export function applyTenmonStyleRenderV80(text: string): string {
  let t = String(text ?? "").replace(/\r\n/g, "\n");

  // 句読点・空白の詰まり（意味は変えない）
  t = t.replace(/。{2,}/g, "。");
  t = t.replace(/、{2,}/g, "、");
  t = t.replace(/[ \t]+\n/g, "\n");
  t = t.replace(/\n[ \t]+/g, "\n");
  t = t.replace(/\n{4,}/g, "\n\n\n");

  // PATCH77〜79 の典型先頭へ息継ぎ（説教調を増やさず、視覚的リズムだけ）
  t = t.replace(/([^\n])\s*(天聞としては)/g, "$1\n\n$2");
  t = t.replace(/([^\n])\s*(進め方の骨格は)/g, "$1\n\n$2");
  t = t.replace(/([^\n])\s*(同じ判断で読むと)/g, "$1\n\n$2");

  // 文末直後に続く「天聞／進め方／同じ判断」も同様（先頭以外）
  t = t.replace(/。(?=天聞としては)/g, "。\n\n");
  t = t.replace(/。(?=進め方の骨格は)/g, "。\n\n");
  t = t.replace(/。(?=同じ判断で読むと)/g, "。\n\n");

  // 連続した空行は最大二連
  t = t.replace(/\n{3,}/g, "\n\n").trim();

  return t;
}
