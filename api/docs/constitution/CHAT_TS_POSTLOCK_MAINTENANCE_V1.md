# CHAT_TS_POSTLOCK_MAINTENANCE_V1

## 目的

`chat.ts` 系が **完成領域（POSTLOCK）** に入った後、**surface / route / runtime / static / longform / density** の **退行**を自動検出し、**最小 diff の focused 次カード**へ流す枠組みを固定する。

## 非目的（本憲章の禁止）

- **`api/src/routes/chat.ts` / `general.ts` / `majorRoutes.ts` / `responsePlanCore.ts` の本体ロジックを POSTLOCK メンテナンスカードだけで直すこと**（退行時は **Stage1〜3 / 例外承認** へ委譲）

## 観測の束ね

1. **runtime**: `runtime_matrix.json`（10 probe）
2. **surface**: `surface_audit.json`（noise_hits）
3. **static + report verdict**: `worldclass_report.json`
4. **seal 集計**: `final_verdict.json`（Stage5 merge 結果）
5. **route**: `route_authority_audit.json`（flags）
6. **longform**: `longform_audit.json`（`longform_1`）

## contract drift

`worldclass_report.verdict` と `final_verdict` の主要ブール（例: `chat_ts_overall_100`, `surface_clean`）が **同一ランで不一致**のとき **contract_drift** とする。

## baseline

- 既定パス: `api/automation/postlock_maintenance_baseline.json`（または `CHAT_TS_POSTLOCK_BASELINE`）
- **初回**: baseline 未存在時は現在観測で作成し `maintained=true`（初期化）
- **更新**: `CHAT_TS_POSTLOCK_UPDATE_BASELINE=1` か `--write-baseline`

## 出力物

| ファイル | 説明 |
|----------|------|
| `maintenance_verdict.json` | `maintained`, `regressions`, `contract_drift`, `blockers` |
| `regression_diff.json` | 差分詳細 |
| `final_verdict.json` | POSTLOCK 集約 OK/FAIL（`_postlock_maintenance/` 内） |
| `next_pdca_auto.md` | blocker 1〜3 の focused 次手 |

## exit 規約

- **退行または contract drift** → `exit 1`（`CHAT_TS_POSTLOCK_MAINTENANCE_ENFORCE=1` 時は seal 全体も失敗）

## 関連カード

- `CHAT_TS_POSTLOCK_MAINTENANCE_RETRY_CURSOR_AUTO_V1`

---

*Version: V1*
