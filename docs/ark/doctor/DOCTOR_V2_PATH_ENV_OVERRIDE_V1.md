# DOCTOR_V2_PATH_ENV_OVERRIDE_V1

カード: `CARD-DOCTOR-V2-PATH-ENV-OVERRIDE-V1`
種別: PATCH 小カード (最小 diff / 既定動作完全維持 + env override)
verdict: PASS (本番 VPS verify 2 回 / 退行ゼロ / acceptance 12/12)

---

## 1. 背景 (DRYRUN Phase D の symlink 失敗と D-3 採用)

### 1-1. 前カード履歴
| カード | 結果 |
|--------|------|
| `CARD-DOCTOR-V2-OLD-VPS-MIGRATION-OBSERVE-V1` | PASS / YELLOW |
| `CARD-DOCTOR-V2-OLD-VPS-MIGRATION-PREP-MANUAL-OBSERVE-V1` | PASS / GREEN |
| `CARD-DOCTOR-V2-OLD-VPS-DRYRUN-V1` | Phase D で分岐 |

### 1-2. DRYRUN Phase D で発生した問題
旧 4GB VPS (hostname `x162-43-90-247`) 上で doctor v2 を素実行すると、`OUT_DIR = /opt/tenmon-ark-repo/automation/out` (絶対ハードコード) に書き込もうとする。これは PREP §10 で定めた「`/opt/tenmon-automation/out/` に出力する」設計と整合しない。

PROCEDURE §13-4 で TENMON 裁定 3 案を提示:
- **D-1 素実行**: 旧 VPS の `/opt/tenmon-ark-repo/automation/out/` に書く (旧 VPS の repo は backup の可能性大 / 規律違反のリスク)
- **D-2 symlink**: `/opt/tenmon-ark-repo/automation/out` が **未存在** な場合に symlink を 1 個だけ作って実体を `/opt/tenmon-automation/out/` に逃がす
- **D-3 env override**: doctor v2 に `TENMON_DOCTOR_*` env override を追加し、旧 VPS では env で `/opt/tenmon-automation/out/` を指定する

TENMON が D-2 を試みたところ、**親ディレクトリ `/opt/tenmon-ark-repo/automation` が旧 VPS に存在せず、symlink を作るだけでも親ディレクトリ作成が必要 → 既存 repo の階層に書き込みが発生** することが判明。これは「旧 repo に触らない方針」と衝突するため D-2 は中止。

→ **D-3 (env override patch)** を採用、本カードでその実装を行う。

### 1-3. 副作用ゼロ確認 (Phase D 失敗時)
- D-2 試行は親ディレクトリ不在で **何も書かれず** に失敗 → 旧 VPS への副作用ゼロ
- 本カード執筆中も旧 VPS に **一切触っていない** (ssh / scp / mkdir / 実行すべてゼロ)

---

## 2. 設計方針 (既定維持 + env override)

### 2-1. 不変条件
- env 未設定時 (= 既存運用) は **完全に従来挙動を維持**
- 既存関数シグネチャ・既存 self-check (`DENY_TOKENS`) は不変
- Python3 stdlib only (新規依存なし)
- 最小 diff (本実装: 1 file changed / +34 / -5 / 計 39 行)

### 2-2. 変更の精神
パス参照を **module top-level の定数** に集約し、それらを env 経由で override 可能にする。実体ロジック (verify の中身 / git probe / API probe / DB probe / etc.) は **一切変更しない**。

---

## 3. 追加する環境変数 4 種の仕様

すべて optional。未設定時は従来挙動を 100% 維持する。

| 環境変数 | 既定値 | 用途 |
|--------|------|------|
| `TENMON_DOCTOR_REPO_ROOT` | `/opt/tenmon-ark-repo` | repo root override (git probe / denylist 探索 / evolution_log 探索の基点) |
| `TENMON_DOCTOR_OUT_DIR` | `<REPO_ROOT>/automation/out` | **出力ディレクトリ override (最重要)** |
| `TENMON_DOCTOR_KOKUZO_DB` | `<DATA_DIR>/kokuzo.sqlite` | DB ファイルパス override (read-only sqlite probe 用) |
| `TENMON_DOCTOR_DATA_DIR` | `/opt/tenmon-ark-data` | データディレクトリ override (`PROMPT_TRACE_JSONL` の親) |

