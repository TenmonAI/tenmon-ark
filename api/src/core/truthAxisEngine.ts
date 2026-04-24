/**
 * TRUTH_AXIS_ENGINE_V1
 * 10 truth_axis の判定・記録・検索を担当する。
 *
 * 機能:
 *   1. テキストから truth_axis を検出 (detect10TruthAxes)
 *   2. truth_axes_bindings テーブルへの記録 (bindAxes)
 *   3. 応答への truth_axis 明示句の構築 (buildAxisClause)
 *   4. テーブル初期化 (ensureTruthAxesTable)
 *
 * 安全設計:
 *   - 旧 truth_axes_bindings は _legacy として保存
 *   - 新テーブルは 10 軸 CHECK 制約付き
 *   - 全 SQL は try-catch で保護
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db/index.js";
import { REPO_ROOT } from "./mc/constants.js";

// ── DB パス ───────────────────────────────────────
// CARD-MC-09A-WAL-INTEGRITY-V1:
//   better-sqlite3 から node:sqlite（shared getDb("kokuzo")）に移行。
//   異なる SQLite 実装が同一ファイルを開閉すると、close 時の checkpoint が
//   WAL を unlink し、他方の WAL fd が (deleted) 化して書込が不可視になる。
//   テスト等で dbPath を指定された場合のみ独立した DatabaseSync を開く。
const DB_PATH =
  process.env.KOKUZO_DB_PATH || "/opt/tenmon-ark-data/kokuzo.sqlite";

function openKokuzoDb(dbPath?: string): { db: DatabaseSync; shouldClose: boolean } {
  if (dbPath && dbPath !== DB_PATH) {
    return { db: new DatabaseSync(dbPath), shouldClose: true };
  }
  return { db: getDb("kokuzo") as unknown as DatabaseSync, shouldClose: false };
}

// ── 10 truth_axis（KHS_CORE_v1 正式） ────────────
export const TRUTH_AXES = [
  "cycle",
  "polarity",
  "center",
  "breath",
  "carami",
  "order",
  "correspondence",
  "manifestation",
  "purification",
  "governance",
] as const;

export type TruthAxis = (typeof TRUTH_AXES)[number];

// ── 軸キーワードマッピング ────────────────────────
const AXIS_KEYWORDS: Record<TruthAxis, string[]> = {
  cycle: [
    "循環", "巡り", "回帰", "周期", "めぐり",
    "サイクル", "輪廻", "繰り返し", "還", "転",
  ],
  polarity: [
    "水火",
    "イキ",
    "陰陽",
    "対極",
    "二元",
    "水",
    "火",
    "上下",
    "昇降",
    "澄濁",
    "軽清",
    "重濁",
  ],
  center: [
    "正中", "まなか", "中心", "ゝ", "凝",
    "ア", "基底", "母体", "惣名", "中軸",
  ],
  breath: [
    "息", "呼吸", "吐納", "気息", "ブレス",
    "吸", "吐", "氣", "生命力", "活力",
  ],
  carami: [
    "カラミ",
    "絡み",
    "交合",
    "結合",
    "與合",
    "縁起",
    "縁",
    "因縁",
    "因果",
    "関係性",
    "つながり",
    "相互",
    "条件付き",
    "依存",
    "ネットワーク",
    "くみあい",
    "交差",
    "螺旋",
    "DNA",
    "組み合わせ",
  ],
  order: [
    "秩序", "配列", "順序", "五十連", "行列",
    "位", "階層", "序列", "法則", "規則",
  ],
  correspondence: [
    "対応", "照応", "写像", "相似", "フラクタル",
    "鏡", "反映", "共鳴", "響き", "呼応",
  ],
  manifestation: [
    "顕現", "形", "現象", "顕れ", "発現",
    "生成", "創造", "産み", "成り", "ワ", "国土",
  ],
  purification: [
    "浄化",
    "禊",
    "澄",
    "澄み",
    "上澄",
    "清",
    "清め",
    "祓",
    "洗",
    "純化",
    "精錬",
    "昇華",
    "祓い",
    "濁",
    "濁り",
    "沉降",
    "降ろし",
    "重濁",
    "軽清",
  ],
  governance: [
    "統治", "君位", "臣", "治", "政",
    "タカアマハラ", "高天原", "天津", "国津", "主宰",
  ],
};

// ── テーブル初期化 ────────────────────────────────
/**
 * truth_axes_bindings テーブルを 10 軸対応で作成する。
 * 旧テーブルが存在する場合は _legacy として保存。
 */
