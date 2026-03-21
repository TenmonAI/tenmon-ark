/**
 * SEED_LEARNING_EFFECT_AUDIT_V1
 * Forensic read-only: seed / cluster / apply_log / synapse / training 指標と
 * 「次回生成への効果」シグナル（DB 相関・経路多様性）。chat 本文は変更しない。
 */
import type { Request, Response } from "express";
import { getDb } from "../db/index.js";

const V = "SEED_LEARNING_EFFECT_AUDIT_V1";
const NEXT_CARD = "KOKUZO_SEED_LEARNING_BRIDGE_V1";

function tableExists(db: ReturnType<typeof getDb>, name: string): boolean {
  try {
    const r = db
      .prepare(`SELECT 1 AS x FROM sqlite_master WHERE type='table' AND name=? LIMIT 1`)
      .get(name) as { x?: number } | undefined;
    return Boolean(r?.x);
  } catch {
    return false;
  }
}

function safeCount(db: ReturnType<typeof getDb>, sql: string): number | null {
  try {
    const r = db.prepare(sql).get() as { c?: number } | undefined;
    return Number(r?.c ?? 0);
  } catch {
    return null;
  }
}

/** GET /api/audit/seed-learning-effect-v1 */
export function handleSeedLearningEffectAuditV1(_req: Request, res: Response): void {
  const ts = new Date().toISOString();
  try {
    const db = getDb("kokuzo");

    const tablesAsked = [
      "khs_seeds_det_v1",
      "khs_seed_clusters",
      "khs_apply_log",
      "synapse_log",
      "khs_concepts",
      "ark_thread_seeds",
      "kz_seeds",
      "kokuzo_fractal_seeds",
      "ark_seed_ledger",
    ] as const;
    const tablePresence: Record<string, boolean> = {};
    for (const t of tablesAsked) {
      tablePresence[t] = tableExists(db, t);
    }

    const seedsTotal = tablePresence.khs_seeds_det_v1 ? safeCount(db, `SELECT COUNT(*) AS c FROM khs_seeds_det_v1`) : null;
    const seedsUsedPos = tablePresence.khs_seeds_det_v1
      ? safeCount(db, `SELECT COUNT(*) AS c FROM khs_seeds_det_v1 WHERE COALESCE(usageScore,0) > 0`)
      : null;
    const usageScoreSum = tablePresence.khs_seeds_det_v1
      ? (() => {
          try {
            const r = db.prepare(`SELECT COALESCE(SUM(usageScore),0) AS s FROM khs_seeds_det_v1`).get() as { s?: number } | undefined;
            return Number(r?.s ?? 0);
          } catch {
            return null;
          }
        })()
      : null;

    let deadSeedRatio: number | null = null;
    if (seedsTotal != null && seedsTotal > 0 && seedsUsedPos != null) {
      deadSeedRatio = (seedsTotal - seedsUsedPos) / seedsTotal;
    }

    const clusterRows = tablePresence.khs_seed_clusters ? safeCount(db, `SELECT COUNT(*) AS c FROM khs_seed_clusters`) : null;
    const clusterNonTrivial = tablePresence.khs_seed_clusters
      ? safeCount(db, `SELECT COUNT(*) AS c FROM khs_seed_clusters WHERE COALESCE(clusterSize,0) >= 2`)
      : null;

    const applyRows = tablePresence.khs_apply_log ? safeCount(db, `SELECT COUNT(*) AS c FROM khs_apply_log`) : null;

    let applyLawKeysWithPositiveSeedUsage: number | null = null;
    if (tablePresence.khs_apply_log && tablePresence.khs_seeds_det_v1) {
      try {
        const r = db
          .prepare(
            `SELECT COUNT(DISTINCT a.lawKey) AS c
               FROM khs_apply_log a
               INNER JOIN khs_seeds_det_v1 s ON s.lawKey = a.lawKey
              WHERE COALESCE(s.usageScore,0) > 0`
          )
          .get() as { c?: number } | undefined;
        applyLawKeysWithPositiveSeedUsage = Number(r?.c ?? 0);
      } catch {
        applyLawKeysWithPositiveSeedUsage = null;
      }
    }

    const synapseRows = tablePresence.synapse_log ? safeCount(db, `SELECT COUNT(*) AS c FROM synapse_log`) : null;

    let threadsWithDistinctRouteReasons = 0;
    let synapseRouteReasonDistinct = 0;
    if (tablePresence.synapse_log) {
      try {
        const rows = db
          .prepare(
            `SELECT threadId, COUNT(DISTINCT routeReason) AS d
               FROM synapse_log
              GROUP BY threadId
             HAVING d > 1
              LIMIT 20`
          )
          .all() as { threadId?: string; d?: number }[];
        threadsWithDistinctRouteReasons = rows.length;
      } catch {
        threadsWithDistinctRouteReasons = 0;
      }
      try {
        const r = db.prepare(`SELECT COUNT(DISTINCT routeReason) AS c FROM synapse_log`).get() as { c?: number } | undefined;
        synapseRouteReasonDistinct = Number(r?.c ?? 0);
      } catch {
        synapseRouteReasonDistinct = 0;
      }
    }

    const conceptRows = tablePresence.khs_concepts ? safeCount(db, `SELECT COUNT(*) AS c FROM khs_concepts`) : null;
    const conceptWeightSum = tablePresence.khs_concepts
      ? (() => {
          try {
            const r = db.prepare(`SELECT COALESCE(SUM(conceptWeight),0) AS s FROM khs_concepts`).get() as { s?: number } | undefined;
            return Number(r?.s ?? 0);
          } catch {
            return null;
          }
        })()
      : null;

    const arkThreadSeeds = tablePresence.ark_thread_seeds ? safeCount(db, `SELECT COUNT(*) AS c FROM ark_thread_seeds`) : null;
    const kzSeeds = tablePresence.kz_seeds ? safeCount(db, `SELECT COUNT(*) AS c FROM kz_seeds`) : null;

    let proseTouchExample: { threadId?: string; routeReason?: string; snippet?: string } | null = null;
    if (tablePresence.synapse_log) {
      try {
        const row = db
          .prepare(
            `SELECT threadId, routeReason,
                    substr(COALESCE(lawTraceJson,''),1,220) AS lt,
                    substr(COALESCE(heartJson,''),1,160) AS hh
               FROM synapse_log
              ORDER BY createdAt DESC
              LIMIT 1`
          )
          .get() as { threadId?: string; routeReason?: string; lt?: string; hh?: string } | undefined;
        if (row) {
          const snippet = [row.lt, row.hh].filter(Boolean).join(" | ").slice(0, 280);
          proseTouchExample = {
            threadId: row.threadId,
            routeReason: row.routeReason,
            snippet: snippet || undefined,
          };
        }
      } catch {
        proseTouchExample = null;
      }
    }

    const effectEvidenceReasons: string[] = [];
    if (applyLawKeysWithPositiveSeedUsage != null && applyLawKeysWithPositiveSeedUsage > 0) {
      effectEvidenceReasons.push("apply_log と usageScore>0 の seed が lawKey で結合可能（学習→利用の経路）");
    }
    if (threadsWithDistinctRouteReasons > 0) {
      effectEvidenceReasons.push("同一 thread で複数 routeReason の synapse が存在（応答経路の変化の痕跡）");
    }
    if (seedsUsedPos != null && seedsUsedPos > 0 && (synapseRows ?? 0) > 0) {
      effectEvidenceReasons.push("usage 付き seed と synapse_log が併存（観測スタックが生きている）");
    }
    if (clusterNonTrivial != null && clusterNonTrivial > 0) {
      effectEvidenceReasons.push("clusterSize>=2 のクラスタが存在（集約が実体化）");
    }
    if ((conceptWeightSum ?? 0) > 0 && (clusterRows ?? 0) > 0) {
      effectEvidenceReasons.push("khs_concepts の重みが蓄積（training 経路の痕跡）");
    }

    const effectEvidenceSatisfied = effectEvidenceReasons.length > 0;

    const report = {
      notOnlyExistence:
        effectEvidenceSatisfied ||
        (deadSeedRatio != null && deadSeedRatio < 1 && (seedsUsedPos ?? 0) > 0) ||
        (synapseRouteReasonDistinct > 1 && (synapseRows ?? 0) > 2),
      summary:
        effectEvidenceSatisfied
          ? "DB 上、seed/apply/synapse/cluster/training のいずれかで「効果」シグナルを検出"
          : "DB 単体では効果シグナル弱 — live probe（スクリプト）で route/source/density/prose 差分を必ず併記すること",
    };

    res.json({
      ok: true,
      v: V,
      timestamp: ts,
      nextCard: NEXT_CARD,
      bridgeNote:
        "KOKUZO_SEED_LEARNING_BRIDGE_V1: kokuzo_fractal_seeds / ark 系と KHS seed 管線の橋渡し・観測強化（本監査は現状スキーマの実在のみ報告）",
      tablePresence,
      observations: {
        seedReference: {
          khs_seeds_det_v1_total: seedsTotal,
          khs_seeds_det_v1_usageScorePositive: seedsUsedPos,
          usageScoreSum,
          deadSeedRatio,
        },
        applyLogToUsage: {
          khs_apply_log_rows: applyRows,
          distinctLawsWithApplyAndPositiveSeedUsage: applyLawKeysWithPositiveSeedUsage,
        },
        cluster: {
          khs_seed_clusters_rows: clusterRows,
          clustersWithSizeGte2: clusterNonTrivial,
        },
        training: {
          khs_concepts_rows: conceptRows,
          conceptWeightSum,
        },
        synapse: {
          synapse_log_rows: synapseRows,
          distinctRouteReasonsGlobal: synapseRouteReasonDistinct,
          threadsWithMultipleRouteReasons_sampledCap20: threadsWithDistinctRouteReasons,
        },
        otherLedger: {
          ark_thread_seeds_rows: arkThreadSeeds,
          kz_seeds_rows: kzSeeds,
        },
      },
      effectSignals: {
        effectEvidenceSatisfied,
        effectEvidenceReasons,
        proseOrTraceExample: proseTouchExample,
        targetsNextGenerationAxes: ["routeReason", "sourceKinds", "densityContract", "prose"],
        liveProbeRecommended: true,
        liveProbeScriptRef: "api/scripts/seed_learning_effect_audit_v1.sh",
      },
      report,
      policy: {
        forensicOnly: true,
        noSchemaMutation: true,
        noAutoPromoteOnLowSignal: true,
      },
    });
  } catch (e: any) {
    res.status(500).json({
      ok: false,
      v: V,
      timestamp: ts,
      nextCard: NEXT_CARD,
      error: String(e?.message ?? e),
    });
  }
}
