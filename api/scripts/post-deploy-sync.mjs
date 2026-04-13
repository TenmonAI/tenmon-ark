/**
 * Post-deploy sync script - Safe restart with diagnostics
 * 
 * CRITICAL: Must NOT kill the current node process (itself).
 * Only stops systemd service and kills processes on port 3000.
 */
import { execSync } from "child_process";
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
    return execSync(cmd, { encoding: "utf8", timeout: 15000 }).trim();
  } catch (e) {
    return `[error: ${(e.stderr || e.message || "").substring(0, 200)}]`;
  }
}

// Step 1: Stop the systemd service
run("systemctl stop tenmon-ark-api 2>/dev/null || true");
console.log("[sync] Service stopped");
run("sleep 2");

// Step 2: Kill processes on port 3000 (but NOT ourselves)
const portPids = run("lsof -ti:3000 2>/dev/null || true");
if (portPids && !portPids.startsWith("[error")) {
  const pids = portPids.split("\n").filter(p => p && p !== String(myPid));
  if (pids.length > 0) {
    console.log(`[sync] Killing port 3000 processes: ${pids.join(", ")} (excluding self ${myPid})`);
    for (const pid of pids) {
      run(`kill -9 ${pid} 2>/dev/null || true`);
    }
    run("sleep 1");
  } else {
    console.log("[sync] Port 3000 is free (or only self)");
  }
} else {
  console.log("[sync] Port 3000 is free");
}

// Step 3: Reset failure counter
run("systemctl reset-failed tenmon-ark-api 2>/dev/null || true");
console.log("[sync] Failure counter reset");

// Step 4: Verify dist/index.js has new code
const hasVersion = run(`grep -c 'api/version' ${apiDir}/dist/index.js 2>/dev/null || echo 0`);
const hasSukuyou = run(`grep -c 'sukuyouRouter' ${apiDir}/dist/index.js 2>/dev/null || echo 0`);
console.log(`[sync] Code check: version=${hasVersion}, sukuyou=${hasSukuyou}`);

// Step 5: Start the service
const startResult = run("systemctl start tenmon-ark-api 2>&1");
console.log(`[sync] systemctl start: ${startResult || "OK"}`);

// Step 6: Wait for service to fully start (longer wait)
run("sleep 8");

// Step 7: Check service status
const status = run("systemctl is-active tenmon-ark-api 2>/dev/null || echo 'unknown'");
console.log(`[sync] Service status: ${status}`);

// Step 8: Get journal output
const journal = run("journalctl -u tenmon-ark-api --no-pager -n 30 --since '30 seconds ago' 2>&1");
console.log(`[sync] Journal:\n${journal.substring(0, 1500)}`);

// Step 9: Test endpoints
const versionResp = run("curl -s -m 5 http://127.0.0.1:3000/api/version 2>&1");
console.log(`[sync] Version endpoint: ${versionResp.substring(0, 200)}`);

const chatResp = run("curl -s -m 5 -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{\"message\":\"ping\"}' http://127.0.0.1:3000/api/chat 2>&1");
console.log(`[sync] Chat status: ${chatResp}`);

console.log("[sync] ✅ Post-deploy sync complete");
