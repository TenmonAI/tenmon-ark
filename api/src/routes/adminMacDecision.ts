/**
 * POST /api/admin/mac/decision
 * Mac スクリーンショットを Vision で解釈し、次の操作を JSON のみで返す（founder guard 必須）。
 *
 * Screenshot raw 保存ポリシー:
 * - 既定: ディスクに保存しない（リクエスト処理中のメモリのみ）。
 * - デバッグ: TENMON_MAC_DECISION_SCREENSHOT_DEBUG_DIR が設定されている場合のみ、
 *   {dir}/{job_id}_{iso}.png に保存。運用側でローテーション・削除を行うこと（PII/画面情報を含む）。
 */
import { Router, type Request, type Response } from "express";
import express from "express";
import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { requireFounderOrExecutorBearer } from "../founder/executorTokenV1.js";

export const adminMacDecisionRouter = Router();

const jsonLarge = express.json({ limit: "32mb" });

const ACTIONS = new Set(["click", "type", "paste", "wait", "done", "fail"]);

export type MacDecisionResponseV1 = {
  action: "click" | "type" | "paste" | "wait" | "done" | "fail";
  x: number | null;
  y: number | null;
  text: string;
  reason: string;
};

function parseScreenshotInput(raw: unknown): { ok: true; b64: string; mime: string } | { ok: false; err: string } {
  if (raw === undefined || raw === null) return { ok: false, err: "screenshot_required" };
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return { ok: false, err: "screenshot_empty" };
  const dataUrl = /^data:([^;]+);base64,(.+)$/s.exec(s);
  if (dataUrl) {
    const mime = String(dataUrl[1] || "image/png").trim() || "image/png";
    const b64 = String(dataUrl[2] || "").replace(/\s/g, "");
    if (!b64) return { ok: false, err: "screenshot_bad_data_url" };
    return { ok: true, b64, mime };
  }
  const b64 = s.replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/=]+$/.test(b64)) return { ok: false, err: "screenshot_invalid_base64" };
  return { ok: true, b64, mime: "image/png" };
}

function maybePersistDebugScreenshot(jobId: string, buf: Buffer): void {
  const dir = String(process.env.TENMON_MAC_DECISION_SCREENSHOT_DEBUG_DIR || "").trim();
  if (!dir) return;
  const safeJob = String(jobId || "unknown").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
  const name = `${safeJob}_${new Date().toISOString().replace(/[:.]/g, "-")}_${randomBytes(4).toString("hex")}.png`;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), buf);
}

function validateDecisionJson(parsed: unknown): { ok: true; value: MacDecisionResponseV1 } | { ok: false; err: string } {
  if (!parsed || typeof parsed !== "object") return { ok: false, err: "decision_not_object" };
  const o = parsed as Record<string, unknown>;
  const action = String(o.action ?? "").trim();
  if (!ACTIONS.has(action)) return { ok: false, err: "decision_bad_action" };
  const reason = String(o.reason ?? "").trim();
  if (!reason) return { ok: false, err: "decision_reason_required" };

  let x: number | null = null;
  let y: number | null = null;
  let text = "";

  if (action === "click") {
    if (typeof o.x !== "number" || typeof o.y !== "number" || !Number.isFinite(o.x) || !Number.isFinite(o.y)) {
      return { ok: false, err: "decision_click_requires_finite_xy" };
    }
    x = o.x;
    y = o.y;
  } else if (action === "type" || action === "paste") {
    const t = String(o.text ?? "");
    if (!t) return { ok: false, err: "decision_type_paste_requires_text" };
    text = t;
  } else {
    if (o.x != null && typeof o.x !== "number") return { ok: false, err: "decision_xy_type" };
    if (o.y != null && typeof o.y !== "number") return { ok: false, err: "decision_xy_type" };
    if (typeof o.x === "number" && Number.isFinite(o.x)) x = o.x;
    if (typeof o.y === "number" && Number.isFinite(o.y)) y = o.y;
    if (typeof o.text === "string") text = o.text;
  }

  return {
    ok: true,
    value: {
      action: action as MacDecisionResponseV1["action"],
      x,
      y,
      text,
      reason,
    },
  };
}

const SYSTEM_PROMPT = `You are a UI automation planner. Reply with ONE JSON object only (no markdown, no prose outside JSON).
Keys exactly: "action", "x", "y", "text", "reason".
- action must be one of: click, type, paste, wait, done, fail.
- For "click": x and y are required numbers (pixels from top-left of the image).
- For "type" or "paste": text is required (non-empty string).
- For "wait", "done", "fail": set x and y to null unless you need coordinates; text may be "".
- reason: short factual string (why this action).`;

