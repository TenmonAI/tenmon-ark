export type ChatRequestBody = {
  message: string;
  sessionId?: string;
};

/**
 * B-2: KanagiTrace サイズ制御
 * 
 * 軽量モード: form / phase / observationCircle / spiral.depth のみ
 * フルモード: すべての trace 情報（デバッグ用）
 */
export type LightweightTrace = {
  form: "CIRCLE" | "LINE" | "DOT" | "WELL";
  phase: {
    center: boolean;
    rise: boolean;
    fall: boolean;
    open: boolean;
    close: boolean;
  };
  observationCircle: {
    description: string;
    unresolved: string[];
  };
  spiral: {
    depth: number;
  };
};

export type ChatResponseBody = {
  response: string; // 観測文（Observation）
  observation: {
    description: string;
    unresolved: string[];
    focus?: string; // 次に観たい焦点
  };
  spiral: {
    depth: number;
    previousObservation: string;
    nextFactSeed: string;
  };
  provisional: true; // 常に true
  timestamp: string;
  trace?: unknown | LightweightTrace; // KanagiTrace（デバッグ用）または軽量版
};
