# AUTO_BUILD_MULTI_CARD_CAMPAIGN_V1

## 目的

`single_flight` を前提に **複数カード列**を保持し、queue / human gate / execution gate / replay audit 参照と連動した **キャンペーン状態**を JSON・Markdown で出す。runner や PATCH は実行しない（runtime 非変更）。

## 状態ファイル

- `api/automation/_campaign/campaign_state_v1.json`（`--campaign-start` で作成）

## CLI

```bash
python3 api/automation/campaign_executor_v1.py --repo-root . --campaign-start --cards CARD_A,CARD_B,CARD_C
python3 api/automation/campaign_executor_v1.py --repo-root . --campaign-status
python3 api/automation/campaign_executor_v1.py --repo-root . --stdout-json
python3 api/automation/campaign_executor_v1.py --repo-root . --emit-report --check-json
```

## フェーズ

`campaignPhase`: `idle`（未開始） / `ready` / `blocked` / `waiting_human_gate` / `stopped` / `completed`

`transitionPreview` にカード列ごとの **状態遷移メモ**（single_flight・ゲート結果に依存）を列挙。

## 次カード

**AUTO_BUILD_FULL_AUTOPILOT_V1**
