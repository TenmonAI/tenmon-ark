# DENYLIST CHECK 運用ガイド

> 本ガイドは TENMON / Claude / Cursor の各段階で
> `CARD_TEMPLATE_DENYLIST_CHECKLIST.md` を運用するための実施手順である。
> 本ガイドは **Phase β (運用ルール明文化)** の成果物であり、
> Phase γ (Cursor 自動 reject 機能) は別カードで実装する。

- バージョン: V1
- 作成日: 2026-04-25
- card: CARD-DENYLIST-CURSOR-CARD-CHECK-V1
- parent_commit: `df76610b` (DENYLIST-AUTORUNNER-WIRING-V1)
- 一次情報源: `docs/ark/automation/dangerous_script_denylist_v1.json` (commit `563fa399`)
- 既配線: `automation/tenmon_auto_runner.py` precheck stage (commit `df76610b`)

---

## 1. 運用フロー全体図

```
TENMON 裁定 (危険性 + 影響範囲を吟味)
  ↓
Claude が起案 (grep セルフチェック実施)
  ↓
TENMON が目視確認 (CHECKLIST 適用)
  ↓
Cursor へ投入 (TENMON OVERRIDE 文付)
  ↓
Cursor が実行前確認 (card 本文 → 抽出 → denylist 突合)
  ↓
実行 (PRE → 操作 → POST、各 step で状態保証)
  ↓
完了報告 (TENMON / Claude が verify、20+ 項目)
  ↓
[次カード起案へ]

[ 機械的 fence (既存 / 予定) ]
  - tenmon_auto_runner precheck: _scan_card_for_denylist (wired @ df76610b)
  - tenmon_doctor:               wired=false (別カード予定)
  - cursor_via_card:             wired=false (Phase γ で別カード予定)
  - 4GB VPS automation_os:       wired=false (旧環境、別カード予定)
```

## 2. TENMON のチェック手順

### Step 1: カード本文を読む

Claude が起案したカードを TENMON が読む。

### Step 2: チェックリスト適用

`CARD_TEMPLATE_DENYLIST_CHECKLIST.md` の "TENMON 段階チェック" を順に適用:

- 本番直撃を含まない?
- rollback 系を呼ばない?
- VPS 同期を呼ばない?
- autopilot / supervisor / orchestrator を呼ばない?
- systemctl restart 本番を含まない?
- TENMON 裁定なしの危険操作はない?
- PRE / POST 状態確認が含まれる?
- rollback 手順が含まれる? (RETIRE 系)
- acceptance / enforcer 維持確認が含まれる?
- 触らない対象リストが含まれる?
- 報告必須項目が含まれる?

### Step 3: 違反検出時

Claude にカード書き換えを指示。または `manual_only` で TENMON 直接 SSH。
書き換え方針として:

- 直接 path 呼び出しを避け、代替の最小 patch にする
- restart を避けるなら、既存 unit を触らずに済む構造を組む
- DB 書き込みを避けるなら、`TENMON_ENV=test` 経由のみ許可する

### Step 4: 投入承認

すべてクリアしたら Cursor へ投入。

## 3. Claude のチェック手順 (起案中)

### Step 1: カード本文をドラフト

通常通り起案。

### Step 2: 起案後に grep セルフチェック

Claude が自身の起案カード本文に対して以下を grep する:

```bash
CARD_TEXT="$(cat draft_card.md)"

DANGEROUS_KEYWORDS=(
  # systemctl 本番直撃
  "systemctl restart tenmon-ark-api"
  "systemctl restart nginx"
  "systemctl mask"
  # 破壊的 shell
  "rm -rf /opt"
  "git push --force"
  "git push -f"
  "git reset --hard"
  # Cat A
  "deploy_all.sh"
  "deploy_live.sh"
  "deploy_web.sh"
  "run_deploy_and_check.sh"
  "run_restart_and_route_bleed_check.sh"
  "setup_systemd_override.sh"
  "build_restart_wrapper_v1.sh"
  "build_acceptance_autorun_v1.sh"
  "infra/deploy.sh"
  "infra/auto-recovery.sh"
  "deploy_web_live.sh"
  "deploy_site_live.sh"
  ".github/workflows/deploy.yml"
  # Cat B
  "vps_sync_and_verify.sh"
  "vps_sync_phase28.sh"
  "vps_reclone_and_switch.sh"
  "vps_fix_live_directory.sh"
  "tenmon_master_integrated_deploy_sequence_vps_v1.sh"
  # Cat C
  "auto_rollback_restore_guard"
  "build_probe_rollback_autoguard"
  "rollback_plan_generator"
  "rollback_planner_v1"
  "rollback_trigger_v1"
  "tenmon_rollback_autotrigger"
  "tenmon_verify_rejudge_rollback_loop"
  "tenmon_autonomy_failclosed_supervisor_rollback_forensic"
  # Cat D (TENMON_ENV=test 以外で禁止)
  "migrate-legacy-memory"
  "seed-plans"
  "seed-site-info"
  "seed-siteinfo"
  "setupSiteInfo"
  "seed_iroha_principles"
  "seed_katakamuna_principles"
  "seed_khs_laws"
  "seed_learning_effect_audit"
  "seed_tenmon_core_pack"
  "rebuild_fts5"
  # Cat E
  "master_integrated_deploy_sequence_v1.py"
  "full_autopilot_v1"
  "final_seal_autopilot"
  "worldclass_ascent_autopilot"
  "multi_ai_autonomy_supervisor"
  "infinite_growth_loop_orchestrator"
  "overnight_full_pdca_autonomy_orchestrator"
  "tenmon_full_autonomy_os_13plus4_master_parent"
  "autopilot_cycle.sh"
  "card_runner.sh"
  "phase44_runner.sh"
)

VIOLATIONS=0
for keyword in "${DANGEROUS_KEYWORDS[@]}"; do
  # 例として記載されているコードブロック / 説明用 grep をスキップする工夫が必要
  # Claude セルフレビューでは「実行コマンド扱い」されているか文脈で判断する
  if echo "$CARD_TEXT" | grep -q "$keyword"; then
    echo "WARNING: dangerous keyword detected: $keyword"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

if [ "$VIOLATIONS" -gt 0 ]; then
  echo ""
  echo "→ TENMON 裁定が必須、または書き換え"
  echo "→ 例外: 説明 / 一覧 / denylist 解説の文脈なら許容 (実行コマンドではない)"
fi
```

### Step 3: 違反検出時

カード本文を修正する。代替手段を提案する:

- 「`systemctl restart tenmon-ark-api`」→ 該当カードでは触らない宣言を冒頭に明記
- 「`bash deploy_all.sh`」→ deploy 系を一切呼ばない設計に変更
- 「`migrate-legacy-memory.mjs`」→ 完全に対象外、起案しない (本番運用で migration を呼ぶ自動化は禁止)

### Step 4: 起案完了

TENMON 裁定可能な状態で本対話に提示。冒頭に以下を明記する:

- TENMON OVERRIDE
- TENMON FINAL INSTRUCTION
- 絶対禁止事項
- 触らない対象
- 許可される変更
- Acceptance (10+ 項目)
- FAIL 条件
- 報告必須項目

## 4. Cursor のチェック手順 (実行前)

### Step 1: カード冒頭を読む

`TENMON OVERRIDE` / `TENMON FINAL INSTRUCTION` を確認。

### Step 2: 絶対禁止事項を一覧化

カード冒頭の "絶対禁止" / "FAIL 条件" / "触らない対象" を抽出してメモする。

### Step 3: bash / systemctl / curl コマンドの抽出

カード本文から実行可能コマンドを正規表現で抽出する:

```bash
# パターン例 (コード fence 内のみを対象にすると確実)
grep -E "^[ ]*\\\$|^[ ]*bash |^[ ]*systemctl |^[ ]*curl |^[ ]*python3 |^[ ]*git " card.md
```

### Step 4: denylist との照合 (機械的)

抽出したコマンドが denylist に該当するか確認する:

```bash
# 簡易チェック (Cursor 段階で実行する補助 script)
DENYLIST_JSON=docs/ark/automation/dangerous_script_denylist_v1.json
EXTRACTED_CMDS_FILE=/tmp/extracted_cmds.txt   # Step 3 で抽出済

while read -r cmd; do
  while read -r dangerous_path; do
    if echo "$cmd" | grep -q "$dangerous_path"; then
      echo "VIOLATION: '$cmd' contains '$dangerous_path'"
    fi
  done < <(jq -r '.categories[].scripts[].path' "$DENYLIST_JSON")
done < "$EXTRACTED_CMDS_FILE"
```

