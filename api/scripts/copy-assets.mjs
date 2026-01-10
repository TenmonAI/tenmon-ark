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

// Phase 1-A: ビルド時刻を version.ts に注入（dist/version.js を生成）
try {
  const { execSync } = await import("node:child_process");
  const versionDistPath = path.join(root, "dist", "version.js");
  const builtAt = new Date().toISOString();
  
  // Git SHA を取得（可能なら）
  let gitSha = "unknown";
  try {
    gitSha = execSync("git rev-parse --short HEAD", { encoding: "utf-8", cwd: root }).trim();
  } catch {
    // Git が無い場合は unknown のまま
  }
  
  // version.js にビルド情報を書き込む
  const versionContent = `// Phase 1-A: ビルド時に注入される情報
export const TENMON_ARK_VERSION = "0.9.0";
export const TENMON_ARK_BUILT_AT = "${builtAt}";
export const TENMON_ARK_GIT_SHA = "${gitSha}";
`;
  
  fs.writeFileSync(versionDistPath, versionContent, "utf-8");
  console.log(`[copy-assets] generated ${versionDistPath} with builtAt=${builtAt}, gitSha=${gitSha}`);
} catch (e) {
  console.warn(`[copy-assets] Failed to generate version.js:`, e);
}
