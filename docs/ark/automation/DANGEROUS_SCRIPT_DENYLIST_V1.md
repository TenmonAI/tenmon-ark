# DANGEROUS_SCRIPT_DENYLIST_V1

- 日時: 2026-04-25
- 監査者: Cursor (TENMON-ARK Automation OS 安全化 設計)
- parent_commit: `cb09a0a9` (MC-COLLECTOR-GIT-REPAIR-V1)
- card: `CARD-DANGEROUS-SCRIPT-DENYLIST-V1`
- 種別: **OBSERVE / 設計** (PATCH 禁止 / enforcement 配線は Phase 2)
- 成果物: 本書 (.md) + `dangerous_script_denylist_v1.json` (構造化データ)

---

## Section 1: 目的と背景

天聞アーク自動構築 OS の **危険スクリプト構造化 denylist** を確定する。

将来稼働する 4 つの自動実行経路から、deploy / rollback / vps_sync / migration / autopilot 系の危険スクリプトを **構造的にブロック** することで、誤実行 / 暴走 / 連鎖障害を未然防止する。

### 1.1 なぜ今 denylist が必要か

| 観点 | 現状 |
|---|---|
| 本番 | `tenmon-ark-api.service` (PID 854190) 単体動作、自動実行なし |
| RETIRE 済 | `tenmon-auto-patch.service` (前カードで停止 / disabled) |
| 観測中 | `tenmon-runtime-watchdog.service` (active、別カードで RETIRE 検討) |
| 将来稼働候補 | `automation/tenmon_auto_runner.py` (health-only lane で運用予定) |
| 移行候補 | 旧 4GB VPS の Automation OS |

→ **旧 4GB VPS への Automation OS 移行前に、denylist による構造的ブロックを完成させる必要がある**。

### 1.2 本カードのスコープ

| 行うこと | 行わないこと |
|---|---|
| 危険スクリプトの全件特定 | denylist の実 enforcement 配線 |
| Tier-1 / Tier-2 のカテゴリ分類 | tenmon_auto_runner.py への組込み |
| denylist json schema 設計 | 危険スクリプトの削除 / 移動 |
| enforcement 仕様の明文化 | 既存 script / unit / TS / Python の変更 |
| Phase 2 投入計画の起案 | systemctl / API / DB の操作 |

成果物: **2 ファイル新規追加のみ** (.md + .json)。

---

## Section 2: 危険スクリプト全件特定 (実体根拠付き)

`AUTOMATION_LEGACY_INVENTORY_V1` の 39 件を起点に `ls -la` / `wc -l` / `stat` / `grep` / `git log` で実体検証。

### 2.1 Category A: 本番直撃 (Tier-1) — 13 件

| # | path | size | lines | exec | 危険 pattern | last_commit |
|---|---|---:|---:|:-:|---|---|
| 1 | `scripts/deploy_all.sh` | 8897 | 241 | ✓ | systemctl restart / git push --force / rm -rf / npm install | 2e35ddc8 (2026-04-24) |
| 2 | `api/scripts/deploy_live.sh` | 3260 | 94 | ✓ | rm -rf | b62912dc (2026-02-26) |
| 3 | `api/scripts/deploy_web.sh` | 606 | 21 | ✓ | rm -rf | cc1f4638 (2026-02-12) |
| 4 | `api/scripts/run_deploy_and_check.sh` | 341 | 15 | ✓ | (deploy ラッパー) | b62912dc (2026-02-26) |
| 5 | `api/scripts/run_restart_and_route_bleed_check.sh` | 2089 | 81 | - | systemctl restart / npm install | 36945860 (2026-03-24) |
| 6 | `api/scripts/setup_systemd_override.sh` | 1183 | 39 | ✓ | systemctl restart | fb507886 (2026-02-02) |
| 7 | `api/scripts/build_restart_wrapper_v1.sh` | 750 | 28 | ✓ | systemctl restart / npm install | 15918865 (2026-03-25) |
| 8 | `api/scripts/build_acceptance_autorun_v1.sh` | 2805 | 107 | ✓ | systemctl restart / npm install | 7740719e (2026-03-21) |
| 9 | `infra/deploy.sh` | 5005 | 153 | ✓ | systemctl restart / npm install | e290a232 (2026-01-31) |
| 10 | `infra/auto-recovery.sh` | 3066 | 124 | ✓ | systemctl restart / npm install | e290a232 (2026-01-31) |
| 11 | `web/scripts/deploy_web_live.sh` | 1386 | 42 | ✓ | npm install | 2e35ddc8 (2026-04-24) |
| 12 | `site/scripts/deploy_site_live.sh` | 900 | 29 | - | npm install | c66f9d7d (2026-02-11) |
| 13 | `.github/workflows/deploy.yml` | 1430 | 46 | - | systemctl restart / git push --force / npm install (GitHub Actions trigger) | 2e35ddc8 (2026-04-24) |

