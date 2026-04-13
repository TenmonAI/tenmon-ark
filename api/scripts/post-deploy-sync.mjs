/**
 * Post-deploy sync script - Module import test + safe restart
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
    return execSync(cmd, { encoding: "utf8", timeout: 30000 }).trim();
  } catch (e) {
    return `[error: ${(e.stderr || e.stdout || e.message || "").substring(0, 500)}]`;
  }
}

// Step 1: Test if the new index.js can be loaded without crashing
console.log("[sync] Testing module loading...");
const importTest = run(`cd ${apiDir} && timeout 10 node -e "
  process.on('uncaughtException', e => { console.error('UNCAUGHT:', e.message); process.exit(1); });
  process.on('unhandledRejection', e => { console.error('UNHANDLED:', e); process.exit(1); });
  import('./dist/index.js').then(() => {
    console.log('MODULE_LOAD_OK');
    setTimeout(() => process.exit(0), 2000);
  }).catch(e => {
    console.error('MODULE_LOAD_FAIL:', e.message);
    console.error('STACK:', e.stack);
    process.exit(1);
  });
" 2>&1`);
console.log(`[sync] Import test result:\n${importTest.substring(0, 1500)}`);

// Step 2: Kill the test server (it might have started listening)
const testPids = run("lsof -ti:3000 2>/dev/null || true");
if (testPids && !testPids.startsWith("[error")) {
  const pids = testPids.split("\\n").filter(p => p && p !== String(myPid));
  for (const pid of pids) {
    run(`kill -9 ${pid} 2>/dev/null || true`);
  }
}
run("sleep 1");

// Step 3: Stop systemd service
run("systemctl stop tenmon-ark-api 2>/dev/null || true");
run("sleep 1");

// Step 4: Kill remaining port 3000 processes
const portPids = run("lsof -ti:3000 2>/dev/null || true");
if (portPids && !portPids.startsWith("[error")) {
  const pids = portPids.split("\\n").filter(p => p && p !== String(myPid));
  for (const pid of pids) {
    run(`kill -9 ${pid} 2>/dev/null || true`);
  }
}
run("sleep 1");

// Step 5: Reset and start
run("systemctl reset-failed tenmon-ark-api 2>/dev/null || true");
run("systemctl start tenmon-ark-api 2>&1");
run("sleep 8");

// Step 6: Check status and journal
const status = run("systemctl is-active tenmon-ark-api 2>/dev/null || echo 'unknown'");
console.log(`[sync] Service status: ${status}`);

const journal = run("journalctl -u tenmon-ark-api --no-pager -n 50 --since '30 seconds ago' 2>&1");
console.log(`[sync] Journal:\n${journal.substring(0, 2000)}`);

// Step 7: Test endpoints
const versionResp = run("curl -s -m 5 http://127.0.0.1:3000/api/version 2>&1");
console.log(`[sync] Version: ${versionResp.substring(0, 200)}`);

console.log("[sync] ✅ Done");
