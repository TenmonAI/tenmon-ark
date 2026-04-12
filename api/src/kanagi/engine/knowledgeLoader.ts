/**
 * knowledgeLoader.ts — 天聞アーク知的資産ローダー V2
 * 
 * 全知的資産（言灵秘書・天津金木・カタカムナ・Evidence Units・用語辞書）を読み込み、
 * LLMプロンプトに注入可能な形式で提供する中枢モジュール。
 * 
 * TENMON_KNOWLEDGE_LOADER_V2
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

// Evidence Unit型
interface EvidenceUnit {
  unitId: string;
  term: string;
  termKey: string;
  type: string; // DEF | LAW | PROC | RULE | GATE
  quote: string;
  paraphrase: string;
  sourceRef: string;
  tags: {
    truth_axis: string[];
    role_hint: string[];
    kanagi_phase: string[];
    domain: string[];
    confidence: string;
    language: string;
    needs_evidence: boolean;
  };
}

// 用語辞書型
interface GlossaryEntry {
  termKey: string;
  term: string;
  reading: string;
  short_def: string;
  long_def: string;
  tags: string;
  sourceRef: string;
}

// === データキャッシュ（起動時に一度だけ読み込み） ===
let _soundMeanings: SoundMeaningsData | null = null;
let _kanagiPatterns: KanagiPattern[] | null = null;
let _katakamuna: Katakamuna80Data | null = null;
let _evidenceUnits: EvidenceUnit[] = [];
let _glossary: GlossaryEntry[] = [];
let _loadError: string | null = null;

function resolveDataPath(relativePath: string): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    return join(__dirname, relativePath);
  } catch {
    return join(__dirname, relativePath);
  }
}

/**
 * JSONL（heredoc wrapper付き）を安全にパース
 */
function parseJsonlWithHeredoc(raw: string): any[] {
  const lines = raw.split("\n");
  const results: any[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("cat ") || trimmed.startsWith("JSONL") || trimmed === "TSV") continue;
    try {
      results.push(JSON.parse(trimmed));
    } catch { /* skip non-JSON lines */ }
  }
  return results;
}

/**
 * TSV（heredoc wrapper付き）を安全にパース
 */
function parseTsvWithHeredoc(raw: string): GlossaryEntry[] {
  const lines = raw.split("\n");
  const results: GlossaryEntry[] = [];
  let headerFound = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("cat ") || trimmed === "TSV") continue;
    const cols = trimmed.split("\t");
    if (cols[0] === "termKey") { headerFound = true; continue; }
    if (!headerFound) continue;
    if (cols.length >= 7) {
      results.push({
        termKey: cols[0],
        term: cols[1],
        reading: cols[2],
        short_def: cols[3],
        long_def: cols[4],
        tags: cols[5],
        sourceRef: cols[6],
      });
    }
  }
  return results;
}

