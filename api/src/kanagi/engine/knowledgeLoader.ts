/**
 * knowledgeLoader.ts — 天聞アーク知的資産ローダー
 * 
 * 全知的資産（言灵秘書・天津金木・カタカムナ）を読み込み、
 * LLMプロンプトに注入可能な形式で提供する中枢モジュール。
 * 
 * TENMON_KNOWLEDGE_LOADER_V1
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// === 型定義 ===
interface SoundMeaning {
  classification: string;
  element: string;
  polarity: string;
  position: string;
  meanings: string[];
  spiritual_origin: string;
}

interface SoundMeaningsData {
  meta: { title: string; source: string; authority: string };
  gojiuren: {
    structure: string;
    columns: Array<{ position: number; name: string; type: string; sounds: string[] }>;
  };
  sounds: Record<string, SoundMeaning>;
}

interface KanagiPattern {
  id: number;
  kana: string;
  row: string;
  vowel: string;
  movement: string;
  khs_meanings?: {
    classification: string;
    element: string;
    polarity: string;
    meanings: string[];
    spiritual_origin: string;
  };
}

// === データキャッシュ（起動時に一度だけ読み込み） ===
interface KatakamunUtaData {
  number: number;
  text: string;
  theme: string;
  keywords: string[];
}

interface Katakamuna80Data {
  meta: { title: string; source: string; layer: string };
  utas: KatakamunUtaData[];
}

let _soundMeanings: SoundMeaningsData | null = null;
let _kanagiPatterns: KanagiPattern[] | null = null;
let _katakamuna: Katakamuna80Data | null = null;
let _loadError: string | null = null;

function resolveDataPath(relativePath: string): string {
  // ESM環境でのパス解決
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    return join(__dirname, relativePath);
  } catch {
    // CJS fallback
    return join(__dirname, relativePath);
  }
}

function loadData(): void {
  if (_soundMeanings && _kanagiPatterns) return; // already loaded
  try {
    // soundMeanings.json — 言灵秘書原典データ
    const smPath = resolveDataPath("../../kanagi/patterns/soundMeanings.json");
    const smRaw = readFileSync(smPath, "utf-8");
    _soundMeanings = JSON.parse(smRaw) as SoundMeaningsData;

    // amatsuKanagi50Patterns.json — 天津金木50パターン
    const akPath = resolveDataPath("../../kanagi/patterns/amatsuKanagi50Patterns.json");
    const akRaw = readFileSync(akPath, "utf-8");
    const akData = JSON.parse(akRaw);
    _kanagiPatterns = (akData.patterns || akData) as KanagiPattern[];

    // katakamuna80.json — カタカムナ80首（写像レイヤー）
    try {
      const kkPath = resolveDataPath("../../../shared/katakamuna/katakamuna80.json");
      const kkRaw = readFileSync(kkPath, "utf-8");
      _katakamuna = JSON.parse(kkRaw) as Katakamuna80Data;
    } catch {
      // fallback paths
      for (const rel of ["../../shared/katakamuna/katakamuna80.json", "../../../../shared/katakamuna/katakamuna80.json"]) {
        try {
          const p = resolveDataPath(rel);
          const r = readFileSync(p, "utf-8");
          _katakamuna = JSON.parse(r) as Katakamuna80Data;
          break;
        } catch { continue; }
      }
    }

    console.log(`[KNOWLEDGE-LOADER] Loaded: ${Object.keys(_soundMeanings?.sounds || {}).length} sounds, ${_kanagiPatterns?.length || 0} patterns, ${_katakamuna?.utas?.length || 0} katakamuna utas`);
  } catch (e: any) {
    _loadError = e?.message || "unknown error";
    console.error(`[KNOWLEDGE-LOADER] Failed to load: ${_loadError}`);
  }
}

// 起動時にロード
loadData();

// === 公開API ===

/**
 * 特定の音の言灵秘書データを取得
 */
export function getSoundMeaning(kana: string): SoundMeaning | null {
  loadData();
  return _soundMeanings?.sounds?.[kana] ?? null;
}

