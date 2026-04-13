/**
 * Post-deploy sync script (v20 - PROPER SYSTEMD)
 * 
 * Write a proper systemd service pointing to BUILD dir.
 * deploy.yml's systemctl restart will then start the correct code.
 */
import { execSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { existsSync, writeFileSync, readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(__dirname, "..");

if (!apiDir.startsWith("/opt/tenmon-ark")) {
  console.log("[sync] Not on VPS, skipping");
  process.exit(0);
}

console.log("[sync] v20 apiDir=" + apiDir);

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 30000 }).trim();
  } catch (e) {
    return "[err]" + String(e.stderr || e.message || "").substring(0, 200);
  }
}

const BUILD_DIR = "/opt/tenmon-ark/api";
const REPO_DIR = "/opt/tenmon-ark-repo/api";
const DATA_DIR = "/opt/tenmon-ark-data";

// 1. Ensure data dir
run("sudo mkdir -p " + DATA_DIR + " && sudo chmod 777 " + DATA_DIR);

// 2. Sync dist to REPO dir
if (existsSync(REPO_DIR) && REPO_DIR !== apiDir) {
  run("rsync -a --delete " + apiDir + "/dist/ " + REPO_DIR + "/dist/");
  run("rsync -a --delete " + apiDir + "/node_modules/ " + REPO_DIR + "/node_modules/");
  console.log("[sync] Synced to REPO dir");
}

// 3. Find .env
let envFilePath = "";
for (const d of [BUILD_DIR, REPO_DIR, "/opt/tenmon-ark", "/root"]) {
  if (existsSync(d + "/.env")) { envFilePath = d + "/.env"; break; }
}
console.log("[sync] envFile=" + (envFilePath || "NONE"));

// 4. Write systemd service -> BUILD dir
const envLine = envFilePath ? "EnvironmentFile=" + envFilePath + "\n" : "";
const svc = "[Unit]\nDescription=TENMON-ARK API Server\nAfter=network.target\n\n[Service]\nType=simple\nUser=root\nWorkingDirectory=" + BUILD_DIR + "\n" + envLine + "Environment=NODE_ENV=production\nEnvironment=TENMON_DATA_DIR=" + DATA_DIR + "\nExecStart=/usr/bin/node " + BUILD_DIR + "/dist/index.js\nRestart=always\nRestartSec=5\nStandardOutput=journal\nStandardError=journal\n\n[Install]\nWantedBy=multi-user.target\n";

try {
  writeFileSync("/etc/systemd/system/tenmon-ark-api.service", svc);
  run("sudo systemctl daemon-reload");
  run("sudo systemctl enable tenmon-ark-api 2>/dev/null || true");
  console.log("[sync] Wrote systemd service -> " + BUILD_DIR);
  
  const written = readFileSync("/etc/systemd/system/tenmon-ark-api.service", "utf8");
  console.log("[sync] Verify: WorkDir=" + written.includes("WorkingDirectory=" + BUILD_DIR));
  console.log("[sync] Verify: ExecStart=" + written.includes(BUILD_DIR + "/dist/index.js"));
} catch (e) {
  console.error("[sync] FAILED:", e.message);
}

// 5. Verify dist
const distIndex = BUILD_DIR + "/dist/index.js";
if (existsSync(distIndex)) {
  const c = readFileSync(distIndex, "utf8");
  console.log("[sync] dist: ver=" + c.includes("2.2.0") + " suk=" + c.includes("sukuyou") + " sz=" + c.length);
} else {
  console.error("[sync] dist/index.js NOT FOUND");
}

console.log("[sync] v20 complete");
