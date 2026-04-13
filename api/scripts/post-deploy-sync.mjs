/**
 * Post-deploy sync script (v14 - DEFINITIVE)
 * 
 * This script:
 * 1. Ensures data directory
 * 2. Syncs dist/node_modules/src to REPO dir
 * 3. Writes a PROPER systemd service file pointing to BUILD dir
 * 4. Kills ALL processes on port 3000 (nohup leftovers)
 * 5. Lets deploy.yml's `systemctl restart` start the new code
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
console.log(`[sync] v14 apiDir=${apiDir} pid=${myPid}`);

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

// ── 3. Sync dist to REPO dir ──
if (existsSync(REPO_DIR)) {
  run(`rsync -a --delete ${BUILD_DIR}/dist/ ${REPO_DIR}/dist/ 2>/dev/null || true`);
  run(`rsync -a --delete ${BUILD_DIR}/node_modules/ ${REPO_DIR}/node_modules/ 2>/dev/null || true`);
  run(`rsync -a --delete ${BUILD_DIR}/src/ ${REPO_DIR}/src/ 2>/dev/null || true`);
  run(`cp ${BUILD_DIR}/package.json ${REPO_DIR}/package.json 2>/dev/null || true`);
  console.log("[sync] Synced to REPO dir");
}

// ── 4. Write PROPER systemd service file ──
// Find .env file for EnvironmentFile directive
let envFileLine = "";
if (existsSync(`${BUILD_DIR}/.env`)) {
  envFileLine = `EnvironmentFile=${BUILD_DIR}/.env`;
} else if (existsSync(`${REPO_DIR}/.env`)) {
  envFileLine = `EnvironmentFile=${REPO_DIR}/.env`;
}

const serviceContent = `[Unit]
Description=TENMON-ARK API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${BUILD_DIR}
${envFileLine}
Environment=NODE_ENV=production
Environment=TENMON_DATA_DIR=/opt/tenmon-ark-data
ExecStart=/usr/bin/node ${BUILD_DIR}/dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
`;

const serviceFile = "/etc/systemd/system/tenmon-ark-api.service";
try {
  writeFileSync(serviceFile, serviceContent);
  run("systemctl daemon-reload");
  run("systemctl unmask tenmon-ark-api 2>/dev/null || true");
  run("systemctl enable tenmon-ark-api 2>/dev/null || true");
  console.log(`[sync] Wrote systemd service: WorkingDirectory=${BUILD_DIR}`);
} catch (e) {
  console.error(`[sync] Failed to write systemd service:`, e.message);
}

// ── 5. Kill ALL processes on port 3000 ──
console.log("[sync] Killing all processes on port 3000...");
run("systemctl stop tenmon-ark-api 2>/dev/null || true");
run("sleep 1");

const pids = run("lsof -ti:3000 2>/dev/null || true");
if (pids && !pids.startsWith("[err")) {
  for (const p of pids.split("\n").filter(x => x.trim() && x.trim() !== myPid)) {
    console.log(`[sync] Killing PID ${p.trim()}`);
    run(`kill -9 ${p.trim()} 2>/dev/null || true`);
  }
}
run("sleep 1");
console.log(`[sync] Port 3000: ${run("lsof -ti:3000 2>/dev/null || echo free")}`);

// ── 6. Verify files ──
const hasIndex = existsSync(`${BUILD_DIR}/dist/index.js`);
const hasSukuyou = existsSync(`${BUILD_DIR}/dist/sukuyou/sukuyouEngine.js`);
const hasLookup = existsSync(`${BUILD_DIR}/dist/sukuyou/sukuyou_lookup_table.json`);
const hasEnv = existsSync(`${BUILD_DIR}/.env`);
console.log(`[sync] BUILD: index=${hasIndex} sukuyou=${hasSukuyou} lookup=${hasLookup} env=${hasEnv}`);

console.log("[sync] ✅ v14 complete - deploy.yml systemctl restart will start new code from BUILD dir");
