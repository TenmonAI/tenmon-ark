// マッピングのテスト

import { describe, it, expect } from "vitest";
import { classifyIki, estimatePhase, mapToForm, mapToKotodama, determineRole } from "../engine/index.js";
import type { Ruleset } from "../types.js";

describe("Mapping Tests", () => {
  const emptyRuleset: Ruleset = {
    id: "test",
    name: "Test Ruleset",
    version: "1.0.0",
    definitions: [],
    rules: [],
    laws: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  it("should classify iki state from tokens", () => {
    const tokens = ["火", "熱", "上昇"];
    const result = classifyIki(tokens, emptyRuleset);
    
    expect(result.state).toBeDefined();
    expect(["FIRE", "WATER", "BOTH", "NEUTRAL"]).toContain(result.state);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
  
  it("should estimate phase from text", () => {
    const text = "上昇する";
    const result = estimatePhase(text, emptyRuleset);
    
    expect(result.phase).toBeDefined();
    expect(["rise", "fall", "open", "close", "center"]).toContain(result.phase);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
  
  it("should map to form from iki state and phase", () => {
    const result = mapToForm("FIRE", "rise", emptyRuleset);
    
    expect(result.form).toBeDefined();
    expect(["○", "｜", "ゝ", "井", "×", "△", "□", "◇"]).toContain(result.form);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
  
  it("should map to kotodama from form and role", () => {
    const result = mapToKotodama("○", "君位", emptyRuleset);
    
    expect(result.row).toBeDefined();
    expect(["ア", "ワ", "ヤ", "マ", "ハ", "ナ", "タ", "サ", "カ", "ラ"]).toContain(result.row);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
  
  it("should determine role from form", () => {
    const role = determineRole("○", emptyRuleset);
    
    expect(role).toBeDefined();
    expect(["君位", "臣位", "民位"]).toContain(role);
  });
});

