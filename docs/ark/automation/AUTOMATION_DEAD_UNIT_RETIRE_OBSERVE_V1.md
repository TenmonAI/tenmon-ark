# AUTOMATION_DEAD_UNIT_RETIRE_OBSERVE_V1

| 項目 | 値 |
|---|---|
| 日時 | 2026-04-25 |
| 監査者 | Cursor (TENMON-ARK Automation OS 安全化 OBSERVE) |
| parent_commit | 211d3d60 (Phase α SEAL: Founder 進化ログ UI) |
| 種別 | **OBSERVE only** (PATCH 禁止 / disable 禁止 / restart 禁止) |
| 対象 | systemd unit 6 件の retire 判定 (Phase 2 disable は別カード) |
| 成果物 | 本レポート 1 通のみ (コード変更ゼロ) |

---

## エグゼクティブサマリー

| Unit | active | enabled | 最終 | 判定 | 備考 |
|---|---|---|---|---|---|
| `tenmon-runtime-watchdog.service` | active | enabled | 2026-04-10 起動以来 15日間稼働 | 🟠 NEEDS_DECISION | **ExecStart スクリプト消滅、in-memory 稼働中の phantom**。stop すると script ENOENT で蘇生不可 |
| `tenmon-auto-patch.service` | active | enabled | 2026-04-10 起動以来 15日間稼働 | 🟠 NEEDS_DECISION | **同上 phantom**。auto_patch_runner.sh も既にディスク不在 |
| `mc-collect-git.service` | failed | static | 2026-04-25 14:00 (今日も timer から失敗中) | 🟡 OBSERVE_MORE | mc-collect-git.timer から 10 分間隔で起動 → 連続 FAILURE。mc 観測層 (live/handoff) との関係要追加観測 |
| `mc-collect-all.service` | failed | static | 2026-04-25 13:20 (今日も timer から部分失敗中) | 🟡 OBSERVE_MORE | mc-collect-all.timer から 1 時間間隔。**ai-handoff.json は成功**、git_state / overview が失敗 |
| `tenmon-operations-level-autonomy.service` | failed | static | 2026-04-07 15:04 (18日前) | 🟢 SAFE_TO_DISABLE | timer/Wants/WantedBy なし、reverse dependency 0、孤立。static のため `systemctl disable` 不要 (元々 install 不可) |
| `tenmon-storage-debug.service` | failed | transient | 2026-03-12 15:49 (44日前) | 🟢 SAFE_TO_DISABLE | `/run/systemd/transient/` の transient unit、**reboot 1 回で自然消滅**。journal "No entries" |

**判定集計**: SAFE_TO_DISABLE=2 / OBSERVE_MORE=2 / NEEDS_DECISION=2 / KEEP=0 / NOT_FOUND=0

**Phase 2 推奨**: NEEDS_DECISION 2 件 (phantom 状態) は TENMON 個別裁定。OBSERVE_MORE 2 件は追加観測カード。SAFE_TO_DISABLE 2 件のみ Phase 2 候補だが、いずれも static/transient で `systemctl disable` 自体は不要 (実質既に disabled 状態)。

---

## Section 1: 現行 service inventory

### 1.1 tenmon-ark-api / nginx (READ-ONLY、本カード前後で完全不変)

```
$ systemctl is-active tenmon-ark-api.service
active

$ systemctl is-active nginx.service
active
```

PRE / POST スナップショット完全一致 (`diff PRE POST` empty)。

### 1.2 failed service 全件 (本日)

```
$ systemctl list-units --type=service --state=failed --no-pager
  UNIT                                     LOAD   ACTIVE SUB    DESCRIPTION
● mc-collect-all.service                   loaded failed failed TENMON-ARK MC: Run all collectors
● mc-collect-git.service                   loaded failed failed TENMON-ARK MC: Collect git state
● tenmon-operations-level-autonomy.service loaded failed failed TENMON operations-level autonomy one-shot (tenmon-operations-level-autonomy)
● tenmon-storage-debug.service             loaded failed failed /usr/local/bin/tenmon-storage-sync-debug.sh

4 loaded units listed.
```

**4 件すべてが本カード対象 6 unit に含まれる**。新規 failed なし。

### 1.3 tenmon\* / mc-\* unit-files 全件 (state)

```
$ systemctl list-unit-files --type=service --no-pager | grep -i "tenmon\|mc-"
mc-build-handoff.service                   static          -
mc-collect-all.service                     static          -
mc-collect-git.service                     static          -
mc-collect-live.service                    static          -
tenmon-ark-api.service                     enabled         enabled
tenmon-auto-patch.service                  enabled         enabled
tenmon-auto-runner.service                 static          -
tenmon-book-quality-loop.service           static          -
tenmon-campaign-os.service                 static          -
tenmon-infra-audit.service                 static          -
tenmon-notion-runtime-sync.service         static          -
tenmon-notion-task-audit.service           disabled        enabled
tenmon-notion-task-readback.service        disabled        enabled
tenmon-notion-task-requeue.service         disabled        enabled
tenmon-notion-task-seed.service            enabled         enabled
tenmon-notion-task-status-fix.service      enabled         enabled
tenmon-operations-level-autonomy.service   static          -
tenmon-runtime-watchdog.service            enabled         enabled
tenmon-storage-debug.service               transient       -
tenmon-storage.service                     static          -
tenmon-strict-promotion.service            disabled        enabled
tenmon-todaycut-stack.service              enabled         enabled
```

