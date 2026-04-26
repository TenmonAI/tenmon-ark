# DOCTOR_V2_OLD_VPS_MIGRATION_OBSERVE_V1

カード: `CARD-DOCTOR-V2-OLD-VPS-MIGRATION-OBSERVE-V1`
Phase: 1 (OBSERVE only)
種別: READ-ONLY 観測 + 設計
verdict: **YELLOW** (warn=1 / critical=0 / blocked=1 / deferred=1 / ready=6)
observer: `automation/tenmon_oldvps_migration_observer_v1.py` (`v1.0.0-oldvps-migration-phase1`)
output: `automation/out/oldvps_migration_observer_latest.json`

> プライバシ規律: 本書では旧 VPS / 本番 VPS のフル hostname と ssh 鍵パス、token を一切記述しない。
> hostname は `sha8(<host>)` の8桁短ハッシュのみで参照する。

---

## 1. 背景と最重要目的

### 1-1. 背景
TENMON-ARK Automation OS (doctor v2 + feedback observer + iroha observer +
iroha notion structure observer) は本番 VPS 上で人手起動の OBSERVE only
ツールチェインとして整備されてきた。各成果は以下:

- doctor v2 (`commit 688c6d21`): YELLOW / critical 0 / acceptance PASS / enforcer clean
- Feedback Loop OBSERVE (`commit 57e38c5c`): YELLOW / critical 0
- IROHA SOURCE OBSERVE: 完了、L1〜L5 connected 100%
- IROHA NOTION STRUCTURE COMPLEMENT (`commit b5a5c2c8`): PASS、設計確定済み
- IROHA NOTION STRUCTURE WRITE: 保留 (OS 基盤完成後に再開)
- 断捨離 tone 系: 保留 (OS 基盤完成後に再開)

これら observer は本番 VPS に同居しているが、本来 customer-facing と
non-customer-facing は分離すべきという原則がある。

### 1-2. 最重要目的
旧 4GB VPS を **Automation OS 専用基地** として整え、いろは / 断捨離 / 会話品質 /
Founder 改善をすべて OS 経由で回せる状態にする。
本カードはその前段として、旧 VPS の現在状態・配置候補・接続方式を完全観測し、
次カード `CARD-DOCTOR-V2-OLD-VPS-MIGRATION-PREP-V1` の前提を確定する。

### 1-3. OBSERVE only 規律
- 旧 VPS への file write / clone / pull / scp / rsync / systemd / cron 登録 = ゼロ
- 本番 VPS への変更 = ゼロ
- 双方向 DB write / Notion write / pip install / nginx 操作 = ゼロ
- 旧 VPS 既存サービスの停止・改変 = ゼロ
- 自動修復 = ゼロ (observe は1回のみ)

---

## 2. 旧 4GB VPS 現在状態 (OS / 容量 / メモリ / ランタイム)

### 2-1. 観測ステータス
本カード実行時点で `OLDVPS_HOST` / `OLDVPS_USER` / `OLDVPS_SSH_KEY` 環境変数が
**いずれも未設定**。observer は領域 1〜2 を **skip + warn** として記録した
(verdict YELLOW の唯一の根拠)。

```
[warn] oldvps_env: OLDVPS env missing (OLDVPS_HOST,OLDVPS_USER,OLDVPS_SSH_KEY);
       old-VPS area skipped (TENMON to populate)
```

該当領域は次カード PREP で TENMON が env を埋めた直後に同 observer を再実行する
ことで完全に埋まる設計とした (observer 側に skip ロジック実装済 / 再実行で
warn が消えれば GREEN 化する)。

### 2-2. 想定 (旧 VPS 諸元 / 既存運用上の前提)
本カードでは以下を前提にし、PREP カードで観測値で確定する:

- 形態: 4GB RAM クラスの VPS (旧天聞アークの観測・自動化用に流用)
- OS: Ubuntu 22.04 系 (本番 VPS と揃える前提)
- アーキテクチャ: x86_64
- ストレージ: 数十 GB クラス (Automation OS は月 ~100MB 想定なので余裕)
- 既存運用: 旧天聞アーク関連の何らかのサービスが稼働している可能性あり
  (本カードでは把握のみで停止・改変はしない)

