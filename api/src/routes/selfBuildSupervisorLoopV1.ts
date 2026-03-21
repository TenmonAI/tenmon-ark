/**
 * SELF_BUILD_SUPERVISOR_LOOP_V1 — HTTP adapter over shared cycle core.
 */
import type { Request, Response } from "express";
import {
  runSelfBuildSupervisorCycleV1,
  type SimulateOutcomeV1,
} from "./selfBuildSupervisorCycleCoreV1.js";

function parseSimulate(req: Request): SimulateOutcomeV1 {
  const local = String(req.headers["x-tenmon-local-test"] ?? "") === "1";
  if (!local) return null;
  let raw: SimulateOutcomeV1 = null;
  if (req.method === "POST" && req.body && typeof req.body === "object") {
    const s = (req.body as any).simulateOutcome;
    if (s === "rollback" || s === "quarantine") raw = s;
  }
  const q = typeof req.query.simulate === "string" ? req.query.simulate : null;
  if (q === "rollback" || q === "quarantine") raw = q;
  return raw;
}

/** GET|POST /api/audit/supervisor/self-build-loop-v1 */
export function handleSelfBuildSupervisorLoopV1(req: Request, res: Response): void {
  const cycleNote =
    req.method === "POST" && req.body && typeof (req.body as any).cycleNote === "string"
      ? String((req.body as any).cycleNote)
      : "";
  const simulate = parseSimulate(req);
  const r = runSelfBuildSupervisorCycleV1({ method: req.method, cycleNote, simulate });
  if (r.ok) {
    res.json(r);
    return;
  }
  res.status(500).json({
    ok: false,
    v: r.v,
    cycleId: r.cycleId,
    timestamp: r.timestamp,
    error: r.error,
  });
}