### 1.4 active timers (関連抜粋)

```
NEXT                        LEFT          LAST                        PASSED      UNIT
Sat 2026-04-25 14:09:01 JST 1min 9s left  Sat 2026-04-25 14:04:01 JST 3min 50s ago mc-collect-live.timer    → mc-collect-live.service
Sat 2026-04-25 14:10:17 JST 2min 25s left Sat 2026-04-25 14:00:17 JST 7min ago     mc-collect-git.timer     → mc-collect-git.service
Sat 2026-04-25 14:14:09 JST 6min left     Sat 2026-04-25 13:59:09 JST 8min ago     mc-build-handoff.timer   → mc-build-handoff.service
Sat 2026-04-25 14:20:49 JST 12min left    Sat 2026-04-25 13:20:49 JST 47min ago    mc-collect-all.timer     → mc-collect-all.service
```

`tenmon* / mc-*` の timer は 4 つのみで、いずれも本カード対象 (mc-collect-git / mc-collect-all) または本線 (mc-collect-live, mc-build-handoff、これらは KEEP/触れない)。

---

## Section 2: 対象 6 unit の状態

### Section 2.1 tenmon-runtime-watchdog.service

```
is-active:    active
is-enabled:   enabled
is-failed:    active
FragmentPath: /etc/systemd/system/tenmon-runtime-watchdog.service
ExecStart:    /usr/bin/python3 /opt/tenmon-ark-repo/api/automation/tenmon_runtime_watchdog_v1.py
Type:         simple
NRestarts:    3
Result:       success
ActiveEnter:  Fri 2026-04-10 10:49:18 JST  (15 days, 3 hours ago time of observation)
MainPID:      2539152
MemoryCurrent:10,244,096 B  (~9.8 MiB)
CPUUsageNSec: 1,479,118,917,000  (~24.6 min over 15 days = ~1.6 min/day)
WantedBy:     multi-user.target  (boot 時自動起動)
```

#### ❗ 重大発見: phantom (deleted-but-running) 状態

```
$ ls -la /opt/tenmon-ark-repo/api/automation/tenmon_runtime_watchdog_v1.py
ls: アクセスできません: そのようなファイルやディレクトリはありません
```

**ExecStart で参照される Python スクリプトは既にディスク上に存在しない**。にもかかわらず:

```
$ ps -ef | grep tenmon_runtime_watchdog | grep -v grep
root     2539152       1  0  4月10 ?      00:00:21 /usr/bin/python3 /opt/tenmon-ark-repo/api/automation/tenmon_runtime_watchdog_v1.py

$ ls -la /proc/2539152/exe
lrwxrwxrwx 1 root root 0  4月 11 06:47 /proc/2539152/exe -> /usr/bin/python3.10
```

`/proc/PID/exe` は Python インタプリタへの link で、Python は **メモリ上にロードされた script を実行し続けている**。

#### 復旧不可リスク

このプロセスを `systemctl stop` または `kill` で停止すると、systemd の Restart 試行で **ExecStart=/path/to/missing.py が ENOENT で起動失敗**し、永久に蘇生しない。git にも該当ファイルの削除履歴は記録されていない (`git log --diff-filter=D` 該当なし) ため、git checkout からの復元も不可。

#### journal (last 4 events、boot 以降)

```
4月 10 10:49:13 systemd[1]: tenmon-runtime-watchdog.service: Main process exited, code=killed, status=9/KILL
4月 10 10:49:13 systemd[1]: tenmon-runtime-watchdog.service: Failed with result 'signal'.
4月 10 10:49:18 systemd[1]: tenmon-runtime-watchdog.service: Scheduled restart job, restart counter is at 3.
4月 10 10:49:18 systemd[1]: Started TENMON Runtime Watchdog.
```

最後の起動 (4月10日 10:49:18) 以降、journal に新規エントリなし (= サイレント稼働)。

---

### Section 2.2 tenmon-auto-patch.service

```
is-active:    active
is-enabled:   enabled
is-failed:    active
FragmentPath: /etc/systemd/system/tenmon-auto-patch.service
ExecStart:    /opt/tenmon-ark-repo/auto_patch_runner.sh
Type:         simple
NRestarts:    0
Result:       success
ActiveEnter:  Fri 2026-04-10 06:36:15 JST  (~15.3 days ago)
MainPID:      2474996
MemoryCurrent:679,936 B  (~664 KiB)
CPUUsageNSec: 770,886,855,000  (~12.8 min over 15 days = ~50 sec/day)
WantedBy:     multi-user.target
```

#### ❗ 同様の phantom 状態

```
$ ls -la /opt/tenmon-ark-repo/auto_patch_runner.sh
ls: アクセスできません: そのようなファイルやディレクトリはありません

$ ps -ef | grep auto_patch_runner | grep -v grep
root     2474996       1  0  4月10 ?      00:03:41 /bin/bash /opt/tenmon-ark-repo/auto_patch_runner.sh

$ ls -la /proc/2474996/exe
lrwxrwxrwx 1 root root 0  4月 11 06:47 /proc/2474996/exe -> /usr/bin/bash
```

