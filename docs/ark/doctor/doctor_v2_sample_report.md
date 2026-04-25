# TENMON-ARK Doctor Report (Phase A Native) — Sample

- **Generated**: 2026-04-25T16:23:00+09:00
- **Card**: CARD-DOCTOR-V2-PHASE-A-NATIVE-V1 (OBSERVE / 設計、実装は別カード)
- **Design Doc**: `docs/ark/doctor/DOCTOR_V2_PHASE_A_NATIVE_DESIGN_V1.md`
- **Verdict**: **GREEN** (All Phase A modules healthy, 2 warn alerts, 3 info alerts)
- **Note**: 本サンプルは実 VPS の READ-ONLY 実測値を基に手動構成。doctor の実装そのものは Phase 2 別カード (`CARD-DOCTOR-V2-IMPLEMENT-V1`) で行う。

---

## 1. Git 状態

| 項目 | 値 |
|---|---|
| HEAD (short) | `b93b70b8` |
| HEAD (full) | `b93b70b8cd1dc427559678fee2c1cb1be04742ff` |
| Branch | `feature/unfreeze-v4` |
| Last commit subject | docs(card-templates): DENYLIST-CURSOR-CARD-CHECK-V1 - operational checklist & guide |
| Last commit ISO | 2026-04-25T16:11:29+09:00 |
| Dirty | clean (untracked=0, modified=0) |
| Commits last 30d | 211 |
| Commits last 7d | 50 |

直近 5 commits:

```
b93b70b8 docs(card-templates): DENYLIST-CURSOR-CARD-CHECK-V1 ...
df76610b feat(automation): DENYLIST-AUTORUNNER-WIRING-V1 ...
563fa399 docs(automation): DANGEROUS_SCRIPT_DENYLIST_V1 ...
cb09a0a9 fix(mc): MC-COLLECTOR-GIT-REPAIR-V1 ...
72d539c8 docs(automation): MC_COLLECTOR_FAILED_OBSERVE_V1 ...
```

## 2. 本番 API

| 項目 | 状態 |
|---|---|
| `tenmon-ark-api.service` | active / enabled / PID **854190** |
| `/api/mc/vnext/claude-summary` `acceptance.verdict` | **PASS** (10 / 10 checks) |
| `/api/mc/vnext/intelligence` `enforcer.verdict` | **clean** (6 / 6 checks, 0 violations) |
| `kotodama_50_coverage` | total=50, with_entry=**13**, ratio=**0.26** |
| `kotodama_bridges` | total=2, status=`registered_not_synced`, has_primary=true, has_separation=true |
| `/pwa/evolution` | **HTTP 200** (5 entries 公開中) |
| `/api/chat` T1 (こんにちは) | **40 chars** |
| `/api/chat` T4 (長文) | **807 chars** (CLAMP-REPAIR 維持、>500) |

acceptance.checks 主要 reasons (12 件中 抜粋):

- canonical path: canonical 13 件・/mc/ 正統エントリあり (MC-07)
- ledger flowing: 24h: route=318 llm=320 memory=1028 quality=318 全書込あり
- continuation healthy: 100% (146/146) ≥ 60%
- persist healthy: 100% (710/710)
- alerts below critical: CRIT=0 / HIGH=0 (<2)

## 3. MC Collectors

| Collector | timer | service result | last exit |
|---|---|---|---|
| `mc-collect-live` | active / enabled | **success** | 2026-04-25 16:20:07 JST |
| `mc-build-handoff` | active / enabled | **success** | 2026-04-25 16:14:24 JST |
| `mc-collect-git` | active / enabled | **success** (修復済 cb09a0a9) | 2026-04-25 16:18:19 JST |
| `mc-collect-all` | active / enabled | **success** (伝播 green) | 2026-04-25 16:20:53 JST |

出力 JSON (`/opt/tenmon-ark-data/mc/`):

| ファイル | size | mtime |
|---|---|---|
| `live_state.json` | 1877 B | 2026-04-25T16:20:53+09:00 |
| `git_state.json` | 5590 B | 2026-04-25T16:20:53+09:00 |
| `overview.json` | 620 B | 2026-04-25T16:20:53+09:00 |
| `ai-handoff.json` | 1778 B | 2026-04-25T16:20:53+09:00 |

## 4. 安全層

| 項目 | 状態 |
|---|---|
| denylist JSON 存在 | **yes** (`docs/ark/automation/dangerous_script_denylist_v1.json`、29037 B) |
| denylist スキーマ | v1, default_action=block, 5 categories, **54** explicit + **40** deny_globs + **4** allow_globs |
| `tenmon-auto-patch.service` | inactive / **disabled** (RETIRE 完了) |
| `tenmon-runtime-watchdog.service` | active / enabled / PID **2539152** ⚠️ phantom 候補 |
| `tenmon-ark-api.service` | active / enabled / PID **854190** |
| `nginx.service` | active / enabled / PID **891111** |
| `tenmon_auto_runner` denylist 配線 | **wired** (commit df76610b) |

denylist 配線済 fence (4 種):

| Fence | 状態 |
|---|---|
| `tenmon_auto_runner` | **wired** (df76610b) |
| `tenmon_doctor` | not_wired (本設計後、別カード) |
| `cursor_via_card` | not_wired (Phase γ) |
| 旧 4GB VPS automation_os | not_wired (Phase C 低優先度) |

## 5. Feedback Loop

| 項目 | 状態 |
|---|---|
| `/api/feedback/history` endpoint | **HTTP 200** |
| local fallback dir | `api/data/feedback/` (2 files: FB-20260414-3524.json, FB-20260414-4673.json) |
| 設計書 | `docs/ark/feedback/FEEDBACK_LOOP_OBSERVE_V1.md` |
| Notion 書き込み | doctor 対象外 (READ-ONLY 原則) |

