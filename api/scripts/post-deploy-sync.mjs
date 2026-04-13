/**
 * Post-deploy sync v20 - FIX EVERYTHING
 * 
 * 1. Sync dist to REPO dir
 * 2. Write CORRECT systemd service (ExecStart=node, not /bin/true)
 * 3. Stop systemd service
 * 4. Kill ALL node processes on port 3000 (including nohup leftovers)
 * 5. Start systemd service with correct code
 * 6. Verify
 */
import { execSync, spawnSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { existsSync, writeFileSync, readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(__dirname, "..");

if (!apiDir.startsWith("/opt/tenmon-ark")) {
  console.log("[sync] Not on VPS, skipping");
  process.exit(0);
}

var myPid = String(process.pid);
var parentPid = String(process.ppid);
console.log("[sync] v20 pid=" + myPid + " ppid=" + parentPid);

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

// 2. Sync .env
if (existsSync(REPO + "/.env") && !existsSync(BUILD + "/.env")) {
  run("cp " + REPO + "/.env " + BUILD + "/.env");
}

// 3. Sync dist + node_modules to REPO
if (existsSync(REPO)) {
  run("rsync -a --delete " + BUILD + "/dist/ " + REPO + "/dist/");
  run("rsync -a --delete " + BUILD + "/node_modules/ " + REPO + "/node_modules/");
  run("cp " + BUILD + "/package.json " + REPO + "/package.json 2>/dev/null || true");
  console.log("[sync] Synced to REPO");
}

// 4. Find .env for systemd
var envFile = "";
if (existsSync(REPO + "/.env")) envFile = REPO + "/.env";
else if (existsSync(BUILD + "/.env")) envFile = BUILD + "/.env";

// 5. Write CORRECT systemd service pointing to REPO dir
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
console.log("[sync] Wrote systemd: WorkDir=" + REPO + " ExecStart=node " + REPO + "/dist/index.js");

// 6. Stop everything
run("systemctl stop tenmon-ark-api 2>/dev/null || true");
run("sleep 1");

// 7. Kill ALL node processes on port 3000 (except ourselves)
var pids = run("lsof -ti:3000 2>/dev/null || true");
if (pids && !pids.startsWith("[err")) {
  var pidList = pids.split("\n");
  for (var k = 0; k < pidList.length; k++) {
    var p = pidList[k].trim();
    if (p && p !== myPid && p !== parentPid) {
      run("kill -9 " + p + " 2>/dev/null || true");
      console.log("[sync] Killed " + p);
    }
  }
}
run("sleep 2");

var portCheck = run("lsof -ti:3000 2>/dev/null || echo free");
console.log("[sync] Port 3000: " + portCheck);

// 8. Start service
run("systemctl reset-failed tenmon-ark-api 2>/dev/null || true");
run("systemctl start tenmon-ark-api");
console.log("[sync] Started service");

// 9. Wait and verify
run("sleep 6");

var status = run("systemctl is-active tenmon-ark-api 2>/dev/null || echo inactive");
console.log("[sync] Status: " + status);

if (status !== "active") {
  console.log("[sync] Journal: " + run("journalctl -u tenmon-ark-api --no-pager -n 15 --since '30 seconds ago' 2>/dev/null").substring(0, 800));
}

var ver = run("curl -s -m 5 http://127.0.0.1:3000/api/version 2>&1");
console.log("[sync] Version: " + ver.substring(0, 300));

var pid3k = run("lsof -ti:3000 2>/dev/null || echo none");
console.log("[sync] Final PID: " + pid3k);

if (pid3k && pid3k !== "none" && !pid3k.startsWith("[err")) {
  var fp = pid3k.split("\n")[0].trim();
  console.log("[sync] CWD: " + run("readlink /proc/" + fp + "/cwd 2>/dev/null || echo ?"));
}

console.log("[sync] v20 done");
