#!/usr/bin/env node
/**
 * TENMON_MAC_PLAYWRIGHT_AI_BROWSER_AGENT_BIND_CURSOR_AUTO_V1
 *
 * Mac 上で VPS の Remote Cursor キューを 30 秒間隔でポーリングし、
 * card_body_md の target_ai / prompt に従って Playwright でブラウザ操作し、
 * POST /api/admin/cursor/result で結果を返す。
 *
 * 前提（Mac 側で別途）:
 *   npm install playwright
 *   npx playwright install chromium
 *
 * 環境変数:
 *   FOUNDER_KEY                      VPS 認証（必須・未設定なら起動拒否）
 *   TENMON_REMOTE_CURSOR_BASE_URL    VPS オリジン（必須、例 https://api.example.com）
 *   TENMON_REMOTE_CURSOR_INBOX       既定 ~/TenmonRemoteCursor/inbox（プロファイル配置の基準に使用）
 *   TENMON_PLAYWRIGHT_USER_DATA_DIR  ログイン済み Chromium プロファイル（任意。未設定時は inbox の親配下 browser-profile）
 *
 * ログ: カレントディレクトリの ./tenmon_browser_agent.log
 */

import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

const POLL_MS = 30_000;
const LOG_FILE = path.join(process.cwd(), "tenmon_browser_agent.log");

const URLS = {
  chatgpt: "https://chat.openai.com",
  claude: "https://claude.ai",
  gemini: "https://gemini.google.com",
};

/** 入力セレクタ（仕様どおり） */
const INPUT_SELECTOR = {
  chatgpt: [
    '#prompt-textarea',
    'div[contenteditable="true"]',
    'textarea',
    'div[role="textbox"]',
    'p[data-placeholder]',
  ],
  claude: 'div[contenteditable="true"]',
  gemini: "textarea.textarea",
};

/** 応答取得用（サイト改修で壊れやすい — フォールバックあり） */
const RESPONSE_FALLBACKS = {
  chatgpt: ['[data-message-author-role="assistant"]'],
  claude: [
    "[data-testid='conversation-turn']",
    "div[data-message-author='assistant']",
    "div.prose",
    "main",
  ],
  gemini: ["model-response", "message-content", "main"],
};

