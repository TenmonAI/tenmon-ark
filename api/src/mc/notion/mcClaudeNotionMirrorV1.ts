/**
 * CARD-MC-16: claude-summary を Notion の固定ページ
 * `TENMON_ARK_MC_CURRENT_STATE_FOR_CLAUDE` に同期する（人間が読む要約 + JSON）。
 */
const NOTION_VERSION = "2022-06-28";
const MAX_TEXT = 1900;
export const MC_CLAUDE_NOTION_PAGE_TITLE = "TENMON_ARK_MC_CURRENT_STATE_FOR_CLAUDE";

export function isMcClaudeNotionMirrorConfiguredV1(): boolean {
  const nt = (process.env.NOTION_TOKEN || process.env.NOTION_API_KEY || "").trim();
  const pid = (process.env.TENMON_NOTION_MC_CLAUDE_PAGE_ID || "").trim().replace(/-/g, "");
  return nt.length >= 8 && pid.length >= 20;
}

function notionHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

function chunkText(s: string, max: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += max) out.push(s.slice(i, i + max));
  return out.length ? out : [""];
}

async function notionListChildBlockIds(pageId: string, token: string): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | undefined;
  for (;;) {
    const url = new URL(`https://api.notion.com/v1/blocks/${pageId}/children`);
    url.searchParams.set("page_size", "100");
    if (cursor) url.searchParams.set("start_cursor", cursor);
    const r = await fetch(url.toString(), { headers: notionHeaders(token) });
    if (!r.ok) throw new Error(`Notion list children ${r.status}: ${(await r.text()).slice(0, 400)}`);
    const j = (await r.json()) as { results?: Array<{ id?: string }>; has_more?: boolean; next_cursor?: string };
    for (const row of j.results ?? []) {
      if (row.id) ids.push(row.id);
    }
    if (!j.has_more || !j.next_cursor) break;
    cursor = j.next_cursor;
  }
  return ids;
}

async function notionDeleteBlock(blockId: string, token: string): Promise<void> {
  const r = await fetch(`https://api.notion.com/v1/blocks/${blockId}`, {
    method: "DELETE",
    headers: notionHeaders(token),
  });
  if (!r.ok && r.status !== 404) {
    throw new Error(`Notion delete block ${r.status}: ${(await r.text()).slice(0, 200)}`);
  }
}

function richParagraph(content: string): Record<string, unknown> {
  const t = content.slice(0, MAX_TEXT);
  return {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content: t } }],
    },
  };
}

function richHeading(level: 2 | 3, content: string): Record<string, unknown> {
  const t = content.slice(0, MAX_TEXT);
  const key = level === 2 ? "heading_2" : "heading_3";
  return {
    object: "block",
    type: key,
    [key]: {
      rich_text: [{ type: "text", text: { content: t } }],
    },
  };
}

function richBullet(content: string): Record<string, unknown> {
  const t = content.slice(0, MAX_TEXT);
  return {
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: {
      rich_text: [{ type: "text", text: { content: t } }],
    },
  };
}

function richCode(content: string): Record<string, unknown> {
  return {
    object: "block",
    type: "code",
    code: {
      caption: [],
      rich_text: [{ type: "text", text: { content: content.slice(0, MAX_TEXT) } }],
      language: "json",
    },
  };
}

async function notionAppendChildren(pageId: string, token: string, children: Record<string, unknown>[]): Promise<number> {
  let written = 0;
  for (let i = 0; i < children.length; i += 50) {
    const batch = children.slice(i, i + 50);
    const r = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
      method: "PATCH",
      headers: notionHeaders(token),
      body: JSON.stringify({ children: batch }),
    });
    if (!r.ok) throw new Error(`Notion append ${r.status}: ${(await r.text()).slice(0, 400)}`);
    written += batch.length;
  }
  return written;
}

