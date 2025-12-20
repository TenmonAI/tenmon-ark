import type { ToolPlan } from "../tools/toolTypes.js";
import type { PolicyDecision } from "./safetyTypes.js";
import { classifyRisk } from "./riskClassifier.js";

function includesAny(text: string, needles: string[]): boolean {
  return needles.some((n) => text.includes(n));
}

function denyIfSensitive(intent: string): string[] {
  const v: string[] = [];

  // 自傷・他害の助長
  if (includesAny(intent, ["死にたい", "自殺", "殺したい", "suicide", "kill"])) v.push("deny: self-harm/violence assistance");

  // 違法行為の実行支援（例）
  if (includesAny(intent.toLowerCase(), ["how to hack", "ddos", "malware"]) || includesAny(intent, ["不正アクセス", "ハッキング"]))
    v.push("deny: illegal activity assistance");

  // 個人情報の無断収集
  if (includesAny(intent, ["個人情報", "住所一覧", "電話番号", "マイナンバー", "credit card"]))
    v.push("deny: unauthorized personal data collection");

  // 金銭支払い/購入（Phase8 deny固定）
  if (includesAny(intent, ["購入", "買って", "支払", "課金", "purchase", "buy", "pay"])) v.push("deny: payment/purchase");

  // 破壊的削除（Phase8 deny固定）
  if (includesAny(intent.toLowerCase(), ["rm -rf", "delete all", "wipe"]) || includesAny(intent, ["全削除", "消して"]))
    v.push("deny: destructive deletion");

  return v;
}

export function evaluatePolicy(plan: ToolPlan): PolicyDecision {
  const risk = classifyRisk(plan);

  // Policy denies override approvals
  const violations = denyIfSensitive(plan.intent);
  if (violations.length > 0) {
    return { ok: false, risk: "high", violations };
  }

  // Phase8: we can allow low/medium; high should be treated as deny by default
  if (risk === "high") {
    return { ok: false, risk, violations: ["deny: high risk plan is not executable in phase8"] };
  }

  return { ok: true, risk, violations: [] };
}


