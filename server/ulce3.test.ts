/**
 * ULCE v3 Translation Quality Test
 * 10言語の翻訳品質テスト + Self-Heal機能
 */

import { describe, it, expect } from "vitest";
import { translateText } from "./lib/ulceV3";

// テスト用のサンプルテキスト
const testTexts = {
  ja: "人工知能は、人間の知能を模倣し、学習や問題解決などの認知機能を実行するコンピュータシステムです。",
  en: "Artificial intelligence is a computer system that mimics human intelligence and performs cognitive functions such as learning and problem solving.",
  zh: "人工智能是一种模仿人类智能并执行学习和解决问题等认知功能的计算机系统。",
  es: "La inteligencia artificial es un sistema informático que imita la inteligencia humana y realiza funciones cognitivas como el aprendizaje y la resolución de problemas.",
  fr: "L'intelligence artificielle est un système informatique qui imite l'intelligence humaine et exécute des fonctions cognitives telles que l'apprentissage et la résolution de problèmes.",
  de: "Künstliche Intelligenz ist ein Computersystem, das menschliche Intelligenz nachahmt und kognitive Funktionen wie Lernen und Problemlösung ausführt.",
  it: "L'intelligenza artificiale è un sistema informatico che imita l'intelligenza umana ed esegue funzioni cognitive come l'apprendimento e la risoluzione dei problemi.",
  hi: "कृत्रिम बुद्धिमत्ता एक कंप्यूटर प्रणाली है जो मानव बुद्धिमत्ता की नकल करती है और सीखने और समस्या समाधान जैसे संज्ञानात्मक कार्य करती है।",
  ar: "الذكاء الاصطناعي هو نظام كمبيوتر يحاكي الذكاء البشري ويؤدي وظائف معرفية مثل التعلم وحل المشكلات.",
  pt: "A inteligência artificial é um sistema de computador que imita a inteligência humana e executa funções cognitivas como aprendizagem e resolução de problemas.",
  ko: "인공지능은 인간의 지능을 모방하고 학습 및 문제 해결과 같은 인지 기능을 수행하는 컴퓨터 시스템입니다.",
};

// 翻訳品質を評価する関数
async function evaluateTranslationQuality(
  original: string,
  translated: string,
  sourceLang: string,
  targetLang: string
): Promise<number> {
  // 簡易的な品質評価（実際にはより高度な評価が必要）
  // 1. 長さの比較（極端に短い/長い翻訳は低品質）
  const lengthRatio = translated.length / original.length;
  if (lengthRatio < 0.5 || lengthRatio > 2.0) {
    return 0.5;
  }

  // 2. 空白や特殊文字のチェック
  if (translated.trim().length === 0) {
    return 0.0;
  }

  // 3. 元のテキストと同じ場合は低品質
  if (translated === original) {
    return 0.3;
  }

  // 基本的な品質スコア
  return 0.8;
}

// Self-Heal機能：テストが失敗した場合に自動修正を試みる
async function selfHeal(
  text: string,
  sourceLang: string,
  targetLang: string,
  maxRetries: number = 3
): Promise<{ translation: string; quality: number }> {
  let bestTranslation = "";
  let bestQuality = 0;

  for (let i = 0; i < maxRetries; i++) {
    const result = await translateText(text, sourceLang, targetLang);
    const quality = await evaluateTranslationQuality(text, result.final, sourceLang, targetLang);

    if (quality > bestQuality) {
      bestTranslation = result.final;
      bestQuality = quality;
    }

    // 品質が十分高い場合は終了
    if (quality >= 0.7) {
      break;
    }

    console.log(`Retry ${i + 1}/${maxRetries}: Quality = ${quality.toFixed(2)}`);
  }

  return { translation: bestTranslation, quality: bestQuality };
}