### 2-3. 観測コマンド (PREP カードで実行する read-only ホワイトリスト)
observer の `ALLOW_SSH_CMDS` に定義済み (各 ssh は `ConnectTimeout=10` /
`StrictHostKeyChecking=accept-new` / `BatchMode=yes` / 全 timeout 必須):

| key | command | 目的 |
|-----|---------|------|
| `uname` | `uname -a` | kernel / arch |
| `os_release` | `cat /etc/os-release` | OS 名・バージョン |
| `lscpu` | `lscpu \| head -20` | CPU 仕様 |
| `df` | `df -h` | 全パーティション空き容量 |
| `free` | `free -h` | メモリ / swap |
| `uptime` | `uptime` | 稼働時間・LA |
| `which_python` | `command -v python3 && python3 --version` | Python 有無・版 |
| `which_node` | `command -v node && node --version` | Node 有無・版 |
| `which_git` | `command -v git && git --version` | Git 有無・版 |
| `which_sqlite` | `command -v sqlite3 && sqlite3 --version` | sqlite3 有無・版 |
| `which_curl` | `command -v curl && curl --version` | curl 有無・版 |
| `which_jq` | `command -v jq && jq --version` | jq 有無・版 |
| `home_du` | `du -sh ~` | home の使用量 (read のみ) |

### 2-4. 本番 VPS 現状 (比較・基準値)
observer が本番 VPS (この host) を同時に観測した結果。旧 VPS のランタイムを
PREP で埋める際の基準とする。

| 項目 | 値 |
|------|-----|
| host_sha8 | `5c7f8169` |
| OS | Ubuntu 22.04.2 LTS |
| disk (`/`) | 388G total / 37G used / 352G avail / 10% used |
| mem | 11Gi total / 4.0Gi used / 7.4Gi avail |
| swap | 2.0Gi total / **2.0Gi used** / 45Mi free (注: swap pressure あり) |
| python3 | Python 3.10.12 |
| node | v22.22.0 |
| git | 2.34.1 |
| sqlite3 | 3.37.2 |
| curl | 7.81.0 |
| jq | 1.6 |
| /api/health | `ok=true ready=true stage=READY gitSha=b5a5c2c8` |

旧 VPS は 4GB RAM クラスのため、本番 VPS のメモリ (11Gi) より小さい。
ただし Automation OS のピーク常駐メモリは observer 1 本あたり Python プロセス
50〜100MB 程度であり、4GB に対して 1〜3% 程度 → 余裕あり。

---

## 3. 旧 VPS 既存配置の確認結果

### 3-1. 観測ステータス
領域 2 と同じく、`OLDVPS_*` env 未設定のため本カードでは未観測。
PREP カードで以下を確認する:

| 確認対象 | 期待コマンド | 期待結果 |
|----------|-------------|----------|
| `/opt/` 全体 | `ls -la /opt/` | 既存ディレクトリ一覧 |
| `/opt/tenmon-automation` | `ls -la /opt/tenmon-automation` | 存在しないなら新規可、存在なら現状把握 |
| `/opt/tenmon-ark-repo` | `ls -la /opt/tenmon-ark-repo` | 既存 clone repo があれば commit / branch 確認 |

### 3-2. 既存 repo がある場合 (read-only 確認のみ)
| コマンド | 目的 |
|----------|------|
| `cd /opt/<repo> && git status --short` | dirty 状態の有無 |
| `cd /opt/<repo> && git log --oneline -5` | 直近 5 commit |
| `cd /opt/<repo> && git remote -v` | upstream remote |
| `cd /opt/<repo> && git branch` | 現在ブランチ |

> 既存 repo がある場合でも、本カードでは pull / push / clone を一切しない。
> Automation OS 用の clone は PREP カードの権限で初めて実施する。

### 3-3. 設計上の判定基準
- 既存配置に `/opt/tenmon-automation` が **無い** → クリーン配置可能 (推奨)
- 既存配置に `/opt/tenmon-ark-repo` が **古い commit** で残っている →
  PREP では別ディレクトリ (`/opt/tenmon-automation/repo/` 等) に clone し、
  既存と分離する
- 既存配置に **何も無い** → 推奨パス (`/opt/tenmon-automation/`) を新規作成可

---

## 4. 既存サービス・cron・timer の稼働状況

### 4-1. 旧 VPS 側 (PREP で確認予定)
PREP カードで以下を read-only に確認:

| コマンド | 目的 |
|----------|------|
| `systemctl list-units --type=service --no-pager` | 稼働中サービス全体 |
| `... \| grep -i tenmon` | 旧天聞アーク関連サービスの有無 |
| `systemctl list-timers --all --no-pager` | 既存 timer (cron 代替) |
| `crontab -l` | 既存 cron job |

> 停止・改変は一切行わない。把握のみ。

### 4-2. 本番 VPS 側 (本カードで観測済み)
本観測で確認できた tenmon 系 systemd unit (15 件):

| unit | state |
|------|-------|
| `tenmon-ark-api.service` | **active running** (本番 API 本体) |
| `tenmon-runtime-watchdog.service` | active running |
| `tenmon-notion-task-status-fix.service` | active running |
| `tenmon-todaycut-stack.service` | active exited |
| `tenmon-strict-promotion.service` | activating auto-restart (継続不安定) |
| `tenmon-notion-task-seed.service` | inactive dead |
| `tenmon-notion-task-audit.service` | inactive dead |
| `tenmon-notion-task-readback.service` | inactive dead |
| `tenmon-notion-task-requeue.service` | inactive dead |
| `tenmon-operations-level-autonomy.service` | **failed** |
| `tenmon-storage-debug.service` | **failed** |
| `mc-build-handoff.service` | inactive dead |
| `mc-collect-all.service` | inactive dead |
| `mc-collect-git.service` | inactive dead |
| `mc-collect-live.service` | inactive dead |

### 4-3. 解釈
- 本番 VPS の `tenmon-ark-api.service` は **稼働中** → API health=ok 確認済み
  → 旧 VPS から HTTPS GET 観測の前提が成立している
- `failed` / `auto-restart` 系の unit は本カードの対象外 (移行と無関係) であり、
  本カードでは触らない
- 旧 VPS 側の既存サービス棚卸は PREP カードで実施するが、Automation OS の
  追加 unit は **DRYRUN カード以降でしか登録しない** (本カード + PREP カード
  までは systemd 登録ゼロ)

---

## 5. 本番 VPS への READ-ONLY 接続方式の決定 (HTTPS で十分かの判定)

### 5-1. 候補マトリクス

| candidate | 種別 | 利用可否 | 認証 | 制限 |
|-----------|------|--------|------|------|
| A | HTTPS public GET | ◎ | 不要 | DB / journalctl / systemctl は届かない |
| B | HTTPS authed GET | ◎ | `TENMON_MC_CLAUDE_READ_TOKEN` (env のみ / 旧 VPS の env に置き、commit/log 厳禁) | 同上 |
| C | ssh oldvps → prod | × | (本カードでは開けない) | 危険操作の表面積を増やす |
| D | nginx 公開エンドポイント | ◎ | 既存 A と同等 | 追加開放はしない |

### 5-2. 推奨: **A + B (HTTPS のみ)**
根拠:

- IROHA SOURCE OBSERVE / Doctor v2 / Feedback Observer の **全観測項目** が
  HTTPS GET (public + authed) のみで完遂している実績
- doctor v2 が既に `https://tenmon-ark.com/api/health` 経由で readiness 判定を
  PASS させており、移送後も同方式で継続できる
- ssh 経路 (C) を開かない方針は「旧 VPS は本番 VPS を改変できない」という
  isolation 原則の物理的担保になる

### 5-3. 旧 VPS から本番 VPS へのアクセスに使う public/authed エンドポイント

| path | auth | 用途 |
|------|------|------|
| `/api/health` | 不要 | doctor v2 readiness probe |
| `/pwa/` | 不要 | PWA frontend probe |
| `/pwa/evolution` | 不要 | 進化ログ probe |
| `/api/mc/vnext/claude-summary` | 必要 | doctor v2 acceptance verdict |
| `/api/mc/vnext/intelligence` | 必要 | doctor v2 enforcer / iroha 760 字 metric |
| `/api/feedback/history` | 必要 | feedback observer (46 records) |

### 5-4. ssh 経路 (C) の将来扱い
- 当面は **開けない**
- 観測カバレッジ不足が判明した場合に限り、別カード `CARD-OLDVPS-PROD-SSH-OBSERVE-V1` (仮)
  で慎重に検討する
- 開ける場合も READ-ONLY ホワイトリストを定義し、本番側 `authorized_keys` の
  `command="..."` で実行可能コマンドを物理的に固定する

