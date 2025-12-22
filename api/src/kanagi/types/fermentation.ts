/**
 * CENTER 発酵ログ
 * 未決の矛盾を「時間」として保持する構造
 */
export interface KanagiFermentationLog {
  sessionId: string;

  // CENTER に入った時点の矛盾群（未解決）
  contradictions: {
    thesis: string;
    antithesis: string;
    tension: number;
  }[];

  // Token 単位の役割割当（躰/用/反転）
  assignments: {
    token: string;
    role:
      | "TAI_FIRE"
      | "YOU_WATER"
      | "SWAPPED_FIRE"
      | "SWAPPED_WATER"
      | "UNKNOWN";
  }[];

  // 発酵の開始時刻
  enteredAt: number;

  // 発酵経過時間（ms）
  elapsed: number;

  // CENTER 滞在回数
  centerDepth: number;

  // まだ解けていないエネルギー量（抽象値）
  unresolvedEnergy: number;

  // 現在の状態
  state: "FERMENTING" | "RELEASED";
}

