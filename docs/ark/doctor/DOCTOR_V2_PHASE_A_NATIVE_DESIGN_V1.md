# DOCTOR_V2_PHASE_A_NATIVE_DESIGN_V1

- 日時: 2026-04-25
- 監査者: Cursor (TENMON-ARK 自動構築 OS 中核観測コマンド設計)
- card: CARD-DOCTOR-V2-PHASE-A-NATIVE-V1
- 種別: **OBSERVE / 設計 (実装は別カード)**
- parent_commit: `b93b70b8` (DENYLIST-CURSOR-CARD-CHECK-V1)
- 一次情報源:
  - `docs/ark/automation/dangerous_script_denylist_v1.json` (commit 563fa399)
  - `automation/tenmon_auto_runner.py` (commit df76610b、precheck wired)
  - `web/src/data/evolution_log_v1.ts` (commit 211d3d60、Phase α 5 entries)
  - 本番 API: `/api/mc/vnext/claude-summary`, `/api/mc/vnext/intelligence`, `/pwa/evolution`, `/api/chat`
  - mc-collector 出力: `/opt/tenmon-ark-data/mc/*.json` (live_state, git_state, overview, ai-handoff)

---

## Section 1: 目的と背景

### 1.1 なぜ doctor v2 が必要か

TENMON / Claude / Cursor が現状の自動構築 OS の状態を確認するために、毎回以下を手動で打鍵している:

1. `git log -1 --oneline` / `git status --short`
2. `systemctl is-active tenmon-ark-api` / `systemctl show tenmon-ark-api -p MainPID --value`
3. `curl -s -H "Authorization: Bearer $TOKEN" .../api/mc/vnext/claude-summary | jq '.acceptance.verdict'`
4. `curl -s -H "Authorization: Bearer $TOKEN" .../api/mc/vnext/intelligence | jq '.kotodama_constitution_enforcer.verdict'`
5. `curl -sI .../pwa/evolution | head -1`
6. `curl -s .../api/chat -d '{"message":"こんにちは"}'`
7. `systemctl is-active mc-collect-* tenmon-runtime-watchdog tenmon-auto-patch ...`
8. `jq '. | {schema_version, total_scripts: ...}' docs/ark/automation/dangerous_script_denylist_v1.json`

これら **5-8 コマンド** を 1 つの `tenmon doctor` コマンドに集約する。

### 1.2 自動構築 OS における位置

```
[ TENMON ]
   ↓ (裁定)
[ Claude (起案) ] ← doctor で起案前 health 確認
   ↓ (denylist セルフレビュー)
[ TENMON (確認) ] ← doctor で投入前 health 確認
   ↓ (投入)
[ Cursor (実行) ] ← doctor で PRE/POST 確認 (各カードで使用)
   ↓ (実行 → seal commit)
[ tenmon doctor v2 ] ← この層
   ↓ (gate)
[ next card 起案 ]
```

doctor v2 は **「自動構築 OS の心電図」** であり、各 step の前後で打って差分を確認する。

### 1.3 旧 doctor との違い

| 項目 | 旧 `server/cli/doctor.ts` (368 行、3 月作成) | 新 `tenmon doctor v2` (本設計) |
|---|---|---|
| 対象 | 5 項目 (env / db / api-keys / file-structure / dependencies) | 6 領域 (Git / API / mc-collect / 安全層 / feedback-loop / 進化度) |
| Phase A 対応 | 未対応 | 対応 (acceptance / enforcer / 50音 / bridges) |
| 安全層認識 | なし | denylist + auto_runner wired を確認 |
| 出力形式 | text のみ | JSON + MD + Next Card 提案 |
| 配置 | `server/cli/doctor.ts` (TS) | `automation/tenmon_doctor_v2.py` (Python、別カードで実装) |
| 使用頻度 | 開発初期のみ | 各カードの PRE/POST、TENMON 裁定前に常用 |

旧 doctor の **思想 (= 5 項目チェックの構造化)** は再利用するが、実装は完全新規。

## Section 2: 統合対象 6 領域

### 2.1 Git 状態

- HEAD short SHA / full SHA
- branch name
- last commit (subject + author + ISO timestamp)
- dirty count (untracked / modified / staged)
- commits in last 30 days / last 7 days
- recent commits (10 件)

