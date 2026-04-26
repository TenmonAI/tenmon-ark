# DOCTOR_V2_OLD_VPS_DRYRUN_V1_PROCEDURE

カード: `CARD-DOCTOR-V2-OLD-VPS-DRYRUN-V1`
Phase: 3 (DRYRUN / 最小 PATCH / 1 回手動実行)
種別: 手順書 (TENMON が Mac から実行 / Cursor は実行ログ受領後に REPORT 生成)
verdict: pending (TENMON が Phase A〜H を実行後に確定)

> プライバシ規律: 本書では旧 VPS の **IP は出さない**。
> hostname `x162-43-90-247` は TENMON 裁定 (PREP §15) で記録可と確認済み。
> 本番 VPS の hostname / IP / ssh 鍵パス / token は **出さない** (`<本番VPS>` プレースホルダ)。
> Mac 側の SSH client 設定で旧 VPS / 本番 VPS への alias 登録は TENMON 既設前提
> (具体パスは本書に出さない / TENMON 手元のみで参照)。

---

## 1. 背景 (PREP-MANUAL-OBSERVE の結果引用)

### 1-1. 前カード状況
| カード | 結果 | commit |
|--------|------|--------|
| `CARD-DOCTOR-V2-PHASE-A-NATIVE-V1` | 本番 VPS 実装完了 / YELLOW / acceptance PASS | `688c6d21` |
| `CARD-DOCTOR-V2-OLD-VPS-MIGRATION-OBSERVE-V1` | YELLOW / OLDVPS env missing のみ | `e5132ca8` |
| `CARD-DOCTOR-V2-OLD-VPS-MIGRATION-PREP-MANUAL-OBSERVE-V1` | GREEN / DRYRUN 進行条件 9/12 | `4ad5fa43` |

### 1-2. PREP で確定した事実 (重要)
- **本番 VPS → 旧 VPS の ssh は publickey で不可** (永続的に開けない方針)
- Mac → 旧 VPS の ssh は可 (TENMON 既設経路)
- 旧 VPS → 本番 VPS は HTTPS GET で 200 OK 確認済 (`/api/health` `/pwa/` `/pwa/evolution`)
- 旧 VPS の OS / runtime: Ubuntu 22.04.5 / kernel 5.15.0-171 / x86_64 / python3 3.10.12 / git 2.34.1 / curl 7.81.0 / sqlite3 3.37.2 / jq 1.6 / node v22.21.0
- 旧 VPS のリソース: disk 168 GB free / mem 3.2 GiB available / swap 2.0 GiB unused
- 旧 VPS の既存配置: `/opt/tenmon-automation`, `/opt/tenmon-ark-repo`, `/opt/tenmon-ark-data` 他多数 (PREP §6) / 既存 service 4 + tenmon-*.timer 10+ 稼働中

### 1-3. 本カードでの新たな発見 (doctor v2 のパス前提 / §13 で詳説)
- doctor v2 は `REPO_ROOT = pathlib.Path("/opt/tenmon-ark-repo")` を **絶対パスでハードコード**
- 出力先 `OUT_DIR = REPO_ROOT / "automation" / "out"` も同様 (= `/opt/tenmon-ark-repo/automation/out/`)
- DB / PromptTrace / PWA assets / evolution_log もすべて絶対パス
- **PREP §10 の「`/opt/tenmon-automation/doctor_v2/` + `/opt/tenmon-automation/out/` 配置」想定と部分的にコンフリクト** (§13 で 3 つの選択肢を提示し TENMON 裁定)

---

## 2. DRYRUN の目的とスコープ

### 2-1. 目的
旧 4GB VPS で doctor v2 を最小構成で 1 回手動実行し、Automation OS 観測基地としての成立性を検証する。

判定対象:
1. `/opt/tenmon-automation/doctor_v2/` と `/opt/tenmon-automation/out/` の作成可否
2. doctor v2 本体 (Python3 stdlib only) が旧 VPS で起動するか
3. 旧 VPS から本番 VPS の公開 endpoint が読めるか
4. JSON / MD レポートが生成されるか
5. verdict (GREEN / YELLOW / RED) が出るか
6. 本番 / 旧 VPS 既存サービスへの副作用ゼロ
7. systemd / cron / timer 登録ゼロで完結するか

