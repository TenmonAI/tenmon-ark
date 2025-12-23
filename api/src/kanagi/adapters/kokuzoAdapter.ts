// 虚空蔵サーバー（KOKŪZŌ SERVER）との接続アダプタ
// C-1: KanagiTrace → SemanticUnit 変換
// C-2: writeback の明確化（非同期、失敗時も応答継続）

import type { KanagiTrace } from "../types/trace.js";

/**
 * SemanticUnit（虚空蔵サーバー用）
 * 
 * 注: 実際の Kokuzo サーバーの型定義に合わせて調整が必要
 */
export interface SemanticUnit {
  userId: string;
  sessionId: string;
  timestamp: string;
  compressedRepresentation: string; // 構文核（圧縮表現）
  fractalSeed?: {
    observation: string;
    form: string;
    phase: string;
  };
  activation?: {
    fire: number;
    water: number;
    center: boolean;
  };
  metadata?: {
    spiralDepth: number;
    provisional: boolean;
  };
}

/**
 * C-1: KanagiTrace → SemanticUnit 変換関数
 * 
 * 使用用途：
 * - 会話ログの意味圧縮
 * - FractalSeed 生成の素材
 * - Quantum Cache の activation 判定
 */
export function kanagiTraceToSemanticUnit(
  trace: KanagiTrace,
  userId: string,
  sessionId: string
): SemanticUnit {
  // 構文核（compressedRepresentation）を生成
  // observationCircle.description を基本とする
  const compressedRepresentation = trace.observationCircle?.description || "観測中";

  // FractalSeed を生成（次の思考の種）
  const fractalSeed = trace.observationCircle
    ? {
        observation: trace.observationCircle.description,
        form: trace.form,
        phase: trace.phase.center
          ? "CENTER"
          : trace.phase.rise
          ? "RISE"
          : trace.phase.fall
          ? "FALL"
          : trace.phase.open
          ? "OPEN"
          : "CLOSE",
      }
    : undefined;

  // activation（活性化状態）を生成
  const activation = {
    fire: trace.taiyou?.fire || 0,
    water: trace.taiyou?.water || 0,
    center: trace.phase.center,
  };

  return {
    userId,
    sessionId,
    timestamp: new Date().toISOString(),
    compressedRepresentation,
    fractalSeed,
    activation,
    metadata: {
      spiralDepth: trace.spiral?.depth || 0,
      provisional: trace.provisional || true,
    },
  };
}

/**
 * C-2: writeback の明確化（非同期、失敗時も応答継続）
 * 
 * 虚空蔵サーバーへの書き込みを非同期で実行
 * 失敗時もチャット応答は継続する
 */
export async function writebackToKokuzo(
  semanticUnit: SemanticUnit
): Promise<void> {
  try {
    // TODO: 実際の Kokuzo サーバーのエンドポイントに接続
    // 現時点ではログ出力のみ
    console.log("[KOKUZO-WRITEBACK] Writing semantic unit:", {
      userId: semanticUnit.userId,
      sessionId: semanticUnit.sessionId,
      compressedRepresentation: semanticUnit.compressedRepresentation.substring(0, 50) + "...",
    });

    // 実際の実装例（コメントアウト）:
    // const response = await fetch("http://localhost:3001/api/kokuzo/semantic", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(semanticUnit),
    // });
    // if (!response.ok) {
    //   throw new Error(`Kokuzo writeback failed: ${response.statusText}`);
    // }

    console.log("[KOKUZO-WRITEBACK] Success");
  } catch (error) {
    // C-2: 失敗時もチャット応答は継続（エラーをログに記録するだけ）
    console.error("[KOKUZO-WRITEBACK] Failed (non-blocking):", error);
    // エラーを throw しない（非ブロッキング）
  }
}