/** Notion 上で読みやすい固定セクション（CARD-MC-16 verify D） */
function buildReadableMirrorBlocks(summary: Record<string, unknown>): Record<string, unknown>[] {
  const ov = (summary.overview_summary || {}) as Record<string, unknown>;
  const acc = (summary.acceptance || {}) as Record<string, unknown>;
  const alerts = Array.isArray(summary.active_alerts) ? (summary.active_alerts as Record<string, unknown>[]) : [];
  const passed = Array.isArray(summary.latest_passed_cards) ? (summary.latest_passed_cards as Record<string, unknown>[]) : [];
  const gaps = Array.isArray(summary.current_open_gaps) ? (summary.current_open_gaps as Record<string, unknown>[]) : [];
  const threads = Array.isArray(summary.top_problematic_threads) ? (summary.top_problematic_threads as Record<string, unknown>[]) : [];
  const src = (summary.source_summary || {}) as Record<string, unknown>;

  const verdict = String(acc.verdict ?? acc.status ?? "—");
  const lastV = String(summary.last_verified_at ?? acc.lastVerifiedAt ?? "—");
  const git = String(ov.git_head ?? "—");
  const branch = String(ov.branch ?? "—");

  const blocks: Record<string, unknown>[] = [
    richHeading(2, `${MC_CLAUDE_NOTION_PAGE_TITLE} · ${String(summary.generated_at || "").slice(0, 19)}`),
    richParagraph("運用: /mc/ = 人間用 owner-only hub · 本ページ + /api/mc/vnext/claude-summary = AI 継承用 current state。"),
    richHeading(3, "Verdict"),
    richParagraph(`verdict: ${verdict} · branch: ${branch}`),
    richHeading(3, "Git head"),
    richParagraph(`git_head: ${git}`),
    richHeading(3, "Last verified at"),
    richParagraph(`last_verified_at: ${lastV}`),
    richHeading(3, "Active alerts"),
  ];
  if (alerts.length === 0) blocks.push(richParagraph("(none)"));
  else {
    for (const a of alerts.slice(0, 25)) {
      blocks.push(
        richBullet(
          `[${String(a.severity ?? "")}] ${String(a.category ?? "")}: ${String(a.message ?? "").slice(0, 400)}`,
        ),
      );
    }
  }
  blocks.push(richHeading(3, "Latest passed cards"));
  if (passed.length === 0) blocks.push(richParagraph("(none)"));
  else {
    for (const p of passed.slice(0, 20)) {
      blocks.push(richBullet(`${String(p.card_id ?? "—")}: ${String(p.title ?? "").slice(0, 300)}`));
    }
  }
  blocks.push(richHeading(3, "Current open gaps"));
  if (gaps.length === 0) blocks.push(richParagraph("(none)"));
  else {
    for (const g of gaps.slice(0, 20)) {
      blocks.push(
        richBullet(`${String(g.label ?? g.gap_id ?? "—")} (${String(g.status ?? "")}): ${String(g.detail ?? "").slice(0, 400)}`),
      );
    }
  }
  blocks.push(richHeading(3, "Top problematic threads (live)"));
  if (threads.length === 0) blocks.push(richParagraph("(none)"));
  else {
    for (const t of threads.slice(0, 15)) {
      blocks.push(
        richBullet(
          `${String(t.thread_id ?? "—")} · ${String(t.reason ?? "")}: ${String(t.detail ?? "").slice(0, 350)}`,
        ),
      );
    }
  }
  blocks.push(richHeading(3, "Source summary"));
  blocks.push(
    richParagraph(
      `verdict: ${String(src.verdict_short ?? "—")} · canonical: ${String(src.canonical_count ?? "—")} · mirror: ${String(src.mirror_count ?? "—")} · graph_edges: ${String(src.graph_edge_count ?? "—")}`,
    ),
  );
  blocks.push(richHeading(3, "Full JSON (mc_claude_summary_v1)"));
  return blocks;
}

export async function syncMcClaudeSummaryToNotionPageV1(summary: Record<string, unknown>): Promise<{
  ok: boolean;
  notion_page_id?: string;
  blocks_written?: number;
  blocks_removed?: number;
  error?: string;
}> {
  const notionToken = (process.env.NOTION_TOKEN || process.env.NOTION_API_KEY || "").trim();
  const pageId = (process.env.TENMON_NOTION_MC_CLAUDE_PAGE_ID || "").trim().replace(/-/g, "");
  if (!notionToken) return { ok: false, error: "NOTION_TOKEN_NOT_CONFIGURED" };
  if (pageId.length < 20) return { ok: false, error: "TENMON_NOTION_MC_CLAUDE_PAGE_ID_NOT_SET" };

  const formattedPageId =
    pageId.length === 32 ? `${pageId.slice(0, 8)}-${pageId.slice(8, 12)}-${pageId.slice(12, 16)}-${pageId.slice(16, 20)}-${pageId.slice(20)}` : pageId;

  try {
    const existing = await notionListChildBlockIds(formattedPageId, notionToken);
    for (const id of existing) {
      await notionDeleteBlock(id, notionToken);
    }

    const readable = buildReadableMirrorBlocks(summary);
    const json = JSON.stringify(summary, null, 2);
    const codeBlocks = chunkText(json, MAX_TEXT).map((c) => richCode(c));
    const n = await notionAppendChildren(formattedPageId, notionToken, [...readable, ...codeBlocks]);
    return { ok: true, notion_page_id: formattedPageId, blocks_written: n, blocks_removed: existing.length };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
