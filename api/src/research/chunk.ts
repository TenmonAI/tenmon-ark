export function chunkText(text: string, maxChars = 12000, overlap = 800): string[] {
  const t = text.replace(/\r\n/g, "\n");
  const chunks: string[] = [];
  let i = 0;
  while (i < t.length) {
    const end = Math.min(t.length, i + maxChars);
    const piece = t.slice(i, end);
    chunks.push(piece);
    if (end >= t.length) break;
    i = Math.max(0, end - overlap);
  }
  return chunks;
}

