import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(process.cwd());
const srcDir = path.join(root, "src", "db");
const dstDir = path.join(root, "dist", "db");

fs.mkdirSync(dstDir, { recursive: true });

const files = fs.readdirSync(srcDir).filter((f) => f.endsWith(".sql"));
for (const f of files) {
  const src = path.join(srcDir, f);
  const dst = path.join(dstDir, f);
  fs.copyFileSync(src, dst);
  console.log(`[copy-assets] copied ${src} -> ${dst}`);
}

// パターンファイルをコピー（src/kanagi/patterns/ -> dist/kanagi/patterns/）
const patternsSrcDir = path.join(root, "src", "kanagi", "patterns");
const patternsDstDir = path.join(root, "dist", "kanagi", "patterns");
if (fs.existsSync(patternsSrcDir)) {
  fs.mkdirSync(patternsDstDir, { recursive: true });
  const patternFiles = fs.readdirSync(patternsSrcDir).filter((f) => f.endsWith(".json"));
  for (const f of patternFiles) {
    const src = path.join(patternsSrcDir, f);
    const dst = path.join(patternsDstDir, f);
    fs.copyFileSync(src, dst);
    console.log(`[copy-assets] copied ${src} -> ${dst}`);
  }
}

// --- generate dist/version.js (authoritative build metadata) ---
try {
  const { execSync } = await import("node:child_process");
  
  const builtAt = new Date().toISOString();
  let gitSha = null;
  try {
    gitSha = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {}
  
  const outPath = path.join(root, "dist", "version.js");
  fs.writeFileSync(
    outPath,
    `export const TENMON_ARK_VERSION = "0.9.0";\n` +
      `export const TENMON_ARK_BUILT_AT = ${JSON.stringify(builtAt)};\n` +
      `export const TENMON_ARK_GIT_SHA = ${JSON.stringify(gitSha)};\n`,
    "utf8"
  );
  console.log("[copy-assets] generated dist/version.js", { builtAt, gitSha });
} catch (e) {
  console.warn(`[copy-assets] Failed to generate version.js:`, e);
}
