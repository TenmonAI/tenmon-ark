/** TENMON_BUILD_GREEN_RESTORE_AFTER_SHELTER_V1 */
export type SanskritGodnameTableRecordV1 = {
  japanese_name: string;
  [k: string]: unknown;
};

export function validateSanskritGodnameRecordV1(
  raw: unknown,
): { ok: true; record: SanskritGodnameTableRecordV1 } | { ok: false; errors: string[] } {
  if (!raw || typeof raw !== "object") return { ok: false, errors: ["invalid_record"] };
  const jn = String((raw as Record<string, unknown>).japanese_name ?? "").trim();
  if (!jn) return { ok: false, errors: ["missing_japanese_name"] };
  return { ok: true, record: raw as SanskritGodnameTableRecordV1 };
}

export function normalizeSanskritGodnameRecordV1(rec: SanskritGodnameTableRecordV1): SanskritGodnameTableRecordV1 {
  return { ...rec, japanese_name: String(rec.japanese_name || "").trim() };
}