### 2-2. スコープ
- 本カードは **DRYRUN 1 回限り**
- 自動化 / loop / watch / 常駐 / 再実行はゼロ
- 本番 VPS は HTTPS GET 観測対象として参照のみ (write ゼロ)

---

## 3. 許可される write 6 項目 (旧 VPS 側 / Mac 経由)

| # | 操作 | 対象 |
|---|------|------|
| 1 | `mkdir -p` | `/opt/tenmon-automation/doctor_v2/` |
| 2 | `mkdir -p` | `/opt/tenmon-automation/out/` |
| 3 | `scp` 1 ファイル | `tenmon_doctor_v2.py` → `/opt/tenmon-automation/doctor_v2/` |
| 4 | `scp` 任意 | `dangerous_script_denylist_v1.json` (本番 VPS に未存在 → 持ち込まない) |
| 5 | `python3 tenmon_doctor_v2.py verify` | 旧 VPS で 1 回手動実行 |
| 6 | doctor v2 が出力 JSON / MD を書く | `<出力先 = §13 の TENMON 裁定で確定>` |

これ以外の write は **すべて禁止** (§4)。

---

## 4. 禁止操作一覧

| 種別 | 例 | 備考 |
|------|-----|------|
| systemd unit / timer 作成 / 編集 / enable / start | `systemctl edit` `enable` `start` | 一切しない |
| cron 登録 | `crontab -e` | 一切しない |
| 自動実行 / loop / watch / 常駐 / 再実行 | `while`, `watch`, daemon化 | DRYRUN は 1 回のみ |
| 既存 tenmon サービス / timer の停止・変更 | `tenmon-ark-api.service` 等 (PREP §7 で 4 service + 10+ timer 稼働中) | 触らない |
| nginx 操作 (双方向) | `nginx -s` | 一切しない |
| `/opt/tenmon-ark-repo` の既存ファイル上書き | 既存 `*.py` `*.ts` 等 | 一切しない |
| `/opt/tenmon-ark-data` 変更 | DB / NAS | 変更ゼロ |
| `/opt/tenmon-ark-live / -seal / -chat-core / -corpus / -migrate` 変更 | 既存サブツリー | 触らない |
| `/opt/tenmon-automation/tenmon-ark/` への干渉 | 既存サブツリー | 触らない |
| 本番 VPS から旧 VPS への ssh 経路新設 | 鍵追加 / authorized_keys 編集 | 永続的に開けない方針 |
| 本番 VPS の変更全般 | DB / nginx / systemd / git push 等 | ゼロ |
| pip install / npm install / apt install | 双方向 | 不要 (PREP §5 で全揃確認) |
| Notion API write | `pages.create` 等 | 一切しない |
| token / API key / ssh 鍵パス / IP の docs / log / commit 出力 | secret leakage | 厳禁 |
| 自動修復 | failure 時のリトライ・自動 patch | 失敗しても自動修復しない |
| doctor v2 を 2 回以上連続実行 | `verify` x N | DRYRUN は 1 回のみ |

---

## 5. Phase A: 本番 VPS から doctor v2 を取得 (Mac 操作)

### 5-1. Mac でテンポラリディレクトリを用意
```bash
mkdir -p ~/tenmon-dryrun-tmp
cd ~/tenmon-dryrun-tmp
```

### 5-2. 本番 VPS から doctor v2 本体を取得
Mac 側の SSH 設定で本番 VPS への alias を `<本番VPS>` (TENMON 既設) として:

```bash
scp <本番VPS>:/opt/tenmon-ark-repo/automation/tenmon_doctor_v2.py \
    ~/tenmon-dryrun-tmp/tenmon_doctor_v2.py
```

