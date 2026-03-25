# TENMON_CONVERSATION_FULL_COMPLETION_PDCA_AUTOLOOP_V1

会話系の観測→最小修正→再計測の母艦（**Step 1 baseline 実装**）。

## ランナー

`api/automation/conversation_full_completion_pdca_autoloop_v1.py`

## 実行例

```bash
cd /path/to/repo
python3 api/automation/conversation_full_completion_pdca_autoloop_v1.py
python3 api/automation/conversation_full_completion_pdca_autoloop_v1.py --skip-build
```

## 出力

`api/automation/reports/TENMON_CONVERSATION_FULL_COMPLETION_PDCA_AUTOLOOP_V1/<UTC>/`

必須ファイルはスクリプトが一括生成する。

## 注意

- **パッチ適用ループは含めない**（憶測パッチ禁止・1変更=1検証のため）。`patch_cycle_01.json` 等は baseline 用プレースホルダ。
- `unknown_bridge_completion` は現状 **静的プレースホルダ（55）** — カード記載の専用 probe 追加で置換する。
- `restart_ok` は本スクリプトでは扱わない。`final_seal_autopilot_v3.py` の `--restart-cmd` / `--assume-restart-ok` と併用すること。