### 2.2 本番 API

- `tenmon-ark-api.service` PID + active 状態
- `/api/mc/vnext/claude-summary`:
  - `acceptance.verdict` (PASS/FAIL)
  - `acceptance.checks[].status` 集計 (10 項目)
  - `acceptance.lastVerifiedAt`
- `/api/mc/vnext/intelligence`:
  - `kotodama_constitution_enforcer.verdict` (clean/violations)
  - `kotodama_constitution_enforcer.violation_count_error/warn`
  - `kotodama_50_coverage.{total, with_entry, coverage_ratio}`
  - `kotodama_bridges.{status, total, has_primary_bridge, has_separation_policy}`
- `/pwa/evolution` HTTP status
- `/api/chat` T1 (短文) / T4 (長文) lengths (CLAMP-REPAIR 維持確認)

### 2.3 mc-collect 状態

- `mc-collect-live.timer` / `mc-collect-live.service`
- `mc-build-handoff.timer` / `mc-build-handoff.service`
- `mc-collect-git.timer` / `mc-collect-git.service`
- `mc-collect-all.timer` / `mc-collect-all.service`
- 各 service の `Result` (success / failed)
- 各 service の `ExecMainExitTimestamp`
- 出力 JSON 4 種の mtime + size (`/opt/tenmon-ark-data/mc/`):
  - `live_state.json`, `git_state.json`, `overview.json`, `ai-handoff.json`

### 2.4 安全層

- denylist JSON 存在確認 (path + size + schema_version + 件数)
- `tenmon-auto-patch.service`: inactive / disabled (RETIRE 完了)
- `tenmon-runtime-watchdog.service`: active / phantom 状態 (deleted ExecStart)
- `tenmon-ark-api.service`: active / PID
- `nginx.service`: active / PID
- `tenmon_auto_runner` denylist wired 状態 (commit df76610b 以降)
- `tenmon_doctor` 配線: 未配線 (本カード対象外、別カード)
- `cursor_via_card` 配線: 未配線 (Phase γ 別カード)

### 2.5 feedback-loop

- `/api/feedback/history` endpoint 状態
- ローカル fallback (`api/data/feedback/*.json`) 件数
- Notion DB の存在確認 (DB ID は記録のみ、READ-ONLY)
- 未処理件数 (local fallback 経由で集計)

### 2.6 自動構築 OS 前進度

- 直近 30 日 / 7 日の commit 数
- Phase A SEAL commit (a6d43996, MC-20 CONSTITUTION-ENFORCER) 後の進捗
- Phase B 系 SEAL commit 一覧 (CLAMP-REPAIR / DENYLIST 系 / FOUNDER-RELEASE-NOTES 等)
- 進化ログ entries 数 (`web/src/data/evolution_log_v1.ts`)
- 直近 Card 完了履歴 (subject から抽出)

## Section 3: 観測項目の完全リスト

