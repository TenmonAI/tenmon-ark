/**
 * Post-deploy sync script
 * 
 * Runs after `npm run build` on the VPS during deploy.
 * 
 * Tasks:
 * 1. Kill any rogue node processes on port 3000 (pm2, manual starts, etc.)
 *    so that `systemctl restart tenmon-ark-api` can bind to the port.
 * 2. Ensure dist/ and node_modules/ are accessible from systemd WorkingDirectory.
 */
import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(__dirname, "..");

// Only run on VPS
if (!apiDir.startsWith("/opt/tenmon-ark")) {
  console.log("[sync] Not on VPS, skipping");
  process.exit(0);
}

console.log(`[sync] Running on VPS, apiDir=${apiDir}`);

// Task 1: Kill any rogue processes on port 3000
try {
  console.log("[sync] Killing any rogue processes on port 3000...");
  
  // Try pm2 first
  try {
    execSync("which pm2 && pm2 kill 2>/dev/null", { stdio: "pipe" });
    console.log("[sync] pm2 processes killed");
  } catch {
    // pm2 not installed or no processes
  }
  
  // Kill any node processes listening on port 3000
  try {
    const result = execSync("lsof -ti:3000 2>/dev/null || true", { encoding: "utf8" }).trim();
    if (result) {
      const pids = result.split("\n").filter(Boolean);
      console.log(`[sync] Found processes on port 3000: ${pids.join(", ")}`);
      for (const pid of pids) {
        try {
          execSync(`kill -9 ${pid} 2>/dev/null || true`);
          console.log(`[sync] Killed PID ${pid}`);
        } catch {
          // Process might have already exited
        }
      }
    } else {
      console.log("[sync] No rogue processes on port 3000");
    }
  } catch {
    // lsof not available, try fuser
    try {
      execSync("fuser -k 3000/tcp 2>/dev/null || true", { stdio: "pipe" });
      console.log("[sync] Killed processes on port 3000 via fuser");
    } catch {
      // Neither lsof nor fuser available
    }
  }
} catch (err) {
  console.error(`[sync] ⚠️ Failed to kill rogue processes: ${err.message}`);
}

// Task 2: Ensure systemd can find the files
// The systemd service might use /opt/tenmon-ark/api as WorkingDirectory
// In that case, dist/ is already in the right place after build.
// But if there's a different WorkingDirectory, we need to sync.
const possibleSystemdDirs = [
  "/opt/tenmon-ark/tenmon-ark",
  "/opt/tenmon-ark/tenmon-ark/api",
];

for (const systemdDir of possibleSystemdDirs) {
  if (existsSync(systemdDir) && systemdDir !== apiDir) {
    console.log(`[sync] Found potential systemd dir: ${systemdDir}`);
    try {
      const srcDist = resolve(apiDir, "dist");
      const dstDist = resolve(systemdDir, "dist");
      if (existsSync(srcDist)) {
        execSync(`rm -rf ${dstDist} && cp -rf ${srcDist} ${dstDist}`, { stdio: "inherit" });
        console.log(`[sync] ✅ Copied dist/ to ${systemdDir}`);
      }
      
      const srcModules = resolve(apiDir, "node_modules");
      const dstModules = resolve(systemdDir, "node_modules");
      if (existsSync(srcModules) && !existsSync(dstModules)) {
        execSync(`ln -sf ${srcModules} ${dstModules}`, { stdio: "inherit" });
        console.log(`[sync] ✅ Linked node_modules to ${systemdDir}`);
      }
    } catch (err) {
      console.error(`[sync] ⚠️ Sync to ${systemdDir} failed: ${err.message}`);
    }
  }
}

console.log("[sync] ✅ Post-deploy sync complete");
