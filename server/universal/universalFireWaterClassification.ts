/**
 * Universal Fire-Water Classification System
 * 世界全言語の火水分類システム
 */

export type FireWaterType = "fire" | "water";

export interface PhonemeClassification {
  phoneme: string;
  type: FireWaterType;
  description: string;
  language: string;
}

/**
 * 英語の火水分類
 * 母音・子音レベルでの分類
 */
export const ENGLISH_FIRE_WATER: PhonemeClassification[] = [
  // 母音（Vowels）
  { phoneme: "a", type: "fire", description: "Open vowel, expansive", language: "en" },
  { phoneme: "e", type: "water", description: "Close vowel, contractive", language: "en" },
  { phoneme: "i", type: "water", description: "Close vowel, inward", language: "en" },
  { phoneme: "o", type: "fire", description: "Open vowel, outward", language: "en" },
  { phoneme: "u", type: "fire", description: "Back vowel, deep", language: "en" },
  
  // 子音（Consonants）- 破裂音は火、摩擦音・鼻音は水
  { phoneme: "p", type: "fire", description: "Plosive, explosive", language: "en" },
  { phoneme: "b", type: "fire", description: "Plosive, explosive", language: "en" },
  { phoneme: "t", type: "fire", description: "Plosive, sharp", language: "en" },
  { phoneme: "d", type: "fire", description: "Plosive, sharp", language: "en" },
  { phoneme: "k", type: "fire", description: "Plosive, hard", language: "en" },
  { phoneme: "g", type: "fire", description: "Plosive, hard", language: "en" },
  
  { phoneme: "f", type: "water", description: "Fricative, flowing", language: "en" },
  { phoneme: "v", type: "water", description: "Fricative, flowing", language: "en" },
  { phoneme: "s", type: "water", description: "Fricative, streaming", language: "en" },
  { phoneme: "z", type: "water", description: "Fricative, streaming", language: "en" },
  { phoneme: "h", type: "fire", description: "Aspirate, breath", language: "en" },
  
  { phoneme: "m", type: "water", description: "Nasal, internal", language: "en" },
  { phoneme: "n", type: "water", description: "Nasal, internal", language: "en" },
  { phoneme: "l", type: "water", description: "Liquid, flowing", language: "en" },
  { phoneme: "r", type: "fire", description: "Liquid, rolling", language: "en" },
  { phoneme: "w", type: "water", description: "Glide, smooth", language: "en" },
  { phoneme: "y", type: "fire", description: "Glide, bright", language: "en" },
];

/**
 * 韓国語（ハングル）の火水分類
 */
export const KOREAN_FIRE_WATER: PhonemeClassification[] = [
  // 母音
  { phoneme: "ㅏ", type: "fire", description: "陽母音、外向", language: "ko" },
  { phoneme: "ㅑ", type: "fire", description: "陽母音、外向", language: "ko" },
  { phoneme: "ㅓ", type: "water", description: "陰母音、内向", language: "ko" },
  { phoneme: "ㅕ", type: "water", description: "陰母音、内向", language: "ko" },
  { phoneme: "ㅗ", type: "fire", description: "陽母音、上向", language: "ko" },
  { phoneme: "ㅛ", type: "fire", description: "陽母音、上向", language: "ko" },
  { phoneme: "ㅜ", type: "water", description: "陰母音、下向", language: "ko" },
  { phoneme: "ㅠ", type: "water", description: "陰母音、下向", language: "ko" },
  { phoneme: "ㅡ", type: "water", description: "陰母音、平", language: "ko" },
  { phoneme: "ㅣ", type: "water", description: "陰母音、縦", language: "ko" },
  
  // 子音（平音・激音・濃音）
  { phoneme: "ㄱ", type: "water", description: "平音、柔", language: "ko" },
  { phoneme: "ㄲ", type: "fire", description: "濃音、強", language: "ko" },
  { phoneme: "ㅋ", type: "fire", description: "激音、爆", language: "ko" },
  { phoneme: "ㄷ", type: "water", description: "平音、柔", language: "ko" },
  { phoneme: "ㄸ", type: "fire", description: "濃音、強", language: "ko" },
  { phoneme: "ㅌ", type: "fire", description: "激音、爆", language: "ko" },
  { phoneme: "ㅂ", type: "water", description: "平音、柔", language: "ko" },
  { phoneme: "ㅃ", type: "fire", description: "濃音、強", language: "ko" },
  { phoneme: "ㅍ", type: "fire", description: "激音、爆", language: "ko" },
  { phoneme: "ㅅ", type: "water", description: "平音、流", language: "ko" },
  { phoneme: "ㅆ", type: "fire", description: "濃音、強", language: "ko" },
  { phoneme: "ㅈ", type: "water", description: "平音、柔", language: "ko" },
  { phoneme: "ㅉ", type: "fire", description: "濃音、強", language: "ko" },
  { phoneme: "ㅊ", type: "fire", description: "激音、爆", language: "ko" },
  { phoneme: "ㅎ", type: "fire", description: "激音、息", language: "ko" },
  { phoneme: "ㄴ", type: "water", description: "鼻音、内", language: "ko" },
  { phoneme: "ㅁ", type: "water", description: "鼻音、内", language: "ko" },
  { phoneme: "ㅇ", type: "water", description: "無音・鼻音", language: "ko" },
  { phoneme: "ㄹ", type: "water", description: "流音、流", language: "ko" },
];

