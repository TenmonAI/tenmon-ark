# TENMON_CURSOR_AUTOBUILD_BRIDGE_CURSOR_AUTO_V1

## 概要

Cursor 完全自動構築の **標準基盤**（v2）。カードは **markdown 1 ファイル**に必須フィールドを揃え、`cursor_executor_bridge_v2.py` が schema / campaign / result / retry / next / acceptance を一括生成する。

## モジュール

| モジュール | 役割 |
|------------|------|
| `cursor_card_schema_v2.py` | `cursor_card_schema_v2.json` |
| `patch_safety_normalizer_v2.py` | 危険パッチ検査 |
| `file_target_resolver_v2.py` | EDIT_SCOPE から許可パス |
| `multi_card_campaign_runner_v2.py` | `cursor_campaign_manifest.json` |
| `result_collector_v2.py` | `cursor_result_bundle.json` |
| `retry_generator_v2.py` | `cursor_retry_queue.json` + RETRY `.md` |
| `next_card_generator_v2.py` | `cursor_ready_next_cards_v2.json` |
| `cursor_acceptance_connector_v2.py` | `cursor_acceptance_manifest_v2.json` |
| `cursor_executor_bridge_v2.py` | 上記の一括実行 |

## 実行

```bash
cd api
python3 automation/cursor_executor_bridge_v2.py --stdout-json
```

## 成果物（`api/automation/`）

- `cursor_card_schema_v2.json`
- `cursor_campaign_manifest.json`
- `cursor_result_bundle.json`
- `cursor_retry_queue.json`
- `TENMON_CURSOR_AUTOBUILD_BRIDGE_VPS_V1`
- `cursor_autobuild_bridge_report_v2.json`

## 失敗時

`TENMON_CURSOR_AUTOBUILD_BRIDGE_CURSOR_AUTO_RETRY_V1`

## 方針

- VPS bash と Cursor 指示の混在をやめ、**カード MD を単一ソース**とする
- **read-only** 観測系（observation_os / seal）とパスで接続
