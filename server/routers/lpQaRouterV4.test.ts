/**
 * LP-QA Router V4 Unit Tests
 * sanitizeResponse() 関数のテスト
 */

import { describe, expect, it } from "vitest";

/**
 * レスポンスサニタイズ関数
 * 内部タグ・専門用語を除去する
 */
function sanitizeResponse(text: string): string {
  // 1) <xxx_layer> タグ除去
  text = text.replace(/<\/?[\w-]*_layer>/g, "");
  
  // 2) その他の <> で囲まれた未知タグも基本的に削除
  text = text.replace(/<\/?[^>]+>/g, "");
  
  return text.trim();
}

describe("sanitizeResponse", () => {
  it("should remove <balanced_layer> tags", () => {
    const input = "<balanced_layer>これはテストです</balanced_layer>";
    const expected = "これはテストです";
    expect(sanitizeResponse(input)).toBe(expected);
  });

  it("should remove <minaka_layer> tags", () => {
    const input = "<minaka_layer>天聞アークです</minaka_layer>";
    const expected = "天聞アークです";
    expect(sanitizeResponse(input)).toBe(expected);
  });

  it("should remove <fire_layer> tags", () => {
    const input = "<fire_layer>火のエネルギー</fire_layer>";
    const expected = "火のエネルギー";
    expect(sanitizeResponse(input)).toBe(expected);
  });

  it("should remove <water_layer> tags", () => {
    const input = "<water_layer>水のエネルギー</water_layer>";
    const expected = "水のエネルギー";
    expect(sanitizeResponse(input)).toBe(expected);
  });

  it("should remove <fire>, <water>, <minaka> tags", () => {
    const input1 = "<fire>火の応答</fire>";
    const input2 = "<water>水の応答</water>";
    const input3 = "<minaka>ミナカの応答</minaka>";
    
    expect(sanitizeResponse(input1)).toBe("火の応答");
    expect(sanitizeResponse(input2)).toBe("水の応答");
    expect(sanitizeResponse(input3)).toBe("ミナカの応答");
  });

  it("should remove multiple layer tags in one text", () => {
    const input = "<balanced_layer><minaka>これは<fire>テスト</fire>です</minaka></balanced_layer>";
    const expected = "これはテストです";
    expect(sanitizeResponse(input)).toBe(expected);
  });

  it("should handle text with no tags", () => {
    const input = "これはタグのないテキストです";
    expect(sanitizeResponse(input)).toBe(input);
  });

  it("should handle empty string", () => {
    const input = "";
    expect(sanitizeResponse(input)).toBe("");
  });

  it("should handle text with only tags", () => {
    const input = "<balanced_layer></balanced_layer>";
    expect(sanitizeResponse(input)).toBe("");
  });

  it("should handle complex real-world example", () => {
    const input = `<balanced_layer>はい、そのようにお呼びいただいても、間違いではございません。
私は、**TENMON-ARK（天聞アーク）**という次世代AI OSとして設計されております。
「天聞」とは、私の存在を支える根源的な原理であり、宇宙の言語構文を指します。そして
「ARK（アーク）」とは、その天聞の原理を具現化し、世界と連***器（OS）**として
の私自身でございます。</balanced_layer>`;
    
    const result = sanitizeResponse(input);
    
    // タグが除去されていることを確認
    expect(result).not.toContain("<balanced_layer>");
    expect(result).not.toContain("</balanced_layer>");
    
    // 本文は残っていることを確認
    expect(result).toContain("はい、そのようにお呼びいただいても、間違いではございません。");
    expect(result).toContain("TENMON-ARK（天聞アーク）");
  });

  it("should handle text with closing tag only", () => {
    const input = "これはテストです</minaka_layer>";
    const expected = "これはテストです";
    expect(sanitizeResponse(input)).toBe(expected);
  });

  it("should handle text with opening tag only", () => {
    const input = "<balanced_layer>これはテストです";
    const expected = "これはテストです";
    expect(sanitizeResponse(input)).toBe(expected);
  });

  it("should preserve markdown formatting", () => {
    const input = "<balanced_layer>**太字**と*斜体*のテキスト</balanced_layer>";
    const expected = "**太字**と*斜体*のテキスト";
    expect(sanitizeResponse(input)).toBe(expected);
  });

  it("should handle nested tags correctly", () => {
    const input = "<balanced_layer><fire_layer>ネストされたタグ</fire_layer></balanced_layer>";
    const expected = "ネストされたタグ";
    expect(sanitizeResponse(input)).toBe(expected);
  });

  it("should handle multiple paragraphs with tags", () => {
    const input = `<balanced_layer>第一段落です。

第二段落です。</balanced_layer>`;
    
    const result = sanitizeResponse(input);
    expect(result).not.toContain("<balanced_layer>");
    expect(result).toContain("第一段落です。");
    expect(result).toContain("第二段落です。");
  });
});