/**
 * 中国語（普通話）の火水分類
 * 声調と音韻による分類
 */
export const CHINESE_FIRE_WATER: PhonemeClassification[] = [
  // 声調（Tones）
  { phoneme: "tone1", type: "fire", description: "第一声、高平、外発", language: "zh" },
  { phoneme: "tone2", type: "fire", description: "第二声、上昇、外発", language: "zh" },
  { phoneme: "tone3", type: "water", description: "第三声、下降上昇、内集", language: "zh" },
  { phoneme: "tone4", type: "fire", description: "第四声、急降、外発", language: "zh" },
  { phoneme: "tone5", type: "water", description: "軽声、弱、内集", language: "zh" },
  
  // 声母（Initials）
  { phoneme: "b", type: "fire", description: "不送気清塞音", language: "zh" },
  { phoneme: "p", type: "fire", description: "送気清塞音", language: "zh" },
  { phoneme: "m", type: "water", description: "鼻音", language: "zh" },
  { phoneme: "f", type: "water", description: "清擦音", language: "zh" },
  { phoneme: "d", type: "fire", description: "不送気清塞音", language: "zh" },
  { phoneme: "t", type: "fire", description: "送気清塞音", language: "zh" },
  { phoneme: "n", type: "water", description: "鼻音", language: "zh" },
  { phoneme: "l", type: "water", description: "辺音", language: "zh" },
  { phoneme: "g", type: "fire", description: "不送気清塞音", language: "zh" },
  { phoneme: "k", type: "fire", description: "送気清塞音", language: "zh" },
  { phoneme: "h", type: "fire", description: "清擦音", language: "zh" },
  { phoneme: "j", type: "water", description: "不送気清塞擦音", language: "zh" },
  { phoneme: "q", type: "fire", description: "送気清塞擦音", language: "zh" },
  { phoneme: "x", type: "water", description: "清擦音", language: "zh" },
  { phoneme: "zh", type: "fire", description: "不送気清塞擦音", language: "zh" },
  { phoneme: "ch", type: "fire", description: "送気清塞擦音", language: "zh" },
  { phoneme: "sh", type: "water", description: "清擦音", language: "zh" },
  { phoneme: "r", type: "water", description: "濁擦音", language: "zh" },
  { phoneme: "z", type: "water", description: "不送気清塞擦音", language: "zh" },
  { phoneme: "c", type: "fire", description: "送気清塞擦音", language: "zh" },
  { phoneme: "s", type: "water", description: "清擦音", language: "zh" },
  
  // 韻母（Finals）
  { phoneme: "a", type: "fire", description: "開口呼", language: "zh" },
  { phoneme: "o", type: "fire", description: "開口呼", language: "zh" },
  { phoneme: "e", type: "water", description: "開口呼", language: "zh" },
  { phoneme: "i", type: "water", description: "斉歯呼", language: "zh" },
  { phoneme: "u", type: "fire", description: "合口呼", language: "zh" },
  { phoneme: "ü", type: "water", description: "撮口呼", language: "zh" },
];

