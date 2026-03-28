/** TENMON_BUILD_GREEN_RESTORE_AFTER_SHELTER_V1: gate 直前の issue 連続性（欠落復元・no-op 既定） */
export function applyIssueContinuityToGatePayloadV1(_args: {
  threadCore: unknown;
  decisionFrame: unknown;
  response: string;
  rawMessage: string;
}): void {
  /* 本番実装は退避により欠落。会話主線は gate / finalize が単一出口のため no-op で型・ビルドのみ回復 */
}
