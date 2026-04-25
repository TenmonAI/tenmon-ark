# AUTOMATION_LEGACY_INVENTORY_V1

- 監査日時: 2026-04-25 (Asia/Tokyo)
- 監査者: Cursor (TENMON-ARK / OBSERVE only)
- parent_commit: `feature/unfreeze-v4` HEAD (Phase A 完成 `a6d43996` 以降)
- 種別: **OBSERVE only / PATCH 禁止**
- 成果物: 本ファイルのみ (コード・DB・systemd・cron 一切無変更)

---

## 0. 監査範囲と前提

### 0.1 対象 7 ディレクトリの存在と規模 (実体確認)

| dir | 存在 | files | 主要拡張子 |
|---|---|---:|---|
| `/opt/tenmon-ark-repo` (root) | OK | (全体) | mixed |
| `/opt/tenmon-ark-repo/scripts` | OK | 17 | .mjs 7 / .ts 5 / .sh 5 |
| `/opt/tenmon-ark-repo/api/scripts` | OK | 293 | .sh 263 / .mjs 14 / .ts 8 / .py 6 |
| `/opt/tenmon-ark-repo/api/automation` | OK | 1041 | .py 418 / .json 444 / .md 82 / .log 44 / .sh 4 |
| `/opt/tenmon-ark-repo/api/src/mc` | OK | 27 | .ts 26 (TypeScript 本実装) |
| `/opt/tenmon-ark-repo/mc` | OK | 43 | .sh 24 / .md 6 / .html 3 / .css 3 / .conf 2 / .env 1 |
| `/opt/tenmon-ark-repo/server` | OK | 484 | .ts 472 (旧世代実装) |
| `/opt/tenmon-ark-repo/tools` | OK | 1 | .sh 1 |

実体合計: **~1,900 ファイル**。Python 自動化 (418) + Shell 自動化 (267 sh + 263 sh + 24 sh + 5 sh + 1 sh ≈ 560) + TS (mc + server) + JSON 設定 (444) で構成される、巨大な歴史的レイヤ。

### 0.2 起点 prefix 上位 (.py, api/automation 内)

- `tenmon_autonomy_*` 25 / `tenmon_pwa_*` 13 / `tenmon_mac_*` 12 / `tenmon_cursor_*` 12 / `tenmon_final_*` 11
- `tenmon_conversation_*` 11 / `tenmon_self_*` 9 / `tenmon_chat_*` 9 / `multi_ai_*` 9 / `infinite_growth_*` 9
- `tenmon_worldclass_*` 8 / `tenmon_overnight_*` 7 / `remote_cursor_*` 6 / `notion_autobuild_*` 5

### 0.3 起点 prefix 上位 (api/scripts)

- `chat_ts_*` 14 / `tenmon_pwa_*` 13 / `tenmon_autonomy_*` 13 / `tenmon_final_*` 10
- `tenmon_worldclass_*` 8 / `tenmon_mac_*` 8 / `tenmon_cursor_*` 8 / `tenmon_overnight_*` 6 / `chat_refactor_*` 6

これらは **Phase A 以前** (3-4 月) に積層した「自動構築・PDCA・PWA最終仕上げ」系の名残であり、現在の Phase A〜B の主線 (`api/src/mc`, `api/src/core/kotodama*`) とは時系列が分離している。

---

## 1. 稼働中 (live) の自動化と「死蔵」(残骸) の境界

| 種別 | 名前 | systemd 状態 | 実体 | 評価 |
|---|---|---|---|---|
| API | `tenmon-ark-api.service` | active (running, 19h) | `node /opt/tenmon-ark-live/api/dist/index.js` | **本線**。Phase A の `/api/mc/vnext/*` がここで稼働。 |
| watchdog | `tenmon-runtime-watchdog.service` | active (running, 2w) | `python3 /opt/tenmon-ark-repo/api/automation/tenmon_runtime_watchdog_v1.py` | **死蔵**。py 実体は repo に存在しない (削除済) → サイクル毎に [Errno 2] を吐き続け空回り。プロセスはメモリ上にのみ残る古いコード。 |
| auto-patch | `tenmon-auto-patch.service` | active (running, 2w) | `bash /opt/tenmon-ark-repo/auto_patch_runner.sh` | **死蔵**。`auto_patch_runner.sh` は repo に存在しない。同じく古いプロセスがメモリ常駐。 |
| auto-runner (公式) | `tenmon-auto-runner.service` (file: `automation/systemd/tenmon-auto-runner.service`) | not enabled (file は repo にあるが unit は未登録) | `python3 automation/tenmon_auto_runner.py --once` | **再利用候補・現役本命**。`automation/queue/tenmon_auto_queue.json` を読み health-only lane (`OPS_HEALTHCHECK_V1`) を回す設計。`apply` lane は `OPS_APPLY_ENGINE_SELECT_V1` 待ちで `enabled:false`。 |
| MC collector | `mc-collect-live.timer/.service` | timer active / 直近 12:58 実行 | `api/scripts/mc/mc_collect_live_state.sh` | **本線**。Phase A の `/mc/` に直結。 |
| MC collector | `mc-collect-git.timer/.service` | timer active / **service failed** | `api/scripts/mc/mc_collect_git_state.sh` | **要修復候補**。timer は活きているが unit は last failed。 |
| MC collector | `mc-collect-all.timer/.service` | timer active / **service failed** | `api/scripts/mc/mc_collect_all.sh` | **要修復候補**。 |
| MC build | `mc-build-handoff.timer/.service` | timer active / 直近 12:59 実行 | `api/scripts/mc/mc_build_ai_handoff.sh` | **本線**。AI ハンドオフ JSON。 |
| Notion task | `tenmon-notion-task-status-fix.service` | active running | (Notion sync 系) | 本線。 |
| Notion task | `tenmon-notion-task-seed.service` | activating auto-restart | (Notion seed loop) | **不安定**。auto-restart 状態は再起動ループの可能性。 |
| Notion task | `tenmon-strict-promotion.service` | activating auto-restart | (promotion runner) | **不安定**。同上。 |
| 旧 cron | `/etc/cron.d/tenmon-mc` (live) | enabled | `/opt/tenmon-mc/bin/collect.sh` (5 分毎) | **本線 (旧経路)**。`/opt/tenmon-mc/bin/` は live install されており repo の `mc/INSTALL.sh` 由来。 |
| 失敗 service | `tenmon-operations-level-autonomy.service` | failed | (旧 autonomy oneshot) | **死蔵**。 |
| 失敗 service | `tenmon-storage-debug.service` | failed | `/usr/local/bin/tenmon-storage-sync-debug.sh` | **死蔵**。 |
| 旧 service | `tenmon-todaycut-stack.service` | active exited | (今日切り stack) | 不明 (oneshot exited)。 |
| 完了 service | `tenmon-notion-task-readback / -requeue / -audit` | inactive dead | (Notion 補助) | 完了済み oneshot。 |

