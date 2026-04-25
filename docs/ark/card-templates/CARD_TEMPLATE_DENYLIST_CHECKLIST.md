# DENYLIST CHECKLIST for Cursor Cards

> 本チェックリストは Cursor へ投入する全カードに適用する運用ルールである。
> TENMON / Claude / Cursor の **3 段階** で目視 + 機械的に確認する。

- バージョン: V1
- 作成日: 2026-04-25
- card: CARD-DENYLIST-CURSOR-CARD-CHECK-V1
- parent_commit: `df76610b` (DENYLIST-AUTORUNNER-WIRING-V1)
- 基準 denylist: `docs/ark/automation/dangerous_script_denylist_v1.json` (commit `563fa399`)
- 統計実体 (denylist v1):
  - explicit scripts: **54** (Cat A=13 / B=5 / C=11 / D=13 / E=12)
  - deny_globs: **40**
  - allow_globs: **4**
  - Tier-1 合計: **29** (Cat A+B+C)
  - Tier-2 合計: **25** (Cat D+E)

---

## 1. 適用対象

- Cursor へ投入される全カード (OBSERVE / PATCH / REPAIR / RETIRE / 設計 / 実装)
- 運用上の例外: TENMON 直接 SSH の手動操作のみ (`exceptions.manual_only`)

## 2. TENMON 段階チェック (投入前の人間判断)

カードを Cursor に投入する前、TENMON は以下を確認する。

- [ ] カード対象が **本番直撃** (deploy / restart / migration) を含まない
- [ ] カードが **rollback 系** (auto_rollback / rollback_trigger / restore_guard) を呼ばない
- [ ] カードが **VPS 同期** (vps_reclone / vps_sync / vps_fix_live) を呼ばない
- [ ] カードが **autopilot / supervisor / orchestrator** (full_autopilot / multi_ai / infinite_growth) を呼ばない
- [ ] カードが **systemctl restart tenmon-ark-api / nginx** を含まない
- [ ] カードが **TENMON 裁定なし** で危険操作を実行する設計でない
- [ ] カードに **PRE / POST 状態確認** が含まれている
- [ ] カードに **rollback 手順** が含まれている (RETIRE 系の場合)
- [ ] カードに **acceptance / enforcer 維持確認** が含まれている
- [ ] カードに **触らない対象 (絶対不可触)** リストが含まれている
- [ ] カードに **報告必須項目** が含まれている

## 3. Claude 段階チェック (起案時の機械的セルフレビュー)

Claude がカード本文を起案するときに、以下のキーワードを **grep でセルフチェック** する。
ヒットした場合は TENMON 裁定を必須とし、書き換え or 代替手段を提示する。

### 禁止キーワード一覧 (実体根拠は denylist v1)

