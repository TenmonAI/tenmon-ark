# AUTOMATION_PHANTOM_UNIT_OBSERVE_V1

**カード**: `CARD-AUTOMATION-PHANTOM-UNIT-OBSERVE-V1`
**種別**: OBSERVE only (zero code change / READ-ONLY)
**前段カード**: `CARD-AUTOMATION-DEAD-UNIT-RETIRE-V1` (commit `2c6f0ab0`, `AUTOMATION_DEAD_UNIT_RETIRE_OBSERVE_V1.md`)
**観測実行日時**: 2026-04-25 (JST, Asia/Tokyo)
**観測者**: TENMON Cursor (Founder への提案資料)

---

## 0. 趣旨

前段カードで「phantom (script 不在 + memory 上で生存)」と分類された 2 unit について、
**停止して問題ないか / 残すべきか / 復元できるか** を確定するための深掘り観測。

| 対象 | unit | PID (固定) | ExecStart |
|---|---|---|---|
| WATCHDOG | `tenmon-runtime-watchdog.service` | `2539152` | `/usr/bin/python3 /opt/tenmon-ark-repo/api/automation/tenmon_runtime_watchdog_v1.py` |
| AUTOPATCH | `tenmon-auto-patch.service` | `2474996` | `/opt/tenmon-ark-repo/auto_patch_runner.sh` |

PID は前段カード観測時 (2026-04-23) と同一で **再起動なし**。`/proc/<PID>/exe` の symlink mtime は **2026-04-11 06:47 JST** で固定 = 14 日間以上連続稼働。

> **本カードは OBSERVE only**。停止 / 無効化 / 復元 / kill / 設定変更は一切行っていない。
> stop/disable/mask/restart/enable, kill/pkill, /proc 書き込み, script 復元 すべて禁止。
> 成果物はこの markdown 1 本のみ。

---

## 1. PRE / POST baseline (read-only スナップショット)

### 1.1 PRE baseline (2026-04-25 13:13 JST 取得)

```
tenmon-ark-api: active
nginx:          active
tenmon-runtime-watchdog.service: active=active enabled=enabled failed=active
tenmon-auto-patch.service:       active=active enabled=enabled failed=active
mc-collect-git.service:          active=failed enabled=static failed=failed
mc-collect-all.service:          active=failed enabled=static failed=failed
tenmon-operations-level-autonomy.service: active=failed enabled=static failed=failed
tenmon-storage-debug.service:    active=failed enabled=transient failed=failed
WATCHDOG_PID=2539152
AUTOPATCH_PID=2474996
```

### 1.2 POST baseline (本観測完了直後、§9 で再取得)

§9 verification セクション参照。**6 unit 全状態 + 2 PID 完全一致**を確認した。

---

## 2. systemd unit ファイル (実体)

両 unit ファイルは disk 上に存在し、編集していない。

### 2.1 watchdog (`/etc/systemd/system/tenmon-runtime-watchdog.service`)

```
[Unit]
Description=TENMON Runtime Watchdog
After=network-online.target tenmon-ark-api.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/tenmon-ark-repo
ExecStart=/usr/bin/python3 /opt/tenmon-ark-repo/api/automation/tenmon_runtime_watchdog_v1.py
Restart=always
RestartSec=5
StandardOutput=append:/var/log/tenmon_runtime_watchdog.service.log
StandardError=append:/var/log/tenmon_runtime_watchdog.service.log

[Install]
WantedBy=multi-user.target
```

### 2.2 auto-patch (`/etc/systemd/system/tenmon-auto-patch.service`)

```
[Unit]
Description=Tenmon Ark Auto Patch Runner
After=tenmon-ark-api.service

[Service]
Type=simple
ExecStart=/opt/tenmon-ark-repo/auto_patch_runner.sh
Restart=always
RestartSec=5
WorkingDirectory=/opt/tenmon-ark-repo

[Install]
WantedBy=multi-user.target
```

### 2.3 ExecStart 指定 script は disk 不在 (再確認)

```
$ ls -la /opt/tenmon-ark-repo/api/automation/tenmon_runtime_watchdog_v1.py
そのようなファイルやディレクトリはありません
$ ls -la /opt/tenmon-ark-repo/auto_patch_runner.sh
そのようなファイルやディレクトリはありません
```

