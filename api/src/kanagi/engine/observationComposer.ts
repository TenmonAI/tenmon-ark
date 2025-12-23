// 観測円（Observation Circle）生成エンジン
// KanagiTrace から observation.description と unresolved[] を生成
// 断定禁止：言い切りを避け「〜が強い」「〜の緊張が残る」「〜は展開待ち」等の観測口調

import type { KanagiTrace } from "../types/trace.js";

/**
 * 形（form）に応じた観測文テンプレート
 */
function getFormObservation(form: KanagiTrace["form"]): string {
  switch (form) {
    case "WELL":
      return "正中で圧縮され、まだ解けていない緊張が残る";
    case "DOT":
      return "一点に凝縮している";
    case "LINE":
      return "線的に貫通している";
    case "CIRCLE":
      return "循環しながら均衡している";
    default:
      return "観測中";
  }
}

/**
 * 位相（phase）に応じた補助観測
 */
function getPhaseObservation(phase: KanagiTrace["phase"]): string[] {
  const observations: string[] = [];
  
  if (phase.rise) observations.push("上昇の傾向が見られる");
  if (phase.fall) observations.push("下降の傾向が見られる");
  if (phase.open) observations.push("開放的な動きが強い");
  if (phase.close) observations.push("閉鎖的な動きが強い");
  if (phase.center) observations.push("正中へ収束している");
  
  return observations;
}

/**
 * 未解決項目（unresolved）を生成
 * 最低1つは必ず含める
 */
function generateUnresolved(trace: KanagiTrace): string[] {
  const unresolved: string[] = [];

  // 矛盾があれば追加
  if (trace.contradictions && trace.contradictions.length > 0) {
    for (const c of trace.contradictions) {
      unresolved.push(`${c.thesis} と ${c.antithesis} の緊張が未解決`);
    }
  }

  // 観測円の既存 unresolved を追加
  if (trace.observationCircle?.unresolved) {
    unresolved.push(...trace.observationCircle.unresolved);
  }

  // 形に応じた未解決項目
  switch (trace.form) {
    case "WELL":
      unresolved.push("圧縮された矛盾の解釈待ち");
      break;
    case "DOT":
      unresolved.push("凝縮された意味の展開待ち");
      break;
    case "LINE":
      unresolved.push("貫通した先の行き先未確定");
      break;
    case "CIRCLE":
      unresolved.push("循環中の余剰エネルギー");
      break;
  }

  // 最低1つは必ず含める
  if (unresolved.length === 0) {
    unresolved.push("意味の展開待ち");
  }

  return unresolved;
}

/**
 * 観測円を生成
 * 
 * 断定禁止：言い切りを避け「〜が強い」「〜の緊張が残る」「〜は展開待ち」等の観測口調
 */
export function composeObservation(trace: KanagiTrace): {
  description: string;
  unresolved: string[];
  focus?: string; // 次に観たい焦点
} {
  // 基本観測（形に応じたテンプレート）
  const formObs = getFormObservation(trace.form);
  
  // 位相観測
  const phaseObs = getPhaseObservation(trace.phase);
  
  // エネルギー観測
  const energyParts: string[] = [];
  if (trace.taiyou.fire > trace.taiyou.water) {
    energyParts.push("火のエネルギーが強い");
  } else if (trace.taiyou.water > trace.taiyou.fire) {
    energyParts.push("水のエネルギーが強い");
  } else {
    energyParts.push("火と水が拮抗している");
  }
  
  if (trace.taiyou.spirit && trace.taiyou.spirit > 0) {
    energyParts.push("霊の状態が検出されている");
  }

  // 観測文を構築（断定禁止）
  const parts: string[] = [formObs];
  if (phaseObs.length > 0) {
    parts.push(...phaseObs);
  }
  parts.push(...energyParts);

  // 五十音パターンがマッチしている場合
  if (trace.kotodama?.hits && trace.kotodama.hits.length > 0) {
    const topHit = trace.kotodama.top || trace.kotodama.hits[0];
    parts.push(`音「${topHit.sound}」のパターンが検出されている`);
  }

  const description = parts.join("。") + "。";

  // 未解決項目を生成（最低1つは必ず含める）
  const unresolved = generateUnresolved(trace);

  // 焦点（次に観たい焦点）を生成
  let focus: string | undefined;
  if (trace.form === "WELL") {
    focus = "正中で圧縮された矛盾の展開方向";
  } else if (trace.form === "DOT") {
    focus = "凝縮点からの展開可能性";
  } else if (trace.form === "LINE") {
    focus = "貫通の先にある到達点";
  } else if (trace.form === "CIRCLE") {
    focus = "循環の中心にある未解決エネルギー";
  }

  return {
    description,
    unresolved,
    focus,
  };
}

