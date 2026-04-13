/**
 * Post-deploy sync v23 - SYNC TO BOTH DIRS + DIAGNOSTIC
 * 
 * Strategy: The dist is already built in BUILD dir (/opt/tenmon-ark/api).
 * We sync it to REPO dir (/opt/tenmon-ark-repo/api) as well.
 * We also read the existing systemd service file to determine which dir it uses.
 * We do NOT restart the service - deploy.yml's systemctl restart handles that.
 * 
 * Key insight: deploy.yml's systemctl restart IS async (returns in ~50ms).
 * It sends SIGTERM to the old process and systemd starts a new one.
 * The new process uses whatever ExecStart is in the service file.
 */
import { execSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync, writeFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(__dirname, "..");

if (!apiDir.startsWith("/opt/tenmon-ark")) {
  console.log("[sync] Not on VPS, skipping");
  process.exit(0);
}

console.log("[sync] v23 - sync to both dirs");

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

// 3. Sync dist to REPO (BUILD already has it from tsc)
if (existsSync(REPO)) {
  run("rsync -a --delete " + BUILD + "/dist/ " + REPO + "/dist/");
  run("rsync -a --delete " + BUILD + "/node_modules/ " + REPO + "/node_modules/");
  run("cp " + BUILD + "/package.json " + REPO + "/package.json 2>/dev/null || true");
  console.log("[sync] Synced BUILD -> REPO");
}

// 4. Verify files in BOTH dirs
console.log("[sync] BUILD dist/index.js: " + existsSync(BUILD + "/dist/index.js"));
console.log("[sync] BUILD dist/sukuyou: " + existsSync(BUILD + "/dist/sukuyou/sukuyouEngine.js"));
console.log("[sync] REPO dist/index.js: " + existsSync(REPO + "/dist/index.js"));
console.log("[sync] REPO dist/sukuyou: " + existsSync(REPO + "/dist/sukuyou/sukuyouEngine.js"));

// 5. Read and log the EXISTING systemd service file
var svcPath = "/etc/systemd/system/tenmon-ark-api.service";
if (existsSync(svcPath)) {
  var svcContent = readFileSync(svcPath, "utf8");
  var wdMatch = svcContent.match(/WorkingDirectory=(.+)/);
  var execMatch = svcContent.match(/ExecStart=(.+)/);
  var envMatch = svcContent.match(/EnvironmentFile=(.+)/);
  console.log("[sync] EXISTING svc WorkDir: " + (wdMatch ? wdMatch[1] : "N/A"));
  console.log("[sync] EXISTING svc ExecStart: " + (execMatch ? execMatch[1] : "N/A"));
  console.log("[sync] EXISTING svc EnvFile: " + (envMatch ? envMatch[1] : "N/A"));
} else {
  console.log("[sync] No service file at " + svcPath);
}

// 6. Check for OTHER service files
var otherSvc = run("find /etc/systemd -name '*tenmon*' -type f 2>/dev/null || true");
console.log("[sync] All tenmon services: " + otherSvc);

// 7. Write the CORRECT service file pointing to REPO
var envFile = "";
if (existsSync(REPO + "/.env")) envFile = REPO + "/.env";
else if (existsSync(BUILD + "/.env")) envFile = BUILD + "/.env";

var svc = "[Unit]\nDescription=TENMON-ARK API Server\nAfter=network.target\n\n[Service]\nType=simple\nUser=root\nWorkingDirectory=" + REPO + "\n" + (envFile ? "EnvironmentFile=" + envFile + "\n" : "") + "Environment=NODE_ENV=production\nEnvironment=TENMON_DATA_DIR=/opt/tenmon-ark-data\nExecStart=/usr/bin/node " + REPO + "/dist/index.js\nRestart=always\nRestartSec=5\n\n[Install]\nWantedBy=multi-user.target\n";

writeFileSync(svcPath, svc);
run("systemctl daemon-reload");

// 8. Read back to verify
var readBack = readFileSync(svcPath, "utf8");
var rbWd = readBack.match(/WorkingDirectory=(.+)/);
var rbExec = readBack.match(/ExecStart=(.+)/);
console.log("[sync] WRITTEN svc WorkDir: " + (rbWd ? rbWd[1] : "N/A"));
console.log("[sync] WRITTEN svc ExecStart: " + (rbExec ? rbExec[1] : "N/A"));

// 9. Check current server status
var currentPid = run("lsof -ti:3000 2>/dev/null || echo none");
console.log("[sync] Current port 3000 PID: " + currentPid);
if (currentPid !== "none" && !currentPid.startsWith("[err")) {
  var fp = currentPid.split("\n")[0].trim();
  console.log("[sync] Current CWD: " + run("readlink /proc/" + fp + "/cwd 2>/dev/null || echo ?"));
  console.log("[sync] Current cmdline: " + run("cat /proc/" + fp + "/cmdline 2>/dev/null | tr '\\0' ' ' || echo ?").substring(0, 200));
}

console.log("[sync] v23 done - deploy.yml systemctl restart will now restart the service");