---

## 6. doctor v2 を旧 VPS に置く候補パスと推奨

### 6-1. 候補マトリクス

| 候補パス | score | 権限 | アップデート方式 | 既存衝突 | 評価 |
|----------|-------|------|------------------|----------|------|
| `/opt/tenmon-automation/doctor_v2/` | **9** | root | git pull (within /opt/tenmon-automation) | none (新規) | ◎ system-wide / `/opt/tenmon-*` 命名整合 |
| `~/tenmon-automation/` | 7 | user | git pull | none | ○ user 完結 / 即運用可 / ユーザ削除リスク |
| `/var/lib/tenmon-automation/` | 5 | root | manual / git | none | △ logrotate 親和も慣習薄 |
| (既存 clone repo 内) | 3 | 既存と同じ | 既存に従う | あり得る | × 役割分離原則違反 |

### 6-2. 推奨: **`/opt/tenmon-automation/doctor_v2/`**
- repo 全体を `/opt/tenmon-automation/repo/` に clone し、その中の
  `automation/` ディレクトリを Automation OS の本体とする
- `doctor_v2.py` 等の symlink を `/opt/tenmon-automation/doctor_v2/` に張る
  か、あるいは直接 `automation/tenmon_doctor_v2.py` を呼ぶ
- 構造:

```
/opt/tenmon-automation/
├── repo/                       # git clone (PREP カードで初回実施)
│   ├── automation/
│   │   ├── tenmon_doctor_v2.py
│   │   ├── tenmon_feedback_observer_v1.py
│   │   ├── tenmon_iroha_observer_v1.py
│   │   ├── tenmon_iroha_notion_structure_observer_v1.py
│   │   └── tenmon_oldvps_migration_observer_v1.py
│   └── docs/
├── out/                        # observer 出力 (本書 §7)
└── log/                        # 実行ログ (logrotate 対象)
```

### 6-3. 配置時の制約 (PREP カード執行条件)
- 配置先ユーザは旧 VPS の既存 ssh ユーザ (新規ユーザ作成しない)
- 所有者・パーミッションは既存 `/opt/` の既存配置に揃える
- `git clone` の URL は public HTTPS (token を伴わない) または既存の
  `tenmon_github` キー利用 (新規鍵発行禁止)
- 配置直後に `chmod` `chown` で権限変更しない (既定のままで動作確認)

---

## 7. automation/out の保存先候補と容量見積もり

### 7-1. 候補マトリクス

| パス | score | 評価 |
|------|-------|------|
| `/opt/tenmon-automation/out/` | **9** | コードと同居 / logrotate.d 別途設定推奨 |
| `~/tenmon-automation/out/` | 7 | user perm 完結 / 個別 quota 注意 |
| `/var/log/tenmon-automation/` | 6 | syslog/logrotate 親和 / JSON ログ慣習薄 |

### 7-2. 推奨: **`/opt/tenmon-automation/out/`**

### 7-3. 容量見積もり

| observer | 1 回あたり |
|----------|----------|
| doctor v2 | ~50 KB |
| feedback observer | ~30 KB |
| iroha observer | ~25 KB |
| iroha notion structure observer | ~50 KB |
| **合計 / 1 回** | **~155 KB** |

想定実行頻度 (PREP/DRYRUN で確定): doctor v2 hourly / feedback daily / iroha weekly
= 平均 hourly 6 回相当 → 1 日 ~24 回換算で 155 × 24 / 4 ≒ 930 KB → 月 **~27 MB**。
余裕を見て月 **~100 MB** 上限と設計。

### 7-4. ローテーション設計
- 既定: `logrotate.d` で weekly / keep 4 weeks / compress old
- 4 GB VPS ストレージに対して月 100 MB は **0.0025% 程度** → 容量負担なし
- 万一 DRYRUN で異常増加 (cardinality 爆発・無限ループ) を検知した場合は
  observer 単体側で `out/` を上書きする設計に切替 (latest only) を検討

---

## 8. dangerous_script_denylist の持ち込み方針

### 8-1. 本番 VPS 側の現状
本カードで observer が repo 内を確認した結果:

| 項目 | 状態 |
|------|------|
| central JSON `automation/dangerous_script_denylist_v1.json` | **未作成** |
| observer 内 `DENY_TOKENS` リスト embedded | **5 ファイル** |

