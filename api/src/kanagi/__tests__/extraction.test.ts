// 抽出パターンのテスト

import { describe, it, expect } from "vitest";
import { extractDefinitions, extractRules, extractLaws } from "../extract/index.js";

describe("Extraction Patterns", () => {
  const source = "test-source";
  const pages = [{ page: 1, text: "テストテキスト" }];
  
  it("should extract definitions from 'XとはYである' pattern", () => {
    const text = "火とは熱の状態である。水とは冷の状態である。";
    const definitions = extractDefinitions(text, source, pages);
    
    expect(definitions.length).toBeGreaterThan(0);
    expect(definitions[0].term).toContain("火");
    expect(definitions[0].meaning).toContain("熱");
  });
  
  it("should extract rules from 'X → Y' pattern", () => {
    const text = "FIRE → 火\nWATER → 水";
    const rules = extractRules(text, source, pages);
    
    expect(rules.length).toBeGreaterThan(0);
    expect(rules[0].pattern).toContain("FIRE");
    expect(rules[0].output).toContain("火");
  });
  
  it("should extract laws from 'XならばY' pattern", () => {
    const text = "FIREならば上昇する。WATERならば下降する。";
    const laws = extractLaws(text, source, pages);
    
    expect(laws.length).toBeGreaterThan(0);
    expect(laws[0].condition).toContain("FIRE");
    expect(laws[0].result).toContain("上昇");
  });
});

