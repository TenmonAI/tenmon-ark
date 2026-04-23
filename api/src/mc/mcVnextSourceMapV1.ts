import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { dbPrepare, getDbPath } from "../db/index.js";
import { CANON_DIR, DATA_ROOT, MC_FILES, REPO_ROOT } from "../core/mc/constants.js";
import { readState } from "../core/mc/stateReader.js";
import type {
  McDbStatus,
  McLiveState,
  McNotionSync,
  McOverview,
  McVpsAssets,
  McgitState,
} from "../core/mc/types.js";
import {
  buildMcSourceRegistrySeedV1,
  type McSourceKindV1,
  type McSourceSeedV1,
} from "./sourceRegistry_seed.js";

export type McSourceRoleV1 = "canonical" | "mirror" | "backup" | "derived";

export type McSourceCategoryV1 = McSourceKindV1;

/**
 * CARD-MC-08A shape:
 *   - Legacy fields (`label`, `category`, `role`, `location`, ...) remain
 *     for backward compatibility with the existing /mc/sources UI.
 *   - 6 new canonical fields are the ones the CARD demands AIs rely on:
 *       source_kind / source_name / source_uri / source_role /
 *       linked_to  / last_seen
 */
export type McSourceItemV1 = {
  id: string;
  label: string;
  category: McSourceCategoryV1;
  role: McSourceRoleV1;
  linked_to: string[];
  status: "ok" | "stale" | "missing";
  location?: string;
  runtime_node?: string;
  branch?: string;
  head_sha_short?: string;
  note?: string;
  record_count?: number;
  file_count?: number;
  size_mb?: number;

  source_kind: McSourceKindV1;
  source_name: string;
  source_uri: string;
  source_role: McSourceRoleV1;
  last_seen: string | null;
};

