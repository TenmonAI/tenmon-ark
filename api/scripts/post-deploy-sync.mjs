/**
 * Post-deploy sync v25 - CRONTAB SCHEDULED RESTART
 * 
 * Root cause: An old Node.js process (NOT managed by systemd) occupies port 3000.
 * systemctl restart fails silently because port is occupied.
 * All in-session restart attempts get killed when SSH session ends.
 * 
 * Solution: 
 * 1. Sync files (dist + node_modules) from BUILD to REPO dir
 * 2. Write a restart shell script to /tmp
 * 3. Schedule it via crontab to run 1 minute from now
 * 4. The cron job runs independently of SSH session
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

console.log("[sync] v25 start");

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 120000 }).trim();
  } catch (e) {
    return "[err]" + String(e.stderr || e.message || "").substring(0, 300);
  }
}

const BUILD = "/opt/tenmon-ark/api";
const REPO = "/opt/tenmon-ark-repo/api";

// 1. Data dir
run("mkdir -p /opt/tenmon-ark-data && chmod 777 /opt/tenmon-ark-data");

// 2. Sync .env between dirs
if (existsSync(REPO + "/.env") && !existsSync(BUILD + "/.env")) {
  run("cp " + REPO + "/.env " + BUILD + "/.env");
}
if (existsSync(BUILD + "/.env") && !existsSync(REPO + "/.env")) {
  run("cp " + BUILD + "/.env " + REPO + "/.env");
}

// 3. Sync dist and node_modules from BUILD to REPO
if (existsSync(REPO)) {
  run("rsync -a --delete " + BUILD + "/dist/ " + REPO + "/dist/");
  run("rsync -a --delete " + BUILD + "/node_modules/ " + REPO + "/node_modules/");
  run("cp " + BUILD + "/package.json " + REPO + "/package.json 2>/dev/null || true");
  console.log("[sync] Files synced BUILD -> REPO");
}

// 4. Verify critical files
console.log("[sync] REPO index.js=" + existsSync(REPO + "/dist/index.js"));
console.log("[sync] REPO sukuyou=" + existsSync(REPO + "/dist/sukuyou/sukuyouEngine.js"));
console.log("[sync] REPO consciousness=" + existsSync(REPO + "/dist/core/consciousnessOS.js"));

// 5. Write correct systemd service file
let envLine = "";
if (existsSync(REPO + "/.env")) envLine = "EnvironmentFile=" + REPO + "/.env\n";
else if (existsSync(BUILD + "/.env")) envLine = "EnvironmentFile=" + BUILD + "/.env\n";

const svcContent = `[Unit]
Description=TENMON-ARK API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${REPO}
${envLine}Environment=NODE_ENV=production
Environment=TENMON_DATA_DIR=/opt/tenmon-ark-data
ExecStart=/usr/bin/node ${REPO}/dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
`;

writeFileSync("/etc/systemd/system/tenmon-ark-api.service", svcContent);
run("systemctl daemon-reload");
console.log("[sync] systemd service updated");

// 6. Write restart script
const restartScript = `#!/bin/bash
# TENMON-ARK restart script - kills old process and starts fresh
LOG=/tmp/tenmon-ark-restart.log
echo "=== Restart at $(date) ===" >> $LOG

# Kill ALL node processes on port 3000
PIDS=$(lsof -ti:3000 2>/dev/null)
if [ -n "$PIDS" ]; then
  echo "Killing PIDs on port 3000: $PIDS" >> $LOG
  kill -9 $PIDS 2>/dev/null
  sleep 2
fi

# Double-check port is free
PIDS2=$(lsof -ti:3000 2>/dev/null)
if [ -n "$PIDS2" ]; then
  echo "Port still occupied! Killing again: $PIDS2" >> $LOG
  kill -9 $PIDS2 2>/dev/null
  sleep 2
fi

# Stop the service cleanly
systemctl stop tenmon-ark-api 2>/dev/null
sleep 1

# Start the service
systemctl start tenmon-ark-api
sleep 8

# Verify
STATUS=$(systemctl is-active tenmon-ark-api)
echo "Service status: $STATUS" >> $LOG

VERSION=$(curl -s -m 5 http://127.0.0.1:3000/api/version 2>/dev/null)
echo "Version response: $VERSION" >> $LOG

# Clean up: remove this cron job
crontab -l 2>/dev/null | grep -v "tenmon-ark-restart" | crontab -
echo "Cron cleanup done" >> $LOG
echo "=== Restart complete ===" >> $LOG
`;

writeFileSync("/tmp/tenmon-ark-restart.sh", restartScript, { mode: 0o755 });
console.log("[sync] Restart script written");

// 7. Schedule restart via crontab (1 minute from now)
const now = new Date();
const runMinute = (now.getUTCMinutes() + 2) % 60;
const runHour = now.getUTCMinutes() >= 58 ? (now.getUTCHours() + 1) % 24 : now.getUTCHours();
const cronLine = `${runMinute} ${runHour} * * * /bin/bash /tmp/tenmon-ark-restart.sh # tenmon-ark-restart`;

// Get existing crontab, remove old tenmon-ark-restart entries, add new one
const existingCron = run("crontab -l 2>/dev/null || true");
const filteredCron = existingCron.split("\n").filter(l => !l.includes("tenmon-ark-restart")).join("\n");
const newCron = (filteredCron.trim() + "\n" + cronLine + "\n").trim() + "\n";
writeFileSync("/tmp/tenmon-ark-crontab.txt", newCron);
const cronResult = run("crontab /tmp/tenmon-ark-crontab.txt");
console.log("[sync] Cron scheduled for " + runHour + ":" + String(runMinute).padStart(2, "0") + " UTC: " + cronResult);

// 8. Also try immediate background restart (may survive SSH, may not)
run("nohup /bin/bash /tmp/tenmon-ark-restart.sh > /tmp/tenmon-ark-nohup.log 2>&1 &");

console.log("[sync] v25 done");
