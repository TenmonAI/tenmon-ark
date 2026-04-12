/**
 * Post-deploy sync: ensure systemd can find dist/index.js
 * 
 * VPS directory structure:
 *   /opt/tenmon-ark/api/          — deploy target (git clone, npm install, npm run build)
 *   /opt/tenmon-ark/tenmon-ark/   — systemd WorkingDirectory (ExecStart=node dist/index.js)
 * 
 * This script copies the built dist/ and node_modules/ from the deploy target
 * to the systemd WorkingDirectory so the restarted service picks up the latest code.
 */
import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(__dirname, "..");

// Known VPS paths
const DEPLOY_API = "/opt/tenmon-ark/api";
const SYSTEMD_BASE = "/opt/tenmon-ark/tenmon-ark";

// Only run on VPS when building from the deploy target
if (apiDir !== DEPLOY_API) {
  console.log(`[sync] Not deploy path (${apiDir}), skipping`);
  process.exit(0);
}

if (!existsSync(SYSTEMD_BASE)) {
  console.log(`[sync] systemd base not found: ${SYSTEMD_BASE}, skipping`);
  process.exit(0);
}

console.log(`[sync] Deploy path: ${DEPLOY_API}`);
console.log(`[sync] Systemd base: ${SYSTEMD_BASE}`);

try {
  // Step 1: Sync dist/ to systemd base
  const srcDist = resolve(DEPLOY_API, "dist");
  const dstDist = resolve(SYSTEMD_BASE, "dist");
  
  if (existsSync(srcDist)) {
    console.log(`[sync] Copying dist/ -> ${dstDist}`);
    execSync(`rm -rf ${dstDist} && cp -rf ${srcDist} ${dstDist}`, { stdio: "inherit" });
    console.log(`[sync] ✅ dist/ synced`);
  }
  
  // Step 2: Sync node_modules/ to systemd base
  const srcModules = resolve(DEPLOY_API, "node_modules");
  const dstModules = resolve(SYSTEMD_BASE, "node_modules");
  
  if (existsSync(srcModules)) {
    console.log(`[sync] Syncing node_modules/ -> ${dstModules}`);
    // Use rsync for efficiency if available, otherwise cp
    try {
      execSync(`rsync -a --delete ${srcModules}/ ${dstModules}/`, { stdio: "inherit" });
    } catch {
      execSync(`rm -rf ${dstModules} && cp -rf ${srcModules} ${dstModules}`, { stdio: "inherit" });
    }
    console.log(`[sync] ✅ node_modules/ synced`);
  }
  
  // Step 3: Ensure .env is accessible
  const srcEnv = resolve(DEPLOY_API, ".env");
  const dstEnv = resolve(SYSTEMD_BASE, ".env");
  if (existsSync(srcEnv) && !existsSync(dstEnv)) {
    execSync(`cp ${srcEnv} ${dstEnv}`, { stdio: "inherit" });
    console.log(`[sync] ✅ .env copied`);
  }
  
  // Step 4: Also sync package.json for any runtime references
  const srcPkg = resolve(DEPLOY_API, "package.json");
  const dstPkg = resolve(SYSTEMD_BASE, "package.json");
  if (existsSync(srcPkg)) {
    execSync(`cp ${srcPkg} ${dstPkg}`, { stdio: "inherit" });
    console.log(`[sync] ✅ package.json copied`);
  }
  
  console.log("[sync] ✅ All sync complete — systemd will pick up latest code on restart");
} catch (err) {
  console.error(`[sync] ⚠️ Error: ${err.message}`);
  console.error("[sync] The server may still run old code. Manual intervention may be needed.");
  // Don't exit with error code to avoid breaking the deploy
}
