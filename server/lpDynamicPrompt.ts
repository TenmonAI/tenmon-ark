import * as db from "./db";

/**
 * LP Dynamic System Prompt Generator
 * Site Info Memory から動的に LP の System Prompt を生成
 * 
 * これにより、LPチャットが「今使えますか？」などの質問に対して
 * 正確な回答を返せるようになる
 */

export interface LpSystemPromptConfig {
  releaseStatus: "pre_release" | "founder_only" | "public_beta" | "public_release";
  founderReleaseDate?: string; // ISO 8601 format
  publicReleaseDate?: string;
  freePlanAvailable: boolean;
  basicPlanAvailable: boolean;
  proPlanAvailable: boolean;
  founderPlanAvailable: boolean;
  currentFeatures: string[]; // 現在利用可能な機能リスト
  upcomingFeatures: string[]; // 今後追加予定の機能リスト
}

/**
 * Site Info Memory から設定を取得
 */
export async function getLpConfig(): Promise<LpSystemPromptConfig> {
  console.log('[LP-DEBUG] getLpConfig: Fetching site info from database');
  
  const releaseStatus = await db.getSiteInfo("release_status");
  const founderReleaseDate = await db.getSiteInfo("founder_release_date");
  const publicReleaseDate = await db.getSiteInfo("public_release_date");
  const freePlanAvailable = await db.getSiteInfo("free_plan_available");
  const basicPlanAvailable = await db.getSiteInfo("basic_plan_available");
  const proPlanAvailable = await db.getSiteInfo("pro_plan_available");
  const founderPlanAvailable = await db.getSiteInfo("founder_plan_available");
  const currentFeatures = await db.getSiteInfo("current_features");
  const upcomingFeatures = await db.getSiteInfo("upcoming_features");

  console.log('[LP-DEBUG] Site info fetched:', {
    releaseStatus,
    founderReleaseDate,
    publicReleaseDate,
    freePlanAvailable,
    basicPlanAvailable,
    proPlanAvailable,
    founderPlanAvailable,
    currentFeatures,
    upcomingFeatures,
  });

  const config = {
    releaseStatus: (releaseStatus ?? "pre_release") as any,
    founderReleaseDate: founderReleaseDate ?? undefined,
    publicReleaseDate: publicReleaseDate ?? undefined,
    freePlanAvailable: (freePlanAvailable ?? "false") === "true",
    basicPlanAvailable: (basicPlanAvailable ?? "false") === "true",
    proPlanAvailable: (proPlanAvailable ?? "false") === "true",
    founderPlanAvailable: (founderPlanAvailable ?? "true") === "true",
    currentFeatures: currentFeatures ? JSON.parse(currentFeatures) : [],
    upcomingFeatures: upcomingFeatures ? JSON.parse(upcomingFeatures) : [],
  };

  console.log('[LP-DEBUG] Parsed config:', config);

  return config;
}

/**
 * LP Soft Persona System Prompt を動的生成
 */