### 1.1 観測の核 (実体根拠)

```text
mc-collect-live.timer    Sat 13:03 LEFT  Sat 12:58 LAST  -> mc-collect-live.service (active)
mc-collect-git.timer     Sat 13:10 LEFT  Sat 13:00 LAST  -> mc-collect-git.service  (FAILED)
mc-collect-all.timer     Sat 13:20 LEFT  Sat 12:20 LAST  -> mc-collect-all.service  (FAILED)
mc-build-handoff.timer   Sat 13:14 LEFT  Sat 12:59 LAST  -> mc-build-handoff.service (active)
```

```text
tenmon-runtime-watchdog log (現状):
$ python3 .../tenmon_runtime_watchdog_v1.py
[Errno 2] No such file or directory   ← 自分自身の py を見失っている
$ python3 .../tenmon_acceptance_gate_v2.py
[Errno 2] No such file or directory
$ python3 .../tenmon_maintenance_governor_v1.py
[Errno 2] No such file or directory
... (毎サイクル空振り)
```

→ **「動いているように見えるが既に空回りしている systemd unit」が存在**。これは `4GB Automation VPS` 上での再利用前にハッキリさせるべき最重要事実。

---

## 2. /api/src/mc — 現役 mc コア (TypeScript / 26 ファイル / ~9,743 行)

### 2.1 ファイル一覧と用途 (1 行要約)

| path | 用途 |
|---|---|
| `mc/mcVnextFlag.ts` | mc vnext API 有効/無効フラグ。 |
| `mc/mcVnextSourceMapV1.ts` | source 集合の正規 map (Phase A 言霊系のリンク先)。 |
| `mc/sourceRegistry_seed.ts` | `source_registry` 初期投入候補 seed (Phase B Card-01 入口)。 |
| `mc/vnextPayloads.ts` | `/api/mc/vnext/*` 各 endpoint のペイロード組立て。 |
| `mc/types/mcVnextTypes.ts` | mc 型定義。 |
| `mc/routes/mcVnextRouter.ts` | `/api/mc/vnext/*` ルータ本体。 |
| `mc/routes/intelligenceRouter.ts` | `/api/mc/vnext/intelligence` ルータ。 |
| `mc/intelligence/deepIntelligenceMapV1.ts` | **deep intelligence map (Phase A 集約口)**。enforcer・bridge 等の verdict をここに集める。 |
| `mc/intelligence/khsConstitutionMapV1.ts` | KHS_CORE_v1 の状態 map。 |
| `mc/intelligence/kotodama50MapV1.ts` | 50 音 / 五十連十行 (Phase A 言霊憲法本体)。 |
| `mc/intelligence/mcContextInjectionEffectAuditV1.ts` | コンテキスト注入監査。 |
| `mc/intelligence/naturalGenSystemStaticV1.ts` | 自然生成系 静的 map。 |
| `mc/analyzer/mcRepairHubV1.ts` | **修復ハブ** (acceptance を未通過の項目を分類)。 |
| `mc/analyzer/mcVnextAcceptanceV1.ts` | **acceptance verdict 計算本体** (`PASS/FAIL` の核)。 |
| `mc/analyzer/mcVnextAlertsV1.ts` | アラート評価 (`git_dirty CRIT=1` 等)。 |
| `mc/analyzer/mcVnextAnalyzerV1.ts` | analyzer 統合。 |
| `mc/analyzer/mcVnextAnalyzerFlag.ts` | analyzer フラグ。 |
| `mc/analyzer/styleHeuristicsV1.ts` | スタイル経験則。 |
| `mc/claude/claudeSummaryV1.ts` | `/api/mc/vnext/claude-summary` 本体。 |
| `mc/claude/handoffPromptV1.ts` | Claude/Cursor 向けハンドオフ prompt。 |
| `mc/constitution/amatsuKanagiMapV1.ts` | 天津金木 50 パターン map。 |
| `mc/fire/intelligenceFireTracker.ts` | **PromptTraceV1 ロガー** (`mc_intelligence_fire.jsonl`)。 |
| `mc/history/mcSystemHistoryV1.ts` | mc 履歴。 |
| `mc/ledger/mcLedger.ts` | mc 台帳 (書き込み)。 |
| `mc/ledger/mcLedgerRead.ts` | mc 台帳 (読み出し / 49,753 文字)。 |
| `mc/notion/mcClaudeNotionMirrorV1.ts` | Notion ミラー。 |
| `mc/notion/...` | Notion 連携。 |

### 2.2 接続関係 (Phase A の計装ポイント)

`api/src/core/kotodamaConstitutionEnforcerV1.ts` →
`api/src/core/constitutionLoader.ts` (起動時呼び出し) →
`api/src/mc/intelligence/deepIntelligenceMapV1.ts` (verdict 反映) →
`api/src/mc/routes/intelligenceRouter.ts` (`/api/mc/vnext/intelligence`)

`api/src/routes/chat.ts` (PromptTrace 計装) →
`api/src/mc/fire/intelligenceFireTracker.ts` →
`/opt/tenmon-ark-data/mc_intelligence_fire.jsonl`

