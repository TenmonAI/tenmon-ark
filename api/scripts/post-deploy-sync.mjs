/**
 * Post-deploy sync: ensure systemd can find dist/index.js
 * 
 * systemd WorkingDirectory=/opt/tenmon-ark/tenmon-ark
 * systemd ExecStart=node dist/index.js
 * 
 * But dist/ is built inside api/ subdirectory.
 * This script creates a symlink or copies dist/ to the parent directory.
 */
import { execSync } from "child_process";
import { existsSync, lstatSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(__dirname, "..");          // /opt/tenmon-ark/.../api
const parentDir = resolve(apiDir, "..");          // /opt/tenmon-ark/...
const apiDist = resolve(apiDir, "dist");          // /opt/tenmon-ark/.../api/dist
const parentDist = resolve(parentDir, "dist");    // /opt/tenmon-ark/.../dist

// Only run on VPS
if (!apiDir.startsWith("/opt/tenmon-ark")) {
  console.log("[sync] Not on VPS, skipping");
  process.exit(0);
}

console.log(`[sync] apiDir=${apiDir}`);
console.log(`[sync] parentDir=${parentDir}`);

if (!existsSync(apiDist)) {
  console.log("[sync] No dist/ found in api/, skipping");
  process.exit(0);
}

try {
  // Check if parent dist/ already exists
  if (existsSync(parentDist)) {
    const stat = lstatSync(parentDist);
    if (stat.isSymbolicLink()) {
      console.log("[sync] Parent dist/ is already a symlink, updating...");
      execSync(`rm -f ${parentDist}`);
    } else {
      console.log("[sync] Parent dist/ is a directory, replacing with symlink...");
      execSync(`rm -rf ${parentDist}`);
    }
  }
  
  // Create symlink: parent/dist -> api/dist
  execSync(`ln -sf api/dist ${parentDist}`);
  console.log(`[sync] ✅ Created symlink: ${parentDist} -> api/dist`);
  
  // Also ensure node_modules is accessible from parent
  const parentModules = resolve(parentDir, "node_modules");
  if (!existsSync(parentModules)) {
    const apiModules = resolve(apiDir, "node_modules");
    if (existsSync(apiModules)) {
      execSync(`ln -sf api/node_modules ${parentModules}`);
      console.log(`[sync] ✅ Created symlink: ${parentModules} -> api/node_modules`);
    }
  }
  
  // Ensure .env is accessible from parent
  const parentEnv = resolve(parentDir, ".env");
  const apiEnv = resolve(apiDir, ".env");
  if (!existsSync(parentEnv) && existsSync(apiEnv)) {
    execSync(`ln -sf api/.env ${parentEnv}`);
    console.log(`[sync] ✅ Created symlink: ${parentEnv} -> api/.env`);
  }
} catch (err) {
  console.error(`[sync] ⚠️ Error (non-fatal): ${err.message}`);
}
