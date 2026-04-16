import { describe, expect, it } from "vitest";
import { analyzeName } from "../../api/src/lib/nameAnalyzer";

describe("nameAnalyzer", () => {
  it("空文字でも落ちずにfallbackする", () => {
    const out = analyzeName("", "", "");
    expect(out.vowelPattern).toEqual([]);
    expect(out.sanskritCandidates).toEqual([]);
  });

  it("記号のみでも落ちない", () => {
    const out = analyzeName("!!!", "###");
    expect(Array.isArray(out.consonantSeries)).toBe(true);
    expect(out.kotodamaTendency.length).toBeGreaterThan(0);
  });

  it("1文字名でも結果を返す", () => {
    const out = analyzeName("光", "ひ");
    expect(out.vowelPattern.length).toBeGreaterThanOrEqual(1);
  });

  it("外国語名でも異常終了しない", () => {
    const out = analyzeName("John", "じょん");
    expect(out.kanjiTheme.length).toBeGreaterThan(0);
  });

  it("通常和名で confidence < 0.3 候補を出さない", () => {
    const out = analyzeName("山田太郎", "やまだたろう");
    expect(out.sanskritCandidates.every((c) => c.confidence >= 0.3)).toBe(true);
  });

  it("候補フォーマットに basis と note を含む", () => {
    const out = analyzeName("佐藤", "さとう");
    if (out.sanskritCandidates.length > 0) {
      const c = out.sanskritCandidates[0];
      expect(c.candidate.length).toBeGreaterThan(0);
      expect(c.meaning.length).toBeGreaterThan(0);
      expect(["音声近似", "語源推定", "形態類似"]).toContain(c.basis);
      expect(c.note).toBe("候補であり確定ではありません");
    }
  });

  it("confidence境界 0.29 は除外 / 0.31 は許可", () => {
    const low = analyzeName("江", "え");
    expect(low.sanskritCandidates.some((c) => c.confidence < 0.3)).toBe(false);
    const high = analyzeName("瑠", "る");
    expect(high.sanskritCandidates.some((c) => c.confidence >= 0.31)).toBe(true);
  });
});
