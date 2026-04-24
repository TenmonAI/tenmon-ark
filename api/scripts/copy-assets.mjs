import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const srcDir = path.join(root, "src", "db");
const dstDir = path.join(root, "dist", "db");

fs.mkdirSync(dstDir, { recursive: true });

const preferred = [
  "schema.sql",
  "kokuzo_schema.sql",
  "training_schema.sql",
  "pwa_schema.sql",
  "writing_schema.sql",
  "persona_state.sql",
  "approval_schema.sql",
  "audit_schema.sql",
];
const allSql = fs.readdirSync(srcDir).filter((f) => f.endsWith(".sql"));
const files = Array.from(new Set([...preferred.filter((f) => allSql.includes(f)), ...allSql]));
for (const f of files) {
  const src = path.join(srcDir, f);
  const dst = path.join(dstDir, f);
  fs.copyFileSync(src, dst);
  console.log(`[copy-assets] copied ${src} -> ${dst}`);
}

// CARD-MC-24: nginx が api/dist/static/mc-landing を参照する構成向け（index.html の intelligence-panel.js 等）
const repoRoot = path.join(root, "..");
const mcLandingSrc = path.join(repoRoot, "static", "mc-landing");
const mcLandingDst = path.join(root, "dist", "static", "mc-landing");
if (fs.existsSync(mcLandingSrc)) {
  fs.mkdirSync(mcLandingDst, { recursive: true });
  for (const name of fs.readdirSync(mcLandingSrc)) {
    const src = path.join(mcLandingSrc, name);
    if (!fs.statSync(src).isFile()) continue;
    const dst = path.join(mcLandingDst, name);
    fs.copyFileSync(src, dst);
    console.log(`[copy-assets] copied ${src} -> ${dst}`);
  }
} else {
  console.warn(`[copy-assets] skip mc-landing: not found ${mcLandingSrc}`);
}
