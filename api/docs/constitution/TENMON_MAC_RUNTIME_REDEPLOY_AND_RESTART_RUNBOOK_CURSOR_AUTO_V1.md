# TENMON_MAC_RUNTIME_REDEPLOY_AND_RESTART_RUNBOOK_CURSOR_AUTO_V1

## 目的

VPS（TENMON-ARK）更新後、**Mac 側**の watch loop / executor 周辺 / browser operator / review acceptor を**同じ手順**で再配備・再起動し、ログと API で健全性を確認する。**本憲章が runbook の単一真実源（SSOT）**とする。

## D（非交渉）

- 最小 diff
- runbook / docs / shell のみ（product core 不変更）
- 成功の捏造禁止（health は観測のみ）

## 補助スクリプト（任意・憲章が主）

- `api/scripts/tenmon_mac_runtime_redeploy_v1.sh`  
  Mac 上で `check` / `stop` / `start` / `health` / `full` を fail-closed 実行。手順の省略形。

---

## 0. 前提・パス

| 記号 | 既定 | 説明 |
|------|------|------|
| `MAC_HOME` | `$HOME/tenmon-mac` | Mac 側配置ルート（`TENMON_MAC_HOME` で上書き） |
| `REPO`（Mac 上クローン） | `TENMON_REPO_ROOT` | リポジトリルートが Mac にある場合、**鮮度比較**に使う |
| VPS 上リポジトリ | （運用依存） | `scp` のコピー元 |

**最低同期対象（VPS → Mac のコピー先は運用で固定すること）**

| VPS（リポジトリ相対） | Mac 側の典型配置 | 役割 |
|------------------------|------------------|------|
| `api/scripts/tenmon_cursor_watch_loop.sh` | `$MAC_HOME/tenmon_cursor_watch_loop.sh` 等 | 常駐 watch loop |
| `api/automation/tenmon_mac_executor_result_return_and_acceptance_bind_v1.py` | `$MAC_HOME/tenmon_mac_executor_result_return_and_acceptance_bind_v1.py` | result POST / bind |
| `api/automation/browser_ai_operator_v1.py` | `$MAC_HOME/browser_ai_operator_v1.py` または repo 参照 | Browser AI |
| `api/automation/cursor_review_acceptor_v1.py` | `$MAC_HOME/cursor_review_acceptor_v1.py` | watch loop から呼ばれる review |

**watch loop が参照する別ファイル（本 runbook で「古いと止まる」典型）**

- `TENMON_MAC_AUTH_REFRESH_SCRIPT`（既定 `$MAC_HOME/tenmon_mac_executor_auth_refresh_v1.py`）
- `TENMON_MAC_EXECUTOR_PY`（既定 `$MAC_HOME/tenmon_cursor_executor.py`）
- 上記も VPS 更新に合わせて同期すること。

---

## 1. VPS 側（参照のみ・本憲章は手順固定）

1. 通常のデプロイ（git pull / CI 等）で API・ルートを更新。
2. **Mac にコピーするコミット**がどれかを記録（`git rev-parse HEAD` など）。以降の「古いファイル」判定の基準にする。

---

## 2. 再配備（`scp` 例）

**止めた後**にコピーするか、コピー後に必ず **chmod + 再起動**（下記）。接続先は環境に合わせて置換。

```bash
# 例: VPS のリポジトリ → Mac の MAC_HOME
VPS=user@your-vps
R=/opt/tenmon-ark-repo   # VPS 上の TENMON-ARK ルート
M="${TENMON_MAC_HOME:-$HOME/tenmon-mac}"
mkdir -p "$M"

scp "$VPS:$R/api/scripts/tenmon_cursor_watch_loop.sh" "$M/"
scp "$VPS:$R/api/automation/tenmon_mac_executor_result_return_and_acceptance_bind_v1.py" "$M/"
scp "$VPS:$R/api/automation/browser_ai_operator_v1.py" "$M/"
scp "$VPS:$R/api/automation/cursor_review_acceptor_v1.py" "$M/"
# 併せて auth_refresh / tenmon_cursor_executor 等も更新すること
```

失敗時は **どの `scp` 行で止まったか**が「どこで止まったか」の一次情報。

---

## 3. 権限（`chmod`）

```bash
M="${TENMON_MAC_HOME:-$HOME/tenmon-mac}"
chmod +x "$M/tenmon_cursor_watch_loop.sh" 2>/dev/null || true
# .py は実行ビット必須ではないが、直接実行するなら:
chmod +x "$M/tenmon_mac_executor_result_return_and_acceptance_bind_v1.py" 2>/dev/null || true
```

---

## 4. 既存プロセス停止（`pkill`）

watch loop の二重起動を防ぐ。**パターンは環境に合わせて調整**。

```bash
# 例: スクリプト名で止める（他プロセスに当たらないよう注意）
pkill -f "tenmon_cursor_watch_loop.sh" || true
sleep 2
pgrep -fl tenmon_cursor_watch_loop.sh && echo "[WARN] still running" || echo "[OK] watch loop stopped"
```

失敗時: `pkill` が効いていない / 別シェルで動いている → **ログに二重 tick** が出るので、`MAIN_LOG` を確認。

---

## 5. 環境変数（`export`）

**必須に近い**

- `TENMON_REMOTE_CURSOR_BASE_URL` — VPS の Cursor 管理 API 基底（例 `https://your-host`）
- Bearer: watch / result bind / queue 確認で使うトークン（運用ポリシーに従い `export`。本書では値を書かない）