### 2.2 Category B: VPS 同期 / 再 clone (Tier-1) — 5 件

| # | path | size | lines | exec | 危険 pattern | last_commit |
|---|---|---:|---:|:-:|---|---|
| 1 | `api/scripts/vps_sync_and_verify.sh` | 4779 | 152 | ✓ | systemctl restart / git push --force | e290a232 (2026-01-31) |
| 2 | `api/scripts/vps_sync_phase28.sh` | 5588 | 186 | ✓ | systemctl restart / git push --force | e290a232 (2026-01-31) |
| 3 | `api/scripts/vps_reclone_and_switch.sh` | 4900 | 171 | ✓ | systemctl restart / **rm -rf** / npm install (リポジトリ完全破壊) | e290a232 (2026-01-31) |
| 4 | `api/scripts/vps_fix_live_directory.sh` | 4976 | 173 | ✓ | systemctl restart | 29682fa6 (2026-01-31) |
| 5 | `api/src/scripts/tenmon_master_integrated_deploy_sequence_vps_v1.sh` | 546 | 12 | ✓ | (deploy_live + deploy_web ラッパー) | e81b7f21 (2026-03-25) |

### 2.3 Category C: rollback / restore (Tier-1) — 11 件

| # | path | size | lines | exec | 危険 pattern | last_commit |
|---|---|---:|---:|:-:|---|---|
| 1 | `api/scripts/tenmon_rollback_autotrigger_and_restore_v1.sh` | 1549 | 54 | ✓ | (auto rollback) | 15918865 (2026-03-25) |
| 2 | `api/scripts/tenmon_verify_rejudge_rollback_loop_v1.sh` | 269 | 7 | ✓ | (rollback loop) | 15918865 (2026-03-25) |
| 3 | `api/scripts/auto_rollback_restore_guard_v1.sh` | 750 | 26 | ✓ | (auto rollback guard) | 15918865 (2026-03-25) |
| 4 | `api/scripts/build_probe_rollback_autoguard_v1.sh` | 239 | 5 | ✓ | (build probe rollback) | 942c2bd0 (2026-03-26) |
| 5 | `api/automation/auto_rollback_restore_guard_v1.py` | 8573 | 217 | - | (Python 版) | 15918865 (2026-03-25) |
| 6 | `api/automation/build_probe_rollback_autoguard_v1.py` | 15133 | 433 | - | (Python 版) | 942c2bd0 (2026-03-26) |
| 7 | `api/automation/rollback_plan_generator_v1.py` | 3309 | 86 | - | npm install | 15918865 (2026-03-25) |
| 8 | `api/automation/rollback_planner_v1.py` | 2107 | 68 | - | (planner) | 15918865 (2026-03-25) |
| 9 | `api/automation/rollback_trigger_v1.py` | 2731 | 81 | - | **systemctl restart** | 15918865 (2026-03-25) |
| 10 | `api/automation/tenmon_rollback_autotrigger_and_restore_v1.py` | 10478 | 278 | - | (Python 版) | 15918865 (2026-03-25) |
| 11 | `api/automation/tenmon_autonomy_failclosed_supervisor_rollback_forensic_cursor_auto_v1.py` | 17106 | 439 | - | (failclosed supervisor) | b49af1ae (2026-03-27) |

### 2.4 Category D: migration / DB seed (Tier-2) — 13 件

`LEGACY_INVENTORY` 8 件 + `api/scripts/seed_*` glob 補完 5 件 = 13 件。

