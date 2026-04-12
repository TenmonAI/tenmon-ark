/**
 * 旧暦（太陰太陽暦）変換エンジン
 * 
 * 天文学的に正確な朔望月計算に基づく旧暦変換。
 * 十九年七閏の法則（メトン周期）に準拠。
 * 
 * 原典: 密教占星法 第五章 暦の種類
 */

// ============================================
// 旧暦データテーブル（1900-2100年）
// ============================================

/**
 * 旧暦データ: 各年の旧暦情報をエンコードしたテーブル
 * 
 * 各エントリは20ビットのデータ:
 * - bit 0-11: 各月の大小（1=大月30日, 0=小月29日）
 * - bit 12-15: 閏月の月番号（0=閏月なし）
 * - bit 16-19: 閏月が大月か小月か
 * 
 * 1900年〜2100年の旧暦データ
 */
const LUNAR_INFO: number[] = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,
  // 2000-2009
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  // 2010-2019
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  // 2020-2029
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  // 2030-2039
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  // 2040-2049
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  // 2050-2059
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  // 2060-2069
  0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  // 2070-2079
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  // 2080-2089
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  // 2090-2100
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a4d0, 0x0d150, 0x0f252, 0x0d520,
];

const LUNAR_BASE_YEAR = 1900;
// 1900年1月31日が旧暦1900年正月初一
const LUNAR_BASE_DATE = new Date(1900, 0, 31);

export interface LunarDate {
  year: number;
  month: number;
  day: number;
  isLeap: boolean;
  monthName: string;    // 印度暦月名
  lunarPhase: "白月" | "黒月";
}

/**
 * 指定年の旧暦の総日数を算出
 */
function lunarYearDays(year: number): number {
  let sum = 348; // 12ヶ月 × 29日 = 348
  const info = LUNAR_INFO[year - LUNAR_BASE_YEAR];
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += (info & i) ? 1 : 0;
  }
  return sum + leapDays(year);
}

/**
 * 指定年の閏月の日数を算出（0=閏月なし）
 */
function leapDays(year: number): number {
  const lm = leapMonth(year);
  if (lm === 0) return 0;
  return (LUNAR_INFO[year - LUNAR_BASE_YEAR] & 0x10000) ? 30 : 29;
}

/**
 * 指定年の閏月を返す（0=閏月なし）
 */
function leapMonth(year: number): number {
  return LUNAR_INFO[year - LUNAR_BASE_YEAR] & 0xf;
}

/**
 * 指定年月の旧暦月の日数を算出
 */
function monthDays(year: number, month: number): number {
  return (LUNAR_INFO[year - LUNAR_BASE_YEAR] & (0x10000 >> month)) ? 30 : 29;
}

/**
 * 西暦→旧暦変換
 * 
 * 密教占星法 第五章に基づく暦法計算
 */
export function solarToLunar(solarDate: Date): LunarDate {
  const baseDate = new Date(LUNAR_BASE_DATE);
  let offset = Math.floor((solarDate.getTime() - baseDate.getTime()) / 86400000);

  // 年を特定
  let lunarYear = LUNAR_BASE_YEAR;
  let daysInYear: number;
  for (let i = LUNAR_BASE_YEAR; i < LUNAR_BASE_YEAR + LUNAR_INFO.length && offset > 0; i++) {
    daysInYear = lunarYearDays(i);
    if (offset < daysInYear) break;
    offset -= daysInYear;
    lunarYear = i + 1;
  }

  // 閏月の確認
  const lm = leapMonth(lunarYear);
  let isLeap = false;

  // 月を特定
  let lunarMonth = 1;
  let daysInMonth: number;
  for (let i = 1; i <= 12; i++) {
    // 閏月の処理
    if (lm > 0 && i === lm + 1 && !isLeap) {
      // 閏月
      daysInMonth = leapDays(lunarYear);
      isLeap = true;
      i--; // 月番号は進めない
    } else {
      daysInMonth = monthDays(lunarYear, i);
      isLeap = false;
    }

    if (offset < daysInMonth) {
      lunarMonth = i;
      break;
    }
    offset -= daysInMonth;
    lunarMonth = i;
  }

  const lunarDay = offset + 1;

  // 白月・黒月の判定（密教占星法 p100-103）
  const lunarPhase: "白月" | "黒月" = lunarDay <= 15 ? "白月" : "黒月";

  // 印度暦月名の対応（密教占星法 p103 暦対照表）
  const INDIAN_MONTH_NAMES: Record<number, string> = {
    1: "角月", 2: "氐月", 3: "心月", 4: "箕月",
    5: "女月", 6: "室月", 7: "婁月", 8: "昴月",
    9: "觜月", 10: "鬼月", 11: "星月", 12: "翼月"
  };
  const monthName = INDIAN_MONTH_NAMES[lunarMonth] || `第${lunarMonth}月`;

  return {
    year: lunarYear,
    month: lunarMonth,
    day: lunarDay,
    isLeap,
    monthName,
    lunarPhase
  };
}

/**
 * 天津金木基準日の算出
 * 
 * 2030年旧暦七夕 = マ（火中の水灵）= 文明12800年サイクルの終着点
 * 暦言灵算出アルゴリズムに基づく
 */
export function getAmatsuKanagiBaseDate(): Date {
  // 2030年の旧暦七月七日（七夕）を算出
  // 2030年旧暦七月の西暦日付を逆算
  // 旧暦2030年七月七日 ≒ 西暦2030年8月下旬（天文計算による近似値）
  // 正確な値: 2030年旧暦七月朔日を求め、そこから7日目
  
  let baseDate = new Date(LUNAR_BASE_DATE);
  let totalDays = 0;
  
  // 1900年から2030年までの旧暦日数を積算
  for (let y = LUNAR_BASE_YEAR; y < 2030; y++) {
    totalDays += lunarYearDays(y);
  }
  
  // 2030年の正月から七月朔日までの日数
  const lm2030 = leapMonth(2030);
  for (let m = 1; m < 7; m++) {
    totalDays += monthDays(2030, m);
    // 閏月の処理
    if (lm2030 > 0 && m === lm2030) {
      totalDays += leapDays(2030);
    }
  }
  
  // 七月七日 = 朔日 + 6日
  totalDays += 6;
  
  return new Date(baseDate.getTime() + totalDays * 86400000);
}

/**
 * 基準日からの経過日数を算出
 */
export function daysFromBaseDate(targetDate: Date): number {
  const baseDate = getAmatsuKanagiBaseDate();
  return Math.floor((targetDate.getTime() - baseDate.getTime()) / 86400000);
}

/**
 * 干支（十干十二支）の算出
 */
export function calculateKanshi(year: number): { kan: string, shi: string, kanshi: string } {
  const JIKKAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const JUNISHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  
  // 甲子年を基準（1984年が甲子）
  const offset = (year - 1984 + 60) % 60;
  const kan = JIKKAN[offset % 10];
  const shi = JUNISHI[offset % 12];
  
  return { kan, shi, kanshi: kan + shi };
}