embedded 済み observer:
- `automation/tenmon_doctor_v2.py`
- `automation/tenmon_feedback_observer_v1.py`
- `automation/tenmon_iroha_observer_v1.py`
- `automation/tenmon_iroha_notion_structure_observer_v1.py`
- `automation/tenmon_oldvps_migration_observer_v1.py` (本カードで追加)

各 observer は冒頭で自身の source を読み、connection-token (連結記述) と
substring 比較する self-check を実装している。本カードの新 observer は 29 token を
チェックする。

### 8-2. 持ち込みオプション

| option | 方法 | score | pros | cons |
|--------|------|-------|------|------|
| **A** | git clone で repo 全体を旧 VPS へ持ち込む | **9** | 整合性最強 / 各 observer の self-check が同時に効く | repo 全体配置 (read-only 用途で低リスク) |
| B | central denylist JSON だけ持ち込む | 4 | 軽量 | central JSON が未作成 / 本カードで scp 禁止 |
| C | 旧 VPS で新規作成 (重複ハードコード) | 2 | 依存ゼロ | PROD と乖離 (security drift) |

### 8-3. 推奨: **A (git clone via PREP card)**
- PREP カードで `git clone` 1 回のみ
- 以後は `git fetch` / `git checkout <commit>` のみ (本カードでは pull も禁止だが、
  PREP 以降は明示的 commit pin での fetch を許容)
- central JSON 化は中期 TODO (`CARD-DANGEROUS-SCRIPT-DENYLIST-CENTRAL-JSON-V1` 仮)
  として併記するが、本カード+PREP では実施しない

### 8-4. 旧 VPS 側で追加すべき denylist 項目 (本書 docs ベース)
旧 VPS は本番 VPS を読み取るだけの非対称構造のため、PROD 側 token に加えて
以下を追加する:

| 追加 token | 目的 |
|-----------|------|
| `ssh root@<prod_host>` | 本番 VPS への root 直接接続を物理的に拒否 |
| `ssh -i <key> ... systemctl restart` | 本番 VPS への状態変更コマンドの発火を拒否 |
| `ssh -i <key> ... rm -rf` | 本番 VPS への破壊コマンド発火を拒否 |
| 本番 VPS 改変 (DB / nginx / systemctl / file write) を発火する全コマンド | 包括的拒否 |
| scp / rsync / sftp の書き込み方向 | 双方向書き込み禁止 |

実装時は、本書 §11 の self-check 連結記述方式に従い、source code 内の literal
token は `"sc" + "p"` のように分割して保持する。

---

## 9. 旧 VPS で実行してよいコマンド / 禁止コマンド境界

### 9-1. 許可コマンド (READ-ONLY only)
| コマンド | 用途 |
|----------|------|
| `ls` / `cat` / `stat` / `find` / `grep` / `head` / `tail` | ファイル read |
| `df` / `du` / `free` / `uptime` / `lscpu` | リソース read |
| `git status` / `git log` / `git diff` (read のみ) | repo state 確認 |
| `systemctl is-active` / `is-enabled` / `status` / `list-units` / `list-timers` | service 状態 read |
| `journalctl --no-pager` (read) | log read |
| `python3` / `node --version` | runtime 確認 |
| `curl -s` (GET only) | HTTP read |
| ssh 経由の上記コマンド | 旧 VPS 観測 |

### 9-2. 禁止コマンド (state-changing / write 系)
| コマンド | 拒否理由 |
|----------|---------|
| `rm` / `mv` / `cp` (write 系) | ファイル削除・移動 |
| `systemctl restart` / `stop` / `start` / `enable` / `disable` / `edit` | service state change |
| `nginx -s` | reverse proxy 制御 |
| `rsync` (write 方向) / `scp` (write 方向) | バルクコピー |
| `git push` / `git pull` (本カードでは pull も禁止) | repo state change |
| `crontab -e` | cron 編集 |
| `chmod` / `chown` | 権限改変 |
| 本番 VPS への ssh 改変コマンド | 双方向 isolation |
| Notion API write (pages/databases/blocks/comments の create/update/append) | 永続記録の改変 |

### 9-3. 自動 self-check
本カードで追加した observer は起動時に source を読み、上記 token (連結記述) を
substring 検査する。hit があれば exit code 2 で起動拒否。
本書執筆時点での self-check token 数: **29**。

---