/**
 * アラビア語の火水分類
 */
export const ARABIC_FIRE_WATER: PhonemeClassification[] = [
  // 母音
  { phoneme: "a", type: "fire", description: "開母音、外向", language: "ar" },
  { phoneme: "i", type: "water", description: "閉母音、内向", language: "ar" },
  { phoneme: "u", type: "fire", description: "後母音、深", language: "ar" },
  
  // 子音（喉音は火、鼻音・流音は水）
  { phoneme: "ʔ", type: "fire", description: "声門閉鎖音", language: "ar" },
  { phoneme: "b", type: "fire", description: "両唇破裂音", language: "ar" },
  { phoneme: "t", type: "fire", description: "歯茎破裂音", language: "ar" },
  { phoneme: "th", type: "water", description: "歯摩擦音", language: "ar" },
  { phoneme: "j", type: "water", description: "硬口蓋破擦音", language: "ar" },
  { phoneme: "ḥ", type: "fire", description: "咽頭摩擦音", language: "ar" },
  { phoneme: "kh", type: "fire", description: "軟口蓋摩擦音", language: "ar" },
  { phoneme: "d", type: "fire", description: "歯茎破裂音", language: "ar" },
  { phoneme: "dh", type: "water", description: "歯摩擦音", language: "ar" },
  { phoneme: "r", type: "fire", description: "歯茎ふるえ音", language: "ar" },
  { phoneme: "z", type: "water", description: "歯茎摩擦音", language: "ar" },
  { phoneme: "s", type: "water", description: "歯茎摩擦音", language: "ar" },
  { phoneme: "sh", type: "water", description: "後部歯茎摩擦音", language: "ar" },
  { phoneme: "ṣ", type: "fire", description: "咽頭化歯茎摩擦音", language: "ar" },
  { phoneme: "ḍ", type: "fire", description: "咽頭化歯茎破裂音", language: "ar" },
  { phoneme: "ṭ", type: "fire", description: "咽頭化歯茎破裂音", language: "ar" },
  { phoneme: "ẓ", type: "fire", description: "咽頭化歯摩擦音", language: "ar" },
  { phoneme: "ʕ", type: "fire", description: "有声咽頭摩擦音", language: "ar" },
  { phoneme: "gh", type: "fire", description: "有声軟口蓋摩擦音", language: "ar" },
  { phoneme: "f", type: "water", description: "唇歯摩擦音", language: "ar" },
  { phoneme: "q", type: "fire", description: "口蓋垂破裂音", language: "ar" },
  { phoneme: "k", type: "fire", description: "軟口蓋破裂音", language: "ar" },
  { phoneme: "l", type: "water", description: "歯茎側面接近音", language: "ar" },
  { phoneme: "m", type: "water", description: "両唇鼻音", language: "ar" },
  { phoneme: "n", type: "water", description: "歯茎鼻音", language: "ar" },
  { phoneme: "h", type: "fire", description: "声門摩擦音", language: "ar" },
  { phoneme: "w", type: "water", description: "両唇軟口蓋接近音", language: "ar" },
  { phoneme: "y", type: "fire", description: "硬口蓋接近音", language: "ar" },
];

/**
 * ヒンディー語（デーヴァナーガリー文字）の火水分類
 */