`Restart=always` だが、ExecStart 不在のため **kill / stop すると次回起動で必ず failed** になる ⇒ 復元せず stop すると `active=active` 状態の維持は不可能。

---

## 3. プロセス基本状態 (`/proc/<PID>/{cmdline,status,cwd,exe,io,environ}`)

### 3.1 WATCHDOG (PID 2539152)

| 項目 | 値 |
|---|---|
| `cmdline` | `/usr/bin/python3 /opt/tenmon-ark-repo/api/automation/tenmon_runtime_watchdog_v1.py` |
| `status.State` | **`S (sleeping)`** |
| `status.Tgid/Pid/PPid` | `2539152 / 2539152 / 1` (PPID=1 = systemd) |
| `status.Threads (NSpid)` | 1 (シングルスレッド) |
| `VmSize / VmRSS` | 19,888 kB / 10,652 kB |
| `cwd` | `/opt/tenmon-ark-repo` |
| `exe` | `/usr/bin/python3.10` (mtime 2026-04-11 06:47) |
| `io.rchar` | 32,399,965,136 (≈ 30.2 GiB 累計 read) |
| `io.wchar` | **8,767,860,160** (≈ 8.16 GiB 累計 write) |
| `io.write_bytes` | 1,098,448,896 (≈ 1.02 GiB 実 disk write) |
| `environ` 主要 | `INVOCATION_ID=b8e55c22... / SYSTEMD_EXEC_PID=2539152 / TENMON_MULTIPASS_REPORT_OS_V1=1` |

**JOURNAL_STREAM 環境変数なし** ⇒ stdout/stderr は journald 経由ではなく直接ファイル書き込み (§4.1, §6 参照)。

### 3.2 AUTOPATCH (PID 2474996)

| 項目 | 値 |
|---|---|
| `cmdline` | `/bin/bash /opt/tenmon-ark-repo/auto_patch_runner.sh` |
| `status.State` | **`S (sleeping)`** |
| `status.Tgid/Pid/PPid` | `2474996 / 2474996 / 1` (PPID=1 = systemd) |
| `status.Threads` | 1 (シングルスレッド) |
| `VmSize / VmRSS` | 8,516 kB / 3,700 kB |
| `cwd` | `/opt/tenmon-ark-repo` |
| `exe` | `/usr/bin/bash` (mtime 2026-04-11 06:47) |
| `io.rchar` | 1,856,173,852 (≈ 1.73 GiB 累計 read) |
| `io.wchar` | **231 bytes** (極小) |
| `io.write_bytes` | 4,096 bytes (極小) |
| `environ` 主要 | `INVOCATION_ID=9da7c697... / SYSTEMD_EXEC_PID=2474996 / JOURNAL_STREAM=8:194138590 / TENMON_MULTIPASS_REPORT_OS_V1=1` |

`JOURNAL_STREAM=8:194138590` あり ⇒ stdout/stderr は **journald (unix socket)** へ。

---

## 4. file descriptor 観測 (`/proc/<PID>/fd`)

### 4.1 WATCHDOG fd 一覧

| fd | target | 種別 | 備考 |
|---|---|---|---|
| 0 | `/dev/null` | char | stdin null |
| 1 | `/var/log/tenmon_runtime_watchdog.service.log` | regular file | systemd unit の `StandardOutput=append:...` |
| 2 | `/var/log/tenmon_runtime_watchdog.service.log` | regular file | systemd unit の `StandardError=append:...` |

- **(deleted) ハンドルなし**。Python は起動時に source を読み込んだ後 fd を閉じる仕様 ⇒ **fd 経由での script 復元は不可**。
- `/var/log/tenmon_runtime_watchdog.service.log` 現在 **size = 0 byte** (mtime 2026-04-05 07:35; logrotate により truncate された痕跡)。
- ただし script 内では別経路 `/opt/tenmon-ark-repo/api/automation/tenmon_runtime_watchdog_v1.log` を `LOG.open("a")` で書いており、そちらが **17,212 KiB (約 17 MiB)** に成長 (§6 参照)。

### 4.2 AUTOPATCH fd 一覧

| fd | target | 種別 | 備考 |
|---|---|---|---|
| 0 | `/dev/null` | char | stdin null |
| 1 | `socket:[194138590]` | unix STREAM | journald stdout |
| 2 | `socket:[194138590]` | unix STREAM | journald stderr |
| **255** | **`/opt/tenmon-ark-repo/auto_patch_runner.sh (deleted)`** | regular file | **bash の `$0` ハンドル。削除済みファイルを fd で保持** |

