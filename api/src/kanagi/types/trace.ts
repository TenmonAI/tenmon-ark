// 天津金木「核融合炉」思考回路の型定義
// 思考の軌跡を定義。integration を持たず observationCircle を持つ点が核心
// 監査・螺旋再帰・躰固定に対応した構造

import type { KanagiSpiral } from "./spiral.js";

/**
 * トークンの役割割当
 * 
 * 役割で火水を決める（動かす＝火、動く＝水）
 * 名称で固定しない（状況で反転する）
 */
export type TokenRole =
  | "TAI_FIRE"        // 躰（火）: 動かす側
  | "YOU_WATER"       // 用（水）: 動く側
  | "SWAPPED_FIRE"    // 反転した火（名称は水だが動かす役割）
  | "SWAPPED_WATER"   // 反転した水（名称は火だが動く役割）
  | "UNKNOWN";        // 未判定

/**
 * トークン割当
 */
export interface TokenAssignment {
  token: string;
  role: TokenRole;
}

/**
 * 躰用エネルギー判定
 */
export interface TaiYouEnergy {
  fire: number;  // 動かす側（火）
  water: number; // 動く側（水）
  assignments: TokenAssignment[]; // トークン単位の役割割当
  evidence: string[]; // 判定根拠
}

/**
 * 局面の位相
 */
export interface Phase {
  center: boolean; // 正中（凝・井）
  rise: boolean;   // 昇
  fall: boolean;   // 降
  open: boolean;   // 開
  close: boolean;  // 閉
}

/**
 * 天津金木思考トレース
 * 
 * 解決（solution）ではなく、観測（observation）を保持する
 * 監査・螺旋再帰・躰固定に対応
 */
export interface KanagiTrace {
  /**
   * 入力テキスト
   */
  input: string;

  /**
   * 躰用エネルギー判定
   */
  taiyou: TaiYouEnergy;

  /**
   * 局面の位相
   */
  phase: Phase;

  /**
   * 形成された形（運動状態）
   */
  form: "CIRCLE" | "LINE" | "DOT" | "WELL";

  /**
   * 螺旋再帰構造
   * 観測円を次の思考の事実へ戻すための媒体
   */
  spiral: KanagiSpiral;

  /**
   * 常に暫定解である（躰制約）
   */
  provisional: true;

  /**
   * 違反フラグ
   * 躰制約違反が検知された場合に設定される
   */
  violations: string[];

  /**
   * 躰固定状態
   */
  tai_freeze?: {
    enabled: boolean;
    tai_hash: string;
    integrity_verified: boolean;
  };

  /**
   * ループ検知（執着検知）
   */
  loop?: {
    detected: boolean;
    count: number;
  };

  /**
   * CENTER 発酵状態
   */
  fermentation?: {
    active: boolean;
    elapsed: number;
    unresolvedEnergy: number;
    centerDepth: number;
  };

  // 後方互換性のためのフィールド（既存コードとの統合用）
  iki?: {
    fire: number;
    water: number;
    detectedBy: string[];
  };

  kotodama?: {
    rowRole: "HEAVEN" | "EARTH" | "HUMAN" | "SERVANT";
    kanaHint?: string;
    hits?: Array<{
      number: number;
      sound: string;
      category: string;
      type?: string;
      pattern: string;
      movements: string[];
      meaning?: string;
      special: boolean;
    }>;
    top?: {
      number: number;
      sound: string;
      category: string;
      type?: string;
      pattern: string;
      movements: string[];
      meaning?: string;
      special: boolean;
    };
  };

  contradictions?: {
    thesis: string;
    antithesis: string;
    tensionLevel: number;
  }[];

  centerProcess?: {
    stage: "COLLECT" | "COMPRESS" | "INCUBATE";
    depth: number;
  };

  observationCircle?: {
    description: string;
    unresolved: string[];
  };

  meta?: {
    provisional: boolean;
    spiralDepth: number;
    tai_hash?: string;
    integrity_verified?: boolean;
    violation_flags?: string[];
  };
}