| # | 領域 | 項目 | データソース | 形式 |
|---|---|---|---|---|
| 1 | Git | HEAD short | `git rev-parse --short HEAD` | 文字列 |
| 2 | Git | HEAD full | `git rev-parse HEAD` | 文字列 |
| 3 | Git | branch | `git rev-parse --abbrev-ref HEAD` | 文字列 |
| 4 | Git | last commit subject | `git log -1 --format=%s` | 文字列 |
| 5 | Git | last commit ISO | `git log -1 --format=%aI` | ISO8601 |
| 6 | Git | dirty count | `git status --porcelain \| wc -l` | int |
| 7 | Git | untracked count | `git status --porcelain \| grep -c '^??'` | int |
| 8 | Git | modified count | `git status --porcelain \| grep -vc '^??'` | int |
| 9 | Git | commits 30d | `git log --oneline --since '30 days ago' \| wc -l` | int |
| 10 | Git | commits 7d | `git log --oneline --since '7 days ago' \| wc -l` | int |
| 11 | API | tenmon-ark-api PID | `systemctl show tenmon-ark-api.service -p MainPID --value` | int |
| 12 | API | tenmon-ark-api active | `systemctl is-active tenmon-ark-api.service` | active/inactive |
| 13 | API | acceptance verdict | `/api/mc/vnext/claude-summary` -> `.acceptance.verdict` | PASS/FAIL |
| 14 | API | acceptance checks_pass | `[.acceptance.checks[]\|select(.status=="pass")]\|length` | int |
| 15 | API | acceptance checks_total | `.acceptance.checks \| length` | int |
| 16 | API | enforcer verdict | `/api/mc/vnext/intelligence` -> `.kotodama_constitution_enforcer.verdict` | clean/violations |
| 17 | API | enforcer total_checks | `.kotodama_constitution_enforcer.total_checks` | int |
| 18 | API | enforcer violations | `.kotodama_constitution_enforcer.violation_count_error+warn` | int |
| 19 | API | 50音 total | `.kotodama_50_coverage.total` | int |
| 20 | API | 50音 with_entry | `.kotodama_50_coverage.with_entry` | int |
| 21 | API | 50音 coverage ratio | `.kotodama_50_coverage.coverage_ratio` | float |
| 22 | API | bridges status | `.kotodama_bridges.status` | 文字列 |
| 23 | API | bridges total | `.kotodama_bridges.total` | int |
| 24 | API | /pwa/evolution status | `curl -sI .../pwa/evolution \| head -1` | HTTP code |
| 25 | API | chat T1 length | `/api/chat` "こんにちは" -> `.response\|length` | int |
| 26 | API | chat T4 length | `/api/chat` 長文 -> `.response\|length` | int |
| 27 | mc | live timer active | `systemctl is-active mc-collect-live.timer` | active/inactive |
| 28 | mc | live service result | `systemctl show mc-collect-live.service -p Result --value` | success/failed |
| 29 | mc | build_handoff timer/service | (同上) | -- |
| 30 | mc | git timer/service | (同上) | -- |
| 31 | mc | all timer/service | (同上) | -- |
| 32 | mc | live_state.json mtime | `stat -c %Y /opt/tenmon-ark-data/mc/live_state.json` | unix ts |
| 33 | mc | git_state.json mtime | (同上) | unix ts |
| 34 | mc | overview.json mtime | (同上) | unix ts |
| 35 | mc | ai-handoff.json mtime | (同上) | unix ts |
| 36 | safety | denylist JSON exists | `[ -f .../dangerous_script_denylist_v1.json ]` | bool |
| 37 | safety | denylist size | `stat -c %s` | int |
| 38 | safety | denylist schema_version | `jq -r .schema_version` | 文字列 |
| 39 | safety | denylist explicit count | `[.categories[].scripts\|length]\|add` | int (= 54) |
| 40 | safety | denylist deny_globs | `.path_patterns.deny_globs\|length` | int (= 40) |
| 41 | safety | denylist allow_globs | `.path_patterns.allow_globs\|length` | int (= 4) |
| 42 | safety | tenmon-auto-patch active/enabled | `systemctl is-active/is-enabled` | inactive/disabled (期待) |
| 43 | safety | watchdog active/PID | (同上) + `MainPID` | active/2539152 (期待) |
| 44 | safety | watchdog phantom | ExecStart の `path=` 確認 | bool |
| 45 | safety | nginx active/PID | (同上) | active/<PID> |
| 46 | safety | auto_runner denylist wired | `grep '_scan_card_for_denylist' automation/tenmon_auto_runner.py` | bool |
| 47 | feedback | endpoint status | `curl -sI .../api/feedback/history \| head -1` | HTTP code |
| 48 | feedback | local fallback count | `ls api/data/feedback/*.json \| wc -l` | int |
| 49 | progress | evolution_log entries | `grep -c '^  {' web/src/data/evolution_log_v1.ts` | int |
| 50 | progress | Phase A SEAL commit | `git log --grep 'CONSTITUTION-ENFORCER' -1` | sha |
| 51 | progress | Phase B SEAL commits | `git log --grep -E 'PHASE-A\|CLAMP-REPAIR\|DENYLIST'` | array |
| 52 | progress | recent cards (10) | `git log -10 --oneline` | array |

合計 **52 観測項目** (実装時の `assert` 数)。

## Section 4: 出力形式

### 4.1 JSON 出力 (`automation/out/doctor-report.json`)

machine-readable 形式。tooling / CI / dashboard で消費される。

