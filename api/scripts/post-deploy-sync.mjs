/**
 * Post-deploy sync script - Full restart with diagnostics
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

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 15000 }).trim();
  } catch (e) {
    return `[error: ${e.message}]`;
  }
}

console.log(`[sync] Running on VPS, apiDir=${apiDir}`);

// Step 1: Stop service
run("systemctl stop tenmon-ark-api");
console.log("[sync] Service stopped");
run("sleep 2");

// Step 2: Kill ALL node processes (not just port 3000)
const nodePids = run("pgrep -f 'node.*dist/index.js' || true");
if (nodePids && !nodePids.startsWith("[error")) {
  console.log(`[sync] Killing node processes: ${nodePids.replace(/\n/g, ", ")}`);
  run("pkill -9 -f 'node.*dist/index.js' || true");
  run("sleep 1");
}

// Also kill anything on port 3000
run("fuser -k 3000/tcp 2>/dev/null || true");
run("sleep 1");

// Step 3: Reset failure counter
run("systemctl reset-failed tenmon-ark-api");
console.log("[sync] Failure counter reset");

// Step 4: Verify port is free
const portCheck1 = run("lsof -ti:3000 || echo 'free'");
console.log(`[sync] Port 3000 before start: ${portCheck1}`);

// Step 5: Check the dist/index.js has version endpoint
const hasVersion = run(`grep -c 'api/version' ${apiDir}/dist/index.js`);
const hasSukuyou = run(`grep -c 'sukuyouRouter' ${apiDir}/dist/index.js`);
console.log(`[sync] dist/index.js: version mentions=${hasVersion}, sukuyou mentions=${hasSukuyou}`);

// Step 6: Start service
const startResult = run("systemctl start tenmon-ark-api 2>&1");
console.log(`[sync] systemctl start result: ${startResult || "OK"}`);

// Step 7: Wait longer for service to fully start
run("sleep 5");

// Step 8: Check status
const status = run("systemctl is-active tenmon-ark-api");
console.log(`[sync] Service status: ${status}`);

// Step 9: Get journal output
const journal = run("journalctl -u tenmon-ark-api --no-pager -n 50 --since '1 minute ago' 2>&1");
console.log(`[sync] Journal:\n${journal}`);

// Step 10: Test endpoints
const portCheck2 = run("lsof -ti:3000 || echo 'no process'");
console.log(`[sync] Port 3000 after start: ${portCheck2}`);

const versionTest = run("curl -s http://127.0.0.1:3000/api/version 2>&1");
console.log(`[sync] Version response: ${versionTest.substring(0, 200)}`);

const chatTest = run("curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{\"message\":\"test\"}' http://127.0.0.1:3000/api/chat 2>&1");
console.log(`[sync] Chat status: ${chatTest}`);

console.log("[sync] ✅ Post-deploy sync complete");