| キーワード | カテゴリ | 対応 |
|---|---|---|
| `systemctl restart tenmon-ark-api` | -- | 絶対禁止、書き換え |
| `systemctl restart nginx` | -- | 絶対禁止、書き換え |
| `systemctl mask` | -- | 原則禁止、TENMON 個別裁定 |
| `rm -rf /opt` | -- | 絶対禁止 |
| `git push --force` / `git push -f` | -- | 原則禁止、TENMON 個別裁定 |
| `git reset --hard` | -- | 原則禁止、絶対 path 指定時のみ |
| `deploy_all.sh` | Cat A | 絶対禁止 |
| `deploy_live.sh` | Cat A | 絶対禁止 |
| `deploy_web.sh` | Cat A | 絶対禁止 |
| `run_deploy_and_check.sh` | Cat A | 絶対禁止 |
| `run_restart_and_route_bleed_check.sh` | Cat A | 絶対禁止 |
| `setup_systemd_override.sh` | Cat A | 絶対禁止 |
| `build_restart_wrapper_v1.sh` | Cat A | 絶対禁止 |
| `build_acceptance_autorun_v1.sh` | Cat A | 絶対禁止 |
| `infra/deploy.sh` / `infra/auto-recovery.sh` | Cat A | 絶対禁止 |
| `web/scripts/deploy_web_live.sh` | Cat A | 絶対禁止 |
| `site/scripts/deploy_site_live.sh` | Cat A | 絶対禁止 |
| `.github/workflows/deploy.yml` | Cat A | 絶対禁止 |
| `vps_sync_and_verify.sh` | Cat B | 絶対禁止 |
| `vps_sync_phase28.sh` | Cat B | 絶対禁止 |
| `vps_reclone_and_switch.sh` | Cat B | 絶対禁止 |
| `vps_fix_live_directory.sh` | Cat B | 絶対禁止 |
| `tenmon_master_integrated_deploy_sequence_vps_v1.sh` | Cat B | 絶対禁止 |
| `tenmon_rollback_autotrigger_*` | Cat C | 絶対禁止 |
| `tenmon_verify_rejudge_rollback_loop_*` | Cat C | 絶対禁止 |
| `auto_rollback_restore_guard_*` | Cat C | 絶対禁止 |
| `build_probe_rollback_autoguard_*` | Cat C | 絶対禁止 |
| `rollback_plan_generator_*` | Cat C | 絶対禁止 |
| `rollback_planner_*` | Cat C | 絶対禁止 |
| `rollback_trigger_*` | Cat C | 絶対禁止 |
| `tenmon_autonomy_failclosed_supervisor_rollback_forensic_*` | Cat C | 絶対禁止 |
| `migrate-legacy-memory.mjs` | Cat D | TENMON_ENV=test 以外禁止 |
| `seed-plans.mjs` / `seed-plans.ts` | Cat D | TENMON_ENV=test 以外禁止 |
| `seed-site-info.mjs` / `seed-siteinfo.mjs` | Cat D | TENMON_ENV=test 以外禁止 |
| `setupSiteInfo.mjs` / `setupSiteInfo.ts` | Cat D | TENMON_ENV=test 以外禁止 |
| `seed_iroha_principles_v1.sh` | Cat D | TENMON_ENV=test 以外禁止 |
| `seed_katakamuna_principles_v1.sh` | Cat D | TENMON_ENV=test 以外禁止 |
| `seed_khs_laws_v1.mjs` | Cat D | TENMON_ENV=test 以外禁止 |
| `seed_learning_effect_audit_v1.sh` | Cat D | TENMON_ENV=test 以外禁止 |
| `seed_tenmon_core_pack_v1.sh` | Cat D | TENMON_ENV=test 以外禁止 |
| `rebuild_fts5.sh` | Cat D | DB write 系、TENMON 裁定必須 |
| `master_integrated_deploy_sequence_v1.py` | Cat E | 絶対禁止 |
| `full_autopilot_v1.py` | Cat E | 絶対禁止 |
| `final_seal_autopilot_v3.py` | Cat E | 絶対禁止 |
| `worldclass_ascent_autopilot_v2.py` | Cat E | 絶対禁止 |
| `multi_ai_autonomy_supervisor_v1.py` | Cat E | 絶対禁止 |
| `infinite_growth_loop_orchestrator_v1.py` | Cat E | 絶対禁止 |
| `overnight_full_pdca_autonomy_orchestrator_v1.py` | Cat E | 絶対禁止 |
| `tenmon_full_autonomy_os_13plus4_master_parent_v1.py` | Cat E | 絶対禁止 |
| `autopilot_cycle.sh` / `card_runner.sh` / `runner.sh` / `phase44_runner.sh` | Cat E | 絶対禁止 |
| `*orchestrator*.py` | Cat E (glob) | 原則禁止、TENMON 個別裁定 |
| `*supervisor*.py` | Cat E (glob) | 原則禁止、TENMON 個別裁定 |
| `*autopilot*.py` | Cat E (glob) | 原則禁止、TENMON 個別裁定 |
| `*autonomy*.py` | Cat E (glob) | 原則禁止、TENMON 個別裁定 |
| `*rollback*.py` / `*rollback*.sh` | Cat C/E (glob) | 絶対禁止 |
| `*restore*.py` | Cat C (glob) | 絶対禁止 |
| `*autoguard*.py` / `*autoguard*.sh` | Cat C/E (glob) | 絶対禁止 |
| `multi_ai_*.py` | Cat E (glob) | 絶対禁止 |
| `infinite_growth_*.py` | Cat E (glob) | 絶対禁止 |
| `overnight_*.py` | Cat E (glob) | 絶対禁止 |

