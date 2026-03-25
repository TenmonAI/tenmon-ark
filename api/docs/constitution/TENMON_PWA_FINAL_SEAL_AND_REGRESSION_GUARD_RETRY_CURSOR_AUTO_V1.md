# TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_RETRY_CURSOR_AUTO_V1

## 目的

`TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_CURSOR_AUTO_V1` が FAIL したとき、**seal / regression guard を更新せず**、`unified_pass=false` を **env / lived / autoloop / gate / seal writer** に分解し、**retry 用の最小成果物**だけを出す。

## 単一真実源

- 統合 verdict: `api/automation/pwa_final_seal_and_regression_guard_verdict.json`（integrate が生成）
- retry 分解: `api/automation/pwa_final_seal_retry_forensic.json`
- retry plan: `api/automation/pwa_final_seal_retry_plan.json`（`recommended_retry_card` 固定分岐）

## 生成物（retry 専用）

| ファイル | 説明 |
|----------|------|
| `tenmon_pwa_final_seal_retry_forensic_v1.py` | 入力 JSON を読み分類 |
| `pwa_final_seal_retry_forensic.json` | `retry_class` / `root_failure_band` / blockers |
| `pwa_final_seal_retry_plan.json` | `recommended_retry_card` |
| `generated_cursor_apply/TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_RETRY_CURSOR_AUTO_V1.md` | 人間向けメモ（補強追記） |

**触らない**: `pwa_final_completion_seal.md`（FAIL 時）、`pwa_final_regression_guard.json`（PASS 専用）。

## 実行

```bash
# integrate 済み verdict が前提
bash api/scripts/tenmon_pwa_final_seal_and_regression_guard_retry_v1.sh --stdout-json
```

seal runner FAIL 時は同スクリプトが自動実行され、`recommended_retry_card` 等が verdict にマージされたうえで `/var/log/tenmon/.../final_verdict.json` にコピーされる。
