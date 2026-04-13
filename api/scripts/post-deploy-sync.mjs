/**
 * Post-deploy sync script - Deep diagnostics version
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
    return `[error: ${e.stderr || e.message}]`;
  }
}

console.log(`[sync] Running on VPS, apiDir=${apiDir}`);

// Step 1: List ALL systemd services related to tenmon
const services = run("systemctl list-units --type=service --all | grep -i tenmon || echo 'none'");
console.log(`[sync] Tenmon services:\n${services}`);

// Step 2: Stop ALL tenmon services
run("systemctl stop tenmon-ark-api 2>/dev/null || true");
run("systemctl stop tenmon-ark 2>/dev/null || true");
run("sleep 2");

// Step 3: Kill ALL node processes
const allNode = run("ps aux | grep node | grep -v grep || echo 'none'");
console.log(`[sync] All node processes after stop:\n${allNode}`);
run("pkill -9 -f 'node' || true");
run("sleep 2");

// Step 4: Verify port is free
const portCheck = run("lsof -ti:3000 || echo 'free'");
console.log(`[sync] Port 3000: ${portCheck}`);

// Step 5: Reset failure counter
run("systemctl reset-failed tenmon-ark-api 2>/dev/null || true");

// Step 6: Check the actual service file
const svcFile = run("systemctl cat tenmon-ark-api 2>&1");
console.log(`[sync] Service file:\n${svcFile}`);

// Step 7: Try to start the server directly (not via systemd) to see if it crashes
console.log("[sync] Testing direct server start...");
const directStart = run(`cd ${apiDir} && timeout 5 node dist/index.js 2>&1 || true`);
console.log(`[sync] Direct start output:\n${directStart}`);

// Step 8: Kill the test server
run("fuser -k 3000/tcp 2>/dev/null || true");
run("sleep 1");

// Step 9: Start via systemd
run("systemctl start tenmon-ark-api 2>&1");
run("sleep 8");

// Step 10: Check status and journal
const status = run("systemctl status tenmon-ark-api 2>&1");
console.log(`[sync] Service status:\n${status}`);

const journal = run("journalctl -u tenmon-ark-api --no-pager -n 100 2>&1");
console.log(`[sync] Full journal:\n${journal.substring(0, 2000)}`);

// Step 11: Test endpoints
const versionTest = run("curl -s http://127.0.0.1:3000/api/version 2>&1");
console.log(`[sync] Version: ${versionTest.substring(0, 200)}`);

console.log("[sync] ✅ Done");
