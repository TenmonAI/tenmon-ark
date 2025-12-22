// 天津金木 形マッパー（初期マッピング案）
// ○＝水火拮抗の循環、ゝ＝内集（凝り）優勢、井＝正中圧縮（CENTER）

export type KanagiForm = "CIRCLE" | "DOT" | "WELL" | "LINE";

export type Phase = {
  center: boolean;     // 正中（凝・井）
  rise: boolean;       // 昇
  fall: boolean;       // 降
  open: boolean;       // 開
  close: boolean;      // 閉
};

export type TaiYouEnergy = {
  fire: number;  // 動かす側（火）
  water: number; // 動く側（水）
};

/**
 * 水火エネルギーと位相から形を決定
 * 
 * 井：正中＝圧縮・保留（停止ではない）
 * ゝ：内集優勢（凝り）＝一点へ収斂
 * ｜：外発優勢（貫通）＝線的
 * ○：拮抗＝循環
 */
export function mapForm(e: TaiYouEnergy, p: Phase): KanagiForm {
  // 井：正中＝圧縮・保留（停止ではない）
  if (p.center) return "WELL";

  // ゝ：内集優勢（凝り）＝一点へ収斂
  if (e.water > e.fire && (p.close || p.fall)) return "DOT";

  // ｜：外発優勢（貫通）＝線的
  if (e.fire > e.water && (p.open || p.rise)) return "LINE";

  // ○：拮抗＝循環
  return "CIRCLE";
}

