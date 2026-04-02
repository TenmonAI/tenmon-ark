/**
 * TENMON_SURFACE_LEAK_CLEANUP_CURSOR_AUTO_V5
 * user-facing 表層から内部裁定断片を除去（ku / routeReason / binder は不変）。
 */

/** finalize / projector で共有（同一ソース） */
export const TENMON_SURFACE_LEAK_PATTERNS_V2: RegExp[] = [
  // V5: 同一行連結（root_reasoning→truth_structure→verdict→center）と句点直後メタ
  /root_reasoning\s*[:：]\s*truth_structure\s*[:：][^\n]+/giu,
  /[。．]\s*verdict\s*=\s*[^。\n]+/gu,
  /[。．]\s*truth_structure\s*[:：]\s*[^。\n]+/giu,
  /[。．]\s*center\s*[:：]\s*いまの中心一句を固定[。]?/giu,
  /[。．]\s*verdict\s*[:：]\s*[^。\n]+/giu,
  /\s*root_reasoning\s*[:：]\s*[^\n]+/giu,
  /\s*truth_structure\s*[:：]\s*[^\n]+/giu,
  /\s*verdict\s*=\s*[^\n]+/giu,
  /\s*verdict\s*[:：]\s*[^\n]+/giu,
  /center\s*[:：]\s*いまの中心一句を固定。?/giu,
  /\s*立脚の中心は「[^」\n]+」です。\s*/giu,
  /\s*中心命題\s*[:：]\s*[^\n]+/giu,
  /\s*次軸\s*[:：]\s*[^\n]+/gu,
  /\s*次観測\s*[:：]\s*[^\n]+/gu,
  /\s*次の軸\s*[:：]\s*[^\n]+/gu,
  /(?:^|\n)\s*root_reasoning\s*[:：]\s*[^\n]+/gimu,
  /(?:^|\n)\s*truth_structure\s*[:：]\s*[^\n]+/gimu,
  /(?:^|\n)\s*verdict\s*=\s*[^\n]+/gimu,
  /(?:^|\n)\s*verdict\s*[:：]\s*[^\n]+/gimu,
  /(?:^|\n)\s*center\s*[:：]\s*いまの中心一句を固定。?\s*/gimu,
  /(?:^|\n)\s*中心命題\s*[:：]\s*[^\n]+/gimu,
  /(?:^|\n)\s*次軸\s*[:：]\s*[^\n]+/gimu,
  /(?:^|\n)\s*次観測\s*[:：]\s*[^\n]+/gimu,
  /(?:^|\n)\s*次の軸\s*[:：]\s*[^\n]+/gimu,
  /(?<=[。．])root_reasoning\s*[:：]\s*[^\n]+/giu,
  /(?<=[。．])truth_structure\s*[:：]\s*[^\n]+/giu,
  /(?<=[。．])verdict\s*=\s*[^\n]+/giu,
  /(?<=[。．])verdict\s*[:：]\s*[^\n]+/giu,
  /(?<=[。．])center\s*[:：]\s*いまの中心一句を固定。?/giu,
  /(?<=[。．])中心命題\s*[:：]\s*[^\n]+/giu,
  /(?<=[。．])次軸\s*[:：]\s*[^\n]+/gu,
  /(?<=[。．])次観測\s*[:：]\s*[^\n]+/gu,
  /(?<=[。．])次の軸\s*[:：]\s*[^\n]+/gu,
  // TENMON_SURFACE_LEAK_CLEANUP_CURSOR_AUTO_V2: 行頭アンカー（ASCII コロン／内部接続句）
  /^root_reasoning:[^\n]*\n?/gm,
  /^truth_structure:[^\n]*\n?/gm,
  /^verdict=[^\n]*\n?/gm,
  /^center:\s*いまの中心一句を固定[。]?\n?/gm,
  /^立脚の中心は「[^」]+」です。[^\n]*\n?/gm,
  /^中心命題:\s*\(pri:[^\)]+\)\n?/gm,
  /^次軸:\s*.*\n?/gm,
  /^次観測:\s*.*\n?/gm,
  /^次軸：\s*.*\n?/gm,
  /^次観測：\s*.*\n?/gm,
  /^次の軸[:：]\s*.*\n?/gm,
  /^この点では、/gm,
  // TENMON_SURFACE_LEAK_CLEANUP_CURSOR_AUTO_V3: 行頭空白（NBSP/全角含む）・読点直後のインライン接続
  /^[\s\u00A0\u3000\uFEFF]*root_reasoning\s*[:：][^\n]*\n?/gmu,
  /^[\s\u00A0\u3000\uFEFF]*truth_structure\s*[:：][^\n]*\n?/gmu,
  /^[\s\u00A0\u3000\uFEFF]*verdict\s*=\s*[^\n]*\n?/gmu,
  /^[\s\u00A0\u3000\uFEFF]*center\s*[:：]\s*いまの中心一句を固定[。]?\n?/gmu,
  /^[\s\u00A0\u3000\uFEFF]*立脚の中心は「[^」]+」です。[^\n]*\n?/gmu,
  /^[\s\u00A0\u3000\uFEFF]*中心命題\s*[:：]\s*\(pri:[^\)]+\)\n?/gmu,
  /^[\s\u00A0\u3000\uFEFF]*次軸\s*[:：]\s*.*\n?/gmu,
  /^[\s\u00A0\u3000\uFEFF]*次観測\s*[:：]\s*.*\n?/gmu,
  /^[\s\u00A0\u3000\uFEFF]*次の軸\s*[:：]\s*.*\n?/gmu,
  /^[\s\u00A0\u3000\uFEFF]*この点では、/gmu,
  /(?<=[、，,])root_reasoning\s*[:：]\s*[^\n]+/giu,
  /(?<=[、，,])truth_structure\s*[:：]\s*[^\n]+/giu,
  /(?<=[、，,])\s*verdict\s*=\s*[^\n]+/giu,
  // TENMON_SURFACE_LEAK_CLEANUP_CURSOR_AUTO_V4: 次軸+次観測の同一行連結（行頭／空白行頭／本文中）
  /^次軸:\s*次観測:[^\n]*\n?/gm,
  /^[\s\u00A0\u3000\uFEFF]*次軸:\s*次観測:[^\n]*\n?/gmu,
  /\s*次軸\s*:\s*次観測\s*:[^\n]+/gu,
  /\s*次軸\s*：\s*次観測\s*：[^\n]+/gu,
  // TENMON_UNCERTAINTY_CONFIDENCE_SURFACE_MASTER_CURSOR_AUTO_V6: 文中連結メタ（projector と同型）
  /[。．、，]\s*root_reasoning\s*[:：][^\n]+/giu,
  /[。．、，]\s*truth_structure\s*[:：][^\n]+/giu,
  /[。．、，]\s*verdict\s*=\s*[^\n]+/giu,
  /[。．、，]\s*次軸\s*[:：][^\n]+/gu,
  /[。．、，]\s*次観測\s*[:：][^\n]+/gu,
  /[。．、，]\s*次の軸\s*[:：][^\n]+/gu,
  /\s+root_reasoning\s*[:：][^\n]+/giu,
  /\s+次軸\s*[:：][^\n]+/gu,
  /\s+次観測\s*[:：][^\n]+/gu,
  /\s+次の軸\s*[:：][^\n]+/gu,
  /^次に深めたいのは[^\n]*\n?/gmu,
  /^次の一歩として[^\n]*\n?/gmu,
  /^generic preamble[^\n]*\n?/gmu,
];