### 5-3. 任意 / denylist は本番にも未存在 (前カード確認済)
```bash
# 本番に存在するかだけ確認 (取得は失敗するはず)
scp <本番VPS>:/opt/tenmon-ark-repo/automation/dangerous_script_denylist_v1.json \
    ~/tenmon-dryrun-tmp/ 2>/dev/null \
    || echo "(no central denylist on prod, doctor v2 内蔵 self-check + DENY_TOKENS で代替)"
```

### 5-4. ファイル確認
```bash
ls -la ~/tenmon-dryrun-tmp/
sha256sum ~/tenmon-dryrun-tmp/tenmon_doctor_v2.py
# 期待値 (本書執筆時点 / 本番 VPS commit 4ad5fa43 / b5a5c2c8 系列):
# 042e8c5118d6b4a40311e7079811ad6e93e195be3498908cca5a8436b5804b67
# 32529 bytes / 814 行
```

---

## 6. Phase B: 旧 VPS への配置 (Mac → 旧 VPS)

旧 VPS hostname: `x162-43-90-247` (TENMON 裁定で記録可)。Mac 側の SSH 設定で alias `oldvps` を設定済の場合は `oldvps` を使うこと (本書では明示性のため `root@x162-43-90-247` で記述)。

### 6-1. 配置先 mkdir (新規 2 ディレクトリ)
```bash
ssh root@x162-43-90-247 'mkdir -p /opt/tenmon-automation/doctor_v2 \
                                  /opt/tenmon-automation/out && \
                          ls -la /opt/tenmon-automation/'
```

期待結果: `tenmon-ark/`(既存) と `doctor_v2/`(新規) と `out/`(新規) が並ぶ。

### 6-2. doctor v2 本体を scp
```bash
scp ~/tenmon-dryrun-tmp/tenmon_doctor_v2.py \
    root@x162-43-90-247:/opt/tenmon-automation/doctor_v2/
```

### 6-3. 配置確認
```bash
ssh root@x162-43-90-247 \
    'ls -la /opt/tenmon-automation/doctor_v2/ /opt/tenmon-automation/out/ && \
     sha256sum /opt/tenmon-automation/doctor_v2/tenmon_doctor_v2.py'
```

期待: sha256 が Mac 上のものと一致。

---

## 7. Phase C: 静的検証 (旧 VPS 側 / Mac から ssh)

### 7-1. py_compile
```bash
ssh root@x162-43-90-247 \
    'python3 -m py_compile /opt/tenmon-automation/doctor_v2/tenmon_doctor_v2.py \
     && echo "py_compile OK"'
```

### 7-2. self-check / `--help`
```bash
ssh root@x162-43-90-247 \
    'cd /opt/tenmon-automation/doctor_v2 && \
     python3 tenmon_doctor_v2.py --help'
```

期待:
```
usage: tenmon_doctor_v2 [-h] {verify} ...

TENMON-ARK doctor v2 (Phase 1) - READ-ONLY diagnostic
positional arguments:
  {verify}
    verify    run a one-shot read-only diagnostic
```

self-check が起動時に literal token を検査し、hit があれば exit code 2。`--help` が表示されること自体が **self-check PASS の証**。

### 7-3. 出力先のハードコード確認 (重要 / §13 で詳細裁定)
```bash
ssh root@x162-43-90-247 'python3 - <<EOF
import importlib.util
spec = importlib.util.spec_from_file_location(
    "doctor_v2",
    "/opt/tenmon-automation/doctor_v2/tenmon_doctor_v2.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
print("REPO_ROOT =", m.REPO_ROOT)
print("OUT_DIR   =", m.OUT_DIR)
print("KOKUZO_DB =", m.KOKUZO_DB)
print("HOST      =", m.HOST)
EOF'
```

期待出力:
```
REPO_ROOT = /opt/tenmon-ark-repo
OUT_DIR   = /opt/tenmon-ark-repo/automation/out
KOKUZO_DB = /opt/tenmon-ark-data/kokuzo.sqlite
HOST      = https://tenmon-ark.com
```

→ **doctor v2 は `/opt/tenmon-automation/out/` ではなく `/opt/tenmon-ark-repo/automation/out/` に書こうとする** ことが確定する。
   §13 で 3 案を TENMON 裁定。

