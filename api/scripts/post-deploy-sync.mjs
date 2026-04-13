/**
 * Post-deploy sync script (v17 - EMBRACE systemctl restart)
 * 
 * Strategy: ONLY sync files and write systemd service.
 * Let deploy.yml's `systemctl restart tenmon-ark-api` handle the actual restart.
 * No start/stop/kill in this script.
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

console.log("[sync] v17 apiDir=" + apiDir);

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
  console.log("[sync] Synced dist+node_modules to REPO dir");
}

// 4. Write systemd service pointing to BUILD dir
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
  console.log("[sync] Wrote systemd service: WorkingDirectory=" + BUILD_DIR);
  console.log("[sync] ExecStart=/usr/bin/node " + BUILD_DIR + "/dist/index.js");
} catch (e) {
  console.error("[sync] Failed to write systemd service:", e.message);
}

// 5. Diagnostics
console.log("[sync] Service status: " + run("systemctl is-active tenmon-ark-api 2>/dev/null || echo inactive"));
console.log("[sync] Port 3000: " + run("lsof -ti:3000 2>/dev/null || echo free"));
console.log("[sync] dist/index.js exists in BUILD: " + existsSync(BUILD_DIR + "/dist/index.js"));
console.log("[sync] dist/index.js exists in REPO: " + existsSync(REPO_DIR + "/dist/index.js"));

// Check if dist/index.js has version endpoint
var distCheck = run("grep -c 'api/version' " + BUILD_DIR + "/dist/index.js 2>/dev/null || echo 0");
console.log("[sync] version endpoint in BUILD dist: " + distCheck);
distCheck = run("grep -c 'api/version' " + REPO_DIR + "/dist/index.js 2>/dev/null || echo 0");
console.log("[sync] version endpoint in REPO dist: " + distCheck);

console.log("[sync] v17 complete - systemctl restart will run next");