/**
 * 入力テキストに含まれる全音の言灵秘書データを取得
 * 
 * 設計注記: soundMeanings.jsonは51音（10行×5列=50音+ン）を収録。
 * ヤ行イ・ヤ行エ・ワ行ウは複合キーで、天津金木パターンの構造データとして参照される。
 * テキスト解析時は、1文字ずつのマッチでア行のイ・エ・ウにフォールバックする（正しい動作）。
 */
export function analyzeSoundsInText(text: string): Array<{ kana: string; data: SoundMeaning }> {
  loadData();
  if (!_soundMeanings?.sounds) return [];
  
  const results: Array<{ kana: string; data: SoundMeaning }> = [];
  const seen = new Set<string>();
  
  // カタカナに変換して解析
  const katakana = toKatakana(text);
  
  for (const char of katakana) {
    if (seen.has(char)) continue;
    const data = _soundMeanings.sounds[char];
    if (data) {
      seen.add(char);
      results.push({ kana: char, data });
    }
  }
  
  return results;
}

/**
 * 特定の音の天津金木パターンを取得
 */
export function getKanagiPattern(kana: string): KanagiPattern | null {
  loadData();
  if (!_kanagiPatterns) return null;
  return _kanagiPatterns.find(p => p.kana === kana) ?? null;
}

/**
 * 入力テキストに含まれる全音の天津金木パターンを取得
 */
export function analyzeKanagiPatternsInText(text: string): KanagiPattern[] {
  loadData();
  if (!_kanagiPatterns) return [];
  
  const katakana = toKatakana(text);
  const seen = new Set<string>();
  const results: KanagiPattern[] = [];
  
  for (const char of katakana) {
    if (seen.has(char)) continue;
    const pattern = _kanagiPatterns.find(p => p.kana === char);
    if (pattern) {
      seen.add(char);
      results.push(pattern);
    }
  }
  
  return results;
}

/**
 * 五十連（十行五列）の構造テキストを生成
 */
export function getGojiurenStructure(): string {
  loadData();
  if (!_soundMeanings?.gojiuren) return "";
  
  const cols = _soundMeanings.gojiuren.columns;
  return cols.map(c => 
    `${c.name}（${c.type}）: ${c.sounds.join("・")}`
  ).join("\n");
}

/**
 * ドメイン質問に対する知的資産コンテキストを生成
 * — LLMプロンプトに注入するための統合テキスト
 */
export function buildKnowledgeContext(userMessage: string): string {
  loadData();
  
  const parts: string[] = [];
  
  // 1. 入力テキストの音解析
  const soundAnalysis = analyzeSoundsInText(userMessage);
  if (soundAnalysis.length > 0) {
    parts.push("【言灵秘書 — 入力音の解析】");
    for (const { kana, data } of soundAnalysis.slice(0, 10)) {
      const meanings = data.meanings.join("、");
      parts.push(`${kana}: ${data.classification}。${meanings}。${data.spiritual_origin}`);
    }
  }
  
  // 2. 天津金木パターン
  const patterns = analyzeKanagiPatternsInText(userMessage);
  if (patterns.length > 0) {
    parts.push("");
    parts.push("【天津金木 — 運動パターン】");
    for (const p of patterns.slice(0, 10)) {
      const khsInfo = p.khs_meanings 
        ? `（${p.khs_meanings.classification}、${p.khs_meanings.meanings.join("・")}）`
        : "";
      parts.push(`${p.kana}: ${p.row}行 母音=${p.vowel} 運動=${p.movement}${khsInfo}`);
    }
  }
  
  // 3. 五十連構造（ドメイン質問の場合のみ）
  if (/五十音|五十連|十行|水火十行|行.*灵/.test(userMessage)) {
    parts.push("");
    parts.push("【五十連十行の構造】");
    parts.push(getGojiurenStructure());
  }

  // 4. カタカムナ首の検索（カタカムナ関連質問の場合）
  if (/カタカムナ|かたかむな|ウタヒ|八十首|80首|ヒフミヨイ/.test(userMessage)) {
    const kkContext = buildKatakamunContext(userMessage);
    if (kkContext) {
      parts.push("");
      parts.push(kkContext);
    }
  }
  
  return parts.join("\n");
}

