# DOCTOR_V2_OLD_VPS_MIGRATION_PREP_V1

カード: `CARD-DOCTOR-V2-OLD-VPS-MIGRATION-PREP-MANUAL-OBSERVE-V1`
Phase: 2 (PREP / OBSERVE / 設計のみ — 手動観測ベース)
種別: 手動執筆 (TENMON が Mac ターミナルから取得した一次証拠を反映)
verdict: **GREEN** (DRYRUN 進行条件 9/9 充足 + TENMON 裁定 3 項待ち)

> プライバシ規律: 本書では旧 VPS の **IP は記載しない**。
> hostname `x162-43-90-247` は TENMON 裁定で記録可と明示された範囲のみで参照する。
> ssh 鍵パス / token / API key は一切記載しない。

---

## 1. 背景と方針修正 (旧版 PREP からの転換理由)

### 1-1. 前カード履歴
| カード | 結果 |
|--------|------|
| `CARD-DOCTOR-V2-PHASE-A-NATIVE-V1` | doctor v2 本番 VPS 実装完了 (`commit 688c6d21`、YELLOW / critical 0 / acceptance PASS) |
| `CARD-IROHA-KOTODAMA-SOURCE-OBSERVE-V1` | L1〜L5 connected 100% |
| `CARD-IROHA-NOTION-STRUCTURE-COMPLEMENT-V1` | 5 章設計確定済み |
| `CARD-DOCTOR-V2-OLD-VPS-MIGRATION-OBSERVE-V1` | PASS (YELLOW / OLDVPS env missing のみ / `commit e5132ca8`) |

### 1-2. 旧版 PREP 計画の前提と崩壊点
旧版 PREP (`CARD-DOCTOR-V2-OLD-VPS-MIGRATION-PREP-V1`) は **本番 VPS から旧 VPS へ
read-only ssh で観測する** 経路を前提にしていた。本観測の途中で以下が判明:

- **本番 VPS → 旧 VPS の ssh は不可** (`Permission denied (publickey)`)
- 本番 VPS 側に存在する既存 ssh 鍵は別経路 (NAS / GitHub 等) 用で発行されたものであり、
  旧 4GB VPS の `authorized_keys` には登録されていない
  (鍵パスはセキュリティ規律により本書に記載しない)
- カード規定により「ssh 鍵新規発行禁止」「自動修復禁止」のため、本番 VPS 側で
  鍵を整備して旧 VPS にアクセスする経路は **取れない**

### 1-3. 方針修正
旧版 PREP は破棄し、本カード `CARD-DOCTOR-V2-OLD-VPS-MIGRATION-PREP-MANUAL-OBSERVE-V1`
で置換する。新方針:

| 項目 | 旧 PREP (破棄) | 本カード PREP MANUAL OBSERVE V1 |
|------|--------------|-------------------------------|
| 観測経路 | 本番 VPS → 旧 VPS ssh | TENMON が Mac → 旧 VPS で取得した実測ログ |
| Cursor の役割 | observer 実行 | 一次証拠の docs 化と設計確定のみ |
| 旧 VPS 接触 | あり (read-only ssh) | **ゼロ** |
| 本番 VPS 接触 | あり | 本書執筆と DB / api/health の read のみ |
| 出力 | observer JSON + docs | docs のみ (本書 1 ファイル) |

この転換で「本番 VPS → 旧 VPS 経路を物理的に開けない」という isolation 原則
を実装段階でも担保した (将来 DRYRUN でも本番 → 旧 ssh は使わない方針が固まる)。

---

## 2. 本番 VPS → 旧 VPS SSH 不可 / Mac → 旧 VPS SSH 可 の事実

### 2-1. 確定事実
| 経路 | ssh 接続 | 用途 |
|------|---------|------|
| 本番 VPS (`5c7f8169` sha8) → 旧 VPS (`x162-43-90-247`) | **不可** (publickey 拒否) | 開けない (本カード以降も) |
| Mac (TENMON ローカル) → 旧 VPS (`x162-43-90-247`) | **可** (TENMON 実測済み) | 観測 / DRYRUN 時の最小持ち込み |
| 旧 VPS → 本番 VPS (`tenmon-ark.com`) | **可** (HTTPS GET / 本書 §8) | 将来 Automation OS が本番を観測する経路 |
| 旧 VPS → 本番 VPS (ssh) | 検討せず (本カードでも開けない) | 当面 isolation 維持 |

