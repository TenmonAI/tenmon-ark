# TENMON_REAL_PWA_CHAT_PATH_FORENSIC_CURSOR_AUTO_V1

## 目的

`https://tenmon-ark.com/pwa/` の実会話経路を単一真実源として観測し、
`/api/chat` 単発 probe 合格と実 PWA 会話の差分を可視化する。

## 実装ファイル

- `api/automation/real_pwa_chat_path_forensic_v1.py`
- `api/scripts/real_pwa_chat_path_forensic_v1.sh`
- `api/docs/constitution/TENMON_REAL_PWA_CHAT_PATH_FORENSIC_CURSOR_AUTO_V1.md`

## 観測ポリシー

- read-only forensic 優先
- 大規模修正は禁止
- 実ターン採取は `/api/chat` を PWA payload 形式で再現

## 固定出力（1 turn 単位）

- request payload
- endpoint path
- threadId
- threadCenter
- routeReason
- responsePlan
- rawResponse
- canonicalResponse
- projectedResponse（best effort）
- finalizeResponse（best effort）

## 比較軸

- 継続 thread（scripture → general）
- 新規 thread（general）
- probe 単発 thread

## 生成物（`api/automation/`）

- `pwa_real_chat_trace.json`
- `pwa_vs_probe_diff.json`
- `thread_center_bleed_conditions.json`
- `frontend_chat_endpoint_report.json`
- `focused_next_cards_manifest.json`
- `TENMON_REAL_PWA_CHAT_PATH_FORENSIC_VPS_V1`

## 実行

```bash
bash api/scripts/real_pwa_chat_path_forensic_v1.sh --stdout-json
```

## FAIL_NEXT_CARD

`TENMON_REAL_PWA_CHAT_PATH_FORENSIC_RETRY_CURSOR_AUTO_V1`

