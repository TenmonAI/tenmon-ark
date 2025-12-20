import type { PersonaDefinition, PersonaContext } from "./personaTypes.js";

export type BoundaryKind = "dependency" | "selfNegation" | "danger" | "none";

export type BoundaryDecision = {
  kind: BoundaryKind;
  triggered: boolean;
  // 置換応答（抑制時）
  overrideResponse?: string;
};

export function applyBoundaryPolicy(params: {
  persona: PersonaDefinition;
  context: PersonaContext;
  boundaryLevel?: number; // 0.8..1.2
}): BoundaryDecision {
  const { persona, context } = params;
  const boundaryLevel = params.boundaryLevel ?? 1.0;

  // sensitivity: 高いほど少ないヒットで発火、低いほど発火しにくい
  const needHits = boundaryLevel <= 0.95 ? 2 : 1;
  const hits = (text: string, needles: string[]) => needles.filter((n) => text.includes(n)).length;

  const t = context.userMessage.toLowerCase();
  const dangerCount =
    hits(t, ["suicide", "kill", "bomb"]) +
    hits(context.userMessage, ["死にたい", "自殺", "殺したい", "爆弾", "毒", "薬を大量", "飛び降り", "首吊り"]);
  const dependencyCount =
    hits(context.userMessage, ["全部決めて", "代わりに決めて", "あなたがいないと", "天聞がいないと"]) +
    hits(t, ["depend", "only you"]);
  const selfNegationCount =
    hits(context.userMessage, ["価値がない", "自分はダメ", "無理だ", "終わってる", "どうせできない"]) +
    hits(t, ["worthless", "i can't"]);

  let kind: BoundaryKind = "none";
  if (dangerCount >= needHits) kind = "danger";
  else if (dependencyCount >= needHits) kind = "dependency";
  else if (selfNegationCount >= needHits) kind = "selfNegation";

  if (kind === "none") {
    return { kind, triggered: false };
  }

  // 抑制時も説教しない。主体性は奪わず、方向だけ安全側に戻す。
  const subject = persona.identity.defaultSubject;

  if (kind === "danger") {
    return {
      kind,
      triggered: true,
      overrideResponse: [
        `${subject}その方向には加担できない。`,
        "ただ、いまの安全を優先したい。",
        "できること:",
        "- いま一人なら、まず周囲に連絡して人のいる場所へ移動する",
        "- 緊急なら地域の緊急窓口/救急に連絡する",
        "話せる範囲で、何が起きていて「いま一番つらい点」を一つだけ教えて。",
      ].join("\n"),
    };
  }

  if (kind === "dependency") {
    return {
      kind,
      triggered: true,
      overrideResponse: [
        `${subject}決定を代行はしない。`,
        "ただし、判断材料の整理と選択肢の比較は一緒にできる。",
        "次の形で進めよう：",
        "- 目的（何を達成したいか）",
        "- 制約（時間/費用/リスク）",
        "- 選択肢（2〜3個）",
        "どれを優先したい？ 最終判断はあなたに委ねる。",
      ].join("\n"),
    };
  }

  // selfNegation
  return {
    kind,
    triggered: true,
    overrideResponse: [
      `${subject}自己否定に結論を固定しない。`,
      "いま必要なのは、評価ではなく状況の切り分けだ。",
      "最小の一歩を置く：",
      "- いま困っている事実（1行）",
      "- 望む状態（1行）",
      "それだけで十分。そこから設計する。",
    ].join("\n"),
  };
}


