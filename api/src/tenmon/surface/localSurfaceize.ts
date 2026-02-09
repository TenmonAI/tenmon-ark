/**
 * localSurfaceize: ユーザーに返す response を “自然文”に整える最終安全弁（LLM不要）
 * - [NON_TEXT_PAGE_OR_OCR_FAILED] を絶対に surface に出さない
 * - doc/pdfPage 等の根拠を新規に作らない（文字列整形のみ）
 */
export function localSurfaceize(text: string, userMsg: string): string {
  let out = String(text ?? "");

  // 0) NON_TEXT は絶対に露出させない（最優先）
  if (out.includes("[NON_TEXT_PAGE_OR_OCR_FAILED]")) {
    return (
      "いま参照しようとした資料が、文字として取り出せない状態でした。\n" +
      "先に状況を整理したいです。いちばん近いのはどれ？\n" +
      "1) 優先順位が決められない\n" +
      "2) 情報が多すぎて疲れた\n" +
      "3) 何から手を付けるか迷う\n\n" +
      "番号か、いま一番重いものを1行で教えてください？"
    );
  }

  // 1) ログ語彙の軽い自然化
  const pairs: Array<[RegExp, string]> = [
    [/観測中/g, "いま状況を整理しています"],
    [/未解決：/g, "まだ決めきれていない点："],
    [/矛盾（保持中）：/g, "見方が割れている点："],
    [/正中/g, "要点"],
    [/内集/g, "整理"],
    [/外発/g, "行動"],
    [/凝縮/g, "絞り込み"],
    [/圧縮/g, "要約"],
    [/発酵中/g, "整理が進行中です"],
  ];
  for (const [r, v] of pairs) out = out.replace(r, v);

  out = out.replace(/\n{3,}/g, "\n\n").trim();

  // 相談系は末尾を「？」で閉じる
  const isConsult = /どうすれば|困って|不安|迷|疲れ|多すぎ|整理|優先|判断/i.test(String(userMsg ?? ""));
  if (isConsult && !/[？?]\s*$/.test(out)) out += "？";

  // 行数を抑える
  const lines = out.split("\n").filter((x) => x.trim().length > 0);
  if (lines.length > 6) out = lines.slice(0, 6).join("\n");

  return out;
}
