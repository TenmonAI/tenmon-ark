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
