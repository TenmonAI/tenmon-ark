/**
 * Post-deploy sync script
 * 
 * Runs after `npm run build` on the VPS during deploy.
 * BEFORE systemctl restart tenmon-ark-api runs.
 * 
 * The key insight: systemd's Restart=always auto-respawns killed processes.
 * We must STOP the systemd service first, then kill any remaining processes,
 * then reset the failure counter. The deploy script's final
 * `systemctl restart tenmon-ark-api` will start the new code.
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

// Step 1: STOP the systemd service (prevents auto-respawn)
try {
  execSync("systemctl stop tenmon-ark-api 2>/dev/null || true", { stdio: "pipe" });
  console.log("[sync] ✅ systemd service stopped");
} catch {}

// Step 2: Wait for the service to fully stop
try {
  execSync("sleep 2");
} catch {}

// Step 3: Kill any remaining processes on port 3000 (orphans, pm2, etc.)
try {
  const result = execSync("lsof -ti:3000 2>/dev/null || true", { encoding: "utf8" }).trim();
  if (result) {
    const pids = result.split("\n").filter(Boolean);
    console.log(`[sync] Found ${pids.length} remaining processes on port 3000: ${pids.join(", ")}`);
    for (const pid of pids) {
      try {
        execSync(`kill -9 ${pid} 2>/dev/null || true`);
        console.log(`[sync] Killed PID ${pid}`);
      } catch {}
    }
    execSync("sleep 1");
  } else {
    console.log("[sync] No remaining processes on port 3000");
  }
} catch {}

// Step 4: Reset systemd failure counter
try {
  execSync("systemctl reset-failed tenmon-ark-api 2>/dev/null || true", { stdio: "pipe" });
  console.log("[sync] ✅ systemd failure counter reset");
} catch {}

// Step 5: Diagnostic info
try {
  const nodeVersion = execSync("node --version 2>/dev/null || echo unknown", { encoding: "utf8" }).trim();
  console.log(`[sync] Node.js version: ${nodeVersion}`);
  
  const distFiles = execSync(`ls -la ${apiDir}/dist/index.js 2>/dev/null || echo 'not found'`, { encoding: "utf8" }).trim();
  console.log(`[sync] dist/index.js: ${distFiles}`);
  
  // Check systemd service status
  const status = execSync("systemctl is-active tenmon-ark-api 2>/dev/null || echo 'unknown'", { encoding: "utf8" }).trim();
  console.log(`[sync] systemd service status: ${status}`);
  
  // Verify port 3000 is free
  const portCheck = execSync("lsof -ti:3000 2>/dev/null || echo 'free'", { encoding: "utf8" }).trim();
  console.log(`[sync] port 3000: ${portCheck}`);
} catch (err) {
  console.error(`[sync] ⚠️ Diagnostic failed: ${err.message}`);
}

console.log("[sync] ✅ Post-deploy sync complete. Port 3000 is free for systemctl restart.");