/** finalize 従来の定型テンプレ（表層のみ） */
export const TENMON_SURFACE_LEAK_LEGACY_TEMPLATE_PATTERNS_V1: RegExp[] = [
  /いまの読み方は正典と会話の往還[^\n]*/gu,
  /いまの答えは、意味の芯は[^\n]*/gu,
  /さっき見ていた中心（[^）\n]{0,120}）を土台に、いまの話を見ていきましょう。\s*/gu,
  /さっき見ていた中心[^\n]*/gu,
  /^（[^）\n]{0,120}）を土台に、いまの話を見ていきましょう。\s*\n?/gmu,
  /（[^）\n]{0,120}）を土台に、いまの話を見ていきましょう。\s*/gu,
  /【天聞の所見】いまは中心を保持したまま考えられています。[^\n]*\n?/gu,
  /語義・作用・読解の軸を分けて読むと、要点が崩れにくいです。\s*/gu,
  /語義・作用・読解の軸を分けると、主張の射程が崩れにくくなります。\s*/gu,
  /語義・作用・読解[^\n]{0,240}/gu,
  /現代では、概念を押さえたうえで判断や実装に一段だけ落とすと使えます。\s*/gu,
  /現代では、概念を押さえたうえで[^\n]{0,240}/gu,
  /について、今回は[^。\n]{0,40}の立場で答えます。?\n?/gu,
  /判断軸（内部参照は要約表示）について[^。\n]{0,50}。?\n?/gu,
];

/**
 * メタ連鎖・行頭断片を反復除去。除去後が空なら空のまま返す（snapshot 復帰で漏れを戻さない）。
 */
export function stripSurfaceLeakMetaChainsV2(text: string): string {
  const snapshot = String(text ?? "").trim();
  if (!snapshot) return "";
  let t = snapshot;
  const all = [...TENMON_SURFACE_LEAK_PATTERNS_V2, ...TENMON_SURFACE_LEAK_LEGACY_TEMPLATE_PATTERNS_V1];
  let prev = "";
  while (prev !== t) {
    prev = t;
    for (const re of all) {
      t = t.replace(re, "");
    }
    t = t
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/[ 　]{2,}/gu, " ")
      .trim();
  }
  if (!t) return "";
  return t;
}

/**
 * finalize surface contract 後など、返却直前の V2+legacy メタ連鎖の再掃除。
 * TENMON_SURFACE_EXIT_CLEANUP_MASTER_CURSOR_AUTO_V6（routeReason / 裁定は変更しない）
 */
export function applyTenmonSurfaceLeakStripV2(text: string): string {
  return stripSurfaceLeakMetaChainsV2(String(text ?? ""));
}