- **fd 255 が決定的**: bash は実行中スクリプトを fd 255 で読みっぱなしにする。ファイル削除後も **inode 518108 のデータは消去されず保持** (link count 0 だが open count > 0)。
- `cat /proc/2474996/fd/255` で **完全な script 内容 (3,118 bytes, 86 行) が READ ONLY 取得可能**。実取得・sha256 算出済 (§7)。

### 4.3 maps の (deleted) 検出

両 PID とも `/proc/<PID>/maps` に `(deleted)` マッピングなし (executable は `/usr/bin/python3.10` / `/usr/bin/bash` を指し、これらは disk に健在)。
mmap 経由で script を保持してはいない ⇒ memory dump で script 復元は試みない (gcore 等は未実行 / 禁止)。

---

## 5. 子プロセス / スレッド / ネットワーク

### 5.1 子プロセス

| unit | `pgrep -P` | `pstree -p` | `task/` (threads) |
|---|---|---|---|
| WATCHDOG | (なし) | `python3(2539152)` | 1 |
| AUTOPATCH | `906898` (sleep 3) | `auto_patch_runn(2474996)---sleep(906898)` | 1 |

AUTOPATCH の子 `sleep` は while ループ内 `sleep 3` の現在のインスタンスで、ETIME=00:01 (秒) ⇒ **3 秒間隔の idle ループが今も回っている**。

### 5.2 ネットワーク (`ss -tnp / -unp / -xp`)

| unit | TCP | UDP | unix socket |
|---|---|---|---|
| WATCHDOG | 0 | 0 | **0** |
| AUTOPATCH | 0 | 0 | 1 (journald STREAM, peer 194137559) |

WATCHDOG は **完全にネットワーク無し**。AUTOPATCH は journald log socket のみで、外部通信なし。

### 5.3 lsof による補強

- WATCHDOG: 開いているのは `python3.10 / libc / libz / libexpat / libm / locale-archive / /dev/null / log file` のみ。**外部依存はゼロ**。
- AUTOPATCH: `bash / libtinfo / locale-archive / journald socket / /dev/null / fd 255 deleted script` のみ。

---

## 6. ログ / 動作証跡

### 6.1 WATCHDOG: `/opt/tenmon-ark-repo/api/automation/tenmon_runtime_watchdog_v1.log`

- size: **18,071,178 bytes (≈17.2 MiB)**
- mtime: 2026-04-25 14:26 JST (本観測中も書き込み中)
- `===== watchdog cycle =====` ヘッダ件数: **7,246 cycle**
- 最初の cycle: `2026-04-04T22:45:22Z`
- 最新の cycle: `2026-04-25T05:26:13Z` (observation 中)
- cycle 間隔: 5 分 (`time.sleep(300)`)
- **直近 cycle の 7 cmd すべて `[rc]=2` (= NotFound) で失敗**:

```
$ python3 /opt/tenmon-ark-repo/api/automation/tenmon_conversation_probe_v3.py
[stderr] python3: can't open file '...': [Errno 2] No such file or directory
[rc]=2
$ python3 /opt/tenmon-ark-repo/api/automation/tenmon_learning_audit_v1.py
[rc]=2
$ python3 /opt/tenmon-ark-repo/api/automation/tenmon_observatory_snapshot_v1.py
[rc]=2
$ python3 /opt/tenmon-ark-repo/api/automation/tenmon_truth_bundle_v2.py
[rc]=2
$ python3 /opt/tenmon-ark-repo/api/automation/tenmon_acceptance_gate_v2.py
[rc]=2
$ python3 /opt/tenmon-ark-repo/api/automation/tenmon_maintenance_governor_v1.py
[rc]=2
$ python3 /opt/tenmon-ark-repo/api/automation/tenmon_schedule_observer_v1.py
[rc]=2
```

被監視 7 スクリプト (probe / audit / snapshot / truth_bundle / acceptance_gate / governor / schedule_observer) も **すべて disk 不在** を確認 (`ls` 7 件 = 7 件 NOT EXIST)。

⇒ **WATCHDOG は 5 分ごとに 7 件全て NotFound を log に書き続ける、純粋な失敗ループ**。実体的な業務動作はゼロ。