```json
{
  "schema_version": "v1",
  "generated_at": "ISO8601",
  "report_type": "doctor_v2_phase_a_native",
  "git": { /* §2.1 */ },
  "production_api": { /* §2.2 */ },
  "mc_collectors": { /* §2.3 */ },
  "safety_layer": { /* §2.4 */ },
  "feedback_loop": { /* §2.5 */ },
  "autobuild_progress": { /* §2.6 */ },
  "alerts": [{"level": "info|warn|critical", "category": "...", "message": "...", "recommendation": "..."}],
  "verdict": "GREEN | YELLOW | RED",
  "verdict_reason": "..."
}
```

サンプルは `doctor_v2_sample_report.json` 参照。

### 4.2 MD 出力 (`automation/out/doctor-report.md`)

human-readable 形式。TENMON 裁定 / Claude 起案 / Cursor 実行前に目視で確認。

サンプルは `doctor_v2_sample_report.md` 参照。

### 4.3 Next Card 提案 (`automation/out/next-card-suggestion.md`)

doctor が出すアラートに基づき、次に投入すべきカード候補を提案する。

```markdown
# 推奨次手 (auto-generated by tenmon doctor v2)

## 優先度 HIGH
- (なし)

## 優先度 MEDIUM
- CARD-AUTOMATION-WATCHDOG-RETIRE-V1 (phantom 状態の整理)

## 優先度 LOW
- CARD-DOCTOR-V2-IMPLEMENT-V1 (本設計の実装)
- CARD-CONSTITUTION-CHAT-DELIVERY-OBSERVE-V1 (50音 coverage_ratio 0.26 → 上昇プラン)
```

提案ロジックは **Phase 2 で確定** (本カードでは spec のみ)。
本カード時点では:

- alerts に CRITICAL があれば HIGH
- alerts に WARN があれば MEDIUM
- alerts なしでも進行可能なら LOW (ロードマップ的提案)

## Section 5: コマンドライン仕様

```
tenmon doctor [options]

options:
  --json              JSON のみ出力 (stdout)
  --md                MD のみ出力 (stdout)
  --out-dir DIR       JSON + MD + next-card 提案を DIR に書き出す
                      (default: automation/out/)
  --quick             高速モード (mc-collect mtime / API health は skip)
  --strict            verdict が GREEN 以外で exit code 1
  --section SEC       特定 section のみ実行 (git/api/mc/safety/feedback/progress)
  --no-api            本番 API への curl を skip (オフライン時)

subcommand:
  tenmon doctor verify        : 1 回だけ実行して結果を出力
  tenmon doctor watch [--interval=60]  : Phase 2 で実装、本カード対象外

exit code:
  0 : verdict=GREEN (全 PASS)
  1 : verdict=YELLOW (warn あり)
  2 : verdict=RED (critical あり)
```

`tenmon doctor` 単体実行で `verify` を呼ぶ動作 (default subcommand)。
`watch` mode は **Phase 2 別カード**。

## Section 6: 実装言語と配置

### 6.1 候補比較

| 言語 | メリット | デメリット | 採否 |
|---|---|---|---|
| Bash | 依存ゼロ、即動く | JSON 組み立て / API 並列 / アラート判定が重い | 補助 |
| Python | json/urllib/subprocess 標準、tenmon_auto_runner と整合 | venv 不要だが python3 必須 | **採用** |
| TypeScript | 既存 doctor.ts と思想接続、ts-node 必要 | npm 依存ツリーが pwa とぶつかる懸念 | 不採用 |

### 6.2 採用案

- **Python 3** (`automation/tenmon_doctor_v2.py`)
- 既存 `automation/tenmon_auto_runner.py` (15 KB) と並置
- 依存: 標準ライブラリのみ (`json`, `urllib.request`, `subprocess`, `pathlib`, `datetime`, `os`)
- 起動: `python3 automation/tenmon_doctor_v2.py --out-dir automation/out/`
- 補助 wrapper (Phase 2): `automation/tenmon-doctor` (shell wrapper、PATH に link)

### 6.3 配置決定理由

1. tenmon_auto_runner.py との整合 (Python 同士、import 共有可能)
2. denylist JSON との parser 共有 (`json` 標準)
3. systemctl / curl は subprocess で呼ぶ (確立した方法)
4. 旧 doctor.ts の 5 項目構造を **クラス継承的に再利用** (思想のみ、実装は新規)

