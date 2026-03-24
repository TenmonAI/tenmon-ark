/**
 * TENMON_KG1_DETERMINISTIC_SEED_GENERATOR_V1
 * KHS 由来の決定的 Seed（LLM 不使用）。PASS 根拠集合のみ入力。再実行 idempotent。
 */
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { evaluateKokuzoBadHeuristicV1 } from "../core/kokuzoBadGuardV1.js";

const CARD = "TENMON_KG1_DETERMINISTIC_SEED_GENERATOR_V1";

export type WaterFireVectorV1 = {
  water: number;
  fire: number;
  /** 参照用: 集約に使った waterFireClass 値（ソート済ユニーク） */
  classesUsed: string[];
};

/** 将来 recombination 用の安定プロファイル（本文は載せずフィンガープリントのみ） */
export type PhaseProfileV1 = {
  schema: "kg1_phase_profile_v1";
  unitId: string;
  docNorm: string;
  pdfPage: number | null;
  /** 正規化キー集合のハッシュ（再結合用アンカー） */
  anchorsSha256: string;
  quoteLen: number;
};

/** 会話還元・下流が参照する構文核（自由生成テキストなし） */
export type DeterministicKhsSeedV1 = {
  seedId: string;
  unitId: string;
  lawKey: string[];
  termKey: string[];
  truth_axis: string;
  water_fire_vector: WaterFireVectorV1;
  quoteHash: string[];
  phaseProfile: PhaseProfileV1;
};

export type PassableSetInputV1 = {
  unitIds?: string[];
  kg1_pipeline_recommended?: boolean;
  aggregate_gate_pass?: boolean;
};

export type GenerateDeterministicSeedsOptionsV1 = {
  /** 絶対パス推奨 */
  dbPath: string;
  /** khs_passable_set.json 相当、または unitIds のみ */
  passable: PassableSetInputV1;
  /** true のとき kg1_pipeline_recommended / aggregate_gate_pass が false なら 0 件 */
  requirePipelineRecommended?: boolean;
};