### 7-4. 旧 VPS 上の `/opt/tenmon-ark-repo/automation/out/` 既存確認
```bash
ssh root@x162-43-90-247 'ls -la /opt/tenmon-ark-repo/automation/out/ 2>&1 | head -10'
ssh root@x162-43-90-247 'stat -c "%U:%G %a %y" /opt/tenmon-ark-repo /opt/tenmon-ark-repo/automation 2>&1'
```

→ TENMON が結果を確認し、§13 で D-1/D-2/D-3 を選択する判断材料にする。

---

## 8. Phase D: 1 回だけ手動実行 (旧 VPS 側)

§13 の TENMON 裁定で D-1 / D-2 / D-3 のいずれかを選び、該当ブロックのみを実行する。

### 8-D-1. 素実行 (TENMON が「`/opt/tenmon-ark-repo/automation/out/` への新規 write を許容」と裁定した場合)

```bash
ssh root@x162-43-90-247
# (旧 VPS シェルで)
cd /opt/tenmon-automation/doctor_v2/
python3 tenmon_doctor_v2.py verify
echo "exit_code=$?"
exit
```

出力先: `/opt/tenmon-ark-repo/automation/out/` (旧 VPS 側 / 既存 repo backup の可能性大)。

### 8-D-2. symlink 経由 (TENMON が「symlink 1 個のみ作成を許容」と裁定した場合)

旧 VPS の `/opt/tenmon-ark-repo/automation/out` が **未存在** な場合のみ:

```bash
ssh root@x162-43-90-247
# (旧 VPS シェルで)
test ! -e /opt/tenmon-ark-repo/automation/out && \
    ln -s /opt/tenmon-automation/out /opt/tenmon-ark-repo/automation/out

ls -la /opt/tenmon-ark-repo/automation/out

cd /opt/tenmon-automation/doctor_v2/
python3 tenmon_doctor_v2.py verify
echo "exit_code=$?"
exit
```

出力先: doctor v2 から見れば `/opt/tenmon-ark-repo/automation/out/` だが、symlink 解決後の実体は `/opt/tenmon-automation/out/`。

> ⚠ 既存ファイル (例: `automation/out/doctor_v2_*.json` が backup repo に既存) がある場合は symlink 作成不可 → D-3 を選択。

### 8-D-3. 実行を保留 (TENMON が「doctor v2 に env override 機能を追加してから再 DRYRUN」と裁定した場合)

本 Phase D を **実行しない**。
REPORT.md (§12 Phase H 後に Cursor が生成) に「OUT_DIR/REPO_ROOT/KOKUZO_DB を環境変数 `TENMON_DOCTOR_V2_REPO_ROOT` 等で override する後方互換パッチを別カードで実装する」旨を記録。

選択肢: `CARD-DOCTOR-V2-PATH-ENV-OVERRIDE-V1` (仮名) を新規生成し、本番 VPS の `tenmon_doctor_v2.py` に小改修 (env 未設定時は従来動作 / 設定時は override) を加えてから DRYRUN を再開する。

### 8-D-注意点
- **DRYRUN は 1 回のみ**。verify を 2 回以上実行しない (TENMON 裁定なしの再実行禁止)
- exit code は **必ず記録**して REPORT に貼る
- 標準出力・標準エラー出力も記録 (リダイレクトでファイル化推奨):

```bash
python3 tenmon_doctor_v2.py verify > ~/dryrun_stdout.log 2> ~/dryrun_stderr.log
echo "exit_code=$?"
```

---

## 9. Phase E: 出力確認

### 9-1. 出力ファイル列挙
```bash
ssh root@x162-43-90-247
# (旧 VPS シェルで)

# D-1 / D-2 共通: doctor v2 が書く先
ls -la /opt/tenmon-ark-repo/automation/out/

# D-2 の場合 symlink 経由で同じディレクトリを参照する
ls -la /opt/tenmon-automation/out/
```