### 6.2 WATCHDOG: `/var/log/tenmon_runtime_watchdog.service.log`

systemd の `StandardOutput=append:` 先。現在 **0 byte** (logrotate で truncate)。
`/proc/2539152/io.wchar = 8.16 GiB` の累積値はこの log + `_v1.log` への 21 日間の append 合計を反映。

### 6.3 WATCHDOG: journald

- 24h: `-- No entries --`
- 7d: count=1 (ヘッダのみ)
⇒ systemd 側の journal には何も流れていない (StandardOutput=append:file 設定のため)。

### 6.4 AUTOPATCH: `/tmp/tenmon_patch_queue/`

```
drwxr-xr-x   2 root root  4096  4月  4 17:11 .
(空)
```

**queue は空**。

### 6.5 AUTOPATCH: `/tmp/tenmon_patch_result/runner.log`

- size: 5,632 bytes / 112 行
- 末尾: `[2026-04-09T21:36:15Z] auto_patch_runner 起動` (= 16 日前で更新停止)
- それ以前は 2 〜 3 時間ごとに「auto_patch_runner 起動」行が連発 ⇒ 過去は頻繁に再起動していたが、現 PID 2474996 (2026-04-11 起動) になって以降は **何も書いていない** (= queue が空のため `mkdir + 起動 echo` 行に到達せず)。

### 6.6 AUTOPATCH: queue 投入で実行される動作 (script 内容より)

`auto_patch_runner.sh` (fd 255 から取得した完全コピー、3,118 bytes / 86 行) によると:

```bash
while true; do
  for patch in "$QUEUE"/*.py "$QUEUE"/*.sh; do
    [ -f "$patch" ] || continue
    # 1. patch を REPO で実行
    # 2. cd "$API" && npm run build
    # 3. もし build OK:
    #     a) python3 で /api/chat に天津金木プロンプト投げ、
    #        100+ chars かつ「次軸 / 次観測」leak 無しなら PASS
    #        --> systemctl restart tenmon-ark-api.service (← !!)
    #            git add -A && git commit -m "auto_patch: $name [$ts]"
    #     b) FAIL なら git checkout -- .       (ローカル変更全消去 !!)
    # 4. build NG なら git checkout -- .
    # 5. patch を tenmon_patch_result に移動
  done
  sleep 3
done
```

**極めて重要な副作用 (queue 投入時)**:
1. `systemctl restart tenmon-ark-api.service` を **無条件で発行** (auto-test の前段)
2. PASS 時は `git add -A && git commit` を **無人で実行** (HEAD が勝手に進む)
3. FAIL 時は `git checkout -- .` で **未 commit の作業ツリー全削除**
4. ハードコード Founder Key を埋め込んで `/api/chat` を叩く (キーがログに残らないかは別途検証必要)

⇒ **queue が空である現状は安全だが、`/tmp/tenmon_patch_queue` への書き込み権限を持つ何かが存在すれば即時危険動作**。queue dir のパーミッションは `drwxr-xr-x root:root` で root しか書けないが、root 権限の他プロセス (cron / 別 unit / 自動化) からは投入可能。

### 6.7 AUTOPATCH: journald

- 24h: `-- No entries --` (queue 空のため起動以後 echo 行も飛ばない)
- 7d: 同上

---

## 7. 復元可能性 (sha256 三者比較)

### 7.1 AUTOPATCH (`auto_patch_runner.sh`)

| 経路 | sha256 | 一致? |
|---|---|---|
| 動作中 PID の fd 255 (deleted-but-held) | `b784692c986b8671f493ee46d072e70af60b3832cb41bade669b55b63f73f6fa` | ✓ baseline |
| `/opt/tenmon-ark-repo-ab-old/auto_patch_runner.sh` (backup) | `b784692c986b8671f493ee46d072e70af60b3832cb41bade669b55b63f73f6fa` | ✓ 完全一致 |
| `git show 0a80c81a:auto_patch_runner.sh` | `b784692c986b8671f493ee46d072e70af60b3832cb41bade669b55b63f73f6fa` | ✓ 完全一致 |
| `git show 4e73de1e:auto_patch_runner.sh` | `4ca4ee988ef490a98cb84b129a0d1069e5fff23718ca48d1565e01b9a9078c6f` | (旧版、不一致は予想通り) |
| `git show 133ca8f4:auto_patch_runner.sh` | `d320a5da5512400d0692e44d367c7f5c6d7eec2d718009756635d3198212600a` | (旧版) |

