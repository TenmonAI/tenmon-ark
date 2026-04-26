# IROHA Kotodama Source Observe (Phase 1)

- generated_at: `2026-04-26T03:12:37.057774+00:00`
- observer_version: `v1.0.0-iroha-phase1`
- verdict: **GREEN**
- summary: critical=0 / warn=0 / info=0
- connection_rate: **100%**

## 1. VPS resources

- iroha_kotodama_hisho.json: exists=True size=275614 sha8=c5f18b9b4ffa top_keys=3
- shared/ iroha files: 1
- docs/ iroha files: 3

## 2. Engine / loader

- irohaEngine_ts: exists=True lines=30 exports=1
- irohaActionPatterns_ts: exists=True lines=192 exports=5
- irohaKotodamaLoader_ts: exists=True lines=229 exports=6
- iroha files in api/src: 7

## 3. Route wiring

- chat.ts iroha refs: 26
- guest.ts iroha refs: 11
- other route files with refs: 1

## 4. DB

- iroha tables found: iroha_actionpacks, iroha_khs_alignment, iroha_units
  - iroha_units: exists=True row_count=21 cols=9
  - iroha_actionpacks: exists=True row_count=1 cols=5
  - iroha_khs_alignment: exists=True row_count=10 cols=7
- memory_units iroha total: 63
  - by_scope_id: 32 scopes
- source_registry iroha total: 0

## 5. Chat probe

- status=200 response_length=343 sha8=05494f1c
- route_reason=chat provider=gemini model=None
- prompt_trace iroha keys (1):
  - iroha: 668

## 6. MC / intelligence iroha paths

- claude_summary iroha paths (0):
- intelligence iroha paths (2):
  - fire_24h.slot_chat_binding.iroha: {"chat_binding": "__irohaClause", "module_file": "core/irohaKotodamaLoader.ts"}
  - fire_24h.prompt_trace_summary_24h.avg_clause_lengths.iroha: 760

## 7. Notion

- token_present: True
- iroha page (id_sha8=0fb109c9): title=いろは言灵解｜天聞アーク思考根幹・徹底解析
  - headings: 8
  - child_pages: 0
  - child_databases: 0
- structure check: iroha_47_chapters=False, ongi_table=False, lifeview=False, deathview=False, hokekyo_link=False
- konpon page found: True

## 8. Connection layers

- layer1_resource: **connected**
- layer2_db: **connected**
- layer3_loader: **connected**
- layer4_engine: **connected**
- layer5_chat: **connected**
- connection_rate: **100%**

## 9. Missing links

(none — all layers connected)

## 10. Card candidates

- 1. `CARD-IROHA-NOTION-STRUCTURE-COMPLEMENT-V1` — Notion 解析班ページに未整備の章節 (5/5): iroha_47_chapters, ongi_table, lifeview, deathview, hokekyo_link → 章構造の補強観測。
- 2. `CARD-IROHA-MC-CONNECTION-AUDIT-V1` — MC intelligence の iroha 観測項目を細粒度化し、24h ledger に章別追跡を加える。
- 3. `CARD-IROHA-PROMPT-TRACE-OBSERVATION-V1` — chat lane 別の iroha clause 出現を追跡し、断捨離応用へ繋げる。
- 4. `CARD-IROHA-NOTION-BRIDGE-V1` — Notion 解析班ページと VPS 資料の双方向同期 (read-only) を整備する。

## Roadmap summary

接続率 100% (connected=5/5)。 全層 connected。Notion 照合と MC 観測の追加段へ。

## Findings

(none)