`PWA_ASSETS_DIR` (`/var/www/tenmon-pwa/pwa/assets`) は env 化対象外 (PWA は本番 VPS 限定 / 旧 VPS では存在しない前提で warn になる設計のまま)。

---

## 4. 解決順序

### 4-1. 出力ディレクトリ
```
1. TENMON_DOCTOR_OUT_DIR があればそれ
2. なければ TENMON_DOCTOR_REPO_ROOT/automation/out
3. なければ既定 /opt/tenmon-ark-repo/automation/out
```

### 4-2. DB ファイル
```
1. TENMON_DOCTOR_KOKUZO_DB があればそれ
2. なければ TENMON_DOCTOR_DATA_DIR/kokuzo.sqlite
3. なければ既定 /opt/tenmon-ark-data/kokuzo.sqlite
```

### 4-3. PromptTrace JSONL
```
1. TENMON_DOCTOR_DATA_DIR/mc_intelligence_fire.jsonl
2. なければ既定 /opt/tenmon-ark-data/mc_intelligence_fire.jsonl
```
(専用 env は持たない / DATA_DIR の派生)

### 4-4. REPO_ROOT
```
1. TENMON_DOCTOR_REPO_ROOT があればそれ
2. なければ既定 /opt/tenmon-ark-repo
```

---

## 5. 実装要件 1〜6 と充足結果

| # | 要件 | 実装 / 結果 |
|---|------|----------|
| 1 | env 読み取り (4 種 / 未設定時は既定値) | `os.environ.get("TENMON_DOCTOR_*", <default>)` を module top に追加 |
| 2 | パス解決を 1 か所に集約 | line 32〜40 の定数 (`REPO_ROOT` / `OUT_DIR` / `DATA_DIR` / `KOKUZO_DB` / `PROMPT_TRACE_JSONL`) に集約済 |
| 3 | OUT_DIR 自動作成 + 危険パス reject | `_safe_mkdir(p)` 関数を追加 (Step 6 で `/etc/...` `/usr/...` reject 確認済) |
| 4 | dangerous_script self-check 互換 | self-check hits 0 (PASS) / DENY_TOKENS いずれにもヒットしない |
| 5 | 失敗時メッセージ | `[doctor_v2] OUT_DIR=<p> is not writable: <e>` + `[doctor_v2] hint: set TENMON_DOCTOR_OUT_DIR to a writable path` を stderr に出す |
| 6 | 最小 diff | 1 file changed / 34 insertions / 5 deletions / 計 39 行 (目安 30〜80 行内) |

---

## 6. `_safe_mkdir` の禁止プレフィックス一覧

```python
forbidden_prefixes = (
    "/etc", "/usr", "/bin", "/sbin", "/lib", "/lib64",
    "/boot", "/dev", "/proc", "/sys", "/root",
)
```

挙動:
- `OUT_DIR.resolve()` が上記いずれかの prefix で始まる場合 `RuntimeError` で reject (env override 誤用 guard)
- それ以外は `mkdir(parents=True, exist_ok=True)` で作成
- 書き込み権限なし等の `OSError` は hint メッセージを stderr に出して再送出

検証 (Step 6 内):

```bash
TENMON_DOCTOR_OUT_DIR=/etc/tenmon-doctor-forbidden  python3 ... verify
# → RuntimeError: refusing to mkdir under /etc: /etc/tenmon-doctor-forbidden

TENMON_DOCTOR_OUT_DIR=/usr/local/tenmon-doctor-forbidden  python3 ... verify
# → RuntimeError: refusing to mkdir under /usr: /usr/local/tenmon-doctor-forbidden
```

---

## 7. 本番 VPS での verify 結果

### 7-1. Step 5: env 未設定 (既定動作維持)

```bash
unset TENMON_DOCTOR_REPO_ROOT TENMON_DOCTOR_OUT_DIR \
      TENMON_DOCTOR_KOKUZO_DB TENMON_DOCTOR_DATA_DIR
python3 automation/tenmon_doctor_v2.py verify
# → exit_code=0
# → [doctor_v2] verdict=RED crit=1 warn=3 info=0
# → [doctor_v2] report: /opt/tenmon-ark-repo/automation/out/doctor_v2_report_latest.json
```

