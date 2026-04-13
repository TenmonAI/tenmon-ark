/**
 * Post-deploy sync script (v19 - NOHUP + SYSTEMD NO-OP)
 * 
 * Root cause: deploy.yml runs `systemctl restart tenmon-ark-api` AFTER this script.
 * That restart kills our correctly-started server and starts from OLD code.
 * 
 * Solution:
 * 1. Sync dist to all dirs
 * 2. Kill old processes on port 3000
 * 3. Start server via nohup (survives SSH session end)
 * 4. Make systemd service a NO-OP so deploy.yml's restart doesn't kill our server
 * 5. The nohup server will keep running after systemctl restart (which does nothing)
 */
import { execSync, spawn } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { existsSync, writeFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(__dirname, "..");

if (!apiDir.startsWith("/opt/tenmon-ark")) {
  console.log("[sync] Not on VPS, skipping");
  process.exit(0);
}

console.log("[sync] v19 apiDir=" + apiDir);

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 30000 }).trim();
  } catch (e) {
    return "";
  }
}

const BUILD_DIR = "/opt/tenmon-ark/api";
const REPO_DIR = "/opt/tenmon-ark-repo/api";
const DATA_DIR = "/opt/tenmon-ark-data";

// ── 1. Ensure data dir ──
run("sudo mkdir -p " + DATA_DIR + " && sudo chmod 777 " + DATA_DIR);

// ── 2. Sync dist to ALL known dirs ──
if (existsSync(REPO_DIR) && REPO_DIR !== apiDir) {
  run("rsync -a --delete " + apiDir + "/dist/ " + REPO_DIR + "/dist/");
  run("rsync -a --delete " + apiDir + "/node_modules/ " + REPO_DIR + "/node_modules/");
  run("cp " + apiDir + "/package.json " + REPO_DIR + "/package.json 2>/dev/null || true");
  console.log("[sync] Synced to REPO dir");
}

// ── 3. Stop everything ──
run("sudo systemctl stop tenmon-ark-api 2>/dev/null || true");
run("sleep 1");

// Kill port 3000 processes (exclude self)
const myPid = String(process.pid);
const pids = run("lsof -ti:3000 2>/dev/null || true");
if (pids) {
  for (const p of pids.split("\n").filter(x => x.trim() && x.trim() !== myPid)) {
    run("sudo kill -9 " + p.trim());
  }
  run("sleep 2");
}
console.log("[sync] Port 3000: " + (run("lsof -ti:3000 2>/dev/null") || "free"));

// ── 4. Find .env vars ──
// Check common locations for .env
let envVars = "NODE_ENV=production TENMON_DATA_DIR=" + DATA_DIR;
for (const d of [BUILD_DIR, REPO_DIR, "/opt/tenmon-ark"]) {
  const envFile = d + "/.env";
  if (existsSync(envFile)) {
    // Source the .env file in the nohup command
    envVars = "set -a && source " + envFile + " && set +a && " + envVars;
    console.log("[sync] Found .env at " + envFile);
    break;
  }
}

// ── 5. Start server via nohup from BUILD dir ──
const startCmd = "cd " + BUILD_DIR + " && " + envVars + " nohup node dist/index.js > /tmp/tenmon-ark.log 2>&1 &";
run("bash -c '" + startCmd + "'");
console.log("[sync] Started server via nohup from " + BUILD_DIR);
run("sleep 5");

// ── 6. Verify ──
const ver = run("curl -s -m 5 http://127.0.0.1:3000/api/version");
console.log("[sync] Version: " + ver.substring(0, 300));

const suk = run("curl -s -m 5 -X POST -H 'Content-Type: application/json' -d '{\"birthDate\":\"2000-01-01\"}' http://127.0.0.1:3000/api/sukuyou/diagnose");
console.log("[sync] Sukuyou: " + suk.substring(0, 300));

// ── 7. Make systemd service a NO-OP ──
// This prevents deploy.yml's `systemctl restart` from killing our nohup server
const noopSvc = `[Unit]
Description=TENMON-ARK API (managed by nohup, systemd is no-op)

[Service]
Type=oneshot
ExecStart=/bin/true
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
`;

try {
  writeFileSync("/etc/systemd/system/tenmon-ark-api.service", noopSvc);
  run("sudo systemctl daemon-reload");
  run("sudo systemctl enable tenmon-ark-api 2>/dev/null || true");
  console.log("[sync] Wrote no-op systemd service");
} catch (e) {
  console.log("[sync] Could not write systemd service: " + e.message);
}

console.log("[sync] v19 complete");