async function callOpenAiVisionJson(params: {
  b64: string;
  mime: string;
  jobId: string;
  context: string;
}): Promise<string> {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const model = String(process.env.TENMON_MAC_DECISION_OPENAI_MODEL || process.env.OPENAI_MODEL || "gpt-4o").trim();
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 512,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: `job_id: ${params.jobId}\ncontext: ${params.context}` },
            { type: "image_url", image_url: { url: `data:${params.mime};base64,${params.b64}` } },
          ],
        },
      ],
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`OpenAI ${resp.status}: ${txt.slice(0, 800)}`);
  }
  const json: any = await resp.json();
  return String(json?.choices?.[0]?.message?.content || "").trim();
}

async function callGeminiVisionJson(params: {
  b64: string;
  mime: string;
  jobId: string;
  context: string;
}): Promise<string> {
  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");

  const model = String(process.env.TENMON_MAC_DECISION_GEMINI_MODEL || "gemini-1.5-flash").trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const userText = `${SYSTEM_PROMPT}\n\njob_id: ${params.jobId}\ncontext: ${params.context}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: userText },
            { inline_data: { mime_type: params.mime, data: params.b64 } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 512,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Gemini ${resp.status}: ${txt.slice(0, 800)}`);
  }
  const json: any = await resp.json();
  return String(
    json?.candidates?.[0]?.content?.parts?.map((p: any) => String(p?.text || "")).join("") || ""
  ).trim();
}

function extractJsonObject(text: string): unknown {
  const t = String(text || "").trim();
  if (!t) throw new Error("empty_model_output");
  try {
    return JSON.parse(t);
  } catch {
    const m = /\{[\s\S]*\}/.exec(t);
    if (m) return JSON.parse(m[0]);
    throw new Error("model_output_not_json");
  }
}

adminMacDecisionRouter.post("/admin/mac/decision", jsonLarge, requireFounderOrExecutorBearer, async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const shot = parseScreenshotInput(body.screenshot);
    if (!shot.ok) {
      return res.status(400).json({ ok: false, error: "BAD_INPUT", detail: shot.err });
    }
    const jobId = String(body.job_id ?? "").trim();
    if (!jobId) {
      return res.status(400).json({ ok: false, error: "BAD_INPUT", detail: "job_id_required" });
    }
    const context = String(body.context ?? "");

    let buf: Buffer;
    try {
      buf = Buffer.from(shot.b64, "base64");
    } catch {
      return res.status(400).json({ ok: false, error: "BAD_INPUT", detail: "screenshot_decode_failed" });
    }
    if (buf.length < 8) {
      return res.status(400).json({ ok: false, error: "BAD_INPUT", detail: "screenshot_too_small" });
    }
    const maxBytes = Number(process.env.TENMON_MAC_DECISION_MAX_IMAGE_BYTES || 20 * 1024 * 1024);
    if (buf.length > maxBytes) {
      return res.status(400).json({ ok: false, error: "BAD_INPUT", detail: "screenshot_too_large" });
    }

    maybePersistDebugScreenshot(jobId, buf);

    const hasOpenAi = Boolean(String(process.env.OPENAI_API_KEY || "").trim());
    const hasGemini = Boolean(String(process.env.GEMINI_API_KEY || "").trim());
    if (!hasOpenAi && !hasGemini) {
      return res.status(503).json({ ok: false, error: "VISION_UNAVAILABLE", detail: "OPENAI_API_KEY or GEMINI_API_KEY required" });
    }

    let rawText: string;
    if (hasOpenAi) {
      rawText = await callOpenAiVisionJson({
        b64: shot.b64,
        mime: shot.mime,
        jobId,
        context,
      });
    } else {
      rawText = await callGeminiVisionJson({
        b64: shot.b64,
        mime: shot.mime,
        jobId,
        context,
      });
    }

    let parsed: unknown;
    try {
      parsed = extractJsonObject(rawText);
    } catch (e: any) {
      return res.status(502).json({
        ok: false,
        error: "VISION_PARSE_FAILED",
        detail: String(e?.message || e || "parse_failed"),
      });
    }

    const validated = validateDecisionJson(parsed);
    if (!validated.ok) {
      return res.status(502).json({ ok: false, error: "DECISION_CONTRACT_VIOLATION", detail: validated.err });
    }

    return res.status(200).json(validated.value);
  } catch (e: any) {
    const msg = String(e?.message || e || "mac_decision_failed");
    console.error("[adminMacDecision]", msg);
    return res.status(502).json({ ok: false, error: "VISION_FAILED", detail: msg.slice(0, 500) });
  }
});