| 項目 | 値 |
|------|------|
| exit_code | 0 |
| verdict | RED |
| critical / warn / info | 1 / 3 / 0 |
| 出力先 | `/opt/tenmon-ark-repo/automation/out/` (既定 / 不変) |

> 注: verdict=RED は本カード patch 由来ではなく、本番 VPS の現状観測結果。git HEAD の `automation/out/doctor_v2_report_latest.json` も既に `verdict=RED crit=1 warn=3` で記録されており、`git diff HEAD -- automation/out/doctor_v2_report_latest.json | grep -E '^[+-].*(verdict|critical|warn|info)'` は **空**。患者 (本番 VPS) の現状を patch 後 doctor v2 が同じ内容で観測している。

### 7-2. Step 6: env 設定 (TENMON_DOCTOR_OUT_DIR override)

```bash
mkdir -p /tmp/tenmon-doctor-test-out
TENMON_DOCTOR_OUT_DIR=/tmp/tenmon-doctor-test-out \
    python3 automation/tenmon_doctor_v2.py verify
# → exit_code=0
# → [doctor_v2] verdict=RED crit=1 warn=3 info=0
# → [doctor_v2] report: /tmp/tenmon-doctor-test-out/doctor_v2_report_latest.json
ls -la /tmp/tenmon-doctor-test-out/
# → doctor_v2_report_latest.json (4764 bytes)
# → doctor_v2_report_latest.md   (3409 bytes)
# → doctor_v2_next_card_suggestions.md (426 bytes)
```

| 項目 | 値 |
|------|------|
| exit_code | 0 |
| verdict | RED (Step 5 と同一) |
| critical / warn / info | 1 / 3 / 0 |
| 出力先 | `/tmp/tenmon-doctor-test-out/` (env 経由) |
| 既定 OUT_DIR mtime | **不変** (Step 5 直後 `1777178522` = Step 6 直後 `1777178522`) |

→ env override 時に既定先には書かれていないことを mtime で確定。

### 7-3. 後始末
```bash
rm -rf /tmp/tenmon-doctor-test-out  # 一時出力先のみ削除 (verify 結果ファイル含)
```
本番 VPS の `/etc` `/usr` 等のシステム領域には一切書き込んでいない (Step 6 内の reject 検証で `RuntimeError` が出ることのみ確認 / 実際の書き込みは発生せず)。

---

## 8. 旧 VPS DRYRUN 用の実行例 (CARD-DOCTOR-V2-OLD-VPS-DRYRUN-V1-RETRY 用 / 本カードでは実行しない)

> ⚠ 本カードは本番 VPS のみで完結。旧 VPS には一切触れない。
> 以下は **次カード** `CARD-DOCTOR-V2-OLD-VPS-DRYRUN-V1-RETRY` で TENMON が Mac から実行する想定の参考例。

### 8-1. patched doctor v2 を旧 VPS へ scp
```bash
# (Mac で) 本番 VPS から取得 → 旧 VPS へ
scp <本番VPS>:/opt/tenmon-ark-repo/automation/tenmon_doctor_v2.py \
    ~/tenmon-dryrun-tmp/tenmon_doctor_v2.py
scp ~/tenmon-dryrun-tmp/tenmon_doctor_v2.py \
    root@x162-43-90-247:/opt/tenmon-automation/doctor_v2/
```

### 8-2. 旧 VPS で env override 付き実行
```bash
ssh root@x162-43-90-247
# (旧 VPS シェルで)
mkdir -p /opt/tenmon-automation/doctor_v2 /opt/tenmon-automation/out

TENMON_DOCTOR_OUT_DIR=/opt/tenmon-automation/out \
TENMON_DOCTOR_REPO_ROOT=/opt/tenmon-automation \
    python3 /opt/tenmon-automation/doctor_v2/tenmon_doctor_v2.py verify
echo "exit_code=$?"

ls -la /opt/tenmon-automation/out/
python3 -c "import json; d=json.load(open('/opt/tenmon-automation/out/doctor_v2_report_latest.json')); print('verdict=', d['verdict'], 'crit=', d['summary']['critical'])"
```

