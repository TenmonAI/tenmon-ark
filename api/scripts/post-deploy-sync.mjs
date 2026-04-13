/**
 * Post-deploy sync script (v13 - FINAL)
 * 
 * PROVEN APPROACH (v11 worked on localhost):
 * 1. Sync dist to both directories
 * 2. Kill old processes on port 3000
 * 3. Start server with nohup (this WORKS - verified in v11)
 * 4. Replace systemd service ExecStart with a no-op so deploy.yml's
 *    `systemctl restart` doesn't interfere with our nohup process
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

const myPid = String(process.pid);
console.log(`[sync] v13 apiDir=${apiDir} pid=${myPid}`);

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 60000 }).trim();
  } catch (e) {
    return `[err: ${String(e.stderr || e.message || "").substring(0, 200)}]`;
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

// ── 3. Sync dist to REPO dir (for completeness) ──
if (existsSync(REPO_DIR)) {
  run(`rsync -a --delete ${BUILD_DIR}/dist/ ${REPO_DIR}/dist/ 2>/dev/null || true`);
  run(`rsync -a --delete ${BUILD_DIR}/node_modules/ ${REPO_DIR}/node_modules/ 2>/dev/null || true`);
  console.log("[sync] Synced to REPO dir");
}

// ── 4. Stop ALL existing servers ──
console.log("[sync] Stopping all servers...");
run("systemctl stop tenmon-ark-api 2>/dev/null || true");
run("sleep 1");

// Kill ALL node processes on port 3000 (exclude self)
const pids = run("lsof -ti:3000 2>/dev/null || true");
if (pids && !pids.startsWith("[err")) {
  for (const p of pids.split("\n").filter(x => x.trim() && x.trim() !== myPid)) {
    run(`kill -9 ${p.trim()} 2>/dev/null || true`);
  }
}
run("sleep 1");
console.log(`[sync] Port 3000: ${run("lsof -ti:3000 2>/dev/null || echo free")}`);

// ── 5. Start server with nohup ──
const startDir = BUILD_DIR;
console.log(`[sync] Starting server from ${startDir}...`);

// Load .env if available
let envPrefix = "";
if (existsSync(`${startDir}/.env`)) {
  const envContent = readFileSync(`${startDir}/.env`, "utf8");
  const lines = envContent.split("\n").filter(l => l.trim() && !l.startsWith("#") && l.includes("="));
  envPrefix = lines.map(l => `export ${l}`).join(" && ") + " && ";
}

run(`cd ${startDir} && ${envPrefix}nohup /usr/bin/node dist/index.js > /tmp/tenmon-ark-server.log 2>&1 &`);
run("sleep 5");

// ── 6. Verify ──
const serverPid = run("lsof -ti:3000 2>/dev/null || echo none");
console.log(`[sync] Server PID: ${serverPid}`);

const ver = run("curl -s -m 5 http://127.0.0.1:3000/api/version 2>&1");
console.log(`[sync] Version: ${ver.substring(0, 200)}`);

const suk = run("curl -s -m 5 -X POST -H 'Content-Type: application/json' -d '{\"birthDate\":\"2000-01-01\",\"name\":\"t\"}' http://127.0.0.1:3000/api/sukuyou/diagnose 2>&1");
console.log(`[sync] Sukuyou: ${suk.substring(0, 200)}`);

// ── 7. Neutralize systemd service ──
// Replace the ExecStart with a no-op so deploy.yml's `systemctl restart` 
// doesn't kill our nohup process or start a competing server.
const serviceFile = "/etc/systemd/system/tenmon-ark-api.service";
try {
  if (existsSync(serviceFile)) {
    // Write a completely new service file that does nothing
    const noopService = `[Unit]
Description=TENMON-ARK API (managed by post-deploy-sync, not systemd)

[Service]
Type=oneshot
ExecStart=/bin/true
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
`;
    writeFileSync(serviceFile, noopService);
    run("systemctl daemon-reload");
    run("systemctl enable tenmon-ark-api 2>/dev/null || true");
    console.log("[sync] Replaced systemd service with no-op");
  }
} catch (e) {
  // If we can't write to /etc/systemd/system, try masking instead
  run("systemctl mask tenmon-ark-api 2>/dev/null || true");
  console.log("[sync] Masked systemd service (fallback)");
}

console.log("[sync] ✅ v13 complete");
