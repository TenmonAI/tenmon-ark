# Iroha-MC Connection Audit (CARD-IROHA-MC-CONNECTION-AUDIT-V1)

- generated_at: `2026-04-26T06:19:50.755657+00:00`
- audit_version: v1.0.0
- verdict: **YELLOW**
- summary: critical=0 / warn=1 / info=4

## MC Endpoints (HEAD)

- health: status=200 url=https://tenmon-ark.com/api/health
- claude_summary: status=401 url=https://tenmon-ark.com/api/mc/vnext/claude-summary
- intelligence: status=401 url=https://tenmon-ark.com/api/mc/vnext/intelligence

## prompt_trace 24h (iroha clause)

- log: `/opt/tenmon-ark-data/mc_intelligence_fire.jsonl` exists=True size=338314
- events_24h=244, with_prompt_trace=244, iroha_fired=244
- clause_lengths: n=244, min=342, max=1436, avg=766.73
- iroha clause_keys_seen: ['iroha']

## doctor v2 prompt_trace section

- exists=True verdict=RED profile=default
- iroha_keys_in_prompt_trace: []
- all_prompt_trace_keys: ['khs_constitution', 'kotodama_constitution_memory', 'kotodama_constitution_v1', 'provider', 'response_length', 'route_reason', 'source', 'ts']

## Route-level matrix

| route | avg chars (24h) | grounding | binding | inject probe | iroha refs |
|---|---|---|---|---|---|
| /api/chat | 766.73 | decisionFrame.ku.irohaGrounding (object: passed/score/sounds/actionPattern/amaterasuAxis) | fired (slot_chat_binding.iroha = __irohaClause) | recorded (inject_iroha) | 24 |
| /api/guest | None | irohaGroundingScore (scalar 0-3) | local hits via queryIrohaByUserText (no slot_chat_binding alias) | absent | 11 |
| /api/mc/vnext/claude-summary | None | N/A (auth required, status=401) | schema-defined (slot_chat_binding.iroha) but observable only with bearer token | N/A | None |
| /api/mc/vnext/intelligence | None | N/A (auth required, status=401) | schema-defined; deepIntelligenceMapV1 marks irohaKotodamaLoader / irohaGrounding | N/A | None |

## Chapter tracking

- currently_aggregated: False
- iroha_keys_seen_anywhere: ['iroha']
- missing_indicators: ['iroha_47ji', 'iroha_ongi', 'iroha_seimei', 'iroha_shisei', 'iroha_hokekyo']

## Findings

- [info] [prompt_trace] 24h iroha clause avg=766.73 within expected band (~760)
- [info] [doctor_v2_prompt_trace] doctor v2 prompt_trace section does not surface iroha keys
- [info] [mc_endpoint] claude-summary 401 (auth missing, strategy C)
- [info] [mc_endpoint] intelligence 401 (auth missing, strategy C)
- [warn] [chapter_tracking] chapter-level keys missing: iroha_47ji,iroha_ongi,iroha_seimei,iroha_shisei,iroha_hokekyo

## Card candidates

- [P2] **CARD-IROHA-MC-CHAPTER-TRACKING-V1** (iroha_audit)
  - reason: chapter-level keys missing: iroha_47ji,iroha_ongi,iroha_seimei,iroha_shisei,iroha_hokekyo
- [P3] **CARD-IROHA-MEMORY-PROJECTION-AUDIT-V1** (iroha_audit)
  - reason: memory_units iroha (63 / 32 scope_id) projection rate not yet visible
- [P4] **CARD-IROHA-NOTION-STRUCTURE-WRITE-V1** (iroha_audit)
  - reason: Notion 5-chapter map remains pending; audit foundation now ready
- [P4] **CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1** (tenmon_priority)
  - reason: TENMON main-line (tone) candidate; complementary
- [P5] **CARD-IROHA-MC-CONNECTION-AUDIT-IMPL-V1** (iroha_audit)
  - reason: scriptize this audit for periodic execution from old_vps base
