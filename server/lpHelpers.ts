import { getAllSiteInfo } from "./db";

/**
 * サイト情報からLP用のソフトペルソナシステムプロンプトを構築
 */
export async function buildLpSoftPersonaPromptFromSiteInfo(): Promise<string> {
  const siteInfoData = await getAllSiteInfo();
  
  // デフォルト値
  const releaseStatus = siteInfoData.find(item => item.key === "release_status")?.value ?? "開発中";
  const founderReleaseDate = siteInfoData.find(item => item.key === "founder_release_date")?.value ?? "2025-02-28";
  const officialReleaseDate = siteInfoData.find(item => item.key === "official_release_date")?.value ?? "2026-03-21";
  const freePlanAvailable = siteInfoData.find(item => item.key === "free_plan_available")?.value ?? "false";

  return `あなたは「TENMON-ARK」という高度なAI会話エンジンのLP用Q&Aアシスタントです。

【重要な前提情報】
- 現在のリリース状態: ${releaseStatus}
- Founder先行アクセス開始予定: ${founderReleaseDate}
- 正式リリース予定: ${officialReleaseDate}
- 無料プラン提供: ${freePlanAvailable === "true" ? "あり" : "なし"}

【回答の原則】
1. 簡潔に、1〜3文以内で回答してください
2. 質問に対して直接的に答えてください
3. セールス文や宣伝文は一切含めないでください
4. 「詳しくはこちら」などのリンク誘導は禁止です
5. 上記の前提情報に基づいて正確に回答してください
6. 温かく、親しみやすい語り口で回答してください

【禁止事項】
- 構文タグ（<section>、<ul>など）の出力
- セールス文や宣伝文
- 関連コンテンツの提案
- リンクやURL
- 長文の説明（3文を超える回答）`;
}

/**
 * LP用レスポンスフィルター
 * セールス文、構文タグ、リンクなどを除去
 */
export function filterLpSoftResponse(response: string): string {
  let filtered = response;
  
  // HTMLタグを除去
  filtered = filtered.replace(/<[^>]*>/g, "");
  
  // セールス文のパターンを除去
  const salesPatterns = [
    /詳しくは.*?(?:こちら|サイト|ページ|リンク)/gi,
    /ぜひ.*?(?:お試し|ご利用|ご覧)/gi,
    /今すぐ.*?(?:登録|申し込み|利用)/gi,
  ];
  
  salesPatterns.forEach(pattern => {
    filtered = filtered.replace(pattern, "");
  });
  
  // URLを除去
  filtered = filtered.replace(/https?:\/\/[^\s]+/g, "");
  
  // 複数の改行を1つにまとめる
  filtered = filtered.replace(/\n{3,}/g, "\n\n");
  
  // 前後の空白を削除
  filtered = filtered.trim();
  
  return filtered;
}

/**
 * 旧字体マッピング適用
 * 新字体を旧字体に変換
 */
export function applyKyujiMapping(text: string): Promise<string> {
  // 基本的な旧字体マッピング
  const kyujiMap: Record<string, string> = {
    "聞": "聞",
    "会": "會",
    "話": "話",
    "対": "對",
    "応": "應",
    "学": "學",
    "変": "變",
    "換": "換",
    "質": "質",
    "問": "問",
    "答": "答",
    "説": "說",
    "明": "明",
    "理": "理",
    "解": "解",
    "機": "機",

    "実": "實",
    "際": "際",
    "情": "情",
    "報": "報",
    "提": "提",
    "供": "供",
    "利": "利",
    "用": "用",
    "可": "可",

    "開": "開",
    "発": "發",
    "予": "豫",
    "定": "定",
    "無": "無",
    "料": "料",
  };

  let result = text;
  for (const [shinji, kyuji] of Object.entries(kyujiMap)) {
    result = result.replace(new RegExp(shinji, "g"), kyuji);
  }
  
  return Promise.resolve(result);
}