## 10. 将来 systemd 化する場合の安全条件

### 10-1. 前提条件 (DRYRUN カード成功後にのみ満たされる)

1. 旧 VPS 上で doctor v2 が手動実行で安定動作 (副作用ゼロ)
2. 副作用ゼロを 5 回連続で確認
3. 失敗時の通知経路 (ログ / Notion / mail 等) を確立
4. リソース監視 (CPU / メモリ / 容量) を設定
5. denylist self-check が常時 PASS (実行ログに hit ゼロ)
6. TENMON 裁定後のみ `enable`

### 10-2. timer 設計候補 (本カードでは設計のみ / 登録しない)

| observer | 頻度 | 理由 |
|----------|------|------|
| doctor v2 | hourly / daily の 2 案 | 異常検知の即応性 vs 負荷 |
| feedback observer | daily 1 回 | feedback は分単位の即応不要 |
| iroha observer | weekly 1 回 | DB 変動が緩やか |
| iroha notion structure observer | weekly 1 回 | Notion 変動が緩やか |
| oldvps migration observer | one-shot (PREP/DRYRUN 検証時のみ) | 定常 timer 不要 |

### 10-3. rollback 設計
- timer は `systemctl disable` で即停止可能
- script は read-only なので副作用なし (timer 切断だけで完結)
- 万一の ssh 接続障害時の再接続手順は PREP カードで明文化
- DRYRUN カードで「異常時の手動 disable / log 採取 / TENMON 通知」の 3 段
  rollback playbook を docs に書く

### 10-4. 監視
- timer 投入後は本番 VPS 側に「旧 VPS Automation OS heartbeat」を取り込む
  HTTPS endpoint を追加するか、または Notion 進化ログに weekly summary を
  書き込む方式 (将来カード) を検討。本書時点では未確定。

---

## 11. 本番 VPS と旧 VPS の役割分担

### 11-1. 本番 VPS (production / customer-facing)
| 責務 | 内容 |
|------|------|
| ユーザ chat 提供 | `/api/chat`, `/api/chat-stream` |
| `/api/*` 公開 | feedback / mc / iroha 等 |
| DB 保持 | `/opt/tenmon-ark-data/kokuzo.sqlite` |
| nginx 配信 | reverse proxy / TLS |
| `/pwa/` 配信 | PWA frontend |
| 進化ログ更新 | Founder release notes |

### 11-2. 旧 4GB VPS (observation / automation / non-customer-facing)
将来責務 (PREP/DRYRUN 後に確定):

| 責務 | 内容 |
|------|------|
| doctor v2 定期実行 | read-only 観測 |
| feedback observer 定期実行 | feedback 履歴の傾向解析 |
| iroha observer 定期実行 | L1〜L5 接続検証 |
| iroha notion structure observer | Notion 章節 drift 検知 |
| 結果保存 | `/opt/tenmon-automation/out/` |
| Notion 進化ログ書き込み | 将来カード |
| 異常検知 + next-card 提案 | 将来カード |

### 11-3. 分離原則
- 本番 VPS: **production / customer-facing**
- 旧 VPS: **observation / automation / non-customer-facing**
- 旧 VPS 障害が本番 VPS に波及しないこと
  (旧 VPS から本番 VPS への書き込み経路を物理的に持たない)
- 旧 VPS は本番 VPS を改変できないこと
  (HTTPS GET only / ssh 経路は当面開けない)
- 双方向逆依存を作らない
  (本番 VPS から旧 VPS への接続も今回は開けない)

---

## 12. 次カード (CARD-DOCTOR-V2-OLD-VPS-MIGRATION-PREP-V1) の前提条件

### 12-1. 前提充足状況 (本カード時点)

| key | status | note |
|-----|--------|------|
| `oldvps_env_present` | **blocked** | OLDVPS_HOST / USER / SSH_KEY を TENMON が手動設定 |
| `prod_api_health` | ready | `/api/health = ok ready=true gitSha=b5a5c2c8` |
| `https_reachable_from_oldvps` | deferred | env 充足後に旧 VPS から `curl /api/health` (PREP) |
| `denylist_strategy_decided` | ready | option A (git clone via PREP) |
| `placement_decided` | ready | `/opt/tenmon-automation/doctor_v2/` + `out/` |
| `out_rotation_designed` | ready | logrotate weekly / keep 4 weeks / 月 ~100MB |
| `command_boundaries_documented` | ready | allowed/forbidden 一覧確定 |
| `systemd_future_conditions` | ready | 前提 6 項 + rollback 設計済 (本カードでは登録しない) |

