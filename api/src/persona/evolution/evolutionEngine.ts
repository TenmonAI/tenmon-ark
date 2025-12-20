import type { MemoryMessage } from "../../memory/memoryTypes.js";
import type { KokuzoCoreRow } from "../../memory/memoryTypes.js";
import { computeBoundaryDelta } from "./boundaryAdjuster.js";
import { computeStanceDelta } from "./stanceAdjuster.js";
import { computeToneDelta } from "./toneAdjuster.js";
import type { PersonaStateDelta, PersonaStateRow } from "../personaState.js";

export type EvolutionInput = {
  personaId: string;
  history: MemoryMessage[];
  kokuzo: KokuzoCoreRow | null;
  current: PersonaStateRow;
  // 会話件数（conversation_log row count）
  conversationCount: number;
};

export type EvolutionDecision = {
  triggered: boolean;
  delta: PersonaStateDelta;
  reason: string;
};

function clampDelta(x: number, maxAbs: number): number {
  return Math.max(-maxAbs, Math.min(maxAbs, x));
}

function hasRepeatingTheme(kokuzoSummary: string): boolean {
  // 超軽量な繰り返しテーマ検出（将来置換可能）
  const themes = ["設計", "構成", "エラー", "nginx", "systemd", "起動", "ビルド", "メモリ", "人格"];
  return themes.some((t) => kokuzoSummary.includes(t) && (kokuzoSummary.match(new RegExp(t, "g"))?.length ?? 0) >= 3);
}

function shouldEvolve(params: EvolutionInput): { ok: boolean; reason: string } {
  // 1) 一定会話数（例：20 turn=conversation_log rows の 20）
  if (params.conversationCount > 0 && params.conversationCount % 20 === 0) {
    return { ok: true, reason: "every-20-turns" };
  }

  // 2) Kokūzō Core に繰り返しテーマが検出された時
  if (params.kokuzo?.summary && hasRepeatingTheme(params.kokuzo.summary)) {
    // ただし頻繁に動かさない（lastUpdatedからの経過で抑制）
    const last = Date.parse(params.current.lastUpdated);
    const now = Date.now();
    if (Number.isFinite(last) && now - last < 5 * 60 * 1000) {
      return { ok: false, reason: "cooldown" };
    }
    return { ok: true, reason: "kokuzo-repeating-theme" };
  }

  // 3) 明示的フィードバック（将来用フック）
  const lastUser = [...params.history].reverse().find((m) => m.role === "user")?.content ?? "";
  if (lastUser.startsWith("feedback:") || lastUser.startsWith("フィードバック:")) {
    return { ok: true, reason: "explicit-feedback-hook" };
  }

  return { ok: false, reason: "no-trigger" };
}

// 必須: evaluate(history, kokuzo) の中枢（数値補正のみ）
export function evaluateEvolution(params: EvolutionInput): EvolutionDecision {
  const trig = shouldEvolve(params);
  if (!trig.ok) {
    return {
      triggered: false,
      delta: { toneDelta: 0, stanceDelta: 0, boundaryDelta: 0, reason: trig.reason },
      reason: trig.reason,
    };
  }

  const kokuzoSummary = params.kokuzo?.summary;
  const a = computeToneDelta({ history: params.history, kokuzoSummary });
  const b = computeStanceDelta({ history: params.history, kokuzoSummary });
  const c = computeBoundaryDelta({ history: params.history, kokuzoSummary });

  // セーフティ: 単回で激変しない（最大±0.02）
  const toneDelta = clampDelta(a.toneDelta + b.toneDelta + c.toneDelta, 0.02);
  const stanceDelta = clampDelta(a.stanceDelta + b.stanceDelta + c.stanceDelta, 0.02);
  const boundaryDelta = clampDelta(a.boundaryDelta + b.boundaryDelta + c.boundaryDelta, 0.02);

  return {
    triggered: true,
    delta: { toneDelta, stanceDelta, boundaryDelta, reason: trig.reason },
    reason: trig.reason,
  };
}