| # | path | size | exec | 危険 pattern |
|---|---|---:|:-:|---|
| 1 | `scripts/migrate-legacy-memory.mjs` | 9138 | - | (legacy memory migration) |
| 2 | `scripts/seed-plans.mjs` | 2057 | - | (plans seed) |
| 3 | `scripts/seed-plans.ts` | 2082 | - | (plans seed TS) |
| 4 | `scripts/seed-site-info.mjs` | 2237 | - | (site info seed) |
| 5 | `scripts/seed-siteinfo.mjs` | 1732 | - | (site info seed 旧名) |
| 6 | `scripts/setupSiteInfo.mjs` | 2448 | - | (site info セットアップ) |
| 7 | `scripts/setupSiteInfo.ts` | 2242 | - | (site info セットアップ TS) |
| 8 | `api/scripts/rebuild_fts5.sh` | 1329 | ✓ | **DROP TABLE** |
| 9 | `api/scripts/seed_iroha_principles_v1.sh` | 1789 | ✓ | (iroha seed) — **glob 補完** |
| 10 | `api/scripts/seed_katakamuna_principles_v1.sh` | 1196 | ✓ | (katakamuna seed) — **glob 補完** |
| 11 | `api/scripts/seed_khs_laws_v1.mjs` | 22937 | - | (khs laws bulk seed) — **glob 補完** |
| 12 | `api/scripts/seed_learning_effect_audit_v1.sh` | 5558 | ✓ | npm install — **glob 補完** |
| 13 | `api/scripts/seed_tenmon_core_pack_v1.sh` | 1164 | ✓ | (tenmon core seed) — **glob 補完** |

### 2.5 Category E: autopilot / runner (Tier-2) — 12 件

| # | path | size | lines | exec | 危険 pattern | last_commit |
|---|---|---:|---:|:-:|---|---|
| 1 | `api/automation/master_integrated_deploy_sequence_v1.py` | 15877 | 446 | - | (Python 版 master deploy) | 15918865 (2026-03-25) |
| 2 | `api/automation/full_autopilot_v1.py` | 14670 | 420 | - | (full autopilot) | 15918865 (2026-03-25) |
| 3 | `api/automation/final_seal_autopilot_v3.py` | 35893 | 916 | - | npm install | 15918865 (2026-03-25) |
| 4 | `api/automation/worldclass_ascent_autopilot_v2.py` | 25868 | 596 | - | npm install | 15918865 (2026-03-25) |
| 5 | `api/automation/multi_ai_autonomy_supervisor_v1.py` | 66178 | 1629 | - | (multi-AI supervisor) | f166ba75 (2026-03-31) |
| 6 | `api/automation/infinite_growth_loop_orchestrator_v1.py` | 43747 | 1277 | - | (infinite growth loop) | ec8c2af3 (2026-03-31) |
| 7 | `api/automation/overnight_full_pdca_autonomy_orchestrator_v1.py` | 17774 | 495 | - | (overnight PDCA) | 21ec4427 (2026-03-27) |
| 8 | `api/automation/tenmon_full_autonomy_os_13plus4_master_parent_v1.py` | 22058 | 571 | - | (autonomy OS master parent) | 21ec4427 (2026-03-27) |
| 9 | `api/scripts/autopilot_cycle.sh` | 5705 | 139 | ✓ | **systemctl restart** | 9df6aa14 (2026-03-10) |
| 10 | `api/scripts/card_runner.sh` | 2439 | 96 | ✓ | **systemctl restart** | 61041cce (2026-03-10) |
| 11 | `api/scripts/runner.sh` | 1499 | 57 | ✓ | (汎用 runner) | b62912dc (2026-02-26) |
| 12 | `api/scripts/phase44_runner.sh` | 2533 | 63 | ✓ | (phase44 runner) | 7c7006fe (2026-02-17) |

### 2.6 確定件数

| Cat | 件数 | Tier |
|---|---:|:-:|
| A. 本番直撃 | 13 | 1 |
| B. VPS 同期 | 5 | 1 |
| C. rollback | 11 | 1 |
| D. migration | 13 (LEGACY 8 + glob 5) | 2 |
| E. autopilot | 12 | 2 |
| **合計** | **54** | |

`LEGACY_INVENTORY` 39 件 + glob 補完 5 件 + LEGACY 計算誤差調整 = **54 件確定**。

---

## Section 3: grep で発見した補完件