function log(line) {
  const ts = new Date().toISOString();
  const msg = `[${ts}] ${line}\n`;
  try {
    fs.appendFileSync(LOG_FILE, msg, "utf8");
  } catch {
    /* ignore disk errors */
  }
  process.stdout.write(msg);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function expandDefaultInbox() {
  return path.join(homedir(), "TenmonRemoteCursor", "inbox");
}

/** TENMON_REMOTE_CURSOR_INBOX の ~ を展開 */
function resolveInboxPath(raw) {
  const p = String(raw || "").trim() || expandDefaultInbox();
  if (p.startsWith("~/")) return path.join(homedir(), p.slice(2));
  if (p === "~") return homedir();
  if (p.startsWith("~")) return path.join(homedir(), p.slice(1).replace(/^\//, ""));
  return path.resolve(p);
}

function parseCardBody(cardBodyMd) {
  const text = String(cardBodyMd ?? "");
  let targetAi = null;
  const ta = text.match(/^\s*target_ai:\s*(chatgpt|claude|gemini)\s*$/im);
  if (ta) targetAi = ta[1].toLowerCase();

  let prompt = "";
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    const pm = /^\s*prompt:\s*(.*)$/i.exec(raw);
    if (pm) {
      const first = pm[1] ?? "";
      const parts = [first];
      for (let j = i + 1; j < lines.length; j++) {
        const L = lines[j];
        const t = L.trim();
        if (/^[a-z0-9_]+:/i.test(t)) break;
        parts.push(L);
      }
      prompt = parts.join("\n").trim();
      break;
    }
  }
  return { targetAi, prompt };
}

function authHeaders(key) {
  return {
    "X-Founder-Key": key,
    "Content-Type": "application/json",
  };
}

async function getNext(baseUrl, founderKey) {
  const url = `${baseUrl}/api/admin/cursor/next`;
  const res = await fetch(url, { headers: authHeaders(founderKey) });
  const text = await res.text();
  let j;
  try {
    j = JSON.parse(text);
  } catch {
    j = { ok: false, parse_error: text.slice(0, 500) };
  }
  if (!res.ok) {
    throw new Error(`GET next HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  return j;
}

async function postResult(baseUrl, founderKey, body) {
  const url = `${baseUrl}/api/admin/cursor/result`;
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(founderKey),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let j;
  try {
    j = JSON.parse(text);
  } catch {
    j = { raw: text.slice(0, 2000) };
  }
  if (!res.ok) {
    throw new Error(`POST result HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  return j;
}

async function readResponseText(page, targetAi) {
  await page.waitForTimeout(15_000);
  const fallbacks = RESPONSE_FALLBACKS[targetAi] || ["main"];
  for (const sel of fallbacks) {
    try {
      const loc = page.locator(sel).last();
      await loc.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
      const t = await loc.innerText({ timeout: 4000 }).catch(() => "");
      const out = String(t || "").trim();
      if (out.length > 2) return out;
    } catch {
      /* try next */
    }
  }
  try {
    const body = await page.locator("body").innerText({ timeout: 2000 });
    return String(body || "")
      .trim()
      .slice(0, 12000);
  } catch {
    return "";
  }
}

/**
 * Playwright 1 ターン（仕様に沿った launchPersistentContext + fill + Enter + 待機）
 */
async function runBrowserTurn({ profileDir, targetAi, prompt }) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch (e) {
    throw new Error(
      "playwright 未インストール: `npm install playwright && npx playwright install chromium`（Mac）"
    );
  }

  const targetUrl = URLS[targetAi];
  const inputSel = INPUT_SELECTOR[targetAi];
  if (!targetUrl || !inputSel) {
    throw new Error(`unknown target_ai: ${targetAi}`);
  }

  fs.mkdirSync(profileDir, { recursive: true });

  const browser = await chromium.launchPersistentContext(profileDir, {
    headless: false,
  });
  const page = await browser.newPage();
  try {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });

    const loginish =
      /\/login|signin|accounts\.google|auth\.openai/i.test(page.url()) ||
      (targetAi === "gemini" && /accounts\.google/i.test(page.url()));
    if (loginish) {
      return {
        ok: false,
        responseText: "LOGIN_REQUIRED: ブラウザでログイン完了後に再実行してください（fail-closed）。",
      };
    }

    await page.waitForSelector(inputSel, { timeout: 45_000 });
    await page.fill(inputSel, prompt);
    await page.keyboard.press("Enter");

    let responseText = await readResponseText(page, targetAi);
    if (!responseText) {
      responseText =
        "(応答テキストを DOM から取得できませんでした。セレクタの更新が必要な可能性があります。)";
    }
    return { ok: true, responseText: String(responseText || "").trim() };
  } finally {
    await browser.close();
  }
}

async function processItem(baseUrl, founderKey, item) {
  const queueId = String(item.id ?? item.queue_id ?? "").trim();
  const cardBodyMd = String(item.card_body_md ?? "");
  const { targetAi, prompt } = parseCardBody(cardBodyMd);

  const inboxResolved = resolveInboxPath(process.env.TENMON_REMOTE_CURSOR_INBOX);
  const profileDir =
    (process.env.TENMON_PLAYWRIGHT_USER_DATA_DIR || "").trim() ||
    path.join(path.dirname(inboxResolved), "browser-profile");

  const buildPayload = (aiResponse, targetAiVal, acceptanceOk, buildRc) => ({
    queue_id: queueId,
    touched_files: [],
    build_rc: buildRc,
    acceptance_ok: acceptanceOk,
    ai_response: aiResponse,
    target_ai: targetAiVal,
    dry_run: false,
    result_payload: {
      ai_response: aiResponse,
      target_ai: targetAiVal,
      source: "tenmon_ai_browser_agent_mac_v1",
    },
  });

  if (!queueId) {
    log("skip: item に id / queue_id がありません");
    return;
  }

  if (!targetAi || !URLS[targetAi]) {
    const msg = `target_ai が chatgpt|claude|gemini のいずれかとして解釈できません（card_body_md を確認）`;
    log(`HOLD ${queueId}: ${msg}`);
    await postResult(
      baseUrl,
      founderKey,
      buildPayload(msg, targetAi || "unknown", false, 1)
    );
    return;
  }

  if (!prompt) {
    const msg = "prompt: が空です（card_body_md に prompt を記載してください）";
    log(`HOLD ${queueId}: ${msg}`);
    await postResult(baseUrl, founderKey, buildPayload(msg, targetAi, false, 1));
    return;
  }

  log(`playwright start queue_id=${queueId} target_ai=${targetAi}`);
  let responseText;
  let acceptanceOk = true;
  let buildRc = 0;
  try {
    const r = await runBrowserTurn({ profileDir, targetAi, prompt });
    responseText = r.responseText;
    if (!r.ok) {
      acceptanceOk = false;
      buildRc = 2;
    }
  } catch (e) {
    responseText = String(e?.message || e);
    acceptanceOk = false;
    buildRc = 1;
    log(`playwright error: ${responseText}`);
  }

  await postResult(baseUrl, founderKey, buildPayload(responseText, targetAi, acceptanceOk, buildRc));
  log(`result posted queue_id=${queueId} acceptance_ok=${acceptanceOk} build_rc=${buildRc}`);
}

async function tick(baseUrl, founderKey) {
  const j = await getNext(baseUrl, founderKey);
  const item = j?.item;
  if (item == null) {
    const msg = j?.message || "no item";
    log(`poll: ${msg}`);
    return;
  }
  await processItem(baseUrl, founderKey, item);
}

async function main() {
  const founderKey = String(process.env.FOUNDER_KEY || "").trim();
  const baseUrl = String(process.env.TENMON_REMOTE_CURSOR_BASE_URL || "")
    .trim()
    .replace(/\/$/, "");

  if (!founderKey) {
    console.error("FOUNDER_KEY が未設定です。起動を拒否します（fail-closed）。");
    process.exit(1);
  }
  if (!baseUrl) {
    console.error("TENMON_REMOTE_CURSOR_BASE_URL が未設定です。起動を拒否します。");
    process.exit(1);
  }

  const inboxResolved = resolveInboxPath(process.env.TENMON_REMOTE_CURSOR_INBOX);
  fs.mkdirSync(inboxResolved, { recursive: true });

  log(
    `start TENMON_MAC_PLAYWRIGHT_AI_BROWSER_AGENT base=${baseUrl} inbox=${inboxResolved} log=${LOG_FILE}`
  );

  for (;;) {
    try {
      await tick(baseUrl, founderKey);
    } catch (e) {
      log(`tick error: ${e?.message || e}`);
    }
    await sleep(POLL_MS);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
