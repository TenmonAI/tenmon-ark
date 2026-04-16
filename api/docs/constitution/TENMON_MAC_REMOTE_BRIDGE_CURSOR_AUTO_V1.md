# TENMON_MAC_REMOTE_BRIDGE_CURSOR_AUTO_V1

## 目的

VPS（TENMON-ARK）から自宅 Mac の受信エージェントへ、**正規化済み build job manifest** を配送し、**受領 ack** と **キュー状態 `delivered`** までを記録する（**Cursor 実行はしない**）。

## 構成

| 役割 | パス |
|------|------|
| プロトコル | `api/docs/constitution/remote_bridge_protocol_v1.md` |
| VPS 送信 | `api/automation/mac_remote_bridge_v1.py` |
| Mac 受信スタブ | `api/automation/mac_remote_receiver_stub_v1.sh` |
| キュー | `api/automation/remote_bridge_queue.json`（`TENMON_REMOTE_BRIDGE_QUEUE_PATH` で上書き可） |
| 配送ログ | `api/automation/remote_bridge_delivery_log.jsonl` |

## 環境変数

| 変数 | 説明 |
|------|------|
| `TENMON_MAC_BRIDGE_URL` | 受信 POST URL（例 `http://mac:8765/tenmon/mac-bridge/v1/ingest`） |
| `TENMON_MAC_BRIDGE_SECRET` | 共有秘密（ヘッダ `X-Tenmon-Bridge-Secret`） |
| `TENMON_MAC_DROP_DIR`（Mac） | 保存先（既定 `~/tenmon_remote_bridge_inbox`） |
| `TENMON_MAC_RECEIVER_PORT` | 受信ポート（既定 8765） |

## CLI（VPS）

```bash
cd /opt/tenmon-ark-repo/api
export TENMON_MAC_BRIDGE_URL=http://127.0.0.1:8765/tenmon/mac-bridge/v1/ingest
export TENMON_MAC_BRIDGE_SECRET=...
python3 automation/mac_remote_bridge_v1.py \
  --manifest automation/out/normalized_remote_build_manifest.json
```

`--dry-run` で envelope のみ検証（ネットワーク送信なし）。

## VPS 検証

```bash
bash api/src/scripts/tenmon_mac_remote_bridge_vps_v1.sh
```

成果物: `remote_bridge_send_result.json`, `remote_bridge_ack.json`, `mac_receiver_drop_manifest.json`, マーカー `TENMON_MAC_REMOTE_BRIDGE_VPS_V1`。

## 次工程（Cursor 実行）

正規化 job の Mac 側実行: `TENMON_CURSOR_MAC_EXECUTOR_CURSOR_AUTO_V1`（`cursor_mac_executor_v1.py` / `cursor_local_launch_wrapper_v1.sh`）。

## FAIL 次カード

- `TENMON_MAC_REMOTE_BRIDGE_RETRY_CURSOR_AUTO_V1`