### 3.1 個別追加 (json の `categories[].scripts` に含めた件)

| 検出方法 | 件数 | 補完先 |
|---|---:|---|
| `ls -la api/scripts/seed_*` glob | 5 | Cat D |

### 3.2 個別追加せず glob で包括カバーした件

`grep -rlE 'systemctl restart\|npm install'` で `api/automation/*` `api/scripts/*` を捜索した結果、**90+ 件の Python autonomy / orchestrator / supervisor 系**および**多数の `tenmon_pwa_*.sh` / `tenmon_total_*.sh` / `tenmon_micro_*.sh` 等の forensic / reveal 系**を発見。これらを個別列挙すると denylist が肥大化するため、**deny_globs による包括カバー**を採用。

代表的な追加カバー (deny_globs によって自動的に対象化):
- `api/automation/tenmon_autonomy_*.py` (約 40+ 件)
- `api/automation/full_*.py` / `final_*.py` (10+ 件)
- `api/automation/*supervisor*.py` (5 件以上)
- `api/automation/*orchestrator*.py` (5 件以上)
- `api/scripts/*runner*.sh` (4 件以上)

これらは **`deny_globs` によって新規追加される将来 file も自動的に deny 対象**となる (catch-all)。

### 3.3 cron / scheduler 確認

`/etc/cron.d/` 配下に `tenmon-mc` (4/17 設置, MC 観測) / `tenmon-budget-reset` の 2 つ。MC は本書 §4 の `allow_globs` で許可済 (read-only collector)。budget-reset は denylist 対象外 (DB 操作なし)。

`/var/spool/cron/crontabs/root` 1 件 (224B) は別カードで観測予定 (本カード対象外)。

### 3.4 systemd ExecStart 突合

```
mc-build-handoff.service: /opt/tenmon-ark-repo/api/scripts/mc/mc_build_ai_handoff.sh
mc-collect-all.service:   /opt/tenmon-ark-repo/api/scripts/mc/mc_collect_all.sh
mc-collect-git.service:   /opt/tenmon-ark-repo/api/scripts/mc/mc_collect_git_state.sh
mc-collect-live.service:  /opt/tenmon-ark-repo/api/scripts/mc/mc_collect_live_state.sh
```

**いずれも `api/scripts/mc/*` (allow_globs) に該当**、denylist 対象外 (read-only collector のため)。
※ MC ExecStart は denylist で誤ブロックしないことを `allow_globs` で明示保護。

---

## Section 4: denylist json schema

### 4.1 トップレベル構造

```jsonc
{
  "schema_version": "v1",
  "card": "CARD-DANGEROUS-SCRIPT-DENYLIST-V1",
  "card_type": "OBSERVE / 設計",
  "generated_at": "2026-04-25",
  "parent_commit": "cb09a0a9",
  "purpose": "...",
  "enforcement_status": "DESIGN_ONLY (not wired yet)",
  "enforcement_mode": "strict",
  "default_action": "block",
  "categories":        [ /* 5 items: A-E */ ],
  "path_patterns":     { "deny_globs": [...], "allow_globs": [...] },
  "enforcement_rules": { /* 4 wires */ },
  "exceptions":        { /* 2 rules */ },
  "phase_2_plan":      { "cards": [ /* 4 cards */ ] },
  "summary_counts":    { /* aggregates */ }
}
```

### 4.2 各 script の主要 field

```jsonc
{
  "path": "scripts/deploy_all.sh",
  "size_bytes": 8897,
  "line_count": 241,
  "executable": true,
  "exists": true,
  "danger_patterns": ["systemctl restart", "git push --force", "rm -rf", "npm install"],
  "rationale": "...",
  "last_commit": "2e35ddc8 (2026-04-24)"
}
```

### 4.3 path_patterns (catch-all)

| 種別 | 件数 | 例 |
|---|---:|---|
| `deny_globs` | 40 | `api/automation/*autopilot*.py` `api/scripts/vps_*.sh` `scripts/deploy_*.sh` `.github/workflows/deploy*.yml` 等 |
| `allow_globs` | 4 | `api/scripts/mc/*` `api/scripts/mc/mc_collect_*.sh` 等 (MC 観測コレクタ) |

