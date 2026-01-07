/**
 * tenmon-core 統合エクスポート
 * 
 * 天聞アークの人格・思考・法則を「コードとして固定」する不変核
 */

import { getConfig } from "./config.js";
import { getPersonaTemplate } from "./persona.js";
import { analyzeKotodama, type KotodamaAnalysis } from "./kanagi.js";
import { getAllLaws, getLawById, getLawsByTag, type Law } from "./principles.js";

export const tenmonCore = {
  /**
   * 設定を取得（常に同じ値を返す）
   */
  getConfig,

  /**
   * 人格テンプレートを取得
   */
  getPersona: getPersonaTemplate,

  /**
   * 言霊解析
   */
  analyze: analyzeKotodama,

  /**
   * すべての法則を取得
   */
  getAllLaws,

  /**
   * IDで法則を取得
   */
  getLawById,

  /**
   * タグで法則を検索
   */
  getLawsByTag,
};

export type { Law, KotodamaAnalysis };

export default tenmonCore;