> **完全な denylist は `docs/ark/automation/dangerous_script_denylist_v1.json` を一次情報源として参照すること。**
> 本表は人間可読化のためのサマリであり、機械的判定は JSON 側を優先する。

### Claude セルフレビュー必須項目

- [ ] カード冒頭に `TENMON OVERRIDE` が記述されている (該当する場合)
- [ ] カード冒頭に `TENMON FINAL INSTRUCTION` が記述されている
- [ ] **絶対禁止事項** が明示されている
- [ ] **許可される変更** が明示されている
- [ ] **触らない対象** が明示されている (本番 unit / Phase A モジュール / chat.ts 等)
- [ ] **Acceptance 条件** が 10 項目以上、明確に記述されている
- [ ] **FAIL 条件** が記述されている
- [ ] **報告必須項目** が記述されている

## 4. Cursor 段階チェック (実行前の機械的確認)

Cursor がカードを受け取って実行を開始する前に、以下を順に確認する。

- [ ] カード冒頭の `TENMON OVERRIDE` を読み、絶対禁止事項を確認
- [ ] **触らない対象 (絶対不可触)** リストを確認
- [ ] **bash / systemctl / curl / python3 / git** コマンドの一覧を抽出して、denylist パターンに該当するものがないか確認
- [ ] 該当する場合は **実行せず TENMON に報告**
- [ ] 1 操作ごとに **PRE 状態 → 操作 → POST 状態** を確認
- [ ] 完了報告に **20 項目以上の verify** を含める

### Cursor 自動チェック (将来 Phase γ で実装、本カードでは規定のみ)

```python
# 将来実装プロトタイプ:
# Cursor が card 受け取り時に dangerous_script_denylist_v1.json と照合し、
# 一致 → 実行拒否 + TENMON 通知

import json
import re
from pathlib import Path

DENYLIST_PATH = "/opt/tenmon-ark-repo/docs/ark/automation/dangerous_script_denylist_v1.json"

def check_card_for_denylist(card_text: str) -> tuple[bool, list[str]]:
    """カード本文を denylist と照合。Returns: (is_safe, violations)"""
    with open(DENYLIST_PATH) as f:
        denylist = json.load(f)
    violations = []
    for category in denylist["categories"]:
        for script in category["scripts"]:
            path = script["path"]
            if path in card_text:
                violations.append(f"Category {category['id']}: {path}")
    # deny_globs (簡易 fnmatch) は別カードで実装
    return (len(violations) == 0, violations)
```

## 5. 危険コマンド完全一覧 (本日時点 / denylist V1)

### 5.1 Tier-1 Category A: 本番直撃 (13 件)

```
scripts/deploy_all.sh
api/scripts/deploy_live.sh
api/scripts/deploy_web.sh
api/scripts/run_deploy_and_check.sh
api/scripts/run_restart_and_route_bleed_check.sh
api/scripts/setup_systemd_override.sh
api/scripts/build_restart_wrapper_v1.sh
api/scripts/build_acceptance_autorun_v1.sh
infra/deploy.sh
infra/auto-recovery.sh
web/scripts/deploy_web_live.sh
site/scripts/deploy_site_live.sh
.github/workflows/deploy.yml
```

### 5.2 Tier-1 Category B: VPS 同期 (5 件)

```
api/scripts/vps_sync_and_verify.sh
api/scripts/vps_sync_phase28.sh
api/scripts/vps_reclone_and_switch.sh
api/scripts/vps_fix_live_directory.sh
api/src/scripts/tenmon_master_integrated_deploy_sequence_vps_v1.sh
```

### 5.3 Tier-1 Category C: rollback / restore (11 件)