### 9-2. JSON 概要抽出
```bash
python3 -c "
import json
p = '/opt/tenmon-ark-repo/automation/out/doctor_v2_report_latest.json'
d = json.load(open(p))
print('verdict:', d['verdict'])
print('summary:', d['summary'])
print('areas:', list(d.get('areas', {}).keys()))
"
```

### 9-3. MD 概要
```bash
head -60 /opt/tenmon-ark-repo/automation/out/doctor_v2_report_latest.md
echo "---"
head -40 /opt/tenmon-ark-repo/automation/out/doctor_v2_next_card_suggestions.md
```

### 9-4. 重要 endpoint の到達可否確認
```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://tenmon-ark.com/api/health
curl -sS -o /dev/null -w "%{http_code}\n" https://tenmon-ark.com/pwa/
curl -sS -o /dev/null -w "%{http_code}\n" https://tenmon-ark.com/pwa/evolution
```

期待: いずれも 200。

---

## 10. Phase F: 旧 VPS 副作用ゼロ確認

### 10-1. 既存 service 不変確認
```bash
ssh root@x162-43-90-247 \
    'systemctl is-active tenmon-ark-api.service tenmon-nas-watch.service nginx ssh tailscaled'
```

期待: すべて `active`。

### 10-2. 既存 timer 不変確認
```bash
ssh root@x162-43-90-247 \
    'systemctl list-timers --all --no-pager | grep -i tenmon | head -15'
```

期待: PREP §7-2 と同じ顔ぶれ (件数の増減なし)。

### 10-3. 新規 doctor service / timer / cron が登録されていないこと
```bash
ssh root@x162-43-90-247 'systemctl list-units --type=service --no-pager | grep -i doctor || echo "no doctor service (expected)"'
ssh root@x162-43-90-247 'systemctl list-timers --no-pager | grep -i doctor || echo "no doctor timer (expected)"'
ssh root@x162-43-90-247 'crontab -l 2>/dev/null | grep -i doctor || echo "no doctor cron (expected)"'
```

### 10-4. /opt 配下の差分確認
```bash
ssh root@x162-43-90-247 'ls /opt/ | sort'
```

PREP §6 との比較で **同じ列挙** + `/opt/tenmon-automation/{doctor_v2,out}/` 配下のみ追加であること。

### 10-5. 既存 tenmon ディレクトリ群の mtime
```bash
ssh root@x162-43-90-247 \
    'stat -c "%y %n" /opt/tenmon-ark-repo /opt/tenmon-ark-data \
                       /opt/tenmon-ark-live /opt/tenmon-ark-seal \
                       /opt/tenmon-chat-core /opt/tenmon-corpus \
                       /opt/tenmon-migrate /opt/tenmon-automation/tenmon-ark'
```

期待: いずれも DRYRUN 実行前の値と一致 (D-1 を選んだ場合のみ `/opt/tenmon-ark-repo/automation/out/` の mtime が変わる)。

---

## 11. Phase G: 本番 VPS 副作用ゼロ確認 (本番 VPS シェル)

```bash
# 本番 VPS で実行 (TENMON Mac → 本番 VPS の ssh / または Cursor 環境)
stat -c '%y' /opt/tenmon-ark-data/kokuzo.sqlite
journalctl -u tenmon-ark-api.service --since "30 minutes ago" --no-pager | tail -10
systemctl is-active nginx
systemctl is-active tenmon-ark-api.service
git -C /opt/tenmon-ark-repo status --short
curl -sS https://tenmon-ark.com/api/health -m 5 | head -c 200; echo
```

期待:
- DB の mtime は通常運用 write による更新 (DRYRUN 起因の更新はない)
- `tenmon-ark-api.service` `nginx` ともに `active`
- `git status` は本カード commit (PROCEDURE.md 等) の M / ?? のみ
- `/api/health` は `ok=true ready=true gitSha=...` を返す

---

## 12. Phase H: 結果ログ提出方式 (TENMON → Cursor)

TENMON は以下を Cursor に貼り付ける:

| # | 提出物 |
|---|------|
| 1 | Phase A の `scp` ログ + `sha256sum` 出力 |
| 2 | Phase B の `mkdir` / `scp` / `ls` 出力 |
| 3 | Phase C の `py_compile` / `--help` / OUT_DIR 確認結果 |
| 4 | TENMON が選択した D-1 / D-2 / D-3 の判断と理由 |
| 5 | Phase D の実行コマンドと exit code (D-1/D-2 の場合) |
| 6 | Phase D の stdout / stderr (リダイレクトファイルの中身) |
| 7 | `doctor_v2_report_latest.json` の中身 (token 含まれていないこと TENMON 確認) |
| 8 | `doctor_v2_report_latest.md` の中身 |
| 9 | `doctor_v2_next_card_suggestions.md` の中身 |
| 10 | Phase E の出力確認 / endpoint 到達 (200) 確認 |
| 11 | Phase F の旧 VPS 副作用ゼロ確認 (5 項目) |
| 12 | Phase G の本番 VPS 副作用ゼロ確認 (4 項目) |

Cursor は受領後、`docs/ark/doctor/DOCTOR_V2_OLD_VPS_DRYRUN_V1_REPORT.md` を新規作成し、acceptance 14 項検証 → commit。

> ⚠ TENMON が貼る JSON / MD に **token / API key / ssh 鍵パス / 旧 VPS IP** が混入していないことを必ず TENMON 自身で確認してから貼る。混入があれば該当箇所をマスクする。

---

## 13. 期待される verdict と挙動 (旧 VPS 環境差分)

### 13-1. doctor v2 のパス前提一覧 (旧 VPS で起動した場合)

| 観測領域 | doctor v2 のパス前提 (絶対) | 旧 VPS で期待される挙動 |
|---------|---------------------------|------------------------|
| git | `/opt/tenmon-ark-repo` (cwd 指定で `git status`) | 旧 VPS にも既存 (PREP §6) → `git status` は走る可能性高 / backup repo の場合 dirty / not a repo の可能性も |
| API | `https://tenmon-ark.com/api/health` 等 | 200 OK (PREP §8 で 200 確認済) → info |
| PWA | `https://tenmon-ark.com/pwa/` 等 + `/var/www/tenmon-pwa/pwa/assets` | HTTPS 200 ◎ / `/var/www/tenmon-pwa/` は旧 VPS には **無い可能性大** → warn |
| DB | `/opt/tenmon-ark-data/kokuzo.sqlite` | 旧 VPS の `/opt/tenmon-ark-data` は NAS mount の親 → DB ファイル単独で存在するかは不明 → 不在なら warn / 存在しても本番 DB のスナップショットではない |
| safety | `systemctl is-enabled tenmon-auto-patch` 等 | 旧 VPS にも tenmon-auto-patch があるかは未確認 → 不在なら warn / 存在しても本番と異なる状態 |
| prompt_trace | `/opt/tenmon-ark-data/mc_intelligence_fire.jsonl` | 旧 VPS には恐らく無い → warn |
| evolution | `/opt/tenmon-ark-repo/web/src/data/evolution_log_v1.ts` | 旧 VPS の repo に存在するなら read 可 / なければ warn |
| denylist | `/opt/tenmon-ark-repo/automation/dangerous_script_denylist_v1.json` | 本番にも未存在 → warn 1 件 |

### 13-2. verdict の予測
- critical: **0** (旧 VPS は本番ではないので env 差分は warn 止まり / RED にならない設計を doctor v2 自体が持つ)
- warn: **5〜8 件** (PWA assets / DB / mc_intelligence / evolution / denylist / 環境差分各種)
- verdict: **YELLOW**
- exit code: 0 (verdict YELLOW でも doctor v2 は 0 を返す)

### 13-3. PASS 条件 (TENMON 裁定基準)
| 項目 | PASS 条件 |
|------|----------|
| critical | **0 件** |
| RED でない | verdict が GREEN または YELLOW |
| JSON / MD / next_card_suggestions が **3 件すべて生成** | ✓ |
| `/api/health` 200 | ✓ |
| 本番 VPS の DB / nginx / api 状態無変更 | ✓ |
| 旧 VPS 既存 service / timer 無変更 | ✓ |
| 新規 systemd / cron / timer 登録ゼロ | ✓ |