→ **api/src/mc は全件「現役・再利用必須」**。Phase B Card-01〜16 の embed 先はここに集中する。

---

## 3. /mc — 観測 PWA (Mission Control 旧経路 / 43 ファイル)

### 3.1 構成

```
mc/INSTALL.sh                  # 1 ショットインストーラ (root 権限)
mc/bin/  (24 sh)
mc/cron/tenmon-mc.cron         # /etc/cron.d/tenmon-mc 設置先
mc/config/mc.env
mc/nginx/                      # nginx include 設定 2 件
mc/web/  (HTML/CSS/JS)         # /mc/ 表示用 PWA
mc/docs/ACCEPTANCE*.md         # Phase 1-5 の acceptance ドキュメント
```

### 3.2 mc/bin 主要コレクター (各ファイル 1 行要約)

| script | 役割 |
|---|---|
| `collect.sh` | メイン entrypoint。5 分毎 cron。Phase 1-3 統合。 |
| `collect_data_integrity.sh` | DB 整合性指標。 |
| `collect_dialogue_quality.sh` | 対話品質指標 (9,010 文字)。 |
| `collect_feedback.sh` | feedback 件数集計。**`rating` 列は repo の DB に存在せず常に 0** (確認済)。 |
| `collect_founder.sh` | Founder 投稿件数。 |
| `collect_infra.sh` | infra 状態。 |
| `collect_kotodama.sh` | 言霊系メトリクス。 |
| `collect_learning.sh` | learning 系メトリクス。 |
| `collect_llm_routing.sh` | LLM ルーティング件数。 |
| `collect_notion_sync.sh` | Notion sync。 |
| `collect_persona.sh` | persona。 |
| `collect_sacred_corpus.sh` | sacred_corpus。 |
| `collect_sukuyou.sh` | 宿曜。 |
| `aggregate_history.sh` | history DB 集約。 |
| `assemble_report.sh` | 1 日レポート組立 (14,189 文字)。 |
| `ai_ingest.sh` | AI agent inbox 取込み (1 分毎)。 |
| `notion_mirror.sh` | Notion ミラー (1 時間毎)。 |
| `sample_dialogues.sh` | 対話サンプリング (深夜 2 時)。 |
| `init_history_db.sh` / `init_agent_db.sh` | DB 初期化 (一度きり)。 |
| `export_agent_activities.sh` | agent activity 出力。 |
| `generate_timeseries.sh` | 時系列生成。 |
| `common.sh` | 共通関数。 |

### 3.3 live 設置の現状

```
/opt/tenmon-mc/bin/             # collect.sh, ai_ingest.sh, assemble_report.sh, aggregate_history.sh のみ live
/opt/tenmon-mc/config/          # 存在
/etc/cron.d/tenmon-mc           # collect.sh 5 分毎のみ enabled
                                # ai_ingest / notion_mirror / sample_dialogues は cron に未登録
```

→ **mc/INSTALL.sh は中途まで実行された状態**。`mc/bin/` 全体を live 化する場合は再 INSTALL が必要。これは **再利用候補 (mc 本線)**。

---

## 4. /api/scripts — Shell 統合スクリプト (293 ファイル)

### 4.1 系統別分類 (代表ファイル + 1 行要約)

#### 4.1.1 acceptance / probe / verify 系 (再利用候補上位)

| file | 1 行要約 | 評価 |
|---|---|---|
| `acceptance_test.sh` | acceptance probe 実行ラッパ | 再利用 |
| `acceptance_orchestration_single_source_v1.sh` | acceptance 統一実行 | 再利用 |
| `run_acceptance_trace.sh` | acceptance trace 実行 | 再利用 |
| `route_probe_matrix_v1.sh` | route 別 probe 実行 | 再利用 |
| `chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh` | chat 系 acceptance + seal | 古い (3 月仕様) |
| `vps_acceptance_kernel_v1.sh` / `_os_v1.sh` | VPS acceptance 統合 | 再利用候補 |
| `release_gates.sh` | release ゲート | 再利用 |
| `web_smoke.sh` / `smoke.sh` / `p1_smoke.sh` / `p2_smoke.sh` | smoke テスト群 | 再利用 |
| `post_release_soak.sh` | release 後 soak | 再利用 |
| `stability_sweep.sh` / `final_mainline_stability_sweep_v1.sh` | 安定 sweep | 再利用 |

#### 4.1.2 deploy / build / restart 系 ⚠️ **危険**

| file | 1 行要約 | 評価 |
|---|---|---|
| `deploy_live.sh` | API live 反映 (build + systemctl restart) | **危険・本番直撃** |
| `deploy_web.sh` | Web live 反映 | **危険・本番直撃** |
| `run_deploy_and_check.sh` | deploy + check | **危険** |
| `run_restart_and_route_bleed_check.sh` | restart + 漏れチェック | **危険** |
| `setup_systemd_override.sh` | systemd drop-in 編集 | **危険** |
| `build_restart_wrapper_v1.sh` | build + restart wrapper | **危険** |
| `build_acceptance_autorun_v1.sh` | build → acceptance 自動 | **危険 (build/restart 含)** |
| `vps_sync_and_verify.sh` / `vps_sync_phase28.sh` / `vps_reclone_and_switch.sh` / `vps_fix_live_directory.sh` | VPS 同期/再 clone | **超危険** |

#### 4.1.3 rollback 系 ⚠️ **危険**

| file | 評価 |
|---|---|
| `tenmon_rollback_autotrigger_and_restore_v1.sh` / `tenmon_verify_rejudge_rollback_loop_v1.sh` / `auto_rollback_restore_guard_v1.sh` / `build_probe_rollback_autoguard_v1.sh` | **危険・自動 rollback 系。手動以外で起動しない** |

#### 4.1.4 chat refactor / chat_ts 系 (古い・原則使わない)

