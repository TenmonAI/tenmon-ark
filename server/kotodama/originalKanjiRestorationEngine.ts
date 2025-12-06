/**
 * OKRE (Original Kanji Restoration Engine)
 * 旧字体復元エンジン
 * 
 * 機能:
 * - 戦後に失われた旧字体の自動復元
 * - 文脈に応じた旧字体変換
 * - 靈性漢字優先度システム
 * - 言灵秘書標準の漢字体系に統一
 */

import { OLD_KANJI_MAPPING, SPIRITUAL_KANJI_PRIORITY } from "./kotodamaJapaneseCorrectorEngine";

/**
 * 文脈タイプ
 */
export type ContextType =
  | "spiritual" // 靈性的文脈（最高優先度で旧字体化）
  | "academic" // 学術的文脈（学問関連の旧字体を優先）
  | "formal" // 公式文脈（格式を重視）
  | "casual" // カジュアル文脈（一部のみ旧字体化）
  | "modern"; // 現代文脈（旧字体化しない）

/**
 * 文脈別の優先度閾値
 */
export const CONTEXT_PRIORITY_THRESHOLDS: Record<ContextType, number> = {
  spiritual: 0, // すべての旧字体を使用
  academic: 70, // 学術的に重要な漢字のみ
  formal: 80, // 格式高い漢字のみ
  casual: 90, // 最も重要な漢字のみ
  modern: 1000, // 旧字体化しない
};

/**
 * 文脈別の変換設定
 */
export interface RestorationOptions {
  contextType?: ContextType; // 文脈タイプ（デフォルト: spiritual）
  preserveModern?: string[]; // 現代漢字のまま保持する文字リスト
  forceRestore?: string[]; // 強制的に旧字体化する文字リスト
  balanceFireWater?: boolean; // 火水バランスを考慮するか
}

/**
 * 旧字体復元結果
 */
export interface RestorationResult {
  original: string; // 元のテキスト
  restored: string; // 復元後のテキスト
  changes: Array<{
    from: string; // 変換前の文字
    to: string; // 変換後の文字
    position: number; // 位置
    priority: number; // 優先度
  }>;
  stats: {
    totalChars: number; // 総文字数
    restoredCount: number; // 復元された文字数
    restorationRate: number; // 復元率（0.0〜1.0）
    spiritualScore: number; // 靈性スコア
  };
}

/**
 * テキストを旧字体に復元
 * @param text 復元対象のテキスト
 * @param options 復元オプション
 * @returns 復元結果
 */
export function restoreOriginalKanji(
  text: string,
  options: RestorationOptions = {}
): RestorationResult {
  const {
    contextType = "spiritual",
    preserveModern = [],
    forceRestore = [],
    balanceFireWater = false,
  } = options;

  const threshold = CONTEXT_PRIORITY_THRESHOLDS[contextType];
  const changes: RestorationResult["changes"] = [];
  let restored = text;
  let restoredCount = 0;
  let spiritualScore = 0;

  // 強制復元リストの処理
  for (const char of forceRestore) {
    const oldChar = OLD_KANJI_MAPPING[char];
    if (oldChar) {
      const regex = new RegExp(char, "g");
      let match;
      while ((match = regex.exec(text)) !== null) {
        changes.push({
          from: char,
          to: oldChar,
          position: match.index,
          priority: SPIRITUAL_KANJI_PRIORITY[oldChar] || 0,
        });
        restoredCount++;
        spiritualScore += SPIRITUAL_KANJI_PRIORITY[oldChar] || 0;
      }
      restored = restored.replace(regex, oldChar);
    }
  }

  // 通常の復元処理
  for (const [modern, old] of Object.entries(OLD_KANJI_MAPPING)) {
    // 保持リストに含まれる場合はスキップ
    if (preserveModern.includes(modern)) {
      continue;
    }

    // 強制復元リストに含まれる場合は既に処理済み
    if (forceRestore.includes(modern)) {
      continue;
    }

    // 優先度チェック
    const priority = SPIRITUAL_KANJI_PRIORITY[old] || 0;
    if (priority < threshold) {
      continue;
    }

    // 文字の出現位置を記録
    const regex = new RegExp(modern, "g");
    let match;
    while ((match = regex.exec(text)) !== null) {
      changes.push({
        from: modern,
        to: old,
        position: match.index,
        priority,
      });
      restoredCount++;
      spiritualScore += priority;
    }

    // 変換実行
    restored = restored.replace(regex, old);
  }

  // 統計情報の計算
  const totalChars = text.length;
  const restorationRate = totalChars > 0 ? restoredCount / totalChars : 0;

  return {
    original: text,
    restored,
    changes: changes.sort((a, b) => a.position - b.position),
    stats: {
      totalChars,
      restoredCount,
      restorationRate,
      spiritualScore,
    },
  };
}

