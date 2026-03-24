# TENMON_CHAT_SUBCONCEPT_MISFIRE — acceptance report v2

- **generated_at**: 2026-03-24T22:44:55Z
- **overall**: **PASS**

## Probes

| # | Case | routeReason | PASS |
|---|------|-------------|------|
| 1 | 言霊とは | `DEF_FASTPATH_VERIFIED_V1` | True |
| 2 | 君の思考を聞きたい | `AI_CONSCIOUSNESS_LOCK_V1` | True |
| 3 | 今日の大分の天気は？ | `FACTUAL_WEATHER_V1` | True |
| 4 | それは違うよ | `FACTUAL_CORRECTION_V1` | True |
| 5 | 言霊とは → 教えて | `CONTINUITY_ROUTE_HOLD_V1` | True |

## Notes

- Probe 1 expects `DEF_FASTPATH_VERIFIED_V1`.
- Probes 2–3 must not be `TENMON_SUBCONCEPT_CANON_V1` and must not contain template/carry needles (see evidence JSON).
- Probe 4 expects `FACTUAL_CORRECTION_V1`.
- Probe 5 expects continuity route (`CONTINUITY_ROUTE_HOLD_V1` or `CONTINUITY_*`).

## NEXT

- **PASS** → `TENMON_K1_AND_GENERAL_ROUTE_LLM_COMPLETION_FIX_CURSOR_AUTO_V1`
- **FAIL** → `TENMON_CHAT_SUBCONCEPT_MISFIRE_AND_TEMPLATE_LEAK_FIX_RETRY_CURSOR_AUTO_V1`
