// TENMON-ARK Version (Phase 9)
// - 破壊的変更判定・運用時の識別のため固定値として管理する
export const TENMON_ARK_VERSION = "0.9.0";

// Phase 1: ビルド識別子（反映確認のため）
// ビルド時に注入される（環境変数またはビルドスクリプトで設定）
export const TENMON_ARK_BUILT_AT = process.env.TENMON_ARK_BUILT_AT || new Date().toISOString();
export const TENMON_ARK_GIT_SHA = process.env.TENMON_ARK_GIT_SHA || process.env.GIT_SHA || "unknown";


