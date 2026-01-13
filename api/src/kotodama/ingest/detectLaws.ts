import type { DetectedLaw } from "../types.js";

const PATTERNS: Array<{
  title: string;
  re: RegExp;
  tags: string[];
  toNormalized: (m: RegExpExecArray) => string;
}> = [
  {
    title: "御中主核：0とヽ",
    // 例: 「0は母の水、ヽは父の一滴…。」という一文を想定
    re: /(0は母の水、ヽは父の一滴[^。]*。)/,
    tags: ["cosmogony", "futomani", "minakanushi"],
    toNormalized: () =>
      "御中主の初期条件を「母水(0)の正中に父滴(ヽ)」として定義する。",
  },
  {
    title: "解釈操作：佐言と反約・省・補・延開",
    re: /(ラリルレ[^。]*反約[^。]*アイウオ[^。]*シミツ[^。]*補[^。]*延開[^。]*。)/,
    tags: ["operation", "helpers", "method"],
    toNormalized: () =>
      "語釈は一言法則に合わせ、必要に応じて助(ラリルレ)・起(アイウオ)・補(シミツ)・省・反約・延開を用いる。",
  },
];

export function detectLaws(text: string): DetectedLaw[] {
  const out: DetectedLaw[] = [];
  for (const p of PATTERNS) {
    const m = p.re.exec(text);
    if (m?.[1]) {
      out.push({
        title: p.title,
        quote: m[1],
        normalized: p.toNormalized(m),
        tags: p.tags,
        confidence: 0.85,
      });
    }
  }
  return out;
}



