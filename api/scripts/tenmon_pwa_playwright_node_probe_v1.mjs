#!/usr/bin/env node
/**
 * TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_CURSOR_AUTO_V1
 * Node Playwright — 軽量プローブ（--probe-json）と PWA 監査トレース（--url --out）を分離。
 * @playwright/test は使わず `playwright` パッケージを動的 import。
 *
 * --probe-json: カレントディレクトリ（または祖先）に node_modules/playwright があること。
 * npm exec でリポジトリ上の本ファイルだけを叩くと import 解決に失敗するため、
 * 本番の統合プローブは tenmon_pwa_runtime_preflight_v1.py（一時ディレクトリ npm install）を使う。
 *
 * 手動例:
 *   tmp=$(mktemp -d) && cd "$tmp" && npm init -y && npm i playwright@1.58.2 && npx playwright install chromium
 *   node /path/to/tenmon_pwa_playwright_node_probe_v1.mjs --probe-json
 */
import fs from "fs";

const CARD = "TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_CURSOR_AUTO_V1";

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * パッケージ解決 + chromium.launch のみ（stdout に JSON 1 行）
 */
async function runProbeJson() {
  const out = {
    card: CARD,
    generated_at: nowIso(),
    mode: "probe_json",
    package_resolve_ok: false,
    node_playwright_ok: false,
    browser_launch_ok: false,
    error: null,
  };
  try {
    const pw = await import("playwright");
    out.package_resolve_ok = true;
    out.node_playwright_ok = true;
    const browser = await pw.chromium.launch({ headless: true });
    out.browser_launch_ok = true;
    await browser.close();
  } catch (e) {
    out.error = e && e.message ? String(e.message) : String(e);
  }
  return out;
}

function parseArgs() {
  const a = process.argv.slice(2);
  if (a.includes("--probe-json")) {
    return { mode: "probe" };
  }
  let url = "https://tenmon-ark.com/pwa/";
  let out = "";
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--url" && a[i + 1]) url = a[++i];
    else if (a[i] === "--out" && a[i + 1]) out = a[++i];
  }
  if (!out) {
    console.error("usage: node ... --probe-json | node ... --url <pwa> --out <trace.json>");
    process.exit(2);
  }
  return { mode: "audit", url, out };
}

const candidateInput = [
  "textarea",
  "textarea[placeholder*='メッセージ']",
  "textarea[placeholder*='message' i]",
  "[contenteditable='true']",
  "input[type='text']",
];
const candidateSend = [
  "button[type='submit']",
  "button[aria-label*='send' i]",
  "button:has-text('送信')",
  "button:has-text('Send')",
];
const candidateNew = [
  "button:has-text('新しい会話')",
  "button:has-text('New Chat')",
  "button:has-text('新規')",
  "[data-testid='new-chat']",
];
const candidateAssistant = [
  "[data-role='assistant']",
  ".assistant",
  "[class*='assistant']",
  "[data-message-role='assistant']",
];

async function firstVisible(page, selectors) {
  for (const s of selectors) {
    try {
      const loc = page.locator(s).first();
      if ((await loc.count()) > 0 && (await loc.isVisible())) return [s, loc];
    } catch {
      /* ignore */
    }
  }
  return [null, null];
}

async function assistantCount(page) {
  let total = 0;
  for (const s of candidateAssistant) {
    try {
      const c = await page.locator(s).count();
      if (c > total) total = c;
    } catch {
      /* ignore */
    }
  }
  return total;
}

