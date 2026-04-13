/**
 * Post-deploy sync v24 - SYNC + SCHEDULED RESTART
 * 
 * Root cause: deploy.yml's `systemctl restart` never executes (SSH timeout).
 * Previous sync scripts that restart the service get killed when SSH session ends.
 * 
 * Solution: Sync files, then schedule a restart via `at` command or a detached
 * background process that survives SSH session termination.
 */
import { execSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync, writeFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(__dirname, "..");

if (!apiDir.startsWith("/opt/tenmon-ark")) {
  console.log("[sync] Not on VPS, skipping");
  process.exit(0);
}

console.log("[sync] v24 pid=" + process.pid);

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 120000 }).trim();
  } catch (e) {
    return "[err]" + String(e.stderr || e.message || "").substring(0, 300);
  }
}

var BUILD = "/opt/tenmon-ark/api";
var REPO = "/opt/tenmon-ark-repo/api";

// 1. Data dir
run("mkdir -p /opt/tenmon-ark-data && chmod 777 /opt/tenmon-ark-data");

// 2. Sync .env
if (existsSync(REPO + "/.env") && !existsSync(BUILD + "/.env")) {
  run("cp " + REPO + "/.env " + BUILD + "/.env");
}
if (existsSync(BUILD + "/.env") && !existsSync(REPO + "/.env")) {
  run("cp " + BUILD + "/.env " + REPO + "/.env");
}
console.log("[sync] .env BUILD=" + existsSync(BUILD + "/.env") + " REPO=" + existsSync(REPO + "/.env"));

// 3. Sync dist and node_modules to REPO
if (existsSync(REPO)) {
  run("rsync -a --delete " + BUILD + "/dist/ " + REPO + "/dist/");
  run("rsync -a --delete " + BUILD + "/node_modules/ " + REPO + "/node_modules/");
  run("cp " + BUILD + "/package.json " + REPO + "/package.json 2>/dev/null || true");
  console.log("[sync] Synced BUILD -> REPO");
}

// 4. Verify
console.log("[sync] REPO index.js=" + existsSync(REPO + "/dist/index.js"));
console.log("[sync] REPO sukuyou=" + existsSync(REPO + "/dist/sukuyou/sukuyouEngine.js"));

// 5. Write correct systemd service
var envFile = "";
if (existsSync(REPO + "/.env")) envFile = REPO + "/.env";
else if (existsSync(BUILD + "/.env")) envFile = BUILD + "/.env";

var svc = "[Unit]\nDescription=TENMON-ARK API Server\nAfter=network.target\n\n[Service]\nType=simple\nUser=root\nWorkingDirectory=" + REPO + "\n" + (envFile ? "EnvironmentFile=" + envFile + "\n" : "") + "Environment=NODE_ENV=production\nEnvironment=TENMON_DATA_DIR=/opt/tenmon-ark-data\nExecStart=/usr/bin/node " + REPO + "/dist/index.js\nRestart=always\nRestartSec=5\n\n[Install]\nWantedBy=multi-user.target\n";

writeFileSync("/etc/systemd/system/tenmon-ark-api.service", svc);
run("systemctl daemon-reload");
console.log("[sync] Wrote systemd service");

// 6. Create a restart script that will run AFTER SSH session ends
// Use a systemd oneshot service to schedule the restart
var restartScript = "#!/bin/bash\n" +
  "sleep 5\n" +
  "systemctl restart tenmon-ark-api\n" +
  "sleep 8\n" +
  "curl -s http://127.0.0.1:3000/api/version > /tmp/tenmon-ark-restart-result.txt 2>&1\n" +
  "echo \"restart done at $(date)\" >> /tmp/tenmon-ark-restart-result.txt\n";

writeFileSync("/tmp/tenmon-ark-deferred-restart.sh", restartScript, { mode: 0o755 });

// Use systemd-run to create a transient service that survives SSH session end
var result = run("systemd-run --no-block --unit=tenmon-ark-deferred-restart /bin/bash /tmp/tenmon-ark-deferred-restart.sh");
console.log("[sync] Deferred restart scheduled: " + result);

// 7. Also try the `at` command as backup
run("echo '/bin/bash /tmp/tenmon-ark-deferred-restart.sh' | at now + 1 minute 2>/dev/null || true");

console.log("[sync] v24 done - deferred restart will run after SSH session ends");
