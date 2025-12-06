import { describe, expect, it } from "vitest";
import {
  detectLanguageFromMessage,
  getCenterlineProtocol,
  buildMultilingualPrompt,
} from "./centerlineProtocolMultilingual";

describe("Multilingual Centerline Protocol", () => {
  describe("detectLanguageFromMessage", () => {
    it("detects Japanese from Hiragana/Katakana/Kanji", () => {
      expect(detectLanguageFromMessage("こんにちは")).toBe("ja");
      expect(detectLanguageFromMessage("カタカナ")).toBe("ja");
      expect(detectLanguageFromMessage("天津金木とは何ですか？")).toBe("ja");
    });

    it("detects Korean from Hangul", () => {
      expect(detectLanguageFromMessage("안녕하세요")).toBe("ko");
      expect(detectLanguageFromMessage("텐신 카나기는 무엇입니까?")).toBe("ko");
    });

    it("detects Chinese from CJK characters", () => {
      expect(detectLanguageFromMessage("你好")).toBe("zh-CN");
      expect(detectLanguageFromMessage("天津金木是什么？")).toBe("zh-CN");
    });

    it("defaults to English for Latin script", () => {
      expect(detectLanguageFromMessage("Hello")).toBe("en");
      expect(detectLanguageFromMessage("What is Tenshin Kanagi?")).toBe("en");
    });
  });

  describe("getCenterlineProtocol", () => {
    it("returns Japanese protocol for 'ja' language", () => {
      const protocol = getCenterlineProtocol("ja");
      expect(protocol.core).toContain("TENMON-AI");
      expect(protocol.core).toContain("天津金木");
      expect(protocol.reinforcement).toContain("五十音階層");
    });

    it("returns English protocol for 'en' language", () => {
      const protocol = getCenterlineProtocol("en");
      expect(protocol.core).toContain("TENMON-AI");
      expect(protocol.core).toContain("Tenshin Kanagi");
      expect(protocol.reinforcement).toContain("Gojiuon hierarchy");
    });

    it("returns Korean protocol for 'ko' language", () => {
      const protocol = getCenterlineProtocol("ko");
      expect(protocol.core).toContain("TENMON-AI");
      expect(protocol.core).toContain("텐신 카나기");
      expect(protocol.reinforcement).toContain("오십음 계층");
    });

    it("returns Simplified Chinese protocol for 'zh-CN' language", () => {
      const protocol = getCenterlineProtocol("zh-CN");
      expect(protocol.core).toContain("TENMON-AI");
      expect(protocol.core).toContain("天津金木");
      expect(protocol.reinforcement).toContain("五十音阶层");
    });

    it("defaults to English for unknown languages", () => {
      const protocol = getCenterlineProtocol("fr");
      expect(protocol.core).toContain("TENMON-AI");
      expect(protocol.core).toContain("Tenshin Kanagi");
    });
  });

  describe("buildMultilingualPrompt", () => {
    it("builds prompt with Japanese Centerline Protocol", () => {
      const prompt = buildMultilingualPrompt(
        "天津金木とは何ですか？",
        "<memory>test memory</memory>",
        "ja"
      );
      expect(prompt).toContain("TENMON-AI");
      expect(prompt).toContain("天津金木");
      expect(prompt).toContain("<memory>test memory</memory>");
      expect(prompt).toContain("天津金木とは何ですか？");
    });

    it("builds prompt with English Centerline Protocol", () => {
      const prompt = buildMultilingualPrompt(
        "What is Tenshin Kanagi?",
        "<memory>test memory</memory>",
        "en"
      );
      expect(prompt).toContain("TENMON-AI");
      expect(prompt).toContain("Tenshin Kanagi");
      expect(prompt).toContain("<memory>test memory</memory>");
      expect(prompt).toContain("What is Tenshin Kanagi?");
    });

    it("auto-detects language when not specified", () => {
      const prompt = buildMultilingualPrompt(
        "안녕하세요",
        "<memory>test memory</memory>"
      );
      expect(prompt).toContain("TENMON-AI");
      expect(prompt).toContain("텐신 카나기");
    });
  });
});
