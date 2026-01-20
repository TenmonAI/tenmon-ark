// TENMON-ARK Version (Phase 9)
// - 破壊的変更判定・運用時の識別のため固定値として管理する
export const TENMON_ARK_VERSION = "0.9.0";

// Phase 1: ビルド識別子（反映確認のため）
// ビルド時に dist/version.js から注入される値を使用
// 開発時（dist/version.js が存在しない場合）は null を返す

// dist/version.js から値を読み込む（実行時）
// ビルド時に copy-assets.mjs が生成する dist/version.js から値を取得
export let TENMON_ARK_BUILT_AT: string | null = null;
export let TENMON_ARK_GIT_SHA: string | null = null;

// 実行時に dist/version.js を読み込む（ビルド後は存在する）
// TypeScript の型チェックを回避するため、文字列リテラルで動的 import
try {
  // dist/version.js を動的に読み込む（実行時）
  // @ts-ignore: dist/version.js はビルド時に生成されるため、型チェック時には存在しない
  const versionModule = await import("../version.js");
  TENMON_ARK_BUILT_AT = versionModule.TENMON_ARK_BUILT_AT ?? null;
  TENMON_ARK_GIT_SHA = versionModule.TENMON_ARK_GIT_SHA ?? null;
} catch (e) {
  // dist/version.js が存在しない場合（開発時など）は null のまま
  // ビルド時に copy-assets.mjs が生成する
}