## 6. 自動構築 OS 前進度

| 項目 | 値 |
|---|---|
| Phase A SEAL commit | `a6d43996` (CONSTITUTION-ENFORCER-V1) |
| 30d commits | 211 |
| 7d commits | 50 (feat=22, docs=13, fix=7, others=8) |
| 進化ログ entries | **5** (`web/src/data/evolution_log_v1.ts`) |
| 進化ログ route | `/pwa/evolution` (HTTP 200 維持) |

直近 Phase B SEAL commits:

```
7a2f3ca8  feat(chat): CLAMP-REPAIR-V1
211d3d60  feat(founder-ui): RELEASE-NOTES-UI-PHASE-A-V1 → /pwa/evolution
563fa399  docs(automation): DANGEROUS_SCRIPT_DENYLIST_V1
df76610b  feat(automation): DENYLIST-AUTORUNNER-WIRING-V1
b93b70b8  docs(card-templates): DENYLIST-CURSOR-CARD-CHECK-V1
```

## 7. アラート

### WARN

- **watchdog_phantom**: `tenmon-runtime-watchdog.service` は active (PID 2539152) だが ExecStart args が deleted file を指す可能性。
  - 推奨: `CARD-AUTOMATION-WATCHDOG-RETIRE-V1` (低優先度) で整理
- **kotodama_50_coverage_low**: with_entry=13/total=50, ratio=0.26 (< 0.30)
  - 推奨: `CARD-50ON-COVERAGE-EXPAND-V1` (Phase B 計画)

### INFO

- **auto_runner_unwired_doctor**: `tenmon_doctor` が denylist に未配線 (Phase 2 別カード予定)
- **auto_runner_unwired_cursor**: `cursor_via_card` が denylist に未配線 (Phase γ 別カード予定)
- **old_vps_unwired**: 旧 4GB VPS automation_os が未配線 (Phase C 低優先度)

## 8. Verdict & Reason

**GREEN** (verdict)

理由:
- Phase A モジュール全 clean (acceptance PASS 10/10, enforcer clean 6/6, 0 violations)
- 安全層 (`tenmon_auto_runner`) 配線済 (df76610b)
- mc-collect 4 collector 全 green
- chat clamp 維持 (T4=807 chars > 500)
- /pwa/evolution HTTP 200 維持
- API PID 854190 stable

WARN は 2 件 (どちらも非阻害・低優先度)、CRITICAL なし。

## 9. 推奨次手 (Next Card Suggestions)

### HIGH priority

(なし)

### MEDIUM priority

1. `CARD-AUTOMATION-WATCHDOG-RETIRE-V1`
   - phantom 状態の `tenmon-runtime-watchdog.service` を整理
   - 根拠: `docs/ark/automation/AUTOMATION_PHANTOM_UNIT_OBSERVE_V1.md`

### LOW priority

1. `CARD-DOCTOR-V2-IMPLEMENT-V1`
   - 本設計書 (`DOCTOR_V2_PHASE_A_NATIVE_DESIGN_V1.md`) の実装
2. `CARD-DENYLIST-DOCTOR-WIRING-V1`
   - `tenmon_doctor` を denylist に配線
3. `CARD-50ON-COVERAGE-EXPAND-V1`
   - 50 音 with_entry を 13 → 30 以上に
4. `CARD-DENYLIST-CURSOR-CARD-CHECK-WIRING-V1` (Phase γ)
   - `cursor_via_card` を denylist に配線

---

## 付録: 観測コマンド再現手順 (READ-ONLY)

本サンプルを再生成する READ-ONLY コマンド:

```bash
SVC_PID=$(systemctl show tenmon-ark-api.service -p MainPID --value)
TOKEN=$(cat /proc/$SVC_PID/environ | tr '\0' '\n' | grep '^TENMON_MC_CLAUDE_READ_TOKEN=' | cut -d= -f2-)

git rev-parse --short HEAD
git status --porcelain | wc -l
git log --oneline --since '30 days ago' | wc -l

curl -s -H "Authorization: Bearer $TOKEN" https://tenmon-ark.com/api/mc/vnext/claude-summary | jq '.acceptance'
curl -s -H "Authorization: Bearer $TOKEN" https://tenmon-ark.com/api/mc/vnext/intelligence | jq '.kotodama_constitution_enforcer, .kotodama_50_coverage, .kotodama_bridges'
curl -sI https://tenmon-ark.com/pwa/evolution | head -1
curl -s https://tenmon-ark.com/api/chat -H 'Content-Type: application/json' -d '{"message":"こんにちは"}' | jq '.response | length'

for U in mc-collect-live mc-build-handoff mc-collect-git mc-collect-all ; do
  systemctl is-active $U.timer
  systemctl show $U.service -p Result --value
done

ls -la /opt/tenmon-ark-data/mc/

jq '{schema_version, num_explicit_scripts:[.categories[].scripts|length]|add, num_deny_globs:.path_patterns.deny_globs|length}' \
  /opt/tenmon-ark-repo/docs/ark/automation/dangerous_script_denylist_v1.json

for U in tenmon-auto-patch tenmon-runtime-watchdog tenmon-ark-api nginx ; do
  echo "$U: $(systemctl is-active $U.service) / $(systemctl is-enabled $U.service) / PID=$(systemctl show $U.service -p MainPID --value)"
done

curl -sI https://tenmon-ark.com/api/feedback/history | head -1
ls api/data/feedback/*.json 2>/dev/null | wc -l
grep -c '^  {' web/src/data/evolution_log_v1.ts
```

すべて **READ-ONLY**。doctor 実装後は単一コマンド `tenmon doctor verify --out-dir automation/out/` で同等出力を生成する。