export async function generateLpSoftPersonaSystemPrompt(language: string = "ja"): Promise<string> {
  console.log('[LP-DEBUG] generateLpSoftPersonaSystemPrompt: Starting with language:', language);
  
  const config = await getLpConfig();
  
  console.log('[LP-DEBUG] Config loaded:', config);

  // リリース状況に応じたメッセージ
  let releaseMessage = "";
  if (config.releaseStatus === "pre_release") {
    releaseMessage = language === "ja"
      ? "現在、TENMON-ARKは正式リリース前の開発段階です。"
      : "TENMON-ARK is currently in pre-release development stage.";
    
    if (config.founderReleaseDate) {
      releaseMessage += language === "ja"
        ? `\nFounder Edition（創業者版）は ${config.founderReleaseDate} 頃に先行アクセス開始予定です。`
        : `\nFounder Edition will be available around ${config.founderReleaseDate}.`;
    }
  } else if (config.releaseStatus === "founder_only") {
    releaseMessage = language === "ja"
      ? "現在、Founder Edition（創業者版）のみ先行アクセス可能です。一般公開は準備中です。"
      : "Currently, only Founder Edition is available for early access. Public release is in preparation.";
  } else if (config.releaseStatus === "public_beta") {
    releaseMessage = language === "ja"
      ? "現在、パブリックベータ版として一般公開中です。"
      : "Currently available as public beta.";
  } else {
    releaseMessage = language === "ja"
      ? "TENMON-ARKは正式リリースされ、どなたでもご利用いただけます。"
      : "TENMON-ARK is officially released and available for everyone.";
  }

  // プラン利用可能状況
  const availablePlans: string[] = [];
  if (config.founderPlanAvailable) availablePlans.push("Founder");
  if (config.proPlanAvailable) availablePlans.push("Pro");
  if (config.basicPlanAvailable) availablePlans.push("Basic");
  if (config.freePlanAvailable) availablePlans.push("Free");

  const planMessage = language === "ja"
    ? `現在利用可能なプラン: ${availablePlans.length > 0 ? availablePlans.join(", ") : "準備中"}`
    : `Currently available plans: ${availablePlans.length > 0 ? availablePlans.join(", ") : "Coming soon"}`;

  // System Prompt 生成
  const systemPrompt = language === "ja" ? `
あなたは TENMON-ARK（天聞アーク）の公式ランディングページに配置された AI アシスタントです。
訪問者の質問に対して、親しみやすく、正確に、そして誠実に回答してください。

## 現在のリリース状況
${releaseMessage}

## プラン情報
${planMessage}

## 重要な回答ルール
1. **「今使えますか？」という質問には、上記のリリース状況を正確に伝えてください**
2. **「Freeプランは使えますか？」という質問には、プラン情報を正確に伝えてください**
3. 存在しない機能やプランについては、「現在は提供していません」と明確に伝えてください
4. 将来の機能については「今後追加予定です」と伝え、確定していない情報は断言しないでください
5. 訪問者が興味を持った場合は、Founder Edition への参加を案内してください

## TENMON-ARK の概要
TENMON-ARK は、Twin-Core Engine（火・水・霊核）、天津金木アルゴリズム、言灵エンジンを搭載した次世代 AI 国家 OS です。
単なるチャットボットではなく、ユーザーの思考を深化させ、創造性を引き出す「霊核 AI」を目指しています。

## 対応言語
日本語と英語の両方に対応しています。訪問者の言語に合わせて自然に回答してください。

## トーン
- 親しみやすく、でも専門的
- 誠実で、誇張しない
- 訪問者の興味を引き出す
- 技術的な質問には詳しく、一般的な質問にはわかりやすく
` : `
You are an AI assistant placed on the official landing page of TENMON-ARK.
Please answer visitors' questions in a friendly, accurate, and honest manner.

## Current Release Status
${releaseMessage}

## Plan Information
${planMessage}

## Important Response Rules
1. **For "Is it available now?" questions, accurately convey the release status above**
2. **For "Is the Free plan available?" questions, accurately convey the plan information**
3. For non-existent features or plans, clearly state "Currently not available"
4. For future features, say "Planned for future release" and avoid making definitive claims about unconfirmed information
5. If visitors show interest, guide them to join the Founder Edition

## About TENMON-ARK
TENMON-ARK is a next-generation AI National OS equipped with Twin-Core Engine (Fire, Water, Spirit Core), Amatsu-Kanagi Algorithm, and Kotodama Engine.
It's not just a chatbot, but a "Spirit Core AI" that aims to deepen users' thinking and draw out creativity.

## Supported Languages
Supports both Japanese and English. Respond naturally in the visitor's language.

## Tone
- Friendly yet professional
- Honest without exaggeration
- Engaging and interesting
- Detailed for technical questions, clear for general questions
`;

  return systemPrompt.trim();
}

/**
 * 初期データをセットアップ（開発用）
 */
export async function setupInitialSiteInfo() {
  await db.upsertSiteInfo({
    key: "release_status",
    value: "pre_release",
    description: "Current release status: pre_release, founder_only, public_beta, public_release",
  });

  await db.upsertSiteInfo({
    key: "founder_release_date",
    value: "2025-02-28",
    description: "Founder Edition early access date (ISO 8601 format)",
  });

  await db.upsertSiteInfo({
    key: "public_release_date",
    value: "2025-04-01",
    description: "Public release date (ISO 8601 format)",
  });

  await db.upsertSiteInfo({
    key: "free_plan_available",
    value: "false",
    description: "Whether Free plan is available",
  });

  await db.upsertSiteInfo({
    key: "basic_plan_available",
    value: "false",
    description: "Whether Basic plan is available",
  });

  await db.upsertSiteInfo({
    key: "pro_plan_available",
    value: "false",
    description: "Whether Pro plan is available",
  });

  await db.upsertSiteInfo({
    key: "founder_plan_available",
    value: "true",
    description: "Whether Founder plan is available",
  });

  await db.upsertSiteInfo({
    key: "current_features",
    value: JSON.stringify([
      "Twin-Core Engine",
      "Kotodama Engine",
      "Amatsu-Kanagi Algorithm",
      "Chat Interface",
      "Voice Input",
    ]),
    description: "Currently available features (JSON array)",
  });

  await db.upsertSiteInfo({
    key: "upcoming_features",
    value: JSON.stringify([
      "Custom TENMON-ARK",
      "Site Crawler",
      "Advanced Memory System",
      "Multi-modal Input",
    ]),
    description: "Upcoming features (JSON array)",
  });

  console.log("[Site Info] Initial data setup completed");
}
