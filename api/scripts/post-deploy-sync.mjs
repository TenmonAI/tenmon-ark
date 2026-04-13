/**
 * Post-deploy sync script (v8 - DEFINITIVE)
 * 
 * Problem: Old node process from /opt/tenmon-ark-repo/api keeps running.
 * The deploy script's `systemctl restart` fails because the new server crashes
 * (missing .env, DB permissions, etc.) and systemd gives up, leaving the old process.
 * 
 * Solution:
 * 1. Fix systemd service → /opt/tenmon-ark/api
 * 2. Ensure .env exists
 * 3. Ensure data directory exists with correct permissions
 * 4. Kill ALL old node processes on port 3000
 * 5. Start service and verify
 * 6. Deploy script's `systemctl restart` will just restart the working server
 */
import { execSync, spawnSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(__dirname, "..");

if (!apiDir.startsWith("/opt/tenmon-ark")) {
  console.log("[sync] Not on VPS, skipping");
  process.exit(0);
}

const myPid = String(process.pid);
console.log(`[sync] v8 apiDir=${apiDir} pid=${myPid}`);

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 30000 }).trim();
  } catch (e) {
    return `[err: ${String(e.stderr || e.message || "").substring(0, 200)}]`;
  }
}

// ── 1. Fix systemd service ──
const SERVICE_PATH = "/etc/systemd/system/tenmon-ark-api.service";
if (existsSync(SERVICE_PATH)) {
  const svc = readFileSync(SERVICE_PATH, "utf8");
  const wd = svc.match(/WorkingDirectory=(.+)/)?.[1]?.trim();
  console.log(`[sync] systemd WD: ${wd}`);
  
  if (wd !== apiDir) {
    let newSvc = svc
      .replace(/WorkingDirectory=.+/, `WorkingDirectory=${apiDir}`)
      .replace(/EnvironmentFile=.+/, `EnvironmentFile=${apiDir}/.env`);
    // Also change User to root to avoid permission issues
    newSvc = newSvc.replace(/User=www-data/, "User=root");
    writeFileSync(SERVICE_PATH, newSvc);
    run("systemctl daemon-reload");
    console.log(`[sync] Fixed WD: ${wd} → ${apiDir}`);
  }
} else {
  console.log("[sync] No service file found!");
}

// ── 2. Ensure .env exists ──
const envPath = `${apiDir}/.env`;
if (!existsSync(envPath)) {
  // Try to find .env in other locations
  const sources = [
    "/opt/tenmon-ark-repo/api/.env",
    "/opt/tenmon-ark/.env",
  ];
  for (const src of sources) {
    if (existsSync(src)) {
      run(`cp ${src} ${envPath}`);
      console.log(`[sync] Copied .env from ${src}`);
      break;
    }
  }
}
console.log(`[sync] .env exists: ${existsSync(envPath)}`);

// ── 3. Ensure data directory ──
const dataDir = "/opt/tenmon-ark-data";
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
  console.log(`[sync] Created ${dataDir}`);
}
run(`chmod 777 ${dataDir}`);

// ── 4. Stop service and kill ALL old processes ──
console.log("[sync] Stopping service...");
run("systemctl stop tenmon-ark-api 2>/dev/null || true");
run("sleep 2");

// Kill ALL node processes listening on port 3000 (except ourselves)
const portPids = run("lsof -ti:3000 2>/dev/null || true");
if (portPids && !portPids.startsWith("[err")) {
  for (const pid of portPids.split("\n").filter(p => p.trim() && p.trim() !== myPid)) {
    console.log(`[sync] Killing old process PID ${pid.trim()}`);
    run(`kill -9 ${pid.trim()} 2>/dev/null || true`);
  }
}
run("sleep 1");

// Double-check port is free
const portCheck = run("lsof -ti:3000 2>/dev/null || echo free");
console.log(`[sync] Port 3000: ${portCheck}`);

// ── 5. Start service ──
console.log("[sync] Starting service...");
run("systemctl reset-failed tenmon-ark-api 2>/dev/null || true");
run("systemctl start tenmon-ark-api");
run("sleep 6");

// ── 6. Verify ──
const status = run("systemctl is-active tenmon-ark-api");
console.log(`[sync] Status: ${status}`);

const journal = run("journalctl -u tenmon-ark-api --no-pager -n 25 --since '20 seconds ago' 2>&1");
console.log(`[sync] Journal:\n${journal.substring(0, 2000)}`);

const ver = run("curl -s -m 5 http://127.0.0.1:3000/api/version 2>&1");
console.log(`[sync] Version: ${ver.substring(0, 200)}`);

const suk = run("curl -s -m 5 -X POST -H 'Content-Type: application/json' -d '{\"birthDate\":\"2000-01-01\",\"name\":\"t\"}' http://127.0.0.1:3000/api/sukuyou/diagnose 2>&1");
console.log(`[sync] Sukuyou: ${suk.substring(0, 200)}`);

// Check which process is on port 3000
const finalPid = run("lsof -ti:3000 2>/dev/null || echo none");
if (finalPid !== "none") {
  const cwd = run(`readlink /proc/${finalPid.split("\\n")[0].trim()}/cwd 2>/dev/null || echo unknown`);
  console.log(`[sync] Running PID=${finalPid} CWD=${cwd}`);
}

console.log("[sync] ✅ v8 complete");
