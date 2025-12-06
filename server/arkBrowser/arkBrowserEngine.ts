/**
 * Ark Browser Engine
 * AI統合ブラウザのコアエンジン
 */

import puppeteer, { Browser, Page } from "puppeteer";
import { invokeLLM } from "../_core/llm";
import { convertToKotodama, calculateFireWaterBalance } from "../kotodama/kotodamaJapaneseCorrectorEngine";
import { applyArkCore, ArkCoreOptions } from "../arkCoreIntegration";

let browserInstance: Browser | null = null;

/**
 * ブラウザインスタンスを取得（シングルトン）
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    });
  }
  return browserInstance;
}

/**
 * ページを取得
 */
export async function fetchPage(url: string): Promise<{
  url: string;
  title: string;
  content: string;
  html: string;
  screenshot?: string;
}> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    const title = await page.title();
    const content = await page.evaluate(() => document.body.innerText);
    const html = await page.content();

    // スクリーンショットを取得（オプション）
    const screenshot = await page.screenshot({ encoding: "base64", type: "png" });

    return {
      url,
      title,
      content,
      html,
      screenshot: screenshot as string,
    };
  } finally {
    await page.close();
  }
}

/**
 * ページ内容を要約（Ark Core統合）
 */
export async function summarizePage(content: string, maxLength: number = 500): Promise<string> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that summarizes web page content concisely.",
      },
      {
        role: "user",
        content: `Summarize the following web page content in ${maxLength} characters or less:\n\n${content.slice(0, 5000)}`,
      },
    ],
  });

  const messageContent = response.choices[0]?.message?.content;
  if (typeof messageContent === "string") {
    // Ark Core統合：要約結果を靈性日本語に変換
    const arkCoreResult = await applyArkCore(messageContent, {
      applyKJCE: true,
      applyOKRE: true,
      applyAncient50Sound: false,
      optimizeFireWater: true,
    });
    return arkCoreResult.text;
  }
  return "要約に失敗しました";
}

/**
 * ページを言灵OS変換（Ark Core統合）
 */
export async function convertPageToSpiritual(content: string): Promise<{
  original: string;
  converted: string;
  fireWaterBalance: { fire: number; water: number; balance: number };
  spiritualScore: number;
  appliedTransformations: string[];
}> {
  // Ark Core統合：KJCE/OKRE/古五十音を統合適用
  const arkCoreResult = await applyArkCore(content, {
    applyKJCE: true,
    applyOKRE: true,
    applyAncient50Sound: false,
    optimizeFireWater: true,
  });

  const fireWaterBalance = calculateFireWaterBalance(arkCoreResult.text);

  return {
    original: content,
    converted: arkCoreResult.text,
    fireWaterBalance,
    spiritualScore: arkCoreResult.spiritualScore,
    appliedTransformations: arkCoreResult.appliedTransformations,
  };
}

/**
 * 危険サイトを検知
 */
export async function detectDangerousSite(url: string, content: string): Promise<{
  isDangerous: boolean;
  reason?: string;
  score: number;
}> {
  // 危険なキーワードのリスト
  const dangerousKeywords = [
    "phishing",
    "scam",
    "malware",
    "virus",
    "hack",
    "crack",
    "piracy",
    "illegal",
    "fraud",
    "詐欺",
    "フィッシング",
    "マルウェア",
    "ウイルス",
    "不正",
    "違法",
  ];

  // URLチェック
  const suspiciousUrlPatterns = [
    /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, // IPアドレス
    /[a-z0-9]{20,}/, // 長いランダム文字列
    /bit\.ly|tinyurl|goo\.gl/, // 短縮URL
  ];

  let dangerScore = 0;
  let reasons: string[] = [];

  // URLパターンチェック
  for (const pattern of suspiciousUrlPatterns) {
    if (pattern.test(url)) {
      dangerScore += 30;
      reasons.push("Suspicious URL pattern detected");
      break;
    }
  }

  // コンテンツキーワードチェック
  const lowerContent = content.toLowerCase();
  for (const keyword of dangerousKeywords) {
    if (lowerContent.includes(keyword.toLowerCase())) {
      dangerScore += 20;
      reasons.push(`Dangerous keyword detected: ${keyword}`);
    }
  }

  // HTTPSチェック
  if (!url.startsWith("https://")) {
    dangerScore += 10;
    reasons.push("Not using HTTPS");
  }

  const isDangerous = dangerScore >= 50;

  return {
    isDangerous,
    reason: reasons.join(", "),
    score: Math.min(dangerScore, 100),
  };
}

/**
 * ページの靈性スコアを計算
 */
export async function calculatePageSpiritualScore(content: string): Promise<{
  score: number;
  fireWaterBalance: { fire: number; water: number; balance: number };
  recommendation: string;
}> {
  const fireWaterBalance = calculateFireWaterBalance(content);

  // 靈性スコアの計算
  // バランスが0.4-0.6の範囲にあるほど高スコア
  const balanceScore = 100 - Math.abs(fireWaterBalance.balance - 0.5) * 200;

  // コンテンツの質を評価（簡易版）
  const contentQuality = Math.min(content.length / 100, 50); // 長さに基づく質の評価

  const totalScore = Math.round((balanceScore + contentQuality) / 2);

  let recommendation = "";
  if (totalScore >= 80) {
    recommendation = "このページは靈性的にバランスが取れています。";
  } else if (totalScore >= 60) {
    recommendation = "このページは一定の靈性を持っていますが、改善の余地があります。";
  } else {
    recommendation = "このページは靈性的にバランスが取れていません。注意して閲覧してください。";
  }

  return {
    score: totalScore,
    fireWaterBalance,
    recommendation,
  };
}

/**
 * ブラウザを閉じる
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * タブ管理
 */
export interface BrowserTab {
  id: string;
  url: string;
  title: string;
  createdAt: Date;
}

const tabs: Map<string, BrowserTab> = new Map();

export function createTab(url: string): BrowserTab {
  const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const tab: BrowserTab = {
    id,
    url,
    title: url,
    createdAt: new Date(),
  };
  tabs.set(id, tab);
  return tab;
}

export function getTab(id: string): BrowserTab | undefined {
  return tabs.get(id);
}

export function getAllTabs(): BrowserTab[] {
  return Array.from(tabs.values());
}

export function closeTab(id: string): boolean {
  return tabs.delete(id);
}

export function updateTab(id: string, updates: Partial<BrowserTab>): BrowserTab | undefined {
  const tab = tabs.get(id);
  if (tab) {
    Object.assign(tab, updates);
    tabs.set(id, tab);
    return tab;
  }
  return undefined;
}
