import { Router, type Request, type Response } from "express";
import { getDb } from "../db/index.js";

export const tenmonDashboardRouter = Router();

tenmonDashboardRouter.get("/tenmon/dashboard", (_req: Request, res: Response) => {
  try {
    const db = getDb("kokuzo");
    const hasTable = (name: string): boolean => {
      try {
        const row = db
          .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1")
          .get(name) as { name?: string } | undefined;
        return row?.name === name;
      } catch {
        return false;
      }
    };
    const hasColumn = (table: string, column: string): boolean => {
      try {
        const rows = db.prepare(`PRAGMA table_info('${table.replace(/'/g, "''")}')`).all() as Array<{
          name?: string;
        }>;
        return rows.some((r) => String(r?.name || "") === column);
      } catch {
        return false;
      }
    };

    const evoTable = "evolution_ledger_v1";
    const centerCol = hasColumn(evoTable, "center_key")
      ? "center_key"
      : hasColumn(evoTable, "centerKey")
      ? "centerKey"
      : null;
    const routeCol = hasColumn(evoTable, "route_reason")
      ? "route_reason"
      : hasColumn(evoTable, "routeReason")
      ? "routeReason"
      : null;
    const densityCol = hasColumn(evoTable, "density_target")
      ? "density_target"
      : hasColumn(evoTable, "densityTarget")
      ? "densityTarget"
      : null;
    const lawsUsedCol = hasColumn(evoTable, "laws_used_count")
      ? "laws_used_count"
      : hasColumn(evoTable, "lawsUsedCount")
      ? "lawsUsedCount"
      : null;
    const subgraphCol = hasColumn(evoTable, "subgraph_nodes")
      ? "subgraph_nodes"
      : null;
    const sourcePriorityCol = hasColumn(evoTable, "source_priority")
      ? "source_priority"
      : null;

    const latestEvolution = hasTable(evoTable)
      ? (db
          .prepare(
            [
              "SELECT id, thread_id,",
              centerCol ? `${centerCol} as center_key,` : "NULL as center_key,",
              routeCol ? `${routeCol} as route_reason,` : "NULL as route_reason,",
              densityCol ? `${densityCol} as density_target,` : "NULL as density_target,",
              lawsUsedCol ? `${lawsUsedCol} as laws_used_count,` : "NULL as laws_used_count,",
              sourcePriorityCol
                ? `${sourcePriorityCol} as source_priority,`
                : "NULL as source_priority,",
              subgraphCol ? `${subgraphCol} as subgraph_nodes,` : "NULL as subgraph_nodes,",
              "created_at FROM evolution_ledger_v1 ORDER BY created_at DESC LIMIT 1",
            ].join(" ")
          )
          .get() as Record<string, unknown> | undefined)
      : undefined;

    const growthLatest = hasTable("kanagi_growth_ledger")
      ? (db
          .prepare(
            "SELECT id, thread_id, candidateType, payload, created_at FROM kanagi_growth_ledger ORDER BY created_at DESC LIMIT 5"
          )
          .all() as Array<Record<string, unknown>>)
      : [];

    const reflectionCountRow = hasTable("kanagi_growth_ledger")
      ? (db
          .prepare(
            "SELECT COUNT(*) as c FROM kanagi_growth_ledger WHERE candidateType = '2nd_order_reflection'"
          )
          .get() as { c?: number } | undefined)
      : undefined;

    const reflectionLatest = hasTable("kanagi_growth_ledger")
      ? (db
          .prepare(
            "SELECT payload, created_at FROM kanagi_growth_ledger WHERE candidateType = '2nd_order_reflection' ORDER BY created_at DESC LIMIT 1"
          )
          .get() as Record<string, unknown> | undefined)
      : undefined;

    const safeParse = (payload: unknown): Record<string, unknown> => {
      try {
        if (typeof payload !== "string") return {};
        const parsed = JSON.parse(payload);
        return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
      } catch {
        return {};
      }
    };

    const growth = growthLatest.map((row) => {
      const payloadObj = safeParse(row.payload);
      return {
        id: row.id,
        thread_id: row.thread_id,
        candidateType: row.candidateType,
        created_at: row.created_at,
        payload: payloadObj,
        stabilityScore:
          typeof payloadObj.continuity_score === "number"
            ? payloadObj.continuity_score
            : null,
        driftRisk:
          typeof payloadObj.drift_detected === "boolean"
            ? payloadObj.drift_detected
            : null,
      };
    });

    const latestReflectionPayload = safeParse(reflectionLatest?.payload);

    return res.json({
      ok: true,
      truthSource: {
        centerKey: latestEvolution?.center_key ?? null,
        lawNames: latestEvolution?.source_priority
          ? String(latestEvolution.source_priority)
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean)
          : [],
        source_priority: latestEvolution?.source_priority ?? null,
        subgraph_nodes: latestEvolution?.subgraph_nodes ?? null,
      },
      growth: {
        latest5: growth,
        secondOrderReflectionCount: Number(reflectionCountRow?.c ?? 0),
      },
      audit: {
        routeReason: latestEvolution?.route_reason ?? null,
        densityTarget: latestEvolution?.density_target ?? null,
        lawsUsedCount: latestEvolution?.laws_used_count ?? null,
        reflectionScore: {
          center_fidelity: latestReflectionPayload.center_fidelity ?? null,
          provenance_fidelity: latestReflectionPayload.provenance_fidelity ?? null,
          beauty_score: latestReflectionPayload.beauty_score ?? null,
          continuity_score: latestReflectionPayload.continuity_score ?? null,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