合計: **6 ready / 1 blocked / 1 deferred**

### 12-2. PREP カードで満たすべき条件

1. `OLDVPS_HOST` / `OLDVPS_USER` / `OLDVPS_SSH_KEY` を TENMON が env 設定
   (commit / docs に出さない / .env / shell history も含めて漏らさない)
2. 本 observer を再実行し、`oldvps.env_present=true` / `oldvps.skipped=false` /
   warn ゼロ / verdict GREEN を確認
3. 旧 VPS の OS / disk / mem / runtimes を取得し、本書 §2-2 を実測値で更新
4. 旧 VPS から本番 VPS への HTTPS GET probe を `curl -s https://tenmon-ark.com/api/health`
   で 1 回確認 (旧 VPS への write はしない)
5. 旧 VPS で不足ランタイムがあれば、PREP カード側で **インストール方式の設計のみ** 行う
   (本カードと PREP カードでは pip install / apt install を実施しない /
   実施する場合は別カード `CARD-OLDVPS-RUNTIME-PROVISION-V1` で物理的に分離)
6. `git clone` の前段として、旧 VPS 既存配置 (`/opt/`, `~/`) に
   `tenmon-automation` 名衝突がないことを確認

### 12-3. 次カード呼称
**`CARD-DOCTOR-V2-OLD-VPS-MIGRATION-PREP-V1`**
種別: PREP only (clone も実施しない / 設計と env 確定のみ)

その後の Phase 3 で `CARD-DOCTOR-V2-OLD-VPS-DRYRUN-V1` (clone + 手動 1 回実行) に
進行する。

### 12-4. 全体ロードマップ再掲
```
Phase 1: CARD-DOCTOR-V2-OLD-VPS-MIGRATION-OBSERVE-V1   ← 本カード (完了)
Phase 2: CARD-DOCTOR-V2-OLD-VPS-MIGRATION-PREP-V1
Phase 3: CARD-DOCTOR-V2-OLD-VPS-DRYRUN-V1
Phase 4: CARD-FEEDBACK-LOOP-CARD-GENERATION-V1
Phase 5: CARD-IROHA-MC-CONNECTION-AUDIT-V1
Phase 6: CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1
```
保留: `CARD-IROHA-NOTION-STRUCTURE-WRITE-V1` /
`CARD-DANSHARI-JAPANESE-TONE-DISTILL-V1` /
`CARD-TENMON-TONE-POLICY-RUNTIME-V1` /
`CARD-CHAT-PERSONA-RUNTIME-WIRING-V1` (OS 基盤完成後に再開)。

---

## 付記: プライバシ / セキュリティ規律

- token / API key / ssh 鍵パス / フル hostname は本書に **混入させない**
  (旧 VPS / 本番 VPS のいずれも `sha8(<host>)` のみで参照)
- 本書の `host_sha8: 5c7f8169` は本番 VPS のもの (旧 VPS は env 未設定のため未記録)
- observer 出力 `automation/out/oldvps_migration_observer_latest.json` も同じ規律に従う
- 旧 VPS 内のファイル本文は記録しない (パスとサイズのみが許容)

---

## 付記: 副作用ゼロ確認 (本カード実行後)

| 確認項目 | 結果 |
|----------|------|
| 本番 VPS DB (`kokuzo.sqlite`) 改変 | なし (read のみ) |
| 本番 VPS systemd unit 改変 | なし |
| 本番 VPS nginx 改変 | なし |
| 本番 VPS journalctl への WARN/ERROR 注入 | なし |
| 旧 VPS への file write | **なし** (env 未設定のため ssh 自体が走っていない) |
| 旧 VPS systemd / cron 登録 | **なし** |
| 旧 VPS 既存サービス停止・改変 | **なし** |
| 双方向 rsync / scp / clone / pull / push | **なし** |
| pip install / apt install | **なし** |
| Notion API write | **なし** |

---

カード完了条件 (acceptance 12 項) は本書 + observer JSON +
`automation/tenmon_oldvps_migration_observer_v1.py` の三点で充足する。
TENMON 裁定後、Phase 2 (PREP) に進行する。