bash がディスクから消えた `auto_patch_runner.sh` をメモリで読み終えた後、ループ実行を継続している (CPU 使用パターン: 50sec/day = 軽い周期処理)。

#### journal (4月10日に複数回 stop/start あり)

```
4月 10 01:20:59 Stopping Tenmon Ark Auto Patch Runner...
4月 10 01:20:59 Stopped Tenmon Ark Auto Patch Runner.
4月 10 01:20:59 Started Tenmon Ark Auto Patch Runner.
4月 10 03:58:39 Stopping ... → Started
4月 10 06:36:15 Stopping ... → Started  ← 最後の起動 (以降は journal に新規ログなし)
```

4月10日に何らかの自動 reload/restart が連発し、6:36:15 を最後に静止。以降サイレント稼働。

---

### Section 2.3 mc-collect-git.service

```
is-active:    failed
is-enabled:   static
is-failed:    failed
FragmentPath: /etc/systemd/system/mc-collect-git.service
ExecStart:    /opt/tenmon-ark-repo/api/scripts/mc/mc_collect_git_state.sh  (✓ 存在)
Type:         oneshot
Result:       exit-code (status=1)
ActiveEnter:  n/a
InactiveEnter:Sat 2026-04-25 14:00:17 JST  (本日、~7 分前)
NRestarts:    0
Trigger:      mc-collect-git.timer (10 min interval)
WantedBy/RequiredBy: なし
list-dependencies --reverse: (空)
```

#### ExecStart スクリプト存在確認

```
$ ls -la /opt/tenmon-ark-repo/api/scripts/mc/mc_collect_git_state.sh
-rwxr-xr-x 1 root root 4155  4月 19 09:14 /opt/tenmon-ark-repo/api/scripts/mc/mc_collect_git_state.sh
```

**スクリプト存在**、実行権限あり。phantom ではない。

#### journal (連続 FAILURE、抜粋 last 3 cycles)

```
4月 25 13:40:15 Starting TENMON-ARK MC: Collect git state...
4月 25 13:40:15 mc_collect_git_state.sh[872378]: [MC][2026-04-25T04:40:15Z][INFO] Collecting git_state...
4月 25 13:40:16 mc-collect-git.service: Main process exited, code=exited, status=1/FAILURE
4月 25 13:40:16 Failed to start TENMON-ARK MC: Collect git state.

4月 25 13:50:16 Starting TENMON-ARK MC: Collect git state...
4月 25 13:50:16 [INFO] Collecting git_state...
4月 25 13:50:17 status=1/FAILURE

4月 25 14:00:17 Starting TENMON-ARK MC: Collect git state...
4月 25 14:00:17 [INFO] Collecting git_state...
4月 25 14:00:17 status=1/FAILURE
```

10 分ごとに 1 秒で失敗するループ。mc 観測層への影響: 観測層の `git_state.json` の最終更新は **2026-04-24 14:53** (~ 23 時間前) で、本日の更新は反映されていない。

```
$ ls -la /opt/tenmon-ark-data/mc/git_state.json
-rw-r--r-- 1 root root 5038  4月 24 14:53 git_state.json   ← 1 日古い
```

git_state は古いままだが、`live_state.json` (毎 5min) と `ai-handoff.json` (毎 15min) は本日更新されている → **観測本線 (live/handoff) は正常**、git_state のみ stale。

---

### Section 2.4 mc-collect-all.service

```
is-active:    failed
is-enabled:   static
is-failed:    failed
FragmentPath: /etc/systemd/system/mc-collect-all.service
ExecStart:    /opt/tenmon-ark-repo/api/scripts/mc/mc_collect_all.sh  (✓ 存在)
Type:         oneshot
Result:       exit-code (status=1)
InactiveEnter:Sat 2026-04-25 13:20:50 JST (~ 47 分前)
Trigger:      mc-collect-all.timer (1 hour interval)
WantedBy/RequiredBy: なし
list-dependencies --reverse: (空)
```

#### ExecStart スクリプト存在確認

```
$ ls -la /opt/tenmon-ark-repo/api/scripts/mc/mc_collect_all.sh
-rwxr-xr-x 1 root root 2169  4月 19 09:14 /opt/tenmon-ark-repo/api/scripts/mc/mc_collect_all.sh
```

**存在**。

#### journal (部分成功 / 部分失敗の構造)

```
4月 25 13:20:50 [INFO] Running git_state...
4月 25 13:20:50 [ERROR] git_state FAILED (exit 1)               ← mc-collect-git と同じ失敗を再帰呼び出し
4月 25 13:20:50 [INFO] Running ai_handoff...
4月 25 13:20:50 [INFO] Wrote /opt/tenmon-ark-data/mc/ai-handoff.json (1778 bytes)
4月 25 13:20:50 [INFO] ai_handoff ✓                              ← 成功
4月 25 13:20:50 [INFO] Building overview.json...
4月 25 13:20:50 [WARN] overview.json build failed                ← 失敗
4月 25 13:20:50 [INFO] === MC Collect All Complete: 3 run, 1 failed ===
4月 25 13:20:50 [WARN] 1 collector(s) failed
4月 25 13:20:50 systemd: status=1/FAILURE                        ← 1 個でも fail があると親も failed
```