`chat_refactor_*` (6) + `chat_ts_*` (14) = **20 件**。3 月時点の chat.ts 大改装フェーズの遺物。**Phase A 完了後の現在は基本 dead** (Card-11 検討時に参考のみ)。

#### 4.1.5 自律 (autonomy) 系 (大半 dead)

`tenmon_autonomy_*` (13)、`tenmon_overnight_*` (6)、`tenmon_full_autopilot_*`、`tenmon_worldclass_*` (8) — **大半が 4 月以前の世代**で、Phase A 完成後は不要。死蔵カテゴリ。

#### 4.1.6 KHS / 言霊 ingest 系

`ingest_khs_*` (5)、`ingest_kokuzo_*` (2)、`seed_khs_laws_v1.mjs`、`sanskrit_kotodama_source_import_v1.sh`、`tenmon_katakamuna_source_audit_v1.sh` — **再利用候補** (Card-01〜04 で参照)。

#### 4.1.7 PWA / browser 系

`tenmon_pwa_*` (13)、`tenmon_pwa_playwright_node_probe_v1.mjs`、`tenmon_ai_browser_agent_mac_v1.mjs` — **大半 dead**。Phase A 完成後は不要。

#### 4.1.8 mc 系 (本線)

`api/scripts/mc/` (5 sh): `mc_collect_live_state.sh`, `mc_collect_git_state.sh`, `mc_collect_all.sh`, `mc_build_ai_handoff.sh`, `mc_lib.sh` — **完全な本線**。systemd timer から呼ばれ、verdict 算出の中核。

---

## 5. /api/automation — Python 自動化アーカイブ (1041 ファイル)

### 5.1 系統別分類

#### 5.1.1 cursor 系 (12 ファイル)

`cursor_applier_v1.py`, `cursor_bridge_v1.py`, `cursor_card_contract_v1.py`, `cursor_executor_bridge_v2.py`, `cursor_mac_executor_v1.py`, `cursor_operator_v1.py`, `cursor_result_collector_v1.py`, `cursor_review_acceptor_v1.py`, `cursor_runtime_*.py`, `cursor_local_launch_wrapper_v1.sh` — Cursor との橋渡し。**現在 Cursor 直接接続が確立しているため死蔵候補**。

#### 5.1.2 acceptance 系

`acceptance_gated_self_commit_and_requeue_v1.py`, `acceptance_orchestration_single_source_v1.py`, `acceptance_selector_v1.py`, `vps_acceptance_*.py` — **古い世代の acceptance**。現行は `api/src/mc/analyzer/mcVnextAcceptanceV1.ts` (TS) に置き換わっている。**死蔵**。

#### 5.1.3 self-build / self-improvement 系

`self_build_*` (4)、`self_improvement_*` (5)、`self_repair_*` (3)、`safe_self_improvement_*` — Phase A 以前の世代。**死蔵**。

#### 5.1.4 autonomy / overnight 系 (大半 dead)

`tenmon_autonomy_*` (25)、`tenmon_overnight_*`、`tenmon_full_autonomy_*`、`tenmon_full_autopilot_v1.py`, `final_seal_autopilot_v3.py` — 一晩 PDCA 系。**ほぼ全件 dead**。

#### 5.1.5 multi_ai / browser_ai 系

`multi_ai_*` (9)、`multi_ai_autonomy_supervisor_v1.py` (66 KB)、`browser_ai_consult_to_patchplan_mainline_v1.py`、`browser_ai_operator_v1.py` (44 KB)、`infinite_growth_*` (9) — **巨大な歴史遺産。死蔵**。

#### 5.1.6 chat refactor / chatts_*

`chat_refactor_*` (5 py + 4 json)、`chatts_*` (5 py + 4 json) — chat 大改装フェーズ。**死蔵**。

#### 5.1.7 patch / planner / executor 系

`patch_executor_v1.py`, `patch_generator_v1.py`, `patch_planner_v1.py`, `patch_diff_minimizer_v1.py`, `patch_safety_normalizer_v2.py`, `dangerous_patch_blocker_v1.py`, `product_patch_planner_min_diff_v1.py` — Cursor 移管後 **大半 dead**。`dangerous_patch_blocker_v1.py` は思想的に再利用候補 (危険 patch を阻む安全装置)。

#### 5.1.8 notion 系

`notion_autobuild_*` (5)、`notion_task_queue_schema_bind_v1.py` — Notion 自動構築。`tenmon-notion-task-status-fix.service` が live。**部分的に再利用候補**。

#### 5.1.9 storage / NAS 系

`storage_backup_nas_observer_v1.py`, `storage_backup_nas_probe_v1.py`, `storage_backup_mount_classifier_v1.py` — NAS 観測。**再利用候補** (Card-13 OCR/NAS で参照)。

#### 5.1.10 forensic / observer 系 (一部再利用)

`workspace_observer_v1.py`, `chat_architecture_observer_v1.py`, `kokuzo_bad_observer_v1.py`, `tenmon_chat_architecture_observer_v1.py`, `screen_observe_and_action_select_v1.py` — **思想は良いが個別ファイルは古い**。

#### 5.1.11 deploy / rollback / build_probe 系 ⚠️ **危険**

`auto_rollback_restore_guard_v1.py`, `build_probe_rollback_autoguard_v1.py`, `master_integrated_deploy_sequence_v1.py`, `rollback_plan_generator_v1.py`, `rollback_planner_v1.py`, `rollback_trigger_v1.py` — **Cursor 経由で起動しないこと**。

#### 5.1.12 reports/quarantine/_card_logs/_human_gate/_queue

```
api/automation/reports     343 件 (3 月の各種実行ログ)
api/automation/quarantine    8 件 (隔離済み)
api/automation/_card_logs / _human_gate / _queue は .gitignore 1 件のみ (空ディレクトリ)
```

→ `reports/` は **歴史的痕跡。新規実行不要**。`_card_logs/` 等は使われていない。

---

## 6. /scripts — root 直下 (17 件)