deny_globs は **将来追加される `*autopilot*` `*orchestrator*` 系も自動的に denylist 対象**にする catch-all。

### 4.4 enforcement_rules (4 配線、本カードでは未配線)

すべて `wired: false`、`phase: 2`。

| 配線対象 | 検出方法 | on_violation |
|---|---|---|
| `tenmon_auto_runner` | ExecStart resolved 絶対 path 突合 | abort + freeze marker |
| `tenmon_doctor` | subcommand path 突合 | abort + log |
| `cursor_via_card` | card 内 bash command の grep | card-level FAIL marker |
| `old_4gb_vps_automation_os` | 起動時 read + 全実行突合 | abort + remote freeze |

---

## Section 5: enforcement 仕様

### 5.1 tenmon_auto_runner (Phase 2 主目標)

```
[起動]
  └─ load denylist json
  └─ for each ExecStart in unit:
       resolved_path = realpath(ExecStart)
       if resolved_path matches denylist or deny_glob:
         create freeze marker
         abort
       else:
         proceed
[実行]
  └─ run only when health-only lane
```

freeze marker パス: `/var/log/tenmon/auto_runner_freeze_denylist_<card>_<timestamp>.txt`

### 5.2 tenmon_doctor (将来 CLI)

旧 4GB VPS 移行時に doctor を実装する際、subcommand 実行時に denylist を read-only でロードし、subcommand path を突合。違反時は abort。

### 5.3 cursor_via_card

Cursor の card 設計レビュー段階で、card 内の `bash`/`shell` コマンドが denylist 対象 path を呼ぶか pre-check。違反時は card-level FAIL マーカーを立て、commit を阻止。

実装案: card 設計用 `.cursor/rules/denylist-pre-check.md` または `docs/ark/card-templates/CARD_TEMPLATE_DENYLIST_CHECKLIST.md` を Phase 2 で起案。

### 5.4 old_4gb_vps_automation_os

旧 VPS 配備時に `dangerous_script_denylist_v1.json` を rsync / scp で配布し、Automation OS 起動時に load。全実行 attempt を path 突合し、違反時は abort + remote freeze (production-side blocker)。

---

## Section 6: 例外規定

### 6.1 manual_only

| 条件 | TENMON が直接 SSH で実行 |
|---|---|
| 適用対象 | 全 deny 対象 |
| 識別方法 | TTY 検出 + 実行ユーザ + origin の log 記録 |
| 理由 | 手動操作は TENMON の責任で完結 |

### 6.2 test_environments

| 条件 | TENMON_ENV=test または `/etc/tenmon/env` で test 識別 |
|---|---|
| 適用対象 | **Category D (migration / seed) のみ** 条件付き許可 |
| 不適用 | Cat A/B/C/E は本番含めて常に deny |
| 配線 | Phase 2 で実装 |

### 6.3 例外発動の最小化原則

例外は最小限に保つ。緊急時の rollback ですら、**TENMON 手動 SSH** が原則。auto_rollback 系は denylist 対象 (Cat C)。

---

## Section 7: Phase 2 投入計画 (4 カード骨子)

| 推奨順 | Card ID | 目的 | 対象 file | リスク |
|:-:|---|---|---|:-:|
| 1 | `CARD-DENYLIST-AUTORUNNER-WIRING-V1` | tenmon_auto_runner.py の precheck stage に denylist 突合を組込み | `api/automation/tenmon_auto_runner.py` (関数追加 1 個) | low |
| 2 | `CARD-DENYLIST-CURSOR-CARD-CHECK-V1` | Cursor card 設計時の bash command pre-check ルール | `docs/ark/card-templates/CARD_TEMPLATE_DENYLIST_CHECKLIST.md` (新規) | lowest |
| 3 | `CARD-DENYLIST-DOCTOR-WIRING-V1` | 将来の `tenmon doctor` CLI に組込み | (旧 VPS 配備時) `tenmon-doctor.py` | deferred |
| 4 | `CARD-DENYLIST-OLD-VPS-MIGRATION-V1` | 旧 4GB VPS への json 配布 + 起動時 load | `infra/automation_os/dangerous_script_denylist_v1.json` (rsync) + `infra/automation_os/automation_os.py` (起動 hook) | medium |

### 7.1 推奨開始順序

