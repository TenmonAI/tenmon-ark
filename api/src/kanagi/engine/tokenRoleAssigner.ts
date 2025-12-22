import { TokenRole } from "../types/trace.js";
import { analyzeDependency, type DependencyToken } from "./dependencyAnalyzer.js";
import { RX } from "../extract/regex.js";

type Assignment = {
  token: string;
  role: TokenRole;
};

/**
 * 名称が水かどうかを判定（キーワードベース）
 */
function isWaterNamed(token: string): boolean {
  const WATER_NAMES = ["水", "動く", "動かされる", "受ける", "閉", "降", "内"];
  return WATER_NAMES.some(name => token.includes(name));
}

/**
 * 名称が火かどうかを判定（キーワードベース）
 */
function isFireNamed(token: string): boolean {
  const FIRE_NAMES = ["火", "動かす", "促す", "開く", "発", "昇", "外"];
  return FIRE_NAMES.some(name => token.includes(name));
}

/**
 * 躰用反転（swap）の検出
 * 言霊秘書の明記に対応する検出
 */
function detectSwapPattern(text: string): boolean {
  for (const r of RX.TAIYOU_CORE) {
    if (r.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Token 単位で「動かす / 動く」役割を判定する（依存解析ベース）
 * 
 * 天津金木原理：
 * - 動かす側＝火（躰）
 * - 動かされる側＝水（用）
 * - 名称ではなく運動関係で決定
 * - 文脈（TPO）で役割が入れ替わる
 */
export async function assignTokenRoles(text: string): Promise<Assignment[]> {
  // 依存解析で「誰が」「何を」「どうするか」を抽出
  const deps = await analyzeDependency(text);

  // 依存関係から TokenRole を決定
  const assignments: Assignment[] = deps.map((d: DependencyToken) => {
    let role: TokenRole = "UNKNOWN";

    if (d.role === "ACTOR") {
      role = "TAI_FIRE";        // 動かす側＝火＝躰
    } else if (d.role === "RECEIVER") {
      role = "YOU_WATER";       // 動かされる側＝水＝用
    } else if (d.role === "ACTION") {
      role = "UNKNOWN";         // 動作自体は中立
    }

    return {
      token: d.surface,
      role,
    };
  });

  // 躰用反転（swap）の適用
  // 名称が水だが ACTOR → 火に反転
  // 名称が火だが RECEIVER → 水に反転
  const swapped = assignments.map(a => {
    // 言霊秘書の明記パターンを検出
    const hasSwapPattern = detectSwapPattern(text);

    if (a.role === "TAI_FIRE" && isWaterNamed(a.token) && hasSwapPattern) {
      return { ...a, role: "SWAPPED_FIRE" as TokenRole };
    }
    if (a.role === "YOU_WATER" && isFireNamed(a.token) && hasSwapPattern) {
      return { ...a, role: "SWAPPED_WATER" as TokenRole };
    }
    return a;
  });

  return swapped;
}