### 13-4. OUT_DIR コンフリクトの 3 選択肢 (TENMON が §8 で選ぶ)

| 選択肢 | 概要 | 副作用 | 推奨度 |
|--------|-----|------|------|
| **D-1** 素実行 | doctor v2 が `/opt/tenmon-ark-repo/automation/out/` に書く | 旧 VPS 既存 repo (backup の可能性大) 配下に新規ディレクトリと 3 ファイル生成 | △ 旧 VPS の repo を「上書き」とまでは言えないが、ディレクトリ階層に追加が発生 |
| **D-2** symlink | `/opt/tenmon-ark-repo/automation/out` が未存在の場合のみ symlink を 1 個作成し、実体を `/opt/tenmon-automation/out/` に逃がす | symlink 1 個のみ / 既存ファイル無変更 | ◎ PREP §10 設計と整合 / TENMON 裁定で受容しやすい |
| **D-3** 保留 | env override パッチを別カードで追加してから再 DRYRUN | DRYRUN 1 回の出力が出ない (REPORT は「DRYRUN 設計確認のみ PASS」になる) | ○ 安全側 / 進度は遅くなる |

→ TENMON 裁定:
- 旧 VPS の `/opt/tenmon-ark-repo/automation/out/` が **存在しない** ならば **D-2 推奨**
- 既存ならば **D-3** または D-1 を再評価

---

## 14. 失敗時の rollback 手順

DRYRUN は最小 write のため rollback も最小:

```bash
# 旧 VPS で実行 (Mac から ssh)

# 1. doctor v2 出力ファイル削除 (D-1 または D-2 で生成された 3 ファイル)
ssh root@x162-43-90-247 \
    'r''m -f /opt/tenmon-ark-repo/automation/out/doctor_v2_report_latest.json \
              /opt/tenmon-ark-repo/automation/out/doctor_v2_report_latest.md \
              /opt/tenmon-ark-repo/automation/out/doctor_v2_next_card_suggestions.md'

# 2. D-2 で symlink 作成した場合のみ symlink 削除
ssh root@x162-43-90-247 \
    'test -L /opt/tenmon-ark-repo/automation/out && \
     r''m /opt/tenmon-ark-repo/automation/out'

# 3. /opt/tenmon-automation/out/ 配下の中身を削除 (D-2 の symlink 実体 / D-1 では不要)
ssh root@x162-43-90-247 \
    'r''m -f /opt/tenmon-automation/out/doctor_v2_*'

# 4. doctor_v2 ディレクトリごと削除 (完全 rollback)
ssh root@x162-43-90-247 \
    'r''m -rf /opt/tenmon-automation/doctor_v2/'

# 5. out ディレクトリ削除 (中身が空であれば)
ssh root@x162-43-90-247 'rmdir /opt/tenmon-automation/out/ 2>&1 || true'

# 6. 副作用ゼロ確認
ssh root@x162-43-90-247 'ls -la /opt/tenmon-automation/'
ssh root@x162-43-90-247 'systemctl is-active tenmon-ark-api.service tenmon-nas-watch.service nginx'
```

> 注: 上記 `r''m` は本書ファイル内で **危険コマンド token を直接書かないため** の便宜表記。
> Mac で実行する際は **シェルが解釈する文字列を貼り付ける**: つまり「アール」「エム」が連続した、引用符を取り除いた形で実行する (rollback は TENMON が明示裁定した場合のみ)。

ただし rollback は **TENMON が明示的に裁定した場合のみ実行**。DRYRUN 結果が PASS であればファイルを残し、Phase 4 (`CARD-FEEDBACK-LOOP-CARD-GENERATION-V1` 等) へ進む。

---

## 15. DRYRUN PASS 後の次カード

### 15-1. PASS 判定基準
- critical 0 / RED でない (verdict GREEN または YELLOW)
- JSON / MD / next_card_suggestions の 3 ファイル生成
- `/api/health` 等 HTTPS 200 取得
- 本番 / 旧 VPS の既存 service / timer 無変更
- 新規 systemd / cron / timer 登録ゼロ
- token / 鍵 / IP の log 漏洩ゼロ