export function ensureTruthAxesTable(dbPath?: string): void {
  const { db, shouldClose } = openKokuzoDb(dbPath);
  try {
    const exists = db
      .prepare(
        "SELECT COUNT(*) as c FROM sqlite_master WHERE type='table' AND name='truth_axes_bindings'"
      )
      .get() as { c: number };

    if (exists.c > 0) {
      // 旧テーブルのカラムチェック
      const cols = db.prepare("PRAGMA table_info(truth_axes_bindings)").all() as Array<{
        name: string;
      }>;
      const colNames = cols.map((c) => c.name);

      // evidence_refs カラムがなければ旧スキーマ → legacy 化
      if (!colNames.includes("evidence_refs")) {
        console.log(
          "[TRUTH_AXIS] Migrating old truth_axes_bindings to _legacy..."
        );
        db.exec(`
          CREATE TABLE IF NOT EXISTS truth_axes_bindings_legacy AS
            SELECT * FROM truth_axes_bindings;
          DROP TABLE truth_axes_bindings;
        `);
      } else {
        // 既に新スキーマ → 何もしない
        return;
      }
    }

    // 新テーブル作成（10 軸 CHECK 制約付き）
    db.exec(`
      CREATE TABLE IF NOT EXISTS truth_axes_bindings (
        id TEXT PRIMARY KEY,
        segment_id TEXT NOT NULL,
        axis_key TEXT NOT NULL CHECK (
          axis_key IN (
            'cycle', 'polarity', 'center', 'breath', 'carami',
            'order', 'correspondence', 'manifestation',
            'purification', 'governance'
          )
        ),
        confidence REAL NOT NULL DEFAULT 0.5,
        binding_reason TEXT,
        evidence_refs TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (segment_id) REFERENCES sacred_segments(id)
      );
      CREATE INDEX IF NOT EXISTS idx_truth_axes_bindings_segment_axis
        ON truth_axes_bindings(segment_id, axis_key);
      CREATE INDEX IF NOT EXISTS idx_truth_axes_bindings_axis_conf
        ON truth_axes_bindings(axis_key, confidence);
    `);

    console.log("[TRUTH_AXIS] truth_axes_bindings table created (10 axes)");
  } catch (e: any) {
    console.error(`[TRUTH_AXIS] ensureTruthAxesTable failed: ${e?.message}`);
  } finally {
    if (shouldClose) {
      try {
        db.close();
      } catch {}
    }
  }
}

// ── 軸検出 ────────────────────────────────────────
/**
 * テキストから 10 truth_axis を検出する。
 * 各軸のキーワード出現回数に基づいてスコアリング。
 * @returns 検出された軸（confidence 降順、最低2軸保証）
 */
export function detect10TruthAxes(
  text: string
): Array<{ axis: TruthAxis; confidence: number }> {
  const results: Array<{ axis: TruthAxis; confidence: number }> = [];

  for (const axis of TRUTH_AXES) {
    const keywords = AXIS_KEYWORDS[axis];
    let hits = 0;
    for (const kw of keywords) {
      const regex = new RegExp(kw, "gi");
      const matches = text.match(regex);
      if (matches) hits += matches.length;
    }
    if (hits > 0) {
      const conf =
        hits >= 5 ? 0.95 : hits >= 3 ? 0.85 : hits >= 2 ? 0.7 : 0.5;
      results.push({ axis, confidence: conf });
    }
  }

  results.sort((a, b) => b.confidence - a.confidence);

  // 最低2軸保証
  if (results.length < 2) {
    const defaultAxes: TruthAxis[] = ["center", "manifestation"];
    for (const da of defaultAxes) {
      if (!results.find((r) => r.axis === da)) {
        results.push({ axis: da, confidence: 0.3 });
      }
      if (results.length >= 2) break;
    }
  }

  return results;
}

const KHS_CORE_CONST_REL = path.join("docs", "ark", "khs", "KHS_CORE_CONSTITUTION_v1.txt");

/** CARD-MC-22: KHS_CORE 封印正本から carami / 縁起周辺の短い抜粋（捏造なし・ファイル無しは空） */
export function readKhsCoreCaramiContextSnippetV1(maxChars: number): string {
  const cap = Math.max(80, Math.min(600, maxChars));
  try {
    const abs = path.join(REPO_ROOT, KHS_CORE_CONST_REL);
    if (!existsSync(abs)) return "";
    const raw = readFileSync(abs, "utf8");
    const needle = /絡み|縁起|carami|與合|四締/u;
    const m = needle.exec(raw);
    const idx = m?.index ?? -1;
    const slice =
      idx >= 0 ? raw.slice(Math.max(0, idx - 60), idx + cap) : raw.slice(0, cap);
    return slice.replace(/\s+/g, " ").trim().slice(0, cap);
  } catch {
    return "";
  }
}

