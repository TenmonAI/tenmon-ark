# TENMON_SLEEP_AUTONOMY_ARM_AND_SAFE_NIGHT_RUN_PARENT_CURSOR_AUTO_V1

## 目的

睡眠中 8 時間のあいだ、safe/medium の自動改善ループを順次で回し、  
high-risk は escrow package まで進めて朝の 1 承認へ橋渡しする。

## D（非交渉）

- 最小diff
- 1変更=1検証
- success 捏造禁止
- stale truth を success 根拠に使わない
- fixture を completion 成功に使わない
- high-risk 会話コアは escrow 止まり
- safe/medium は無人で進める
- Mac / VPS の責務分離
- dist 直編集禁止

## 実装対象

- `api/automation/tenmon_sleep_autonomy_master_bundle_v1.py`
- `api/scripts/tenmon_sleep_autonomy_master_bundle_v1.sh`

## 実行順（並列禁止）

1. precheck / forensic
2. Mac watch one-shot（既定は観測のみ、`--run-mac-step` で実行）
3. safe priority enqueue / single-flight
4. result -> rejudge / scorecard bind
5. high-risk escrow pack（morning）
6-8. high-risk cards は escrow のみ作成（enqueue しない）
9. 保険（`--insurance` 指定時のみ）

## 出力

- `api/automation/tenmon_sleep_autonomy_master_summary.json`
- `api/automation/tenmon_sleep_autonomy_master_report.md`

## PASS 条件

- 主線 1〜5 が完了
- 主線 6〜8 が escrow/manual gate まで到達
- （指定時）保険 9 の集約が完了

失敗時は停止し、証拠束を残し、`TENMON_SLEEP_AUTONOMY_MASTER_SAFE_RETRY_ONLY_CURSOR_AUTO_V1` を返す。

## 実行例

```bash
cd /opt/tenmon-ark-repo/api

# 標準（Mac step は観測のみ）
./scripts/tenmon_sleep_autonomy_master_bundle_v1.sh

# Mac one-shot を実行する場合（例: SSH 実行やローカル実行コマンドを指定）
TENMON_MAC_ONE_SHOT_CMD='echo "replace with actual mac oneshot command"' \
./scripts/tenmon_sleep_autonomy_master_bundle_v1.sh --run-mac-step

# 保険ステップも含める
./scripts/tenmon_sleep_autonomy_master_bundle_v1.sh --insurance
```

*Version: 1*