| file | 評価 |
|---|---|
| `deploy_all.sh` | **超危険** (`git pull` + `npm install` + `tsc` + `systemctl restart`)。手動運用専用。 |
| `create-release-package.sh` | release 用 tarball。再利用 (低頻度)。 |
| `fix-nginx-api-proxy.sh` | nginx 修復。手動運用専用 (危険)。 |
| `tenmon_acceptance.sh` | 軽量 acceptance ラッパ。再利用候補。 |
| `migrate-legacy-memory.mjs` | 旧 memory 移行。**migration 系 — 危険**。 |
| `seed-plans*.mjs / seed-plans.ts` | plans 投入 seed。手動 seed 候補。 |
| `seed-site-info.mjs` / `seed-siteinfo.mjs` | site info seed。 |
| `setupSiteInfo.mjs` / `setupSiteInfo.ts` | site info セットアップ。 |
| `verify-phase-c-integration.mjs` | phase C 検証。**死蔵 (旧フェーズ)**。 |
| `katakamuna_node_extract_v1.ts` / `katakamuna_source_relations_v1.ts` / `katakamuna_tenmon_reconcile_v1.ts` | カタカムナ系統合。再利用候補。 |
| `unify-kotodama.sh` | 言霊統一。死蔵 (Phase A で吸収済み)。 |

---

## 7. /tools

| file | 評価 |
|---|---|
| `tools/proof_helpers.sh` (327B) | proof helper 共通関数。再利用候補。 |

---

## 8. /server — 旧世代実装 (484 ファイル / 472 ts)

3 月 2 日タイムスタンプが大半を占める旧世代。`server/cli/doctor.ts`, `server/jobs/scheduler.ts` を含む。**Phase A の本線 (`api/src/...`) は別系統**で、`server/` は基本的に dead な参考実装。

| file | 評価 |
|---|---|
| `server/cli/doctor.ts` (368 行) | **5 項目 health check (env / db / api-keys / file-structure / dependencies)** の TS 実装。`runHealthChecks()` API。 → **TENMON DOCTOR 統合候補 (思想再利用)**。実装は古い。 |
| `server/cli/setupEnv.ts` | env 初期化。 |
| `server/jobs/scheduler.ts` (72 行) | Sunday 3:00 UTC 毎週の Memory Compression Job ランチャ。 |
| `server/jobs/memoryCompression.ts` | Memory Compression Job 本体。 |
| `server/systemd/tenmon-ark-api.service` | 旧 systemd unit (`/opt/tenmon-ark/tenmon-ark` を WorkingDir)。**現行 unit と path 不一致のため使用不可**。 |
| `server/api/feedback/*` | 旧 feedback API。現行は `api/src/routes/feedback.ts` に置き換わっている。 |

---

## 9. /automation (root 直下) — 公式 auto-runner

```
automation/
├── tenmon_auto_runner.py            (15 KB, 442 行)
├── ai_apply_adapter.sh
├── APPLY_ENGINE_STATUS_V1.md        (apply engine 未配線の現状)
├── cards/R8_KANAGI_SELF_KERNEL_V1.apply.sh
├── prompts/R8_KANAGI_SELF_KERNEL_V1.prompt.md
├── queue/tenmon_auto_queue.json     (cards: OPS_HEALTHCHECK_V1 enabled / R8_KANAGI_SELF_KERNEL_V1 disabled)
└── systemd/tenmon-auto-runner.service (file は存在するが unit 未登録)
```

`tenmon_auto_runner.py` の主要機能:
- `--queue`, `--once`, lock (`/var/lock/tenmon_auto_runner.lock`), state (`/var/log/tenmon/auto_state.json`)
- ステージ: `precheck → apply → build → restart → audit → probe`
- `freeze` 機構: 失敗時に `/var/log/tenmon/<card>_AUTO_FREEZE_V1.txt` を出力
- `_apply_wired()`: `TENMON_AI_APPLY_CMD` or `TENMON_APPLY_ENGINE` 環境変数で apply lane を有効化
- `bad_dirty_paths`: 許可外の git dirty を検知して停止
- `health-only` lane (build + restart + audit + probe) のみ稼働可、`apply` lane は **未配線** (OPS_APPLY_ENGINE_SELECT_V1 待ち)

→ **`automation/tenmon_auto_runner.py` は 4GB Automation VPS 上で再利用される最有力候補 (本命)**。Phase B Card-12 (acceptance probe → promotion bind) と直結。

---

## 10. 4 軸統合候補 (tenmon doctor / feedback-loop / acceptance / mc)

### 10.1 tenmon doctor 統合候補

| 部品 | path | 寄与 | 採用理由 |
|---|---|---|---|
| ヘルスチェック 5 項目 (思想) | `server/cli/doctor.ts` | env / db / api-keys / file-structure / dependencies | **思想のみ再利用** (実装は古いので Phase A 系で再実装推奨)。 |
| systemd 状態取得 | (新規) `systemctl is-active`, `is-failed`, `list-timers` | service health 集約 | live 状態の根拠。 |
| auto-runner state 読み込み | `/var/log/tenmon/auto_state.json` (`automation/tenmon_auto_runner.py` 出力) | 直近 auto-run の verdict | 既存出力を読むだけ。 |
| watchdog 死蔵検知 | `tenmon-runtime-watchdog.service` の log 解析 | "Errno 2" の連発を検出 | **死蔵 unit 検知**機能。 |
| acceptance verdict 取り込み | `api/src/mc/analyzer/mcVnextAcceptanceV1.ts` 出力 | `/api/mc/vnext/claude-summary` の verdict | Phase A 本線。 |
| MC live state | `api/scripts/mc/mc_collect_live_state.sh` | 直近 mc snapshot | 直近 timer 実行結果。 |
| feedback 件数 | `api/data/feedback/*.json` + `mc/bin/collect_feedback.sh` (rating 抜きで再構成) | 未処理 feedback 件数 | feedback-loop 連携。 |

### 10.2 feedback-loop 統合候補