```
api/scripts/tenmon_rollback_autotrigger_and_restore_v1.sh
api/scripts/tenmon_verify_rejudge_rollback_loop_v1.sh
api/scripts/auto_rollback_restore_guard_v1.sh
api/scripts/build_probe_rollback_autoguard_v1.sh
api/automation/auto_rollback_restore_guard_v1.py
api/automation/build_probe_rollback_autoguard_v1.py
api/automation/rollback_plan_generator_v1.py
api/automation/rollback_planner_v1.py
api/automation/rollback_trigger_v1.py
api/automation/tenmon_rollback_autotrigger_and_restore_v1.py
api/automation/tenmon_autonomy_failclosed_supervisor_rollback_forensic_cursor_auto_v1.py
```

### 5.4 Tier-2 Category D: migration / DB seed (13 件)

```
scripts/migrate-legacy-memory.mjs
scripts/seed-plans.mjs
scripts/seed-plans.ts
scripts/seed-site-info.mjs
scripts/seed-siteinfo.mjs
scripts/setupSiteInfo.mjs
scripts/setupSiteInfo.ts
api/scripts/rebuild_fts5.sh
api/scripts/seed_iroha_principles_v1.sh
api/scripts/seed_katakamuna_principles_v1.sh
api/scripts/seed_khs_laws_v1.mjs
api/scripts/seed_learning_effect_audit_v1.sh
api/scripts/seed_tenmon_core_pack_v1.sh
```

### 5.5 Tier-2 Category E: autopilot / runner (12 件)

```
api/automation/master_integrated_deploy_sequence_v1.py
api/automation/full_autopilot_v1.py
api/automation/final_seal_autopilot_v3.py
api/automation/worldclass_ascent_autopilot_v2.py
api/automation/multi_ai_autonomy_supervisor_v1.py
api/automation/infinite_growth_loop_orchestrator_v1.py
api/automation/overnight_full_pdca_autonomy_orchestrator_v1.py
api/automation/tenmon_full_autonomy_os_13plus4_master_parent_v1.py
api/scripts/autopilot_cycle.sh
api/scripts/card_runner.sh
api/scripts/runner.sh
api/scripts/phase44_runner.sh
```

### 5.6 deny_globs (補完パターン、40 件)

denylist JSON の `path_patterns.deny_globs` を一次情報源として参照。
代表的なパターン (全 40 件は JSON 参照):

```
api/automation/*autopilot*.py
api/automation/*orchestrator*.py
api/automation/*supervisor*.py
api/automation/*autonomy*.py
api/automation/*rollback*.py
api/automation/*restore*.py
api/automation/*autoguard*.py
api/automation/*deploy*.py
api/automation/*forensic*.py
api/automation/multi_ai_*.py
api/automation/infinite_growth_*.py
api/automation/overnight_*.py
api/automation/master_integrated_*.py
api/automation/full_*.py
api/automation/final_*.py
api/scripts/deploy_*.sh
api/scripts/vps_*.sh
api/scripts/*rollback*.sh
api/scripts/*autoguard*.sh
api/scripts/*runner*.sh
api/scripts/autopilot_*.sh
api/scripts/seed_*.sh
api/scripts/seed_*.mjs
api/scripts/seed_*.ts
api/scripts/setup_systemd_*.sh
api/scripts/build_restart_*.sh
api/scripts/build_acceptance_autorun_*.sh
api/scripts/run_deploy_*.sh
api/scripts/run_restart_*.sh
api/scripts/rebuild_fts5*.sh
api/src/scripts/tenmon_master_integrated_*.sh
scripts/deploy_*.sh
scripts/migrate-*.{mjs,ts,js}
scripts/seed-*.{mjs,ts,js}
scripts/setupSiteInfo*
infra/deploy*.sh
infra/auto-recovery*.sh
web/scripts/deploy_*.sh
site/scripts/deploy_*.sh
.github/workflows/deploy*.yml
```

### 5.7 allow_globs (denylist より優先する例外、4 件)

MC observation lane の collector 群は denylist 例外として明示的に許可される。

```
api/scripts/mc/*
api/scripts/mc/mc_collect_*.sh
api/scripts/mc/mc_build_ai_handoff.sh
api/scripts/mc/mc_lib.sh
```

