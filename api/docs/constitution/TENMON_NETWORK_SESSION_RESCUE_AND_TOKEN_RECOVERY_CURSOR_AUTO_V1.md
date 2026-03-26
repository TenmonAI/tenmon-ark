# TENMON_NETWORK_SESSION_RESCUE_AND_TOKEN_RECOVERY_CURSOR_AUTO_V1

## 目的

Mac と VPS 間で **bearer 更新 / ネットワーク / executor auth state（ブラウザログイン相当）** の断を検知し、**safe rescue** を行う（**1 実行あたり rescue は高々 1 回**）。**token の捏造はしない**。**product core は変更しない**。

## 実装

- `api/automation/network_session_rescue_v1.py`
- 既存 helper: `api/automation/tenmon_mac_executor_auth_refresh_v1.py`（`TENMON_MAC_AUTH_REFRESH_SCRIPT` で上書き可）

## 検知

| 領域 | 内容 |
|------|------|
| network | `GET {TENMON_REMOTE_CURSOR_BASE_URL}/api/health` |
| token refresh fail | 上記 helper の exit≠0（stderr は summary に tail のみ） |
| browser session missing | `~/tenmon-mac/executor_auth.json`（または `TENMON_MAC_EXECUTOR_AUTH_STATE`）欠落、または `refresh_token` 空 |
| queue API | `GET .../api/admin/cursor/queue` + `Authorization: Bearer`（**state ファイルの token のみ**。stdout に token を混ぜない） |

## Rescue ポリシー（1 回まで）

- **budget 1**: 次のいずれか **1 つだけ**が消費される。
  1. health 初回失敗 → **1 秒待って health を再試行**（network reconnect 相当）
  2. health OK かつ queue が 401/403 または token 空 → **auth refresh を 1 回** subprocess 実行 → queue を再試行
- network retry で budget を使い切った後に queue がまだ失敗する場合、**同一実行では auth refresh しない**（`reason=queue_failed_rescue_budget_exhausted_after_network_retry`）。

## 出力

- 標準出力: `ok`, `rescue_attempted`, `rescue_executed`, `manual_review_required`, `reason` の JSON 1 行
- `api/automation/network_session_rescue_summary.json`: 上記に加え `failure_phase`, `health_probe_*`, `queue_probe_*`, `auth_refresh_attempt`（**token 値は含めない**）

### failure_phase（どこで落ちたか）

- `config` — `TENMON_REMOTE_CURSOR_BASE_URL` 未設定
- `network_health`
- `browser_session` — state / refresh_token 問題
- `token_refresh` — queue 401/403 または空 token 前提
- `queue_api` — その他 queue 失敗
- `none` — 全体 OK

## 環境変数

| 変数 | 意味 |
|------|------|
| `TENMON_REMOTE_CURSOR_BASE_URL` | 必須（VPS の API 基底） |
| `TENMON_REPO_ROOT` | 既定 `/opt/tenmon-ark-repo` |
| `TENMON_MAC_EXECUTOR_AUTH_STATE` | auth JSON パス（既定 `~/tenmon-mac/executor_auth.json`） |
| `TENMON_MAC_AUTH_REFRESH_SCRIPT` | refresh スクリプトパス |
| `TENMON_MAC_PYTHON` | refresh 実行用 Python |
| `TENMON_NETWORK_RESCUE_AUTH_SKEW_SEC` | refresh の `--skew-sec`（既定 300） |

## fail-closed / login 未済

- base URL なし → `manual_review_required=true`
- state 欠落 / `refresh_token` なし → `manual_review_required=true`（**login / founder フローで JSON を配置**）
- refresh subprocess 失敗 → 多くの場合 `manual_review_required=true`
- token 以外の queue 失敗（5xx 等）は `manual_review_required` を原則 false（VPS 側要因）

## nextOnPass

`TENMON_QUEUE_DEDUP_BACKPRESSURE_AND_FIXTURE_DRAIN_CURSOR_AUTO_V1`

## nextOnFail

停止。network rescue retry 1 枚のみ生成。