(参考: 既に `automation/tenmon_auto_runner.py` の precheck stage には
`_scan_card_for_denylist` が wired されているため、auto_runner 経由実行時は機械的に block される。
Cursor 経由は本ガイドの目視 + grep が主要 fence。)

### Step 5: 実行前最終確認

すべてクリアしたら、各 step で以下の順序で実行する:

1. PRE 状態確認 (ファイル / unit / API)
2. 操作実施
3. POST 状態確認 (差分 / unit / API)
4. step ごとに記録を残す

### Step 6: 違反検出時

実行せず TENMON / Claude に報告。card 修正版が来るまで待機する。
報告には以下を含める:

- 検出された keyword
- 該当する category
- card 上の出現箇所 (行番号 or section)
- 推奨される代替手段

## 5. 例外運用

### 5.1 manual_only

TENMON が SSH で直接実行する場合のみ。Cursor 経由では絶対実行しない。

```
TENMON: ssh root@vps
TENMON: cd /opt/tenmon-ark-repo
TENMON: bash scripts/deploy_all.sh   # ← 危険、TENMON 完全責任
```

manual_only で実行する場合の TENMON 自身のチェック手順:

- [ ] TTY が対話的か確認 (`tty` コマンド)
- [ ] 実行ユーザを記録 (`whoami`, `id`)
- [ ] PRE 状態を完全記録 (systemctl / git / API)
- [ ] 実行
- [ ] POST 状態を完全記録
- [ ] 差分を Notion / log に手動記録 (本ガイドは Notion 自動書き込み禁止)

### 5.2 test_environments

将来の Phase γ で実装。本ガイドでは規定のみ:

- `TENMON_ENV=test` 環境変数が設定された環境で
- Cat D (migration / DB seed) のみ条件付き許可
- ただし `deny_globs` に hit する場合は依然 block (二重 fence)
- production への昇格時に再度 denylist 突合

## 6. 改訂履歴

```
V1: 2026-04-25
  - 初版作成
  - denylist V1 (commit 563fa399) ベース
  - tenmon_auto_runner precheck wiring (commit df76610b) を前提に明文化
  - TENMON / Claude / Cursor 3 段階チェック手順
  - manual_only / test_environments 例外規定
  - 既知の wired 状態:
    - tenmon_auto_runner: wired (但し service 自体は static / inactive)
    - tenmon_doctor:       未配線
    - cursor_via_card:     未配線 (Phase γ)
    - 旧 4GB VPS:          未配線
```

## 7. 次の進化 (Phase γ 以降の予定、本カード対象外)

```
- Cursor 自動 reject 機能 (実装カード、別カード)
- Claude セルフチェック script 化 (CI / pre-commit と統合の検討)
- TENMON 用ダッシュボード化 (進化ログ UI に統合の可能性)
- tenmon_doctor への配線 (別カード)
- 旧 4GB VPS への適用 (別カード、ただし旧環境は触らない方針)
```

## 8. 補足: 既存 fence 一覧 (本カード執筆時点)

| Fence | 段階 | 状態 | コミット | 備考 |
|---|---|---|---|---|
| TENMON 目視 (CHECKLIST 適用) | 投入前 | 運用中 | 本カード | 本カードで明文化 |
| Claude grep セルフレビュー | 起案時 | 運用中 | 本カード | 本ガイドの shell snippet |
| Cursor 目視 + grep | 実行前 | 運用中 | 本カード | 本ガイドの Step 1-6 |
| `_scan_card_for_denylist` | auto_runner precheck | wired | df76610b | 静的 path 突合のみ |
| `_load_denylist` (fail-closed) | auto_runner precheck | wired | df76610b | denylist 不在で block |
| `tenmon_doctor` 配線 | doctor | 未配線 | -- | 別カード予定 |
| `cursor_via_card` checker | Cursor 受領時 | 未配線 | -- | Phase γ 別カード |
| 旧 4GB VPS automation_os | 旧環境 | 未配線 | -- | 旧環境、触らない方針 |
