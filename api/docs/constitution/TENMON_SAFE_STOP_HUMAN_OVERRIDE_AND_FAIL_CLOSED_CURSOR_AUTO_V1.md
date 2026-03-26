# TENMON_SAFE_STOP_HUMAN_OVERRIDE_AND_FAIL_CLOSED_CURSOR_AUTO_V1

## 目的

完全自律が暴走しないよう、**人間の停止・override・fail-closed** を sentinel / env で最終固定する。**human override 優先**（override 時は自律 `running=false`）。**product core は変更しない**。成功の捏造はしない（観測のみ）。

## 実装

- `api/automation/safe_stop_human_override_v1.py`

## Sentinel（既定・環境で上書き可）

| 役割 | 既定ファイル | 環境変数 |
|------|----------------|----------|
| 安全停止 | `api/automation/tenmon_autonomy_safe_stop.signal` | `TENMON_SAFE_STOP_FILE` |
| 人手 override（manual モード） | `api/automation/tenmon_autonomy_human_override.signal` | `TENMON_SAFE_OVERRIDE_FILE` |
| fail-closed | `api/automation/tenmon_autonomy_fail_closed.signal` | `TENMON_FAIL_CLOSED_FILE` |

追加: **`TENMON_FAIL_CLOSED`** が `1` / `true` / `yes` / `on` のときも `fail_closed=true`（ファイルなしでも可）。

## `running` の意味

**自律ループが進めてよい**ときのみ `true`:

- `stop_requested` でも `override_requested` でも `fail_closed` でもない。

優先順位（`reason` 文言）: **stop** → **override** → **fail-closed** → `autonomy_permitted`。

## CLI

```bash
cd /opt/tenmon-ark-repo/api
python3 automation/safe_stop_human_override_v1.py
python3 automation/safe_stop_human_override_v1.py --exit-on-block   # running=false で exit 1
```

標準出力（1 行 JSON）: `ok`, `running`, `stop_requested`, `override_requested`, `fail_closed`, `reason`

詳細（パス・next 文言）: `api/automation/safe_stop_human_override_summary.json`

## 自律プロセスとの連携

- **`overnight_full_pdca_autonomy_orchestrator_v1.py`**: 各サイクルでカード専用 `stop_file` の直後に `evaluate_state` を参照し、`running` が false なら `blocked_reason` に `global_safe_stop:<reason>` を付けてループ終了。
- その他 daemon は同様に **サイクル先頭**で本スクリプトを呼ぶか、同一 sentinel を読み `running` を確認する。既存の **カード専用 stop** と**併用**（本カードは**横断**の最終弁）。
- **`tenmon_full_autonomy_os_13plus4_master_parent_v1.py`** ステップ 17 は `safe_stop_human_override_v1.py --exit-on-block`（`rc∈{0,1}` 許容）。

## nextOnPass

`TENMON_FULL_AUTONOMY_OS_13PLUS4_MASTER_PARENT_CURSOR_AUTO_V1` の全束完了

## nextOnFail

停止。safe-stop retry 1 枚のみ生成。
