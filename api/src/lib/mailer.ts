/**
 * TENMON-ARK メール送信ユーティリティ
 * TENMON_ARK_POST_DEPLOY_UX_AND_RECOVERY_FIX_V1 — FIX-A
 *
 * 対応トランスポート:
 *   1. SMTP (nodemailer) — MAIL_TRANSPORT=smtp
 *   2. Resend API        — MAIL_TRANSPORT=resend
 *   3. Console fallback  — 上記未設定時（開発用）
 *
 * 必須環境変数:
 *   SMTP: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *   Resend: RESEND_API_KEY, MAIL_FROM
 */
import nodemailer from "nodemailer";

export interface MailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface MailResult {
  ok: boolean;
  transport: string;
  messageId?: string;
  error?: string;
}

/** SMTP transport (nodemailer) */
async function sendViaSMTP(payload: MailPayload): Promise<MailResult> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || process.env.MAIL_FROM || "noreply@tenmon-ark.com";

  if (!host || !user || !pass) {
    return { ok: false, transport: "smtp", error: "SMTP credentials not configured (SMTP_HOST/SMTP_USER/SMTP_PASS)" };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });

  try {
    const info = await transporter.sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
    return { ok: true, transport: "smtp", messageId: info.messageId };
  } catch (e: any) {
    return { ok: false, transport: "smtp", error: String(e?.message ?? e) };
  }
}

/** Resend API transport */
async function sendViaResend(payload: MailPayload): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || "TENMON-ARK <noreply@tenmon-ark.com>";

  if (!apiKey) {
    return { ok: false, transport: "resend", error: "RESEND_API_KEY not configured" };
  }

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      return { ok: false, transport: "resend", error: `Resend API ${resp.status}: ${errBody}` };
    }

    const data = (await resp.json()) as any;
    return { ok: true, transport: "resend", messageId: data.id };
  } catch (e: any) {
    return { ok: false, transport: "resend", error: String(e?.message ?? e) };
  }
}

/** Console fallback (development) */
async function sendViaConsole(payload: MailPayload): Promise<MailResult> {
  console.log(`[MAILER] ========== CONSOLE FALLBACK ==========`);
  console.log(`[MAILER] To: ${payload.to}`);
  console.log(`[MAILER] Subject: ${payload.subject}`);
  console.log(`[MAILER] Body:\n${payload.text}`);
  console.log(`[MAILER] ======================================`);
  return { ok: true, transport: "console", messageId: `console-${Date.now()}` };
}

/**
 * メール送信メイン関数
 * MAIL_TRANSPORT 環境変数に応じてトランスポートを選択
 */
export async function sendMail(payload: MailPayload): Promise<MailResult> {
  const transport = (process.env.MAIL_TRANSPORT || "").toLowerCase().trim();

  let result: MailResult;

  if (transport === "smtp") {
    result = await sendViaSMTP(payload);
  } else if (transport === "resend") {
    result = await sendViaResend(payload);
  } else {
    // 自動検出: SMTP設定があればSMTP、なければconsole
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      result = await sendViaSMTP(payload);
    } else if (process.env.RESEND_API_KEY) {
      result = await sendViaResend(payload);
    } else {
      result = await sendViaConsole(payload);
    }
  }

  // ログ出力（token平文は出さない）
  console.log(`[MAILER] to=${payload.to} subject="${payload.subject}" transport=${result.transport} ok=${result.ok} messageId=${result.messageId || "(none)"}${result.error ? ` error=${result.error}` : ""}`);

  return result;
}
