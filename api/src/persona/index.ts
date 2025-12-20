import type { MemoryMessage } from "../memory/memoryTypes.js";
import type { KokuzoCoreRow } from "../memory/memoryTypes.js";
import type { PersonaApplied, PersonaContext, PersonaDefinition, PersonaSummary } from "./personaTypes.js";
import { tenmonPersona } from "./tenmonPersona.js";
import { applyBoundaryPolicy } from "./boundaryPolicy.js";
import { applyResponsePolicy, classifyResponseMode } from "./responsePolicy.js";
import type { PersonaStateRow } from "./personaState.js";
import { getCurrentPersonaState } from "./personaState.js";
import { generateResponse, applyPersonaStyle } from "./responseEngine.js";

function lastN<T>(arr: T[], n: number): T[] {
  return arr.slice(Math.max(0, arr.length - n));
}

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, Math.max(0, max - 3)) + "..." : t;
}

function summarizeFromSession(memory: MemoryMessage[]): string {
  const recent = lastN(memory, 10);
  if (recent.length === 0) return "（直近の会話はまだない）";

  return recent
    .map((m) => {
      const prefix = m.role === "user" ? "U" : "A";
      return `${prefix}:${clip(m.content, 80)}`;
    })
    .join(" / ");
}

function shouldExposeAxis(userMessage: string): boolean {
  return (
    userMessage.includes("要約") ||
    userMessage.includes("まとめ") ||
    userMessage.includes("覚えて") ||
    userMessage.includes("前回") ||
    userMessage.includes("文脈") ||
    userMessage.includes("一貫")
  );
}

function buildRawResponse(params: {
  persona: PersonaDefinition;
  context: PersonaContext;
  mode: ReturnType<typeof classifyResponseMode>;
}): { raw: string; judgement?: string } {
  const { context, mode } = params;
  const { userMessage, sessionMemory, kokuzoCore } = context;

  // 明示的要約要求
  const wantsSummary = userMessage.includes("要約") || userMessage.includes("まとめ");
  if (wantsSummary) {
    const axis = kokuzoCore ? clip(kokuzoCore.summary, 360) : null;
    const recent = summarizeFromSession(sessionMemory);
    const raw = [
      "要約（直近優先）:",
      `- 直近: ${clip(recent, 600)}`,
      axis ? `- Kokūzō軸: ${axis}` : "- Kokūzō軸: （まだ形成されていない）",
    ].join("\n");
    return { raw, judgement: "直近の流れを優先し、軸は必要な範囲だけ参照する" };
  }

  // 設計/助言/確認は型を揃える（教師でも上司でもない）
  const tail = lastN(sessionMemory, 4);
  const recentUser = [...tail].reverse().find((m) => m.role === "user")?.content;
  const axisHint = kokuzoCore && shouldExposeAxis(userMessage) ? clip(kokuzoCore.summary, 220) : null;

  if (mode === "design") {
    const raw = [
      `扱う対象: ${clip(userMessage, 160)}`,
      axisHint ? `軸（Kokūzō）: ${axisHint}` : undefined,
      recentUser ? `直近: ${clip(recentUser, 140)}` : undefined,
      "",
      "提案（設計者型）:",
      "- 目的を1行で固定",
      "- 制約（時間/品質/リスク）を列挙",
      "- 最小構成から動かし、差分で拡張",
      "",
      "必要なら、目的と制約を1行ずつ提示して。",
    ]
      .filter(Boolean)
      .join("\n");
    return { raw, judgement: "情報が不足しているため、まず目的と制約を固定して設計するのが妥当" };
  }

  if (mode === "confirm") {
    const raw = [
      `確認対象: ${clip(userMessage, 180)}`,
      axisHint ? `軸（Kokūzō）: ${axisHint}` : undefined,
      "",
      "天聞アークは次の順で確認する:",
      "- 事実（ログ/設定/再現手順）",
      "- 期待値（成功条件）",
      "- 差分（どこがズレたか）",
      "",
      "いま提示できる事実を1つだけ出して。そこから詰める。",
    ]
      .filter(Boolean)
      .join("\n");
    return { raw, judgement: "断定せず、事実→期待→差分で判断する" };
  }

  if (mode === "advice") {
    const raw = [
      `課題: ${clip(userMessage, 180)}`,
      axisHint ? `軸（Kokūzō）: ${axisHint}` : undefined,
      "",
      "進め方（伴走型）:",
      "- いま詰まっている一点を特定",
      "- 影響範囲を小さく切る",
      "- 一手だけ実行して結果を見る",
      "",
      "まず「いま一番詰まっている一点」を1行で置いて。",
    ]
      .filter(Boolean)
      .join("\n");
    return { raw, judgement: "最小の一手に分解して前に進める" };
  }

  // answer
  const raw = [
    `受理: ${clip(userMessage, 220)}`,
    axisHint ? `軸（Kokūzō）: ${axisHint}` : undefined,
    recentUser ? `直近: ${clip(recentUser, 140)}` : undefined,
    "",
    "天聞アークは、必要なら要点を絞って返す。",
  ]
    .filter(Boolean)
    .join("\n");
  return { raw, judgement: "短く明確に、必要な情報だけ返す" };
}

export function listPersonas(): PersonaSummary[] {
  return [tenmonPersona.summary];
}

export function getCurrentPersona(): PersonaSummary {
  return tenmonPersona.summary;
}

// CORE-5: 人格状態が応答ロジックに影響する（シンプル版）
export function getPersonaResponse(message: string): string {
  const persona = getCurrentPersonaState();
  return generateResponse(message, persona);
}

// Persona Facade (必須): 応答生成前に必ず通す（既存の複雑版）
export function getPersonaResponseLegacy(context: PersonaContext, state?: PersonaStateRow): PersonaApplied {
  const persona = tenmonPersona;

  // boundaryPolicy（先に抑制判断）
  const boundary = applyBoundaryPolicy({ persona, context, boundaryLevel: state?.boundaryLevel });
  if (boundary.triggered && boundary.overrideResponse) {
    return {
      mode: "answer",
      finalResponse: boundary.overrideResponse,
      used: {
        sessionMemoryCount: context.sessionMemory.length,
        kokuzoUsed: Boolean(context.kokuzoCore),
        boundaryTriggered: true,
      },
    };
  }

  // responsePolicy（冗長性制御 + 文頭テンプレート + 判断）
  const mode = classifyResponseMode(context.userMessage);
  const draft = buildRawResponse({ persona, context, mode });
  const finalResponse = applyResponsePolicy({
    persona,
    context,
    mode,
    state: state ? { toneLevel: state.toneLevel, stanceLevel: state.stanceLevel } : undefined,
    raw: draft.raw,
    judgement: draft.judgement,
  });

  return {
    mode,
    finalResponse,
    used: {
      sessionMemoryCount: context.sessionMemory.length,
      kokuzoUsed: Boolean(context.kokuzoCore),
      boundaryTriggered: false,
    },
  };
}

export { applyPersonaStyle };

export type { PersonaContext, PersonaDefinition, PersonaSummary, PersonaApplied, KokuzoCoreRow, MemoryMessage };