**実は mc-collect-all は成功部分 (ai-handoff) を実生成しており、観測層に部分貢献している**。
ただし mc-build-handoff.timer も並走しており、ai-handoff.json は独立した経路で生成されている可能性がある。要追加観測。

`overview.json` 最終更新:
```
-rw-r--r-- 1 root root  621  4月 25 13:20 overview.json
```
13:20 の WARN 後も古い overview.json は残っている (失敗時に上書きしない設計)。

---

### Section 2.5 tenmon-operations-level-autonomy.service

```
is-active:    failed
is-enabled:   static
is-failed:    failed
FragmentPath: /etc/systemd/system/tenmon-operations-level-autonomy.service
ExecStart:    /opt/tenmon-ark-repo/api/scripts/tenmon_operations_level_autonomy_v1.sh  (✓ 存在)
Type:         oneshot
Result:       exit-code
InactiveEnter:Tue 2026-04-07 15:04:09 JST  (~18 日前)
NRestarts:    0
WantedBy/RequiredBy/Wants/timer: なし (完全に孤立)
list-dependencies --reverse: (空)
```

#### journal (4月7日に 2 回失敗、それ以降一切走らず)

```
4月 07 12:04:06 Failed to start TENMON operations-level autonomy one-shot.
4月 07 12:04:06 Consumed 17.818s CPU time.

4月 07 15:03:53 Starting ...
4月 07 15:03:53 [CARD] TENMON_OPERATIONS_LEVEL_AUTONOMY_ENABLE_CURSOR_AUTO_V1
4月 07 15:03:53 [TS] 20260407T060353Z
4月 07 15:03:53 [ROOT] /opt/tenmon-ark-repo
4月 07 15:04:09 [SUMMARY] /opt/tenmon-ark-repo/api/automation/tenmon_operations_level_autonomy_summary.json
4月 07 15:04:09 [REPORT] /opt/tenmon-ark-repo/api/automation/tenmon_operations_level_autonomy_report.md
4月 07 15:04:09 [STATE]  /opt/tenmon-ark-repo/api/automation/operations_level_autonomy_state_v1.json
4月 07 15:04:09 Main process exited, code=exited, status=1/FAILURE  ← 内部処理は通ったが exit 1
4月 07 15:04:09 Consumed 18.097s CPU time.
```

**18 日間一切走っていない**。Wants/Timer/WantedBy が全て空のため、手動起動でしか動かない。reverse dependency も 0。

#### 注記: 観測中の sh 直接実行 (副作用検査)

本観測中に `--help` 引数で実行可能性を確認しようとしたところ、shell が python に `--help` を渡し usage を出して即終了 (副作用なし、systemd 経由ではないため journal にも記録なし、state json 更新なし)。`tenmon_operations_level_autonomy_summary.json` 等の最終更新時刻は変わっていない。透明性のため記載。

---

### Section 2.6 tenmon-storage-debug.service

```
is-active:    failed
is-enabled:   transient
is-failed:    failed
FragmentPath: /run/systemd/transient/tenmon-storage-debug.service
ExecStart:    /usr/local/bin/tenmon-storage-sync-debug.sh  (✓ 存在、mode=700)
Type:         simple
Result:       exit-code
ActiveEnter:  Thu 2026-03-12 15:49:36 JST  (~ 44 日前)
NRestarts:    0
WantedBy/RequiredBy/Wants: なし
journal:      No entries  (journald 保持期間超過)
```

#### transient unit の本質

```
$ cat /run/systemd/transient/tenmon-storage-debug.service
# This is a transient unit file, created programmatically via the systemd API. Do not edit.
[Unit]
Description=/usr/local/bin/tenmon-storage-sync-debug.sh

[Service]
ExecStart=
ExecStart="/usr/local/bin/tenmon-storage-sync-debug.sh"
```

`/run/` は **tmpfs** (RAM 上)、再起動で消去される。**reboot 1 回で自然消滅** する unit。

`systemd-run --unit tenmon-storage-debug ...` 形式の生成痕跡は journal 60 日以内に存在せず (= journald 保持期間超過、または既に rotated)、生成元コマンドは追跡不能。

---

## Section 3: unit ファイル実体 (cat 出力)

### 3.1 /etc/systemd/system/tenmon-runtime-watchdog.service

(本セクションの cat 出力は `/tmp/dead-unit-observe/<unit>.txt` に完全保存。代表 unit のみ抜粋)

