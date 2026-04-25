# TENMON-ARK Doctor v2 Report (Phase 1)

- generated_at: `2026-04-25T23:30:48.699412+00:00`
- doctor_version: `v2.0.0-phase1`
- verdict: **RED**
- summary: critical=1 / warn=3 / info=0

## 1. git

- branch: `feature/unfreeze-v4`
- commit: `4ee8c7b1` - feat(evolution-log): RELEASE-NOTES-MEMORY-PROJECTION-V1 - founder release note for chat-clause two-source supply
- committer_date: 2026-04-26T07:54:11+09:00
- dirty: 0 / untracked: 3
- ahead/behind: 0/0

## 2. API

- /api/health status: 200
- claude-summary verdict: FAIL
- intelligence enforcer: clean | coverage_ratio=None
- chat probe:
    - status: 200
    - response_length: 165
    - mode: NATURAL / intent: chat
    - provider: None / model: None
    - thread: `doctor-v2-probe-20260425233046`

## 3. PWA

- /pwa/ status: 200
- /pwa/evolution status: 200
- /pwa (no slash) status: 404
- bundle: `/var/www/tenmon-pwa/pwa/assets/EvolutionLogPage-CPAtzADp.js`
  - title `言霊憲法が会話により深く反映されるようになりました` hit: True
  - title `言霊憲法が記憶層にも定着しました` hit: True
  - title `言霊憲法の本文に基づいて答えられるようになりました` hit: True
  - title `チャット応答が長く話せるようになりました` hit: True
- sidebar 進化ログ link in bundles: True

## 4. DB

- memory_units_total: 253030
- kotodama_units: 12
- thread_center_memory: 9178
- persona_knowledge_bindings: 105
- thread_persona_links: 112975
- persona_profiles: 2
- sacred_corpus_registry: 1014

## 5. Safety

- tenmon-auto-patch: active=inactive enabled=disabled
- tenmon-runtime-watchdog: active=active enabled=enabled
- denylist exists: True (/opt/tenmon-ark-repo/docs/ark/automation/dangerous_script_denylist_v1.json)
- auto_runner exists: True | denylist_wired: True
- mc-collect timers: 3 entries
    - `Sun 2026-04-26 08:33:17 JST 2min 29s left Sun 2026-04-26 08:28:17 JST 2min 30s ago mc-collect-live.timer          mc-collect-live.service`
    - `Sun 2026-04-26 08:33:20 JST 2min 32s left Sun 2026-04-26 08:23:20 JST 7min ago     mc-collect-git.timer           mc-collect-git.service`
    - `Sun 2026-04-26 09:21:47 JST 50min left    Sun 2026-04-26 08:21:47 JST 9min ago     mc-collect-all.timer           mc-collect-all.service`

## 6. PromptTrace (latest jsonl entry)

- khs_constitution: 1148 (expected ≈ 1148)
- kotodama_constitution_v1: 2895 (expected ≈ 2895)
- kotodama_constitution_memory: 2139 (expected ≈ 2139)
- response_length: 165
- route_reason: NATURAL_GENERAL_LLM_TOP
- provider: gemini
- ts: 1777159848503

## 7. Evolution log

- entry_ids (top up to 8):
  - `evo-2026-04-25-constitution-memory-projection`
  - `evo-2026-04-25-constitution-memory-distill`
  - `evo-2026-04-25-constitution-promotion`
  - `evo-2026-04-25-clamp`
  - `evo-2026-04-24-50sounds`
  - `evo-2026-04-24-bridge`
  - `evo-2026-04-24-watcher`
  - `evo-2026-04-24-trace`
- bundle hits (top 4 expected):
  - `evo-2026-04-25-constitution-memory-projection`: True
  - `evo-2026-04-25-constitution-memory-distill`: True
  - `evo-2026-04-25-constitution-promotion`: True
  - `evo-2026-04-25-clamp`: True

## 8. Next card suggestions

- CARD-DOCTOR-V2-REPAIR-API-V1

## Findings

- [warn] [git] 3 untracked file(s)
- [critical] [api] acceptance verdict FAIL
- [warn] [pwa] /pwa returns 404 (trailing-slash issue)
- [warn] [prompt_trace] latest trace response_length=165 < 600

