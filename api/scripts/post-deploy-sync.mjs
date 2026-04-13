/**
 * Post-deploy sync script
 * 
 * Root cause: deploy.yml builds in /opt/tenmon-ark/api
 * but systemd runs from /opt/tenmon-ark-repo/api
 * 
 * This script syncs the built artifacts to the systemd directory
 * and restarts the service.
 */
import { execSync } from "child_process";
import { existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(__dirname, "..");

if (!apiDir.startsWith("/opt/tenmon-ark")) {
  console.log("[sync] Not on VPS, skipping");
  process.exit(0);
}

const myPid = process.pid;
console.log(`[sync] Running on VPS, apiDir=${apiDir}, myPid=${myPid}`);

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 60000 }).trim();
  } catch (e) {
    return `[error: ${(e.stderr || e.stdout || e.message || "").substring(0, 500)}]`;
  }
}

// ---- Step 1: Determine the systemd target directory ----
const DEPLOY_DIR = apiDir;  // /opt/tenmon-ark/api
const SYSTEMD_DIR = "/opt/tenmon-ark-repo/api";

const needsSync = DEPLOY_DIR !== SYSTEMD_DIR && existsSync(SYSTEMD_DIR);
console.log(`[sync] Deploy dir: ${DEPLOY_DIR}`);
console.log(`[sync] Systemd dir: ${SYSTEMD_DIR}`);
console.log(`[sync] Needs sync: ${needsSync}`);

if (needsSync) {
  // Step 2: Sync dist/ to systemd directory
  console.log("[sync] Syncing dist/ to systemd directory...");
  const syncDist = run(`rsync -a --delete ${DEPLOY_DIR}/dist/ ${SYSTEMD_DIR}/dist/`);
  console.log(`[sync] dist sync: ${syncDist || "OK"}`);

  // Step 3: Sync node_modules/ to systemd directory (in case new deps were added)
  console.log("[sync] Syncing node_modules/ to systemd directory...");
  const syncModules = run(`rsync -a --delete ${DEPLOY_DIR}/node_modules/ ${SYSTEMD_DIR}/node_modules/`);
  console.log(`[sync] node_modules sync: ${syncModules || "OK"}`);

  // Step 4: Sync package.json and .env
  if (existsSync(`${DEPLOY_DIR}/package.json`)) {
    run(`cp ${DEPLOY_DIR}/package.json ${SYSTEMD_DIR}/package.json`);
  }
  if (existsSync(`${DEPLOY_DIR}/.env`)) {
    run(`cp ${DEPLOY_DIR}/.env ${SYSTEMD_DIR}/.env`);
  }
  console.log("[sync] Config files synced");

  // Step 5: Verify dist/index.js exists in systemd dir
  if (existsSync(`${SYSTEMD_DIR}/dist/index.js`)) {
    console.log("[sync] ✅ dist/index.js confirmed in systemd dir");
  } else {
    console.error("[sync] ❌ dist/index.js NOT found in systemd dir!");
  }

  // Step 6: Verify sukuyou lookup table exists
  if (existsSync(`${SYSTEMD_DIR}/dist/sukuyou/sukuyou_lookup_table.json`)) {
    console.log("[sync] ✅ sukuyou_lookup_table.json confirmed");
  } else {
    console.warn("[sync] ⚠️ sukuyou_lookup_table.json not found in systemd dir");
  }
}

// ---- Step 7: Stop systemd service ----
console.log("[sync] Stopping systemd service...");
run("systemctl stop tenmon-ark-api 2>/dev/null || true");
run("sleep 2");

// ---- Step 8: Kill any remaining processes on port 3000 (excluding self) ----
const portPids = run("lsof -ti:3000 2>/dev/null || true");
if (portPids && !portPids.startsWith("[error")) {
  const pids = portPids.split("\n").filter(p => p.trim() && p.trim() !== String(myPid));
  for (const pid of pids) {
    console.log(`[sync] Killing port 3000 process: ${pid}`);
    run(`kill -9 ${pid.trim()} 2>/dev/null || true`);
  }
}
run("sleep 1");

// ---- Step 9: Start systemd service ----
console.log("[sync] Starting systemd service...");
run("systemctl reset-failed tenmon-ark-api 2>/dev/null || true");
const startResult = run("systemctl start tenmon-ark-api 2>&1");
console.log(`[sync] Start result: ${startResult || "OK"}`);
run("sleep 5");

// ---- Step 10: Verify service is running ----
const status = run("systemctl is-active tenmon-ark-api 2>/dev/null || echo 'unknown'");
console.log(`[sync] Service status: ${status}`);

// ---- Step 11: Test endpoints ----
const healthResp = run("curl -s -m 5 http://127.0.0.1:3000/api/version 2>&1");
console.log(`[sync] Version endpoint: ${healthResp.substring(0, 300)}`);

const sukuyouResp = run("curl -s -m 5 http://127.0.0.1:3000/api/sukuyou/nakshatras 2>&1");
console.log(`[sync] Sukuyou endpoint: ${sukuyouResp.substring(0, 300)}`);

// ---- Step 12: Journal output ----
const journal = run("journalctl -u tenmon-ark-api --no-pager -n 30 --since '30 seconds ago' 2>&1");
console.log(`[sync] Journal:\n${journal.substring(0, 2000)}`);

console.log("[sync] ✅ Deploy sync complete");
