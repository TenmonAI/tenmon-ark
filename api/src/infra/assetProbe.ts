import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

export type InfraProbeStatus = "healthy" | "broken" | "degraded" | "unverified" | "unknown";

export interface InfraAssetRow {
  asset_key: string;
  asset_type: string;
  asset_group: string;
  display_name: string;
  status_policy: string;
  probe_kind: string;
  probe_target: string;
  backup_policy: string;
  source_of_truth: string;
  notes?: string | null;
  is_enabled?: number;
}

export interface InfraProbeResult {
  assetKey: string;
  status: InfraProbeStatus;
  summary: string;
  evidence: Record<string, unknown>;
  nextAction: string | null;
  observedAt: string;
  observerVersion: string;
}

const OBSERVER_VERSION = "INFRA_ASSET_PROBE_ENGINE_V1";

function nowIso(): string {
  return new Date().toISOString();
}

function run(cmd: string, args: string[]): { ok: boolean; stdout: string; stderr: string; code: number | null } {
  try {
    const stdout = execFileSync(cmd, args, { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, stdout: String(stdout || ""), stderr: "", code: 0 };
  } catch (e: any) {
    return {
      ok: false,
      stdout: String(e?.stdout || ""),
      stderr: String(e?.stderr || e?.message || ""),
      code: typeof e?.status === "number" ? e.status : null,
    };
  }
}

function parseSystemctlShow(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of String(text || "").split("\n")) {
    const i = line.indexOf("=");
    if (i <= 0) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    out[k] = v;
  }
  return out;
}

function probeSystemdStatus(assetKey: string, unit: string): InfraProbeResult {
  const r = run("systemctl", [
    "show",
    unit,
    "--no-pager",
    "-p", "ActiveState",
    "-p", "SubState",
    "-p", "Result",
    "-p", "ExecMainStatus",
    "-p", "UnitFileState",
  ]);
  const parsed = parseSystemctlShow(r.stdout);
  const active = parsed.ActiveState || "";
  const sub = parsed.SubState || "";
  const result = parsed.Result || "";
  const execMainStatus = parsed.ExecMainStatus || "";
  let status: InfraProbeStatus = "unknown";
  let summary = `${unit} active=${active} sub=${sub} result=${result}`;

  if (active === "active") {
    status = "healthy";
  } else if (active === "inactive" && (result === "success" || execMainStatus === "0")) {
    status = "healthy";
  } else if (active === "failed") {
    status = "broken";
  } else if (active) {
    status = "degraded";
  } else if (!r.ok) {
    status = "broken";
    summary = `${unit} probe failed`;
  }

  return {
    assetKey,
    status,
    summary,
    evidence: {
      unit,
      active,
      sub,
      result,
      execMainStatus,
      unitFileState: parsed.UnitFileState || "",
      stdout: r.stdout,
      stderr: r.stderr,
      code: r.code,
    },
    nextAction: status === "broken" ? `journalctl -u ${unit} -n 80 --no-pager` : null,
    observedAt: nowIso(),
    observerVersion: OBSERVER_VERSION,
  };
}

function probeTimerStatus(assetKey: string, unit: string): InfraProbeResult {
  const r = run("systemctl", [
    "show",
    unit,
    "--no-pager",
    "-p", "ActiveState",
    "-p", "SubState",
    "-p", "Result",
    "-p", "NextElapseUSecRealtime",
    "-p", "LastTriggerUSec",
  ]);
  const parsed = parseSystemctlShow(r.stdout);
  const active = parsed.ActiveState || "";
  const sub = parsed.SubState || "";
  const result = parsed.Result || "";
  let status: InfraProbeStatus = "unknown";

  if (active === "active" && sub === "waiting") status = "healthy";
  else if (active === "failed") status = "broken";
  else if (active) status = "degraded";
  else if (!r.ok) status = "broken";

  return {
    assetKey,
    status,
    summary: `${unit} active=${active} sub=${sub} result=${result}`,
    evidence: {
      unit,
      active,
      sub,
      result,
      nextElapse: parsed.NextElapseUSecRealtime || "",
      lastTrigger: parsed.LastTriggerUSec || "",
      stdout: r.stdout,
      stderr: r.stderr,
      code: r.code,
    },
    nextAction: status === "broken" ? `systemctl status ${unit} --no-pager -l` : null,
    observedAt: nowIso(),
    observerVersion: OBSERVER_VERSION,
  };
}

function probeHttpJson(assetKey: string, url: string): InfraProbeResult {
  const r = run("curl", ["-fsS", "--max-time", "10", url]);
  let parsed: any = null;
  try { parsed = JSON.parse(r.stdout); } catch {}
  const ok = Boolean(parsed && typeof parsed === "object" && parsed.ok === true);
  return {
    assetKey,
    status: ok ? "healthy" : (r.ok ? "degraded" : "broken"),
    summary: ok ? `${url} ok=true` : `${url} response observed`,
    evidence: {
      url,
      ok,
      body: parsed ?? r.stdout,
      stderr: r.stderr,
      code: r.code,
    },
    nextAction: ok ? null : `curl -fsS ${url}`,
    observedAt: nowIso(),
    observerVersion: OBSERVER_VERSION,
  };
}