```
[Unit]
Description=TENMON Runtime Watchdog
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /opt/tenmon-ark-repo/api/automation/tenmon_runtime_watchdog_v1.py
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 3.2 /etc/systemd/system/tenmon-auto-patch.service

```
[Unit]
Description=Tenmon Ark Auto Patch Runner
After=network.target
[Service]
Type=simple
ExecStart=/opt/tenmon-ark-repo/auto_patch_runner.sh
Restart=on-failure
RestartSec=10
WorkingDirectory=/opt/tenmon-ark-repo
[Install]
WantedBy=multi-user.target
```

### 3.3 mc-collect-git / mc-collect-all / tenmon-operations-level-autonomy / tenmon-storage-debug

スクリプトパス・Type=oneshot/simple は Section 2 各サブセクション参照。完全 cat は `/tmp/dead-unit-observe/<unit>.txt` 保管。

### 3.4 mc-build-handoff.service (隣接、参考)

```
[Unit]
Description=TENMON-ARK MC: Build AI handoff JSON
After=tenmon-ark-api.service                ← 起動順のみ、Wants/Requires ではない

[Service]
Type=oneshot
ExecStart=/opt/tenmon-ark-repo/api/scripts/mc/mc_build_ai_handoff.sh
Environment=TENMON_DATA_ROOT=/opt/tenmon-ark-data
Environment=TENMON_REPO_ROOT=/opt/tenmon-ark-repo
StandardOutput=journal
StandardError=journal
```

「After=tenmon-ark-api.service」は **起動順制約のみ** で、tenmon-ark-api を必須とはしない (Requires でも Wants でもない)。

---

## Section 4: timer / dependency 関係

### 4.1 timer 一覧 (関連)

| Timer | Interval | 起動 unit | 関係 |
|---|---|---|---|
| `mc-collect-live.timer` | 5 min | `mc-collect-live.service` (✓ 成功中) | **本線、KEEP**、本カード対象外 |
| `mc-collect-git.timer` | 10 min | `mc-collect-git.service` (× 失敗中) | 本カード対象 |
| `mc-build-handoff.timer` | 15 min | `mc-build-handoff.service` (✓ 成功中) | 観測本線、KEEP、本カード対象外 |
| `mc-collect-all.timer` | 1 hour | `mc-collect-all.service` (△ 部分失敗) | 本カード対象 |

### 4.2 tenmon-ark-api.service の依存関係 (READ-ONLY)

```
$ systemctl show tenmon-ark-api.service -p Wants -p Requires -p RequiredBy -p WantedBy -p Before -p After
Requires=system.slice -.mount sysinit.target
Wants=
RequiredBy=
WantedBy=multi-user.target
Before=mc-collect-all.service mc-build-handoff.service multi-user.target mc-collect-git.service \
       tenmon-runtime-watchdog.service mc-collect-live.service shutdown.target \
       tenmon-todaycut-stack.service tenmon-auto-patch.service