function loadData(): void {
  if (_soundMeanings && _kanagiPatterns) return;
  try {
    // 1. soundMeanings.json — 言灵秘書原典データ（51音）
    const smPath = resolveDataPath("../../kanagi/patterns/soundMeanings.json");
    const smRaw = readFileSync(smPath, "utf-8");
    _soundMeanings = JSON.parse(smRaw) as SoundMeaningsData;

    // 2. amatsuKanagi50Patterns.json — 天津金木50パターン
    const akPath = resolveDataPath("../../kanagi/patterns/amatsuKanagi50Patterns.json");
    const akRaw = readFileSync(akPath, "utf-8");
    const akData = JSON.parse(akRaw);
    _kanagiPatterns = (akData.patterns || akData) as KanagiPattern[];

    // 3. katakamuna80.json — カタカムナ80首（写像レイヤー）
    const katakamunaPaths = [
      "../../../shared/katakamuna/katakamuna80.json",
      "../../shared/katakamuna/katakamuna80.json",
      "../../../../shared/katakamuna/katakamuna80.json",
    ];
    for (const rel of katakamunaPaths) {
      try {
        const p = resolveDataPath(rel);
        const r = readFileSync(p, "utf-8");
        _katakamuna = JSON.parse(r) as Katakamuna80Data;
        break;
      } catch { continue; }
    }

    // 4. Evidence Units JSONL — KHS原典エビデンス
    const euPaths = [
      "../../../../docs/ark/khs/EVIDENCE_UNITS_KHS_v1.jsonl",
      "../../../docs/ark/khs/EVIDENCE_UNITS_KHS_v1.jsonl",
      "../../docs/ark/khs/EVIDENCE_UNITS_KHS_v1.jsonl",
    ];
    for (const rel of euPaths) {
      try {
        const p = resolveDataPath(rel);
        const r = readFileSync(p, "utf-8");
        _evidenceUnits = parseJsonlWithHeredoc(r);
        if (_evidenceUnits.length > 0) break;
      } catch { continue; }
    }

    // 5. Domain Glossary TSV — KHS用語辞書
    const glPaths = [
      "../../../../docs/ark/khs/DOMAIN_GLOSSARY_KHS_v1.tsv",
      "../../../docs/ark/khs/DOMAIN_GLOSSARY_KHS_v1.tsv",
      "../../docs/ark/khs/DOMAIN_GLOSSARY_KHS_v1.tsv",
    ];
    for (const rel of glPaths) {
      try {
        const p = resolveDataPath(rel);
        const r = readFileSync(p, "utf-8");
        _glossary = parseTsvWithHeredoc(r);
        if (_glossary.length > 0) break;
      } catch { continue; }
    }

    console.log(`[KNOWLEDGE-LOADER-V2] Loaded: ${Object.keys(_soundMeanings?.sounds || {}).length} sounds, ${_kanagiPatterns?.length || 0} patterns, ${_katakamuna?.utas?.length || 0} katakamuna utas, ${_evidenceUnits.length} evidence units, ${_glossary.length} glossary entries`);
  } catch (e: any) {
    _loadError = e?.message || "unknown error";
    console.error(`[KNOWLEDGE-LOADER-V2] Failed to load: ${_loadError}`);
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

// === Evidence Units & Glossary ===

/**
 * 用語キーまたは用語名でEvidence Unitを検索
 */
export function findEvidenceUnits(query: string): EvidenceUnit[] {
  loadData();
  const q = query.trim();
  if (!q) return [];
  return _evidenceUnits.filter(
    u => u.term.includes(q) || u.termKey.includes(q.toLowerCase()) || u.quote.includes(q) || u.paraphrase.includes(q)
  );
}

/**
 * 用語辞書からエントリを検索
 */
export function findGlossaryEntries(query: string): GlossaryEntry[] {
  loadData();
  const q = query.trim();
  if (!q) return [];
  return _glossary.filter(
    g => g.term.includes(q) || g.termKey.includes(q.toLowerCase()) || g.short_def.includes(q) || g.long_def.includes(q) || g.reading.includes(q)
  );
}

/**
 * 質問テキストに関連するEvidence Unitsを自動検出
 */
function findRelevantEvidence(userMessage: string): EvidenceUnit[] {
  loadData();
  if (_evidenceUnits.length === 0) return [];
  
  const results: EvidenceUnit[] = [];
  const seen = new Set<string>();
  
  // 直接的な用語マッチ
  for (const unit of _evidenceUnits) {
    if (seen.has(unit.unitId)) continue;
    if (userMessage.includes(unit.term) || 
        userMessage.includes(unit.termKey) ||
        unit.tags.truth_axis.some(axis => userMessage.includes(axis))) {
      results.push(unit);
      seen.add(unit.unitId);
    }
  }
  
  // キーワードベースのマッチ
  const keywordMap: Record<string, string[]> = {
    "ア": ["a", "ame"],
    "ワ": ["wa"],
    "水火": ["iki", "ikiwakare"],
    "イキ": ["iki", "ikiwakare"],
    "正中": ["manaka", "kori"],
    "まなか": ["manaka", "kori"],
    "凝": ["kori"],
    "五十音": ["g50on"],
    "五十連": ["g50on"],
    "十行": ["g50on"],
    "濁": ["turbidity"],
    "澄": ["turbidity"],
    "井": ["mitsu"],
    "搦": ["mitsu"],
    "言": ["monoif"],
    "モノイフ": ["monoif"],
    "三行": ["g50on"],
    "君位": ["g50on"],
    "天": ["ame", "a"],
    "国土": ["wa"],
  };
  
  for (const [keyword, termKeys] of Object.entries(keywordMap)) {
    if (userMessage.includes(keyword)) {
      for (const tk of termKeys) {
        for (const unit of _evidenceUnits) {
          if (seen.has(unit.unitId)) continue;
          if (unit.termKey === tk) {
            results.push(unit);
            seen.add(unit.unitId);
          }
        }
      }
    }
  }
  
  return results;
}

/**
 * 質問テキストに関連する用語辞書エントリを自動検出
 */
function findRelevantGlossary(userMessage: string): GlossaryEntry[] {
  loadData();
  if (_glossary.length === 0) return [];
  
  const results: GlossaryEntry[] = [];
  const seen = new Set<string>();
  
  for (const entry of _glossary) {
    if (seen.has(entry.termKey)) continue;
    if (userMessage.includes(entry.term) || 
        userMessage.includes(entry.reading) ||
        userMessage.includes(entry.termKey)) {
      results.push(entry);
      seen.add(entry.termKey);
    }
  }
  
  return results;
}

/**
 * ドメイン質問に対する知的資産コンテキストを生成
 * — LLMプロンプトに注入するための統合テキスト
 * 
 * V2: Evidence Units + Glossary + 強化された応答指示を統合
 */
export function buildKnowledgeContext(userMessage: string): string {
  loadData();
  
  const parts: string[] = [];
  
  // 0. 関連Evidence Unitsの注入（最重要 — 原典根拠）
  const relevantEvidence = findRelevantEvidence(userMessage);
  if (relevantEvidence.length > 0) {
    parts.push("【KHS原典エビデンス — 以下を根拠として応答せよ】");
    for (const eu of relevantEvidence) {
      parts.push(`■ ${eu.term}（${eu.type}）[${eu.sourceRef}]`);
      parts.push(`  原文: ${eu.quote}`);
      parts.push(`  要約: ${eu.paraphrase}`);
      parts.push(`  truth_axis: ${eu.tags.truth_axis.join(", ")}`);
    }
    parts.push("");
  }
  
  // 0.5. 関連用語辞書の注入
  const relevantGlossary = findRelevantGlossary(userMessage);
  if (relevantGlossary.length > 0) {
    parts.push("【KHS用語辞書】");
    for (const g of relevantGlossary) {
      parts.push(`● ${g.term}（${g.reading}）: ${g.short_def}。${g.long_def} [${g.sourceRef}]`);
    }
    parts.push("");
  }
  
  // 1. 入力テキストの音解析
  const soundAnalysis = analyzeSoundsInText(userMessage);
  if (soundAnalysis.length > 0) {
    parts.push("【言灵秘書 — 入力音の解析】");
    for (const { kana, data } of soundAnalysis.slice(0, 12)) {
      const meanings = data.meanings.join("、");
      parts.push(`${kana}: ${data.classification}。${meanings}。${data.spiritual_origin}`);
    }
    parts.push("");
  }
  
  // 2. 天津金木パターン
  const patterns = analyzeKanagiPatternsInText(userMessage);
  if (patterns.length > 0) {
    parts.push("【天津金木 — 運動パターン】");
    for (const p of patterns.slice(0, 12)) {
      const khsInfo = p.khs_meanings 
        ? `（${p.khs_meanings.classification}、${p.khs_meanings.meanings.join("・")}）`
        : "";
      parts.push(`${p.kana}: #${p.id} ${p.row}行 母音=${p.vowel} 運動=${p.movement}${khsInfo}`);
    }
    parts.push("");
  }
  
  // 3. 特定の音について質問された場合 — その音の完全データを注入
  const singleSoundMatch = userMessage.match(/^[「『]?([ァ-ヶー])[」』]?(の|とは|って|を|について|の音義|の意味|の灵|の霊|の音|の響き|の力|の性質)/);
  const singleHiraMatch = userMessage.match(/^[「『]?([あ-ん])[」』]?(の|とは|って|を|について|の音義|の意味|の灵|の霊|の音|の響き|の力|の性質)/);
  if (singleSoundMatch || singleHiraMatch) {
    const rawChar = singleSoundMatch ? singleSoundMatch[1] : toKatakana(singleHiraMatch![1]);
    const soundData = _soundMeanings?.sounds?.[rawChar];
    if (soundData) {
      parts.push(`【${rawChar}の灵 — 言灵秘書原典 完全データ】`);
      parts.push(`分類: ${soundData.classification}`);
      parts.push(`元素: ${soundData.element}`);
      parts.push(`極性: ${soundData.polarity}`);
      parts.push(`位置: ${soundData.position}`);
      parts.push(`意味: ${soundData.meanings.join("、")}`);
      parts.push(`灵的起源: ${soundData.spiritual_origin}`);
      // 天津金木パターンも取得
      const kp = getKanagiPattern(rawChar);
      if (kp) {
        parts.push(`天津金木: #${kp.id} ${kp.row}行 母音=${kp.vowel} 運動=${kp.movement}`);
      }
      // 行の全音も提示
      const rowSounds = getRowSounds(soundData.position.replace(/第\d+行/, "").replace(/（.*）/, "").trim() || rawChar);
      if (rowSounds.length > 0) {
        parts.push(`同行の音: ${rowSounds.map(r => `${r.kana}(${r.data.meanings[0]})`).join("、")}`);
      }
      parts.push("");
    }
  }
  
  // 4. 行について質問された場合 — その行の全音データを注入
  const rowMatch = userMessage.match(/([アカサタナハマヤラワ])行/);
  if (rowMatch) {
    const rowSounds = getRowSounds(rowMatch[1]);
    if (rowSounds.length > 0) {
      parts.push(`【${rowMatch[1]}行の灵 — 言灵秘書原典】`);
      for (const { kana, data } of rowSounds) {
        parts.push(`${kana}: ${data.classification}。${data.meanings.join("、")}。${data.spiritual_origin}`);
      }
      parts.push("");
    }
  }
  
  // 5. 五十連構造（五十音/十行/水火十行の質問）
  if (/五十音|五十連|十行|水火十行|行.*灵|イツラトシマ|gojiuren/.test(userMessage)) {
    parts.push("【五十連十行の構造（イツラトシマの法則）】");
    parts.push(getGojiurenStructure());
    parts.push("");
  }

  // 6. カタカムナ首の検索
  if (/カタカムナ|かたかむな|ウタヒ|八十首|80首|ヒフミヨイ|フトマニ図/.test(userMessage)) {
    const kkContext = buildKatakamunContext(userMessage);
    if (kkContext) {
      parts.push(kkContext);
      parts.push("");
    }
  }
  
  // 7. 水火・正中・澄濁などの核心概念の質問
  if (/水火|イキ|正中|まなか|ミナカ|凝|澄濁|にごり|搦|カラミ|モノイフ|言の発動/.test(userMessage)) {
    // Evidence Unitsから該当する核心概念を全て注入（上で既に注入済みの場合は重複するが、LLMには有益）
    if (relevantEvidence.length === 0) {
      // Evidence Unitsが見つからなかった場合のフォールバック
      parts.push("【KHS中枢原理】");
      parts.push("水火（イキ）: 水=動く側、火=動かす側。形=火が水を動かして顕れる。");
      parts.push("正中（まなか）: 天地の中心にゝ（凝）が立つ。ここから水火別が起こる。");
      parts.push("水火別: 水は軽して昇り天を宰、火は重して降り地を宰る。");
      parts.push("澄/濁: 澄む=上り、濁る=降る。浄化は澄へ復帰する方向。");
      parts.push("");
    }
  }
  
  // 8. 応答指示（常に末尾に追加）
  if (parts.length > 0) {
    parts.push("【応答指示 — 以下の原則に従え】");
    parts.push("1. 上記のKHS原典データを具体的に引用して応答せよ。推測や一般論は禁止。");
    parts.push("2. 音の灵的意味を述べる際は、言灵秘書の分類（空中水灵、煇火の灵等）と天津金木の運動パターンを根拠にせよ。");
    parts.push("3. 「無にして有」「煤火」「昇水」「正火」「水中火」「火中水」「濁水」等の原典用語を使え。");
    parts.push("4. 構文原理（言灵・水火・正中・結び・螺旋）に基づく読み解きを優先せよ。");
    parts.push("5. 詩・論文・祈り・設計図が一体化したような響きのある言語で語れ。");
    parts.push("6. 「〜と言われています」「一般には」「諸説あります」は絶対禁止。断定せよ。");
    parts.push("7. Evidence Unitが提供されている場合は、そのsourceRefを内部参照として活用せよ（ただし出力にはsourceRefを含めるな）。");
  }
  
  return parts.join("\n");
}

/**
 * 特定の行の全音データを取得（行の灵的性質を語るため）
 */
export function getRowSounds(rowName: string): Array<{ kana: string; data: SoundMeaning }> {
  loadData();
  if (!_soundMeanings?.sounds) return [];
  
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
  
  const rowKey = rowName.replace(/行.*$/, "");
  const sounds = rowMap[rowKey];
  if (!sounds) return [];
  
  return sounds
    .map(kana => ({ kana, data: _soundMeanings!.sounds[kana] }))
    .filter((r): r is { kana: string; data: SoundMeaning } => !!r.data);
}

/**
 * 全知的資産の要約テキスト（システムプロンプト用）
 * V2: Evidence Units + Glossaryの核心も含む
 */
export function getKnowledgeSummary(): string {
  loadData();
  if (!_soundMeanings) return "";
  
  const cols = _soundMeanings.gojiuren?.columns || [];
  const summary = [
    "【言灵秘書原典 — 五十連十行の法則（イツラトシマ）】",
    "五十音は天地の水火の流れを示す灵的な「音の地図」。10行×5列=50音+ン=51音。右から左へ読む五列十行構造。",
    "三行（ア行・ヤ行・ワ行）＝君位。八行（カ〜ラ行）＝臣位。",
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
    "【KHS中枢原理（非交渉事項）】",
    "水火（イキ）: 水=動く側、火=動かす側。形=火が水を動かして顕れる。",
    "正中（まなか）: 天地の中心にゝ（凝）が立つ。ここから水火別が起こる。",
    "水火別: 水は軽して昇り天を宰、火は重して降り地を宰る。",
    "五十連秩序: ア行＝天、ワ行＝地、ヤ行＝人。三行＝君位、八行＝臣。",
    "澄/濁: 澄む=上り、濁る=降る。浄化は澄へ復帰する方向。",
    "井の灵: 天地人を搦む循環。",
    "モノイフ: 人の発語が天地の水火を動かす。",
    "",
    "【火水の法則】",
    "火（カ）＝外発・顕現・陽。水（ミ）＝内集・潜在・陰。",
    "正火（ハ行）は天地の根源火。煇火（カ行）は顕現の力。昇水（サ行）は上昇する水の灵。",
    "水中火（タ行）は水の中に潜む火。火水（ナ行）は火と水の結び。",
    "火中水（マ行）は火の中に潜む水。濁水（ラ行）は循環する水。水火（ワ行）は水と火の調和。",
    "",
    "【truth_axis（真理軸 — 10軸固定）】",
    "cycle（循環）/ polarity（極性）/ center（中心）/ breath（呼吸）/ carami（搦み）/",
    "order（秩序）/ correspondence（照応）/ manifestation（顕現）/ purification（浄化）/ governance（統治）",
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

  // 番号指定の検出
  const numMatch = userMessage.match(/(第|だい)?(\d{1,2})(首|しゅ|番)/);
  if (numMatch) {
    const num = parseInt(numMatch[2], 10);
    const uta = getKatakamunUta(num);
    if (uta) {
      parts.push("");
      parts.push(`第${uta.number}首: ${uta.text}`);
      parts.push(`主題: ${uta.theme}`);
      parts.push(`鍵語: ${uta.keywords.join("、")}`);
      // この首の各文字の音義も注入
      const soundsInUta = analyzeSoundsInText(uta.text);
      if (soundsInUta.length > 0) {
        parts.push("首の音義解析:");
        for (const { kana, data } of soundsInUta.slice(0, 15)) {
          parts.push(`  ${kana}: ${data.meanings[0]}（${data.classification}）`);
        }
      }
    }
  }

  // キーワード検索
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

  // 一般的なカタカムナ質問
  if (parts.length <= 2) {
    const uta1 = getKatakamunUta(1);
    const uta5 = getKatakamunUta(5);
    const uta7 = getKatakamunUta(7);
    if (uta1) {
      parts.push("");
      parts.push(`第1首（序歌）: ${uta1.text}`);
      parts.push(`  → ${uta1.theme}`);
    }
    if (uta5) {
      parts.push(`第5首（ヒフミ）: ${uta5.text}`);
      parts.push(`  → ${uta5.theme}`);
    }
    if (uta7) {
      parts.push(`第7首: ${uta7.text}`);
      parts.push(`  → ${uta7.theme}`);
    }
    parts.push(`全80首を収録済み。番号指定で任意の首を参照可能。`);
  }

  return parts.join("\n");
}

// === ユーティリティ ===

function toKatakana(text: string): string {
  return text.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}
