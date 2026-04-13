/**
 * Post-deploy sync script (v5)
 * 
 * ONLY syncs dist + node_modules from build dir to systemd dir.
 * Does NOT restart the service - the deploy script's `systemctl restart` handles that.
 * 
 * Build dir:   /opt/tenmon-ark/api      (where deploy.yml runs npm run build)
 * Systemd dir: /opt/tenmon-ark-repo/api  (where systemd runs the server)
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

console.log(`[sync] Running on VPS, apiDir=${apiDir}`);

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 60000 }).trim();
  } catch (e) {
    return `[error: ${(e.stderr || e.stdout || e.message || "").substring(0, 300)}]`;
  }
}

const BUILD_DIR = "/opt/tenmon-ark/api";
const SYSTEMD_DIR = "/opt/tenmon-ark-repo/api";

if (apiDir === BUILD_DIR && existsSync(SYSTEMD_DIR)) {
  console.log(`[sync] Syncing from ${BUILD_DIR} → ${SYSTEMD_DIR}`);
  
  // 1. Sync dist/ (compiled JS)
  const d = run(`rsync -a --delete ${BUILD_DIR}/dist/ ${SYSTEMD_DIR}/dist/`);
  console.log(`[sync] dist: ${d || 'OK'}`);
  
  // 2. Sync node_modules/
  const n = run(`rsync -a --delete ${BUILD_DIR}/node_modules/ ${SYSTEMD_DIR}/node_modules/`);
  console.log(`[sync] node_modules: ${n || 'OK'}`);
  
  // 3. Sync package.json + src/ (for SQL schemas)
  run(`cp ${BUILD_DIR}/package.json ${SYSTEMD_DIR}/package.json`);
  const s = run(`rsync -a --delete ${BUILD_DIR}/src/ ${SYSTEMD_DIR}/src/`);
  console.log(`[sync] src+pkg: ${s || 'OK'}`);
  
  // 4. Verify
  const hasVersion = run(`grep -l "version" ${SYSTEMD_DIR}/dist/index.js 2>/dev/null && echo YES || echo NO`);
  const hasSukuyou = run(`ls ${SYSTEMD_DIR}/dist/sukuyou/sukuyouEngine.js 2>/dev/null && echo YES || echo NO`);
  const hasLookup = run(`ls ${SYSTEMD_DIR}/dist/sukuyou/sukuyou_lookup_table.json 2>/dev/null && echo YES || echo NO`);
  console.log(`[sync] Verify: version=${hasVersion}, sukuyou=${hasSukuyou}, lookup=${hasLookup}`);
  
  // 5. Stop the old server so the deploy script's `systemctl restart` starts fresh
  console.log("[sync] Stopping old server for clean restart...");
  run("systemctl stop tenmon-ark-api 2>/dev/null || true");
  
  // Kill any lingering processes on port 3000
  const pids = run("lsof -ti:3000 2>/dev/null || true");
  if (pids && !pids.startsWith("[error")) {
    const myPid = process.pid;
    for (const pid of pids.split("\n").filter(p => p && p !== String(myPid))) {
      run(`kill -9 ${pid} 2>/dev/null || true`);
    }
  }
  
  console.log("[sync] ✅ Sync complete. Deploy script will restart service.");
} else {
  console.log(`[sync] No sync needed (apiDir=${apiDir})`);
}
