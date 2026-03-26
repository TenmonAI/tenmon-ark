# TENMON_DIALOGUE_COMPLETION_NO_MIDRUN_VPS_PARENT_CURSOR_AUTO_V1

## 目的

VPS 上で途中の手入力・確認待ちを挟まず、会話コア改善主線を **固定順の子カード** で束ねる。Mac には直接触れない場合、再配備 payload / runbook 断片の生成までで完結する。

## 実行順（子）

1. `TENMON_DIALOGUE_COMPLETION_NO_MIDRUN_VPS_AUTOBUNDLE_CURSOR_AUTO_V1` — `tenmon_dialogue_completion_no_midrun_vps_autobundle_v1.py`
2. `TENMON_MAC_REDEPLOY_REALRUN_BRIDGE_CURSOR_AUTO_V1` — `tenmon_mac_redeploy_realrun_bridge_v1.py`
3. `TENMON_DIALOGUE_POST_REDEPLOY_REALRUN_RECHECK_CURSOR_AUTO_V1` — `tenmon_dialogue_post_redeploy_realrun_recheck_v1.py`

## 親の起動

```bash
export TENMON_REPO_ROOT=/path/to/tenmon-ark-repo
python3 api/automation/tenmon_dialogue_completion_no_midrun_vps_parent_v1.py
```

## 出力

- `api/automation/tenmon_dialogue_completion_no_midrun_vps_parent_summary.json`
- `api/automation/tenmon_dialogue_completion_no_midrun_vps_parent_report.md`
- 失敗時: `api/automation/generated_cursor_apply/TENMON_DIALOGUE_COMPLETION_NO_MIDRUN_VPS_PARENT_RETRY_CURSOR_AUTO_V1.md`

## D

- 成功の捏造なし
- dist 直編集禁止（本カード群は実行・集約のみ）

## next

- **nextOnPass**: `TENMON_DIALOGUE_COMPLETION_NO_MIDRUN_VPS_AUTOBUNDLE_CURSOR_AUTO_V1`（次周回の autobundle 再実行）
- **nextOnFail**: 停止。retry 1 枚のみ生成。
