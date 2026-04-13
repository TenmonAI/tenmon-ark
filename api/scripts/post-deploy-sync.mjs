/**
 * Post-deploy sync script
 * 
 * Runs after `npm run build` on the VPS during deploy.
 * Handles the full service restart cycle:
 * 1. Stop systemd service
 * 2. Kill orphan processes  
 * 3. Reset failure counter
 * 4. Start the service (don't wait for deploy's systemctl restart)
 * 5. Verify the service is running
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

// Step 1: Stop the systemd service
try {
  execSync("systemctl stop tenmon-ark-api 2>/dev/null || true", { stdio: "pipe" });
  console.log("[sync] ✅ systemd service stopped");
} catch {}

// Step 2: Wait for the service to fully stop
try { execSync("sleep 2"); } catch {}

// Step 3: Kill any remaining processes on port 3000
try {
  const result = execSync("lsof -ti:3000 2>/dev/null || true", { encoding: "utf8" }).trim();
  if (result) {
    const pids = result.split("\n").filter(Boolean);
    console.log(`[sync] Killing ${pids.length} remaining processes: ${pids.join(", ")}`);
    for (const pid of pids) {
      try { execSync(`kill -9 ${pid} 2>/dev/null || true`); } catch {}
    }
    try { execSync("sleep 1"); } catch {}
  } else {
    console.log("[sync] Port 3000 is free");
  }
} catch {}

// Step 4: Reset systemd failure counter
try {
  execSync("systemctl reset-failed tenmon-ark-api 2>/dev/null || true", { stdio: "pipe" });
  console.log("[sync] ✅ systemd failure counter reset");
} catch {}

// Step 5: Start the service NOW (don't wait for deploy's systemctl restart)
try {
  execSync("systemctl start tenmon-ark-api 2>&1", { encoding: "utf8", timeout: 10000 });
  console.log("[sync] ✅ systemctl start executed");
} catch (err) {
  console.error(`[sync] ⚠️ systemctl start failed: ${err.message}`);
}

// Step 6: Wait for service to start
try { execSync("sleep 3"); } catch {}

// Step 7: Verify the service is running
try {
  const status = execSync("systemctl is-active tenmon-ark-api 2>/dev/null || echo 'inactive'", { encoding: "utf8" }).trim();
  console.log(`[sync] Service status: ${status}`);
  
  if (status !== "active") {
    // Check the journal for crash reasons
    const journal = execSync("journalctl -u tenmon-ark-api --no-pager -n 30 2>/dev/null || echo 'no journal'", { encoding: "utf8" }).trim();
    console.log(`[sync] Journal output:\n${journal}`);
  }
} catch (err) {
  console.error(`[sync] ⚠️ Status check failed: ${err.message}`);
}

// Step 8: Test if the server responds
try {
  const response = execSync("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/api/version 2>/dev/null || echo 'failed'", { encoding: "utf8" }).trim();
  console.log(`[sync] Version endpoint response: ${response}`);
  
  const portCheck = execSync("lsof -ti:3000 2>/dev/null || echo 'no process'", { encoding: "utf8" }).trim();
  console.log(`[sync] Process on port 3000: ${portCheck}`);
} catch (err) {
  console.error(`[sync] ⚠️ Response check failed: ${err.message}`);
}

console.log("[sync] ✅ Post-deploy sync complete");
