import { describe, expect, it } from "vitest";
import { executeTwinCoreReasoning } from "./twinCoreEngine";

describe("Twin-Core統合エンジン", () => {
  it("カタカナ入力から天津金木パターンを抽出できる", async () => {
    const result = await executeTwinCoreReasoning("アイウエオ");
    
    expect(result.inputText).toBe("アイウエオ");
    expect(result.extractedSounds).toContain("ア");
    expect(result.extractedSounds).toContain("イ");
    expect(result.extractedSounds).toContain("ウ");
    expect(result.extractedSounds).toContain("エ");
    expect(result.extractedSounds).toContain("オ");
  });

  it("ひらがな入力からいろは言灵解を抽出できる", async () => {
    const result = await executeTwinCoreReasoning("いろは");
    
    expect(result.inputText).toBe("いろは");
    expect(result.extractedSounds).toContain("い");
    expect(result.extractedSounds).toContain("ろ");
    expect(result.extractedSounds).toContain("は");
    expect(result.irohaWisdom.characters).toContain("い");
    expect(result.irohaWisdom.characters).toContain("ろ");
    expect(result.irohaWisdom.characters).toContain("は");
  });

  it("火水バランスを計算できる", async () => {
    const result = await executeTwinCoreReasoning("アイウエオ");
    
    expect(result.fireWater).toBeDefined();
    expect(result.fireWater.fire).toBeGreaterThanOrEqual(0);
    expect(result.fireWater.water).toBeGreaterThanOrEqual(0);
    expect(result.fireWater.balance).toBeGreaterThanOrEqual(-1);
    expect(result.fireWater.balance).toBeLessThanOrEqual(1);
    expect(["火", "水", "中庸"]).toContain(result.fireWater.dominantElement);
  });

  it("左右旋を計算できる", async () => {
    const result = await executeTwinCoreReasoning("アイウエオ");
    
    expect(result.rotation).toBeDefined();
    expect(result.rotation.leftRotation).toBeGreaterThanOrEqual(0);
    expect(result.rotation.rightRotation).toBeGreaterThanOrEqual(0);
    expect(["左旋", "右旋", "均衡"]).toContain(result.rotation.dominantRotation);
  });

  it("内集外発を計算できる", async () => {
    const result = await executeTwinCoreReasoning("アイウエオ");
    
    expect(result.convergenceDivergence).toBeDefined();
    expect(result.convergenceDivergence.innerConvergence).toBeGreaterThanOrEqual(0);
    expect(result.convergenceDivergence.outerDivergence).toBeGreaterThanOrEqual(0);
    expect(["内集", "外発", "均衡"]).toContain(result.convergenceDivergence.dominantMovement);
  });

  it("陰陽バランスを計算できる", async () => {
    const result = await executeTwinCoreReasoning("アイウエオ");
    
    expect(result.yinYang).toBeDefined();
    expect(result.yinYang.yin).toBeGreaterThanOrEqual(0);
    expect(result.yinYang.yang).toBeGreaterThanOrEqual(0);
    expect(result.yinYang.balance).toBeGreaterThanOrEqual(-1);
    expect(result.yinYang.balance).toBeLessThanOrEqual(1);
    expect(["陰", "陽", "中庸"]).toContain(result.yinYang.dominantPolarity);
  });

  it("フトマニ位置を決定できる", async () => {
    const result = await executeTwinCoreReasoning("アイウエオ");
    
    expect(result.futomani).toBeDefined();
    expect(result.futomani.position).toBeDefined();
    expect(result.futomani.direction).toBeDefined();
    expect(result.futomani.cosmicStructure).toBeDefined();
  });

  it("ミナカ（中心）からの距離を計算できる", async () => {
    const result = await executeTwinCoreReasoning("アイウエオ");
    
    expect(result.minaka).toBeDefined();
    expect(result.minaka.distanceFromCenter).toBeGreaterThanOrEqual(0);
    expect(result.minaka.distanceFromCenter).toBeLessThanOrEqual(1);
    expect(result.minaka.spiritualLevel).toBeGreaterThanOrEqual(0);
    expect(result.minaka.spiritualLevel).toBeLessThanOrEqual(100);
    expect(result.minaka.cosmicAlignment).toBeGreaterThanOrEqual(0);
    expect(result.minaka.cosmicAlignment).toBeLessThanOrEqual(100);
  });

  it("最終解釈を生成できる", async () => {
    const result = await executeTwinCoreReasoning("アイウエオ");
    
    expect(result.finalInterpretation).toBeDefined();
    expect(result.finalInterpretation.cosmicMeaning).toBeDefined();
    expect(result.finalInterpretation.wisdomMeaning).toBeDefined();
    expect(result.finalInterpretation.unifiedInterpretation).toBeDefined();
    expect(result.finalInterpretation.recommendations).toBeDefined();
    expect(Array.isArray(result.finalInterpretation.recommendations)).toBe(true);
  });

  it("空文字列を処理できる", async () => {
    const result = await executeTwinCoreReasoning("");
    
    expect(result.inputText).toBe("");
    expect(result.extractedSounds).toEqual([]);
  });

  it("カタカナとひらがなの混合入力を処理できる", async () => {
    const result = await executeTwinCoreReasoning("アイいろは");
    
    expect(result.extractedSounds).toContain("ア");
    expect(result.extractedSounds).toContain("イ");
    expect(result.extractedSounds).toContain("い");
    expect(result.extractedSounds).toContain("ろ");
    expect(result.extractedSounds).toContain("は");
    expect(result.amatsuKanagi.patterns.length).toBeGreaterThan(0);
    expect(result.irohaWisdom.interpretations.length).toBeGreaterThan(0);
  });
});