## Section 7: 既存 doctor との関係

### 7.1 旧 `server/cli/doctor.ts` (368 行)

- **保存方針**: 削除しない (旧 5 項目チェックは別文脈で動く可能性)
- **役割の分離**: 旧 doctor は dev 環境セットアップ check、新 doctor v2 は production health
- **思想再利用**: `HealthCheckResult` interface のシンプルさ (`check / status / message / details`) は採用

### 7.2 既存 health endpoint (`api/src/routes/health.ts` 34 行 / `api/src/ops/health.ts` 92 行)

- doctor v2 はこれを **読むだけ** (HTTP 越し)
- doctor v2 がこれを変更することはない (Phase A モジュール不変原則)

### 7.3 KHS health gate (`api/src/khs/healthGateV1.ts`)

- 同じく doctor v2 は **READ-ONLY** で参照

## Section 8: 旧 4GB VPS への展開

### 8.1 段階

```
Phase A: 本番 8GB VPS で動作確認 (本設計の実装、別カード)
Phase B: TENMON 直接 SSH での運用 (manual_only)
Phase C: 旧 4GB VPS への移送 (別カード、本カード対象外)
```

### 8.2 旧 4GB VPS での制約

- python3 はあるが automation_os の cli.ts は tsx 依存
- mc-collect 出力は同一スキーマで生成可能 (本番との同期 collector も別カード)
- 旧 VPS では `--no-api` モードで動かす案 (本番 API へ HTTP しない)

### 8.3 旧 VPS への展開は本カード対象外

本カードでは「旧 VPS への展開計画があること」のみ記述。実装・展開は **別カード**。

## Section 9: 安全性

### 9.1 READ-ONLY 原則

doctor v2 は **絶対に書き込みを行わない**。具体的には:

- ファイル書き込みは `automation/out/` 配下のみ (report 出力)
- denylist JSON / Phase A モジュール / chat.ts / DB / Notion: 一切触らない
- subprocess 起動は `systemctl is-active/is-enabled/show`, `git`, `curl GET`, `stat`, `jq` のみ
- 危険 script (denylist 対象) は **execute も grep もしない** (path 名を文字列として参照するのみ)

### 9.2 denylist との関係

- doctor v2 は denylist JSON を **メタ情報として読む**
- doctor v2 自身が denylist 対象に該当することはない (allow_globs 内の MC collector とは別領域)
- denylist の wired 状態 (`auto_runner` / `doctor` / `cursor_via_card`) は doctor が **報告** する

### 9.3 fail-closed

- `--strict` mode で verdict が GREEN 以外なら exit 1/2
- API 到達不能 → alerts に critical を立てる (verdict RED)
- denylist JSON 不在 → alerts に critical (verdict RED)

## Section 10: tenmon doctor が出すべきアラート

### 10.1 CRITICAL (verdict=RED)

| ID | 条件 | 推奨アクション |
|---|---|---|
| acceptance_fail | `acceptance.verdict != PASS` | 即 TENMON 報告、不変原則違反の調査 |
| enforcer_violations | `enforcer.violation_count > 0` | 憲法違反、即修正カード |
| api_unreachable | `/api/mc/vnext/*` が 200 を返さない | API 自体停止、即起動確認 |
| denylist_missing | denylist JSON 不在または parse 失敗 | 安全層 fail-closed、即復元 |
| auto_patch_revived | `tenmon-auto-patch active=active` | 緊急: 自動 deploy 復活 |
| api_pid_changed | tenmon-ark-api PID が前回と異なる | 不要な restart 発生、調査 |

### 10.2 WARN (verdict=YELLOW)

| ID | 条件 | 推奨アクション |
|---|---|---|
| watchdog_phantom | watchdog ExecStart が deleted 状態 | RETIRE カード起票 |
| mc_collect_failed | mc-collect-* の result が success でない | collector 修復カード |
| chat_clamp_regression | T4 length < 500 | CLAMP-REPAIR 退行確認 |
| pwa_not_200 | `/pwa/evolution` が 200 を返さない | front-end 退行確認 |
| dirty_repo | `git status --porcelain` が空でない | uncommit 確認 |
| 50音_low | `coverage_ratio < 0.30` | 50 音入力カード提案 (現在 0.26) |