function sha256Hex(s: string): string {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/** waterFireClass 文字列から決定的な [0,1] ベクトル（合計 1） */
export function waterFireVectorFromClasses(classes: string[]): WaterFireVectorV1 {
  const uniq = [...new Set(classes.map((c) => String(c || "").trim()).filter(Boolean))].sort();
  if (uniq.length === 0) {
    return { water: 0.5, fire: 0.5, classesUsed: [] };
  }
  let wSum = 0;
  let fSum = 0;
  for (const c of uniq) {
    const u = c.toUpperCase();
    let w = 0.5;
    let f = 0.5;
    if (u.includes("FIRE") || u.includes("火")) {
      w = 0.35;
      f = 0.65;
    }
    if (u.includes("WATER") || u.includes("水")) {
      w = 0.65;
      f = 0.35;
    }
    if (u.includes("BAL") || u.includes("中") || u.includes("NEUT")) {
      w = 0.5;
      f = 0.5;
    }
    const h = sha256Hex(`wf:${c}`).slice(0, 8);
    const jitter = (parseInt(h, 16) / 0xffffffff) * 0.08 - 0.04;
    w = Math.min(1, Math.max(0, w + jitter));
    f = 1 - w;
    wSum += w;
    fSum += f;
  }
  const n = uniq.length;
  return {
    water: round6(wSum / n),
    fire: round6(fSum / n),
    classesUsed: uniq,
  };
}

function openKokuzoReadonly(dbPath: string): DatabaseSync {
  return new DatabaseSync(dbPath, { readOnly: true });
}

type UnitRow = {
  unitId: string;
  doc: string;
  pdfPage: number | null;
  quote: string;
  quoteHash: string;
};

type LawRow = {
  lawKey: string;
  termKey: string;
  truthAxis: string;
  waterFireClass: string;
};

/** 同一入力に対し常に同順・同内容の Seed 配列を返す */
export function generateDeterministicKhsSeedsV1(opts: GenerateDeterministicSeedsOptionsV1): {
  card: string;
  seeds: DeterministicKhsSeedV1[];
  skippedBadQuote: number;
  skippedNotInDb: number;
  skippedPipeline: boolean;
  inputUnitCount: number;
} {
  const requirePr = opts.requirePipelineRecommended !== false;
  const p = opts.passable;
  const unitIds = [...new Set((p.unitIds ?? []).map((x) => String(x).trim()).filter(Boolean))].sort();
  const skippedPipeline =
    requirePr &&
    (p.kg1_pipeline_recommended === false ||
      (p.aggregate_gate_pass === false && p.kg1_pipeline_recommended !== true));

  if (skippedPipeline || unitIds.length === 0) {
    return {
      card: CARD,
      seeds: [],
      skippedBadQuote: 0,
      skippedNotInDb: unitIds.length,
      skippedPipeline,
      inputUnitCount: unitIds.length,
    };
  }

  const db = openKokuzoReadonly(opts.dbPath);
  try {
    const stmtU = db.prepare(
      "SELECT unitId, doc, pdfPage, quote, quoteHash FROM khs_units WHERE unitId = ?"
    );

    const stmtL = db.prepare(
      `SELECT lawKey, termKey, truthAxis, waterFireClass FROM khs_laws WHERE unitId = ? ORDER BY lawKey ASC`
    );

    const seeds: DeterministicKhsSeedV1[] = [];
    let skippedBadQuote = 0;
    let skippedNotInDb = 0;

    for (const uid of unitIds) {
      const u = stmtU.get(uid) as unknown as UnitRow | undefined;
      if (!u) {
        skippedNotInDb += 1;
        continue;
      }
      const quoteStr = String(u.quote ?? "");
      if (evaluateKokuzoBadHeuristicV1(quoteStr).isBad) {
        skippedBadQuote += 1;
        continue;
      }

      const laws = stmtL.all(uid) as unknown as LawRow[];
      const lawKey = laws.map((l) => String(l.lawKey));
      const termKey = [...new Set(laws.map((l) => String(l.termKey || "").trim()).filter(Boolean))].sort();
      const truthSet = [
        ...new Set(laws.map((l) => String(l.truthAxis || "").trim()).filter(Boolean)),
      ].sort();
      const truth_axis = truthSet.join("|") || "UNSPECIFIED";
      const wfClasses = laws.map((l) => String(l.waterFireClass || ""));
      const water_fire_vector = waterFireVectorFromClasses(wfClasses);

      const qh = String(u.quoteHash || "").trim();
      const quoteHash = qh ? [qh] : [];

      const anchorsPayload = JSON.stringify({
        lawKey,
        termKey,
        quoteHash,
        doc: String(u.doc || "").trim(),
        pdfPage: u.pdfPage,
      });
      const phaseProfile: PhaseProfileV1 = {
        schema: "kg1_phase_profile_v1",
        unitId: uid,
        docNorm: String(u.doc || "").trim(),
        pdfPage: u.pdfPage == null ? null : Number(u.pdfPage),
        anchorsSha256: sha256Hex(anchorsPayload),
        quoteLen: quoteStr.length,
      };

      const canonical = {
        unitId: uid,
        lawKey,
        termKey,
        truth_axis,
        water_fire_vector: {
          water: water_fire_vector.water,
          fire: water_fire_vector.fire,
          classesUsed: water_fire_vector.classesUsed,
        },
        quoteHash: [...quoteHash].sort(),
        phaseProfile,
      };

      const seedId = sha256Hex(`kg1_seed_v1:${JSON.stringify(canonical)}`).slice(0, 32);

      seeds.push({
        seedId,
        unitId: uid,
        lawKey,
        termKey,
        truth_axis,
        water_fire_vector,
        quoteHash,
        phaseProfile,
      });
    }

    seeds.sort((a, b) => a.unitId.localeCompare(b.unitId));

    return {
      card: CARD,
      seeds,
      skippedBadQuote,
      skippedNotInDb,
      skippedPipeline: false,
      inputUnitCount: unitIds.length,
    };
  } finally {
    try {
      db.close();
    } catch {
      /* ignore */
    }
  }
}

/** マニフェスト全体の決定論ハッシュ（件数・各 seedId のソート済集合） */
export function hashDeterministicSeedManifestV1(seeds: DeterministicKhsSeedV1[]): string {
  const ids = seeds.map((s) => s.seedId).sort();
  return sha256Hex(JSON.stringify({ n: seeds.length, seedIds: ids }));
}

export { CARD as DETERMINISTIC_SEED_GENERATOR_CARD_V1 };
