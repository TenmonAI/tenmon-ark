/**
 * Post-deploy sync script (v6 - definitive fix)
 * 
 * The root cause: systemd service on VPS was manually changed to run from
 * /opt/tenmon-ark-repo/api, but deploy builds in /opt/tenmon-ark/api.
 * 
 * Fix: Update the systemd service file to point to /opt/tenmon-ark/api
 * (where the deploy actually builds), then reload systemd daemon.
 */
import { execSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { writeFileSync, readFileSync, existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(__dirname, "..");

if (!apiDir.startsWith("/opt/tenmon-ark")) {
  console.log("[sync] Not on VPS, skipping");
  process.exit(0);
}

console.log(`[sync] Running on VPS, apiDir=${apiDir}`);

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 30000 }).trim();
  } catch (e) {
    return `[error: ${(e.stderr || e.stdout || e.message || "").substring(0, 300)}]`;
  }
}

const SERVICE_PATH = "/etc/systemd/system/tenmon-ark-api.service";
const BUILD_DIR = "/opt/tenmon-ark/api";

// Step 1: Check if systemd service points to the correct directory
if (existsSync(SERVICE_PATH)) {
  const currentService = readFileSync(SERVICE_PATH, "utf8");
  console.log("[sync] Current WorkingDirectory:", currentService.match(/WorkingDirectory=(.+)/)?.[1] || "unknown");
  
  if (!currentService.includes(`WorkingDirectory=${BUILD_DIR}`)) {
    console.log(`[sync] Fixing systemd service to use ${BUILD_DIR}...`);
    
    // Update WorkingDirectory
    let newService = currentService.replace(
      /WorkingDirectory=.+/,
      `WorkingDirectory=${BUILD_DIR}`
    );
    
    // Also update EnvironmentFile if it points to wrong dir
    newService = newService.replace(
      /EnvironmentFile=\/opt\/tenmon-ark-repo\/api\/.env/,
      `EnvironmentFile=${BUILD_DIR}/.env`
    );
    
    // Ensure .env exists in build dir (copy from repo dir if needed)
    if (!existsSync(`${BUILD_DIR}/.env`)) {
      const envSources = [
        "/opt/tenmon-ark-repo/api/.env",
        "/opt/tenmon-ark/api/.env",
      ];
      for (const src of envSources) {
        if (existsSync(src)) {
          run(`cp ${src} ${BUILD_DIR}/.env`);
          console.log(`[sync] Copied .env from ${src}`);
          break;
        }
      }
    }
    
    writeFileSync(SERVICE_PATH, newService);
    console.log("[sync] Updated systemd service file");
    
    // Reload systemd daemon to pick up changes
    run("systemctl daemon-reload");
    console.log("[sync] Reloaded systemd daemon");
  } else {
    console.log("[sync] SystemD service already points to correct directory");
  }
} else {
  console.log("[sync] Service file not found, creating...");
  const serviceContent = `[Unit]
Description=TENMON-ARK API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${BUILD_DIR}
Environment=NODE_ENV=production
EnvironmentFile=${BUILD_DIR}/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
`;
  writeFileSync(SERVICE_PATH, serviceContent);
  run("systemctl daemon-reload");
  run("systemctl enable tenmon-ark-api");
  console.log("[sync] Created and enabled systemd service");
}

// Step 2: Stop old server
console.log("[sync] Stopping old server...");
run("systemctl stop tenmon-ark-api 2>/dev/null || true");

// Kill any lingering processes on port 3000
const pids = run("lsof -ti:3000 2>/dev/null || true");
if (pids && !pids.startsWith("[error")) {
  const myPid = process.pid;
  for (const pid of pids.split("\n").filter(p => p && p !== String(myPid))) {
    run(`kill -9 ${pid} 2>/dev/null || true`);
  }
}

// Step 3: Verify dist exists
const hasVersion = existsSync(`${BUILD_DIR}/dist/index.js`);
const hasSukuyou = existsSync(`${BUILD_DIR}/dist/sukuyou/sukuyouEngine.js`);
const hasLookup = existsSync(`${BUILD_DIR}/dist/sukuyou/sukuyou_lookup_table.json`);
console.log(`[sync] Verify: index.js=${hasVersion}, sukuyou=${hasSukuyou}, lookup=${hasLookup}`);

console.log("[sync] ✅ Ready for systemctl restart");
