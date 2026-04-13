/**
 * Post-deploy sync v21 - MINIMAL: sync only, NO server management
 * 
 * deploy.yml's `systemctl restart tenmon-ark-api` handles the server.
 * This script ONLY:
 * 1. Syncs dist + node_modules to REPO dir
 * 2. Writes correct systemd service file
 * 3. daemon-reload so systemctl restart uses the correct config
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

console.log("[sync] v21 minimal - sync only");

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 120000 }).trim();
  } catch (e) {
    return "[err]" + String(e.stderr || e.message || "").substring(0, 300);
  }
}

var BUILD = "/opt/tenmon-ark/api";
var REPO = "/opt/tenmon-ark-repo/api";

// 1. Ensure data dir exists
run("mkdir -p /opt/tenmon-ark-data && chmod 777 /opt/tenmon-ark-data");

// 2. Copy .env if needed
if (existsSync(REPO + "/.env") && !existsSync(BUILD + "/.env")) {
  run("cp " + REPO + "/.env " + BUILD + "/.env");
}
if (existsSync(BUILD + "/.env") && !existsSync(REPO + "/.env")) {
  run("cp " + BUILD + "/.env " + REPO + "/.env");
}

// 3. Sync dist + node_modules + package.json to REPO
if (existsSync(REPO)) {
  run("rsync -a --delete " + BUILD + "/dist/ " + REPO + "/dist/");
  run("rsync -a --delete " + BUILD + "/node_modules/ " + REPO + "/node_modules/");
  run("cp " + BUILD + "/package.json " + REPO + "/package.json 2>/dev/null || true");
  console.log("[sync] Synced dist+modules to REPO");
} else {
  console.log("[sync] REPO dir not found, skipping sync");
}

// 4. Verify key files exist in REPO
var repoIndexExists = existsSync(REPO + "/dist/index.js");
var repoSukuyouExists = existsSync(REPO + "/dist/sukuyou/sukuyouEngine.js");
var repoLookupExists = existsSync(REPO + "/dist/sukuyou/sukuyou_lookup_table.json");
var repoKanagiExists = existsSync(REPO + "/dist/kanagi/patterns/soundMeanings.json");
console.log("[sync] REPO files: index=" + repoIndexExists + " sukuyou=" + repoSukuyouExists + " lookup=" + repoLookupExists + " kanagi=" + repoKanagiExists);

// 5. Find .env for systemd
var envFile = "";
if (existsSync(REPO + "/.env")) envFile = REPO + "/.env";
else if (existsSync(BUILD + "/.env")) envFile = BUILD + "/.env";

// 6. Write systemd service pointing to REPO dir
var svc = "[Unit]\n" +
  "Description=TENMON-ARK API Server\n" +
  "After=network.target\n\n" +
  "[Service]\n" +
  "Type=simple\n" +
  "User=root\n" +
  "WorkingDirectory=" + REPO + "\n" +
  (envFile ? "EnvironmentFile=" + envFile + "\n" : "") +
  "Environment=NODE_ENV=production\n" +
  "Environment=TENMON_DATA_DIR=/opt/tenmon-ark-data\n" +
  "ExecStart=/usr/bin/node " + REPO + "/dist/index.js\n" +
  "Restart=always\n" +
  "RestartSec=5\n\n" +
  "[Install]\n" +
  "WantedBy=multi-user.target\n";

writeFileSync("/etc/systemd/system/tenmon-ark-api.service", svc);
run("systemctl daemon-reload");
console.log("[sync] Wrote systemd service -> REPO dir");
console.log("[sync] v21 done - deploy.yml will handle systemctl restart");
