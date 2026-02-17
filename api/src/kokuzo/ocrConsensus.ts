export function consensusTextDet(texts: unknown[]): string {
  const norm = (v: unknown): string => {
    const s = typeof v === "string" ? v : "";
    return s.replace(/\r\n?/g, "\n").trim();
  };
  const arr = (Array.isArray(texts) ? texts : []).map(norm).filter(Boolean);
  if (arr.length === 0) return "";
  arr.sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  return arr[0];
}