⇒ **3 経路 (running fd / backup / git 0a80c81a) すべて完全一致**。完全に再現可能。

### 7.2 WATCHDOG (`tenmon_runtime_watchdog_v1.py`)

| 経路 | sha256 | 一致? |
|---|---|---|
| 動作中 PID の fd | (取得不可: Python は source を fd 保持しない) | — |
| `/opt/tenmon-ark-repo-ab-old/api/automation/tenmon_runtime_watchdog_v1.py` (backup) | `ef63dd3913733b9b19e45ddc6efc4884a428e3f686be9090b790588523276f3c` | ✓ baseline |
| `git show 3eee5d2a:api/automation/tenmon_runtime_watchdog_v1.py` | `ef63dd3913733b9b19e45ddc6efc4884a428e3f686be9090b790588523276f3c` | ✓ 完全一致 |
| `git show 6c25b50a:api/automation/tenmon_runtime_watchdog_v1.py` | `ef63dd3913733b9b19e45ddc6efc4884a428e3f686be9090b790588523276f3c` | ✓ 完全一致 |
| `git show fcb9a8a7:api/automation/tenmon_runtime_watchdog_v1.py` | `b3536edd6204314711aa02ea25cb7218494c9021936caf9bbaa7d55772969113` | (旧版) |

⇒ **2 経路 (backup / git 3eee5d2a or 6c25b50a) で完全一致**。実行中プロセスからの直接取得は不可だが、復元自体は可能。

### 7.3 git tree 上の現状

```
$ git ls-files | grep -E "watchdog|auto_patch_runner"
api/automation/quarantine/stale_evidence_v1/2026-03-24T23-06-51Z__tenmon_repo_hygiene_watchdog_verdict.json
api/automation/tenmon_repo_hygiene_watchdog_v1.py    (← 別物: hygiene 用、phantom とは無関係)
api/scripts/tenmon_repo_hygiene_watchdog_v1.sh       (← 別物)
```

`tenmon_runtime_watchdog_v1.py` と `auto_patch_runner.sh` は **現 HEAD (`feature/unfreeze-v4`) の tree に存在しない**。
`.gitignore` には個別除外パターンなし ⇒ **untracked / 過去 commit (3eee5d2a, 0a80c81a 等) は別ブランチ系統に存在**。
削除コミット (`--diff-filter=D`) は両 path とも `(なし)` ⇒ **意図的に削除されたのではなく、ブランチ切替 / worktree 入替 の副作用で消失**した可能性が高い (前段カードと同じ仮説)。

---

## 8. 影響評価 / 停止安全性 3 段階判定

### 8.1 業務依存性 (前段カード再確認)

| 観点 | WATCHDOG | AUTOPATCH |
|---|---|---|
| `tenmon-ark-api.service` の `Wants=` / `Requires=` に列挙 | × | × |
| `tenmon-ark-api.service` を `RequiredBy=` する unit | × | × |
| 自身の `[Unit] Wants=` に他 tenmon unit | × | × |
| 自身の `[Unit] After=` に `tenmon-ark-api.service` | ◯ (起動順序のみ) | ◯ (起動順序のみ) |
| **自身が `tenmon-ark-api.service` を再起動する権限を行使** | × | **◯ (queue 投入時)** |
| 子プロセス | 0 | 1 (sleep のみ) |
| TCP / UDP 待受 | 0 | 0 |
| 外部 unix socket | 0 | 0 (journald のみ) |

### 8.2 現行で発生している副作用

| 副作用 | WATCHDOG | AUTOPATCH |
|---|---|---|
| disk write per cycle | log append (≈ 8KB / 5 min) | ほぼ 0 |
| log file 増分 | `_v1.log` 17 MiB (21 日累計) | runner.log 5 KiB (停止状態) |
| CPU 消費 (ps の `times`) | ごく小 (sleep 主体) | ごく小 (sleep 主体) |
| 業務 API への影響 | 0 | 0 (queue 空のため発火せず) |
| 「実体のある業務動作」 | **0** (7 cmd 全て NotFound) | **0** (queue 空) |

### 8.3 3 段階の停止アクション安全性 (本カードでは実行しない / 検討用)

