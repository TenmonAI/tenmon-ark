/**
 * 宿曜経 × 天津金木 × 言霊 統合診断モジュール
 * 
 * 天聞アーク意識OS の宿曜診断機能
 */

export { solarToLunar, daysFromBaseDate, getAmatsuKanagiBaseDate, calculateKanshi } from "./lunarCalendar.js";
export type { LunarDate } from "./lunarCalendar.js";

export {
  NAKSHATRAS, NAKSHATRA_DATA, PALACE_DATA, PLANET_DATA,
  calculateHonmeiShuku, calculateHonmeiYo, calculateKyusei,
  getRelationship, getMutualCompatibility,
  calculateMeikyu, calculatePalaceConfig,
  calculateDailyNakshatra, calculateDailyPlanet,
  calculateJuniChoku, calculateYunenHakke,
  runFullDiagnosis
} from "./sukuyouEngine.js";
export type {
  Nakshatra, Palace, Planet, RelationshipType, TaiYou, Kyusei, JuniChoku,
  NakshatraData, PalaceData, PlanetData,
  FullDiagnosisResult
} from "./sukuyouEngine.js";

export { getSukuyouMs, getShukuName, SHUKU_NAMES } from "./sukuyouLookup.js";

export {
  calculateThreeLayerPhase,
  analyzeNameKotodama,
  determineTaiYou,
  integratedCompatibility,
  runCompleteDiagnosis
} from "./integratedDiagnosis.js";
export type {
  TaiYouResult,
  IntegratedCompatibilityResult,
  CompleteDiagnosisResult
} from "./integratedDiagnosis.js";
