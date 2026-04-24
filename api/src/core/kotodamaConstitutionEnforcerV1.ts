/** MC-20 Phase A final: KOTODAMA_CONSTITUTION_V1 runtime watch — detect only, no auto-fix. */
import {
  GOJUREN_JUGYO_V1,
  GOJUREN_50_SOUNDS_V1,
  buildKotodama50MapV1,
  type Kotodama50MapV1Result,
} from "../mc/intelligence/kotodama50MapV1.js";
import { kotodamaBridgeHealth } from "./kotodamaBridgeRegistry.js";

export type ConstitutionViolation = {
  article: number;
  severity: "ERROR" | "WARN";
  title: string;
  detail: string;
  observed: string;
  expected: string;
};
export type ConstitutionEnforcerVerdict = "clean" | "warn" | "violation";
export type ConstitutionEnforcerReport = {
  timestamp: string;
  constitution_ref: "KOTODAMA_CONSTITUTION_V1";
  total_checks: number;
  violations: ConstitutionViolation[];
  violation_count_error: number;
  violation_count_warn: number;
  verdict: ConstitutionEnforcerVerdict;
};

const WITH: (keyof Kotodama50MapV1Result)[] = [
  "with_entry", "with_water_fire", "with_textual_grounding", "with_source_page", "with_shape_position", "with_modern_alias",
];

const E = (a: number, t: string, d: string, o: string, e: string): ConstitutionViolation => ({
  article: a, severity: "ERROR", title: t, detail: d, observed: o, expected: e,
});
const W = (a: number, t: string, d: string, o: string, e: string): ConstitutionViolation => ({
  article: a, severity: "WARN", title: t, detail: d, observed: o, expected: e,
});

export function enforceKotodamaConstitutionV1(): ConstitutionEnforcerReport {
  const violations: ConstitutionViolation[] = [];
  let total = 0;
  total++;
  try {
    const m = buildKotodama50MapV1();
    if (m.total_canonical !== 50) {
      violations.push(E(2, "分母 50 固定 違反", "第2条 total≠50", String(m.total_canonical), "50"));
    }
  } catch (err) {
    violations.push(E(2, "第2条チェック実行不可", String(err), "exception", "map 取得可能"));
  }
  total++;
  const slots = GOJUREN_50_SOUNDS_V1 as readonly { sound: string }[];
  const nCount = slots.filter((s) => s.sound === "ン").length;
  if (nCount !== 0) violations.push(E(3, "ン除外 違反", "第3条", `ン=${nCount}`, "0"));
  total++;
  const wi = slots.filter((s) => s.sound === "ヰ").length;
  const we = slots.filter((s) => s.sound === "ヱ").length;
  if (wi < 2 || we < 2) violations.push(E(4, "ヰ・ヱ保持 違反", "第4条", `ヰ=${wi} ヱ=${we}`, "各>=2"));
  total++;
  try {
    const m = buildKotodama50MapV1();
    const miss = WITH.filter((f) => typeof m[f] !== "number");
    if (miss.length) violations.push(E(8, "with_* 分離 違反", "第8条", `missing:${miss.join(",")}`, "6×number"));
  } catch (err) {
    violations.push(E(8, "第8条チェック実行不可", String(err), "exception", "with_* 取得可能"));
  }
  total++;
  try {
    const h = kotodamaBridgeHealth();
    if (!h.hasPrimaryBridge || !h.hasSeparationPolicy) {
      violations.push(W(6, "正典階層 警告", "第6条", `p=${h.hasPrimaryBridge} s=${h.hasSeparationPolicy}`, "p,s=true"));
    }
  } catch { /* ok */ }
  total++;
  const jug = GOJUREN_JUGYO_V1 as readonly { row: string; column_water_fire: string | null | undefined }[];
  const bad = jug.filter((r) => r.column_water_fire == null || r.column_water_fire === "");
  if (bad.length) violations.push(W(9, "欠損明示 警告", "第9条", bad.map((r) => r.row).join(","), "空→未確定"));
  const vErr = violations.filter((v) => v.severity === "ERROR").length;
  const vWarn = violations.filter((v) => v.severity === "WARN").length;
  const verdict: ConstitutionEnforcerVerdict = vErr > 0 ? "violation" : vWarn > 0 ? "warn" : "clean";
  return {
    timestamp: new Date().toISOString(),
    constitution_ref: "KOTODAMA_CONSTITUTION_V1",
    total_checks: total,
    violations,
    violation_count_error: vErr,
    violation_count_warn: vWarn,
    verdict,
  };
}

export function runKotodamaConstitutionEnforcerAtStartup(): void {
  try {
    const r = enforceKotodamaConstitutionV1();
    if (r.verdict === "clean") {
      console.log(`[KOTODAMA_ENFORCER_V1] clean: ${r.total_checks} checks passed (KOTODAMA_CONSTITUTION_V1)`);
      return;
    }
    console.log(`[KOTODAMA_ENFORCER_V1] ${r.verdict}: ${r.violation_count_error} errors, ${r.violation_count_warn} warns`);
    for (const v of r.violations) {
      const p = v.severity === "ERROR" ? "[KOTODAMA_ENFORCER_V1][ERROR]" : "[KOTODAMA_ENFORCER_V1][WARN]";
      console.log(`${p} Article ${v.article} ${v.title}: observed="${v.observed}" expected="${v.expected}"`);
    }
  } catch (err) {
    console.warn(`[KOTODAMA_ENFORCER_V1] startup check failed: ${err}`);
  }
}
