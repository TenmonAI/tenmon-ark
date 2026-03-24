/**
 * KZPAGE 形式の evidenceId に対し、ページ本文を読み BAD な参照を Seed 入力から除外する。
 * 削除は行わない（DB 不変）。ID のリストから落とすだけ。
 */
import { evaluateKokuzoBadHeuristicV1 } from "../core/kokuzoBadGuardV1.js";
import { getPageText } from "./pages.js";

const KZPAGE_RE = /^KZPAGE:(.+):P(\d+)$/i;

export type KokuzoEvidenceFilterRowV1 = {
  id: string;
  action: "kept" | "kept_non_kzpage" | "dropped_bad_page" | "kept_resolve_fail";
  doc?: string;
  pdfPage?: number;
  reasons?: string[];
};

/**
 * evidenceIds のうち KZPAGE:doc:P{n} を解決し、ページ本文が BAD の ID を除外する。
 * KZPAGE 以外の ID は変更せず保持（解決不能なため）。
 */
export function filterEvidenceIdsForKokuzoBadGuardV1(evidenceIds: string[]): {
  kept: string[];
  dropped: string[];
  rows: KokuzoEvidenceFilterRowV1[];
} {
  const kept: string[] = [];
  const dropped: string[] = [];
  const rows: KokuzoEvidenceFilterRowV1[] = [];

  for (const raw of evidenceIds) {
    const id = String(raw ?? "").trim();
    if (!id) continue;
    const m = id.match(KZPAGE_RE);
    if (!m) {
      kept.push(id);
      rows.push({ id, action: "kept_non_kzpage" });
      continue;
    }
    const doc = m[1];
    const pdfPage = parseInt(m[2], 10);
    if (!Number.isFinite(pdfPage)) {
      kept.push(id);
      rows.push({ id, action: "kept_non_kzpage" });
      continue;
    }
    try {
      const full = String(getPageText(doc, pdfPage) || "");
      const head = full.slice(0, 12000);
      const ev = evaluateKokuzoBadHeuristicV1(head);
      if (ev.isBad) {
        dropped.push(id);
        rows.push({ id, action: "dropped_bad_page", doc, pdfPage, reasons: ev.reasons });
      } else {
        kept.push(id);
        rows.push({ id, action: "kept", doc, pdfPage });
      }
    } catch {
      // 解決失敗時は参照を落とさない（可用性優先。BAD 確定ではない）
      kept.push(id);
      rows.push({ id, action: "kept_resolve_fail", doc, pdfPage });
    }
  }

  return { kept, dropped, rows };
}
