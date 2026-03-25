/**
 * TENMON_FACTUAL_WEATHER_ROUTE_CURSOR_AUTO_V1 — wttr.in 単一ソースの簡易天気取得
 */

export type WeatherLocationV1 = { en: string; jp: string };

/** 長い地名を先に（県名優先） */
const JP_TO_EN: { re: RegExp; en: string; jp: string }[] = [
  { re: /大分県|大分/u, en: "Oita", jp: "大分" },
  { re: /福岡県|福岡/u, en: "Fukuoka", jp: "福岡" },
  { re: /熊本県|熊本/u, en: "Kumamoto", jp: "熊本" },
  { re: /宮崎県|宮崎/u, en: "Miyazaki", jp: "宮崎" },
  { re: /鹿児島県|鹿児島/u, en: "Kagoshima", jp: "鹿児島" },
  { re: /北海道|札幌/u, en: "Sapporo", jp: "札幌" },
  { re: /東京都|東京/u, en: "Tokyo", jp: "東京" },
  { re: /大阪府|大阪/u, en: "Osaka", jp: "大阪" },
  { re: /京都府|京都市|京都/u, en: "Kyoto", jp: "京都" },
  { re: /名古屋/u, en: "Nagoya", jp: "名古屋" },
  { re: /横浜/u, en: "Yokohama", jp: "横浜" },
  { re: /神戸/u, en: "Kobe", jp: "神戸" },
  { re: /広島/u, en: "Hiroshima", jp: "広島" },
  { re: /仙台/u, en: "Sendai", jp: "仙台" },
  { re: /沖縄|那覇/u, en: "Naha", jp: "沖縄" },
  { re: /千葉/u, en: "Chiba", jp: "千葉" },
  { re: /埼玉/u, en: "Saitama", jp: "埼玉" },
  { re: /神奈川/u, en: "Yokohama", jp: "神奈川" },
  { re: /愛知/u, en: "Nagoya", jp: "愛知" },
  { re: /兵庫/u, en: "Kobe", jp: "兵庫" },
];

const EN_CITY = /\b(Tokyo|Osaka|Kyoto|Yokohama|Nagoya|Fukuoka|Sapporo|Kobe|Sendai|Hiroshima|Oita|Kumamoto|Naha|Chiba|Saitama)\b/i;

const EN_DESC_JP: Record<string, string> = {
  Clear: "晴れ",
  Sunny: "晴れ",
  "Partly cloudy": "くもり",
  Cloudy: "くもり",
  Overcast: "くもり",
  Mist: "霧",
  Fog: "霧",
  "Light rain": "小雨",
  Rain: "雨",
  Drizzle: "小雨",
  Showers: "にわか雨",
  Snow: "雪",
  "Light snow": "小雪",
  Thunderstorm: "雷雨",
};

function mapDescJp(en: string): string {
  const t = String(en || "").trim();
  if (!t) return "状況不明";
  if (EN_DESC_JP[t]) return EN_DESC_JP[t];
  const lower = t.toLowerCase();
  for (const [k, v] of Object.entries(EN_DESC_JP)) {
    if (lower.includes(k.toLowerCase())) return v;
  }
  return t;
}

export function extractWeatherLocationV1(msg: string): WeatherLocationV1 | null {
  const s = String(msg || "");
  for (const { re, en, jp } of JP_TO_EN) {
    if (re.test(s)) return { en, jp };
  }
  const m = s.match(EN_CITY);
  if (m) {
    const raw = m[1];
    return { en: raw, jp: raw };
  }
  return null;
}

export type FetchWeatherWttrResultV1 = { ok: boolean; summary: string };

export async function fetchWeatherWttrInV1(
  locationEn: string,
  opts?: { wantTomorrow?: boolean },
): Promise<FetchWeatherWttrResultV1> {
  const loc = String(locationEn || "").trim();
  if (!loc) return { ok: false, summary: "" };
  const url = `https://wttr.in/${encodeURIComponent(loc)}?format=j1`;
  try {
    const ac = new AbortController();
    const id = setTimeout(() => ac.abort(), 12_000);
    const res = await fetch(url, {
      signal: ac.signal,
      headers: {
        "User-Agent": "curl/8.5.0",
        Accept: "application/json",
      },
    });
    clearTimeout(id);
    if (!res.ok) return { ok: false, summary: "" };
    const data = (await res.json()) as {
      current_condition?: Array<{ temp_C?: string; weatherDesc?: Array<{ value?: string }> }>;
      weather?: Array<{
        date?: string;
        maxtempC?: string;
        mintempC?: string;
        hourly?: Array<{ weatherDesc?: Array<{ value?: string }> }>;
      }>;
    };
    const wantTomorrow = Boolean(opts?.wantTomorrow);
    const wx = Array.isArray(data.weather) ? data.weather : [];

    if (wantTomorrow) {
      const day = wx[1] ?? wx[0];
      if (!day) return { ok: false, summary: "" };
      const max = String(day.maxtempC ?? "").trim();
      const min = String(day.mintempC ?? "").trim();
      const midHour = Array.isArray(day.hourly) ? day.hourly[Math.floor(day.hourly.length / 2)] : undefined;
      const descEn = String(midHour?.weatherDesc?.[0]?.value ?? "").trim();
      const descJp = mapDescJp(descEn);
      const date = String(day.date ?? "").trim();
      return {
        ok: true,
        summary: `明日の予報（${date || "—"}）: 最高 ${max || "?"}°C / 最低 ${min || "?"}°C、目安は ${descJp} です。`,
      };
    }

    const cur = Array.isArray(data.current_condition) ? data.current_condition[0] : undefined;
    const temp = String(cur?.temp_C ?? "").trim();
    const descEn = String(cur?.weatherDesc?.[0]?.value ?? "").trim();
    const descJp = mapDescJp(descEn);
    if (cur && (temp || descEn)) {
      return {
        ok: true,
        summary: `現在 ${temp || "?"}°C、${descJp}。`,
      };
    }
    const day0 = wx[0];
    if (day0) {
      const max = String(day0.maxtempC ?? "").trim();
      const min = String(day0.mintempC ?? "").trim();
      return {
        ok: true,
        summary: `本日の予報: 最高 ${max || "?"}°C / 最低 ${min || "?"}°C。`,
      };
    }
    return { ok: false, summary: "" };
  } catch {
    return { ok: false, summary: "" };
  }
}
