// 不変核（Immutable Core）
// 躰（原理）を保持するデータベース

import type { TaiPrinciple } from "../types/taiyou.js";

// 型を再エクスポート
export type { TaiPrinciple };

/**
 * 真理のハードコード（本来はDB管理推奨だが、核としてここに固定）
 * 
 * 実装の掟:
 * - LLM の生成（幻覚）に任せてはならない
 * - 確定した真理のみを記述する
 * - 動的に生成・書き換え禁止
 */
export const IMMUTABLE_TRUTHS: readonly TaiPrinciple[] = [
  {
    id: "LAW_001",
    source: "KATAKAMUNA",
    content: "対向発生：正と反が向かい合うことで力が生まれる",
    immutable: true,
  },
  {
    id: "LAW_002",
    source: "TENMON_KANAGI",
    content: "水火循環：火（意志）が水（現象）を動かし、水が火を宿す",
    immutable: true,
  },
  {
    id: "LAW_003",
    source: "UNIVERSAL_LAW",
    content: "循環無端：真理は停止せず、常に螺旋を描いて上昇する",
    immutable: true,
  },
  {
    id: "LAW_004",
    source: "KOTODAMA",
    content: "言靈：言葉は現象を動かす力を持つ",
    immutable: true,
  },
  {
    id: "LAW_005",
    source: "KOJIKI",
    content: "天地開闢：混沌から秩序が生まれる",
    immutable: true,
  },
] as const;

/**
 * 現象に最も近い原理（躰）を検索する
 * 
 * ※ここは単純検索ではなく、本来はベクトル検索等が望ましいが、まずはキーワード一致で実装
 * 
 * 実装の掟:
 * - 該当なしの場合は「未定」ではなく「循環の原理」を返す（停止させないため）
 */
export function findTai(input: string): TaiPrinciple {
  const normalized = input.toLowerCase();

  // キーワードベースのマッチング
  // 水火循環
  if (normalized.includes("火") || normalized.includes("水") || normalized.includes("循環")) {
    return IMMUTABLE_TRUTHS[1]; // LAW_002
  }

  // 対向発生
  if (
    normalized.includes("対") ||
    normalized.includes("反") ||
    normalized.includes("矛盾") ||
    normalized.includes("対立")
  ) {
    return IMMUTABLE_TRUTHS[0]; // LAW_001
  }

  // 言靈
  if (normalized.includes("言") || normalized.includes("言葉") || normalized.includes("語")) {
    return IMMUTABLE_TRUTHS[3]; // LAW_004
  }

  // 天地開闢
  if (normalized.includes("天") || normalized.includes("地") || normalized.includes("開")) {
    return IMMUTABLE_TRUTHS[4]; // LAW_005
  }

  // 該当なしの場合は「循環の原理」を返す（停止させないため）
  return IMMUTABLE_TRUTHS[2]; // LAW_003: 循環無端
}