export const HINDI_FIRE_WATER: PhonemeClassification[] = [
  // 母音
  { phoneme: "अ", type: "fire", description: "短母音a", language: "hi" },
  { phoneme: "आ", type: "fire", description: "長母音ā", language: "hi" },
  { phoneme: "इ", type: "water", description: "短母音i", language: "hi" },
  { phoneme: "ई", type: "water", description: "長母音ī", language: "hi" },
  { phoneme: "उ", type: "fire", description: "短母音u", language: "hi" },
  { phoneme: "ऊ", type: "fire", description: "長母音ū", language: "hi" },
  { phoneme: "ए", type: "water", description: "長母音e", language: "hi" },
  { phoneme: "ऐ", type: "fire", description: "二重母音ai", language: "hi" },
  { phoneme: "ओ", type: "fire", description: "長母音o", language: "hi" },
  { phoneme: "औ", type: "fire", description: "二重母音au", language: "hi" },
  
  // 子音（無気音・有気音）
  { phoneme: "क", type: "water", description: "無気無声軟口蓋破裂音", language: "hi" },
  { phoneme: "ख", type: "fire", description: "有気無声軟口蓋破裂音", language: "hi" },
  { phoneme: "ग", type: "water", description: "無気有声軟口蓋破裂音", language: "hi" },
  { phoneme: "घ", type: "fire", description: "有気有声軟口蓋破裂音", language: "hi" },
  { phoneme: "च", type: "water", description: "無気無声硬口蓋破擦音", language: "hi" },
  { phoneme: "छ", type: "fire", description: "有気無声硬口蓋破擦音", language: "hi" },
  { phoneme: "ज", type: "water", description: "無気有声硬口蓋破擦音", language: "hi" },
  { phoneme: "झ", type: "fire", description: "有気有声硬口蓋破擦音", language: "hi" },
  { phoneme: "ट", type: "water", description: "無気無声そり舌破裂音", language: "hi" },
  { phoneme: "ठ", type: "fire", description: "有気無声そり舌破裂音", language: "hi" },
  { phoneme: "ड", type: "water", description: "無気有声そり舌破裂音", language: "hi" },
  { phoneme: "ढ", type: "fire", description: "有気有声そり舌破裂音", language: "hi" },
  { phoneme: "त", type: "water", description: "無気無声歯茎破裂音", language: "hi" },
  { phoneme: "थ", type: "fire", description: "有気無声歯茎破裂音", language: "hi" },
  { phoneme: "द", type: "water", description: "無気有声歯茎破裂音", language: "hi" },
  { phoneme: "ध", type: "fire", description: "有気有声歯茎破裂音", language: "hi" },
  { phoneme: "प", type: "water", description: "無気無声両唇破裂音", language: "hi" },
  { phoneme: "फ", type: "fire", description: "有気無声両唇破裂音", language: "hi" },
  { phoneme: "ब", type: "water", description: "無気有声両唇破裂音", language: "hi" },
  { phoneme: "भ", type: "fire", description: "有気有声両唇破裂音", language: "hi" },
  { phoneme: "म", type: "water", description: "両唇鼻音", language: "hi" },
  { phoneme: "य", type: "fire", description: "硬口蓋接近音", language: "hi" },
  { phoneme: "र", type: "fire", description: "歯茎ふるえ音", language: "hi" },
  { phoneme: "ल", type: "water", description: "歯茎側面接近音", language: "hi" },
  { phoneme: "व", type: "water", description: "唇歯接近音", language: "hi" },
  { phoneme: "श", type: "water", description: "無声硬口蓋摩擦音", language: "hi" },
  { phoneme: "ष", type: "water", description: "無声そり舌摩擦音", language: "hi" },
  { phoneme: "स", type: "water", description: "無声歯茎摩擦音", language: "hi" },
  { phoneme: "ह", type: "fire", description: "有声声門摩擦音", language: "hi" },
];

/**
 * サンスクリット語の火水分類
 */