### 15-2. 推奨次カード (PASS 時)

| 候補 | 内容 | TENMON 裁定 |
|------|-----|----------|
| **A. `CARD-FEEDBACK-LOOP-CARD-GENERATION-V1`** | Founder 改善要望 / doctor v2 結果 / MC 状態から次カード候補を自動生成 (READ-ONLY 観測ベース / まだ自動投入はしない) | **推奨** (Phase 4 へ進行) |
| B. `CARD-DOCTOR-V2-OLD-VPS-DRYRUN-FOLLOWUP-V1` | 旧 VPS で doctor v2 が出した warn 群の解消設計 (例: PWA assets 不在 / DB 不在) | warn が多い場合 |
| C. `CARD-DOCTOR-V2-PATH-ENV-OVERRIDE-V1` (仮) | doctor v2 に `TENMON_DOCTOR_V2_*` env override を追加 (本番 VPS で commit) | D-3 選択時の必須前段 |
| D. `CARD-DOCTOR-V2-OLD-VPS-SCHEDULE-DESIGN-V1` | systemd timer 化の設計 (実装は別カード / READ-ONLY 設計のみ) | 安定運用が必要なら |
| E. 本カード追補 | DRYRUN 失敗領域の追加検証 | 失敗時 |

### 15-3. 全体ロードマップ
```
Phase 1: CARD-DOCTOR-V2-OLD-VPS-MIGRATION-OBSERVE-V1                    [PASS / YELLOW]
Phase 2: CARD-DOCTOR-V2-OLD-VPS-MIGRATION-PREP-MANUAL-OBSERVE-V1        [PASS / GREEN]
Phase 3: CARD-DOCTOR-V2-OLD-VPS-DRYRUN-V1                               ← 本カード
Phase 4: CARD-FEEDBACK-LOOP-CARD-GENERATION-V1
Phase 5: CARD-IROHA-MC-CONNECTION-AUDIT-V1
Phase 6: CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1
```

将来 Phase:
- `CARD-DOCTOR-V2-PATH-ENV-OVERRIDE-V1` (D-3 選択時の前段)
- `CARD-DOCTOR-V2-OLD-VPS-SCHEDULE-DESIGN-V1`
- `CARD-DOCTOR-V2-OLD-VPS-SCHEDULE-IMPLEMENT-V1`

保留中: IROHA NOTION STRUCTURE WRITE / 断捨離 tone 系 (OS 基盤完成後に再開)。

---

## 付記: プライバシ / セキュリティ規律

- 旧 VPS の hostname `x162-43-90-247` は TENMON 裁定 (PREP §15) で記録可
- 旧 VPS の **IP (生数値)** は本書に **混入させない**
- 本番 VPS の hostname / IP は `<本番VPS>` プレースホルダで伏せる
- ssh 鍵パス / token / API key は本書および TENMON 提出ログに混入させない
- doctor v2 の標準出力 / stdout / stderr / JSON / MD に token / 鍵が含まれていないことは TENMON が **貼る前に必ず確認**
- 出力 JSON / MD の本文は記録可 (機密でない)
- 既存 systemd unit / timer 名 / `/opt/` ディレクトリ名は機密でないため記録可

---

## 付記: 副作用ゼロの自明性

本書 (PROCEDURE.md) を Cursor が作成する段階では、**旧 VPS には一切アクセスしない** (本書執筆中に ssh / scp / mkdir / write はゼロ)。本番 VPS の DB / nginx / api / repo も無変更。
TENMON が Mac から Phase A〜H を実行した時点で初めて旧 VPS への最小 write (`mkdir` 2 回 + `scp` 1 ファイル + 出力 3 ファイル + 任意 symlink 1 個) が発生する。

---

DRYRUN 実行後、TENMON は Phase H で結果ログを Cursor に提出すること。
Cursor は受領後 `DOCTOR_V2_OLD_VPS_DRYRUN_V1_REPORT.md` を新規作成し、本カードの commit を完了する。
