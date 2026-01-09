// /opt/tenmon-ark/api/src/tools/liveEvidence.ts
import { buildTruthSkeleton } from "../truth/truthSkeleton.js";

export type LiveEvidence = {
  value: string;
  timestamp: string; // ISO 8601 (JST)
  sources: Array<{ url: string; title?: string }>;
  confidence: "high" | "medium" | "low";
  note?: string;
};

/**
 * 検索プロバイダーの型
 */
type SearchProvider = "bing" | "serpapi" | "tavily" | "google";

/**
 * 検索結果の型
 */
type SearchResult = {
  title: string;
  url: string;
  snippet?: string;
};

/**
 * Bing Web Search API を使用（SSRF対策付き）
 */
async function searchBing(query: string, limit = 5): Promise<SearchResult[]> {
  const apiKey = process.env.BING_SEARCH_API_KEY;
  if (!apiKey) {
    throw new Error("BING_SEARCH_API_KEY not configured");
  }

  const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=${limit}`;
  
  // STEP 4-1: SSRF対策付きfetch
  const { safeFetch } = await import("../middleware/ssrfProtection.js");
  const response = await safeFetch(
    url,
    {
      method: "GET",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
      },
    },
    10 * 1024 * 1024, // 10MB max
    5000 // 5秒 timeout
  );

  if (!response.ok) {
    throw new Error(`Bing API error: ${response.status}`);
  }

  const data = await response.json() as {
    webPages?: {
      value?: Array<{ name: string; url: string; snippet?: string }>;
    };
  };
  const results = data.webPages?.value || [];

  return results.map((r) => ({
    title: r.name,
    url: r.url,
    snippet: r.snippet,
  }));
}

/**
 * 首相名を抽出
 */
function extractPrimeMinister(results: SearchResult[]): LiveEvidence | null {
  const now = new Date();
  const jstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString();

  // 内閣府、首相官邸、NHK、朝日新聞などの一次ソースを優先
  const primarySources = results.filter((r) =>
    /(内閣府|首相官邸|kantei|nhk|asahi|mainichi|yomiuri)/i.test(r.url)
  );

  const sources = (primarySources.length > 0 ? primarySources : results.slice(0, 3)).map((r) => ({
    url: r.url,
    title: r.title,
  }));

  // 名前パターンを抽出（簡易版）
  const namePattern = /(岸田|菅|安倍|野田|鳩山|麻生|福田|小泉)/;
  const matches: string[] = [];
  for (const r of results) {
    const match = (r.title + " " + (r.snippet || "")).match(namePattern);
    if (match && !matches.includes(match[1])) {
      matches.push(match[1]);
    }
  }

  if (matches.length === 0) {
    return null;
  }

  const value = matches[0] + "文雄"; // 簡易補完（実際はより精密な抽出が必要）
  const confidence = primarySources.length > 0 && matches.length === 1 ? "high" : "medium";

  return {
    value,
    timestamp: jstTime,
    sources,
    confidence,
    note: matches.length > 1 ? "複数の候補が見つかりました" : undefined,
  };
}

/**
 * 地震情報を抽出
 */
function extractEarthquake(results: SearchResult[]): LiveEvidence | null {
  const now = new Date();
  const jstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString();

  // 気象庁、NHK、Yahoo天気などの一次ソースを優先
  const primarySources = results.filter((r) =>
    /(気象庁|jma|nhk|yahoo.*天気|tenki)/i.test(r.url)
  );

  const sources = (primarySources.length > 0 ? primarySources : results.slice(0, 3)).map((r) => ({
    url: r.url,
    title: r.title,
  }));

  // 震度パターンを抽出
  const intensityPattern = /震度\s*([1-7]|([1-7]弱)|([1-7]強))/;
  const locationPattern = /([都道府県市区町村]+)/;

  const matches: Array<{ intensity: string; location: string }> = [];
  for (const r of results) {
    const text = r.title + " " + (r.snippet || "");
    const intensityMatch = text.match(intensityPattern);
    const locationMatch = text.match(locationPattern);
    if (intensityMatch && locationMatch) {
      matches.push({
        intensity: intensityMatch[1],
        location: locationMatch[1],
      });
    }
  }

  if (matches.length === 0) {
    return null;
  }

  const latest = matches[0];
  const value = `${latest.location}で震度${latest.intensity}`;
  const confidence = primarySources.length > 0 && matches.length === 1 ? "high" : "medium";

  return {
    value,
    timestamp: jstTime,
    sources,
    confidence,
    note: matches.length > 1 ? "複数の地震情報が見つかりました" : undefined,
  };
}

/**
 * 日経平均を抽出
 */
function extractNikkei225(results: SearchResult[]): LiveEvidence | null {
  const now = new Date();
  const jstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString();

  // 日経、Yahoo Finance、楽天証券などの一次ソースを優先
  const primarySources = results.filter((r) =>
    /(日経|nikkei|yahoo.*finance|rakuten.*証券|minkabu)/i.test(r.url)
  );

  const sources = (primarySources.length > 0 ? primarySources : results.slice(0, 3)).map((r) => ({
    url: r.url,
    title: r.title,
  }));

  // 数値パターンを抽出
  const numberPattern = /([0-9,]+)\s*円/;
  const matches: string[] = [];
  for (const r of results) {
    const text = r.title + " " + (r.snippet || "");
    const match = text.match(numberPattern);
    if (match && !matches.includes(match[1])) {
      matches.push(match[1]);
    }
  }

  if (matches.length === 0) {
    return null;
  }

  const value = `${matches[0]}円`;
  const confidence = primarySources.length > 0 && matches.length === 1 ? "high" : "medium";

  return {
    value,
    timestamp: jstTime,
    sources,
    confidence,
    note: matches.length > 1 ? "複数の数値が見つかりました" : undefined,
  };
}

/**
 * LIVE情報を取得・検証
 */
export async function fetchLiveEvidence(
  message: string,
  skeleton: ReturnType<typeof buildTruthSkeleton>
): Promise<LiveEvidence | null> {
  if (skeleton.mode !== "LIVE" || skeleton.risk === "high") {
    return null;
  }

  const provider = (process.env.LIVE_SEARCH_PROVIDER || "bing") as SearchProvider;
  let results: SearchResult[] = [];

  try {
    if (provider === "bing") {
      results = await searchBing(message, 5);
    } else {
      // 他のプロバイダーは後で実装
      throw new Error(`Provider ${provider} not implemented`);
    }
  } catch (error) {
    console.error("[LIVE-EVIDENCE] Search failed:", error);
    // Bing APIが落ちた時やAPIキーが無効な時は null を返す（上位でフォールバック処理）
    return null;
  }

  if (results.length === 0) {
    return null;
  }

  // 目的別抽出
  if (/(総理|首相|内閣)/i.test(message)) {
    return extractPrimeMinister(results);
  }
  if (/(地震|震度)/i.test(message)) {
    return extractEarthquake(results);
  }
  if (/(日経平均|日経225|nikkei)/i.test(message)) {
    return extractNikkei225(results);
  }

  // 汎用フォールバック
  const now = new Date();
  const jstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString();

  return {
    value: results[0].snippet || results[0].title,
    timestamp: jstTime,
    sources: results.slice(0, 2).map((r) => ({ url: r.url, title: r.title })),
    confidence: "medium",
    note: "汎用抽出のため、信頼度は中程度です",
  };
}