export const SANSKRIT_FIRE_WATER: PhonemeClassification[] = [
  // 母音
  { phoneme: "अ", type: "fire", description: "短母音a、開放的", language: "sa" },
  { phoneme: "आ", type: "fire", description: "長母音ā、拡張的", language: "sa" },
  { phoneme: "इ", type: "water", description: "短母音i、内向的", language: "sa" },
  { phoneme: "ई", type: "water", description: "長母音ī、内向的", language: "sa" },
  { phoneme: "उ", type: "fire", description: "短母音u、後舌的", language: "sa" },
  { phoneme: "ऊ", type: "fire", description: "長母音ū、後舌的", language: "sa" },
  { phoneme: "ऋ", type: "water", description: "ṛ音、流動的", language: "sa" },
  { phoneme: "ॠ", type: "water", description: "ṝ音、流動的", language: "sa" },
  { phoneme: "ऌ", type: "water", description: "ḷ音、流動的", language: "sa" },
  { phoneme: "ॡ", type: "water", description: "ḹ音、流動的", language: "sa" },
  { phoneme: "ए", type: "water", description: "長母音e、中間的", language: "sa" },
  { phoneme: "ऐ", type: "fire", description: "二重母音ai、拡張的", language: "sa" },
  { phoneme: "ओ", type: "fire", description: "長母音o、後舌的", language: "sa" },
  { phoneme: "औ", type: "fire", description: "二重母音au、拡張的", language: "sa" },
  
  // 子音（無気音・有気音・帯気音）
  { phoneme: "क", type: "water", description: "無気無声軟口蓋破裂音", language: "sa" },
  { phoneme: "ख", type: "fire", description: "有気無声軟口蓋破裂音", language: "sa" },
  { phoneme: "ग", type: "water", description: "無気有声軟口蓋破裂音", language: "sa" },
  { phoneme: "घ", type: "fire", description: "有気有声軟口蓋破裂音", language: "sa" },
  { phoneme: "ङ", type: "water", description: "軟口蓋鼻音", language: "sa" },
  { phoneme: "च", type: "water", description: "無気無声硬口蓋破擦音", language: "sa" },
  { phoneme: "छ", type: "fire", description: "有気無声硬口蓋破擦音", language: "sa" },
  { phoneme: "ज", type: "water", description: "無気有声硬口蓋破擦音", language: "sa" },
  { phoneme: "झ", type: "fire", description: "有気有声硬口蓋破擦音", language: "sa" },
  { phoneme: "ञ", type: "water", description: "硬口蓋鼻音", language: "sa" },
  { phoneme: "ट", type: "water", description: "無気無声そり舌破裂音", language: "sa" },
  { phoneme: "ठ", type: "fire", description: "有気無声そり舌破裂音", language: "sa" },
  { phoneme: "ड", type: "water", description: "無気有声そり舌破裂音", language: "sa" },
  { phoneme: "ढ", type: "fire", description: "有気有声そり舌破裂音", language: "sa" },
  { phoneme: "ण", type: "water", description: "そり舌鼻音", language: "sa" },
  { phoneme: "त", type: "water", description: "無気無声歯茎破裂音", language: "sa" },
  { phoneme: "थ", type: "fire", description: "有気無声歯茎破裂音", language: "sa" },
  { phoneme: "द", type: "water", description: "無気有声歯茎破裂音", language: "sa" },
  { phoneme: "ध", type: "fire", description: "有気有声歯茎破裂音", language: "sa" },
  { phoneme: "न", type: "water", description: "歯茎鼻音", language: "sa" },
  { phoneme: "प", type: "water", description: "無気無声両唇破裂音", language: "sa" },
  { phoneme: "फ", type: "fire", description: "有気無声両唇破裂音", language: "sa" },
  { phoneme: "ब", type: "water", description: "無気有声両唇破裂音", language: "sa" },
  { phoneme: "भ", type: "fire", description: "有気有声両唇破裂音", language: "sa" },
  { phoneme: "म", type: "water", description: "両唇鼻音", language: "sa" },
  { phoneme: "य", type: "fire", description: "硬口蓋接近音", language: "sa" },
  { phoneme: "र", type: "fire", description: "歯茎ふるえ音", language: "sa" },
  { phoneme: "ल", type: "water", description: "歯茎側面接近音", language: "sa" },
  { phoneme: "व", type: "water", description: "唇歯接近音", language: "sa" },
  { phoneme: "श", type: "water", description: "無声硬口蓋摩擦音", language: "sa" },
  { phoneme: "ष", type: "water", description: "無声そり舌摩擦音", language: "sa" },
  { phoneme: "स", type: "water", description: "無声歯茎摩擦音", language: "sa" },
  { phoneme: "ह", type: "fire", description: "有声声門摩擦音", language: "sa" },
];

/**
 * ラテン語の火水分類
 */
