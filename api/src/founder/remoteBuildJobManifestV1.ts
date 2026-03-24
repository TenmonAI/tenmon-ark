/**
 * TENMON_ADMIN_REMOTE_BUILD_DASHBOARD — job manifest（実行は次工程へ委譲、ここでは登録のみ）
 */
import type { RemoteGuardOutcome } from "./remoteCursorGuardV1.js";

export const REMOTE_BUILD_CARD = "TENMON_ADMIN_REMOTE_BUILD_DASHBOARD_CURSOR_AUTO_V1";

export type RemoteBuildPriority = "low" | "normal" | "high";

export type RemoteBuildJobStatus = "queued" | "rejected" | "rollback_requested";

export type RemoteBuildJobRecord = {
  manifestVersion: 1;
  jobId: string;
  card: typeof REMOTE_BUILD_CARD;
  createdAt: string;
  updatedAt: string;
  status: RemoteBuildJobStatus;
  priority: RemoteBuildPriority;
  targetScope: string;
  notes: string;
  cardName: string;
  cardBodyMd: string;
  guard: RemoteGuardOutcome;
  /** 次カード / ワーカーが参照する実行キュー用メタ（未実行） */
  execution: {
    deferred: true;
    nextStage: "cursor_worker_or_manual_apply";
    autoRun: false;
  };
  rollback?: {
    requestedAt: string;
    notes: string;
  };
  paths: {
    jobsStore: string;
    manifestPath: string;
    logHint: string;
  };
  /** TENMON_REMOTE_BUILD_RESULT_COLLECTOR: Mac 実行結果取り込み後 */
  result?: {
    status: "executed" | "failed" | "accepted" | "needs_review";
    receivedAt: string;
    bundlePath: string;
    collectorCard?: string;
  };
};

export function buildRemoteBuildJobManifest(args: {
  jobId: string;
  createdAt: string;
  priority: RemoteBuildPriority;
  targetScope: string;
  notes: string;
  cardName: string;
  cardBodyMd: string;
  guard: RemoteGuardOutcome;
  jobsStore: string;
  manifestPath: string;
  logHint: string;
  status: RemoteBuildJobStatus;
}): RemoteBuildJobRecord {
  return {
    manifestVersion: 1,
    jobId: args.jobId,
    card: REMOTE_BUILD_CARD,
    createdAt: args.createdAt,
    updatedAt: args.createdAt,
    status: args.status,
    priority: args.priority,
    targetScope: args.targetScope,
    notes: args.notes,
    cardName: args.cardName,
    cardBodyMd: args.cardBodyMd,
    guard: args.guard,
    execution: {
      deferred: true,
      nextStage: "cursor_worker_or_manual_apply",
      autoRun: false,
    },
    paths: {
      jobsStore: args.jobsStore,
      manifestPath: args.manifestPath,
      logHint: args.logHint,
    },
  };
}