### 2-2. 帰結
- 本書のすべての旧 VPS 観測値は **TENMON が Mac から取得した一次証拠** であり、
  Cursor / 本番 VPS は旧 VPS に一切アクセスしていない (副作用ゼロ自明)
- DRYRUN 段階でも、旧 VPS への持ち込みは **TENMON が Mac 経由 scp** で行う
  (Mac → 旧 VPS。本番 → 旧 経路は使わない)
- 本書は手動執筆のみで、observer スクリプトは **書き起こさない**
  (旧版 PREP で作った observer は env 待ちのまま `e5132ca8` に commit 済み /
   本書では使わない)

---

## 3. 旧 VPS OS / kernel / architecture

TENMON が Mac から `ssh x162-43-90-247` で取得 (一次証拠):

| 項目 | 値 |
|------|-----|
| hostname | `x162-43-90-247` |
| user | `root` |
| OS | Ubuntu 22.04.5 LTS |
| kernel | 5.15.0-171-generic |
| arch | x86_64 |

本番 VPS との比較:

| 項目 | 旧 VPS | 本番 VPS (`5c7f8169`) | 整合 |
|------|--------|----------------------|------|
| OS | Ubuntu 22.04.5 LTS | Ubuntu 22.04.2 LTS | ◯ 22.04 系で整合 |
| kernel | 5.15.0-171-generic | 5.15.0-171-generic | ◯ 完全一致 |
| arch | x86_64 | x86_64 | ◯ 完全一致 |

→ **OS バイナリ / Python wheel / sqlite ABI が共通** に振る舞う前提が成立する。

---

## 4. 旧 VPS disk / memory / swap / load

TENMON 実測値:

### 4-1. Disk
| パス | total | used | available | use% |
|------|-------|------|-----------|------|
| `/` (root) | 194 G | 26 G | **168 G** | 14% |
| `/opt` | 44 G | — | — | — |
| `/var/log` | 5.2 G | — | — | — |
| `/opt/tenmon-ark-data/nas` (NAS mount) | 107 G | — | **96 G** | — |

### 4-2. Memory
| 項目 | 値 |
|------|-----|
| total | 3.8 GiB |
| used | 355 MiB |
| **available** | **3.2 GiB** |
| swap total | 2.0 GiB |
| swap used | almost unused |

### 4-3. Load
低負荷で安定稼働中。

### 4-4. 解釈
- root に **168 GB の余裕** → Automation OS の月 ~100 MB 想定に対し 1700 倍の余裕
- メモリ available **3.2 GiB** / Python observer の常駐は 50〜100 MB 想定 →
  3 〜 6 % 程度 / 余裕あり
- swap は almost unused → メモリ pressure が無い (本番 VPS の swap pressure と対照的)
- `/opt` 44 GB は使用済みストレージで、既存 tenmon 系資産が同居している
  (詳細は §6) — Automation OS 用の `/opt/tenmon-automation/doctor_v2/` は
  既存サブツリーと完全分離する設計のため、`/opt` の現状容量は問題にならない

---

## 5. 旧 VPS runtime

| ランタイム | 旧 VPS バージョン | 本番 VPS | 整合 |
|-----------|-------------------|---------|------|
| python3 | 3.10.12 | 3.10.12 | ◯ 完全一致 |
| git | 2.34.1 | 2.34.1 | ◯ 完全一致 |
| curl | 7.81.0 | 7.81.0 | ◯ 完全一致 |
| sqlite3 | 3.37.2 | 3.37.2 | ◯ 完全一致 |
| jq | 1.6 | 1.6 | ◯ 完全一致 |
| node | v22.21.0 | v22.22.0 | ◯ 同マイナー (doctor v2 では node 不要) |

→ **doctor v2 が要求するすべてのランタイムが揃っている**。
   pip install / apt install / npm install は **不要**。
   本カードと DRYRUN カードでも install は実施しない。

`stdlib only` 原則 (json / subprocess / pathlib / urllib.request / sqlite3 / re /
datetime / argparse / hashlib / os / collections / glob) は Python 3.10.12 で
すべてカバーされている。

---

## 6. /opt 配置と既存資産

TENMON 実測の `/opt` 直下:

| ディレクトリ | 役割 (推定) | 本カードでの扱い |
|-------------|-----------|----------------|
| `/opt/tenmon-automation` | (Automation 用候補) | doctor_v2/ サブディレクトリのみ追加候補 |
| `/opt/tenmon-automation/tenmon-ark` | 既存サブツリー | **触らない** |
| `/opt/tenmon-ark` | 既存配置 | **触らない** |
| `/opt/tenmon-ark-data` | DB / NAS mount 親 | **変更禁止** (本番 DB 領域類似) |
| `/opt/tenmon-ark-live` | 既存配置 | **触らない** |
| `/opt/tenmon-ark-repo` | 既存 clone repo | **上書き禁止** |
| `/opt/tenmon-ark-repo.backup.20260131_150046` | 過去 backup | 触らない |
| `/opt/tenmon-ark-seal` | 既存配置 | **触らない** |
| `/opt/tenmon-chat-core` | 既存配置 | **触らない** |
| `/opt/tenmon-corpus` | 既存配置 | **触らない** |
| `/opt/tenmon-migrate` | 既存配置 | **触らない** |

### 帰結
- `/opt/tenmon-automation` は **既に存在** している (作成不要)
- その配下の `tenmon-ark` も既存 → **触らない**
- 本カードでは旧 VPS への mkdir / 書き込みを **一切しない**
- DRYRUN カードで `/opt/tenmon-automation/doctor_v2/` (新規) と
  `/opt/tenmon-automation/out/` (新規) を **TENMON が Mac 経由で最小作成** する

---

## 7. 既存 services / timers / cron

### 7-1. running services (TENMON 実測)
| service | state |
|---------|-------|
| `nginx.service` | active running |
| `tenmon-ark-api.service` | **active running** (旧版アーク API) |
| `tenmon-nas-watch.service` | active running (NAS 監視) |
| `tailscaled.service` | active running |
| `ssh.service` | active running |

### 7-2. running timers (TENMON 実測 / 抜粋)
| timer | 用途 (推定) |
|-------|-----------|
| `tenmon-applylog-pulse.timer` | applylog pulse |
| `tenmon-nas-health.timer` | NAS health check |
| `tenmon-nas-sync-card.timer` | NAS sync card |
| `tenmon-selfheal.timer` | self-heal |
| `tenmon-selfimprove-collect.timer` | self-improve collector |
| `tenmon-backup-to-nas.timer` | backup to NAS |
| `tenmon-ingest-nightly.timer` | nightly ingest |
| `tenmon-runner.timer` | runner |
| `tenmon-runner-term.timer` | runner term |
| `tenmon-log-ttl.timer` | log TTL |
| (他) | (TENMON 実測で 10+ timer 稼働中を確認) |

### 7-3. 帰結
- 旧 4GB VPS は **既に旧天聞アーク系の自動化基地として運用中**
- これらは Automation OS 移行前から稼働しており、**触らない**
- 本カード / DRYRUN カードでは
  `tenmon-*.service` `tenmon-*.timer` を一切 stop / start / restart / enable /
  disable / edit しない
- doctor v2 用の新規 systemd unit / timer / cron は **DRYRUN カードでも登録しない**
  (DRYRUN は手動 1 回実行のみ)

---

## 8. 旧 VPS → 本番 VPS HTTPS 接続性

TENMON が Mac 経由で旧 VPS にログインし、旧 VPS から `curl` で取得 (一次証拠):

| URL | HTTP | 用途 |
|-----|------|------|
| `https://tenmon-ark.com/api/health` | **200** | doctor v2 readiness probe |
| `https://tenmon-ark.com/pwa/` | **200** | PWA frontend probe |
| `https://tenmon-ark.com/pwa/evolution` | **200** | 進化ログ probe |

### 8-1. 認証付き endpoint (DRYRUN で確認予定)
| URL | auth | 用途 |
|-----|------|------|
| `/api/mc/vnext/claude-summary` | `TENMON_MC_CLAUDE_READ_TOKEN` | doctor v2 acceptance verdict |
| `/api/mc/vnext/intelligence` | 同上 | doctor v2 enforcer / iroha 760 字 metric |
| `/api/feedback/history` | 同上 | feedback observer (46 records) |

### 8-2. 帰結
- 旧 VPS → 本番 VPS は **HTTPS GET で十分** (前カード OBSERVE での A+B 推奨を実証)
- ssh 経路 (C) を開く必要は **ない**
- TLS / DNS / nginx の経路はすべて稼働 (200 確認) → ネットワーク層の障害なし

---

