# Iroha-MC Chapter Tracking — Observe (CARD-IROHA-MC-CHAPTER-TRACKING-V1)

- generated_at: `2026-04-26T06:41:26.814261+00:00`
- observer_version: v1.0.0
- verdict: **YELLOW**
- summary: critical=0 / warn=2 / info=6

## DB schema (iroha_*)

- `iroha_actionpacks` rows=1 cols=[packId, kind, payloadJson, status, createdAt]
- `iroha_khs_alignment` rows=10 cols=[alignId, irohaUnitId, khsLawKey, relation, score, note, createdAt]
- `iroha_units` rows=21 cols=[unitId, doc, pdfPage, anchor, kw, quote, quoteHash, status, createdAt]

## Canon JSON (iroha_kotodama_hisho.json)

- primary: `/opt/tenmon-ark-repo/shared/kotodama/iroha_kotodama_hisho.json`
- top_level_keys: ['title', 'total_paragraphs', 'content']
- chapter_field_in_root: False
- content len: 1037, item types: ['str']
- content avg/min/max chars: 86.09 / 1 / 477

## Existing chapter / principle implementation in loader

- loader: `api/src/core/irohaKotodamaLoader.ts`
- IrohaParagraph fields: ['index', 'text', 'chapter', 'soundAnchors', 'principleTags', 'healthRelated']
- buildIrohaInjection returns string: True
- buildIrohaInjection uses chapter tag: True
- existing CHAPTER_KEYWORDS keys: ['第一章_普遍叡智', '第二章_イゑす', '第三章_モせす', '第四章_トカナクテシス', '第五章_聖書的誤解', '第六章_空海の霊的役割', '第七章_結論']
- existing PRINCIPLE_KEYWORDS keys: ['水火', '結び', '生死', '発顕', '浄化', '凝固']

## Chapter coverage estimates

### existing 7-chap

- coverage: **20.06%** (classified 208/1037, multi_match=11)
- counts: {'第一章_普遍叡智': 2, '第二章_イゑす': 17, '第三章_モせす': 177, '第四章_トカナクテシス': 5, '第五章_聖書的誤解': 2, '第六章_空海の霊的役割': 17, '第七章_結論': 1}

### existing 6-principle

- coverage: **53.33%** (classified 553/1037, multi_match=226)
- counts: {'水火': 160, '結び': 208, '生死': 221, '発顕': 102, '浄化': 53, '凝固': 122}

### TENMON 5-chap

- coverage: **25.65%** (classified 266/1037, multi_match=36)
- counts: {'47ji': 29, 'ongi': 13, 'seimei': 191, 'shisei': 68, 'hokekyo': 2}

## Diff estimate (approach Y recommended)

- recommended: **approach_y_two_axis**
- total_estimated_lines: **46**
- back_compat: True
  - irohaKotodamaLoader.ts (CHAPTER_KEYWORDS_V5 + IrohaParagraph.chapterTagsV5): +12 lines
  - intelligenceFireTracker.ts (PromptTraceClauseLengthsV1 + summary aggregator): +15 lines
  - chat.ts (clause_lengths.iroha_chapters object): +5 lines
  - satoriEnforcement.ts (IrohaGroundingResult.matchedChapters?): +5 lines
  - chat.ts:893 (df.ku.irohaGrounding pass-through matchedChapters): +1 lines
  - buildIrohaInjection (export new helper summarizeIrohaInjectionByChapterV1): +8 lines

## Findings

- [warn] [db_schema] iroha_units has no chapter-like column (cols=['unitId', 'doc', 'pdfPage', 'anchor', 'kw', 'quote', 'quoteHash', 'status', 'createdAt']); chapter classification must rely on keyword regex (approach A) or supplement table (approach B)
- [info] [db_alignment] iroha_khs_alignment rows=10, distinct iroha_units=3; khsLawKey is 言霊秘書 hash, not 法華経 chapter id
- [info] [canon_json] iroha_kotodama_hisho.json top-level has no chapter key (keys=['title', 'total_paragraphs', 'content']); content is flat string list (n=1037)
- [info] [impl] existing CHAPTER_KEYWORDS in loader: 7 keys (thought-history axis)
- [info] [impl] existing PRINCIPLE_KEYWORDS in loader: 6 keys (structural axis)
- [info] [coverage_existing_7] existing 7-chap coverage = 20.06% (classified=208/1037)
- [info] [coverage_existing_6] existing 6-principle coverage = 53.33% (classified=553/1037, multi_match=226)
- [warn] [coverage_tenmon_5] TENMON 5-chap initial keyword coverage = 25.65% (<50%); keyword dict needs strengthening esp. hokekyo (counts={'47ji': 29, 'ongi': 13, 'seimei': 191, 'shisei': 68, 'hokekyo': 2})

## Card candidates

- [P1] **CARD-IROHA-MC-CHAPTER-TRACKING-IMPLEMENT-V1** (chapter_tracking_observe)
  - reason: implement approach Y (existing 7 + TENMON 5 dual-axis) per design
- [P2] **CARD-IROHA-MEMORY-PROJECTION-AUDIT-V1** (tenmon_priority)
  - reason: memory_units iroha 63 / 32 scope_id projection rate visualization (read-only)
- [P3] **CARD-IROHA-NOTION-STRUCTURE-WRITE-V1** (tenmon_priority)
  - reason: Notion 5-chapter map (write-pending) - safer to write after MC chapter KPI lands
- [P4] **CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1** (tenmon_priority)
  - reason: tone policy main-line (orthogonal to chapter tracking)