## 6. 例外規定

### 6.1 manual_only

TENMON が直接 SSH で実行する場合のみ許可。Cursor / auto_runner / cursor_card 経由では絶対実行しない。

確認方法:
- TTY 検出 (`tty` コマンドで対話的かを判定)
- 実行ユーザの記録
- origin (caller) の記録 (TENMON / Claude / Cursor / auto_runner / doctor)

### 6.2 test_environments

`TENMON_ENV=test` 環境変数が設定された環境では:

- **Cat D (migration / seed) のみ条件付き許可** (DB 書き込みリスクが test DB に限定されるため)
- Cat A / B / C / E は本番含めて常に block
- ただし `path_patterns.deny_globs` に hit する場合は `TENMON_ENV=test` でも block (二重 fence)

## 7. 違反検出時の対応

### 7.1 TENMON 段階で発見

```
1. Claude にカード書き換え指示
2. 危険コマンドを除去 / 代替手段で再起案
3. denylist 例外なら manual_only として TENMON 直接 SSH で実行
4. 該当した keyword と category を verify 報告に含める
```

### 7.2 Claude 段階で発見

```
1. 起案前に Claude が grep で検出
2. カード本文から危険コマンドを除去
3. 代替手段を Cursor に提案
4. 場合によっては TENMON に裁定依頼
5. 起案完了後の自己レビュー結果を冒頭で宣言
```

### 7.3 Cursor 段階で発見

```
1. Cursor が card 受け取り時に確認
2. 実行せず TENMON / Claude に報告
3. card 修正版が来るまで待機
4. 既に precheck stage で `_scan_card_for_denylist` が wired (DENYLIST-AUTORUNNER-WIRING-V1)
   → freeze marker が `/var/log/tenmon/auto_runner_freeze_denylist_*.txt` に書かれる
```

## 8. チェックリスト適用例

### 例 1: OBSERVE only カード (安全)

```
カード本文:
  systemctl is-active mc-collect-live
  journalctl -u mc-collect-live -n 50
  cat /opt/tenmon-mc/data/live_state.json

→ チェック結果: 全 READ-ONLY、denylist 該当なし、安全
```

### 例 2: REPAIR カード (最小 patch、安全)

```
カード本文:
  vi api/scripts/mc/mc_collect_git_state.sh   (1-3 行 patch)
  bash -n api/scripts/mc/mc_collect_git_state.sh
  bash api/scripts/mc/mc_collect_git_state.sh
  systemctl start mc-collect-git.service

→ チェック結果:
  - 編集対象は denylist allow_globs (api/scripts/mc/*) 配下、安全
  - bash 単体実行は対象 script 自体、安全
  - systemctl start specific-service、限定範囲、安全
```

### 例 3: 危険カード (絶対禁止)

```
カード本文:
  bash scripts/deploy_all.sh
  systemctl restart tenmon-ark-api

→ チェック結果:
  - deploy_all.sh は Category A、絶対禁止
  - systemctl restart tenmon-ark-api は禁止キーワード
  → このカードは TENMON 段階で却下、書き換え必須
```

### 例 4: PATCH (auto_runner 自身、本カードのような meta カード)

```
カード本文:
  vi automation/tenmon_auto_runner.py   (関数追加 + precheck フック)
  python3 -m py_compile automation/tenmon_auto_runner.py
  python3 unit_test_inline.py   (subprocess 起動なし)

→ チェック結果:
  - 編集対象は automation/tenmon_auto_runner.py、denylist 対象外、安全
  - 危険 script の subprocess 起動なし、安全
  - 静的 path 突合のみで実装すれば denylist gate 自身を破壊しない
```

## 9. バージョン管理

```
バージョン: V1
作成日: 2026-04-25
parent_commit: df76610b (DENYLIST-AUTORUNNER-WIRING-V1)
基準 denylist: dangerous_script_denylist_v1.json (commit 563fa399)

更新方法:
  denylist V2 が出た時、または運用上の追加が必要な時
  → 別カード (CARD-DENYLIST-CURSOR-CARD-CHECK-V2 等) で更新
```