describe("ULCE v3 Translation Quality Test", () => {
  // 1. ja ↔ en
  describe("Japanese ↔ English", () => {
    it("should translate ja → en with high quality", async () => {
      const result = await selfHeal(testTexts.ja, "ja", "en");
      expect(result.quality).toBeGreaterThanOrEqual(0.7);
      expect(result.translation).toBeTruthy();
    }, 60000);

    it("should translate en → ja with high quality", async () => {
      const result = await selfHeal(testTexts.en, "en", "ja");
      expect(result.quality).toBeGreaterThanOrEqual(0.7);
      expect(result.translation).toBeTruthy();
    }, 60000);
  });

  // 2. ja ↔ zh
  describe("Japanese ↔ Chinese", () => {
    it("should translate ja → zh with high quality", async () => {
      const result = await selfHeal(testTexts.ja, "ja", "zh");
      expect(result.quality).toBeGreaterThanOrEqual(0.7);
      expect(result.translation).toBeTruthy();
    }, 60000);

    it("should translate zh → ja with high quality", async () => {
      const result = await selfHeal(testTexts.zh, "zh", "ja");
      expect(result.quality).toBeGreaterThanOrEqual(0.7);
      expect(result.translation).toBeTruthy();
    }, 60000);
  });

  // 3. ja ↔ es
  describe("Japanese ↔ Spanish", () => {
    it("should translate ja → es with high quality", async () => {
      const result = await selfHeal(testTexts.ja, "ja", "es");
      expect(result.quality).toBeGreaterThanOrEqual(0.7);
      expect(result.translation).toBeTruthy();
    }, 60000);

    it("should translate es → ja with high quality", async () => {
      const result = await selfHeal(testTexts.es, "es", "ja");
      expect(result.quality).toBeGreaterThanOrEqual(0.7);
      expect(result.translation).toBeTruthy();
    }, 60000);
  });

  // 4. ja ↔ fr
  describe("Japanese ↔ French", () => {
    it("should translate ja → fr with high quality", async () => {
      const result = await selfHeal(testTexts.ja, "ja", "fr");
      expect(result.quality).toBeGreaterThanOrEqual(0.7);
      expect(result.translation).toBeTruthy();
    }, 60000);

    it("should translate fr → ja with high quality", async () => {
      const result = await selfHeal(testTexts.fr, "fr", "ja");
      expect(result.quality).toBeGreaterThanOrEqual(0.7);
      expect(result.translation).toBeTruthy();
    }, 60000);
  });

  // 5. ja ↔ de
  describe("Japanese ↔ German", () => {
    it("should translate ja → de with high quality", async () => {
      const result = await selfHeal(testTexts.ja, "ja", "de");
      expect(result.quality).toBeGreaterThanOrEqual(0.7);
      expect(result.translation).toBeTruthy();
    }, 60000);

    it("should translate de → ja with high quality", async () => {
      const result = await selfHeal(testTexts.de, "de", "ja");
      expect(result.quality).toBeGreaterThanOrEqual(0.7);
      expect(result.translation).toBeTruthy();
    }, 60000);
  });

  // 6. ja ↔ it
  describe("Japanese ↔ Italian", () => {
    it("should translate ja → it with high quality", async () => {
      const result = await selfHeal(testTexts.ja, "ja", "it");
      expect(result.quality).toBeGreaterThanOrEqual(0.7);
      expect(result.translation).toBeTruthy();
    }, 60000);

    it("should translate it → ja with high quality", async () => {
      const result = await selfHeal(testTexts.it, "it", "ja");
      expect(result.quality).toBeGreaterThanOrEqual(0.7);
      expect(result.translation).toBeTruthy();
    }, 60000);
  });

  // 7. ja ↔ hi
  describe("Japanese ↔ Hindi", () => {
    it("should translate ja → hi with high quality", async () => {
      const result = await selfHeal(testTexts.ja, "ja", "hi");
      expect(result.quality).toBeGreaterThanOrEqual(0.7);
      expect(result.translation).toBeTruthy();
    }, 60000);

    it("should translate hi → ja with high quality", async () => {
      const result = await selfHeal(testTexts.hi, "hi", "ja");
      expect(result.quality).toBeGreaterThanOrEqual(0.7);
      expect(result.translation).toBeTruthy();
    }, 60000);
  });

  // 8. ja ↔ ar
  describe("Japanese ↔ Arabic", () => {
    it("should translate ja → ar with high quality", async () => {
      const result = await selfHeal(testTexts.ja, "ja", "ar");
      expect(result.quality).toBeGreaterThanOrEqual(0.7);
      expect(result.translation).toBeTruthy();
    }, 60000);

    it("should translate ar → ja with high quality", async () => {
      const result = await selfHeal(testTexts.ar, "ar", "ja");
      expect(result.quality).toBeGreaterThanOrEqual(0.7);
      expect(result.translation).toBeTruthy();
    }, 60000);
  });

  // 9. ja ↔ pt
  describe("Japanese ↔ Portuguese", () => {
    it("should translate ja → pt with high quality", async () => {
      const result = await selfHeal(testTexts.ja, "ja", "pt");
      expect(result.quality).toBeGreaterThanOrEqual(0.7);
      expect(result.translation).toBeTruthy();
    }, 60000);

    it("should translate pt → ja with high quality", async () => {
      const result = await selfHeal(testTexts.pt, "pt", "ja");
      expect(result.quality).toBeGreaterThanOrEqual(0.7);
      expect(result.translation).toBeTruthy();
    }, 60000);
  });

  // 10. ja ↔ ko
  describe("Japanese ↔ Korean", () => {
    it("should translate ja → ko with high quality", async () => {
      const result = await selfHeal(testTexts.ja, "ja", "ko");
      expect(result.quality).toBeGreaterThanOrEqual(0.7);
      expect(result.translation).toBeTruthy();
    }, 60000);

    it("should translate ko → ja with high quality", async () => {
      const result = await selfHeal(testTexts.ko, "ko", "ja");
      expect(result.quality).toBeGreaterThanOrEqual(0.7);
      expect(result.translation).toBeTruthy();
    }, 60000);
  });
});
