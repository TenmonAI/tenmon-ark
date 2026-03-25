# TENMON_MAC_FULL_AUTONOMY_FINAL_ACCEPTANCE_CURSOR_AUTO_V1

## 目的

Mac 完全自律が **設計上ではなく実運転として成立**したことを集約証跡で最終判定する。  
**worldclass 対話品質**や別軸の完了とは **混同しない**（`TENMON_WORLDCLASS_DIALOGUE_QUALITY_FINISH_CURSOR_AUTO_V1` は別カード）。

## 前提

- `TENMON_MAC_AUTONOMY_24H_SAFE_GUARD_CURSOR_AUTO_V1` が PASS（`tenmon_mac_autonomy_24h_guard_summary.json` の `mac_autonomy_24h_guard_pass`）。

## 非交渉

- **current-run evidence**: 各カードの `summary.json` と、ループ成功時は `remote_cursor_result_bundle.json` の整合。
- **全経路**: queue → AI（browser）→ Cursor → build → result return（ループ summary + 関連カード）。
- **high-risk**: `tenmon_mac_autonomy_policy_v1.json` でトークン必須のとき、ガード summary の `approval_gate_ok` が true。
- **stale / fixture / mixed-run**: 証跡の `generated_at` スパンが長すぎる・fixture スキップ・疑わしい混在は FAIL。
- **operable と worldclass**: 本カードは **実運転 operability / 安全連続運転 / cursor 融合** のみ。

## 入力（集約）

| ファイル | 参照 |
|----------|------|
| `tenmon_mac_screen_operator_runtime_summary.json` | 画面キャプチャ |
| `tenmon_mac_operator_decision_bind_summary.json` | Vision 判断 API |
| `tenmon_browser_ai_operator_runtime_summary.json` | Browser AI |
| `tenmon_cursor_operator_runtime_summary.json` | Cursor 適用 + build |
| `tenmon_mac_full_autonomy_loop_runtime_summary.json` | 閉路 E2E |
| `tenmon_mac_autonomy_24h_guard_summary.json` | 24h ガード + watchdog |
| `tenmon_mac_autonomy_policy_v1.json` | high-risk 境界 |
| `remote_cursor_result_bundle.json` | 結果インジェスト |

## 最終判定（三軸）

- **operable_mac_autonomy_ready**: 画面 + Vision + Browser AI + Cursor（各カード PASS）。
- **continuous_safe_operation_ready**: 閉路 PASS + 24h ガード PASS + watchdog + high-risk 境界 + build + result + ingest。
- **cursor_fusion_ready**: Cursor + build + result + ジョブ poll + 閉路 PASS。

## 必須内訳（breakdown）

`screen_capture_ok` … `vision_decision_ok` … `browser_ai_ok` … `cursor_apply_ok` … `build_verify_ok`（ループ・cursor 両方）… `result_return_ok` … `watchdog_ok` … `high_risk_boundary_enforced`

## 環境変数

| 変数 | 説明 |
|------|------|
| `TENMON_FINAL_ACCEPTANCE_MAX_EVIDENCE_HOURS` | 全 summary の `generated_at` スパン上限（既定 168） |

## 出力

- `api/automation/tenmon_mac_full_autonomy_final_acceptance_summary.json`
- `api/automation/tenmon_mac_full_autonomy_final_acceptance_report.md`

## NEXT

- PASS → `TENMON_WORLDCLASS_DIALOGUE_QUALITY_FINISH_CURSOR_AUTO_V1`
- FAIL → `TENMON_MAC_FULL_AUTONOMY_FINAL_ACCEPTANCE_RETRY_CURSOR_AUTO_V1`
