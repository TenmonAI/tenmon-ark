/**
 * Post-deploy sync script (v7 - minimal)
 * 
 * IMPORTANT: This script must NOT stop/kill/restart any services.
 * deploy.yml runs `systemctl restart tenmon-ark-api` AFTER this script.
 * If we stop the service here, the SSH session may end before the restart runs.
 * 
 * This script only:
 * 1. Ensures the systemd service points to the correct directory
 * 2. Verifies critical files exist
 */
import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(__dirname, "..");

if (!apiDir.startsWith("/opt/tenmon-ark")) {
  console.log("[sync] Not on VPS, skipping");
  process.exit(0);
}

console.log(`[sync] Running on VPS, apiDir=${apiDir}`);

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 30000 }).trim();
  } catch (e) {
    return `[error: ${(e.stderr || e.message || "").substring(0, 300)}]`;
  }
}

// ---- Step 1: Ensure systemd service points to this directory ----
const SERVICE_PATH = "/etc/systemd/system/tenmon-ark-api.service";

if (existsSync(SERVICE_PATH)) {
  const currentService = readFileSync(SERVICE_PATH, "utf8");
  const currentWD = currentService.match(/WorkingDirectory=(.+)/)?.[1] || "unknown";
  console.log(`[sync] Current WorkingDirectory: ${currentWD}`);

  if (currentWD !== apiDir) {
    console.log(`[sync] Updating WorkingDirectory: ${currentWD} -> ${apiDir}`);
    let newService = currentService
      .replace(/WorkingDirectory=.+/, `WorkingDirectory=${apiDir}`)
      .replace(/EnvironmentFile=.+/, `EnvironmentFile=${apiDir}/.env`);
    writeFileSync(SERVICE_PATH, newService);
    run("systemctl daemon-reload");
    console.log("[sync] Updated and reloaded systemd");
  } else {
    console.log("[sync] WorkingDirectory already correct");
  }
}

// ---- Step 2: Verify critical files ----
const checks = {
  "dist/index.js": existsSync(`${apiDir}/dist/index.js`),
  "dist/routes/sukuyou.js": existsSync(`${apiDir}/dist/routes/sukuyou.js`),
  "dist/sukuyou/sukuyouEngine.js": existsSync(`${apiDir}/dist/sukuyou/sukuyouEngine.js`),
  "dist/sukuyou/sukuyou_lookup_table.json": existsSync(`${apiDir}/dist/sukuyou/sukuyou_lookup_table.json`),
  "dist/core/consciousnessOS.js": existsSync(`${apiDir}/dist/core/consciousnessOS.js`),
};

for (const [file, exists] of Object.entries(checks)) {
  console.log(`[sync] ${exists ? "✅" : "❌"} ${file}`);
}

// DO NOT stop, kill, or restart anything here.
// deploy.yml's `systemctl restart tenmon-ark-api` handles the restart.
console.log("[sync] ✅ Pre-restart verification complete");
