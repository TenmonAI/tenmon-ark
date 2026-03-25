/**
 * FOUNDER_REQUEST_BOX_V1 + REQUEST_TRIAGE_SCHEMA_V1
 * FOUNDER_RESULT_FEEDBACK_V1
 * Mac executor 用短命 JWT は POST /api/admin/founder/executor-token（auth_session + 許可メールのみ）
 * （管理者向け Cursor カード投入は別系統: GET /api/admin/remote-build/dashboard — adminRemoteBuild.ts）
 * - POST /api/founder/requests … JSON 保存（data/founder_requests.jsonl）
 * - GET  /api/founder/request-box … 最小 HTML フォーム
 * - POST /api/founder/feedback … 要望 ID に対する状態（受理/保留/却下/実装候補/追加情報依頼）
 * - GET  /api/founder/feedback/:requestId … 該当 ID のフィードバック履歴
 */
import { Router } from "express";
import fs from "fs";
import path from "path";
import { parseFounderRequestPayload, FOUNDER_REQUEST_TRIAGE_CATEGORIES } from "../founder/requestTriageSchemaV1.js";

const router = Router();

function storePath(): string {
  const base = process.env.FOUNDER_REQUEST_STORE_DIR || path.join(process.cwd(), "data");
  return path.join(base, "founder_requests.jsonl");
}

function feedbackStorePath(): string {
  const base = process.env.FOUNDER_REQUEST_STORE_DIR || path.join(process.cwd(), "data");
  return path.join(base, "founder_feedback.jsonl");
}

/** SEAL_OR_REJECT_JUDGE_V1 → Founder 向け表示 */
export const FOUNDER_FEEDBACK_STATUSES = [
  "accepted",
  "hold",
  "rejected",
  "implementation_candidate",
  "more_info_needed",
] as const;
export type FounderFeedbackStatus = (typeof FOUNDER_FEEDBACK_STATUSES)[number];

const FEEDBACK_LABEL_JA: Record<FounderFeedbackStatus, string> = {
  accepted: "受理",
  hold: "保留",
  rejected: "却下",
  implementation_candidate: "実装候補",
  more_info_needed: "追加情報依頼",
};

function isFeedbackStatus(x: string): x is FounderFeedbackStatus {
  return (FOUNDER_FEEDBACK_STATUSES as readonly string[]).includes(x);
}

function appendRecord(record: Record<string, unknown>): void {
  const file = storePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(record) + "\n", "utf8");
}

function appendFeedback(record: Record<string, unknown>): void {
  const file = feedbackStorePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(record) + "\n", "utf8");
}

function readFeedbackLinesForRequest(requestId: string): Record<string, unknown>[] {
  const file = feedbackStorePath();
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, "utf8");
  const out: Record<string, unknown>[] = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const o = JSON.parse(t) as Record<string, unknown>;
      if (String(o.requestId || "") === requestId) out.push(o);
    } catch {
      /* skip bad line */
    }
  }
  return out.sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
}

router.post("/founder/requests", (req, res) => {
  const parsed = parseFounderRequestPayload(req.body);
  if (!parsed.ok) {
    return res.status(400).json({ ok: false, errors: parsed.errors });
  }
  const id = `fr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const row = {
    id,
    createdAt: new Date().toISOString(),
    text: parsed.text,
    category: parsed.category,
    source: parsed.source,
    meta: parsed.meta,
  };
  try {
    appendRecord(row);
  } catch (e) {
    console.error("[FOUNDER_REQUEST_BOX] append failed", e);
    return res.status(500).json({ ok: false, error: "store_failed" });
  }
  return res.json({ ok: true, id, category: row.category });
});

router.post("/founder/feedback", (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ ok: false, errors: ["body_required"] });
  }
  const requestId = String((body as { requestId?: unknown }).requestId ?? "").trim();
  if (!requestId) {
    return res.status(400).json({ ok: false, errors: ["requestId_required"] });
  }
  const raw = String((body as { status?: unknown }).status ?? "").trim();
  if (!isFeedbackStatus(raw)) {
    return res.status(400).json({ ok: false, errors: ["invalid_status"], allowed: [...FOUNDER_FEEDBACK_STATUSES] });
  }
  const message =
    (body as { message?: unknown }).message != null ? String((body as { message?: unknown }).message).slice(0, 4000) : "";
  const source =
    (body as { source?: unknown }).source != null
      ? String((body as { source?: unknown }).source).slice(0, 120)
      : "founder_feedback_api";
  const row = {
    id: `ffb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
    requestId,
    status: raw,
    labelJa: FEEDBACK_LABEL_JA[raw],
    message,
    source,
  };
  try {
    appendFeedback(row);
  } catch (e) {
    console.error("[FOUNDER_RESULT_FEEDBACK] append failed", e);
    return res.status(500).json({ ok: false, error: "store_failed" });
  }
  return res.json({ ok: true, feedback: row });
});

router.get("/founder/feedback/:requestId", (req, res) => {
  const requestId = String(req.params.requestId || "").trim();
  if (!requestId) return res.status(400).json({ ok: false, errors: ["requestId_required"] });
  const entries = readFeedbackLinesForRequest(requestId);
  const latest = entries.length ? entries[entries.length - 1] : null;
  return res.json({
    ok: true,
    requestId,
    count: entries.length,
    latest,
    entries,
  });
});

router.get("/founder/request-box", (_req, res) => {
  const opts = FOUNDER_REQUEST_TRIAGE_CATEGORIES.map(
    (c) => `<option value="${c}">${c}</option>`
  ).join("");
  res.type("html").send(`<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8"/><title>Founder Request Box</title></head>
<body>
<h1>Founder Request Box</h1>
<p>要望を送信します（SELF_BUILD / REQUEST_TRIAGE_SCHEMA_V1）。</p>
<form id="f">
<label>本文（必須）<br/><textarea id="text" rows="6" cols="72" required></textarea></label><br/><br/>
<label>分類 <select id="category">${opts}</select></label><br/><br/>
<button type="submit">送信</button>
</form>
<pre id="out"></pre>
<script>
document.getElementById("f").addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = document.getElementById("text").value.trim();
  const category = document.getElementById("category").value;
  const r = await fetch("/api/founder/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, category, source: "founder_request_box_html" })
  });
  const j = await r.json();
  document.getElementById("out").textContent = JSON.stringify(j, null, 2);
});
</script>
</body></html>`);
});

export { router as founderRequestRouter };