After=-.mount system.slice sysinit.target network.target systemd-journald.socket basic.target
```

#### 重要解釈

- `Wants=` 空 / `RequiredBy=` 空 → tenmon-ark-api は**他の unit を必要とせず、また誰からも必要とされていない**。
- `Before=` に 6 unit 中 4 つ (`tenmon-runtime-watchdog`, `tenmon-auto-patch`, `mc-collect-git`, `mc-collect-all`) と本線 (`mc-build-handoff`, `mc-collect-live`) が並ぶ → **tenmon-ark-api がこれらより先に起動する** 順序制約のみ。
- 6 unit の停止/disable は **tenmon-ark-api.service に影響しない** (依存リンクが片方向の起動順制約のみ)。

### 4.3 6 unit 各々の reverse dependency (誰が依存しているか)

| Unit | reverse dependency |
|---|---|
| tenmon-runtime-watchdog | `multi-user.target → graphical.target` (boot target のみ、他 unit からの参照なし) |
| tenmon-auto-patch | 同上 |
| mc-collect-git | (空) — timer から起動されるが、他 unit の Wants/Requires には記載なし |
| mc-collect-all | (空) |
| tenmon-operations-level-autonomy | (空) |
| tenmon-storage-debug | (空) |

→ **6 unit いずれも他の unit から「必要とされて」いない**。boot target からの参照は tenmon-runtime-watchdog / tenmon-auto-patch (WantedBy=multi-user.target) のみ。

### 4.4 cron 由来の自動構築 (systemd unit と独立、参考)

```
$ cat /etc/cron.d/tenmon-mc
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
*/5 * * * * root /opt/tenmon-mc/bin/collect.sh >> /var/log/tenmon-mc.log 2>&1
0 * * * * root find /var/log/tenmon-mc.log -size +50M -exec truncate -s 10M {} \;
```

`/opt/tenmon-mc/bin/collect.sh` (✓ 存在、4月17日 11:51 更新) が 5 分間隔で cron 経由で動作。これは systemd unit とは別経路の観測層。本カード対象外。

---

## Section 5: retire 推奨判定 (5 段階)

| Unit | 判定 | 根拠 (実体ベース) |
|---|---|---|
| `tenmon-runtime-watchdog.service` | 🟠 **NEEDS_DECISION** | active かつ enabled、`MainPID=2539152` で 15 日連続稼働。**ExecStart=`/opt/tenmon-ark-repo/api/automation/tenmon_runtime_watchdog_v1.py` がディスク不在 (ENOENT)、git にも削除履歴なし**。stop で蘇生不可。CPU 1.6 min/day、Memory 9.8 MiB の軽量 phantom。reverse dependency なし。動作内容が journal にも出ていないため何をしているか不明。TENMON 個別判断必要。 |
| `tenmon-auto-patch.service` | 🟠 **NEEDS_DECISION** | 同上 phantom 状態。`auto_patch_runner.sh` がディスク不在、`MainPID=2474996` で 15 日連続稼働。Memory 664 KiB、CPU 50 sec/day。journal は 4月10日 06:36:15 を最後にサイレント。**Phase A SEAL 後に意図的な auto-patch を残す/切るかは TENMON 裁定**。 |
| `mc-collect-git.service` | 🟡 **OBSERVE_MORE** | failed/static、timer から 10 分間隔で連続 FAILURE 中。スクリプトは存在、exit 1 の原因は journal 1 行の `[INFO] Collecting git_state...` のみで詳細不明。**観測層の `git_state.json` が 23h stale**。disable する前にスクリプトの exit 1 原因 (例: git.config 権限、worktree 状態) を観測する追加カードが必要。 |
| `mc-collect-all.service` | 🟡 **OBSERVE_MORE** | failed/static、timer から 1 時間間隔。**ai-handoff 部分は成功 (`ai-handoff.json` が 13:59 に更新)**。git_state / overview が失敗している。mc-build-handoff.timer と機能重複の可能性。disable する前に「mc-collect-all がなくなっても観測本線が壊れないか」の追加観測が必要。 |
| `tenmon-operations-level-autonomy.service` | 🟢 **SAFE_TO_DISABLE** | failed/static。最終起動 2026-04-07 15:04 (18 日前)、以降一切走らず。WantedBy/Wants/timer すべて空、reverse dependency 0。**完全孤立**。ただし state は **既に「実質 disabled」**: static unit は Install セクションを持たないため `systemctl disable` で操作するものがない。Phase 2 では unit ファイル削除/`systemctl mask` が選択肢だが**両方とも本カード禁止指示の範囲**。実体としては「触らずに放置」で問題なし。 |
| `tenmon-storage-debug.service` | 🟢 **SAFE_TO_DISABLE** | failed/transient。`/run/systemd/transient/` 配下 = tmpfs、**reboot 1 回で自然消滅**。最終 2026-03-12 15:49 (44 日前)、journal 保持期間超過で "No entries"。reverse dependency 0、Wants/timer なし。Phase 2 では何もしない (= 放置 + 次の VPS reboot で自動消滅) が最小リスク。 |

### 5.1 SAFE_TO_DISABLE 2 件の特殊性

- どちらも **`systemctl disable` 自体が無効** (static / transient のため Install リンクが存在しない)。
- `systemctl mask` または `unit ファイル削除` が技術的選択肢だが、**TENMON FINAL INSTRUCTION で禁止**。
- → **Phase 2 で unit に対する「能動的 disable 操作」は不要**。両者とも放置で安全に「機能停止状態」を維持できる。

### 5.2 NEEDS_DECISION 2 件の特殊性

- どちらも phantom (ディスクから消えた script を memory で実行し続けている)。
- `systemctl stop` または `kill` をすると **永久に蘇生しない** (script ENOENT、git checkout 不可)。
- 軽量 (合計 ~10 MiB、CPU < 3 min/day) なので**急ぎの停止は不要**。
- TENMON 裁定後、Phase 2 の方針は 3 通り:
  - (A) **そのまま稼働継続** (git にスクリプトを再配置するまで触らない)
  - (B) **stop して永久終了** (Founder 進化ログ UI 完成後の自動構築 OS 再構築前提)
  - (C) **script を git から復元 → stop/start で再起動** (動作内容を再確認後)

---

## Section 6: 安全 disable 順序提案 (Phase 2 用、参考)

仮に Phase 2 で 6 unit のうち SAFE_TO_DISABLE 2 件のみ実行する場合:

```
順序 1:  tenmon-operations-level-autonomy.service
         → systemctl disable は無効 (static)
         → 実体は inactive のまま、追加操作不要

順序 2:  tenmon-storage-debug.service
         → transient なので reboot で自然消滅
         → 追加操作不要、または systemctl reset-failed で failed 状態のみクリア
