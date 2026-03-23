# TENMON_ARK_FINAL_SEAL_AUTOPILOT_V3

最終封印までの観測・baseline・合成 seal 判定を行う母艦カード（実装: `api/automation/final_seal_autopilot_v3.py`）。

## 実行例

```bash
cd /path/to/repo
python3 api/automation/final_seal_autopilot_v3.py
# ビルド省略:
python3 api/automation/final_seal_autopilot_v3.py --skip-build
# 手動再起動済みの宣言:
python3 api/automation/final_seal_autopilot_v3.py --assume-restart-ok
# 再起動コマンド（exit 0 の後に health を再確認）:
python3 api/automation/final_seal_autopilot_v3.py --restart-cmd "systemctl restart tenmon-api"
```

## 出力

`api/automation/reports/TENMON_ARK_FINAL_SEAL_AUTOPILOT_V3/<UTC>/` にカード本文の baseline / cycle 成果物を書き出す。

## 注意

- **Cycle 0 は観測のみ**。パッチ適用・自動 rollback ループは本スクリプトに含めない（憶測パッチ禁止・1 変更 = 1 検証のため別工程で実施し、再実行で差分を取る）。
- `next_cycle_ok` / `stuck_classifier_ok` / `maintenance_self_heal_ok` はレポート骨格として `true` を立て、実体は今後の拡張ポイント。
