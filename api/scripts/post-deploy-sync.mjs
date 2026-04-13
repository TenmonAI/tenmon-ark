/**
 * Post-deploy sync script (v18 - FINAL)
 * 
 * KEY INSIGHT: deploy.yml's `systemctl restart` NEVER executes because
 * the SSH session ends after `npm run build`. So this script MUST handle
 * the full server restart.
 * 
 * Steps:
 * 1. Ensure data directory
 * 2. Sync dist/node_modules to REPO dir
 * 3. Write correct systemd service
 * 4. Restart the service (stop + kill + start)
 * 5. Verify
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

var myPid = String(process.pid);
console.log("[sync] v18 apiDir=" + apiDir + " pid=" + myPid);

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 60000 }).trim();
  } catch (e) {
    return "[err: " + String(e.stderr || e.message || "").substring(0, 200) + "]";
  }
}

var BUILD_DIR = "/opt/tenmon-ark/api";
var REPO_DIR = "/opt/tenmon-ark-repo/api";

// 1. Ensure data directory
run("mkdir -p /opt/tenmon-ark-data && chmod 777 /opt/tenmon-ark-data");

// 2. Sync .env
var envSources = [REPO_DIR, BUILD_DIR];
for (var i = 0; i < envSources.length; i++) {
  var src = envSources[i];
  if (existsSync(src + "/.env")) {
    var dsts = [BUILD_DIR, REPO_DIR];
    for (var j = 0; j < dsts.length; j++) {
      var dst = dsts[j];
      if (!existsSync(dst + "/.env") && existsSync(dst)) {
        run("cp " + src + "/.env " + dst + "/.env");
        console.log("[sync] Copied .env to " + dst);
      }
    }
    break;
  }
}

// 3. Sync dist and node_modules to REPO dir
if (existsSync(REPO_DIR)) {
  run("rsync -a --delete " + BUILD_DIR + "/dist/ " + REPO_DIR + "/dist/ 2>/dev/null || true");
  run("rsync -a --delete " + BUILD_DIR + "/node_modules/ " + REPO_DIR + "/node_modules/ 2>/dev/null || true");
  console.log("[sync] Synced to REPO dir");
}

// 4. Write systemd service
var envFileLine = "";
if (existsSync(BUILD_DIR + "/.env")) {
  envFileLine = "EnvironmentFile=" + BUILD_DIR + "/.env\n";
} else if (existsSync(REPO_DIR + "/.env")) {
  envFileLine = "EnvironmentFile=" + REPO_DIR + "/.env\n";
}

var serviceContent = "[Unit]\n" +
  "Description=TENMON-ARK API Server\n" +
  "After=network.target\n\n" +
  "[Service]\n" +
  "Type=simple\n" +
  "User=root\n" +
  "WorkingDirectory=" + BUILD_DIR + "\n" +
  envFileLine +
  "Environment=NODE_ENV=production\n" +
  "Environment=TENMON_DATA_DIR=/opt/tenmon-ark-data\n" +
  "ExecStart=/usr/bin/node " + BUILD_DIR + "/dist/index.js\n" +
  "Restart=always\n" +
  "RestartSec=5\n\n" +
  "[Install]\n" +
  "WantedBy=multi-user.target\n";

try {
  writeFileSync("/etc/systemd/system/tenmon-ark-api.service", serviceContent);
  run("systemctl daemon-reload");
  run("systemctl enable tenmon-ark-api 2>/dev/null || true");
  console.log("[sync] Wrote systemd service");
} catch (e) {
  console.error("[sync] Failed to write systemd:", e.message);
}

// 5. RESTART: Stop service, kill port 3000, start service
console.log("[sync] Restarting server...");
run("systemctl stop tenmon-ark-api 2>/dev/null || true");
run("sleep 2");

// Kill any remaining processes on port 3000 (but not ourselves)
var pids = run("lsof -ti:3000 2>/dev/null || true");
if (pids && !pids.startsWith("[err")) {
  var pidList = pids.split("\n");
  for (var k = 0; k < pidList.length; k++) {
    var p = pidList[k].trim();
    if (p && p !== myPid) {
      run("kill -9 " + p + " 2>/dev/null || true");
      console.log("[sync] Killed PID " + p);
    }
  }
  run("sleep 1");
}

console.log("[sync] Port 3000 after kill: " + run("lsof -ti:3000 2>/dev/null || echo free"));

// Reset systemd failure counter and start
run("systemctl reset-failed tenmon-ark-api 2>/dev/null || true");
run("systemctl start tenmon-ark-api");
console.log("[sync] Service started");

// Wait for startup
run("sleep 5");

var status = run("systemctl is-active tenmon-ark-api 2>/dev/null || echo inactive");
console.log("[sync] Service status: " + status);

if (status !== "active") {
  // Check journal for crash reason
  var journal = run("journalctl -u tenmon-ark-api --no-pager -n 20 --since '1 minute ago' 2>/dev/null || echo 'no journal'");
  console.log("[sync] Journal: " + journal.substring(0, 800));
}

// 6. Verify
var ver = run("curl -s -m 5 http://127.0.0.1:3000/api/version 2>&1");
console.log("[sync] Version: " + ver.substring(0, 300));

var suk = run("curl -s -m 5 -X POST -H 'Content-Type: application/json' -d '{\"birthDate\":\"2000-01-01\",\"name\":\"t\"}' http://127.0.0.1:3000/api/sukuyou/diagnose 2>&1");
console.log("[sync] Sukuyou: " + suk.substring(0, 300));

console.log("[sync] v18 complete");
