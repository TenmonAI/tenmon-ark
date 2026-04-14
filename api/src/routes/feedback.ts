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
    return { ok: false, error: "NOTION_TOKEN not configured" };
  }

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

  try {
    const resp = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: NOTION_DB_ID },
        properties,
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      console.error(`[FEEDBACK] Notion API error ${resp.status}: ${errBody}`);
      return { ok: false, error: `Notion API ${resp.status}` };
    }

    const data = (await resp.json()) as any;
    return { ok: true, notionPageId: data.id };
  } catch (e: any) {
    console.error(`[FEEDBACK] Notion save failed:`, e?.message);
    return { ok: false, error: String(e?.message ?? e) };
  }
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
      detail,
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
    if (!detail || typeof detail !== "string" || detail.trim().length === 0) {
      return res.status(400).json({ ok: false, error: "詳細内容は必須です" });
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

    return res.json({
      ok: true,
      receiptNumber,
      notionSaved: notionResult.ok,
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

export { feedbackRouter };
