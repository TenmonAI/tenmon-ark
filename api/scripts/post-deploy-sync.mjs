/**
 * Post-deploy sync script (v7 - definitive)
 * 
 * Strategy:
 * 1. Ensure systemd service points to /opt/tenmon-ark/api (build dir)
 * 2. Stop old server, kill port 3000
 * 3. Start service and VERIFY it works
 * 4. The deploy script's subsequent `systemctl restart` will just restart the already-working server
 *    (harmless since it's the same code from the same directory)
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

console.log(`[sync] apiDir=${apiDir}`);

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 30000 }).trim();
  } catch (e) {
    return `[error: ${(e.stderr || e.stdout || e.message || "").substring(0, 300)}]`;
  }
}

const SERVICE_PATH = "/etc/systemd/system/tenmon-ark-api.service";

// ── Step 1: Fix systemd service if needed ──
if (existsSync(SERVICE_PATH)) {
  const svc = readFileSync(SERVICE_PATH, "utf8");
  const wd = svc.match(/WorkingDirectory=(.+)/)?.[1]?.trim();
  console.log(`[sync] systemd WorkingDirectory: ${wd}`);
  
  if (wd !== apiDir) {
    console.log(`[sync] Fixing WorkingDirectory: ${wd} → ${apiDir}`);
    let newSvc = svc
      .replace(/WorkingDirectory=.+/, `WorkingDirectory=${apiDir}`)
      .replace(/EnvironmentFile=.+/, `EnvironmentFile=${apiDir}/.env`);
    writeFileSync(SERVICE_PATH, newSvc);
    run("systemctl daemon-reload");
    console.log("[sync] systemd daemon reloaded");
  }
}

// ── Step 2: Verify dist ──
const indexExists = existsSync(`${apiDir}/dist/index.js`);
const sukuyouExists = existsSync(`${apiDir}/dist/sukuyou/sukuyouEngine.js`);
const lookupExists = existsSync(`${apiDir}/dist/sukuyou/sukuyou_lookup_table.json`);
const indexSize = indexExists ? run(`wc -c < ${apiDir}/dist/index.js`) : "0";
const indexHash = indexExists ? run(`md5sum ${apiDir}/dist/index.js | cut -d' ' -f1`) : "none";
console.log(`[sync] dist: index.js=${indexSize}B hash=${indexHash} sukuyou=${sukuyouExists} lookup=${lookupExists}`);

// Check if version route is in the compiled code
const hasVersionRoute = run(`grep -c "api/version" ${apiDir}/dist/index.js 2>/dev/null || echo 0`);
const hasSukuyouRoute = run(`grep -c "sukuyou" ${apiDir}/dist/index.js 2>/dev/null || echo 0`);
console.log(`[sync] Routes in dist: version=${hasVersionRoute} sukuyou=${hasSukuyouRoute}`);

// ── Step 3: Stop everything ──
console.log("[sync] Stopping service...");
run("systemctl stop tenmon-ark-api 2>/dev/null || true");
run("sleep 1");

const myPid = process.pid;
const pids = run("lsof -ti:3000 2>/dev/null || true");
if (pids && !pids.startsWith("[error")) {
  for (const pid of pids.split("\n").filter(p => p && p !== String(myPid))) {
    run(`kill -9 ${pid} 2>/dev/null || true`);
  }
}
run("sleep 1");

// Verify port is free
const portCheck = run("lsof -ti:3000 2>/dev/null || echo 'free'");
console.log(`[sync] Port 3000: ${portCheck}`);

// ── Step 4: Start and verify ──
console.log("[sync] Starting service...");
run("systemctl reset-failed tenmon-ark-api 2>/dev/null || true");
const startResult = run("systemctl start tenmon-ark-api 2>&1");
console.log(`[sync] Start: ${startResult || 'OK'}`);

// Wait for server to be ready
run("sleep 5");

const status = run("systemctl is-active tenmon-ark-api 2>/dev/null || echo 'unknown'");
console.log(`[sync] Status: ${status}`);

// Check journal for any errors
const journal = run("journalctl -u tenmon-ark-api --no-pager -n 20 --since '15 seconds ago' 2>&1");
console.log(`[sync] Journal:\n${journal.substring(0, 1500)}`);

// Test endpoints
const versionTest = run("curl -s -m 5 http://127.0.0.1:3000/api/version 2>&1");
console.log(`[sync] Version: ${versionTest.substring(0, 200)}`);

const sukuyouTest = run("curl -s -m 5 -X POST -H 'Content-Type: application/json' -d '{\"birthDate\":\"2000-01-01\",\"name\":\"test\"}' http://127.0.0.1:3000/api/sukuyou/diagnose 2>&1");
console.log(`[sync] Sukuyou: ${sukuyouTest.substring(0, 200)}`);

// Check which PID is listening on 3000
const listeningPid = run("lsof -ti:3000 2>/dev/null || echo 'none'");
const pidCwd = listeningPid !== 'none' ? run(`ls -la /proc/${listeningPid.split('\\n')[0]}/cwd 2>/dev/null || echo 'unknown'`) : 'no pid';
console.log(`[sync] Listening PID: ${listeningPid}, CWD: ${pidCwd}`);

console.log("[sync] ✅ Done");
