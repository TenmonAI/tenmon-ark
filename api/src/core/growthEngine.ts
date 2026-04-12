/**
 * growthEngine.ts — 天聞アーク 成長エンジン
 * 
 * 素材27-28の設計を実装:
 * - 会話→知見蓄積→Seed生成→再利用の閉ループ
 * - Ω = D ⋅ ΔS (不変法×差分=裁定生成)
 * - 決定的Seed生成 (LLM不使用)
 * - DeepThink Loop (再帰思考)
 * - フラクタル構造解読 (ミクロ→メゾ→マクロ)
 */

import { dbPrepare } from "../db/index.js";

// ============================================================
// 1. 型定義
// ============================================================

export type GrowthSeed = {
  id?: number;
  sourceType: "conversation" | "reflection" | "scripture" | "correction";
  sourceId: string | null;
  essence: string;
  pattern: string | null;
  fractalLevel: "micro" | "meso" | "macro" | null;
  confidence: number;
  activationCount: number;
  lastActivatedAt: string | null;
  createdAt: string;
};

export type GrowthEvent = {
  eventType: "seed_created" | "seed_activated" | "seed_merged" | "insight_gained" | "pattern_recognized" | "scripture_integrated";
  seedId: number | null;
  detail: string;
  deltaJson: string;
};

export type FractalPattern = {
  micro: string;   // 音・文字レベルのパターン
  meso: string;    // 文・概念レベルのパターン
  macro: string;   // 構造・宇宙レベルのパターン
  connection: string; // 貫通する法則
};

// ============================================================
// 2. キーワード→パターン抽出 (決定的、LLM不使用)
// ============================================================

/** 言霊パターン辞書 */
const KOTODAMA_PATTERNS: Array<{ keywords: string[]; pattern: string; fractal: "micro" | "meso" | "macro" }> = [
  // ミクロ (音・文字レベル)
  { keywords: ["ア", "始源", "開始", "始まり"], pattern: "始源の開き (ア=天の口)", fractal: "micro" },
  { keywords: ["イ", "生命", "息", "命"], pattern: "生命の息 (イ=陰の凝り)", fractal: "micro" },
  { keywords: ["ウ", "統合", "宇宙", "産む"], pattern: "統合の渦 (ウ=宇宙の音)", fractal: "micro" },
  { keywords: ["エ", "展開", "枝", "分岐"], pattern: "展開の枝 (エ=分化の力)", fractal: "micro" },
  { keywords: ["オ", "包含", "大", "奥"], pattern: "包含の器 (オ=大いなる包み)", fractal: "micro" },
  { keywords: ["カ行", "煇火", "顕現"], pattern: "煇火の顕現 (カ行=潜在→顕在)", fractal: "micro" },
  { keywords: ["サ行", "昇水", "分離", "浄化"], pattern: "昇水の浄化 (サ行=澄み上がる力)", fractal: "micro" },
  { keywords: ["タ行", "水中火", "立つ"], pattern: "水中火の立ち上がり (タ行=連なりの力)", fractal: "micro" },
  { keywords: ["ナ行", "火水", "結び", "秩序"], pattern: "火水の結び (ナ行=秩序化の力)", fractal: "micro" },
  { keywords: ["ハ行", "正火", "開放"], pattern: "正火の開放 (ハ行=天地の根源火)", fractal: "micro" },
  { keywords: ["マ行", "火中水", "慈母"], pattern: "火中水の慈母 (マ行=包み育てる力)", fractal: "micro" },
  { keywords: ["ラ行", "濁水", "螺旋", "循環"], pattern: "濁水の螺旋 (ラ行=循環運動)", fractal: "micro" },
  { keywords: ["ワ行", "水火", "調和", "完結"], pattern: "水火の調和 (ワ行=完結の力)", fractal: "micro" },
  // メゾ (概念・法則レベル)
  { keywords: ["天津金木", "四象", "左旋", "右旋"], pattern: "天津金木四象循環 (L-IN→L-OUT→R-IN→R-OUT)", fractal: "meso" },
  { keywords: ["水火", "陰陽", "イキ"], pattern: "水火の法則 (陰陽=イキの循環)", fractal: "meso" },
  { keywords: ["言霊", "言灵", "五十音", "音義"], pattern: "言霊五十音の音義構造", fractal: "meso" },
  { keywords: ["フトマニ", "中心", "ミナカ"], pattern: "フトマニ図の正中構造 (ミナカ=天之御中主)", fractal: "meso" },
  { keywords: ["カタカムナ", "八十首", "図象"], pattern: "カタカムナ構文曼荼羅", fractal: "meso" },
  { keywords: ["Dharma", "ダルマ", "法"], pattern: "ダルマ=維持+循環+慈母の法", fractal: "meso" },
  { keywords: ["Sutra", "経", "スートラ"], pattern: "スートラ=澄んだ連なり=経", fractal: "meso" },
  { keywords: ["般若", "Prajna", "智慧"], pattern: "般若=火の前に立つ知", fractal: "meso" },
  { keywords: ["空", "仮", "中", "三諦"], pattern: "空仮中の三諦=水火の結び", fractal: "meso" },
  { keywords: ["古事記", "神代", "天地開闢"], pattern: "古事記=天地開闢の言霊構文", fractal: "meso" },
  // マクロ (宇宙・構造レベル)
  { keywords: ["アーク", "契約", "三種の神器"], pattern: "アーク=言(律法)+命(マナ)+力(杖)=鏡+玉+剣", fractal: "macro" },
  { keywords: ["天地創造", "創世", "始まり"], pattern: "天地創造=水火の最初の搦み", fractal: "macro" },
  { keywords: ["宇宙", "構造", "設計図"], pattern: "宇宙=水火の無限螺旋構造", fractal: "macro" },
  { keywords: ["法華経", "蓮華", "妙法"], pattern: "法華経=水火十行の蓮構造曼荼羅", fractal: "macro" },
  { keywords: ["天之御中主", "正中", "中心"], pattern: "天之御中主=水火の交差点=正中の火", fractal: "macro" },
];