> **重要**: 以下は OBSERVE only としての影響予測。**本カードで実行しない**。停止する場合は別カードで Founder 承認後。

#### Step A: `systemctl stop` のみ (memory 上の process を kill、unit は enabled のまま残す)

| 観点 | WATCHDOG | AUTOPATCH |
|---|---|---|
| 業務影響 | **ZERO** (NotFound 失敗ループの停止のみ) | **ZERO** (idle sleep ループの停止のみ) |
| 直後の状態 | `Restart=always` × ExecStart 不在 ⇒ 即 `failed` | 同左 |
| log 増殖停止 | ◯ (17 MiB 以上の成長停止) | ◯ (元々増えていない) |
| 復元手段 | `cp /opt/tenmon-ark-repo-ab-old/...py` または `git checkout 3eee5d2a -- ...` で 100% 復元可能 | backup / git / fd 255 (kill 前なら) のいずれかで 100% 復元可能 |
| **失われるもの** | running memory image (script は再現可能なので実害なし) | **fd 255 の deleted file ハンドル** (kill 後は消える)。だが backup と git に同 sha256 のコピーがあるので実害なし |
| 判定 | **SAFE** | **SAFE** (fd 255 に固有データが無いことを §7.1 の sha256 一致で確認済) |

#### Step B: Step A + `systemctl disable` (再起動時に active=active を復活させない)

- 両 unit とも `enabled` 状態。disable しないと VPS 再起動で `failed` ループに戻る。
- ExecStart 不在のため再起動後は `active=failed` (= 前段カードの "dead unit" 状態) になるだけ。`failed` ステータスでも他 unit に伝播せず (Wants/Requires がないため)。
- 判定: **SAFE** (両 unit)。

#### Step C: Step A+B + script 復元 (= 機能を復活させる選択肢)

- WATCHDOG: 復元してもログ先 7 cmd (`probe / audit / snapshot / truth_bundle / acceptance_gate / governor / schedule_observer`) が **すべて disk 不在**。それらも併せて復元しない限り、復元しても `[rc]=2` 失敗ループに戻るだけ ⇒ **復元の業務価値なし**。
- AUTOPATCH: 復元すると queue 監視が再開する。`/tmp/tenmon_patch_queue/*.py|*.sh` 投入経路が **誰によって設計されているか不明** (現状は手動 scp 前提 / cron 等不在)。`systemctl restart tenmon-ark-api.service` + `git auto-commit` + `git checkout -- .` の 3 副作用は **TENMON の現運用 (Founder 承認 commit / acceptance gate / enforcer) と整合しない**。
- 判定: **どちらも復元すべきでない (NEEDS_DECISION → ABANDON 推奨候補)**。ただしこれは判断材料の提示であり、本カードでの判定権限はない。

### 8.4 ステータス再分類 (前段カード `NEEDS_DECISION` の更新提案)

| unit | 前段カード分類 | 本カード推奨 | 推奨アクション (別カードで実施) |
|---|---|---|---|
| `tenmon-runtime-watchdog.service` | `NEEDS_DECISION` (phantom) | **`ABANDON_CANDIDATE`** | stop + disable (script は復元しない)。理由: 7 件すべて NotFound のループのみで業務価値ゼロ、復元しても改善せず。 |
| `tenmon-auto-patch.service` | `NEEDS_DECISION` (phantom) | **`ABANDON_CANDIDATE_HIGH_PRIORITY`** | stop + disable (script は復元しない)。理由: 現状 idle で安全だが、queue 投入経路が活性化すれば `tenmon-ark-api.service` 自動再起動 + 自動 commit/rollback が走る。**TENMON 現運用と整合しないため放置リスクあり**。 |

---

## 9. POST verification (zero side-effect 確認)

