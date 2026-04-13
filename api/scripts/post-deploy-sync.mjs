/**
 * Post-deploy sync script (v10 - SAFE)
 * 
 * CRITICAL: This script must NEVER kill any processes.
 * The deploy.yml's `systemctl restart tenmon-ark-api` handles
 * stopping the old process and starting the new one atomically.
 * 
 * This script ONLY:
 * 1. Ensures data directory exists
 * 2. Syncs .env between directories
 * 3. Rsyncs dist/node_modules/src from build dir to repo dir
 * 4. Verifies critical files exist
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

console.log(`[sync] v10 apiDir=${apiDir}`);

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
const dataDir = "/opt/tenmon-ark-data";
if (!existsSync(dataDir)) {
  run(`mkdir -p ${dataDir}`);
}
run(`chmod 777 ${dataDir}`);

// ── 2. Sync .env between directories ──
const envSources = [`${BUILD_DIR}/.env`, `${REPO_DIR}/.env`];
let envContent = null;
for (const src of envSources) {
  if (existsSync(src)) {
    envContent = src;
    break;
  }
}
if (envContent) {
  for (const dir of [BUILD_DIR, REPO_DIR]) {
    if (existsSync(dir) && !existsSync(`${dir}/.env`)) {
      run(`cp ${envContent} ${dir}/.env`);
      console.log(`[sync] Copied .env to ${dir}`);
    }
  }
}

// ── 3. Sync dist from build dir to repo dir ──
if (apiDir === BUILD_DIR && existsSync(REPO_DIR)) {
  console.log(`[sync] Syncing ${BUILD_DIR} → ${REPO_DIR}`);
  
  // Sync dist/ (compiled JS)
  const d = run(`rsync -a --delete ${BUILD_DIR}/dist/ ${REPO_DIR}/dist/`);
  console.log(`[sync] dist: ${d || 'OK'}`);
  
  // Sync node_modules/
  const n = run(`rsync -a --delete ${BUILD_DIR}/node_modules/ ${REPO_DIR}/node_modules/`);
  console.log(`[sync] node_modules: ${n || 'OK'}`);
  
  // Sync src/ (for SQL schemas loaded at runtime)
  const s = run(`rsync -a --delete ${BUILD_DIR}/src/ ${REPO_DIR}/src/`);
  console.log(`[sync] src: ${s || 'OK'}`);
  
  // Sync package.json
  run(`cp ${BUILD_DIR}/package.json ${REPO_DIR}/package.json`);
  
  // Verify critical files in BOTH directories
  for (const dir of [BUILD_DIR, REPO_DIR]) {
    const label = dir === BUILD_DIR ? "BUILD" : "REPO";
    const hasIndex = existsSync(`${dir}/dist/index.js`);
    const hasSukuyou = existsSync(`${dir}/dist/sukuyou/sukuyouEngine.js`);
    const hasLookup = existsSync(`${dir}/dist/sukuyou/sukuyou_lookup_table.json`);
    const hasEnv = existsSync(`${dir}/.env`);
    console.log(`[sync] ${label}: index=${hasIndex} sukuyou=${hasSukuyou} lookup=${hasLookup} env=${hasEnv}`);
  }
  
  // Check that version route exists in synced dist
  const versionCheck = run(`grep -c "api/version" ${REPO_DIR}/dist/index.js 2>/dev/null || echo 0`);
  console.log(`[sync] REPO dist/index.js has ${versionCheck} 'api/version' refs`);
} else {
  console.log(`[sync] No sync needed (apiDir=${apiDir}, REPO exists=${existsSync(REPO_DIR)})`);
}

// ── 4. NO PROCESS KILLING ──
// systemctl restart handles stopping old + starting new atomically
console.log("[sync] ✅ v10 complete - deploy.yml systemctl restart will handle process lifecycle");