export const LATIN_FIRE_WATER: PhonemeClassification[] = [
  // 母音
  { phoneme: "a", type: "fire", description: "短母音a、開放的", language: "la" },
  { phoneme: "ā", type: "fire", description: "長母音ā、拡張的", language: "la" },
  { phoneme: "e", type: "water", description: "短母音e、中間的", language: "la" },
  { phoneme: "ē", type: "water", description: "長母音ē、中間的", language: "la" },
  { phoneme: "i", type: "water", description: "短母音i、内向的", language: "la" },
  { phoneme: "ī", type: "water", description: "長母音ī、内向的", language: "la" },
  { phoneme: "o", type: "fire", description: "短母音o、後舌的", language: "la" },
  { phoneme: "ō", type: "fire", description: "長母音ō、後舌的", language: "la" },
  { phoneme: "u", type: "fire", description: "短母音u、後舌的", language: "la" },
  { phoneme: "ū", type: "fire", description: "長母音ū、後舌的", language: "la" },
  { phoneme: "y", type: "water", description: "短母音y、前舌的", language: "la" },
  { phoneme: "ȳ", type: "water", description: "長母音ȳ、前舌的", language: "la" },
  
  // 子音
  { phoneme: "b", type: "fire", description: "両唇破裂音", language: "la" },
  { phoneme: "c", type: "fire", description: "硬口蓋破裂音", language: "la" },
  { phoneme: "d", type: "fire", description: "歯茎破裂音", language: "la" },
  { phoneme: "f", type: "water", description: "唇歯摩擦音", language: "la" },
  { phoneme: "g", type: "fire", description: "軟口蓋破裂音", language: "la" },
  { phoneme: "h", type: "fire", description: "声門摩擦音", language: "la" },
  { phoneme: "j", type: "water", description: "硬口蓋破擦音", language: "la" },
  { phoneme: "k", type: "fire", description: "軟口蓋破裂音", language: "la" },
  { phoneme: "l", type: "water", description: "歯茎側面接近音", language: "la" },
  { phoneme: "m", type: "water", description: "両唇鼻音", language: "la" },
  { phoneme: "n", type: "water", description: "歯茎鼻音", language: "la" },
  { phoneme: "p", type: "fire", description: "両唇破裂音", language: "la" },
  { phoneme: "q", type: "fire", description: "軟口蓋破裂音（uと結合）", language: "la" },
  { phoneme: "r", type: "fire", description: "歯茎ふるえ音", language: "la" },
  { phoneme: "s", type: "water", description: "歯茎摩擦音", language: "la" },
  { phoneme: "t", type: "fire", description: "歯茎破裂音", language: "la" },
  { phoneme: "v", type: "water", description: "唇歯接近音", language: "la" },
  { phoneme: "x", type: "fire", description: "ks音、複合音", language: "la" },
  { phoneme: "z", type: "water", description: "歯茎摩擦音", language: "la" },
];

/**
 * 全言語の火水分類を統合
 */
export const ALL_LANGUAGE_FIRE_WATER = {
  en: ENGLISH_FIRE_WATER,
  ko: KOREAN_FIRE_WATER,
  zh: CHINESE_FIRE_WATER,
  ar: ARABIC_FIRE_WATER,
  hi: HINDI_FIRE_WATER,
  sa: SANSKRIT_FIRE_WATER, // 追加
  la: LATIN_FIRE_WATER, // 追加
};

/**
 * 言語コードから火水分類を取得
 */
export function getLanguageFireWater(language: string): PhonemeClassification[] {
  return ALL_LANGUAGE_FIRE_WATER[language as keyof typeof ALL_LANGUAGE_FIRE_WATER] || [];
}

/**
 * 音素の火水タイプを取得
 */
export function getPhonemeType(phoneme: string, language: string): FireWaterType | undefined {
  const classifications = getLanguageFireWater(language);
  const found = classifications.find((c) => c.phoneme === phoneme);
  return found?.type;
}

/**
 * テキストの火水バランスを計算（多言語対応）
 */
export function calculateUniversalFireWaterBalance(
  text: string,
  language: string
): { fire: number; water: number; balance: number } {
  const classifications = getLanguageFireWater(language);
  let fire = 0;
  let water = 0;

  for (const char of text) {
    const classification = classifications.find((c) => c.phoneme === char);
    if (classification) {
      if (classification.type === "fire") {
        fire++;
      } else {
        water++;
      }
    }
  }

  const total = fire + water;
  const balance = total > 0 ? fire / total : 0.5;

  return { fire, water, balance };
}