## 9. 旧 VPS は 4GB で足りるかの判定

### 9-1. 必須リソースと充足状況

| リソース | doctor v2 要求 | 旧 VPS 実測 | 充足 |
|----------|---------------|-----------|------|
| メモリ available | ~100 MB ピーク | **3.2 GiB** | ◎ 32 倍以上 |
| swap | あれば良い | 2.0 GiB / unused | ◎ |
| disk free (`/`) | ~100 MB/月 | **168 GB** | ◎ 1700 倍以上 |
| Python | 3.10.x stdlib | 3.10.12 | ◎ 完全一致 |
| sqlite3 | 推奨 | 3.37.2 | ◎ |
| curl | 必須 | 7.81.0 | ◎ |
| jq | 推奨 | 1.6 | ◎ |
| HTTPS to prod | 必須 | 200 OK 3 endpoint | ◎ |

### 9-2. 同時実行時の見積もり (将来観測群)
- doctor v2 hourly + feedback daily + iroha weekly + iroha-notion weekly
- ピーク時 4 process 並行 = ~400 MB
- 旧 VPS available 3.2 GiB の **12.5%** → 余裕あり

### 9-3. 既存 timer との競合余地
- 旧 VPS には既に 10+ tenmon-*.timer が稼働中 (§7)
- これらが同時 fire するのは深夜 / 毎時境界に集中する可能性
- 設計対策 (将来 DRYRUN/SCHEDULE カードで反映):
  - doctor v2 timer は `OnCalendar=*:17` (毎時 17 分起点) のように **既存 timer と
    タイミングを意図的にずらす**
  - 並行実行を OS が直列化したとしても 1 process あたり数秒で終わるため影響軽微

### 9-4. 判定
**Yes — 旧 4GB VPS は doctor v2 を含む Automation OS 基地として継続可能**

---

## 10. doctor v2 配置先の推奨

### 10-1. 設計図

```
/opt/tenmon-automation/                 (既存 / 触らない)
├── tenmon-ark/                         (既存サブツリー / 触らない)
├── doctor_v2/                          (新規 / DRYRUN で TENMON 作成)
│   ├── tenmon_doctor_v2.py
│   └── dangerous_script_denylist_v1.json
├── out/                                (新規 / DRYRUN で TENMON 作成)
│   ├── doctor_v2_report_latest.json
│   ├── doctor_v2_report_latest.md
│   └── doctor_v2_next_card_suggestions.md
└── log/                                (新規任意 / DRYRUN で TENMON 作成)
    └── doctor_v2_run.log
```

### 10-2. 推奨理由
| 候補 | score | 評価 |
|------|-------|------|
| **`/opt/tenmon-automation/doctor_v2/`** | **9** | ◎ 既存ディレクトリ配下 / 既存サブツリーと完全分離 / `/opt/tenmon-*` 命名整合 |
| `~/tenmon-automation/` | 6 | △ user 完結だが旧 VPS は既存 root 運用 / 統一性なし |
| `/var/lib/tenmon-automation/` | 4 | △ /var/lib に新規ディレクトリは慣習薄 |
| 既存 `/opt/tenmon-ark-repo` 内 | 0 | × 既存 repo 上書き禁止 |

### 10-3. mkdir / 配置時の制約 (DRYRUN カード執行条件)
- `mkdir /opt/tenmon-automation/doctor_v2/` は **TENMON が Mac 経由 ssh で実行**
- 所有者・パーミッションは `/opt/tenmon-automation` の既存と揃える
  (chmod / chown を本カード / DRYRUN カードで明示しない / 既定継承)
- 配置先が既に存在しないことを Mac から `ls /opt/tenmon-automation/doctor_v2/`
  で確認してから作成する (DRYRUN チェックリスト §13)

---

## 11. 持ち込むファイル / 持ち込まないファイル

### 11-1. 持ち込む (最小 2 ファイル)
| 本番 VPS パス | 旧 VPS パス | 役割 |
|------------|-----------|------|
| `/opt/tenmon-ark-repo/automation/tenmon_doctor_v2.py` | `/opt/tenmon-automation/doctor_v2/tenmon_doctor_v2.py` | doctor v2 本体 |
| `/opt/tenmon-ark-repo/automation/dangerous_script_denylist_v1.json` | `/opt/tenmon-automation/doctor_v2/dangerous_script_denylist_v1.json` | denylist (本書執筆時点で本番 VPS にも未生成。DRYRUN カード前段で `CARD-DANGEROUS-SCRIPT-DENYLIST-CENTRAL-JSON-V1` を経由するか、または doctor v2 内 `DENY_TOKENS` のみで運用するかは TENMON 裁定) |

