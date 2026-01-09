// /opt/tenmon-chat-core/src/lib/title.ts
// タイトル自動生成ヘルパー

/**
 * ユーザー発言からタイトルを自動生成
 */
export function deriveTitle(raw: string): string {
  const t = (raw ?? "")
    .replace(/#(詳細|detail)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // doc/pdfPage 形式を拾う（例: 言霊秘書.pdf pdfPage=6）
  const docMatch = t.match(/([^\s]+\.pdf)/);
  const pageMatch = t.match(/pdfPage\s*[:=]\s*(\d{1,4})/i);
  if (docMatch && pageMatch) {
    const doc = docMatch[1].replace(/\.pdf$/i, "");
    return `${doc} P${pageMatch[1]}`.slice(0, 28);
  }

  // 普通の短文をタイトル化
  const cut = t.length > 28 ? t.slice(0, 28) + "…" : t;
  return cut || "新しい会話";
}

