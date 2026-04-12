/**
 * TENMON_PHASE6_5_EMPTY_CATCH_RECOVERY_V1
 *
 * chat.ts 内の空 catch {} を全件列挙した inventory。
 * このファイルは挙動を変えない。観測と棚卸しのみを目的とする。
 *
 * 分類:
 *   harmless              - 失敗しても影響が極小
 *   observability_loss    - 観測データが消失する
 *   route_corruption_risk - 応答品質やルーティングに影響する
 *   fatal_masking         - res.json や LLM 呼び出しを握りつぶす
 */

export interface EmptyCatchRecord {
  lineApprox: number;
  category: "harmless" | "observability_loss" | "route_corruption_risk" | "fatal_masking";
  context: string;
  note: string;
}

export const EMPTY_CATCH_INVENTORY: EmptyCatchRecord[] = [
  // ─── harmless (18) ───
  { lineApprox: 394, category: "harmless", context: "memoryPersistMessage(assistant)", note: "assistant側の永続化失敗。user側(388)はroute_corruption_risk" },
  { lineApprox: 697, category: "harmless", context: "db.close?.()", note: "SQLite close。失敗しても読み取り済み" },
  { lineApprox: 699, category: "harmless", context: "kokuzo_glossary SELECT全体", note: "用語検索失敗→null返却。呼び出し元で処理される" },
  { lineApprox: 1418, category: "harmless", context: "プロパティコピー", note: "decisionFrame補助フィールド" },
  { lineApprox: 1519, category: "harmless", context: "プロパティコピー", note: "decisionFrame補助フィールド" },
  { lineApprox: 1586, category: "harmless", context: "snippet取得", note: "snippet文字列化" },
  { lineApprox: 1765, category: "harmless", context: "プロパティコピー", note: "decisionFrame補助フィールド" },
  { lineApprox: 1802, category: "harmless", context: "プロパティコピー", note: "decisionFrame補助フィールド" },
  { lineApprox: 1805, category: "harmless", context: "プロパティコピー", note: "decisionFrame補助フィールド" },
  { lineApprox: 1821, category: "harmless", context: "プロパティコピー", note: "decisionFrame補助フィールド" },
  { lineApprox: 1838, category: "harmless", context: "プロパティコピー", note: "decisionFrame補助フィールド" },
  { lineApprox: 1885, category: "harmless", context: "プロパティコピー", note: "decisionFrame補助フィールド" },
  { lineApprox: 1988, category: "harmless", context: "プロパティコピー", note: "decisionFrame補助フィールド" },
  { lineApprox: 2107, category: "harmless", context: "v3 out assignment(disabled)", note: "無効化済みコード" },
  { lineApprox: 2436, category: "harmless", context: "プロパティコピー", note: "decisionFrame補助フィールド" },
  { lineApprox: 2685, category: "harmless", context: "memory count", note: "メモリカウント失敗→0扱い" },
  { lineApprox: 3604, category: "harmless", context: "snippet取得", note: "snippet文字列化" },
  { lineApprox: 3779, category: "harmless", context: "heart stateコピー", note: "感情状態の補助データ" },

  // ─── observability_loss (35) ───
  { lineApprox: 334, category: "observability_loss", context: "decisionFrame ku注入", note: "rewriteDelta等の観測データ消失" },
  { lineApprox: 338, category: "observability_loss", context: "origJsonラップ全体", note: "JSON応答の観測ラッパーが無効化" },
  { lineApprox: 984, category: "observability_loss", context: "route判定結果構築", note: "ルート判定の観測データ消失" },
  { lineApprox: 1039, category: "observability_loss", context: "route判定結果構築", note: "ルート判定の観測データ消失" },
  { lineApprox: 1142, category: "observability_loss", context: "rewriteUsed/rewriteDelta注入", note: "書き換え検知データ消失" },
  { lineApprox: 1154, category: "observability_loss", context: "routeReason mirror", note: "routeReasonの観測データ消失" },
  { lineApprox: 1301, category: "observability_loss", context: "rewriteDelta注入", note: "書き換え検知データ消失" },
  { lineApprox: 1368, category: "observability_loss", context: "lengthIntentRaw注入", note: "長さ意図の観測データ消失" },
  { lineApprox: 1372, category: "observability_loss", context: "lengthIntent注入", note: "長さ意図の観測データ消失" },
  { lineApprox: 1508, category: "observability_loss", context: "detailPlan構築", note: "詳細計画の観測データ消失" },
  { lineApprox: 1514, category: "observability_loss", context: "detailPlan構築", note: "詳細計画の観測データ消失" },
  { lineApprox: 1556, category: "observability_loss", context: "detailPlan構築", note: "詳細計画の観測データ消失" },
  { lineApprox: 1559, category: "observability_loss", context: "detailPlan構築", note: "詳細計画の観測データ消失" },
  { lineApprox: 1670, category: "observability_loss", context: "voiceGuard判定", note: "音声ガード判定の観測データ消失" },
  { lineApprox: 1730, category: "observability_loss", context: "voiceGuard判定", note: "音声ガード判定の観測データ消失" },
  { lineApprox: 1799, category: "observability_loss", context: "rewriteDelta注入", note: "書き換え検知データ消失" },
  { lineApprox: 1915, category: "observability_loss", context: "detailPlan構築", note: "詳細計画の観測データ消失" },
  { lineApprox: 2023, category: "observability_loss", context: "voiceGuard判定", note: "音声ガード判定の観測データ消失" },
  { lineApprox: 2025, category: "observability_loss", context: "voiceGuard判定", note: "音声ガード判定の観測データ消失" },
  { lineApprox: 2058, category: "observability_loss", context: "voiceGuard判定", note: "音声ガード判定の観測データ消失" },
  { lineApprox: 2128, category: "observability_loss", context: "voiceGuard判定", note: "音声ガード判定の観測データ消失" },
  { lineApprox: 2189, category: "observability_loss", context: "rewriteUsed/rewriteDelta注入", note: "書き換え検知データ消失" },
  { lineApprox: 2657, category: "observability_loss", context: "voiceGuard判定", note: "音声ガード判定の観測データ消失" },
  { lineApprox: 2717, category: "observability_loss", context: "kanagiPhase注入", note: "鑑定フェーズの観測データ消失" },
  { lineApprox: 2719, category: "observability_loss", context: "kanagiPhase注入(外側)", note: "鑑定フェーズの観測データ消失" },
  { lineApprox: 2783, category: "observability_loss", context: "kanagi処理全体", note: "鑑定処理全体の失敗が不可視" },
  { lineApprox: 2977, category: "observability_loss", context: "voiceGuard判定", note: "音声ガード判定の観測データ消失" },
  { lineApprox: 2989, category: "observability_loss", context: "rewriteUsed/rewriteDelta注入", note: "書き換え検知データ消失" },
  { lineApprox: 3117, category: "observability_loss", context: "debug情報構築", note: "デバッグ情報の観測データ消失" },
  { lineApprox: 3163, category: "observability_loss", context: "appliedRulesCount注入", note: "適用ルール数の観測データ消失" },
  { lineApprox: 3337, category: "observability_loss", context: "deterministic flags構築", note: "決定論的フラグの観測データ消失" },
  { lineApprox: 3424, category: "observability_loss", context: "evidence注入", note: "証拠データの観測データ消失" },
  { lineApprox: 3427, category: "observability_loss", context: "evidence構築全体", note: "証拠構築全体の失敗が不可視" },
  { lineApprox: 3471, category: "observability_loss", context: "不明(要確認)", note: "文脈の詳細確認が必要" },
  { lineApprox: 3475, category: "observability_loss", context: "不明(要確認)", note: "文脈の詳細確認が必要" },

  // ─── route_corruption_risk (22) ───
  { lineApprox: 388, category: "route_corruption_risk", context: "memoryPersistMessage(user)", note: "ユーザー発話の永続化失敗→会話履歴欠損" },
  { lineApprox: 470, category: "route_corruption_risk", context: "clearThreadState", note: "スレッド状態クリア失敗→古い状態が残る" },
  { lineApprox: 477, category: "route_corruption_risk", context: "persistTurn(合言葉応答)", note: "合言葉応答の永続化失敗" },
  { lineApprox: 491, category: "route_corruption_risk", context: "persistTurn(合言葉登録)", note: "合言葉登録の永続化失敗" },
  { lineApprox: 502, category: "route_corruption_risk", context: "合言葉ブロック全体", note: "合言葉処理全体の失敗が不可視" },
  { lineApprox: 1001, category: "route_corruption_risk", context: "FASTPATH_GREETING_TOP応答構築", note: "挨拶応答の構築失敗が不可視" },
  { lineApprox: 1178, category: "route_corruption_risk", context: "FASTPATH_GREETING_OVERRIDDEN判定", note: "挨拶上書き判定の失敗が不可視" },
  { lineApprox: 1211, category: "route_corruption_risk", context: "responseテキスト変更", note: "応答テキスト変更の失敗が不可視" },
  { lineApprox: 1261, category: "route_corruption_risk", context: "responseテキスト変更", note: "応答テキスト変更の失敗が不可視" },
  { lineApprox: 1296, category: "route_corruption_risk", context: "responseテキスト変更", note: "応答テキスト変更の失敗が不可視" },
  { lineApprox: 1616, category: "route_corruption_risk", context: "response構築", note: "応答構築の失敗が不可視" },
  { lineApprox: 1656, category: "route_corruption_risk", context: "response構築", note: "応答構築の失敗が不可視" },
  { lineApprox: 1693, category: "route_corruption_risk", context: "response構築", note: "応答構築の失敗が不可視" },
  { lineApprox: 1753, category: "route_corruption_risk", context: "response構築", note: "応答構築の失敗が不可視" },
  { lineApprox: 2095, category: "route_corruption_risk", context: "opinionFirst判定", note: "意見優先判定の失敗が不可視" },
  { lineApprox: 2169, category: "route_corruption_risk", context: "response追記", note: "「一点だけ。どこを確かめますか？」追記の失敗" },
  { lineApprox: 2175, category: "route_corruption_risk", context: "opinionFirst判定", note: "意見優先判定の失敗が不可視" },
  { lineApprox: 2180, category: "route_corruption_risk", context: "応答ブロック全体", note: "応答処理全体の失敗が不可視" },
  { lineApprox: 2668, category: "route_corruption_risk", context: "応答ブロック全体", note: "応答処理全体の失敗が不可視" },
  { lineApprox: 2993, category: "route_corruption_risk", context: "nat.responseText設定", note: "最終応答テキスト設定の失敗が不可視" },
  { lineApprox: 3626, category: "route_corruption_risk", context: "evidence構築", note: "証拠構築の失敗が不可視" },
  { lineApprox: 3772, category: "route_corruption_risk", context: "compassionWrap/supportSanitize", note: "応答の慈悲ラップ/サポート浄化の失敗が不可視" },
];

// ─── 集計ヘルパー ───
export function summarizeInventory() {
  const counts = { harmless: 0, observability_loss: 0, route_corruption_risk: 0, fatal_masking: 0 };
  for (const r of EMPTY_CATCH_INVENTORY) {
    counts[r.category]++;
  }
  return { total: EMPTY_CATCH_INVENTORY.length, ...counts };
}
