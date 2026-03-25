# TENMON_MAC_EXECUTOR_REFRESHABLE_AUTH_RUNTIME_CURSOR_AUTO_V1

## 目的

短命 Founder executor JWT を毎回手貼りせず、Mac executor が **refresh token** で access を自動更新し、`/queue` / `/next` / `/result` を長時間安定して叩けるようにする。

## トークン

| 種別 | 内容 | TTL |
|------|------|-----|
| **access** | 既存の founder executor JWT（`role: founder_executor`） | 既定 **15 分**（`TENMON_FOUNDER_EXECUTOR_TTL_MIN`、5〜120 分） |
| **refresh** | Mac 専用 JWT（`role: founder_executor_refresh`） | 既定 **30 日**（`TENMON_FOUNDER_EXECUTOR_REFRESH_TTL_DAYS`、1〜365 日） |

- 署名は同一 `TENMON_FOUNDER_EXECUTOR_JWT_SECRET`（未設定時は founder key 派生）。**refresh は `requireFounderOrExecutorBearer` では受理しない**（access のみ管理者 API に通る）。

## 初回発行（Founder ブラウザセッションのみ）

`POST /api/admin/founder/executor-token?include_refresh=1`  
または JSON body: `{ "include_refresh": true }`

- 要: 許可メールの `auth_session` cookie。
- 応答: `token`, `expiresAt`, `exp` に加え `refresh_token`, `refresh_expires_at`（`include_refresh` 時のみ）。

## API

### `POST /api/admin/founder/executor-token/refresh`

- **認証不要**（refresh の秘密はトークンそのもの）。
- Body: `{ "refresh_token": "..." }`
- 成功: `{ "ok": true, "token", "expiresAt", "exp" }`
- オプション `TENMON_FOUNDER_EXECUTOR_REFRESH_ROTATE=1` のとき、都度 **新 refresh を発行**し旧 refresh jti を失効。応答に `refresh_token`, `refresh_expires_at` を含む。

### `POST /api/admin/founder/executor-token/revoke`

- **要** founder browser session（従来どおり）。
- Body: `{ "token": "<access または refresh>" }`
- 成功: `{ "ok": true, "revoked": true, "kind": "access" | "refresh" }`

### 既存 Bearer 経路

- 管理者 API の `Authorization: Bearer <access>` は変更なし。

## サーバ失効ストア

`founder_executor_revoked_jti.json`（または `TENMON_FOUNDER_EXECUTOR_REVOKE_PATH`）に以下を永続化:

- `jtis`: access の jti
- `refresh_jtis`: refresh の jti

旧ファイル（`jtis` のみ）も読み込み互換。

## Mac 側の保持（ローカルのみ）

推奨: `~/tenmon-mac/executor_auth.json`（例）

```json
{
  "token": "<access JWT>",
  "refresh_token": "<refresh JWT>",
  "exp": 1774406600
}
```

環境変数 `TENMON_MAC_EXECUTOR_AUTH_STATE` でパス上書き可。

## 自動更新スクリプト

`api/automation/tenmon_mac_executor_auth_refresh_v1.py`

- `TENMON_REMOTE_CURSOR_BASE_URL`（既定 `http://127.0.0.1:3000`）
- access の `exp` が近い、または token 欠損時に refresh を POST し、state ファイルを更新
- `--print-token`: 標準出力に access のみ（watch ループで `Authorization: Bearer ...` に使う）

例:

```bash
export TENMON_REMOTE_CURSOR_BASE_URL=https://api.example.com
python3 api/automation/tenmon_mac_executor_auth_refresh_v1.py --print-token
```

## Watch ループ設計（`~/tenmon-mac/tenmon_cursor_watch_loop.sh` 相当）

1. 各ポーリング前: `tenmon_mac_executor_auth_refresh_v1.py --skew-sec 300 --print-token` を実行し、得た token を変数に保持（または毎回 curl 直前にパイプ）。
2. `curl -H "Authorization: Bearer $TOK" .../queue` / `next` / `result`。
3. refresh 失敗時はログに出し、Founder による再ログイン＋初回発行が必要。

## NON-NEGOTIABLES

- 初回は founder browser session のみから access+refresh 発行
- access は短命のまま
- refresh / access のシークレット文字列はサーバ環境のみ；**トークン値は Mac ローカルのみ**に保存
- revoke 可能
- `dist/` 直編集禁止

*Version: 1*
