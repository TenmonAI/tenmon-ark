// 天津金木「核融合炉」思考回路の型定義
// 思考の軌跡を定義。integration を持たず observationCircle を持つ点が核心

import type { KanagiSpiral } from "./spiral.js";

/**
 * 天津金木思考トレース
 * 
 * 解決（solution）ではなく、観測（observation）を保持する
 */
export interface KanagiTrace {
  input: string;

  // 水火の勢力図
  iki: {
    fire: number;   // 外発エネルギー
    water: number;  // 内集エネルギー
    detectedBy: string[]; // 検知されたキーワード
  };

  // 局面の位相
  phase: {
    rise: boolean;
    fall: boolean;
    open: boolean;
    close: boolean;
    center: boolean;
  };

  // 形成された形（運動状態）
  form: "CIRCLE" | "LINE" | "DOT" | "WELL";

  // 言靈配置（今回は簡易実装）
  kotodama: {
    rowRole: "HEAVEN" | "EARTH" | "HUMAN" | "SERVANT";
    kanaHint?: string;
  };

  // 矛盾の保持
  contradictions: {
    thesis: string;
    antithesis: string;
    tensionLevel: number;
  }[];

  // 正中プロセス
  centerProcess?: {
    stage: "COLLECT" | "COMPRESS" | "INCUBATE";
    depth: number;
  };

  // 最終出力：解決ではなく「観測された円」
  observationCircle: {
    description: string;
    unresolved: string[]; // 溶け残った矛盾
  };

  meta: {
    provisional: boolean; // 常に暫定解である
    spiralDepth: number;  // 旋回深度
  };

  /**
   * 螺旋再帰構造
   * 観測円を次の思考の事実へ戻すための媒体
   */
  spiral?: KanagiSpiral;
}