| 部品 | path | 寄与 |
|---|---|---|
| Notion DB | `860b3ca8-2286-49b1-ad67-c2c168a87148` (現行) | 改善要望蓄積本体 |
| API endpoint | `api/src/routes/feedback.ts` | POST/GET/generate-card |
| local fallback | `api/data/feedback/*.json` (46 件) | Notion 障害時の保険 |
| 集計 | `mc/bin/collect_feedback.sh` (rating 列を削除して再利用) | 件数 only |
| カード生成 | `feedback.ts` `/generate-card` | LLM で fix card 案を吐く |
| Notion sync | `tenmon-notion-task-status-fix.service` (live) | status 同期 |
| Notion mirror | `mc/bin/notion_mirror.sh` | 1 時間毎ミラー |

→ **既に実体が稼働している**。今回 OBSERVE-only で確認した `CARD-FEEDBACK-LOOP-OBSERVE-V1` の延長に Cursor card を作って自動分類すれば完成。

### 10.3 acceptance 統合候補

| 部品 | path | 寄与 |
|---|---|---|
| acceptance core (現役) | `api/src/mc/analyzer/mcVnextAcceptanceV1.ts` (35 KB) | verdict (PASS/FAIL) 計算 |
| alerts | `api/src/mc/analyzer/mcVnextAlertsV1.ts` | git_dirty / build_dirty 等 |
| repair hub | `api/src/mc/analyzer/mcRepairHubV1.ts` | 未通過項目分類 |
| auto-runner audit ステージ | `automation/tenmon_auto_runner.py` `stage=audit` | acceptance 取得 + freeze |
| acceptance shell ラッパ | `api/scripts/acceptance_test.sh`, `acceptance_orchestration_single_source_v1.sh`, `tenmon_acceptance.sh` | 手動実行 |
| route probe | `api/scripts/route_probe_matrix_v1.sh` | route 別 acceptance |
| smoke | `api/scripts/p1_smoke.sh`, `p2_smoke.sh`, `web_smoke.sh` | 軽量 smoke |

### 10.4 /mc/ 統合候補

| 部品 | path | 寄与 |
|---|---|---|
| mc core (TS, 現役) | `api/src/mc/*` 26 ファイル | `/api/mc/vnext/*` 本体 |
| live timer | `mc-collect-live.timer` → `api/scripts/mc/mc_collect_live_state.sh` | 直近 5 分の snapshot |
| build handoff timer | `mc-build-handoff.timer` → `api/scripts/mc/mc_build_ai_handoff.sh` | AI 引き継ぎ JSON |
| git state timer | `mc-collect-git.timer` → `api/scripts/mc/mc_collect_git_state.sh` (**現在 failed**) | 修復対象 |
| all timer | `mc-collect-all.timer` → `api/scripts/mc/mc_collect_all.sh` (**現在 failed**) | 修復対象 |
| 旧 cron | `/etc/cron.d/tenmon-mc` (5 分毎 `collect.sh`) | 旧 PWA 集計 |
| 旧 PWA Web | `mc/web/` (HTML/CSS/JS) + `mc/nginx/` | `/mc/` 表示 |
| INSTALL | `mc/INSTALL.sh` | 全 mc 系 1 ショット展開 |

---

## 11. **危険スクリプト** (Cursor から自動実行絶対禁止のもの)

OBSERVE-only 運用および 4GB Automation VPS 設計の前提として、以下は **手動運用専用 / Cursor からの自動 invoke 禁止**。

### 11.1 Tier-1: 本番直撃 (即停止 / 即破壊)

| file | リスク |
|---|---|
| `scripts/deploy_all.sh` | git pull + npm install + tsc + `systemctl restart tenmon-ark-api` を一気通貫実行。**API 全停止 → ビルド失敗で本番ダウン可能性**。 |
| `api/scripts/deploy_live.sh` | API live 反映 + restart。 |
| `api/scripts/deploy_web.sh` | Web live 反映。 |
| `api/scripts/run_deploy_and_check.sh` | deploy + check。 |
| `api/scripts/run_restart_and_route_bleed_check.sh` | restart 含む。 |
| `api/scripts/setup_systemd_override.sh` | systemd drop-in 編集。 |
| `api/scripts/build_restart_wrapper_v1.sh` | build + restart。 |
| `api/scripts/build_acceptance_autorun_v1.sh` | build + acceptance auto。 |
| `infra/deploy.sh` | infra deploy。 |
| `infra/auto-recovery.sh` | systemctl restart 含む auto-recovery。 |
| `web/scripts/deploy_web_live.sh`, `site/scripts/deploy_site_live.sh` | live web 反映。 |
| `.github/workflows/deploy.yml` | CI deploy ワークフロー。 |

### 11.2 Tier-1: VPS 同期/再 clone (リポジトリ全体破壊リスク)

| file | リスク |
|---|---|
| `api/scripts/vps_sync_and_verify.sh` | VPS 同期。 |
| `api/scripts/vps_sync_phase28.sh` | フェーズ別 VPS 同期。 |
| `api/scripts/vps_reclone_and_switch.sh` | **再 clone + 切替**。historical commit 喪失リスク。 |
| `api/scripts/vps_fix_live_directory.sh` | live dir 修正。 |
| `api/src/scripts/tenmon_master_integrated_deploy_sequence_vps_v1.sh` | VPS デプロイ統合。 |

### 11.3 Tier-1: rollback / restore 系 (自動起動禁止)

