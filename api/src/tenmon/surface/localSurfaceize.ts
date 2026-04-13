/**
 * localSurfaceize V2: ユーザーに返す response を整える最終安全弁（LLM不要）
 * 
 * OLD_PIPELINE_RETIREMENT_V1:
 * 以下の劣化源を除去:
 *   - 天津金木用語の一般語置換（正中→要点、内集→整理、外発→行動）→ 除去
 *   - 相談系キーワードでの？強制 → 除去
 *   - 6行制限 → 除去（Direct Lane / 御神託レポートの品質を殺していた）
 * 
 * 維持する安全機能:
 *   - [NON_TEXT_PAGE_OR_OCR_FAILED] の露出防止
 *   - 内部ログ語彙の自然化（観測中、未解決、矛盾（保持中）、発酵中のみ）
 *   - 連続改行の整理
 */
export function localSurfaceize(text: string, userMsg: string): string {
  let out = String(text ?? "");

  // 0) NON_TEXT は絶対に露出させない（最優先）
  if (out.includes("[NON_TEXT_PAGE_OR_OCR_FAILED]")) {
    return (
      "いま参照しようとした資料が、文字として取り出せない状態でした。\n" +
      "別の角度から整理してみましょう。いま一番気になっていることを一言で教えてください。"
    );
  }

  // 1) 内部ログ語彙のみ自然化（天津金木用語は維持）
  // OLD_PIPELINE_RETIREMENT_V1: 「正中」「内集」「外発」「凝縮」「圧縮」の置換を除去
  // これらは天津金木思考回路の核心用語であり、置換は品質劣化の原因だった
  const pairs: Array<[RegExp, string]> = [
    [/観測中/g, "いま状況を整理しています"],
    [/未解決：/g, "まだ決めきれていない点："],
    [/矛盾（保持中）：/g, "見方が割れている点："],
    [/発酵中/g, "整理が進行中です"],
  ];
  for (const [r, v] of pairs) out = out.replace(r, v);

  // 2) 連続改行の整理（3行以上の空行を2行に）
  out = out.replace(/\n{3,}/g, "\n\n").trim();

  // OLD_PIPELINE_RETIREMENT_V1: 以下を除去
  // - 相談系キーワードでの？強制（isConsult → 除去）
  //   理由: 「疲れ」「不安」等の軽い感情に？が付くと不自然
  // - 6行制限（lines.length > 6 → 除去）
  //   理由: Direct Lane / 御神託レポート / ドメイン解析の品質を殺していた

  return out;
}
