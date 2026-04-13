/**
 * Post-deploy sync script (v16 - DEFINITIVE SIMPLE)
 * 
 * Root cause: deploy.yml's `systemctl restart` never executes
 * (SSH session ends after `npm run build`).
 * 
 * Solution: Do the restart ourselves, RIGHT HERE.
 * 
 * Steps:
 * 1. Ensure data dir
 * 2. Sync dist/node_modules to REPO dir  
 * 3. Write correct systemd service
 * 4. Stop service + kill port 3000 processes
 * 5. Start service via systemctl
 * 6. Verify
 */
import { execSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { existsSync, writeFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(__dirname, "..");

if (!apiDir.startsWith("/opt/tenmon-ark")) {
  console.log("[sync] Not on VPS, skipping");
  process.exit(0);
}

console.log("[sync] v16 apiDir=" + apiDir);

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 60000 }).trim();
  } catch (e) {
    return "[err: " + String(e.stderr || e.message || "").substring(0, 200) + "]";
  }
}

const BUILD_DIR = "/opt/tenmon-ark/api";
const REPO_DIR = "/opt/tenmon-ark-repo/api";

// ── 1. Data dir ──
run("sudo mkdir -p /opt/tenmon-ark-data && sudo chmod 777 /opt/tenmon-ark-data");

// ── 2. Find .env ──
let envPath = "";
if (existsSync(BUILD_DIR + "/.env")) envPath = BUILD_DIR + "/.env";
else if (existsSync(REPO_DIR + "/.env")) envPath = REPO_DIR + "/.env";
console.log("[sync] envPath=" + (envPath || "NONE"));

// ── 3. Sync to REPO dir ──
if (existsSync(REPO_DIR)) {
  run("rsync -a --delete " + BUILD_DIR + "/dist/ " + REPO_DIR + "/dist/ 2>/dev/null || true");
  run("rsync -a --delete " + BUILD_DIR + "/node_modules/ " + REPO_DIR + "/node_modules/ 2>/dev/null || true");
  console.log("[sync] Synced to REPO dir");
}

// ── 4. Write systemd service ──
const envLine = envPath ? ("EnvironmentFile=" + envPath) : "";
const svc = [
  "[Unit]",
  "Description=TENMON-ARK API Server",
  "After=network.target",
  "",
  "[Service]",
  "Type=simple",
  "User=root",
  "WorkingDirectory=" + BUILD_DIR,
  envLine,
  "Environment=NODE_ENV=production",
  "Environment=TENMON_DATA_DIR=/opt/tenmon-ark-data",
  "ExecStart=/usr/bin/node " + BUILD_DIR + "/dist/index.js",
  "Restart=always",
  "RestartSec=5",
  "",
  "[Install]",
  "WantedBy=multi-user.target",
  ""
].filter(Boolean).join("\n");

try {
  writeFileSync("/etc/systemd/system/tenmon-ark-api.service", svc);
  run("sudo systemctl daemon-reload");
  run("sudo systemctl unmask tenmon-ark-api 2>/dev/null || true");
  run("sudo systemctl enable tenmon-ark-api 2>/dev/null || true");
  console.log("[sync] Wrote systemd service");
} catch (e) {
  console.error("[sync] systemd write failed:", e.message);
}

// ── 5. Stop everything on port 3000 ──
run("sudo systemctl stop tenmon-ark-api 2>/dev/null || true");
run("sleep 1");

// Kill any remaining processes on port 3000 (nohup leftovers etc)
const myPid = String(process.pid);
const pids = run("lsof -ti:3000 2>/dev/null || true");
if (pids && !pids.startsWith("[err")) {
  for (const p of pids.split("\n").filter(x => x.trim() && x.trim() !== myPid)) {
    console.log("[sync] Killing PID " + p.trim());
    run("sudo kill -9 " + p.trim() + " 2>/dev/null || true");
  }
  run("sleep 2");
}
const portCheck = run("lsof -ti:3000 2>/dev/null || echo free");
console.log("[sync] Port 3000: " + portCheck);

// ── 6. Start service ──
console.log("[sync] Starting service...");
const startResult = run("sudo systemctl start tenmon-ark-api 2>&1");
if (startResult && startResult.startsWith("[err")) {
  console.error("[sync] systemctl start failed: " + startResult);
}
run("sleep 5");

// ── 7. Verify ──
const status = run("systemctl is-active tenmon-ark-api 2>&1");
console.log("[sync] Service: " + status);

const ver = run("curl -s -m 5 http://127.0.0.1:3000/api/version 2>&1");
console.log("[sync] Version: " + ver.substring(0, 300));

const suk = run("curl -s -m 5 -X POST -H 'Content-Type: application/json' -d '{\"birthDate\":\"2000-01-01\"}' http://127.0.0.1:3000/api/sukuyou/diagnose 2>&1");
console.log("[sync] Sukuyou: " + suk.substring(0, 300));

console.log("[sync] v16 complete");
