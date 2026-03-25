# remote_bridge_protocol_v1

TENMON_MAC_REMOTE_BRIDGE — VPS（天聞アーク）から自宅 Mac の受信エージェントへ **正規化済み build job manifest** を配送するための最小プロトコル。

## 前提

- manifest は `remote_build_job_normalizer_v1` の **single source JSON** をそのまま転送する（改変しない）。
- **Cursor 実行は行わない**（配送・受領確認まで）。
- 共有秘密 `TENMON_MAC_BRIDGE_SECRET` で素朴な認可（本番は VPN / mTLS 等と併用推奨）。

## 配送（VPS → Mac）

- **HTTP POST** `Content-Type: application/json`
- **URL** 例: `http://<mac-host>:<port>/tenmon/mac-bridge/v1/ingest`
- **ヘッダ**: `X-Tenmon-Bridge-Secret: <secret>`
- **ボディ（envelope）**:

```json
{
  "version": 1,
  "card": "TENMON_MAC_REMOTE_BRIDGE_V1",
  "delivery_id": "uuid",
  "sent_at": "2026-01-01T00:00:00Z",
  "manifest": { }
}
```

`manifest` には `job_id`, `card_name`, `objective`, … 正規化済みフィールドが入る。

## 受領 ACK（Mac → VPS）

**HTTP 200** + JSON:

```json
{
  "ok": true,
  "ack_id": "ack_<uuid>",
  "job_id": "<manifest.job_id>",
  "saved_path": "/absolute/path/to/job_<job_id>.json",
  "received_at": "ISO8601"
}
```

`ok: false` のときは VPS 側が **retryable** として扱えるよう `error` 文字列を返す。

## Mac 側保存

- 既定ディレクトリ: `~/tenmon_remote_bridge_inbox`（`TENMON_MAC_DROP_DIR` で上書き）
- ファイル名: `job_<job_id>.json`（manifest のみ、または envelope 全体 — 実装はスタブに準拠）

## 失敗・再試行

- 接続拒否・タイムアウト・5xx → VPS 側 `mac_remote_bridge_v1.py` が指数バックオフで再送。
- 認可失敗（403）→ 再試行しても無駄なので即失敗扱い可（実装で区別）。

## 関連ファイル

- `api/automation/mac_remote_bridge_v1.py` — 送信・キュー更新
- `api/automation/mac_remote_receiver_stub_v1.sh` — Mac 受信スタブ
