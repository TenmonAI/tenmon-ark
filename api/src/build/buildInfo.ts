/**
 * buildInfo.ts — ビルド情報スタブ
 * VPSビルド時にtscが正常にコンパイルできるよう、
 * BUILD_MARK と BUILD_FEATURES をエクスポートする。
 */

export const BUILD_MARK = `tenmon-ark-${new Date().toISOString().slice(0, 10)}`;

export const BUILD_FEATURES = {
  kotodamaEngine: true,
  kanagiReasoner: true,
  knowledgeLoader: true,
  katakamuna80: true,
  khsCompliant: true,
  gojiuren51: true,
} as const;