| file | リスク |
|---|---|
| `api/scripts/tenmon_rollback_autotrigger_and_restore_v1.sh` | 自動 rollback。**手動以外で起動しない**。 |
| `api/scripts/tenmon_verify_rejudge_rollback_loop_v1.sh` | rejudge → rollback ループ。 |
| `api/scripts/auto_rollback_restore_guard_v1.sh` | rollback restore guard。 |
| `api/scripts/build_probe_rollback_autoguard_v1.sh` | probe → rollback 自動防御。 |
| `api/automation/auto_rollback_restore_guard_v1.py` | 同上の Python 版。 |
| `api/automation/build_probe_rollback_autoguard_v1.py` | 同上。 |
| `api/automation/rollback_plan_generator_v1.py`, `rollback_planner_v1.py`, `rollback_trigger_v1.py` | rollback 計画/実行系。 |
| `api/automation/tenmon_rollback_autotrigger_and_restore_v1.py` | 自動トリガ。 |
| `api/automation/tenmon_autonomy_failclosed_supervisor_rollback_forensic_cursor_auto_v1.py` | failclosed rollback supervisor。 |

### 11.4 Tier-2: migration / DB seed (DB 書き込みリスク)

| file | リスク |
|---|---|
| `scripts/migrate-legacy-memory.mjs` | legacy memory 移行 (DB write)。 |
| `scripts/seed-plans*.mjs`, `seed-plans.ts` | DB seed。 |
| `scripts/seed-site-info.mjs`, `seed-siteinfo.mjs` | DB seed。 |
| `scripts/setupSiteInfo.mjs`, `setupSiteInfo.ts` | DB セットアップ。 |
| `api/scripts/seed_*` 多数 | seed 系 (Phase A ですでに DB に乗ったものを上書きする恐れ)。 |
| `api/scripts/rebuild_fts5.sh` | FTS5 リビルド。 |

### 11.5 Tier-2: build-implicated (build 失敗で起動失敗誘発)

| file | リスク |
|---|---|
| `api/automation/master_integrated_deploy_sequence_v1.py` | 統合 deploy sequence。 |
| `api/automation/full_autopilot_v1.py`, `final_seal_autopilot_v3.py`, `worldclass_ascent_autopilot_v2.py` | autopilot 全実行。 |
| `api/automation/multi_ai_autonomy_supervisor_v1.py` | multi-AI 自律監督 (66 KB)。 |
| `api/automation/infinite_growth_loop_orchestrator_v1.py` | 無限成長ループ (43 KB)。 |
| `api/automation/overnight_full_pdca_autonomy_orchestrator_v1.py` | 一晩 PDCA。 |
| `api/automation/tenmon_full_autonomy_os_13plus4_master_parent_v1.py` | full autonomy parent。 |
| `api/scripts/autopilot_cycle.sh` / `card_runner.sh` / `runner.sh` / `phase44_runner.sh` | runner 系。**chat/build/deploy を含むため危険**。 |

### 11.6 死蔵 (走らせると Errno 2 で空回りする系)

`tenmon-runtime-watchdog.service`, `tenmon-auto-patch.service` がメモリ上で実行している **対象ファイルが既に repo から削除されている**。再利用前に systemd 側を停止・更新する必要がある:

```text
tenmon-runtime-watchdog → /opt/tenmon-ark-repo/api/automation/tenmon_runtime_watchdog_v1.py (未存在)
tenmon-auto-patch       → /opt/tenmon-ark-repo/auto_patch_runner.sh                          (未存在)
mc-collect-git.service  → /opt/tenmon-ark-repo/api/scripts/mc/mc_collect_git_state.sh        (last failed)
mc-collect-all.service  → /opt/tenmon-ark-repo/api/scripts/mc/mc_collect_all.sh              (last failed)
tenmon-operations-level-autonomy.service → failed (旧 autonomy oneshot)
tenmon-storage-debug.service              → failed (旧 storage debug)
```

これらは「動いているように見える」が **既に死蔵**。Phase B 開始前に `systemctl disable` 等の整理対象として認知すべき。

---

## 12. 評価サマリ (実行可能 / 古い / 危険 / 再利用候補)

| カテゴリ | 件数 (概算) | 例 |
|---|---:|---|
| **本線稼働中 (再利用必須)** | ~35 | `api/src/mc/*` 26 + `api/scripts/mc/*` 5 + `automation/tenmon_auto_runner.py` + `mc/bin/collect.sh` 系 + `feedback.ts` |
| **再利用候補 (思想/部分採用)** | ~80 | `server/cli/doctor.ts` (思想)、`mc/bin/*` 24 sh、`api/scripts/acceptance_*` `release_gates.sh` `web_smoke.sh` 等、`tools/proof_helpers.sh`、`scripts/katakamuna_*` 3、`storage_backup_*` 系、`dangerous_patch_blocker_v1.py` |
| **古い (Phase A 以前 / 直接利用不可)** | ~700+ | `api/automation/tenmon_autonomy_*` 25、`api/scripts/chat_ts_*` 14、`chat_refactor_*` 11、`tenmon_pwa_*` 26、`tenmon_worldclass_*` 16、`tenmon_overnight_*` 13、`infinite_growth_*` 9、`multi_ai_*` 9 等 |
| **危険 (Cursor 自動禁止)** | ~50 | §11 表に列挙 (deploy / restart / rollback / vps_sync / migration / autopilot 系) |
| **死蔵 systemd unit** | 6 | watchdog / auto-patch / mc-collect-git / mc-collect-all / operations-level-autonomy / storage-debug |
| **空ディレクトリ・残骸** | ~5 | `_card_logs/`, `_human_gate/`, `_queue/`, `quarantine/`, `reports/` 343 件 (旧ログ) |

---

## 13. 4GB Automation VPS 再利用設計 (案)

OBSERVE-only の結果から、4GB Automation VPS 上で**信頼できる**自動化を構築する場合に再利用すべきものを以下に絞る:

### 13.1 採用 core (5 部品)

1. `automation/tenmon_auto_runner.py` (442 行) — health-only lane で常用、apply lane は将来配線
2. `automation/queue/tenmon_auto_queue.json` — queue 定義
3. `api/src/mc/*` 26 ファイル — verdict / acceptance / repair / intelligence 集約
4. `api/scripts/mc/mc_collect_live_state.sh` ほか 5 sh — live snapshot
5. `mc/bin/collect.sh` 系 24 sh — observability

### 13.2 採用 wrapper (3 部品)