/**
 * テキストからパターンを抽出 (決定的)
 */
export function extractPatterns(text: string): Array<{ pattern: string; fractal: "micro" | "meso" | "macro"; score: number }> {
  const t = String(text || "").trim();
  if (!t) return [];

  const results: Array<{ pattern: string; fractal: "micro" | "meso" | "macro"; score: number }> = [];

  for (const entry of KOTODAMA_PATTERNS) {
    let hits = 0;
    for (const kw of entry.keywords) {
      if (t.includes(kw)) hits++;
    }
    if (hits > 0) {
      const score = hits / entry.keywords.length;
      results.push({ pattern: entry.pattern, fractal: entry.fractal, score });
    }
  }

  // スコア降順
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 5);
}

/**
 * フラクタル構造を検出 (ミクロ→メゾ→マクロの貫通パターン)
 */
export function detectFractalConnection(patterns: Array<{ pattern: string; fractal: "micro" | "meso" | "macro" }>): FractalPattern | null {
  const micro = patterns.find(p => p.fractal === "micro");
  const meso = patterns.find(p => p.fractal === "meso");
  const macro = patterns.find(p => p.fractal === "macro");

  if (!micro && !meso && !macro) return null;

  return {
    micro: micro?.pattern || "(未検出)",
    meso: meso?.pattern || "(未検出)",
    macro: macro?.pattern || "(未検出)",
    connection: buildConnectionNarrative(micro?.pattern, meso?.pattern, macro?.pattern),
  };
}

function buildConnectionNarrative(micro?: string, meso?: string, macro?: string): string {
  const parts: string[] = [];
  if (micro) parts.push(`音の層では「${micro}」が作用し`);
  if (meso) parts.push(`法則の層では「${meso}」として展開し`);
  if (macro) parts.push(`宇宙の層では「${macro}」に帰結する`);
  if (parts.length === 0) return "パターン未検出";
  return parts.join("、") + "。この三層は同一の水火の法則がフラクタルに貫通している。";
}

// ============================================================
// 3. Seed生成 (決定的、LLM不使用)
// ============================================================

/**
 * 会話からSeedを生成
 * Ω = D ⋅ ΔS (不変法×差分=裁定生成)
 */