async function runAudit(url, out) {
  const { chromium } = await import("playwright");
  const trace = {
    target_url: url,
    started_at: nowIso(),
    driver: "node_playwright",
    url_before: null,
    url_after_send: null,
    url_after_refresh: null,
    url_after_newchat: null,
    url_has_threadId: false,
    response_threadid_seen: false,
    thread_switch_event_seen: false,
    refresh_same_thread_kept: false,
    newchat_triggered_reload: false,
    old_thread_restore_ok: false,
    assistant_count_before: 0,
    assistant_count_after: 0,
    assistant_count_after_newchat: 0,
    dom_drift: false,
    auth_gate: false,
    chatlayout_bound: true,
    notes: [],
  };

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  page.on("response", async (resp) => {
    try {
      const u = resp.url();
      if (!u.includes("/api/chat")) return;
      const t = await resp.text();
      let j = {};
      try {
        j = t ? JSON.parse(t) : {};
      } catch {
        return;
      }
      if (j && String(j.threadId || "").trim()) trace.response_threadid_seen = true;
    } catch {
      /* ignore */
    }
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2000);
  trace.url_before = page.url();

  const html = await page.content();
  if (/login|signin|ログイン|認証|メールアドレス/i.test(html)) {
    trace.auth_gate = true;
    await browser.close();
    fs.writeFileSync(out, JSON.stringify(trace, null, 2), "utf8");
    return;
  }

  if (!html.includes("gpt-chat-layout") && !html.includes("TENMON-ARK Chat")) {
    trace.chatlayout_bound = false;
  }

  const [inSel, inLoc] = await firstVisible(page, candidateInput);
  const [sendSel, sendLoc] = await firstVisible(page, candidateSend);
  const [newSel, newLoc] = await firstVisible(page, candidateNew);
  trace.selectors = { input: inSel, send: sendSel, new_chat: newSel };

  if (!inLoc || !sendLoc || !newLoc) {
    trace.dom_drift = true;
    await browser.close();
    fs.writeFileSync(out, JSON.stringify(trace, null, 2), "utf8");
    return;
  }

  await page.evaluate(`() => {
    window.__TENMON_THREAD_SWITCH_SEEN__ = false;
    window.addEventListener('tenmon:thread-switch', () => {
      window.__TENMON_THREAD_SWITCH_SEEN__ = true;
    });
  }`);

  trace.assistant_count_before = await assistantCount(page);
  const probeText = `監査プローブ ${Math.floor(Date.now() / 1000)}。一言で返答してください。`;
  try {
    if ((inSel || "").includes("contenteditable")) {
      await inLoc.click();
      await page.keyboard.type(probeText);
    } else {
      await inLoc.fill(probeText);
    }
  } catch {
    await inLoc.click();
    await page.keyboard.type(probeText);
  }

  await sendLoc.click();
  await page.waitForTimeout(5000);
  trace.assistant_count_after = await assistantCount(page);
  trace.url_after_send = page.url();

  let oldTid = "";
  try {
    const q = await page.evaluate(
      `() => new URL(window.location.href).searchParams.get('threadId') || ''`
    );
    trace.url_has_threadId = Boolean(String(q).trim());
    oldTid = String(q).trim();
  } catch {
    trace.url_has_threadId = false;
  }

  await page.reload({ waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2000);
  trace.url_after_refresh = page.url();
  try {
    const q2 = await page.evaluate(
      `() => new URL(window.location.href).searchParams.get('threadId') || ''`
    );
    trace.refresh_same_thread_kept = Boolean(oldTid && String(q2).trim() === oldTid);
  } catch {
    trace.refresh_same_thread_kept = false;
  }

  const perfBefore = await page.evaluate(
    `() => performance.getEntriesByType('navigation').length`
  );
  await newLoc.click();
  await page.waitForTimeout(2000);
  const perfAfter = await page.evaluate(
    `() => performance.getEntriesByType('navigation').length`
  );
  trace.newchat_triggered_reload = perfAfter > perfBefore;
  trace.thread_switch_event_seen = await page.evaluate(
    `() => !!window.__TENMON_THREAD_SWITCH_SEEN__`
  );
  trace.url_after_newchat = page.url();
  trace.assistant_count_after_newchat = await assistantCount(page);

  let newTid = "";
  try {
    const q3 = await page.evaluate(
      `() => new URL(window.location.href).searchParams.get('threadId') || ''`
    );
    newTid = String(q3).trim();
  } catch {
    newTid = "";
  }

  if (oldTid && newTid && oldTid !== newTid) {
    const u = new URL(url);
    u.searchParams.set("threadId", oldTid);
    await page.goto(u.toString(), { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(2000);
    try {
      const q4 = await page.evaluate(
        `() => new URL(window.location.href).searchParams.get('threadId') || ''`
      );
      trace.old_thread_restore_ok = String(q4).trim() === oldTid;
    } catch {
      trace.old_thread_restore_ok = false;
    }
  } else {
    trace.notes.push("old_thread_restore_not_executed");
  }

  await browser.close();

  if (trace.assistant_count_after <= trace.assistant_count_before) {
    trace.notes.push("assistant_count_not_increased");
  }

  fs.writeFileSync(out, JSON.stringify(trace, null, 2), "utf8");
}

async function main() {
  const parsed = parseArgs();
  if (parsed.mode === "probe") {
    const j = await runProbeJson();
    console.log(JSON.stringify(j));
    return;
  }
  await runAudit(parsed.url, parsed.out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