/**
 * 特定の行の全音データを取得（行の灵的性質を語るため）
 */
export function getRowSounds(rowName: string): Array<{ kana: string; data: SoundMeaning }> {
  loadData();
  if (!_soundMeanings?.sounds) return [];
  
  // 行名の正規化（カ行 → カ、サ行 → サ、etc.）
  const rowMap: Record<string, string[]> = {
    "ア": ["ア", "イ", "ウ", "エ", "オ"],
    "カ": ["カ", "キ", "ク", "ケ", "コ"],
    "サ": ["サ", "シ", "ス", "セ", "ソ"],
    "タ": ["タ", "チ", "ツ", "テ", "ト"],
    "ナ": ["ナ", "ニ", "ヌ", "ネ", "ノ"],
    "ハ": ["ハ", "ヒ", "フ", "ヘ", "ホ"],
    "マ": ["マ", "ミ", "ム", "メ", "モ"],
    "ヤ": ["ヤ", "ヤ行イ", "ユ", "ヤ行エ", "ヨ"],
    "ラ": ["ラ", "リ", "ル", "レ", "ロ"],
    "ワ": ["ワ", "ヰ", "ワ行ウ", "ヱ", "ヲ"],
  };
  
  // 行名を抽出
  const rowKey = rowName.replace(/行.*$/, "");
  const sounds = rowMap[rowKey];
  if (!sounds) return [];
  
  return sounds
    .map(kana => ({ kana, data: _soundMeanings!.sounds[kana] }))
    .filter((r): r is { kana: string; data: SoundMeaning } => !!r.data);
}

/**
 * 全知的資産の要約テキスト（システムプロンプト用）
 */
export function getKnowledgeSummary(): string {
  loadData();
  if (!_soundMeanings) return "";
  
  const cols = _soundMeanings.gojiuren?.columns || [];
  const summary = [
    "【言灵秘書原典 — 五十連十行の法則】",
    "五十音は天地の水火の流れを示す灵的な「音の地図」。右から左へ読む五列十行構造。",
    ...cols.map(c => `第${c.position}行「${c.name}」（${c.type}）: ${c.sounds.join("")}`),
    "",
    "【各音の灵的意味（言灵秘書原典準拠）】",
    "ア＝無にして有、五十連の総名、天、海。イ＝出息、命。ウ＝浮き昇る、動、生。エ＝枝葉、選。オ＝大、親、重。",
    "カ＝煇、上。キ＝気、木。ク＝組む、苦。ケ＝毛、気。コ＝凝る、子。",
    "サ＝去る、裂く。シ＝締まる、知。ス＝澄む、進。セ＝迫る、堰。ソ＝外、反。",
    "タ＝立つ、田。チ＝千、血、乳。ツ＝連なる、津。テ＝手、照。ト＝止まる、門。",
    "ナ＝並ぶ、名。ニ＝煮る、似。ヌ＝抜く、布。ネ＝根、音。ノ＝伸びる、野。",
    "ハ＝端、葉、母。ヒ＝火、灵、日。フ＝吹く、振。ヘ＝減る、経。ホ＝火の本、穂。",
    "マ＝間、真、目。ミ＝水、身、実。ム＝結ぶ、蒸。メ＝芽、女。モ＝藻、百、母。",
    "ヤ＝弥、矢。ヤ行イ＝入息の灵・完全内集（ア行イとワ行ヰの文）。ユ＝揺る、湯。ヤ行エ＝昼夜の胞衣・完全外発（ア行エとワ行ヱの文）。ヨ＝世、四。",
    "ラ＝螺旋。リ＝理、利。ル＝流る。レ＝連。ロ＝路、炉。",
    "ワ＝和、輪。ヰ＝居。ワ行ウ＝渦巻降の灵（ア行ウの対極）。ヱ＝恵。ヲ＝終、緒。ン＝凝縮、無声の結。",
    "",
    "【火水の法則】",
    "火（カ）＝外発・顕現・陽。水（ミ）＝内集・潜在・陰。",
    "正火（ハ行）は天地の根源火。煇火（カ行）は顕現の力。昇水（サ行）は上昇する水の灵。",
    "水中火（タ行）は水の中に潜む火。火水（ナ行）は火と水の結び。",
    "火中水（マ行）は火の中に潜む水。濁水（ラ行）は循環する水。水火（ワ行）は水と火の調和。",
  ];
  
  return summary.join("\n");
}

