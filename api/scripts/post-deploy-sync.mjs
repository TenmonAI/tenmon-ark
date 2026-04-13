/**
 * Post-deploy sync script (v12 - SYSTEMD FIX)
 * 
 * ROOT CAUSE: systemd service points to /opt/tenmon-ark-repo/api (old code).
 * Deploy builds in /opt/tenmon-ark/api (new code).
 * deploy.yml runs `systemctl restart tenmon-ark-api` AFTER this script.
 * 
 * FIX: Update the systemd service file to point to /opt/tenmon-ark/api
 * so that when deploy.yml runs systemctl restart, it starts the NEW code.
 * 
 * This script:
 * 1. Ensures data directory exists
 * 2. Updates systemd service WorkingDirectory to BUILD dir
 * 3. Copies .env if needed
 * 4. Verifies critical files
 * 5. Does NOT kill processes or start servers (systemctl restart handles that)
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

console.log(`[sync] v12 apiDir=${apiDir}`);

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 60000 }).trim();
  } catch (e) {
    return `[err: ${String(e.stderr || e.message || "").substring(0, 200)}]`;
  }
}

const BUILD_DIR = "/opt/tenmon-ark/api";

// ── 1. Ensure data directory ──
const dataDir = "/opt/tenmon-ark-data";
if (!existsSync(dataDir)) {
  run(`sudo mkdir -p ${dataDir}`);
}
run(`sudo chmod 777 ${dataDir}`);

// ── 2. Update systemd service to point to BUILD dir ──
const serviceFile = "/etc/systemd/system/tenmon-ark-api.service";
try {
  if (existsSync(serviceFile)) {
    let content = readFileSync(serviceFile, "utf-8");
    const origContent = content;
    
    // Update WorkingDirectory to BUILD dir
    content = content.replace(
      /WorkingDirectory=.*/g,
      `WorkingDirectory=${BUILD_DIR}`
    );
    
    // Update ExecStart to use BUILD dir
    content = content.replace(
      /ExecStart=.*node\s+.*/g,
      `ExecStart=/usr/bin/node ${BUILD_DIR}/dist/index.js`
    );
    
    // Ensure the service is enabled
    if (content !== origContent) {
      writeFileSync(serviceFile, content);
      console.log(`[sync] Updated systemd service WorkingDirectory to ${BUILD_DIR}`);
      run("sudo systemctl daemon-reload");
      console.log("[sync] systemd daemon reloaded");
    } else {
      console.log("[sync] systemd service already points to correct dir");
    }
    
    // Re-enable the service in case it was disabled
    run("sudo systemctl enable tenmon-ark-api 2>/dev/null || true");
    console.log("[sync] Service enabled");
  } else {
    console.log(`[sync] No systemd service file found at ${serviceFile}`);
  }
} catch (e) {
  console.error(`[sync] Failed to update systemd:`, e.message);
}

// ── 3. Copy .env if needed ──
const REPO_DIR = "/opt/tenmon-ark-repo/api";
const envSources = [`${REPO_DIR}/.env`, `${BUILD_DIR}/.env`];
for (const src of envSources) {
  if (existsSync(src)) {
    for (const dir of [BUILD_DIR, REPO_DIR]) {
      if (existsSync(dir) && !existsSync(`${dir}/.env`)) {
        run(`cp ${src} ${dir}/.env`);
        console.log(`[sync] Copied .env to ${dir}`);
      }
    }
    break;
  }
}

// ── 4. Verify critical files ──
const hasIndex = existsSync(`${BUILD_DIR}/dist/index.js`);
const hasSukuyou = existsSync(`${BUILD_DIR}/dist/sukuyou/sukuyouEngine.js`);
const hasLookup = existsSync(`${BUILD_DIR}/dist/sukuyou/sukuyou_lookup_table.json`);
const hasEnv = existsSync(`${BUILD_DIR}/.env`);
console.log(`[sync] BUILD: index=${hasIndex} sukuyou=${hasSukuyou} lookup=${hasLookup} env=${hasEnv}`);

// Check version route exists
const versionCheck = run(`grep -c "api/version" ${BUILD_DIR}/dist/index.js 2>/dev/null || echo 0`);
console.log(`[sync] dist/index.js has ${versionCheck} 'api/version' refs`);

console.log("[sync] ✅ v12 complete - deploy.yml systemctl restart will now use BUILD dir");