function probeFileExists(assetKey: string, path: string): InfraProbeResult {
  const exists = existsSync(path);
  return {
    assetKey,
    status: exists ? "healthy" : "broken",
    summary: exists ? `${path} exists` : `${path} missing`,
    evidence: { path, exists },
    nextAction: exists ? null : `ls -l ${path}`,
    observedAt: nowIso(),
    observerVersion: OBSERVER_VERSION,
  };
}

function probeSqliteExists(assetKey: string, path: string): InfraProbeResult {
  const exists = existsSync(path);
  return {
    assetKey,
    status: exists ? "healthy" : "broken",
    summary: exists ? `${path} exists` : `${path} missing`,
    evidence: { path, exists },
    nextAction: exists ? null : `ls -l ${path}`,
    observedAt: nowIso(),
    observerVersion: OBSERVER_VERSION,
  };
}

function probeSqliteQuery(assetKey: string, target: string): InfraProbeResult {
  const sep = "::";
  const i = target.indexOf(sep);
  const db = i >= 0 ? target.slice(0, i) : target;
  const sql = i >= 0 ? target.slice(i + sep.length) : "SELECT 1;";
  const r = run("sqlite3", [db, sql]);
  return {
    assetKey,
    status: r.ok ? "healthy" : "broken",
    summary: r.ok ? `sqlite query ok on ${db}` : `sqlite query failed on ${db}`,
    evidence: { db, sql, stdout: r.stdout.trim(), stderr: r.stderr, code: r.code },
    nextAction: r.ok ? null : `sqlite3 ${db} "${sql}"`,
    observedAt: nowIso(),
    observerVersion: OBSERVER_VERSION,
  };
}

function probeSshRemoteLs(assetKey: string, target: string): InfraProbeResult {
  const i = target.indexOf(":");
  const host = i >= 0 ? target.slice(0, i) : target;
  const path = i >= 0 ? target.slice(i + 1) : "";
  const r = run("ssh", [
    "-o", "BatchMode=yes",
    "-o", "ConnectTimeout=8",
    host,
    `ls -ld ${path}`,
  ]);
  return {
    assetKey,
    status: r.ok ? "healthy" : "broken",
    summary: r.ok ? `${host}:${path} reachable` : `${host}:${path} unreachable`,
    evidence: { host, path, stdout: r.stdout.trim(), stderr: r.stderr, code: r.code },
    nextAction: r.ok ? null : `ssh ${host} "ls -ld ${path}"`,
    observedAt: nowIso(),
    observerVersion: OBSERVER_VERSION,
  };
}

function probeMount(assetKey: string, pattern: string): InfraProbeResult {
  const cmd = pattern === "nas"
    ? "mount | grep -Ei 'nas|nfs|cifs|smb|sshfs' || true"
    : `mount | grep -Ei '${pattern}' || true`;
  const r = run("bash", ["-lc", cmd]);
  const out = String(r.stdout || "").trim();
  const status: InfraProbeStatus = out ? "healthy" : "unverified";
  return {
    assetKey,
    status,
    summary: out ? "matching mount found" : "no matching mount found",
    evidence: { pattern, stdout: out, stderr: r.stderr, code: r.code },
    nextAction: out ? null : "mount | grep -Ei 'nas|nfs|cifs|smb|sshfs'",
    observedAt: nowIso(),
    observerVersion: OBSERVER_VERSION,
  };
}

function probeCommand(assetKey: string, command: string): InfraProbeResult {
  const r = run("bash", ["-lc", command]);
  return {
    assetKey,
    status: r.ok ? "healthy" : "broken",
    summary: r.ok ? "command probe ok" : "command probe failed",
    evidence: { command, stdout: r.stdout.trim(), stderr: r.stderr, code: r.code },
    nextAction: r.ok ? null : command,
    observedAt: nowIso(),
    observerVersion: OBSERVER_VERSION,
  };
}

export function probeAsset(row: InfraAssetRow): InfraProbeResult {
  const kind = String(row.probe_kind || "");
  const target = String(row.probe_target || "");

  if (kind === "systemd_status") return probeSystemdStatus(row.asset_key, target);
  if (kind === "timer_status") return probeTimerStatus(row.asset_key, target);
  if (kind === "http_json") return probeHttpJson(row.asset_key, target);
  if (kind === "file_exists") return probeFileExists(row.asset_key, target);
  if (kind === "sqlite_exists") return probeSqliteExists(row.asset_key, target);
  if (kind === "sqlite_query") return probeSqliteQuery(row.asset_key, target);
  if (kind === "ssh_remote_ls") return probeSshRemoteLs(row.asset_key, target);
  if (kind === "mount_probe") return probeMount(row.asset_key, target);
  if (kind === "command_probe") return probeCommand(row.asset_key, target);

  return {
    assetKey: row.asset_key,
    status: "unknown",
    summary: `unknown probe_kind: ${kind}`,
    evidence: { probe_kind: kind, probe_target: target },
    nextAction: null,
    observedAt: nowIso(),
    observerVersion: OBSERVER_VERSION,
  };
}

export function probeAssets(rows: InfraAssetRow[]): InfraProbeResult[] {
  return rows.map(probeAsset);
}
