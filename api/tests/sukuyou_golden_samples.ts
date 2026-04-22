/**
 * 宿曜 golden samples（MC-P5 / collect_sukuyou.sh と整合）
 * 実行: npm run test:sukuyou
 */
import { calculateHonmeiShuku } from "../src/sukuyou/sukuyouEngine.js";

type Sample = { label: string; birth: Date; expected: string };

const GOLDEN: Sample[] = [
  {
    label: "MC golden (JST civil midnight)",
    birth: new Date("1990-09-26T00:00:00+09:00"),
    expected: "斗",
  },
  {
    label: "ISO date-only (UTC midnight)",
    birth: new Date("1990-09-26"),
    expected: "斗",
  },
  { label: "1990-09-25 JST", birth: new Date("1990-09-25T00:00:00+09:00"), expected: "箕" },
  { label: "1990-09-27 JST", birth: new Date("1990-09-27T00:00:00+09:00"), expected: "女" },
];

let fail = 0;
for (const s of GOLDEN) {
  const actual = calculateHonmeiShuku(s.birth);
  const ok = actual === s.expected;
  if (!ok) {
    console.error(`FAIL ${s.label}: expected ${s.expected}, got ${actual}`);
    fail++;
  } else {
    console.log(`OK  ${s.label}: ${actual}`);
  }
}

if (fail > 0) {
  process.exit(1);
}
console.log(`\nsukuyou golden: ${GOLDEN.length - fail}/${GOLDEN.length} passed`);
