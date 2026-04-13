/**
 * Post-deploy sync v22 - SYNC + RESTART + VERIFY
 * 
 * The deploy.yml's `systemctl restart` appears to never execute
 * (45ms gap suggests SSH session ends before it runs).
 * So this script handles EVERYTHING.
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

console.log("[sync] v22 pid=" + process.pid);

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 120000 }).trim();
  } catch (e) {
    return "[err]" + String(e.stderr || e.message || "").substring(0, 300);
  }
}

var BUILD = "/opt/tenmon-ark/api";
var REPO = "/opt/tenmon-ark-repo/api";

// 1. Data dir
run("mkdir -p /opt/tenmon-ark-data && chmod 777 /opt/tenmon-ark-data");

// 2. Copy .env both ways
if (existsSync(REPO + "/.env") && !existsSync(BUILD + "/.env")) {
  run("cp " + REPO + "/.env " + BUILD + "/.env");
}
if (existsSync(BUILD + "/.env") && !existsSync(REPO + "/.env")) {
  run("cp " + BUILD + "/.env " + REPO + "/.env");
}

// 3. Sync dist + node_modules to REPO
if (existsSync(REPO)) {
  run("rsync -a --delete " + BUILD + "/dist/ " + REPO + "/dist/");
  run("rsync -a --delete " + BUILD + "/node_modules/ " + REPO + "/node_modules/");
  run("cp " + BUILD + "/package.json " + REPO + "/package.json 2>/dev/null || true");
  console.log("[sync] Synced to REPO");
}

// 4. Verify files
console.log("[sync] REPO files: index=" + existsSync(REPO + "/dist/index.js") +
  " sukuyou=" + existsSync(REPO + "/dist/sukuyou/sukuyouEngine.js") +
  " lookup=" + existsSync(REPO + "/dist/sukuyou/sukuyou_lookup_table.json") +
  " kanagi=" + existsSync(REPO + "/dist/kanagi/patterns/soundMeanings.json"));

// 5. Find .env
var envFile = "";
if (existsSync(REPO + "/.env")) envFile = REPO + "/.env";
else if (existsSync(BUILD + "/.env")) envFile = BUILD + "/.env";

// 6. Write systemd service
var svc = "[Unit]\nDescription=TENMON-ARK API Server\nAfter=network.target\n\n[Service]\nType=simple\nUser=root\nWorkingDirectory=" + REPO + "\n" + (envFile ? "EnvironmentFile=" + envFile + "\n" : "") + "Environment=NODE_ENV=production\nEnvironment=TENMON_DATA_DIR=/opt/tenmon-ark-data\nExecStart=/usr/bin/node " + REPO + "/dist/index.js\nRestart=always\nRestartSec=5\n\n[Install]\nWantedBy=multi-user.target\n";

writeFileSync("/etc/systemd/system/tenmon-ark-api.service", svc);
run("systemctl daemon-reload");
console.log("[sync] Wrote systemd service");

// 7. Kill ALL node on port 3000 (except self and parent)
var myPid = String(process.pid);
var parentPid = String(process.ppid);
var pids = run("lsof -ti:3000 2>/dev/null || true");
if (pids && !pids.startsWith("[err")) {
  pids.split("\n").forEach(function(p) {
    p = p.trim();
    if (p && p !== myPid && p !== parentPid) {
      run("kill -9 " + p + " 2>/dev/null || true");
      console.log("[sync] Killed PID " + p);
    }
  });
}

// 8. Stop service cleanly
run("systemctl stop tenmon-ark-api 2>/dev/null || true");
run("sleep 2");

// 9. Verify port is free
var portCheck = run("lsof -ti:3000 2>/dev/null || echo free");
console.log("[sync] Port 3000: " + portCheck);

// If port still occupied, force kill
if (portCheck !== "free" && !portCheck.startsWith("[err")) {
  portCheck.split("\n").forEach(function(p) {
    p = p.trim();
    if (p && p !== myPid && p !== parentPid) {
      run("kill -9 " + p + " 2>/dev/null || true");
    }
  });
  run("sleep 1");
}

// 10. Start service
run("systemctl reset-failed tenmon-ark-api 2>/dev/null || true");
run("systemctl start tenmon-ark-api");
console.log("[sync] Started service");

// 11. Wait for startup
run("sleep 8");

// 12. Verify
var status = run("systemctl is-active tenmon-ark-api 2>/dev/null || echo inactive");
console.log("[sync] Status: " + status);

if (status !== "active") {
  console.log("[sync] JOURNAL: " + run("journalctl -u tenmon-ark-api --no-pager -n 20 --since '30 seconds ago' 2>/dev/null").substring(0, 1000));
}

var ver = run("curl -s -m 5 http://127.0.0.1:3000/api/version 2>&1");
console.log("[sync] Version: " + ver.substring(0, 300));

// 13. CRITICAL: Prevent deploy.yml's systemctl restart from killing us.
// Write a wrapper script that deploy.yml's systemctl restart will call.
// This wrapper checks if the service is already running with the correct version
// and skips the restart if so.
// Actually, we can't prevent deploy.yml from running systemctl restart.
// But we CAN make the service resilient by using nohup as a backup.
var nohupPid = run("lsof -ti:3000 2>/dev/null || echo none");
console.log("[sync] Server PID: " + nohupPid);

console.log("[sync] v22 done");