期待:
- 旧 VPS では DB / mc_intelligence_fire / evolution_log_v1.ts / PWA assets が存在しない → warn 多数
- verdict は YELLOW (critical 0 が望ましい / RED の場合はその要因を REPORT に記録)
- 旧 VPS の `/opt/tenmon-ark-repo/automation/out/` には **書かれない** (env で逃がしているため)

> なお `TENMON_DOCTOR_REPO_ROOT=/opt/tenmon-automation` を指定すると git probe の `cwd` が `/opt/tenmon-automation` になる。そこは git repo ではない可能性が高いため git status は warn になる想定 (これは設計通り)。

---

## 9. dangerous_script self-check 互換性確認

### 9-1. 既存 `DENY_TOKENS`
```python
DENY_TOKENS = [
    "rm -rf", "systemctl restart", "systemctl stop",
    "systemctl disable", "systemctl enable", "nginx -s",
    "rsync --delete", "PRAGMA writable_schema", "DROP TABLE",
    "DELETE FROM", "UPDATE ", "INSERT INTO",
]
```
(self-check ソース内では concatenated literals で書かれている。本書では可読性のため 1 つに連結して掲載)

### 9-2. patch 後 self-check 実行結果
```python
hits = [t for t in DENY_TOKENS if t in code]
# → []  (PASS)
```

### 9-3. 追加コード片の self-check 安全性
- env 名 `TENMON_DOCTOR_REPO_ROOT` 等 → DENY_TOKENS に該当なし
- 関数名 `_safe_mkdir` → 該当なし
- forbidden_prefixes `("/etc", "/usr", ...)` → 該当なし
- エラーメッセージ `is not writable` `hint: set TENMON_DOCTOR_OUT_DIR` → 該当なし

→ self-check に対する影響ゼロ。`--help` も正常に出力される。

---

## 10. 退行なし確認

| 検証 | patch 前 (HEAD) | patch 後 (Step 5) | 判定 |
|------|--------------|---------------|------|
| `python3 -m py_compile` | PASS | PASS | ✓ 不変 |
| `--help` 出力 | OK | OK | ✓ 不変 |
| env 未設定時の REPO_ROOT | `/opt/tenmon-ark-repo` | `/opt/tenmon-ark-repo` | ✓ 同一 |
| env 未設定時の OUT_DIR | `/opt/tenmon-ark-repo/automation/out` | `/opt/tenmon-ark-repo/automation/out` | ✓ 同一 |
| env 未設定時の KOKUZO_DB | `/opt/tenmon-ark-data/kokuzo.sqlite` | `/opt/tenmon-ark-data/kokuzo.sqlite` | ✓ 同一 |
| env 未設定時の PROMPT_TRACE_JSONL | `/opt/tenmon-ark-data/mc_intelligence_fire.jsonl` | `/opt/tenmon-ark-data/mc_intelligence_fire.jsonl` | ✓ 同一 |
| verify exit code | 0 | 0 | ✓ 不変 |
| verify verdict | RED (HEAD 記録) | RED | ✓ 同一 |
| verify counts | crit=1 warn=3 | crit=1 warn=3 | ✓ 同一 |
| `git diff HEAD -- automation/out/doctor_v2_report_latest.json | grep -E '^[+-].*(verdict|critical|warn|info)'` | 空 | 空 | ✓ verdict / counts 差分なし |
| self-check hits | 0 | 0 | ✓ 不変 |
| 既定 OUT_DIR mtime (env 設定時) | (該当なし) | env 設定 verify 後も **不変** (`1777178522` 同値) | ✓ env 経路完全分離 |

→ **退行ゼロ確定**。env 未設定時の動作は patch 前と完全同一。env 設定時のみ path が override される。

---

## 11. 次カード (CARD-DOCTOR-V2-OLD-VPS-DRYRUN-V1-RETRY) の実行例

### 11-1. 推奨カード A: `CARD-DOCTOR-V2-OLD-VPS-DRYRUN-V1-RETRY`
本カードで env override が動作可能になったため、DRYRUN を **D-3 経路** で再実行する:

