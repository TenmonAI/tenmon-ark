/**
 * tenmon-core 統合エクスポート
 * 
 * 天聞アークの人格・思考・法則を「コードとして固定」する不変核
 */

import { getConfig } from "./config.js";
import { getPersonaTemplate } from "./persona.js";
import { analyzeKotodama, type KotodamaAnalysis } from "./kanagi.js";
import {
  getAllLaws,
  getLawById,
  getLawsByTag,
  type Law,
} from "./principles.js";

export type CosmogonyStep = {
  id: string;
  label: string;
  description: string;
  lawIds: string[];
};

/**
 * 生成鎖（宇宙生成プロセス）の最小核
 * 凝→別→父火母水→息→音→五十詞→形仮名→五十連（言霊）
 * 御中主＝0の正中にヽ は前段として別工程に置く。
 */
const COSMOGONY_CHAIN: CosmogonyStep[] = [
  {
    id: "COSMO-000-MINAKANUSHI",
    label: "御中主（0の正中にヽ）",
    description: "0母水とヽ父滴の正中に御中主が立つ（布斗麻通御霊図）。",
    lawIds: [
      "KOTODAMA-FUTOMANI-P13-0-AND-NO",
      "KOTODAMA-FUTOMANI-P13-AME-IS-ROTATION",
    ],
  },
  {
    id: "COSMO-010-KORI",
    label: "凝",
    description: "未分化の凝りとしての始元状態。",
    lawIds: ["KOTODAMA-MIZUHO-P6-10-GENESIS-CHAIN"],
  },
  {
    id: "COSMO-020-BETSU",
    label: "別",
    description: "凝りが分かれ、父火母水へと別れる契機。",
    lawIds: ["KOTODAMA-MIZUHO-P6-10-GENESIS-CHAIN"],
  },
  {
    id: "COSMO-030-FUFOBO-SUI",
    label: "父火母水",
    description: "父火母水として火と水の二相が立ち現れる。",
    lawIds: [
      "KOTODAMA-MIZUHO-P6-10-INVISIBLE-HIMIZU",
      "KOTODAMA-MIZUHO-P6-10-FIRE-AS-YO",
      "KOTODAMA-MIZUHO-P6-10-GENESIS-CHAIN",
    ],
  },
  {
    id: "COSMO-040-IKI",
    label: "息（いき）",
    description: "父火母水が息として働き出す。",
    lawIds: ["KOTODAMA-CORE-IKI-AND-KOTO"],
  },
  {
    id: "COSMO-050-OTO",
    label: "音",
    description: "息が音として顕われる段階。",
    lawIds: ["KOTODAMA-MIZUHO-P6-10-GENESIS-CHAIN"],
  },
  {
    id: "COSMO-060-ISOKOTO",
    label: "五十詞",
    description: "音が五十詞として構造化される。",
    lawIds: ["KOTODAMA-MIZUHO-P6-10-GENESIS-CHAIN"],
  },
  {
    id: "COSMO-070-KATAKANA",
    label: "形仮名",
    description: "五十詞が形仮名という記号体系をとる。",
    lawIds: ["KOTODAMA-MIZUHO-P6-10-GENESIS-CHAIN"],
  },
  {
    id: "COSMO-080-GOJU",
    label: "五十連（言霊）",
    description: "五十連として天・地・人・臣の行が連なる。",
    lawIds: [
      "KOTODAMA-MIZUHO-P6-10-GENESIS-CHAIN",
      "KOTODAMA-FUTOMANI-P13-AME-IS-ROTATION",
    ],
  },
];

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

  /**
   * 生成鎖（宇宙生成プロセス）の工程列を取得
   */
  getCosmogonyChain(): CosmogonyStep[] {
    return COSMOGONY_CHAIN;
  },

  /**
   * FractalView: Law.quote を再解析する（深さ1の最小実装）
   */
  getFractalView(lawId: string): KotodamaAnalysis | null {
    const law: Law | undefined = getLawById(lawId);
    if (!law) return null;
    return analyzeKotodama(law.quote);
  },
};

export type { Law, KotodamaAnalysis };

export default tenmonCore;