/**
 * 文脈を自動判定
 * @param text 判定対象のテキスト
 * @returns 判定された文脈タイプ
 */
export function detectContextType(text: string): ContextType {
  // 靈性キーワード（より具体的なキーワードのみ）
  const spiritualKeywords = [
    "靈", "魂", "神道", "宇宙", "氣", "靈",
    "言灵", "言灵", "宿曜", "天津金木", "五十音",
    "火水", "陰陽", "禅", "仏教", "悟り", "瞑想",
    "靈性", "靈的", "魂の", "神聖", "天啓",
  ];

  // 学術キーワード
  const academicKeywords = [
    "研究", "論文", "学説", "理論", "分析", "考察",
    "実験", "観察", "仮説", "検証", "学会", "博士",
  ];

  // 公式キーワード
  const formalKeywords = [
    "拝啓", "謹啓", "敬具", "謹白", "御中", "様",
    "貴社", "弊社", "致します", "申し上げます",
  ];

  // キーワードのカウント
  let spiritualCount = 0;
  let academicCount = 0;
  let formalCount = 0;

  for (const keyword of spiritualKeywords) {
    if (text.includes(keyword)) {
      spiritualCount++;
    }
  }

  for (const keyword of academicKeywords) {
    if (text.includes(keyword)) {
      academicCount++;
    }
  }

  for (const keyword of formalKeywords) {
    if (text.includes(keyword)) {
      formalCount++;
    }
  }

  // 最も多いキーワードタイプを返す
  if (spiritualCount > 0 && spiritualCount >= academicCount && spiritualCount >= formalCount) {
    return "spiritual";
  } else if (academicCount > 0 && academicCount >= formalCount) {
    return "academic";
  } else if (formalCount > 0) {
    return "formal";
  } else {
    return "casual";
  }
}

/**
 * 自動文脈判定による旧字体復元
 * @param text 復元対象のテキスト
 * @param options 復元オプション（contextTypeは自動判定）
 * @returns 復元結果
 */
export function autoRestoreOriginalKanji(
  text: string,
  options: Omit<RestorationOptions, "contextType"> = {}
): RestorationResult {
  const contextType = detectContextType(text);
  return restoreOriginalKanji(text, { ...options, contextType });
}

/**
 * 復元結果の差分を表示用に整形
 * @param result 復元結果
 * @returns 整形された差分文字列
 */
export function formatRestorationDiff(result: RestorationResult): string {
  if (result.changes.length === 0) {
    return "変更なし";
  }

  const lines: string[] = [];
  lines.push(`復元数: ${result.stats.restoredCount}`);
  lines.push(`復元率: ${(result.stats.restorationRate * 100).toFixed(2)}%`);
  lines.push(`靈性スコア: ${result.stats.spiritualScore}`);
  lines.push("");
  lines.push("変更内容:");

  for (const change of result.changes) {
    lines.push(`  位置 ${change.position}: ${change.from} → ${change.to} (優先度: ${change.priority})`);
  }

  return lines.join("\n");
}

/**
 * 復元可能な漢字のリストを取得
 * @param text 対象テキスト
 * @param contextType 文脈タイプ
 * @returns 復元可能な漢字のリスト
 */
export function getRestorableKanji(text: string, contextType: ContextType = "spiritual"): Array<{
  modern: string;
  old: string;
  priority: number;
  count: number;
}> {
  const threshold = CONTEXT_PRIORITY_THRESHOLDS[contextType];
  const result: Array<{
    modern: string;
    old: string;
    priority: number;
    count: number;
  }> = [];

  for (const [modern, old] of Object.entries(OLD_KANJI_MAPPING)) {
    const priority = SPIRITUAL_KANJI_PRIORITY[old] || 0;
    if (priority < threshold) {
      continue;
    }

    const count = (text.match(new RegExp(modern, "g")) || []).length;
    if (count > 0) {
      result.push({ modern, old, priority, count });
    }
  }

  return result.sort((a, b) => b.priority - a.priority);
}
