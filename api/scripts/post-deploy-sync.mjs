/**
 * Post-deploy sync script
 * 
 * Runs after `npm run build` on the VPS during deploy.
 * BEFORE systemctl restart tenmon-ark-api runs.
 * 
 * Tasks:
 * 1. Stop pm2 if it exists (it auto-respawns killed processes)
 * 2. Kill ALL node processes on port 3000
 * 3. Reset systemd failure counter so it can restart cleanly
 */
import { execSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(__dirname, "..");

// Only run on VPS
if (!apiDir.startsWith("/opt/tenmon-ark")) {
  console.log("[sync] Not on VPS, skipping");
  process.exit(0);
}

console.log(`[sync] Running on VPS, apiDir=${apiDir}`);

// Task 1: Stop pm2 completely (it auto-respawns killed processes)
try {
  // Check if pm2 is installed
  const pm2Path = execSync("which pm2 2>/dev/null || true", { encoding: "utf8" }).trim();
  if (pm2Path) {
    console.log(`[sync] Found pm2 at ${pm2Path}`);
    try {
      const pm2List = execSync("pm2 jlist 2>/dev/null || echo '[]'", { encoding: "utf8" }).trim();
      console.log(`[sync] pm2 processes: ${pm2List.substring(0, 200)}`);
    } catch {}
    
    // Stop all pm2 processes
    try { execSync("pm2 stop all 2>/dev/null || true", { stdio: "pipe" }); } catch {}
    try { execSync("pm2 delete all 2>/dev/null || true", { stdio: "pipe" }); } catch {}
    // Remove pm2 startup hook to prevent auto-restart on reboot
    try { execSync("pm2 unstartup 2>/dev/null || true", { stdio: "pipe" }); } catch {}
    // Kill the pm2 daemon itself
    try { execSync("pm2 kill 2>/dev/null || true", { stdio: "pipe" }); } catch {}
    console.log("[sync] ✅ pm2 stopped and killed");
  } else {
    console.log("[sync] pm2 not found");
  }
} catch (err) {
  console.error(`[sync] ⚠️ pm2 cleanup failed: ${err.message}`);
}

// Task 2: Kill any remaining processes on port 3000
try {
  const result = execSync("lsof -ti:3000 2>/dev/null || true", { encoding: "utf8" }).trim();
  if (result) {
    const pids = result.split("\n").filter(Boolean);
    console.log(`[sync] Found ${pids.length} processes on port 3000: ${pids.join(", ")}`);
    for (const pid of pids) {
      try {
        execSync(`kill -9 ${pid} 2>/dev/null || true`);
        console.log(`[sync] Killed PID ${pid}`);
      } catch {}
    }
    // Wait a moment for port to be released
    execSync("sleep 1");
  } else {
    console.log("[sync] No processes on port 3000");
  }
} catch (err) {
  // Try fuser as fallback
  try {
    execSync("fuser -k 3000/tcp 2>/dev/null || true", { stdio: "pipe" });
    execSync("sleep 1");
  } catch {}
}

// Task 3: Reset systemd failure counter
try {
  execSync("systemctl reset-failed tenmon-ark-api 2>/dev/null || true", { stdio: "pipe" });
  console.log("[sync] ✅ systemd failure counter reset");
} catch {}

// Task 4: Diagnostic info
try {
  const nodeVersion = execSync("node --version 2>/dev/null || echo unknown", { encoding: "utf8" }).trim();
  console.log(`[sync] Node.js version: ${nodeVersion}`);
  
  // Check what's in the dist directory
  const distFiles = execSync(`ls -la ${apiDir}/dist/index.js 2>/dev/null || echo 'dist/index.js not found'`, { encoding: "utf8" }).trim();
  console.log(`[sync] dist/index.js: ${distFiles}`);
  
  // Check systemd service file
  const serviceFile = execSync("cat /etc/systemd/system/tenmon-ark-api.service 2>/dev/null || echo 'service file not found'", { encoding: "utf8" }).trim();
  console.log(`[sync] systemd service:\n${serviceFile}`);
} catch (err) {
  console.error(`[sync] ⚠️ Diagnostic failed: ${err.message}`);
}

console.log("[sync] ✅ Post-deploy sync complete, ready for systemctl restart");
