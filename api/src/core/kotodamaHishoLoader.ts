/**
 * KOTODAMA_HISHO_LOADER_V1
 * iroha_kotodama_hisho.json (275KB) を読み込み、
 * chat.ts の systemPrompt に注入する言霊秘書コンテキストを構築する。
 *
 * データ構造:
 *   { title: string, total_paragraphs: number, content: string[] }
 *   content は 1037 段落の配列（水穂伝・山口志道の現代語訳）
 *
 * 安全設計:
 *   - ファイルが無い場合はフォールバック（空文字列）
 *   - 起動時に1回だけ読み込み（キャッシュ）
 *   - 既存の chat.ts を破壊しない
 */
import { readFileSync, existsSync } from "fs";
import path from "path";

// ── パス定義 ──────────────────────────────────────
const HISHO_PATH = path.resolve(
  process.cwd(),
  "src/data/iroha_kotodama_hisho.json"
);
const HISHO_PATH_FALLBACK = "/opt/tenmon-ark-repo/api/src/data/iroha_kotodama_hisho.json";

// ── 型定義 ────────────────────────────────────────
export interface KotodamaHishoData {
  title: string;
  total_paragraphs: number;
  content: string[];
}

// ── 五十音→段落インデックスマッピング ────────────
// 言霊秘書の段落から、各音に関連する段落を事前にマッピングする
const IROHA_SOUND_MAP: Record<string, string[]> = {
  // いろは順の主要音とその関連キーワード
  "イ": ["イ", "伊", "意", "位", "委"],
  "ロ": ["ロ", "路", "露", "炉"],
  "ハ": ["ハ", "波", "葉", "母"],
  "ニ": ["ニ", "二", "仁", "似"],
  "ホ": ["ホ", "火", "帆", "穂"],
  "ヘ": ["ヘ", "辺", "経"],
  "ト": ["ト", "止", "登", "都"],
  "チ": ["チ", "知", "地", "血"],
  "リ": ["リ", "理", "利", "離"],
  "ヌ": ["ヌ", "奴"],
  "ル": ["ル", "流", "留"],
  "ヲ": ["ヲ", "遠", "尾"],
  "ワ": ["ワ", "和", "輪", "環"],
  "カ": ["カ", "加", "可", "火"],
  "ヨ": ["ヨ", "与", "世", "代"],
  "タ": ["タ", "多", "太", "田"],
  "レ": ["レ", "礼", "列"],
  "ソ": ["ソ", "曽", "素"],
  "ツ": ["ツ", "津", "都"],
  "ネ": ["ネ", "根", "音"],
  "ナ": ["ナ", "那", "名", "奈"],
  "ラ": ["ラ", "良", "羅"],
  "ム": ["ム", "武", "無"],
  "ウ": ["ウ", "宇", "有", "烏"],
  "ヰ": ["ヰ", "井", "居"],
  "ノ": ["ノ", "乃", "能"],
  "オ": ["オ", "於", "緒"],
  "ク": ["ク", "久", "九", "苦"],
  "ヤ": ["ヤ", "也", "矢", "八"],
  "マ": ["マ", "万", "真", "間"],
  "ケ": ["ケ", "計", "気"],
  "フ": ["フ", "不", "布", "風"],
  "コ": ["コ", "己", "古", "子"],
  "エ": ["エ", "衣", "江", "恵"],
  "テ": ["テ", "天", "手"],
  "ア": ["ア", "阿", "安", "天"],
  "サ": ["サ", "左", "佐", "差"],
  "キ": ["キ", "幾", "木", "気"],
  "ユ": ["ユ", "由", "遊"],
  "メ": ["メ", "女", "目"],
  "ミ": ["ミ", "美", "三", "水"],
  "シ": ["シ", "之", "志", "四"],
  "ヱ": ["ヱ", "恵"],
  "ヒ": ["ヒ", "比", "日", "火"],
  "モ": ["モ", "毛", "母"],
  "セ": ["セ", "世", "勢"],
  "ス": ["ス", "須", "寸"],
  // 五十音の行
  "ア行": ["ア行", "天", "五十連", "惣名"],
  "カ行": ["カ行", "火"],
  "サ行": ["サ行"],
  "タ行": ["タ行"],
  "ナ行": ["ナ行"],
  "ハ行": ["ハ行"],
  "マ行": ["マ行"],
  "ヤ行": ["ヤ行", "人"],
  "ラ行": ["ラ行"],
  "ワ行": ["ワ行", "地", "国土"],
};

// ── キャッシュ ────────────────────────────────────
let _hishoCache: KotodamaHishoData | null = null;
let _paragraphIndex: Map<string, number[]> | null = null;

/**
 * 言霊秘書 JSON を読み込む（起動時1回、以降キャッシュ）
 */
export function loadKotodamaHisho(): KotodamaHishoData | null {
  if (_hishoCache) return _hishoCache;

  const tryPath = existsSync(HISHO_PATH) ? HISHO_PATH : HISHO_PATH_FALLBACK;

  if (!existsSync(tryPath)) {
    console.warn(
      `[KOTODAMA_HISHO] iroha_kotodama_hisho.json not found at ${HISHO_PATH} or ${HISHO_PATH_FALLBACK}`
    );
    return null;
  }

  try {
    const raw = readFileSync(tryPath, "utf-8");
    _hishoCache = JSON.parse(raw) as KotodamaHishoData;
    console.log(
      `[KOTODAMA_HISHO] loaded: ${_hishoCache.title} (${_hishoCache.total_paragraphs} paragraphs)`
    );
    return _hishoCache;
  } catch (e: any) {
    console.error(`[KOTODAMA_HISHO] load failed: ${e?.message}`);
    return null;
  }
}