export function generateGrowthSeed(
  userText: string,
  assistantText: string,
  sourceType: "conversation" | "reflection" | "scripture" | "correction" = "conversation",
  sourceId?: string
): GrowthSeed | null {
  const combined = `${userText} ${assistantText}`;
  const patterns = extractPatterns(combined);

  if (patterns.length === 0) {
    // パターンが見つからなくても、一般的な知見としてSeedを生成
    const essence = extractEssence(userText, assistantText);
    if (!essence) return null;

    return {
      sourceType,
      sourceId: sourceId || null,
      essence,
      pattern: null,
      fractalLevel: null,
      confidence: 0.3,
      activationCount: 0,
      lastActivatedAt: null,
      createdAt: new Date().toISOString(),
    };
  }

  const topPattern = patterns[0];
  const fractalConn = detectFractalConnection(patterns);
  const essence = fractalConn
    ? `${extractEssence(userText, assistantText)} [フラクタル接続: ${fractalConn.connection}]`
    : extractEssence(userText, assistantText) || topPattern.pattern;

  return {
    sourceType,
    sourceId: sourceId || null,
    essence,
    pattern: topPattern.pattern,
    fractalLevel: topPattern.fractal,
    confidence: Math.min(1, topPattern.score + 0.2),
    activationCount: 0,
    lastActivatedAt: null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * テキストペアからエッセンスを抽出 (決定的)
 */
function extractEssence(userText: string, assistantText: string): string | null {
  const u = String(userText || "").trim();
  const a = String(assistantText || "").trim();
  if (!u && !a) return null;

  // ユーザーの問いの核心 (最初の文)
  const userCore = u.split(/[。？！\n]/)[0]?.trim() || u.slice(0, 80);
  // アシスタントの応答の核心 (最初の文)
  const assistCore = a.split(/[。？！\n]/)[0]?.trim() || a.slice(0, 120);

  if (!userCore && !assistCore) return null;

  const essence = userCore
    ? `問: ${userCore.slice(0, 60)} → 見: ${assistCore.slice(0, 100)}`
    : assistCore.slice(0, 160);

  return essence;
}

// ============================================================
// 4. DB永続化
// ============================================================

let _insertSeedStmt: any = null;
let _insertGrowthLogStmt: any = null;
let _getRecentSeedsStmt: any = null;
let _getTopSeedsStmt: any = null;
let _activateSeedStmt: any = null;
let _searchSeedsStmt: any = null;

function ensureStmts() {
  try {
    if (!_insertSeedStmt) {
      _insertSeedStmt = dbPrepare(
        "consciousness",
        `INSERT INTO growth_seeds (sourceType, sourceId, essence, pattern, fractalLevel, confidence, activationCount, lastActivatedAt, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
    }
    if (!_insertGrowthLogStmt) {
      _insertGrowthLogStmt = dbPrepare(
        "consciousness",
        `INSERT INTO growth_log (eventType, seedId, detail, deltaJson, createdAt)
         VALUES (?, ?, ?, ?, datetime('now'))`
      );
    }
    if (!_getRecentSeedsStmt) {
      _getRecentSeedsStmt = dbPrepare(
        "consciousness",
        `SELECT * FROM growth_seeds ORDER BY createdAt DESC LIMIT ?`
      );
    }
    if (!_getTopSeedsStmt) {
      _getTopSeedsStmt = dbPrepare(
        "consciousness",
        `SELECT * FROM growth_seeds ORDER BY activationCount DESC, confidence DESC LIMIT ?`
      );
    }
    if (!_activateSeedStmt) {
      _activateSeedStmt = dbPrepare(
        "consciousness",
        `UPDATE growth_seeds SET activationCount = activationCount + 1, lastActivatedAt = datetime('now') WHERE id = ?`
      );
    }
    if (!_searchSeedsStmt) {
      _searchSeedsStmt = dbPrepare(
        "consciousness",
        `SELECT * FROM growth_seeds WHERE essence LIKE ? OR pattern LIKE ? ORDER BY confidence DESC LIMIT ?`
      );
    }
  } catch {
    // DB未初期化時は無視
  }
}

/**
 * SeedをDBに保存
 */
export function saveSeed(seed: GrowthSeed): number | null {
  try {
    ensureStmts();
    if (!_insertSeedStmt) return null;

    const result = _insertSeedStmt.run(
      seed.sourceType,
      seed.sourceId,
      seed.essence,
      seed.pattern,
      seed.fractalLevel,
      seed.confidence,
      seed.activationCount,
      seed.lastActivatedAt,
      seed.createdAt
    );

    const seedId = Number((result as any)?.lastInsertRowid ?? 0);

    // 成長ログに記録
    if (_insertGrowthLogStmt && seedId > 0) {
      _insertGrowthLogStmt.run(
        "seed_created",
        seedId,
        `New seed: ${seed.essence.slice(0, 100)}`,
        JSON.stringify({ sourceType: seed.sourceType, confidence: seed.confidence })
      );
    }

    return seedId > 0 ? seedId : null;
  } catch (e) {
    console.warn("[GROWTH] saveSeed failed:", e);
    return null;
  }
}

/**
 * 直近のSeedを取得
 */
export function getRecentSeeds(limit: number = 10): GrowthSeed[] {
  try {
    ensureStmts();
    if (!_getRecentSeedsStmt) return [];
    return _getRecentSeedsStmt.all(limit) as GrowthSeed[];
  } catch {
    return [];
  }
}

/**
 * 最も活性化されたSeedを取得
 */
export function getTopSeeds(limit: number = 5): GrowthSeed[] {
  try {
    ensureStmts();
    if (!_getTopSeedsStmt) return [];
    return _getTopSeedsStmt.all(limit) as GrowthSeed[];
  } catch {
    return [];
  }
}

/**
 * Seedを活性化 (使用回数+1)
 */
export function activateSeed(seedId: number): void {
  try {
    ensureStmts();
    if (_activateSeedStmt) {
      _activateSeedStmt.run(seedId);
    }
    if (_insertGrowthLogStmt) {
      _insertGrowthLogStmt.run("seed_activated", seedId, `Seed ${seedId} activated`, "{}");
    }
  } catch {
    // 無視
  }
}

/**
 * キーワードでSeedを検索
 */
export function searchSeeds(query: string, limit: number = 5): GrowthSeed[] {
  try {
    ensureStmts();
    if (!_searchSeedsStmt) return [];
    const q = `%${query}%`;
    return _searchSeedsStmt.all(q, q, limit) as GrowthSeed[];
  } catch {
    return [];
  }
}

// ============================================================
// 5. 成長コンテキスト生成 (LLMプロンプトに注入)
// ============================================================

/**
 * 成長Seedからコンテキストテキストを生成
 * LLMのsystemプロンプトに注入して、過去の学びを活用
 */
export function buildGrowthContext(userText: string): string {
  const lines: string[] = [];

  // 1. ユーザーの問いに関連するSeedを検索
  const keywords = String(userText || "").split(/[\s。、？！]+/).filter(w => w.length >= 2).slice(0, 3);
  const relevantSeeds: GrowthSeed[] = [];
  for (const kw of keywords) {
    const found = searchSeeds(kw, 3);
    for (const s of found) {
      if (!relevantSeeds.some(r => r.id === s.id)) {
        relevantSeeds.push(s);
      }
    }
  }

  // 2. 最も活性化されたSeed (常に参照)
  const topSeeds = getTopSeeds(3);
  for (const s of topSeeds) {
    if (!relevantSeeds.some(r => r.id === s.id)) {
      relevantSeeds.push(s);
    }
  }

  if (relevantSeeds.length === 0) return "";

  lines.push("【成長記憶 — 過去の学びからの知見】");
  for (const seed of relevantSeeds.slice(0, 5)) {
    const fractalTag = seed.fractalLevel ? ` [${seed.fractalLevel}]` : "";
    const patternTag = seed.pattern ? ` (${seed.pattern})` : "";
    lines.push(`・${seed.essence}${patternTag}${fractalTag}`);

    // 活性化カウント更新
    if (seed.id) activateSeed(seed.id);
  }
  lines.push("上記の過去の学びを踏まえ、より深い応答を構築せよ。");

  return lines.join("\n");
}

/**
 * フラクタルパターン解析コンテキストを生成
 */
export function buildFractalContext(userText: string): string {
  const patterns = extractPatterns(userText);
  if (patterns.length === 0) return "";

  const fractal = detectFractalConnection(patterns);
  if (!fractal) return "";

  const lines: string[] = [];
  lines.push("【フラクタル構造解読】");
  lines.push(`ミクロ(音): ${fractal.micro}`);
  lines.push(`メゾ(法則): ${fractal.meso}`);
  lines.push(`マクロ(宇宙): ${fractal.macro}`);
  lines.push(`貫通法則: ${fractal.connection}`);
  lines.push("このフラクタル構造を応答に織り込め。");

  return lines.join("\n");
}

// ============================================================
// 6. 自己学習ループ (会話後に自動実行)
// ============================================================

/**
 * 会話ターン完了後に呼ばれる自己学習関数
 * 1. Seed生成
 * 2. パターン認識
 * 3. フラクタル接続の検出
 * 4. 成長ログ記録
 */
export function selfLearnFromConversation(
  userText: string,
  assistantText: string,
  threadId?: string
): { seedCreated: boolean; patternsFound: number; fractalDetected: boolean } {
  const result = { seedCreated: false, patternsFound: 0, fractalDetected: false };

  try {
    // 1. Seed生成
    const seed = generateGrowthSeed(userText, assistantText, "conversation", threadId);
    if (seed) {
      const seedId = saveSeed(seed);
      result.seedCreated = seedId !== null;
    }

    // 2. パターン認識
    const patterns = extractPatterns(`${userText} ${assistantText}`);
    result.patternsFound = patterns.length;

    // 3. フラクタル接続検出
    if (patterns.length >= 2) {
      const fractal = detectFractalConnection(patterns);
      result.fractalDetected = fractal !== null && fractal.micro !== "(未検出)" && fractal.meso !== "(未検出)";

      if (result.fractalDetected) {
        try {
          ensureStmts();
          if (_insertGrowthLogStmt) {
            _insertGrowthLogStmt.run(
              "pattern_recognized",
              null,
              `Fractal pattern detected: ${fractal!.connection.slice(0, 200)}`,
              JSON.stringify({ patterns: patterns.map(p => p.pattern) })
            );
          }
        } catch {
          // 無視
        }
      }
    }

    console.log(`[GROWTH] selfLearn: seed=${result.seedCreated} patterns=${result.patternsFound} fractal=${result.fractalDetected}`);
  } catch (e) {
    console.warn("[GROWTH] selfLearn error:", e);
  }

  return result;
}
