# TENMON_DIALOGUE_POST_REDEPLOY_REALRUN_RECHECK_CURSOR_AUTO_V1

## 目的

Mac 再配備（`TENMON_MAC_REDEPLOY_REALRUN_BRIDGE_CURSOR_AUTO_V1` 等）の**後**に、**承認済み high-risk** ジョブが **real execution** でキュー上 `executed` まで進み、result bundle に **dry_run:false・real_execution_enabled:true・touched_files 非空・acceptance_ok・build_rc=0** が記録されたかを **観測のみ**で確定する。成功の捏造・古いエントリによる stale 成功は禁止。

## D

- 最小 diff（本憲章・automation スクリプトのみ。product core 不変更）
- 観測と再確認のみ（キュー投入・承認の自動化はしない）
- `ok: true` は **単一スクリプト**の厳格条件をすべて満たす場合のみ

## 単一ソース（SSOT）

- スクリプト: `api/automation/tenmon_dialogue_post_redeploy_realrun_recheck_v1.py`
- 出力:
  - `api/automation/tenmon_dialogue_post_redeploy_realrun_recheck_summary.json`
  - `api/automation/tenmon_dialogue_post_redeploy_realrun_recheck_report.md`

## 入力（既定はリポジトリ内 JSON）

| 変数 | 既定 | 説明 |
|------|------|------|
| `TENMON_REPO_ROOT` | `/opt/tenmon-ark-repo` | リポジトリルート |
| `TENMON_REMOTE_CURSOR_QUEUE_PATH` | `api/automation/remote_cursor_queue.json` | キューファイル |
| `TENMON_REMOTE_CURSOR_RESULT_BUNDLE_PATH` | `api/automation/remote_cursor_result_bundle.json` | 結果バンドル |
| `TENMON_API_BASE` | 空 | 設定時は HTTP で queue / bundle を取得（要 Bearer） |
| `TENMON_FOUNDER_EXECUTOR_BEARER` / `TENMON_EXECUTOR_BEARER_TOKEN` | 空 | HTTP 用 |
| `TENMON_REALRUN_RECHECK_MAX_AGE_HOURS` | `96` | これより古い `ingested_at` の厳格一致は **stale** として拒否 |
| `TENMON_MAC_WATCH_LOG` | 空 | ローカルにログがある場合の tail 観測 |
| `TENMON_MAC_SSH` | 空 | 設定時 `tail` をリモート取得 |
| `TENMON_MAC_REMOTE_WATCH_LOG` | `~/tenmon-mac/logs/watch_loop.log` | リモートログパス |
| `TENMON_REALRUN_RECHECK_REQUIRE_MAC_LOG` | `0` | `1` なら `executor_real_run` かつ `result_post_ok` をログに必須 |

## 実行

```bash
export TENMON_REPO_ROOT=/opt/tenmon-ark-repo
# 任意: export TENMON_API_BASE=https://... TENMON_EXECUTOR_BEARER_TOKEN=...
# 任意: export TENMON_MAC_SSH=user@mac
python3 api/automation/tenmon_dialogue_post_redeploy_realrun_recheck_v1.py
echo $?   # 0 = 観測上 pass
```

## next

- **nextOnPass**: 以後の主線へ進む（スクリプト出力参照）
- **nextOnFail**: 停止。realrun recheck retry 1 枚のみ生成。