> note: 現状 (本カード時点) では central denylist JSON が **本番 VPS にも未生成**
> (前カード observer で確認、5 observer 内 hardcode のみ)。
> DRYRUN では doctor v2 本体の embedded `DENY_TOKENS` だけで動作可能なため、
> 厳密には **持ち込み 1 ファイルでも DRYRUN は成立する**。
> 本書では「2 ファイル想定」とするが、TENMON 裁定で 1 ファイルでも可とする。

### 11-2. 持ち込まない (明示)
| 種別 | 例 | 理由 |
|------|-----|------|
| DB | `kokuzo.sqlite` | 本番 DB は持ち込まない (旧 VPS は HTTPS で本番から read) |
| 正典資料 | `iroha_kotodama_hisho.json` 等 | iroha 観測は将来カード / 本カードと DRYRUN では不要 |
| token / API key | `TENMON_MC_CLAUDE_READ_TOKEN` 等 | env 直書きのみ / commit 禁止 |
| ssh 鍵 | 任意の `id_*` | 新規鍵発行禁止 / 持ち込まない |
| chat エンジン | `chat.ts` / `api/src/` | doctor v2 は HTTPS GET のみで動作 / 不要 |
| frontend | `web/src/` | 同上 |
| nginx / systemd unit | `*.service` `*.timer` | 旧 VPS で systemd 登録しない方針 (本カード規定) |
| 他の automation スクリプト | feedback observer / iroha observer 等 | 後続カードで段階的に持ち込む / 本 DRYRUN では doctor v2 単体 |

### 11-3. 持ち込み方式
| 方式 | 評価 | 推奨 |
|------|-----|------|
| **A: TENMON が Mac 経由 scp (Mac → 旧 VPS)** | ◎ | **推奨** |
| B: 旧 VPS で `git clone` | × 広範すぎる / 既存 repo backup と命名衝突リスク | 不採用 |
| C: TENMON が Mac で本番 VPS から内容を取得し旧 VPS に貼り付け | ○ 緊急時バックアップ手段 | 副次案 |
| D: 本番 VPS → 旧 VPS への scp / rsync | × **ssh 不可のため使えない** (本書 §2) | 物理的に不可 |

採用: **方式 A** (Mac → 旧 VPS の scp。Mac 上での `scp /tmp/<file> root@x162-43-90-247:/opt/tenmon-automation/doctor_v2/`)。
本番 → 旧 経路は **永続的に開けない**。

---

## 12. 既存 tenmon サービスとの衝突回避方針

### 12-1. 衝突源の棚卸 (§7 ベース)
| 既存資産 | 衝突源 | 回避策 |
|---------|-------|--------|
| `tenmon-ark-api.service` | 名前衝突 / port 衝突 | doctor v2 は service を作らない / port を listen しない |
| `tenmon-nas-watch.service` | 同上 | 同上 |
| `nginx.service` | reverse proxy | doctor v2 は HTTP server を立てない |
| `tenmon-*.timer` (10+) | OnCalendar 競合 | DRYRUN は手動実行 / 将来 timer 化時は時刻ずらし設計 (§9-3) |
| `/opt/tenmon-ark-repo` | path 上書き | doctor v2 は `/opt/tenmon-automation/doctor_v2/` のみ |
| `/opt/tenmon-automation/tenmon-ark/` | サブツリー上書き | `doctor_v2/` という別サブディレクトリ |
| `/opt/tenmon-ark-data` (DB / NAS) | 書き込み事故 | doctor v2 は HTTPS のみ / DB に直接触らない |

### 12-2. 厳守ルール (本カード以降のすべての旧 VPS 操作で)
```
✗ tenmon-ark-api.service       触らない
✗ tenmon-nas-watch.service     触らない
✗ nginx.service                触らない
✗ tenmon-*.timer               触らない (10+ 稼働中)
✗ /opt/tenmon-ark-repo         上書き禁止
✗ /opt/tenmon-ark-data         変更禁止 (DB / NAS)
✗ /opt/tenmon-ark-live         変更禁止
✗ /opt/tenmon-ark-seal         変更禁止
✗ /opt/tenmon-chat-core        変更禁止
✗ /opt/tenmon-corpus           変更禁止
✗ /opt/tenmon-migrate          変更禁止
✗ /opt/tenmon-automation/tenmon-ark/   触らない (既存サブツリー)
✗ /opt/tenmon-ark-repo.backup.* 触らない
✓ /opt/tenmon-automation/doctor_v2/   新規作成 (DRYRUN カード)
✓ /opt/tenmon-automation/out/         新規作成 (DRYRUN カード)
✓ /opt/tenmon-automation/log/         新規作成 (DRYRUN カード / 任意)
```

