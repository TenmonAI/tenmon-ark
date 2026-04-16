import { describe, expect, it } from "vitest";
import { integrateSukuyouAndName } from "../../api/src/lib/sukuyouIntegrator";
import type { NameAnalysisResult } from "../../api/src/lib/nameAnalyzer";

function mkName(bias: "outward" | "inward" | "balanced"): NameAnalysisResult {
  return {
    vowelPattern: ["a"],
    consonantSeries: ["k"],
    outwardInwardBias: bias,
    expansionContractionBias: "balanced",
    kotodamaTendency: "test",
    kanjiTheme: "test",
    sanskritCandidates: [],
  };
}

describe("sukuyouIntegrator threshold lock", () => {
  it("同方向は一致判定", () => {
    const out = integrateSukuyouAndName(
      { honmeiShuku: "房", shukuElement: "火", shukuNature: "陽" },
      mkName("outward")
    );
    expect(out?.alignmentType).toBe("一致");
  });

  it("逆方向はねじれ判定", () => {
    const out = integrateSukuyouAndName(
      { honmeiShuku: "房", shukuElement: "火", shukuNature: "陽" },
      mkName("inward")
    );
    expect(out?.alignmentType).toBe("ねじれ");
  });

  it("差が小さい場合は中立判定", () => {
    const out = integrateSukuyouAndName(
      { honmeiShuku: "房", shukuElement: "中庸", shukuNature: "均衡" },
      mkName("balanced")
    );
    expect(out?.alignmentType).toBe("中立");
  });
});