function safeNum(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function stateStatus(state: { stale?: boolean } | null | undefined): "ok" | "stale" | "missing" {
  if (!state) return "missing";
  return state.stale ? "stale" : "ok";
}

function queryCount(sql: string): number {
  try {
    const row = dbPrepare("kokuzo", sql).get() as { c: number };
    return safeNum(row?.c, 0);
  } catch {
    return 0;
  }
}

function readTopLevelTree(): Array<{ name: string; kind: "dir" | "file" }> {
  try {
    return fs
      .readdirSync(REPO_ROOT, { withFileTypes: true })
      .filter((e) => !e.name.startsWith(".") && e.name !== "node_modules")
      .slice(0, 40)
      .map((e) => ({ name: e.name, kind: e.isDirectory() ? "dir" : "file" }));
  } catch {
    return [];
  }
}

function keyFileMeta(relPath: string): { path: string; exists: boolean } {
  const abs = path.join(REPO_ROOT, relPath);
  return { path: relPath, exists: fs.existsSync(abs) };
}

function readSourceMapConnections(limit = 16): Array<Record<string, unknown>> {
  try {
    return dbPrepare(
      "kokuzo",
      `SELECT file_path, runtime_node, role, COUNT(1) AS hits, MAX(last_seen) AS last_seen
         FROM mc_source_map
        GROUP BY file_path, runtime_node, role
        ORDER BY hits DESC, last_seen DESC
        LIMIT ?`,
    ).all(Math.min(50, Math.max(1, limit))) as Record<string, unknown>[];
  } catch {
    return [];
  }
}

export type McSourceRegistryV1 = {
  items: McSourceItemV1[];
  links: Array<{ from: string; to: string; relation: string }>;
  canonical: McSourceItemV1[];
  mirror: McSourceItemV1[];
  backup: McSourceItemV1[];
  derived: McSourceItemV1[];
  graph: {
    nodes: Array<{
      id: string;
      label: string;
      kind: McSourceKindV1;
      role: McSourceRoleV1;
      status: "ok" | "stale" | "missing";
    }>;
    edges: Array<{ from: string; to: string; relation: McSourceRoleV1 }>;
  };
};

function mergeLinkedTo(a: string[], b: string[]): string[] {
  const set = new Set<string>();
  for (const x of a) if (typeof x === "string" && x) set.add(x);
  for (const x of b) if (typeof x === "string" && x) set.add(x);
  return Array.from(set);
}

function applySeedToItem(item: McSourceItemV1, seed?: McSourceSeedV1): McSourceItemV1 {
  if (!seed) return item;
  // Live-derived fields (e.g. GitHub HEAD tree URL, Notion DB id, runtime host)
  // take precedence. Seed only fills gaps and enriches linked_to.
  return {
    ...item,
    linked_to: mergeLinkedTo(item.linked_to, seed.linked_to),
    source_kind: item.source_kind || seed.source_kind,
    source_name: item.source_name || seed.source_name || item.label,
    source_uri: item.source_uri || seed.source_uri || item.location || "",
    source_role: item.source_role || seed.source_role,
    last_seen: item.last_seen || seed.last_seen,
    note: item.note || seed.note,
  };
}

export function buildMcSourceRegistryV1(): McSourceRegistryV1 {
  const gitState = readState<McgitState>("git_state");
  const liveState = readState<McLiveState>("live_state");
  const vpsAssets = readState<McVpsAssets>("vps_assets");
  const notionSync = readState<McNotionSync>("notion_sync");
  const dbStatus = readState<McDbStatus>("db_status");
  const overview = readState<McOverview>("overview");

  const seed = buildMcSourceRegistrySeedV1();
  const seedById = new Map(seed.map((s) => [s.id, s] as const));
  const nowIso = new Date().toISOString();

  const dirByPath = new Map(
    (vpsAssets?.directories || []).map((d) => [safeStr(d.path), d] as const),
  );
  const nasDir =
    (vpsAssets?.directories || []).find((d) => safeStr(d.path).includes("nas_mirror")) ??
    dirByPath.get(path.join(DATA_ROOT, "nas_mirror"));
  const backupDir =
    (vpsAssets?.directories || []).find((d) => /backup|bak/i.test(safeStr(d.path))) ??
    undefined;
  const constitutionDir =
    (vpsAssets?.directories || []).find((d) => safeStr(d.path).includes("constitution")) ??
    dirByPath.get(path.join(DATA_ROOT, "constitution"));

  const sacredCorpusCount =
    safeNum(dbStatus?.sacred_corpus?.corpus_count, 0) ||
    queryCount("SELECT COUNT(1) AS c FROM sacred_corpus_registry");
  const learningLedgerCount = queryCount("SELECT COUNT(1) AS c FROM scripture_learning_ledger");

  const notionItems: McSourceItemV1[] =
    notionSync?.dbs?.length
      ? notionSync.dbs.slice(0, 4).map((db) => {
          const id = `notion:${safeStr(db.db_id) || safeStr(db.name)}`;
          return {
            id,
            label: `Notion · ${safeStr(db.name) || "database"}`,
            category: "notion",
            role: "canonical",
            linked_to: ["github:main-repo", "corpus:sacred", "persona:state-db"],
            status: stateStatus(notionSync),
            location: `notion-db:${safeStr(db.db_id).slice(0, 36)}`,
            record_count: safeNum(db.record_count, 0),
            note: `open_tasks=${safeNum(db.open_tasks, 0)} blocked=${safeNum(db.blocked_tasks, 0)}`,
            source_kind: "notion",
            source_name: `Notion · ${safeStr(db.name) || "database"}`,
            source_uri: `https://www.notion.so/${safeStr(db.db_id).replace(/-/g, "")}`,
            source_role: "canonical",
            last_seen: safeStr(notionSync?.generated_at) || nowIso,
          };
        })
      : [];

  const githubBranch = safeStr(gitState?.branch);
  const githubHead = safeStr(gitState?.head_sha_short);
  const githubUri = githubHead
    ? `https://github.com/TenmonAI/tenmon-ark/tree/${githubHead}`
    : githubBranch
      ? `https://github.com/TenmonAI/tenmon-ark/tree/${githubBranch}`
      : "https://github.com/TenmonAI/tenmon-ark";

  const rawItems: McSourceItemV1[] = [
    ...notionItems,
    {
      id: "github:main-repo",
      label: safeStr(process.env.GITHUB_REPOSITORY) || "TENMON-ARK main repo",
      category: "github",
      role: "canonical",
      linked_to: ["runtime:primary-vps", "learning:scripture-ledger", "persona:state-db"],
      status: stateStatus(gitState),
      location: REPO_ROOT,
      branch: githubBranch,
      head_sha_short: githubHead,
      note: safeStr(gitState?.head_subject || overview?.git?.last_commit_subject),
      source_kind: "github",
      source_name: githubBranch
        ? `TenmonAI/tenmon-ark · ${githubBranch}${githubHead ? ` @ ${githubHead}` : ""}`
        : "TenmonAI/tenmon-ark",
      source_uri: githubUri,
      source_role: "canonical",
      last_seen: safeStr(gitState?.generated_at) || nowIso,
    },
    {
      id: "runtime:primary-vps",
      label: safeStr(liveState?.host?.hostname) || "primary runtime VPS",
      category: "runtime",
      role: "mirror",
      linked_to: ["github:main-repo", "nas:books-mirror", "backup:offsite-vps"],
      status: stateStatus(liveState),
      location: safeStr(liveState?.host?.public_ip || "127.0.0.1"),
      runtime_node: safeStr(liveState?.service?.name || "tenmon-ark-api"),
      note: `service_active=${liveState?.service?.active ? "1" : "0"}`,
      source_kind: "runtime",
      source_name: safeStr(liveState?.host?.hostname) || "primary-vps",
      source_uri: "https://tenmon-ark.com",
      source_role: "mirror",
      last_seen: safeStr(liveState?.generated_at) || nowIso,
    },
    {
      id: "backup:offsite-vps",
      label: "Backup / offsite mirror target",
      category: "backup_vps",
      role: "backup",
      linked_to: ["runtime:primary-vps", "nas:books-mirror"],
      status: backupDir ? "ok" : nasDir ? "stale" : "missing",
      location: safeStr(backupDir?.path || nasDir?.path || path.join(DATA_ROOT, "nas_mirror")),
      note: backupDir
        ? "vps_assets 上で backup 系ディレクトリを検出"
        : "remote backup host 未収集のため、現時点では backup storage root を表示",
      source_kind: "backup_vps",
      source_name: "Offsite backup VPS",
      source_uri: "ssh://tenmon-backup",
      source_role: "backup",
      last_seen: safeStr(vpsAssets?.generated_at) || nowIso,
    },
    {
      id: "nas:books-mirror",
      label: "NAS books / mirror",
      category: "nas",
      role: "mirror",
      linked_to: ["backup:offsite-vps", "corpus:sacred"],
      status: nasDir ? stateStatus(vpsAssets) : "missing",
      location: safeStr(nasDir?.path || path.join(DATA_ROOT, "nas_mirror")),
      file_count: safeNum(nasDir?.file_count, 0),
      size_mb: safeNum(nasDir?.size_mb, 0),
      source_kind: "nas",
      source_name: "NAS books mirror",
      source_uri: `file://${safeStr(nasDir?.path || path.join(DATA_ROOT, "nas_mirror"))}`,
      source_role: "mirror",
      last_seen: safeStr(vpsAssets?.generated_at) || nowIso,
    },
    {
      id: "corpus:sacred",
      label: "Sacred corpus registry",
      category: "sacred_corpus",
      role: "canonical",
      linked_to: ["nas:books-mirror", "persona:state-db", "learning:scripture-ledger"],
      status: sacredCorpusCount > 0 ? "ok" : "missing",
      location: `${getDbPath("kokuzo")}:sacred_corpus_registry`,
      record_count: sacredCorpusCount,
      note: `db_status.segment_count=${safeNum(dbStatus?.sacred_corpus?.segment_count, 0)}`,
      source_kind: "sacred_corpus",
      source_name: "Sacred corpus registry",
      source_uri: `sqlite://${getDbPath("kokuzo")}#sacred_corpus_registry`,
      source_role: "canonical",
      last_seen: safeStr(dbStatus?.generated_at) || nowIso,
    },
    {
      id: "constitution:soul-root",
      label: "Soul-root constitutions",
      category: "constitution",
      role: "canonical",
      linked_to: ["github:main-repo", "corpus:sacred"],
      status: constitutionDir ? stateStatus(vpsAssets) : fs.existsSync(CANON_DIR) ? "ok" : "missing",
      location: safeStr(constitutionDir?.path || CANON_DIR),
      file_count: safeNum(constitutionDir?.file_count, 0),
      source_kind: "constitution",
      source_name: "Soul-root constitutions (docs/ark)",
      source_uri: `file://${safeStr(constitutionDir?.path || CANON_DIR)}`,
      source_role: "canonical",
      last_seen: safeStr(vpsAssets?.generated_at) || nowIso,
    },
    {
      id: "persona:state-db",
      label: "Persona state DB",
      category: "persona",
      role: "derived",
      linked_to: ["corpus:sacred", "learning:scripture-ledger", "github:main-repo"],
      status: fs.existsSync(getDbPath("persona")) ? "ok" : "missing",
      location: getDbPath("persona"),
      note: "persona.sqlite",
      source_kind: "persona",
      source_name: "Persona state DB",
      source_uri: `sqlite://${getDbPath("persona")}`,
      source_role: "derived",
      last_seen: nowIso,
    },
    {
      id: "learning:scripture-ledger",
      label: "Learning ledger",
      category: "learning",
      role: "derived",
      linked_to: ["persona:state-db", "corpus:sacred", "github:main-repo"],
      status: learningLedgerCount > 0 ? "ok" : "stale",
      location: `${getDbPath("kokuzo")}:scripture_learning_ledger`,
      record_count: learningLedgerCount,
      source_kind: "learning",
      source_name: "Learning ledger",
      source_uri: `sqlite://${getDbPath("kokuzo")}#scripture_learning_ledger`,
      source_role: "derived",
      last_seen: nowIso,
    },
  ];

  // Merge seed into existing items (by id) so we preserve stable identifiers
  // while enriching linked_to / note from the static seed.
  const byId = new Map<string, McSourceItemV1>();
  for (const item of rawItems) {
    byId.set(item.id, applySeedToItem(item, seedById.get(item.id)));
  }

  // Add any seed-only entries (notion:workspace, persona:module, learning:ledger-spec,
  // core:tenmon-kanagi, ...) that are not produced from live state.
  for (const s of seed) {
    if (byId.has(s.id)) continue;
    byId.set(s.id, {
      id: s.id,
      label: s.source_name,
      category: s.source_kind,
      role: s.source_role,
      linked_to: [...s.linked_to],
      status: "ok",
      location: s.source_uri,
      note: s.note,
      source_kind: s.source_kind,
      source_name: s.source_name,
      source_uri: s.source_uri,
      source_role: s.source_role,
      last_seen: s.last_seen,
    });
  }

  const items = Array.from(byId.values());

  const links = items.flatMap((item) =>
    item.linked_to.map((to) => ({
      from: item.id,
      to,
      relation: item.source_role,
    })),
  );

  const canonical = items.filter((x) => x.source_role === "canonical");
  const mirror = items.filter((x) => x.source_role === "mirror");
  const backup = items.filter((x) => x.source_role === "backup");
  const derived = items.filter((x) => x.source_role === "derived");

  const knownIds = new Set(items.map((x) => x.id));
  const graph = {
    nodes: items.map((x) => ({
      id: x.id,
      label: x.source_name || x.label,
      kind: x.source_kind,
      role: x.source_role,
      status: x.status,
    })),
    edges: links.filter((l) => knownIds.has(l.to)).map((l) => ({
      from: l.from,
      to: l.to,
      relation: l.relation as McSourceRoleV1,
    })),
  };

  return { items, links, canonical, mirror, backup, derived, graph };
}

export function buildMcRepoMapV1(): Record<string, unknown> {
  const gitState = readState<McgitState>("git_state");
  const branch = safeStr(gitState?.branch);
  const head = safeStr(gitState?.head_sha_short);
  const githubUri = head
    ? `https://github.com/TenmonAI/tenmon-ark/tree/${head}`
    : branch
      ? `https://github.com/TenmonAI/tenmon-ark/tree/${branch}`
      : "https://github.com/TenmonAI/tenmon-ark";
  return {
    repo_root: REPO_ROOT,
    branch,
    head_sha_short: head,
    head_subject: safeStr(gitState?.head_subject),
    dirty: Boolean(gitState?.dirty),
    modified_count: safeNum(gitState?.modified_count, 0),
    untracked_count: safeNum(gitState?.untracked_count, 0),
    source: {
      id: "github:main-repo",
      source_kind: "github",
      source_name: branch
        ? `TenmonAI/tenmon-ark · ${branch}${head ? ` @ ${head}` : ""}`
        : "TenmonAI/tenmon-ark",
      source_uri: githubUri,
      source_role: "canonical",
      linked_to: [
        "runtime:primary-vps",
        "learning:scripture-ledger",
        "persona:state-db",
        "core:tenmon-kanagi",
      ],
      last_seen: safeStr(gitState?.generated_at) || new Date().toISOString(),
    },
    top_level_tree: readTopLevelTree(),
    key_files: [
      keyFileMeta("api/src/routes/chat.ts"),
      keyFileMeta("api/src/core/llmWrapper.ts"),
      keyFileMeta("api/src/mc/vnextPayloads.ts"),
      keyFileMeta("api/src/mc/sourceRegistry_seed.ts"),
      keyFileMeta("api/src/mc/mcVnextSourceMapV1.ts"),
      keyFileMeta("web/src/pages/mission-control-vnext/McVnextApp.tsx"),
      keyFileMeta("infra/nginx/tenmon-ark.com.conf"),
    ],
    recent_commits: gitState?.recent_commits?.slice(0, 8) ?? [],
    runtime_connections: readSourceMapConnections(16),
  };
}

/**
 * CARD-MC-08A V2 — collector-free fallbacks. When `live_state.json` /
 * `vps_assets.json` / `db_status.json` are missing or malformed, we still
 * surface hostname, OS, service state, known sqlite DBs and TENMON data
 * directories so `/api/mc/vnext/infra` is never placeholder-only.
 */
function safeExec(cmd: string, args: string[], timeoutMs = 1500): string {
  try {
    return execFileSync(cmd, args, {
      timeout: timeoutMs,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function fallbackSystemdServices(): Array<Record<string, unknown>> {
  const services = [
    "tenmon-ark-api.service",
    "nginx.service",
    "mc-collect-live.timer",
    "mc-collect-git.timer",
    "mc-collect-all.timer",
  ];
  const out: Array<Record<string, unknown>> = [];
  for (const unit of services) {
    const active = safeExec("systemctl", ["is-active", unit]);
    if (!active) continue;
    const substate = safeExec("systemctl", [
      "show",
      unit,
      "--property=SubState",
      "--value",
    ]);
    const mainPid = safeExec("systemctl", [
      "show",
      unit,
      "--property=MainPID",
      "--value",
    ]);
    out.push({
      unit,
      active,
      substate,
      main_pid: mainPid ? Number(mainPid) : null,
    });
  }
  return out;
}

function fallbackDatabases(): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  try {
    const entries = fs
      .readdirSync(DATA_ROOT, { withFileTypes: true })
      .filter((e) => e.isFile() && /\.sqlite$/.test(e.name));
    for (const e of entries) {
      const full = path.join(DATA_ROOT, e.name);
      try {
        const st = fs.statSync(full);
        out.push({
          name: e.name,
          path: full,
          size_mb: Math.round(st.size / (1024 * 1024)),
          modified: st.mtime.toISOString(),
        });
      } catch {}
    }
  } catch {}
  return out;
}

function fallbackDirectories(): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const roots = [
    DATA_ROOT,
    path.join(DATA_ROOT, "nas_mirror"),
    path.join(DATA_ROOT, "mc"),
    REPO_ROOT,
    CANON_DIR,
  ];
  for (const p of roots) {
    try {
      const st = fs.statSync(p);
      if (!st.isDirectory()) continue;
      const entries = fs.readdirSync(p);
      out.push({
        path: p,
        kind: p === REPO_ROOT ? "repo" : p === CANON_DIR ? "canon" : "data",
        entry_count: entries.length,
        modified: st.mtime.toISOString(),
      });
    } catch {}
  }
  return out;
}

function fallbackNginxSites(): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const dirs = [
    "/etc/nginx/conf.d",
    "/etc/nginx/sites-enabled",
    "/etc/nginx/sites-available",
  ];
  const seen = new Set<string>();
  for (const d of dirs) {
    try {
      const entries = fs.readdirSync(d);
      for (const e of entries) {
        // accept both `.conf` files and plain-named sites (like `tenmon-ark`)
        if (/\.bak|\.sav/i.test(e)) continue;
        if (seen.has(e)) continue;
        seen.add(e);
        try {
          const st = fs.statSync(path.join(d, e));
          if (!st.isFile() && !st.isSymbolicLink()) continue;
          out.push({
            name: e,
            dir: d,
            size_bytes: st.size,
            modified: st.mtime.toISOString(),
          });
        } catch {}
      }
    } catch {}
  }
  return out;
}

export function buildMcInfraMapV1(): Record<string, unknown> {
  const liveState = readState<McLiveState>("live_state");
  const vpsAssets = readState<McVpsAssets>("vps_assets");
  const dbStatus = readState<McDbStatus>("db_status");

  // ---- runtime (live_state w/ Node.js fallback) ----
  const hostnameNode = os.hostname();
  const osNode = `${os.type()} ${os.release()}`;
  const svcActiveLive = safeExec("systemctl", ["is-active", "tenmon-ark-api"]);
  const runtime = {
    hostname: safeStr(liveState?.host?.hostname) || hostnameNode,
    public_ip: safeStr(liveState?.host?.public_ip),
    os: safeStr(liveState?.host?.os) || osNode,
    service: safeStr(liveState?.service?.name) || "tenmon-ark-api",
    service_active:
      liveState?.service?.active != null
        ? Boolean(liveState?.service?.active)
        : svcActiveLive === "active",
    uptime_sec: liveState?.service?.uptime_sec ?? Math.floor(os.uptime()),
    node_version: process.version,
    process_pid: process.pid,
    process_uptime_sec: Math.floor(process.uptime()),
    state_file_stale: liveState?.stale ?? true,
  };

  // ---- directories / systemd / nginx / databases (with fallback) ----
  const directories = vpsAssets?.directories?.length
    ? vpsAssets.directories
    : fallbackDirectories();
  const systemd_services = vpsAssets?.systemd_services?.length
    ? vpsAssets.systemd_services
    : fallbackSystemdServices();
  const nginx_sites = vpsAssets?.nginx_sites?.length
    ? vpsAssets.nginx_sites
    : fallbackNginxSites();
  const databases = dbStatus?.databases?.length
    ? dbStatus.databases.slice(0, 6)
    : fallbackDatabases();

  const nodes = [
    {
      id: "runtime-primary",
      label: safeStr(liveState?.host?.hostname) || "primary-vps",
      kind: "runtime_vps",
      status: liveState?.service?.active ? "ok" : liveState ? "stale" : "missing",
      location: safeStr(liveState?.host?.public_ip || "127.0.0.1"),
      source_id: "runtime:primary-vps",
      source_uri: "https://tenmon-ark.com",
      linked_to: ["data-root", "nas-mirror", "backup-target"],
    },
    {
      id: "data-root",
      label: "TENMON data root",
      kind: "storage",
      status: "ok",
      location: DATA_ROOT,
      source_id: "runtime:primary-vps",
      source_uri: `file://${DATA_ROOT}`,
      linked_to: ["persona-db", "kokuzo-db", "nas-mirror"],
    },
    {
      id: "nas-mirror",
      label: "NAS mirror",
      kind: "nas",
      status: (vpsAssets?.directories || []).some((d) => safeStr(d.path).includes("nas_mirror")) ? "ok" : "stale",
      location: path.join(DATA_ROOT, "nas_mirror"),
      source_id: "nas:books-mirror",
      source_uri: `file://${path.join(DATA_ROOT, "nas_mirror")}`,
      linked_to: ["backup-target", "sacred-corpus"],
    },
    {
      id: "backup-target",
      label: "Backup target",
      kind: "backup",
      status: (vpsAssets?.directories || []).some((d) => /backup|bak/i.test(safeStr(d.path))) ? "ok" : "stale",
      location: path.join(DATA_ROOT, "nas_mirror"),
      source_id: "backup:offsite-vps",
      source_uri: "ssh://tenmon-backup",
      linked_to: ["runtime-primary"],
    },
  ];

  return {
    runtime,
    source: {
      id: "runtime:primary-vps",
      source_kind: "runtime",
      source_name: runtime.hostname || "primary-vps",
      source_uri: "https://tenmon-ark.com",
      source_role: "mirror",
      linked_to: ["github:main-repo", "nas:books-mirror", "backup:offsite-vps"],
      last_seen: safeStr(liveState?.generated_at) || new Date().toISOString(),
    },
    resources: liveState?.resources ?? null,
    directories,
    systemd_services,
    nginx_sites,
    databases,
    topology_nodes: nodes,
  };
}
