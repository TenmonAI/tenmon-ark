/**
 * テキストの正規化（最小版）
 * - 改行の整理
 * - 全角スペースの半角化
 * - 連続空白の圧縮
 */
export function normalizeText(raw: string): string {
  const withHalfSpace = raw.replace(/\u3000/g, " ");
  const normalizedNewline = withHalfSpace.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const collapsedSpaces = normalizedNewline.replace(/[ \t]+/g, " ");
  const trimmedLines = collapsedSpaces
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .trim();
  return trimmedLines;
}



