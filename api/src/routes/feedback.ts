/**
 * TENMON_ARK_FOUNDER_FEEDBACK_LOOP_V2 — Phase A
 * POST /api/feedback  → Notion改善要望DB保存 + ローカルJSONフォールバック
 * GET  /api/feedback/history → ローカル送信履歴取得
 */
import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";

const feedbackRouter = Router();

/* ── Notion DB 設定 ── */
const NOTION_DB_ID = "860b3ca8-2286-49b1-ad67-c2c168a87148";
const NOTION_VERSION = "2022-06-28";

/* ── フォールバック保存先 ── */
const FALLBACK_DIR = path.join(process.cwd(), "data", "feedback");

/* ── 受付番号生成 ── */
function generateReceiptNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `FB-${dateStr}-${seq}`;
}

/* ── カテゴリバリデーション ── */
const VALID_CATEGORIES = [
  "宿曜鑑定", "チャット機能", "ダッシュボード", "UI/デザイン",
  "表示・動作の不具合", "新機能の要望", "文章・口調",
  "スマホ使用感", "保存・共有", "その他",
];

const VALID_PRIORITIES = ["高", "中", "低"];

/* ── Notion API ヘルパー ── */
async function saveToNotion(payload: {
  title: string;
  category: string;
  detail: string;
  priority: string;
  receiptNumber: string;
  userId?: string;
  userEmail?: string;
  isFounder?: boolean;
  device?: string;
  pageUrl?: string;
  reproSteps?: string;
  imageUrl?: string;
}): Promise<{ ok: boolean; notionPageId?: string; error?: string }> {
  const notionToken = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY;
  if (!notionToken) {
    console.error(`[FEEDBACK] NOTION_TOKEN not configured. Available env keys: ${Object.keys(process.env).filter(k => k.includes("NOTION")).join(", ") || "(none)"}`);
    return { ok: false, error: "NOTION_TOKEN not configured" };
  }
  console.log(`[FEEDBACK] Notion token present (length=${notionToken.length}, prefix=${notionToken.slice(0, 8)}...)`);

  const properties: Record<string, any> = {
    "タイトル": { title: [{ text: { content: payload.title } }] },
    "カテゴリ": { select: { name: payload.category } },
    "詳細内容": { rich_text: [{ text: { content: payload.detail.slice(0, 2000) } }] },
    "ユーザー優先度": { select: { name: payload.priority } },
    "ステータス": { status: { name: "未着手" } },
    "AI優先度": { select: { name: "未解析" } },
    "受付番号": { rich_text: [{ text: { content: payload.receiptNumber } }] },
    "受信日時": { date: { start: new Date().toISOString() } },
    "Founder区分": { checkbox: payload.isFounder ?? true },
    "構築タスク化": { checkbox: false },
    "類似件数": { number: 0 },
  };

  if (payload.userId) {
    properties["ユーザーID"] = { rich_text: [{ text: { content: payload.userId } }] };
  }
  if (payload.userEmail) {
    properties["ユーザーメール"] = { email: payload.userEmail };
  }
  if (payload.device) {
    properties["使用デバイス"] = { rich_text: [{ text: { content: payload.device } }] };
  }
  if (payload.pageUrl) {
    properties["ページURL"] = { url: payload.pageUrl };
  }
  if (payload.reproSteps) {
    properties["再現手順"] = { rich_text: [{ text: { content: payload.reproSteps.slice(0, 2000) } }] };
  }
  if (payload.imageUrl) {
    properties["添付画像URL"] = { rich_text: [{ text: { content: payload.imageUrl } }] };
  }

  const requestBody = JSON.stringify({
    parent: { database_id: NOTION_DB_ID },
    properties,
  });

  // 最大2回リトライ（ネットワーク一時障害対策）
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[FEEDBACK] Notion API call attempt=${attempt} dbId=${NOTION_DB_ID}`);
      const resp = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${notionToken}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json",
        },
        body: requestBody,
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        console.error(`[FEEDBACK] Notion API error attempt=${attempt} status=${resp.status} body=${errBody}`);
        // 400系はリトライ不要（プロパティ名不一致等）
        if (resp.status >= 400 && resp.status < 500) {
          return { ok: false, error: `Notion API ${resp.status}: ${errBody.slice(0, 200)}` };
        }
        // 500系は1回だけリトライ
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        return { ok: false, error: `Notion API ${resp.status}` };
      }

      const data = (await resp.json()) as any;
      console.log(`[FEEDBACK] Notion save success: pageId=${data.id}`);
      return { ok: true, notionPageId: data.id };
    } catch (e: any) {
      console.error(`[FEEDBACK] Notion save failed attempt=${attempt}:`, e?.message);
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      return { ok: false, error: String(e?.message ?? e) };
    }
  }

  return { ok: false, error: "Notion save: max retries exceeded" };
}

/* ── ローカルフォールバック保存 ── */
function saveToLocal(entry: Record<string, any>): void {
  try {
    if (!fs.existsSync(FALLBACK_DIR)) {
      fs.mkdirSync(FALLBACK_DIR, { recursive: true });
    }
    const filename = `${entry.receiptNumber}.json`;
    fs.writeFileSync(
      path.join(FALLBACK_DIR, filename),
      JSON.stringify(entry, null, 2),
      "utf-8"
    );
    console.log(`[FEEDBACK] Local fallback saved: ${filename}`);
  } catch (e: any) {
    console.error(`[FEEDBACK] Local save failed:`, e?.message);
  }
}

/* ── POST /api/feedback ── */
feedbackRouter.post("/feedback", async (req: Request, res: Response) => {
  try {
    const {
      title,
      category,
      detail: rawDetail,
      body: rawBody,          // curlテスト等で "body" キーが使われた場合のフォールバック
      priority = "中",
      userId,
      userEmail,
      isFounder = true,
      device,
      pageUrl,
      reproSteps,
      imageUrl,
    } = req.body;

    /* バリデーション */
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ ok: false, error: "タイトルは必須です" });
    }
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ ok: false, error: `カテゴリが不正です。選択肢: ${VALID_CATEGORIES.join(", ")}` });
    }
    // "detail" が無ければ "body" をフォールバックとして使用
    const detail = rawDetail || rawBody;
    if (!detail || typeof detail !== "string" || detail.trim().length === 0) {
      return res.status(400).json({ ok: false, error: "詳細内容は必須です（detail または body キーで送信してください）" });
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ ok: false, error: `優先度が不正です。選択肢: ${VALID_PRIORITIES.join(", ")}` });
    }

    const receiptNumber = generateReceiptNumber();

    const payload = {
      title: title.trim(),
      category,
      detail: detail.trim(),
      priority,
      receiptNumber,
      userId,
      userEmail,
      isFounder,
      device,
      pageUrl,
      reproSteps,
      imageUrl,
    };

    /* Notion保存を試行 */
    const notionResult = await saveToNotion(payload);

    /* 常にローカルにも保存（フォールバック兼アーカイブ） */
    saveToLocal({
      ...payload,
      notionSaved: notionResult.ok,
      notionPageId: notionResult.notionPageId,
      notionError: notionResult.error,
      createdAt: new Date().toISOString(),
    });

    /* FIX-C: 管理向けログ出力 */
    console.log(`[FEEDBACK] feedbackId=${receiptNumber} notionSaved=${notionResult.ok} notionPageId=${notionResult.notionPageId || "(none)"} saveStatus=${notionResult.ok ? "notion_ok" : "local_fallback"}`);

    return res.json({
      ok: true,
      receiptNumber,
      notionSaved: notionResult.ok,
      notionPageId: notionResult.notionPageId || null,
      saveStatus: notionResult.ok ? "notion_ok" : "local_fallback",
      message: notionResult.ok
        ? `ご要望を承りました（受付番号: ${receiptNumber}）`
        : `ご要望を承りました（受付番号: ${receiptNumber}）※ 一時的にローカル保存されました。後ほどNotionに同期されます。`,
    });
  } catch (e: any) {
    console.error(`[FEEDBACK] Unexpected error:`, e);
    return res.status(500).json({ ok: false, error: "サーバーエラーが発生しました" });
  }
});

/* ── GET /api/feedback/history ── */
feedbackRouter.get("/feedback/history", async (_req: Request, res: Response) => {
  try {
    if (!fs.existsSync(FALLBACK_DIR)) {
      return res.json({ ok: true, items: [], count: 0 });
    }
    const files = fs.readdirSync(FALLBACK_DIR)
      .filter(f => f.endsWith(".json"))
      .sort()
      .reverse()
      .slice(0, 50);

    const items = files.map(f => {
      try {
        return JSON.parse(fs.readFileSync(path.join(FALLBACK_DIR, f), "utf-8"));
      } catch {
        return null;
      }
    }).filter(Boolean);

    return res.json({ ok: true, items, count: items.length });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

/* ── POST /api/feedback/generate-card ── */
/* FIX-D: 改善要望から修正カードを自動生成する */
feedbackRouter.post("/feedback/generate-card", async (req: Request, res: Response) => {
  try {
    const { receiptNumber } = req.body;
    if (!receiptNumber) {
      return res.status(400).json({ ok: false, error: "receiptNumber は必須です" });
    }

    /* ローカルJSONから要望データを取得 */
    const filePath = path.join(FALLBACK_DIR, `${receiptNumber}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ ok: false, error: `要望 ${receiptNumber} が見つかりません` });
    }
    const feedback = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    /* LLM でカード生成 */
    const { llmChat } = await import("../core/llmWrapper.js");
    const prompt = `あなたは天聞アーク（TENMON-ARK）のプロダクト改善アシスタントです。
以下のユーザー改善要望を分析し、構造化された修正カードを生成してください。

## ユーザー改善要望
- 受付番号: ${feedback.receiptNumber}
- カテゴリ: ${feedback.category}
- タイトル: ${feedback.title}
- 詳細内容: ${feedback.detail}
- 優先度: ${feedback.priority}
- 再現手順: ${feedback.reproSteps || "なし"}
- デバイス: ${feedback.device || "不明"}

## 出力フォーマット（JSON）
以下のJSON形式で出力してください。JSON以外の文字は出力しないでください。
{
  "ai_summary": "要望の要約（1-2文）",
  "problem_type": "bug | ux | feature | content | performance | other のいずれか",
  "ai_priority": "critical | high | medium | low のいずれか",
  "impact_scope": "影響範囲の説明（1文）",
  "suggested_fix_title": "修正カードのタイトル案",
  "suggested_fix_detail": "修正内容の提案（2-3文）",
  "acceptance_test": "受入テスト条件（1-2文）",
  "user_facing_note": "ユーザーへの返答文案（丁寧な日本語で）"
}`;

    const llmResult = await llmChat({
      system: "あなたはプロダクト改善の専門家です。JSON形式で回答してください。",
      user: prompt,
      maxTokens: 1000,
      timeout: 30000,
    });

    /* LLMレスポンスからJSONを抽出 */
    let card: Record<string, any> = {};
    try {
      // JSON部分を抽出（```json ... ``` やプレーンJSON対応）
      const jsonMatch = llmResult.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        card = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("JSON not found in LLM response");
      }
    } catch (parseErr: any) {
      console.error(`[FEEDBACK] Card generation JSON parse error:`, parseErr?.message, llmResult.text.slice(0, 200));
      return res.status(500).json({ ok: false, error: "修正カードの生成に失敗しました（JSON解析エラー）" });
    }

    /* Notion DBに追加プロパティを更新（notionPageIdがある場合） */
    if (feedback.notionPageId) {
      const notionToken = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY;
      if (notionToken) {
        try {
          const updateResp = await fetch(`https://api.notion.com/v1/pages/${feedback.notionPageId}`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${notionToken}`,
              "Notion-Version": NOTION_VERSION,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              properties: {
                ...(card.ai_summary ? { "AI要約": { rich_text: [{ text: { content: card.ai_summary } }] } } : {}),
                ...(card.ai_priority ? { "AI優先度": { select: { name: card.ai_priority } } } : {}),
                ...(card.suggested_fix_title ? { "修正カード案": { rich_text: [{ text: { content: `${card.suggested_fix_title}: ${card.suggested_fix_detail || ""}`.slice(0, 2000) } }] } } : {}),
                "構築タスク化": { checkbox: true },
              },
            }),
          });
          if (!updateResp.ok) {
            const errText = await updateResp.text();
            console.warn(`[FEEDBACK] Notion update warning: ${updateResp.status} ${errText.slice(0, 200)}`);
          } else {
            console.log(`[FEEDBACK] Notion page updated with card: ${feedback.notionPageId}`);
          }
        } catch (notionErr: any) {
          console.warn(`[FEEDBACK] Notion update failed:`, notionErr?.message);
        }
      }
    }

    /* ローカルJSONにもカード情報を追記 */
    feedback.fixCard = card;
    feedback.fixCardGeneratedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(feedback, null, 2), "utf-8");

    console.log(`[FEEDBACK] Fix card generated for ${receiptNumber}: ${card.suggested_fix_title}`);

    return res.json({
      ok: true,
      receiptNumber,
      card,
      notionUpdated: !!feedback.notionPageId,
      provider: llmResult.provider,
      model: llmResult.model,
    });
  } catch (e: any) {
    console.error(`[FEEDBACK] Card generation error:`, e);
    return res.status(500).json({ ok: false, error: "修正カード生成中にエラーが発生しました" });
  }
});

/* ── GET /api/feedback/cards ── */
/* 生成済み修正カード一覧を取得 */
feedbackRouter.get("/feedback/cards", async (_req: Request, res: Response) => {
  try {
    if (!fs.existsSync(FALLBACK_DIR)) {
      return res.json({ ok: true, items: [], count: 0 });
    }
    const files = fs.readdirSync(FALLBACK_DIR)
      .filter(f => f.endsWith(".json"))
      .sort()
      .reverse();

    const items = files
      .map(f => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(FALLBACK_DIR, f), "utf-8"));
          if (data.fixCard) return data;
          return null;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return res.json({ ok: true, items, count: items.length });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

export { feedbackRouter };
