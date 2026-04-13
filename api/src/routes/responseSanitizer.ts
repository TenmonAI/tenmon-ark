/**
 * responseSanitizer.ts — 応答サニタイズモジュール
 * 
 * chat.tsのres.jsonラッパーから抽出した安全な後処理のみを含む。
 * 旧パイプラインの有害な書き換え（smalltalk template差替、
 * lengthIntent差替、opinion-first差替、質問強制）は除去済み。
 * 
 * OLD_PIPELINE_RETIREMENT_V2: 責務分離
 */

/**
 * 内部マーカー・プレースホルダの除去（安全弁）
 * res.jsonラッパーの__sanitizeOutから抽出。
 * ただし、LLM応答をハードコードテンプレに差し替える処理は除去。
 */
export function sanitizeResponse(userMsg: string, response: string): string {
  let t = String(response ?? "");
  const mstr = String(userMsg ?? "");
  const wantsDetail = /#詳細/.test(mstr);

  // SYNTH_USED / TODO / プレースホルダの除去（安全弁として維持）
  const hasTodo = /SYNTH_USED|TODO:|プレースホルダ|PLACEHOLDER/i.test(t);
  if (hasTodo && !wantsDetail) {
    // OLD_PIPELINE_RETIREMENT_V2: ハードコードフォールバックではなく、
    // マーカー行のみを除去して残りのコンテンツを保持する
    t = t.replace(/^\[SYNTH_USED[^\n]*\n?/gm, "")
         .replace(/^TODO:[^\n]*\n?/gmi, "")
         .replace(/現在はプレースホルダ[^\n]*\n?/gmi, "")
         .trim();
  }

  // メニュー/TODO検出時のフォールバック（応答が完全に空になった場合のみ）
  if (!t.trim()) {
    t = "【天聞の所見】いま少し整理が必要です。もう一度、一番気になっていることを教えてください。";
  }

  return t;
}

/**
 * 濁りフレーズの検出と除去（TENMON_GENERAL_GATE_SOFT由来）
 * 「人それぞれ」「一般的には」等の汎用AI臭フレーズを除去する。
 * ただし、文字数clampと質問強制は除去。
 */
export function removeTurbidity(response: string): string {
  let t = String(response || "").replace(/\r/g, "").trim();
  
  // 【天聞の所見】の正規化
  t = t.replace(/^【天聞の所見】\s+/, "【天聞の所見】");

  // 濁りフレーズ検出
  const badPhrases = [
    "鍵です", "サインです", "機会として", "捕らえましょう",
    "人それぞれ", "状況による", "一般的には", "諸説あります",
    "と言われています"
  ];
  const hasBad = badPhrases.some(w => t.includes(w));

  if (hasBad) {
    // 濁りフレーズを含む行を除去（ただしコンテンツは保持）
    for (const phrase of badPhrases) {
      // フレーズを含む文を丸ごと除去するのではなく、フレーズ自体を除去
      t = t.replace(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
    }
    // 番号付きリスト・箇条書きの除去
    t = t.replace(/^\s*\d+[.)].*$/gm, "").replace(/^\s*[-*•]\s+.*$/gm, "").trim();
  }

  // 連続改行の整理
  t = t.replace(/\n{3,}/g, "\n\n").trim();

  // 【天聞の所見】プレフィックスの確保
  if (t && !t.startsWith("【天聞の所見】") && !t.startsWith("【要点】")) {
    t = "【天聞の所見】" + t;
  }

  return t;
}

/**
 * N2サポート応答のサニタイズ
 * __tenmonSupportSanitizeV1から抽出。
 */
export function sanitizeSupport(response: string): string {
  let t = String(response || "").replace(/\r/g, "").trim();
  if (!t) return t;
  if (!t.startsWith("【天聞の所見】")) t = "【天聞の所見】" + t;

  // ヘッジの除去
  t = t.replace(/かもしれません/g, "")
       .replace(/おそらく/g, "")
       .replace(/多分/g, "")
       .trim();

  // 命令形の柔軟化（強制感の除去）
  t = t.replace(/してみませんか/g, "ですか")
       .replace(/しませんか/g, "ですか")
       .replace(/してみてください/g, "")
       .replace(/してください/g, "")
       .replace(/しましょう/g, "")
       .replace(/どうでしょう/g, "")
       .trim();

  // 文字数上限（質問強制なし、言い切り許容）
  if (t.length > 260) t = t.slice(0, 260).replace(/[。、\s　]+$/g, "").trim();

  return t;
}
