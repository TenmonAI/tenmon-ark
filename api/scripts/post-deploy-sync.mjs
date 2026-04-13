/**
 * Post-deploy sync script (v17 - AT JOB APPROACH)
 * 
 * Root cause: deploy.yml's `systemctl restart` runs AFTER this script
 * but restarts the service from the WRONG directory (old code).
 * 
 * Solution: 
 * 1. Sync dist to ALL known directories
 * 2. Write a restart script that runs 30s later via `at`
 * 3. The restart script kills old processes and starts from BUILD dir
 */
import { execSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { existsSync, writeFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(__dirname, "..");

if (!apiDir.startsWith("/opt/tenmon-ark")) {
  console.log("[sync] Not on VPS, skipping");
  process.exit(0);
}

console.log("[sync] v17 apiDir=" + apiDir);

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 30000 }).trim();
  } catch (e) {
    return "[err: " + String(e.stderr || e.message || "").substring(0, 200) + "]";
  }
}

const BUILD_DIR = "/opt/tenmon-ark/api";
const REPO_DIR = "/opt/tenmon-ark-repo/api";
const DATA_DIR = "/opt/tenmon-ark-data";

// ── 1. Ensure data dir ──
run("sudo mkdir -p " + DATA_DIR + " && sudo chmod 777 " + DATA_DIR);

// ── 2. Sync dist + node_modules to ALL known dirs ──
const dirs = [BUILD_DIR, REPO_DIR];
for (const d of dirs) {
  if (existsSync(d) && d !== apiDir) {
    run("rsync -a --delete " + apiDir + "/dist/ " + d + "/dist/ 2>/dev/null || true");
    run("rsync -a --delete " + apiDir + "/node_modules/ " + d + "/node_modules/ 2>/dev/null || true");
    // Also copy package.json for module resolution
    run("cp " + apiDir + "/package.json " + d + "/package.json 2>/dev/null || true");
    console.log("[sync] Synced to " + d);
  }
}

// ── 3. Write a delayed restart script ──
const restartScript = `#!/bin/bash
# Auto-restart script created by post-deploy-sync v17
# This runs 30s after deploy to ensure the latest code is running

LOG="/tmp/tenmon-ark-restart.log"
echo "$(date) - Restart script starting" >> $LOG

# Check if correct version is running
VER=$(curl -s -m 5 http://127.0.0.1:3000/api/version 2>/dev/null || echo "FAIL")
echo "$(date) - Current version: $VER" >> $LOG

if echo "$VER" | grep -q "2.2.0-sukuyou"; then
  echo "$(date) - Correct version already running, exiting" >> $LOG
  exit 0
fi

echo "$(date) - Wrong version or not running, restarting..." >> $LOG

# Stop systemd service
systemctl stop tenmon-ark-api 2>/dev/null || true
sleep 2

# Kill any remaining processes on port 3000
PIDS=$(lsof -ti:3000 2>/dev/null || true)
if [ -n "$PIDS" ]; then
  echo "$(date) - Killing PIDs: $PIDS" >> $LOG
  echo "$PIDS" | xargs kill -9 2>/dev/null || true
  sleep 2
fi

# Write correct systemd service pointing to BUILD dir
cat > /etc/systemd/system/tenmon-ark-api.service << 'SVCEOF'
[Unit]
Description=TENMON-ARK API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${BUILD_DIR}
Environment=NODE_ENV=production
Environment=TENMON_DATA_DIR=${DATA_DIR}
ExecStart=/usr/bin/node ${BUILD_DIR}/dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVCEOF

# Reload and start
systemctl daemon-reload
systemctl enable tenmon-ark-api
systemctl start tenmon-ark-api
sleep 5

# Verify
VER2=$(curl -s -m 5 http://127.0.0.1:3000/api/version 2>/dev/null || echo "FAIL")
echo "$(date) - After restart version: $VER2" >> $LOG

# If still not working, try starting directly
if ! echo "$VER2" | grep -q "2.2.0-sukuyou"; then
  echo "$(date) - systemd failed, trying direct start" >> $LOG
  systemctl stop tenmon-ark-api 2>/dev/null || true
  PIDS2=$(lsof -ti:3000 2>/dev/null || true)
  [ -n "$PIDS2" ] && echo "$PIDS2" | xargs kill -9 2>/dev/null || true
  sleep 2
  
  cd ${BUILD_DIR}
  NODE_ENV=production TENMON_DATA_DIR=${DATA_DIR} nohup node dist/index.js > /tmp/tenmon-ark.log 2>&1 &
  sleep 5
  
  VER3=$(curl -s -m 5 http://127.0.0.1:3000/api/version 2>/dev/null || echo "FAIL")
  echo "$(date) - After nohup version: $VER3" >> $LOG
fi

echo "$(date) - Restart script complete" >> $LOG
`;

const scriptPath = "/tmp/tenmon-ark-restart.sh";
try {
  writeFileSync(scriptPath, restartScript.replace(/\$\{BUILD_DIR\}/g, BUILD_DIR).replace(/\$\{DATA_DIR\}/g, DATA_DIR));
  run("chmod +x " + scriptPath);
  
  // Schedule to run in 30 seconds using at
  const atResult = run("echo 'bash " + scriptPath + "' | at now + 1 minute 2>&1 || true");
  console.log("[sync] Scheduled restart: " + atResult);
  
  // Also try a simpler approach: background process
  run("(sleep 30 && bash " + scriptPath + ") &");
  console.log("[sync] Also started background restart in 30s");
} catch (e) {
  console.error("[sync] Failed to schedule restart:", e.message);
  
  // Fallback: just try to write the systemd service directly
  try {
    const svc = [
      "[Unit]",
      "Description=TENMON-ARK API Server",
      "After=network.target",
      "",
      "[Service]",
      "Type=simple",
      "User=root",
      "WorkingDirectory=" + BUILD_DIR,
      "Environment=NODE_ENV=production",
      "Environment=TENMON_DATA_DIR=" + DATA_DIR,
      "ExecStart=/usr/bin/node " + BUILD_DIR + "/dist/index.js",
      "Restart=always",
      "RestartSec=5",
      "",
      "[Install]",
      "WantedBy=multi-user.target",
      ""
    ].join("\n");
    writeFileSync("/etc/systemd/system/tenmon-ark-api.service", svc);
    run("sudo systemctl daemon-reload");
    console.log("[sync] Wrote systemd service as fallback");
  } catch (e2) {
    console.error("[sync] Fallback also failed:", e2.message);
  }
}

// ── 4. Verify current state ──
const ver = run("curl -s -m 5 http://127.0.0.1:3000/api/version 2>&1");
console.log("[sync] Current version: " + ver.substring(0, 200));

console.log("[sync] v17 complete - restart scheduled in 30s");