### 12-3. doctor v2 の自己制限
- doctor v2 は **READ-ONLY observer** であり、自身の `out/` 配下にしか書き込まない
- self-check (`DENY_TOKENS`) で `systemctl restart` `nginx -s` `git push/pull` 等を
  起動時に拒否する設計が embedded 済み
- 旧 VPS で実行されても、誤って既存サービスを stop / restart させるコードパスが
  **ソースレベルで存在しない** (PROD 側 commit `e5132ca8` の前段で確認済み)

---

## 13. 次カード DRYRUN へ進む条件

### 13-1. チェックリスト (本カード時点で 9 充足 / TENMON 裁定 3 待ち)

```
☑ 1.  旧 VPS OS / メモリ / 容量が doctor v2 実行に十分 (§4 / §9)
☑ 2.  Python3 + 必要 stdlib が揃っている (§5 / 3.10.12)
☑ 3.  git / curl / sqlite3 / jq が揃っている (§5 / 全揃)
☑ 4.  旧 VPS から本番 VPS への HTTPS GET 成功
       (/api/health / /pwa/ / /pwa/evolution = 200) (§8)
☑ 5.  既存 tenmon サービスとの衝突回避方針が明確 (§12)
☑ 6.  配置先 /opt/tenmon-automation/doctor_v2/ が確定 (§10)
☑ 7.  持ち込みファイル一覧が確定
       (doctor v2 本体 + denylist の 2 ファイル想定 / 1 ファイルでも可) (§11)
☑ 8.  持ち込み方式が確定 (Mac 経由 scp = 方式 A) (§11)
☑ 9.  持ち込まないリストが確定 (§11)
☐ 10. TENMON が PREP の結果を確認・裁定済み (本カード提出後)
☐ 11. 旧 VPS の /opt/tenmon-automation/doctor_v2/ がまだ存在しないことを
       Mac から確認 (DRYRUN 直前 / 1 行確認)
☐ 12. DRYRUN で systemd / cron / timer 登録しない方針に同意 (DRYRUN 前提)
```

### 13-2. DRYRUN カード (`CARD-DOCTOR-V2-OLD-VPS-DRYRUN-V1`) の最小スコープ

```
DRYRUN で許可される操作 (Mac 経由 / 旧 VPS 上):
  ✓ mkdir /opt/tenmon-automation/doctor_v2/         (1 回)
  ✓ mkdir /opt/tenmon-automation/out/               (1 回)
  ✓ scp <file> root@x162-43-90-247:.../doctor_v2/   (2 ファイル)
  ✓ python3 /opt/tenmon-automation/doctor_v2/tenmon_doctor_v2.py observe
        (手動 1 回実行)
  ✓ ls / cat / stat による結果確認 (read-only)

DRYRUN で禁止される操作:
  ✗ systemd unit 作成 / enable / start
  ✗ timer 作成 / enable / start
  ✗ cron 登録
  ✗ 自動再実行 / loop / watch
  ✗ 既存 /opt/tenmon-* への書き込み
  ✗ 既存 service / timer の stop / start / restart
  ✗ /opt/tenmon-ark-data 配下への書き込み
  ✗ DB write (本番 / 旧 / NAS)
  ✗ 本番 VPS から旧 VPS への ssh / scp (経路なし)
  ✗ pip install / apt install / npm install
```

---

## 14. 拡張・新規 VPS 契約の判断

### 14-1. 暫定裁定

```
旧 4GB VPS 拡張:    まだ不要
新規 VPS 契約:      まだ不要
旧 4GB VPS 継続:    可能
```