// === カタカムナ関連 ===

/**
 * カタカムナ首を番号で取得
 */
export function getKatakamunUta(utaNumber: number): KatakamunUtaData | null {
  loadData();
  if (!_katakamuna?.utas) return null;
  return _katakamuna.utas.find(u => u.number === utaNumber) ?? null;
}

/**
 * キーワードでカタカムナ首を検索
 */
export function searchKatakamunUtas(keyword: string): KatakamunUtaData[] {
  loadData();
  if (!_katakamuna?.utas) return [];
  const kw = keyword.trim();
  if (!kw) return [];
  return _katakamuna.utas.filter(
    u => u.text.includes(kw) || u.theme.includes(kw) || u.keywords.some(k => k.includes(kw))
  );
}

/**
 * カタカムナ関連質問のコンテキストを生成
 */
function buildKatakamunContext(userMessage: string): string {
  loadData();
  if (!_katakamuna?.utas || _katakamuna.utas.length === 0) return "";

  const parts: string[] = [];
  parts.push("【カタカムナウタヒ — 写像レイヤー】");
  parts.push("※カタカムナは写像レイヤーに属する。中枢語義は言灵秘書（KHS）が定義する。");

  // 番号指定の検出（第5首、5首目、etc.）
  const numMatch = userMessage.match(/(第|だい)?(\d{1,2})(首|しゅ|番)/);
  if (numMatch) {
    const num = parseInt(numMatch[2], 10);
    const uta = getKatakamunUta(num);
    if (uta) {
      parts.push("");
      parts.push(`第${uta.number}首: ${uta.text}`);
      parts.push(`主題: ${uta.theme}`);
      parts.push(`鍵語: ${uta.keywords.join("、")}`);
    }
  }

  // キーワード検索（神名や概念名）
  const kwCandidates = ["アマテラス", "イサナギ", "イサナミ", "ミナカヌシ", "ムスヒ", "ヒフミ",
    "オノコロ", "ヤマト", "イヤシロ", "フトマニ", "ヨモツ", "ウツシ", "カエシ",
    "トヨウケ", "ワクムスビ", "タカマカハラ", "イカツチ", "ミソギ", "イヤミソギ"];
  for (const kw of kwCandidates) {
    if (userMessage.includes(kw)) {
      const hits = searchKatakamunUtas(kw);
      if (hits.length > 0) {
        parts.push("");
        parts.push(`「${kw}」を含む首（${hits.length}件）:`);
        for (const h of hits.slice(0, 3)) {
          parts.push(`  第${h.number}首: ${h.text.slice(0, 80)}… [${h.theme}]`);
        }
      }
    }
  }

  // 一般的なカタカムナ質問の場合は第1首と第5首を提示
  if (parts.length <= 2) {
    const uta1 = getKatakamunUta(1);
    const uta5 = getKatakamunUta(5);
    if (uta1) {
      parts.push("");
      parts.push(`第1首（序歌）: ${uta1.text}`);
      parts.push(`  → ${uta1.theme}`);
    }
    if (uta5) {
      parts.push(`第5首（ヒフミ）: ${uta5.text}`);
      parts.push(`  → ${uta5.theme}`);
    }
    parts.push(`全80首を収録済み。`);
  }

  return parts.join("\n");
}

// === ユーティリティ ===

function toKatakana(text: string): string {
  return text.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}