**よく使う**

- `TENMON_MAC_HOME` / `TENMON_MAC_LOG_DIR` / `TENMON_MAC_WATCH_LOG`
- `TENMON_EXECUTOR_BEARER_TOKEN` または `TENMON_FOUNDER_EXECUTOR_BEARER`（result bind / 手動 queue 確認）
- `TENMON_FORCE_DRY_RUN` / `TENMON_REAL_EXEC_REQUIRE_ESCROW_APPROVED`（real 実行ポリシー）
- `TENMON_MAC_AUTH_REFRESH_SCRIPT` / `TENMON_MAC_EXECUTOR_PY` / `TENMON_MAC_REVIEW_ACCEPTOR_SCRIPT`

**推奨**: Mac 上に `~/.tenmon_mac_watch_env` のような **非コミット**ファイルに `export` 列挙し、`source` してから起動。

---

## 6. 常駐起動（`nohup` + `caffeinate`）

```bash
set -a
source "${TENMON_MAC_ENV_FILE:-$HOME/.tenmon_mac_watch_env}"
set +a

M="${TENMON_MAC_HOME:-$HOME/tenmon-mac}"
W="${TENMON_MAC_WATCH_SCRIPT:-$M/tenmon_cursor_watch_loop.sh}"
LOG_DIR="${TENMON_MAC_LOG_DIR:-$M/logs}"
PID_FILE="${TENMON_MAC_WATCH_PID_FILE:-$LOG_DIR/watch_loop.pid}"
mkdir -p "$LOG_DIR"

nohup caffeinate -i bash "$W" >>"${TENMON_MAC_WATCH_LOG:-$LOG_DIR/watch_loop.log}" 2>&1 &
echo $! > "$PID_FILE"
echo "PID=$(cat "$PID_FILE") pid_file=$PID_FILE"
```

- **止まった場合**: `nohup` 行の直後に `echo $!` が無い → **起動コマンド失敗**または `bash "$W"` が即死（`W` のパス・shebang・`TENMON_REMOTE_CURSOR_BASE_URL` 未設定など）。

---

## 7. Health check（観測のみ）

### 7.1 Mac ログ tail（必須）

```bash
LOG="${TENMON_MAC_WATCH_LOG:-$HOME/tenmon-mac/logs/watch_loop.log}"
tail -n 80 "$LOG"
```

**見る行（例）**

- `auth_refresh_ok` / `auth_refresh_failed` / `empty_token`
- `queue_request_failed` / `next_request_failed`
- `no_item`
- `executor_real_run` / `executor_dry_run`（real 方針確認）
- `result_post_ok` / `result_post_failed`

### 7.2 PID ファイル（推奨）

```bash
PID_FILE="${TENMON_MAC_WATCH_PID_FILE:-$HOME/tenmon-mac/logs/watch_loop.pid}"
if [[ -f "$PID_FILE" ]]; then
  PID=$(cat "$PID_FILE")
  ps -p "$PID" -o pid,comm,args || echo "[FAIL] pid $PID not running"
else
  echo "[WARN] no pid file (use pgrep)"
  pgrep -fl tenmon_cursor_watch_loop.sh || true
fi
```

### 7.3 Queue 取得（API）

トークンを環境に載せたうえで（例）:

```bash
BASE="${TENMON_REMOTE_CURSOR_BASE_URL:?}"
TOK="${TENMON_FOUNDER_EXECUTOR_BEARER:?}"
curl -fsS -H "Authorization: Bearer $TOK" "$BASE/api/admin/cursor/queue" | head -c 2000; echo
```

- **HTTP 失敗** → VPS 未到達・URL 誤り・トークン失効・TLS
- **200 だが empty** → キュー空（正常の可能性）

---

## 8. 失敗時に明示すること（必須運用）

1. **どこで止まったか** — 上記セクション番号（例: 「4. pkill 後もプロセス残存」「6. 起動直後にログに `set TENMON_REMOTE_CURSOR_BASE_URL`」）。
2. **どのファイルが古いか** — Mac の `stat -f '%m %N' file`（BSD）または `ls -l` と、VPS の `git rev-parse HEAD` / 対象ファイルのコミット日付を突き合わせる。`TENMON_REPO_ROOT` が Mac にある場合は `api/scripts/tenmon_mac_runtime_redeploy_v1.sh check` で**リポジトリ側 mtime と並記**できる。

---

## 補助スクリプト用法（要約）

Mac 上、リポジトリルートを `TENMON_REPO_ROOT` にしたうえで:

```bash
export TENMON_REPO_ROOT="$HOME/tenmon-ark-repo"   # Mac 上の clone パス
bash api/scripts/tenmon_mac_runtime_redeploy_v1.sh check
bash api/scripts/tenmon_mac_runtime_redeploy_v1.sh full   # stop → start → health
```

---

## acceptance

- runbook が **本憲章 1 本**に固定される
- Mac 再配備手順が **手順番号付きで再利用**できる
- **ログ確認箇所**（7.1）と **queue 確認**（7.3）が明記される

## nextOnPass

`TENMON_APPROVED_HIGH_RISK_REAL_RUN_ACCEPTANCE_CHAIN_CURSOR_AUTO_V1`

## nextOnFail

停止。runbook retry 1 枚のみ生成。
