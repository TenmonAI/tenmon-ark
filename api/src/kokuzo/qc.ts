export type PageQc = {
  len: number;
  jpCount: number;
  jpRate: number;          // 0..1
  ctrlCount: number;       // C0/C1 controls except \n\t\r
  ctrlRate: number;        // 0..1
  mojibakeLikely: boolean; // heuristic
};

export function qcTextV1(input: string): PageQc {
  const s = String(input ?? "");
  const len = s.length || 0;

  const jpMatches = s.match(/[ぁ-んァ-ン一-龯]/g) || [];
  const jpCount = jpMatches.length;
  const jpRate = len > 0 ? jpCount / len : 0;

  let ctrlCount = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    const isAllowed = c === 0x09 || c === 0x0A || c === 0x0D; // \t \n \r
    const isCtrl = (!isAllowed && (c < 0x20 || (c >= 0x80 && c <= 0x9F)));
    if (isCtrl) ctrlCount++;
  }
  const ctrlRate = len > 0 ? ctrlCount / len : 0;

  const mojibakeLikely = (len >= 80 && jpRate < 0.01) || ctrlRate >= 0.01;
  return { len, jpCount, jpRate, ctrlCount, ctrlRate, mojibakeLikely };
}