```bash
# (Mac で)
scp <本番VPS>:/opt/tenmon-ark-repo/automation/tenmon_doctor_v2.py \
    ~/tenmon-dryrun-tmp/tenmon_doctor_v2.py
scp ~/tenmon-dryrun-tmp/tenmon_doctor_v2.py \
    root@x162-43-90-247:/opt/tenmon-automation/doctor_v2/

# (旧 VPS で, ssh 経由)
ssh root@x162-43-90-247 '
  mkdir -p /opt/tenmon-automation/doctor_v2 /opt/tenmon-automation/out
  TENMON_DOCTOR_OUT_DIR=/opt/tenmon-automation/out \
  TENMON_DOCTOR_REPO_ROOT=/opt/tenmon-automation \
      python3 /opt/tenmon-automation/doctor_v2/tenmon_doctor_v2.py verify
  echo "exit_code=$?"
  ls -la /opt/tenmon-automation/out/
'
```

### 11-2. RETRY カード成立条件
- 本カード PASS (acceptance 12 項充足) ✓
- 本番 VPS で env override が verify 済 ✓
- 旧 VPS の `/opt/tenmon-ark-repo` には **何も書かない** (env で `/opt/tenmon-automation/` に逃がす) ✓
- systemd / cron / timer 登録ゼロは継続維持

---

## 12. 残課題

### 12-1. 即時残課題なし
本カードのスコープ (env 4 種 + `_safe_mkdir` + 既定維持) はすべて実装・verify 完了。

### 12-2. 次カード以降に持ち越す論点
| 論点 | 持ち越し先 |
|------|----------|
| 旧 VPS DRYRUN の実機実行 | `CARD-DOCTOR-V2-OLD-VPS-DRYRUN-V1-RETRY` |
| 旧 VPS で出る warn 群 (DB / PWA assets / mc_intelligence / evolution_log 不在) の解消設計 | `CARD-DOCTOR-V2-OLD-VPS-DRYRUN-FOLLOWUP-V1` (RETRY 結果次第) |
| systemd timer 化の設計 | `CARD-DOCTOR-V2-OLD-VPS-SCHEDULE-DESIGN-V1` (将来) |
| systemd timer 化の実装 | `CARD-DOCTOR-V2-OLD-VPS-SCHEDULE-IMPLEMENT-V1` (将来) |
| 本番 VPS の verdict=RED (本カード観測) | doctor v2 の現観測結果 / 別カードで原因究明 |

### 12-3. 設計上の選択肢 (将来)
- env 経由の override 範囲を `PWA_ASSETS_DIR` `HOST` まで広げる場合は別カードで明示裁定
- 本カードでは **scope を最小** (4 種 / OUT_DIR を逃がすことだけ) に絞っている

---

## 付記: プライバシ / セキュリティ規律

- 環境変数の **値そのもの** (パス) は doctor v2 の通常出力には含まれない (path は report の `git.cwd` 等に内部的に出るが、これは本番 VPS 内部パスであり機密ではない)
- token / API key / IP / ssh 鍵パス は本書および patch コードに **混入させない**
- `PROCEDURE.md` (`f7a9c5cf`) で定めた leak チェック (IP / 本番 hostname / token / 鍵パス) を本書も遵守
- 既存 `_read_api_token()` の実装は **不変** (token は通常 stdout / report に出ない設計)

---

## 付記: 副作用ゼロの自明性

| 対象 | 状態 |
|------|------|
| 旧 VPS への ssh / scp / mkdir / 実行 | **ゼロ** (本カード執筆中・実装中・verify 中いずれもゼロ) |
| 本番 VPS DB `kokuzo.sqlite` mtime | 通常運用 write のみ (本カード起因なし) |
| 本番 VPS `nginx.service` | 一切操作せず active 維持 |
| 本番 VPS `tenmon-ark-api.service` | 一切操作せず active 維持 |
| 本番 VPS systemd unit / timer / cron 新規追加 | ゼロ |
| 本番 VPS `/etc/` `/usr/` 等への書き込み | ゼロ (`_safe_mkdir` で reject 動作のみ verify) |
| pip install / npm install / apt install | ゼロ |
| Notion API write | ゼロ |
| DB write | ゼロ (read-only sqlite probe のみ) |
| 修正対象 | `automation/tenmon_doctor_v2.py` (39 行) + 本書 (新規) のみ |

---

本カード PASS 後、TENMON が `CARD-DOCTOR-V2-OLD-VPS-DRYRUN-V1-RETRY` を裁定して旧 VPS で再 DRYRUN を実施する想定。
