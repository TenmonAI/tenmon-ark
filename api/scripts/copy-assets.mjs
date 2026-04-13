import fs from "node:fs";
import path from "node:path";

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

// 2. Copy sukuyou lookup table JSON
const sukuyouSrc = path.join(root, "src", "sukuyou");
const sukuyouDst = path.join(root, "dist", "sukuyou");
fs.mkdirSync(sukuyouDst, { recursive: true });
const jsonFiles = fs.readdirSync(sukuyouSrc).filter((f) => f.endsWith(".json"));
for (const jf of jsonFiles) {
  const src2 = path.join(sukuyouSrc, jf);
  const dst2 = path.join(sukuyouDst, jf);
  fs.copyFileSync(src2, dst2);
  console.log(`[copy-assets] copied ${src2} -> ${dst2}`);
}

// 3. Copy kanagi patterns JSON (soundMeanings.json, amatsuKanagi50Patterns.json)
const kanagiSrc = path.join(root, "src", "kanagi", "patterns");
const kanagiDst = path.join(root, "dist", "kanagi", "patterns");
if (fs.existsSync(kanagiSrc)) {
  fs.mkdirSync(kanagiDst, { recursive: true });
  const kFiles = fs.readdirSync(kanagiSrc).filter((f) => f.endsWith(".json"));
  for (const kf of kFiles) {
    const src3 = path.join(kanagiSrc, kf);
    const dst3 = path.join(kanagiDst, kf);
    fs.copyFileSync(src3, dst3);
    console.log(`[copy-assets] copied ${src3} -> ${dst3}`);
  }
}
