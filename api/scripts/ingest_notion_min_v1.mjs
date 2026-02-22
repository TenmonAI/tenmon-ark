import Database from "better-sqlite3";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;
const DB_PATH = process.env.KOKUZO_DB || "/opt/tenmon-ark-data/kokuzo.sqlite";

if (!NOTION_TOKEN) throw new Error("Missing NOTION_TOKEN");
if (!DATABASE_ID) throw new Error("Missing NOTION_DATABASE_ID");

const notionPost = async (path, body) => {
  const r = await fetch(`https://api.notion.com/v1/${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body || {}),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Notion API ${r.status}: ${t}`);
  }
  return r.json();
};

const plainFromRich = (arr) =>
  Array.isArray(arr) ? arr.map(x => x?.plain_text || "").join("").trim() : "";

const extractMinimalText = (page) => {
  const props = page?.properties || {};
  const parts = [];
  for (const [k, v] of Object.entries(props)) {
    if (!v || typeof v !== "object") continue;
    if (v.type === "title") {
      const t = plainFromRich(v.title);
      if (t) parts.push(`【${k}】${t}`);
    } else if (v.type === "rich_text") {
      const t = plainFromRich(v.rich_text);
      if (t) parts.push(`【${k}】${t}`);
    }
  }
  if (!parts.length) {
    const pid = page?.id || "";
    return pid ? `【pageId】${pid}` : "";
  }
  return parts.join("\n");
};

const main = async () => {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  const has = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='kokuzo_pages'").get();
  if (!has) throw new Error("kokuzo_pages not found");

  const doc = `NOTION:${DATABASE_ID}`;

  const del = db.prepare("DELETE FROM kokuzo_pages WHERE doc = ?");
  const ins = db.prepare("INSERT INTO kokuzo_pages(doc, pdfPage, text) VALUES(?, ?, ?)");

  let cursor = undefined;
  const rows = [];

  for (;;) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const res = await notionPost(`databases/${DATABASE_ID}/query`, body);
    const results = Array.isArray(res?.results) ? res.results : [];
    for (const p of results) {
      const t = extractMinimalText(p);
      if (t) rows.push(t);
    }
    if (!res?.has_more) break;
    cursor = res?.next_cursor;
    if (!cursor) break;
  }

  const tx = db.transaction((arr) => {
    del.run(doc);
    let n = 0;
    for (const row of arr) {
      n += 1;
      ins.run(doc, n, row);
    }
    return n;
  });

  const n = tx(rows);
  console.log(`[OK] notion pages=${n} into kokuzo_pages (doc=${doc}) db=${DB_PATH}`);
};

main().catch((e) => {
  console.error("[FAIL]", e?.stack || e?.message || String(e));
  process.exit(1);
});