### 10.3 INFO (verdict=GREEN でも記録)

| ID | 条件 | 推奨アクション |
|---|---|---|
| auto_runner_unwired_doctor | tenmon_doctor wired=false | 別カードで配線予定 |
| auto_runner_unwired_cursor | cursor_via_card wired=false | Phase γ 別カード予定 |
| old_vps_unwired | 旧 4GB VPS 未配線 | 別カード予定 (低優先度) |

## Section 11: Phase 2 投入計画

doctor v2 を実装 → 段階的に展開する **5 カード分割案**:

### Card 1: CARD-DOCTOR-V2-IMPLEMENT-V1 (PATCH 実装)

- 対象: `automation/tenmon_doctor_v2.py` (新規、目安 600-1000 行)
- 内容: §3 の 52 観測項目を実装、JSON + MD 出力
- 制約: 旧 doctor.ts は触らない、API は READ-ONLY、subprocess は read 系のみ
- Acceptance: doctor 実行で JSON valid + MD 生成、verdict 算出

### Card 2: CARD-DOCTOR-V2-NEXT-CARD-SUGGESTION-V1

- 対象: `automation/tenmon_doctor_v2.py` の `_suggest_next_cards()` 関数追加
- 内容: alerts → 推奨カード mapping
- Acceptance: alerts と suggestion の対応が一意

### Card 3: CARD-DOCTOR-V2-WATCH-MODE-V1

- 対象: `tenmon doctor watch` subcommand
- 内容: interval ループで継続観測、変化 diff を出力
- Acceptance: `--interval` で連続実行、kill で安全終了

### Card 4: CARD-DOCTOR-V2-CURSOR-CARD-CHECK-WIRING-V1 (Phase γ)

- 対象: Cursor 受領時に doctor を呼ぶ wiring
- 内容: card 投入前に doctor verify、verdict が RED なら投入 block
- Acceptance: denylist 機械 fence と二重で動く

### Card 5: CARD-DOCTOR-V2-OLD-VPS-DEPLOY-V1 (Phase C、低優先度)

- 対象: 旧 4GB VPS への移送
- 内容: `--no-api` mode、旧 VPS から本番 health を別 curl で叩く
- Acceptance: 旧 VPS 単体で実行可能

各カードは **本カードでは実装しない**。設計のみで止める。

## Section 12: 既存ファイルとの依存関係

### 12.1 READ する依存 (doctor が読むだけ)

| パス | 用途 |
|---|---|
| `/api/mc/vnext/claude-summary` | acceptance |
| `/api/mc/vnext/intelligence` | enforcer / 50音 / bridges |
| `/pwa/evolution` | HTTP 200 確認 |
| `/api/chat` | T1 / T4 length |
| `docs/ark/automation/dangerous_script_denylist_v1.json` | 安全層メタ情報 |
| `automation/tenmon_auto_runner.py` | denylist wired 検出 (grep のみ) |
| `web/src/data/evolution_log_v1.ts` | 進化ログ entries 数 |
| `/opt/tenmon-ark-data/mc/*.json` | mc-collector 出力 mtime/size |
| `api/data/feedback/*.json` | feedback local fallback |

### 12.2 WRITE する依存 (doctor が書く先)

| パス | 用途 |
|---|---|
| `automation/out/doctor-report.json` | JSON 出力 |
| `automation/out/doctor-report.md` | MD 出力 |
| `automation/out/next-card-suggestion.md` | Next Card 提案 |

→ それ以外への書き込みは **絶対禁止** (RUNTIME_LIBRARY_INVARIANT)。

### 12.3 実行する subprocess (READ-ONLY のみ)

```
git rev-parse / log / status            (READ)
systemctl is-active / is-enabled / show (READ)
curl -s / -sI                           (GET のみ)
stat / ls                               (READ)
jq                                       (READ パイプライン)
```

`bash deploy_*.sh` 等の **execute 系は一切呼ばない**。

## Section 13: サンプル出力 (実測)

本カードで取得した実測値を基に:

- `docs/ark/doctor/doctor_v2_sample_report.json` (機械可読)
- `docs/ark/doctor/doctor_v2_sample_report.md` (人間可読)

