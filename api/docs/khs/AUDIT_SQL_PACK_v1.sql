-- AUDIT_SQL_PACK_v1.sql
-- Purpose: KHS生成器の出力/前提（norm view）を監査するSQLパック（Pi↑ / ΔZ↓）
-- Assumptions:
--   - khs_pages_norm(doc,title,content_text,pdfPage,domain,collection,updated_at) exists
--   - khs_links_norm(from_doc,to_doc) optional
--   - output tables/files are checked by external scripts; this pack audits DB-side invariants.

-- =========================================================
-- 0) Doc format audit: allowed roots = NOTION|NAS (strict)
-- =========================================================
-- Any doc outside allowed roots (KHS中枢の根拠に使う場合はNG)
SELECT doc
FROM khs_pages_norm
WHERE doc NOT LIKE 'NOTION:PAGE:%'
  AND doc NOT LIKE 'NAS:PDF:%';

-- =========================================================
-- 1) pdfPage strict audit: must be positive integer where required
-- =========================================================
SELECT doc, pdfPage
FROM khs_pages_norm
WHERE (doc LIKE 'NOTION:PAGE:%' OR doc LIKE 'NAS:PDF:%')
  AND (pdfPage IS NULL OR pdfPage <= 0);

-- =========================================================
-- 2) KHS canonical seed set (GLOBAL) reproducibility
--     NOTE: adjust seed condition ONLY by contract; do not widen ad-hoc.
-- =========================================================
-- Minimal seed (example; use your TSV definition as source of truth)
WITH seed AS (
  SELECT doc AS pageDoc
  FROM khs_pages_norm
  WHERE doc LIKE 'NOTION:PAGE:%'
    AND (
      domain = 'KHS'
      OR collection LIKE '%言灵秘書%'
      OR title LIKE '%言灵秘書%'
      OR content_text LIKE '%言灵秘書%'
    )
)
SELECT pageDoc
FROM seed
ORDER BY pageDoc;

-- =========================================================
-- 3) Link closure sanity (if khs_links_norm exists)
-- =========================================================
-- Orphan links (to_doc not found)
SELECT l.to_doc
FROM khs_links_norm l
LEFT JOIN khs_pages_norm p ON p.doc = l.to_doc
WHERE p.doc IS NULL
GROUP BY l.to_doc
ORDER BY l.to_doc;

-- =========================================================
-- 4) Coverage audit (DB-side pages coverage)
--     pages_selected vs pages_with_text (rough)
-- =========================================================
WITH selected AS (
  SELECT doc AS pageDoc
  FROM khs_pages_norm
  WHERE doc LIKE 'NOTION:PAGE:%'
    AND (
      domain = 'KHS'
      OR collection LIKE '%言灵秘書%'
      OR title LIKE '%言灵秘書%'
      OR content_text LIKE '%言灵秘書%'
    )
),
stats AS (
  SELECT
    (SELECT COUNT(*) FROM selected) AS pages_selected,
    (SELECT COUNT(*) FROM khs_pages_norm p JOIN selected s ON s.pageDoc=p.doc
      WHERE length(COALESCE(p.content_text,'')) > 0
    ) AS pages_with_text
)
SELECT
  pages_selected,
  pages_with_text,
  CASE WHEN pages_selected=0 THEN 0.0 ELSE (1.0*pages_with_text/pages_selected) END AS coverage_rate
FROM stats;

-- =========================================================
-- 5) TermKey / Axis audit for generated tables (if you store them in DB)
--     If you keep jsonl/tsv in filesystem only, skip or adapt.
-- =========================================================
-- Example tables (if exist): khs_terms(termKey,...), khs_laws(lawKey,termKey,truthAxis,waterFireClass,status,unitId,...), khs_units(unitId,doc,pdfPage,quote,...)

-- 5.1) termKey referenced by laws must exist
SELECT DISTINCT l.termKey
FROM khs_laws l
LEFT JOIN khs_terms t ON t.termKey = l.termKey
WHERE l.termKey <> ''
  AND t.termKey IS NULL
ORDER BY l.termKey;

-- 5.2) truthAxis must be in fixed 10 (contract)
-- Allowed: cycle, polarity, center, breath, carami, order, correspondence, manifestation, purification, governance
SELECT DISTINCT truthAxis
FROM khs_laws
WHERE truthAxis <> ''
  AND truthAxis NOT IN (
    'cycle','polarity','center','breath','carami','order',
    'correspondence','manifestation','purification','governance'
  )
ORDER BY truthAxis;

-- 5.3) units must use allowed doc roots + numeric pdfPage
SELECT unitId, doc, pdfPage
FROM khs_units
WHERE (doc NOT LIKE 'NOTION:PAGE:%' AND doc NOT LIKE 'NAS:PDF:%')
   OR (pdfPage IS NULL OR pdfPage <= 0)
ORDER BY unitId
LIMIT 200;

-- 5.4) laws must be anchored to unitId (no orphan)
SELECT l.lawKey, l.unitId
FROM khs_laws l
LEFT JOIN khs_units u ON u.unitId = l.unitId
WHERE u.unitId IS NULL
ORDER BY l.lawKey
LIMIT 200;

-- 5.5) verified-only check (ICHIGEN-like)
-- Example: laws with operator OP_ICHIGEN should be verified only (adapt operator name)
SELECT lawKey, status
FROM khs_laws
WHERE operator='OP_ICHIGEN'
  AND status <> 'verified'
ORDER BY lawKey;

-- =========================================================
-- 6) Quality flags audit (if present)
-- =========================================================
SELECT flag, COUNT(*) AS cnt, ROUND(AVG(score), 4) AS avg_score
FROM khs_quality_flags
GROUP BY flag
ORDER BY cnt DESC, flag;

-- =========================================================
-- 7) Apply log audit (trace existence)
-- =========================================================
SELECT mode, COUNT(*) AS cnt
FROM khs_apply_log
GROUP BY mode
ORDER BY cnt DESC;

-- =========================================================
-- 8) Safety audit: no empty quote (units)
-- =========================================================
SELECT unitId
FROM khs_units
WHERE length(COALESCE(quote,'')) = 0
LIMIT 200;