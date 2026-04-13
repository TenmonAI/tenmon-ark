/**
 * Post-deploy sync script
 * 
 * ROOT CAUSE FIX:
 * - Deploy builds in /opt/tenmon-ark/api (git clone #1)
 * - Systemd runs from /opt/tenmon-ark-repo/api (git clone #2)
 * - This script syncs dist + node_modules from build dir to systemd dir
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

const myPid = process.pid;
console.log(`[sync] Running on VPS, apiDir=${apiDir}, myPid=${myPid}`);

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 60000 }).trim();
  } catch (e) {
    return `[error: ${(e.stderr || e.stdout || e.message || "").substring(0, 500)}]`;
  }
}

// ============================================
// Step 1: Sync dist to systemd directory
// ============================================
const BUILD_DIR = "/opt/tenmon-ark/api";
const SYSTEMD_DIR = "/opt/tenmon-ark-repo/api";

if (apiDir === BUILD_DIR && existsSync(SYSTEMD_DIR)) {
  console.log(`[sync] Syncing dist from ${BUILD_DIR} to ${SYSTEMD_DIR}...`);
  
  // Sync dist directory (the compiled JS)
  const distSync = run(`rsync -a --delete ${BUILD_DIR}/dist/ ${SYSTEMD_DIR}/dist/`);
  console.log(`[sync] dist sync: ${distSync || 'OK'}`);
  
  // Sync node_modules (in case new dependencies were added)
  const nmSync = run(`rsync -a --delete ${BUILD_DIR}/node_modules/ ${SYSTEMD_DIR}/node_modules/`);
  console.log(`[sync] node_modules sync: ${nmSync || 'OK'}`);
  
  // Sync package.json
  const pkgSync = run(`cp ${BUILD_DIR}/package.json ${SYSTEMD_DIR}/package.json`);
  console.log(`[sync] package.json sync: ${pkgSync || 'OK'}`);
  
  // Also sync src directory for schema SQL files referenced at runtime
  const srcSync = run(`rsync -a --delete ${BUILD_DIR}/src/ ${SYSTEMD_DIR}/src/`);
  console.log(`[sync] src sync: ${srcSync || 'OK'}`);
  
  // Verify the sync
  const buildVersion = run(`grep -c "version" ${BUILD_DIR}/dist/index.js 2>/dev/null || echo 0`);
  const systemdVersion = run(`grep -c "version" ${SYSTEMD_DIR}/dist/index.js 2>/dev/null || echo 0`);
  console.log(`[sync] Verify: build dist has ${buildVersion} 'version' refs, systemd dist has ${systemdVersion}`);
  
  const buildSukuyou = run(`ls ${BUILD_DIR}/dist/sukuyou/ 2>/dev/null || echo 'missing'`);
  const systemdSukuyou = run(`ls ${SYSTEMD_DIR}/dist/sukuyou/ 2>/dev/null || echo 'missing'`);
  console.log(`[sync] Verify sukuyou: build=${buildSukuyou}, systemd=${systemdSukuyou}`);
} else if (apiDir === SYSTEMD_DIR) {
  console.log(`[sync] Running from systemd dir, no sync needed`);
} else {
  console.log(`[sync] Unknown directory layout: ${apiDir}`);
}

// ============================================
// Step 2: Stop old server and kill port 3000
// ============================================
console.log("[sync] Stopping old server...");
run("systemctl stop tenmon-ark-api 2>/dev/null || true");
run("sleep 1");

const portPids = run("lsof -ti:3000 2>/dev/null || true");
if (portPids && !portPids.startsWith("[error")) {
  const pids = portPids.split("\n").filter(p => p && p !== String(myPid));
  for (const pid of pids) {
    console.log(`[sync] Killing PID ${pid} on port 3000`);
    run(`kill -9 ${pid} 2>/dev/null || true`);
  }
}
run("sleep 1");

// ============================================
// Step 3: Start service fresh
// ============================================
console.log("[sync] Starting service...");
run("systemctl reset-failed tenmon-ark-api 2>/dev/null || true");
run("systemctl start tenmon-ark-api 2>&1");
run("sleep 8");

// ============================================
// Step 4: Verify
// ============================================
const status = run("systemctl is-active tenmon-ark-api 2>/dev/null || echo 'unknown'");
console.log(`[sync] Service status: ${status}`);

const journal = run("journalctl -u tenmon-ark-api --no-pager -n 30 --since '30 seconds ago' 2>&1");
console.log(`[sync] Journal:\n${journal.substring(0, 2000)}`);

const versionResp = run("curl -s -m 5 http://127.0.0.1:3000/api/version 2>&1");
console.log(`[sync] Version test: ${versionResp.substring(0, 300)}`);

const sukuyouResp = run("curl -s -m 5 http://127.0.0.1:3000/api/sukuyou/diagnose -X POST -H 'Content-Type: application/json' -d '{\"birthDate\":\"1990-01-01\",\"name\":\"test\"}' 2>&1");
console.log(`[sync] Sukuyou test: ${sukuyouResp.substring(0, 300)}`);

console.log("[sync] ✅ Done");
