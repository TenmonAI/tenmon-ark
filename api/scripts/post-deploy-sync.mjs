/**
 * Post-deploy sync script
 * 
 * Root cause: deploy.yml builds in /opt/tenmon-ark/api
 * but systemd runs from /opt/tenmon-ark-repo/api
 * 
 * This script ONLY syncs the built artifacts.
 * deploy.yml handles the systemctl restart AFTER this script.
 */
import { execSync } from "child_process";
import { existsSync } from "fs";
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
    return execSync(cmd, { encoding: "utf8", timeout: 60000 }).trim();
  } catch (e) {
    return `[error: ${(e.stderr || e.stdout || e.message || "").substring(0, 500)}]`;
  }
}

const DEPLOY_DIR = apiDir;  // /opt/tenmon-ark/api
const SYSTEMD_DIR = "/opt/tenmon-ark-repo/api";

const needsSync = DEPLOY_DIR !== SYSTEMD_DIR && existsSync(SYSTEMD_DIR);
console.log(`[sync] Deploy dir: ${DEPLOY_DIR}`);
console.log(`[sync] Systemd dir: ${SYSTEMD_DIR}, exists: ${existsSync(SYSTEMD_DIR)}`);
console.log(`[sync] Needs sync: ${needsSync}`);

if (needsSync) {
  // Sync dist/
  console.log("[sync] Syncing dist/...");
  const syncDist = run(`rsync -a --delete ${DEPLOY_DIR}/dist/ ${SYSTEMD_DIR}/dist/`);
  console.log(`[sync] dist sync: ${syncDist || "OK"}`);

  // Sync node_modules/
  console.log("[sync] Syncing node_modules/...");
  const syncModules = run(`rsync -a --delete ${DEPLOY_DIR}/node_modules/ ${SYSTEMD_DIR}/node_modules/`);
  console.log(`[sync] node_modules sync: ${syncModules || "OK"}`);

  // Sync package.json
  if (existsSync(`${DEPLOY_DIR}/package.json`)) {
    run(`cp ${DEPLOY_DIR}/package.json ${SYSTEMD_DIR}/package.json`);
    console.log("[sync] package.json synced");
  }

  // Verify critical files
  const checks = [
    `${SYSTEMD_DIR}/dist/index.js`,
    `${SYSTEMD_DIR}/dist/sukuyou/sukuyouEngine.js`,
    `${SYSTEMD_DIR}/dist/sukuyou/sukuyou_lookup_table.json`,
    `${SYSTEMD_DIR}/dist/routes/sukuyou.js`,
    `${SYSTEMD_DIR}/dist/core/consciousnessOS.js`,
  ];
  for (const f of checks) {
    const exists = existsSync(f);
    console.log(`[sync] ${exists ? "✅" : "❌"} ${f.replace(SYSTEMD_DIR + "/", "")}`);
  }
} else {
  console.log("[sync] No sync needed (same directory or systemd dir not found)");
}

// DO NOT restart service here - deploy.yml's systemctl restart handles it
console.log("[sync] ✅ Sync complete (deploy.yml will restart service)");
