// AmatsuKanagi Thought Circuit (水火エンジン) メインエクスポート

export * from "./types.js";
export * from "./types/trace.js"; // 核融合炉用のトレース型
export * from "./types/taiyou.js"; // 躰用照合型
export * from "./types/spiral.js"; // 螺旋再帰型
export * from "./extract/pdfTextLoader.js";
export * from "./extract/definitionExtractor.js";
export * from "./extract/ruleExtractor.js";
export * from "./extract/lawExtractor.js";
export * from "./extract/evidenceIndexer.js";
export * from "./engine/ikiClassifier.js";
export * from "./engine/phaseEstimator.js";
export * from "./engine/formMapper.js";
export * from "./engine/kotodamaMapper.js";
export * from "./engine/reasoner.js";
export * from "./engine/verifier.js";
export * from "./engine/fusionReasoner.js"; // 核融合炉思考実行器
export * from "./engine/taiYouSplitter.js"; // 躰用分離・照合エンジン
export * from "./engine/spiralState.js"; // 螺旋状態管理
export * from "./engine/spiralFeedback.js"; // 螺旋フィードバック回路
export * from "./extract/patterns.js"; // 核融合炉用パターン
export * from "./core/immutableTai.js"; // 不変核（躰）
export * from "./storage/rulesetStore.js";