### 14-2. 根拠
| 観点 | 実測 | 充足度 |
|------|------|------|
| メモリ available | 3.2 GiB | doctor v2 + 観測群 4 並行で 12.5% / 余裕 |
| swap | 2.0 GiB / unused | バッファ十分 |
| root disk | 168 GB available | 月 ~100 MB 想定の 1700 倍 |
| ランタイム | 全揃 (python/git/curl/sqlite3/jq/node) | install 不要 |
| 本番 → 旧 ssh | 不可 (publickey) | 当面不要 (HTTPS で十分) |
| 旧 → 本番 HTTPS | 200 OK 3 endpoint | 既に成立 |

### 14-3. 将来再評価する条件
- doctor v2 + feedback observer + iroha observer + iroha notion structure
  observer + 将来 audit 系をすべて hourly 実行した際にメモリ available が
  500 MB を切る
- `/opt` の使用率が 80% を超える
- 既存 tenmon-*.timer との競合で旧 VPS の load average が 1 分平均で 2.0 を超える
- doctor v2 の月間 `out/` 容量が 500 MB を超える

これらは DRYRUN 後の hourly 運用が安定した時点で再観測する。

---

## 15. TENMON 裁定用まとめ

### 15-1. 本カード結論

| 軸 | 結論 |
|----|------|
| 旧 4GB VPS は Automation OS 基地として継続可能か | **Yes** |
| doctor v2 配置先 | **`/opt/tenmon-automation/doctor_v2/`** |
| 持ち込みファイル件数 | **2** (本体 + denylist) / 1 でも DRYRUN 成立 |
| 持ち込み方式 | **方式 A: Mac → 旧 VPS scp** |
| 本番 VPS → 旧 VPS ssh | **永続的に開けない / 開けない方針** |
| 既存 tenmon サービス改変 | **ゼロ** |
| 旧 VPS 拡張 / 新規契約 | **不要** |
| DRYRUN 進行条件 | **9/12 充足** (残 3 は TENMON 裁定 + DRYRUN 直前確認) |

### 15-2. 推奨次カード
**`CARD-DOCTOR-V2-OLD-VPS-DRYRUN-V1`** (上記 §13-2 の最小スコープ)

### 15-3. TENMON 裁定で確認すべき 3 項
1. PREP MANUAL OBSERVE V1 の結論を承認するか
2. DRYRUN 実行直前に Mac から `ls /opt/tenmon-automation/doctor_v2/` で
   未存在を確認することの同意
3. DRYRUN で systemd / cron / timer / 自動再実行を **登録しない** という方針への同意

### 15-4. 副作用ゼロ確認 (本カード実行後)

| 項目 | 結果 |
|------|------|
| 旧 VPS への ssh (本番 VPS / Cursor から) | **ゼロ** (経路自体不可 / 本書執筆中も試行なし) |
| 旧 VPS への file write / mkdir | **ゼロ** |
| 旧 VPS への scp / rsync / clone / pull / install | **ゼロ** |
| 旧 VPS systemd / cron 登録 | **ゼロ** |
| 旧 VPS 既存サービス・timer の停止・改変 | **ゼロ** |
| 本番 VPS DB write | **ゼロ** (read のみ) |
| 本番 VPS systemd / nginx 改変 | **ゼロ** |
| 本番 VPS `/api/health` | **ok=true ready=true gitSha=b5a5c2c8** (前カードで確認) |
| pip install / apt install | **ゼロ** |
| Notion API write | **ゼロ** |
| 本書への token / API key / ssh 鍵パス / IP の混入 | **ゼロ** (hostname `x162-43-90-247` のみ TENMON 裁定範囲で記録) |

---

## 付記: プライバシ / セキュリティ規律

- token / API key / ssh 鍵パス / 旧 VPS の **IP (生数値)** を本書に **混入させない**
- hostname `x162-43-90-247` は TENMON 裁定で「公開ホスト名範囲 / 記録可」と明示された
  (hostname の数値部分は IP 由来だが、TENMON 裁定で記録範囲に含めると明示された
   ため hostname としてのみ使用 / 単独 IP 表記はしない)
- ssh 鍵パスは本番 VPS / Mac / 旧 VPS のいずれも記載しない
- 既存 systemd unit 名 / timer 名 / `/opt/` ディレクトリ名は機密でないため記録可
- 本書の `host_sha8: 5c7f8169` は本番 VPS のものであり、旧 VPS のハッシュは
  記録しない (hostname を直接 §3 で書いているため二重表記不要)

---

カード完了条件 (acceptance 12 項) は本書 1 ファイルで充足する。
TENMON 裁定後、Phase 3 (DRYRUN) に進行する。