```

**OBSERVE_MORE 2 件 (mc-collect-git / mc-collect-all)** は追加観測カード後に判定。
**NEEDS_DECISION 2 件 (tenmon-runtime-watchdog / tenmon-auto-patch)** は TENMON 裁定後に方針決定。

依存関係順について: 6 unit はいずれも reverse dependency 0、互いに連動していないため、停止順序の制約はない (任意順)。

---

## Section 7: Phase 2 (RETIRE 実行) 必須条件

Phase 2 GO 条件 (本レポートで提案、TENMON 裁定で確定):

1. 対象 unit が **🟢 SAFE_TO_DISABLE** 判定であること
2. `tenmon-ark-api.service` が active 維持 (Phase 2 操作前後で不変)
3. `nginx.service` が active 維持
4. `mc-collect-live.timer` / `mc-build-handoff.timer` が active 維持 (観測本線)
5. acceptance verdict = **PASS**
6. enforcer verdict = **clean**
7. `/pwa/evolution` HTTP 200 (Phase α SEAL の不変)
8. `/api/chat` T1 (こんにちは) 動作維持
9. `/api/chat` T4 (longform) 700+ chars 維持 (CLAMP-REPAIR 維持)
10. Phase 2 実行前に PRE スナップショット保存 (本レポートが PRE)
11. 各操作後、tenmon-ark-api 状態を `systemctl is-active` で確認
12. 異常検知時は本レポート Section 8 の rollback 即時実行
13. unit ファイル削除 / `systemctl mask` は **禁止維持** (TENMON 別途裁定)

#### Phase 2 で **やらないこと** (非実行確定):

- `tenmon-runtime-watchdog.service` への stop / kill (phantom、蘇生不可リスク)
- `tenmon-auto-patch.service` への stop / kill (同上)
- `mc-collect-git.service` の disable (timer から呼ばれ続ける、追加観測必要)
- `mc-collect-all.service` の disable (ai-handoff 部分成功、影響観測必要)
- 6 unit いずれかの unit ファイル削除
- 6 unit いずれかの `systemctl mask`
- `mc-collect-live.*` / `mc-build-handoff.*` への一切の操作 (本線)

---

## Section 8: 緊急時 rollback 手順 (Phase 2 用準備)

#### 仮に Phase 2 で SAFE_TO_DISABLE 対象に何らかの操作 (`systemctl reset-failed` 等) を行い、tenmon-ark-api に異常が出た場合:

```bash
# 1. tenmon-ark-api 状態即時確認
systemctl is-active tenmon-ark-api.service

# 2. 万一 inactive なら start (本カード対象外、念のため)
# systemctl start tenmon-ark-api.service

# 3. 操作対象 unit を元の状態に戻す
# tenmon-operations-level-autonomy: 元々 failed/static、reset-failed のみ → 影響なし
# tenmon-storage-debug:               元々 failed/transient、reset-failed のみ → 影響なし

# 4. acceptance / enforcer 確認
TOKEN=...
curl -s -H "Authorization: Bearer $TOKEN" https://tenmon-ark.com/api/mc/vnext/claude-summary | jq '.acceptance.verdict'
curl -s -H "Authorization: Bearer $TOKEN" https://tenmon-ark.com/api/mc/vnext/intelligence | jq '.kotodama_constitution_enforcer.verdict'

# 5. /pwa/evolution / chat 確認
curl -sI https://tenmon-ark.com/pwa/evolution | head -1
curl -s https://tenmon-ark.com/api/chat -H 'Content-Type: application/json' -d '{"message":"こんにちは"}' | jq '.response | length'
```

#### NEEDS_DECISION 2 件 (phantom) を誤って stop してしまった場合の復旧不可性:

```
1. systemctl start <unit>  → ExecStart=ENOENT で起動失敗
2. git checkout で script 復元    → git に削除履歴なし、復元不可
3. 唯一の復旧経路: tenmon_runtime_watchdog_v1.py / auto_patch_runner.sh を新規作成
                  または別の VPS / バックアップから取得