を別途生成する。サンプルの一次根拠 (本カード時点 = 2026-04-25T16:20 JST):

- HEAD: `b93b70b8` on `feature/unfreeze-v4`
- API PID: 854190 / acceptance PASS (10/10) / enforcer clean (6/6, 0 violations)
- 50 音: total=50, with_entry=13, coverage_ratio=0.26
- bridges: total=2, status=`registered_not_synced`, has_primary=true, has_separation=true
- pwa: HTTP/2 200
- chat T1=40 chars, T4=807 chars
- mc-collect 全 4 timer active/enabled, 全 service result=success, 出力 mtime=2026-04-25T16:20:53+09:00
- denylist: 54 explicit + 40 deny_globs + 4 allow_globs
- watchdog: active PID=2539152, ExecStart head に `path=/usr/bin/python3` 残存 (phantom 検出余地あり)
- evolution_log: 5 entries
- 30d commits: 211, 7d commits: 50

## Section 14: 例外規定

### 14.1 doctor が止められないもの (報告のみ)

doctor は以下を **検出しても自動修復しない**。報告のみで TENMON 裁定を待つ:

- watchdog phantom 状態 (deleted ExecStart)
- 50 音 coverage 低下
- bridges status=registered_not_synced
- evolution_log entries 数の変動
- 旧 4GB VPS 未配線

### 14.2 doctor が READ-ONLY で記録のみするもの

- DB schema (sqlite/) → 一切触らない
- Notion DB → 一切書き込まない (DB ID 記録のみ)
- 旧 doctor.ts → 一切触らない
- chat.ts / Phase A モジュール → 一切触らない

### 14.3 manual_only fallback

doctor の出力を見た TENMON が manual_only で対処する場合:

- TENMON 直接 SSH で対応
- doctor は再度 verify を打って状態を verify
- 自動修復は一切行わない (auto_runner も含めて)

## Section 15: TENMON 裁定用サマリー

### 15.1 設計の最重要決定 7 件

1. **言語: Python 3** (標準ライブラリのみ、`automation/tenmon_doctor_v2.py` 配置)
2. **観測項目: 6 領域 / 52 項目** (Git, API, mc-collect, 安全層, feedback-loop, 進捗)
3. **出力: JSON + MD + Next Card 提案** (3 ファイル、`automation/out/` 配下)
4. **CLI: `tenmon doctor verify`** (default)、`watch` は Phase 2 別カード
5. **READ-ONLY 原則**: 危険 script の execute / DB / Notion / Phase A モジュール書き込み禁止
6. **alerts: 3 段階** (CRITICAL / WARN / INFO) → verdict (RED / YELLOW / GREEN)
7. **Phase 2 投入計画: 5 カード分割** (実装 → next-card 提案 → watch → cursor_via_card → 旧 VPS)

### 15.2 確定すべき残課題 (本設計後の議論候補)

- `tenmon doctor` が `tenmon-auto-runner.service` の queue 内 card schema (apply_cmd / precheck) も検査するか?
- Phase α 進化ログ (`/pwa/evolution`) の "Founder 体感" を doctor で集計するか? (現状: 5 entries 静的)
- 旧 doctor.ts (368 行) を **削除する/しない** の最終判定 (本カードでは "残す" 採用)
- `tenmon doctor watch` の interval 規定値 (60s / 300s / 1800s のどれか)
- doctor 出力を `/api/mc/vnext/doctor-summary` として API endpoint 化するか? (本カードでは「しない」採用、Phase γ で検討)

### 15.3 本カードの境界

- **本カードで決まること**: 上記 §1〜§14 の全仕様、サンプル出力 (実測)
- **本カードで決まらないこと**: 実装、CI/CD 連携、旧 VPS 移送、cursor_via_card 配線
- 実装は **CARD-DOCTOR-V2-IMPLEMENT-V1** (別カード) で行う

---

## 改訂履歴

```
V1: 2026-04-25
  - 初版作成
  - 6 領域 / 52 観測項目で確定
  - Python 3 標準ライブラリのみで実装する方針
  - 旧 doctor.ts は残す方針 (削除しない)
  - Phase 2 で 5 カード分割で実装
```
