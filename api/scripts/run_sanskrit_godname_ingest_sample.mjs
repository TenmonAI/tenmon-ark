import fs from "node:fs";
import { ingestSanskritGodnameBatchV1 } from "../dist/deepread/sanskritGodnameIngestV1.js";

const p = process.argv[2];
if (!p) {
  console.error("usage: node scripts/run_sanskrit_godname_ingest_sample.mjs <json-path>");
  process.exit(2);
}
const raw = JSON.parse(fs.readFileSync(p, "utf8"));
const r = ingestSanskritGodnameBatchV1(raw);
console.log(JSON.stringify(r, null, 2));
process.exit(r.ok ? 0 : 1);
