/**
 * MAINLINE_SUPREME_COMPLETION_AUDIT_V1 / MAINLINE_SUPREME_REAUDIT_V1
 * — 読み取り専用: 束スクリプト出力の提示と ledger への観測追記（local-test のみ）
 */
import type { Request, Response } from "express";
import * as fs from "node:fs";
import * as path from "node:path";
import { appendEvolutionLedgerEventV1 } from "../core/evolutionLedgerV1.js";

const SCRIPT_REF = "api/scripts/mainline_supreme_completion_audit_v1.sh";
const REAUDIT_REF = "api/scripts/mainline_supreme_reaudit_v1.sh";

function resolveAuditRoot(raw: string): string | null {
  const env = process.env.TENMON_FORENSIC_ROOT;
  if (raw) {
    const p = path.resolve(raw);
    if (env && path.resolve(env) === p) return p;
    if (p.startsWith("/tmp/")) return p;
    return null;
  }
  if (env) return path.resolve(env);
  return null;
}

/** GET — MAINLINE_SUPREME_REAUDIT_V1 マニフェストのみ */
export function handleMainlineSupremeReauditInfoV1(_req: Request, res: Response): void {
  res.json({
    ok: true,
    v: "MAINLINE_SUPREME_REAUDIT_V1",
    script: REAUDIT_REF,
    env: { TENMON_SUPREME_AUDIT_BASELINE: "prior OUT_DIR (required)", BASE: "optional" },
    note: "baseline と比較し axis_delta_vs_baseline を supreme_audit_report に付与",
  });
}

/** GET — 束の説明 + 任意で supreme_audit_report.json を返す */
export function handleMainlineSupremeCompletionAuditV1(req: Request, res: Response): void {
  const local = String(req.headers["x-tenmon-local-test"] ?? "") === "1";
  const root = resolveAuditRoot(String(req.query.forensicRoot ?? ""));

  if (!root || !local) {
    res.json({
      ok: true,
      v: "MAINLINE_SUPREME_COMPLETION_AUDIT_V1",
      mode: "manifest_only",
      scripts: { supreme: SCRIPT_REF, reaudit: REAUDIT_REF },
      probes_n: 18,
      axes: [
        "原理深度",
        "比較統合力",
        "sourcePack可視性",
        "will自然表面化",
        "law人間可読化",
        "longform密度",
        "ask-overuse低減",
        "next-step自然さ",
        "beauty意味由来性",
        "自己学習反映兆候",
      ],
      micro_cards: [
        "MAINLINE_SUPREME_COMPLETION_AUDIT_V1",
        "MAINLINE_REAL_CONVERSATION_DEPTH_AUDIT_V1",
        "MAINLINE_REAL_LONGFORM_QUALITY_AUDIT_V1",
        "MAINLINE_ASK_OVERUSE_KILL_V1",
        "MAINLINE_SURFACE_MEANING_DENSITY_REPAIR_V1",
        "MAINLINE_WILL_LAW_SOURCE_VISIBLE_REPAIR_V1",
        "MAINLINE_LONGFORM_TENMON_ASCENT_V1",
        "MAINLINE_BEAUTY_MEANING_FUSION_V1",
        "MAINLINE_RESPONSEPLAN_BIND_RECHECK_V1",
        "MAINLINE_SUPREME_REAUDIT_V1",
      ],
      usage: {
        run: `bash ${SCRIPT_REF} /tmp/supreme_audit_run`,
        reaudit: `TENMON_SUPREME_AUDIT_BASELINE=/tmp/prior bash ${REAUDIT_REF} /tmp/supreme_reaudit_run`,
        read_api: "GET with x-tenmon-local-test:1&forensicRoot=/tmp/...",
      },
      high_risk_manual_review: [
        "chat.ts 主幹思想",
        "will/meaning/beauty/worldview 中枢",
        "DB schema",
        "external source 本番昇格",
      ],
    });
    return;
  }

  const reportPath = path.join(root, "supreme_audit_report.json");
  if (!fs.existsSync(reportPath)) {
    res.status(404).json({ ok: false, error: "supreme_audit_report.json not found", root });
    return;
  }
  try {
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8")) as Record<string, unknown>;
    res.json({
      ok: true,
      v: String(report.v ?? "MAINLINE_SUPREME_COMPLETION_AUDIT_V1"),
      forensicRoot: root,
      report,
      evidence_bundle: fs.existsSync(path.join(root, "evidence_bundle.txt"))
        ? fs.readFileSync(path.join(root, "evidence_bundle.txt"), "utf8")
        : null,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
}

/** POST — supreme 結果を evolution ledger に観測として残す（自動昇格なし） */
export function handleMainlineSupremeCompletionAuditLedgerV1(req: Request, res: Response): void {
  const local = String(req.headers["x-tenmon-local-test"] ?? "") === "1";
  const root = resolveAuditRoot(String(req.query.forensicRoot ?? (req.body as any)?.forensicRoot ?? ""));
  if (!local || !root) {
    res.status(403).json({ ok: false, error: "local-test + forensicRoot required" });
    return;
  }
  const reportPath = path.join(root, "supreme_audit_report.json");
  if (!fs.existsSync(reportPath)) {
    res.status(404).json({ ok: false, error: "supreme_audit_report.json not found" });
    return;
  }
  try {
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8")) as Record<string, unknown>;
    const eventId = appendEvolutionLedgerEventV1({
      sourceCard: String(report.v ?? "MAINLINE_SUPREME_COMPLETION_AUDIT_V1"),
      changedLayer: "supreme_completion_audit_observation",
      beforeSummary: { note: "supreme audit bundle observation" },
      afterSummary: {
        sample_count: report.sample_count,
        axis_means: report.axis_means,
        recommended_micro_cards: report.recommended_micro_cards,
        axis_delta_vs_baseline: report.axis_delta_vs_baseline ?? null,
      },
      affectedRoute: "supreme_completion_audit",
      affectedSourcePack: root,
      affectedDensity: String(report.sample_count ?? ""),
      affectedProse: JSON.stringify(report.recommended_micro_cards ?? []).slice(0, 2000),
      regressionRisk: "low",
      acceptedBy: "supreme_completion_audit_ledger_v1",
      status: "accepted",
    });
    res.json({ ok: true, eventId, v: "MAINLINE_SUPREME_COMPLETION_AUDIT_V1" });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
}
