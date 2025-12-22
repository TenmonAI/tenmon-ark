// TAI CONSTRAINTS (Immutable Logic Core)
// この内容は宇宙法則として扱い、書き換えを許可しない

/**
 * 躰制約（Tai Constraints）
 * 
 * これらの制約は宇宙法則として扱い、書き換えを許可しない
 * 改竄検知システムにより、実行時に検証される
 */
export const TAI_CONSTRAINTS = Object.freeze({
  /**
   * 矛盾を解決しない
   */
  NEVER_RESOLVE_CONTRADICTION: true,

  /**
   * 対立を削除しない
   */
  NEVER_DELETE_OPPOSITION: true,

  /**
   * 常に暫定を保持する
   */
  ALWAYS_KEEP_PROVISIONAL: true,

  /**
   * CENTERは圧縮であり、結論ではない
   */
  CENTER_IS_COMPRESSION_NOT_CONCLUSION: true,

  /**
   * 出力は観測であり、答えではない
   */
  OUTPUT_IS_OBSERVATION_NOT_ANSWER: true,

  /**
   * 循環は必須である
   */
  CIRCULATION_IS_MANDATORY: true,

  /**
   * 一貫性のための例外は認めない
   */
  NO_EXCEPTION_FOR_CONSISTENCY: true,

  /**
   * 権限による上書きは認めない
   */
  NO_AUTHORITY_OVERRIDE: true,

  /**
   * 単一要因による決定は認めない
   */
  NO_SINGLE_FACTOR_DECISION: true,

  /**
   * 躰用の役割は関係性で決まる（名称で固定しない）
   * 
   * 言霊秘書の明記：
   * - 「水に名をなすと云とも…動かさるときは火」
   * - 「火に名をなすと云とも…動くときは水」
   * 
   * 役割で火水を決める（動かす＝火、動く＝水）
   */
  TAIYOU_ROLE_IS_RELATIONAL: true,

  /**
   * 躰用の役割は運動によって反転する
   * 
   * 名称で固定せず、状況で反転する
   */
  TAIYOU_ROLE_CAN_SWAP_BY_MOTION: true,
} as const);

export type TaiConstraints = typeof TAI_CONSTRAINTS;