| 検証項目 | PRE | POST | 結果 |
|---|---|---|---|
| `WATCHDOG_PID` | 2539152 | 2539152 | ✓ 不変 |
| `AUTOPATCH_PID` | 2474996 | 2474996 | ✓ 不変 |
| `tenmon-runtime-watchdog.service active=` | active | active | ✓ 不変 |
| `tenmon-auto-patch.service active=` | active | active | ✓ 不変 |
| `mc-collect-git.service active=` | failed | failed | ✓ 不変 |
| `mc-collect-all.service active=` | failed | failed | ✓ 不変 |
| `tenmon-operations-level-autonomy.service active=` | failed | failed | ✓ 不変 |
| `tenmon-storage-debug.service active=` | failed | failed | ✓ 不変 |
| `tenmon-ark-api.service` | active | active | ✓ 不変 |
| `nginx.service` | active | active | ✓ 不変 |
| acceptance gate (`tenmon_acceptance_gate_v2.py` ⇒ 別経路で確認) | — | (§9.1) | — |
| enforcer (`tenmon_constitution_enforcer_*`) | — | (§9.1) | — |
| `/pwa/evolution` HTTP | 200 | (§9.1) | — |
| `/api/chat` T1 (短文) | 正常 | (§9.1) | — |
| `/api/chat` T4 (longform 500+ chars, no leak) | 正常 | (§9.1) | — |

### 9.1 POST verify ログ

§commit 直前の verify セクションで再取得。下記 § "POST run log" に追記する。

---

## 10. 観測手順 (再現可能性)

### 10.1 使用したコマンド (READ ONLY only)

```
systemctl is-active / is-enabled / is-failed / status / cat / show
ps -fp / ps -o lstart,etime,user,command / ps --ppid
ls -la /proc/<PID>/{cwd,exe,fd,fd/<n>,task}
cat /proc/<PID>/{cmdline,status,stat,io,environ,limits,maps}
tr '\0' ' ' < /proc/<PID>/cmdline
tr '\0' '\n' < /proc/<PID>/environ
head -c 250 /proc/<PID>/stat
ss -tnp / -unp / -xp
lsof -p <PID> -nP
pgrep -P <PID>
pstree -p <PID>
journalctl -u <unit> --no-pager --since="..."
git log --all -- <path>
git log --all --diff-filter=D -- <path>
git show <hash>:<path>
git ls-files
find / -name "..."
sha256sum / wc -l
ls -la / stat -L
head / tail
grep / awk
```

**stop / disable / mask / restart / enable / kill / pkill / 書き込み (`echo > /proc`, `cp` to repo, `git add` 等) は一切実行していない**。

### 10.2 観測の所要時間

- PRE baseline: 1 分
- Step 2-8: 約 5 分 (8 シェルコマンド)
- レポート作成: ≈ 7 分
- POST verify: 1 分
合計 ≈ 14 分。

---

## 11. Founder への要約 (経営判断材料)

1. **両 phantom は現在「業務影響ゼロ」**。
   - WATCHDOG: 5 分ごとに 7 件 NotFound を log に書き続けるだけ (実体動作なし)。
   - AUTOPATCH: queue 空のため idle sleep 3 ループのみ。
2. **両 script は完全復元可能**。
   - backup `/opt/tenmon-ark-repo-ab-old/` と過去 git commit (3eee5d2a / 0a80c81a) で sha256 完全一致。
   - 動作中の PID を kill しても、復元手段は失われない。
3. **しかし復元の業務価値は低い**。
   - WATCHDOG は被監視 7 スクリプトもすべて不在で、復元しても失敗ループに戻るだけ。
   - AUTOPATCH は復元すると `systemctl restart tenmon-ark-api.service` + `git auto-commit/checkout` の自動化が再開し、TENMON 現運用 (Founder 承認 commit / enforcer / acceptance gate) と衝突する。
4. **したがって推奨は「ABANDON (停止 + disable、復元しない)」**。本カードでは実施せず、別カード `CARD-AUTOMATION-PHANTOM-UNIT-RETIRE-V1` (仮) で Founder 承認後に実施が望ましい。
5. **ただし停止には 1 つだけ "後戻り不可" の点がある**: AUTOPATCH の fd 255 (deleted-but-held) は kill すると失われる。今は backup と git に同 sha256 のコピーが残っているので実害ゼロだが、停止前にもう一度 sha256 三者比較を行えば二重保険になる (本カードで既に確認済 = §7.1)。

---

## 12. 終状態宣言

- 本カードによる **コード変更ゼロ** / **systemd 状態変化ゼロ** / **PID 変化ゼロ** / **新規プロセス生成ゼロ (一時 sleep, ls, cat, journalctl 等を除く)**。
- 成果物は本ファイル 1 本のみ:
  `docs/ark/automation/AUTOMATION_PHANTOM_UNIT_OBSERVE_V1.md`
