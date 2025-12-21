// Trace への強制適用
// 躰整合性検証を Trace に組み込む

import { getTaiStatus, verifyRuntimeIntegrity } from "./taiFreeze.js";
import type { KanagiTrace } from "../kanagi/types/trace.js";

/**
 * 安全な Trace を生成
 * 
 * 躰整合性検証を通過した Trace のみを返す
 * 改竄が検知された場合、violation_flags を設定する
 * 
 * @param base ベースとなる Trace データ
 * @returns 安全な Trace（provisional: true 固定）
 */
export function secureTrace(base: Partial<KanagiTrace>): KanagiTrace {
  const integrity = verifyRuntimeIntegrity();
  const status = getTaiStatus();

  // provisional は常に true（躰制約）
  const secureMeta = {
    ...(base.meta || {}),
    tai_hash: status.taiHash,
    integrity_verified: integrity,
    violation_flags: integrity ? [] : ["TAI_VIOLATION"],
    provisional: true as const,
    spiralDepth: base.meta?.spiralDepth || 0,
  };

  return {
    input: base.input || "",
    iki: base.iki || {
      fire: 0,
      water: 0,
      detectedBy: [],
    },
    phase: base.phase || {
      rise: false,
      fall: false,
      open: false,
      close: false,
      center: false,
    },
    form: base.form || "CIRCLE",
    kotodama: base.kotodama || { rowRole: "HUMAN" },
    contradictions: base.contradictions || [],
    centerProcess: base.centerProcess,
    observationCircle: base.observationCircle || {
      description: "Observation pending",
      unresolved: [],
    },
    meta: secureMeta,
    spiral: base.spiral,
  };
}