/** CARD-MC-22: 絡み軸の GEN 節（truth 検出 or 縁起系キーワード + KHS_CORE 参照） */
export function buildCaramiGenClauseV1(
  userText: string,
  axes: Array<{ axis: TruthAxis; confidence: number }>,
  maxChars: number,
): string {
  const t = String(userText ?? "").trim();
  if (!t) return "";
  const axisHit = axes.some((a) => a.axis === "carami" && a.confidence >= 0.45);
  const kw = /(縁起|縁|因果|関係性|因縁|相互|つながり|依存)/u.test(t);
  if (!axisHit && !kw) return "";
  const khs = readKhsCoreCaramiContextSnippetV1(Math.min(420, maxChars - 160));
  const lines = [
    "【truth_axis 絡み（carami）・KHS_CORE 参照】",
    "関係性・因果・縁起は単線の物語因果へ還元せず、位相として読む（封印正本の用法に従う）。",
    khs ? `正本抜粋: ${khs}` : "（KHS_CORE_CONSTITUTION_v1 未配置環境: 軸検出・キーワードのみ）",
  ];
  return lines.join("\n\n").slice(0, Math.max(120, maxChars));
}

/** CARD-MC-22: 澄濁軸の GEN 専用節（澄＝上澄・軽清、濁＝沉降・重濁。言霊秘書水火別と接続） */
export function buildPurificationGenClauseV1(
  userText: string,
  kotodamaHishoClause: string,
  axes: Array<{ axis: TruthAxis; confidence: number }>,
  maxChars: number,
): string {
  const t = String(userText ?? "").trim();
  if (!t) return "";
  const axisHit = axes.some((a) => a.axis === "purification" && a.confidence >= 0.45);
  const kw = /(澄|濁|浄化|禊|清め|澄み|濁り|沉降|上澄|重濁|軽清)/u.test(t);
  if (!axisHit && !kw) return "";
  const wf = classifyWaterFire(t);
  const h = String(kotodamaHishoClause ?? "").trim();
  const hFrag =
    h.length > 0 && /(水|火|水火|澄|濁|軽清|重濁)/u.test(h) ? h.slice(0, Math.min(480, maxChars - 280)) : "";
  const lines = [
    "【truth_axis 澄濁（purification）・GEN 専用】",
    "澄＝軽清・上澄の相（昇る側の整理）。濁＝重濁・沉降の相（降りる側の整理）。水火は別にして混線しない。",
    `classifyWaterFire=${wf}`,
    hFrag
      ? `【言霊秘書・水火別との接続（抜粋）】\n${hFrag}`
      : "（言霊秘書節に水火別が未注入のときは上記方向性のみ参照）",
  ];
  return lines.join("\n\n").slice(0, Math.max(160, maxChars));
}

// ── 軸バインディング記録 ──────────────────────────
/**
 * truth_axes_bindings に記録する
 */
export function bindAxes(
  segmentId: string,
  axes: Array<{ axis: TruthAxis; confidence: number }>,
  reason: string,
  dbPath?: string
): number {
  let bound = 0;
  const { db, shouldClose } = openKokuzoDb(dbPath);
  try {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO truth_axes_bindings
      (id, segment_id, axis_key, confidence, binding_reason)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const { axis, confidence } of axes) {
      stmt.run(uuidv4(), segmentId, axis, confidence, reason);
      bound++;
    }
  } catch (e: any) {
    console.error(`[TRUTH_AXIS] bindAxes failed: ${e?.message}`);
  } finally {
    if (shouldClose) {
      try {
        db.close();
      } catch {}
    }
  }
  return bound;
}

// ── 応答用 truth_axis 句構築 ──────────────────────
/**
 * 応答末尾に付与する truth_axis 明示句を構築する
 */
export function buildAxisClause(
  axes: Array<{ axis: TruthAxis; confidence: number }>
): string {
  if (axes.length === 0) return "";

  const axisStr = axes
    .slice(0, 4)
    .map((a) => `${a.axis}(${Math.round(a.confidence * 100)}%)`)
    .join(" / ");

  return `\n【truth_axis: ${axisStr}】`;
}

// ── 水火分類 ──────────────────────────────────────
export type WaterFireClass =
  | "WF_WATER"
  | "WF_FIRE"
  | "WF_UNION"
  | "WF_UNKNOWN";

/**
 * テキストの水火分類を判定する
 */
export function classifyWaterFire(text: string): WaterFireClass {
  const waterKw = ["水", "軽清", "昇", "天", "澄", "動く側", "陰"];
  const fireKw = ["火", "重濁", "降", "地", "濁", "動かす側", "陽"];

  let waterScore = 0;
  let fireScore = 0;

  for (const kw of waterKw) {
    if (text.includes(kw)) waterScore++;
  }
  for (const kw of fireKw) {
    if (text.includes(kw)) fireScore++;
  }

  if (waterScore > 0 && fireScore > 0) return "WF_UNION";
  if (waterScore > fireScore) return "WF_WATER";
  if (fireScore > waterScore) return "WF_FIRE";
  return "WF_UNKNOWN";
}
