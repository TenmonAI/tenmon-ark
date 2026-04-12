/* TENMON_NATURAL_ROUTER_V3: 天津金木思考回路フル活用 — メニューゲート廃止 */
export type NaturalType = "greeting" | "datetime" | "other";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isJapanese(message: string): boolean {
  const compact = String(message || "")
    .replace(/[\s\u200B-\u200D\uFEFF]+/g, "")
    .normalize("NFKC");
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(compact);
}

export function formatJstNowCompat(): string {
  const d = new Date();
  const jst = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const yyyy = jst.getFullYear();
  const mm = pad2(jst.getMonth() + 1);
  const dd = pad2(jst.getDate());
  const hh = pad2(jst.getHours());
  const mi = pad2(jst.getMinutes());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi} JST`;
}

export function classifyNaturalCompat(message: string): NaturalType {
  const raw = String(message || "");
  const t = raw.trim().toLowerCase();
  const rawCompact = raw.replace(/[\s\u200B-\u200D\uFEFF]+/g, "");
  const rawCompactNorm = rawCompact.normalize("NFKC");
  const rawCompactNormUnescaped = rawCompactNorm.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) =>
    String.fromCharCode(parseInt(h, 16))
  );

  const JA_GREET_RE =
    /(\u304a\u306f\u3088\u3046|\u3053\u3093\u306b\u3061\u306f|\u3053\u3093\u3070\u3093\u306f|\u306f\u3058\u3081\u307e\u3057\u3066|\u3088\u308d\u3057\u304f)/;

  if (
    JA_GREET_RE.test(rawCompactNorm) ||
    JA_GREET_RE.test(rawCompactNormUnescaped) ||
    /^(hello|hi|hey|good\s+(morning|afternoon|evening)|greetings)\b/.test(t)
  ) {
    return "greeting";
  }

  if (
    /(\u4eca\u65e5|\u304d\u3087\u3046|\u672c\u65e5|\u65e5\u4ed8|\u4f55\u65e5|\u306a\u3093\u306b\u3061|\u4f55\u6642|\u306a\u3093\u3058|\u6642\u9593|\u4f55\u66dc\u65e5|\u66dc\u65e5|\u4eca\u4f55\u6642)/.test(rawCompactNorm) ||
    /\b(date|time|day|today|now)\b/.test(t)
  ) {
    return "datetime";
  }

  return "other";
}

export function naturalRouter(input: { message: string; mode: string }): { handled: boolean; responseText: string } {
  const message = String(input?.message ?? "");
  const typ = classifyNaturalCompat(message);
  const ja = isJapanese(message);

  if (typ === "greeting") {
    return {
      handled: false,
      responseText: ja ? "おはようございます。天聞アークです。" : "Hello. How can I help you today?",
    };
  }

  if (typ === "datetime") {
    const now = formatJstNowCompat();
    return {
      handled: true,
      responseText: ja ? `現在時刻（JST）: ${now}` : `Current time (JST): ${now}`,
    };
  }

  // TENMON_V3: メニューゲート廃止。全ての会話をLLMルートに流す。
  // 天津金木思考回路が全ルートに注入されているため、メニューは不要。
  return {
    handled: false,
    responseText: "",
  };
}