6. `api/scripts/acceptance_test.sh` — 軽量手動 acceptance
7. `api/scripts/route_probe_matrix_v1.sh` — route 別 probe
8. `tools/proof_helpers.sh` — 共通ユーティリティ

### 13.3 採用 systemd (4 unit)

9. `automation/systemd/tenmon-auto-runner.service` — health lane runner
10. `api/systemd/mc-collect-live.service` (現行 timer)
11. `api/systemd/mc-build-handoff.service` (現行 timer)
12. `api/systemd/mc-collect-git.service` (要修復、その上で再採用)

### 13.4 排除すべきもの

- `tenmon-runtime-watchdog.service` (死蔵)
- `tenmon-auto-patch.service` (死蔵)
- `tenmon-operations-level-autonomy.service` (failed / 旧 autonomy)
- `api/automation/` 内 `*_autopilot_*`, `*_overnight_*`, `infinite_growth_*`, `multi_ai_autonomy_*` 群
- `api/scripts/chat_ts_*`, `chat_refactor_*`, `tenmon_pwa_*` 群 (Phase A 以前の遺物)

---

## 14. 次カード候補 (Cursor 受け入れ用)

OBSERVE-only でこの監査が Phase B Card-01 投入前のクリーンアップに資する。提案:

### 14.1 CARD-AUTOMATION-DEAD-UNIT-RETIRE-V1 (OBSERVE → 軽微整理)

- `tenmon-runtime-watchdog.service` 等の **死蔵 systemd unit を停止/disable** する単発カード
- 対象: `tenmon-runtime-watchdog`, `tenmon-auto-patch`, `tenmon-operations-level-autonomy`, `tenmon-storage-debug`
- リスク: 停止のみ (削除しない)、復帰可
- 副次: `api/automation/tenmon_runtime_watchdog_v1.log` のローテート確認 (現状 18 MB)

### 14.2 CARD-MC-COLLECTOR-FAILED-REPAIR-V1

- `mc-collect-git.service`, `mc-collect-all.service` の last failed の原因特定 (logs 解析のみ → 修復は別カード)
- OBSERVE-only

### 14.3 CARD-AUTO-RUNNER-OFFICIAL-ENABLEMENT-V1

- `automation/tenmon-auto-runner.service` を systemd に正式登録 (.timer も追加)
- health lane only で 5-10 分毎に `--once` を実行
- apply lane は引き続き `enabled:false` (後続 Card で解禁)

### 14.4 CARD-DOCTOR-V2-PHASE-A-NATIVE-V1

- `server/cli/doctor.ts` (旧) を廃して、`api/src/mc/*` を読み出す **Phase A native doctor** を新設
- 既存の `/api/mc/vnext/claude-summary` と `/api/mc/vnext/intelligence` を組み合わせ、CLI 1 本に集約
- Cursor からの "tenmon doctor" 起動時に統一出力

### 14.5 CARD-DANGEROUS-SCRIPT-DENYLIST-V1

- §11 の Tier-1/Tier-2 を `automation/cards/...denylist.json` 化
- `tenmon_auto_runner.py` 側で実行前に denylist 突合してブロック
- これにより 4GB Automation VPS 上で **危険スクリプトの自動 invoke を構造的に禁止**

### 14.6 CARD-FEEDBACK-LOOP-CARD-GENERATION-V1

- `CARD-FEEDBACK-LOOP-OBSERVE-V1` の延長
- 未処理 Founder 改善要望 → 自動カテゴリ → Cursor card 案出力 (実装は別カード)

### 14.7 CARD-CHAT-LONGFORM-CUT-FIX-V1 (= Card-11)

- `CARD-CHAT-LONGFORM-CUT-OBSERVE-V1` の結論を実装フェーズへ
- 対象: `api/src/routes/chat.ts` L1283 / L5850 の 500 文字 hard clamp に "longform contract" を導入

---

## 15. Acceptance (本レポート自身)

- ✅ 実装変更ゼロ (本ファイル `docs/ark/automation/AUTOMATION_LEGACY_INVENTORY_V1.md` の追加のみ)
- ✅ 対象 7 ディレクトリすべてを実体確認 (§0.1)
- ✅ 既存自動構築部品が一覧化 (§2〜§9)
- ✅ 再利用候補が分類 (§12, §13)
- ✅ 危険スクリプトが Tier-1/Tier-2 で明記 (§11)
- ✅ tenmon doctor / feedback-loop / acceptance / mc への統合候補 (§10) を全 4 軸で記述
- ✅ 死蔵 systemd unit (`tenmon-runtime-watchdog` 等) が **動いているように見えるが空回りしている** という事実を実体ログで提示 (§1)
- ✅ 次カード候補 7 件を提示 (§14)
- ✅ 推測なし (`systemctl is-active`, `systemctl status`, `ls -la`, journalctl, `head/tail` での実体根拠付き)

## 16. 報告 (TENMON 裁定用)

| 項目 | 値 |
|---|---|
| 対象 7 dir | 全件 OK (scripts / api/scripts / api/automation / api/src/mc / mc / server / tools) |
| 一覧化部品数 | mc TS 26 + mc shell 5 + mc PWA 24 + scripts 17 + tools 1 + api/scripts 293 + api/automation 1041 + automation/* (root) 7 + server 484 + systemd 7 unit |
| 再利用 core 候補 | 5 部品 (§13.1) |
| 再利用 wrapper 候補 | 3 部品 (§13.2) |
| 再利用 systemd unit 候補 | 4 unit (§13.3) |
| 死蔵 systemd unit | 6 unit (§11.6) |
| 危険スクリプト Tier-1 | 26 件 (§11.1〜§11.3) |
| 危険スクリプト Tier-2 | 13 件 (§11.4〜§11.5) |
| 古いカテゴリ (利用しない) | 700 件超 |
| 次カード候補 | 7 件 (§14) |
| PATCH なし確認 | git diff は本ファイル追加のみ (commit 後に確認) |

—— 以上 OBSERVE-only 完了。
