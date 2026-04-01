export type TenmonLongformModeV1 = "read" | "proposal" | "analysis" | "reflect";

export type ComposeTenmonLongformArgsV1 = {
  body?: string;
  mode?: TenmonLongformModeV1;
  centerClaim?: string;
  nextAxis?: string;
  targetLength?: number;
};

export type ComposeTenmonLongformResultV1 = {
  longform: string;
  mode: TenmonLongformModeV1;
  centerLockPassed: boolean;
};

function asPositiveNumber(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function composeTenmonLongformV1(args: ComposeTenmonLongformArgsV1): ComposeTenmonLongformResultV1 {
  const body = String(args.body || "").trim();
  const mode: TenmonLongformModeV1 = args.mode || "reflect";
  const centerClaim = String(args.centerClaim || "").trim();
  const nextAxis = String(args.nextAxis || "").trim();
  const targetLength = asPositiveNumber(args.targetLength, 300);
  const minLockLength = Math.ceil(targetLength * 0.7);

  if (body.length >= targetLength * 0.8) {
    return {
      longform: body,
      mode,
      centerLockPassed: body.length >= minLockLength && body.length > 0,
    };
  }

  const mitate = centerClaim
    ? `見立て: ${centerClaim}を中心に、本文の焦点を天聞軸で読み直す。`
    : "見立て: 本文の焦点を天聞統合軸で読み直す。";
  const tenkai = nextAxis
    ? `展開: ${nextAxis}を手掛かりに、前提・論点・帰結の順で整える。`
    : "展開: 前提・論点・帰結の順で整える。";
  const chakuchi = "着地: 断定を急がず、正典証拠による確認を前提に暫定結論として扱う。";

  const tails: string[] = [mitate, tenkai, chakuchi];
  if (centerClaim) tails.push(`中心: ${centerClaim}`);
  if (nextAxis) tails.push(`次軸: ${nextAxis}`);

  let longform = [body, tails.join("\n")].filter(Boolean).join("\n\n").trim();
  while (longform.length < minLockLength && body.length > 0) {
    longform += `\n\n補強: ${centerClaim || "天聞統合軸"}を保ちつつ、${nextAxis || "自然天聞"}の順で要点を再確認する。`;
  }

  return {
    longform,
    mode,
    centerLockPassed: longform.length >= minLockLength && body.length > 0,
  };
}

export function inferTenmonLongformModeV1(rawMessage: string): TenmonLongformModeV1 {
  const s = String(rawMessage || "");
  if (/(読む|読解|解読)/.test(s)) return "read";
  if (/(提案|計画|構想)/.test(s)) return "proposal";
  if (/(分析|解析|構造)/.test(s)) return "analysis";
  return "reflect";
}
