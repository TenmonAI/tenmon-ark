/**
 * TENMON_KG2_KHS_CANDIDATE_RETURN — HYBRID detailPlan 用 khsCandidates（LLM 不使用・根拠は DB のみ）。
 */
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { evaluateKokuzoBadHeuristicV1 } from "../core/kokuzoBadGuardV1.js";

export type KhsHybridDetailPlanCandidateV1 = {
  lawKey: string;
  termKey: string;
  doc: string;
  pdfPage: number | null;
  quote: string;
  quoteHash: string;
  /** khs_seeds_det_v1.seedKey があればそれ、なければ決定論 id */
  seedId: string;
  unitId: string;
};

export type BuildHybridKhsCandidatesOptionsV1 = {
  dbPath: string;
  rawMessage: string;
  centerClaim: string;
  /** HYBRID では 20 前後を想定 */
  limit: number;
};

function tableExists(db: DatabaseSync, name: string): boolean {
  try {
    const r = db
      .prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name=? LIMIT 1")
      .get(name) as { ok?: number } | undefined;
    return !!r?.ok;
  } catch {
    return false;
  }
}

function seedIdFromRow(unitId: string, quoteHash: string, seedKey: unknown): string {
  const sk = String(seedKey ?? "").trim();
  if (sk) return sk;
  return crypto.createHash("sha256").update(`kg2|${unitId}|${quoteHash}`).digest("hex").slice(0, 32);
}

/** chat.ts の gram 抽出と同等（#詳細・フォールバック短語） */
export function extractKhsSearchGramsV1(rawMessage: string, centerClaim: string): string[] {
  const __src = String(rawMessage || "") + "\n" + String(centerClaim || "");
  const __grams = (__src.match(/[一-龯]{2}/g) || []).slice(0, 50);
  try {
    const __rawQ = String(rawMessage || "");
    if (__rawQ.trim().startsWith("#詳細")) {
      const __q = __rawQ.replace(/^\s*#詳細\s*/u, "").trim();
      const __g2 = (__q.match(/[一-龯]{2}/g) || []).slice(0, 50);
      if (__g2.length > 0) {
        __grams.length = 0;
        for (const x of __g2) __grams.push(x);
      }
    }
  } catch {
    /* ignore */
  }
  if (__grams.length === 0) {
    const q = String(__src || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 18);
    if (q) __grams.push(q);
  }
  return __grams;
}

function rowToCandidate(r: Record<string, unknown>): KhsHybridDetailPlanCandidateV1 | null {
  const lawKey = String(r.lawKey ?? "").trim();
  const unitId = String(r.unitId ?? "").trim();
  const quoteHash = String(r.quoteHash ?? "").trim();
  const quote = String(r.quote ?? "");
  const doc = String(r.doc ?? "").trim();
  if (!lawKey || !unitId || !quoteHash) return null;
  if (evaluateKokuzoBadHeuristicV1(quote).isBad) return null;
  const pdfRaw = r.pdfPage;
  const pdfPage =
    pdfRaw == null || pdfRaw === ""
      ? null
      : typeof pdfRaw === "number"
        ? pdfRaw
        : Number.isFinite(Number(pdfRaw))
          ? Number(pdfRaw)
          : null;
  return {
    lawKey,
    termKey: String(r.termKey ?? "").trim(),
    doc,
    pdfPage,
    quote,
    quoteHash,
    seedId: seedIdFromRow(unitId, quoteHash, r.seedKey),
    unitId,
  };
}

/**
 * kokuzo DB から HYBRID 用 khsCandidates を構築（捏造なし・BAD quote 除外・安定ソート）
 */
export function buildHybridDetailPlanKhsCandidatesV1(
  opts: BuildHybridKhsCandidatesOptionsV1
): KhsHybridDetailPlanCandidateV1[] {
  const grams = extractKhsSearchGramsV1(opts.rawMessage, opts.centerClaim);
  if (grams.length === 0) return [];

  const lim = Number(opts.limit);
  const cap = Math.max(1, Math.min(40, Number.isFinite(lim) && lim > 0 ? lim : 20));
  const db = new DatabaseSync(opts.dbPath, { readOnly: true });
  try {
    const hasSeeds = tableExists(db, "khs_seeds_det_v1");
    const hasUnits = tableExists(db, "khs_units") && tableExists(db, "khs_laws");
    if (!hasUnits) return [];

    const stmtInstr = db.prepare(
      `SELECT DISTINCT
         l.lawKey AS lawKey,
         l.termKey AS termKey,
         u.doc AS doc,
         u.pdfPage AS pdfPage,
         u.quote AS quote,
         u.quoteHash AS quoteHash,
         u.unitId AS unitId,
         s.seedKey AS seedKey
       FROM khs_units u
       INNER JOIN khs_laws l ON l.unitId = u.unitId
       LEFT JOIN khs_seeds_det_v1 s ON s.unitId = u.unitId AND s.quoteHash = u.quoteHash
       WHERE instr(IFNULL(u.quote, ''), ?) > 0
       LIMIT ?`
    );

    const stmtSeed = hasSeeds
      ? db.prepare(
          `SELECT DISTINCT
             l.lawKey AS lawKey,
             l.termKey AS termKey,
             u.doc AS doc,
             u.pdfPage AS pdfPage,
             u.quote AS quote,
             u.quoteHash AS quoteHash,
             u.unitId AS unitId,
             s.seedKey AS seedKey
           FROM khs_seeds_det_v1 s
           INNER JOIN khs_units u ON u.unitId = s.unitId AND u.quoteHash = s.quoteHash
           INNER JOIN khs_laws l ON l.unitId = u.unitId
           WHERE s.kanji2Top LIKE '%' || ? || '%'
           ORDER BY COALESCE(s.usageScore, 0) DESC
           LIMIT ?`
        )
      : null;

    const seen = new Set<string>();
    const out: KhsHybridDetailPlanCandidateV1[] = [];

    const pushRows = (rows: Record<string, unknown>[]) => {
      for (const raw of rows) {
        if (out.length >= cap) return;
        const c = rowToCandidate(raw);
        if (!c) continue;
        const k = `${c.lawKey}\0${c.quoteHash}`;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(c);
      }
    };

    for (const g of grams) {
      if (out.length >= cap) break;
      const per = Math.min(8, cap - out.length + 2);
      try {
        const rows1 = stmtInstr.all(g, per) as Record<string, unknown>[];
        pushRows(rows1);
      } catch {
        /* ignore */
      }
      if (stmtSeed && out.length < cap) {
        try {
          const rows2 = stmtSeed.all(g, per) as Record<string, unknown>[];
          pushRows(rows2);
        } catch {
          /* ignore */
        }
      }
    }

    out.sort((a, b) => {
      const ak = `${a.lawKey}\0${a.quoteHash}`;
      const bk = `${b.lawKey}\0${b.quoteHash}`;
      return ak.localeCompare(bk);
    });
    return out.slice(0, cap);
  } finally {
    try {
      db.close();
    } catch {
      /* ignore */
    }
  }
}
