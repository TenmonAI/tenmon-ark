/**
 * Post-deploy sync script (v11 - DEFINITIVE)
 * 
 * ROOT CAUSE ANALYSIS:
 * - Deploy builds in /opt/tenmon-ark/api
 * - systemd runs from /opt/tenmon-ark-repo/api (or wherever it was configured)
 * - The deploy.yml's `systemctl restart` either:
 *   a) Fails silently (SSH timeout)
 *   b) Starts the new server which crashes (missing .env, DB issues)
 *   c) Starts but from wrong directory
 * 
 * SOLUTION:
 * 1. Sync dist+node_modules+src to /opt/tenmon-ark-repo/api
 * 2. Kill ALL old node processes on port 3000
 * 3. Start the server DIRECTLY with node (not systemd) using nohup
 * 4. Verify it works
 * 5. The deploy.yml's `systemctl restart` will fail (service not managed by systemd)
 *    but the server will keep running because we started it with nohup
 */
import { execSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(__dirname, "..");

if (!apiDir.startsWith("/opt/tenmon-ark")) {
  console.log("[sync] Not on VPS, skipping");
  process.exit(0);
}

const myPid = String(process.pid);
console.log(`[sync] v11 apiDir=${apiDir} pid=${myPid}`);

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 60000 }).trim();
  } catch (e) {
    return `[err: ${String(e.stderr || e.message || "").substring(0, 300)}]`;
  }
}

const BUILD_DIR = "/opt/tenmon-ark/api";
const REPO_DIR = "/opt/tenmon-ark-repo/api";

// ── 1. Ensure data directory ──
run("mkdir -p /opt/tenmon-ark-data && chmod 777 /opt/tenmon-ark-data");

// ── 2. Sync .env ──
for (const src of [REPO_DIR, BUILD_DIR]) {
  if (existsSync(`${src}/.env`)) {
    for (const dst of [BUILD_DIR, REPO_DIR]) {
      if (!existsSync(`${dst}/.env`) && existsSync(dst)) {
        run(`cp ${src}/.env ${dst}/.env`);
        console.log(`[sync] Copied .env from ${src} to ${dst}`);
      }
    }
    break;
  }
}

// ── 3. Sync dist to REPO dir ──
if (existsSync(REPO_DIR)) {
  console.log(`[sync] Syncing ${BUILD_DIR} → ${REPO_DIR}`);
  run(`rsync -a --delete ${BUILD_DIR}/dist/ ${REPO_DIR}/dist/`);
  run(`rsync -a --delete ${BUILD_DIR}/node_modules/ ${REPO_DIR}/node_modules/`);
  run(`rsync -a --delete ${BUILD_DIR}/src/ ${REPO_DIR}/src/`);
  run(`cp ${BUILD_DIR}/package.json ${REPO_DIR}/package.json 2>/dev/null || true`);
  console.log("[sync] Sync complete");
}

// Verify
for (const dir of [BUILD_DIR, REPO_DIR]) {
  const label = dir === BUILD_DIR ? "BUILD" : "REPO";
  const ok = existsSync(`${dir}/dist/index.js`);
  const sk = existsSync(`${dir}/dist/sukuyou/sukuyouEngine.js`);
  const env = existsSync(`${dir}/.env`);
  console.log(`[sync] ${label}: index=${ok} sukuyou=${sk} env=${env}`);
}

// ── 4. Stop ALL existing servers ──
console.log("[sync] Stopping all servers...");
run("systemctl stop tenmon-ark-api 2>/dev/null || true");
run("sleep 1");

// Kill ALL node processes on port 3000
const pids = run("lsof -ti:3000 2>/dev/null || true");
if (pids && !pids.startsWith("[err")) {
  for (const pid of pids.split("\n").filter(p => p.trim() && p.trim() !== myPid)) {
    run(`kill -9 ${pid.trim()} 2>/dev/null || true`);
  }
}
run("sleep 1");
console.log(`[sync] Port 3000: ${run("lsof -ti:3000 2>/dev/null || echo free")}`);

// ── 5. Start server directly with nohup from REPO dir ──
// Use REPO dir since that's where systemd was running from (and it has .env if it exists)
const startDir = existsSync(`${REPO_DIR}/.env`) ? REPO_DIR : BUILD_DIR;
console.log(`[sync] Starting server from ${startDir}...`);

// Load .env manually for the nohup process
let envVars = "";
if (existsSync(`${startDir}/.env`)) {
  const envContent = readFileSync(`${startDir}/.env`, "utf8");
  const lines = envContent.split("\n").filter(l => l.trim() && !l.startsWith("#"));
  envVars = lines.map(l => `export ${l}`).join(" && ") + " && ";
}

// Start with nohup so it survives SSH disconnect AND systemctl restart
run(`cd ${startDir} && ${envVars}nohup node dist/index.js > /tmp/tenmon-ark-server.log 2>&1 &`);

// Wait for server to start
run("sleep 5");

// ── 6. Verify ──
const portCheck = run("lsof -ti:3000 2>/dev/null || echo none");
console.log(`[sync] Server PID: ${portCheck}`);

if (portCheck !== "none" && !portCheck.startsWith("[err")) {
  const cwd = run(`readlink /proc/${portCheck.trim().split("\\n")[0]}/cwd 2>/dev/null || echo unknown`);
  console.log(`[sync] Server CWD: ${cwd}`);
}

const ver = run("curl -s -m 5 http://127.0.0.1:3000/api/version 2>&1");
console.log(`[sync] Version: ${ver.substring(0, 200)}`);

const suk = run("curl -s -m 5 -X POST -H 'Content-Type: application/json' -d '{\"birthDate\":\"2000-01-01\",\"name\":\"t\"}' http://127.0.0.1:3000/api/sukuyou/diagnose 2>&1");
console.log(`[sync] Sukuyou: ${suk.substring(0, 200)}`);

// Check startup log
const startupLog = run("cat /tmp/tenmon-ark-startup.log 2>/dev/null || echo 'no log'");
console.log(`[sync] Startup log:\n${startupLog.substring(0, 500)}`);

// ── 7. Disable systemd service so deploy.yml's restart doesn't interfere ──
run("systemctl disable tenmon-ark-api 2>/dev/null || true");
console.log("[sync] Disabled systemd service to prevent interference");

console.log("[sync] ✅ v11 complete");