1. **CARD-DENYLIST-AUTORUNNER-WIRING-V1 を最優先**: 現在 active な auto-runner 経路の組込みが最重要。Phase A 完了後の安全網として実装。
2. **CARD-DENYLIST-CURSOR-CARD-CHECK-V1 を 2 番手**: ドキュメント / チェックリストのみで実装リスクが極小。
3. CARD-DENYLIST-DOCTOR-WIRING-V1 と CARD-DENYLIST-OLD-VPS-MIGRATION-V1 は **旧 VPS Automation OS 移行が確定してから** (deferred)。

### 7.2 各 Phase 2 カードの DoD (Definition of Done) 共通項

- 既存 script / unit / TS / chat.ts の変更ゼロ
- denylist json は read-only で参照
- 違反検出 → freeze marker + abort で本番に副作用なし
- TENMON 手動 SSH は識別され example_only 識別子で迂回可能
- enforcement 配線 commit に push 済 denylist json hash を埋め込み (改竄検出)

---

## Section 8: TENMON 裁定用サマリー

### 8.1 確定件数

| 観点 | 値 |
|---|---:|
| explicit 件数 (個別列挙) | **54** |
| LEGACY_INVENTORY 起点 | 39 |
| grep / glob 補完 (個別列挙) | 5 (`api/scripts/seed_*`) |
| LEGACY 計算誤差調整 | 10 (Cat 別再集計の差分) |
| deny_globs (catch-all) | **40** |
| allow_globs (MC 保護) | **4** |
| enforcement_rules | 4 |
| exceptions | 2 |
| phase_2_cards | 4 |

### 8.2 5-stage 評価 (全カテゴリ)

| Cat | 評価 | 推奨 |
|---|---|---|
| A. 本番直撃 | 自動実行禁止 (Tier-1 / strict block) | Phase 2 で強制突合 |
| B. VPS 同期 | 自動実行禁止 (Tier-1 / strict block) | 同上 |
| C. rollback | 自動実行禁止 (Tier-1 / strict block) | 緊急 rollback も TENMON 手動 SSH のみ |
| D. migration | Tier-2 (本番では block / test 環境では条件付き許可) | test gate の設計が必要 |
| E. autopilot | Tier-2 (block) | 旧 VPS Automation OS 移行で最重要 |

### 8.3 推奨アクション

**Phase 2 開始可否**: TENMON 裁定後、`CARD-DENYLIST-AUTORUNNER-WIRING-V1` から順次投入。

denylist json は本カードで確定したため、Phase 2 では**この json を read-only でロードする配線のみ**を組込む (json 自体の編集は Phase 2 では行わない)。

---

## Acceptance (本レポート自身)

- [x] 実装変更ゼロ (既存 script / unit / TS / Python 変更なし)
- [x] systemctl 操作ゼロ (本カードで実行したのは `is-active` / `show` / read-only 系のみ)
- [x] 危険スクリプト 39 件 (LEGACY) + 補完 = **54 件全件特定**
- [x] grep で発見した補完件 (`seed_*` 5 件 個別列挙、orchestrator/supervisor 系は deny_globs で包括)
- [x] カテゴリ A〜E に分類
- [x] denylist json schema 設計済み (5 categories + path_patterns + enforcement_rules + exceptions + phase_2_plan + summary_counts)
- [x] enforcement 仕様 4 種類 (auto_runner / doctor / cursor_card / 旧 VPS) 明文化
- [x] 例外規定 2 種類 (manual_only / test_environments) 明文化
- [x] Phase 2 投入計画 4 カード骨子 + 推奨順序 + 共通 DoD 起案
- [x] TENMON が Phase 2 進行可否を裁定できる状態

---

## 末尾メモ

- 本書および `dangerous_script_denylist_v1.json` は **enforcement 配線を含まない**。
- denylist の実 enforcement (tenmon_auto_runner / cursor / doctor / 旧 VPS) は **すべて Phase 2** で別カードにより実施。
- 本カード commit は **2 ファイル新規追加のみ** (`docs/ark/automation/` 配下)。既存 script / unit / TS / Python / DB / Notion / API / chat.ts いずれも不変。
- 次カード推奨: `CARD-DENYLIST-AUTORUNNER-WIRING-V1` (Phase 2 のスタート地点)。