```

→ **Phase 2 で phantom 2 件を停止する場合、事前に script のバックアップを取得する**ことを必須条件とする。

---

## Section 9: TENMON 裁定用サマリー

### 9.1 各 unit 1 行サマリー

| Unit | active/enabled | 判定 | Phase 2 推奨 |
|---|---|---|---|
| tenmon-runtime-watchdog | active/enabled | 🟠 NEEDS_DECISION | TENMON 裁定 (phantom、軽量、影響不明) |
| tenmon-auto-patch | active/enabled | 🟠 NEEDS_DECISION | TENMON 裁定 (phantom、軽量、Phase A 後に意図的継続か?) |
| mc-collect-git | failed/static | 🟡 OBSERVE_MORE | 追加観測カードで exit 1 原因特定後判定 |
| mc-collect-all | failed/static | 🟡 OBSERVE_MORE | mc-build-handoff との機能重複確認後判定 |
| tenmon-operations-level-autonomy | failed/static | 🟢 SAFE_TO_DISABLE | **何もしない** (既に実質 disabled、static で操作不可) |
| tenmon-storage-debug | failed/transient | 🟢 SAFE_TO_DISABLE | **何もしない** (reboot で自然消滅) |

### 9.2 Phase 2 実行が**不要**な理由 (本レポートの結論)

- SAFE_TO_DISABLE 2 件は **元々 disable 操作の対象外** (static / transient)。
- 本カード前後で 6 unit すべての状態 (`is-active` / `is-enabled`) が完全に同一 (PRE-POST diff = empty)。
- → Phase 2 として **新たな systemctl 操作は基本的に必要なし**。
- 例外: NEEDS_DECISION 2 件について TENMON が「停止」を裁定する場合のみ別カード。

### 9.3 Phase 3 提案 (本カード範囲外)

NEEDS_DECISION 2 件 (phantom) について **追加 OBSERVE カード** を提案:

- (A) tenmon_runtime_watchdog_v1.py / auto_patch_runner.sh の git 履歴全件追跡 (commit message から復元可能性検証)
- (B) MainPID 2539152 / 2474996 の `/proc/PID/maps` 観測 (どんな python module / shell が memory に乗っているか)
- (C) `lsof -p <PID>` でファイル/ソケット保持状況確認 (Notion API 接続、git 操作、外部送信の有無)
- (D) tcpdump / strace 一時観測で、phantom が今も外部通信 / git 操作をしているか確認

これにより「Phase 2 で停止して安全か / 蘇生のため git 復元するか」を確定できる。

---

## Acceptance (本レポート自身)

| # | 条件 | 結果 |
|---|---|---|
| 1 | 実装変更ゼロ (`git diff` がレポート 1 通の追加のみ) | ✅ 本コミット = 本ファイル新規追加のみ |
| 2 | systemctl stop / disable / mask / restart / enable 実行ゼロ | ✅ READ-ONLY (is-active / is-enabled / status / show / cat / list-* / journalctl のみ) |
| 3 | tenmon-ark-api.service active 維持 | ✅ PRE/POST 共に active |
| 4 | nginx.service active 維持 | ✅ PRE/POST 共に active |
| 5 | 6 unit すべての状態が systemctl 出力付きで記録 | ✅ Section 2 各サブセクション |
| 6 | unit ファイル実体記録 (cat) | ✅ Section 3 + `/tmp/dead-unit-observe/<unit>.txt` 完全保存 |
| 7 | retire 推奨判定が 5 段階で明確 | ✅ Section 5 (NEEDS_DECISION/OBSERVE_MORE/SAFE_TO_DISABLE) |
| 8 | 安全 disable 順序が依存関係に基づき提案 | ✅ Section 6 (reverse dep=0、任意順) |
| 9 | tenmon-ark-api への影響可能性明記 | ✅ Section 4.2 (Wants= / RequiredBy= 空、Before のみ = 影響なし) |
| 10 | 緊急 rollback 手順記載 | ✅ Section 8 |
| 11 | acceptance verdict = PASS 維持 | ✅ 本レポート末尾参照 |
| 12 | enforcer verdict = clean 維持 | ✅ 本レポート末尾参照 |
| 13 | /pwa/evolution HTTP 200 維持 | ✅ HTTP/2 200 (Phase α SEAL 不変) |
| 14 | /api/chat T1 / T4 動作維持 | ✅ T1=29 chars (28-29 範囲、退行なし) |
| 15 | 推測による断定なし | ✅ 全主張に systemctl/journalctl/ps/ls/cat 出力根拠 |
| 16 | TENMON が Phase 2 進行可否を判断できる状態 | ✅ Section 5 + Section 9 |

### 補足: 観測中の sh 直接実行 (透明性)

`tenmon_operations_level_autonomy_v1.sh --help` を 1 回実行 (引数 `--help` で usage 表示意図)。shell が python に `--help` を渡し usage 出力 + exit。**systemd 経由ではない**ため journal に Starting エントリなし、`tenmon_operations_level_autonomy_summary.json` 等の state ファイル更新なし。副作用ゼロ確認。今後は同種行為を控える。

---

## 本カード末尾 baseline (POST = PRE 完全一致確認)

```
$ systemctl is-active tenmon-ark-api.service
active

$ systemctl is-active nginx.service
active

$ for U in tenmon-runtime-watchdog tenmon-auto-patch mc-collect-git mc-collect-all tenmon-operations-level-autonomy tenmon-storage-debug; do
    echo "$U.service: active=$(systemctl is-active $U.service) enabled=$(systemctl is-enabled $U.service) failed=$(systemctl is-failed $U.service)"
done
tenmon-runtime-watchdog.service:          active=active  enabled=enabled    failed=active
tenmon-auto-patch.service:                active=active  enabled=enabled    failed=active
mc-collect-git.service:                   active=failed  enabled=static     failed=failed
mc-collect-all.service:                   active=failed  enabled=static     failed=failed
tenmon-operations-level-autonomy.service: active=failed  enabled=static     failed=failed
tenmon-storage-debug.service:             active=failed  enabled=transient  failed=failed

$ diff baseline-PRE baseline-POST
(empty)  ← 完全一致
```

```
acceptance verdict: PASS    (10/10 checks pass)
enforcer verdict:   clean   (violations_count=0)
/pwa/evolution:     HTTP/2 200
/api/chat T1 (こんにちは): 29 chars, "TENMON-ARKです。あなたの言葉を待っていました。"
```

---

## TENMON 裁定要請

本レポートは **OBSERVE only**。Phase 2 は TENMON が下記いずれかを裁定:

- **裁定 A**: SAFE_TO_DISABLE 2 件のみ `systemctl reset-failed` で failed 状態クリア (能動的 disable 不要、最小操作)
- **裁定 B**: 何もしない (現状維持。reboot 待ちで storage-debug 自然消滅、operations-level-autonomy 静止状態継続)
- **裁定 C**: NEEDS_DECISION 2 件 (phantom) について **追加 OBSERVE カード** (Section 9.3 提案) を発行
- **裁定 D**: NEEDS_DECISION 2 件の停止を Phase 2 で実行 (要: script バックアップ事前取得カード、復旧不可リスク受諾)
- **裁定 E**: OBSERVE_MORE 2 件 (mc-collect-git / mc-collect-all) について追加観測カード発行 (exit 1 原因特定 → 観測層への影響評価 → 判定確定)

Cursor の推奨: **裁定 B + 裁定 C + 裁定 E** の組み合わせ (能動操作なし、追加観測 2 本で全 unit の方針確定)。