/**
 * 段落インデックスを構築する（キーワード→段落番号のマッピング）
 */
function buildParagraphIndex(): Map<string, number[]> {
  if (_paragraphIndex) return _paragraphIndex;

  const data = loadKotodamaHisho();
  if (!data) {
    _paragraphIndex = new Map();
    return _paragraphIndex;
  }

  _paragraphIndex = new Map();

  for (let i = 0; i < data.content.length; i++) {
    const para = data.content[i];
    // 各音のキーワードで段落をインデックス
    for (const [sound, keywords] of Object.entries(IROHA_SOUND_MAP)) {
      for (const kw of keywords) {
        if (para.includes(kw)) {
          const existing = _paragraphIndex.get(sound) || [];
          if (!existing.includes(i)) {
            existing.push(i);
            _paragraphIndex.set(sound, existing);
          }
        }
      }
    }
  }

  return _paragraphIndex;
}

/**
 * ユーザーメッセージから関連する音を抽出する
 * - ひらがな・カタカナの個別文字を抽出
 * - 五十音の行名を検出
 * - 言霊関連キーワードを検出
 */
export function extractSoundsFromMessage(message: string): string[] {
  const sounds: string[] = [];
  const seen = new Set<string>();

  // カタカナ1文字を抽出
  const katakanaRegex = /[\u30A1-\u30F6]/g;
  const katakanaMatches = message.match(katakanaRegex);
  if (katakanaMatches) {
    for (const char of katakanaMatches) {
      if (!seen.has(char)) {
        seen.add(char);
        sounds.push(char);
      }
    }
  }

  // ひらがなをカタカナに変換して抽出
  const hiraganaRegex = /[\u3041-\u3096]/g;
  const hiraganaMatches = message.match(hiraganaRegex);
  if (hiraganaMatches) {
    for (const char of hiraganaMatches) {
      const katakana = String.fromCharCode(char.charCodeAt(0) + 0x60);
      if (!seen.has(katakana)) {
        seen.add(katakana);
        sounds.push(katakana);
      }
    }
  }

  // 行名の検出
  const gyouPattern = /([アカサタナハマヤラワ])行/g;
  let match;
  while ((match = gyouPattern.exec(message)) !== null) {
    const gyouKey = match[1] + "行";
    if (!seen.has(gyouKey)) {
      seen.add(gyouKey);
      sounds.push(gyouKey);
    }
  }

  // 特定の言霊キーワード
  const kotodamaKeywords = [
    "水火", "イキ", "正中", "まなか", "五十連", "五十音",
    "言霊", "ことだま", "いろは", "天津金木",
  ];
  for (const kw of kotodamaKeywords) {
    if (message.includes(kw) && !seen.has(kw)) {
      seen.add(kw);
      sounds.push(kw);
    }
  }

  return sounds;
}

/**
 * 言霊秘書コンテキストを構築する
 * ユーザーメッセージから抽出した音に関連する段落を選択し、
 * systemPrompt に注入するテキストを生成する。
 *
 * @param sounds - extractSoundsFromMessage() の結果
 * @param maxChars - 最大文字数（デフォルト: 2000）
 */
export function buildKotodamaHishoContext(
  sounds: string[],
  maxChars = 2000
): string {
  if (sounds.length === 0) return "";

  const data = loadKotodamaHisho();
  if (!data || data.content.length === 0) return "";

  const index = buildParagraphIndex();
  if (index.size === 0) return "";

  // 関連段落を収集（重複排除、最大10段落）
  const relevantParagraphs: Array<{ sound: string; paraIdx: number; text: string }> = [];
  const seenParas = new Set<number>();

  for (const sound of sounds) {
    const paraIndices = index.get(sound);
    if (!paraIndices) continue;

    for (const idx of paraIndices) {
      if (seenParas.has(idx)) continue;
      if (relevantParagraphs.length >= 10) break;

      seenParas.add(idx);
      relevantParagraphs.push({
        sound,
        paraIdx: idx,
        text: data.content[idx],
      });
    }
    if (relevantParagraphs.length >= 10) break;
  }

  if (relevantParagraphs.length === 0) return "";

  // コンテキスト文字列を構築
  let context = "【言霊秘書 (水穂伝・山口志道) 参照】\n\n";
  let charsUsed = context.length;

  for (const entry of relevantParagraphs) {
    const block = `◆ 関連音「${entry.sound}」(§${entry.paraIdx + 1})\n${entry.text}\n\n`;
    if (charsUsed + block.length > maxChars) break;
    context += block;
    charsUsed += block.length;
  }

  context += "[引用: doc=KHS (iroha_kotodama_hisho), 言霊秘書・水穂伝]";
  return context;
}

/**
 * 言霊秘書の概要コンテキスト（常時注入用、短縮版）
 * 特定の音が検出されなくても、言霊秘書の基本概念を提供する。
 */
export function buildKotodamaHishoOverview(): string {
  const data = loadKotodamaHisho();
  if (!data) return "";

  return `【言霊秘書 (KHS) 基盤知識】
本体系は山口志道『水穂伝（みずほのつたえ）』に基づく。
いろは四十七音は、空海が日本書紀神代巻より選出した形仮名であり、
表面は涅槃経「諸行無常」の四句の心を表し、
内部には天地開闢の法則を含む。
五十音は天地自然の息づかいを形として目に見えるようにしたものである。
[引用: doc=KHS (iroha_kotodama_hisho)]`;
}
