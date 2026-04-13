/**
 * Post-deploy sync v19 - SIMPLE: sync dist to REPO dir + restart
 */
import { execSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(__dirname, "..");

if (!apiDir.startsWith("/opt/tenmon-ark")) {
  console.log("[sync] Not on VPS, skipping");
  process.exit(0);
}

console.log("[sync] v19 apiDir=" + apiDir);

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 120000 }).trim();
  } catch (e) {
    return "[err]" + String(e.stderr || e.message || "").substring(0, 300);
  }
}

var BUILD = "/opt/tenmon-ark/api";
var REPO = "/opt/tenmon-ark-repo/api";

run("mkdir -p /opt/tenmon-ark-data && chmod 777 /opt/tenmon-ark-data");

if (existsSync(REPO + "/.env") && !existsSync(BUILD + "/.env")) {
  run("cp " + REPO + "/.env " + BUILD + "/.env");
  console.log("[sync] Copied .env");
}

if (existsSync(REPO)) {
  run("rsync -a --delete " + BUILD + "/dist/ " + REPO + "/dist/");
  run("rsync -a --delete " + BUILD + "/node_modules/ " + REPO + "/node_modules/");
  run("cp " + BUILD + "/package.json " + REPO + "/package.json 2>/dev/null || true");
  console.log("[sync] Synced to REPO");
}

var vc = run("grep -c 'api/version' " + REPO + "/dist/index.js 2>/dev/null || echo 0");
var sc = run("grep -c 'sukuyou' " + REPO + "/dist/index.js 2>/dev/null || echo 0");
console.log("[sync] version:" + vc + " sukuyou:" + sc);

var svc = run("cat /etc/systemd/system/tenmon-ark-api.service 2>/dev/null || echo none");
var m1 = svc.match(/WorkingDirectory=(.+)/);
var m2 = svc.match(/ExecStart=(.+)/);
console.log("[sync] svc WorkDir=" + (m1 ? m1[1] : "?"));
console.log("[sync] svc ExecStart=" + (m2 ? m2[1] : "?"));

console.log("[sync] Restarting...");
run("systemctl restart tenmon-ark-api");
run("sleep 5");

var st = run("systemctl is-active tenmon-ark-api 2>/dev/null || echo inactive");
console.log("[sync] status=" + st);

if (st !== "active") {
  console.log("[sync] journal=" + run("journalctl -u tenmon-ark-api --no-pager -n 10 --since '30 seconds ago' 2>/dev/null").substring(0, 500));
}

var ver = run("curl -s -m 5 http://127.0.0.1:3000/api/version 2>&1");
console.log("[sync] ver=" + ver.substring(0, 300));

var pid = run("lsof -ti:3000 2>/dev/null || echo none");
console.log("[sync] pid=" + pid);
if (pid && pid !== "none" && !pid.startsWith("[err")) {
  var fp = pid.split("\n")[0].trim();
  console.log("[sync] cwd=" + run("readlink /proc/" + fp + "/cwd 2>/dev/null || echo ?"));
  console.log("[sync] exe=" + run("readlink /proc/" + fp + "/exe 2>/dev/null || echo ?"));
}

console.log("[sync] v19 done");