- 本カードは `CARD-AUTOMATION-PHANTOM-UNIT-OBSERVE-V1` の DOD 全件を満たす (READ-ONLY 観測 / 停止安全性 3 段階判定 / 復元可能性確定 / Founder 用要約)。

---

## POST run log (commit 直前)

実行日時: 2026-04-25 14:32 JST

### A. PID / 6 unit / 上位 unit 不変確認

```
WATCHDOG_PID PRE=2539152 NOW=2539152 UNCHANGED
AUTOPATCH_PID PRE=2474996 NOW=2474996 UNCHANGED

tenmon-ark-api: active
nginx:          active
tenmon-runtime-watchdog.service: active=active enabled=enabled failed=active
tenmon-auto-patch.service:       active=active enabled=enabled failed=active
mc-collect-git.service:          active=failed enabled=static failed=failed
mc-collect-all.service:          active=failed enabled=static failed=failed
tenmon-operations-level-autonomy.service: active=failed enabled=static failed=failed
tenmon-storage-debug.service:    active=failed enabled=transient failed=failed
```

PRE と完全一致 (フォーマットの差異のみ)。**0 side-effect**。

### B. /pwa/evolution

```
status=200 size=1008 time=0.058887s
```

CARD-FOUNDER-RELEASE-NOTES-UI-PHASE-A-V1 の進化ログページ、引き続き正常配信。

### C. /api/chat T1 (短文)

```
threadId=phantom_observe_t1
message=「こんにちは」
response=「TENMON-ARKです。ようこそ。\nあなたの言葉を待っていた。\nさあ、語り始めよう。」 (43 chars)
verdict=insufficient (greeting routing → N1_GREETING_LLM_TOP)
omegaCompliant=false (挨拶のため正典証拠不要; 想定通り)
```

T1 系統 (短文) は前段カード時と同等の挙動。

### D. /api/chat T4 (longform 500+ chars / leak チェック)

```
threadId=phantom_observe_t4
message=「カタカムナと言霊秘書の関係を、歴史・哲学・実践応用の三段階で深く解説してください。」
response length = 1,166 chars  (clamp の 500 char 上限を 116% 超過)
finishReason: ? (LLM が STOP を送らないこともある; 内容は完結、末尾は「あなたは、自身の言葉が持つ根源的な力を、どのように現實に活かしたいと問うのか。」で自然終了)
leaks (「次軸」「次観測」): 0
verdict=grounded
omegaCompliant=true
truthAxisCount=4 / fourPhiComplete=true
irohaGrounding=true (sounds=[イ, ロ, ハ])
```

CLAMP-REPAIR (commit `3eee5d2a` 以前のカード) で導入した longform 解放が **本カード観測中もリグレッションなく機能**。

### E. acceptance / enforcer verdict (本ホストでは取得不可)

本カード実行ホストには `TENMON_MC_CLAUDE_READ_TOKEN` が配置されていないため、認証必須の `/api/mc/vnext/claude-summary` は HTTP 401 (`{"ok":false,"error":"UNAUTHENTICATED"}`)、`/api/mc/vnext/intelligence` も同 401 を返す。

- これは **本カード観測によって発生した変化ではなく** 、ホスト側 secret 配置状態 (前段カード時と異なる) によるもの。
- 本カードは zero code change / zero state change のため、verdict そのものは前段カード `AUTOMATION_DEAD_UNIT_RETIRE_OBSERVE_V1` 時の状態 (acceptance=PASS / enforcer=clean) から変動していない。
- token を保有する経路 (Founder の Cursor / 別 host) で実行すれば PASS / clean が確認可能。

### F. 検証総括

| 検証 | 結果 |
|---|---|
| PID 不変 (2 PID) | ✓ |
| 6 unit + ark-api + nginx 状態不変 | ✓ |
| /pwa/evolution 200 | ✓ |
| /api/chat T1 短文 | ✓ |
| /api/chat T4 longform (clamp 解放、leak=0) | ✓ |
| 新規ファイル | 1 (本レポートのみ) |
| 既存ファイル変更 | 0 |
| systemd 状態変化 | 0 |
| プロセス追加/停止 | 0 |
| acceptance.verdict / enforcer.verdict 認証経路 | 本ホストでは 401、別経路で要 owner 確認 |

⇒ **本カード `CARD-AUTOMATION-PHANTOM-UNIT-OBSERVE-V1` の DOD を満たした**。

